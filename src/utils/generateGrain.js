/**
 * Generates a fine-speckle grain texture as an offscreen canvas.
 *
 * The grain is designed to be rendered with CSS/canvas mix-blend-mode: multiply
 * so it only darkens areas where ink is present — white paper areas stay clean.
 *
 * Visual character (matching a real Riso print):
 *   - Many tiny, light dark dots  — paper tooth showing through ink
 *   - Opacity varies per dot      — organic, non-uniform density
 *   - No large blobs              — dots are 1 px
 *
 * @param {number} width
 * @param {number} height
 * @param {number} intensity  0–1, default 0.5
 * @returns {HTMLCanvasElement}
 */
export function generateGrainCanvas(width, height, intensity = 0.5) {
  const canvas = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;

  const ctx       = canvas.getContext('2d');
  const imageData = ctx.createImageData(width, height);
  const px        = imageData.data;

  // Fraction of pixels that become a missing-ink dropout spot
  const threshold = intensity * 0.28; // ~70% of previous density

  for (let i = 0; i < px.length; i += 4) {
    const rnd = Math.random();
    if (rnd < threshold) {
      // White dropout — mimics paper showing through where ink didn't transfer
      px[i]     = 255;
      px[i + 1] = 255;
      px[i + 2] = 255;
      // Vary opacity so dots look organic, not perfectly stamped
      px[i + 3] = Math.round(120 + (rnd / threshold) * 120);
    }
    // All other pixels stay fully transparent
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
