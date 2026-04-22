import { useState, useCallback, useEffect, useRef } from 'react';
import { useCanvas } from './hooks/useCanvas';
import { CANVAS_SIZES, RISO_COLORS } from './utils/risoColors';

import ActionBar    from './components/ActionBar';
import ToolPanel    from './components/Sidebar/ToolPanel';
import RisoCanvas   from './components/Canvas/RisoCanvas';
import LayerPanel   from './components/LayerPanel/LayerPanel';

const DEFAULT_INK = RISO_COLORS[0].hex; // Fluorescent Pink

export default function App() {
  const canvasSize = 'letter-v';
  const [inkColor,    setInkColor]    = useState(DEFAULT_INK);
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
    setBackgroundRandom,
    setBackgroundNext,
    setBackgroundPrev,
    backgroundUrlsLength,
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
    setActiveContrast,
    setActiveFontSize,
    setActiveCharSpacing,
    setActiveLineHeight,
    setActiveStrokeWidth,
    downloadPng,
    downloadLayeredPngs,
  } = useCanvas(canvasSize);

  // ── Compute scale to fit canvas in center pane ───────────────────────────────
  useEffect(() => {
    const recalculate = () => {
      if (!centerRef.current) return;
      const size    = CANVAS_SIZES.find((s) => s.id === canvasSize) || CANVAS_SIZES[0];
      const padding = 96;
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

  const handleDownloadLayers = useCallback(async () => {
    const count = await downloadLayeredPngs();
    if (count > 0) showToast(`Downloaded ${count} layered PNG${count > 1 ? 's' : ''}.`, 'success');
    else showToast('No layer content to export.', 'info');
  }, [downloadLayeredPngs, showToast]);

  const handleQuestionsClick = useCallback(() => {
    window.open(
      'https://www.uscis.gov/sites/default/files/document/questions-and-answers/100q.pdf',
      '_blank',
      'noopener,noreferrer',
    );
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#eeeeee]">
      {/* ── Top bar ── */}
      <ActionBar
        onDownload={handleDownload}
        onDownloadLayers={handleDownloadLayers}
      />

      {/* ── Main three-zone layout ── */}
      <div className="flex flex-1 overflow-hidden gap-4 px-4 pb-4 pt-4">
        {/* Left: tool panel */}
        <ToolPanel
          onAddShape={addShape}
          onAddText={addText}
          onAddImage={addImage}
          inkColor={inkColor}
          onInkColorChange={handleInkColorChange}
          activeObjectType={activeObjectType}
          activeObjectProps={activeObjectProps}
          onOpacityChange={setActiveOpacity}
          onContrastChange={setActiveContrast}
          onFontSizeChange={setActiveFontSize}
          onCharSpacingChange={setActiveCharSpacing}
          onLineHeightChange={setActiveLineHeight}
          onStrokeWidthChange={setActiveStrokeWidth}
        />

        {/* Center: canvas */}
        <main
          ref={centerRef}
          className="flex-1 overflow-hidden rounded-2xl border border-black bg-[#eeeeee] flex items-center justify-center py-6 relative"
        >
          <RisoCanvas
            ref={canvasRef}
            canvasSize={canvasSize}
            scale={scale}
            multiSelectRect={multiSelectRect}
            onAlignItems={alignSelectedItems}
            onBackgroundRandom={setBackgroundRandom}
            onBackgroundPrev={setBackgroundPrev}
            onBackgroundNext={setBackgroundNext}
            backgroundNavEnabled={backgroundUrlsLength > 0}
            onQuestionsClick={handleQuestionsClick}
          />
        </main>

        {/* Right: ink layer panel */}
        <LayerPanel
          inkLayers={inkLayers}
          activeId={activeId}
          onRemoveObject={removeLayer}
          onClearCanvas={clearCanvas}
          onToggleInkLayer={toggleInkLayer}
          onRemoveInkLayer={removeInkLayer}
          onMoveInkLayerUp={moveInkLayerUp}
          onMoveInkLayerDown={moveInkLayerDown}
          onRandomizeShift={randomizeLayerShift}
        />
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium border border-black z-50 ${
            toast.type === 'success'
              ? 'bg-[#eeeeee] text-black'
              : toast.type === 'error'
              ? 'bg-[#eeeeee] text-black'
              : 'bg-[#eeeeee] text-black'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
