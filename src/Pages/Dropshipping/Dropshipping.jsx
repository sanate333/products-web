
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Header from '../Header/Header';
import HeaderDash from '../../Components/Admin/HeaderDash/HeaderDash';
import baseURL from '../../Components/url';
import { getTiendaSlug, isStoreDashboardRoute } from '../../utils/tienda';
import './Dropshipping.css';

const ADMIN_TABS = [
    { key: 'catalog', label: 'Catalogo Base' },
    { key: 'stores', label: 'Tiendas' },
    { key: 'activity', label: 'Actividad' },
];

const STORE_TABS = [
    { key: 'available', label: 'Catalogo disponible' },
    { key: 'mine', label: 'Mis productos' },
];

const EMPTY_TEMPLATE = { id: '', name: '', slug: '' };
const formatMoney = (value) => Number(value || 0).toLocaleString('es-CO');
const SHIPPING_ZONES = [
    {
        key: 'principal',
        label: 'Ciudad principal',
        distanceLabel: '0 - 35 km',
        shippingCost: 13000,
        customerPaysSuggested: 8000,
        note: 'En principales suele quedar entre 12.000 y 14.000.',
    },
    {
        key: 'intermedia',
        label: 'Ciudad intermedia / pueblo cercano',
        distanceLabel: '35 - 120 km',
        shippingCost: 16000,
        customerPaysSuggested: 8000,
        note: 'Ticket medio para trayectos intermedios.',
    },
    {
        key: 'lejana',
        label: 'Pueblo lejano',
        distanceLabel: '120 - 280 km',
        shippingCost: 19000,
        customerPaysSuggested: 8000,
        note: 'Ticket lejano frecuente: 19.000.',
    },
    {
        key: 'costera',
        label: 'Zona costera / remota',
        distanceLabel: '280+ km',
        shippingCost: 22000,
        customerPaysSuggested: 8000,
        note: 'Escenario alto reportado (ejemplo: 22.000).',
    },
];

