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

import WhatsappIA, {
    WhatsappRedirect,
    WhatsappPanel,
    WhatsappSimple,
    WhatsappChat,
    WhatsappTemplates,
    WhatsappAutomation,
    WhatsappFlows,
    WhatsappConfig,
    WhatsappOpenAI,
    WhatsappSchedules,
    WhatsappTags,
    WhatsappFacebook,
    WhatsappInstagram,
} from './WhatsappIA/WhatsappIA';
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
import Co from './Co/Co';
import CoRegistrationsAdmin from './CoRegistrationsAdmin/CoRegistrationsAdmin';

const dashboardChildren = [
    { path: '', element: <Main /> },
    { path: 'inicio', element: <Main /> },
    { path: 'productos', element: <Productos /> },
    { path: 'usuarios', element: <Usuarios /> },
    { path: 'banners', element: <Banners /> },
    { path: 'sub-banners', element: <SubBanners /> },
    { path: 'contacto', element: <Contacto /> },
    { path: 'categorias', element: <Categorias /> },
    { path: 'codigos', element: <Codigos /> },
    { path: 'pedidos', element: <Pedidos /> },
    { path: 'notificaciones', element: <Notificaciones /> },
    { path: 'imagenes-ia', element: <ImagenesIA /> },
    { path: 'clientes', element: <Clientes /> },
    { path: 'clientes/co-registrations', element: <CoRegistrationsAdmin /> },
    { path: 'clientes/co-registros', element: <CoRegistrationsAdmin /> },
    { path: 'tiendas', element: <Tiendas /> },
    { path: 'ofertas-carrito', element: <OfertasCarrito /> },
    { path: 'landing-pages', element: <LandingPages /> },
    { path: 'pedidos/landing-pages', element: <LandingPages /> },
    { path: 'monitor-global-ai', element: <MonitorGlobalAI /> },
    { path: 'monitor', element: <MonitorGlobalAI /> },
    { path: 'wallet', element: <Wallet /> },
    { path: 'dropshipping', element: <Dropshipping /> },
    { path: 'calendario-tributario', element: <CalendarioTributario /> },
    { path: 'calendario', element: <CalendarioTributario /> },
    { path: 'tutoriales', element: <Tutoriales /> },
    { path: 'ajustes', element: <Ajustes /> },
    { path: 'ajustes/logo', element: <AjustesLogo /> },
];

const storeDashboardChildren = [
    { path: '', element: <Main /> },
    { path: 'inicio', element: <Main /> },
    { path: 'pedidos', element: <Pedidos /> },
    { path: 'productos', element: <Productos /> },
    { path: 'clientes', element: <Clientes /> },
    { path: 'categorias', element: <Categorias /> },
    { path: 'sub-banners', element: <SubBanners /> },
    { path: 'codigos', element: <Codigos /> },
    { path: 'contacto', element: <Contacto /> },
    { path: 'notificaciones', element: <Notificaciones /> },
    { path: 'monitor-global-ai', element: <MonitorGlobalAI /> },
    { path: 'monitor', element: <MonitorGlobalAI /> },
    { path: 'ofertas-carrito', element: <OfertasCarrito /> },
    { path: 'wallet', element: <Wallet /> },
    { path: 'dropshipping', element: <Dropshipping /> },
    { path: 'calendario-tributario', element: <CalendarioTributario /> },
    { path: 'calendario', element: <CalendarioTributario /> },
    { path: 'usuarios', element: <Usuarios /> },
    { path: 'tutoriales', element: <Tutoriales /> },
    { path: 'ajustes', element: <Ajustes /> },
    { path: 'ajustes/logo', element: <AjustesLogo /> },
];

const whatsappChildren = [
    { index: true, element: <WhatsappRedirect /> },
    { path: 'panel', element: <WhatsappPanel /> },
    { path: 'contactos', element: <WhatsappSimple title="Panel de Contactos" subtitle="Vista general de conversaciones y rendimiento" /> },
    { path: 'campanas', element: <WhatsappSimple title="Panel de Campanas" subtitle="Vista general de conversaciones y rendimiento" /> },
    { path: 'transmision', element: <WhatsappSimple title="Panel de Transmision" subtitle="Vista general de conversaciones y rendimiento" /> },
    { path: 'chat', element: <WhatsappChat /> },
    { path: 'inbox', element: <WhatsappChat /> },
    { path: 'plantillas', element: <WhatsappTemplates /> },
    { path: 'automatizacion', element: <WhatsappAutomation /> },
    { path: 'flows', element: <WhatsappFlows /> },
    { path: 'flujos', element: <WhatsappFlows /> },
    { path: 'configuraciones', element: <WhatsappConfig /> },
    { path: 'openai', element: <WhatsappOpenAI /> },
    { path: 'schedules', element: <WhatsappSchedules /> },
    { path: 'tags', element: <WhatsappTags /> },
    { path: 'facebook', element: <WhatsappFacebook /> },
    { path: 'instagram', element: <WhatsappInstagram /> },
];

export const router = createBrowserRouter([
    {
        path: '/monitor-global-ai',
        element: <MonitorGlobalAI standalone />,
    },
    {
        path: '/co',
        element: <Co />,
    },
    {
        path: '/nube',
        element: <Navigate to='/co' replace />,
    },
    {
        path: '/',
        element: <IndexLayout />,
    },
    {
        path: '/catalogo',
        element: <IndexLayout pageMode="catalogo" />,
    },
    {
        path: '/catolog',
        element: <IndexLayout pageMode="catalogo" />,
    },
    {
        path: '/:storeSlug',
        element: <IndexLayout />,
    },
    {
        path: '/:storeSlug/catalogo',
        element: <IndexLayout pageMode="catalogo" />,
    },
    {
        path: '/:storeSlug/catolog',
        element: <IndexLayout pageMode="catalogo" />,
    },
    {
        path: '/',
        element: <PagesLayaut />,
        children: [
            { path: 'producto/:productoSlug', element: <PageDetail /> },
            { path: 'producto/:idProducto/:producto', element: <PageDetail /> },
        ],
    },
    {
        path: '/:storeSlug',
        element: <PagesLayaut />,
        children: [
            { path: 'producto/:productoSlug', element: <PageDetail /> },
            { path: 'producto/:idProducto/:producto', element: <PageDetail /> },
        ],
    },
    // WhatsApp Bot — layout propio con menú lateral estilo TiqueChat
    {
        path: '/dashboard/whatsapp-bot',
        element: <Navigate to="/dashboard/whatsapp-bot/chat" replace />,
    },
    {
        path: '/dashboard/whastapp-bot',
        element: <Navigate to="/dashboard/whatsapp-bot/chat" replace />,
    },
    {
        path: '/dashboard/whatsapp',
        element: <Navigate to="/dashboard/whatsapp-bot/chat" replace />,
    },
    {
        path: '/dashboard/whatsapp-bot/*',
        element: <WhatsappIA />,
        children: whatsappChildren,
    },
    {
        path: '/dashboard',
        element: <MainLayout />,
        children: dashboardChildren,
    },
    {
        path: '/dashboard/s/:storeSlug',
        element: <StoreDashboardLayout />,
        children: [
            {
                path: '',
                element: <MainLayout />,
                children: storeDashboardChildren,
            },
        ],
    },
    {
        path: '/dashboard/:storeSlug/*',
        element: <StoreDashboardRedirect />,
    },
]);
