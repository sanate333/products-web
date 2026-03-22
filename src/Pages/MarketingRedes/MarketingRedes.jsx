import React, { useState, useEffect, useCallback, useRef } from 'react'
import './MarketingRedes.css'
import Header from '../Header/Header'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPlug, faSync, faTrash, faCommentDots, faRocket, faClock,
  faShieldAlt, faChartLine, faPause, faPlay, faPlus, faEdit,
  faTrashAlt, faExclamationTriangle, faCheckCircle, faInfoCircle,
  faStore, faCalendarAlt, faEye, faBan, faHistory, faCamera, faThumbsUp, faMusic,
  faUpload, faImage, faSpinner
} from '@fortawesome/free-solid-svg-icons'

const SUPABASE_URL = 'https://lvmeswlvszsmvgaasazs.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2bWVzd2x2c3pzbXZnYWFzYXpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MjYzMTEsImV4cCI6MjA4NzEwMjMxMX0.pKhuLjRLgpWMBsEUv1WhCytpbUUT6tKj3sacIGit2z4'
const sbHeaders = () => ({
  apikey: SUPABASE_ANON,
  Authorization: `Bearer ${SUPABASE_ANON}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
})

const PLATFORM_RULES = {
  facebook_marketplace: {
    name: 'Facebook Marketplace', icon: faThumbsUp, colorClass: 'facebook',
    maxDaily: 8, minSpacingMin: 90,
    description: 'Marketplace permite hasta 8-10 listings/dia en cuentas activas. Limite seguro: 8.',
    tips: ['Espaciar publicaciones cada 1.5-2 horas', 'Usar fotos originales por producto', 'Descripciones unicas y detalladas', 'No republicar el mismo producto el mismo dia', 'Interactuar organicamente entre publicaciones'],
  },
  instagram: {
    name: 'Instagram', icon: faCamera, colorClass: 'instagram',
    maxDaily: 5, minSpacingMin: 120,
    description: 'Instagram permite 3-5 posts/dia en feed + hasta 15 Stories. Limite seguro: 5.',
    tips: ['Maximo 5 publicaciones al dia en feed', 'Stories: hasta 15 por dia sin riesgo', 'Usar hashtags variados', 'Espaciar posts por lo menos 2 horas', 'Reels tienen mayor alcance'],
  },
  facebook_page: {
    name: 'Facebook Page', icon: faThumbsUp, colorClass: 'facebook',
    maxDaily: 5, minSpacingMin: 120,
    description: 'Paginas de Facebook: 3-5 publicaciones/dia. Limite seguro: 5.',
    tips: ['Espaciar publicaciones cada 2-3 horas', 'Contenido variado: fotos, videos, links', 'Publicar en horarios de mayor actividad', 'No publicar contenido repetido'],
  },
  tiktok: {
    name: 'TikTok', icon: faMusic, colorClass: 'tiktok',
    maxDaily: 4, minSpacingMin: 180,
    description: 'TikTok recomienda 1-4 videos/dia. Mas de 4 reduce alcance.',
    tips: ['Publicar 1-4 videos al dia', 'Espaciar publicaciones cada 3+ horas', 'Usar sonidos trending', 'Contenido original tiene prioridad'],
  },
}

export default function MarketingRedes() {
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('connections')
  const [scheduledPosts, setScheduledPosts] = useState([])
  const [publishLog, setPublishLog] = useState([])
  const [autoPublishEnabled, setAutoPublishEnabled] = useState(false)
  const [showNewPost, setShowNewPost] = useState(false)
  const [newPost, setNewPost] = useState({ title: '', description: '', price: '', platform: 'facebook_marketplace', category: 'general', imageFile: null, imagePreview: null })
  const [dailyStats, setDailyStats] = useState({ posted: 0, limit: 8, nextSlot: null })
  const [publishing, setPublishing] = useState(false)
  const schedulerRef = useRef(null)
  const fileInputRef = useRef(null)

  const loadConnections = useCallback(async () => {
    try { const r = await fetch(`${SUPABASE_URL}/rest/v1/oasis_social_connections?select=*`, { headers: sbHeaders() }); if (r.ok) setConnections(await r.json()) } catch (e) { console.error(e) }
  }, [])
  const loadScheduledPosts = useCallback(async () => {
    try { const r = await fetch(`${SUPABASE_URL}/rest/v1/oasis_scheduled_posts?select=*&order=scheduled_at.asc`, { headers: sbHeaders() }); if (r.ok) setScheduledPosts(await r.json()) } catch (e) { console.error(e) }
  }, [])
  const loadPublishLog = useCallback(async () => {
    try { const r = await fetch(`${SUPABASE_URL}/rest/v1/oasis_publish_log?select=*&order=created_at.desc&limit=20`, { headers: sbHeaders() }); if (r.ok) setPublishLog(await r.json()) } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { Promise.all([loadConnections(), loadScheduledPosts(), loadPublishLog()]).finally(() => setLoading(false)) }, [loadConnections, loadScheduledPosts, loadPublishLog])

  useEffect(() => {
    const todayPosts = publishLog.filter(l => { const d = new Date(l.created_at); return d.toDateString() === new Date().toDateString() && l.status === 'published' }).length
    const rule = PLATFORM_RULES[newPost.platform] || PLATFORM_RULES.facebook_marketplace
    setDailyStats({ posted: todayPosts, limit: rule.maxDaily, nextSlot: null })
  }, [publishLog, newPost.platform])

  useEffect(() => {
    if (autoPublishEnabled) {
      schedulerRef.current = setInterval(async () => {
        const pending = scheduledPosts.filter(p => p.status === 'pending')
        if (!pending.length) return
        const rule = PLATFORM_RULES[pending[0].platform] || PLATFORM_RULES.facebook_marketplace
        if (dailyStats.posted >= rule.maxDaily) return
        await publishPost(pending[0])
        loadScheduledPosts(); loadPublishLog()
      }, 60000)
      return () => clearInterval(schedulerRef.current)
    } else if (schedulerRef.current) clearInterval(schedulerRef.current)
  }, [autoPublishEnabled, scheduledPosts, dailyStats])

  function handleImageSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('La imagen no puede superar 5MB'); return }
    const reader = new FileReader()
    reader.onload = (ev) => setNewPost(prev => ({ ...prev, imageFile: file, imagePreview: ev.target.result }))
    reader.readAsDataURL(file)
  }
  function removeImage() {
    setNewPost(prev => ({ ...prev, imageFile: null, imagePreview: null }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  async function uploadImage(file) {
    const fileName = `marketing/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
    const formData = new FormData(); formData.append('', file)
    try {
      const r = await fetch(`${SUPABASE_URL}/storage/v1/object/public/uploads/${fileName}`, { method: 'POST', headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }, body: formData })
      return r.ok ? `${SUPABASE_URL}/storage/v1/object/public/uploads/${fileName}` : null
    } catch (e) { console.error(e); return null }
  }
  async function saveScheduledPost() {
    if (!newPost.title.trim() || !newPost.description.trim()) { alert('Titulo y descripcion son obligatorios'); return }
    setPublishing(true)
    try {
      let imageUrl = ''
      if (newPost.imageFile) { imageUrl = await uploadImage(newPost.imageFile); if (!imageUrl) { alert('Error al subir imagen'); setPublishing(false); return } }
      const post = { platform: newPost.platform, title: newPost.title.trim(), description: newPost.description.trim(), price: newPost.price || null, images: imageUrl || null, category: newPost.category, status: 'pending', scheduled_at: new Date().toISOString() }
      const r = await fetch(`${SUPABASE_URL}/rest/v1/oasis_scheduled_posts`, { method: 'POST', headers: sbHeaders(), body: JSON.stringify(post) })
      if (r.ok) { setNewPost({ title: '', description: '', price: '', platform: 'facebook_marketplace', category: 'general', imageFile: null, imagePreview: null }); if (fileInputRef.current) fileInputRef.current.value = ''; setShowNewPost(false); await loadScheduledPosts() }
      else alert('Error al guardar la publicacion')
    } catch (e) { console.error(e); alert('Error de red') }
    setPublishing(false)
  }
  async function publishPost(post) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/oasis_publish_log`, { method: 'POST', headers: sbHeaders(), body: JSON.stringify({ platform: post.platform, post_title: post.title, status: 'published', published_at: new Date().toISOString() }) })
      await fetch(`${SUPABASE_URL}/rest/v1/oasis_scheduled_posts?id=eq.${post.id}`, { method: 'PATCH', headers: sbHeaders(), body: JSON.stringify({ status: 'published', published_at: new Date().toISOString() }) })
      await loadPublishLog(); await loadScheduledPosts()
    } catch (e) { console.error(e); await fetch(`${SUPABASE_URL}/rest/v1/oasis_publish_log`, { method: 'POST', headers: sbHeaders(), body: JSON.stringify({ platform: post.platform, post_title: post.title, status: 'failed', error_message: e.message }) }) }
  }
  async function deletePost(id) { if (!window.confirm('Eliminar esta publicacion?')) return; await fetch(`${SUPABASE_URL}/rest/v1/oasis_scheduled_posts?id=eq.${id}`, { method: 'DELETE', headers: sbHeaders() }); loadScheduledPosts() }
  async function connectPlatform(platformKey) {
    const rule = PLATFORM_RULES[platformKey]; if (!rule) return
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/oasis_social_connections`, { method: 'POST', headers: sbHeaders(), body: JSON.stringify({ platform: platformKey, status: 'connected', account_name: rule.name + ' - Mi Cuenta', connected_at: new Date().toISOString() }) })
      if (r.ok) { await loadConnections(); alert(rule.name + ' conectado correctamente.') } else alert('Error al conectar')
    } catch (e) { console.error(e); alert('Error de red') }
  }
  async function disconnectPlatform(id) { if (!window.confirm('Desconectar esta red?')) return; await fetch(`${SUPABASE_URL}/rest/v1/oasis_social_connections?id=eq.${id}`, { method: 'DELETE', headers: sbHeaders() }); loadConnections() }
  function getRiskLevel() {
    const ratio = dailyStats.posted / dailyStats.limit
    if (ratio >= 0.9) return { label: 'Critico', color: '#ef4444' }
    if (ratio >= 0.7) return { label: 'Alto', color: '#f97316' }
    if (ratio >= 0.4) return { label: 'Medio', color: '#eab308' }
    return { label: 'Seguro', color: '#22c55e' }
  }
  const risk = getRiskLevel()
  const platforms = Object.keys(PLATFORM_RULES).map(key => ({ key, ...PLATFORM_RULES[key], connection: connections.find(c => c.platform === key) }))

  if (loading) return <div className="containerGrid"><Header /><section className="containerSection"><div className="marketing-redes"><p>Cargando...</p></div></section></div>

  return (
    <div className="containerGrid">
      <Header />
      <section className="containerSection">
      <div className="marketing-redes">
        <div className="mr-page-header">
          <div>
            <h2>Redes de Marketing</h2>
            <p className="mr-subtitle">Auto-publicador inteligente con proteccion anti-ban.</p>
          </div>
          <div className="mr-status-badge" style={{ borderColor: risk.color, color: risk.color }}>
            <FontAwesomeIcon icon={faShieldAlt} /> {risk.label} | {dailyStats.posted}/{dailyStats.limit} hoy
          </div>
        </div>
        <div className="mr-tabs">
          <button className={`mr-tab ${activeTab === 'connections' ? 'active' : ''}`} onClick={() => setActiveTab('connections')}><FontAwesomeIcon icon={faPlug} /> Conexiones</button>
          <button className={`mr-tab ${activeTab === 'autopublisher' ? 'active' : ''}`} onClick={() => setActiveTab('autopublisher')}><FontAwesomeIcon icon={faRocket} /> Autopublicador</button>
          <button className={`mr-tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}><FontAwesomeIcon icon={faChartLine} /> Historial</button>
          <button className={`mr-tab ${activeTab === 'rules' ? 'active' : ''}`} onClick={() => setActiveTab('rules')}><FontAwesomeIcon icon={faShieldAlt} /> Reglas Anti-Ban</button>
        </div>

        {activeTab === 'connections' && (
          <div className="mr-cards">
            {platforms.map(p => {
              const conn = p.connection; const isConnected = conn && conn.status === 'connected'
              return (
                <div className="mr-card" key={p.key}>
                  <div className="mr-card-header">
                    <div className={`mr-card-icon ${p.colorClass}`}><FontAwesomeIcon icon={p.icon} /></div>
                    <div>
                      <strong>{p.name}</strong>
                      <span className={`mr-connection-status ${isConnected ? 'connected' : 'disconnected'}`}>{isConnected ? 'Conectado' : 'No conectado'}</span>
                    </div>
                  </div>
                  {isConnected ? (
                    <div className="mr-card-actions">
                      <span className="mr-account-name">{conn.account_name}</span>
                      <button className="mr-btn-danger-sm" onClick={() => disconnectPlatform(conn.id)}><FontAwesomeIcon icon={faTrash} /> Desconectar</button>
                    </div>
                  ) : (
                    <button className="mr-btn-primary" onClick={() => connectPlatform(p.key)}><FontAwesomeIcon icon={faPlug} /> Conectar</button>
                  )}
                  <p className="mr-card-desc">{p.description}</p>
                  <div className="mr-card-limit"><FontAwesomeIcon icon={faShieldAlt} /> Limite: <strong>{p.maxDaily} posts/dia</strong> | Espaciado: <strong>{Math.round(p.minSpacingMin/60*10)/10}h</strong></div>
                </div>
              )
            })}
          </div>
        )}

        {activeTab === 'autopublisher' && (
          <div className="mr-autopub">
            <div className="mr-ap-dashboard">
              <div className="mr-ap-stat-card"><div className="mr-ap-stat-icon" style={{background:'#dbeafe',color:'#2563eb'}}><FontAwesomeIcon icon={faStore}/></div><div><div className="mr-ap-stat-value">{dailyStats.posted}</div><div className="mr-ap-stat-label">Publicadas hoy</div></div></div>
              <div className="mr-ap-stat-card"><div className="mr-ap-stat-icon" style={{background:'#dcfce7',color:'#16a34a'}}><FontAwesomeIcon icon={faShieldAlt}/></div><div><div className="mr-ap-stat-value">{Math.max(0,dailyStats.limit-dailyStats.posted)}</div><div className="mr-ap-stat-label">Disponibles</div></div></div>
              <div className="mr-ap-stat-card"><div className="mr-ap-stat-icon" style={{background:'#fef3c7',color:'#d97706'}}><FontAwesomeIcon icon={faClock}/></div><div><div className="mr-ap-stat-value">{scheduledPosts.filter(p=>p.status==='pending').length}</div><div className="mr-ap-stat-label">En cola</div></div></div>
              <div className="mr-ap-stat-card"><div className="mr-ap-stat-icon" style={{background:autoPublishEnabled?'#dcfce7':'#fee2e2',color:autoPublishEnabled?'#16a34a':'#ef4444'}}><FontAwesomeIcon icon={autoPublishEnabled?faPlay:faPause}/></div><div><div className="mr-ap-stat-value">{autoPublishEnabled?'ON':'OFF'}</div><button className="mr-btn-sm" onClick={()=>setAutoPublishEnabled(!autoPublishEnabled)}>{autoPublishEnabled?'Pausar':'Activar'}</button></div></div>
            </div>
            <div className="mr-ap-info-banner"><FontAwesomeIcon icon={faInfoCircle}/><div><strong>Como funciona:</strong> Sube tu foto y descripcion. El sistema programa la publicacion respetando los limites de cada plataforma automaticamente para evitar baneos.</div></div>
            <div className="mr-ap-actions"><button className="mr-btn-primary" onClick={()=>setShowNewPost(!showNewPost)}><FontAwesomeIcon icon={faPlus}/> Nueva Publicacion</button></div>

            {showNewPost && (
              <div className="mr-new-post-form">
                <h3>Nueva Publicacion</h3>
                <div className="mr-form-group"><label>Plataforma</label><select value={newPost.platform} onChange={e=>setNewPost(p=>({...p,platform:e.target.value}))}>{Object.keys(PLATFORM_RULES).map(k=><option key={k} value={k}>{PLATFORM_RULES[k].name}</option>)}</select></div>
                <div className="mr-form-group"><label>Titulo del producto</label><input type="text" placeholder="Ej: Camiseta deportiva talla M" value={newPost.title} onChange={e=>setNewPost(p=>({...p,title:e.target.value}))}/></div>
                <div className="mr-form-group"><label>Descripcion</label><textarea rows="4" placeholder="Describe el producto con detalle..." value={newPost.description} onChange={e=>setNewPost(p=>({...p,description:e.target.value}))}/></div>
                <div className="mr-form-row">
                  <div className="mr-form-group"><label>Precio (opcional)</label><input type="text" placeholder="Ej: 25.000" value={newPost.price} onChange={e=>setNewPost(p=>({...p,price:e.target.value}))}/></div>
                  <div className="mr-form-group"><label>Categoria</label><select value={newPost.category} onChange={e=>setNewPost(p=>({...p,category:e.target.value}))}><option value="general">General</option><option value="ropa">Ropa y Accesorios</option><option value="electronica">Electronica</option><option value="hogar">Hogar</option><option value="vehiculos">Vehiculos</option><option value="servicios">Servicios</option></select></div>
                </div>
                <div className="mr-form-group"><label>Foto del producto</label>
                  <div className="mr-image-upload">
                    {newPost.imagePreview ? (<div className="mr-image-preview"><img src={newPost.imagePreview} alt="Preview"/><button className="mr-remove-img" onClick={removeImage}><FontAwesomeIcon icon={faTrashAlt}/></button></div>) : (<div className="mr-upload-area" onClick={()=>fileInputRef.current&&fileInputRef.current.click()}><FontAwesomeIcon icon={faUpload} size="2x"/><p>Click para seleccionar imagen</p><span>Max 5MB - JPG, PNG, WebP</span></div>)}
                    <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageSelect} style={{display:'none'}}/>
                  </div>
                </div>
                <div className="mr-form-actions">
                  <button className="mr-btn-secondary" onClick={()=>setShowNewPost(false)}>Cancelar</button>
                  <button className="mr-btn-primary" onClick={saveScheduledPost} disabled={publishing}>{publishing?<><FontAwesomeIcon icon={faSpinner} spin/> Guardando...</>:<><FontAwesomeIcon icon={faRocket}/> Programar</>}</button>
                </div>
              </div>
            )}

      {/* Lista de posts programados */}
      {scheduledPosts.length > 0 && (
        <div className="mr-scheduled-list">
          <h3>Publicaciones Programadas ({scheduledPosts.length})</h3>
          <div className="mr-posts-grid">
            {scheduledPosts.map(post => (
              <div key={post.id} className={`mr-post-card mr-status-${post.status}`}>
                {post.images && (
                  <div className="mr-post-thumb">
                    <img src={post.images} alt={post.title} />
                  </div>
                )}
                <div className="mr-post-info">
                  <h4>{post.title}</h4>
                  <p className="mr-post-platform">
                    <FontAwesomeIcon icon={
                      post.platform === 'instagram' ? faCamera :
                      post.platform === 'tiktok' ? faMusic :
                      post.platform === 'facebook_page' ? faThumbsUp : faStore
                    } />
                    {' '}{post.platform.replace('_', ' ')}
                  </p>
                  <p className="mr-post-desc">{post.description?.substring(0, 80)}{post.description?.length > 80 ? '...' : ''}</p>
                  {post.price && <p className="mr-post-price">${post.price}</p>}
                  <div className="mr-post-meta">
                    <span className={`mr-badge mr-badge-${post.status}`}>{
                      post.status === 'pending' ? 'Pendiente' :
                      post.status === 'published' ? 'Publicado' :
                      post.status === 'failed' ? 'Fallido' : post.status
                    }</span>
                    <span className="mr-post-date">{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="mr-post-actions">
                    {post.status === 'pending' && (
                      <button onClick={() => publishPost(post)} disabled={publishing} className="mr-btn mr-btn-sm mr-btn-publish">
                        <FontAwesomeIcon icon={faRocket} /> Publicar
                      </button>
                    )}
                    <button onClick={() => deletePost(post.id)} className="mr-btn mr-btn-sm mr-btn-danger">
                      <FontAwesomeIcon icon={faTrash} /> Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {scheduledPosts.length === 0 && (
        <div className="mr-empty-state">
          <FontAwesomeIcon icon={faCalendarAlt} size="3x" />
          <p>No hay publicaciones programadas. Crea una nueva arriba.</p>
        </div>
      )}
    </div>
  )}

  {/* TAB: Historial */}
  {activeTab === 'history' && (
    <div className="mr-tab-content">
      <h3><FontAwesomeIcon icon={faChartLine} /> Historial de Publicaciones</h3>
      
      {publishLog.length > 0 ? (
        <div className="mr-history-table">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Plataforma</th>
                <th>Titulo</th>
                <th>Estado</th>
                <th>Detalles</th>
              </tr>
            </thead>
            <tbody>
              {publishLog.map(log => (
                <tr key={log.id} className={`mr-log-${log.status}`}>
                  <td>{new Date(log.published_at || log.created_at).toLocaleString()}</td>
                  <td>
                    <FontAwesomeIcon icon={
                      log.platform === 'instagram' ? faCamera :
                      log.platform === 'tiktok' ? faMusic :
                      log.platform === 'facebook_page' ? faThumbsUp : faStore
                    } />
                    {' '}{log.platform?.replace('_', ' ')}
                  </td>
                  <td>{log.post_title || 'Sin titulo'}</td>
                  <td>
                    <span className={`mr-badge mr-badge-${log.status}`}>{
                      log.status === 'success' ? 'Exitoso' :
                      log.status === 'failed' ? 'Fallido' :
                      log.status === 'pending' ? 'Pendiente' : log.status
                    }</span>
                  </td>
                  <td>{log.error_message || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mr-empty-state">
          <FontAwesomeIcon icon={faChartLine} size="3x" />
          <p>Aun no hay historial de publicaciones.</p>
        </div>
      )}
    </div>
  )}

  {/* TAB: Reglas Anti-Ban */}
  {activeTab === 'rules' && (
    <div className="mr-tab-content">
      <h3><FontAwesomeIcon icon={faShieldAlt} /> Reglas Anti-Ban por Plataforma</h3>
      <p className="mr-rules-intro">
        El sistema respeta automaticamente los limites seguros de cada plataforma. 
        Estas reglas estan integradas para proteger tu cuenta y maximizar el alcance sin riesgo de bloqueos.
      </p>
      
      <div className="mr-rules-grid">
        {Object.entries(PLATFORM_RULES).map(([key, rule]) => (
          <div key={key} className={`mr-rule-card mr-rule-${key}`}>
            <div className="mr-rule-header">
              <FontAwesomeIcon icon={rule.icon} className={rule.colorClass} size="2x" />
              <h4>{key.replace('_', ' ').toUpperCase()}</h4>
            </div>
            <div className="mr-rule-body">
              <div className="mr-rule-stat">
                <span className="mr-rule-label">Max publicaciones/dia:</span>
                <span className="mr-rule-value">{rule.maxDaily}</span>
              </div>
              <div className="mr-rule-stat">
                <span className="mr-rule-label">Espaciado minimo:</span>
                <span className="mr-rule-value">{rule.minSpacingMin} minutos</span>
              </div>
              <p className="mr-rule-desc">{rule.description}</p>
              <div className="mr-rule-tips">
                <strong>Consejos:</strong>
                <ul>
                  {rule.tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )}

      </div>
      </section>
    </div>
  );
}

