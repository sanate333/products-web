import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Header from '../Header/Header';
import HeaderDash from '../../Components/Admin/HeaderDash/HeaderDash';
import baseURL, { resolveImg } from '../../Components/url';
import { buildDashboardPath } from '../../utils/tienda';
import { PUBLIC_STORE_DOMAIN, buildPublicStoreUrl } from '../../config/domains';
import sanateLogo from '../../images/logo.png';
import './Tiendas.css';

const DEFAULT_TEMPLATE = 'productos-naturales';

const ALERTS_SETTINGS_KEY = 'tiendas_alerts_settings_v1';
const ALERTS_LOG_KEY = 'tiendas_alerts_log_v1';

const defaultAlertSettings = () => ({
    accessEnabled: true,
    recipients: [],
    rules: {
        day1: true,
        day2: true,
        day3: true,
        remindNoProducts: true,
        remindNoLogin: true,
    },
    templates: {
        day1: 'Hoy es un gran dia para subir tu primer producto. Tu tienda ya esta lista.',
        day2: 'Llevas 2 dias sin actividad. Sube productos y empieza a recibir pedidos.',
        day3: 'Tu tienda te esta esperando. Publica productos hoy y activa tus ventas.',
    },
});

const loadJsonStorage = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return parsed ?? fallback;
    } catch {
        return fallback;
    }
};

const TEMPLATE_LIBRARY = [
    {
        value: DEFAULT_TEMPLATE,
        name: 'Productos Naturales',
        description: 'Plantilla principal de Sanate, enfocada en catalogo de bienestar.',
        category: 'salud',
        logo: sanateLogo,
        features: ['Home tipo catalogo', 'Sub-banners y categorias', 'Checkout rapido'],
    },
    {
        value: 'restaurante',
        name: 'Restaurante',
        description: 'Menu digital con productos sugeridos para pedidos rapidos.',
        category: 'food',
        logo: sanateLogo,
        features: ['Menu por categorias', 'Promociones visibles', 'Pedido directo'],
    },
    {
        value: 'barberia',
        name: 'Barberia',
        description: 'Catalogo de servicios y productos para reservas y venta.',
        category: 'services',
        logo: sanateLogo,
        features: ['Servicios destacados', 'Promos y combos', 'Panel listo para operar'],
    },
];

const slugify = (value) =>
    String(value || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 30);

const isValidSlug = (slug) => /^[a-z0-9-]{2,30}$/.test(slug);

