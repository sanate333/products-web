import IndexLayout from '../Layouts/IndexLayout';
import MainLayout from '../Layouts/MainLayout';
import PagesLayaut from '../Layouts/PagesLayaut';
import StoreDashboardLayout, { StoreDashboardRedirect } from '../Layouts/StoreDashboardLayout';
import { Navigate, createBrowserRouter } from 'react-router-dom';

import Productos from '../Pages/Productos/Productos';
import Usuarios from '../Pages/Usuarios/Usuarios';
import Banners from './Banners/Banners';
import SubBanners from './SubBanners/SubBanners';
import Main from './Main/Main';
import Contacto from './Contacto/Contacto';
import Categorias from './Categorias/Categorias';
import Codigos from './Codigos/Codigos';
import Pedidos from './Pedidos/Pedidos';
import Notificaciones from './Notificaciones/Notificaciones';
import Clientes from './Clientes/Clientes';
import ImagenesIA from './ImagenesIA/ImagenesIA';
import PageDetail from '../Pages/PageDetail/PageDetail';

import WhatsAppBot from './WhatsAppBot/WhatsAppBot';
import Tiendas from './Tiendas/Tiendas';
import Ajustes from './Ajustes/Ajustes';
import AjustesLogo from './AjustesLogo/AjustesLogo';
import OfertasCarrito from './OfertasCarrito/OfertasCarrito';
import LandingPages from './LandingPages/LandingPages';
import Tutoriales from './Tutoriales/Tutoriales';
import Wallet from './Wallet/Wallet';
import Dropshipping from './Dropshipping/Dropshipping';
import CalendarioTributario from './CalendarioTributario/CalendarioTributario';
import MonitorGlobalAI from './MonitorGlobalAI/MonitorGlobalAI';
import OasisChat from './OasisChat/OasisChat';
import Co from './Co/Co';
import CoRegistrationsAdmin from './CoRegistrationsAdmin/CoRegistrationsAdmin';

const dashboardChildren = [
    { path: '', element:  },
    { path: 'inicio', element:  },
    { path: 'productos', element:  },
    { path: 'usuarios', element:  },
    { path: 'banners', element:  },
    { path: 'sub-banners', element:  },
    { path: 'contacto', element:  },
    { path: 'categorias', element:  },
    { path: 'codigos', element:  },
    { path: 'pedidos', element:  },
    { path: 'notificaciones', element:  },
    { path: 'imagenes-ia', element:  },
    { path: 'clientes', element:  },
    { path: 'clientes/co-registrations', element:  },
    { path: 'clientes/co-registros', element:  },
    { path: 'tiendas', element:  },
    { path: 'ofertas-carrito', element:  },
    { path: 'landing-pages', element:  },
    { path: 'pedidos/landing-pages', element:  },
    { path: 'whatsapp-bot', element:  },
    { path: 'whastapp-bot', element:  },
    { path: 'whatsapp', element:  },
    { path: 'monitor-global-ai', element:  },
    { path: 'monitor', element:  },
    { path: 'oasis-chat', element:  },
    { path: 'chat-ia', element:  },
    { path: 'wallet', element:  },
    { path: 'dropshipping', element:  },
    { path: 'calendario-tributario', element:  },
    { path: 'calendario', element:  },
    { path: 'tutoriales', element:  },
    { path: 'ajustes', element:  },
    { path: 'ajustes/logo', element:  },
];

const storeDashboardChildren = [
    { path: '', element:  },
    { path: 'inicio', element:  },
    { path: 'pedidos', element:  },
    { path: 'productos', element:  },
    { path: 'clientes', element:  },
    { path: 'categorias', element:  },
    { path: 'sub-banners', element:  },
    { path: 'codigos', element:  },
    { path: 'contacto', element:  },
    { path: 'notificaciones', element:  },
    { path: 'monitor-global-ai', element:  },
    { path: 'monitor', element:  },
    { path: 'ofertas-carrito', element:  },
    { path: 'wallet', element:  },
    { path: 'dropshipping', element:  },
    { path: 'calendario-tributario', element:  },
    { path: 'calendario', element:  },
    { path: 'usuarios', element:  },
    { path: 'tutoriales', element:  },
    { path: 'ajustes', element:  },
    { path: 'ajustes/logo', element:  },
];

export const router = createBrowserRouter([
    {
        path: '/monitor-global-ai',
        element: ,
    },
    {
        path: '/co',
        element: ,
    },
    {
        path: '/nube',
        element: ,
    },
    // ─── DASHBOARD (antes de /:storeSlug para evitar conflicto) ───
    {
        path: '/dashboard',
        element: ,
        children: dashboardChildren,
    },
    {
        path: '/dashboard/s/:storeSlug',
        element: ,
        children: [
            {
                path: '',
                element: ,
                children: storeDashboardChildren,
            },
        ],
    },
    {
        path: '/dashboard/:storeSlug/*',
        element: ,
    },
    // ─── PUBLIC ROUTES ───
    {
        path: '/',
        element: ,
    },
    {
        path: '/catalogo',
        element: ,
    },
    {
        path: '/catolog',
        element: ,
    },
    {
        path: '/',
        element: ,
        children: [
            { path: 'producto/:productoSlug', element:  },
            { path: 'producto/:idProducto/:producto', element:  },
        ],
    },
    // ─── STORE SLUG ROUTES (catch-all dinámico, debe ir al final) ───
    {
        path: '/:storeSlug',
        element: ,
    },
    {
        path: '/:storeSlug/catalogo',
        element: ,
    },
    {
        path: '/:storeSlug/catolog',
        element: ,
    },
    {
        path: '/:storeSlug',
        element: ,
        children: [
            { path: 'producto/:productoSlug', element:  },
            { path: 'producto/:idProducto/:producto', element:  },
        ],
    },
]);
