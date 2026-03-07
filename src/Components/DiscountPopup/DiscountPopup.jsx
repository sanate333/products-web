import React, { useState, useEffect } from 'react';
import './DiscountPopup.css';

const POPUP_STORAGE_KEY = 'discountPopup17';
const DISCOUNT_STORAGE_KEY = 'promoDiscount17';
const POPUP_EXPIRY_MS = 24 * 60 * 60 * 1000;

function getPopupState() {
    try {
        const raw = localStorage.getItem(POPUP_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.timestamp > POPUP_EXPIRY_MS) {
            localStorage.removeItem(POPUP_STORAGE_KEY);
            localStorage.removeItem(DISCOUNT_STORAGE_KEY);
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

function getRemainingTime() {
    const state = getPopupState();
    if (!state) return null;
    const elapsed = Date.now() - state.timestamp;
    const remaining = POPUP_EXPIRY_MS - elapsed;
    return remaining > 0 ? remaining : null;
}

function formatCountdown(ms) {
    if (!ms || ms <= 0) return '00:00:00';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function DiscountPopup() {
    const [visible, setVisible] = useState(false);
    const [countdown, setCountdown] = useState('');
    const [applied, setApplied] = useState(false);

    useEffect(() => {
        const state = getPopupState();
        if (state?.dismissed) {
            if (state?.applied) {
                setApplied(true);
            }
            return;
        }

        const timer = setTimeout(() => {
            setVisible(true);
        }, 2500);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!visible && !applied) return;

        const updateCountdown = () => {
            const remaining = getRemainingTime();
            if (remaining) {
                setCountdown(formatCountdown(remaining));
            } else {
                setCountdown('24:00:00');
            }
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [visible, applied]);

    const handleApplyDiscount = () => {
        const now = Date.now();
        const state = getPopupState();
        const timestamp = state?.timestamp || now;

        localStorage.setItem(POPUP_STORAGE_KEY, JSON.stringify({
            timestamp,
            dismissed: true,
            applied: true,
        }));
        localStorage.setItem(DISCOUNT_STORAGE_KEY, JSON.stringify({
            active: true,
            percent: 17,
            timestamp,
            method: 'transferencia',
        }));

        setApplied(true);
        setVisible(false);

        window.dispatchEvent(new CustomEvent('promoDiscountApplied', {
            detail: { percent: 17, method: 'transferencia' },
        }));
    };

    const handleClose = () => {
        const now = Date.now();
        const state = getPopupState();
        const timestamp = state?.timestamp || now;

        localStorage.setItem(POPUP_STORAGE_KEY, JSON.stringify({
            timestamp,
            dismissed: true,
            applied: false,
        }));
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="promoOverlay" onClick={handleClose}>
            <div className="promoPopup" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="promoClose" onClick={handleClose}>
                    &times;
                </button>
                <div className="promoFireLeft">&#128293;</div>
                <div className="promoFireRight">&#128293;</div>
                <div className="promoContent">
                    <div className="promoBadge">OFERTA DEL DIA</div>
                    <h2 className="promoTitle">HOY <span className="promoPercent">17%</span> DE DESCUENTO</h2>
                    <p className="promoSubtitle">Valido solo por 24 horas</p>
                    <div className="promoCountdown">{countdown || '24:00:00'}</div>
                    <p className="promoCondition">*Aplica pagando por Transferencia (Nequi, Cuenta de Ahorros)</p>
                    <button type="button" className="promoBtn" onClick={handleApplyDiscount}>
                        OBTENER DESCUENTO
                    </button>
                </div>
            </div>
        </div>
    );
}