export default function Tiendas() {
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [busyDeleteId, setBusyDeleteId] = useState(0);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ name: '', templateType: DEFAULT_TEMPLATE });
    const [activeSection, setActiveSection] = useState('stores');
    const [activeStoreSlug, setActiveStoreSlug] = useState('');
    const [alertsSettingsMap, setAlertsSettingsMap] = useState(() => loadJsonStorage(ALERTS_SETTINGS_KEY, {}));
    const [alertsLog, setAlertsLog] = useState(() => loadJsonStorage(ALERTS_LOG_KEY, []));
    const [alertsKpi, setAlertsKpi] = useState({ pedidos: 0, usuarios: 0, productos: 0, loading: false });
    const [recipientDraft, setRecipientDraft] = useState({ channel: 'email', target: '' });

    const cleanSlug = useMemo(() => slugify(form.name), [form.name]);

    const principalStore = useMemo(() => {
        const principal = stores.find((item) => ['principal', 'eco-commerce', 'default'].includes(String(item.slug || '').toLowerCase()));
        if (principal) return principal;
        return {
            id: 'principal-virtual',
            nombre: 'Tienda principal',
            name: 'Tienda principal',
            slug: 'principal',
            status: 'activo',
            role: 'owner',
            isPrincipal: true,
        };
    }, [stores]);

    const visibleStores = useMemo(() => {
        const withoutPrincipal = stores.filter((item) => {
            const slug = String(item.slug || '').toLowerCase();
            return !['principal', 'eco-commerce', 'default'].includes(slug);
        });
        return [principalStore, ...withoutPrincipal];
    }, [stores, principalStore]);

    const selectedStore = useMemo(() => {
        if (!activeStoreSlug) return null;
        return visibleStores.find((item) => String(item.slug || '').toLowerCase() === String(activeStoreSlug).toLowerCase()) || null;
    }, [activeStoreSlug, visibleStores]);

    const selectedStoreSettings = useMemo(() => {
        if (!selectedStore?.slug) return defaultAlertSettings();
        return {
            ...defaultAlertSettings(),
            ...(alertsSettingsMap[selectedStore.slug] || {}),
            rules: {
                ...defaultAlertSettings().rules,
                ...(alertsSettingsMap[selectedStore.slug]?.rules || {}),
            },
            templates: {
                ...defaultAlertSettings().templates,
                ...(alertsSettingsMap[selectedStore.slug]?.templates || {}),
            },
            recipients: Array.isArray(alertsSettingsMap[selectedStore.slug]?.recipients)
                ? alertsSettingsMap[selectedStore.slug].recipients
                : [],
        };
    }, [alertsSettingsMap, selectedStore]);

    const loadStores = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${baseURL}/tiendasGet.php?ts=${Date.now()}`, {
                method: 'GET',
                credentials: 'include',
            });
            const data = await response.json();
            const rows = Array.isArray(data?.tiendas)
                ? data.tiendas
                : Array.isArray(data?.data?.tiendas)
                    ? data.data.tiendas
                    : [];
            setStores(rows);
        } catch (err) {
            setError('No se pudieron cargar tiendas.');
            setStores([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStores();
    }, []);

    useEffect(() => {
        localStorage.setItem(ALERTS_SETTINGS_KEY, JSON.stringify(alertsSettingsMap));
    }, [alertsSettingsMap]);

    useEffect(() => {
        localStorage.setItem(ALERTS_LOG_KEY, JSON.stringify(alertsLog.slice(0, 200)));
    }, [alertsLog]);

    useEffect(() => {
        if (!visibleStores.length) return;
        if (!activeStoreSlug) {
            const first = visibleStores.find((item) => !item.isPrincipal) || visibleStores[0];
            if (first?.slug) {
                setActiveStoreSlug(first.slug);
            }
        }
    }, [visibleStores, activeStoreSlug]);

    const updateSelectedStoreSettings = useCallback((patcher) => {
        if (!selectedStore?.slug) return;
        setAlertsSettingsMap((prev) => {
            const current = {
                ...defaultAlertSettings(),
                ...(prev[selectedStore.slug] || {}),
            };
            const next = typeof patcher === 'function' ? patcher(current) : { ...current, ...(patcher || {}) };
            return {
                ...prev,
                [selectedStore.slug]: next,
            };
        });
    }, [selectedStore]);

    const loadStoreKpi = useCallback(async (slug) => {
        if (!slug) return;
        setAlertsKpi((prev) => ({ ...prev, loading: true }));
        const safeFetchCount = async (endpoint, key) => {
            try {
                const response = await fetch(`${baseURL}/${endpoint}?tienda=${encodeURIComponent(slug)}&ts=${Date.now()}`, {
                    method: 'GET',
                    credentials: 'include',
                });
                const data = await response.json();
                const list = Array.isArray(data?.[key]) ? data[key] : Array.isArray(data?.data?.[key]) ? data.data[key] : [];
                return list.length;
            } catch {
                return 0;
            }
        };

        const [pedidos, usuarios, productos] = await Promise.all([
            safeFetchCount('pedidoGet.php', 'pedidos'),
            safeFetchCount('usuariosGet.php', 'usuarios'),
            safeFetchCount('productosGet.php', 'productos'),
        ]);

        setAlertsKpi({
            pedidos,
            usuarios,
            productos,
            loading: false,
        });
    }, []);

    useEffect(() => {
        if (activeSection !== 'alerts') return;
        if (!selectedStore?.slug) return;
        loadStoreKpi(selectedStore.slug);
    }, [activeSection, selectedStore, loadStoreKpi]);

    const createStore = async () => {
        setError('');
        if (!form.name.trim()) {
            setError('El nombre es obligatorio.');
            return;
        }
        if (!isValidSlug(cleanSlug)) {
            setError('No se pudo generar URL valida con ese nombre. Usa un nombre mas claro.');
            return;
        }
        if (stores.some((item) => String(item.slug || '').toLowerCase() === cleanSlug)) {
            setError('Ese slug ya existe.');
            return;
        }

        try {
            const payload = new FormData();
            payload.append('nombre', form.name.trim());
            payload.append('slug', cleanSlug);
            payload.append('template', form.templateType || DEFAULT_TEMPLATE);

            const response = await fetch(`${baseURL}/tiendasPost.php`, {
                method: 'POST',
                body: payload,
                credentials: 'include',
            });
            const data = await response.json();
            const ok = data?.success === true || data?.ok === true;
            if (!ok) {
                throw new Error(data?.mensaje || data?.message || data?.error || 'No fue posible crear la tienda');
            }

            await loadStores();
            setShowModal(false);
            setForm({ name: '', templateType: DEFAULT_TEMPLATE });
            window.location.href = `/dashboard/s/${cleanSlug}/inicio`;
        } catch (err) {
            setError(err.message || 'Error creando tienda.');
        }
    };

    const deleteStore = async (store) => {
        const slug = String(store?.slug || '').toLowerCase();
        if (!store?.id || ['principal', 'eco-commerce', 'default'].includes(slug)) {
            return;
        }
        const accepted = window.confirm(`Eliminar tienda "${store.name || store.nombre || slug}"? Esta accion no se puede deshacer.`);
        if (!accepted) return;

        setBusyDeleteId(Number(store.id));
        setError('');
        try {
            const response = await fetch(`${baseURL}/tiendaDelete.php?idTienda=${Number(store.id)}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            const data = await response.json();
            const ok = data?.success === true || data?.ok === true;
            if (!ok) {
                throw new Error(data?.mensaje || data?.message || data?.error || 'No fue posible eliminar la tienda');
            }
            await loadStores();
        } catch (err) {
            setError(err.message || 'No se pudo eliminar la tienda.');
        } finally {
            setBusyDeleteId(0);
        }
    };

    const deleteAllCreatedStores = async () => {
        const deletable = visibleStores.filter((store) => {
            const slug = String(store?.slug || '').toLowerCase();
            return store?.id && !store?.isPrincipal && !['principal', 'eco-commerce', 'default'].includes(slug);
        });
        if (!deletable.length) {
            setError('No hay tiendas creadas para eliminar.');
            return;
        }

        const accepted = window.confirm(`Eliminar ${deletable.length} tienda(s) creada(s)? Esta accion no se puede deshacer.`);
        if (!accepted) return;

        setBulkDeleting(true);
        setError('');
        try {
            for (const store of deletable) {
                const response = await fetch(`${baseURL}/tiendaDelete.php?idTienda=${Number(store.id)}`, {
                    method: 'DELETE',
                    credentials: 'include',
                });
                const data = await response.json();
                const ok = data?.success === true || data?.ok === true;
                if (!ok) {
                    throw new Error(data?.mensaje || data?.message || data?.error || `No se pudo eliminar ${store.slug}`);
                }
            }
            await loadStores();
        } catch (err) {
            setError(err.message || 'No se pudieron eliminar todas las tiendas.');
        } finally {
            setBulkDeleting(false);
        }
    };

    const addRecipient = () => {
        if (!selectedStore?.slug) return;
        const target = String(recipientDraft.target || '').trim();
        if (!target) return;
        updateSelectedStoreSettings((current) => {
            const exists = (current.recipients || []).some((item) => String(item.target || '').toLowerCase() === target.toLowerCase());
            if (exists) return current;
            return {
                ...current,
                recipients: [
                    ...(current.recipients || []),
                    {
                        id: Date.now(),
                        channel: recipientDraft.channel === 'whatsapp' ? 'whatsapp' : 'email',
                        target,
                        active: true,
                    },
                ],
            };
        });
        setRecipientDraft((prev) => ({ ...prev, target: '' }));
    };

    const toggleRecipient = (recipientId) => {
        updateSelectedStoreSettings((current) => ({
            ...current,
            recipients: (current.recipients || []).map((item) => (
                item.id === recipientId ? { ...item, active: !item.active } : item
            )),
        }));
    };

    const removeRecipient = (recipientId) => {
        updateSelectedStoreSettings((current) => ({
            ...current,
            recipients: (current.recipients || []).filter((item) => item.id !== recipientId),
        }));
    };

    const runAlertSimulation = () => {
        if (!selectedStore?.slug) return;
        const rules = selectedStoreSettings.rules || {};
        const templates = selectedStoreSettings.templates || {};
        const recipients = (selectedStoreSettings.recipients || []).filter((item) => item.active);
        const hasRecipients = recipients.length > 0;
        const nextLog = [];

        if (rules.remindNoProducts && alertsKpi.productos === 0) {
            if (rules.day1) nextLog.push({ day: 1, text: templates.day1 });
            if (rules.day2) nextLog.push({ day: 2, text: templates.day2 });
            if (rules.day3) nextLog.push({ day: 3, text: templates.day3 });
        }

        if (!nextLog.length) {
            nextLog.push({ day: 0, text: 'Sin alertas por ahora: la tienda tiene actividad reciente.' });
        }

        const createdAt = new Date().toISOString();
        setAlertsLog((prev) => [
            ...nextLog.map((row, index) => ({
                id: `${createdAt}-${index}`,
                storeSlug: selectedStore.slug,
                storeName: selectedStore.name || selectedStore.nombre || selectedStore.slug,
                channelSummary: hasRecipients ? `${recipients.length} destinatario(s)` : 'sin destinatarios',
                day: row.day,
                text: row.text,
                createdAt,
            })),
            ...prev,
        ].slice(0, 200));
    };

    const renderStoreCard = (store) => {
        const name = store.name || store.nombre || 'Tienda';
        const slug = store.slug || 'principal';
        const isPrincipalSlug = ['principal', 'eco-commerce', 'default'].includes(String(slug).toLowerCase());
        const status = store.status || 'activo';
        const initial = String(name).charAt(0).toUpperCase();
        const templateMatch = TEMPLATE_LIBRARY.find((item) => item.value === store.template);
        const preview = resolveImg(store.preview_image || store.logo || '') || templateMatch?.logo || sanateLogo;
        const productsCount = Number(store.products_count || 0);

        return (
            <article key={store.id || store.idTienda || slug} className="storeCard">
                <div className="storeCover">
                    {preview ? <img src={preview} alt={`preview-${name}`} /> : <span>{initial}</span>}
                </div>
                <div className="storeBody">
                    <h4>{name}</h4>
                    <p className="storeSlug">
                        {PUBLIC_STORE_DOMAIN}
                        {isPrincipalSlug ? '' : `/${slug}`}
                    </p>
                    <div className="storeMeta">
                        <span className="storeStatus">{status}</span>
                        <small>{store.ownerEmail || store.role || 'owner'}</small>
                    </div>
                    <div className="storeKpiMini">
                        <span>{productsCount} productos</span>
                        {store.template ? <small>Plantilla: {store.template}</small> : null}
                    </div>
                </div>
                <div className="storeActions three">
                    <a href={buildDashboardPath(slug, '/dashboard/inicio')}>Abrir dashboard</a>
                    <a href={buildPublicStoreUrl(slug)} target="_blank" rel="noreferrer">Ver tienda</a>
                    <a href={buildDashboardPath(slug, '/dashboard/productos')}>Productos</a>
                </div>
                {!isPrincipalSlug ? (
                    <div className="storeDangerZone">
                        <button
                            type="button"
                            className="storeDeleteBtn"
                            disabled={busyDeleteId === Number(store.id) || bulkDeleting}
                            onClick={() => deleteStore(store)}
                        >
                            {busyDeleteId === Number(store.id) ? 'Eliminando...' : 'Eliminar tienda'}
                        </button>
                    </div>
                ) : null}
            </article>
        );
    };

    return (
        <div className="containerGrid">
            <Header />
            <section className="containerSection">
                <HeaderDash />
                <div className="container tiendasShell">
                    <div className="tiendasToolbar">
                        <div>
                            <p className="tiendasEyebrow">Multi-tenant</p>
                            <h3>Tiendas</h3>
                            <span>Administra tus tiendas sin mezclar productos, pedidos ni banners.</span>
                        </div>
                        <div className="tiendasToolbarActions">
                            <button type="button" className="tiendasDangerBtn" onClick={deleteAllCreatedStores} disabled={bulkDeleting}>
                                {bulkDeleting ? 'Eliminando...' : 'Eliminar tiendas creadas'}
                            </button>
                            <button type="button" className="tiendasPrimaryBtn" onClick={() => setShowModal(true)}>
                                Nueva tienda
                            </button>
                        </div>
                    </div>
                    <div className="tiendasModeTabs">
                        <button
                            type="button"
                            className={activeSection === 'stores' ? 'active' : ''}
                            onClick={() => setActiveSection('stores')}
                        >
                            Crear y administrar tiendas
                        </button>
                        <button
                            type="button"
                            className={activeSection === 'templates' ? 'active' : ''}
                            onClick={() => setActiveSection('templates')}
                        >
                            Plantillas
                        </button>
                        <button
                            type="button"
                            className={activeSection === 'alerts' ? 'active' : ''}
                            onClick={() => setActiveSection('alerts')}
                        >
                            Alertas y notificaciones
                        </button>
                    </div>

                    {activeSection === 'stores' ? (
                        <>
                            <div className="tiendasGrid">
                                {loading && <div className="storeEmpty">Cargando tiendas...</div>}
                                {!loading && visibleStores.map((store) => renderStoreCard(store))}
                                {!loading && !visibleStores.length && <div className="storeEmpty">No hay tiendas creadas todavia.</div>}
                            </div>
                        </>
                    ) : activeSection === 'templates' ? (
                        <>
                            <div className="tiendasMarketHead">
                                <div>
                                    <p className="tiendasEyebrow">Tiendas Market</p>
                                    <h4>Plantillas</h4>
                                    <span>Selecciona rapido la plantilla para crear una nueva tienda.</span>
                                </div>
                            </div>

                            <div className="templatesGrid">
                                {TEMPLATE_LIBRARY.map((item) => (
                                    <article key={item.value} className="templateStoreCard">
                                        <div className="templateStoreCover">
                                            <img src={item.logo} alt={`template-${item.name}`} />
                                        </div>
                                        <h4>{item.name}</h4>
                                        <p>{item.description}</p>
                                        <ul>
                                            {item.features.map((feature) => <li key={feature}>{feature}</li>)}
                                        </ul>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowModal(true);
                                                setForm((prev) => ({ ...prev, templateType: item.value }));
                                            }}
                                        >
                                            Usar esta plantilla
                                        </button>
                                    </article>
                                ))}
                            </div>
                        </>
                    ) : (
                        <section className="alertsPanel">
                            <header className="alertsPanelHead">
                                <div>
                                    <p className="tiendasEyebrow">Seguimiento automatizado</p>
                                    <h4>Alertas por inactividad y uso de tienda</h4>
                                    <span>Configura reglas, destinatarios y control de acceso por tienda.</span>
                                </div>
                                <div className="alertsPanelActions">
                                    <select
                                        value={activeStoreSlug}
                                        onChange={(event) => setActiveStoreSlug(event.target.value)}
                                    >
                                        {visibleStores.map((item) => (
                                            <option key={item.slug || item.id} value={item.slug || ''}>
                                                {item.name || item.nombre || item.slug}
                                            </option>
                                        ))}
                                    </select>
                                    <button type="button" onClick={() => selectedStore?.slug && loadStoreKpi(selectedStore.slug)}>
                                        Actualizar datos
                                    </button>
                                    <button type="button" className="runAlertsBtn" onClick={runAlertSimulation}>
                                        Generar seguimiento
                                    </button>
                                </div>
                            </header>

                            <div className="alertsKpiGrid">
                                <article>
                                    <h5>Conexiones activas</h5>
                                    <strong>{(selectedStoreSettings.recipients || []).filter((item) => item.active).length}</strong>
                                </article>
                                <article>
                                    <h5>Acceso al panel</h5>
                                    <strong>{selectedStoreSettings.accessEnabled ? 'Habilitado' : 'Restringido'}</strong>
                                </article>
                                <article>
                                    <h5>Pedidos de la tienda</h5>
                                    <strong>{alertsKpi.loading ? '...' : alertsKpi.pedidos}</strong>
                                </article>
                                <article>
                                    <h5>Usuarios de la tienda</h5>
                                    <strong>{alertsKpi.loading ? '...' : alertsKpi.usuarios}</strong>
                                </article>
                            </div>

                            <div className="alertsCardsGrid">
                                <article className="alertsCard">
                                    <div className="alertsCardHead">
                                        <h5>Destinatarios automáticos</h5>
                                        <label className="accessToggle">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(selectedStoreSettings.accessEnabled)}
                                                onChange={(event) => updateSelectedStoreSettings((current) => ({ ...current, accessEnabled: event.target.checked }))}
                                            />
                                            Habilitar acceso
                                        </label>
                                    </div>
                                    <div className="recipientDraftRow">
                                        <select
                                            value={recipientDraft.channel}
                                            onChange={(event) => setRecipientDraft((prev) => ({ ...prev, channel: event.target.value }))}
                                        >
                                            <option value="email">Email</option>
                                            <option value="whatsapp">WhatsApp</option>
                                        </select>
                                        <input
                                            type="text"
                                            value={recipientDraft.target}
                                            onChange={(event) => setRecipientDraft((prev) => ({ ...prev, target: event.target.value }))}
                                            placeholder={recipientDraft.channel === 'email' ? 'correo@dominio.com' : '+57 300 000 0000'}
                                        />
                                        <button type="button" onClick={addRecipient}>Agregar</button>
                                    </div>
                                    <div className="recipientList">
                                        {(selectedStoreSettings.recipients || []).map((item) => (
                                            <div key={item.id} className="recipientItem">
                                                <span>{item.channel}: {item.target}</span>
                                                <div>
                                                    <button type="button" onClick={() => toggleRecipient(item.id)}>
                                                        {item.active ? 'Quitar acceso' : 'Dar acceso'}
                                                    </button>
                                                    <button type="button" className="dangerBtn" onClick={() => removeRecipient(item.id)}>
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {!selectedStoreSettings.recipients?.length ? <p className="storeEmpty">Sin destinatarios configurados.</p> : null}
                                    </div>
                                </article>

                                <article className="alertsCard">
                                    <div className="alertsCardHead">
                                        <h5>Reglas de inactividad</h5>
                                    </div>
                                    <div className="rulesGrid">
                                        <label><input type="checkbox" checked={Boolean(selectedStoreSettings.rules.day1)} onChange={(event) => updateSelectedStoreSettings((current) => ({ ...current, rules: { ...current.rules, day1: event.target.checked } }))} /> Recordatorio día 1</label>
                                        <label><input type="checkbox" checked={Boolean(selectedStoreSettings.rules.day2)} onChange={(event) => updateSelectedStoreSettings((current) => ({ ...current, rules: { ...current.rules, day2: event.target.checked } }))} /> Recordatorio día 2</label>
                                        <label><input type="checkbox" checked={Boolean(selectedStoreSettings.rules.day3)} onChange={(event) => updateSelectedStoreSettings((current) => ({ ...current, rules: { ...current.rules, day3: event.target.checked } }))} /> Recordatorio día 3</label>
                                        <label><input type="checkbox" checked={Boolean(selectedStoreSettings.rules.remindNoProducts)} onChange={(event) => updateSelectedStoreSettings((current) => ({ ...current, rules: { ...current.rules, remindNoProducts: event.target.checked } }))} /> Si no sube productos</label>
                                        <label><input type="checkbox" checked={Boolean(selectedStoreSettings.rules.remindNoLogin)} onChange={(event) => updateSelectedStoreSettings((current) => ({ ...current, rules: { ...current.rules, remindNoLogin: event.target.checked } }))} /> Si no inicia sesión</label>
                                    </div>
                                    <div className="templatesStack">
                                        <textarea rows={2} value={selectedStoreSettings.templates.day1 || ''} onChange={(event) => updateSelectedStoreSettings((current) => ({ ...current, templates: { ...current.templates, day1: event.target.value } }))} />
                                        <textarea rows={2} value={selectedStoreSettings.templates.day2 || ''} onChange={(event) => updateSelectedStoreSettings((current) => ({ ...current, templates: { ...current.templates, day2: event.target.value } }))} />
                                        <textarea rows={2} value={selectedStoreSettings.templates.day3 || ''} onChange={(event) => updateSelectedStoreSettings((current) => ({ ...current, templates: { ...current.templates, day3: event.target.value } }))} />
                                    </div>
                                </article>
                            </div>

                            <article className="alertsCard alertsLogCard">
                                <div className="alertsCardHead">
                                    <h5>Panel de actividad y seguimiento</h5>
                                </div>
                                <div className="alertsLogList">
                                    {alertsLog
                                        .filter((item) => !selectedStore?.slug || item.storeSlug === selectedStore.slug)
                                        .slice(0, 20)
                                        .map((item) => (
                                            <div key={item.id} className="alertsLogItem">
                                                <strong>{item.storeName}</strong>
                                                <span>{item.text}</span>
                                                <small>{item.channelSummary} · Día {item.day || 0} · {new Date(item.createdAt).toLocaleString('es-CO')}</small>
                                            </div>
                                        ))}
                                    {!alertsLog.length ? <p className="storeEmpty">Aún no hay eventos de seguimiento.</p> : null}
                                </div>
                            </article>
                        </section>
                    )}
                </div>
            </section>

            {showModal && (
                <div className="tiendasModalOverlay" onClick={() => setShowModal(false)}>
                    <div className="tiendasModal" onClick={(event) => event.stopPropagation()}>
                        <h3>Nueva tienda</h3>
                        <label htmlFor="store-name">Nombre</label>
                        <input
                            id="store-name"
                            value={form.name}
                            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                            placeholder="Ej: Nike Store"
                        />
                        <small>
                            URL publica corta: {PUBLIC_STORE_DOMAIN}/{cleanSlug || 'tu-slug'}
                        </small>

                        <label htmlFor="store-template">Tipo plantilla</label>
                        <select
                            id="store-template"
                            value={form.templateType}
                            onChange={(event) => setForm((prev) => ({ ...prev, templateType: event.target.value }))}
                        >
                            {TEMPLATE_LIBRARY.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {item.name}
                                </option>
                            ))}
                        </select>

                        {error && <p className="modalError">{error}</p>}

                        <div className="modalActions">
                            <button type="button" className="cancel" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button type="button" className="create" onClick={createStore}>Crear tienda</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
