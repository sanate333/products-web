import React, { useState, useEffect, useRef } from 'react'
import EmojiPicker from 'emoji-picker-react'
import './WhatsAppBot.css'
import Header from '../Header/Header'
import ApiKeysPanel from './ApiKeysPanel';

const DEFAULT_BU     = 'https://sanate-wa-bot.onrender.com/api/whatsapp'
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
const CHATS_KEY  = 'wb_master_chats'
function cacheGet(chatId)        { try { return JSON.parse(localStorage.getItem(MSGS_KEY + chatId) || '[]') } catch { return [] } }
function cachePut(chatId, msgs)  { try { localStorage.setItem(MSGS_KEY + chatId, JSON.stringify(msgs.slice(-200))) } catch {} }
function activeGet()             { try { return JSON.parse(localStorage.getItem(ACTIVE_KEY) || 'null') } catch { return null } }
function activePut(c)            { try { localStorage.setItem(ACTIVE_KEY, c ? JSON.stringify(c) : 'null') } catch {} }
function chatsMasterGet()        { try { return JSON.parse(localStorage.getItem(CHATS_KEY) || '[]') } catch { return [] } }
function chatsMasterPut(chats)   { try { localStorage.setItem(CHATS_KEY, JSON.stringify(chats.slice(0, 500))) } catch {} }

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
  const raw = String(id || '').replace(/@s\.whatsapp\.net|@g\.us|@c\.us|@lid/g, '')
  if (/^\d{7,}$/.test(raw)) return '+' + raw
  return phone || ''
}

// ── detectar plataforma desde chatId o campo platform ─────────
function detectPlatform(chatId, srcPlatform) {
  if (srcPlatform) return srcPlatform.toLowerCase()
  const cid = String(chatId || '')
  if (cid.includes('@s.whatsapp.net') || cid.includes('@g.us') || cid.includes('@c.us') || cid.includes('@lid')) return 'whatsapp'
  if (cid.includes('instagram') || cid.startsWith('ig_')) return 'instagram'
  if (cid.includes('messenger') || cid.startsWith('fb_')) return 'messenger'
  if (cid.includes('tiktok') || cid.startsWith('tt_')) return 'tiktok'
  return 'whatsapp'
}

// ── campo: normalizar chats del backend ────────────────────────
function normChat(c) {
  const ts = c.lastMessageAt || c.updatedAt || ''
  const hhmm = ts ? (() => { try { return new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) } catch { return '' } })() : ''
  const chatId = c.chatId || c.id || ''
  const phone  = cleanPhone(c.phone, chatId)
  const isGroup = chatId.includes('@g.us')
  const platform = detectPlatform(chatId, c.platform)
  // Limpia nombres que son JIDs (ej: "1234567890@s.whatsapp.net" → usa el teléfono)
  const rawName = String(c.pushName || c.notify || c.name || '').trim()
  const name = (rawName && !rawName.includes('@')) ? rawName : (isGroup ? 'Grupo' : (phone || chatId.split('@')[0]))
  return {
    id:       chatId,
    name,
    phone,
    isGroup,
    platform,
    photoUrl: c.photoUrl || c.avatar || '',
    preview:  c.lastMessagePreview || c.preview || '',
    time:     hhmm,
    _ts:      ts ? new Date(ts).getTime() : 0,  // timestamp numérico para sort
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
  { id: 'tr1', name: 'Sin respuesta 1h',      condition: 'no_reply',    delay: 60,   unit: 'min', producto: 'General', message: '¡Hola {nombre}! 👋 Vi que revisaste nuestra info.\n¿Te puedo ayudar a resolver alguna duda?\nTenemos combos especiales solo por hoy 🎁', active: false, mediaType: null, mediaUrl: '' },
  { id: 'tr2', name: 'Visto sin responder 3h', condition: 'seen',       delay: 180,  unit: 'min', producto: 'General', message: 'Hola {nombre} 😊 Quería enviarte nuestra mejor oferta de hoy.\n¿Cuál es tu producto favorito? 🌿\nTe armo un combo personalizado 💚', active: false, mediaType: null, mediaUrl: '' },
  { id: 'tr3', name: 'Cierre 24h',             condition: 'no_purchase', delay: 1440, unit: 'min', producto: 'General', message: '🔥 ¡Último aviso, {nombre}!\nTu combo favorito tiene 15% OFF solo hoy.\n¿Lo reservamos? Responde SÍ y te lo aparto ahora mismo 💪', active: false, mediaType: null, mediaUrl: '' },
]

