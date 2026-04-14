import { useEffect, useRef } from 'react';
import { generateGrainCanvas } from '../../utils/generateGrain';

/**
 * Renders a fine-speckle grain texture as an HTML canvas positioned absolutely
 * over the Fabric canvas. CSS mix-blend-mode: multiply means the grain is only
 * visible over ink areas — white paper stays clean.
 *
 * The canvas is regenerated whenever the display dimensions change.
 */
export default function GrainOverlay({ width, height }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !width || !height) return;
    const grain = generateGrainCanvas(width, height);
    ref.current.width  = width;
    ref.current.height = height;
    const ctx = ref.current.getContext('2d');
    ctx.drawImage(grain, 0, 0);
  }, [width, height]);

  return (
    <canvas
      ref={ref}
      className="grain-overlay"
      aria-hidden="true"
    />
  );
}
