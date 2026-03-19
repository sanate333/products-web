// v3 – Oasis IA Chat sidebar fix
import React from 'react'
import './NavbarDashboard.css'
import { Link as Anchor, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome, faUser, faBoxOpen, faImages, faAddressBook,
  faTags, faTag, faClipboardList, faBell, faUsers,
  faMagic, faComments, faStore, faGlobe, faBrain,
  faWallet, faTruck, faCalendarAlt, faPlayCircle,
  faSlidersH, faUserShield, faEnvelope, faRobot,
} from '@fortawesome/free-solid-svg-icons';
import logo from '../../../images/logo.png'
import Logout from '../Logout/Logout';

const SECTIONS = [
  {
    label: 'TIENDA',
    items: [
      { to: '/dashboard', icon: faHome, text: 'Inicio' },
      { to: '/dashboard/pedidos', icon: faClipboardList, text: 'Pedidos' },
      { to: '/dashboard/productos', icon: faBoxOpen, text: 'Productos' },
      { to: '/dashboard/clientes', icon: faUsers, text: 'Clientes' },
      { to: '/dashboard/tiendas', icon: faStore, text: 'Tiendas' },
    ],
  },
  {
    label: 'CATÁLOGO',
    items: [
      { to: '/dashboard/categorias', icon: faTags, text: 'Categorías' },
      { to: '/dashboard/sub-banners', icon: faImages, text: 'Sub-Banners' },
      { to: '/dashboard/codigos', icon: faTag, text: 'Códigos' },
      { to: '/dashboard/contacto', icon: faEnvelope, text: 'Contacto' },
    ],
  },
  {
    label: 'MARKETING',
    items: [
      { to: '/dashboard/imagenes-ia', icon: faMagic, text: 'Imágenes IA' },
      { to: '/dashboard/landing-pages', icon: faGlobe, text: 'Landing Pages' },
      { to: '/dashboard/whatsapp-bot', icon: faComments, text: 'WhatsApp Bot' },
      { to: '/dashboard/oasis-chat', icon: faRobot, text: 'Chat IA' },
    ],
  },
  {
    label: 'OPERACIÓN',
    items: [
      { to: '/dashboard/notificaciones', icon: faBell, text: 'Notificaciones' },
      { to: '/dashboard/monitor', icon: faBrain, text: 'Monitor Global IA' },
      { to: '/dashboard/wallet', icon: faWallet, text: 'Wallet' },
      { to: '/dashboard/dropshipping', icon: faTruck, text: 'Dropshipping' },
      { to: '/dashboard/calendario', icon: faCalendarAlt, text: 'Calendario' },
    ],
  },
  {
    label: 'SISTEMA',
    items: [
      { to: '/dashboard/usuarios', icon: faUserShield, text: 'Usuarios' },
      { to: '/dashboard/tutoriales', icon: faPlayCircle, text: 'Tutoriales' },
      { to: '/dashboard/ajustes', icon: faSlidersH, text: 'Ajustes' },
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

  const isActive = (itemTo) => {
    if (itemTo === '/dashboard') return location.pathname === '/dashboard' || location.pathname === '/dashboard/'
    return location.pathname.startsWith(itemTo)
  }

  return (
    <div className={`navbarDashboard ${isOpen ? 'navbarDashboardOpen' : 'navbarDashboardClosed'}`}>
      <Anchor className='logo' to='/dashboard'>
        <img src={logo} alt="Sanate logo" />
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
                className={isActive(item.to) ? 'activeLink' : ''}
                title={item.text}
              >
                <FontAwesomeIcon icon={item.icon} />
                {item.text}
              </Anchor>
            ))}
          </React.Fragment>
        ))}
      </div>
      <Logout />
    </div>
  );
}
