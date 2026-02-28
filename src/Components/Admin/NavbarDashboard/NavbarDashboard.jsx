import React from 'react'
import './NavbarDashboard.css'
import { Link as Anchor, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome,
  faUser,
  faBook,
  faImage,
  faAddressBook,
  faTachometerAlt,
  faCode,
  faClipboardList,
  faBell,
  faUsers,
  faRobot,
  faComments,
  faStore,
  faGlobe,
  faEye,
  faWallet,
  faTruck,
  faCalendarAlt,
  faVideo,
  faCog,
} from '@fortawesome/free-solid-svg-icons';
import logo from '../../../images/logo.png'
import Logout from '../Logout/Logout';

const SECTIONS = [
  {
    label: 'PRINCIPAL',
    items: [
      { to: '/dashboard',              icon: faHome,         text: 'Inicio' },
      { to: '/dashboard/pedidos',      icon: faClipboardList, text: 'Pedidos' },
      { to: '/dashboard/productos',    icon: faBook,         text: 'Productos' },
      { to: '/dashboard/clientes',     icon: faUsers,        text: 'Clientes' },
      { to: '/dashboard/tiendas',      icon: faStore,        text: 'Tiendas' },
    ],
  },
  {
    label: 'CATALOGO',
    items: [
      { to: '/dashboard/categorias',   icon: faTachometerAlt, text: 'Categorias' },
      { to: '/dashboard/sub-banners',  icon: faImage,        text: 'Sub-Banners' },
      { to: '/dashboard/codigos',      icon: faCode,         text: 'Codigos' },
      { to: '/dashboard/contacto',     icon: faAddressBook,  text: 'Contacto' },
    ],
  },
  {
    label: 'MARKETING',
    items: [
      { to: '/dashboard/imagenes-ia',  icon: faRobot,        text: 'Imagenes IA' },
      { to: '/dashboard/landing-pages',icon: faGlobe,        text: 'Landing Pages' },
      { to: '/dashboard/whatsapp-bot', icon: faComments,     text: 'WhatsApp Bot' },
    ],
  },
  {
    label: 'OPERACION',
    items: [
      { to: '/dashboard/notificaciones',    icon: faBell,          text: 'Notificaciones' },
      { to: '/dashboard/monitor',           icon: faEye,           text: 'Monitor-Global-AI' },
      { to: '/dashboard/wallet',            icon: faWallet,        text: 'Wallet' },
      { to: '/dashboard/dropshipping',      icon: faTruck,         text: 'Dropshipping' },
      { to: '/dashboard/calendario',        icon: faCalendarAlt,   text: 'Calendario Tributario' },
    ],
  },
  {
    label: 'SISTEMA',
    items: [
      { to: '/dashboard/usuarios',     icon: faUser,         text: 'Usuarios' },
      { to: '/dashboard/tutoriales',   icon: faVideo,        text: 'Tutoriales' },
      { to: '/dashboard/ajustes',      icon: faCog,          text: 'Ajustes' },
    ],
  },
];

export default function Navbar({ isOpen = false, onClose }) {
    const location = useLocation();
    const handleClose = () => {
        if (typeof onClose === 'function') {
            onClose();
        }
    };

    return (
        <div className={`navbarDashboard ${isOpen ? 'navbarDashboardOpen' : 'navbarDashboardClosed'}`}>
            <Anchor className='logo'>
                <img src={logo} alt="logo" />
            </Anchor>
            <div className='links'>
                {SECTIONS.map(section => (
                    <React.Fragment key={section.label}>
                        <div className="nav-section-label">{section.label}</div>
                        {section.items.map(item => (
                            <Anchor
                                key={item.to}
                                onClick={handleClose}
                                to={item.to}
                                className={location.pathname === item.to ? 'activeLink' : ''}
                            >
                                <FontAwesomeIcon icon={item.icon} /> {item.text}
                            </Anchor>
                        ))}
                    </React.Fragment>
                ))}
            </div>
            <Logout />
        </div>
    );
}
