import { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import { CANVAS_SIZES, RISO_COLORS, applyBrightnessToHex } from '../utils/risoColors';
import { recolorizeDataUrl } from '../utils/imageProcessor';
import { generateGrainCanvas } from '../utils/generateGrain';

const INK_OPACITY = 0.82;

const DEFAULT_PROPS = { opacity: INK_OPACITY, brightness: 0, contrast: 0 };

/**
 * Re-apply Brightness + Contrast filters to a Fabric Image object.
 * Keeps a single Brightness and a single Contrast filter slot.
 */
function applyImageFilters(img, brightness, contrast) {
  const filters = [];
  if (brightness !== 0) filters.push(new fabric.filters.Brightness({ brightness }));
  if (contrast   !== 0) filters.push(new fabric.filters.Contrast({ contrast }));
  img.filters = filters;
  img.applyFilters();
}

/** Read stored adjustment values from a Fabric object, with defaults. */
function readProps(obj) {
  return {
    opacity:    obj?.opacity    ?? INK_OPACITY,
    brightness: obj?._brightness ?? 0,
    contrast:   obj?._contrast   ?? 0,
  };
}

/** Look up a color name from the palette, falling back to the hex string */
function colorName(hex) {
  return RISO_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name ?? hex;
}

/**
 * Re-stack all canvas objects so every object belonging to one ink color
 * sits completely above or below objects of other colors, matching the
 * order given in inkLayerOrder (index 0 = bottom, last = top).
 */
function reorderCanvasObjects(canvas, inkLayerOrder) {
  let z = 0;
  for (const hex of inkLayerOrder) {
    canvas
      .getObjects()
      .filter((o) => o._risoColor === hex)
      .forEach((o) => canvas.moveObjectTo(o, z++));
  }
  canvas.renderAll();
}

/**
 * Derive the ink layer descriptor array from the current canvas state.
 * inkLayerOrder controls display order (bottom → top).
 * activeColorHex highlights the row matching the selected object.
 */
function extractInkLayers(canvas, inkLayerOrder, activeColorHex) {
  const objects = canvas.getObjects().filter((o) => !o._isGrain);

  // Build a map: colorHex → { objectCount, allHidden }
  const map = new Map();
  for (const obj of objects) {
    const hex = obj._risoColor || '#000000';
    if (!map.has(hex)) map.set(hex, { objectCount: 0, allHidden: true });
    const entry = map.get(hex);
    entry.objectCount += 1;
    if (obj.visible !== false) entry.allHidden = false;
  }

  // Return in inkLayerOrder order (top of panel = last in array = topmost pass)
  return inkLayerOrder
    .filter((hex) => map.has(hex))
    .map((hex) => {
      const { objectCount, allHidden } = map.get(hex);
      return {
        colorHex:    hex,
        colorName:   colorName(hex),
        objectCount,
        visible:     !allHidden,
        isActive:    hex === activeColorHex,
      };
    });
}

export function useCanvas(canvasSize = 'a4') {
  const canvasRef  = useRef(null);
  const fabricRef  = useRef(null);

  const [inkLayers,       setInkLayers]       = useState([]);
  const [inkLayerOrder,   setInkLayerOrder]   = useState([]); // hex[], bottom→top
  const [activeId,        setActiveId]        = useState(null);
  const [activeColor,     setActiveColor]     = useState(null);
  const [activeObjectType, setActiveObjectType] = useState(null);
  const [activeObjectProps, setActiveObjectProps] = useState(DEFAULT_PROPS);
  const [paperColor,      setPaperColor]      = useState('#FFFFFF');

  // ─── Sync helpers ────────────────────────────────────────────────────────────

  const syncInkLayers = useCallback((orderOverride) => {
    if (!fabricRef.current) return;
    setInkLayerOrder((prev) => {
      const order = orderOverride ?? prev;
      setInkLayers((currentLayers) => {
        const activeObj = fabricRef.current.getActiveObject();
        const activeHex = activeObj?._risoColor ?? null;
        const next = extractInkLayers(fabricRef.current, order, activeHex);
        // If nothing changed structurally, return same ref to avoid re-render
        if (JSON.stringify(next) === JSON.stringify(currentLayers)) return currentLayers;
        return next;
      });
      return order;
    });
  }, []);

  /**
   * Ensure a color exists in inkLayerOrder. If it's new, append it on top.
   * Returns the updated order array.
   */
  const ensureColorInOrder = useCallback((hex, prevOrder) => {
    if (prevOrder.includes(hex)) return prevOrder;
    return [...prevOrder, hex];
  }, []);

  // ─── Canvas init ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return;

    const size = CANVAS_SIZES.find((s) => s.id === canvasSize) || CANVAS_SIZES[0];

    const fc = new fabric.Canvas(canvasRef.current, {
      width:                  size.width,
      height:                 size.height,
      backgroundColor:        '#FFFFFF',
      preserveObjectStacking: true,
    });
    fabricRef.current = fc;

    const onChanged = () => syncInkLayers();

    fc.on('object:added',    onChanged);
    fc.on('object:removed',  onChanged);
    fc.on('object:modified', onChanged);

    const onSelect = (obj) => {
      setActiveId(obj?.id ?? null);
      setActiveColor(obj?._risoColor ?? null);
      setActiveObjectType(obj?.type ?? null);
      setActiveObjectProps(readProps(obj));
      syncInkLayers();
    };

    fc.on('selection:created', (e) => onSelect(e.selected?.[0]));
    fc.on('selection:updated', (e) => onSelect(e.selected?.[0]));
    fc.on('selection:cleared', () => {
      setActiveId(null);
      setActiveColor(null);
      setActiveObjectType(null);
      setActiveObjectProps(DEFAULT_PROPS);
      syncInkLayers();
    });

    return () => {
      fc.off('object:added',    onChanged);
      fc.off('object:removed',  onChanged);
      fc.off('object:modified', onChanged);
      fc.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Paper color ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!fabricRef.current) return;
    fabricRef.current.set('backgroundColor', paperColor);
    fabricRef.current.renderAll();
  }, [paperColor]);

  // ─── Canvas resize ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!fabricRef.current) return;
    const size = CANVAS_SIZES.find((s) => s.id === canvasSize) || CANVAS_SIZES[0];
    fabricRef.current.setDimensions({ width: size.width, height: size.height });
    fabricRef.current.renderAll();
  }, [canvasSize]);

  // ─── Add helpers ─────────────────────────────────────────────────────────────

  const applyRisoStyle = useCallback((obj, risoColor, label) => {
    obj.id          = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    obj._risoColor  = risoColor;
    obj._label      = label;
    obj._brightness = 0;
    obj._contrast   = 0;
    obj.set({
      opacity:                  INK_OPACITY,
      globalCompositeOperation: 'multiply',
    });
  }, []);

  /** After adding an object, ensure its color is in the order and re-stack. */
  const afterAdd = useCallback((obj) => {
    const hex = obj._risoColor;
    setInkLayerOrder((prev) => {
      const next = ensureColorInOrder(hex, prev);
      reorderCanvasObjects(fabricRef.current, next);
      syncInkLayers(next);
      return next;
    });
  }, [ensureColorInOrder, syncInkLayers]);

  const addShape = useCallback((shapeType, risoColor) => {
    if (!fabricRef.current) return;
    const fc = fabricRef.current;
    const cx = fc.width  / 2;
    const cy = fc.height / 2;
    let obj;

    switch (shapeType) {
      case 'rect':
        obj = new fabric.Rect({ left: cx - 60, top: cy - 60, width: 120, height: 120, fill: risoColor });
        break;
      case 'circle':
        obj = new fabric.Circle({ left: cx - 60, top: cy - 60, radius: 60, fill: risoColor });
        break;
      case 'triangle':
        obj = new fabric.Triangle({ left: cx - 60, top: cy - 60, width: 120, height: 120, fill: risoColor });
        break;
      case 'line':
        obj = new fabric.Line([cx - 80, cy, cx + 80, cy], {
          stroke: risoColor, strokeWidth: 4, fill: 'transparent',
        });
        break;
      default:
        return;
    }

    applyRisoStyle(obj, risoColor, shapeType);
    fc.add(obj);
    fc.setActiveObject(obj);
    afterAdd(obj);
  }, [applyRisoStyle, afterAdd]);

  const addText = useCallback((text, fontFamily, risoColor, fontSize = 48) => {
    if (!fabricRef.current) return;
    const fc  = fabricRef.current;
    const obj = new fabric.IText(text || 'Type here', {
      left:       fc.width  / 2 - 100,
      top:        fc.height / 2 - 30,
      fontFamily,
      fontSize,
      fill:       risoColor,
    });

    applyRisoStyle(obj, risoColor, `"${text || 'text'}"`);
    fc.add(obj);
    fc.setActiveObject(obj);
    afterAdd(obj);
  }, [applyRisoStyle, afterAdd]);

  const addImage = useCallback((dataUrl, risoColor, originalDataUrl) => {
    if (!fabricRef.current) return;
    const fc = fabricRef.current;

    fabric.Image.fromURL(dataUrl).then((img) => {
      const maxW  = fc.width  * 0.6;
      const maxH  = fc.height * 0.6;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);

      img.set({
        left:   fc.width  / 2 - (img.width  * scale) / 2,
        top:    fc.height / 2 - (img.height * scale) / 2,
        scaleX: scale,
        scaleY: scale,
      });

      // Store the original (uncolorized) pixels so we can re-colorize later
      img._originalSrc = originalDataUrl ?? dataUrl;

      applyRisoStyle(img, risoColor, 'image');
      fc.add(img);
      fc.setActiveObject(img);
      afterAdd(img);
    });
  }, [applyRisoStyle, afterAdd]);

  // ─── Ink layer operations ────────────────────────────────────────────────────

  /** Toggle visibility of every object belonging to a given ink color */
  const toggleInkLayer = useCallback((colorHex) => {
    if (!fabricRef.current) return;
    const fc      = fabricRef.current;
    const objects = fc.getObjects().filter((o) => o._risoColor === colorHex);
    if (!objects.length) return;

    // If any are visible → hide all. If all hidden → show all.
    const anyVisible = objects.some((o) => o.visible !== false);
    objects.forEach((o) => o.set('visible', !anyVisible));
    fc.renderAll();
    syncInkLayers();
  }, [syncInkLayers]);

  /** Remove every canvas object belonging to a given ink color */
  const removeInkLayer = useCallback((colorHex) => {
    if (!fabricRef.current) return;
    const fc      = fabricRef.current;
    const objects = fc.getObjects().filter((o) => o._risoColor === colorHex);
    objects.forEach((o) => fc.remove(o));
    fc.renderAll();

    setInkLayerOrder((prev) => {
      const next = prev.filter((h) => h !== colorHex);
      syncInkLayers(next);
      return next;
    });
  }, [syncInkLayers]);

  /** Move an ink layer one step up (toward the top / last printed) */
  const moveInkLayerUp = useCallback((colorHex) => {
    setInkLayerOrder((prev) => {
      const idx = prev.indexOf(colorHex);
      if (idx === -1 || idx === prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      reorderCanvasObjects(fabricRef.current, next);
      syncInkLayers(next);
      return next;
    });
  }, [syncInkLayers]);

  /** Move an ink layer one step down (toward the bottom / first printed) */
  const moveInkLayerDown = useCallback((colorHex) => {
    setInkLayerOrder((prev) => {
      const idx = prev.indexOf(colorHex);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
      reorderCanvasObjects(fabricRef.current, next);
      syncInkLayers(next);
      return next;
    });
  }, [syncInkLayers]);

  // ─── Individual object operations ────────────────────────────────────────────

  /** Delete a single canvas object by id (used for active-object delete) */
  const removeLayer = useCallback((id) => {
    if (!fabricRef.current) return;
    const fc  = fabricRef.current;
    const obj = fc.getObjects().find((o) => o.id === id);
    if (!obj) return;

    const hex = obj._risoColor;
    fc.remove(obj);
    fc.renderAll();

    // If that was the last object of this color, remove from order
    const remaining = fc.getObjects().filter((o) => o._risoColor === hex);
    if (remaining.length === 0) {
      setInkLayerOrder((prev) => {
        const next = prev.filter((h) => h !== hex);
        syncInkLayers(next);
        return next;
      });
    } else {
      syncInkLayers();
    }
  }, [syncInkLayers]);

  // ─── Per-object adjustments ──────────────────────────────────────────────────

  const setActiveOpacity = useCallback((value) => {
    if (!fabricRef.current) return;
    const obj = fabricRef.current.getActiveObject();
    if (!obj) return;
    obj.set('opacity', value);
    fabricRef.current.renderAll();
    setActiveObjectProps((prev) => ({ ...prev, opacity: value }));
  }, []);

  const setActiveBrightness = useCallback((value) => {
    if (!fabricRef.current) return;
    const obj = fabricRef.current.getActiveObject();
    if (!obj) return;
    obj._brightness = value;

    if (obj.type === 'image') {
      applyImageFilters(obj, value, obj._contrast ?? 0);
    } else {
      const displayColor = applyBrightnessToHex(obj._risoColor, value);
      obj.set(obj.type === 'line' ? { stroke: displayColor } : { fill: displayColor });
    }
    fabricRef.current.renderAll();
    setActiveObjectProps((prev) => ({ ...prev, brightness: value }));
  }, []);

  const setActiveContrast = useCallback((value) => {
    if (!fabricRef.current) return;
    const obj = fabricRef.current.getActiveObject();
    if (!obj || obj.type !== 'image') return;
    obj._contrast = value;
    applyImageFilters(obj, obj._brightness ?? 0, value);
    fabricRef.current.renderAll();
    setActiveObjectProps((prev) => ({ ...prev, contrast: value }));
  }, []);

  /** Re-color the active canvas object */
  const recolorActive = useCallback((newColor) => {
    if (!fabricRef.current) return;
    const obj = fabricRef.current.getActiveObject();
    if (!obj) return;

    const oldColor = obj._risoColor;

    if (obj.type === 'image' && obj._originalSrc) {
      // Re-colorize pixel-by-pixel from the stored original, then swap the
      // Fabric image element in place, preserving all position/transform.
      recolorizeDataUrl(obj._originalSrc, newColor).then((newDataUrl) => {
        if (!fabricRef.current) return;
        const fc = fabricRef.current;

        const htmlImg = new Image();
        htmlImg.onload = () => {
          obj._risoColor = newColor;
          obj.setElement(htmlImg);
          obj.setCoords();
          fc.renderAll();
          setActiveColor(newColor);
          finalizeRecolor(obj, oldColor, newColor);
        };
        htmlImg.src = newDataUrl;
      });
    } else {
      obj._risoColor = newColor;
      const displayColor = applyBrightnessToHex(newColor, obj._brightness ?? 0);
      if (obj.type === 'line') {
        obj.set({ stroke: displayColor });
      } else {
        obj.set({ fill: displayColor });
      }
      fabricRef.current.renderAll();
      setActiveColor(newColor);
      finalizeRecolor(obj, oldColor, newColor);
    }
  }, [ensureColorInOrder, syncInkLayers]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Shared post-recolor bookkeeping: update inkLayerOrder and sync layers */
  const finalizeRecolor = useCallback((obj, oldColor, newColor) => {
    setInkLayerOrder((prev) => {
      let next = ensureColorInOrder(newColor, prev);
      const oldColorStillUsed = fabricRef.current
        .getObjects()
        .some((o) => o !== obj && o._risoColor === oldColor);
      if (!oldColorStillUsed) next = next.filter((h) => h !== oldColor);
      reorderCanvasObjects(fabricRef.current, next);
      syncInkLayers(next);
      return next;
    });
  }, [ensureColorInOrder, syncInkLayers]);

  // ─── Export ───────────────────────────────────────────────────────────────────

  const exportPng = useCallback(() => {
    if (!fabricRef.current) return null;
    const fc = fabricRef.current;

    // Ensure everything is rendered onto the lower canvas before we read it
    fc.renderAll();

    // Composite grain onto the Fabric output on an offscreen canvas.
    // Drawing from lowerCanvasEl is synchronous — no Image.onload needed.
    const offscreen = document.createElement('canvas');
    offscreen.width  = fc.width;
    offscreen.height = fc.height;
    const ctx = offscreen.getContext('2d');

    ctx.drawImage(fc.lowerCanvasEl, 0, 0);

    // Overlay white dropout grain — invisible on white paper, visible on ink
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.65;
    ctx.drawImage(generateGrainCanvas(fc.width, fc.height), 0, 0);

    return offscreen.toDataURL('image/png');
  }, []);

  const downloadPng = useCallback(() => {
    const dataUrl = exportPng();
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href     = dataUrl;
    a.download = `riso-print-${Date.now()}.png`;
    a.click();
  }, [exportPng]);

  return {
    canvasRef,
    fabricRef,
    inkLayers,
    activeId,
    activeColor,
    activeObjectType,
    activeObjectProps,
    paperColor,
    setPaperColor,
    addShape,
    addText,
    addImage,
    removeLayer,
    removeInkLayer,
    toggleInkLayer,
    moveInkLayerUp,
    moveInkLayerDown,
    recolorActive,
    setActiveOpacity,
    setActiveBrightness,
    setActiveContrast,
    exportPng,
    downloadPng,
  };
}
