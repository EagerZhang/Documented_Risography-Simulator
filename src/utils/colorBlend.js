/** Inline hex ↔ rgb helpers so this file stays self-contained */
function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/**
 * Linearly interpolate between two hex colors.
 * t = 0 → pure hexA, t = 1 → pure hexB.
 */
export function blendHex(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex(
    Math.round(a.r + (b.r - a.r) * t),
    Math.round(a.g + (b.g - a.g) * t),
    Math.round(a.b + (b.b - a.b) * t),
  );
}

/**
 * Blend three hex colors by weight.
 * wA + wB can exceed 1 — in that case Ink C is dropped and A/B are normalised.
 */
export function blend3Hex(hexA, hexB, hexC, wA, wB) {
  let wC = Math.max(0, 1 - wA - wB);
  let normA = wA, normB = wB, normC = wC;

  if (wA + wB > 1) {
    const total = wA + wB;
    normA = wA / total;
    normB = wB / total;
    normC = 0;
  }

  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const c = hexToRgb(hexC);

  return rgbToHex(
    Math.round(a.r * normA + b.r * normB + c.r * normC),
    Math.round(a.g * normA + b.g * normB + c.g * normC),
    Math.round(a.b * normA + b.b * normB + c.b * normC),
  );
}
