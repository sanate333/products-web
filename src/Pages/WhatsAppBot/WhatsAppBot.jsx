import React, { useState, useEffect, useRef } from 'react'
import EmojiPicker from 'emoji-picker-react'
import './WhatsAppBot.css'
import Header from '../Header/Header'

const DEFAULT_BU     = 'http://localhost:5055/api/whatsapp'
const DEFAULT_SECRET = 'sanate_secret_2025'
// ── Backend URL y Secret — configurables en Ajustes ─────────────
let BU         = (function(){ try { return localStorage.getItem('wa_backend_url') || DEFAULT_BU } catch { return DEFAULT_BU } })()
let MEDIA_BASE = BU.replace('/api/whatsapp', '')
let H          = { 'x-secret': (function(){ try { return localStorage.getItem('wa_secret') || DEFAULT_SECRET } catch { return DEFAULT_SECRET } })() }
let HJ         = { ...H, 'Content-Type': 'application/json' }
const N8N_WH = 'https://oasiss.app.n8n.cloud/webhook/whatsapp-sanate'

// ── localStorage helpers ───────────────────────────────────────
const MSGS_KEY   = 'wb_msgs_'
const ACTIVE_KEY = 'wb_active_chat'
function cacheGet(chatId)        { try { return JSON.parse(localStorage.getItem(MSGS_KEY + chatId) || '[]') } catch { return [] } }
function cachePut(chatId, msgs)  { try { localStorage.setItem(MSGS_KEY + chatId, JSON.stringify(msgs.slice(-200))) } catch {} }
function activeGet()             { try { return JSON.parse(localStorage.getItem(ACTIVE_KEY) || 'null') } catch { return null } }
function activePut(c)            { try { localStorage.setItem(ACTIVE_KEY, c ? JSON.stringify(c) : 'null') } catch {} }

// ── campo: normalizar mensajes del backend ─────────────────────
function normMsg(m) {
  const ts = m.timestamp || m.time || ''
  const hhmm = ts ? (() => { try { return new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) } catch { return ts.substring(11, 16) } })() : ''
  return {
    id:       m.providerMessageId || m.id ||
              `${(m.direction === 'outgoing' || m.dir === 's') ? 's' : 'r'}_${m.timestamp || m.time || ''}_${(m.text || m.txt || '').substring(0, 24)}`,
    dir:      (m.direction === 'outgoing' || m.dir === 's') ? 's' : 'r',
    txt:      m.text || m.txt || '',
    time:     hhmm,
    type:     m.type || 'text',
    mediaUrl: m.mediaUrl || '',
    mimeType: m.mimeType || '',
    fileName: m.fileName || '',
    status:   m.status || '',
  }
}

// ── limpiar JID de Baileys → número legible ───────────────────
function cleanPhone(phone, id) {
  if (phone && phone.startsWith('+')) return phone
  if (phone && /^\d{7,}$/.test(phone)) return '+' + phone
  const raw = String(id || '').replace(/@s\.whatsapp\.net|@g\.us|@c\.us/g, '')
  if (/^\d{7,}$/.test(raw)) return '+' + raw
  return phone || id || ''
}

// ── campo: normalizar chats del backend ────────────────────────
function normChat(c) {
  const ts = c.lastMessageAt || c.updatedAt || ''
  const hhmm = ts ? (() => { try { return new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) } catch { return '' } })() : ''
  const chatId = c.chatId || c.id || ''
  const phone  = cleanPhone(c.phone, chatId)
  const isGroup = chatId.includes('@g.us')
  // Limpia nombres que son JIDs (ej: "1234567890@s.whatsapp.net" → usa el teléfono)
  const rawName = String(c.name || '').trim()
  const name = (rawName && !rawName.includes('@')) ? rawName : (isGroup ? 'Grupo' : '')
  return {
    id:       chatId,
    name,
    phone,
    isGroup,
    photoUrl: c.photoUrl || '',
    preview:  c.lastMessagePreview || c.preview || '',
    time:     hhmm,
    unread:   c.unreadCount ?? c.unread ?? 0,
  }
}

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

const DEFAULT_TRIGGERS = [
  { id: 'tr1', name: 'Sin respuesta 1h',      condition: 'no_reply',    delay: 60,   unit: 'min', producto: 'General', message: '¡Hola {nombre}! 👋 Vi que revisaste nuestra info.\n¿Te puedo ayudar a resolver alguna duda?\nTenemos combos especiales solo por hoy 🎁', active: true,  mediaType: null, mediaUrl: '' },
  { id: 'tr2', name: 'Visto sin responder 3h', condition: 'seen',       delay: 180,  unit: 'min', producto: 'General', message: 'Hola {nombre} 😊 Quería enviarte nuestra mejor oferta de hoy.\n¿Cuál es tu producto favorito? 🌿\nTe armo un combo personalizado 💚', active: true,  mediaType: null, mediaUrl: '' },
  { id: 'tr3', name: 'Cierre 24h',             condition: 'no_purchase', delay: 1440, unit: 'min', producto: 'General', message: '🔥 ¡Último aviso, {nombre}!\nTu combo favorito tiene 15% OFF solo hoy.\n¿Lo reservamos? Responde SÍ y te lo aparto ahora mismo 💪', active: false, mediaType: null, mediaUrl: '' },
]

// ── Mapa de geo por código de país / área Colombia ──────────────
const GEO_MAP = {
  col: { '1':'Bogotá·CUN','2':'Cali·VAL','4':'Medellín·ANT','5':'Barranquilla·ATL','6':'Manizales·CAL','7':'Bucaramanga·SAN','8':'Cartagena·BOL','9':'Leticia·AMA' },
  cc:  { '1':'USA·US 🇺🇸','52':'México·MX 🇲🇽','34':'España·ES 🇪🇸','54':'Argentina·AR 🇦🇷','55':'Brasil·BR 🇧🇷','56':'Chile·CL 🇨🇱','51':'Perú·PE 🇵🇪','58':'Venezuela·VE 🇻🇪','593':'Ecuador·EC 🇪🇨','57':'Colombia·CO 🇨🇴' },
}
function phoneToGeo(phone) {
  if (!phone) return null
  const raw = phone.replace(/\D/g, '')
  if (raw.startsWith('57') && raw.length >= 11) {
    const mobile = raw.substring(2, 4)
    if (mobile.startsWith('3')) {
      const area = raw.substring(2, 3)
      const city = GEO_MAP.col[area]
      if (city) { const [c,d] = city.split('·'); return { label: `${c} · ${d}`, flag: '🇨🇴' } }
      return { label: 'Colombia · CO', flag: '🇨🇴' }
    }
  }
  for (const [cc, label] of Object.entries(GEO_MAP.cc)) {
    if (raw.startsWith(cc)) { const [c,d] = label.split(' ')[0].split('·'); return { label: `${c} · ${d}`, flag: label.split(' ')[1] || '' } }
  }
  return null
}

const TRAINING_TEMPLATE = `🏢 NOMBRE DEL NEGOCIO: Sanate
🌐 SITIO WEB: sanate.store
📱 WHATSAPP: +57 XXX XXX XXXX

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 PERSONALIDAD DEL ASISTENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Eres un cerrador de ventas experto, amable, cálido y natural.
Nunca suenas como un robot. Haces pausas, usas emojis estratégicamente,
escuchas al cliente, identificas su necesidad y ofreces la solución perfecta.
Siempre terminas con una pregunta de cierre clara.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛍️ PRODUCTOS Y PRECIOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Pega aquí tus productos con precios]
Ejemplo:
- Combo Detox 30 días: $150.000
- Pack Energía Total: $89.000
- Kit Bienestar Premium: $220.000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💥 COMBOS Y OFERTAS ESPECIALES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Describe tus combos, precios, descuentos, vigencia]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💬 ESTILO DE CONVERSACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Saluda con el nombre del cliente
2. Identifica qué necesita con 1 pregunta
3. Ofrece el producto más adecuado
4. Da 1-2 beneficios clave (no abrumes)
5. Cierre: "¿Te lo reservamos?" / "¿Lo tomamos?"
6. Si dice que va a pensar: envía oferta por tiempo limitado

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 NUNCA HACER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Dar precios sin contexto del producto
- Responder con listas largas
- Olvidar hacer una pregunta de cierre
- Sonar robotico o formal en exceso
`

const COLORS_AV  = ['#d1fae5', '#dbeafe', '#ede9fe', '#fef3c7', '#fee2e2']
const COLORS_TXT = ['#065f46', '#1d4ed8', '#5b21b6', '#92400e', '#b91c1c']

// ── Resolver URL de media: blob / http completo / ruta relativa ─
function resolveMediaUrl(url) {
  if (!url) return ''
  if (url.startsWith('blob:') || url.startsWith('data:')) return url
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  // Ruta relativa → anteponer MEDIA_BASE
  return MEDIA_BASE + (url.startsWith('/') ? url : '/' + url)
}

// ── Componente: chat de prueba del bot IA ──────────────────────
function BotTestChat({ trainingPrompt, aiPrompt, openaiKey, geminiKey, aiModel, tip, msgMode, useEmojis, useStyles }) {
  const [msgs, setMsgs] = React.useState([{ role: 'assistant', txt: '¡Hola! Soy tu bot de prueba. ¿En qué te puedo ayudar? 😊' }])
  const [inp,  setInp]  = React.useState('')
  const [busy, setBusy] = React.useState(false)

  async function localCallAI(messages) {
    if (openaiKey) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
        body: JSON.stringify({ model: aiModel || 'gpt-4o', messages, max_tokens: 480 }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error.message || 'OpenAI error')
      return data.choices?.[0]?.message?.content?.trim() || ''
    }
    if (geminiKey) {
      const systemMsg = messages.find(m => m.role === 'system')
      const userMsgs  = messages.filter(m => m.role !== 'system')
      const parts = []
      if (systemMsg) parts.push({ text: systemMsg.content + '\n\n' })
      userMsgs.forEach(m => parts.push({ text: (m.role === 'user' ? '' : '[Bot]: ') + m.content }))
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.8, maxOutputTokens: 480 } }) }
      )
      const data = await res.json()
      if (data.error) throw new Error(data.error.message || 'Gemini error')
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
    }
    throw new Error('no_key')
  }

  async function send() {
    if (!inp.trim() || busy) return
    const userMsg = inp.trim(); setInp(''); setBusy(true)
    setMsgs(p => [...p, { role: 'user', txt: userMsg }])
    try {
      const history = msgs.slice(-8).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.txt }))
      const baseCtx = (trainingPrompt || aiPrompt || '').substring(0, 5500)

      // Bloques condicionales según configuración de estilo
      const tc_stylesBlock = (useStyles !== false)
        ? `• FORMATO WhatsApp: *negrita* (un asterisco cada lado), _cursiva_, ~tachado~ — úsalos en precios, nombres de combos y beneficios clave\n• NUNCA uses **doble asterisco** — solo *uno a cada lado*`
        : `• Texto plano ÚNICAMENTE — sin asteriscos ni formato. PROHIBIDO *negritas*, _cursiva_ o ~tachado~`
      const tc_emojisBlock = (useEmojis !== false)
        ? `• Emojis: máx 2 por mensaje, úsalos estratégicamente como viñetas o énfasis`
        : `• PROHIBIDO usar emojis — solo texto plano`
      const tc_multiMsgBlock = (msgMode !== 'completo')
        ? `ENVÍO POR PARTES:\nDivide en 2 a 5 mensajes separados por el separador EXACTO: ||||\n• Parte 1 → gancho o contexto — no lo reveles todo\n• Partes intermedias → desarrolla con intriga o mini-pregunta\n• Última parte → pregunta de cierre de venta\nEjemplo:\nTenemos varias opciones${(useEmojis !== false) ? ' 🌿' : ''}\n||||\n${(useStyles !== false) ? '*Combo A*' : 'Combo A'} — beneficio — ${(useStyles !== false) ? '*$66.000*' : '$66.000'}\n||||\n¿Cuál prefieres${(useEmojis !== false) ? ' 😊' : '?'}`
        : `ENVÍO COMPLETO:\nResponde en UN solo mensaje bien organizado (máx 6 líneas). NO uses |||| separador.`

      // Embudo de ventas para el Test Chat
      const tc_salesFunnel = `EMBUDO DE VENTAS PROBADO — SIGUE ESTE ORDEN:
PASO 2 — DIAGNÓSTICO (antes de precios): "¿Lo buscas para acné, manchas, piel seca o zonas íntimas?"
PASO 3 — PRESENTACIÓN: Recomienda combo exacto${(useStyles !== false) ? ' con *negrita* en precios y nombres' : ''} + obsequio.
PASO 4 — CIERRE con elección forzada: "¿Cuál te llevas, el${(useStyles !== false) ? ' *Combo 1*' : ' Combo 1'} o el${(useStyles !== false) ? ' *Combo 5*' : ' Combo 5'}? 💛"
PASO 5 — DATOS: "¡Excelente elección! 💚✨ Envíame: Nombre / Teléfono / Ciudad / Dirección / Barrio"

CATÁLOGO SÁNATE:
• ${(useStyles !== false) ? '*Combo 1*' : 'Combo 1'} Tripack Mixto (3 Jabones) → ${(useStyles !== false) ? '*$59.000*' : '$59.000'} (antes $105.000)
• ${(useStyles !== false) ? '*Combo 2*' : 'Combo 2'} 3 Jabones a elección → ${(useStyles !== false) ? '*$59.000*' : '$59.000'} (antes $105.000)
• ${(useStyles !== false) ? '*Combo 3*' : 'Combo 3'} 2 Jabones + Sebo 10g → ${(useStyles !== false) ? '*$63.000*' : '$63.000'} (antes $79.000)
• ${(useStyles !== false) ? '*Combo 5*' : 'Combo 5'} MÁS VENDIDO: 4 Jabones + Sebo + Exfoliante → ${(useStyles !== false) ? '*$119.000*' : '$119.000'} (antes $159.000)
• Jabón individual: ${(useStyles !== false) ? '*$22.000*' : '$22.000'}
Nequi/transferencia: ${(useStyles !== false) ? '*8% OFF*' : '8% OFF'} | Envío GRATIS a toda Colombia | Contra entrega disponible

FRASES DE CIERRE (úsalas): "¡Excelente elección! 💚✨" / "Los precios son de hoy solamente" / "Se agotan rápido"
REGLAS: ❌ Nunca precio sin diagnóstico | ❌ Nunca pregunta abierta al cierre | ✅ Siempre celebra la elección`

      const enhancedSys = baseCtx
        ? `${baseCtx}\n\n---\nINSTRUCCIONES CRÍTICAS WHATSAPP:\n• Mensajes cortos: máx 3-4 líneas POR MENSAJE\n${tc_stylesBlock}\n${tc_emojisBlock}\n• VARÍA tus respuestas — nunca repitas el mismo saludo\n• Adapta el tono al cliente\n• Eres una persona real, NUNCA te presentes como IA o bot\n\n${tc_multiMsgBlock}\n\n${tc_salesFunnel}\n\nPROHIBIDO:\n❌ Frases genéricas | ❌ Decir que eres IA`
        : `Eres una asesora de ventas de Sánate Colombia — jabones artesanales naturales. Eres una persona real. NUNCA te presentes como IA.\n${tc_stylesBlock}\n${tc_emojisBlock}\nMensajes cortos (máx 3-4 líneas). Varía tus respuestas.\n\n${tc_multiMsgBlock}\n\n${tc_salesFunnel}`

      const reply = await localCallAI([
        { role: 'system', content: enhancedSys },
        ...history,
        { role: 'user', content: userMsg },
      ])
      // Soporte multi-mensaje: separar por ||||
      const parts = (reply || '').split('||||').map(s => s.trim()).filter(Boolean)
      if (parts.length > 1) {
        setMsgs(p => [...p, ...parts.map(txt => ({ role: 'assistant', txt }))])
      } else {
        setMsgs(p => [...p, { role: 'assistant', txt: reply || '⚠️ Sin respuesta de la IA' }])
      }
    } catch (e) {
      const errTxt = e?.message === 'no_key'
        ? '⚠️ Configura tu API Key de OpenAI o Gemini en Ajustes → API & Tokens'
        : `⚠️ Error IA: ${e?.message || 'Verifica tu API Key'}`
      setMsgs(p => [...p, { role: 'assistant', txt: errTxt }])
    }
    setBusy(false)
  }
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ background: '#075e54', padding: '.55rem 1rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#25d366', boxShadow: '0 0 0 3px rgba(37,211,102,.3)' }} />
        <span style={{ color: '#fff', fontSize: '.78rem', fontWeight: 700 }}>🤖 Bot IA — Modo prueba</span>
        <button style={{ marginLeft: 'auto', background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: 6, padding: '.2rem .6rem', fontSize: '.68rem', cursor: 'pointer' }} onClick={() => setMsgs([{ role: 'assistant', txt: '¡Hola! Soy tu bot de prueba. ¿En qué te puedo ayudar? 😊' }])}>🔄 Reiniciar</button>
      </div>
      <div style={{ background: '#e5ddd5', padding: '.75rem', minHeight: 200, maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ maxWidth: '78%', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', background: m.role === 'user' ? '#dcf8c6' : '#fff', borderRadius: 10, padding: '.45rem .75rem', fontSize: '.77rem', lineHeight: 1.5, boxShadow: '0 1px 2px rgba(0,0,0,.1)' }}>
            {m.role === 'assistant' && <div style={{ fontSize: '.58rem', color: '#7c3aed', fontWeight: 700, marginBottom: '.1rem' }}>🤖 IA</div>}
            {m.txt}
          </div>
        ))}
        {busy && <div style={{ alignSelf: 'flex-start', background: '#fff', borderRadius: 10, padding: '.45rem .75rem', fontSize: '.75rem', color: '#9ca3af' }}>⏳ Pensando...</div>}
      </div>
      <div style={{ background: '#f0f0f0', padding: '.5rem .75rem', display: 'flex', gap: '.5rem' }}>
        <input style={{ flex: 1, border: 'none', borderRadius: 24, padding: '.42rem 1rem', fontSize: '.76rem', outline: 'none', background: '#fff', fontFamily: 'inherit' }}
          value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder="Escribe un mensaje de prueba..." disabled={busy} />
        <button style={{ width: 36, height: 36, background: '#075e54', color: '#fff', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: '.9rem' }} onClick={send} disabled={busy}>{busy ? '⏳' : '➤'}</button>
      </div>
    </div>
  )
}

const DEFAULT_TAGS = [
  { id: 'tg1', name: 'Nuevo lead',      color: '#3b82f6' },
  { id: 'tg2', name: 'Pendiente pago',  color: '#f59e0b' },
  { id: 'tg3', name: 'Cliente VIP',     color: '#8b5cf6' },
  { id: 'tg4', name: 'Soporte',         color: '#ef4444' },
  { id: 'tg5', name: 'Recurrente',      color: '#10b981' },
  { id: 'tg6', name: 'Preparar',        color: '#2563eb' }, // azul — auto cuando detecta pedido
  { id: 'tg7', name: 'Facturado',       color: '#16a34a' }, // verde — cambio manual
  { id: 'tg8', name: 'Reserva',         color: '#7c3aed' },
]

