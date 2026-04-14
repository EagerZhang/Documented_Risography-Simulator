import { useState, useCallback, useEffect, useRef } from 'react';
import { useCanvas } from './hooks/useCanvas';
import { CANVAS_SIZES, RISO_COLORS } from './utils/risoColors';

import ActionBar    from './components/ActionBar';
import ToolPanel    from './components/Sidebar/ToolPanel';
import RisoCanvas   from './components/Canvas/RisoCanvas';
import LayerPanel   from './components/LayerPanel/LayerPanel';
import SubmitModal  from './components/SubmitModal';

const DEFAULT_INK = RISO_COLORS[0].hex; // Fluorescent Pink

export default function App() {
  const [canvasSize,  setCanvasSize]  = useState('letter-v');
  const [inkColor,    setInkColor]    = useState(DEFAULT_INK);
  const [submitOpen,  setSubmitOpen]  = useState(false);
  const [toast,       setToast]       = useState(null);

  // Canvas scale: fit canvas into available center area
  const [scale, setScale] = useState(1);
  const centerRef = useRef(null);

  const {
    canvasRef,
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
    setActiveContrast,
    downloadPng,
    exportPng,
  } = useCanvas(canvasSize);

  // ── Compute scale to fit canvas in center pane ───────────────────────────────
  useEffect(() => {
    const recalculate = () => {
      if (!centerRef.current) return;
      const size    = CANVAS_SIZES.find((s) => s.id === canvasSize) || CANVAS_SIZES[0];
      const padding = 48;
      const availW  = centerRef.current.clientWidth  - padding;
      const availH  = centerRef.current.clientHeight - padding;
      const scaleW  = availW / size.width;
      const scaleH  = availH / size.height;
      setScale(Math.min(scaleW, scaleH, 1));
    };

    recalculate();
    const ro = new ResizeObserver(recalculate);
    if (centerRef.current) ro.observe(centerRef.current);
    return () => ro.disconnect();
  }, [canvasSize]);

  // ── Keep inkColor in sync with the selected object's color ──────────────────
  // So the color picker always reflects the active object
  useEffect(() => {
    if (activeColor) setInkColor(activeColor);
  }, [activeColor]);

  // ── Toast helper ─────────────────────────────────────────────────────────────
  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Color change: recolor active object or set next-object color ─────────────
  const handleInkColorChange = useCallback((color) => {
    setInkColor(color);
    if (activeId) recolorActive(color);
  }, [activeId, recolorActive]);

  // ── Download ─────────────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    downloadPng();
    showToast('Downloaded!', 'success');
  }, [downloadPng, showToast]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-zinc-950">
      {/* ── Top bar ── */}
      <ActionBar
        canvasSize={canvasSize}
        onCanvasSizeChange={setCanvasSize}
        onDownload={handleDownload}
        onOpenSubmit={() => setSubmitOpen(true)}
        layerCount={inkLayers.length}
      />

      {/* ── Main three-column layout ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: tool panel */}
        <ToolPanel
          paperColor={paperColor}
          onPaperChange={setPaperColor}
          onAddShape={addShape}
          onAddText={addText}
          onAddImage={addImage}
          inkColor={inkColor}
          onInkColorChange={handleInkColorChange}
          onApplySmudge={recolorActiveWithRecipe}
          onPreviewSmudge={previewActiveColor}
          activeObjectType={activeObjectType}
          activeObjectProps={activeObjectProps}
          onOpacityChange={setActiveOpacity}
          onContrastChange={setActiveContrast}
        />

        {/* Center: canvas */}
        <main
          ref={centerRef}
          className="flex-1 overflow-hidden flex items-center justify-center bg-zinc-800"
          style={{
            backgroundImage:  'radial-gradient(circle, #3f3f46 1px, transparent 1px)',
            backgroundSize:   '20px 20px',
          }}
        >
          <RisoCanvas
            ref={canvasRef}
            canvasSize={canvasSize}
            scale={scale}
          />
        </main>

        {/* Right: ink layer panel */}
        <LayerPanel
          inkLayers={inkLayers}
          activeId={activeId}
          onRemoveObject={removeLayer}
          onToggleInkLayer={toggleInkLayer}
          onRemoveInkLayer={removeInkLayer}
          onMoveInkLayerUp={moveInkLayerUp}
          onMoveInkLayerDown={moveInkLayerDown}
        />
      </div>

      {/* ── Submit modal ── */}
      <SubmitModal
        isOpen={submitOpen}
        onClose={() => setSubmitOpen(false)}
        getDataUrl={exportPng}
        layerCount={inkLayers.length}
        canvasSize={canvasSize}
      />

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 ${
            toast.type === 'success'
              ? 'bg-amber-400 text-black'
              : toast.type === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-zinc-700 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
