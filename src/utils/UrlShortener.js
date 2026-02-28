/**
 * Cliente para el Acortador de URLs
 * Uso en React:
 * 
 * import { UrlShortener } from './UrlShortener.js';
 * 
 * const shortUrl = await UrlShortener.create({
 *   url_original: 'https://sanate.store/products/guide?id=123',
 *   tipo: 'guia',
 *   titulo: 'Guía de Envío - Producto X'
 * });
 * 
 * console.log(shortUrl.url_corta); // sanate.store/s/rst-envio-abc123
 */

class UrlShortener {
  // Configuración
  static API_URL = '/shortenUrl.php';
  static DOMAIN = 'sanate.store';

  /**
   * Crear URL acortada
   * @param {Object} options
   *   - url_original (string, req): URL completa
   *   - tipo (string, opt): 'guia', 'producto', 'pedido', etc
   *   - titulo (string, opt): Nombre descriptivo
   *   - tienda (string, opt): slug de tienda
   * @returns {Promise<Object>} { codigo, url_corta, enlace_whatsapp, ... }
   */
  static async create(options = {}) {
    const {
      url_original = '',
      tipo = 'general',
      titulo = '',
      tienda = '',
    } = options;

    if (!url_original) {
      throw new Error('url_original es requerida');
    }

    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tienda && { 'X-Tienda': tienda }),
        },
        body: JSON.stringify({
          url_original,
          tipo,
          titulo,
          tienda,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Error ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error al acortar URL:', error);
      throw error;
    }
  }

  /**
   * Crear URL acortada y copiar al portapapeles
   */
  static async createAndCopy(options = {}) {
    const result = await this.create(options);
    
    if (result.ok && result.url_corta) {
      const enlace = `https://${result.url_corta}`;
      await this.copyToClipboard(enlace);
      return result;
    }
    
    throw new Error('No se pudo crear la URL acortada');
  }

  /**
   * Copiar al portapapeles
   */
  static async copyToClipboard(text) {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback para navegadores antiguos
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
      }
    } catch (error) {
      console.error('Error al copiar al portapapeles:', error);
      return false;
    }
  }

  /**
   * Crear enlace de WhatsApp con URL acortada
   */
  static async createWhatsAppLink(options = {}) {
    const result = await this.create(options);
    
    if (result.ok && result.enlace_whatsapp) {
      return result.enlace_whatsapp;
    }
    
    throw new Error('No se pudo crear enlace de WhatsApp');
  }

  /**
   * Generar mensaje de WhatsApp con URL acortada
   */
  static async generateWhatsAppMessage(options = {}) {
    const {
      url_original = '',
      tipo = 'general',
      titulo = '',
      mensaje = 'Haz clic aquí:',
      tienda = '',
    } = options;

    const result = await this.create({
      url_original,
      tipo,
      titulo,
      tienda,
    });

    if (result.ok) {
      const enlace = `https://${result.url_corta}`;
      const textoFinal = `${mensaje}\n${enlace}`;
      
      return {
        ...result,
        mensaje_texto: textoFinal,
        enlace_whatsapp: `https://wa.me/?text=${encodeURIComponent(textoFinal)}`,
      };
    }

    throw new Error('No se pudo generar mensaje de WhatsApp');
  }

  /**
   * Verificar si una URL está activa (debug)
   */
  static async checkStatus(codigo) {
    try {
      const response = await fetch(`/checkUrl.php?c=${codigo}`);
      return await response.json();
    } catch (error) {
      console.error('Error al verificar URL:', error);
      throw error;
    }
  }
}

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UrlShortener;
}
