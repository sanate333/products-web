/**
 * Componente React: Botón para Acortar y Compartir por WhatsApp
 * 
 * Uso:
 * <ShortenAndShare 
 *   url="https://sanate.store/products/guide?id=123"
 *   tipo="guia"
 *   titulo="Guía de Envío"
 *   mensaje="Revisa tu guía de envío"
 * />
 */

import React, { useState } from 'react';
import UrlShortener from '../../utils/UrlShortener';
import './ShortenAndShare.css';

export const ShortenAndShare = ({
  url = '',
  tipo = 'general',
  titulo = '',
  mensaje = 'Haz clic aquí:',
  buttonText = '📱 Compartir por WhatsApp',
  showUrl = true,
  onSuccess = null,
  onError = null,
}) => {
  const [loading, setLoading] = useState(false);
  const [shortUrl, setShortUrl] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    setShortUrl(null);

    try {
      const result = await UrlShortener.createWhatsAppMessage({
        url_original: url,
        tipo,
        titulo,
        mensaje,
      });

      setShortUrl(result);
      setCopied(false);

      // Abrir WhatsApp en nueva pestaña
      window.open(result.enlace_whatsapp, '_blank');

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      const errorMsg = err.message || 'Error al acortar la URL';
      setError(errorMsg);
      console.error(errorMsg, err);

      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!shortUrl) return;

    const urlCompleta = `https://${shortUrl.url_corta}`;
    const copied = await UrlShortener.copyToClipboard(urlCompleta);

    if (copied) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="shorten-and-share">
      <button
        className="btn-share"
        onClick={handleClick}
        disabled={loading || !url}
        title={url ? buttonText : 'URL requerida'}
      >
        {loading ? (
          <>
            <span className="spinner">⏳</span>
            Generando...
          </>
        ) : (
          buttonText
        )}
      </button>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {shortUrl && showUrl && (
        <div className="url-result">
          <div className="url-display">
            <span className="label">URL Acortada:</span>
            <code className="url-code">https://{shortUrl.url_corta}</code>
            <button
              className="btn-copy"
              onClick={handleCopyUrl}
              title="Copiar al portapapeles"
            >
              {copied ? '✓ Copiado' : '📋 Copiar'}
            </button>
          </div>
          <p className="url-info">
            Tipo: {shortUrl.tipo} | Clics: {shortUrl.clicks || 0}
          </p>
        </div>
      )}
    </div>
  );
};

export default ShortenAndShare;
