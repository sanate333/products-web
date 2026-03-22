import React, { useState, useEffect, useCallback, useRef } from 'react'
import './MarketingRedes.css'
import Header from '../Header/Header'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faInstagram, faFacebookF, faFacebookMessenger, faTiktok } from '@fortawesome/free-brands-svg-icons'
import {
  faPlug, faSync, faTrash, faCommentDots, faRocket, faClock,
  faShieldAlt, faChartLine, faPause, faPlay, faPlus, faEdit,
  faTrashAlt, faExclamationTriangle, faCheckCircle, faInfoCircle,
  faStore, faCalendarAlt, faEye, faBan, faHistory
} from '@fortawesome/free-solid-svg-icons'

const SUPABASE_URL = 'https://lvmeswlvszsmvgaasazs.supabase.co'
const SUPABASE_KEY = (function () {
  try { return localStorage.getItem('sb_anon_key') || '' } catch { return '' }
})()
const sbHeaders = () => ({
  apikey: SUPABASE_KEY || window.__SUPABASE_ANON_KEY__ || '',
  Authorization: `Bearer ${SUPABASE_KEY || window.__SUPABASE_ANON_KEY__ || ''}`,
  'Content-Type': 'application/json',
})

const POSTING_LIMITS = {
  new_account: { daily: 1, weekly: 3, spacing_hours: 24, label: 'Cuenta nueva (< 30 dias)' },
  growing: { daily: 3, weekly: 15, spacing_hours: 4, label: 'Cuenta en crecimiento (1-3 meses)' },
  established: { daily: 5, weekly: 30, spacing_hours: 2.5, label: 'Cuenta establecida (3+ meses)' },
  veteran: { daily: 8, weekly: 50, spacing_hours: 1.5, label: 'Cuenta veterana (6+ meses, verificada)' },
}

const PLATFORM_RULES = {
  facebook_marketplace: {
    name: 'Facebook Marketplace',
    maxDaily: 5,
    minSpacingMin: 150,
    tips: [
      'Espaciar publicaciones cada 2-3 horas minimo',
      'Usar fotos diferentes para cada listing',
      'Escribir descripciones unicas (no copiar/pegar)',
      'No republicar el mismo producto inmediatamente',
      'Mantener el perfil completo y verificado',
      'Interactuar organicamente (likes, comentarios) entre publicaciones',
    ],
    riskFactors: [
      'Publicar muchos items en pocos minutos',
      'Usar la misma foto o descripcion repetidamente',
      'Publicar mas de 10 items por dia',
      'Cuenta nueva sin historial',
      'Precios sospechosamente bajos',
    ],
  },
  instagram: {
    name: 'Instagram',
    maxDaily: 3,
    minSpacingMin: 180,
    tips: [
      'Maximo 3 publicaciones al dia en feed',
      'Historias: hasta 10 por dia sin riesgo',
      'Usar hashtags variados (no repetir set exacto)',
      'Espaciar posts por al menos 3 horas',
      'Evitar acciones masivas (follows/unfollows/likes)',
    ],
    riskFactors: [
      'Mas de 5 posts en feed por dia',
      'Mismos hashtags en cada post',
      'Actividad tipo bot (follows masivos)',
      'Links sospechosos en bio o posts',
    ],
  },
  facebook_page: {
    name: 'Facebook Page',
    maxDaily: 5,
    minSpacingMin: 120,
    tips: [
      'Publicar 3-5 veces al dia maximo',
      'Mezclar tipos de contenido (fotos, videos, texto)',
      'Responder comentarios para mejorar engagement',
      'Programar posts en horas pico (9am, 12pm, 6pm)',
    ],
    riskFactors: [
      'Mas de 10 posts por dia',
      'Solo contenido promocional sin variedad',
      'No responder a interacciones',
    ],
  },
}

