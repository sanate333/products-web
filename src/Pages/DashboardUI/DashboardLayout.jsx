import React, { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBars,
    faChartLine,
    faClipboardList,
    faComments,
    faFileCode,
    faGear,
    faImage,    faLayerGroup,
    faList,
    faRectangleList,
    faShop,
    faTags,
    faUsers,
    faUserGroup,
    faBoxOpen,
    faGraduationCap,
} from '@fortawesome/free-solid-svg-icons';
import { buildDashboardPath, getTiendaSlug } from '../../utils/tienda';
import './DashboardLayout.css';

const MAIN_MENU = [
    { label: 'Inicio', segment: '', icon: faChartLine },
    { label: 'Pedidos', segment: 'pedidos', icon: faClipboardList },
    { label: 'Imágenes IA', segment: 'imagenes-ia', icon: faImage },
    { label: 'Landing Pages', segment: 'landing-pages', icon: faRectangleList },
    { label: 'WhatsApp IA', segment: 'whatsapp-ia', icon: faComments },
    { label: 'Clientes', segment: 'clientes', icon: faUserGroup },
    { label: 'Productos', segment: 'productos', icon: faBoxOpen },
    { label: 'Tiendas', segment: 'tiendas', icon: faShop },
    { label: 'Categorías', segment: 'categorias', icon: faTags },
    { label: 'Sub-Banners', segment: 'sub-banners', icon: faLayerGroup },
    { label: 'Contacto', segment: 'contacto', icon: faList },
    { label: 'Usuarios', segment: 'usuarios', icon: faUsers },
    { label: 'Códigos', segment: 'codigos', icon: faFileCode },
    { label: 'Tutoriales', segment: 'tutoriales', icon: faGraduationCap },
    { label: 'Ajustes', segment: 'ajustes', icon: faGear },
];

const getDashboardSubpath = (pathname) => {
    const match = pathname.match(/^\/dashboard(?:\/[^/]+)?(\/.*)?$/);
    return match?.[1] || '/';
};

const isActiveSegment = (subpath, segment) => {
    if (!segment) {
        return subpath === '/' || subpath === '';
    }
    return subpath === `/${segment}` || subpath.startsWith(`/${segment}/`);
};

export default function DashboardLayout() {
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    const tiendaSlug = getTiendaSlug();
    const subpath = getDashboardSubpath(location.pathname);

    const currentSection = useMemo(
        () => MAIN_MENU.find((item) => isActiveSegment(subpath, item.segment)) || MAIN_MENU[0],
        [subpath]
    );

    return (
        <div className="oasis-shell">
            <button
                type="button"
                aria-label="Cerrar menú"
                className={`oasis-sidebar-overlay ${mobileOpen ? 'oasis-sidebar-overlay-visible' : ''}`}
                onClick={() => setMobileOpen(false)}
            />

            <aside className={`oasis-sidebar ${mobileOpen ? 'oasis-sidebar-open' : ''}`}>
                <div className="oasis-brand">
                    <span className="oasis-brand-dot" />
                    <div>
                        <h2>Oasis IA</h2>
                        <p>Dashboard</p>
                    </div>
                </div>

                <nav className="oasis-main-menu">
                    {MAIN_MENU.map((item) => {
                        const fullPath = item.segment
                            ? `/dashboard/${item.segment}`
                            : '/dashboard';
                        return (
                            <Link
                                key={item.label}
                                to={buildDashboardPath(tiendaSlug, fullPath)}
                                className={`oasis-main-menu-link ${
                                    isActiveSegment(subpath, item.segment)
                                        ? 'oasis-main-menu-link-active'
                                        : ''
                                }`}
                            >
                                <FontAwesomeIcon icon={item.icon} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            <div className="oasis-main-area">
                <header className="oasis-topbar">
                    <button
                        type="button"
                        className="oasis-mobile-menu-button"
                        onClick={() => setMobileOpen(true)}
                        aria-label="Abrir menú"
                    >
                        <FontAwesomeIcon icon={faBars} />
                    </button>

                    <div>
                        <h1>{currentSection.label}</h1>
                        <p>Panel visual profesional de Oasis IA</p>
                    </div>
                </header>

                <main className="oasis-main-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

