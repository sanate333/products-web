import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from '../Header/Header';
import './WhatsAppBot.css';

const API = '/api/whatsapp';

function getInitials(name) {
  const safe = String(name || '').trim();
  if (!safe) return '?';
  const parts = safe.split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('');
}

function formatHour(ts) {
  if (!ts) return '--:--';
  try {
    return new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
}

function formatDate(ts) {
  if (!ts) return 'Sin fecha';
  try {
    return new Date(ts).toLocaleString('es-CO');
  } catch {
    return String(ts);
  }
}

function statusLabel(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'queued') return '🕓 En cola';
  if (s === 'sent') return '✓ Enviado';
  if (s === 'delivered') return '✓✓ Entregado';
  if (s === 'read') return '✓✓ Leído';
  if (s === 'failed') return '⚠ Falló';
  return '—';
}

function mediaKindFromType(type, mimeType) {
  const t = String(type || '').toLowerCase();
  const m = String(mimeType || '').toLowerCase();
  if (t === 'image' || m.startsWith('image/')) return 'image';
  if (t === 'video' || m.startsWith('video/')) return 'video';
  if (t === 'audio' || m.startsWith('audio/')) return 'audio';
  return 'document';
}

export default function WhatsAppBot() {
  const [tab, setTab] = useState('chats');
  const [chats, setChats] = useState([]);
  const [chatsCursor, setChatsCursor] = useState(null);
  const [loadingChats, setLoadingChats] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesCursor, setMessagesCursor] = useState(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [search, setSearch] = useState('');
  const [syncLast15Days, setSyncLast15Days] = useState(true);
  const [syncJob, setSyncJob] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [newTriggerName, setNewTriggerName] = useState('');
  const [toast, setToast] = useState('');

  const messagesRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioInputRef = useRef(null);

  const showToast = useCallback((msg) => {
    setToast(String(msg || ''));
    window.setTimeout(() => setToast(''), 2800);
  }, []);

  const loadChats = useCallback(async (cursor = null, append = false) => {
    setLoadingChats(true);
    try {
      const qs = new URLSearchParams({ limit: '50' });
      if (cursor) qs.set('cursor', String(cursor));
      const resp = await fetch(`${API}/chats?${qs.toString()}`);
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error || 'No se pudo cargar chats');
      setChats((prev) => (append ? [...prev, ...(data.chats || [])] : (data.chats || [])));
      setChatsCursor(data.nextCursor || null);
    } catch (err) {
      showToast(`Error chats: ${err.message || err}`);
    } finally {
      setLoadingChats(false);
    }
  }, [showToast]);

  const loadMessages = useCallback(async (chatId, cursor = null, appendOlder = false) => {
    if (!chatId) return;
    setLoadingMessages(true);
    const scroller = messagesRef.current;
    const prevHeight = scroller ? scroller.scrollHeight : 0;
    try {
      const qs = new URLSearchParams({ limit: '50' });
      if (cursor) qs.set('cursor', String(cursor));
      const resp = await fetch(`${API}/chats/${encodeURIComponent(chatId)}/messages?${qs.toString()}`);
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error || 'No se pudo cargar mensajes');
      setMessages((prev) => {
        if (!appendOlder) return data.messages || [];
        const older = data.messages || [];
        return [...older, ...prev];
      });
      setMessagesCursor(data.nextCursor || null);
      if (data.chat) setActiveChat(data.chat);
      if (!appendOlder) {
        window.setTimeout(() => {
          if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }, 60);
      } else {
        window.setTimeout(() => {
          if (messagesRef.current) {
            const newHeight = messagesRef.current.scrollHeight;
            messagesRef.current.scrollTop = Math.max(0, newHeight - prevHeight);
          }
        }, 30);
      }
    } catch (err) {
      showToast(`Error mensajes: ${err.message || err}`);
    } finally {
      setLoadingMessages(false);
    }
  }, [showToast]);

  const openChat = useCallback(async (chat) => {
    setActiveChat(chat);
    await loadMessages(chat.chatId, null, false);
    try {
      await fetch(`${API}/chats/${encodeURIComponent(chat.chatId)}/read`, { method: 'POST' });
      setChats((prev) => prev.map((c) => (
        c.chatId === chat.chatId ? { ...c, unreadCount: 0 } : c
      )));
    } catch {}
  }, [loadMessages]);

  const loadTemplates = useCallback(async () => {
    try {
      const resp = await fetch(`${API}/templates`);
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error || 'No se pudo cargar plantillas');
      setTemplates(data.templates || []);
    } catch (err) {
      showToast(`Error plantillas: ${err.message || err}`);
    }
  }, [showToast]);

  const loadTriggers = useCallback(async () => {
    try {
      const resp = await fetch(`${API}/triggers`);
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error || 'No se pudo cargar disparadores');
      setTriggers(data.triggers || []);
    } catch (err) {
      showToast(`Error disparadores: ${err.message || err}`);
    }
  }, [showToast]);

  const pollSyncStatus = useCallback((jobId) => {
    if (!jobId) return;
    const timer = window.setInterval(async () => {
      try {
        const resp = await fetch(`${API}/sync/status?jobId=${encodeURIComponent(jobId)}`);
        const data = await resp.json();
        if (!data.ok) return;
        setSyncJob(data.job);
        if (data.job?.status === 'done' || data.job?.status === 'canceled') {
          window.clearInterval(timer);
          loadChats();
          if (activeChat?.chatId) loadMessages(activeChat.chatId, null, false);
        }
      } catch {}
    }, 900);
  }, [activeChat?.chatId, loadChats, loadMessages]);

  const startSync = useCallback(async () => {
    try {
      const startDate = syncLast15Days
        ? new Date(Date.now() - (15 * 24 * 60 * 60 * 1000)).toISOString()
        : new Date(Date.now() - (15 * 24 * 60 * 60 * 1000)).toISOString();
      const resp = await fetch(`${API}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate }),
      });
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error || 'No se pudo iniciar sincronización');
      setSyncJob(data.job);
      showToast('Sincronizando...');
      pollSyncStatus(data.job.jobId);
    } catch (err) {
      showToast(`Error sync: ${err.message || err}`);
    }
  }, [pollSyncStatus, showToast, syncLast15Days]);

  const cancelSync = useCallback(async () => {
    if (!syncJob?.jobId) return;
    try {
      const resp = await fetch(`${API}/sync/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: syncJob.jobId }),
      });
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error || 'No se pudo cancelar');
      showToast('Cancelando sincronización...');
    } catch (err) {
      showToast(`Error cancelar: ${err.message || err}`);
    }
  }, [showToast, syncJob?.jobId]);

  const sendMessage = useCallback(async () => {
    if (!activeChat?.chatId || isSending) return;
    if (!messageText.trim() && !selectedFile) return;
    setIsSending(true);
    setUploadProgress(0);
    try {
      let data;
      if (selectedFile) {
        data = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${API}/chats/${encodeURIComponent(activeChat.chatId)}/send`);
          xhr.upload.onprogress = (ev) => {
            if (!ev.lengthComputable) return;
            setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
          };
          xhr.onreadystatechange = () => {
            if (xhr.readyState !== 4) return;
            try {
              const parsed = JSON.parse(xhr.responseText || '{}');
              if (xhr.status >= 200 && xhr.status < 300 && parsed.ok) resolve(parsed);
              else reject(new Error(parsed.error || 'No se pudo enviar multimedia'));
            } catch {
              reject(new Error('Respuesta inválida del servidor'));
            }
          };
          const form = new FormData();
          const mime = selectedFile.type || 'application/octet-stream';
          const kind = mediaKindFromType('', mime);
          form.append('file', selectedFile);
          form.append('type', kind);
          form.append('text', messageText.trim());
          form.append('mimeType', mime);
          form.append('fileName', selectedFile.name || 'archivo');
          xhr.send(form);
        });
      } else {
        const resp = await fetch(`${API}/chats/${encodeURIComponent(activeChat.chatId)}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'text', text: messageText.trim() }),
        });
        data = await resp.json();
        if (!data.ok) throw new Error(data.error || 'No se pudo enviar');
      }
      if (data?.message) {
        setMessages((prev) => [...prev, data.message]);
      }
      setMessageText('');
      setSelectedFile(null);
      setUploadProgress(0);
      window.setTimeout(() => {
        if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      }, 40);
      loadChats();
    } catch (err) {
      showToast(`Error envío: ${err.message || err}`);
    } finally {
      setIsSending(false);
    }
  }, [activeChat?.chatId, isSending, loadChats, messageText, selectedFile, showToast]);

  const retryMessage = useCallback(async (providerMessageId) => {
    try {
      const resp = await fetch(`${API}/messages/${encodeURIComponent(providerMessageId)}/retry`, { method: 'POST' });
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error || 'No se pudo reintentar');
      setMessages((prev) => prev.map((m) => (
        m.providerMessageId === providerMessageId ? { ...m, status: data.message?.status || 'sent' } : m
      )));
      showToast('Mensaje reenviado');
    } catch (err) {
      showToast(`Error reintento: ${err.message || err}`);
    }
  }, [showToast]);

  const createTrigger = useCallback(async () => {
    const name = String(newTriggerName || '').trim();
    if (!name) return;
    try {
      const payload = {
        name,
        isActive: true,
        conditions: {
          mode: 'keyword',
          operator: 'contains',
          value: 'hola',
        },
        actions: {
          type: 'send_template',
          templateId: templates[0]?.id || null,
          quickButtons: templates[0]?.quickButtons || [],
        },
      };
      const resp = await fetch(`${API}/triggers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error || 'No se pudo crear disparador');
      setNewTriggerName('');
      loadTriggers();
      showToast('Disparador creado');
    } catch (err) {
      showToast(`Error crear disparador: ${err.message || err}`);
    }
  }, [loadTriggers, newTriggerName, showToast, templates]);

  const toggleTrigger = useCallback(async (trigger) => {
    try {
      const resp = await fetch(`${API}/triggers/${encodeURIComponent(trigger.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !trigger.isActive }),
      });
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error || 'No se pudo actualizar trigger');
      setTriggers((prev) => prev.map((t) => (t.id === trigger.id ? data.trigger : t)));
    } catch (err) {
      showToast(`Error trigger: ${err.message || err}`);
    }
  }, [showToast]);

  useEffect(() => {
    loadChats();
    loadTemplates();
    loadTriggers();
  }, [loadChats, loadTemplates, loadTriggers]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadChats();
      if (activeChat?.chatId) loadMessages(activeChat.chatId, null, false);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [activeChat?.chatId, loadChats, loadMessages]);

  const filteredChats = useMemo(() => {
    const q = String(search || '').toLowerCase().trim();
    if (!q) return chats;
    return chats.filter((chat) => {
      const hay = `${chat.name || ''} ${chat.phone || ''} ${chat.lastMessagePreview || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [chats, search]);

  const onMessagesScroll = useCallback((ev) => {
    if (!messagesCursor || loadingMessages) return;
    if (ev.currentTarget.scrollTop > 40) return;
    loadMessages(activeChat?.chatId, messagesCursor, true);
  }, [activeChat?.chatId, loadMessages, loadingMessages, messagesCursor]);

  return (
    <div className="containerGrid">
      <Header />
      <div className="wb-root">
        <aside className="wb-sidebar">
          <div className="wb-brand">
            <div className="wb-logo">WA</div>
            <div>
              <div className="wb-title">WhatsApp Bot</div>
              <div className="wb-sub">sanate.store</div>
            </div>
          </div>

          <button type="button" className={`wb-nav ${tab === 'chats' ? 'active' : ''}`} onClick={() => setTab('chats')}>Chats</button>
          <button type="button" className={`wb-nav ${tab === 'templates' ? 'active' : ''}`} onClick={() => setTab('templates')}>Plantillas</button>
          <button type="button" className={`wb-nav ${tab === 'triggers' ? 'active' : ''}`} onClick={() => setTab('triggers')}>Disparadores</button>
          <button type="button" className={`wb-nav ${tab === 'config' ? 'active' : ''}`} onClick={() => setTab('config')}>Configuración</button>
        </aside>

        <main className="wb-main">
          {tab === 'chats' && (
            <section className="wb-chat-layout">
              <aside className="wb-chat-list">
                <div className="wb-list-head">
                  <input
                    className="wb-input"
                    placeholder="Buscar contacto"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="wb-list-scroll">
                  {filteredChats.map((chat) => (
                    <button key={chat.chatId} type="button" className={`wb-chat-item ${activeChat?.chatId === chat.chatId ? 'active' : ''}`} onClick={() => openChat(chat)}>
                      <div className="wb-avatar-wrap">
                        {chat.photoUrl ? (
                          <img src={chat.photoUrl} alt={chat.name || chat.phone || chat.chatId} className="wb-avatar-img" />
                        ) : (
                          <div className="wb-avatar-fallback">{getInitials(chat.name || chat.phone)}</div>
                        )}
                      </div>
                      <div className="wb-chat-item-body">
                        <div className="wb-chat-item-name">{chat.name || chat.phone || chat.chatId}</div>
                        <div className="wb-chat-item-prev">{chat.lastMessagePreview || 'Sin mensajes'}</div>
                      </div>
                      <div className="wb-chat-item-meta">
                        <div className="wb-chat-item-time">{formatHour(chat.lastMessageAt)}</div>
                        {!!chat.unreadCount && <div className="wb-unread">{chat.unreadCount}</div>}
                      </div>
                    </button>
                  ))}
                  {!filteredChats.length && <div className="wb-empty">No hay chats.</div>}
                  {chatsCursor && (
                    <button type="button" className="wb-secondary" disabled={loadingChats} onClick={() => loadChats(chatsCursor, true)}>
                      {loadingChats ? 'Cargando...' : 'Cargar más chats'}
                    </button>
                  )}
                </div>
              </aside>

              <section className="wb-chat-main">
                {!activeChat && <div className="wb-empty-main">Selecciona un chat</div>}
                {activeChat && (
                  <>
                    <header className="wb-chat-header">
                      <div className="wb-avatar-wrap">
                        {activeChat.photoUrl ? (
                          <img src={activeChat.photoUrl} alt={activeChat.name || activeChat.phone || activeChat.chatId} className="wb-avatar-img" />
                        ) : (
                          <div className="wb-avatar-fallback">{getInitials(activeChat.name || activeChat.phone)}</div>
                        )}
                      </div>
                      <div>
                        <div className="wb-chat-title">{activeChat.name || activeChat.phone || activeChat.chatId}</div>
                        <div className="wb-chat-sub">{activeChat.phone || activeChat.chatId}</div>
                      </div>
                    </header>

                    <div className="wb-messages" ref={messagesRef} onScroll={onMessagesScroll}>
                      {loadingMessages && <div className="wb-small-note">Cargando mensajes...</div>}
                      {messages.map((msg) => {
                        const kind = mediaKindFromType(msg.type, msg.mimeType);
                        return (
                          <article key={msg.providerMessageId} className={`wb-msg ${msg.direction === 'incoming' ? 'incoming' : 'outgoing'}`}>
                            <div className="wb-msg-bubble">
                              {!!msg.text && <div className="wb-msg-text">{msg.text}</div>}
                              {!!msg.mediaUrl && (
                                <div className="wb-msg-media">
                                  {kind === 'image' && <img src={msg.mediaUrl} alt={msg.fileName || 'imagen'} className="wb-media-image" />}
                                  {kind === 'video' && <video src={msg.mediaUrl} controls className="wb-media-video" />}
                                  {kind === 'audio' && <audio src={msg.mediaUrl} controls className="wb-media-audio" />}
                                  {kind === 'document' && <a href={msg.mediaUrl} target="_blank" rel="noreferrer">📄 {msg.fileName || 'Documento'}</a>}
                                </div>
                              )}
                              <div className="wb-msg-meta">
                                <span>{formatHour(msg.timestamp)}</span>
                                <span>{statusLabel(msg.status)}</span>
                                {msg.status === 'failed' && (
                                  <button type="button" className="wb-retry" onClick={() => retryMessage(msg.providerMessageId)}>Reintentar</button>
                                )}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>

                    <div className="wb-compose">
                      <input
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Escribe un mensaje"
                        className="wb-input"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                      />
                      <button type="button" className="wb-secondary" onClick={() => fileInputRef.current?.click()}>📎 Adjuntar</button>
                      <button type="button" className="wb-secondary" onClick={() => audioInputRef.current?.click()}>🎤 Audio</button>
                      <button type="button" className="wb-primary" disabled={isSending} onClick={sendMessage}>{isSending ? 'Enviando...' : 'Enviar'}</button>
                      <input ref={fileInputRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx" hidden onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                      <input ref={audioInputRef} type="file" accept="audio/*" hidden onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                    </div>

                    {(selectedFile || uploadProgress > 0) && (
                      <div className="wb-upload-preview">
                        {selectedFile && <div>Archivo: <strong>{selectedFile.name}</strong> ({Math.ceil(selectedFile.size / 1024)} KB)</div>}
                        {uploadProgress > 0 && uploadProgress < 100 && (
                          <div className="wb-progress-wrap">
                            <div className="wb-progress-bar" style={{ width: `${uploadProgress}%` }} />
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </section>
            </section>
          )}

          {tab === 'templates' && (
            <section className="wb-section">
              <h2>Plantillas</h2>
              <p>Mensajes y botones rápidos reutilizables.</p>
              <div className="wb-cards">
                {templates.map((tpl) => (
                  <article key={tpl.id} className="wb-card">
                    <h3>{tpl.name}</h3>
                    <p>{tpl.body}</p>
                    <div className="wb-tags">
                      {(tpl.quickButtons || []).map((b) => <span key={b}>{b}</span>)}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {tab === 'triggers' && (
            <section className="wb-section">
              <h2>Disparadores</h2>
              <p>Tipo SellerChat: keyword/contains/equals, nuevo chat o etiqueta.</p>
              <div className="wb-trigger-create">
                <input className="wb-input" value={newTriggerName} onChange={(e) => setNewTriggerName(e.target.value)} placeholder="Nombre del disparador" />
                <button type="button" className="wb-primary" onClick={createTrigger}>Crear disparador</button>
              </div>
              <div className="wb-table">
                <div className="wb-row wb-head">
                  <div>Nombre</div>
                  <div>Condiciones</div>
                  <div>Acciones</div>
                  <div>Estado</div>
                </div>
                {triggers.map((t) => (
                  <div key={t.id} className="wb-row">
                    <div>{t.name}</div>
                    <div><code>{JSON.stringify(t.conditions || {})}</code></div>
                    <div><code>{JSON.stringify(t.actions || {})}</code></div>
                    <div>
                      <button type="button" className={`wb-toggle ${t.isActive ? 'on' : 'off'}`} onClick={() => toggleTrigger(t)}>
                        {t.isActive ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                ))}
                {!triggers.length && <div className="wb-empty">No hay disparadores.</div>}
              </div>
            </section>
          )}

          {tab === 'config' && (
            <section className="wb-section">
              <h2>Conexión y sincronización</h2>
              <label className="wb-checkbox-row">
                <input type="checkbox" checked={syncLast15Days} onChange={(e) => setSyncLast15Days(e.target.checked)} />
                <span>Sincronizar últimos 15 días (default ON)</span>
              </label>
              <div className="wb-actions">
                <button type="button" className="wb-primary" onClick={startSync}>Iniciar sincronización</button>
                <button type="button" className="wb-secondary" onClick={cancelSync} disabled={!syncJob || syncJob.status !== 'running'}>Cancelar</button>
              </div>
              {syncJob && (
                <div className="wb-sync-box">
                  <div><strong>Estado:</strong> {syncJob.status}</div>
                  <div><strong>Ventana:</strong> desde {formatDate(syncJob.startDate)}</div>
                  <div><strong>Progreso:</strong> {syncJob.progress || 0}% ({syncJob.processedChats || 0}/{syncJob.totalChats || 0})</div>
                  <div className="wb-progress-wrap">
                    <div className="wb-progress-bar" style={{ width: `${syncJob.progress || 0}%` }} />
                  </div>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
      {toast && <div className="wb-toast">{toast}</div>}
    </div>
  );
}
