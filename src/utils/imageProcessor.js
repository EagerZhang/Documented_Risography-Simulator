import { hexToRgb } from './risoColors';

/** Core pixel colorization — shared by both public functions below. */
function applyColorization(srcDataUrl, inkHex) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const offscreen = document.createElement('canvas');
      offscreen.width  = img.width;
      offscreen.height = img.height;
      const ctx = offscreen.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      const { r: ir, g: ig, b: ib } = hexToRgb(inkHex);

      for (let i = 0; i < data.length; i += 4) {
        const srcR = data[i];
        const srcG = data[i + 1];
        const srcB = data[i + 2];
        const srcA = data[i + 3];

        // Perceived luminance (0 = black, 255 = white)
        const luminance  = 0.2126 * srcR + 0.7152 * srcG + 0.0722 * srcB;
        // Dark pixels = more ink; light pixels = transparent
        const inkDensity = 1 - luminance / 255;

        data[i]     = ir;
        data[i + 1] = ig;
        data[i + 2] = ib;
        data[i + 3] = Math.round(srcA * inkDensity);
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(offscreen.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = srcDataUrl;
  });
}

/**
 * Colorizes a File into a single Riso ink color.
 * Returns { colorizedDataUrl, originalDataUrl } so callers can store the
 * original for later re-colorization.
 */
export function colorizeImage(file, inkHex) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const originalDataUrl = e.target.result;
      try {
        const colorizedDataUrl = await applyColorization(originalDataUrl, inkHex);
        resolve({ colorizedDataUrl, originalDataUrl });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Re-colorizes an already-loaded original data URL with a new ink color.
 * Used when the user changes the ink color of an existing image on the canvas.
 */
export function recolorizeDataUrl(originalDataUrl, inkHex) {
  return applyColorization(originalDataUrl, inkHex);
}
