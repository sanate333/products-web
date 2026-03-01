import IndexLayout from '../Layouts/IndexLayout';
import MainLayout from '../Layouts/MainLayout';
import PagesLayaut from '../Layouts/PagesLayaut';
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
import WhatsAppBot from './WhatsAppBot/WhatsAppBot';
import ImagenesIA from './ImagenesIA/ImagenesIA';
import Tiendas from './Tiendas/Tiendas';
import Ajustes from './Ajustes/Ajustes';
import AjustesLogo from './AjustesLogo/AjustesLogo';
import OfertasCarrito from './OfertasCarrito/OfertasCarrito';
import PageDetail from '../Pages/PageDetail/PageDetail';
import LandingPages from './LandingPages/LandingPages';
import Tutoriales from './Tutoriales/Tutoriales';
import Wallet from './Wallet/Wallet';
import Dropshipping from './Dropshipping/Dropshipping';
import CalendarioTributario from './CalendarioTributario/CalendarioTributario';
import WhatsappIA, {
    WhatsappAutomation,
    WhatsappChat,
    WhatsappConfig,
    WhatsappFacebook,
    WhatsappFlows,
    WhatsappInstagram,
    WhatsappOpenAI,
    WhatsappPanel,
    WhatsappRedirect,
    WhatsappSchedules,
    WhatsappSimple,
    WhatsappTags,
    WhatsappTemplates,
} from './WhatsappIA/WhatsappIA';
import StoreDashboardLayout, { StoreDashboardRedirect } from '../Layouts/StoreDashboardLayout';
import Co from './Co/Co';
import CoRegistrationsAdmin from './CoRegistrationsAdmin/CoRegistrationsAdmin';
import MonitorGlobalAI from './MonitorGlobalAI/MonitorGlobalAI';

const whatsappChildren = [
    { index: true, element: <WhatsappRedirect /> },
    { path: 'panel', element: <WhatsappPanel /> },
    { path: 'contactos', element: <WhatsappSimple title="Panel de Contactos" subtitle="Vista general de conversaciones y rendimiento" /> },
    { path: 'campanas', element: <WhatsappSimple title="Panel de Campanas" subtitle="Vista general de conversaciones y rendimiento" /> },
    { path: 'transmision', element: <WhatsappSimple title="Panel de Transmision" subtitle="Vista general de conversaciones y rendimiento" /> },
    { path: 'chat', element: <WhatsappChat /> },
    { path: 'plantillas', element: <WhatsappTemplates /> },
    { path: 'inbox', element: <WhatsappChat /> },
    { path: 'automatizacion', element: <WhatsappAutomation /> },
    { path: 'facebook', element: <WhatsappFacebook /> },
    { path: 'instagram', element: <WhatsappInstagram /> },
    { path: 'flujos', element: <WhatsappRedirect to="../flows" /> },
    { path: 'flows', element: <WhatsappFlows /> },
    { path: 'flows/:flowId', element: <WhatsappFlows /> },
    { path: 'configuraciones', element: <WhatsappConfig /> },
    { path: 'etiquetas', element: <WhatsappTags /> },
    { path: 'open-ai', element: <WhatsappOpenAI /> },
    { path: 'agendar-mensaje', element: <WhatsappSchedules /> },
];

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
    { path: 'monitor-global-ai', element: <MonitorGlobalAI /> },
    { path: 'landing-pages', element: <LandingPages /> },
    { path: 'pedidos/landing-pages', element: <LandingPages /> },
    { path: 'whatsapp-bot', element: <WhatsAppBot /> },
    { path: 'whatsapp-ia', element: <WhatsappIA />, children: whatsappChildren },
    { path: 'pedidos/whatsapp-ia', element: <WhatsappIA />, children: whatsappChildren },
    { path: 'clientes', element: <Clientes /> },
    { path: 'clientes/co-registrations', element: <CoRegistrationsAdmin /> },
    { path: 'clientes/co-registros', element: <CoRegistrationsAdmin /> },
    { path: 'ofertas-carrito', element: <OfertasCarrito /> },
    { path: 'wallet', element: <Wallet /> },
    { path: 'dropshipping', element: <Dropshipping /> },
    { path: 'calendario-tributario', element: <CalendarioTributario /> },
    { path: 'tiendas', element: <Tiendas /> },
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
    { path: 'ofertas-carrito', element: <OfertasCarrito /> },
    { path: 'wallet', element: <Wallet /> },
    { path: 'dropshipping', element: <Dropshipping /> },
    { path: 'calendario-tributario', element: <CalendarioTributario /> },
    { path: 'usuarios', element: <Usuarios /> },
    { path: 'tutoriales', element: <Tutoriales /> },
    { path: 'ajustes', element: <Ajustes /> },
    { path: 'ajustes/logo', element: <AjustesLogo /> },
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
            {
                path: 'producto/:productoSlug',
                element: <PageDetail />,
            },
            {
                path: 'producto/:idProducto/:producto',
                element: <PageDetail />,
            },
        ],
    },
    {
        path: '/:storeSlug',
        element: <PagesLayaut />,
        children: [
            {
                path: 'producto/:productoSlug',
                element: <PageDetail />,
            },
            {
                path: 'producto/:idProducto/:producto',
                element: <PageDetail />,
            },
        ],
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
