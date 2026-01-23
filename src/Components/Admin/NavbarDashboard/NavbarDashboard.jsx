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
} from '@fortawesome/free-solid-svg-icons';
import logo from '../../../images/logo.png'
import Logout from '../Logout/Logout';

export default function Navbar({ isOpen = false, onClose }) {
    const location = useLocation();
    const handleClose = () => {
        if (typeof onClose === 'function') {
            onClose();
        }
    };


    return (

        <div className={`navbarDashboard ${isOpen ? 'navbarDashboardOpen' : 'navbarDashboardClosed'}`} >
            <Anchor className='logo'>
                <img src={logo} alt="logo" />

            </Anchor>
            <div className='links'>
                <Anchor onClick={handleClose} to={`/dashboard`} className={location.pathname === '/dashboard' ? 'activeLink' : ''}><FontAwesomeIcon icon={faHome} /> Inicio</Anchor>
                <Anchor onClick={handleClose} to={`/dashboard/pedidos`} className={location.pathname === '/dashboard/pedidos' ? 'activeLink' : ''}><FontAwesomeIcon icon={faClipboardList} /> Pedidos</Anchor>
                <Anchor onClick={handleClose} to={`/dashboard/notificaciones`} className={location.pathname === '/dashboard/notificaciones' ? 'activeLink' : ''}><FontAwesomeIcon icon={faBell} /> Notificaciones</Anchor>
                <Anchor onClick={handleClose} to={`/dashboard/imagenes-ia`} className={location.pathname === '/dashboard/imagenes-ia' ? 'activeLink' : ''}><FontAwesomeIcon icon={faRobot} /> Imágenes IA</Anchor>
                <Anchor onClick={handleClose} to={`/dashboard/clientes`} className={location.pathname === '/dashboard/clientes' ? 'activeLink' : ''}><FontAwesomeIcon icon={faUsers} /> Clientes</Anchor>
                <Anchor onClick={handleClose} to={`/dashboard/productos`} className={location.pathname === '/dashboard/productos' ? 'activeLink' : ''} ><FontAwesomeIcon icon={faBook} /> Productos</Anchor>
                <Anchor onClick={handleClose} to={`/dashboard/categorias`} className={location.pathname === '/dashboard/categorias' ? 'activeLink' : ''}><FontAwesomeIcon icon={faTachometerAlt} /> Categorias</Anchor>
                <Anchor onClick={handleClose} to={`/dashboard/banners`} className={location.pathname === '/dashboard/banners' ? 'activeLink' : ''}><FontAwesomeIcon icon={faImage} /> Banners</Anchor>
                <Anchor onClick={handleClose} to={`/dashboard/sub-banners`} className={location.pathname === '/dashboard/sub-banners' ? 'activeLink' : ''}><FontAwesomeIcon icon={faImage} /> Sub-Banners</Anchor>
                <Anchor onClick={handleClose} to={`/dashboard/contacto`} className={location.pathname === '/dashboard/contacto' ? 'activeLink' : ''}><FontAwesomeIcon icon={faAddressBook} /> Contacto</Anchor>
                <Anchor onClick={handleClose} to={`/dashboard/usuarios`} className={location.pathname === '/dashboard/usuarios' ? 'activeLink' : ''}><FontAwesomeIcon icon={faUser} /> Usuarios</Anchor>
                <Anchor onClick={handleClose} to={`/dashboard/codigos`} className={location.pathname === '/dashboard/codigos' ? 'activeLink' : ''}><FontAwesomeIcon icon={faCode} /> Codigos</Anchor>
            </div>

            <Logout />

        </div>

    );
}
