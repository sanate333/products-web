import IndexLayout from "../Layouts/IndexLayout";
import MainLayout from "../Layouts/MainLayout";
import PagesLayaut from '../Layouts/PagesLayaut'
import { createBrowserRouter } from "react-router-dom";
import Productos from '../Pages/Productos/Productos'
import Usuarios from '../Pages/Usuarios/Usuarios'
import Banners from "./Banners/Banners";
import SubBanners from "./SubBanners/SubBanners";
import Main from "./Main/Main";
import Contacto from "./Contacto/Contacto";
import Categorias from "./Categorias/Categorias";
import Codigos from "./Codigos/Codigos";
import Pedidos from "./Pedidos/Pedidos";
import Notificaciones from "./Notificaciones/Notificaciones";
import Clientes from "./Clientes/Clientes";
import ImagenesIA from "./ImagenesIA/ImagenesIA";
import WhatsAppBot from "./WhatsAppBot/WhatsAppBot";
import PageDetail from '../Pages/PageDetail/PageDetail';
export const router = createBrowserRouter([

    {
        path: "/",
        element: <IndexLayout />,

    },
    {
        path: "/",
        element: <PagesLayaut />,
        children: [
            {
                path: `/producto/:idProducto/:producto`,
                element: <PageDetail />,
            },

        ]
    },

    {
        path: "/",
        element: <MainLayout />,
        children: [
            {
                path: `/dashboard`,
                element: <Main />,
            },
            {
                path: `/dashboard/productos`,
                element: <Productos />,
            },
            {
                path: `/dashboard/usuarios`,
                element: <Usuarios />,
            },
            {
                path: `/dashboard/banners`,
                element: <Banners />,
            },
            {
                path: `/dashboard/sub-banners`,
                element: <SubBanners />,
            },
            {
                path: `/dashboard/contacto`,
                element: <Contacto />,
            },
            {
                path: `/dashboard/categorias`,
                element: <Categorias />,
            },
            {
                path: `/dashboard/codigos`,
                element: <Codigos />,
            },
            {
                path: `/dashboard/pedidos`,
                element: <Pedidos />,
            },
            {
                path: `/dashboard/notificaciones`,
                element: <Notificaciones />,
            },
            {
                path: `/dashboard/imagenes-ia`,
                element: <ImagenesIA />,
            },
            {
                path: `/dashboard/clientes`,
                element: <Clientes />,
            },
            {
                path: `/dashboard/whatsapp-bot`,
                element: <WhatsAppBot />,
            },
        ],
    },


]);
