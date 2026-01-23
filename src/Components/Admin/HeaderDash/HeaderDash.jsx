import React, { useEffect, useState } from 'react';
import './HeaderDash.css';
import ButonScreen from '../ButonScreen/ButonScreen';
import InputSearch from '../InputSearch/InputSearch';
import InfoUser from '../InfoUser/InfoUser';
import { Link as Anchor } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome } from '@fortawesome/free-solid-svg-icons';
import baseURL from '../../url';
import { registerFcmToken } from '../../../firebase';
export default function HeaderDash() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [promptStatus, setPromptStatus] = useState('');

    useEffect(() => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            return;
        }
        const dismissed = localStorage.getItem('adminNotifPromptDismissed');
        if (dismissed) {
            return;
        }
        if (Notification.permission !== 'granted') {
            setShowPrompt(true);
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            return;
        }
        if (Notification.permission === 'granted') {
            return;
        }
        const shown = localStorage.getItem('adminFcmPromptShown');
        if (shown) {
            return;
        }
        localStorage.setItem('adminFcmPromptShown', '1');
    }, []);

    const handleEnableNotifications = async () => {
        setPromptStatus('Solicitando permiso...');
        const result = await registerFcmToken(baseURL, 'admin');
        if (result?.ok) {
            setPromptStatus('Notificaciones activadas.');
            setShowPrompt(false);
            return;
        }
        if (result?.reason === 'denied') {
            setPromptStatus('Permiso bloqueado. Activalo en ajustes del navegador.');
            return;
        }
        if (result?.reason === 'no_subscription') {
            setPromptStatus('No se pudo registrar. Reintenta en unos segundos.');
            return;
        }
        setPromptStatus('No se pudo activar. Revisa permisos del navegador.');
    };

    const handleDismiss = () => {
        localStorage.setItem('adminNotifPromptDismissed', '1');
        setShowPrompt(false);
    };


    return (
        <div className={`HeaderDashContain`}>
            {showPrompt && (
                <div className='notifyPrompt'>
                    <div>
                        <strong>Activa notificaciones</strong>
                        <span>Necesario para recibir pedidos en tiempo real.</span>
                    </div>
                    <div className='notifyPromptActions'>
                        <button type="button" className='notifyPromptBtn' onClick={handleEnableNotifications}>
                            Activar
                        </button>
                        <button type="button" className='notifyPromptClose' onClick={handleDismiss}>
                            Cerrar
                        </button>
                    </div>
                    {promptStatus && <span className='notifyPromptStatus'>{promptStatus}</span>}
                </div>
            )}
            <div className='headerDashMain'>
                <InputSearch />
                <div className='deFlexHeader'>
                    <ButonScreen />
                    <Anchor to={'/'} className='link'>
                        <FontAwesomeIcon icon={faHome} /> Inicio
                    </Anchor>
                    <InfoUser />
                </div>
            </div>
        </div>
    );
}
