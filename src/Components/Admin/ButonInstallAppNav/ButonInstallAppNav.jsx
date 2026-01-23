import React, { useEffect, useState } from 'react';
import './ButonInstallAppNav.css';

const ButonInstallAppNav = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [installHint, setInstallHint] = useState('');

    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setInstallHint('');
            console.log('Evento beforeinstallprompt capturado');
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = () => {
        if (!deferredPrompt) {
            setInstallHint('Instalacion no disponible. Abre en Chrome y recarga.');
            return;
        }
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('El usuario acepto la instalacion');
            } else {
                console.log('El usuario rechazo la instalacion');
            }
            setDeferredPrompt(null);
        });
    };

    return (
        <div className='btnInstallWrap'>
            <button
                onClick={handleInstallClick}
                className={`btnInstall ${!deferredPrompt ? 'btnInstallDisabled' : ''}`}
            >
                Instalar
            </button>
            {installHint ? <div className='btnInstallHint'>{installHint}</div> : null}
        </div>
    );
};

export default ButonInstallAppNav;
