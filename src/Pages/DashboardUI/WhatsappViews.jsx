import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { buildDashboardPath, getTiendaSlug } from '../../utils/tienda';
import MockPage from './MockPage';
import './WhatsappUI.css';

const WHATSAPP_MENU = [
    { label: 'Panel de control', segment: 'panel' },
    { label: 'Contactos', segment: 'contactos' },
    { label: 'Campañas', segment: 'campanas' },
    { label: 'Transmisión', segment: 'transmision' },
    { label: 'Chat', segment: 'chat' },
    { label: 'Plantillas', segment: 'plantillas' },
    { label: 'Automatización', segment: 'automatizacion' },
    { label: 'Flujos de conversación', segment: 'flujos' },
    { label: 'Configuraciones', segment: 'configuraciones' },
];

const getActiveWhatsappSegment = (pathname) => {
    const match = pathname.match(/\/whatsapp-ia(?:\/([^/]+))?/);
    return match?.[1] || 'panel';
};

export function WhatsappLayout() {
    const location = useLocation();
    const tiendaSlug = getTiendaSlug();
    const activeSegment = getActiveWhatsappSegment(location.pathname);

    return (
        <section className="whatsapp-layout">
            <aside className="oasis-card whatsapp-submenu">
                <h3>WhatsApp IA</h3>
                <div className="whatsapp-submenu-links">
                    {WHATSAPP_MENU.map((item) => (
                        <Link
                            key={item.segment}
                            to={buildDashboardPath(tiendaSlug, `/dashboard/whatsapp-ia/${item.segment}`)}
                            className={`whatsapp-submenu-link ${
                                activeSegment === item.segment ? 'whatsapp-submenu-link-active' : ''
                            }`}
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
            </aside>

            <div className="whatsapp-content">
                <Outlet />
            </div>
        </section>
    );
}

export function WhatsappSimplePage({ title, subtitle }) {
    return <MockPage title={title} subtitle={subtitle} chips={['WhatsApp IA', 'Vista mock']} />;
}

export function WhatsappFlowsPage() {
    return (
        <section className="whatsapp-flows-page">
            <header className="oasis-card whatsapp-flows-head">
                <div>
                    <h2>FLUJO BIENVENIDA</h2>
                    <p>Todos los cambios se guardan automáticamente</p>
                </div>
                <div className="whatsapp-flows-actions">
                    <button type="button" className="flow-btn flow-btn-soft">
                        Modo de edición
                    </button>
                    <button type="button" className="flow-btn flow-btn-primary">
                        Compartir flujo
                    </button>
                </div>
            </header>

            <div className="whatsapp-flows-grid">
                <div className="oasis-card flow-canvas">
                    <div className="flow-block flow-block-success">Bloque inicial</div>
                    <span className="flow-arrow">{'->'}</span>
                    <div className="flow-block">Contenido de bienvenida</div>
                    <span className="flow-arrow">{'->'}</span>
                    <div className="flow-block">Menú de opciones</div>
                </div>

                <aside className="oasis-card flow-preview">
                    <h3>Visualización</h3>
                    <div className="flow-chat-preview">
                        <div className="flow-bubble flow-bubble-received">Hola, te damos la bienvenida a Oasis IA.</div>
                        <div className="flow-bubble flow-bubble-sent">Quiero ver opciones</div>
                        <div className="flow-bubble flow-bubble-received">Perfecto, te comparto el menú principal.</div>
                    </div>
                </aside>
            </div>
        </section>
    );
}

const SETTINGS_ITEMS = [
    'Conexión',
    'Campos',
    'Etiquetas',
    'Respuestas rápidas',
    'Miembros del equipo',
    'Horario de oficina',
    'Flujos predeterminados',
    'Compañía',
    'Registros',
    'Facturación',
];

export function WhatsappSettingsPage() {
    return (
        <section className="whatsapp-settings-page">
            <h2>Configuraciones</h2>
            <div className="whatsapp-settings-grid">
                <aside className="oasis-card settings-nav">
                    {SETTINGS_ITEMS.map((item) => (
                        <button
                            key={item}
                            type="button"
                            className={`settings-nav-item ${item === 'Conexión' ? 'settings-nav-item-active' : ''}`}
                        >
                            {item}
                        </button>
                    ))}
                </aside>

                <div className="settings-content">
                    <article className="oasis-card settings-connection-card">
                        <div className="settings-connection-head">
                            <div>
                                <h3>La automatización está funcionando</h3>
                                <p>
                                    Estado: <span>Conectado</span>
                                </p>
                            </div>
                            <button type="button">Desconectar</button>
                        </div>
                    </article>

                    <article className="oasis-card settings-qr-card">
                        <h3>Conectar con QR en la nube</h3>
                        <div className="settings-qr-placeholder">
                            <span>QR</span>
                        </div>
                        <button type="button">Generar QR</button>
                        <p>Escanea este QR desde WhatsApp para conectar</p>
                    </article>
                </div>
            </div>
        </section>
    );
}

