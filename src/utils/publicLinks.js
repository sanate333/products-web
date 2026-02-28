import { getTiendaSlug } from './tienda';

const normalizeWord = (value = '') =>
    String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .trim();

export const toShortProductSlug = (title = '') => {
    const words = normalizeWord(title)
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 3);

    return words.join('-') || 'producto';
};

const storePrefix = () => {
    const slug = getTiendaSlug();
    return slug ? `/${slug}` : '';
};

export const buildProductPath = (idProducto, title = '') =>
    `${storePrefix()}/producto/${toShortProductSlug(title)}`;

export const buildCatalogPath = () => `${storePrefix()}/catalogo`;
