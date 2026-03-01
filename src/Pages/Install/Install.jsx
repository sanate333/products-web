import React, { useEffect, useState } from 'react';
import './Install.css';
import Header from '../Header/Header';
import HeaderDash from '../../Components/Admin/HeaderDash/HeaderDash';
import { buildChromeIntentUrl, buildInstallUrl, openInstallTab } from '../../utils/install';

export default function Install() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [status, setStatus] = useState('');
  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);

  useEffect(() => {
    const handler = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallNow = async () => {
    if (!installPrompt) {
      setStatus('Sigue los pasos para instalar.');
      return;
    }

    setStatus('Instalando...');
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);

    if (choice?.outcome === 'accepted') {
      setStatus('App instalada.');
    } else {
      setStatus('Instalacion cancelada.');
    }
  };

  const handleOpenChrome = () => {
    const url = buildInstallUrl();
    const intentUrl = buildChromeIntentUrl(url);
    if (intentUrl) {
      window.location.href = intentUrl;
      return;
    }
    openInstallTab(url);
  };

  return (
    <div className="containerGrid">
      <Header />
      <section className="containerSection">
        <HeaderDash />
        <div className="installHelpCard">
          <h3>Instalar app Sanate</h3>
          <p>Instala el panel en tu celular para recibir pedidos mas rapido.</p>
          <div className="installHelpActions">
            <button type="button" className="installHelpPrimary" onClick={handleInstallNow}>
              Instalar ahora
            </button>
            {isAndroid && (
              <button type="button" className="installHelpSecondary" onClick={handleOpenChrome}>
                Abrir en Chrome
              </button>
            )}
          </div>
          <div className="installHelpSteps">
            <div className="installHelpStep">
              <span className="installHelpBadge">1</span>
              Abre este enlace en Chrome.
            </div>
            <div className="installHelpStep">
              <span className="installHelpBadge">2</span>
              Toca el menu ? y elige "Instalar app" o "Agregar a pantalla de inicio".
            </div>
            <div className="installHelpStep">
              <span className="installHelpBadge">3</span>
              Confirma y listo.
            </div>
          </div>
          {status && <div className="installHelpStatus">{status}</div>}
        </div>
      </section>
    </div>
  );
}