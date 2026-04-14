import { forwardRef } from 'react';
import GrainOverlay from './GrainOverlay';
import { CANVAS_SIZES } from '../../utils/risoColors';

/**
 * Renders the Fabric.js canvas element inside a scaled wrapper.
 * Fabric manages the intrinsic pixel dimensions; the CSS transform
 * scales the visual display to fit the center pane without affecting
 * Fabric's coordinate system.
 */
const RisoCanvas = forwardRef(function RisoCanvas({ canvasSize, scale }, ref) {
  const size = CANVAS_SIZES.find((s) => s.id === canvasSize) || CANVAS_SIZES[0];

  // Outer wrapper matches the *display* size so the surrounding flex layout
  // sizes correctly, while the inner div applies the CSS scale transform.
  const displayWidth  = Math.round(size.width  * scale);
  const displayHeight = Math.round(size.height * scale);

  return (
    <div
      className="canvas-wrapper shadow-2xl rounded-sm overflow-hidden"
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
    </div>
  );
});

export default RisoCanvas;
