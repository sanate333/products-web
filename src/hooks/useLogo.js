import { useEffect, useState } from 'react';
import defaultLogo from '../images/logo.png';
import baseURL from '../Components/url';
import { getTiendaSlug } from '../utils/tienda';

const buildLogoKey = (slug) => `sanate_logo_url_${slug || 'principal'}`;

export const setLogoUrl = (value, slug) => {
  const tienda = slug || getTiendaSlug();
  const key = buildLogoKey(tienda);
  if (value) {
    localStorage.setItem(key, value);
  } else {
    localStorage.removeItem(key);
  }
  window.dispatchEvent(new Event('logoChanged'));
};

const getStoredLogo = (slug) => localStorage.getItem(buildLogoKey(slug)) || '';

export default function useLogo() {
  const [logoUrl, setLogoUrlState] = useState(() => {
    const slug = getTiendaSlug();
    return getStoredLogo(slug) || defaultLogo;
  });

  useEffect(() => {
    const slug = getTiendaSlug();
    const key = buildLogoKey(slug);

    const handleUpdate = () => {
      const stored = localStorage.getItem(key) || '';
      setLogoUrlState(stored || defaultLogo);
    };

    const fetchLogo = async () => {
      try {
        if (!slug) {
          handleUpdate();
          return;
        }
        const apiBase = baseURL.replace(/\/+$/, '');
        const response = await fetch(`${apiBase}/tiendasGet.php`);
        const data = await response.json();
        const tienda = data?.tiendas?.find((item) => item.slug === slug);
        if (tienda?.logo) {
          localStorage.setItem(key, tienda.logo);
          setLogoUrlState(tienda.logo);
        } else {
          handleUpdate();
        }
      } catch (error) {
        handleUpdate();
      }
    };

    fetchLogo();
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('logoChanged', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('logoChanged', handleUpdate);
    };
  }, []);

  return logoUrl;
}
