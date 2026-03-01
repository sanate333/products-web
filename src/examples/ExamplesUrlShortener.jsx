/**
 * EJEMPLOS DE INTEGRACIÓN
 * Casos de uso reales del acortador de URLs en products-web
 */

import UrlShortener from '../utils/UrlShortener';
import ShortenAndShare from '../Components/ShortenAndShare/ShortenAndShare';

// ==================== EJEMPLO 1: Botón en Página de Producto ====================

export function ProductoGuiaButton({ productoId, productoNombre }) {
  return (
    <ShortenAndShare
      url={`https://sanate.store/producto/${productoId}/guia?full=true`}
      tipo="guia"
      titulo={`Guía de ${productoNombre}`}
      mensaje="Aquí está tu guía de envío:"
      buttonText="📱 Compartir Guía por WhatsApp"
      onSuccess={(result) => {
        console.log('Guía compartida:', result.url_corta);
        // Guardar en analytics, etc
      }}
      onError={(error) => {
        console.error('Error al compartir:', error);
      }}
    />
  );
}

// ==================== EJEMPLO 2: Generar Link en Pedido ====================

export async function enviarPedidoPorWhatsApp(pedido) {
  try {
    // Generar URL acortada para el pedido
    const pedidoUrl = `https://sanate.store/dashboard/pedidos/${pedido.id}?token=${pedido.token}`;
    
    const shortUrl = await UrlShortener.create({
      url_original: pedidoUrl,
      tipo: 'pedido',
      titulo: `Pedido #${pedido.pedido_numero}`,
      descripcion: `Cliente: ${pedido.cliente_nombre}`
    });

    // Construir mensaje
    const mensaje = `
¡Hola ${pedido.cliente_nombre}!

Tu pedido #${pedido.pedido_numero} está listo.

📦 Total: $${pedido.total}
🔗 Detalles: ${shortUrl.url_corta}

Gracias por tu compra!
    `.trim();

    // Enlace de WhatsApp
    const numeroWhatsApp = pedido.cliente_whatsapp.replace(/\D/g, '');
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;

    return {
      ok: true,
      url_corta: shortUrl.url_corta,
      mensaje,
      enlace_whatsapp: urlWhatsApp
    };

  } catch (error) {
    console.error('Error generando URL acortada:', error);
    return { ok: false, error: error.message };
  }
}

// ==================== EJEMPLO 3: Ofertas Especiales ====================

export async function compartirOferta(oferta) {
  const ofertaUrl = `https://sanate.store/ofertas/${oferta.slug}?promo=${oferta.codigo}`;
  
  const result = await UrlShortener.createWhatsAppMessage({
    url_original: ofertaUrl,
    tipo: 'oferta',
    titulo: oferta.titulo,
    mensaje: `🎉 OFERTA ESPECIAL: ${oferta.titulo}\n⏰ Válida hasta ${oferta.fecha_fin}`
  });

  // Enviar a contactos
  const contactos = ['573234549614', '573245678901']; // Ejemplos
  
  contactos.forEach(contacto => {
    const url = `https://wa.me/${contacto}?text=${encodeURIComponent(result.mensaje_texto)}`;
    // Podría abrir en nueva pestaña o guardar para envío masivo
  });

  return result;
}

// ==================== EJEMPLO 4: Copiar Link ====================

export async function copiarLinkCorto(urlOriginal) {
  try {
    const result = await UrlShortener.createAndCopy({
      url_original: urlOriginal,
      tipo: 'general',
      titulo: 'Link compartido'
    });

    // Mostrar notificación al usuario
    alert(`Link copiado: ${result.url_corta}`);
    return result;

  } catch (error) {
    alert('Error al copiar: ' + error.message);
  }
}

// ==================== EJEMPLO 5: Componente Integrado ====================

