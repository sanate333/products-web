import { buildDashboardPath, getTiendaSlug } from './tienda';

export const buildInstallUrl = () => {
  const slug = getTiendaSlug();
  return `${window.location.origin}${buildDashboardPath(slug, '/install')}`;
};

export const buildChromeIntentUrl = (url) => {
  try {
    const target = new URL(url);
    const scheme = target.protocol.replace(':', '');
    const path = `${target.host}${target.pathname}${target.search}${target.hash}`;
    return `intent://${path}#Intent;scheme=${scheme};package=com.android.chrome;end`;
  } catch (error) {
    return null;
  }
};

export const openInstallTab = (url) => {
  try {
    window.open(url, '_blank', 'noopener');
  } catch (error) {
    window.location.href = url;
  }
};