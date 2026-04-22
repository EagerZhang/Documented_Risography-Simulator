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

/**
 * Decomposes a PNG file into 4 CMYK channel images, each colored with the
 * corresponding Riso ink. Returns an array of { dataUrl, risoColor } objects
 * in C → M → Y → K order.
 *
 * Mapping:
 *   C (cyan)    → #00AEEF
 *   M (magenta) → #FF48B0  (Fluorescent Pink)
 *   Y (yellow)  → #FFB511  (Sunflower)
 *   K (black)   → #000000
 */
export function cmykSplitImage(file) {
  const CHANNELS = [
    { key: 'c', risoColor: '#00AEEF' },
    { key: 'm', risoColor: '#FF48B0' },
    { key: 'y', risoColor: '#FFB511' },
    { key: 'k', risoColor: '#000000' },
  ];

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const originalDataUrl = e.target.result;
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const w = img.width;
        const h = img.height;

        // Read source pixels once
        const src = document.createElement('canvas');
        src.width = w;
        src.height = h;
        const srcCtx = src.getContext('2d');
        srcCtx.drawImage(img, 0, 0);
        const srcData = srcCtx.getImageData(0, 0, w, h).data;

        // Build one output canvas per channel
        const results = CHANNELS.map(({ key, risoColor }) => {
          const { r: ir, g: ig, b: ib } = hexToRgb(risoColor);

          const out = document.createElement('canvas');
          out.width = w;
          out.height = h;
          const outCtx = out.getContext('2d');
          const outImg = outCtx.createImageData(w, h);
          const d = outImg.data;

          for (let i = 0; i < srcData.length; i += 4) {
            const r = srcData[i]     / 255;
            const g = srcData[i + 1] / 255;
            const b = srcData[i + 2] / 255;
            const a = srcData[i + 3]; // 0–255

            const k = 1 - Math.max(r, g, b);
            let channelValue;
            if (k >= 1) {
              // Pure black pixel — only K channel has density
              channelValue = key === 'k' ? 1 : 0;
            } else {
              const denom = 1 - k;
              channelValue = key === 'c' ? (1 - r - k) / denom
                           : key === 'm' ? (1 - g - k) / denom
                           : key === 'y' ? (1 - b - k) / denom
                           : k; // 'k'
            }

            d[i]     = ir;
            d[i + 1] = ig;
            d[i + 2] = ib;
            d[i + 3] = Math.round(a * channelValue);
          }

          outCtx.putImageData(outImg, 0, 0);
          return { dataUrl: out.toDataURL('image/png'), risoColor };
        });

        resolve(results);
      };
      img.src = originalDataUrl;
    };
    reader.readAsDataURL(file);
  });
}
