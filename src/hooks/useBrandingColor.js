import { useEffect, useState } from 'react';
import { getTiendaSlug } from '../utils/tienda';
import { applyThemeToCssVars, getStoredBrandTheme, setStoredBrandTheme, suggestAccent } from '../utils/brandTheme';

const DEFAULT_BRANDING_COLOR = '#2aaae2';
const buildBrandingKey = (slug) => `sanate_branding_color_${slug || 'principal'}`;

export const setBrandingColor = (colorValue, slug) => {
  const tienda = slug || getTiendaSlug();
  const key = buildBrandingKey(tienda);
  if (colorValue) {
    localStorage.setItem(key, colorValue);
    document.documentElement.style.setProperty('--color1', colorValue);
    const currentTheme = getStoredBrandTheme(tienda);
    setStoredBrandTheme(tienda, {
      ...currentTheme,
      baseHex: colorValue,
      accentHex: currentTheme?.accentHex || suggestAccent(colorValue),
    });
    window.dispatchEvent(new Event('brandingColorChanged'));
  } else {
    localStorage.removeItem(key);
    document.documentElement.style.setProperty('--color1', DEFAULT_BRANDING_COLOR);
    setStoredBrandTheme(tienda, {
      ...getStoredBrandTheme(tienda),
      baseHex: DEFAULT_BRANDING_COLOR,
      accentHex: suggestAccent(DEFAULT_BRANDING_COLOR),
    });
    window.dispatchEvent(new Event('brandingColorChanged'));
  }
};

const getStoredBrandingColor = (slug) =>
  localStorage.getItem(buildBrandingKey(slug)) || DEFAULT_BRANDING_COLOR;

export default function useBrandingColor() {
  const [brandingColor, setBrandingColorState] = useState(() => {
    const slug = getTiendaSlug();
    return getStoredBrandingColor(slug);
  });

  useEffect(() => {
    const slug = getTiendaSlug();
    const stored = getStoredBrandingColor(slug);
    setBrandingColorState(stored);
    document.documentElement.style.setProperty('--color1', stored);
    applyThemeToCssVars(getStoredBrandTheme(slug));

    const handleUpdate = () => {
      const newColor = getStoredBrandingColor(slug);
      setBrandingColorState(newColor);
      document.documentElement.style.setProperty('--color1', newColor);
      applyThemeToCssVars(getStoredBrandTheme(slug));
    };

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('brandingColorChanged', handleUpdate);
    window.addEventListener('brandingThemeChanged', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('brandingColorChanged', handleUpdate);
      window.removeEventListener('brandingThemeChanged', handleUpdate);
    };
  }, []);

  return { brandingColor, setBrandingColor };
}
