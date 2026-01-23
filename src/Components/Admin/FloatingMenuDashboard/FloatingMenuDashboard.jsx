import React from 'react';
import './FloatingMenuDashboard.css';
import { Link as Anchor } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faShoppingBag, faTag, faBars, faUsers } from '@fortawesome/free-solid-svg-icons';

export default function FloatingMenuDashboard({ onToggleMenu, menuOpen }) {
    return (
        <div className="floatingMenuDashboard">
            <Anchor to="/dashboard" className="floatingMenuItem floatingMenuItemActive">
                <span className="floatingMenuDot"></span>
                <FontAwesomeIcon icon={faHome} />
            </Anchor>
            <Anchor to="/dashboard/pedidos" className="floatingMenuItem">
                <FontAwesomeIcon icon={faShoppingBag} />
            </Anchor>
            <Anchor to="/dashboard/productos" className="floatingMenuItem">
                <FontAwesomeIcon icon={faTag} />
            </Anchor>
            <Anchor to="/dashboard/clientes" className="floatingMenuItem">
                <FontAwesomeIcon icon={faUsers} />
            </Anchor>
            <button
                type="button"
                className={`floatingMenuItem floatingMenuButton ${menuOpen ? 'floatingMenuItemActive' : ''}`}
                onClick={onToggleMenu}
                aria-pressed={menuOpen ? 'true' : 'false'}
                aria-label="Abrir menu"
            >
                <FontAwesomeIcon icon={faBars} />
            </button>
        </div>
    );
}
