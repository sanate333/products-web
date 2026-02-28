export const parseCOP = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

    let raw = String(value).trim().replace(/[^\d,.-]/g, '');
    if (!raw) return 0;

    const hasComma = raw.includes(',');
    const hasDot = raw.includes('.');

    if (hasComma && hasDot) {
        if (raw.lastIndexOf(',') > raw.lastIndexOf('.')) {
            raw = raw.replace(/\./g, '').replace(',', '.');
        } else {
            raw = raw.replace(/,/g, '');
        }
    } else if (hasComma) {
        const parts = raw.split(',');
        if (parts.length === 2 && parts[1].length <= 2) {
            raw = `${parts[0].replace(/\./g, '')}.${parts[1]}`;
        } else {
            raw = raw.replace(/,/g, '');
        }
    } else if (hasDot) {
        const parts = raw.split('.');
        if (!(parts.length === 2 && parts[1].length <= 2)) {
            raw = raw.replace(/\./g, '');
        }
    }

    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 0;
};

export const formatCOP = (value) =>
    new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Math.round(parseCOP(value)));
