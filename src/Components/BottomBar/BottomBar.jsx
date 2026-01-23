import React, { useState } from 'react';
import Modal from 'react-modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faHome,
    faSearch,
    faShoppingCart,
    faPlus,
    faPaperPlane,
} from '@fortawesome/free-solid-svg-icons';
import whatsappIcon from '../../images/wpp.png';
import './BottomBar.css';

const WHATSAPP_NUMBER = '573234549614';
const DEFAULT_MESSAGE = '\u00a1Hola! Estoy interesado en..';

export default function BottomBar() {
    const [modalOpen, setModalOpen] = useState(false);
    const [message, setMessage] = useState(DEFAULT_MESSAGE);

    const openModal = () => setModalOpen(true);
    const closeModal = () => setModalOpen(false);

    const openCart = () => {
        window.dispatchEvent(new Event('openCheckout'));
    };

    const openSearch = () => {
        window.dispatchEvent(new Event('openSearch'));
    };

    const handleSend = () => {
        const text = message.trim() || DEFAULT_MESSAGE;
        const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        closeModal();
    };

    return (
        <>
            <div className="bottomBar">
                <button type="button" className="bottomBarItem" onClick={() => window.location.assign('/')}>
                    <FontAwesomeIcon icon={faHome} />
                    <span>Inicio</span>
                </button>
                <button type="button" className="bottomBarItem bottomBarItemMuted" onClick={openModal}>
                    <img src={whatsappIcon} alt="WhatsApp" className="bottomBarWppIcon" />
                    <span>WhatsApp</span>
                </button>
                <button type="button" className="bottomBarCenter" onClick={openModal}>
                    <FontAwesomeIcon icon={faPlus} />
                </button>
                <button type="button" className="bottomBarItem bottomBarItemMuted" onClick={openCart}>
                    <FontAwesomeIcon icon={faShoppingCart} />
                    <span>Carrito</span>
                </button>
                <button type="button" className="bottomBarItem bottomBarItemMuted" onClick={openSearch}>
                    <FontAwesomeIcon icon={faSearch} />
                    <span>Buscar</span>
                </button>
            </div>

            <Modal
                isOpen={modalOpen}
                onRequestClose={closeModal}
                className="modalWpp"
                overlayClassName="overlayWpp"
            >
                <div className="modalWppHeader">
                    <h4>Envianos un mensaje</h4>
                    <button type="button" onClick={closeModal}>x</button>
                </div>
                <div className="modalWppBody">
                    <div className="modalWppBubble">
                        {DEFAULT_MESSAGE}
                    </div>
                    <div className="modalWppInput">
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={DEFAULT_MESSAGE}
                        />
                        <button type="button" onClick={handleSend}>
                            <FontAwesomeIcon icon={faPaperPlane} />
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
