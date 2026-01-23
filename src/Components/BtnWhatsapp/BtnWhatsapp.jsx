import React from 'react';
import './BtnWhatsapp.css';
import whatsappIcon from '../../images/wpp.png';

export default function BtnWhatsapp() {
    const openCheckout = () => {
        window.dispatchEvent(new Event('openCheckout'));
    };

    return (
        <div className='containWpp'>
            <button className='btnWhatsapp' onClick={openCheckout}>
                <img src={whatsappIcon} alt="whatsappIcon" />
            </button>
        </div>
    );
}
