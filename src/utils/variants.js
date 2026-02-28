import { parseCOP } from './price';

export const normalizeVariantValue = (value, fallbackPrice = 0) => {
    const raw = String(value ?? '').trim();
    if (!raw) return '';

    let label = raw;
    let price = parseCOP(fallbackPrice);

    if (raw.includes('|')) {
        const [left, right] = raw.split('|');
        label = String(left || '').trim();
        const parsed = parseCOP(right);
        if (parsed > 0) price = parsed;
    } else {
        const match = raw.match(/^(.*?)(?:\s*[-|]\s*\$?\s*([\d.,]+))$/);
        if (match) {
            label = String(match[1] || '').trim();
            const parsed = parseCOP(match[2]);
            if (parsed > 0) price = parsed;
        }
    }

    if (!label) return '';
    if (!price || Number.isNaN(price) || price <= 0) return `${label}|`;
    return `${label}|${Math.round(price)}`;
};

export const validateNormalizedVariant = (value) => {
    const raw = String(value ?? '').trim();
    if (!raw) return { ok: true, normalized: '' };
    const normalized = normalizeVariantValue(raw);
    const [label, amount] = normalized.split('|');
    const price = parseCOP(amount);
    if (!label || price <= 0) {
        return {
            ok: false,
            normalized,
            message: `Variante invalida: "${raw}". Usa formato Texto|Precio, ejemplo: 3 Curcuma 100 g|66000`,
        };
    }
    return { ok: true, normalized };
};