export function PedidoCard({ pedido }) {
  const [compartiendo, setCompartiendo] = React.useState(false);

  const handleCompartirWhatsApp = async () => {
    setCompartiendo(true);
    try {
      const result = await enviarPedidoPorWhatsApp(pedido);
      if (result.ok) {
        // Copiar al portapapeles
        await UrlShortener.copyToClipboard(result.url_corta);
        // Abrir WhatsApp
        window.open(result.enlace_whatsapp, '_blank');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setCompartiendo(false);
    }
  };

  return (
    <div className="pedido-card">
      <h3>Pedido #{pedido.pedido_numero}</h3>
      <p>Cliente: {pedido.cliente_nombre}</p>
      <p>Total: ${pedido.total}</p>
      
      <button 
        onClick={handleCompartirWhatsApp}
        disabled={compartiendo}
      >
        {compartiendo ? '⏳ Compartiendo...' : '📱 Compartir por WhatsApp'}
      </button>
    </div>
  );
}

// ==================== EJEMPLO 6: Endpoint PHP - Envío de Guía ====================

/**
 * POST /api/guias/compartir.php
 * 
 * Request:
 * {
 *   "producto_id": 123,
 *   "cliente_whatsapp": "573234549614",
 *   "cliente_nombre": "Juan"
 * }
 */

// PHP version:
/*
<?php
require_once __DIR__ . '/../../config.php';

$data = json_decode(file_get_contents('php://input'), true) ?? [];

try {
    $producto_id = intval($data['producto_id'] ?? 0);
    $cliente_whatsapp = trim($data['cliente_whatsapp'] ?? '');
    $cliente_nombre = trim($data['cliente_nombre'] ?? '');

    // Generar URL de guía
    $guia_url = 'https://sanate.store/producto/' . $producto_id . '/guia?full=true';

    // Llamar endpoint shortenUrl.php
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => 'https://sanate.store/shortenUrl.php',
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode([
            'url_original' => $guia_url,
            'tipo' => 'guia',
            'titulo' => 'Guía del Producto'
        ]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json']
    ]);

    $response = curl_exec($ch);
    $result = json_decode($response, true);

    if ($result['ok']) {
        // Enviar por WhatsApp
        $mensaje = "Aquí está tu guía: " . $result['url_corta'];
        
        // Guardar en logs/BD para seguimiento
        // enviarMensajeWhatsApp($cliente_whatsapp, $mensaje);

        echo json_encode([
            'ok' => true,
            'url_corta' => $result['url_corta'],
            'mensaje' => $mensaje
        ]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
?>
*/

// ==================== EJEMPLO 7: Analytics ====================

export class UrlAnalytics {
  /**
   * Registrar tracking de URL acortada
   */
  static async track(codigo, evento) {
    try {
      const response = await fetch('/api/urls/track.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo,
          evento, // 'copied', 'clicked', 'shared', etc
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          referrer: document.referrer
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Error tracking:', error);
    }
  }

  /**
   * Obtener estadísticas de una URL
   */
  static async getStats(codigo) {
    const response = await fetch(`/checkUrl.php?c=${codigo}`);
    if (response.ok) {
      const data = await response.json();
      return data.data;
    }
    throw new Error('Error obteniendo estadísticas');
  }
}

// Uso:
// await UrlAnalytics.track('rst-envio-abc123', 'copied');

// ==================== EJEMPLO 8: Batch de URLs ====================

export async function crearUrlsEnMasa(items) {
  const resultados = [];

  for (const item of items) {
    try {
      const result = await UrlShortener.create({
        url_original: item.url,
        tipo: item.tipo,
        titulo: item.titulo
      });
      resultados.push({ ...item, success: true, ...result });
    } catch (error) {
      resultados.push({ ...item, success: false, error: error.message });
    }
  }

  return resultados;
}

// Uso:
/*
const urls = [
  { url: 'https://sanate.store/producto/1', tipo: 'producto', titulo: 'Producto 1' },
  { url: 'https://sanate.store/producto/2', tipo: 'producto', titulo: 'Producto 2' },
  { url: 'https://sanate.store/producto/3', tipo: 'producto', titulo: 'Producto 3' }
];

const resultados = await crearUrlsEnMasa(urls);
console.log(resultados);
*/

export default {
  ProductoGuiaButton,
  enviarPedidoPorWhatsApp,
  compartirOferta,
  copiarLinkCorto,
  PedidoCard,
  UrlAnalytics,
  crearUrlsEnMasa
};
