/**
 * Background images live in `public/backgrounds/`.
 *
 * Preferred: `public/backgrounds/manifest.json` — either a JSON array of
 * filenames, or `{ "files": ["001.png", ...] }`. Paths are relative to
 * `/backgrounds/`.
 *
 * If manifest is missing or invalid, falls back to `/backgrounds/001.png`
 * … `/backgrounds/100.png`.
 */
export const BACKGROUND_FALLBACK_COUNT = 100;

export function defaultPngUrls() {
  return Array.from(
    { length: BACKGROUND_FALLBACK_COUNT },
    (_, i) => `/backgrounds/${String(i + 1).padStart(3, '0')}.png`,
  );
}

/**
 * @returns {Promise<string[]>} absolute URL paths under site root
 */
export async function loadBackgroundUrls() {
  try {
    const res = await fetch('/backgrounds/manifest.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`manifest ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : data?.files;
    if (!Array.isArray(list) || list.length === 0) throw new Error('empty manifest');
    return list.map((f) => {
      const name = String(f).replace(/^\/+/, '');
      return `/backgrounds/${name}`;
    });
  } catch {
    return defaultPngUrls();
  }
}
