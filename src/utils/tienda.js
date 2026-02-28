const RESERVED_ROOT_SEGMENTS = new Set([
    'dashboard',
    'producto',
    'catalogo',
    'catolog',
    'install',
    'tienda',
    's',
    'api',
    'public',
    'generated',
    'static',
    'assets',
]);

const DASHBOARD_SECTIONS = new Set([
    'inicio',
    'pedidos',
    'productos',
    'usuarios',
    'banners',
    'sub-banners',
    'contacto',
    'categorias',
    'codigos',
    'notificaciones',
    'imagenes-ia',
    'landing-pages',
    'whatsapp-bot',
    'whatsapp-ia',
    'clientes',
    'ofertas-carrito',
    'tiendas',
    'tutoriales',
    'ajustes',
    'wallet',
    'dropshipping',
    'calendario-tributario',
]);

const normalize = (value) => {
    if (!value) return '';
    const lowered = String(value).trim().toLowerCase();
    if (['default', 'eco-commerce', 'principal', 'base'].includes(lowered)) {
        return '';
    }
    return lowered.replace(/[^a-z0-9-]/g, '');
};

const persistSlug = (slug) => {
    if (slug) {
        localStorage.setItem('tiendaActual', slug);
    } else {
        localStorage.removeItem('tiendaActual');
    }
};

export const getTiendaSlug = () => {
    const params = new URLSearchParams(window.location.search || '');
    const querySlug = normalize(params.get('store') || params.get('tienda'));
    if (querySlug) {
        persistSlug(querySlug);
        return querySlug;
    }

    const path = window.location.pathname || '';
    const segments = path.split('/').filter(Boolean);

    if (!segments.length) {
        persistSlug('');
        return '';
    }

    if (segments[0] === 'dashboard') {
        if (!segments[1]) {
            persistSlug('');
            return '';
        }

        if (segments[1] === 's' && segments[2]) {
            const slug = normalize(segments[2]);
            persistSlug(slug);
            return slug;
        }

        const candidate = normalize(segments[1]);
        if (candidate && !DASHBOARD_SECTIONS.has(candidate)) {
            persistSlug(candidate);
            return candidate;
        }

        persistSlug('');
        return '';
    }

    if ((segments[0] === 's' || segments[0] === 'tienda') && segments[1]) {
        const slug = normalize(segments[1]);
        persistSlug(slug);
        return slug;
    }

    if (path.match(/^\/home\.([a-z0-9-]+)/i)) {
        const slug = normalize(RegExp.$1);
        persistSlug(slug);
        return slug;
    }

    if (path.match(/^\/dashboard-([a-z0-9-]+)/i)) {
        const slug = normalize(RegExp.$1);
        persistSlug(slug);
        return slug;
    }

    const rootCandidate = normalize(segments[0]);
    if (rootCandidate && !RESERVED_ROOT_SEGMENTS.has(rootCandidate)) {
        persistSlug(rootCandidate);
        return rootCandidate;
    }
    // En rutas publicas raiz/reservadas, no heredar tienda previa del localStorage.
    // Esto evita que Home (/) quede apuntando a una tienda distinta y salga vacio.
    persistSlug('');
    return '';
};

export const isStoreDashboardRoute = (pathname = '') => {
    const segments = String(pathname || '').split('/').filter(Boolean);
    if (segments[0] !== 'dashboard') return false;
    if (!segments[1]) return false;
    if (segments[1] === 's') return Boolean(segments[2]);
    return !DASHBOARD_SECTIONS.has(normalize(segments[1]));
};

export const buildDashboardPath = (slug, path = '') => {
    const clean = path ? (path.startsWith('/') ? path : `/${path}`) : '';
    const normalized = clean.startsWith('/dashboard') ? clean : `/dashboard${clean}`;
    const segments = normalized.split('/').filter(Boolean);

    let routeStart = 1;
    if (segments[1] === 's' && segments[2]) {
        routeStart = 3;
    } else if (segments[1] && !DASHBOARD_SECTIONS.has(normalize(segments[1]))) {
        routeStart = 2;
    }

    const suffixSegments = segments.slice(routeStart);
    const suffix = suffixSegments.length ? `/${suffixSegments.join('/')}` : '';
    const normalizedSlug = normalize(slug);

    if (!normalizedSlug) {
        return `/dashboard${suffix}`;
    }

    return `/dashboard/s/${normalizedSlug}${suffix}`;
};

export const buildStorePath = (slug) => {
    const normalized = normalize(slug);
    if (!normalized) return '/';
    return `/${normalized}`;
};

export const buildStoreUrl = (origin, slug) => `${origin}${buildStorePath(slug)}`;
