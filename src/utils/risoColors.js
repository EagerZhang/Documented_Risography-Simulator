export const RISO_COLORS = [
  { id: 'black',             name: 'Black',             hex: '#000000' },
  { id: 'medium-blue',       name: 'Medium Blue',       hex: '#0078BF' },
  { id: 'bright-red',        name: 'Bright Red',        hex: '#F15060' },
  { id: 'fluorescent-pink',  name: 'Fluoro Pink',       hex: '#FF48B0' },
  { id: 'yellow',            name: 'Yellow',            hex: '#F7FF00' },
  { id: 'orange',            name: 'Orange',            hex: '#FF6C2F' },
  { id: 'kelly-green',       name: 'Kelly Green',       hex: '#67B346' },
  { id: 'sunflower',         name: 'Sunflower',         hex: '#FFB511' },
  { id: 'aqua',              name: 'Aqua',              hex: '#5EC8E5' },
  { id: 'mint',              name: 'Mint',              hex: '#82D8D5' },
  { id: 'orchid',            name: 'Orchid',            hex: '#BB76CF' },
  { id: 'teal',              name: 'Teal',              hex: '#00838A' },
  { id: 'hunter-green',      name: 'Hunter Green',      hex: '#1B5C2C' },
];

export const PAPER_OPTIONS = [
  { id: 'white',     name: 'White',      hex: '#FFFFFF' },
  { id: 'cream',     name: 'Cream',      hex: '#F5F0E8' },
  { id: 'natural',   name: 'Natural',    hex: '#EDE8D0' },
  { id: 'newsprint', name: 'Newsprint',  hex: '#D4CCB0' },
  { id: 'grey',      name: 'Light Grey', hex: '#CCCCCC' },
  { id: 'kraft',     name: 'Kraft',      hex: '#B5A084' },
  { id: 'canary',    name: 'Canary',     hex: '#F5E642' },
  { id: 'salmon',    name: 'Salmon',     hex: '#FFAAA0' },
  { id: 'sky',       name: 'Sky Blue',   hex: '#B8D8E8' },
];

export const CANVAS_SIZES = [
  { id: 'a4',     name: 'A4',      width: 794,  height: 1123 },
  { id: 'a4-l',   name: 'A4 Land', width: 1123, height: 794  },
  { id: 'a3',     name: 'A3',      width: 1123, height: 1587 },
  { id: 'square', name: 'Square',  width: 900,  height: 900  },
  { id: 'letter', name: 'Letter',  width: 816,  height: 1056 },
];

export const RISO_FONTS = [
  { id: 'space-mono',       name: 'Space Mono',       family: "'Space Mono', monospace" },
  { id: 'playfair',         name: 'Playfair Display', family: "'Playfair Display', serif" },
  { id: 'bebas-neue',       name: 'Bebas Neue',       family: "'Bebas Neue', sans-serif" },
  { id: 'dm-serif',         name: 'DM Serif Display', family: "'DM Serif Display', serif" },
  { id: 'inter',            name: 'Inter',            family: "'Inter', sans-serif" },
  { id: 'courier-prime',    name: 'Courier Prime',    family: "'Courier Prime', monospace" },
];

/** Hex string → { r, g, b } */
export function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** { r, g, b } → hex string */
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

/**
 * Blend a Riso ink hex color toward white (brightness > 0)
 * or toward black (brightness < 0).
 * brightness: -1 to 1, 0 = no change.
 */
export function applyBrightnessToHex(hex, brightness) {
  if (!brightness) return hex;
  const { r, g, b } = hexToRgb(hex);
  if (brightness > 0) {
    return rgbToHex(
      Math.round(r + (255 - r) * brightness),
      Math.round(g + (255 - g) * brightness),
      Math.round(b + (255 - b) * brightness),
    );
  }
  const factor = 1 + brightness; // 0..1
  return rgbToHex(Math.round(r * factor), Math.round(g * factor), Math.round(b * factor));
}
