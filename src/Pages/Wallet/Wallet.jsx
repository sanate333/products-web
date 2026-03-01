import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Header from '../Header/Header';
import HeaderDash from '../../Components/Admin/HeaderDash/HeaderDash';
import baseURL from '../../Components/url';
import { getTiendaSlug, isStoreDashboardRoute } from '../../utils/tienda';
import './Wallet.css';

const ADMIN_TABS = [
    { key: 'orders', label: 'Ã“rdenes' },
    { key: 'withdrawals', label: 'Retiros' },
    { key: 'ledger', label: 'Ledger Global' },
];

const STORE_TABS = [
    { key: 'ledger', label: 'Mi ledger' },
];

const ORDER_STATUSES = ['Pagado', 'Despachado', 'En trÃ¡nsito', 'Entregado', 'Recibido', 'Entregado/Recibido'];
const WITHDRAW_STATUSES = ['', 'pending', 'processing', 'paid', 'rejected'];

const currency = (value) => Number(value || 0).toLocaleString('es-CO');

export default function Wallet() {
    const storeSlug = getTiendaSlug();
    const isStoreScope = isStoreDashboardRoute(window.location.pathname || '');
    const api = useMemo(() => String(baseURL || '').replace(/\/+$/, ''), []);

    const [activeTab, setActiveTab] = useState(isStoreScope ? 'ledger' : 'orders');
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    const [stores, setStores] = useState([]);
    const [kpis, setKpis] = useState({ totalSales: 0, pendingRelease: 0, availableToPay: 0 });
    const [orders, setOrders] = useState([]);
    const [withdrawals, setWithdrawals] = useState([]);
    const [globalLedger, setGlobalLedger] = useState([]);

    const [storeOverview, setStoreOverview] = useState({ available: 0, pending: 0, inWithdrawal: 0 });
    const [storeLedger, setStoreLedger] = useState([]);

    const [filters, setFilters] = useState({
        storeId: '',
        status: '',
        noTracking: false,
        dateFrom: '',
        dateTo: '',
        withdrawalStatus: '',
    });

    const [trackingModalOpen, setTrackingModalOpen] = useState(false);
    const [trackingOrder, setTrackingOrder] = useState(null);
    const [trackingForm, setTrackingForm] = useState({ carrier: '', trackingNumber: '', status: '' });

    const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
    const [withdrawForm, setWithdrawForm] = useState({ amount: '', method: 'nequi', accountRef: '', bankName: '' });

    const storeHeaders = useMemo(() => ({
        'X-Tienda': storeSlug || 'principal',
        'X-Store-Slug': storeSlug || 'principal',
    }), [storeSlug]);

    const withError = (error, fallback) => {
        setStatusMessage(error?.message || fallback);
    };

    const loadAdminOverview = useCallback(async () => {
        if (isStoreScope) return;
        const query = filters.storeId ? `?storeId=${encodeURIComponent(filters.storeId)}` : '';
        const response = await fetch(`${api}/api/ops/wallet/overview${query}`, { credentials: 'include' });
        const data = await response.json();
        if (!data?.ok) throw new Error(data?.error || 'No se pudo cargar overview');
        setStores(Array.isArray(data.stores) ? data.stores : []);
        setKpis(data.kpis || { totalSales: 0, pendingRelease: 0, availableToPay: 0 });
    }, [api, filters.storeId, isStoreScope]);

    const loadAdminOrders = useCallback(async () => {
        if (isStoreScope) return;
        const params = new URLSearchParams();
        if (filters.storeId) params.set('storeId', filters.storeId);
        if (filters.status) params.set('status', filters.status);
        if (filters.noTracking) params.set('noTracking', '1');
        if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.set('dateTo', filters.dateTo);
        const query = params.toString() ? `?${params.toString()}` : '';
        const response = await fetch(`${api}/api/ops/orders${query}`, { credentials: 'include' });
        const data = await response.json();
        if (!data?.ok) throw new Error(data?.error || 'No se pudieron cargar Ã³rdenes');
        setOrders(Array.isArray(data.orders) ? data.orders : []);
    }, [api, filters.dateFrom, filters.dateTo, filters.noTracking, filters.status, filters.storeId, isStoreScope]);

    const loadAdminWithdrawals = useCallback(async () => {
        if (isStoreScope) return;
        const params = new URLSearchParams();
        if (filters.storeId) params.set('storeId', filters.storeId);
        if (filters.withdrawalStatus) params.set('status', filters.withdrawalStatus);
        const query = params.toString() ? `?${params.toString()}` : '';
        const response = await fetch(`${api}/api/ops/withdrawals${query}`, { credentials: 'include' });
        const data = await response.json();
        if (!data?.ok) throw new Error(data?.error || 'No se pudieron cargar retiros');
        setWithdrawals(Array.isArray(data.items) ? data.items : []);
    }, [api, filters.storeId, filters.withdrawalStatus, isStoreScope]);

    const loadAdminLedger = useCallback(async () => {
        if (isStoreScope) return;
        const query = filters.storeId ? `?storeId=${encodeURIComponent(filters.storeId)}` : '';
        const response = await fetch(`${api}/api/ops/wallet/ledger${query}`, { credentials: 'include' });
        const data = await response.json();
        if (!data?.ok) throw new Error(data?.error || 'No se pudo cargar ledger global');
        setGlobalLedger(Array.isArray(data.items) ? data.items : []);
    }, [api, filters.storeId, isStoreScope]);

    const loadStoreOverview = useCallback(async () => {
        if (!isStoreScope) return;
        const response = await fetch(`${api}/api/store/wallet/overview`, { credentials: 'include', headers: storeHeaders });
        const data = await response.json();
        if (!data?.ok) throw new Error(data?.error || 'No se pudo cargar overview de tienda');
        setStoreOverview(data.balances || { available: 0, pending: 0, inWithdrawal: 0 });
    }, [api, isStoreScope, storeHeaders]);

    const loadStoreLedger = useCallback(async () => {
        if (!isStoreScope) return;
        const response = await fetch(`${api}/api/store/wallet/ledger`, { credentials: 'include', headers: storeHeaders });
        const data = await response.json();
        if (!data?.ok) throw new Error(data?.error || 'No se pudo cargar ledger de tienda');
        setStoreLedger(Array.isArray(data.items) ? data.items : []);
    }, [api, isStoreScope, storeHeaders]);

    useEffect(() => {
        const run = async () => {
            setLoading(true);
            setStatusMessage('');
            try {
                if (isStoreScope) {
                    await Promise.all([loadStoreOverview(), loadStoreLedger()]);
                } else {
                    await loadAdminOverview();
                    if (activeTab === 'orders') await loadAdminOrders();
                    if (activeTab === 'withdrawals') await loadAdminWithdrawals();
                    if (activeTab === 'ledger') await loadAdminLedger();
                }
            } catch (error) {
                withError(error, 'No se pudo cargar wallet');
            } finally {
                setLoading(false);
            }
        };
        run();
    }, [activeTab, isStoreScope, loadAdminLedger, loadAdminOrders, loadAdminOverview, loadAdminWithdrawals, loadStoreLedger, loadStoreOverview]);

    const openTrackingModal = (order) => {
        setTrackingOrder(order);
        setTrackingForm({
            carrier: order.carrier || '',
            trackingNumber: order.trackingNumber || '',
            status: order.status || '',
        });
        setTrackingModalOpen(true);
    };

    const saveOrderTracking = async () => {
        if (!trackingOrder) return;
        setLoading(true);
        setStatusMessage('');
        try {
            const response = await fetch(`${api}/api/ops/orders/${trackingOrder.id}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(trackingForm),
            });
            const data = await response.json();
            if (!data?.ok) throw new Error(data?.error || 'No se pudo actualizar orden');
            setStatusMessage('Orden actualizada.');
            setTrackingModalOpen(false);
            await loadAdminOrders();
        } catch (error) {
            withError(error, 'Error actualizando orden');
        } finally {
            setLoading(false);
        }
    };

    const releaseOrder = async (order) => {
        setLoading(true);
        setStatusMessage('');
        try {
            const response = await fetch(`${api}/api/ops/orders/${order.id}/release`, {
                method: 'POST',
                credentials: 'include',
            });
            const data = await response.json();
            if (!data?.ok) throw new Error(data?.error || 'No se pudo liberar saldo');
            if (data.released) {
                const amount = Number(data.amount || 0).toLocaleString('es-CO');
                setStatusMessage(`Saldo liberado por $${amount}.`);
            } else {
                setStatusMessage('Este pedido ya estaba liberado (idempotente).');
            }
            await Promise.all([loadAdminOrders(), loadAdminOverview(), loadAdminLedger()]);
        } catch (error) {
            withError(error, 'Error liberando saldo');
        } finally {
            setLoading(false);
        }
    };

    const patchWithdrawalStatus = async (withdrawalId, status) => {
        setLoading(true);
        setStatusMessage('');
        try {
            const response = await fetch(`${api}/api/ops/withdrawals/${withdrawalId}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            const data = await response.json();
            if (!data?.ok) throw new Error(data?.error || 'No se pudo actualizar retiro');
            setStatusMessage(`Retiro marcado como ${status}.`);
            await Promise.all([loadAdminWithdrawals(), loadAdminLedger(), loadAdminOverview()]);
        } catch (error) {
            withError(error, 'Error actualizando retiro');
        } finally {
            setLoading(false);
        }
    };

    const submitWithdrawal = async () => {
        if (!withdrawForm.amount || Number(withdrawForm.amount) <= 0) {
            setStatusMessage('Monto invÃ¡lido.');
            return;
        }
        if (!withdrawForm.accountRef.trim()) {
            setStatusMessage('Debes ingresar nÃºmero de cuenta/Nequi.');
            return;
        }

        setLoading(true);
        setStatusMessage('');
        try {
            const response = await fetch(`${api}/api/store/wallet/withdrawals`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', ...storeHeaders },
                body: JSON.stringify({
                    amount: Number(withdrawForm.amount),
                    method: withdrawForm.method,
                    accountRef: withdrawForm.accountRef,
                    bankName: withdrawForm.bankName,
                }),
            });
            const data = await response.json();
            if (!data?.ok) throw new Error(data?.error || 'No se pudo solicitar retiro');
            setStatusMessage(data.message || 'Retiro solicitado.');
            setWithdrawModalOpen(false);
            setWithdrawForm({ amount: '', method: 'nequi', accountRef: '', bankName: '' });
            await Promise.all([loadStoreOverview(), loadStoreLedger()]);
        } catch (error) {
            withError(error, 'Error solicitando retiro');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='containerGrid'>
            <Header />
            <section className='containerSection'>
                <HeaderDash />
                <div className='container walletPage'>
                    <header className='walletHero'>
                        <div>
                            <h1>Wallet</h1>
                            <p>{isStoreScope ? `Balance y retiros de tienda ${storeSlug || 'actual'}.` : 'Panel maestro de Ã³rdenes, retiros y ledger global.'}</p>
                        </div>
                    </header>

                    {statusMessage ? <p className='walletMsg'>{statusMessage}</p> : null}
                    {loading ? <p className='walletMsg'>Procesando...</p> : null}

                    {!isStoreScope ? (
                        <section className='walletStats'>
                            <article><span>Total ventas</span><strong>${currency(kpis.totalSales)}</strong></article>
                            <article><span>Pendiente por liberar</span><strong>${currency(kpis.pendingRelease)}</strong></article>
                            <article><span>Disponible por pagar</span><strong>${currency(kpis.availableToPay)}</strong></article>
                            <article>
                                <span>Tienda</span>
                                <select value={filters.storeId} onChange={(e) => setFilters((p) => ({ ...p, storeId: e.target.value }))}>
                                    <option value=''>Todas las tiendas</option>
                                    {stores.map((store) => <option key={store.id} value={store.id}>{store.name} ({store.slug})</option>)}
                                </select>
                            </article>
                        </section>
                    ) : (
                        <section className='walletStats'>
                            <article><span>Disponible</span><strong>${currency(storeOverview.available)}</strong></article>
                            <article><span>Pendiente</span><strong>${currency(storeOverview.pending)}</strong></article>
                            <article><span>En retiro</span><strong>${currency(storeOverview.inWithdrawal)}</strong></article>
                        </section>
                    )}

                    {isStoreScope ? (
                        <div className='walletActions'>
                            <button type='button' className='walletPayoutBtn' onClick={() => setWithdrawModalOpen(true)}>
                                Solicitar retiro
                            </button>
                        </div>
                    ) : null}

                    <div className='walletTabs'>
                        {(isStoreScope ? STORE_TABS : ADMIN_TABS).map((tab) => (
                            <button key={tab.key} type='button' className={`walletTabBtn ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {!isStoreScope && activeTab === 'orders' ? (
                        <section className='walletLedger'>
                            <div className='walletFilters'>
                                <select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}>
                                    <option value=''>Todos los estados</option>
                                    {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <label><input type='checkbox' checked={filters.noTracking} onChange={(e) => setFilters((p) => ({ ...p, noTracking: e.target.checked }))} /> Sin guÃ­a</label>
                                <input type='date' value={filters.dateFrom} onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))} />
                                <input type='date' value={filters.dateTo} onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))} />
                            </div>
                            <div className='walletTableWrap'>
                                <table>
                                    <thead>
                                        <tr><th>Pedido</th><th>Tienda</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Transportadora</th><th>GuÃ­a</th><th>Fecha</th><th>Acciones</th></tr>
                                    </thead>
                                    <tbody>
                                        {orders.length === 0 ? <tr><td colSpan='9'>Sin Ã³rdenes.</td></tr> : orders.map((row) => (
                                            <tr key={row.id}>
                                                <td>#{row.id}</td><td>{row.storeSlug || row.storeName}</td><td>{row.customerName}</td><td>${currency(row.total)}</td><td>{row.status}</td><td>{row.carrier || '-'}</td><td>{row.trackingNumber || '-'}</td><td>{row.createdAt}</td>
                                                <td>
                                                    <button type='button' onClick={() => openTrackingModal(row)}>Editar guÃ­a</button>
                                                    <button type='button' onClick={() => releaseOrder(row)}>Confirmar entrega y liberar saldo</button>
                                                    {row.trackingUrl ? <a href={row.trackingUrl} target='_blank' rel='noreferrer'>Ver seguimiento</a> : null}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    ) : null}

                    {!isStoreScope && activeTab === 'withdrawals' ? (
                        <section className='walletLedger'>
                            <div className='walletFilters'>
                                <select value={filters.withdrawalStatus} onChange={(e) => setFilters((p) => ({ ...p, withdrawalStatus: e.target.value }))}>
                                    {WITHDRAW_STATUSES.map((s) => <option key={s || 'all'} value={s}>{s || 'Todos'}</option>)}
                                </select>
                            </div>
                            <div className='walletTableWrap'>
                                <table>
                                    <thead><tr><th>ID</th><th>Tienda</th><th>Monto</th><th>MÃ©todo</th><th>Datos</th><th>Estado</th><th>Acciones</th></tr></thead>
                                    <tbody>
                                        {withdrawals.length === 0 ? <tr><td colSpan='7'>Sin solicitudes.</td></tr> : withdrawals.map((row) => (
                                            <tr key={row.id}>
                                                <td>{row.id}</td><td>{row.store_slug || row.store_name}</td><td>${currency(row.amount)}</td><td>{row.method}</td><td>{row.account_ref} {row.bank_name ? `(${row.bank_name})` : ''}</td><td>{row.status}</td>
                                                <td>
                                                    <button type='button' onClick={() => patchWithdrawalStatus(row.id, 'processing')}>Procesando</button>
                                                    <button type='button' onClick={() => patchWithdrawalStatus(row.id, 'paid')}>Pagado</button>
                                                    <button type='button' onClick={() => patchWithdrawalStatus(row.id, 'rejected')}>Rechazar</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    ) : null}

                    {!isStoreScope && activeTab === 'ledger' ? (
                        <section className='walletLedger'>
                            <div className='walletTableWrap'>
                                <table>
                                    <thead><tr><th>ID</th><th>Tienda</th><th>Tipo</th><th>Monto</th><th>Estado</th><th>Pedido</th><th>Retiro</th><th>Fecha</th></tr></thead>
                                    <tbody>
                                        {globalLedger.length === 0 ? <tr><td colSpan='8'>Sin transacciones.</td></tr> : globalLedger.map((row) => (
                                            <tr key={row.id}>
                                                <td>{row.id}</td><td>{row.store_slug || row.store_name}</td><td>{row.type}</td><td>${currency(row.amount)}</td><td>{row.status}</td><td>{row.order_id || '-'}</td><td>{row.withdrawal_id || '-'}</td><td>{row.created_at}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    ) : null}

                    {isStoreScope && activeTab === 'ledger' ? (
                        <section className='walletLedger'>
                            <p>Pagos en las prÃ³ximas 24 horas</p>
                            <div className='walletTableWrap'>
                                <table>
                                    <thead><tr><th>ID</th><th>Tipo</th><th>Monto</th><th>Estado</th><th>Pedido</th><th>Tracking</th><th>Fecha</th></tr></thead>
                                    <tbody>
                                        {storeLedger.length === 0 ? <tr><td colSpan='7'>Sin transacciones.</td></tr> : storeLedger.map((row) => (
                                            <tr key={row.id}>
                                                <td>{row.id}</td>
                                                <td>{row.type}</td>
                                                <td className={row.type === 'credit' ? 'walletAmountUp' : 'walletAmountDown'}>{row.type === 'credit' ? '+' : '-'}${currency(row.amount)}</td>
                                                <td>{row.status}</td>
                                                <td>{row.orderId || '-'}</td>
                                                <td>{row.trackingUrl ? <a href={row.trackingUrl} target='_blank' rel='noreferrer'>Ver seguimiento</a> : '-'}</td>
                                                <td>{row.createdAt}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    ) : null}
                </div>
            </section>

            {trackingModalOpen && trackingOrder ? (
                <div className='walletModalBackdrop'>
                    <div className='walletModal'>
                        <h3>Editar guÃ­a y estado (Pedido #{trackingOrder.id})</h3>
                        <label>Transportadora</label>
                        <input value={trackingForm.carrier} onChange={(e) => setTrackingForm((p) => ({ ...p, carrier: e.target.value }))} />
                        <label>GuÃ­a</label>
                        <input value={trackingForm.trackingNumber} onChange={(e) => setTrackingForm((p) => ({ ...p, trackingNumber: e.target.value }))} />
                        <label>Estado</label>
                        <select value={trackingForm.status} onChange={(e) => setTrackingForm((p) => ({ ...p, status: e.target.value }))}>
                            <option value=''>Sin cambio</option>
                            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <div className='walletModalActions'>
                            <button type='button' onClick={() => setTrackingModalOpen(false)}>Cancelar</button>
                            <button type='button' onClick={saveOrderTracking}>Guardar</button>
                        </div>
                    </div>
                </div>
            ) : null}

            {withdrawModalOpen ? (
                <div className='walletModalBackdrop'>
                    <div className='walletModal'>
                        <h3>Solicitar retiro</h3>
                        <label>Monto</label>
                        <input type='number' value={withdrawForm.amount} onChange={(e) => setWithdrawForm((p) => ({ ...p, amount: e.target.value }))} />
                        <label>MÃ©todo</label>
                        <select value={withdrawForm.method} onChange={(e) => setWithdrawForm((p) => ({ ...p, method: e.target.value }))}>
                            <option value='nequi'>Nequi</option>
                            <option value='bank'>Cuenta de ahorros</option>
                        </select>
                        <label>{withdrawForm.method === 'nequi' ? 'NÃºmero Nequi' : 'NÃºmero de cuenta'}</label>
                        <input value={withdrawForm.accountRef} onChange={(e) => setWithdrawForm((p) => ({ ...p, accountRef: e.target.value }))} />
                        {withdrawForm.method === 'bank' ? (
                            <>
                                <label>Banco (opcional)</label>
                                <input value={withdrawForm.bankName} onChange={(e) => setWithdrawForm((p) => ({ ...p, bankName: e.target.value }))} />
                            </>
                        ) : null}
                        <p>Pagos en las prÃ³ximas 24 horas</p>
                        <div className='walletModalActions'>
                            <button type='button' onClick={() => setWithdrawModalOpen(false)}>Cancelar</button>
                            <button type='button' onClick={submitWithdrawal}>Solicitar</button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}


