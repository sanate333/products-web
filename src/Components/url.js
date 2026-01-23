// Usa el mismo dominio donde está alojada la app (endpoints PHP en la raíz)
const baseURL = 'https://sanate.store/';
const normalizedBaseURL = baseURL.replace(/\/+$/, '');

export const resolveImg = (src) => {
    if (!src) return null;
    if (src.startsWith('http://')) return src.replace('http://', 'https://');
    if (src.startsWith('https://')) return src;
    const clean = src.replace(/^\/+/, '').replace(/^\.\/+/, '');
    return `${normalizedBaseURL}/${clean}`;
};

export default baseURL;