// Keywords que indican intención de pedido
const ORDER_KEYWORDS = ['quiero', 'pedido', 'pedir', 'comprar', 'me lo llevan', 'llevar', 'cuánto cuesta', 'cuanto cuesta', 'cuánto vale', 'cuanto vale', 'precio', 'pago', 'transferencia', 'domicilio', 'envío', 'envio', 'me interesa', 'lo quiero', 'cómo pago', 'como pago', 'cómo compro', 'como compro', 'quiero uno', 'quiero comprar', 'cuantos', 'disponible', 'tienes', 'hay']

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

  // ── Análisis de cliente ───────────────────────────────────────
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false)
  const [clientAnalysis,    setClientAnalysis]    = useState(() => { try { return JSON.parse(localStorage.getItem('wa_client_analysis') || '{}') } catch { return {} } })
  const [analysisLoading,   setAnalysisLoading]   = useState(false)

  // ── Etiquetas persistentes por chat ──────────────────────────
  const [chatsTags,         setChatsTags]         = useState(() => { try { return JSON.parse(localStorage.getItem('wa_chats_tags') || '{}') } catch { return {} } })
  const [n8nOk,       setN8nOk]       = useState(null)
  const [curFlow,     setCurFlow]     = useState('bienvenida')
  const [builderOpen, setBuilderOpen] = useState(false)
  const [nodes,       setNodes]       = useState([])
  const [selNode,     setSelNode]     = useState(null)
  const [zoom,        setZoom]        = useState(0.88)
  const [pan,         setPan]         = useState({ x: 30, y: 18 })
  const [cfgTab,      setCfgTab]      = useState('conn')

  const [attachOpen,        setAttachOpen]        = useState(false)
  const [sending,           setSending]           = useState(false)
  const [isRecording,       setIsRecording]       = useState(false)
  const [recordingSeconds,  setRecordingSeconds]  = useState(0)
  const [showEmojiPanel,    setShowEmojiPanel]    = useState(false)
  const [emojiTab,          setEmojiTab]          = useState('emojis')
  const [showTemplatesModal,setShowTemplatesModal]= useState(false)
  const [contactTags,       setContactTags]       = useState(['Nuevo lead'])
  const [availableTags,     setAvailableTags]     = useState(DEFAULT_TAGS)
  const [showTagsDropdown,  setShowTagsDropdown]  = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [contactStatus,     setContactStatus]     = useState('Nuevo')

  // ── IA / ChatGPT ──────────────────────────────────────────────
  const [serverOnline,       setServerOnline]       = useState(null)
  const [aiEnabled,          setAiEnabled]          = useState(() => { try { return JSON.parse(localStorage.getItem('wa_ai_enabled') || 'false') } catch { return false } })
  const [aiContactMap,       setAiContactMap]       = useState(() => { try { return JSON.parse(localStorage.getItem('wa_ai_contact_map') || '{}') } catch { return {} } })
  // ── Disparadores por contacto (true = activos, false = pausados para ese chat) ──
  const [triggerContactMap,  setTriggerContactMap]  = useState(() => { try { return JSON.parse(localStorage.getItem('wa_trigger_contact_map') || '{}') } catch { return {} } })
  const [openaiKey,          setOpenaiKey]          = useState(() => { try { return localStorage.getItem('wa_openai_key') || '' } catch { return '' } })
  const [geminiKey,          setGeminiKey]          = useState(() => { try { return localStorage.getItem('wa_gemini_key') || '' } catch { return '' } })
  const [aiModel,        setAiModel]        = useState('gpt-4o')
  const [aiPrompt,       setAiPrompt]       = useState(() => { try { return localStorage.getItem('wa_ai_prompt') || 'Eres el asistente virtual de Sanate, una tienda de salud natural. Responde de forma amable, breve y clara en español.' } catch { return 'Eres el asistente virtual de Sanate, una tienda de salud natural. Responde de forma amable, breve y clara en español.' } })

  // ── Entrenamiento IA ──────────────────────────────────────────
  const [trainingPrompt,   setTrainingPrompt]   = useState(() => { try { return localStorage.getItem('wa_training_prompt') || TRAINING_TEMPLATE } catch { return TRAINING_TEMPLATE } })
  const [trainingTab,      setTrainingTab]      = useState('asistente')
  const [generatingPrompt, setGeneratingPrompt] = useState(false)
  const [trainingChars,    setTrainingChars]     = useState(0)
  // Wizard de entrenamiento
  const [wizardData, setWizardData] = useState({
    empresa: '', descripcion: '', productos: '', precios: '', combos: '',
    estilo: 'amigable', objeciones: '', envio: '', horario: '', extra: ''
  })
  const [generatingWizard, setGeneratingWizard] = useState(false)

  // ── Clientes ──────────────────────────────────────────────────
  const [clientes,       setClientes]       = useState(() => { try { return JSON.parse(localStorage.getItem('wa_clientes') || '[]') } catch { return [] } })
  const [clienteSearch,  setClienteSearch]  = useState('')
  const [clienteDetail,  setClienteDetail]  = useState(null)  // cliente seleccionado

  // ── Disparadores ──────────────────────────────────────────────
  const [triggers,         setTriggers]         = useState(() => { try { return JSON.parse(localStorage.getItem('wa_triggers') || 'null') || DEFAULT_TRIGGERS } catch { return DEFAULT_TRIGGERS } })
  const [editTrigger,      setEditTrigger]      = useState(null)   // trigger en edición (null=cerrado)
  const [generatingTrigger,setGeneratingTrigger]= useState(false)

  // ── Geo & Timing ──────────────────────────────────────────────
  const [botDelay,       setBotDelay]       = useState(() => { try { return parseInt(localStorage.getItem('wa_bot_delay') || '3') } catch { return 3 } })
  const [simulateTyping, setSimulateTyping] = useState(true)

  // ── AI Message Style ──────────────────────────────────────────
  const [msgMode,   setMsgMode]   = useState(() => { try { return localStorage.getItem('wa_msg_mode') || 'partes' } catch { return 'partes' } })
  const [useEmojis, setUseEmojis] = useState(() => { try { return JSON.parse(localStorage.getItem('wa_use_emojis') ?? 'true') } catch { return true } })
  const [useStyles, setUseStyles] = useState(() => { try { return JSON.parse(localStorage.getItem('wa_use_styles') ?? 'true') } catch { return true } })

  // ── Backend URL & Secret ──────────────────────────────────────
  const [backendUrlInput, setBackendUrlInput] = useState(() => BU.replace('/api/whatsapp', ''))
  const [secretInput,     setSecretInput]     = useState(() => H['x-secret'])

  // ── AI reply generator ────────────────────────────────────────
  const [generatingAiReply, setGeneratingAiReply] = useState(false)
  const [aiTyping,          setAiTyping]          = useState(false) // indicator "IA respondiendo..."

  // Auto-reply deduplication: IDs ya procesados por el bot automático
  const aiProcessedRef      = useRef(new Set())
  const autoReplyingRef     = useRef(false)
  const autoReplyTimerRef   = useRef(null)  // debounce timer
  const autoReplyGenRef     = useRef(0)     // generación: se incrementa para cancelar respuesta en curso
  const chatOpenedAtRef     = useRef(0)     // timestamp al abrir chat — evita responder historial
  const kwFiredRef          = useRef(new Set()) // dedup para triggers de palabra clave (msgId_triggerId)

  const msgsRef          = useRef(null)
  const qrRef            = useRef(null)
  const dragRef          = useRef({})
  const fileImgRef       = useRef(null)
  const fileAudRef       = useRef(null)
  const fileDocRef       = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef   = useRef([])
  const emojiPanelRef    = useRef(null)
  const tagsDropdownRef  = useRef(null)
  const statusDropdownRef = useRef(null)

  const tip    = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const scroll = ()  => setTimeout(() => { if (msgsRef.current) msgsRef.current.scrollTop = 9999 }, 100)

  // Ocultar FloatingMenuDashboard mientras estamos en esta página
  useEffect(() => { // eslint-disable-line
    document.body.classList.add('wabotPage')
    return () => document.body.classList.remove('wabotPage')
  }, []) // eslint-disable-line

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
  }, [active?.id, status]) // eslint-disable-line

  // Cuando cambia el chat: limpiar estado de IA y cancelar cualquier respuesta pendiente
  useEffect(() => { // eslint-disable-line
    if (!active) return
    setAiTyping(false)
    autoReplyingRef.current = false
    autoReplyGenRef.current += 1           // invalida cualquier respuesta en vuelo del chat anterior
    clearTimeout(autoReplyTimerRef.current) // cancela debounce pendiente del chat anterior
    aiProcessedRef.current = new Set()     // limpia dedup — chat nuevo = pizarra en blanco
    kwFiredRef.current     = new Set()     // limpia dedup de triggers de keyword
  }, [active?.id]) // eslint-disable-line

  // ── Auto-reply: detectar mensajes nuevos entrantes y responder automáticamente ──
  useEffect(() => { // eslint-disable-line
    if (!active || !msgs.length) return
    const incoming = msgs.filter(m => m.dir === 'r')
    if (!incoming.length) return
    const lastIn = incoming[incoming.length - 1]

    // Dedup por ID
    if (aiProcessedRef.current.has(lastIn.id)) return
    // Dedup secundario por contenido (evita duplicados cuando el mismo mensaje llega
    // con timestamps distintos entre polls y genera IDs diferentes)
    const contentKey = `r_${(lastIn.txt || '').substring(0, 40)}`
    if (aiProcessedRef.current.has(contentKey)) return
    aiProcessedRef.current.add(lastIn.id)
    aiProcessedRef.current.add(contentKey)

    // Grace period de 4s al abrir el chat para no responder el historial
    if (Date.now() - chatOpenedAtRef.current < 4000) return

    // ── Disparadores de Palabra Clave (independientes de IA ON/OFF) ──────────
    if (lastIn.txt && isTriggerActive(active.id)) {
      const msgLow = lastIn.txt.toLowerCase()
      const kwTriggers = triggers.filter(t => t.active && t.condition === 'keyword' && t.keyword && t.message)
      for (const trig of kwTriggers) {
        const kwList = trig.keyword.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
        if (kwList.some(kw => msgLow.includes(kw))) {
          const dedupKey = `${lastIn.id}_${trig.id}`
          if (!kwFiredRef.current.has(dedupKey)) {
            kwFiredRef.current.add(dedupKey)
            const capturedId = active.id
            setTimeout(() => sendTriggerKeywordMsg(trig, capturedId), 900)
          }
          break // solo un trigger por mensaje
        }
      }
    }

    // Verificar que IA esté ON para este chat y haya API key
    if (!isAiActive(active.id)) return
    if (!hasAiKey) return
    // Si la IA ya estaba generando una respuesta → cancelarla (el cliente mandó algo nuevo)
    if (autoReplyingRef.current) {
      autoReplyGenRef.current += 1
      autoReplyingRef.current = false
      setAiTyping(false)
    }
    // Auto-etiquetar pedido si se detectan keywords de compra
    if (lastIn.txt) autoTagOrder(active.id, lastIn.txt)

    // Debounce: respetar el botDelay configurado en Ajustes
    // Lee directamente de localStorage para evitar stale closure
    const configDelay = Math.max(0, parseInt(localStorage.getItem('wa_bot_delay') || '3') || 0)
    // Mínimo 400ms (natural feel) + debounce para esperar si el cliente sigue escribiendo
    const totalDelay = configDelay * 1000 + 400
    // ⚠️ Capturar chatId AHORA (antes del timeout) para evitar stale closure.
    // Si el usuario cambia de chat durante la espera, el chatId capturado ya no coincide
    // con active.id al disparar → autoReplyToMsg aborta y NO responde en el chat incorrecto.
    const capturedChatId = active.id
    clearTimeout(autoReplyTimerRef.current)
    autoReplyTimerRef.current = setTimeout(() => autoReplyToMsg(lastIn, capturedChatId), totalDelay)
  }, [msgs]) // eslint-disable-line

  // ── Persistir etiquetas cuando el usuario las cambia manualmente ─
  useEffect(() => { // eslint-disable-line
    if (active?.id) saveContactTagsMap(active.id, contactTags)
  }, [contactTags]) // eslint-disable-line

  // Restaurar chat activo desde localStorage cuando se conecta
  useEffect(() => { // eslint-disable-line
    if (status !== 'connected') return
    const saved = activeGet()
    if (saved && !active) {
      setActive(saved)
      loadM(saved.id, false)
    }
  }, [status]) // eslint-disable-line

  // Polling QR agresivo cuando estamos en página conexion esperando QR
  useEffect(() => { // eslint-disable-line
    if (page !== 'conexion' || (status !== 'connecting' && status !== 'qr')) return
    const t = setInterval(loadQR, 2500)
    return () => clearInterval(t)
  }, [page, status]) // eslint-disable-line

  // Redibujar QR en canvas cuando cambia la URL, la página o el status
  useEffect(() => {
    if (page !== 'conexion') return
    setTimeout(() => {
      if (status === 'connected') drawQRConnected()
      else if (qrDataUrl) drawQR(qrDataUrl)
      else drawQRWaiting()
    }, 80)
  }, [page, qrDataUrl, status]) // eslint-disable-line

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

  // Recording timer
  useEffect(() => {
    if (!isRecording) { setRecordingSeconds(0); return }
    const iv = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    return () => clearInterval(iv)
  }, [isRecording])

  // Close emoji panel on outside click
  useEffect(() => {
    if (!showEmojiPanel) return
    const handler = e => {
      if (emojiPanelRef.current && !emojiPanelRef.current.contains(e.target)) {
        setShowEmojiPanel(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showEmojiPanel])

  // Close tags dropdown on outside click
  useEffect(() => {
    if (!showTagsDropdown) return
    const handler = e => {
      if (tagsDropdownRef.current && !tagsDropdownRef.current.contains(e.target)) {
        setShowTagsDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showTagsDropdown])

  // Close status dropdown on outside click
  useEffect(() => {
    if (!showStatusDropdown) return
    const handler = e => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target)) {
        setShowStatusDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showStatusDropdown])

  // Load tags from localStorage (shared with settings)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('whatsapp_tags')
      const parsed = raw ? JSON.parse(raw) : null
      if (Array.isArray(parsed) && parsed.length) setAvailableTags(parsed)
    } catch {}
  }, [showTagsDropdown])

  const formatRecTime = s => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const url  = URL.createObjectURL(blob)
        const t    = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
        setMsgs(prev => [...prev, { id: Date.now().toString(), dir: 's', txt: '', time: t, type: 'audio', mediaUrl: url, status: 'sent' }])
        stream.getTracks().forEach(tr => tr.stop())
        scroll()
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch { tip('❌ No se pudo acceder al micrófono. Verifica permisos del navegador.') }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current.stop()
    setIsRecording(false)
  }

  const QUICK_TEMPLATES = [
    { id: 't1', name: 'Bienvenida', category: 'Saludo',  description: '¡Hola! ¿En qué te puedo ayudar hoy?' },
    { id: 't2', name: 'Seguimiento', category: 'Ventas', description: 'Hola {nombre}, ¿pudiste revisar la información que te envié?' },
    { id: 't3', name: 'Pago pendiente', category: 'Cobro', description: 'Hola, te recordamos que tienes un pago pendiente. ¿Deseas proceder?' },
    { id: 't4', name: 'Confirmación pedido', category: 'Pedidos', description: 'Tu pedido #{numero} ha sido confirmado. ¡Gracias por tu compra!' },
  ]

  function sendTemplate(tpl) {
    const t = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    setMsgs(prev => [...prev, { id: Date.now().toString(), dir: 's', txt: `📋 ${tpl.name} — ${tpl.description}`, time: t, type: 'text', status: 'sent' }])
    setShowTemplatesModal(false)
    scroll()
  }

  // ─── API ──────────────────────────────────────────
  // ╔══════════════════════════════════════════════════════════════╗
  // ║  🔒 QR CRÍTICO — NO MODIFICAR ESTAS FUNCIONES              ║
  // ║  ping · loadQR · drawQR · drawQRWaiting · regenerateQR     ║
  // ║  Cualquier cambio en estas 5 funciones puede romper el QR  ║
  // ╚══════════════════════════════════════════════════════════════╝
  async function ping() {
    try {
      const d = await (await fetch(BU + '/status', { headers: H })).json()
      setServerOnline(true)
      // IMPORTANTE: evaluar correctamente; sin paréntesis la precedencia es incorrecta
      const s = (d.ok === false) ? 'disconnected' : (d.status || 'disconnected')
      setStatus(s)
      setPhone(d.phone || '')
      if (s === 'connected') { try { await loadC() } catch {}; setTimeout(drawQRConnected, 80) }
      else if (s === 'connecting' || s === 'qr') { loadQR() }
    } catch { setServerOnline(false); setStatus('disconnected') }
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

  // Canvas de éxito: QR skeleton en verde con checkmark overlay cuando está conectado
  function drawQRConnected() {
    const canvas = qrRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d'), s = 200
    // Fondo verde muy suave
    ctx.fillStyle = '#f0fdf4'; ctx.fillRect(0, 0, s, s)
    ctx.setLineDash([5, 4]); ctx.strokeStyle = '#86efac'; ctx.lineWidth = 1.5
    ctx.strokeRect(6, 6, s - 12, s - 12); ctx.setLineDash([])
    // Tres esquinas finder-pattern en tonos verdes
    for (const [x, y] of [[14,14],[142,14],[14,142]]) {
      ctx.fillStyle = '#bbf7d0'; ctx.fillRect(x, y, 44, 44)
      ctx.fillStyle = '#f0fdf4'; ctx.fillRect(x+6, y+6, 32, 32)
      ctx.fillStyle = '#86efac'; ctx.fillRect(x+11, y+11, 22, 22)
    }
    // Patrón central de puntos verdes
    ctx.fillStyle = '#86efac'
    for (let r=0;r<6;r++) for (let c=0;c<6;c++)
      if ((r+c)%2===0) ctx.fillRect(74+c*9, 74+r*9, 7, 7)
    // Overlay verde semitransparente
    ctx.fillStyle = 'rgba(22, 163, 74, 0.78)'; ctx.fillRect(0, 0, s, s)
    // Círculo blanco central
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath()
    ctx.arc(s/2, s/2 - 10, 48, 0, Math.PI * 2); ctx.fill()
    // Checkmark grande
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.setLineDash([])
    ctx.beginPath(); ctx.moveTo(s/2-22, s/2-8); ctx.lineTo(s/2-4, s/2+12); ctx.lineTo(s/2+26, s/2-20)
    ctx.stroke()
    // Texto "Conectado"
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui,sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
    ctx.fillText('✓ Conectado', s/2, s - 14)
  }

  async function loadC() {
    const d = await (await fetch(BU + '/chats', { headers: H })).json()
    const loaded = (d.chats || []).map(normChat)
    setChats(loaded)
    // Auto-fetch fotos de perfil en segundo plano (primeros 30 chats)
    loaded.slice(0, 30).forEach(c => {
      fetch(`${BU}/chats/${encodeURIComponent(c.id)}/photo`, { headers: H })
        .then(r => r.json())
        .then(p => { if (p.ok && p.photoUrl) setChats(prev => prev.map(x => x.id === c.id ? { ...x, photoUrl: p.photoUrl } : x)) })
        .catch(() => {})
    })
  }

  async function loadM(chatId, sc = true) {
    // Mostrar caché inmediatamente
    const cached = cacheGet(chatId)
    if (cached.length) { setMsgs(cached); if (sc) scroll() }
    try {
      const d = await (await fetch(`${BU}/chats/${encodeURIComponent(chatId)}/messages`, { headers: H })).json()
      if (d.ok && Array.isArray(d.messages)) {
        const norm = d.messages.map(normMsg)
        cachePut(chatId, norm)
        setMsgs(norm)
        if (sc) scroll()
      }
    } catch {}
  }

  async function openChat(c) {
    chatOpenedAtRef.current = Date.now() // marca tiempo de apertura — grace period anti-historial
    aiProcessedRef.current.clear()        // limpiar procesados del chat anterior
    setActive(c); setShowContact(false); setShowAnalysisPanel(false)
    activePut(c)
    saveClienteFromChat(c)  // auto-registrar cliente
    // Restaurar etiquetas persistentes de este chat
    const savedTags = chatsTags[c.id] || ['Nuevo lead']
    setContactTags(savedTags)
    await loadM(c.id)
    setChats(p => p.map(x => x.id === c.id ? { ...x, unread: 0 } : x))
    fetch(`${BU}/chats/${encodeURIComponent(c.id)}/read`, { method: 'POST', headers: H }).catch(() => {})
    // Cargar foto de perfil desde WhatsApp (sincronizar)
    fetch(`${BU}/chats/${encodeURIComponent(c.id)}/photo`, { headers: H })
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.photoUrl) {
          const updated = { ...c, photoUrl: d.photoUrl }
          setActive(updated)
          activePut(updated)
          setChats(p => p.map(x => x.id === c.id ? { ...x, photoUrl: d.photoUrl } : x))
        }
      })
      .catch(() => {})
  }

  async function send() {
    if (!inp.trim() || !active || status !== 'connected') return
    setSending(true)
    try {
      const fd = new FormData()
      fd.append('text', inp)
      const r = await fetch(`${BU}/chats/${encodeURIComponent(active.id)}/send`, { method: 'POST', headers: H, body: fd })
      const d = await r.json()
      const t = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
      const newMsg = { id: d.message?.providerMessageId || Date.now().toString(), dir: 's', txt: inp, time: t, type: 'text', mediaUrl: '', status: 'sent' }
      setMsgs(p => { const next = [...p, newMsg]; cachePut(active.id, next); return next })
      setInp(''); scroll()
    } catch { tip('⚠️ Error al enviar') }
    setSending(false)
  }

  async function sendFile(file, type) {
    if (!file || !active || status !== 'connected') return
    setSending(true); setAttachOpen(false)
    tip('📤 Enviando archivo...')
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (type) fd.append('type', type)
      const r  = await fetch(`${BU}/chats/${encodeURIComponent(active.id)}/send`, { method: 'POST', headers: H, body: fd })
      const d  = await r.json()
      if (d.ok) {
        const t = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
        const mime = file.type || ''
        const mediaUrl = d.message?.mediaUrl || URL.createObjectURL(file)
        const ft = type || (mime.startsWith('image') ? 'image' : mime.startsWith('audio') ? 'audio' : mime.startsWith('video') ? 'video' : 'document')
        const newMsg = { id: d.message?.providerMessageId || Date.now().toString(), dir: 's', txt: '', time: t, type: ft, mediaUrl, mimeType: mime, fileName: file.name, status: 'sent' }
        setMsgs(p => { const next = [...p, newMsg]; cachePut(active.id, next); return next })
        scroll(); tip('✅ Archivo enviado')
      } else { tip('⚠️ Error: ' + (d.error || 'no se pudo enviar')) }
    } catch { tip('⚠️ Error al enviar archivo') }
    setSending(false)
  }

  async function regenerateQR() {
    setQrDataUrl(null); setStatus('connecting')
    // drawQRWaiting después de que React renderice el canvas (si no estaba visible)
    setTimeout(drawQRWaiting, 80)
    try { await fetch(BU + '/logout', { method: 'POST', headers: H }) } catch {}
    tip('🔄 Generando QR...')
    setTimeout(loadQR, 2000)
    setTimeout(loadQR, 4500)
    setTimeout(loadQR, 7000)
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

  // ── IA / ChatGPT helpers ───────────────────────────────────────
  function saveAiKey(v)     { setOpenaiKey(v);   try { localStorage.setItem('wa_openai_key', v) } catch {} }
  function saveGeminiKey(v) { setGeminiKey(v);   try { localStorage.setItem('wa_gemini_key', v) } catch {} }
  function saveAiPrompt(v)  { setAiPrompt(v);    try { localStorage.setItem('wa_ai_prompt', v) } catch {} }

  // ── Llamada IA universal (OpenAI o Gemini) ─────────────────────
  async function callAI({ messages, maxTokens = 400 }) {
    // Preferir OpenAI si hay key, fallback a Gemini
    if (openaiKey) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
        body: JSON.stringify({ model: aiModel || 'gpt-4o', messages, max_tokens: maxTokens }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error.message || 'OpenAI error')
      return data.choices?.[0]?.message?.content?.trim() || ''
    }
    if (geminiKey) {
      // Convertir formato OpenAI → Gemini
      const systemMsg = messages.find(m => m.role === 'system')
      const userMsgs  = messages.filter(m => m.role !== 'system')
      const parts = []
      if (systemMsg) parts.push({ text: systemMsg.content + '\n\n' })
      userMsgs.forEach(m => parts.push({ text: (m.role === 'user' ? '' : '[Bot]: ') + m.content }))
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { temperature: 0.8, maxOutputTokens: maxTokens },
          }),
        }
      )
      const data = await res.json()
      if (data.error) throw new Error(data.error.message || 'Gemini error')
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
    }
    throw new Error('no_key')
  }
  const hasAiKey = !!(openaiKey || geminiKey)
  function toggleAiGlobal() {
    setAiEnabled(prev => {
      const next = !prev
      try { localStorage.setItem('wa_ai_enabled', JSON.stringify(next)) } catch {}
      tip(next ? '🤖 IA activada — respuestas automáticas ON' : '🤖 IA desactivada')
      return next
    })
  }
  function toggleAiContact(chatId) {
    setAiContactMap(prev => {
      const next = { ...prev, [chatId]: prev[chatId] !== true }
      try { localStorage.setItem('wa_ai_contact_map', JSON.stringify(next)) } catch {}
      return next
    })
  }
  function resetAllAiContacts() {
    setAiContactMap({})
    try { localStorage.setItem('wa_ai_contact_map', '{}') } catch {}
    tip('🚫 IA desactivada en todos los contactos')
  }
  // IA activa SOLO si hay activación explícita para este contacto (true en aiContactMap)
  // Y además el global aiEnabled está ON (interruptor maestro en Ajustes).
  // Esto evita que todos los chats respondan automáticamente — cada contacto debe
  // ser activado individualmente con el botón "🤖 IA OFF → IA ON" del header del chat.
  function isAiActive(chatId) {
    if (!aiEnabled) return false           // interruptor maestro apagado → nada responde
    return aiContactMap[chatId] === true   // debe ser activación explícita por contacto
  }

  // ── Disparadores por contacto ─────────────────────────────────
  // Por defecto los triggers están ACTIVOS para todos. El usuario puede pausarlos por contacto.
  function isTriggerActive(chatId) {
    if (!chatId) return true
    const override = triggerContactMap[chatId]
    return override === undefined ? true : override   // default: ON
  }
  function toggleTriggerContact(chatId) {
    if (!chatId) return
    setTriggerContactMap(prev => {
      const updated = { ...prev, [chatId]: !isTriggerActive(chatId) }
      try { localStorage.setItem('wa_trigger_contact_map', JSON.stringify(updated)) } catch {}
      return updated
    })
    tip(isTriggerActive(chatId) ? '⚡ Disparadores pausados para este contacto' : '⚡ Disparadores reactivados para este contacto')
  }

  // ── Auto-reply automático cuando llega un mensaje nuevo y la IA está ON ──
  // ── Enviar mensaje de disparador por palabra clave ────────────
  async function sendTriggerKeywordMsg(trigger, targetChatId) {
    if (!targetChatId) return
    const clientName = chats.find(c => c.id === targetChatId)?.name || targetChatId.split('@')[0] || 'Cliente'
    const text = (trigger.message || '')
      .replace(/\{nombre\}/g, clientName)
      .replace(/\{tienda\}/g, 'Sanate')
      .replace(/\{telefono\}/g, targetChatId.split('@')[0])
    if (!text.trim()) return
    try {
      await fetch(`${BU}/chats/${encodeURIComponent(targetChatId)}/presence`, {
        method: 'POST', headers: HJ, body: JSON.stringify({ action: 'composing' }),
      }).catch(() => {})
      await new Promise(r => setTimeout(r, Math.min(900, text.length * 12)))
      const fd = new FormData(); fd.append('text', text)
      const r = await fetch(`${BU}/chats/${encodeURIComponent(targetChatId)}/send`, { method: 'POST', headers: H, body: fd })
      const d = await r.json()
      const t = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
      const newMsg = { id: d.message?.providerMessageId || `kw_${Date.now()}`, dir: 's', txt: text, time: t, type: 'text', mediaUrl: '', status: 'sent' }
      if (active?.id === targetChatId) {
        setMsgs(p => { const next = [...p, newMsg]; cachePut(targetChatId, next); return next })
        scroll()
      }
      tip(`⚡ Disparador "${trigger.name}" enviado`)
      await fetch(`${BU}/chats/${encodeURIComponent(targetChatId)}/presence`, {
        method: 'POST', headers: HJ, body: JSON.stringify({ action: 'paused' }),
      }).catch(() => {})
    } catch { tip('⚠️ Error enviando disparador de palabra clave') }
  }

  async function autoReplyToMsg(lastClientMsg, targetChatId) {
    if (!hasAiKey || !active || autoReplyingRef.current) return
    // Si el usuario cambió de chat durante el delay del debounce → abortar.
    // targetChatId fue capturado al momento de programar el timeout (antes del delay).
    if (targetChatId && active.id !== targetChatId) return
    autoReplyingRef.current = true
    const chatId = targetChatId || active.id
    const myGen = ++autoReplyGenRef.current  // capturar generación — si cambia, abortar
    setAiTyping(true)
    try {
      // Leer siempre de localStorage para evitar closures stale con el entrenamiento
      const lsTraining = (function(){ try { return localStorage.getItem('wa_training_prompt') || '' } catch { return '' } })()
      const lsPrompt   = (function(){ try { return localStorage.getItem('wa_ai_prompt') || '' } catch { return '' } })()
      const ctx = (trainingPrompt || lsTraining || aiPrompt || lsPrompt || '').substring(0, 5000)
      const history = msgs.slice(-10).map(m => ({
        role: m.dir === 'r' ? 'user' : 'assistant',
        content: m.txt || '[archivo]',
      }))
      // Perfil del cliente si existe
      const profile = clientAnalysis[chatId]
      const profileCtx = profile ? `\nPERFIL DEL CLIENTE ACTUAL:\n• Estilo: ${profile.estilo} | Tono: ${profile.tono} | Intención de compra: ${profile.intencion}\n• Intereses: ${(profile.intereses||[]).join(', ')}\n• Ángulo recomendado: ${profile.angulo || 'N/A'}\n` : ''

      // Leer preferencias de estilo desde localStorage (evita stale closures)
      const lsMsgMode   = (function(){ try { return localStorage.getItem('wa_msg_mode') || 'partes' } catch { return 'partes' } })()
      const lsUseEmojis = (function(){ try { return JSON.parse(localStorage.getItem('wa_use_emojis') ?? 'true') } catch { return true } })()
      const lsUseStyles = (function(){ try { return JSON.parse(localStorage.getItem('wa_use_styles') ?? 'true') } catch { return true } })()

      // Bloque: formato de texto
      const stylesBlock = lsUseStyles
        ? `• FORMATO WhatsApp: *negrita* (un asterisco cada lado), _cursiva_, ~tachado~ — úsalos en precios, nombres de combos y beneficios clave\n• Ejemplo: *Combo Detox* — *$66.000* | _envío gratis_ hoy\n• NUNCA uses **doble asterisco** — solo *uno a cada lado*`
        : `• Texto plano ÚNICAMENTE — sin asteriscos, guiones bajos ni tildes de formato\n• PROHIBIDO usar *negritas*, _cursiva_ o ~tachado~`

      // Bloque: emojis
      const emojisBlock = lsUseEmojis
        ? `• Emojis: máx 2 por mensaje, úsalos como viñetas o énfasis estratégico`
        : `• PROHIBIDO usar emojis — responde solo con texto plano`

      // Bloque: envío por partes o completo
      const multiMsgBlock = lsMsgMode === 'partes'
        ? `ENVÍO POR PARTES (MUY IMPORTANTE):
Divide tu respuesta en 2 a 5 mensajes cortos separados por el separador EXACTO: ||||
Reglas para cada parte:
• Parte 1 → gancho o contexto inicial — abre con intriga o dato interesante, NO reveles todo
• Partes intermedias → desarrolla punto por punto, cada una termina dejando curiosidad o una mini-pregunta
• Última parte → pregunta de cierre de venta ("¿Cuál prefieres?" / "¿Te lo enviamos hoy?" / "¿Arrancamos?")
Estructura inteligente por tipo de situación:
  - Si el cliente pregunta por productos: parte 1 = beneficio + hook | parte 2 = opción principal | parte 3 = opción alternativa | última = pregunta de decisión
  - Si el cliente muestra objeción: parte 1 = empatía | parte 2 = reencuadre de valor | última = cierre con urgencia o elección
  - Si el cliente ya quiere comprar: máx 2 partes — confirma + cierra directo
Ejemplo correcto:
Tenemos varias opciones que te pueden funcionar${lsUseEmojis ? ' 🌿' : ''}
||||
${lsUseStyles ? '*Combo Avena y Arroz*' : 'Combo Avena y Arroz'} — ideal para piel sensible${lsUseEmojis ? ' ✨' : ''} — ${lsUseStyles ? '*$66.000*' : '$66.000'}
||||
${lsUseStyles ? '*Combo Cúrcuma*' : 'Combo Cúrcuma'} — manchas y cicatrices${lsUseEmojis ? ' 🌻' : ''} — ${lsUseStyles ? '*$66.000*' : '$66.000'}
||||
¿Cuál va más con lo que necesitas${lsUseEmojis ? ' 😊' : '?'}`
        : `ENVÍO COMPLETO:
Responde en UN SOLO MENSAJE bien estructurado (máx 6 líneas).
NO uses el separador |||| — todo en un bloque.
Organiza bien el texto con saltos de línea para que sea fácil de leer.`

      // ── EMBUDO DE VENTAS PROBADO (extraído de cierres reales de SellerChat / Sánate)
      const salesFunnelBlock = `EMBUDO DE VENTAS PROBADO — SIGUE ESTE ORDEN EXACTO:
PASO 1 — BIENVENIDA: Recibe calurosamente. Si viene de anuncio, celebra su llegada con entusiasmo.
PASO 2 — DIAGNÓSTICO (OBLIGATORIO antes de dar precios): Pregunta "¿Lo buscas para acné, manchas, piel seca o zonas íntimas/axilas?" — adapta tu recomendación a su problema real.
PASO 3 — PRESENTACIÓN: Recomienda el combo exacto para su problema. Muestra precio${lsUseStyles ? ' con *negrita*' : ''} ANTES / HOY. Menciona el obsequio ${lsUseEmojis ? '🎁' : 'especial'}.
PASO 4 — MICRO-COMPROMISO (elección forzada — OBLIGATORIO): "¿Cuál te llevas hoy, el${lsUseStyles ? ' *Combo 1*' : ' Combo 1'} o el${lsUseStyles ? ' *Combo 5*' : ' Combo 5'}? 💛" — NUNCA pregunta abierta al cierre.
PASO 5 — DATOS + CONFIRMACIÓN: Cuando el cliente elija: "¡Excelente elección! 💚✨ Para confirmar tu pedido envíame: 1️⃣ Nombre y Apellido / 📱 Teléfono / 📍 Ciudad y Departamento / 🏠 Dirección exacta / 📦 Barrio"

CATÁLOGO SÁNATE${lsUseStyles ? ' (escribe precios y nombres de combos siempre en *negrita*)' : ''}:
• ${lsUseStyles ? '*Combo 1*' : 'Combo 1'} – Tripack Mixto (3 Jabones: Caléndula+Cúrcuma+Avena&Arroz) → ${lsUseStyles ? '*$59.000*' : '$59.000'} (antes $105.000 — ahorras $46.000)
• ${lsUseStyles ? '*Combo 2*' : 'Combo 2'} – 3 Jabones a elección (Cúrcuma, Avena&Arroz o Caléndula) → ${lsUseStyles ? '*$59.000*' : '$59.000'} (antes $105.000)
• ${lsUseStyles ? '*Combo 3*' : 'Combo 3'} – 2 Jabones + Sebo de Res 10g → ${lsUseStyles ? '*$63.000*' : '$63.000'} (antes $79.000)
• ${lsUseStyles ? '*Combo 4*' : 'Combo 4'} – Secreto Japonés: Sebo grande + 2 Jabones (Cúrcuma+Avena) + Exfoliante → ${lsUseStyles ? '*$99.000*' : '$99.000'} (antes $119.000)
• ${lsUseStyles ? '*Combo 5*' : 'Combo 5'} – ${lsUseEmojis ? '⭐ ' : ''}MÁS VENDIDO: 4 Jabones + Sebo 10g + Exfoliante → ${lsUseStyles ? '*$119.000*' : '$119.000'} (antes $159.000)
• ${lsUseStyles ? '*Combo 6*' : 'Combo 6'} – Doble Sebo Grande: 2 Sebos + 2 Jabones a elección → ${lsUseStyles ? '*$136.900*' : '$136.900'} (antes $169.000)
• Jabón individual: ${lsUseStyles ? '*$22.000*' : '$22.000'}
Pago: contra entrega (efectivo) ó Nequi/Bancolombia (${lsUseStyles ? '*8% OFF*' : '8% OFF'} + envío más rápido ${lsUseEmojis ? '🚚💨' : ''})
Envío: GRATIS a toda Colombia ${lsUseEmojis ? '🚚' : ''} | Entrega 1-3 días hábiles | Inter Rapidísimo

FRASES DE CIERRE PROBADAS (úsalas textualmente — son las que funcionan en ventas reales):
• Validación inmediata: "¡Excelente elección! 💚✨" / "¡Genial! 🎉" / "¡Perfecto! ✅"
• Urgencia real: "Los precios y el obsequio son de hoy solamente${lsUseEmojis ? ' ⏰' : ''}"
• Escasez: "Se están agotando rápido — la reposición puede tardar hasta 15 días"
• Sin riesgo: "${lsUseEmojis ? '📦 ' : ''}Envío GRATIS${lsUseEmojis ? ' 💳' : ''} — pagas al recibir, sin riesgo"
• Post-datos recibidos: "¡Todo listo! ✅ Tu pedido está confirmado y en proceso${lsUseEmojis ? ' 🚀' : ''}"
• Post-confirmación: "Recuerda que tu pedido saldrá el mismo día y recibirás la guía de seguimiento por WhatsApp 💛"
• Reserve hook: "¿Te reservo el más vendido antes de que suba nuevamente? 💛"

REGLAS DE ORO:
❌ NUNCA des precio sin diagnosticar primero qué problema tiene el cliente
❌ NUNCA hagas preguntas abiertas al cierre — usa siempre elección forzada (A o B)
❌ NUNCA repitas la misma frase de apertura dos veces seguidas
✅ CELEBRA siempre cuando el cliente elige ("¡Excelente elección! 💚✨") ANTES de pedir datos
✅ Si preguntan envíos a su ciudad → confirma que SÍ llega, luego pide los datos
✅ Ofrece primero Nequi/transferencia (8% OFF), luego contra entrega como alternativa segura
✅ Cuando recibas todos los datos → envía confirmación entusiasta y cierra con calidez`

      const sysPrompt = ctx
        ? `${ctx}\n${profileCtx}\n---\nINSTRUCCIONES CRÍTICAS DE WHATSAPP:\n• Mensajes CORTOS: máximo 3-4 líneas POR MENSAJE\n${stylesBlock}\n${emojisBlock}\n• Varía saludos y aperturas — nunca repitas el mismo\n• Adapta el tono: si el cliente escribe informal, responde informal\n\n${multiMsgBlock}\n\n${salesFunnelBlock}\n\nPROHIBIDO SIEMPRE:\n❌ "¡Claro que sí!" / "¡Excelente pregunta!"\n❌ Más de 5 líneas en un solo segmento\n❌ Decir que eres IA o bot`
        : `Eres una asesora de ventas de Sánate Colombia — jabones artesanales naturales 100% colombianos. Eres una persona real — NUNCA te presentes como IA.\n${profileCtx}\nINSTRUCCIONES DE MENSAJE:\n• Mensajes cortos: máx 3-4 líneas\n${stylesBlock}\n${emojisBlock}\n• Varía saludos y apertura\n• Adapta el tono al estilo del cliente\n\n${multiMsgBlock}\n\n${salesFunnelBlock}\n\nPROHIBIDO:\n❌ Frases genéricas | ❌ Decir que eres IA | ❌ Precios antes del diagnóstico`
      // Mensaje actual del cliente para que la IA NO alucine sobre otros temas
      const currentMsgCtx = lastClientMsg.txt
        ? `\n\n⚡ MENSAJE ACTUAL DEL CLIENTE AL QUE DEBES RESPONDER:\n"${lastClientMsg.txt}"\nResponde SOLO a esto. No inventes temas que el cliente no haya mencionado.`
        : ''
      const finalSysPrompt = sysPrompt + currentMsgCtx

      const reply = await callAI({
        messages: [
          { role: 'system', content: finalSysPrompt },
          ...history,
        ],
        maxTokens: 480,
      })
      // Verificar que no haya llegado un mensaje nuevo que invalide esta generación
      if (!reply || active?.id !== chatId || autoReplyGenRef.current !== myGen) {
        setAiTyping(false); autoReplyingRef.current = false; return
      }

      // ── Soporte multi-mensaje: separar por ||||
      const parts = reply.split('||||').map(s => s.trim()).filter(Boolean)

      for (let pi = 0; pi < parts.length; pi++) {
        const part = parts[pi]
        // Verificar generación antes de cada segmento
        if (active?.id !== chatId || autoReplyGenRef.current !== myGen) break

        // Mostrar "escribiendo..." al cliente
        try {
          await fetch(`${BU}/chats/${encodeURIComponent(chatId)}/presence`, {
            method: 'POST', headers: HJ, body: JSON.stringify({ action: 'composing' }),
          })
        } catch {}

        // Delay de escritura: corto porque botDelay ya controló la espera previa
        const baseDelay = parts.length > 1 ? 400 : 500
        const typingMs = Math.max(baseDelay, Math.min(part.length * 10, parts.length > 1 ? 1200 : 1800))
        await new Promise(r => setTimeout(r, typingMs))

        // Re-verificar tras el delay
        if (active?.id !== chatId || autoReplyGenRef.current !== myGen) break

        // Enviar segmento
        const fd = new FormData(); fd.append('text', part)
        const r = await fetch(`${BU}/chats/${encodeURIComponent(chatId)}/send`, { method: 'POST', headers: H, body: fd })
        const d = await r.json()
        const t = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
        const newMsg = { id: d.message?.providerMessageId || `${Date.now()}_${pi}`, dir: 's', txt: part, time: t, type: 'text', mediaUrl: '', status: 'sent' }
        setMsgs(p => { const next = [...p, newMsg]; cachePut(chatId, next); return next })
        scroll()

        // Pausa breve entre mensajes para que se vea natural (excepto el último)
        if (pi < parts.length - 1) await new Promise(r => setTimeout(r, 350))
      }

      // Quitar "escribiendo..." al terminar
      try {
        await fetch(`${BU}/chats/${encodeURIComponent(chatId)}/presence`, {
          method: 'POST', headers: HJ, body: JSON.stringify({ action: 'paused' }),
        })
      } catch {}
    } catch (e) {
      if (e?.message !== 'no_key') tip('⚠️ Error auto-respuesta IA')
    }
    setAiTyping(false)
    autoReplyingRef.current = false
  }

  // ── Analizar inteligencia del cliente con IA ──────────────────
  async function analyzeClientIntelligence(chatId, msgsToAnalyze) {
    if (!hasAiKey || analysisLoading) return
    setAnalysisLoading(true)
    try {
      const clientMsgs = msgsToAnalyze.filter(m => m.dir === 'r')
      if (clientMsgs.length < 1) { tip('💬 No hay mensajes del cliente para analizar'); setAnalysisLoading(false); return }
      const conversation = msgsToAnalyze.slice(-25)
        .map(m => `[${m.dir === 'r' ? 'CLIENTE' : 'BOT'}]: ${m.txt || '[archivo/media]'}`)
        .join('\n')
      const prompt = `Analiza esta conversación de WhatsApp de ventas y responde ÚNICAMENTE con un JSON válido (sin markdown, sin explicaciones extra):
{
  "estilo": "formal|informal|muy informal",
  "tono": "ansioso|tranquilo|desconfiado|entusiasta|indiferente|impaciente",
  "intereses": ["lista de intereses detectados"],
  "intencion": "alta|media|baja",
  "objeciones": ["objeciones detectadas si hay, sino array vacío"],
  "angulo": "el mejor ángulo de venta personalizado para ESTE cliente (máx 1 frase)",
  "siguiente": "acción concreta recomendada para el bot ahora mismo (máx 1 frase)",
  "resumen": "perfil del cliente en 1-2 líneas",
  "es_cliente": true|false
}

CONVERSACIÓN:
${conversation}`
      const result = await callAI({ messages: [{ role: 'user', content: prompt }], maxTokens: 500 })
      if (result) {
        const jsonMatch = result.match(/\{[\s\S]*?\}/)
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0])
          setClientAnalysis(prev => {
            const updated = { ...prev, [chatId]: { ...analysis, ts: Date.now() } }
            try { localStorage.setItem('wa_client_analysis', JSON.stringify(updated)) } catch {}
            return updated
          })
          tip('🧠 Análisis actualizado')
        }
      }
    } catch (e) { tip('⚠️ Error al analizar: ' + (e?.message || 'revisa tu API Key')) }
    setAnalysisLoading(false)
  }

  // Envía mensaje via n8n (método legacy — mantenido para compatibilidad)
  async function sendAiReply(chatId, userMsg) {
    if (!openaiKey && !N8N_WH) return
    try {
      const payload = {
        chatId, message: userMsg, model: aiModel,
        systemPrompt: (trainingPrompt || aiPrompt),
        openaiKey, botDelay,
        phone: active?.phone || '', contactName: active?.name || '',
      }
      await fetch(N8N_WH, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), mode: 'no-cors' })
    } catch {}
  }

  // ── Entrenamiento helpers ──────────────────────────────────────
  // ── Guardar URL del backend Baileys ──────────────────────────
  function saveBackendUrl() {
    const base   = backendUrlInput.trim().replace(/\/+$/, '').replace('/api/whatsapp', '')
    if (!base) { tip('⚠️ Ingresa una URL válida'); return }
    const newBU  = base + '/api/whatsapp'
    const newSec = secretInput.trim() || DEFAULT_SECRET
    BU         = newBU
    MEDIA_BASE = base
    H          = { 'x-secret': newSec }
    HJ         = { ...H, 'Content-Type': 'application/json' }
    try { localStorage.setItem('wa_backend_url', newBU)   } catch {}
    try { localStorage.setItem('wa_secret',      newSec)  } catch {}
    tip('✅ Backend URL guardada — reconectando...')
    setTimeout(() => { setServerOnline(null); ping() }, 600)
  }

  function saveTraining(v) {
    setTrainingPrompt(v); setTrainingChars(v.length)
    try { localStorage.setItem('wa_training_prompt', v) } catch {}
  }
  async function generateWinnerPrompt() {
    if (!hasAiKey) { tip('⚠️ Configura tu API Key (OpenAI o Gemini) en Ajustes → API'); return }
    setGeneratingPrompt(true); tip('🤖 Generando prompt ganador con IA...')
    try {
      const generated = await callAI({
        messages: [
          { role: 'system', content: 'Eres el mejor experto en ventas conversacionales por WhatsApp del mundo. Genera prompts de sistema para bots de ventas que sean naturales, empáticos y cierren ventas de forma efectiva.' },
          { role: 'user', content: `Basándote en este contexto de negocio, genera un prompt de sistema completo y optimizado para un bot de WhatsApp que sea el mejor cerrador de ventas del mundo. Incluye personalidad, tono, técnicas de cierre, manejo de objeciones y reglas de comportamiento.\n\nContexto actual:\n${trainingPrompt.substring(0, 2000)}` },
        ],
        maxTokens: 1500,
      })
      if (generated) {
        saveTraining(trainingPrompt + '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🏆 PROMPT GANADOR GENERADO POR IA\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' + generated)
        tip('✅ Prompt ganador generado y agregado')
      }
    } catch (e) {
      tip(e?.message === 'no_key' ? '⚠️ Configura OpenAI o Gemini en Ajustes → API' : '⚠️ Error generando prompt')
    }
    setGeneratingPrompt(false)
  }

  // ── Clientes helpers ───────────────────────────────────────────
  function saveClienteFromChat(chat) {
    if (!chat?.id) return
    const existing = JSON.parse(localStorage.getItem('wa_clientes') || '[]')
    if (existing.find(c => c.id === chat.id)) return // ya guardado
    const geo = phoneToGeo(chat.phone || '')
    const newCliente = {
      id: chat.id, name: chat.name || '', phone: chat.phone || chat.id,
      pais: geo?.label?.split('·')[0]?.trim() || '', ciudad: geo?.label || '',
      flag: geo?.flag || '', totalPedidos: 0, noRecibidos: 0,
      etiqueta: 'Nuevo lead', primerMensaje: new Date().toLocaleDateString('es-CO'),
      ultimoMensaje: new Date().toLocaleDateString('es-CO'),
      direccion: '', notas: '', fotoUrl: chat.photoUrl || '',
    }
    const updated = [newCliente, ...existing]
    try { localStorage.setItem('wa_clientes', JSON.stringify(updated)) } catch {}
    setClientes(updated)
  }
  // ── Guardar etiquetas persistentes por chat ───────────────────
  function saveContactTagsMap(chatId, tags) {
    setChatsTags(prev => {
      const updated = { ...prev, [chatId]: tags }
      try { localStorage.setItem('wa_chats_tags', JSON.stringify(updated)) } catch {}
      return updated
    })
  }

  // ── Auto-asignar etiqueta "Preparar" cuando se detecta pedido ─
  function autoTagOrder(chatId, msgText) {
    if (!chatId || !msgText) return
    const text = msgText.toLowerCase()
    if (!ORDER_KEYWORDS.some(k => text.includes(k))) return
    const current = chatsTags[chatId] || []
    if (current.includes('Preparar')) return  // ya tiene la etiqueta
    const newTags = [...current.filter(t => t !== 'Nuevo lead'), 'Preparar']
    saveContactTagsMap(chatId, newTags)
    if (active?.id === chatId) setContactTags(newTags)
    tip('📦 Intención de pedido detectada → etiqueta "Preparar" asignada 🔵')
  }

  function updateCliente(id, fields) {
    setClientes(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, ...fields } : c)
      try { localStorage.setItem('wa_clientes', JSON.stringify(updated)) } catch {}
      return updated
    })
  }
  function deleteCliente(id) {
    setClientes(prev => {
      const updated = prev.filter(c => c.id !== id)
      try { localStorage.setItem('wa_clientes', JSON.stringify(updated)) } catch {}
      return updated
    })
    if (clienteDetail?.id === id) setClienteDetail(null)
  }

  // ── Disparadores helpers ───────────────────────────────────────
  function saveTriggers(updated) {
    setTriggers(updated)
    try { localStorage.setItem('wa_triggers', JSON.stringify(updated)) } catch {}
  }
  function toggleTrigger(id) {
    saveTriggers(triggers.map(t => t.id === id ? { ...t, active: !t.active } : t))
  }
  function deleteTrigger(id) {
    saveTriggers(triggers.filter(t => t.id !== id))
  }
  function saveTriggerEdit(trigger) {
    const existing = triggers.find(t => t.id === trigger.id)
    if (existing) { saveTriggers(triggers.map(t => t.id === trigger.id ? trigger : t)) }
    else { saveTriggers([...triggers, trigger]) }
    setEditTrigger(null)
    tip('✅ Disparador guardado')
  }
  async function generateTriggerMsg(triggerName) {
    if (!hasAiKey) { tip('⚠️ Configura tu API Key (OpenAI o Gemini) primero'); return }
    const producto = editTrigger?.producto || 'General'
    const condition = editTrigger?.condition || 'no_reply'
    const delay = editTrigger?.delay || 60
    const unit = editTrigger?.unit || 'min'
    setGeneratingTrigger(true); tip('🤖 Generando mensaje ganador con IA...')
    try {
      const condLabel = { no_reply: 'sin respuesta', seen: 'visto sin responder', no_purchase: 'sin compra', keyword: 'por palabra clave', first_message: 'primer mensaje' }[condition] || condition
      const timeLabel = `${delay} ${unit === 'min' ? 'minutos' : unit === 'h' ? 'horas' : 'días'}`
      const contextSnip = trainingPrompt ? trainingPrompt.substring(0, 600) : ''
      const msg = await callAI({
        messages: [
          { role: 'system', content: `Eres el mejor cerrador de ventas del mundo por WhatsApp.${contextSnip ? ` Contexto del negocio: "${contextSnip}"` : ''}\n\nReglas de oro:\n1. Primero conecta emocionalmente (1 frase)\n2. Menciona el producto "${producto}" naturalmente\n3. Da 1 beneficio clave (no precio aún)\n4. Cierra con UNA pregunta irresistible\n5. Máximo 3-4 líneas, 1-2 emojis, tono humano y cálido` },
          { role: 'user', content: `Genera el mensaje perfecto de seguimiento para WhatsApp.\nTrigger: "${triggerName}"\nProducto/Plantilla: "${producto}"\nSituación: cliente ${condLabel} después de ${timeLabel}\nUsa {nombre} para personalizar. Responde SOLO el mensaje, sin explicaciones.` },
        ],
        maxTokens: 250,
      })
      if (msg && editTrigger) setEditTrigger(prev => ({ ...prev, message: msg }))
      tip('✅ Mensaje ganador generado ✨')
    } catch (e) {
      tip(e?.message === 'no_key' ? '⚠️ Configura OpenAI o Gemini en Ajustes → API' : '⚠️ Error generando mensaje')
    }
    setGeneratingTrigger(false)
  }

  // ── Generar respuesta IA + enviar con simulación de escritura ──
  async function generateAiReply() {
    if (!hasAiKey) { tip('⚠️ Configura tu API Key (OpenAI o Gemini) en Ajustes → API'); return }
    const lastClientMsg = [...msgs].reverse().find(m => m.dir === 'r')
    if (!lastClientMsg) { tip('⚠️ No hay mensajes del cliente para analizar'); return }
    setGeneratingAiReply(true); setAiTyping(true); tip('🤖 Analizando ángulo de venta...')
    try {
      const ctx = (trainingPrompt || aiPrompt || '').substring(0, 4000)
      const history = msgs.slice(-12).map(m => ({ role: m.dir === 'r' ? 'user' : 'assistant', content: m.txt || '[archivo]' }))
      const reply = await callAI({
        messages: [
          { role: 'system', content: `Eres el mejor asesor de ventas por WhatsApp del mundo.\n\nContexto del negocio:\n${ctx}\n\nREGLAS ABSOLUTAS:\n1. Si el cliente hizo una PREGUNTA o pide información → da info clara del producto + beneficios + modo de uso (NO des precio todavía).\n2. Si el cliente muestra INTERÉS DE COMPRA ("cuánto cuesta", "lo quiero", "cómo pago") → da precio + oferta irresistible + pregunta de cierre.\n3. Primero CONECTA emocionalmente (1 frase cálida), luego informa o vende.\n4. Máximo 3-4 líneas. Tono humano y natural. 1-2 emojis estratégicos.\n5. Termina SIEMPRE con una pregunta que invite a seguir o a comprar.\n6. Nunca suenes a robot. Sé como una persona real escribiendo en WhatsApp.` },
          ...history,
          { role: 'user', content: `El cliente acaba de escribir: "${lastClientMsg.txt}"\n\nAnaliza si es una pregunta informativa o si hay intención de compra, y genera LA MEJOR respuesta de ventas posible. Responde SOLO el mensaje para enviar al cliente, sin explicaciones adicionales.` },
        ],
        maxTokens: 350,
      })
      if (!reply) { tip('⚠️ No se generó respuesta'); setGeneratingAiReply(false); return }

      // ── Simular escritura + enviar automáticamente ──
      if (active && status === 'connected') {
        tip('✍️ Enviando con efecto de escritura...')
        // 1. Enviar indicador "escribiendo..."
        try {
          await fetch(`${BU}/chats/${encodeURIComponent(active.id)}/presence`, {
            method: 'POST', headers: HJ,
            body: JSON.stringify({ action: 'composing' }),
          })
        } catch { /* si falla presence, igual enviamos */ }
        // 2. Esperar tiempo proporcional al largo del mensaje (mínimo 0.8s, máximo 2s)
        const typingMs = Math.max(800, Math.min(reply.length * 18, 2000))
        await new Promise(r => setTimeout(r, typingMs))
        // 3. Enviar el mensaje real
        try {
          const fd = new FormData(); fd.append('text', reply)
          const r = await fetch(`${BU}/chats/${encodeURIComponent(active.id)}/send`, { method: 'POST', headers: H, body: fd })
          const d = await r.json()
          const t = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
          const newMsg = { id: d.message?.providerMessageId || Date.now().toString(), dir: 's', txt: reply, time: t, type: 'text', mediaUrl: '', status: 'sent' }
          setMsgs(p => { const next = [...p, newMsg]; cachePut(active.id, next); return next })
          scroll()
          tip('✅ Respuesta enviada con éxito 🚀')
        } catch { tip('⚠️ Error al enviar la respuesta') }
        // 4. Desactivar indicador
        try {
          await fetch(`${BU}/chats/${encodeURIComponent(active.id)}/presence`, {
            method: 'POST', headers: HJ, body: JSON.stringify({ action: 'paused' }),
          })
        } catch { /* ignorar */ }
      } else {
        // No conectado: poner en el input para envío manual
        setInp(reply)
        tip('✅ Respuesta IA lista — revísala y envía 🚀')
      }
    } catch (e) {
      const msg = e?.message === 'no_key' ? '⚠️ Configura OpenAI o Gemini en Ajustes → API' : '⚠️ Error al generar respuesta con IA'
      tip(msg)
    }
    setGeneratingAiReply(false)
    setAiTyping(false)
  }

  // ── Generar entrenamiento ganador desde el wizard ──────────────
  async function generateTrainingWizard() {
    if (!hasAiKey) { tip('⚠️ Configura tu API Key (OpenAI o Gemini) primero'); return }
    const { empresa, descripcion, productos, precios, combos, estilo, objeciones, envio, horario, extra } = wizardData
    if (!empresa && !productos) { tip('⚠️ Llena al menos el nombre de empresa y tus productos'); return }
    setGeneratingWizard(true); tip('🤖 Generando entrenamiento ganador...')
    try {
      const estiloLabel = { amigable: 'amigable y cercano', profesional: 'profesional y formal', energico: 'energético y motivador', suave: 'suave y empático' }[estilo] || estilo
      const generated = await callAI({
        messages: [
          { role: 'system', content: 'Eres el mejor experto del mundo en entrenar bots de ventas por WhatsApp. Generas prompts de sistema completos, naturales y altamente efectivos que convierten conversaciones en ventas. El bot PRIMERO debe conservar la conversación siendo amigable e informativo, y DESPUÉS buscar el cierre de ventas de forma natural y sin presión.' },
          { role: 'user', content: `Genera el entrenamiento completo para un bot de WhatsApp cerrador de ventas con esta información del negocio:\n\n🏢 NEGOCIO: ${empresa || 'Tienda online'}\n📝 DESCRIPCIÓN: ${descripcion || 'Productos y servicios'}\n🛍️ PRODUCTOS: ${productos || 'No especificado'}\n💰 PRECIOS: ${precios || 'No especificado'}\n🎁 COMBOS/OFERTAS: ${combos || 'Sin combos especiales'}\n💬 ESTILO: ${estiloLabel}\n🔄 OBJECIONES COMUNES: ${objeciones || '"Está muy caro", "Necesito pensarlo"'}\n🚚 ENVÍO/LOGÍSTICA: ${envio || 'No especificado'}\n🕐 HORARIO: ${horario || 'No especificado'}\n✨ INFO ADICIONAL: ${extra || 'Ninguna'}\n\nEl entrenamiento DEBE incluir en formato claro con emojis:\n1. 🎯 Personalidad del asistente (primero conecta, luego vende)\n2. 🛍️ Productos y precios detallados\n3. 💥 Combos y ofertas especiales\n4. 💬 Estilo de conversación (conectar → informar → cerrar)\n5. ✅ Técnicas de cierre natural\n6. 🔄 Manejo de objeciones\n7. 🚫 Reglas de nunca hacer\n\nIMPORTANTE: El bot SIEMPRE conserva primero e intenta cierre de ventas después de forma natural y sin presión.` },
        ],
        maxTokens: 2500,
      })
      if (generated) {
        saveTraining(generated)
        setTrainingTab('contexto')
        tip('🎉 Entrenamiento ganador generado y guardado ✨')
      } else tip('⚠️ No se generó contenido. Verifica tu API Key')
    } catch (e) {
      tip(e?.message === 'no_key' ? '⚠️ Configura OpenAI o Gemini en Ajustes → API' : '⚠️ Error generando entrenamiento')
    }
    setGeneratingWizard(false)
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
    let matchFilter = true
    if (chatFilter === 'sin leer')  matchFilter = c.unread > 0
    else if (chatFilter === 'bot')  matchFilter = isAiActive(c.id)
    else if (chatFilter === 'grupos') matchFilter = c.isGroup === true
    else if (chatFilter === 'pedidos') {
      const tags = chatsTags[c.id] || []
      const prev = (c.preview || '').toLowerCase()
      matchFilter = tags.includes('Preparar') || tags.includes('Pendiente pago') ||
        ORDER_KEYWORDS.some(k => prev.includes(k))
    }
    else if (chatFilter === 'ventas') {
      const tags = chatsTags[c.id] || []
      matchFilter = tags.includes('Facturado') || tags.includes('Cliente VIP') || tags.includes('Recurrente')
    }
    else if (chatFilter === 'soporte') {
      const tags = chatsTags[c.id] || []
      matchFilter = tags.includes('Soporte')
    }
    return matchSearch && matchFilter
  })

  const NAV = [
    { id: 'overview',       label: '📊 Resumen',            section: 'Principal',       badge: 0 },
    { id: 'chat',           label: '💬 Chats',               section: 'Principal',       badge: unread },
    { id: 'clientes',       label: '👥 Clientes',            section: 'Principal',       badge: clientes.filter(c => c.etiqueta === 'Nuevo lead').length },
    { id: 'flujos',         label: '🌊 Flujos',              section: 'Automatización',  badge: 0 },
    { id: 'templates',      label: '📋 Plantillas',          section: 'Automatización',  badge: 0 },
    { id: 'disparadores',   label: '⚡ Disparadores',        section: 'Automatización',  badge: triggers.filter(t => t.active).length },
    { id: 'entrenamiento',  label: '🧠 Entrenamiento IA',    section: 'Automatización',  badge: 0 },
    { id: 'conexion',       label: '📱 Conexión WhatsApp',   section: 'Configuración',   badge: 0 },
    { id: 'config',         label: '⚙️ Ajustes',             section: 'Configuración',   badge: 0 },
  ]

  function goPage(id) {
    setPage(id)
    setBuilderOpen(false)
    if (id === 'conexion') {
      if (status === 'connected') { setTimeout(drawQRConnected, 120) }
      else if (status === 'connecting' || status === 'qr') { setTimeout(loadQR, 150) }
      else {
        // Verificar estado real del backend antes de actuar
        setTimeout(async () => {
          const d = await fetch(BU + '/status', { headers: H }).then(r => r.json()).catch(() => ({}))
          const s = (d.ok === false) ? 'disconnected' : (d.status || 'disconnected')
          setStatus(s); setPhone(d.phone || '')
          if (s === 'connecting' || s === 'qr') { loadQR() }
          else if (s === 'connected') { loadC().catch(() => {}); setTimeout(drawQRConnected, 150) }
          else { regenerateQR() }
        }, 100)
      }
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
      <Header noFloat />
      <div className="wbv5-root">

        {/* ── SIDEBAR ── */}
        <div className="wbv5-sidebar">
          <div className="wbv5-sb-logo" style={{ display: 'none' }}>
            <div className="wbv5-sb-icon">🌿</div>
            <div>
              <div className="wbv5-sb-name">Sanate Bot</div>
              <div className="wbv5-sb-sub">WhatsApp Automation</div>
            </div>
          </div>
          <div className="wbv5-sb-acct" style={{ display: 'none' }}>
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
              {status === 'connected' ? '✅ Conectado' : status === 'connecting' ? '⏳ Conectando...' : serverOnline === false ? '🔌 Sin servidor' : '⏳ No conectado'}
            </div>
            <div style={{ marginTop: '.3rem', fontSize: '.62rem', color: '#9ca3af' }}>n8n + Baileys</div>
            <button
              className={`wbv5-btn wbv5-btn-sm ${aiEnabled ? 'wbv5-btn-ai-on' : 'wbv5-btn-outline'}`}
              style={{ marginTop: '.4rem', width: '100%', fontSize: '.65rem', padding: '.28rem .5rem' }}
              onClick={toggleAiGlobal}
              title="Activar/desactivar IA global"
            >
              🤖 IA {aiEnabled ? 'ON' : 'OFF'}
            </button>
            {/* Contador de contactos con triggers pausados */}
            {Object.values(triggerContactMap).filter(v => v === false).length > 0 && (
              <div
                style={{ marginTop: '.3rem', background: '#fef3c7', borderRadius: 6, padding: '.25rem .5rem', fontSize: '.6rem', color: '#92400e', fontWeight: 700, textAlign: 'center', cursor: 'pointer' }}
                onClick={() => goPage('disparadores')}
                title="Contactos con disparadores pausados"
              >
                ⚡ {Object.values(triggerContactMap).filter(v => v === false).length} pausado(s)
              </div>
            )}
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
              {/* ── Panel de Inteligencia de Ventas ── */}
              <div className="wbv5-card">
                <div className="wbv5-card-hd">
                  <div className="wbv5-card-title">💡 Inteligencia de Ventas</div>
                  <span className="wbv5-badge badge-amber" style={{ fontSize: '.65rem' }}>IA</span>
                </div>
                <div className="wbv5-card-bd" style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                  {(() => {
                    const insights = []
                    // Chats con keywords de pedido sin respuesta reciente del bot
                    const pendingOrders = chats.filter(c => {
                      const tags = chatsTags[c.id] || []
                      return tags.includes('Preparar') && !tags.includes('Facturado')
                    })
                    if (pendingOrders.length > 0) insights.push({ type: 'warn', msg: `${pendingOrders.length} pedido(s) con etiqueta "Preparar" sin facturar — revísalos antes de que se enfríen` })
                    // Chats con keywords de precio en preview
                    const priceChats = chats.filter(c => ORDER_KEYWORDS.some(k => (c.preview || '').toLowerCase().includes(k)))
                    if (priceChats.length > 0) insights.push({ type: 'info', msg: `${priceChats.length} chat(s) con preguntas de precio/pedido recientes — abre y da seguimiento 📦` })
                    // Contactos sin IA activa
                    const noAi = chats.filter(c => !c.isGroup && !isAiActive(c.id))
                    if (noAi.length > 0) insights.push({ type: 'tip', msg: `${noAi.length} contacto(s) sin IA activa — actívalos individualmente para respuesta automática` })
                    // Training usando plantilla genérica
                    const lsTraining = (() => { try { return localStorage.getItem('wa_training_prompt') || '' } catch { return '' } })()
                    if (!lsTraining || lsTraining === TRAINING_TEMPLATE) insights.push({ type: 'alert', msg: 'El entrenamiento IA usa plantilla genérica — personaliza con tus productos reales para mejorar el cierre hasta un 60%' })
                    // Sin análisis de clientes
                    const noAnalysis = chats.filter(c => !clientAnalysis[c.id]).length
                    if (noAnalysis > 3) insights.push({ type: 'tip', msg: `${noAnalysis} clientes sin perfil IA — abre el chat y pulsa "🧠 Analizar" para obtener ángulos de venta personalizados` })
                    // Plantillas sin imagen
                    insights.push({ type: 'tip', msg: 'Añade imágenes a tus plantillas de productos — los mensajes con imagen aumentan el cierre hasta un 40% 📸' })
                    // Estado del sistema
                    if (status === 'connected' && aiEnabled) insights.push({ type: 'ok', msg: `WhatsApp conectado y IA activa ✅ — El bot está respondiendo automáticamente` })
                    else if (status !== 'connected') insights.push({ type: 'alert', msg: 'WhatsApp desconectado — los clientes no están recibiendo respuestas automáticas 🚨' })
                    return insights.slice(0, 5).map((ins, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: '.45rem', alignItems: 'flex-start',
                        background: ins.type === 'ok' ? '#f0fdf4' : ins.type === 'warn' ? '#fef9c3' : ins.type === 'alert' ? '#fef2f2' : '#f8f9ff',
                        border: `1px solid ${ins.type === 'ok' ? '#bbf7d0' : ins.type === 'warn' ? '#fde047' : ins.type === 'alert' ? '#fca5a5' : '#e0e7ff'}`,
                        borderRadius: 7, padding: '.4rem .55rem', fontSize: '.72rem', lineHeight: 1.5
                      }}>
                        <span style={{ flexShrink: 0 }}>{ins.type === 'ok' ? '✅' : ins.type === 'warn' ? '⚠️' : ins.type === 'alert' ? '🚨' : '💡'}</span>
                        <span style={{ color: '#374151' }}>{ins.msg}</span>
                      </div>
                    ))
                  })()}
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
                <div className="wbv5-il-filters" style={{ flexWrap: 'wrap', gap: '.25rem' }}>
                  {[
                    { id: 'todos',    label: 'Todos' },
                    { id: 'sin leer', label: '🔴 Sin leer' },
                    { id: 'pedidos',  label: '📦 Pedidos' },
                    { id: 'ventas',   label: '✅ Ventas' },
                    { id: 'soporte',  label: '🛠 Soporte' },
                    { id: 'grupos',   label: '👥 Grupos' },
                    { id: 'bot',      label: '🤖 Bot' },
                  ].map(f => (
                    <button key={f.id} className={`wbv5-il-filter ${chatFilter === f.id ? 'active' : ''}`} onClick={() => setChatFilter(f.id)} style={{ fontSize: '.67rem', padding: '.2rem .45rem' }}>
                      {f.label}
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
                      <div className="wbv5-ci-ava" style={{ background: c.isGroup ? '#ede9fe' : COLORS_AV[i % 5], color: c.isGroup ? '#5b21b6' : COLORS_TXT[i % 5], position: 'relative', overflow: 'hidden' }}>
                        {c.isGroup ? '👥' : (c.name || c.phone || '?').substring(0, 2).toUpperCase()}
                        {c.photoUrl ? <img src={c.photoUrl} alt="" className="wbv5-ci-ava-img wbv5-ci-ava-abs" onError={e => e.target.style.display='none'} /> : null}
                      </div>
                      <div className="wbv5-ci-body">
                        <div className="wbv5-ci-name">
                          {c.name || c.phone || c.id.split('@')[0]}
                          {c.isGroup && <span style={{ marginLeft: 4, fontSize: '.62rem', color: '#7c3aed' }}>·grupo</span>}
                          {!isTriggerActive(c.id) && <span className="wbv5-trigger-paused-badge" title="Disparadores pausados">⚡ pausa</span>}
                        </div>
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

              {/* ── ventana de chat ── */}
              <div className="wbv5-chat-win">
                {!active ? (
                  <div className="wbv5-chat-empty">
                    <div style={{ fontSize: '1.8rem', marginBottom: '.5rem' }}>💬</div>
                    <div>Selecciona una conversación</div>
                  </div>
                ) : (
                  <>
                    <div className="wbv5-cw-header">
                      <div className="wbv5-cw-ava" style={{ position: 'relative', overflow: 'hidden' }}>
                        {(active.name || active.phone || '?').substring(0, 2).toUpperCase()}
                        {active.photoUrl ? <img src={active.photoUrl} alt="" className="wbv5-ci-ava-img wbv5-ci-ava-abs" onError={e => e.target.style.display='none'} /> : null}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="wbv5-cw-name">
                          {active.isGroup && <span style={{ fontSize: '.7rem', background: '#dbeafe', color: '#1d4ed8', borderRadius: 4, padding: '1px 5px', marginRight: 5 }}>Grupo</span>}
                          {active.name || active.phone || active.id}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                          {aiTyping ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.7rem', color: '#7c3aed', fontWeight: 600 }}>
                              <span style={{ display: 'inline-flex', gap: 2 }}>
                                {[0,1,2].map(i => (
                                  <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#7c3aed', display: 'inline-block', animation: `wbv5-pulse 0.9s ease-in-out ${i*0.22}s infinite` }} />
                                ))}
                              </span>
                              🤖 IA respondiendo...
                            </div>
                          ) : (
                            <>
                              <div className="wbv5-cw-sub">🟢 {active.phone || cleanPhone('', active.id)}</div>
                              {(() => { const geo = phoneToGeo(active.phone || cleanPhone('', active.id)); return geo ? <span className="wbv5-geo-badge">{geo.flag} {geo.label}</span> : null })()}
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '.4rem', flexShrink: 0, alignItems: 'center' }}>
                        {/* Dropdown de estado/etiqueta principal */}
                        <div style={{ position: 'relative' }} ref={statusDropdownRef}>
                          <button
                            className="wbv5-btn wbv5-btn-outline wbv5-btn-sm"
                            onClick={() => setShowStatusDropdown(o => !o)}
                            style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}
                          >
                            <span style={{
                              width: 8, height: 8, borderRadius: '50%',
                              background: contactStatus === 'Facturado' ? '#10b981' : contactStatus === 'Pendiente' ? '#f59e0b' : '#3b82f6'
                            }} />
                            {contactStatus} ▾
                          </button>
                          {showStatusDropdown && (
                            <div style={{
                              position: 'absolute', top: 'calc(100% + 4px)', right: 0, background: '#fff',
                              border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,.12)',
                              zIndex: 300, minWidth: 160, overflow: 'hidden'
                            }}>
                              {['Nuevo', 'Pendiente', 'Facturado', 'Archivado'].map(st => (
                                <button key={st} onClick={() => { setContactStatus(st); setShowStatusDropdown(false) }}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: '.5rem', width: '100%',
                                    padding: '.5rem .75rem', background: 'none', border: 'none', cursor: 'pointer',
                                    fontSize: '.78rem', color: '#374151', textAlign: 'left', transition: 'background .1s'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                >
                                  <span style={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    background: st === 'Facturado' ? '#10b981' : st === 'Pendiente' ? '#f59e0b' : st === 'Archivado' ? '#6b7280' : '#3b82f6'
                                  }} />
                                  {st}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Botón Disparadores por contacto */}
                        <button
                          className={`wbv5-btn wbv5-btn-sm ${isTriggerActive(active?.id) ? 'wbv5-btn-trigger-on' : 'wbv5-btn-trigger-off'}`}
                          onClick={() => toggleTriggerContact(active?.id)}
                          title={isTriggerActive(active?.id) ? '⚡ Disparadores activos — clic para pausar' : '⚡ Disparadores pausados — clic para reactivar'}
                        >
                          ⚡ {isTriggerActive(active?.id) ? 'Auto ON' : 'Auto OFF'}
                        </button>
                        {/* Botón IA por contacto */}
                        <button
                          className={`wbv5-btn wbv5-btn-sm ${isAiActive(active?.id) ? 'wbv5-btn-ai-on' : 'wbv5-btn-outline'}`}
                          onClick={() => toggleAiContact(active?.id)}
                          title={isAiActive(active?.id) ? 'IA activa — clic para desactivar' : 'IA inactiva — clic para activar'}
                        >
                          🤖 {isAiActive(active?.id) ? 'IA ON' : 'IA OFF'}
                        </button>
                        <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => setShowContact(s => !s)}>📋 Datos</button>
                        <button
                          className={`wbv5-btn wbv5-btn-sm ${showAnalysisPanel ? 'wbv5-btn-ai-on' : 'wbv5-btn-outline'}`}
                          onClick={() => { setShowAnalysisPanel(s => !s); setShowContact(false) }}
                          title="🧠 Análisis IA del cliente — estilo, intención de compra, ángulo de venta"
                          style={{ fontSize: '.72rem' }}
                        >
                          🧠 {clientAnalysis[active?.id] ? 'Análisis' : 'Analizar'}
                        </button>
                      </div>
                    </div>

                    <div className="wbv5-cw-msgs" ref={msgsRef}>
                      {msgs.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '.72rem', padding: '2rem 0' }}>Sin mensajes aún</div>
                      ) : msgs.map((m) => {
                        const isMediaType = ['image', 'video', 'audio', 'document', 'sticker'].includes(m.type);
                        return (
                        <div key={m.id} className={`wbv5-msg ${m.dir}`}>
                          {/* texto — mostrar también en imagen/video/audio si tiene caption */}
                          {m.txt ? <div className="wbv5-msg-txt">{m.txt}</div> : null}

                          {/* ── imagen ── */}
                          {m.type === 'image' ? (m.mediaUrl ? (() => {
                            const src = resolveMediaUrl(m.mediaUrl)
                            return (
                              <div style={{ position: 'relative' }}>
                                <img
                                  src={src} alt="img" className="wbv5-msg-img"
                                  onError={e => {
                                    e.target.style.display = 'none'
                                    const dl = e.target.parentNode?.querySelector('.wbv5-media-dl')
                                    if (dl) dl.style.display = 'flex'
                                  }}
                                />
                                <a href={src} target="_blank" rel="noreferrer" download
                                  className="wbv5-media-dl"
                                  style={{ display: 'none', alignItems: 'center', gap: '.4rem', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, padding: '.5rem .75rem', fontSize: '.72rem', color: '#374151', textDecoration: 'none', cursor: 'pointer' }}>
                                  📥 Ver / Descargar imagen
                                </a>
                              </div>
                            )
                          })() : <div className="wbv5-msg-media-ph">📷 Imagen</div>) : null}

                          {/* ── video ── */}
                          {m.type === 'video' ? (m.mediaUrl ? (() => {
                            const src = resolveMediaUrl(m.mediaUrl)
                            return (
                              <div>
                                <video src={src} controls className="wbv5-msg-video"
                                  onError={e => {
                                    e.target.style.display = 'none'
                                    e.target.nextSibling?.style?.removeProperty('display')
                                  }} />
                                <a href={src} target="_blank" rel="noreferrer" download
                                  style={{ display: 'none', fontSize: '.72rem', color: '#374151' }}>
                                  📥 Descargar video
                                </a>
                              </div>
                            )
                          })() : <div className="wbv5-msg-media-ph">🎥 Video</div>) : null}

                          {/* ── audio / nota de voz ── */}
                          {m.type === 'audio' ? (m.mediaUrl ? (() => {
                            const src = resolveMediaUrl(m.mediaUrl)
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
                                <audio src={src} controls className="wbv5-msg-audio"
                                  onError={e => {
                                    e.target.style.display = 'none'
                                    e.target.nextSibling?.style?.removeProperty('display')
                                  }} />
                                <a href={src} target="_blank" rel="noreferrer" download
                                  style={{ display: 'none', alignItems: 'center', gap: '.3rem', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, padding: '.4rem .65rem', fontSize: '.71rem', color: '#374151', textDecoration: 'none' }}>
                                  🎵 Descargar audio
                                </a>
                              </div>
                            )
                          })() : <div className="wbv5-msg-media-ph">🎵 Audio</div>) : null}

                          {/* ── documento ── */}
                          {m.type === 'document' ? (m.mediaUrl ? (
                            <a href={resolveMediaUrl(m.mediaUrl)} target="_blank" rel="noreferrer" download className="wbv5-msg-doc">
                              📄 {m.fileName || 'Documento'}
                            </a>
                          ) : <div className="wbv5-msg-media-ph">📄 {m.fileName || 'Documento'}</div>) : null}

                          {/* ── sticker ── */}
                          {m.type === 'sticker' ? <div style={{ fontSize: '2rem' }}>{m.txt || '🎨'}</div> : null}
                          <div className="wbv5-msg-time">{m.time}{m.dir === 's' ? (m.status === 'sent' ? ' ✓✓' : ' ✓') : ''}</div>
                        </div>
                      )})}
                    </div>

                    {/* inputs ocultos para adjuntos */}
                    <input ref={fileImgRef} type="file" accept="image/*,video/*" hidden onChange={e => { const f=e.target.files?.[0]; if(f) sendFile(f, f.type.startsWith('video') ? 'video' : 'image'); e.target.value='' }} />
                    <input ref={fileAudRef} type="file" accept="audio/*" hidden onChange={e => { const f=e.target.files?.[0]; if(f) sendFile(f,'audio'); e.target.value='' }} />
                    <input ref={fileDocRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" hidden onChange={e => { const f=e.target.files?.[0]; if(f) sendFile(f,'document'); e.target.value='' }} />

                    {/* Modal de plantillas rápidas */}
                    {showTemplatesModal && (
                      <div className="wbv5-tpl-overlay" onClick={() => setShowTemplatesModal(false)}>
                        <div className="wbv5-tpl-popup" onClick={e => e.stopPropagation()}>
                          <div className="wbv5-tpl-head">
                            <strong>Enviar plantilla</strong>
                            <button onClick={() => setShowTemplatesModal(false)}>✕</button>
                          </div>
                          <div className="wbv5-tpl-list">
                            {QUICK_TEMPLATES.map(tpl => (
                              <button key={tpl.id} className="wbv5-tpl-opt" onClick={() => sendTemplate(tpl)}>
                                <span className="wbv5-tpl-cat">{tpl.category}</span>
                                <strong>{tpl.name}</strong>
                                <small>{tpl.description}</small>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="wbv5-cw-input-bar" style={{ position: 'relative' }}>
                      {/* Emoji panel */}
                      {showEmojiPanel && (
                        <div className="wbv5-emoji-panel" ref={emojiPanelRef}>
                          <div className="wbv5-emoji-tabs">
                            <button className={emojiTab === 'emojis' ? 'active' : ''} onClick={() => setEmojiTab('emojis')}>😊 Emojis</button>
                            <button className={emojiTab === 'stickers' ? 'active' : ''} onClick={() => setEmojiTab('stickers')}>Stickers</button>
                          </div>
                          {emojiTab === 'emojis' ? (
                            <EmojiPicker
                              onEmojiClick={data => { setInp(prev => prev + data.emoji); setShowEmojiPanel(false) }}
                              height={320} width="100%"
                              searchPlaceholder="Buscar emoji..."
                              previewConfig={{ showPreview: false }}
                              skinTonesDisabled
                            />
                          ) : (
                            <div className="wbv5-sticker-grid">
                              {['😂🔥','❤️✨','👏🎉','😍💯','🙏👍','😭🤣','💪🎯','🌟⭐','🎁🎊','😅😎'].flatMap(pair =>
                                (pair.match(/./gu) || []).map((em, i) => (
                                  <button key={pair+i} className="wbv5-sticker-item" onClick={() => {
                                    const t = new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})
                                    setMsgs(prev => [...prev, { id: Date.now().toString(), dir:'s', txt:em, time:t, type:'text', status:'sent' }])
                                    setShowEmojiPanel(false); scroll()
                                  }}>{em}</button>
                                ))
                              )}
                              <p className="wbv5-sticker-note">Los stickers del celular se sincronizan cuando conectas tu WhatsApp.</p>
                            </div>
                          )}
                        </div>
                      )}

                      {isRecording ? (
                        <div className="wbv5-recording-bar">
                          <span className="wbv5-rec-dot" />
                          <span className="wbv5-rec-time">{formatRecTime(recordingSeconds)}</span>
                          <span className="wbv5-rec-label">Grabando audio...</span>
                          <button className="wbv5-rec-stop" onClick={stopRecording}>⏹ Detener</button>
                        </div>
                      ) : (
                        <>
                          {attachOpen && (
                            <div className="wbv5-attach-menu">
                              <button onClick={() => { setAttachOpen(false); fileImgRef.current?.click() }}>🖼️ Imagen / Video</button>
                              <button onClick={() => { setAttachOpen(false); fileAudRef.current?.click() }}>🎵 Audio</button>
                              <button onClick={() => { setAttachOpen(false); fileDocRef.current?.click() }}>📄 Documento</button>
                            </div>
                          )}
                          <button className="wbv5-cw-emoji-btn" title="Emoji y stickers"
                            onClick={() => setShowEmojiPanel(o => !o)}>😊</button>
                          <button className="wbv5-cw-attach" title="Adjuntar" onClick={() => setAttachOpen(o => !o)}>📎</button>
                          <button className="wbv5-cw-tpl-btn" title="Plantillas rápidas"
                            onClick={() => setShowTemplatesModal(true)}>📋</button>
                          <input
                            className="wbv5-cw-input" value={inp} disabled={sending}
                            onChange={e => setInp(e.target.value)}
                            onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                            placeholder={sending ? 'Enviando...' : 'Escribe un mensaje...'}
                          />
                          {aiEnabled && (
                            <button
                              className={`wbv5-cw-ai-reply-btn${generatingAiReply ? ' loading' : ''}`}
                              title="🤖 Generar respuesta IA — analiza el último mensaje y genera el mejor ángulo de venta"
                              onClick={generateAiReply}
                              disabled={generatingAiReply || !msgs.some(m => m.dir === 'r')}
                            >
                              {generatingAiReply ? '⏳' : '🤖'}
                            </button>
                          )}
                          {inp.trim() ? (
                            <button className="wbv5-cw-send" onClick={send} disabled={sending}>
                              {sending ? '⏳' : '➤'}
                            </button>
                          ) : (
                            <button className="wbv5-cw-send wbv5-cw-mic" title="Grabar voz" onClick={startRecording}>🎤</button>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* ── Panel de Análisis IA del Cliente ── */}
              {showAnalysisPanel && active && (
                <div className="wbv5-contact-pnl" style={{ minWidth: 250 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.6rem' }}>
                    <div className="wbv5-cp-title">🧠 Análisis del Cliente</div>
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.7rem', color: '#7c3aed', fontWeight: 700, padding: '.1rem .3rem' }}
                      onClick={() => analyzeClientIntelligence(active.id, msgs)}
                      disabled={analysisLoading || !hasAiKey}
                    >
                      {analysisLoading ? '⏳' : '🔄 Actualizar'}
                    </button>
                  </div>
                  {!clientAnalysis[active.id] ? (
                    <div style={{ textAlign: 'center', padding: '1.2rem 0' }}>
                      <div style={{ fontSize: '1.8rem', marginBottom: '.4rem' }}>🔍</div>
                      <div style={{ fontSize: '.73rem', color: '#6b7280', marginBottom: '.7rem' }}>Sin análisis todavía</div>
                      <button
                        className="wbv5-btn wbv5-btn-green wbv5-btn-sm"
                        onClick={() => analyzeClientIntelligence(active.id, msgs)}
                        disabled={analysisLoading || !hasAiKey}
                      >
                        {analysisLoading ? '⏳ Analizando...' : '🧠 Analizar ahora'}
                      </button>
                      {!hasAiKey && <div style={{ fontSize: '.67rem', color: '#ef4444', marginTop: '.4rem' }}>Requiere API Key IA</div>}
                    </div>
                  ) : (() => {
                    const a = clientAnalysis[active.id]
                    const intencionColor = a.intencion === 'alta' ? '#16a34a' : a.intencion === 'media' ? '#d97706' : '#dc2626'
                    return (
                      <div style={{ fontSize: '.73rem', display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                        <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                          <span style={{ background: '#f0f4ff', color: '#3730a3', borderRadius: 4, padding: '.15rem .4rem', fontWeight: 600 }}>✍️ {a.estilo}</span>
                          <span style={{ background: '#fef9c3', color: '#78350f', borderRadius: 4, padding: '.15rem .4rem', fontWeight: 600 }}>🎭 {a.tono}</span>
                          <span style={{ background: a.intencion === 'alta' ? '#f0fdf4' : a.intencion === 'media' ? '#fef9c3' : '#fef2f2', color: intencionColor, borderRadius: 4, padding: '.15rem .4rem', fontWeight: 700 }}>
                            🎯 Compra {a.intencion}
                          </span>
                        </div>
                        {a.intereses?.length > 0 && (
                          <div>
                            <div style={{ fontSize: '.67rem', fontWeight: 700, color: '#374151', marginBottom: '.2rem' }}>💡 Intereses</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.2rem' }}>
                              {a.intereses.map((item, i) => (
                                <span key={i} style={{ background: '#ede9fe', color: '#5b21b6', borderRadius: 4, padding: '.1rem .35rem', fontSize: '.67rem' }}>{item}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {a.objeciones?.length > 0 && (
                          <div>
                            <div style={{ fontSize: '.67rem', fontWeight: 700, color: '#dc2626', marginBottom: '.2rem' }}>⚠️ Objeciones</div>
                            {a.objeciones.map((o, i) => <div key={i} style={{ color: '#b91c1c', fontSize: '.68rem' }}>• {o}</div>)}
                          </div>
                        )}
                        {a.angulo && (
                          <div style={{ background: '#faf5ff', border: '1px solid #ddd6fe', borderRadius: 6, padding: '.4rem .5rem' }}>
                            <div style={{ fontSize: '.65rem', fontWeight: 700, color: '#7c3aed', marginBottom: '.15rem' }}>💜 Ángulo de venta</div>
                            <div style={{ color: '#5b21b6', fontWeight: 600, lineHeight: 1.4 }}>{a.angulo}</div>
                          </div>
                        )}
                        {a.siguiente && (
                          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '.4rem .5rem' }}>
                            <div style={{ fontSize: '.65rem', fontWeight: 700, color: '#15803d', marginBottom: '.15rem' }}>✅ Próximo paso</div>
                            <div style={{ color: '#16a34a', fontWeight: 600, lineHeight: 1.4 }}>{a.siguiente}</div>
                          </div>
                        )}
                        {a.resumen && <div style={{ fontSize: '.67rem', color: '#6b7280', fontStyle: 'italic', borderTop: '1px solid #f3f4f6', paddingTop: '.3rem' }}>{a.resumen}</div>}
                        <div style={{ fontSize: '.62rem', color: '#9ca3af', textAlign: 'right' }}>
                          Actualizado: {a.ts ? new Date(a.ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              {showContact && active && (
                <div className="wbv5-contact-pnl">
                  <div className="wbv5-cp-title">👤 Contacto</div>
                  {active.photoUrl && active.photoUrl.startsWith('http') && (
                    <div style={{ textAlign: 'center', marginBottom: '.75rem' }}>
                      <img src={active.photoUrl} alt={active.name} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e5e7eb' }} />
                    </div>
                  )}
                  <div className="wbv5-cp-row"><div className="wbv5-cp-lbl">Nombre</div><div className="wbv5-cp-val">{active.name || '—'}</div></div>
                  <div className="wbv5-cp-row"><div className="wbv5-cp-lbl">Teléfono</div><div className="wbv5-cp-val">{active.phone || '+' + active.id}</div></div>
                  <div className="wbv5-cp-row"><div className="wbv5-cp-lbl">Último mensaje</div><div className="wbv5-cp-val">{active.preview || '—'}</div></div>
                  <div className="wbv5-cp-row"><div className="wbv5-cp-lbl">Estado bot</div><div className="wbv5-cp-val"><span className="wbv5-badge badge-green">🤖 Activo</span></div></div>
                  <div className="wbv5-cp-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div className="wbv5-cp-lbl">Respuesta IA</div>
                      <div className="wbv5-cp-val" style={{ fontSize: '.68rem', color: isAiActive(active?.id) ? '#16a34a' : '#6b7280' }}>
                        {isAiActive(active?.id) ? 'ChatGPT activo' : 'Manual'}
                      </div>
                    </div>
                    <button
                      className={`wbv5-btn wbv5-btn-sm ${isAiActive(active?.id) ? 'wbv5-btn-ai-on' : 'wbv5-btn-outline'}`}
                      style={{ fontSize: '.65rem', padding: '.22rem .55rem' }}
                      onClick={() => toggleAiContact(active?.id)}
                    >
                      {isAiActive(active?.id) ? '🤖 ON' : '⚪ OFF'}
                    </button>
                  </div>
                  {/* Etiquetas */}
                  <div className="wbv5-cp-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '.4rem' }}>
                    <div className="wbv5-cp-lbl">Etiquetas</div>
                    <div className="wbv5-tags-wrap">
                      {contactTags.map(tag => {
                        const td = availableTags.find(t => t.name === tag)
                        return (
                          <button key={tag} className="wbv5-tag-chip"
                            style={{ '--tc': td?.color || '#3b82f6' }}
                            onClick={() => setContactTags(prev => prev.filter(t => t !== tag))}
                            title="Clic para quitar">
                            {tag} ✕
                          </button>
                        )
                      })}
                      <div className="wbv5-tag-dd-wrap" ref={tagsDropdownRef}>
                        <button className="wbv5-tag-add" onClick={() => setShowTagsDropdown(o => !o)}>
                          + Etiqueta ▾
                        </button>
                        {showTagsDropdown && (
                          <div className="wbv5-tag-dropdown">
                            {availableTags.filter(t => !contactTags.includes(t.name)).map(t => (
                              <button key={t.id} className="wbv5-tag-dd-opt"
                                style={{ '--tc': t.color }}
                                onClick={() => { setContactTags(prev => [...prev, t.name]); setShowTagsDropdown(false) }}>
                                <span className="wbv5-tag-dot" />
                                {t.name}
                              </button>
                            ))}
                            {availableTags.filter(t => !contactTags.includes(t.name)).length === 0 && (
                              <div style={{ padding: '.5rem .75rem', fontSize: '.75rem', color: '#9ca3af' }}>Todas las etiquetas asignadas</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
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

          {/* ══ CLIENTES ══ */}
          {page === 'clientes' && (
            <div className="wbv5-content">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.85rem' }}>
                <div>
                  <div style={{ fontSize: '.85rem', fontWeight: 800 }}>👥 Clientes</div>
                  <div style={{ fontSize: '.68rem', color: '#6b7280' }}>Clientes que han escrito al WhatsApp — guardados automáticamente</div>
                </div>
                <div style={{ display: 'flex', gap: '.4rem' }}>
                  <input className="wbv5-il-search" placeholder="Buscar cliente..." value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} style={{ width: 180 }} />
                  <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => { navigator.clipboard?.writeText(clientes.map(c => `${c.name}\t${c.phone}\t${c.pais}\t${c.etiqueta}\t${c.primerMensaje}`).join('\n')); tip('📋 Tabla copiada') }}>📋 Exportar</button>
                </div>
              </div>
              {clienteDetail ? (
                <div className="wbv5-card">
                  <div className="wbv5-card-hd">
                    <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => setClienteDetail(null)}>← Volver</button>
                    <div className="wbv5-card-title" style={{ marginLeft: '.5rem' }}>{clienteDetail.name || clienteDetail.phone}</div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '.4rem' }}>
                      <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={() => { updateCliente(clienteDetail.id, clienteDetail); tip('✅ Guardado'); setClienteDetail(null) }}>💾 Guardar</button>
                      <button className="wbv5-btn wbv5-btn-red wbv5-btn-sm" onClick={() => { if(window.confirm('¿Eliminar cliente?')) deleteCliente(clienteDetail.id) }}>🗑️</button>
                    </div>
                  </div>
                  <div className="wbv5-card-bd">
                    <div className="wbv5-cli-form-grid">
                      {[
                        { lbl: 'Nombre', key: 'name' }, { lbl: 'Teléfono', key: 'phone' },
                        { lbl: 'País / Región', key: 'ciudad' }, { lbl: 'Dirección', key: 'direccion' },
                        { lbl: 'Etiqueta', key: 'etiqueta' }, { lbl: 'Total Pedidos', key: 'totalPedidos', type: 'number' },
                        { lbl: 'No recibidos', key: 'noRecibidos', type: 'number' }, { lbl: 'Primer mensaje', key: 'primerMensaje' },
                        { lbl: 'Último mensaje', key: 'ultimoMensaje' },
                      ].map(f => (
                        <div key={f.key} className="wbv5-form-row">
                          <div className="wbv5-form-lbl">{f.lbl}</div>
                          <input className="wbv5-form-input" type={f.type || 'text'} value={clienteDetail[f.key] || ''} onChange={e => setClienteDetail(prev => ({ ...prev, [f.key]: e.target.value }))} />
                        </div>
                      ))}
                      <div className="wbv5-form-row" style={{ gridColumn: '1/-1' }}>
                        <div className="wbv5-form-lbl">Notas</div>
                        <textarea className="wbv5-form-input" rows={3} value={clienteDetail.notas || ''} onChange={e => setClienteDetail(prev => ({ ...prev, notas: e.target.value }))} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                      </div>
                    </div>
                    <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" style={{ marginTop: '.4rem' }} onClick={() => { const t = `Nombre: ${clienteDetail.name}\nTeléfono: ${clienteDetail.phone}\nPaís: ${clienteDetail.ciudad}\nDirección: ${clienteDetail.direccion}\nPedidos: ${clienteDetail.totalPedidos}\nEtiqueta: ${clienteDetail.etiqueta}`; navigator.clipboard?.writeText(t); tip('📋 Datos copiados') }}>📋 Copiar datos</button>
                  </div>
                </div>
              ) : (
                <div className="wbv5-card">
                  <div style={{ padding: 0 }}>
                    {clientes.filter(c => !clienteSearch || (c.name+c.phone+c.ciudad).toLowerCase().includes(clienteSearch.toLowerCase())).length === 0 ? (
                      <div className="wbv5-empty-state" style={{ padding: '2.5rem 1rem' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>👥</div>
                        <div style={{ fontSize: '.85rem', fontWeight: 700, color: '#6b7280' }}>Sin clientes aún</div>
                        <div style={{ fontSize: '.72rem', color: '#9ca3af' }}>Los clientes se guardan automáticamente cuando escriben al WhatsApp</div>
                      </div>
                    ) : (
                      <table className="wbv5-flows-table">
                        <thead><tr><th>Cliente</th><th>Teléfono</th><th>Región</th><th>Etiqueta</th><th>Pedidos</th><th>Primer msg</th><th></th></tr></thead>
                        <tbody>
                          {clientes.filter(c => !clienteSearch || (c.name+c.phone+c.ciudad).toLowerCase().includes(clienteSearch.toLowerCase())).map(c => (
                            <tr key={c.id}>
                              <td style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                                {c.fotoUrl ? <img src={c.fotoUrl} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.65rem', fontWeight: 800, flexShrink: 0 }}>{(c.name || c.phone).substring(0,2).toUpperCase()}</div>}
                                <span style={{ fontWeight: 600 }}>{c.name || '—'}</span>
                              </td>
                              <td style={{ fontSize: '.72rem', color: '#6b7280' }}>{c.phone}</td>
                              <td style={{ fontSize: '.7rem' }}>{c.flag} {c.ciudad || '—'}</td>
                              <td><span style={{ background: c.etiqueta === 'Nuevo lead' ? '#dbeafe' : c.etiqueta === 'Cliente VIP' ? '#ede9fe' : '#dcfce7', color: c.etiqueta === 'Nuevo lead' ? '#1d4ed8' : c.etiqueta === 'Cliente VIP' ? '#5b21b6' : '#166534', borderRadius: 20, padding: '.15rem .55rem', fontSize: '.65rem', fontWeight: 700 }}>{c.etiqueta}</span></td>
                              <td style={{ textAlign: 'center' }}>{c.totalPedidos}</td>
                              <td style={{ fontSize: '.65rem', color: '#9ca3af' }}>{c.primerMensaje}</td>
                              <td>
                                <button className="wbv5-flow-3btn" onClick={() => setClienteDetail({...c})}>✏️</button>
                                <button className="wbv5-flow-3btn" onClick={() => { navigator.clipboard?.writeText(`${c.name} | ${c.phone} | ${c.ciudad}`); tip('📋 Copiado') }}>📋</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ DISPARADORES ══ */}
          {page === 'disparadores' && (
            <div className="wbv5-content">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.2rem' }}>
                <div>
                  <div style={{ fontSize: '.85rem', fontWeight: 800 }}>⚡ Disparadores</div>
                  <div style={{ fontSize: '.68rem', color: '#6b7280' }}>Mensajes automáticos basados en tiempo e interacción del cliente</div>
                </div>
                <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={() => setEditTrigger({ id: `tr${Date.now()}`, name: '', condition: 'no_reply', delay: 60, unit: 'min', producto: '', message: '', active: true, mediaType: null, mediaUrl: '' })}>+ Nuevo disparador</button>
              </div>

              {/* ── Banner: contactos con disparadores pausados ── */}
              {Object.values(triggerContactMap).filter(v => v === false).length > 0 && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '.65rem 1rem', marginBottom: '.75rem', display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>⚡</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '.76rem', fontWeight: 700, color: '#92400e' }}>
                      {Object.values(triggerContactMap).filter(v => v === false).length} contacto(s) con disparadores pausados
                    </span>
                    <span style={{ fontSize: '.66rem', color: '#b45309', marginLeft: '.4rem' }}>
                      — Actívalo en cada chat desde el botón ⚡ Auto OFF del header
                    </span>
                  </div>
                  <button
                    className="wbv5-btn wbv5-btn-sm"
                    style={{ background: '#f59e0b', color: '#fff', border: 'none', flexShrink: 0 }}
                    onClick={() => {
                      setTriggerContactMap({})
                      try { localStorage.setItem('wa_trigger_contact_map', '{}') } catch {}
                      tip('⚡ Disparadores reactivados para todos los contactos')
                    }}
                  >
                    🔄 Reactivar todos
                  </button>
                </div>
              )}

              {/* Panel de edición de disparador */}
              {editTrigger && (
                <div className="wbv5-card" style={{ border: '2px solid #2563eb' }}>
                  <div className="wbv5-card-hd">
                    <div className="wbv5-card-title">✏️ {editTrigger.id.startsWith('tr') && triggers.find(t => t.id === editTrigger.id) ? 'Editar' : 'Nuevo'} Disparador</div>
                    <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => setEditTrigger(null)}>✕</button>
                  </div>
                  <div className="wbv5-card-bd">
                    <div className="wbv5-cli-form-grid">
                      <div className="wbv5-form-row">
                        <div className="wbv5-form-lbl">Nombre del disparador</div>
                        <input className="wbv5-form-input" value={editTrigger.name} onChange={e => setEditTrigger(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Sin respuesta 1 hora" />
                      </div>
                      <div className="wbv5-form-row">
                        <div className="wbv5-form-lbl">📦 Producto / Plantilla <span style={{ fontWeight: 400, color: '#9ca3af' }}>(nombre del producto a promover)</span></div>
                        <input
                          className="wbv5-form-input"
                          value={editTrigger.producto || ''}
                          onChange={e => setEditTrigger(p => ({ ...p, producto: e.target.value }))}
                          placeholder="Ej: Combo Detox 30 días, Pack Energía Total..."
                          list="productos-list"
                        />
                        <datalist id="productos-list">
                          {trainingPrompt.match(/^[-•·]\s*(.+?):/gm)?.slice(0, 12).map((m, i) => (
                            <option key={i} value={m.replace(/^[-•·]\s*/, '').replace(/:.*/, '').trim()} />
                          ))}
                        </datalist>
                        <div style={{ fontSize: '.6rem', color: '#9ca3af', marginTop: '.15rem' }}>💡 La IA genera el mensaje específico para este producto cuando presionas 🤖 Generar</div>
                      </div>
                      <div className="wbv5-form-row">
                        <div className="wbv5-form-lbl">Condición</div>
                        <select className="wbv5-form-input" value={editTrigger.condition} onChange={e => setEditTrigger(p => ({ ...p, condition: e.target.value }))}>
                          <option value="no_reply">Sin respuesta después de X tiempo</option>
                          <option value="seen">Mensaje visto pero sin responder</option>
                          <option value="no_purchase">Sin compra después de X tiempo</option>
                          <option value="keyword">🔑 Palabra clave detectada (instantáneo)</option>
                          <option value="first_message">Primer mensaje recibido</option>
                        </select>
                      </div>
                      {editTrigger.condition === 'keyword' ? (
                        <div className="wbv5-form-row">
                          <div className="wbv5-form-lbl">🔑 Palabras clave <span style={{ fontWeight: 400, color: '#9ca3af' }}>(separa con coma)</span></div>
                          <input
                            className="wbv5-form-input"
                            value={editTrigger.keyword || ''}
                            onChange={e => setEditTrigger(p => ({ ...p, keyword: e.target.value }))}
                            placeholder="Ej: precio, cuánto vale, cuanto cuesta, envío"
                          />
                          <div style={{ fontSize: '.62rem', color: '#9ca3af', marginTop: '.15rem' }}>
                            💡 Cuando el cliente escriba alguna de estas palabras, se enviará automáticamente el mensaje de abajo
                          </div>
                        </div>
                      ) : (
                        <div className="wbv5-form-row">
                          <div className="wbv5-form-lbl">Tiempo de espera</div>
                          <div style={{ display: 'flex', gap: '.4rem' }}>
                            <input className="wbv5-form-input" type="number" value={editTrigger.delay} min={1} style={{ width: 80 }} onChange={e => setEditTrigger(p => ({ ...p, delay: parseInt(e.target.value) || 1 }))} />
                            <select className="wbv5-form-input" value={editTrigger.unit} onChange={e => setEditTrigger(p => ({ ...p, unit: e.target.value }))}>
                              <option value="min">Minutos</option>
                              <option value="h">Horas</option>
                              <option value="d">Días</option>
                            </select>
                          </div>
                        </div>
                      )}
                      <div className="wbv5-form-row">
                        <div className="wbv5-form-lbl">Tipo de media (opcional)</div>
                        <select className="wbv5-form-input" value={editTrigger.mediaType || ''} onChange={e => setEditTrigger(p => ({ ...p, mediaType: e.target.value || null }))}>
                          <option value="">Solo texto</option>
                          <option value="image">🖼️ Imagen</option>
                          <option value="video">🎥 Video</option>
                          <option value="audio">🎵 Audio</option>
                          <option value="document">📄 Documento</option>
                        </select>
                      </div>
                    </div>
                    {editTrigger.mediaType && (
                      <div className="wbv5-form-row">
                        <div className="wbv5-form-lbl">URL del archivo media</div>
                        <input className="wbv5-form-input" value={editTrigger.mediaUrl || ''} onChange={e => setEditTrigger(p => ({ ...p, mediaUrl: e.target.value }))} placeholder="https://... o ruta relativa" />
                      </div>
                    )}
                    <div className="wbv5-form-row">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.28rem' }}>
                        <div className="wbv5-form-lbl" style={{ margin: 0 }}>
                          {editTrigger.condition === 'keyword' ? '📋 Plantilla a enviar' : 'Mensaje'} ({(editTrigger.message || '').length}/1000 chars)
                        </div>
                        <button className={`wbv5-btn wbv5-btn-sm ${aiEnabled ? 'wbv5-btn-ai-on' : 'wbv5-btn-outline'}`} style={{ fontSize: '.65rem' }} onClick={() => generateTriggerMsg(editTrigger.name || 'seguimiento')} disabled={generatingTrigger}>
                          {generatingTrigger ? '⏳ Generando...' : '🤖 Generar con IA'}
                        </button>
                      </div>
                      <textarea className="wbv5-form-input" rows={4} value={editTrigger.message} onChange={e => setEditTrigger(p => ({ ...p, message: e.target.value }))} placeholder="Escribe el mensaje o genera con IA. Usa {nombre} para personalizar." style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />
                      <div style={{ fontSize: '.62rem', color: '#9ca3af', marginTop: '.18rem' }}>Variables: {'{nombre}'} {'{telefono}'} {'{tienda}'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                      <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={() => saveTriggerEdit(editTrigger)}>💾 Guardar disparador</button>
                      <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => setEditTrigger(null)}>Cancelar</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Lista de disparadores */}
              <div className="wbv5-card">
                <div className="wbv5-card-hd">
                  <div className="wbv5-card-title">Disparadores configurados</div>
                  <span style={{ fontSize: '.68rem', color: '#6b7280' }}>{triggers.filter(t => t.active).length} activos de {triggers.length}</span>
                </div>
                <div style={{ padding: 0 }}>
                  {triggers.length === 0 ? (
                    <div className="wbv5-empty-state" style={{ padding: '2rem' }}>
                      <div style={{ fontSize: '2rem' }}>⚡</div>
                      <div>Sin disparadores. Crea uno para automatizar seguimientos.</div>
                    </div>
                  ) : triggers.map(t => (
                    <div key={t.id} className="wbv5-trigger-row">
                      <div className="wbv5-tr-left">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.18rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '.78rem', fontWeight: 700, color: '#111827' }}>{t.name || 'Sin nombre'}</span>
                          <span className={`wbv5-badge ${t.active ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '.6rem' }}>{t.active ? '✅ Activo' : '⏸ Pausado'}</span>
                          {t.producto && <span style={{ background: '#ede9fe', color: '#5b21b6', borderRadius: 20, padding: '.1rem .5rem', fontSize: '.62rem', fontWeight: 700 }}>📦 {t.producto}</span>}
                        </div>
                        <div style={{ fontSize: '.68rem', color: '#6b7280', display: 'flex', gap: '.8rem', flexWrap: 'wrap' }}>
                          <span>⏱ {t.delay} {t.unit === 'min' ? 'minutos' : t.unit === 'h' ? 'horas' : 'días'}</span>
                          <span>🎯 {t.condition === 'no_reply' ? 'Sin respuesta' : t.condition === 'seen' ? 'Visto sin responder' : t.condition === 'no_purchase' ? 'Sin compra' : t.condition === 'keyword' ? 'Keyword' : 'Primer mensaje'}</span>
                          {t.mediaType && <span>📎 {t.mediaType}</span>}
                        </div>
                        <div style={{ fontSize: '.7rem', color: '#374151', marginTop: '.2rem', maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>💬 {t.message}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '.3rem', flexShrink: 0, alignItems: 'center' }}>
                        <button className={`wbv5-btn wbv5-btn-sm ${t.active ? 'wbv5-btn-outline' : 'wbv5-btn-green'}`} onClick={() => toggleTrigger(t.id)}>{t.active ? '⏸' : '▶'}</button>
                        <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => setEditTrigger({...t})}>✏️</button>
                        <button className="wbv5-btn wbv5-btn-sm" style={{ background: '#fee2e2', color: '#991b1b' }} onClick={() => deleteTrigger(t.id)}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Flujos de seguimiento recomendados */}
              <div className="wbv5-card">
                <div className="wbv5-card-hd">
                  <div className="wbv5-card-title">🏆 Secuencias de seguimiento recomendadas</div>
                  <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={() => { saveTriggers([...triggers, ...DEFAULT_TRIGGERS.filter(d => !triggers.find(t => t.name === d.name))]); tip('✅ Secuencias agregadas') }}>+ Agregar todas</button>
                </div>
                <div className="wbv5-card-bd">
                  <div style={{ fontSize: '.72rem', color: '#6b7280', marginBottom: '.75rem', lineHeight: 1.5 }}>
                    Las 3 mejores secuencias de cierre de ventas optimizadas con IA para WhatsApp
                  </div>
                  {[
                    { icon: '⚡', title: '1h sin respuesta', desc: 'Reactivación amable — pregunta de interés', time: '1 hora', color: '#dbeafe', tc: '#1d4ed8' },
                    { icon: '👁️', title: 'Visto sin responder 3h', desc: 'Oferta personalizada — urgencia suave', time: '3 horas', color: '#fef3c7', tc: '#92400e' },
                    { icon: '🔥', title: 'Cierre 24h', desc: 'Última oportunidad — descuento + CTA directo', time: '24 horas', color: '#dcfce7', tc: '#166534' },
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.55rem 0', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>{s.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '.76rem', fontWeight: 700, color: '#111827' }}>{s.title}</div>
                        <div style={{ fontSize: '.65rem', color: '#6b7280' }}>{s.desc}</div>
                      </div>
                      <span style={{ background: s.color, color: s.tc, borderRadius: 20, padding: '.18rem .55rem', fontSize: '.62rem', fontWeight: 700 }}>{s.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══ ENTRENAMIENTO IA ══ */}
          {page === 'entrenamiento' && (
            <div className="wbv5-content">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.85rem' }}>
                <div>
                  <div style={{ fontSize: '.85rem', fontWeight: 800 }}>🧠 Entrenamiento IA</div>
                  <div style={{ fontSize: '.68rem', color: '#6b7280' }}>Dale contexto completo a tu bot para que sea el mejor cerrador de ventas del mundo</div>
                </div>
                <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                  <button className={`wbv5-btn wbv5-btn-sm ${generatingPrompt ? 'wbv5-btn-outline' : 'wbv5-btn-ai-on'}`} onClick={generateWinnerPrompt} disabled={generatingPrompt}>
                    {generatingPrompt ? '⏳ Generando...' : '🤖 Generar prompt ganador'}
                  </button>
                  <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={() => { saveTraining(trainingPrompt); tip('✅ Entrenamiento guardado') }}>💾 Guardar</button>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '.3rem', marginBottom: '.75rem', flexWrap: 'wrap' }}>
                {[
                  { id: 'asistente',  label: '🚀 Asistente IA' },
                  { id: 'contexto',   label: '🏢 Contexto empresa' },
                  { id: 'memoria',    label: '🧠 Memoria n8n' },
                  { id: 'prueba',     label: '🧪 Probar bot' },
                ].map(tab => (
                  <button key={tab.id} className={`wbv5-btn wbv5-btn-sm ${trainingTab === tab.id ? 'wbv5-btn-blue' : 'wbv5-btn-outline'}`} onClick={() => setTrainingTab(tab.id)}>{tab.label}</button>
                ))}
              </div>

              {/* Tab: Asistente IA — Wizard */}
              {trainingTab === 'asistente' && (
                <div className="wbv5-card">
                  <div className="wbv5-card-hd">
                    <div className="wbv5-card-title">🚀 Asistente de entrenamiento IA</div>
                    <span className="wbv5-badge" style={{ background: '#ede9fe', color: '#5b21b6' }}>✨ Wizard</span>
                  </div>
                  <div className="wbv5-card-bd">
                    <div style={{ fontSize: '.73rem', color: '#374151', marginBottom: '.85rem', lineHeight: 1.6, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '.65rem .9rem' }}>
                      🎯 <strong>¿Cómo funciona?</strong> Llena los datos de tu negocio y la IA genera automáticamente el entrenamiento ganador. El bot primero <strong>conserva la conversación siendo amigable</strong>, y después busca el <strong>cierre de ventas de forma natural</strong>.
                    </div>
                    <div style={{ display: 'grid', gap: '.6rem' }}>
                      <div className="wbv5-form-row">
                        <div className="wbv5-form-lbl">🏢 Nombre de tu empresa / negocio *</div>
                        <input className="wbv5-form-input" value={wizardData.empresa} onChange={e => setWizardData(p => ({ ...p, empresa: e.target.value }))} placeholder="Ej: Sanate Colombia" />
                      </div>
                      <div className="wbv5-form-row">
                        <div className="wbv5-form-lbl">📝 ¿Qué vendes? Descripción breve</div>
                        <input className="wbv5-form-input" value={wizardData.descripcion} onChange={e => setWizardData(p => ({ ...p, descripcion: e.target.value }))} placeholder="Ej: Suplementos naturales para salud y bienestar" />
                      </div>
                      <div className="wbv5-form-row">
                        <div className="wbv5-form-lbl">🛍️ Productos principales *</div>
                        <textarea className="wbv5-form-input" rows={3} value={wizardData.productos} onChange={e => setWizardData(p => ({ ...p, productos: e.target.value }))} placeholder={'Ej:\n- Combo Detox 30 días\n- Pack Energía Total\n- Kit Bienestar Premium'} style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
                      </div>
                      <div className="wbv5-form-row">
                        <div className="wbv5-form-lbl">💰 Precios de tus productos *</div>
                        <textarea className="wbv5-form-input" rows={3} value={wizardData.precios} onChange={e => setWizardData(p => ({ ...p, precios: e.target.value }))} placeholder={'Ej:\n- Combo Detox 30 días: $150.000\n- Pack Energía Total: $89.000\n- Kit Bienestar Premium: $220.000'} style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
                      </div>
                      <div className="wbv5-form-row">
                        <div className="wbv5-form-lbl">🎁 Combos y ofertas especiales</div>
                        <textarea className="wbv5-form-input" rows={2} value={wizardData.combos} onChange={e => setWizardData(p => ({ ...p, combos: e.target.value }))} placeholder="Ej: 2x1 en Detox, envío gratis por compras +$200.000" style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
                      </div>
                      <div className="wbv5-form-row">
                        <div className="wbv5-form-lbl">💬 Estilo de comunicación del bot</div>
                        <select className="wbv5-form-input" value={wizardData.estilo} onChange={e => setWizardData(p => ({ ...p, estilo: e.target.value }))}>
                          <option value="amigable">😊 Amigable y cercano</option>
                          <option value="profesional">👔 Profesional y formal</option>
                          <option value="energico">⚡ Energético y motivador</option>
                          <option value="suave">🌸 Suave y empático</option>
                        </select>
                      </div>
                      <div className="wbv5-form-row">
                        <div className="wbv5-form-lbl">🔄 Objeciones comunes (cómo las manejas)</div>
                        <textarea className="wbv5-form-input" rows={2} value={wizardData.objeciones} onChange={e => setWizardData(p => ({ ...p, objeciones: e.target.value }))} placeholder={'Ej: "Está muy caro" → Ofrezco plan de pago o combo más económico'} style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
                        <div className="wbv5-form-row">
                          <div className="wbv5-form-lbl">🚚 Envío y logística</div>
                          <input className="wbv5-form-input" value={wizardData.envio} onChange={e => setWizardData(p => ({ ...p, envio: e.target.value }))} placeholder="Ej: Todo Colombia, 2-3 días, $12.000" />
                        </div>
                        <div className="wbv5-form-row">
                          <div className="wbv5-form-lbl">🕐 Horario de atención</div>
                          <input className="wbv5-form-input" value={wizardData.horario} onChange={e => setWizardData(p => ({ ...p, horario: e.target.value }))} placeholder="Ej: Lun-Sáb 8am-6pm" />
                        </div>
                      </div>
                      <div className="wbv5-form-row">
                        <div className="wbv5-form-lbl">✨ Info adicional (métodos de pago, certificaciones, testimonios...)</div>
                        <textarea className="wbv5-form-input" rows={2} value={wizardData.extra} onChange={e => setWizardData(p => ({ ...p, extra: e.target.value }))} placeholder="Nequi, Bancolombia, contraentrega, 500+ clientes satisfechos..." style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
                      </div>
                    </div>
                    {!hasAiKey && (
                      <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, padding: '.6rem .9rem', fontSize: '.73rem', color: '#713f12', marginTop: '.75rem' }}>
                        ⚠️ Necesitas una <strong>API Key</strong> configurada en <strong>Ajustes → API & Tokens</strong>. Puedes usar OpenAI (de pago) o <strong>Google Gemini gratis</strong> (aistudio.google.com/apikey).
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '.5rem', marginTop: '.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <button
                        className={`wbv5-btn wbv5-btn-sm ${generatingWizard ? 'wbv5-btn-outline' : 'wbv5-btn-ai-on'}`}
                        onClick={generateTrainingWizard}
                        disabled={generatingWizard || !hasAiKey}
                        style={{ flex: 1, minWidth: 200, fontSize: '.78rem', padding: '.55rem 1rem' }}
                      >
                        {generatingWizard ? '⏳ Generando entrenamiento ganador...' : '🎯 Generar entrenamiento ganador'}
                      </button>
                      <button
                        className="wbv5-btn wbv5-btn-outline wbv5-btn-sm"
                        onClick={() => setWizardData({ empresa: '', descripcion: '', productos: '', precios: '', combos: '', estilo: 'amigable', objeciones: '', envio: '', horario: '', extra: '' })}
                      >
                        🗑️ Limpiar
                      </button>
                    </div>
                    <div style={{ fontSize: '.65rem', color: '#9ca3af', marginTop: '.4rem', lineHeight: 1.5 }}>
                      💡 El resultado se guardará automáticamente en <strong>Contexto empresa</strong>. Puedes editarlo después.
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Contexto empresa */}
              {trainingTab === 'contexto' && (
                <div className="wbv5-card">
                  <div className="wbv5-card-hd">
                    <div className="wbv5-card-title">🏢 Contexto del negocio</div>
                    <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '.68rem', color: trainingPrompt.length > 70000 ? '#dc2626' : trainingPrompt.length > 50000 ? '#f59e0b' : '#16a34a', fontWeight: 700 }}>
                        {trainingPrompt.length.toLocaleString()} / 80,000 chars
                      </span>
                      <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => saveTraining(TRAINING_TEMPLATE)}>📋 Plantilla</button>
                    </div>
                  </div>
                  <div className="wbv5-card-bd">
                    <div style={{ fontSize: '.72rem', color: '#6b7280', marginBottom: '.6rem', lineHeight: 1.5 }}>
                      📝 Escribe aquí TODO sobre tu negocio: productos, precios, combos, forma de hablar, objeciones comunes, política de envío, historia... <strong>Entre más contexto, mejor vende la IA.</strong>
                    </div>
                    <textarea
                      className="wbv5-training-area"
                      value={trainingPrompt}
                      onChange={e => saveTraining(e.target.value)}
                      maxLength={80000}
                      placeholder="Pega aquí el contexto completo de tu empresa...&#10;&#10;Incluye:&#10;- Nombre y descripción del negocio&#10;- Todos los productos con precios&#10;- Combos y ofertas especiales&#10;- Forma de hablar (formal/informal)&#10;- Técnicas de cierre de venta&#10;- Manejo de objeciones&#10;- Datos de contacto y envío"
                    />
                    <div style={{ display: 'flex', gap: '.5rem', marginTop: '.5rem', flexWrap: 'wrap' }}>
                      <button className={`wbv5-btn wbv5-btn-sm ${generatingPrompt ? 'wbv5-btn-outline' : 'wbv5-btn-ai-on'}`} onClick={generateWinnerPrompt} disabled={generatingPrompt}>
                        {generatingPrompt ? '⏳ Generando con IA...' : '✨ Generar prompt ganador con IA'}
                      </button>
                      <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => { navigator.clipboard?.writeText(trainingPrompt); tip('📋 Contexto copiado') }}>📋 Copiar todo</button>
                      <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => { if(window.confirm('¿Limpiar todo el contexto?')) saveTraining('') }}>🗑️ Limpiar</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Memoria n8n */}
              {trainingTab === 'memoria' && (
                <div className="wbv5-content" style={{ padding: 0, gap: '.75rem' }}>
                  <div className="wbv5-card">
                    <div className="wbv5-card-hd"><div className="wbv5-card-title">🧠 Memoria de clientes (n8n)</div><span className="wbv5-badge badge-blue">Via n8n</span></div>
                    <div className="wbv5-card-bd">
                      <div style={{ fontSize: '.76rem', color: '#374151', lineHeight: 1.6, marginBottom: '.75rem' }}>
                        La memoria del cliente se guarda en n8n usando <strong>nodos de memoria</strong>. Cada número de WhatsApp tiene su propio historial.
                      </div>
                      {[
                        { icon: '📱', title: 'Identificación por número', desc: 'Cada cliente se identifica por su número de WhatsApp (chatId). La IA siempre sabe con quién habla.' },
                        { icon: '🛒', title: 'Historial de pedidos', desc: 'n8n guarda qué productos pidió, cuándo y cuánto pagó. La IA lo usa para personalizar respuestas.' },
                        { icon: '💬', title: 'Contexto de conversación', desc: 'Los últimos 20 mensajes se incluyen en cada llamada a ChatGPT para mantener coherencia.' },
                        { icon: '🔄', title: 'Reconocimiento automático', desc: 'Cuando el cliente vuelve a escribir, la IA lo reconoce y saluda por su nombre con su historial.' },
                      ].map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: '.75rem', padding: '.55rem 0', borderBottom: i < 3 ? '1px solid #f3f4f6' : 'none' }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{item.icon}</div>
                          <div>
                            <div style={{ fontSize: '.76rem', fontWeight: 700, color: '#111827' }}>{item.title}</div>
                            <div style={{ fontSize: '.68rem', color: '#6b7280', marginTop: '.08rem', lineHeight: 1.4 }}>{item.desc}</div>
                          </div>
                        </div>
                      ))}
                      <div style={{ marginTop: '.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '.65rem .9rem', fontSize: '.72rem', color: '#166534' }}>
                        💡 <strong>Configurar en n8n:</strong> Agrega un nodo "Window Buffer Memory" o "Postgres Chat Memory" en tu flujo de WhatsApp. El webhook ya recibe el <code style={{ background: 'rgba(0,0,0,.07)', padding: '1px 4px', borderRadius: 3 }}>chatId</code> para identificar al cliente.
                      </div>
                      <button className="wbv5-btn wbv5-btn-blue wbv5-btn-sm" style={{ marginTop: '.6rem' }} onClick={() => window.open('https://oasiss.app.n8n.cloud', '_blank')}>Abrir n8n para configurar ↗</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Probar bot */}
              {trainingTab === 'prueba' && (
                <div className="wbv5-card">
                  <div className="wbv5-card-hd"><div className="wbv5-card-title">🧪 Probar bot IA</div></div>
                  <div className="wbv5-card-bd">
                    <div style={{ fontSize: '.72rem', color: '#6b7280', marginBottom: '.6rem', lineHeight: 1.5 }}>
                      Prueba cómo responderá tu bot antes de activarlo. Requiere API Key de OpenAI configurada.
                    </div>
                    {!hasAiKey ? (
                      <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, padding: '.65rem .9rem', fontSize: '.76rem', color: '#713f12' }}>
                        ⚠️ Configura tu API Key (OpenAI o Gemini gratis) en <strong>Ajustes → API & Tokens</strong> para probar el bot.
                      </div>
                    ) : (
                      <BotTestChat trainingPrompt={trainingPrompt} aiPrompt={aiPrompt} openaiKey={openaiKey} geminiKey={geminiKey} aiModel={aiModel} tip={tip} msgMode={msgMode} useEmojis={useEmojis} useStyles={useStyles} />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ CONEXIÓN ══ */}
          {page === 'conexion' && (
            <div className="wbv5-content">
              <div style={{ fontSize: '.85rem', fontWeight: 800, marginBottom: '.2rem' }}>📱 Conexión WhatsApp</div>
              <div style={{ fontSize: '.68rem', color: '#6b7280', marginBottom: '.85rem' }}>Vincula tu WhatsApp al bot para recibir y enviar mensajes automáticamente</div>

              {/* ── Banner: servidor Baileys offline ── */}
              {serverOnline === false && (
                <div className="wbv5-server-offline-banner">
                  <div className="wbv5-sob-icon">⚠️</div>
                  <div className="wbv5-sob-body">
                    <div className="wbv5-sob-title">Servidor Baileys no disponible</div>
                    <div className="wbv5-sob-desc">
                      El backend no responde en <code>{BU.replace('/api/whatsapp','')}</code>.
                      Si accedes desde <strong>sanate.store (HTTPS)</strong>, el navegador bloquea conexiones HTTP a localhost.
                      Despliega el servidor en Railway/Render y configura la URL en <strong>Ajustes → Conexión WA</strong>.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '.4rem', flexShrink: 0, flexWrap: 'wrap' }}>
                    <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={ping}>🔄 Reintentar</button>
                    <button className="wbv5-btn wbv5-btn-sm" style={{ background: '#7c3aed', color: '#fff' }} onClick={() => { goPage('config'); setCfgTab('conn') }}>⚙️ Configurar URL</button>
                  </div>
                </div>
              )}

              <div className="wbv5-qr-card">
                {/* Canvas QR — siempre visible; muestra skeleton, QR real o checkmark verde */}
                <div className="wbv5-qr-box" style={{ position: 'relative' }}>
                  {serverOnline === false && status !== 'connected' ? (
                    <div className="wbv5-qr-offline">
                      <div style={{ fontSize: '2.2rem' }}>🔌</div>
                      <div style={{ fontSize: '.72rem', color: '#6b7280', textAlign: 'center', marginTop: '.3rem', lineHeight: 1.4 }}>Servidor<br/>no disponible</div>
                    </div>
                  ) : (
                    <>
                      <canvas ref={qrRef} width="200" height="200" style={{ borderRadius: 10, display: 'block' }} />
                      {status === 'connecting' && !qrDataUrl && (
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,.45)', borderBottomLeftRadius: 10, borderBottomRightRadius: 10, textAlign: 'center', padding: '.25rem 0', fontSize: '.64rem', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.3rem' }}>
                          <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#fbbf24', animation: 'wbv5-pulse 1s ease-in-out infinite' }} />
                          Generando QR...
                        </div>
                      )}
                      {status === 'connected' && (
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(22,163,74,.9)', borderBottomLeftRadius: 10, borderBottomRightRadius: 10, textAlign: 'center', padding: '.28rem 0', fontSize: '.67rem', color: '#fff', fontWeight: 700 }}>
                          ✅ WhatsApp vinculado
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="wbv5-qr-info">
                  {status === 'connected' ? (
                    <>
                      <div style={{ fontSize: '2.5rem', marginBottom: '.4rem' }}>✅</div>
                      <h3 style={{ color: '#16a34a', margin: '0 0 .3rem' }}>WhatsApp Conectado</h3>
                      <p style={{ color: '#374151', margin: '0 0 .6rem' }}>
                        Tu WhatsApp está vinculado. Los mensajes se procesan automáticamente.
                      </p>
                      {phone && (
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '.6rem 1rem', marginBottom: '.8rem', fontSize: '.82rem', color: '#166534' }}>
                          📱 <strong>{phone}</strong>
                        </div>
                      )}
                      <button className="wbv5-btn wbv5-btn-red" onClick={disconnectWA} style={{ width: '100%' }}>
                        🔌 Desvincular WhatsApp
                      </button>
                    </>
                  ) : serverOnline === false ? (
                    <>
                      <h3 style={{ color: '#dc2626', margin: '0 0 .35rem' }}>🔌 Servidor no disponible</h3>
                      <p style={{ opacity: .9, margin: '0 0 .6rem' }}>
                        El servidor Baileys no responde. Inícialo localmente o despliégalo en Railway para generar el código QR.
                      </p>
                      <div className="wbv5-qr-steps">
                        <span>💻 Local: <code style={{ background: 'rgba(255,255,255,.2)', padding: '1px 5px', borderRadius: 4, fontSize: '.68rem' }}>node server.js</code></span>
                        <span>☁️ Railway: verifica que el servicio esté activo</span>
                        <span>🔑 Puerto por defecto: <strong>5055</strong></span>
                      </div>
                      <button className="wbv5-btn" style={{ marginTop: '1rem', width: '100%', background: '#fff', color: '#075e54', fontSize: '.85rem', padding: '.55rem 1rem', fontWeight: 700 }} onClick={ping}>
                        🔄 Verificar conexión
                      </button>
                    </>
                  ) : (
                    <>
                      <h3>{qrDataUrl ? '📱 Escanea con WhatsApp' : status === 'connecting' ? '⏳ Generando QR...' : '📱 Vincula tu WhatsApp'}</h3>
                      <p>
                        {qrDataUrl
                          ? 'Escanea el código QR con tu WhatsApp para conectar el bot.'
                          : status === 'connecting'
                          ? 'El servidor está generando el código QR, espera un momento...'
                          : 'Genera un código QR y escanéalo con WhatsApp para conectar el bot.'}
                      </p>
                      <div className="wbv5-qr-steps">
                        <span>1️⃣ Abre WhatsApp en tu teléfono</span>
                        <span>2️⃣ Ve a Dispositivos vinculados</span>
                        <span>3️⃣ Toca "Vincular un dispositivo"</span>
                        <span>4️⃣ Escanea el código QR</span>
                      </div>
                      {!qrDataUrl && status === 'disconnected' && (
                        <button
                          className="wbv5-btn wbv5-btn-green"
                          style={{ marginTop: '1rem', width: '100%', fontSize: '.9rem', padding: '.6rem 1rem' }}
                          onClick={regenerateQR}
                        >
                          🔄 Generar código QR
                        </button>
                      )}
                    </>
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
                    <>
                    {/* ── Backend URL ── */}
                    <div className="wbv5-card">
                      <div className="wbv5-card-hd">
                        <div className="wbv5-card-title">🔌 Servidor Baileys</div>
                        <span className={`wbv5-badge ${serverOnline === true ? 'badge-green' : serverOnline === false ? 'badge-red' : 'badge-amber'}`}>
                          {serverOnline === true ? '✅ Online' : serverOnline === false ? '❌ Offline' : '⏳ Verificando'}
                        </span>
                      </div>
                      <div className="wbv5-card-bd">
                        <div style={{ fontSize: '.7rem', color: '#6b7280', marginBottom: '.75rem', lineHeight: 1.5 }}>
                          El bot necesita un servidor Baileys corriendo. Puede ser en local, Railway, Render o cualquier servicio cloud.<br />
                          <span style={{ color: '#dc2626', fontWeight: 600 }}>⚠️ Problema actual:</span> desde <code>https://sanate.store</code> los navegadores bloquean <code>http://localhost</code>. Usa una URL pública HTTPS.
                        </div>
                        <div className="wbv5-form-row">
                          <div className="wbv5-form-lbl">URL base del servidor</div>
                          <input
                            className="wbv5-form-input"
                            value={backendUrlInput}
                            onChange={e => setBackendUrlInput(e.target.value)}
                            placeholder="https://tu-app.railway.app  ó  http://localhost:5055"
                          />
                          <div style={{ fontSize: '.62rem', color: '#9ca3af', marginTop: '.2rem' }}>
                            Se usará: <code>{backendUrlInput.trim().replace(/\/+$/, '').replace('/api/whatsapp', '') || 'http://localhost:5055'}/api/whatsapp</code>
                          </div>
                        </div>
                        <div className="wbv5-form-row">
                          <div className="wbv5-form-lbl">Secret Token</div>
                          <input
                            className="wbv5-form-input"
                            type="password"
                            value={secretInput}
                            onChange={e => setSecretInput(e.target.value)}
                            placeholder="sanate_secret_2025"
                          />
                        </div>
                        {/* Opciones de deploy */}
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '.65rem .9rem', marginBottom: '.75rem' }}>
                          <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#166534', marginBottom: '.4rem' }}>🚀 Opciones de deploy del servidor</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
                            {[
                              { icon: '🚂', name: 'Railway (recomendado)', url: 'https://railway.app', desc: 'Gratis hasta 500h/mes, siempre HTTPS' },
                              { icon: '🌐', name: 'Render', url: 'https://render.com', desc: 'Free tier disponible, HTTPS automático' },
                              { icon: '🔧', name: 'ngrok (local HTTPS)', url: 'https://ngrok.com', desc: 'Expone localhost:5055 con URL pública temporal' },
                            ].map((opt, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.7rem' }}>
                                <span>{opt.icon}</span>
                                <span style={{ fontWeight: 600, color: '#166534', minWidth: '150px' }}>{opt.name}</span>
                                <span style={{ color: '#6b7280', flex: 1 }}>{opt.desc}</span>
                                <button className="wbv5-btn wbv5-btn-sm wbv5-btn-outline" style={{ fontSize: '.6rem', padding: '.15rem .45rem' }} onClick={() => window.open(opt.url, '_blank')}>Abrir ↗</button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                          <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={saveBackendUrl}>💾 Guardar y reconectar</button>
                          <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => { setBackendUrlInput(DEFAULT_BU.replace('/api/whatsapp','')); setSecretInput(DEFAULT_SECRET) }}>↩️ Restaurar defaults</button>
                          <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => goPage('conexion')}>📱 Ir a Conexión →</button>
                        </div>
                      </div>
                    </div>
                    {/* ── WhatsApp Status ── */}
                    <div className="wbv5-card">
                      <div className="wbv5-card-hd">
                        <div className="wbv5-card-title">📱 WhatsApp</div>
                        <span className={`wbv5-badge ${status === 'connected' ? 'badge-green' : status === 'connecting' ? 'badge-amber' : 'badge-red'}`}>
                          {status === 'connected' ? '✅ Conectado' : status === 'connecting' ? '⏳ Conectando' : '❌ Desconectado'}
                        </span>
                      </div>
                      <div className="wbv5-card-bd">
                        {phone && <div style={{ fontSize: '.76rem', color: '#166534', background: '#f0fdf4', borderRadius: 8, padding: '.5rem .75rem', marginBottom: '.6rem' }}>📱 <strong>{phone}</strong></div>}
                        <div className="wbv5-form-row">
                          <div className="wbv5-form-lbl">Webhook n8n (producción)</div>
                          <div className="wbv5-code-box" onClick={() => copyText(N8N_WH)}>{N8N_WH} <span style={{ marginLeft: 'auto' }}>📋</span></div>
                        </div>
                        <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => goPage('conexion')}>📱 Ver QR / Conexión →</button>
                      </div>
                    </div>
                    </>
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
                    <>
                      {/* Estado IA Key */}
                      {!openaiKey && !geminiKey && (
                        <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, padding: '.65rem .9rem', fontSize: '.76rem', color: '#713f12', marginBottom: '.75rem' }}>
                          ⚠️ <strong>Sin API Key configurada.</strong> Agrega una de las dos opciones abajo para activar la IA. El botón 🤖 en el chat necesita al menos una key para funcionar.
                        </div>
                      )}
                      {/* ChatGPT / OpenAI */}
                      <div className="wbv5-card">
                        <div className="wbv5-card-hd">
                          <div className="wbv5-card-title">🤖 ChatGPT / OpenAI</div>
                          <span className={`wbv5-badge ${openaiKey ? 'badge-green' : 'badge-amber'}`}>
                            {openaiKey ? '✅ Conectado' : '⏳ Sin configurar'}
                          </span>
                        </div>
                        <div className="wbv5-card-bd">
                          <div style={{ fontSize: '.71rem', color: '#6b7280', marginBottom: '.75rem', lineHeight: 1.5 }}>
                            Conecta tu API de OpenAI para respuestas automáticas con IA. El botón 🤖 en el chat usará esta key para generar respuestas perfectas.
                          </div>
                          <div className="wbv5-form-row">
                            <div className="wbv5-form-lbl">OpenAI API Key</div>
                            <input
                              className="wbv5-form-input" type="password"
                              placeholder="sk-proj-..."
                              value={openaiKey}
                              onChange={e => saveAiKey(e.target.value)}
                            />
                            {openaiKey ? <div style={{ fontSize: '.64rem', color: '#16a34a', marginTop: '.2rem' }}>✅ API Key guardada en navegador</div> : <div style={{ fontSize: '.64rem', color: '#9ca3af', marginTop: '.2rem' }}>Obtén tu key en platform.openai.com/api-keys</div>}
                          </div>
                          <div className="wbv5-form-row">
                            <div className="wbv5-form-lbl">Modelo</div>
                            <select className="wbv5-form-input" value={aiModel} onChange={e => setAiModel(e.target.value)}>
                              <option value="gpt-4o">GPT-4o (Recomendado)</option>
                              <option value="gpt-4o-mini">GPT-4o mini (Rápido y económico)</option>
                              <option value="gpt-4-turbo">GPT-4 Turbo</option>
                              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Más económico)</option>
                            </select>
                          </div>
                          <div className="wbv5-form-row">
                            <div className="wbv5-form-lbl">Webhook n8n (procesamiento IA)</div>
                            <div className="wbv5-code-box" onClick={() => copyText(N8N_WH)}>{N8N_WH} <span style={{ marginLeft: 'auto', fontSize: '.6rem' }}>📋</span></div>
                            <div style={{ fontSize: '.64rem', color: '#9ca3af', marginTop: '.2rem' }}>El webhook recibe el mensaje, llama a ChatGPT y responde automáticamente.</div>
                          </div>
                          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                              className={`wbv5-btn wbv5-btn-sm ${aiEnabled ? 'wbv5-btn-ai-on' : 'wbv5-btn-green'}`}
                              onClick={toggleAiGlobal}
                            >
                              {aiEnabled ? '⏸ Desactivar IA' : '🚀 Activar IA'}
                            </button>
                            <button className="wbv5-btn wbv5-btn-blue wbv5-btn-sm" onClick={() => window.open('https://oasiss.app.n8n.cloud', '_blank')}>Abrir n8n ↗</button>
                            <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => window.open('https://platform.openai.com/api-keys', '_blank')}>Obtener API Key ↗</button>
                          </div>
                        </div>
                      </div>

                      {/* Google Gemini — alternativa gratuita */}
                      <div className="wbv5-card">
                        <div className="wbv5-card-hd">
                          <div className="wbv5-card-title">✨ Google Gemini (alternativa gratuita)</div>
                          <span className={`wbv5-badge ${geminiKey ? 'badge-green' : 'badge-amber'}`}>
                            {geminiKey ? '✅ Conectado' : '⏳ Sin configurar'}
                          </span>
                        </div>
                        <div className="wbv5-card-bd">
                          <div style={{ fontSize: '.71rem', color: '#6b7280', marginBottom: '.75rem', lineHeight: 1.5 }}>
                            Gemini 1.5 Flash es <strong>gratis hasta 60 req/min</strong>. Úsalo si no tienes OpenAI. El bot usa OpenAI primero y Gemini como respaldo automático.
                          </div>
                          <div className="wbv5-form-row">
                            <div className="wbv5-form-lbl">Google Gemini API Key</div>
                            <input
                              className="wbv5-form-input" type="password"
                              placeholder="AIzaSy..."
                              value={geminiKey}
                              onChange={e => saveGeminiKey(e.target.value)}
                            />
                            {geminiKey ? <div style={{ fontSize: '.64rem', color: '#16a34a', marginTop: '.2rem' }}>✅ Gemini Key guardada en navegador</div> : <div style={{ fontSize: '.64rem', color: '#9ca3af', marginTop: '.2rem' }}>Obtén tu key gratis en aistudio.google.com/apikey</div>}
                          </div>
                          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                            <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => window.open('https://aistudio.google.com/apikey', '_blank')}>Obtener Gemini Key gratis ↗</button>
                          </div>
                        </div>
                      </div>

                      <div className="wbv5-card">
                        <div className="wbv5-card-hd">
                          <div className="wbv5-card-title">🔑 Baileys (Railway)</div>
                          <span className={`wbv5-badge ${status === 'connected' ? 'badge-green' : 'badge-amber'}`}>{status === 'connected' ? '✅ Activo' : '⏳ Conectando'}</span>
                        </div>
                        <div className="wbv5-card-bd">
                          <div style={{ fontSize: '.71rem', color: '#6b7280', marginBottom: '.75rem' }}>Backend principal WhatsApp vía Baileys (Railway)</div>
                          <div className="wbv5-form-row"><div className="wbv5-form-lbl">BAILEYS_SECRET</div>
                            <div className="wbv5-code-box" onClick={() => copyText('sanate_secret_2025')}>sanate_secret_2025 <span style={{ marginLeft: 'auto', fontSize: '.6rem' }}>📋</span></div>
                          </div>
                          <div className="wbv5-form-row"><div className="wbv5-form-lbl">N8N_WEBHOOK</div>
                            <div className="wbv5-code-box" onClick={() => copyText(N8N_WH)}>{N8N_WH} <span style={{ marginLeft: 'auto', fontSize: '.6rem' }}>📋</span></div>
                          </div>
                          <button className="wbv5-btn wbv5-btn-blue wbv5-btn-sm" onClick={() => window.open('https://oasiss.app.n8n.cloud', '_blank')}>Abrir n8n ↗</button>
                        </div>
                      </div>
                      <div className="wbv5-card">
                        <div className="wbv5-card-hd">
                          <div className="wbv5-card-title">🌐 WASP API (ascendentinc.studio)</div>
                          <span className="wbv5-badge badge-amber">⚠️ Secundario</span>
                        </div>
                        <div className="wbv5-card-bd">
                          <div style={{ fontSize: '.71rem', color: '#6b7280', marginBottom: '.75rem' }}>
                            Servicio externo WhatsApp. <strong>Nota:</strong> No conectar al mismo número que Baileys — causaría conflicto de sesión.
                          </div>
                          <div className="wbv5-form-row"><div className="wbv5-form-lbl">Base URL</div>
                            <div className="wbv5-code-box" onClick={() => copyText('https://ascendentinc.studio/wasp/api/v1')}>https://ascendentinc.studio/wasp/api/v1 <span style={{ marginLeft: 'auto', fontSize: '.6rem' }}>📋</span></div>
                          </div>
                          <div className="wbv5-form-row"><div className="wbv5-form-lbl">API Key</div>
                            <div className="wbv5-code-box" onClick={() => copyText('wasp_d8b3da5d3c823924505e5afa974b1999')}>wasp_d8b3da5d3c823924505e5afa974b1999 <span style={{ marginLeft: 'auto', fontSize: '.6rem' }}>📋</span></div>
                          </div>
                          <div className="wbv5-form-row"><div className="wbv5-form-lbl">Edit Token</div>
                            <div className="wbv5-code-box" onClick={() => copyText('edt_bc6fc6f2517e1541')}>edt_bc6fc6f2517e1541 <span style={{ marginLeft: 'auto', fontSize: '.6rem' }}>📋</span></div>
                          </div>
                          <div className="wbv5-form-row"><div className="wbv5-form-lbl">Auth Header</div>
                            <div className="wbv5-code-box" onClick={() => copyText('Authorization: Bearer wasp_d8b3da5d3c823924505e5afa974b1999')}>Authorization: Bearer wasp_d8b3da5d3c823924505e5afa974b1999 <span style={{ marginLeft: 'auto', fontSize: '.6rem' }}>📋</span></div>
                          </div>
                          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                            <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => window.open('https://ascendentinc.studio/wasp/', '_blank')}>Abrir panel WASP ↗</button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Comportamiento bot */}
                  {cfgTab === 'bot' && (
                    <>
                      {/* Timing del bot */}
                      <div className="wbv5-card">
                        <div className="wbv5-card-hd"><div className="wbv5-card-title">⏱️ Tiempos de respuesta</div></div>
                        <div className="wbv5-card-bd">
                          <div style={{ fontSize: '.72rem', color: '#6b7280', marginBottom: '.75rem', lineHeight: 1.5 }}>
                            Simula un comportamiento humano — la IA esperará antes de responder para que no parezca robot.
                          </div>
                          <div className="wbv5-form-row">
                            <div className="wbv5-form-lbl">Pausa antes de responder (segundos): <strong>{botDelay}s</strong></div>
                            <input type="range" min={0} max={15} value={botDelay} onChange={e => { const v = parseInt(e.target.value); setBotDelay(v); try { localStorage.setItem('wa_bot_delay', String(v)) } catch {} }} style={{ width: '100%', accentColor: '#25d366' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.6rem', color: '#9ca3af' }}><span>0s (inmediato)</span><span>5s</span><span>10s</span><span>15s (natural)</span></div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.5rem 0', borderTop: '1px solid #f3f4f6' }}>
                            <div>
                              <div style={{ fontSize: '.76rem', fontWeight: 600, color: '#111827' }}>Simular "escribiendo..."</div>
                              <div style={{ fontSize: '.64rem', color: '#9ca3af' }}>Muestra el indicador de escritura antes de cada respuesta</div>
                            </div>
                            <button className={`wbv5-btn wbv5-btn-sm ${simulateTyping ? 'wbv5-btn-green' : 'wbv5-btn-outline'}`} onClick={() => setSimulateTyping(s => !s)}>{simulateTyping ? '✅ ON' : '⚪ OFF'}</button>
                          </div>
                        </div>
                      </div>
                      {/* Estilo de mensajes */}
                      <div className="wbv5-card">
                        <div className="wbv5-card-hd"><div className="wbv5-card-title">📨 Estilo de mensajes</div></div>
                        <div className="wbv5-card-bd">
                          <div style={{ fontSize: '.72rem', color: '#6b7280', marginBottom: '.75rem', lineHeight: 1.5 }}>
                            Controla cómo el bot estructura y formatea sus respuestas en WhatsApp.
                          </div>
                          {/* Envío Por Partes / Completo */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.55rem 0', borderBottom: '1px solid #f3f4f6' }}>
                            <div>
                              <div style={{ fontSize: '.76rem', fontWeight: 600, color: '#111827' }}>Envío de mensajes</div>
                              <div style={{ fontSize: '.64rem', color: '#9ca3af', marginTop: '.05rem' }}>
                                {msgMode === 'partes' ? 'Por partes: varios mensajes con gancho e intriga' : 'Completo: un solo bloque de texto'}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '.35rem', flexShrink: 0, marginLeft: '1rem' }}>
                              <button
                                className={`wbv5-btn wbv5-btn-sm ${msgMode === 'partes' ? 'wbv5-btn-green' : 'wbv5-btn-outline'}`}
                                onClick={() => { setMsgMode('partes'); try { localStorage.setItem('wa_msg_mode', 'partes') } catch {} }}
                              >Por partes</button>
                              <button
                                className={`wbv5-btn wbv5-btn-sm ${msgMode === 'completo' ? 'wbv5-btn-green' : 'wbv5-btn-outline'}`}
                                onClick={() => { setMsgMode('completo'); try { localStorage.setItem('wa_msg_mode', 'completo') } catch {} }}
                              >Completo</button>
                            </div>
                          </div>
                          {/* Uso de Emojis */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.55rem 0', borderBottom: '1px solid #f3f4f6' }}>
                            <div>
                              <div style={{ fontSize: '.76rem', fontWeight: 600, color: '#111827' }}>Uso de Emojis</div>
                              <div style={{ fontSize: '.64rem', color: '#9ca3af', marginTop: '.05rem' }}>{useEmojis ? 'El bot usa emojis estratégicos en sus respuestas' : 'Sin emojis — respuestas más formales y textuales'}</div>
                            </div>
                            <button
                              className={`wbv5-btn wbv5-btn-sm ${useEmojis ? 'wbv5-btn-green' : 'wbv5-btn-outline'}`}
                              style={{ flexShrink: 0, marginLeft: '1rem' }}
                              onClick={() => { const nv = !useEmojis; setUseEmojis(nv); try { localStorage.setItem('wa_use_emojis', String(nv)) } catch {} }}
                            >{useEmojis ? '✅ Activo' : '⚪ Inactivo'}</button>
                          </div>
                          {/* Uso de Estilos */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.55rem 0' }}>
                            <div>
                              <div style={{ fontSize: '.76rem', fontWeight: 600, color: '#111827' }}>Uso de estilos</div>
                              <div style={{ fontSize: '.64rem', color: '#9ca3af', marginTop: '.05rem' }}>{useStyles ? 'Usa *negrita*, _cursiva_, ~tachado~ en WhatsApp' : 'Sin formato — texto plano únicamente'}</div>
                            </div>
                            <button
                              className={`wbv5-btn wbv5-btn-sm ${useStyles ? 'wbv5-btn-green' : 'wbv5-btn-outline'}`}
                              style={{ flexShrink: 0, marginLeft: '1rem' }}
                              onClick={() => { const nv = !useStyles; setUseStyles(nv); try { localStorage.setItem('wa_use_styles', String(nv)) } catch {} }}
                            >{useStyles ? '✅ Activo' : '⚪ Inactivo'}</button>
                          </div>
                        </div>
                      </div>
                      {/* IA global */}
                      <div className="wbv5-card">
                        <div className="wbv5-card-hd">
                          <div className="wbv5-card-title">🤖 Inteligencia Artificial</div>
                          <span className={`wbv5-badge ${aiEnabled ? 'badge-green' : 'badge-amber'}`}>{aiEnabled ? '✅ Activa' : '⏳ Desactivada'}</span>
                        </div>
                        <div className="wbv5-card-bd">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.55rem 0', borderBottom: '1px solid #f3f4f6' }}>
                            <div>
                              <div style={{ fontSize: '.76rem', fontWeight: 600, color: '#111827' }}>Respuestas automáticas con ChatGPT</div>
                              <div style={{ fontSize: '.64rem', color: '#9ca3af', marginTop: '.05rem' }}>Todos los mensajes entrantes son respondidos automáticamente por IA via n8n</div>
                            </div>
                            <button
                              className={`wbv5-btn wbv5-btn-sm ${aiEnabled ? 'wbv5-btn-ai-on' : 'wbv5-btn-outline'}`}
                              style={{ flexShrink: 0, marginLeft: '1rem' }}
                              onClick={toggleAiGlobal}
                            >
                              {aiEnabled ? '🤖 ON' : '⚪ OFF'}
                            </button>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.55rem 0', borderTop: '1px solid #f3f4f6' }}>
                            <div>
                              <div style={{ fontSize: '.76rem', fontWeight: 600, color: '#111827' }}>Activación por contacto</div>
                              <div style={{ fontSize: '.64rem', color: '#9ca3af', marginTop: '.05rem' }}>La IA solo responde en chats donde se activó manualmente con el botón <strong>🤖 IA OFF → ON</strong> del chat</div>
                            </div>
                            <span className="wbv5-badge badge-blue" style={{ flexShrink: 0, marginLeft: '1rem' }}>Manual</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.55rem 0', borderTop: '1px solid #f3f4f6' }}>
                            <div>
                              <div style={{ fontSize: '.76rem', fontWeight: 600, color: '#dc2626' }}>Desactivar IA en todos los contactos</div>
                              <div style={{ fontSize: '.64rem', color: '#9ca3af', marginTop: '.05rem' }}>
                                {Object.values(aiContactMap).filter(v => v === true).length} contacto(s) con IA activa ahora
                              </div>
                            </div>
                            <button className="wbv5-btn wbv5-btn-sm" style={{ flexShrink: 0, marginLeft: '1rem', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }} onClick={resetAllAiContacts}>
                              🚫 Desactivar todos
                            </button>
                          </div>
                          <div style={{ marginTop: '.4rem', fontSize: '.7rem', color: '#6b7280' }}>
                            💡 Para configurar la API Key de ChatGPT ve a <strong>⚙️ Ajustes → API & Tokens → 🤖 ChatGPT</strong>
                          </div>
                        </div>
                      </div>
                      <div className="wbv5-card">
                        <div className="wbv5-card-hd"><div className="wbv5-card-title">⚙️ Comportamiento del bot</div></div>
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
                    </>
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
