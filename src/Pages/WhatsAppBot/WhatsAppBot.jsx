import React, { useState, useEffect, useRef } from 'react'
import './WhatsAppBot.css'
import Header from '../Header/Header'

const BU = '/api/whatsapp'
const H = { 'x-secret': 'sanate_secret_2025', 'Content-Type': 'application/json' }
const N8N_WH = 'https://oasiss.app.n8n.cloud/webhook/whatsapp-sanate'

const FLOW_NODES = {
  bienvenida: [
    { id: 'n1', x: 200, y: 50,  type: 'trigger',   icon: '📩', color: 'b', title: 'Mensaje recibido',    desc: 'Primer mensaje del usuario' },
    { id: 'n2', x: 200, y: 155, type: 'condition',  icon: '🔍', color: 'a', title: '¿Es nuevo contacto?', desc: 'Verifica si es primera vez' },
    { id: 'n3', x: 70,  y: 265, type: 'message',    icon: '👋', color: 'g', title: 'Bienvenida',          desc: '¡Hola {nombre}! Bienvenido 👋' },
    { id: 'n4', x: 330, y: 265, type: 'message',    icon: '🔄', color: 'g', title: 'Retorno',             desc: '¡Qué bueno verte de nuevo!' },
    { id: 'n5', x: 200, y: 372, type: 'menu',       icon: '📋', color: 'b', title: 'Menú principal',     desc: '🛍️ Productos | 📦 Pedidos | 🛟 Soporte' },
    { id: 'n6', x: 70,  y: 468, type: 'action',     icon: '🔗', color: 'p', title: '→ Guardar',           desc: 'Guardar contacto en CRM' },
    { id: 'n7', x: 330, y: 468, type: 'end',        icon: '🔚', color: 'r', title: 'Fin',                 desc: 'Conversación finalizada' },
  ],
  carrito: [
    { id: 'n1', x: 200, y: 45,  type: 'trigger',   icon: '🛒', color: 'b', title: 'Carrito abandonado', desc: '>24h sin comprar' },
    { id: 'n2', x: 200, y: 150, type: 'message',   icon: '🔔', color: 'g', title: 'Recordatorio',       desc: 'Oye! Dejaste algo en tu carrito 🛒' },
    { id: 'n3', x: 200, y: 250, type: 'condition', icon: '🔀', color: 'a', title: '¿Respondió?',        desc: 'Verificar interacción' },
    { id: 'n4', x: 60,  y: 355, type: 'action',    icon: '💳', color: 'g', title: '→ Compra',           desc: 'sanate.store/checkout' },
    { id: 'n5', x: 340, y: 355, type: 'message',   icon: '⏰', color: 'b', title: 'Follow-up 48h',      desc: 'Último recordatorio' },
    { id: 'n6', x: 200, y: 455, type: 'end',       icon: '✅', color: 'g', title: 'Fin',                desc: 'Archivar' },
  ],
  soporte: [
    { id: 'n1', x: 200, y: 50,  type: 'trigger',   icon: '🛟', color: 'b', title: 'Soporte',         desc: 'Keyword: soporte/ayuda' },
    { id: 'n2', x: 200, y: 150, type: 'message',   icon: '🤖', color: 'g', title: 'Bot responde',    desc: 'Describe tu problema' },
    { id: 'n3', x: 200, y: 250, type: 'condition', icon: '🔀', color: 'a', title: '¿Resuelto?',      desc: 'Bot | Humano' },
    { id: 'n4', x: 70,  y: 355, type: 'action',    icon: '🔕', color: 'a', title: '→ Agente',        desc: 'Desactivar bot' },
    { id: 'n5', x: 330, y: 355, type: 'message',   icon: '✅', color: 'g', title: 'Confirmación',    desc: '¿Algo más?' },
    { id: 'n6', x: 200, y: 455, type: 'end',       icon: '🔚', color: 'r', title: 'Fin',             desc: 'Cerrar caso' },
  ],
}

const FLOW_CONNS = {
  bienvenida: [{ f: 'n1', t: 'n2' }, { f: 'n2', t: 'n3' }, { f: 'n2', t: 'n4' }, { f: 'n3', t: 'n5' }, { f: 'n4', t: 'n5' }, { f: 'n5', t: 'n6' }, { f: 'n5', t: 'n7' }],
  carrito:    [{ f: 'n1', t: 'n2' }, { f: 'n2', t: 'n3' }, { f: 'n3', t: 'n4' }, { f: 'n3', t: 'n5' }, { f: 'n4', t: 'n6' }, { f: 'n5', t: 'n6' }],
  soporte:    [{ f: 'n1', t: 'n2' }, { f: 'n2', t: 'n3' }, { f: 'n3', t: 'n4' }, { f: 'n3', t: 'n5' }, { f: 'n4', t: 'n6' }, { f: 'n5', t: 'n6' }],
}

const TAG_STYLES = {
  message:   { background: '#d1fae5', color: '#065f46' },
  menu:      { background: '#dbeafe', color: '#1d4ed8' },
  condition: { background: '#fef3c7', color: '#92400e' },
  action:    { background: '#ede9fe', color: '#5b21b6' },
  trigger:   { background: '#dbeafe', color: '#1d4ed8' },
  end:       { background: '#fee2e2', color: '#b91c1c' },
  delay:     { background: '#f3f4f6', color: '#6b7280' },
  gpt:       { background: '#d1fae5', color: '#065f46' },
}
const TAG_NAMES = { message: 'MSG', menu: 'MENÚ', condition: 'COND', action: 'ACTION', trigger: 'TRIG', end: 'FIN', delay: 'WAIT', gpt: 'GPT' }

const FLOWS_LIST = [
  { key: 'bienvenida', name: 'Flujo de bienvenida',    trigger: '📩 Primer mensaje', badge: 'badge-blue',  runs: 123, ctr: '58%', date: '20/02/2026' },
  { key: 'carrito',    name: 'Flujo carrito',           trigger: '🛒 Carrito',        badge: 'badge-amber', runs: 230, ctr: '63%', date: '20/02/2026' },
  { key: 'soporte',    name: 'Flujo soporte',           trigger: '🔑 Keyword',        badge: 'badge-green', runs: 84,  ctr: '47%', date: '20/02/2026' },
]

const COLORS_AV  = ['#d1fae5', '#dbeafe', '#ede9fe', '#fef3c7', '#fee2e2']
const COLORS_TXT = ['#065f46', '#1d4ed8', '#5b21b6', '#92400e', '#b91c1c']

