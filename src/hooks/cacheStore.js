const CACHE_PREFIX = 'sanate_cache_';

const getCacheKey = (key) => `${CACHE_PREFIX}${key}`;

export const readCache = (key, maxAgeMs) => {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(getCacheKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Object.prototype.hasOwnProperty.call(parsed, 'data')) {
      return null;
    }
    const ts = Number(parsed.ts || 0);
    const ageMs = ts > 0 ? Date.now() - ts : null;
    const isStale = typeof maxAgeMs === 'number' && ageMs !== null && ageMs > maxAgeMs;
    return { data: parsed.data, isStale };
  } catch {
    return null;
  }
};

export const writeCache = (key, data) => {
  if (!key) return;
  try {
    localStorage.setItem(
      getCacheKey(key),
      JSON.stringify({ ts: Date.now(), data })
    );
  } catch {
    // Ignora errores de almacenamiento.
  }
};