const DEFAULT_KW_TRIGGERS = [
  { id: 'kw1', name: '🔑 Precio / Cuánto vale',    condition: 'keyword', keyword: 'precio, precios, cuanto vale, cuánto vale, cuanto cuesta, cuánto cuesta, valor, costo', delay: 0, unit: 'min', producto: 'Ventas',    message: '💚 *Combo 1* – Tripack Mixto (3 Jabones) → *$59.000*\n💛 *Combo 2* – 3 Jabones a elección → *$59.000*\n🌿 *Combo 3* – 2 Jabones + Sebo 10g → *$63.000*\n⭐ *Combo 5* – MÁS VENDIDO: 4 Jabones + Sebo + Exfoliante → *$119.000*\n\n🚚 Envío GRATIS | 💳 Contra entrega | Nequi *8% OFF*\n\n¿Cuál te llevas hoy? 💛', active: true,  mediaType: null, mediaUrl: '' },
  { id: 'kw2', name: '🔑 Combos / Productos',       condition: 'keyword', keyword: 'combo, combos, productos, catalogo, catálogo, que tienes, qué tienes, que vendes, qué vendes, info, información, informacion', delay: 0, unit: 'min', producto: 'Ventas',    message: '🔥 COMBOS MÁS PEDIDOS – PRECIOS BAJOS POR TIEMPO LIMITADO 🔥\n\n💚 *Combo 1* – Tripack Mixto (3 Jabones: Caléndula+Cúrcuma+Avena) → *$59.000* (antes $105.000)\n💛 *Combo 3* – 2 Jabones + Sebo de Res 10g → *$63.000* (antes $79.000)\n⭐ *Combo 5* – MÁS VENDIDO: 4 Jabones + Sebo + Exfoliante → *$119.000* (antes $159.000)\n\n🚚 Envío GRATIS a toda Colombia 💳 Pagas al recibir — sin riesgo\n⏰ ¿Te reservo el más vendido? 💛', active: true,  mediaType: null, mediaUrl: '' },
  { id: 'kw3', name: '🔑 Hola / Bienvenida',        condition: 'keyword', keyword: 'hola, buenas, buenos dias, buenos días, buenas tardes, buenas noches, hi, hello, saludos', delay: 0, unit: 'min', producto: 'Inicio',    message: 'Hola {nombre} 👋😊 ¡Bienvenido a Sánate! Qué bueno tenerte por aquí 💛\n\n¿Buscas algo para *acné*, *manchas*, *piel seca* o *zonas íntimas*?\nCuéntame y te recomiendo el combo perfecto ✨', active: false, mediaType: null, mediaUrl: '' },
  { id: 'kw4', name: '🔑 Confirmar / Datos pedido', condition: 'keyword', keyword: 'si quiero, sí quiero, lo quiero, lo compro, confirmar, confirmo, mis datos, datos, dirección, pedir, pedido', delay: 0, unit: 'min', producto: 'Pedidos',   message: '¡Excelente elección! 💚✨\n\nPara confirmar tu pedido envíame:\n1️⃣ Nombre y Apellido\n📱 Teléfono de contacto\n📍 Ciudad y Departamento\n🏠 Dirección exacta\n📦 Barrio\n\nQuedo atenta para procesarlo de inmediato 🚀', active: true,  mediaType: null, mediaUrl: '' },
]