export default function WhatsAppBot() {
  const [page,        setPage]        = useState('overview')
  const [status,      setStatus]      = useState('disconnected')
  const [phone,       setPhone]       = useState('')
  const [qrDataUrl,   setQrDataUrl]   = useState(null)
  const [chats,       setChats]       = useState([])
  const [active,      setActive]      = useState(null)
  const [msgs,        setMsgs]        = useState([])
  const [inp,         setInp]         = useState('')
  const [toast,       setToast]       = useState('')
  const [search,      setSearch]      = useState('')
  const [chatFilter,  setChatFilter]  = useState('todos')
  const [showContact, setShowContact] = useState(false)
  const [n8nOk,       setN8nOk]       = useState(null)
  const [curFlow,     setCurFlow]     = useState('bienvenida')
  const [builderOpen, setBuilderOpen] = useState(false)
  const [nodes,       setNodes]       = useState([])
  const [selNode,     setSelNode]     = useState(null)
  const [zoom,        setZoom]        = useState(0.88)
  const [pan,         setPan]         = useState({ x: 30, y: 18 })
  const [cfgTab,      setCfgTab]      = useState('conn')

  const msgsRef    = useRef(null)
  const qrRef      = useRef(null)
  const dragRef    = useRef({})

  const tip    = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const scroll = ()  => setTimeout(() => { if (msgsRef.current) msgsRef.current.scrollTop = 9999 }, 100)

  // Polling global
  useEffect(() => { // eslint-disable-line
    ping()
    const t = setInterval(ping, 5000)
    return () => clearInterval(t)
  }, []) // eslint-disable-line

  // Polling mensajes cuando hay chat activo
  useEffect(() => { // eslint-disable-line
    if (!active || status !== 'connected') return
    const t = setInterval(() => loadM(active.id, false), 3000)
    return () => clearInterval(t)
  }, [active, status]) // eslint-disable-line

  // Polling QR agresivo cuando estamos en página conexion esperando QR
  useEffect(() => { // eslint-disable-line
    if (page !== 'conexion' || (status !== 'connecting' && status !== 'qr')) return
    const t = setInterval(loadQR, 2500)
    return () => clearInterval(t)
  }, [page, status]) // eslint-disable-line

  // Redibujar QR en canvas cuando cambia la URL o la página
  useEffect(() => {
    if (page !== 'conexion') return
    setTimeout(() => {
      if (qrDataUrl) drawQR(qrDataUrl)
      else drawQRWaiting()
    }, 60)
  }, [page, qrDataUrl]) // eslint-disable-line

  // Drag nodes
  useEffect(() => {
    const onMove = e => {
      const d = dragRef.current
      if (!d.id) return
      setNodes(prev => prev.map(n =>
        n.id === d.id
          ? { ...n, x: (e.clientX - d.ox - pan.x) / zoom, y: (e.clientY - d.oy - pan.y) / zoom }
          : n
      ))
    }
    const onUp = () => { dragRef.current = {} }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [zoom, pan])

  // ─── API ──────────────────────────────────────────
  async function ping() {
    try {
      const d = await (await fetch(BU + '/status', { headers: H })).json()
      setStatus(d.status)
      setPhone(d.phone || '')
      if (d.status === 'connected') { try { await loadC() } catch {} }
      else if (d.status === 'connecting' || d.status === 'qr') { setStatus('connecting'); loadQR() }
    } catch { setStatus('disconnected') }
  }

  async function loadQR() {
    try {
      const d = await (await fetch(BU + '/qr', { headers: H })).json()
      if (d.qr) { setQrDataUrl(d.qr); drawQR(d.qr) }
      else drawQRWaiting()
    } catch { drawQRWaiting() }
  }

  function drawQR(dataUrl) {
    const canvas = qrRef.current
    if (!canvas) return
    const img = new Image()
    img.onload = () => {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, 200, 200)
      ctx.drawImage(img, 0, 0, 200, 200)
    }
    img.src = dataUrl
  }

  // Canvas de espera: esqueleto estilo QR con bordes punteados
  function drawQRWaiting() {
    const canvas = qrRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d'), s = 200
    ctx.fillStyle = '#f9fafb'; ctx.fillRect(0, 0, s, s)
    ctx.setLineDash([5, 4]); ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 1.5
    ctx.strokeRect(6, 6, s - 12, s - 12); ctx.setLineDash([])
    // Tres esquinas finder-pattern estilo QR
    for (const [x, y] of [[14,14],[142,14],[14,142]]) {
      ctx.fillStyle='#e5e7eb'; ctx.fillRect(x,y,44,44)
      ctx.fillStyle='#f9fafb'; ctx.fillRect(x+6,y+6,32,32)
      ctx.fillStyle='#d1d5db'; ctx.fillRect(x+11,y+11,22,22)
    }
    // Patrón de puntos central
    ctx.fillStyle = '#e5e7eb'
    for (let r=0;r<6;r++) for (let c=0;c<6;c++)
      if ((r+c)%2===0) ctx.fillRect(74+c*9, 74+r*9, 7, 7)
  }

  async function loadC() {
    const d = await (await fetch(BU + '/chats', { headers: H })).json()
    setChats(d.chats || [])
  }

  async function loadM(id, sc = true) {
    try {
      const d = await (await fetch(BU + '/messages/' + id, { headers: H })).json()
      setMsgs(d.messages || [])
      if (sc) scroll()
    } catch {}
  }

  async function openChat(c) {
    setActive(c); setShowContact(true)
    await loadM(c.id)
    setChats(p => p.map(x => x.id === c.id ? { ...x, unread: 0 } : x))
  }

  async function send() {
    if (!inp.trim() || !active || status !== 'connected') return
    try {
      await fetch(BU + '/send', {
        method: 'POST', headers: H,
        body: JSON.stringify({ to: active.phone || '+' + active.id, message: inp })
      })
      const t = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
      setMsgs(p => [...p, { dir: 's', txt: inp, time: t }]); setInp(''); scroll()
    } catch { tip('⚠️ Error al enviar') }
  }

  async function regenerateQR() {
    setQrDataUrl(null); setStatus('connecting')
    drawQRWaiting()
    try { await fetch(BU + '/logout', { method: 'POST', headers: H }) } catch {}
    tip('🔄 Generando QR...')
    setTimeout(loadQR, 2000)
    setTimeout(loadQR, 4500)
  }

  async function disconnectWA() {
    try { await fetch(BU + '/logout', { method: 'POST', headers: H }) } catch {}
    setStatus('disconnected'); setPhone(''); setChats([]); setActive(null); setQrDataUrl(null)
    tip('🔌 WhatsApp desconectado')
  }

  async function checkN8N() {
    setN8nOk(null); tip('🔍 Verificando n8n...')
    try {
      await fetch('https://oasiss.app.n8n.cloud', { mode: 'no-cors' })
      setN8nOk(true); tip('✅ n8n Cloud operativo')
    } catch { setN8nOk(false); tip('⚠️ n8n no responde') }
  }

  function copyText(txt) {
    navigator.clipboard?.writeText(txt).then(() => tip('📋 Copiado!')).catch(() => tip('📋 ' + txt.substring(0, 40)))
  }

  // ─── FLOW BUILDER ─────────────────────────────────
  function openBuilder(name) {
    setCurFlow(name)
    setNodes(JSON.parse(JSON.stringify(FLOW_NODES[name] || FLOW_NODES.bienvenida)))
    setSelNode(null); setZoom(0.88); setPan({ x: 30, y: 18 })
    setBuilderOpen(true)
  }

  function startDrag(e, id) {
    e.stopPropagation()
    const n = nodes.find(n => n.id === id); if (!n) return
    dragRef.current = { id, ox: e.clientX - (n.x * zoom + pan.x), oy: e.clientY - (n.y * zoom + pan.y) }
    e.preventDefault()
  }

  // Derived
  const unread    = chats.filter(c => c.unread > 0).length
  const statusCls = { connected: 'si-connected', connecting: 'si-connecting', disconnected: 'si-disconnected' }

  const filteredChats = chats.filter(c => {
    const matchSearch = !search || (c.name || c.phone || '').toLowerCase().includes(search.toLowerCase())
    const matchFilter = chatFilter === 'todos' || (chatFilter === 'sin leer' && c.unread > 0)
    return matchSearch && matchFilter
  })

  const NAV = [
    { id: 'overview',  label: '📊 Resumen',           section: 'Principal',       badge: 0 },
    { id: 'chat',      label: '💬 Chats',              section: 'Principal',       badge: unread },
    { id: 'flujos',    label: '🌊 Flujos',             section: 'Automatización',  badge: 0 },
    { id: 'templates', label: '📋 Plantillas',         section: 'Automatización',  badge: 0 },
    { id: 'conexion',  label: '📱 Conexión WhatsApp',  section: 'Configuración',   badge: 0 },
    { id: 'config',    label: '⚙️ Ajustes',            section: 'Configuración',   badge: 0 },
  ]

  function goPage(id) {
    setPage(id)
    setBuilderOpen(false)
    if (id === 'conexion') {
      if (status === 'connecting' || status === 'qr') setTimeout(loadQR, 100)
      else if (status === 'disconnected') setTimeout(regenerateQR, 200)
      // if connected: nada que mostrar
    }
  }

  // SVG connections for builder
  function renderSvgConns() {
    return (FLOW_CONNS[curFlow] || []).map((conn, i) => {
      const fn = nodes.find(n => n.id === conn.f)
      const tn = nodes.find(n => n.id === conn.t)
      if (!fn || !tn) return null
      const fw = 160 * zoom, fh = 78 * zoom
      const fx = fn.x * zoom + pan.x + fw / 2
      const fy = fn.y * zoom + pan.y + fh
      const tx = tn.x * zoom + pan.x + fw / 2
      const ty = tn.y * zoom + pan.y
      const cy = (fy + ty) / 2
      return (
        <path
          key={i}
          d={`M${fx},${fy} C${fx},${cy} ${tx},${cy} ${tx},${ty}`}
          fill="none" stroke="#94a3b8" strokeWidth="1.5"
          markerEnd="url(#wbarr)"
        />
      )
    })
  }

  return (
    <div className="containerGrid">
      <Header />
      <div className="wbv5-root">

        {/* ── SIDEBAR ── */}
        <div className="wbv5-sidebar">
          <div className="wbv5-sb-logo">
            <div className="wbv5-sb-icon">🌿</div>
            <div>
              <div className="wbv5-sb-name">Sanate Bot</div>
              <div className="wbv5-sb-sub">WhatsApp Automation</div>
            </div>
          </div>
          <div className="wbv5-sb-acct">
            <div className="wbv5-sb-ava">S</div>
            <div className="wbv5-sb-uname">sanate.store</div>
          </div>
          {['Principal', 'Automatización', 'Configuración'].map(section => (
            <React.Fragment key={section}>
              <div className="wbv5-nav-section">{section}</div>
              {NAV.filter(i => i.section === section).map(item => (
                <div
                  key={item.id}
                  className={`wbv5-nav-item ${page === item.id ? 'active' : ''}`}
                  onClick={() => goPage(item.id)}
                >
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge > 0 && <span className="wbv5-nav-badge">{item.badge}</span>}
                </div>
              ))}
            </React.Fragment>
          ))}
          <div className="wbv5-sb-footer">
            <div className={`wbv5-status-badge ${status === 'connected' ? 'green' : status === 'connecting' ? 'amber' : 'gray'}`}>
              {status === 'connected' ? '✅ Conectado' : status === 'connecting' ? '⏳ Conectando...' : '⏳ No conectado'}
            </div>
            <div style={{ marginTop: '.3rem', fontSize: '.62rem', color: '#9ca3af' }}>n8n + Baileys</div>
          </div>
        </div>

        {/* ── MAIN ── */}
        <div className="wbv5-main">
          <div className="wbv5-topbar">
            <div className="wbv5-topbar-title">
              {builderOpen
                ? FLOWS_LIST.find(f => f.key === curFlow)?.name || curFlow
                : NAV.find(i => i.id === page)?.label || page}
            </div>
            <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => goPage('conexion')}>
              📱 Estado WA
            </button>
          </div>

          {/* ══ OVERVIEW ══ */}
          {page === 'overview' && (
            <div className="wbv5-content">
              <div className="wbv5-stats-row">
                <div className="wbv5-stat-card">
                  <div className="wbv5-stat-val">{chats.length}</div>
                  <div className="wbv5-stat-lbl">Contactos totales</div>
                </div>
                <div className="wbv5-stat-card">
                  <div className="wbv5-stat-val">{chats.reduce((s, c) => s + (c.messages?.length || 0), 0) || 0}</div>
                  <div className="wbv5-stat-lbl">Mensajes recibidos</div>
                  <div className="wbv5-stat-chg">últimas 24h</div>
                </div>
                <div className="wbv5-stat-card">
                  <div className="wbv5-stat-val">3</div>
                  <div className="wbv5-stat-lbl">Flujos activos</div>
                  <div className="wbv5-stat-chg">✅ Operativos</div>
                </div>
                <div className="wbv5-stat-card">
                  <div className="wbv5-stat-val">—</div>
                  <div className="wbv5-stat-lbl">CTR promedio</div>
                </div>
              </div>
              <div className="wbv5-card">
                <div className="wbv5-card-hd">
                  <div className="wbv5-card-title">📱 Estado WhatsApp</div>
                  <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => goPage('conexion')}>Gestionar →</button>
                </div>
                <div className="wbv5-card-bd">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className={`wbv5-status-indicator ${statusCls[status]}`}>
                      <div className="wbv5-si-dot" />
                      <span>{status === 'connected' ? `✅ Conectado — ${phone}` : status === 'connecting' ? '⏳ Esperando escaneo del QR...' : 'Desconectado — escanea el QR para conectar'}</span>
                    </div>
                    {phone && <div style={{ fontSize: '.72rem', color: '#6b7280' }}>📱 {phone}</div>}
                  </div>
                </div>
              </div>
              <div className="wbv5-card">
                <div className="wbv5-card-hd">
                  <div className="wbv5-card-title">🔗 n8n Cloud</div>
                  <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={checkN8N}>🔍 Verificar</button>
                </div>
                <div className="wbv5-card-bd">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.4rem' }}>
                    <span className={`wbv5-badge ${n8nOk === true ? 'badge-green' : n8nOk === false ? 'badge-red' : 'badge-amber'}`}>
                      {n8nOk === true ? '✅ Online' : n8nOk === false ? '❌ Error' : '⏳ Pendiente'}
                    </span>
                    <span style={{ fontSize: '.72rem', color: '#6b7280' }}>https://oasiss.app.n8n.cloud</span>
                  </div>
                  <div style={{ fontSize: '.7rem', color: '#6b7280' }}>
                    Webhook: <code style={{ background: '#f3f4f6', padding: '.1rem .3rem', borderRadius: '4px' }}>{N8N_WH}</code>
                  </div>
                </div>
              </div>
              <div className="wbv5-card">
                <div className="wbv5-card-hd">
                  <div className="wbv5-card-title">⚡ Flujos recientes</div>
                  <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => goPage('flujos')}>Ver todos →</button>
                </div>
                <div style={{ padding: 0 }}>
                  <table className="wbv5-flows-table">
                    <thead><tr><th>Flujo</th><th>Ejecuciones</th><th>CTR</th><th>Estado</th></tr></thead>
                    <tbody>
                      {FLOWS_LIST.map(f => (
                        <tr key={f.key}>
                          <td><span className="wbv5-flow-link" onClick={() => { goPage('flujos'); openBuilder(f.key) }}>{f.name}</span></td>
                          <td>{f.runs}</td>
                          <td>{f.ctr}</td>
                          <td><span className="wbv5-badge badge-green">✅ Activo</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══ CHAT ══ */}
          {page === 'chat' && (
            <div className="wbv5-chat-wrap">
              <div className="wbv5-inbox-list">
                <div className="wbv5-il-header">
                  <input className="wbv5-il-search" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
                  <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={() => loadC().catch(() => {})}>🔄</button>
                </div>
                <div className="wbv5-il-filters">
                  {['todos', 'sin leer', 'bot'].map(f => (
                    <button key={f} className={`wbv5-il-filter ${chatFilter === f ? 'active' : ''}`} onClick={() => setChatFilter(f)}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="wbv5-il-convs">
                  {status !== 'connected' ? (
                    <div className="wbv5-empty-state">
                      <div style={{ fontSize: '1.5rem', marginBottom: '.4rem' }}>📱</div>
                      <div>Conecta WhatsApp para ver chats</div>
                      <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" style={{ marginTop: '.5rem' }} onClick={() => goPage('conexion')}>Conectar</button>
                    </div>
                  ) : filteredChats.length === 0 ? (
                    <div className="wbv5-empty-state">
                      <div style={{ fontSize: '1.5rem' }}>💬</div>
                      <div>Sin convesaciones</div>
                    </div>
                  ) : filteredChats.map((c, i) => (
                    <div key={c.id} className={`wbv5-conv-itm ${active?.id === c.id ? 'active' : ''}`} onClick={() => openChat(c)}>
                      <div className="wbv5-ci-ava" style={{ background: COLORS_AV[i % 5], color: COLORS_TXT[i % 5] }}>
                        {(c.name || '?').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="wbv5-ci-body">
                        <div className="wbv5-ci-name">{c.name || c.phone}</div>
                        <div className="wbv5-ci-prev">{c.preview || 'Sin mensajes'}</div>
                      </div>
                      <div className="wbv5-ci-meta">
                        <div className="wbv5-ci-time">{c.time || ''}</div>
                        {c.unread > 0 && <div className="wbv5-ci-badge">{c.unread}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="wbv5-chat-win">
                {!active ? (
                  <div className="wbv5-chat-empty">
                    <div style={{ fontSize: '1.8rem', marginBottom: '.5rem' }}>💬</div>
                    <div>Selecciona una conversación</div>
                  </div>
                ) : (
                  <>
                    <div className="wbv5-cw-header">
                      <div className="wbv5-cw-ava">{(active.name || '?').substring(0, 2).toUpperCase()}</div>
                      <div>
                        <div className="wbv5-cw-name">{active.name || active.phone}</div>
                        <div className="wbv5-cw-sub">🟢 WhatsApp</div>
                      </div>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '.4rem' }}>
                        <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => setShowContact(s => !s)}>📋 Datos</button>
                        <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm">🤖 Bot</button>
                      </div>
                    </div>
                    <div className="wbv5-cw-msgs" ref={msgsRef}>
                      {msgs.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '.72rem', padding: '2rem 0' }}>Sin mensajes aún</div>
                      ) : msgs.map((m, i) => (
                        <div key={i} className={`wbv5-msg ${m.dir}`}>
                          <div className="wbv5-msg-txt">{m.txt}</div>
                          <div className="wbv5-msg-time">{m.time}{m.dir === 's' ? ' ✓✓' : ''}</div>
                        </div>
                      ))}
                    </div>
                    <div className="wbv5-cw-input-bar">
                      <input
                        className="wbv5-cw-input" value={inp}
                        onChange={e => setInp(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && send()}
                        placeholder="Escribe un mensaje..."
                      />
                      <button className="wbv5-cw-send" onClick={send}>➤</button>
                    </div>
                  </>
                )}
              </div>
              {showContact && active && (
                <div className="wbv5-contact-pnl">
                  <div className="wbv5-cp-title">👤 Contacto</div>
                  <div className="wbv5-cp-row"><div className="wbv5-cp-lbl">Nombre</div><div className="wbv5-cp-val">{active.name || '—'}</div></div>
                  <div className="wbv5-cp-row"><div className="wbv5-cp-lbl">Teléfono</div><div className="wbv5-cp-val">{active.phone || '+' + active.id}</div></div>
                  <div className="wbv5-cp-row"><div className="wbv5-cp-lbl">Último mensaje</div><div className="wbv5-cp-val">{active.preview || '—'}</div></div>
                  <div className="wbv5-cp-row"><div className="wbv5-cp-lbl">Estado bot</div><div className="wbv5-cp-val"><span className="wbv5-badge badge-green">🤖 Activo</span></div></div>
                </div>
              )}
            </div>
          )}

          {/* ══ FLUJOS – LISTA ══ */}
          {page === 'flujos' && !builderOpen && (
            <div className="wbv5-content">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem' }}>
                <div>
                  <div style={{ fontSize: '.85rem', fontWeight: 800 }}>Flujos de conversación</div>
                  <div style={{ fontSize: '.68rem', color: '#6b7280' }}>Automatiza respuestas y enrutamiento de mensajes</div>
                </div>
                <button className="wbv5-btn wbv5-btn-green" onClick={() => tip('➕ Selecciona una plantilla abajo para crear tu flujo')}>+ Crear flujo</button>
              </div>
              <div className="wbv5-card">
                <div className="wbv5-card-hd"><div className="wbv5-card-title">Todos los flujos</div></div>
                <div style={{ padding: 0 }}>
                  <table className="wbv5-flows-table">
                    <thead>
                      <tr><th>Nombre</th><th>Disparador</th><th>Ejecuciones</th><th>CTR</th><th>Actualizado</th><th></th></tr>
                    </thead>
                    <tbody>
                      {FLOWS_LIST.map(f => (
                        <tr key={f.key}>
                          <td><span className="wbv5-flow-link" onClick={() => openBuilder(f.key)}>{f.name}</span></td>
                          <td><span className={`wbv5-badge ${f.badge}`}>{f.trigger}</span></td>
                          <td>{f.runs}</td>
                          <td>{f.ctr}</td>
                          <td style={{ fontSize: '.66rem', color: '#9ca3af' }}>{f.date}</td>
                          <td><button className="wbv5-flow-3btn" onClick={() => tip('⚙️ Próximamente: más opciones')}>⋯</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="wbv5-card">
                <div className="wbv5-card-hd">
                  <div className="wbv5-card-title">⚡ Plantillas rápidas</div>
                  <span style={{ fontSize: '.68rem', color: '#6b7280' }}>Haz clic para abrir el constructor</span>
                </div>
                <div className="wbv5-card-bd">
                  <div className="wbv5-tmpl-grid">
                    {[
                      { key: 'bienvenida', icon: '👋', name: 'Bienvenida',   desc: 'Primer mensaje + menú', bg: '#d1fae5' },
                      { key: 'carrito',    icon: '🛒', name: 'Carrito',      desc: 'Recuperar abandono',    bg: '#dbeafe' },
                      { key: 'soporte',    icon: '🛟', name: 'Soporte',      desc: 'Atención al cliente',   bg: '#ede9fe' },
                    ].map(t => (
                      <div key={t.key} className="wbv5-tmpl-card" onClick={() => openBuilder(t.key)}>
                        <div className="wbv5-tmpl-thumb" style={{ background: t.bg }}>{t.icon}</div>
                        <div className="wbv5-tmpl-info">
                          <div className="wbv5-tmpl-name">{t.name}</div>
                          <div className="wbv5-tmpl-desc">{t.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ FLUJOS – BUILDER ══ */}
          {page === 'flujos' && builderOpen && (
            <div className="wbv5-builder">
              <div className="wbv5-builder-header">
                <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => { setBuilderOpen(false); setSelNode(null) }}>← Flujos</button>
                <span style={{ fontSize: '.8rem', fontWeight: 700, marginLeft: '.5rem' }}>
                  {FLOWS_LIST.find(f => f.key === curFlow)?.name || curFlow}
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '.4rem' }}>
                  <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => tip('⚙️ Configuración avanzada próximamente')}>⚙️ Avanzado</button>
                  <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={() => tip('✅ Flujo guardado en n8n')}>💾 Guardar</button>
                  <button className="wbv5-btn wbv5-btn-blue wbv5-btn-sm" onClick={() => tip('🚀 Flujo publicado y activo')}>Publicar ▶</button>
                </div>
              </div>
              <div className="wbv5-builder-area">
                <div className="wbv5-canvas-wrap">
                  <div className="wbv5-bcanvas">
                    <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible', width: '100%', height: '100%' }}>
                      <defs>
                        <marker id="wbarr" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
                          <path d="M0,0 L7,3.5 L0,7 Z" fill="#94a3b8" />
                        </marker>
                      </defs>
                      {renderSvgConns()}
                    </svg>
                    {nodes.map(n => (
                      <div
                        key={n.id}
                        className={`wbv5-fnode ${selNode === n.id ? 'sel' : ''}`}
                        style={{ left: n.x * zoom + pan.x, top: n.y * zoom + pan.y, transform: `scale(${zoom})`, transformOrigin: 'top left' }}
                        onMouseDown={e => startDrag(e, n.id)}
                        onClick={e => { e.stopPropagation(); setSelNode(n.id) }}
                      >
                        <div className="wbv5-fn-top">
                          <div className={`wbv5-fn-ico ${n.color}`}>{n.icon}</div>
                          <div className="wbv5-fn-title">{n.title}</div>
                          <span className="wbv5-fn-tag" style={TAG_STYLES[n.type] || TAG_STYLES.message}>
                            {TAG_NAMES[n.type] || n.type.toUpperCase()}
                          </span>
                        </div>
                        <div className="wbv5-fn-desc">{n.desc}</div>
                        <div className="wbv5-fn-port in" />
                        <div className="wbv5-fn-port out" />
                      </div>
                    ))}
                  </div>
                  <div className="wbv5-zoom-btns">
                    <button className="wbv5-zoom-btn" onClick={() => setZoom(z => Math.min(z + .12, 2.5))}>+</button>
                    <button className="wbv5-zoom-btn" onClick={() => { setZoom(0.88); setPan({ x: 30, y: 18 }) }}>⊡</button>
                    <button className="wbv5-zoom-btn" onClick={() => setZoom(z => Math.max(z - .12, .22))}>−</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ PLANTILLAS ══ */}
          {page === 'templates' && (
            <div className="wbv5-content">
              <div style={{ fontSize: '.85rem', fontWeight: 800, marginBottom: '.2rem' }}>📋 Plantillas de mensajes</div>
              <div style={{ fontSize: '.68rem', color: '#6b7280', marginBottom: '.85rem' }}>Plantillas aprobadas por Meta para envío masivo</div>
              <div className="wbv5-card">
                <div className="wbv5-card-hd">
                  <div className="wbv5-card-title">Mis plantillas</div>
                  <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={() => tip('➕ Nueva plantilla — próximamente')}>+ Nueva</button>
                </div>
                <div className="wbv5-card-bd">
                  <div className="wbv5-empty-state" style={{ padding: '2.5rem 1rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>📋</div>
                    <div style={{ fontSize: '.85rem', fontWeight: 700, color: '#6b7280', marginBottom: '.3rem' }}>Sin plantillas aún</div>
                    <div style={{ fontSize: '.72rem', color: '#9ca3af' }}>Crea plantillas aprobadas por Meta para enviar mensajes masivos</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ CONEXIÓN ══ */}
          {page === 'conexion' && (
            <div className="wbv5-content">
              <div style={{ fontSize: '.85rem', fontWeight: 800, marginBottom: '.2rem' }}>📱 Conexión WhatsApp</div>
              <div style={{ fontSize: '.68rem', color: '#6b7280', marginBottom: '.85rem' }}>Vincula tu WhatsApp al bot para recibir y enviar mensajes automáticamente</div>
              <div className="wbv5-qr-card">
                <div className="wbv5-qr-box">
                  <canvas ref={qrRef} width="200" height="200" />
                </div>
                <div className="wbv5-qr-info">
                  <h3>{status === 'connected' ? '✅ WhatsApp Conectado' : qrDataUrl ? '📱 Escanea con WhatsApp' : '📱 Vincula tu WhatsApp'}</h3>
                  <p>{status === 'connected'
                    ? 'Tu WhatsApp está vinculado. Los mensajes se procesan automáticamente.'
                    : 'Escanea el código QR con tu WhatsApp para conectar el bot y recibir mensajes en tiempo real.'
                  }</p>
                  {status !== 'connected' && (
                    <div className="wbv5-qr-steps">
                      <span>1️⃣ Abre WhatsApp en tu teléfono</span>
                      <span>2️⃣ Ve a Dispositivos vinculados</span>
                      <span>3️⃣ Toca "Vincular un dispositivo"</span>
                      <span>4️⃣ Escanea el código QR</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="wbv5-card">
                <div className="wbv5-card-hd"><div className="wbv5-card-title">Estado de conexión</div></div>
                <div className="wbv5-card-bd">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.6rem', flexWrap: 'wrap' }}>
                    <div className={`wbv5-status-indicator ${statusCls[status]}`}>
                      <div className="wbv5-si-dot" />
                      <span>
                        {status === 'connected'
                          ? `✅ Conectado — ${phone}`
                          : status === 'connecting'
                          ? '⏳ Esperando escaneo...'
                          : 'Desconectado — escanea el QR para conectar'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                      <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={ping}>🔍 Verificar</button>
                      <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={regenerateQR}>🔄 Nuevo QR</button>
                      {status === 'connected' && (
                        <button className="wbv5-btn wbv5-btn-red wbv5-btn-sm" onClick={disconnectWA}>Desconectar</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="wbv5-conn-grid">
                {[
                  { num: '1', title: 'Escanea el QR',         desc: 'Usa WhatsApp en tu teléfono → Dispositivos vinculados → Vincular dispositivo' },
                  { num: '2', title: 'Confirma conexión',     desc: 'El indicador cambiará a verde. Los mensajes comenzarán a llegar al chat.' },
                  { num: '3', title: 'Los flujos se activan', desc: 'n8n procesa los mensajes y ejecuta los flujos automáticamente.' },
                  { num: '4', title: 'Chats disponibles',     desc: 'Los chats del dispositivo se cargan en la sección Chat en tiempo real.' },
                ].map(s => (
                  <div key={s.num} className="wbv5-conn-step">
                    <div className="wbv5-conn-step-num">{s.num}</div>
                    <div>
                      <div className="wbv5-conn-step-title">{s.title}</div>
                      <div className="wbv5-conn-step-desc">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="wbv5-card">
                <div className="wbv5-card-hd">
                  <div className="wbv5-card-title">🔗 Configuración n8n</div>
                  <span className={`wbv5-badge ${n8nOk === true ? 'badge-green' : 'badge-amber'}`}>
                    {n8nOk === true ? '✅ Conectado' : '⏳ Pendiente'}
                  </span>
                </div>
                <div className="wbv5-card-bd">
                  <div className="wbv5-form-row">
                    <div className="wbv5-form-lbl">N8N Cloud URL</div>
                    <div className="wbv5-code-box" onClick={() => copyText('https://oasiss.app.n8n.cloud')}>
                      https://oasiss.app.n8n.cloud <span style={{ marginLeft: 'auto', fontSize: '.65rem' }}>📋</span>
                    </div>
                  </div>
                  <div className="wbv5-form-row">
                    <div className="wbv5-form-lbl">Webhook WhatsApp (producción)</div>
                    <div className="wbv5-code-box" onClick={() => copyText(N8N_WH)}>
                      {N8N_WH} <span style={{ marginLeft: 'auto', fontSize: '.65rem' }}>📋</span>
                    </div>
                  </div>
                  <div className="wbv5-form-row">
                    <div className="wbv5-form-lbl">Flujo activo en n8n</div>
                    <div className="wbv5-code-box">
                      🟢 Sanate - WhatsApp Bot <span style={{ marginLeft: 'auto' }}><span className="wbv5-badge badge-green">Activo</span></span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '.5rem', marginTop: '.3rem' }}>
                    <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={checkN8N}>🔍 Verificar conexión</button>
                    <button className="wbv5-btn wbv5-btn-blue wbv5-btn-sm" onClick={() => window.open('https://oasiss.app.n8n.cloud', '_blank')}>Abrir n8n ↗</button>
                  </div>
                </div>
              </div>
              <div className="wbv5-card">
                <div className="wbv5-card-hd">
                  <div className="wbv5-card-title">📘 Facebook & Instagram</div>
                  <span className="wbv5-badge badge-amber">⏳ Pendiente</span>
                </div>
                <div className="wbv5-card-bd">
                  <div style={{ fontSize: '.72rem', color: '#6b7280', lineHeight: 1.6 }}>
                    La integración estará disponible después de confirmar que el QR de WhatsApp conecta correctamente.
                    <br /><br /><strong>Paso siguiente:</strong> Conecta WhatsApp → verifica mensajes en Chat → luego habilita Facebook/Instagram.
                  </div>
                  <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" style={{ marginTop: '.6rem' }} onClick={() => tip('📘 Próximamente: Facebook e Instagram')}>Configurar después →</button>
                </div>
              </div>
            </div>
          )}

          {/* ══ CONFIG ══ */}
          {page === 'config' && (
            <div className="wbv5-content">
              <div style={{ fontSize: '.85rem', fontWeight: 800, marginBottom: '.85rem' }}>⚙️ Ajustes</div>
              <div className="wbv5-cfg-layout">
                <div className="wbv5-cfg-sidebar">
                  <div className="wbv5-cfg-section-title" style={{ borderTop: 'none' }}>General</div>
                  {[
                    { id: 'conn',    label: '📱 Conexión WA' },
                    { id: 'rapidas', label: '⚡ Respuestas rápidas' },
                    { id: 'horario', label: '🕐 Horario atención' },
                    { id: 'equipo',  label: '👥 Equipo' },
                  ].map(t => (
                    <div key={t.id} className={`wbv5-cfg-nav ${cfgTab === t.id ? 'active' : ''}`} onClick={() => setCfgTab(t.id)}>{t.label}</div>
                  ))}
                  <div className="wbv5-cfg-section-title">Técnico</div>
                  {[
                    { id: 'api',      label: '🔑 API & Tokens' },
                    { id: 'bot',      label: '🤖 Comportamiento bot' },
                    { id: 'empresa',  label: '🏢 Empresa' },
                  ].map(t => (
                    <div key={t.id} className={`wbv5-cfg-nav ${cfgTab === t.id ? 'active' : ''}`} onClick={() => setCfgTab(t.id)}>{t.label}</div>
                  ))}
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '.75rem' }}>

                  {/* Conexión WA */}
                  {cfgTab === 'conn' && (
                    <div className="wbv5-card">
                      <div className="wbv5-card-hd">
                        <div className="wbv5-card-title">📱 WhatsApp / Baileys</div>
                        <span className={`wbv5-badge ${status === 'connected' ? 'badge-green' : status === 'connecting' ? 'badge-amber' : 'badge-red'}`}>
                          {status === 'connected' ? '✅ Conectado' : status === 'connecting' ? '⏳ Conectando' : '❌ Desconectado'}
                        </span>
                      </div>
                      <div className="wbv5-card-bd">
                        <div className="wbv5-form-row"><div className="wbv5-form-lbl">Server URL (Baileys)</div><input className="wbv5-form-input" defaultValue="/api/whatsapp" /></div>
                        <div className="wbv5-form-row"><div className="wbv5-form-lbl">Secret Token</div><input className="wbv5-form-input" type="password" defaultValue="sanate_secret_2025" /></div>
                        <div className="wbv5-form-row">
                          <div className="wbv5-form-lbl">Webhook n8n (producción)</div>
                          <div className="wbv5-code-box" onClick={() => copyText(N8N_WH)}>{N8N_WH} <span style={{ marginLeft: 'auto' }}>📋</span></div>
                        </div>
                        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                          <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={() => tip('✅ Configuración guardada')}>💾 Guardar</button>
                          <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => goPage('conexion')}>📱 Ir a Conexión →</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Respuestas rápidas */}
                  {cfgTab === 'rapidas' && (
                    <div className="wbv5-card">
                      <div className="wbv5-card-hd">
                        <div className="wbv5-card-title">⚡ Respuestas rápidas</div>
                        <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={() => tip('➕ Respuesta añadida')}>+ Añadir</button>
                      </div>
                      <div className="wbv5-card-bd">
                        <div style={{ fontSize: '.71rem', color: '#6b7280', marginBottom: '.75rem' }}>
                          Palabras clave que el bot detecta y responde automáticamente.
                        </div>
                        {[
                          { key: 'hola',     resp: '¡Hola! 👋 Bienvenido a Sanate. ¿En qué te ayudo?' },
                          { key: 'precio',   resp: 'Nuestros precios están en sanate.store 🛍️' },
                          { key: 'horario',  resp: 'Atendemos L-V 8am-6pm y Sáb 9am-2pm 🕐' },
                          { key: 'soporte',  resp: 'Conectando con un agente... 🛟 Un momento.' },
                          { key: 'pedido',   resp: 'Para rastrear tu pedido envíanos tu número de orden 📦' },
                        ].map((r, i) => (
                          <div key={i} style={{ display: 'flex', gap: '.5rem', alignItems: 'center', padding: '.45rem 0', borderBottom: '1px solid #f3f4f6' }}>
                            <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: '6px', padding: '.15rem .5rem', fontSize: '.65rem', fontWeight: 700, flexShrink: 0, minWidth: '60px', textAlign: 'center' }}>
                              {r.key}
                            </span>
                            <span style={{ flex: 1, fontSize: '.72rem', color: '#374151' }}>{r.resp}</span>
                            <button className="wbv5-flow-3btn" onClick={() => tip('✏️ Editar respuesta — próximamente')}>✏️</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Horario */}
                  {cfgTab === 'horario' && (
                    <div className="wbv5-card">
                      <div className="wbv5-card-hd"><div className="wbv5-card-title">🕐 Horario de atención</div></div>
                      <div className="wbv5-card-bd">
                        <div style={{ fontSize: '.71rem', color: '#6b7280', marginBottom: '.75rem' }}>
                          Fuera de horario el bot responde automáticamente con un mensaje de ausencia.
                        </div>
                        {[
                          { dia: 'Lunes – Viernes', desde: '08:00', hasta: '18:00', activo: true },
                          { dia: 'Sábado',           desde: '09:00', hasta: '14:00', activo: true },
                          { dia: 'Domingo',          desde: '',      hasta: '',      activo: false },
                        ].map((h, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '.5rem 0', borderBottom: '1px solid #f3f4f6' }}>
                            <span style={{ width: '130px', fontSize: '.74rem', fontWeight: 600, color: '#374151', flexShrink: 0 }}>{h.dia}</span>
                            {h.activo ? (
                              <>
                                <input className="wbv5-form-input" defaultValue={h.desde} style={{ width: '75px' }} />
                                <span style={{ fontSize: '.7rem', color: '#9ca3af' }}>→</span>
                                <input className="wbv5-form-input" defaultValue={h.hasta} style={{ width: '75px' }} />
                                <span className="wbv5-badge badge-green" style={{ marginLeft: 'auto' }}>Activo</span>
                              </>
                            ) : (
                              <span className="wbv5-badge badge-red" style={{ marginLeft: 'auto' }}>Cerrado</span>
                            )}
                          </div>
                        ))}
                        <div className="wbv5-form-row" style={{ marginTop: '.85rem' }}>
                          <div className="wbv5-form-lbl">Mensaje fuera de horario</div>
                          <textarea className="wbv5-form-input" rows={2} defaultValue="¡Hola! Estamos fuera de horario. Te respondemos el próximo día hábil. 🌙" style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                        </div>
                        <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={() => tip('✅ Horario guardado')}>💾 Guardar horario</button>
                      </div>
                    </div>
                  )}

                  {/* Equipo */}
                  {cfgTab === 'equipo' && (
                    <div className="wbv5-card">
                      <div className="wbv5-card-hd">
                        <div className="wbv5-card-title">👥 Agentes del equipo</div>
                        <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={() => tip('➕ Invitar agente — próximamente')}>+ Invitar</button>
                      </div>
                      <div className="wbv5-card-bd">
                        {[
                          { nombre: 'Admin Principal', email: 'admin@sanate.store', rol: 'Admin', online: true },
                          { nombre: 'Agente Ventas',   email: 'ventas@sanate.store', rol: 'Agente', online: false },
                        ].map((a, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.7rem', padding: '.55rem 0', borderBottom: '1px solid #f3f4f6' }}>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', fontWeight: 800, flexShrink: 0 }}>
                              {a.nombre.substring(0,2).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '.76rem', fontWeight: 700, color: '#111827' }}>{a.nombre}</div>
                              <div style={{ fontSize: '.64rem', color: '#9ca3af' }}>{a.email}</div>
                            </div>
                            <span className={`wbv5-badge ${a.rol === 'Admin' ? 'badge-blue' : 'badge-green'}`}>{a.rol}</span>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.online ? '#25d366' : '#e5e7eb', flexShrink: 0 }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* API & Tokens */}
                  {cfgTab === 'api' && (
                    <div className="wbv5-card">
                      <div className="wbv5-card-hd"><div className="wbv5-card-title">🔑 API & Tokens</div></div>
                      <div className="wbv5-card-bd">
                        <div style={{ fontSize: '.71rem', color: '#6b7280', marginBottom: '.75rem' }}>Variables necesarias en n8n → Settings → n8n variables:</div>
                        <div className="wbv5-form-row"><div className="wbv5-form-lbl">WA_PHONE_ID (Meta Business)</div>
                          <div className="wbv5-code-box" onClick={() => tip('📋 Copia desde Meta Developer Portal')}>Tu Phone Number ID de Meta <span style={{ marginLeft: 'auto', fontSize: '.6rem' }}>📋</span></div>
                        </div>
                        <div className="wbv5-form-row"><div className="wbv5-form-lbl">WA_TOKEN (acceso WhatsApp API)</div>
                          <div className="wbv5-code-box" onClick={() => tip('📋 Copia desde Meta Developer Portal')}>Tu Access Token permanente <span style={{ marginLeft: 'auto', fontSize: '.6rem' }}>📋</span></div>
                        </div>
                        <div className="wbv5-form-row"><div className="wbv5-form-lbl">BAILEYS_SECRET</div>
                          <div className="wbv5-code-box" onClick={() => copyText('sanate_secret_2025')}>sanate_secret_2025 <span style={{ marginLeft: 'auto', fontSize: '.6rem' }}>📋</span></div>
                        </div>
                        <div className="wbv5-form-row"><div className="wbv5-form-lbl">N8N_WEBHOOK</div>
                          <div className="wbv5-code-box" onClick={() => copyText(N8N_WH)}>{N8N_WH} <span style={{ marginLeft: 'auto', fontSize: '.6rem' }}>📋</span></div>
                        </div>
                        <button className="wbv5-btn wbv5-btn-blue wbv5-btn-sm" onClick={() => window.open('https://oasiss.app.n8n.cloud', '_blank')}>Abrir n8n ↗</button>
                      </div>
                    </div>
                  )}

                  {/* Comportamiento bot */}
                  {cfgTab === 'bot' && (
                    <div className="wbv5-card">
                      <div className="wbv5-card-hd"><div className="wbv5-card-title">🤖 Comportamiento del bot</div></div>
                      <div className="wbv5-card-bd">
                        {[
                          { label: 'Activar bot automáticamente', desc: 'El bot responde a todos los mensajes entrantes', on: true },
                          { label: 'Guardar contactos en CRM', desc: 'Guarda nombre y teléfono de cada nuevo contacto', on: true },
                          { label: 'Notificaciones en tiempo real', desc: 'Recibe notificaciones al llegar mensajes nuevos', on: true },
                          { label: 'Modo silencioso fuera de horario', desc: 'El bot envía mensaje de ausencia y no notifica', on: false },
                          { label: 'Transferir a humano cuando lo pide', desc: 'Desactiva el bot si el usuario escribe "agente"', on: true },
                        ].map((opt, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.55rem 0', borderBottom: '1px solid #f3f4f6' }}>
                            <div>
                              <div style={{ fontSize: '.76rem', fontWeight: 600, color: '#111827' }}>{opt.label}</div>
                              <div style={{ fontSize: '.64rem', color: '#9ca3af', marginTop: '.05rem' }}>{opt.desc}</div>
                            </div>
                            <span
                              className={`wbv5-badge ${opt.on ? 'badge-green' : 'badge-red'}`}
                              style={{ cursor: 'pointer', flexShrink: 0, marginLeft: '1rem' }}
                              onClick={() => tip(`⚙️ ${opt.label} — ${opt.on ? 'desactivado' : 'activado'}`)}
                            >
                              {opt.on ? '✅ ON' : '❌ OFF'}
                            </span>
                          </div>
                        ))}
                        <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" style={{ marginTop: '.75rem' }} onClick={() => tip('✅ Configuración guardada')}>💾 Guardar</button>
                      </div>
                    </div>
                  )}

                  {/* Empresa */}
                  {cfgTab === 'empresa' && (
                    <div className="wbv5-card">
                      <div className="wbv5-card-hd"><div className="wbv5-card-title">🏢 Datos de empresa</div></div>
                      <div className="wbv5-card-bd">
                        <div className="wbv5-form-row"><div className="wbv5-form-lbl">Nombre de la empresa</div><input className="wbv5-form-input" defaultValue="Sanate" /></div>
                        <div className="wbv5-form-row"><div className="wbv5-form-lbl">Sitio web</div><input className="wbv5-form-input" defaultValue="sanate.store" /></div>
                        <div className="wbv5-form-row"><div className="wbv5-form-lbl">WhatsApp principal</div><input className="wbv5-form-input" defaultValue={phone || '+57 ...'} /></div>
                        <div className="wbv5-form-row"><div className="wbv5-form-lbl">Email de soporte</div><input className="wbv5-form-input" defaultValue="soporte@sanate.store" /></div>
                        <div className="wbv5-form-row">
                          <div className="wbv5-form-lbl">Mensaje de bienvenida (plantilla)</div>
                          <textarea className="wbv5-form-input" rows={3} defaultValue="¡Hola {nombre}! 👋 Bienvenido a Sanate. Puedo ayudarte con:\n🛍️ Productos y precios\n📦 Estado de pedidos\n🛟 Soporte técnico\n\n¿Qué necesitas?" style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                        </div>
                        <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={() => tip('✅ Datos guardados')}>💾 Guardar datos</button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {toast && <div className="wbv5-toast">{toast}</div>}
    </div>
  )
}
