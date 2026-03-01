import React, { useEffect, useMemo, useState } from 'react';
import './NotificacionesPanel.css';
import { faBell, faTimes, faCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import baseURL from '../../url';
import { getTiendaSlug } from '../../../utils/tienda';

export default function NotificacionesPanel() {
    const [items, setItems] = useState([]);
    const [unread, setUnread] = useState(0);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const storeSlug = getTiendaSlug();
    const api = useMemo(() => String(baseURL || '').replace(/\/+$/, ''), []);

    const loadNotifications = async () => {
        if (!storeSlug) {
            setItems([]);
            setUnread(0);
            return;
        }
        try {
            setLoading(true);
            const [listRes, unreadRes] = await Promise.all([
                fetch(`${api}/api/store/notifications`, {
                    credentials: 'include',
                    headers: { 'X-Store-Slug': storeSlug },
                }),
                fetch(`${api}/api/store/notifications/unread-count`, {
                    credentials: 'include',
                    headers: { 'X-Store-Slug': storeSlug },
                }),
            ]);

            const listData = await listRes.json();
            const unreadData = await unreadRes.json();

            if (listData?.ok) {
                setItems(Array.isArray(listData.notifications) ? listData.notifications : []);
            }
            if (unreadData?.ok) {
                setUnread(Number(unreadData.unread || 0));
            }
        } catch (error) {
            console.error('Error cargando notificaciones', error);
        } finally {
            setLoading(false);
        }
    };

    const markRead = async (deliveryId, event) => {
        event.stopPropagation();
        try {
            await fetch(`${api}/api/store/notifications/${deliveryId}/read`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'X-Store-Slug': storeSlug },
            });
            loadNotifications();
        } catch (error) {
            console.error('Error marcando leida', error);
        }
    };

    useEffect(() => {
        loadNotifications();
        const timer = setInterval(loadNotifications, 25000);
        return () => clearInterval(timer);
    }, [storeSlug]);

    return (
        <div className="notificacionesPanel">
            <button className="notificacionesBell" onClick={() => setOpen(!open)}>
                <FontAwesomeIcon icon={faBell} />
                {unread > 0 ? <span className="notificacionesBadge">{unread > 9 ? '9+' : unread}</span> : null}
            </button>

            {open ? (
                <div className="notificacionesDropdown">
                    <div className="notificacionesHeader">
                        <h3>Notificaciones</h3>
                        <button className="closeBtn" onClick={() => setOpen(false)}>
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>

                    {loading ? <div className="notificacionesLoading">Cargando...</div> : null}

                    {!loading && items.length === 0 ? (
                        <div className="notificacionesEmpty"><p>Sin notificaciones</p></div>
                    ) : null}

                    {!loading && items.length > 0 ? (
                        <div className="notificacionesList">
                            {items.slice(0, 20).map((notif) => (
                                <div key={notif.deliveryId} className={`notificacionItem ${notif.readAt ? 'leida' : 'noLeida'}`}>
                                    <div className="notificacionContent">
                                        <div className="notificacionTitulo">{notif.title}</div>
                                        <div className="notificacionMensaje">{notif.body}</div>
                                        <div className="notificacionTipo">{notif.type}</div>
                                    </div>
                                    <div className="notificacionAcciones">
                                        {!notif.readAt ? (
                                            <button className="accionBtn" onClick={(e) => markRead(notif.deliveryId, e)} title="Marcar leída">
                                                <FontAwesomeIcon icon={faCheck} />
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : null}

                    <div className="notificacionesFooter">
                        <button className="refrescarBtn" onClick={loadNotifications}>Refrescar</button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