export default function MarketingRedes() {
  const [connections, setConnections] = useState([])
  const [igMessages, setIgMessages] = useState([])
  const [igContacts, setIgContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('connections')
  const [scheduledPosts, setScheduledPosts] = useState([])
  const [publishLog, setPublishLog] = useState([])
  const [autoPublishEnabled, setAutoPublishEnabled] = useState(false)
  const [accountAge, setAccountAge] = useState('established')
  const [showNewPost, setShowNewPost] = useState(false)
  const [newPost, setNewPost] = useState({ title: '', description: '', price: '', images: '', platform: 'facebook_marketplace', category: 'general' })
  const [dailyStats, setDailyStats] = useState({ posted: 0, limit: 5, nextSlot: null })
  const schedulerRef = useRef(null)

  useEffect(() => {
    loadData()
    loadScheduledPosts()
    loadPublishLog()
    return () => { if (schedulerRef.current) clearInterval(schedulerRef.current) }
  }, [])

  useEffect(() => {
    const limits = POSTING_LIMITS[accountAge]
    const todayPosts = publishLog.filter(p => {
      const d = new Date(p.published_at || p.created_at)
      const today = new Date()
      return d.toDateString() === today.toDateString()
    })
    const nextSlotTime = calculateNextSlot(todayPosts, limits)
    setDailyStats({ posted: todayPosts.length, limit: limits.daily, nextSlot: nextSlotTime })
  }, [publishLog, accountAge])

  useEffect(() => {
    if (schedulerRef.current) clearInterval(schedulerRef.current)
    if (!autoPublishEnabled) return
    schedulerRef.current = setInterval(() => { checkAndPublishNext() }, 60000)
    return () => clearInterval(schedulerRef.current)
  }, [autoPublishEnabled, scheduledPosts, dailyStats])

  async function loadData() {
    setLoading(true)
    try {
      const [connRes, msgRes, contactRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/oasis_social_connections?select=*&order=connected_at.desc`, { headers: sbHeaders() }),
        fetch(`${SUPABASE_URL}/rest/v1/oasis_ig_messages?select=*&order=created_at.desc&limit=20`, { headers: sbHeaders() }),
        fetch(`${SUPABASE_URL}/rest/v1/oasis_ig_contacts?select=*&order=updated_at.desc`, { headers: sbHeaders() }),
      ])
      if (connRes.ok) setConnections(await connRes.json())
      if (msgRes.ok) setIgMessages(await msgRes.json())
      if (contactRes.ok) setIgContacts(await contactRes.json())
    } catch (e) { console.warn('MarketingRedes: error loading data', e) }
    setLoading(false)
  }

  async function loadScheduledPosts() {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/oasis_scheduled_posts?select=*&order=scheduled_at.asc&status=eq.pending`, { headers: sbHeaders() })
      if (res.ok) { const data = await res.json(); setScheduledPosts(Array.isArray(data) ? data : []) }
    } catch (e) { console.warn('Error loading scheduled posts:', e); setScheduledPosts([]) }
  }

  async function loadPublishLog() {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/oasis_publish_log?select=*&order=created_at.desc&limit=50`, { headers: sbHeaders() })
      if (res.ok) { const data = await res.json(); setPublishLog(Array.isArray(data) ? data : []) }
    } catch (e) { console.warn('Error loading publish log:', e); setPublishLog([]) }
  }

  function calculateNextSlot(todayPosts, limits) {
    if (todayPosts.length >= limits.daily) return null
    if (todayPosts.length === 0) return new Date()
    const lastPost = todayPosts.sort((a, b) => new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at))[0]
    const lastTime = new Date(lastPost.published_at || lastPost.created_at)
    const nextTime = new Date(lastTime.getTime() + limits.spacing_hours * 3600000)
    return nextTime > new Date() ? nextTime : new Date()
  }

  function getBanRiskLevel() {
    const limits = POSTING_LIMITS[accountAge]
    const ratio = dailyStats.posted / limits.daily
    if (ratio >= 1) return { level: 'critical', label: 'LIMITE ALCANZADO', color: '#ef4444', icon: faBan }
    if (ratio >= 0.8) return { level: 'high', label: 'Riesgo Alto', color: '#f97316', icon: faExclamationTriangle }
    if (ratio >= 0.5) return { level: 'medium', label: 'Riesgo Moderado', color: '#eab308', icon: faExclamationTriangle }
    return { level: 'low', label: 'Seguro', color: '#22c55e', icon: faShieldAlt }
  }

  async function checkAndPublishNext() {
    const limits = POSTING_LIMITS[accountAge]
    if (dailyStats.posted >= limits.daily) return
    if (!dailyStats.nextSlot || new Date() < dailyStats.nextSlot) return
    const nextPost = scheduledPosts.find(p => p.status === 'pending')
    if (!nextPost) return
    await publishPost(nextPost)
  }

  async function publishPost(post) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/social-api/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY || window.__SUPABASE_ANON_KEY__ || '', Authorization: `Bearer ${SUPABASE_KEY || window.__SUPABASE_ANON_KEY__ || ''}` },
        body: JSON.stringify({ platform: post.platform, title: post.title, description: post.description, price: post.price, images: post.images ? post.images.split(',').map(s => s.trim()) : [], category: post.category }),
      })
      const result = res.ok ? await res.json().catch(() => ({})) : {}
      const success = res.ok && !result.error
      await fetch(`${SUPABASE_URL}/rest/v1/oasis_scheduled_posts?id=eq.${post.id}`, {
        method: 'PATCH', headers: sbHeaders(),
        body: JSON.stringify({ status: success ? 'published' : 'failed', published_at: new Date().toISOString(), result_data: JSON.stringify(result) }),
      })
      await fetch(`${SUPABASE_URL}/rest/v1/oasis_publish_log`, {
        method: 'POST', headers: sbHeaders(),
        body: JSON.stringify({ platform: post.platform, post_title: post.title, status: success ? 'success' : 'failed', error_message: result.error || null, published_at: new Date().toISOString() }),
      })
      loadScheduledPosts()
      loadPublishLog()
    } catch (e) { console.error('Publish error:', e) }
  }

  async function scheduleNewPost() {
    if (!newPost.title || !newPost.description) { alert('Titulo y descripcion son obligatorios.'); return }
    const limits = POSTING_LIMITS[accountAge]
    const scheduledAt = dailyStats.nextSlot || new Date()
    const existingScheduled = scheduledPosts.length
    const adjustedTime = new Date(scheduledAt.getTime() + existingScheduled * limits.spacing_hours * 3600000)
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/oasis_scheduled_posts`, {
        method: 'POST', headers: sbHeaders(),
        body: JSON.stringify({ platform: newPost.platform, title: newPost.title, description: newPost.description, price: newPost.price || null, images: newPost.images || null, category: newPost.category || 'general', status: 'pending', scheduled_at: adjustedTime.toISOString(), created_at: new Date().toISOString() }),
      })
      setNewPost({ title: '', description: '', price: '', images: '', platform: 'facebook_marketplace', category: 'general' })
      setShowNewPost(false)
      loadScheduledPosts()
    } catch (e) { console.error('Error scheduling post:', e); alert('Error al programar la publicacion.') }
  }

  async function deleteScheduledPost(id) {
    if (!window.confirm('Eliminar esta publicacion programada?')) return
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/oasis_scheduled_posts?id=eq.${id}`, { method: 'DELETE', headers: sbHeaders() })
      loadScheduledPosts()
    } catch (e) { console.error(e) }
  }

  async function publishNow(post) {
    const limits = POSTING_LIMITS[accountAge]
    if (dailyStats.posted >= limits.daily) { alert(`Limite diario alcanzado (${limits.daily} publicaciones). Espera hasta manana para evitar un ban.`); return }
    if (dailyStats.nextSlot && new Date() < dailyStats.nextSlot) {
      const wait = Math.ceil((dailyStats.nextSlot - new Date()) / 60000)
      alert(`Debes esperar ${wait} minutos entre publicaciones para evitar deteccion de spam. Proximo slot disponible: ${dailyStats.nextSlot.toLocaleTimeString()}`)
      return
    }
    await publishPost(post)
  }

  function getContactName(senderId) {
    const c = igContacts.find(ct => ct.ig_user_id === senderId)
    return c?.username || c?.name || senderId?.substring(0, 8) || '?'
  }

  function timeAgo(ts) {
    if (!ts) return ''
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'ahora'
    if (mins < 60) return `hace ${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `hace ${hrs}h`
    return `hace ${Math.floor(hrs / 24)}d`
  }

  function formatScheduledTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    return d.toLocaleDateString('es-CO', { weekday: 'short', month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  }

  const platforms = [
    { key: 'instagram', label: 'Instagram', icon: faInstagram, colorClass: 'instagram', connection: connections.find(c => c.platform === 'instagram') },
    { key: 'facebook', label: 'Facebook', icon: faFacebookF, colorClass: 'facebook', connection: connections.find(c => c.platform === 'facebook') },
    { key: 'messenger', label: 'Messenger', icon: faFacebookMessenger, colorClass: 'messenger', connection: connections.find(c => c.platform === 'messenger') },
    { key: 'tiktok', label: 'TikTok', icon: faTiktok, colorClass: 'tiktok', connection: null },
  ]

  async function connectInstagram() {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/social-api/auth/instagram/url`)
      if (res.ok) { const data = await res.json(); if (data.url) window.open(data.url, '_blank'); else alert('No se pudo obtener la URL de Instagram.') }
      else alert('Error al conectar con Instagram.')
    } catch (e) { console.error(e); alert('Error de red al conectar Instagram.') }
  }

  async function disconnectPlatform(id) {
    if (!window.confirm('Desconectar esta red social?')) return
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/oasis_social_connections?id=eq.${id}`, {
        method: 'PATCH', headers: sbHeaders(),
        body: JSON.stringify({ status: 'disconnected', disconnected_at: new Date().toISOString() }),
      })
      loadData()
    } catch (e) { console.error(e) }
  }

  const riskInfo = getBanRiskLevel()
  const limits = POSTING_LIMITS[accountAge]

  return (
    <>
      <Header />
      <div className="marketing-redes">
        <div className="mr-page-header">
          <div>
            <h2>Marketing Redes</h2>
            <p className="subtitle">Auto-publicador inteligente con proteccion anti-ban.</p>
          </div>
          <div className="mr-risk-badge" style={{ background: riskInfo.color + '18', color: riskInfo.color, borderColor: riskInfo.color }}>
            <FontAwesomeIcon icon={riskInfo.icon} />
            <span>{riskInfo.label}</span>
            <span className="mr-risk-count">{dailyStats.posted}/{dailyStats.limit} hoy</span>
          </div>
        </div>

        <div className="mr-tabs">
          <button className={`mr-tab ${activeTab === 'connections' ? 'active' : ''}`} onClick={() => setActiveTab('connections')}>
            <FontAwesomeIcon icon={faPlug} /> Conexiones
          </button>
          <button className={`mr-tab ${activeTab === 'autopublisher' ? 'active' : ''}`} onClick={() => setActiveTab('autopublisher')}>
            <FontAwesomeIcon icon={faRocket} /> Auto-Publicador
          </button>
          <button className={`mr-tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
            <FontAwesomeIcon icon={faChartLine} /> Historial
          </button>
          <button className={`mr-tab ${activeTab === 'rules' ? 'active' : ''}`} onClick={() => setActiveTab('rules')}>
            <FontAwesomeIcon icon={faShieldAlt} /> Reglas Anti-Ban
          </button>
        </div>

        {activeTab === 'connections' && (
          <>
            <div className="mr-cards">
              {platforms.map(p => {
                const conn = p.connection
                const isConnected = conn && conn.status === 'connected'
                return (
                  <div className="mr-card" key={p.key}>
                    <div className="mr-card-header">
                      <div className={`mr-card-icon ${p.colorClass}`}>
                        <FontAwesomeIcon icon={p.icon} />
                      </div>
                      <div>
                        <div className="mr-card-title">{p.label}</div>
                        <div className="mr-card-status">
                          <span className={`dot ${isConnected ? 'connected' : conn ? conn.status : 'disconnected'}`} />
                          {isConnected ? (conn.ig_username ? `@${conn.ig_username}` : 'Conectado') : conn ? (conn.status === 'expired' ? 'Token expirado' : 'Desconectado') : 'No conectado'}
                        </div>
                      </div>
                    </div>
                    {isConnected && (
                      <div className="mr-card-stats">
                        <span><strong>{igContacts.length}</strong> contactos</span>
                        <span><strong>{igMessages.filter(m => m.platform === p.key).length}</strong> mensajes</span>
                      </div>
                    )}
                    <div className="mr-card-actions">
                      {!isConnected ? (
                        <button className="mr-btn mr-btn-primary" onClick={() => { if (p.key === 'instagram') connectInstagram(); else alert(`Conexion con ${p.label} disponible pronto.`) }}>
                          <FontAwesomeIcon icon={faPlug} /> Conectar
                        </button>
                      ) : (
                        <>
                          <button className="mr-btn mr-btn-secondary" onClick={loadData}><FontAwesomeIcon icon={faSync} /> Sincronizar</button>
                          <button className="mr-btn mr-btn-danger" onClick={() => disconnectPlatform(conn.id)}><FontAwesomeIcon icon={faTrash} /></button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <h3 className="mr-section-title"><FontAwesomeIcon icon={faCommentDots} /> Mensajes Recientes</h3>
            {loading ? (
              <div className="mr-messages-empty">Cargando...</div>
            ) : igMessages.length === 0 ? (
              <div className="mr-messages-empty">No hay mensajes de redes sociales aun. Conecta una cuenta para empezar a recibir mensajes.</div>
            ) : (
              <div className="mr-messages-list">
                {igMessages.slice(0, 15).map((msg, i) => (
                  <div className="mr-msg-item" key={msg.id || i}>
                    <div className="mr-msg-avatar">{getContactName(msg.sender_id).charAt(0).toUpperCase()}</div>
                    <div className="mr-msg-content">
                      <div className="mr-msg-sender">{getContactName(msg.sender_id)} <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: 8, fontSize: '0.8rem' }}>{msg.platform || 'instagram'}</span></div>
                      <div className="mr-msg-text">{msg.content}</div>
                    </div>
                    <div className="mr-msg-time">{timeAgo(msg.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'autopublisher' && (
          <div className="mr-autopub">
            <div className="mr-ap-dashboard">
              <div className="mr-ap-stat-card">
                <div className="mr-ap-stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}><FontAwesomeIcon icon={faStore} /></div>
                <div><div className="mr-ap-stat-value">{dailyStats.posted}</div><div className="mr-ap-stat-label">Publicadas hoy</div></div>
              </div>
              <div className="mr-ap-stat-card">
                <div className="mr-ap-stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}><FontAwesomeIcon icon={faShieldAlt} /></div>
                <div><div className="mr-ap-stat-value">{Math.max(0, dailyStats.limit - dailyStats.posted)}</div><div className="mr-ap-stat-label">Disponibles</div></div>
              </div>
              <div className="mr-ap-stat-card">
                <div className="mr-ap-stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}><FontAwesomeIcon icon={faClock} /></div>
                <div><div className="mr-ap-stat-value">{dailyStats.nextSlot ? (new Date() >= dailyStats.nextSlot ? 'Ahora' : dailyStats.nextSlot.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })) : 'Manana'}</div><div className="mr-ap-stat-label">Proximo slot</div></div>
              </div>
              <div className="mr-ap-stat-card">
                <div className="mr-ap-stat-icon" style={{ background: '#f3e8ff', color: '#9333ea' }}><FontAwesomeIcon icon={faCalendarAlt} /></div>
                <div><div className="mr-ap-stat-value">{scheduledPosts.length}</div><div className="mr-ap-stat-label">En cola</div></div>
              </div>
            </div>

            <div className="mr-ap-controls">
              <div className="mr-ap-control-group">
                <label>Tipo de cuenta:</label>
                <select value={accountAge} onChange={e => setAccountAge(e.target.value)} className="mr-select">
                  {Object.entries(POSTING_LIMITS).map(([key, val]) => (
                    <option key={key} value={key}>{val.label} - Max {val.daily}/dia</option>
                  ))}
                </select>
              </div>
              <div className="mr-ap-control-group">
                <label>Auto-publicador:</label>
                <button className={`mr-btn ${autoPublishEnabled ? 'mr-btn-danger' : 'mr-btn-primary'}`} onClick={() => setAutoPublishEnabled(!autoPublishEnabled)}>
                  <FontAwesomeIcon icon={autoPublishEnabled ? faPause : faPlay} />
                  {autoPublishEnabled ? ' Pausar' : ' Activar'}
                </button>
                {autoPublishEnabled && (<span className="mr-ap-active-badge"><span className="mr-pulse" /> Activo - publicando automaticamente</span>)}
              </div>
            </div>

            <div className="mr-ap-safety-banner" style={{ borderLeftColor: riskInfo.color }}>
              <FontAwesomeIcon icon={riskInfo.icon} style={{ color: riskInfo.color }} />
              <div>
                <strong>Estado: {riskInfo.label}</strong>
                <p>
                  {riskInfo.level === 'critical' && 'Has alcanzado el limite diario. No se publicara nada mas hoy para proteger tu cuenta.'}
                  {riskInfo.level === 'high' && 'Te acercas al limite. Se recomienda no publicar mas hoy.'}
                  {riskInfo.level === 'medium' && `Puedes publicar ${dailyStats.limit - dailyStats.posted} mas hoy. Espaciando cada ${limits.spacing_hours}h.`}
                  {riskInfo.level === 'low' && `Todo en orden. Limite: ${limits.daily} publicaciones/dia con espaciado de ${limits.spacing_hours}h.`}
                </p>
              </div>
            </div>

            <div className="mr-ap-actions-bar">
              <button className="mr-btn mr-btn-primary" onClick={() => setShowNewPost(true)}><FontAwesomeIcon icon={faPlus} /> Nueva publicacion</button>
              <button className="mr-btn mr-btn-secondary" onClick={() => { loadScheduledPosts(); loadPublishLog() }}><FontAwesomeIcon icon={faSync} /> Actualizar</button>
            </div>

            {showNewPost && (
              <div className="mr-ap-new-post">
                <h4>Programar nueva publicacion</h4>
                <div className="mr-ap-form">
                  <div className="mr-ap-form-row">
                    <label>Plataforma:</label>
                    <select value={newPost.platform} onChange={e => setNewPost({ ...newPost, platform: e.target.value })} className="mr-select">
                      <option value="facebook_marketplace">Facebook Marketplace</option>
                      <option value="instagram">Instagram</option>
                      <option value="facebook_page">Facebook Page</option>
                    </select>
                  </div>
                  <div className="mr-ap-form-row">
                    <label>Titulo:</label>
                    <input type="text" value={newPost.title} onChange={e => setNewPost({ ...newPost, title: e.target.value })} placeholder="Nombre del producto o publicacion" className="mr-input" />
                  </div>
                  <div className="mr-ap-form-row">
                    <label>Descripcion:</label>
                    <textarea value={newPost.description} onChange={e => setNewPost({ ...newPost, description: e.target.value })} placeholder="Descripcion detallada y unica (evita copiar/pegar)" className="mr-textarea" rows={3} />
                  </div>
                  <div className="mr-ap-form-row-half">
                    <div>
                      <label>Precio (COP):</label>
                      <input type="text" value={newPost.price} onChange={e => setNewPost({ ...newPost, price: e.target.value })} placeholder="50000" className="mr-input" />
                    </div>
                    <div>
                      <label>Categoria:</label>
                      <select value={newPost.category} onChange={e => setNewPost({ ...newPost, category: e.target.value })} className="mr-select">
                        <option value="general">General</option>
                        <option value="ropa">Ropa y Accesorios</option>
                        <option value="electronica">Electronica</option>
                        <option value="hogar">Hogar</option>
                        <option value="salud">Salud y Belleza</option>
                        <option value="deportes">Deportes</option>
                      </select>
                    </div>
                  </div>
                  <div className="mr-ap-form-row">
                    <label>URLs de imagenes (separadas por coma):</label>
                    <input type="text" value={newPost.images} onChange={e => setNewPost({ ...newPost, images: e.target.value })} placeholder="https://ejemplo.com/foto1.jpg, https://ejemplo.com/foto2.jpg" className="mr-input" />
                  </div>
                  <div className="mr-ap-form-actions">
                    <button className="mr-btn mr-btn-primary" onClick={scheduleNewPost}><FontAwesomeIcon icon={faCalendarAlt} /> Programar</button>
                    <button className="mr-btn mr-btn-secondary" onClick={() => setShowNewPost(false)}>Cancelar</button>
                  </div>
                  <div className="mr-ap-form-hint">
                    <FontAwesomeIcon icon={faInfoCircle} /> Se publicara automaticamente en el proximo slot disponible
                    ({dailyStats.nextSlot ? (new Date() >= dailyStats.nextSlot ? 'ahora' : formatScheduledTime(dailyStats.nextSlot)) : 'manana'}).
                    Espaciado: {limits.spacing_hours}h entre posts.
                  </div>
                </div>
              </div>
            )}

            <h4 className="mr-section-title" style={{ marginTop: 24 }}><FontAwesomeIcon icon={faClock} /> Cola de publicaciones ({scheduledPosts.length})</h4>

            {scheduledPosts.length === 0 ? (
              <div className="mr-messages-empty">No hay publicaciones programadas. Crea una nueva para empezar.</div>
            ) : (
              <div className="mr-scheduled-list">
                {scheduledPosts.map((post, i) => (
                  <div className="mr-scheduled-item" key={post.id || i}>
                    <div className="mr-scheduled-number">{i + 1}</div>
                    <div className="mr-scheduled-content">
                      <div className="mr-scheduled-title">{post.title}</div>
                      <div className="mr-scheduled-meta">
                        <span className={`mr-platform-badge ${post.platform}`}>{post.platform === 'facebook_marketplace' ? 'Marketplace' : post.platform === 'instagram' ? 'Instagram' : 'FB Page'}</span>
                        {post.price && <span>$ {Number(post.price).toLocaleString('es-CO')}</span>}
                        <span><FontAwesomeIcon icon={faClock} /> {formatScheduledTime(post.scheduled_at)}</span>
                      </div>
                    </div>
                    <div className="mr-scheduled-actions">
                      <button className="mr-btn mr-btn-primary mr-btn-sm" onClick={() => publishNow(post)} title="Publicar ahora" disabled={dailyStats.posted >= dailyStats.limit}><FontAwesomeIcon icon={faRocket} /></button>
                      <button className="mr-btn mr-btn-danger mr-btn-sm" onClick={() => deleteScheduledPost(post.id)} title="Eliminar"><FontAwesomeIcon icon={faTrashAlt} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="mr-analytics">
            <h3 className="mr-section-title"><FontAwesomeIcon icon={faHistory} /> Historial de publicaciones</h3>
            {publishLog.length === 0 ? (
              <div className="mr-messages-empty">No hay publicaciones en el historial todavia. Las publicaciones apareceran aqui despues de ser procesadas.</div>
            ) : (
              <div className="mr-log-list">
                {publishLog.map((entry, i) => (
                  <div className={`mr-log-item ${entry.status}`} key={entry.id || i}>
                    <div className="mr-log-icon">
                      <FontAwesomeIcon icon={entry.status === 'success' ? faCheckCircle : entry.status === 'failed' ? faBan : faClock}
                        style={{ color: entry.status === 'success' ? '#22c55e' : entry.status === 'failed' ? '#ef4444' : '#eab308' }} />
                    </div>
                    <div className="mr-log-content">
                      <div className="mr-log-title">{entry.post_title || 'Publicacion'}</div>
                      <div className="mr-log-meta">
                        <span className={`mr-platform-badge ${entry.platform}`}>{entry.platform === 'facebook_marketplace' ? 'Marketplace' : entry.platform === 'instagram' ? 'Instagram' : entry.platform}</span>
                        <span>{timeAgo(entry.published_at || entry.created_at)}</span>
                        {entry.error_message && <span className="mr-log-error">{entry.error_message}</span>}
                      </div>
                    </div>
                    <div className={`mr-log-status ${entry.status}`}>{entry.status === 'success' ? 'Exitoso' : entry.status === 'failed' ? 'Fallido' : 'Pendiente'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="mr-rules">
            <div className="mr-rules-intro">
              <FontAwesomeIcon icon={faShieldAlt} style={{ fontSize: '2rem', color: '#0ea5e9' }} />
              <div>
                <h3>Sistema Anti-Ban Inteligente</h3>
                <p>Basado en analisis de politicas de Facebook, Instagram y foros de vendedores expertos. El sistema limita automaticamente la frecuencia de publicaciones para proteger tu cuenta.</p>
              </div>
            </div>

            <h4 className="mr-section-title" style={{ marginTop: 24 }}><FontAwesomeIcon icon={faCalendarAlt} /> Limites segun antiguedad de cuenta</h4>
            <div className="mr-rules-table">
              <div className="mr-rules-table-header">
                <span>Tipo</span><span>Max/Dia</span><span>Max/Semana</span><span>Espaciado</span>
              </div>
              {Object.entries(POSTING_LIMITS).map(([key, val]) => (
                <div className={`mr-rules-table-row ${key === accountAge ? 'active' : ''}`} key={key}>
                  <span>{val.label}</span><span><strong>{val.daily}</strong></span><span><strong>{val.weekly}</strong></span><span>{val.spacing_hours}h</span>
                </div>
              ))}
            </div>

            {Object.entries(PLATFORM_RULES).map(([key, rule]) => (
              <div className="mr-platform-rules" key={key}>
                <h4 className="mr-section-title"><FontAwesomeIcon icon={key === 'instagram' ? faInstagram : faFacebookF} /> {rule.name}</h4>
                <div className="mr-rules-columns">
                  <div className="mr-rules-col mr-rules-safe">
                    <h5><FontAwesomeIcon icon={faCheckCircle} style={{ color: '#22c55e' }} /> Practicas seguras</h5>
                    <ul>{rule.tips.map((tip, i) => <li key={i}>{tip}</li>)}</ul>
                  </div>
                  <div className="mr-rules-col mr-rules-risk">
                    <h5><FontAwesomeIcon icon={faExclamationTriangle} style={{ color: '#ef4444' }} /> Factores de riesgo</h5>
                    <ul>{rule.riskFactors.map((rf, i) => <li key={i}>{rf}</li>)}</ul>
                  </div>
                </div>
              </div>
            ))}

            <div className="mr-rules-source">
              <FontAwesomeIcon icon={faInfoCircle} /> Informacion basada en politicas oficiales de Meta, analisis de foros de vendedores y experiencia de usuarios. Limites pueden variar segun region y tipo de cuenta.
            </div>
          </div>
        )}
      </div>
    </>
  )
  }
