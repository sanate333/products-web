import React, { useState, useEffect } from 'react';
import './Notificaciones.css';
import baseURL from '../../Components/url';

export default function Notificaciones() {
  const [title, setTitle] = useState('Nueva promocion Sanate');
  const [body, setBody] = useState('Tienes un descuento especial.');
  const [code, setCode] = useState('');
  const [url, setUrl] = useState('/');
  const [status, setStatus] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [totalTokens, setTotalTokens] = useState(0);
  const [totalInstalls, setTotalInstalls] = useState(0);
  const [totalSubscribers, setTotalSubscribers] = useState(0);
  const [subscribers, setSubscribers] = useState([]);
  const [selectedSubscriber, setSelectedSubscriber] = useState('');
  const [searchSubscriber, setSearchSubscriber] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const response = await fetch(`${baseURL}/getPushStats.php`);
      const data = await response.json();
      if (data?.ok) {
        setTotalTokens(data.totalTokens || 0);
        setTotalInstalls(data.totalInstalls || 0);
        setTotalSubscribers(data.totalSubscribers || 0);
        setSubscribers(data.subscribers || []);
        setCampaigns(data.campaigns || []);
      }
    } catch (error) {
      console.error('Error al cargar stats', error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);


  const sendNotification = async (payload) => {
    setIsSending(true);
    setStatus('Enviando...');
    try {
      const response = await fetch(`${baseURL}/sendPushMessage.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data?.ok) {
        setStatus('Notificacion enviada.');
        loadStats();
      } else {
        setStatus(data?.error || 'Error al enviar.');
      }
    } catch (error) {
      setStatus('Error al enviar.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = async () => {
    await sendNotification({
      title,
      body,
      code,
      url,
      targetRole: 'customer',
    });
  };

  const handleTemplateOffer = () => {
    setTitle('Sanate - Oferta especial');
    setBody('Aprovecha esta oferta limitada en Sanate.');
    setCode('');
    setUrl('/');
  };

  const handleTemplateShipping = () => {
    setTitle('Sanate - Envio en camino');
    setBody('Tu pedido ya va en camino. Gracias por tu compra.');
    setCode('');
    setUrl('/dashboard/pedidos');
  };

  const handleSendShipping = async () => {
    if (!selectedSubscriber) {
      setStatus('Selecciona un cliente.');
      return;
    }
    await sendNotification({
      title: 'Sanate - Envio en camino',
      body: 'Tu pedido ya va en camino. Gracias por tu compra.',
      url: '/dashboard/pedidos',
      deviceId: selectedSubscriber,
      type: 'shipping',
    });
  };

  const handleSendToSelected = async () => {
    if (!selectedSubscriber) {
      setStatus('Selecciona un cliente.');
      return;
    }
    await sendNotification({
      title,
      body,
      code,
      url,
      deviceId: selectedSubscriber,
      targetRole: 'customer',
    });
  };

  const filteredSubscribers = subscribers.filter((subscriber) => {
    const target = `${subscriber.name} ${subscriber.whatsapp} ${subscriber.deviceInfo} ${subscriber.city} ${subscriber.region}`.toLowerCase();
    return target.includes(searchSubscriber.toLowerCase());
  });

  return (
    <div className='notifContain'>
      <div className='notifCard'>
        <h2>Auto Remarketing</h2>
        <p>Envia ofertas o avisos a tus clientes registrados.</p>
        <div className='notifStats'>
          <span>Total suscritos: {statsLoading ? 'Cargando...' : totalTokens}</span>
          <span>Instalaciones app: {statsLoading ? 'Cargando...' : totalInstalls}</span>
          <span>Clientes registrados: {statsLoading ? 'Cargando...' : totalSubscribers}</span>
        </div>
      </div>

      <div className='notifCard'>
        <h3>Enviar promocion</h3>
        <div className='notifActions'>
          <button className='btnNotifSend secondary' type="button" onClick={handleTemplateOffer}>
            Plantilla oferta
          </button>
          <button className='btnNotifSend secondary' type="button" onClick={handleTemplateShipping}>
            Plantilla envio
          </button>
        </div>
        <label>Titulo</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
        <label>Mensaje</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} />
        <label>Codigo de descuento</label>
        <input value={code} onChange={(e) => setCode(e.target.value)} />
        <label>URL a abrir</label>
        <input value={url} onChange={(e) => setUrl(e.target.value)} />
        <div className='notifActions'>
          <button className='btnNotifSend' onClick={handleSend} disabled={isSending}>
            {isSending ? 'Enviando...' : 'Enviar masivo'}
          </button>
          <button className='btnNotifSend secondary' onClick={handleSendToSelected} disabled={isSending}>
            Enviar a cliente
          </button>
        </div>
        {status && <p className='notifStatus'>{status}</p>}
      </div>

      <div className='notifCard'>
        <h3>Clientes registrados</h3>
        {statsLoading ? (
          <p>Cargando...</p>
        ) : subscribers.length === 0 ? (
          <p>No hay registros aun.</p>
        ) : (
          <div className='notifSubscribers'>
            {filteredSubscribers.map((subscriber, index) => (
              <div key={`${subscriber.whatsapp}-${index}`} className='notifSubscriber'>
                <strong>{subscriber.name}</strong>
                <span>WhatsApp: {subscriber.whatsapp}</span>
                <span>Ciudad: {subscriber.city || subscriber.region || '-'}</span>
                <span>{subscriber.updatedAt}</span>
              </div>
            ))}
          </div>
        )}
        <div className='notifTarget'>
          <label>Buscar cliente</label>
          <input
            type="text"
            placeholder="Nombre, WhatsApp o ciudad"
            value={searchSubscriber}
            onChange={(e) => setSearchSubscriber(e.target.value)}
          />
          <label>Seleccionar cliente</label>
          <select value={selectedSubscriber} onChange={(e) => setSelectedSubscriber(e.target.value)}>
            <option value="">Selecciona un cliente</option>
            {filteredSubscribers.map((subscriber) => (
              <option key={subscriber.whatsapp} value={subscriber.deviceId || ''}>
                {subscriber.name} - {subscriber.whatsapp}
              </option>
            ))}
          </select>
          <button className='btnNotifSend secondary' onClick={handleSendShipping} disabled={isSending}>
            Avisar envio en camino
          </button>
        </div>
      </div>

      <div className='notifCard'>
        <h3>Ultimas campanas</h3>
        {statsLoading ? (
          <p>Cargando...</p>
        ) : campaigns.length === 0 ? (
          <p>No hay envios aun.</p>
        ) : (
          <div className='notifCampaigns'>
            {campaigns.map((campaign) => (
              <div key={campaign.id} className='notifCampaign'>
                <strong>{campaign.title}</strong>
                <span>{campaign.body}</span>
                <span>Codigo: {campaign.code || '-'}</span>
                <span>Enviados: {campaign.totalTokens}</span>
                <span>{campaign.sentAt}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
