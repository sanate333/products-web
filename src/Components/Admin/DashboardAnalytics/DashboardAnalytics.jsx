import React, { useCallback, useEffect, useMemo, useState } from 'react';
import baseURL from '../../url';
import './DashboardAnalytics.css';

const RANGE_OPTIONS = [
    { id: 'today', label: 'Hoy' },
    { id: '7d', label: 'Ultimos 7 dias' },
    { id: '30d', label: 'Ultimos 30 dias' },
];

const DASHBOARD_MODULES = new Set([
    'dashboard',
    'inicio',
    'productos',
    'usuarios',
    'banners',
    'sub-banners',
    'contacto',
    'categorias',
    'codigos',
    'pedidos',
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
    'logo',
    's',
]);

const numberFormatter = new Intl.NumberFormat('es-CO');
const currencyFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

function safeNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function trendClass(value) {
    if (value > 0) return 'up';
    if (value < 0) return 'down';
    return 'flat';
}

function formatTrend(value) {
    const numeric = safeNumber(value);
    if (numeric === 0) return '0% vs periodo anterior';
    const prefix = numeric > 0 ? '+' : '';
    return `${prefix}${percentFormatter.format(numeric)}% vs periodo anterior`;
}

function capitalizeLabel(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function normalizeReadableProductName(value) {
    const cleaned = decodeURIComponent(String(value || '').replace(/\+/g, ' '))
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!cleaned) return 'Producto sin nombre';
    return capitalizeLabel(cleaned);
}

function parsePathFromPageValue(pageValue) {
    const raw = String(pageValue || '').trim();
    if (!raw) return '';
    try {
        const parsed = raw.startsWith('http') ? new URL(raw) : new URL(raw, 'https://sanate.store');
        return parsed.pathname || '';
    } catch {
        return raw.split('?')[0] || '';
    }
}

function extractVisitedProductName(pageValue) {
    const path = parsePathFromPageValue(pageValue);
    if (!path) return '';

    const segments = path
        .split('/')
        .map((segment) => segment.trim())
        .filter(Boolean);

    if (!segments.length) return '';

    const productSegmentIndex = segments.findIndex((segment) => segment.toLowerCase() === 'producto');
    if (productSegmentIndex >= 0 && segments[productSegmentIndex + 1]) {
        return normalizeReadableProductName(segments[productSegmentIndex + 1]);
    }

    const lastSegment = segments[segments.length - 1];
    if (/^\d+$/.test(lastSegment)) {
        return '';
    }
    return normalizeReadableProductName(lastSegment);
}

function resolveStoreSlugFromPath(pathname = '') {
    const clean = String(pathname || '')
        .toLowerCase()
        .replace(/^\/+|\/+$/g, '');
    if (!clean) {
        return '';
    }

    const segments = clean.split('/').filter(Boolean);
    if (!segments.length) {
        return '';
    }

    if (segments[0] === 'dashboard') {
        const storeSegment = segments[1] === 's' ? segments[2] : segments[1];
        if (!storeSegment || DASHBOARD_MODULES.has(storeSegment)) {
            return '';
        }
        return storeSegment;
    }

    if (DASHBOARD_MODULES.has(segments[0])) {
        return '';
    }
    return segments[0];
}

function toLinePath(points) {
    if (!points.length) return '';
    return points
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
        .join(' ');
}

