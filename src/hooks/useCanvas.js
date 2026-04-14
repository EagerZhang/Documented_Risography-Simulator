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

export function useCanvas(canvasSize = 'letter-v') {
  const canvasRef         = useRef(null);
  const fabricRef         = useRef(null);
  const inkLayerOrderRef  = useRef([]); // SYNC source-of-truth for layer order
  const inkLayersRef      = useRef([]); // SYNC source-of-truth for layer descriptors

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

    // Resolve the new order synchronously using the ref — no state-setter read needed
    const order = orderOverride !== undefined ? orderOverride : inkLayerOrderRef.current;

    // Update refs SYNCHRONOUSLY so pushHistory() always reads fresh values
    inkLayerOrderRef.current = order;
    const activeObj = fabricRef.current.getActiveObject();
    const activeHex = activeObj?._risoColor ?? null;
    const layers = extractInkLayers(fabricRef.current, order, activeHex);
    inkLayersRef.current = layers;

    // Schedule React state updates for rendering
    setInkLayerOrder(order);
    setInkLayers((current) => {
      if (JSON.stringify(layers) === JSON.stringify(current)) return current;
      return layers;
    });
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

    const onChanged  = () => syncInkLayers();
    const onModified = () => syncInkLayers();

    fc.on('object:added',    onChanged);
    fc.on('object:removed',  onChanged);
    fc.on('object:modified', onModified);

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
      fc.off('object:modified', onModified);
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

  const applyRisoStyle = useCallback((obj, risoColor, label, opacityOverride) => {
    obj.id          = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    obj._risoColor  = risoColor;
    obj._label      = label;
    obj._brightness = 0;
    obj._contrast   = 0;
    obj.set({
      opacity:                  opacityOverride ?? INK_OPACITY,
      globalCompositeOperation: 'multiply',
    });
  }, []);

  /** After adding an object, ensure its color is in the order and re-stack. */
  const afterAdd = useCallback((obj) => {
    const hex  = obj._risoColor;
    const prev = inkLayerOrderRef.current;
    const next = prev.includes(hex) ? prev : [...prev, hex];
    if (fabricRef.current) reorderCanvasObjects(fabricRef.current, next);
    syncInkLayers(next);
  }, [syncInkLayers]);

  /** Build one Fabric shape object at the given canvas center position. */
  const buildShape = useCallback((shapeType, risoColor, cx, cy) => {
    switch (shapeType) {
      case 'rect':
        return new fabric.Rect({ left: cx - 60, top: cy - 60, width: 120, height: 120, fill: risoColor });
      case 'circle':
        return new fabric.Circle({ left: cx - 60, top: cy - 60, radius: 60, fill: risoColor });
      case 'triangle':
        return new fabric.Triangle({ left: cx - 60, top: cy - 60, width: 120, height: 120, fill: risoColor });
      case 'line':
        return new fabric.Line([cx - 80, cy, cx + 80, cy], {
          stroke: risoColor, strokeWidth: 4, fill: 'transparent',
        });
      default:
        return null;
    }
  }, []);

  const addShape = useCallback((shapeType, risoColor, recipe) => {
    if (!fabricRef.current) return;
    const fc = fabricRef.current;
    const cx = fc.width  / 2;
    const cy = fc.height / 2;

    // Multi-ink recipe: one shape per ink component at the same position
    const components = recipe && recipe.length > 1 ? recipe : [{ hex: risoColor, weight: null }];

    let lastObj = null;
    components.forEach(({ hex, weight }, idx) => {
      const obj = buildShape(shapeType, hex, cx, cy);
      if (!obj) return;
      applyRisoStyle(obj, hex, shapeType, weight ?? undefined);
      fc.add(obj);
      if (idx === components.length - 1) lastObj = obj;
      afterAdd(obj);
    });

    if (lastObj) fc.setActiveObject(lastObj);
  }, [buildShape, applyRisoStyle, afterAdd]);

  const addText = useCallback((text, fontFamily, risoColor, fontSize = 48, recipe) => {
    if (!fabricRef.current) return;
    const fc  = fabricRef.current;
    const left = fc.width  / 2 - 100;
    const top  = fc.height / 2 - 30;
    const label = `"${text || 'text'}"`;

    const components = recipe && recipe.length > 1 ? recipe : [{ hex: risoColor, weight: null }];

    let lastObj = null;
    components.forEach(({ hex, weight }, idx) => {
      const obj = new fabric.IText(text || 'Type here', {
        left, top, fontFamily, fontSize, fill: hex,
      });
      applyRisoStyle(obj, hex, label, weight ?? undefined);
      fc.add(obj);
      if (idx === components.length - 1) lastObj = obj;
      afterAdd(obj);
    });

    if (lastObj) fc.setActiveObject(lastObj);
  }, [applyRisoStyle, afterAdd]);

  const addImage = useCallback((dataUrl, risoColor, originalDataUrl, recipe) => {
    if (!fabricRef.current) return;
    const fc      = fabricRef.current;
    const origSrc = originalDataUrl ?? dataUrl;

    const components = recipe && recipe.length > 1 ? recipe : [{ hex: risoColor, weight: null }];

    // For each ink component, recolorize the original image and add a Fabric image
    const addComponent = (colorizedUrl, hex, weight, isLast) => {
      fabric.Image.fromURL(colorizedUrl).then((img) => {
        if (!fabricRef.current) return;
        const maxW  = fc.width  * 0.6;
        const maxH  = fc.height * 0.6;
        const scale = Math.min(maxW / img.width, maxH / img.height, 1);
        img.set({
          left:   fc.width  / 2 - (img.width  * scale) / 2,
          top:    fc.height / 2 - (img.height * scale) / 2,
          scaleX: scale,
          scaleY: scale,
        });
        img._originalSrc = origSrc;
        applyRisoStyle(img, hex, 'image', weight ?? undefined);
        fc.add(img);
        if (isLast) fc.setActiveObject(img);
        afterAdd(img);
      });
    };

    if (components.length === 1) {
      // Single ink — use the already-colorized dataUrl
      addComponent(dataUrl, components[0].hex, components[0].weight, true);
    } else {
      // Multi-ink recipe — re-colorize original for each component
      components.forEach(({ hex, weight }, idx) => {
        recolorizeDataUrl(origSrc, hex).then((recolored) => {
          addComponent(recolored, hex, weight, idx === components.length - 1);
        });
      });
    }
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
    const next = inkLayerOrderRef.current.filter((h) => h !== colorHex);
    syncInkLayers(next);
  }, [syncInkLayers]);

  /** Move an ink layer one step up (toward the top / last printed) */
  const moveInkLayerUp = useCallback((colorHex) => {
    const prev = inkLayerOrderRef.current;
    const idx  = prev.indexOf(colorHex);
    if (idx === -1 || idx === prev.length - 1) return;
    const next = [...prev];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    if (fabricRef.current) reorderCanvasObjects(fabricRef.current, next);
    syncInkLayers(next);
  }, [syncInkLayers]);

  /** Move an ink layer one step down (toward the bottom / first printed) */
  const moveInkLayerDown = useCallback((colorHex) => {
    const prev = inkLayerOrderRef.current;
    const idx  = prev.indexOf(colorHex);
    if (idx <= 0) return;
    const next = [...prev];
    [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
    if (fabricRef.current) reorderCanvasObjects(fabricRef.current, next);
    syncInkLayers(next);
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

    // If that was the last object of this color, remove it from order
    const remaining = fc.getObjects().filter((o) => o._risoColor === hex);
    const next = remaining.length === 0
      ? inkLayerOrderRef.current.filter((h) => h !== hex)
      : inkLayerOrderRef.current;
    syncInkLayers(next);
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
  }, [syncInkLayers]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Lightweight visual-only preview: changes the object's displayed fill/stroke
   * WITHOUT touching _risoColor, inkLayers, or any React state.
   * Used by the smudge panel to show a live preview before committing.
   * Skipped silently for image objects (pixel recolor is async/expensive).
   */
  const previewActiveColor = useCallback((hex) => {
    if (!fabricRef.current) return;
    const obj = fabricRef.current.getActiveObject();
    if (!obj || obj.type === 'image') return;
    if (obj.type === 'line') {
      obj.set({ stroke: hex });
    } else {
      obj.set({ fill: hex });
    }
    fabricRef.current.renderAll();
  }, []);

  /** Shared post-recolor bookkeeping: update inkLayerOrder and sync layers */
  const finalizeRecolor = useCallback((obj, oldColor, newColor) => {
    const prev = inkLayerOrderRef.current;
    let next   = prev.includes(newColor) ? prev : [...prev, newColor];
    const oldColorStillUsed = fabricRef.current
      .getObjects()
      .some((o) => o !== obj && o._risoColor === oldColor);
    if (!oldColorStillUsed) next = next.filter((h) => h !== oldColor);
    if (fabricRef.current) reorderCanvasObjects(fabricRef.current, next);
    syncInkLayers(next);
  }, [syncInkLayers]);

  /**
   * Replace the active canvas object with N copies — one per recipe ink component.
   * Each copy keeps the same position, scale, and shape but gets a pure ink color
   * at weight-based opacity, matching how real Riso layers are printed separately.
   */
  const recolorActiveWithRecipe = useCallback(async (recipe) => {
    if (!fabricRef.current || !recipe?.length) return;
    const fc  = fabricRef.current;
    const obj = fc.getActiveObject();
    if (!obj) return;

    const label   = obj._label ?? obj.type;
    const origSrc = obj._originalSrc ?? null;
    const oldColor = obj._risoColor;

    // Shared positional properties to copy onto every new object
    const transforms = {
      left:  obj.left,
      top:   obj.top,
      scaleX: obj.scaleX,
      scaleY: obj.scaleY,
      angle: obj.angle,
      flipX: obj.flipX,
      flipY: obj.flipY,
    };

    fc.discardActiveObject();
    fc.remove(obj);

    const components = recipe.filter((c) => c.weight > 0);

    if (obj.type === 'image' && origSrc) {
      // Re-colorize the original image for each ink, then add each as a new Fabric image
      const promises = components.map(({ hex, weight }) =>
        recolorizeDataUrl(origSrc, hex).then((colored) =>
          fabric.Image.fromURL(colored).then((img) => ({ img, hex, weight }))
        )
      );

      const results = await Promise.all(promises);
      results.forEach(({ img, hex, weight }, idx) => {
        img.set(transforms);
        img._originalSrc = origSrc;
        applyRisoStyle(img, hex, label, weight);
        fc.add(img);
        if (idx === results.length - 1) fc.setActiveObject(img);
        afterAdd(img);
      });
    } else {
      // Clone the original object N times (returns Promises in Fabric 7)
      const clones = await Promise.all(
        components.map(() => obj.clone())
      );

      clones.forEach((cloned, idx) => {
        const { hex, weight } = components[idx];
        cloned.set(transforms);
        applyRisoStyle(cloned, hex, label, weight);
        if (cloned.type === 'line') {
          cloned.set({ stroke: hex });
        } else {
          cloned.set({ fill: hex });
        }
        fc.add(cloned);
        if (idx === clones.length - 1) fc.setActiveObject(cloned);
        afterAdd(cloned);
      });

      // Remove the old color from the layer order if nothing else uses it
      // (afterAdd already called syncInkLayers; this handles stale-color cleanup)
      const stillUsed = fc.getObjects().some((o) => o._risoColor === oldColor);
      if (!stillUsed) {
        const next = inkLayerOrderRef.current.filter((h) => h !== oldColor);
        syncInkLayers(next);
      }
    }

    fc.renderAll();
  }, [applyRisoStyle, afterAdd]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e) => {
      const active  = fabricRef.current?.getActiveObject();
      const tag     = document.activeElement?.tagName?.toLowerCase();
      const inInput = ['input', 'textarea', 'select'].includes(tag);

      // Delete / Backspace — remove selected object (guard: not text-editing, not form input)
      if ((e.key === 'Delete' || e.key === 'Backspace') && !inInput && !active?.isEditing) {
        if (active?.id) {
          e.preventDefault();
          removeLayer(active.id);
        }
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [removeLayer]);

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
    recolorActiveWithRecipe,
    previewActiveColor,
    setActiveOpacity,
    setActiveBrightness,
    setActiveContrast,
    exportPng,
    downloadPng,
  };
}
