const DEFAULT_BASE = '#2aaae2';
const DEFAULT_ACCENT = '#d4af37';
const DEFAULT_MODE = 'luxury';

export const BRAND_MODES = ['clean', 'luxury', 'dark'];

export const buildBrandThemeKey = (slug) => `sanate_branding_theme_${slug || 'principal'}`;

export function normalizeHex(hex) {
  const raw = String(hex || '').trim().replace('#', '');
  if (raw.length === 3) {
    return `#${raw.split('').map((c) => c + c).join('')}`.toLowerCase();
  }
  if (raw.length === 6) return `#${raw}`.toLowerCase();
  return DEFAULT_BASE;
}

export function hexToRgb(hex) {
  const value = normalizeHex(hex).replace('#', '');
  const num = Number.parseInt(value, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function suggestAccent(baseHex) {
  const { r, g, b } = hexToRgb(baseHex);
  const isBlueish = b > r && b > g;
  const isCyanish = b > 120 && g > 120 && r < 140;
  if (isBlueish || isCyanish) return '#d4af37';
  return '#e7c873';
}

export function buildTheme(baseHex, accentHex, mode = DEFAULT_MODE) {
  return {
    baseHex: normalizeHex(baseHex || DEFAULT_BASE),
    accentHex: normalizeHex(accentHex || suggestAccent(baseHex || DEFAULT_BASE)),
    mode: BRAND_MODES.includes(mode) ? mode : DEFAULT_MODE,
  };
}

export function applyThemeToCssVars(theme) {
  if (typeof document === 'undefined') return;
  const safeTheme = buildTheme(theme?.baseHex, theme?.accentHex, theme?.mode);
  const base = hexToRgb(safeTheme.baseHex);
  const accent = hexToRgb(safeTheme.accentHex);
  const root = document.documentElement;
  root.style.setProperty('--color1', safeTheme.baseHex);
  root.style.setProperty('--brand', `${base.r}, ${base.g}, ${base.b}`);
  root.style.setProperty('--accent', `${accent.r}, ${accent.g}, ${accent.b}`);
  root.style.setProperty('--gold-1', safeTheme.accentHex);

  document.body.classList.remove('theme-clean', 'theme-luxury', 'theme-dark-luxury');
  if (safeTheme.mode === 'dark') {
    document.body.classList.add('theme-dark-luxury');
  } else if (safeTheme.mode === 'clean') {
    document.body.classList.add('theme-clean');
  } else {
    document.body.classList.add('theme-luxury');
  }
}

export function getStoredBrandTheme(slug) {
  if (typeof window === 'undefined') return buildTheme(DEFAULT_BASE, DEFAULT_ACCENT, DEFAULT_MODE);
  const key = buildBrandThemeKey(slug);
  const raw = localStorage.getItem(key);
  if (!raw) {
    return buildTheme(DEFAULT_BASE, DEFAULT_ACCENT, DEFAULT_MODE);
  }
  try {
    const parsed = JSON.parse(raw);
    return buildTheme(parsed?.baseHex, parsed?.accentHex, parsed?.mode);
  } catch (error) {
    return buildTheme(DEFAULT_BASE, DEFAULT_ACCENT, DEFAULT_MODE);
  }
}

export function setStoredBrandTheme(slug, theme) {
  if (typeof window === 'undefined') return;
  const safeTheme = buildTheme(theme?.baseHex, theme?.accentHex, theme?.mode);
  localStorage.setItem(buildBrandThemeKey(slug), JSON.stringify(safeTheme));
  applyThemeToCssVars(safeTheme);
  window.dispatchEvent(new Event('brandingThemeChanged'));
}

