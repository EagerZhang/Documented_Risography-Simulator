import { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import { CANVAS_SIZES, RISO_COLORS, applyBrightnessToHex } from '../utils/risoColors';
import { recolorizeDataUrl } from '../utils/imageProcessor';
import { generateGrainCanvas } from '../utils/generateGrain';
import { loadBackgroundUrls } from '../utils/canvasBackgrounds';

const INK_OPACITY = 0.82;

const DEFAULT_PROPS = {
  opacity: INK_OPACITY,
  brightness: 0,
  contrast: 0,
  fontSize: 48,
  charSpacing: 0,
  lineHeight: 1.16,
  strokeWidth: 4,
  strokeObject: false,
};

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
  const strokeObject = obj?.type === 'line' || obj?._strokeOnly;
  return {
    opacity:     obj?.opacity      ?? INK_OPACITY,
    brightness:  obj?._brightness  ?? 0,
    contrast:    obj?._contrast    ?? 0,
    fontSize:    obj?.fontSize     ?? 48,
    charSpacing: obj?.charSpacing  ?? 0,
    lineHeight:  obj?.lineHeight   ?? 1.16,
    strokeWidth: obj?.strokeWidth  ?? 4,
    strokeObject,
  };
}

/** Look up a color name from the palette, falling back to the hex string */
function colorName(hex) {
  return RISO_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name ?? hex;
}

