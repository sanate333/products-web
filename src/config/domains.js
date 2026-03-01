const stripProtocol = (value) => String(value || '').replace(/^https?:\/\//i, '').replace(/\/+$/, '');

const envPublicDomain = process.env.REACT_APP_PUBLIC_STORE_DOMAIN || process.env.PUBLIC_STORE_DOMAIN;
const envDashboardDomain = process.env.REACT_APP_DASHBOARD_DOMAIN || process.env.DASHBOARD_DOMAIN;

export const PUBLIC_STORE_DOMAIN = stripProtocol(envPublicDomain || 'sanate.store');
export const DASHBOARD_DOMAIN = stripProtocol(envDashboardDomain || 'sanate.store');
export const DEFAULT_STORE_ADMIN_EMAIL = process.env.REACT_APP_DEFAULT_STORE_ADMIN_EMAIL || process.env.DEFAULT_STORE_ADMIN_EMAIL || '';
export const DEFAULT_STORE_ADMIN_PASSWORD = process.env.REACT_APP_DEFAULT_STORE_ADMIN_PASSWORD || process.env.DEFAULT_STORE_ADMIN_PASSWORD || '';

export const buildPublicStoreUrl = (slug, protocol = 'https') => {
    const cleanSlug = String(slug || '').trim().toLowerCase();
    if (!cleanSlug || ['principal', 'default', 'base', 'eco-commerce'].includes(cleanSlug)) {
        return `${protocol}://${PUBLIC_STORE_DOMAIN}`;
    }
    return `${protocol}://${PUBLIC_STORE_DOMAIN}/${cleanSlug}`;
};

export const buildDashboardStoreUrl = (slug, protocol = 'https') => {
    const cleanSlug = String(slug || '').trim().toLowerCase();
    if (!cleanSlug || ['principal', 'default', 'base', 'eco-commerce'].includes(cleanSlug)) {
        return `${protocol}://${DASHBOARD_DOMAIN}/dashboard`;
    }
    return `${protocol}://${DASHBOARD_DOMAIN}/dashboard/s/${cleanSlug}`;
};