export default function Dropshipping() {
    const pathname = window.location.pathname || '';
    const isStoreScope = isStoreDashboardRoute(pathname);
    const storeSlug = getTiendaSlug();
    const api = useMemo(() => String(baseURL || '').replace(/\/+$/, ''), []);

    const [activeTab, setActiveTab] = useState(isStoreScope ? 'available' : 'catalog');
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [statusTone, setStatusTone] = useState('info');
    const [search, setSearch] = useState('');

    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [catalogStatusFilter, setCatalogStatusFilter] = useState('');
    const [catalog, setCatalog] = useState([]);

    const [stores, setStores] = useState([]);
    const [baseProducts, setBaseProducts] = useState([]);
    const [selectedStore, setSelectedStore] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [storeEditorItems, setStoreEditorItems] = useState({});
    const [activity, setActivity] = useState([]);
    const [activityOrders, setActivityOrders] = useState([]);
    const [releaseBusyId, setReleaseBusyId] = useState(0);

    const [storeCatalog, setStoreCatalog] = useState([]);
    const [myProducts, setMyProducts] = useState([]);
    const [storeMarginDrafts, setStoreMarginDrafts] = useState({});

    const [showModal, setShowModal] = useState(false);
    const [editingItemId, setEditingItemId] = useState(0);
    const [modalForm, setModalForm] = useState({
        title: '',
        description: '',
        imageUrl: '',
        baseCost: '',
        isActive: true,
    });
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignStoreId, setAssignStoreId] = useState('');
    const [assignMarginPercent, setAssignMarginPercent] = useState('0');
    const [assignSearch, setAssignSearch] = useState('');
    const [assignSelectedIds, setAssignSelectedIds] = useState({});
    const [shippingCalc, setShippingCalc] = useState({
        zoneKey: 'principal',
        productCost: 99000,
        salePrice: 136000,
        shippingCost: 13000,
        customerPaysShipping: 8000,
        noReceiveRate: 12,
        returnShare: 50,
        extraOpsCost: 0,
        targetMarginPct: 25,
    });

    const storeHeaders = useMemo(() => ({
        'X-Tienda': storeSlug || 'principal',
        'X-Store-Slug': storeSlug || 'principal',
    }), [storeSlug]);

    const fmtDate = (value) => {
        if (!value) return '-';
        try {
            return new Date(value).toLocaleString('es-CO');
        } catch {
            return String(value);
        }
    };

    const setInfo = (message) => {
        setStatusTone('info');
        setStatusMessage(message || '');
    };

    const setSuccess = (message) => {
        setStatusTone('success');
        setStatusMessage(message || '');
    };

    const safeSetError = (error, fallback) => {
        setStatusTone('error');
        setStatusMessage(error?.message || fallback);
    };

    const loadTemplates = useCallback(async () => {
        if (isStoreScope) return;
        const response = await fetch(`${api}/api/ops/dropshipping/templates`, { credentials: 'include' });
        const data = await response.json();
        if (!data?.ok) throw new Error(data?.error || 'No se pudieron cargar templates');
        const list = Array.isArray(data.templates) ? data.templates : [];
        setTemplates(list);
        if (!selectedTemplateId && list.length > 0) {
            setSelectedTemplateId(String(list[0].id));
        }
    }, [api, isStoreScope, selectedTemplateId]);

    const loadAdminCatalog = useCallback(async () => {
        if (isStoreScope || !selectedTemplateId) return;
        const params = new URLSearchParams({ templateId: selectedTemplateId });
        if (search.trim()) params.set('search', search.trim());
        if (catalogStatusFilter) params.set('status', catalogStatusFilter);
        const response = await fetch(`${api}/api/ops/dropshipping/catalog?${params.toString()}`, { credentials: 'include' });
        const data = await response.json();
        if (!data?.ok) throw new Error(data?.error || 'No se pudo cargar catÃ¡logo base');
        setCatalog(Array.isArray(data.items) ? data.items : []);
    }, [api, catalogStatusFilter, isStoreScope, search, selectedTemplateId]);

    const loadAdminStores = useCallback(async () => {
        if (isStoreScope || !selectedTemplateId) return;
        const response = await fetch(`${api}/api/ops/dropshipping/stores?templateId=${encodeURIComponent(selectedTemplateId)}`, { credentials: 'include' });
        const data = await response.json();
        if (!data?.ok) throw new Error(data?.error || 'No se pudieron cargar tiendas');
        setStores(Array.isArray(data.stores) ? data.stores : []);
        setBaseProducts(Array.isArray(data.baseProducts) ? data.baseProducts : []);
    }, [api, isStoreScope, selectedTemplateId]);

    const loadActivity = useCallback(async () => {
        if (isStoreScope || !selectedTemplateId) return;
        const response = await fetch(`${api}/api/ops/dropshipping/activity?templateId=${encodeURIComponent(selectedTemplateId)}`, { credentials: 'include' });
        const data = await response.json();
        if (!data?.ok) throw new Error(data?.error || 'No se pudo cargar actividad');
        setActivity(Array.isArray(data.items) ? data.items : []);
        setActivityOrders(Array.isArray(data.orders) ? data.orders : []);
    }, [api, isStoreScope, selectedTemplateId]);

    const loadStoreCatalog = useCallback(async () => {
        if (!isStoreScope) return;
        const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
        const response = await fetch(`${api}/api/store/dropshipping/catalog${query}`, {
            credentials: 'include',
            headers: storeHeaders,
        });
        const data = await response.json();
        if (!data?.ok) throw new Error(data?.error || 'No se pudo cargar catÃ¡logo');
        setStoreCatalog(Array.isArray(data.items) ? data.items : []);
    }, [api, isStoreScope, search, storeHeaders]);

    const loadMyProducts = useCallback(async () => {
        if (!isStoreScope) return;
        const response = await fetch(`${api}/api/store/dropshipping/my-products`, {
            credentials: 'include',
            headers: storeHeaders,
        });
        const data = await response.json();
        if (!data?.ok) throw new Error(data?.error || 'No se pudo cargar mis productos');
        const items = Array.isArray(data.items) ? data.items : [];
        setMyProducts(items);
        const drafts = {};
        items.forEach((item) => {
            drafts[item.baseProductId] = {
                marginType: item.marginType || 'percent',
                marginValue: item.marginValue ?? 0,
                isActive: !!item.isActive,
            };
        });
        setStoreMarginDrafts(drafts);
    }, [api, isStoreScope, storeHeaders]);

    useEffect(() => {
        const run = async () => {
            setLoading(true);
            setInfo('');
            try {
                if (!isStoreScope) {
                    await loadTemplates();
                }
            } catch (error) {
                safeSetError(error, 'No se pudo cargar dropshipping');
            } finally {
                setLoading(false);
            }
        };
        run();
    }, [isStoreScope, loadTemplates]);

    useEffect(() => {
        const run = async () => {
            setLoading(true);
            setInfo('');
            try {
                if (isStoreScope) {
                    await Promise.all([loadStoreCatalog(), loadMyProducts()]);
                } else if (selectedTemplateId) {
                    if (activeTab === 'catalog') await loadAdminCatalog();
                    if (activeTab === 'stores') await loadAdminStores();
                    if (activeTab === 'activity') await loadActivity();
                }
            } catch (error) {
                safeSetError(error, 'No se pudo cargar datos');
            } finally {
                setLoading(false);
            }
        };
        run();
    }, [activeTab, isStoreScope, loadActivity, loadAdminCatalog, loadAdminStores, loadMyProducts, loadStoreCatalog, selectedTemplateId]);

    useEffect(() => {
        if (!showAssignModal) return;
        if (assignStoreId) return;
        if (!stores.length) return;
        setAssignStoreId(String(stores[0].id));
    }, [assignStoreId, showAssignModal, stores]);

    useEffect(() => {
        const zone = SHIPPING_ZONES.find((item) => item.key === shippingCalc.zoneKey);
        if (!zone) return;
        setShippingCalc((prev) => ({
            ...prev,
            shippingCost: zone.shippingCost,
            customerPaysShipping: zone.customerPaysSuggested,
        }));
    }, [shippingCalc.zoneKey]);

    const selectedTemplate = useMemo(() => templates.find((tpl) => String(tpl.id) === String(selectedTemplateId)) || EMPTY_TEMPLATE, [selectedTemplateId, templates]);
    const shippingZone = useMemo(
        () => SHIPPING_ZONES.find((item) => item.key === shippingCalc.zoneKey) || SHIPPING_ZONES[0],
        [shippingCalc.zoneKey]
    );
    const shippingProjection = useMemo(() => {
        const productCost = Math.max(0, Number(shippingCalc.productCost || 0));
        const salePrice = Math.max(0, Number(shippingCalc.salePrice || 0));
        const shippingCost = Math.max(0, Number(shippingCalc.shippingCost || 0));
        const customerPaysShipping = Math.max(0, Number(shippingCalc.customerPaysShipping || 0));
        const noReceiveRate = Math.max(0, Math.min(100, Number(shippingCalc.noReceiveRate || 0)));
        const returnShare = Math.max(0, Math.min(100, Number(shippingCalc.returnShare || 0)));
        const extraOpsCost = Math.max(0, Number(shippingCalc.extraOpsCost || 0));
        const targetMarginPct = Math.max(0, Math.min(90, Number(shippingCalc.targetMarginPct || 0)));

        const shippingNetCost = Math.max(0, shippingCost - customerPaysShipping);
        const expectedReturnLoss = shippingCost * (returnShare / 100) * (noReceiveRate / 100);
        const totalVariableCost = productCost + shippingNetCost + expectedReturnLoss + extraOpsCost;
        const marginNet = salePrice - totalVariableCost;
        const marginPct = salePrice > 0 ? (marginNet / salePrice) * 100 : 0;
        const breakEven = totalVariableCost;
        const suggestedPrice = targetMarginPct >= 100 ? breakEven : (breakEven / (1 - (targetMarginPct / 100)));

        return {
            productCost,
            salePrice,
            shippingCost,
            customerPaysShipping,
            noReceiveRate,
            returnShare,
            extraOpsCost,
            targetMarginPct,
            shippingNetCost,
            expectedReturnLoss,
            totalVariableCost,
            marginNet,
            marginPct,
            breakEven,
            suggestedPrice,
        };
    }, [shippingCalc]);

    const selectedCatalogIds = useMemo(
        () => new Set(myProducts.map((item) => Number(item.baseProductId))),
        [myProducts]
    );

    const sortedStoreCatalog = useMemo(() => {
        const list = [...storeCatalog];
        list.sort((a, b) => {
            const aSelected = selectedCatalogIds.has(Number(a.id)) ? 1 : 0;
            const bSelected = selectedCatalogIds.has(Number(b.id)) ? 1 : 0;
            if (aSelected !== bSelected) return aSelected - bSelected;

            const aDate = new Date(a.createdAt || 0).getTime();
            const bDate = new Date(b.createdAt || 0).getTime();
            return bDate - aDate;
        });
        return list;
    }, [selectedCatalogIds, storeCatalog]);

    const openCreateModal = async () => {
        setInfo('');
        setLoading(true);
        try {
            await Promise.all([loadAdminStores(), loadAdminCatalog()]);
            setAssignStoreId((prev) => prev || String(stores?.[0]?.id || ''));
            setAssignMarginPercent('0');
            setAssignSearch('');
            setAssignSelectedIds({});
            setShowAssignModal(true);
        } catch (error) {
            safeSetError(error, 'No se pudo abrir selector de lista');
        } finally {
            setLoading(false);
        }
    };

    const openEditModal = (item) => {
        setEditingItemId(Number(item.id));
        setModalForm({
            title: item.title || '',
            description: item.description || '',
            imageUrl: item.imageUrl || '',
            baseCost: String(item.baseCost ?? ''),
            isActive: !!item.isActive,
        });
        setShowModal(true);
    };

    const saveBaseProduct = async () => {
        if (!selectedTemplateId) {
            setStatusTone('error');
            setStatusMessage('Selecciona una plantilla.');
            return;
        }
        if (!modalForm.title.trim()) {
            setStatusTone('error');
            setStatusMessage('El nombre del producto base es requerido.');
            return;
        }

        setLoading(true);
        setInfo('');
        try {
            const payload = {
                templateId: Number(selectedTemplateId),
                id: editingItemId > 0 ? editingItemId : undefined,
                title: modalForm.title,
                description: modalForm.description,
                imageUrl: modalForm.imageUrl,
                baseCost: Number(modalForm.baseCost || 0),
                isActive: !!modalForm.isActive,
            };
            const response = await fetch(`${api}/api/ops/dropshipping/catalog`, {
                method: editingItemId > 0 ? 'PATCH' : 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!data?.ok) throw new Error(data?.error || 'No se pudo guardar');
            setSuccess(editingItemId > 0 ? 'Producto base actualizado.' : 'Producto base creado.');
            setShowModal(false);
            await loadAdminCatalog();
        } catch (error) {
            safeSetError(error, 'No se pudo guardar producto base');
        } finally {
            setLoading(false);
        }
    };

    const toggleBaseActive = async (item) => {
        setLoading(true);
        setInfo('');
        try {
            const response = await fetch(`${api}/api/ops/dropshipping/catalog`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
            });
            const data = await response.json();
            if (!data?.ok) throw new Error(data?.error || 'No se pudo cambiar estado');
            setSuccess('Estado actualizado.');
            await loadAdminCatalog();
        } catch (error) {
            safeSetError(error, 'Error al cambiar estado');
        } finally {
            setLoading(false);
        }
    };

    const notifyTemplate = async (productId = 0) => {
        setLoading(true);
        setInfo('');
        try {
            const response = await fetch(`${api}/api/ops/dropshipping/notify`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    templateId: Number(selectedTemplateId),
                    productId: productId || undefined,
                    sendEmail: true,
                }),
            });
            const data = await response.json();
            if (!data?.ok) throw new Error(data?.error || 'No se pudo notificar');
            setSuccess(`Notificacion enviada. Entregas nuevas: ${data?.delivery?.newDeliveries ?? 0}`);
            if (activeTab === 'activity') {
                await loadActivity();
            }
        } catch (error) {
            safeSetError(error, 'Error al notificar tiendas');
        } finally {
            setLoading(false);
        }
    };

    const openStoreEditor = (store) => {
        const mapped = {};
        baseProducts.forEach((bp) => {
            const current = store.items?.[String(bp.id)] || {};
            mapped[bp.id] = {
                baseProductId: bp.id,
                isActive: !!current.isActive,
                marginType: 'percent',
                marginValue: Number(current.marginValue ?? 0),
            };
        });
        setStoreEditorItems(mapped);
        setSelectedStore(store);
        setDrawerOpen(true);
    };

    const saveStoreBulk = async () => {
        if (!selectedStore) return;
        setLoading(true);
        setInfo('');
        try {
            const items = Object.values(storeEditorItems).map((entry) => ({
                baseProductId: Number(entry.baseProductId),
                isActive: !!entry.isActive,
                marginType: 'percent',
                marginValue: Number(entry.marginValue || 0),
            }));
            const response = await fetch(`${api}/api/ops/dropshipping/store-products`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeId: selectedStore.id, items }),
            });
            const data = await response.json();
            if (!data?.ok) throw new Error(data?.error || 'No se pudieron guardar cambios');
            setSuccess('Asignacion guardada. Si activaste productos, se notifico a la tienda.');
            setDrawerOpen(false);
            await loadAdminStores();
        } catch (error) {
            safeSetError(error, 'Error guardando cambios de tienda');
        } finally {
            setLoading(false);
        }
    };

    const selectedStoreForAssign = useMemo(
        () => stores.find((item) => String(item.id) === String(assignStoreId)) || null,
        [assignStoreId, stores]
    );

    const assignCatalogRows = useMemo(() => {
        const q = String(assignSearch || '').trim().toLowerCase();
        if (!q) return catalog;
        return catalog.filter((item) =>
            String(item?.title || '').toLowerCase().includes(q)
            || String(item?.description || '').toLowerCase().includes(q)
        );
    }, [assignSearch, catalog]);

    const toggleAssignProduct = (productId) => {
        setAssignSelectedIds((prev) => {
            const key = String(productId);
            const next = { ...prev };
            if (next[key]) delete next[key];
            else next[key] = true;
            return next;
        });
    };

    const submitAssignList = async () => {
        const targetStoreId = Number(assignStoreId || 0);
        const selectedIds = Object.keys(assignSelectedIds).filter((id) => assignSelectedIds[id]).map((id) => Number(id));
        if (targetStoreId <= 0) {
            setStatusTone('error');
            setStatusMessage('Selecciona una tienda destino.');
            return;
        }
        if (selectedIds.length === 0) {
            setStatusTone('error');
            setStatusMessage('Selecciona al menos un producto.');
            return;
        }

        const margin = Math.max(0, Number(assignMarginPercent || 0));
        const currentItems = selectedStoreForAssign?.items || {};
        const items = selectedIds.map((baseProductId) => {
            const current = currentItems[String(baseProductId)] || {};
            return {
                baseProductId,
                isActive: true,
                marginType: 'percent',
                marginValue: Number(current.marginValue ?? margin),
            };
        });

        setLoading(true);
        setInfo('');
        try {
            const response = await fetch(`${api}/api/ops/dropshipping/store-products`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeId: targetStoreId, items }),
            });
            const data = await response.json();
            if (!data?.ok) throw new Error(data?.error || 'No se pudo crear la lista');
            setSuccess(`Lista creada para tienda (${selectedIds.length} productos asignados).`);
            setShowAssignModal(false);
            await loadAdminStores();
        } catch (error) {
            safeSetError(error, 'Error creando lista para tienda');
        } finally {
            setLoading(false);
        }
    };

    const addToStore = async (baseProductId) => {
        const draft = storeMarginDrafts[baseProductId] || { marginType: 'percent', marginValue: 0 };
        setLoading(true);
        setInfo('');
        try {
            const response = await fetch(`${api}/api/store/dropshipping/add`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', ...storeHeaders },
                body: JSON.stringify({
                    baseProductId,
                    marginType: 'percent',
                    marginValue: Number(draft.marginValue || 0),
                }),
            });
            const data = await response.json();
            if (!data?.ok) throw new Error(data?.error || 'No se pudo agregar');
            setSuccess('Producto seleccionado y agregado a tu tienda.');
            await Promise.all([loadMyProducts(), loadStoreCatalog()]);
        } catch (error) {
            safeSetError(error, 'Error agregando producto');
        } finally {
            setLoading(false);
        }
    };

    const removeFromStore = async (baseProductId) => {
        setLoading(true);
        setInfo('');
        try {
            const response = await fetch(`${api}/api/store/dropshipping/remove`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', ...storeHeaders },
                body: JSON.stringify({ baseProductId }),
            });
            const data = await response.json();
            if (!data?.ok) throw new Error(data?.error || 'No se pudo quitar');
            setSuccess('Producto eliminado de tu tienda.');
            await Promise.all([loadMyProducts(), loadStoreCatalog()]);
        } catch (error) {
            safeSetError(error, 'Error quitando producto');
        } finally {
            setLoading(false);
        }
    };

    const releaseWalletForOrder = async (orderId) => {
        if (!orderId || releaseBusyId === orderId) return;
        setReleaseBusyId(orderId);
        setInfo('');
        try {
            const response = await fetch(`${api}/api/ops/orders/release?id=${encodeURIComponent(orderId)}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: orderId }),
            });
            const data = await response.json();
            if (!data?.ok) throw new Error(data?.error || 'No se pudo liberar margen');
            if (data.released) {
                setSuccess(`Margen acreditado a wallet: $${formatMoney(data.amount || 0)}`);
            } else {
                setInfo('Este pedido ya estaba acreditado en wallet.');
            }
            await loadActivity();
        } catch (error) {
            safeSetError(error, 'Error liberando margen a wallet');
        } finally {
            setReleaseBusyId(0);
        }
    };

    return (
        <div className='containerGrid'>
            <Header />
            <section className='containerSection'>
                <HeaderDash />
                <div className='container dropshippingPage'>
                    <header className='dropshippingHero'>
                        <div>
                            <h1>Dropshipping</h1>
                            <p>{isStoreScope ? `MÃ³dulo tienda ${storeSlug || 'actual'} por nicho.` : `Panel maestro para plantilla: ${selectedTemplate.name || '...'}`}</p>
                        </div>
                        {!isStoreScope ? <button type='button' className='dropshippingPrimaryBtn' onClick={openCreateModal}>Crear lista para tienda</button> : null}
                    </header>

                    {statusMessage ? <p className={`dropshippingStatusMsg ${statusTone}`}>{statusMessage}</p> : null}
                    {loading ? <p className='dropshippingStatusMsg'>Procesando...</p> : null}
                    {isStoreScope && activeTab === 'available' && myProducts.length > 0 ? (
                        <p className='dropshippingSelectionHint'>Los productos ya agregados aparecen en verde como seleccionados.</p>
                    ) : null}

                    <section className='dropshippingLogisticsCard'>
                        <div className='dropshippingLogisticsHead'>
                            <div>
                                <h3>Calculadora logistica de margen</h3>
                                <p>Calcula margen real por producto incluyendo costo de envio, aporte del cliente y riesgo de retorno.</p>
                            </div>
                        </div>
                        <div className='dropshippingLogisticsGrid'>
                            <div className='dropshippingFilters'>
                                <label>Zona de entrega</label>
                                <select value={shippingCalc.zoneKey} onChange={(e) => setShippingCalc((prev) => ({ ...prev, zoneKey: e.target.value }))}>
                                    {SHIPPING_ZONES.map((zone) => (
                                        <option key={zone.key} value={zone.key}>{zone.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className='dropshippingFilters'>
                                <label>Distancia referencial</label>
                                <input type='text' value={shippingZone.distanceLabel} readOnly />
                            </div>
                            <div className='dropshippingFilters'>
                                <label>Costo base del producto</label>
                                <input type='number' min='0' value={shippingCalc.productCost} onChange={(e) => setShippingCalc((prev) => ({ ...prev, productCost: e.target.value }))} />
                            </div>
                            <div className='dropshippingFilters'>
                                <label>Precio de venta</label>
                                <input type='number' min='0' value={shippingCalc.salePrice} onChange={(e) => setShippingCalc((prev) => ({ ...prev, salePrice: e.target.value }))} />
                            </div>
                            <div className='dropshippingFilters'>
                                <label>Costo envio (transportadora)</label>
                                <input type='number' min='0' value={shippingCalc.shippingCost} onChange={(e) => setShippingCalc((prev) => ({ ...prev, shippingCost: e.target.value }))} />
                            </div>
                            <div className='dropshippingFilters'>
                                <label>Aporte cliente al envio</label>
                                <input type='number' min='0' value={shippingCalc.customerPaysShipping} onChange={(e) => setShippingCalc((prev) => ({ ...prev, customerPaysShipping: e.target.value }))} />
                            </div>
                            <div className='dropshippingFilters'>
                                <label>% pedidos no recibidos</label>
                                <input type='number' min='0' max='100' value={shippingCalc.noReceiveRate} onChange={(e) => setShippingCalc((prev) => ({ ...prev, noReceiveRate: e.target.value }))} />
                            </div>
                            <div className='dropshippingFilters'>
                                <label>% costo retorno que asumes</label>
                                <input type='number' min='0' max='100' value={shippingCalc.returnShare} onChange={(e) => setShippingCalc((prev) => ({ ...prev, returnShare: e.target.value }))} />
                            </div>
                            <div className='dropshippingFilters'>
                                <label>Otros costos por pedido</label>
                                <input type='number' min='0' value={shippingCalc.extraOpsCost} onChange={(e) => setShippingCalc((prev) => ({ ...prev, extraOpsCost: e.target.value }))} />
                            </div>
                            <div className='dropshippingFilters'>
                                <label>% margen objetivo</label>
                                <input type='number' min='0' max='90' value={shippingCalc.targetMarginPct} onChange={(e) => setShippingCalc((prev) => ({ ...prev, targetMarginPct: e.target.value }))} />
                            </div>
                        </div>

                        <div className='dropshippingLogisticsStats'>
                            <article>
                                <span>Envio neto asumido</span>
                                <strong>${formatMoney(shippingProjection.shippingNetCost)}</strong>
                            </article>
                            <article>
                                <span>Perdida esperada por retorno</span>
                                <strong>${formatMoney(shippingProjection.expectedReturnLoss)}</strong>
                            </article>
                            <article>
                                <span>Margen neto estimado</span>
                                <strong className={shippingProjection.marginNet >= 0 ? 'tonePositive' : 'toneNegative'}>
                                    ${formatMoney(shippingProjection.marginNet)}
                                </strong>
                            </article>
                            <article>
                                <span>Margen sobre venta</span>
                                <strong className={shippingProjection.marginPct >= 0 ? 'tonePositive' : 'toneNegative'}>
                                    {shippingProjection.marginPct.toFixed(2)}%
                                </strong>
                            </article>
                            <article>
                                <span>Punto de equilibrio</span>
                                <strong>${formatMoney(shippingProjection.breakEven)}</strong>
                            </article>
                            <article>
                                <span>Precio sugerido ({shippingProjection.targetMarginPct}% objetivo)</span>
                                <strong>${formatMoney(shippingProjection.suggestedPrice)}</strong>
                            </article>
                        </div>

                        <div className='dropshippingPanel'>
                            <table className='dropshippingTable'>
                                <thead>
                                    <tr>
                                        <th>Zona</th>
                                        <th>Distancia referencial</th>
                                        <th>Flete estimado</th>
                                        <th>Aporte cliente sugerido</th>
                                        <th>Observacion operativa</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {SHIPPING_ZONES.map((zone) => (
                                        <tr key={`zone-${zone.key}`}>
                                            <td>{zone.label}</td>
                                            <td>{zone.distanceLabel}</td>
                                            <td>${formatMoney(zone.shippingCost)}</td>
                                            <td>${formatMoney(zone.customerPaysSuggested)}</td>
                                            <td>{zone.note}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className='dropshippingToolbar'>
                        {!isStoreScope ? (
                            <div className='dropshippingFilters'>
                                <label>Plantilla</label>
                                <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}>
                                    {templates.map((tpl) => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
                                </select>
                            </div>
                        ) : null}
                        <div className='dropshippingFilters'>
                            <label>Buscar</label>
                            <input type='text' value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Buscar producto' />
                        </div>
                        {!isStoreScope && activeTab === 'catalog' ? (
                            <div className='dropshippingFilters'>
                                <label>Estado</label>
                                <select value={catalogStatusFilter} onChange={(e) => setCatalogStatusFilter(e.target.value)}>
                                    <option value=''>Todos</option>
                                    <option value='active'>Activos</option>
                                    <option value='inactive'>Inactivos</option>
                                </select>
                            </div>
                        ) : null}
                    </section>

                    <div className='dropshippingTabs'>
                        {(isStoreScope ? STORE_TABS : ADMIN_TABS).map((tab) => (
                            <button key={tab.key} type='button' className={`dropshippingTabBtn ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {!isStoreScope && activeTab === 'catalog' ? (
                        <section className='dropshippingPanel'>
                            <table className='dropshippingTable'>
                                <thead>
                                    <tr>
                                        <th>Imagen</th>
                                        <th>Nombre</th>
                                        <th>Costo base</th>
                                        <th>Estado</th>
                                        <th>Fecha</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {catalog.length === 0 ? <tr><td colSpan='6'>Sin productos base.</td></tr> : catalog.map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.imageUrl ? <img src={item.imageUrl} alt={item.title} className='dropshippingThumb' /> : 'â€”'}</td>
                                            <td>{item.title}</td>
                                            <td>${formatMoney(item.baseCost)}</td>
                                            <td>{item.isActive ? 'Activo' : 'Inactivo'}</td>
                                            <td>{fmtDate(item.createdAt)}</td>
                                            <td>
                                                <button type='button' onClick={() => openEditModal(item)}>Editar</button>
                                                <button type='button' onClick={() => toggleBaseActive(item)}>{item.isActive ? 'Desactivar' : 'Activar'}</button>
                                                <button type='button' onClick={() => notifyTemplate(item.id)}>Notificar tiendas</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>
                    ) : null}

                    {!isStoreScope && activeTab === 'stores' ? (
                        <section className='dropshippingPanel'>
                            <table className='dropshippingTable'>
                                <thead>
                                    <tr>
                                        <th>Tienda</th>
                                        <th>Productos activos</th>
                                        <th>Ventas</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stores.length === 0 ? <tr><td colSpan='4'>No hay tiendas del nicho.</td></tr> : stores.map((store) => (
                                        <tr key={store.id}>
                                            <td>{store.name} ({store.slug})</td>
                                            <td>{store.activeProducts}</td>
                                            <td>{store.sales}</td>
                                            <td><button type='button' onClick={() => openStoreEditor(store)}>Ver productos</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>
                    ) : null}

                    {!isStoreScope && activeTab === 'activity' ? (
                        <section className='dropshippingPanel'>
                            <table className='dropshippingTable'>
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Tipo</th>
                                        <th>Tienda</th>
                                        <th>Template</th>
                                        <th>Producto</th>
                                        <th>Mensaje</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activity.length === 0 ? <tr><td colSpan='6'>Sin actividad registrada.</td></tr> : activity.map((row) => (
                                        <tr key={row.id}>
                                            <td>{fmtDate(row.created_at)}</td>
                                            <td>{row.type}</td>
                                            <td>{row.store_slug || '-'}</td>
                                            <td>{row.template_slug || '-'}</td>
                                            <td>{row.product_title || row.product_id || '-'}</td>
                                            <td>{row.message}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className='dropshippingOrdersBlock'>
                                <h3>Pedidos dropshipping</h3>
                                <p>Pedidos reales de tiendas con productos dropshipping. Al entregar, libera margen a wallet.</p>
                                <table className='dropshippingTable'>
                                    <thead>
                                        <tr>
                                            <th>Pedido</th>
                                            <th>Tienda</th>
                                            <th>Cliente</th>
                                            <th>Total</th>
                                            <th>Estado</th>
                                            <th>Ganancia</th>
                                            <th>Wallet</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activityOrders.length === 0 ? <tr><td colSpan='7'>Sin pedidos dropshipping detectados.</td></tr> : activityOrders.map((row) => (
                                            <tr key={`ds-order-${row.id}`}>
                                                <td>#{row.id}</td>
                                                <td>{row.storeSlug || row.storeName || '-'}</td>
                                                <td>{row.customerName || '-'}</td>
                                                <td>${formatMoney(row.total || 0)}</td>
                                                <td>{row.status || '-'}</td>
                                                <td>${formatMoney(row.marginAmount || 0)}</td>
                                                <td>
                                                    {row.released ? (
                                                        <span className='stateActive'>Acreditado</span>
                                                    ) : row.canRelease ? (
                                                        <button
                                                            type='button'
                                                            onClick={() => releaseWalletForOrder(row.id)}
                                                            disabled={releaseBusyId === row.id}
                                                        >
                                                            {releaseBusyId === row.id ? 'Liberando...' : 'Liberar margen'}
                                                        </button>
                                                    ) : (
                                                        <span className='stateInactive'>Pendiente entrega</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    ) : null}

                    {isStoreScope && activeTab === 'available' ? (
                        <section className='dropshippingGrid'>
                            {sortedStoreCatalog.length === 0 ? (
                                <article className='dropshippingEmptyState'>
                                    <h3>Sin catÃ¡logo disponible</h3>
                                    <p>No hay productos activos para tu nicho.</p>
                                </article>
                            ) : sortedStoreCatalog.map((item) => {
                                const isSelected = selectedCatalogIds.has(Number(item.id));
                                return (
                                    <article key={item.id} className={`dropshippingCard ${isSelected ? 'selected' : ''}`}>
                                        <div className='cardHeader'>
                                            <h3>{item.title}</h3>
                                            <span>{isSelected ? 'Seleccionado' : `Base $${formatMoney(item.baseCost)}`}</span>
                                        </div>
                                        {item.imageUrl ? <img src={item.imageUrl} alt={item.title} className='dropshippingCardImage' /> : null}
                                        <p>{item.description || 'Sin descripciÃ³n'}</p>
                                        <div className='dropshippingCardActions'>
                                            {!isSelected ? (
                                                <button type='button' onClick={() => addToStore(item.id)}>Agregar</button>
                                            ) : (
                                                <button type='button' className='selectedBtn' disabled>Ya seleccionado</button>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </section>
                    ) : null}

                    {isStoreScope && activeTab === 'mine' ? (
                        <section className='dropshippingMineGrid'>
                            {myProducts.length === 0 ? (
                                <article className='dropshippingEmptyState'>
                                    <h3>AÃºn no tienes productos.</h3>
                                    <p>Agrega productos desde Catalogo disponible.</p>
                                </article>
                            ) : myProducts.map((item) => {
                                const draft = storeMarginDrafts[item.baseProductId] || { marginType: item.marginType, marginValue: item.marginValue, isActive: item.isActive };
                                return (
                                    <article key={item.baseProductId} className='dropshippingMineCard'>
                                        <div className='cardHeader'>
                                            <h3>{item.title}</h3>
                                            <span className={draft.isActive ? 'stateActive' : 'stateInactive'}>
                                                {draft.isActive ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </div>
                                        <div className='mineMetaGrid'>
                                            <div><strong>Agregado:</strong> {fmtDate(item.createdAt)}</div>
                                            <div><strong>Costo base:</strong> ${formatMoney(item.baseCost)}</div>
                                            <div><strong>Margen:</strong> {formatMoney(item.marginValue)}%</div>
                                            <div><strong>Precio final:</strong> ${formatMoney(item.finalPrice)}</div>
                                            <div><strong>Vistas reales:</strong> {formatMoney(item.viewsCount || 0)}</div>
                                            <div><strong>Ventas:</strong> {formatMoney(item.salesCount || 0)}</div>
                                        </div>
                                        <div className='dropshippingCardActions'>
                                            <button type='button' onClick={() => removeFromStore(item.baseProductId)}>Quitar</button>
                                        </div>
                                    </article>
                                );
                            })}
                        </section>
                    ) : null}

                    {showAssignModal ? (
                        <div className='dropshippingModalBackdrop'>
                            <div className='dropshippingModal'>
                                <h3>Crear lista por tienda</h3>
                                <label>Tienda destino</label>
                                <select value={assignStoreId} onChange={(e) => setAssignStoreId(e.target.value)}>
                                    <option value=''>Seleccionar tienda</option>
                                    {stores.map((store) => (
                                        <option key={`assign-store-${store.id}`} value={store.id}>
                                            {store.name} ({store.slug})
                                        </option>
                                    ))}
                                </select>
                                <label>% Margen por defecto</label>
                                <input
                                    type='number'
                                    min='0'
                                    step='0.01'
                                    value={assignMarginPercent}
                                    onChange={(e) => setAssignMarginPercent(e.target.value)}
                                />
                                <label>Buscar en catalogo</label>
                                <input
                                    type='text'
                                    value={assignSearch}
                                    onChange={(e) => setAssignSearch(e.target.value)}
                                    placeholder='Buscar producto'
                                />
                                <div className='assignListTableWrap'>
                                    <table className='dropshippingTable'>
                                        <thead>
                                            <tr>
                                                <th>Sel.</th>
                                                <th>Producto</th>
                                                <th>Costo base</th>
                                                <th>Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {assignCatalogRows.length === 0 ? (
                                                <tr><td colSpan='4'>No hay productos para seleccionar.</td></tr>
                                            ) : assignCatalogRows.map((item) => {
                                                const selected = !!assignSelectedIds[String(item.id)];
                                                return (
                                                    <tr key={`assign-row-${item.id}`}>
                                                        <td>
                                                            <input
                                                                type='checkbox'
                                                                checked={selected}
                                                                onChange={() => toggleAssignProduct(item.id)}
                                                            />
                                                        </td>
                                                        <td>{item.title}</td>
                                                        <td>${formatMoney(item.baseCost)}</td>
                                                        <td>{item.isActive ? 'Activo' : 'Inactivo'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className='modalActions'>
                                    <button type='button' onClick={() => setShowAssignModal(false)}>Cancelar</button>
                                    <button type='button' onClick={submitAssignList} disabled={loading}>Crear lista</button>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {showModal ? (
                        <div className='dropshippingModalBackdrop'>
                            <div className='dropshippingModal'>
                                <h3>{editingItemId > 0 ? 'Editar producto base' : 'Nuevo producto base'}</h3>
                                <label>Nombre</label>
                                <input value={modalForm.title} onChange={(e) => setModalForm((prev) => ({ ...prev, title: e.target.value }))} />
                                <label>DescripciÃ³n</label>
                                <textarea value={modalForm.description} onChange={(e) => setModalForm((prev) => ({ ...prev, description: e.target.value }))} />
                                <label>Imagen URL</label>
                                <input value={modalForm.imageUrl} onChange={(e) => setModalForm((prev) => ({ ...prev, imageUrl: e.target.value }))} />
                                <label>Costo base</label>
                                <input type='number' value={modalForm.baseCost} onChange={(e) => setModalForm((prev) => ({ ...prev, baseCost: e.target.value }))} />
                                <label className='toggleActive'>
                                    <input type='checkbox' checked={!!modalForm.isActive} onChange={(e) => setModalForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
                                    Activo
                                </label>
                                <div className='modalActions'>
                                    <button type='button' onClick={() => setShowModal(false)}>Cancelar</button>
                                    <button type='button' onClick={saveBaseProduct} disabled={loading}>Guardar</button>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {drawerOpen && selectedStore ? (
                        <aside className='dropshippingDrawer'>
                            <div className='drawerHead'>
                                <div>
                                    <h3>Productos de {selectedStore.slug}</h3>
                                    <p>Activa/desactiva productos y define margen % por producto para esta tienda.</p>
                                </div>
                                <button type='button' onClick={() => setDrawerOpen(false)}>Cerrar</button>
                            </div>
                            <div className='drawerBody'>
                                {baseProducts.map((bp) => {
                                    const entry = storeEditorItems[bp.id] || { baseProductId: bp.id, isActive: false, marginType: 'percent', marginValue: 0 };
                                    return (
                                        <div key={bp.id} className='drawerItem'>
                                            <div>
                                                <strong>{bp.title}</strong>
                                                <span>Base ${formatMoney(bp.baseCost)}</span>
                                            </div>
                                            <div className='drawerSwitchWrap'>
                                                <button
                                                    type='button'
                                                    className={`drawerStateBtn ${entry.isActive ? 'on' : 'off'}`}
                                                    onClick={() => setStoreEditorItems((prev) => ({ ...prev, [bp.id]: { ...entry, isActive: !entry.isActive } }))}
                                                >
                                                    {entry.isActive ? 'Activo' : 'Inactivo'}
                                                </button>
                                            </div>
                                            <div className='drawerMarginWrap'>
                                                <label>% Margen</label>
                                                <input
                                                    type='number'
                                                    min='0'
                                                    step='0.01'
                                                    value={entry.marginValue}
                                                    onChange={(e) => setStoreEditorItems((prev) => ({ ...prev, [bp.id]: { ...entry, marginType: 'percent', marginValue: e.target.value } }))}
                                                />
                                            </div>
                                            <div className='drawerFinalWrap'>
                                                <span>Final aprox.</span>
                                                <strong>${formatMoney((Number(bp.baseCost || 0) * (1 + (Number(entry.marginValue || 0) / 100))))}</strong>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className='drawerActions'>
                                <button type='button' onClick={saveStoreBulk} disabled={loading}>Guardar cambios</button>
                            </div>
                        </aside>
                    ) : null}
                </div>
            </section>
        </div>
    );
}

