import { useEffect, useState } from 'react';
import { getTiendaSlug } from '../utils/tienda';
import baseURL from '../Components/url';

export const DEFAULT_WHATSAPP_NUMBER = '573234549614';
const buildWhatsappKey = (slug) => `sanate_whatsapp_number_${slug || 'principal'}`;

const normalizeWhatsappNumber = (value) => String(value || '').replace(/\D/g, '').slice(0, 20);

export const setWhatsappNumber = (value, slug) => {
  const tienda = slug || getTiendaSlug();
  const key = buildWhatsappKey(tienda);
  const normalized = normalizeWhatsappNumber(value);
  if (normalized) {
    localStorage.setItem(key, normalized);
  } else {
    localStorage.removeItem(key);
  }
  window.dispatchEvent(new Event('whatsappNumberChanged'));
};

const getStoredWhatsappNumber = (slug) => {
  const value = localStorage.getItem(buildWhatsappKey(slug)) || '';
  return normalizeWhatsappNumber(value) || DEFAULT_WHATSAPP_NUMBER;
};

export const getWhatsappNumber = (slug) => getStoredWhatsappNumber(slug || getTiendaSlug());

export const buildWhatsappUrl = (message = '', slug) => {
  const number = getWhatsappNumber(slug);
  const text = String(message || '').trim();
  return text
    ? `https://wa.me/${number}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${number}`;
};

export default function useWhatsappNumber() {
  const [whatsappNumber, setWhatsappNumberState] = useState(() => {
    const slug = getTiendaSlug();
    return getStoredWhatsappNumber(slug);
  });

  useEffect(() => {
    const slug = getTiendaSlug();
    const handleUpdate = () => {
      setWhatsappNumberState(getStoredWhatsappNumber(slug));
    };
    handleUpdate();

    const fetchWhatsappFromStore = async () => {
      try {
        if (!slug) return;
        const apiBase = baseURL.replace(/\/+$/, '');
        const response = await fetch(`${apiBase}/tiendasGet.php`);
        const data = await response.json();
        const tienda = data?.tiendas?.find((item) => item.slug === slug);
        const serverNumber = normalizeWhatsappNumber(tienda?.whatsapp || '');
        if (!serverNumber) return;
        localStorage.setItem(buildWhatsappKey(slug), serverNumber);
        setWhatsappNumberState(serverNumber);
      } catch (error) {
        // no-op, usa fallback local
      }
    };

    fetchWhatsappFromStore();

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('whatsappNumberChanged', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('whatsappNumberChanged', handleUpdate);
    };
  }, []);

  return { whatsappNumber, setWhatsappNumber };
}