function safeName(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
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

/**
 * Convert any source image into pure black ink while preserving alpha.
 * This guarantees background templates always read as black silhouettes.
 */
function convertImageToBlackDataUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const cvs = document.createElement('canvas');
      cvs.width = img.width;
      cvs.height = img.height;
      const ctx = cvs.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, cvs.width, cvs.height);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] === 0) continue;
        d[i] = 0;
        d[i + 1] = 0;
        d[i + 2] = 0;
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(cvs.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function useCanvas(canvasSize = 'letter-v') {
  const canvasRef         = useRef(null);
  const fabricRef         = useRef(null);
  const inkLayerOrderRef  = useRef([]); // SYNC source-of-truth for layer order
  const inkLayersRef      = useRef([]); // SYNC source-of-truth for layer descriptors
  const clipboardRef      = useRef(null); // last copied Fabric object
  const backgroundUrlsRef = useRef([]);
  const backgroundIndexRef = useRef(0);

  const [fabricReady,     setFabricReady]     = useState(false);
  const [backgroundUrls, setBackgroundUrls] = useState([]);
  const [backgroundIndex, setBackgroundIndex] = useState(0);

  const [inkLayers,       setInkLayers]       = useState([]);
  const [inkLayerOrder,   setInkLayerOrder]   = useState([]); // hex[], bottom→top
  const [activeId,        setActiveId]        = useState(null);
  const [activeColor,     setActiveColor]     = useState(null);
  const [activeObjectType, setActiveObjectType] = useState(null);
  const [activeObjectProps, setActiveObjectProps] = useState(DEFAULT_PROPS);
  const [multiSelectRect, setMultiSelectRect] = useState(null); // {left,top,width,height} canvas px

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
      selectionColor:         'rgba(0, 0, 0, 0.08)',
      selectionBorderColor:   '#000000',
      selectionLineWidth:     1,
    });
    fabricRef.current = fc;

    // Make free-transform controls high-contrast for light UI theme.
    fabric.Object.prototype.set({
      borderColor:       '#000000',
      cornerColor:       '#000000',
      cornerStrokeColor: '#FFFFFF',
      transparentCorners: false,
      borderScaleFactor: 1.25,
    });

    const onChanged  = () => syncInkLayers();
    const onModified = () => syncInkLayers();

    fc.on('object:added',    onChanged);
    fc.on('object:removed',  onChanged);
    fc.on('object:modified', onModified);

    const onSelect = (e) => {
      const sel = fc.getActiveObject();
      if (!sel) return;

      // Multi-selection: expose bounding rect for the Align button
      if (sel.type === 'activeSelection') {
        setMultiSelectRect(sel.getBoundingRect());
      } else {
        setMultiSelectRect(null);
      }

      const obj = e?.selected?.[0] ?? sel;
      if (obj && (obj.type === 'line' || obj._strokeOnly)) {
        obj.set('strokeUniform', true);
      }
      setActiveId(obj?.id ?? null);
      setActiveColor(obj?._risoColor ?? null);
      setActiveObjectType(sel.type ?? null);
      setActiveObjectProps(readProps(obj));
      syncInkLayers();
    };

    // Keep multiSelectRect fresh while dragging a multi-selection
    const onMoving = () => {
      const sel = fc.getActiveObject();
      if (sel?.type === 'activeSelection') {
        setMultiSelectRect(sel.getBoundingRect());
      }
    };

    fc.on('selection:created', onSelect);
    fc.on('selection:updated', onSelect);
    fc.on('object:moving',    onMoving);
    fc.on('selection:cleared', () => {
      setActiveId(null);
      setActiveColor(null);
      setActiveObjectType(null);
      setActiveObjectProps(DEFAULT_PROPS);
      setMultiSelectRect(null);
      syncInkLayers();
    });

    setFabricReady(true);

    return () => {
      setFabricReady(false);
      fc.off('object:added',    onChanged);
      fc.off('object:removed',  onChanged);
      fc.off('object:modified', onModified);
      fc.off('object:moving',   onMoving);
      fc.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Load background manifest / fallback URLs ───────────────────────────────

  useEffect(() => {
    let cancelled = false;
    loadBackgroundUrls().then((urls) => {
      if (cancelled || !urls.length) return;
      backgroundUrlsRef.current = urls;
      setBackgroundUrls(urls);
      setBackgroundIndex(Math.floor(Math.random() * urls.length));
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    backgroundUrlsRef.current = backgroundUrls;
  }, [backgroundUrls]);

  useEffect(() => {
    backgroundIndexRef.current = backgroundIndex;
  }, [backgroundIndex]);

  // ─── Apply Fabric canvas background image (black + full-height centered) ─────

  useEffect(() => {
    if (!fabricReady || !fabricRef.current || !backgroundUrls.length) return;
    const fc  = fabricRef.current;
    const normalizedIndex =
      ((backgroundIndex % backgroundUrls.length) + backgroundUrls.length) % backgroundUrls.length;
    const url = backgroundUrls[normalizedIndex];

    convertImageToBlackDataUrl(url)
      .then((blackUrl) => fabric.Image.fromURL(blackUrl))
      .then((img) => {
        if (!fabricRef.current || fabricRef.current !== fc) return;
        if (normalizedIndex !== backgroundIndexRef.current) return;
        const w = fc.width;
        const h = fc.height;
        const scale = h / img.height;
        const scaledW = img.width * scale;
        img.set({
          originX: 'left',
          originY: 'top',
          scaleX: scale,
          scaleY: scale,
          left:   (w - scaledW) / 2,
          top:    0,
          selectable: false,
          evented: false,
        });
        fc.set('backgroundImage', img);
        fc.renderAll();
      })
      .catch((err) => {
        console.warn('[riso] background failed:', url, err);
      });
  }, [fabricReady, backgroundUrls, backgroundIndex, canvasSize]);

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
      case 'rect-outline': {
        const obj = new fabric.Rect({
          left: cx - 60,
          top: cy - 60,
          width: 120,
          height: 120,
          fill: 'transparent',
          stroke: risoColor,
          strokeWidth: 4,
          strokeUniform: true,
        });
        obj._strokeOnly = true;
        return obj;
      }
      case 'circle-outline': {
        const obj = new fabric.Circle({
          left: cx - 60,
          top: cy - 60,
          radius: 60,
          fill: 'transparent',
          stroke: risoColor,
          strokeWidth: 4,
          strokeUniform: true,
        });
        obj._strokeOnly = true;
        return obj;
      }
      case 'triangle-outline': {
        const obj = new fabric.Triangle({
          left: cx - 60,
          top: cy - 60,
          width: 120,
          height: 120,
          fill: 'transparent',
          stroke: risoColor,
          strokeWidth: 4,
          strokeUniform: true,
        });
        obj._strokeOnly = true;
        return obj;
      }
      case 'line':
        return new fabric.Line([cx - 80, cy, cx + 80, cy], {
          stroke: risoColor,
          strokeWidth: 4,
          fill: 'transparent',
          strokeUniform: true,
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

  const addText = useCallback((text, fontFamily, risoColor, fontSize = 48, charSpacing = 0, lineHeight = 1.16) => {
    if (!fabricRef.current) return;
    const fc  = fabricRef.current;
    const left = fc.width  / 2 - 100;
    const top  = fc.height / 2 - 30;
    const label = `"${text || 'text'}"`;

    const obj = new fabric.IText(text || 'Type here', {
      left, top, fontFamily, fontSize, fill: risoColor,
      charSpacing,
      lineHeight,
    });
    applyRisoStyle(obj, risoColor, label);
    fc.add(obj);
    fc.setActiveObject(obj);
    afterAdd(obj);
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

  /** Remove all drawable objects while keeping the background template intact. */
  const clearCanvas = useCallback(() => {
    if (!fabricRef.current) return;
    const fc = fabricRef.current;
    fc.discardActiveObject();
    fc.getObjects().forEach((obj) => fc.remove(obj));
    fc.renderAll();
    setActiveId(null);
    setActiveColor(null);
    setActiveObjectType(null);
    setActiveObjectProps(DEFAULT_PROPS);
    setMultiSelectRect(null);
    syncInkLayers([]);
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
      const strokeOnly = obj.type === 'line' || obj._strokeOnly;
      obj.set(strokeOnly ? { stroke: displayColor } : { fill: displayColor });
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

  const setActiveFontSize = useCallback((value) => {
    if (!fabricRef.current) return;
    const obj = fabricRef.current.getActiveObject();
    if (!obj || (obj.type !== 'i-text' && obj.type !== 'text')) return;
    obj.set('fontSize', value);
    fabricRef.current.renderAll();
    setActiveObjectProps((prev) => ({ ...prev, fontSize: value }));
  }, []);

  const setActiveCharSpacing = useCallback((value) => {
    if (!fabricRef.current) return;
    const obj = fabricRef.current.getActiveObject();
    if (!obj || (obj.type !== 'i-text' && obj.type !== 'text')) return;
    obj.set('charSpacing', value);
    fabricRef.current.renderAll();
    setActiveObjectProps((prev) => ({ ...prev, charSpacing: value }));
  }, []);

  const setActiveLineHeight = useCallback((value) => {
    if (!fabricRef.current) return;
    const obj = fabricRef.current.getActiveObject();
    if (!obj || (obj.type !== 'i-text' && obj.type !== 'text')) return;
    obj.set('lineHeight', value);
    fabricRef.current.renderAll();
    setActiveObjectProps((prev) => ({ ...prev, lineHeight: value }));
  }, []);

  const setActiveStrokeWidth = useCallback((value) => {
    if (!fabricRef.current) return;
    const obj = fabricRef.current.getActiveObject();
    if (!obj) return;
    const strokeObject = obj.type === 'line' || obj._strokeOnly;
    if (!strokeObject) return;
    obj.set({
      strokeWidth: value,
      strokeUniform: true,
    });
    if (obj._strokeOnly) obj.set({ fill: 'transparent' });
    fabricRef.current.renderAll();
    setActiveObjectProps((prev) => ({ ...prev, strokeWidth: value, strokeObject: true }));
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
      if (obj.type === 'line' || obj._strokeOnly) {
        obj.set({ stroke: displayColor });
      } else {
        obj.set({ fill: displayColor });
      }
      fabricRef.current.renderAll();
      setActiveColor(newColor);
      finalizeRecolor(obj, oldColor, newColor);
    }
  }, [syncInkLayers]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ─── Multi-select align ──────────────────────────────────────────────────────

  /**
   * Move every object in the current multi-selection so that all their
   * top-left corners coincide at the top-left of the overall selection bbox.
   * Identical shapes in different colors will overlap perfectly afterwards.
   */
  const alignSelectedItems = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const sel = fc.getActiveObject();
    if (!sel || sel.type !== 'activeSelection') return;

    // Save the target top-left BEFORE discarding (canvas coordinates)
    const selBBox    = sel.getBoundingRect();
    const targetLeft = selBBox.left;
    const targetTop  = selBBox.top;

    // Collect object references, then discard so canvas coords are restored
    const objs = [...sel.getObjects()];
    fc.discardActiveObject();

    // Move each object so its own top-left aligns to targetLeft / targetTop
    objs.forEach((obj) => {
      const bbox = obj.getBoundingRect();
      obj.set({
        left: obj.left + (targetLeft - bbox.left),
        top:  obj.top  + (targetTop  - bbox.top),
      });
      obj.setCoords();
    });

    // Re-create the selection so the user can keep working with it
    const newSel = new fabric.ActiveSelection(objs, { canvas: fc });
    fc.setActiveObject(newSel);
    fc.renderAll();
    setMultiSelectRect(newSel.getBoundingRect());
    syncInkLayers();
  }, [syncInkLayers]);

  // ─── Randomize layer shift ───────────────────────────────────────────────────

  /**
   * Apply an independent random offset (dx, dy) within ±amount pixels to
   * every ink color layer, simulating Riso misregistration between passes.
   */
  const randomizeLayerShift = useCallback((amount) => {
    const fc = fabricRef.current;
    if (!fc) return;
    // Each unique ink color gets its own random (dx, dy)
    const offsets = new Map();
    for (const hex of inkLayerOrderRef.current) {
      const dx = (Math.random() * 2 - 1) * amount;
      const dy = (Math.random() * 2 - 1) * amount;
      offsets.set(hex, { dx, dy });
    }
    fc.getObjects().forEach((obj) => {
      const o = offsets.get(obj._risoColor);
      if (!o) return;
      obj.set({ left: obj.left + o.dx, top: obj.top + o.dy });
      obj.setCoords();
    });
    fc.renderAll();
    syncInkLayers();
  }, [syncInkLayers]);

  const setBackgroundRandom = useCallback(() => {
    const n = backgroundUrlsRef.current.length;
    if (n < 1) return;
    let next;
    let guard = 0;
    do {
      next = Math.floor(Math.random() * n);
      guard += 1;
    } while (next === backgroundIndexRef.current && n > 1 && guard < 16);
    setBackgroundIndex(next);
  }, []);

  const setBackgroundNext = useCallback(() => {
    const n = backgroundUrlsRef.current.length;
    if (n < 1) return;
    setBackgroundIndex((i) => (i + 1) % n);
  }, []);

  const setBackgroundPrev = useCallback(() => {
    const n = backgroundUrlsRef.current.length;
    if (n < 1) return;
    setBackgroundIndex((i) => (i - 1 + n) % n);
  }, []);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = async (e) => {
      const active  = fabricRef.current?.getActiveObject();
      const tag     = document.activeElement?.tagName?.toLowerCase();
      const inInput = ['input', 'textarea', 'select'].includes(tag);

      if (inInput || active?.isEditing) return;

      // Delete / Backspace — remove selected object
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (active?.id) {
          e.preventDefault();
          removeLayer(active.id);
        }
      }

      // Cmd+C / Ctrl+C — copy selected object into clipboard ref
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        if (active) {
          e.preventDefault();
          clipboardRef.current = await active.clone();
          // Clone may drop custom metadata on some object types; preserve explicitly.
          clipboardRef.current._risoColor = active._risoColor;
          clipboardRef.current._label = active._label;
          clipboardRef.current._originalSrc = active._originalSrc;
          clipboardRef.current._brightness = active._brightness;
          clipboardRef.current._contrast = active._contrast;
          clipboardRef.current._strokeOnly = active._strokeOnly;
        }
      }

      // Cmd+V / Ctrl+V — paste copy at the exact same position
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        if (!clipboardRef.current || !fabricRef.current) return;
        e.preventDefault();

        // Clone again so each paste is independent
        const pasted = await clipboardRef.current.clone();

        // Preserve all custom riso properties from the original
        pasted.id          = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        pasted._risoColor  = clipboardRef.current._risoColor;
        pasted._label      = clipboardRef.current._label;
        pasted._originalSrc = clipboardRef.current._originalSrc;
        pasted._brightness = clipboardRef.current._brightness;
        pasted._contrast   = clipboardRef.current._contrast;
        pasted._strokeOnly = clipboardRef.current._strokeOnly;

        if (pasted._strokeOnly) {
          const strokeColor = applyBrightnessToHex(
            pasted._risoColor ?? '#000000',
            pasted._brightness ?? 0,
          );
          pasted.set({
            fill: 'transparent',
            stroke: strokeColor,
            strokeWidth: pasted.strokeWidth ?? 4,
            strokeUniform: true,
          });
        }
        if (pasted.type === 'line') {
          pasted.set({ strokeUniform: true });
        }

        fabricRef.current.add(pasted);
        fabricRef.current.setActiveObject(pasted);
        afterAdd(pasted);
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [removeLayer, afterAdd]);

  // ─── Export ───────────────────────────────────────────────────────────────────

  const exportPng = useCallback(() => {
    if (!fabricRef.current) return null;
    const fc = fabricRef.current;

    fc.renderAll();

    // lowerCanvasEl is scaled by devicePixelRatio internally by Fabric, so its
    // actual pixel dimensions are larger than fc.width / fc.height.
    // Use the element's real pixel size to capture the full image.
    const actualW = fc.lowerCanvasEl.width;
    const actualH = fc.lowerCanvasEl.height;

    const offscreen = document.createElement('canvas');
    offscreen.width  = actualW;
    offscreen.height = actualH;
    const ctx = offscreen.getContext('2d');

    ctx.drawImage(fc.lowerCanvasEl, 0, 0);

    // Overlay white dropout grain at the same physical resolution
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.65;
    ctx.drawImage(generateGrainCanvas(actualW, actualH), 0, 0);

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

  const downloadLayeredPngs = useCallback(async () => {
    if (!fabricRef.current) return 0;
    const fc = fabricRef.current;
    const allObjects = fc.getObjects();
    if (!allObjects.length) return 0;

    const usedHexes = inkLayerOrderRef.current.filter((hex) =>
      allObjects.some((obj) => obj._risoColor === hex),
    );
    if (!usedHexes.length) return 0;

    let downloadCount = 0;
    for (let i = 0; i < usedHexes.length; i += 1) {
      const hex = usedHexes[i];
      const layerObjects = allObjects.filter((obj) => obj._risoColor === hex);
      if (!layerObjects.length) continue;

      const el = document.createElement('canvas');
      const width = fc.getWidth();
      const height = fc.getHeight();
      el.width = width;
      el.height = height;
      const sc = new fabric.StaticCanvas(el, { width, height, backgroundColor: 'transparent' });

      for (const obj of layerObjects) {
        const clone = await obj.clone();
        const isStrokeOnly =
          obj.type === 'line'
          || obj._strokeOnly
          || (
            !!obj.stroke
            && (obj.fill === 'transparent' || obj.fill === '' || obj.fill == null)
          );

        // Render all layer exports as grayscale for print prep.
        if (clone.type === 'image') {
          const existing = clone.filters ?? [];
          clone.filters = [...existing, new fabric.filters.Grayscale()];
          clone.applyFilters();
        } else if (isStrokeOnly) {
          clone.set({
            stroke: '#000000',
            fill: 'transparent',
          });
        } else {
          clone.set({
            fill: '#000000',
            stroke: clone.stroke ? '#000000' : clone.stroke,
          });
        }

        clone.set({ globalCompositeOperation: 'source-over' });
        sc.add(clone);
      }

      sc.renderAll();
      const dataUrl = sc.toDataURL({
        format: 'png',
        multiplier: window.devicePixelRatio || 1,
      });
      sc.dispose();

      const name = safeName(colorName(hex) || `layer-${i + 1}`);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `riso-layer-${String(i + 1).padStart(2, '0')}-${name}.png`;
      a.click();
      downloadCount += 1;
    }

    return downloadCount;
  }, []);

  return {
    canvasRef,
    fabricRef,
    inkLayers,
    activeId,
    activeColor,
    activeObjectType,
    activeObjectProps,
    setBackgroundRandom,
    setBackgroundNext,
    setBackgroundPrev,
    backgroundUrlsLength: backgroundUrls.length,
    addShape,
    addText,
    addImage,
    removeLayer,
    clearCanvas,
    removeInkLayer,
    toggleInkLayer,
    moveInkLayerUp,
    moveInkLayerDown,
    recolorActive,
    alignSelectedItems,
    multiSelectRect,
    randomizeLayerShift,
    setActiveOpacity,
    setActiveBrightness,
    setActiveContrast,
    setActiveFontSize,
    setActiveCharSpacing,
    setActiveLineHeight,
    setActiveStrokeWidth,
    exportPng,
    downloadPng,
    downloadLayeredPngs,
  };
}