export default function DashboardAnalytics() {
    const [range, setRange] = useState('today');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [payload, setPayload] = useState(null);
    const [activeIndex, setActiveIndex] = useState(-1);

    const fetchAnalytics = useCallback(async (signal, { silent = false } = {}) => {
        if (!silent) {
            setLoading(true);
        }
        setError('');

        try {
            const normalizedBase = String(baseURL || '').replace(/\/+$/, '');
            const url = new URL(`${normalizedBase}/dashboardAnalyticsGet.php`);
            url.searchParams.set('range', range);

            if (typeof window !== 'undefined') {
                const storeSlug = resolveStoreSlugFromPath(window.location.pathname);
                if (storeSlug) {
                    url.searchParams.set('store', storeSlug);
                }
            }

            const response = await fetch(url.toString(), { signal });
            const data = await response.json();

            if (!response.ok || !data?.ok) {
                throw new Error(data?.msg || 'No se pudo cargar analitica');
            }

            setPayload(data);
            const length = Array.isArray(data?.series) ? data.series.length : 0;
            setActiveIndex(length > 0 ? length - 1 : -1);
        } catch (fetchError) {
            if (fetchError.name === 'AbortError') return;
            setError(fetchError.message || 'Error cargando analitica');
        } finally {
            if (!signal?.aborted && !silent) {
                setLoading(false);
            }
        }
    }, [range]);

    useEffect(() => {
        const controller = new AbortController();
        fetchAnalytics(controller.signal);
        return () => controller.abort();
    }, [fetchAnalytics]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            const controller = new AbortController();
            fetchAnalytics(controller.signal, { silent: true });
            window.setTimeout(() => controller.abort(), 15000);
        }, 30000);

        return () => window.clearInterval(intervalId);
    }, [fetchAnalytics]);

    const viewModel = useMemo(() => {
        const metrics = payload?.metrics || {};
        const series = Array.isArray(payload?.series) ? payload.series : [];
        const currentPoint = series[activeIndex] || series[series.length - 1] || null;

        const sessions = safeNumber(metrics.sesiones);
        const sales = safeNumber(metrics.ventas);
        const orders = safeNumber(metrics.pedidos);
        const conversion = safeNumber(metrics.conversion);
        const onlineNow = safeNumber(metrics.onlineNow);
        const trends = metrics.trends || {};

        return {
            sessions,
            sales,
            orders,
            conversion,
            onlineNow,
            trends: {
                sessions: safeNumber(trends.sesiones),
                sales: safeNumber(trends.ventas),
                orders: safeNumber(trends.pedidos),
                conversion: safeNumber(trends.conversion),
            },
            series,
            currentPoint,
        };
    }, [payload, activeIndex]);

    const chartModel = useMemo(() => {
        const series = viewModel.series;
        const width = 1000;
        const height = 300;
        const padding = { top: 20, right: 18, bottom: 28, left: 20 };
        const innerWidth = width - padding.left - padding.right;
        const innerHeight = height - padding.top - padding.bottom;
        const divisor = Math.max(series.length - 1, 1);

        const sessionsValues = series.map((point) => safeNumber(point.sesiones));
        const ordersValues = series.map((point) => safeNumber(point.pedidos));
        const maxValue = Math.max(1, ...sessionsValues, ...ordersValues);

        const getX = (index) => padding.left + (innerWidth * index) / divisor;
        const getY = (value) => padding.top + innerHeight - (safeNumber(value) / maxValue) * innerHeight;

        const sessionsPoints = sessionsValues.map((value, index) => ({
            x: getX(index),
            y: getY(value),
            label: series[index]?.label || series[index]?.fecha || '',
            value,
        }));

        const ordersPoints = ordersValues.map((value, index) => ({
            x: getX(index),
            y: getY(value),
            value,
        }));

        const activePoint = sessionsPoints[activeIndex] || sessionsPoints[sessionsPoints.length - 1] || null;
        const activeOrderPoint = ordersPoints[activeIndex] || ordersPoints[ordersPoints.length - 1] || null;

        return {
            width,
            height,
            padding,
            maxValue,
            sessionsPath: toLinePath(sessionsPoints),
            ordersPath: toLinePath(ordersPoints),
            sessionsPoints,
            ordersPoints,
            activePoint,
            activeOrderPoint,
            rows: [0, 1, 2, 3].map((index) => {
                const y = padding.top + (innerHeight / 3) * index;
                const labelValue = Math.round(maxValue - (maxValue / 3) * index);
                return { y, label: numberFormatter.format(Math.max(0, labelValue)) };
            }),
        };
    }, [viewModel.series, activeIndex]);

    const rankingModel = useMemo(() => {
        const topProductsRaw = Array.isArray(payload?.topProducts) ? payload.topProducts : [];
        const topPagesRaw = Array.isArray(payload?.topPages) ? payload.topPages : [];

        const topProducts = topProductsRaw.slice(0, 6).map((item, index) => ({
            rank: index + 1,
            nombre: normalizeReadableProductName(item?.nombre || ''),
            cantidad: safeNumber(item?.cantidad),
            ventas: safeNumber(item?.ventas),
        }));

        const visitedByProduct = [];
        topPagesRaw.forEach((item) => {
            const name = extractVisitedProductName(item?.page || '');
            if (!name) return;
            const total = safeNumber(item?.total);
            if (total <= 0) return;
            visitedByProduct.push({
                nombre: name,
                visitas: total,
            });
        });

        const groupedVisited = visitedByProduct.reduce((acc, item) => {
            const current = acc.get(item.nombre) || 0;
            acc.set(item.nombre, current + item.visitas);
            return acc;
        }, new Map());

        const topVisitedProducts = Array.from(groupedVisited.entries())
            .map(([nombre, visitas]) => ({ nombre, visitas }))
            .sort((a, b) => b.visitas - a.visitas)
            .slice(0, 6)
            .map((item, index) => ({
                rank: index + 1,
                ...item,
            }));

        const maxSold = Math.max(1, ...topProducts.map((item) => item.cantidad));
        const maxVisited = Math.max(1, ...topVisitedProducts.map((item) => item.visitas));

        return {
            topProducts,
            topVisitedProducts,
            maxSold,
            maxVisited,
        };
    }, [payload]);

    const impactModel = useMemo(() => {
        const soldMap = new Map(
            rankingModel.topProducts.map((item) => [item.nombre, safeNumber(item.cantidad)])
        );
        const visitedMap = new Map(
            rankingModel.topVisitedProducts.map((item) => [item.nombre, safeNumber(item.visitas)])
        );

        const names = Array.from(new Set([...soldMap.keys(), ...visitedMap.keys()])).slice(0, 6);
        const rows = names.map((name, index) => {
            const sold = safeNumber(soldMap.get(name));
            const visited = safeNumber(visitedMap.get(name));
            return { id: index + 1, name, sold, visited };
        });

        const maxSold = Math.max(1, ...rows.map((row) => row.sold));
        const maxVisited = Math.max(1, ...rows.map((row) => row.visited));
        const totals = {
            sold: rows.reduce((acc, row) => acc + row.sold, 0),
            visited: rows.reduce((acc, row) => acc + row.visited, 0),
        };

        const score = Math.round(
            ((safeNumber(viewModel.conversion) * 14)
            + ((safeNumber(viewModel.orders) / Math.max(1, safeNumber(viewModel.sessions))) * 100)
            + ((totals.sold / Math.max(1, totals.visited)) * 100))
            / 3
        );

        return {
            rows,
            maxSold,
            maxVisited,
            totals,
            score: Math.max(0, Math.min(100, score)),
        };
    }, [rankingModel.topProducts, rankingModel.topVisitedProducts, viewModel.conversion, viewModel.orders, viewModel.sessions]);

    return (
        <section className="shopDash">
            <div className="shopUnifiedPanel">
                <header className="shopDashHeader">
                    <div>
                        <p className="shopDashEyebrow">Dashboard Principal</p>
                    </div>
                </header>

                {loading && <p className="shopDashLoading">Cargando metrica comercial...</p>}
                {!!error && !loading && <p className="shopDashError">{error}</p>}

                {!loading && !error && (
                    <>
                        <div className="shopUnifiedMetrics">
                            <article className="shopKpiCard primary">
                                <div className="shopKpiTop">
                                    <span>Sesiones</span>
                                    <span className={`shopOnlineBadge ${viewModel.onlineNow > 0 ? 'online' : ''}`}>
                                        <i />
                                        {viewModel.onlineNow} en linea
                                    </span>
                                </div>
                                <strong>{numberFormatter.format(viewModel.sessions)}</strong>
                                <small className={`shopTrend ${trendClass(viewModel.trends.sessions)}`}>
                                    {formatTrend(viewModel.trends.sessions)}
                                </small>
                            </article>

                            <article className="shopKpiCard">
                                <span>Ventas totales</span>
                                <strong>{currencyFormatter.format(viewModel.sales)}</strong>
                                <small className={`shopTrend ${trendClass(viewModel.trends.sales)}`}>
                                    {formatTrend(viewModel.trends.sales)}
                                </small>
                            </article>

                            <article className="shopKpiCard">
                                <span>Pedidos</span>
                                <strong>{numberFormatter.format(viewModel.orders)}</strong>
                                <small className={`shopTrend ${trendClass(viewModel.trends.orders)}`}>
                                    {formatTrend(viewModel.trends.orders)}
                                </small>
                            </article>

                            <article className="shopKpiCard">
                                <span>Tasa de conversion</span>
                                <strong>{percentFormatter.format(viewModel.conversion)}%</strong>
                                <small className={`shopTrend ${trendClass(viewModel.trends.conversion)}`}>
                                    {formatTrend(viewModel.trends.conversion)}
                                </small>
                            </article>
                        </div>

                        <div className="shopUnifiedChartPanel">
                            <div className="shopChartHead">
                                <h3>Sesiones y pedidos por fecha</h3>
                                <div className="shopChartHint">
                                    <span>{chartModel.activePoint?.label || viewModel.currentPoint?.label || '--'}</span>
                                    <strong>
                                        {numberFormatter.format(safeNumber(viewModel.currentPoint?.sesiones))} sesiones /{' '}
                                        {numberFormatter.format(safeNumber(viewModel.currentPoint?.pedidos))} pedidos
                                    </strong>
                                    <div className="shopDashFilters shopDashFiltersInline" role="tablist" aria-label="Rango de fechas">
                                        {RANGE_OPTIONS.map((option) => (
                                            <button
                                                key={option.id}
                                                type="button"
                                                className={`shopDashFilter ${range === option.id ? 'active' : ''}`}
                                                onClick={() => setRange(option.id)}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="shopChartWrap">
                                <svg className="shopChartSvg" viewBox={`0 0 ${chartModel.width} ${chartModel.height}`} preserveAspectRatio="none">
                                    {chartModel.rows.map((row) => (
                                        <g key={row.y}>
                                            <line
                                                className="gridLine"
                                                x1={chartModel.padding.left}
                                                y1={row.y}
                                                x2={chartModel.width - chartModel.padding.right}
                                                y2={row.y}
                                            />
                                            <text x={2} y={row.y + 4} className="gridLabel">
                                                {row.label}
                                            </text>
                                        </g>
                                    ))}

                                    {chartModel.sessionsPath && <path className="sessionsLine" d={chartModel.sessionsPath} />}
                                    {chartModel.ordersPath && <path className="ordersLine" d={chartModel.ordersPath} />}

                                    {chartModel.activePoint && (
                                        <>
                                            <line
                                                className="activeGuide"
                                                x1={chartModel.activePoint.x}
                                                y1={chartModel.padding.top}
                                                x2={chartModel.activePoint.x}
                                                y2={chartModel.height - chartModel.padding.bottom}
                                            />
                                            <circle className="sessionDot active" cx={chartModel.activePoint.x} cy={chartModel.activePoint.y} r="5" />
                                        </>
                                    )}

                                    {chartModel.activeOrderPoint && (
                                        <circle className="orderDot active" cx={chartModel.activeOrderPoint.x} cy={chartModel.activeOrderPoint.y} r="4.2" />
                                    )}
                                </svg>

                                <div className="shopChartOverlay" style={{ '--points': Math.max(1, viewModel.series.length) }}>
                                    {(viewModel.series.length ? viewModel.series : [null]).map((point, index) => (
                                        <button
                                            key={point?.fecha || index}
                                            type="button"
                                            className={`shopChartHoverPoint ${index === activeIndex ? 'active' : ''}`}
                                            onMouseEnter={() => setActiveIndex(index)}
                                            onFocus={() => setActiveIndex(index)}
                                            onClick={() => setActiveIndex(index)}
                                            aria-label={point ? `${point.label}: ${point.sesiones} sesiones, ${point.pedidos} pedidos` : 'Punto de grafica'}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="shopChartLegend">
                                <span>
                                    <i className="dot sessions" />
                                    Sesiones
                                </span>
                                <span>
                                    <i className="dot orders" />
                                    Pedidos
                                </span>
                            </div>
                        </div>

                        <div className="shopInsightsGrid">
                            <article className="shopInsightPanel shopImpactPanel">
                                <header className="shopInsightHead">
                                    <h3>Grafica avanzada de impacto comercial</h3>
                                    <span>Score {impactModel.score}/100</span>
                                </header>
                                <div className="shopImpactScoreBar">
                                    <i style={{ width: `${impactModel.score}%` }} />
                                </div>
                                {impactModel.rows.length ? (
                                    <ul className="shopImpactList">
                                        {impactModel.rows.map((row) => (
                                            <li key={`impact-${row.id}-${row.name}`}>
                                                <div className="shopImpactTop">
                                                    <strong title={row.name}>{row.name}</strong>
                                                    <span>
                                                        {numberFormatter.format(row.sold)} ventas · {numberFormatter.format(row.visited)} visitas
                                                    </span>
                                                </div>
                                                <div className="shopImpactBars">
                                                    <div className="shopImpactTrack sold">
                                                        <i style={{ width: `${Math.min(100, (row.sold / impactModel.maxSold) * 100)}%` }} />
                                                    </div>
                                                    <div className="shopImpactTrack visited">
                                                        <i style={{ width: `${Math.min(100, (row.visited / impactModel.maxVisited) * 100)}%` }} />
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="shopEmptyInsight">Aun no hay datos suficientes para el radar comercial.</p>
                                )}
                                <footer className="shopImpactFoot">
                                    <span>Total ventas: {numberFormatter.format(impactModel.totals.sold)}</span>
                                    <span>Total visitas: {numberFormatter.format(impactModel.totals.visited)}</span>
                                </footer>
                            </article>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