const DEFAULT_PLANTILLAS = [
  { id: 'tpl_bienvenida',  nombre: 'Bienvenida',            categoria: 'Inicio',       mensaje: 'Hola {nombre} 👋😊 ¡Bienvenido! Qué bueno tenerte por aquí 💛\n\n¿Quieres saber cómo se usa, los combos disponibles y el obsequio activo 🎁?\nResponde Sí o No ✨' },
  { id: 'tpl_info_ofertas', nombre: 'Info + Combos + Precios', categoria: 'Ventas',    mensaje: '🔥 COMBOS MÁS PEDIDOS – PRECIOS BAJOS POR TIEMPO LIMITADO 🔥\n\n💚 *Combo 1* – Tripack Mixto (3 Jabones: Caléndula+Cúrcuma+Avena) → *$59.000* (antes $105.000)\n💛 *Combo 3* – 2 Jabones + Sebo de Res 10g → *$63.000* (antes $79.000)\n⭐ *Combo 5* – MÁS VENDIDO: 4 Jabones + Sebo + Exfoliante → *$119.000* (antes $159.000)\n\n🚚 Envío GRATIS a toda Colombia 💳 Pagas al recibir — sin riesgo\n⏰ Se están agotando rápido... ¿Te reservo el más vendido? 💛' },
  { id: 'tpl_confirmacion', nombre: 'Confirmación de pedido',  categoria: 'Pedidos',   mensaje: 'Tu pedido ha sido confirmado exitosamente y eres muy importante para nosotros 💚\n\n📦 Por favor, estate pendiente del envío y del repartidor de Inter Rapidísimo 🚚\nNormalmente la entrega se realiza en 1 a 3 días hábiles, dependiendo de tu ciudad.\n\n¡Gracias por ser parte de la familia Sánate! 🙌' },
  { id: 'tpl_seguimiento', nombre: 'Seguimiento sin compra',  categoria: 'Seguimiento', mensaje: 'Hola {nombre} 😊\n\n¿Pudiste revisar la información que te envié? 🌿\n\nHoy tenemos un descuento especial — los precios y el obsequio son *solo por hoy* ⏰\n\n¿Te reservo el más vendido antes de que se agote? 💛' },
  { id: 'tpl_precio',      nombre: 'Precios y combos (lista)', categoria: 'Ventas',    mensaje: '💚 *Combo 1* – Tripack Mixto (3 Jabones) → *$59.000*\n💛 *Combo 2* – 3 Jabones a elección → *$59.000*\n🌿 *Combo 3* – 2 Jabones + Sebo 10g → *$63.000*\n⭐ *Combo 5* – MÁS VENDIDO: 4 Jabones + Sebo + Exfoliante → *$119.000*\n\n🚚 Envío GRATIS | 💳 Contra entrega | Nequi *8% OFF*\n\n¿Cuál te llevas hoy? 💛' },
  { id: 'tpl_datos',       nombre: 'Solicitud de datos',       categoria: 'Pedidos',   mensaje: '¡Excelente elección! 💚✨\n\nPara confirmar tu pedido envíame:\n1️⃣ Nombre y Apellido\n📱 Teléfono de contacto\n📍 Ciudad y Departamento\n🏠 Dirección exacta\n📦 Barrio\n\nQuedo atenta para procesarlo de inmediato 🚀' },
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


function DifusionesMasivas({ BU, sec }) {
  const [jobs, setJobs] = React.useState([]);
  const [tab, setTab] = React.useState('list');
  const [form, setForm] = React.useState({ name:'', numbers:'', message:'', mediaUrl:'', delayType:'short', deviceId:'default', startHour:10, startMin:0, endHour:18, endMin:0 });
  const [sending, setSending] = React.useState(false);
  const load = React.useCallback(() => {
    fetch(BU+'/broadcast',{headers:{'x-secret':sec}}).then(r=>r.json()).then(d=>setJobs(d.jobs||[])).catch(()=>{});
  }, [BU, sec]);
  React.useEffect(()=>{ load(); const t=setInterval(load,6000); return ()=>clearInterval(t); },[load]);
  const create = async () => {
    const nums = form.numbers.split(/[\n,]+/).map(n=>n.trim()).filter(Boolean);
    if (!nums.length || !form.message.trim()) return;
    setSending(true);
    try {
      await fetch(BU+'/broadcast',{method:'POST',headers:{'x-secret':sec,'Content-Type':'application/json'},body:JSON.stringify({...form,numbers:nums})});
      setTab('list'); load();
    } catch(e){} finally { setSending(false); }
  };
  const toggleJob = async (id, status) => {
    await fetch(BU+'/broadcast/'+id,{method:'PATCH',headers:{'x-secret':sec,'Content-Type':'application/json'},body:JSON.stringify({status})}).catch(()=>{});
    load();
  };
  const delJob = async (id) => {
    if (!window.confirm('¿Eliminar difusión?')) return;
    await fetch(BU+'/broadcast/'+id,{method:'DELETE',headers:{'x-secret':sec}}).catch(()=>{});
    load();
  };
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:'#111'}}>
      <div style={{display:'flex',gap:'8px',padding:'12px 16px',borderBottom:'1px solid #2a2a2a',background:'#0d0d0d'}}>
        <button onClick={()=>setTab('list')} style={{flex:1,padding:'8px',borderRadius:'8px',border:'1px solid #333',background:tab==='list'?'#25d366':'transparent',color:tab==='list'?'#fff':'#aaa',cursor:'pointer',fontWeight:'600',fontSize:'13px'}}>📋 Difusiones</button>
        <button onClick={()=>setTab('new')} style={{flex:1,padding:'8px',borderRadius:'8px',border:'1px solid #333',background:tab==='new'?'#25d366':'transparent',color:tab==='new'?'#fff':'#aaa',cursor:'pointer',fontWeight:'600',fontSize:'13px'}}>➕ Nueva</button>
      </div>
      {tab==='list' && (
        <div style={{flex:1,overflowY:'auto',padding:'12px',display:'flex',flexDirection:'column',gap:'10px'}}>
          {jobs.length===0 && <div style={{textAlign:'center',color:'#666',marginTop:'40px',fontSize:'14px'}}>Sin difusiones activas</div>}
          {jobs.map(j=>(
            <div key={j.id} style={{background:'#1a1a1a',borderRadius:'10px',padding:'12px',border:'1px solid #2a2a2a'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                <span style={{fontWeight:'600',color:'#eee',fontSize:'13px'}}>{j.name||j.id}</span>
                <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'12px',background:j.status==='running'?'#22c55e22':'#f59e0b22',color:j.status==='running'?'#22c55e':'#f59e0b'}}>{j.status==='running'?'▶ Activo':'⏸ Pausado'}</span>
              </div>
              <div style={{fontSize:'12px',color:'#999',marginBottom:'8px'}}>{j.sentCount||0} enviados · {j.totalNumbers||0} total · {j.errors||0} errores</div>
              <div style={{height:'4px',