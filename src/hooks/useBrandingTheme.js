import { useEffect } from 'react';
import baseURL from '../Components/url';

let defaultTheme = null;

const getDefaultTheme = () => {
  if (defaultTheme) return defaultTheme;
  const styles = getComputedStyle(document.documentElement);
  defaultTheme = {
    color1: styles.getPropertyValue('--color1').trim(),
    color2: styles.getPropertyValue('--color2').trim(),
    color3: styles.getPropertyValue('--color3').trim(),
  };
  return defaultTheme;
};

const setThemeVars = (theme) => {
  const root = document.documentElement;
  root.style.setProperty('--color1', theme.color1);
  root.style.setProperty('--color2', theme.color2);
  root.style.setProperty('--color3', theme.color3);
};

const normalizeHex = (value) => {
  if (!value) return null;
  const raw = value.trim();
  if (!raw.startsWith('#')) return null;
  if (raw.length === 4) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toLowerCase();
  }
  if (raw.length === 7) {
    return raw.toLowerCase();
  }
  return null;
};

const hexToRgb = (hex) => {
  const parsed = hex.replace('#', '');
  const r = parseInt(parsed.substring(0, 2), 16);
  const g = parseInt(parsed.substring(2, 4), 16);
  const b = parseInt(parsed.substring(4, 6), 16);
  return { r, g, b };
};

const rgbToHex = ({ r, g, b }) => {
  const toHex = (num) => num.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const darken = (rgb, factor = 0.18) => ({
  r: Math.max(0, Math.round(rgb.r * (1 - factor))),
  g: Math.max(0, Math.round(rgb.g * (1 - factor))),
  b: Math.max(0, Math.round(rgb.b * (1 - factor))),
});

const buildTheme = (colorValue) => {
  const hex = normalizeHex(colorValue);
  if (!hex) {
    return {
      color1: colorValue,
      color2: colorValue,
      color3: colorValue,
    };
  }
  const rgb = hexToRgb(hex);
  const darker = darken(rgb);
  return {
    color1: hex,
    color2: rgbToHex(darker),
    color3: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`,
  };
};

const resolveSlug = () => {
  const params = new URLSearchParams(window.location.search || '');
  const querySlug = params.get('tienda') || params.get('store');
  if (querySlug) return querySlug;

  const path = window.location.pathname || '';
  const dashboardMatch = path.match(/^\/dashboard-([^/]+)/);
  if (dashboardMatch) return dashboardMatch[1];

  const homeMatch = path.match(/^\/home-([^/]+)/);
  if (homeMatch) return homeMatch[1];

  const homeDotMatch = path.match(/^\/home\.([^/]+)/);
  if (homeDotMatch) return homeDotMatch[1];

  const host = window.location.hostname || '';
  if (host.startsWith('home.')) {
    const rest = host.slice(5);
    const slug = rest.split('.')[0];
    if (slug) return slug;
  }

  if (path.startsWith('/dashboard')) return null;

  return null;
};

export default function useBrandingTheme() {
  useEffect(() => {
    const applyDefault = () => {
      const theme = getDefaultTheme();
      setThemeVars(theme);
    };

    const applyTheme = async () => {
      const slug = resolveSlug();
      if (!slug || slug === 'default') {
        applyDefault();
        return;
      }

      try {
        const apiBase = baseURL.replace(/\/+$/, '');
        const response = await fetch(`${apiBase}/tiendasGet.php`);
        const data = await response.json();
        const tienda = data?.tiendas?.find((item) => item.slug === slug);
        if (tienda?.color) {
          setThemeVars(buildTheme(tienda.color));
          return;
        }
      } catch (error) {
        console.error('Error al cargar color de tienda:', error);
      }

      applyDefault();
    };

    applyTheme();
  }, []);
}
