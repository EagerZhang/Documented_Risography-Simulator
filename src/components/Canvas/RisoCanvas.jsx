import { forwardRef } from 'react';
import GrainOverlay from './GrainOverlay';
import { CANVAS_SIZES } from '../../utils/risoColors';

/**
 * Renders the Fabric.js canvas element inside a scaled wrapper.
 * Fabric manages the intrinsic pixel dimensions; the CSS transform
 * scales the visual display to fit the center pane without affecting
 * Fabric's coordinate system.
 */
const RisoCanvas = forwardRef(function RisoCanvas(
  {
    canvasSize,
    scale,
    multiSelectRect,
    onAlignItems,
    onBackgroundRandom,
    onBackgroundPrev,
    onBackgroundNext,
    backgroundNavEnabled,
    onQuestionsClick,
  },
  ref,
) {
  const size = CANVAS_SIZES.find((s) => s.id === canvasSize) || CANVAS_SIZES[0];

  // Outer wrapper matches the *display* size so the surrounding flex layout
  // sizes correctly, while the inner div applies the CSS scale transform.
  const displayWidth  = Math.round(size.width  * scale);
  const displayHeight = Math.round(size.height * scale);

  // Position the Align button just below the selection bounding box,
  // centered horizontally. All values are in display (CSS) pixels.
  const alignBtnStyle = multiSelectRect ? {
    position: 'absolute',
    left:  Math.round((multiSelectRect.left + multiSelectRect.width / 2) * scale),
    top:   Math.round((multiSelectRect.top  + multiSelectRect.height)    * scale) + 8,
    transform: 'translateX(-50%)',
    zIndex: 10,
  } : null;

  const btnBase =
    'rounded-lg border border-black bg-[#eeeeee] text-black text-xs font-medium hover:bg-black hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="canvas-wrapper rounded-xl overflow-hidden relative border border-black bg-[#eeeeee]"
        style={{ width: displayWidth, height: displayHeight }}
      >
        <div
          style={{
            transformOrigin: 'top left',
            transform:       `scale(${scale})`,
            width:           size.width,
            height:          size.height,
          }}
        >
          <canvas ref={ref} />
        </div>

        {/* Grain texture — pointer-events: none set in CSS */}
        <GrainOverlay width={displayWidth} height={displayHeight} />

        {/* Align Items button — shown only when multiple objects are selected */}
        {multiSelectRect && (
          <button
            style={alignBtnStyle}
            onClick={onAlignItems}
            className="px-3 py-1.5 text-xs font-medium bg-[#eeeeee] text-black border border-black rounded-lg hover:bg-black hover:text-white transition-colors whitespace-nowrap"
          >
            Align Items
          </button>
        )}
      </div>

      {/* Bottom controls row */}
      <div className="w-full flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap rounded-xl border border-black bg-[#eeeeee] p-1.5">
          <button
            type="button"
            title="Previous background"
            onClick={onBackgroundPrev}
            disabled={!backgroundNavEnabled}
            className={`${btnBase} px-2.5 py-1.5`}
          >
            ←
          </button>
          <button
            type="button"
            title="Pick a random background"
            onClick={onBackgroundRandom}
            disabled={!backgroundNavEnabled}
            className={`${btnBase} px-3 py-1.5 max-w-[11rem] sm:max-w-none`}
          >
            Randomize Question
          </button>
          <button
            type="button"
            title="Next background"
            onClick={onBackgroundNext}
            disabled={!backgroundNavEnabled}
            className={`${btnBase} px-2.5 py-1.5`}
          >
            →
          </button>
        </div>

        <button
          type="button"
          onClick={onQuestionsClick}
          className={`${btnBase} px-3 py-1.5`}
        >
          What Are These Questions?
        </button>
      </div>
    </div>
  );
});

export default RisoCanvas;
