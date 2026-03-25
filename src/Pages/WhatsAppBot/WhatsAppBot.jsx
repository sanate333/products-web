import React, { useState, useEffect, useRef } from 'react'
import EmojiPicker from 'emoji-picker-react'
import './WhatsAppBot.css'
import Header from '../Header/Header'
import ApiKeysPanel from './ApiKeysPanel';

const DEFAULT_BU     = 'https://sanate-wa-bot.onrender.com/api/whatsapp'
const DEFAULT_SECRET = 'sanate_secret_2025'
// ââ Backend URL y Secret â configurables en Ajustes âââââââââââââ
let BU         = (function(){ try { return localStorage.getItem('wa_backend_url') || DEFAULT_BU } catch { return DEFAULT_BU } })()
let MEDIA_BASE = BU.replace('/api/whatsapp', '')
let H          = { 'x-secret': (function(){ try { return localStorage.getItem('wa_secret') || DEFAULT_SECRET } catch { return DEFAULT_SECRET } })() }
let HJ         = { ...H, 'Content-Type': 'application/json' }
const N8N_WH = 'https://oasiss.app.n8n.cloud/webhook/whatsapp-sanate'

// ââ localStorage helpers âââââââââââââââââââââââââââââââââââââââ
const MSGS_KEY   = 'wb_msgs_'
const ACTIVE_KEY = 'wb_active_chat'
const CHATS_KEY  = 'wb_master_chats'
function cacheGet(chatId)        { try { return JSON.parse(localStorage.getItem(MSGS_KEY + chatId) || '[]') } catch { return [] } }
function cachePut(chatId, msgs)  { try { localStorage.setItem(MSGS_KEY + chatId, JSON.stringify(msgs.slice(-200))) } catch {} }
function activeGet()             { try { return JSON.parse(localStorage.getItem(ACTIVE_KEY) || 'null') } catch { return null } }
function activePut(c)            { try { localStorage.setItem(ACTIVE_KEY, c ? JSON.stringify(c) : 'null') } catch {} }
function chatsMasterGet()        { try { return JSON.parse(localStorage.getItem(CHATS_KEY) || '[]') } catch { return [] } }
function chatsMasterPut(chats)   { try { localStorage.setItem(CHATS_KEY, JSON.stringify(chats.slice(0, 500))) } catch {} }

// ââ campo: normalizar mensajes del backend âââââââââââââââââââââ
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

// ââ limpiar JID de Baileys â número legible âââââââââââââââââââ
function cleanPhone(phone, id) {
  if (phone && phone.startsWith('+')) return phone
  if (phone && /^\d{7,}$/.test(phone)) return '+' + phone
  const raw = String(id || '').replace(/@s\.whatsapp\.net|@g\.us|@c\.us|@lid/g, '')
  if (/^\d{7,}$/.test(raw)) return '+' + raw
  return phone || ''
}

// ââ detectar plataforma desde chatId o campo platform âââââââââ
function detectPlatform(chatId, srcPlatform) {
  if (srcPlatform) return srcPlatform.toLowerCase()
  const cid = String(chatId || '')
  if (cid.includes('@s.whatsapp.net') || cid.includes('@g.us') || cid.includes('@c.us') || cid.includes('@lid')) return 'whatsapp'
  if (cid.includes('instagram') || cid.startsWith('ig_')) return 'instagram'
  if (cid.includes('messenger') || cid.startsWith('fb_')) return 'messenger'
  if (cid.includes('tiktok') || cid.startsWith('tt_')) return 'tiktok'
  return 'whatsapp'
}

// ââ campo: normalizar chats del backend ââââââââââââââââââââââââ
function normChat(c) {
  const ts = c.lastMessageAt || c.updatedAt || ''
  const hhmm = ts ? (() => { try { return new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) } catch { return '' } })() : ''
  const chatId = c.chatId || c.id || ''
  const phone  = cleanPhone(c.phone, chatId)
  const isGroup = chatId.includes('@g.us')
  const platform = detectPlatform(chatId, c.platform)
  // Limpia nombres que son JIDs (ej: "1234567890@s.whatsapp.net" â usa el teléfono)
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
    { id: 'n1', x: 200, y: 50,  type: 'trigger',   icon: 'ð©', color: 'b', title: 'Mensaje recibido',    desc: 'Primer mensaje del usuario' },
    { id: 'n2', x: 200, y: 155, type: 'condition',  icon: 'ð', color: 'a', title: '¿Es nuevo contacto?', desc: 'Verifica si es primera vez' },
    { id: 'n3', x: 70,  y: 265, type: 'message',    icon: 'ð', color: 'g', title: 'Bienvenida',          desc: '¡Hola {nombre}! Bienvenido ð' },
    { id: 'n4', x: 330, y: 265, type: 'message',    icon: 'ð', color: 'g', title: 'Retorno',             desc: '¡Qué bueno verte de nuevo!' },
    { id: 'n5', x: 200, y: 372, type: 'menu',       icon: 'ð', color: 'b', title: 'Menú principal',     desc: 'ðï¸ Productos | ð¦ Pedidos | ð Soporte' },
    { id: 'n6', x: 70,  y: 468, type: 'action',     icon: 'ð', color: 'p', title: 'â Guardar',           desc: 'Guardar contacto en CRM' },
    { id: 'n7', x: 330, y: 468, type: 'end',        icon: 'ð', color: 'r', title: 'Fin',                 desc: 'Conversación finalizada' },
  ],
  carrito: [
    { id: 'n1', x: 200, y: 45,  type: 'trigger',   icon: 'ð', color: 'b', title: 'Carrito abandonado', desc: '>24h sin comprar' },
    { id: 'n2', x: 200, y: 150, type: 'message',   icon: 'ð', color: 'g', title: 'Recordatorio',       desc: 'Oye! Dejaste algo en tu carrito ð' },
    { id: 'n3', x: 200, y: 250, type: 'condition', icon: 'ð', color: 'a', title: '¿Respondió?',        desc: 'Verificar interacción' },
    { id: 'n4', x: 60,  y: 355, type: 'action',    icon: 'ð³', color: 'g', title: 'â Compra',           desc: 'sanate.store/checkout' },
    { id: 'n5', x: 340, y: 355, type: 'message',   icon: 'â°', color: 'b', title: 'Follow-up 48h',      desc: 'Último recordatorio' },
    { id: 'n6', x: 200, y: 455, type: 'end',       icon: 'â', color: 'g', title: 'Fin',                desc: 'Archivar' },
  ],
  soporte: [
    { id: 'n1', x: 200, y: 50,  type: 'trigger',   icon: 'ð', color: 'b', title: 'Soporte',         desc: 'Keyword: soporte/ayuda' },
    { id: 'n2', x: 200, y: 150, type: 'message',   icon: 'ð¤', color: 'g', title: 'Bot responde',    desc: 'Describe tu problema' },
    { id: 'n3', x: 200, y: 250, type: 'condition', icon: 'ð', color: 'a', title: '¿Resuelto?',      desc: 'Bot | Humano' },
    { id: 'n4', x: 70,  y: 355, type: 'action',    icon: 'ð', color: 'a', title: 'â Agente',        desc: 'Desactivar bot' },
    { id: 'n5', x: 330, y: 355, type: 'message',   icon: 'â', color: 'g', title: 'Confirmación',    desc: '¿Algo más?' },
    { id: 'n6', x: 200, y: 455, type: 'end',       icon: 'ð', color: 'r', title: 'Fin',             desc: 'Cerrar caso' },
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
  { key: 'bienvenida', name: 'Flujo de bienvenida',    trigger: 'ð© Primer mensaje', badge: 'badge-blue',  runs: 123, ctr: '58%', date: '20/02/2026' },
  { key: 'carrito',    name: 'Flujo carrito',           trigger: 'ð Carrito',        badge: 'badge-amber', runs: 230, ctr: '63%', date: '20/02/2026' },
  { key: 'soporte',    name: 'Flujo soporte',           trigger: 'ð Keyword',        badge: 'badge-green', runs: 84,  ctr: '47%', date: '20/02/2026' },
]

const DEFAULT_TRIGGERS = [
  { id: 'tr1', name: 'Sin respuesta 1h',      condition: 'no_reply',    delay: 60,   unit: 'min', producto: 'General', message: '¡Hola {nombre}! ð Vi que revisaste nuestra info.\n¿Te puedo ayudar a resolver alguna duda?\nTenemos combos especiales solo por hoy ð', active: false, mediaType: null, mediaUrl: '' },
  { id: 'tr2', name: 'Visto sin responder 3h', condition: 'seen',       delay: 180,  unit: 'min', producto: 'General', message: 'Hola {nombre} ð Quería enviarte nuestra mejor oferta de hoy.\n¿Cuál es tu producto favorito? ð¿\nTe armo un combo personalizado ð', active: false, mediaType: null, mediaUrl: '' },
  { id: 'tr3', name: 'Cierre 24h',             condition: 'no_purchase', delay: 1440, unit: 'min', producto: 'General', message: 'ð¥ ¡Último aviso, {nombre}!\nTu combo favorito tiene 15% OFF solo hoy.\n¿Lo reservamos? Responde SÍ y te lo aparto ahora mismo ðª', active: false, mediaType: null, mediaUrl: '' },
]

const DEFAULT_KW_TRIGGERS = [
  { id: 'kw1', name: 'ð Precio / Cuánto vale',    condition: 'keyword', keyword: 'precio, precios, cuanto vale, cuánto vale, cuanto cuesta, cuánto cuesta, valor, costo', delay: 0, unit: 'min', producto: 'Ventas',    message: 'ð *Combo 1* â Tripack Mixto (3 Jabones) â *$59.000*\nð *Combo 2* â 3 Jabones a elección â *$59.000*\nð¿ *Combo 3* â 2 Jabones + Sebo 10g â *$63.000*\nâ­ *Combo 5* â MÁS VENDIDO: 4 Jabones + Sebo + Exfoliante â *$119.000*\n\nð Envío GRATIS | ð³ Contra entrega | Nequi *8% OFF*\n\n¿Cuál te llevas hoy? ð', active: true,  mediaType: null, mediaUrl: '' },
  { id: 'kw2', name: 'ð Combos / Productos',       condition: 'keyword', keyword: 'combo, combos, productos, catalogo, catálogo, que tienes, qué tienes, que vendes, qué vendes, info, información, informacion', delay: 0, unit: 'min', producto: 'Ventas',    message: 'ð¥ COMBOS MÁS PEDIDOS â PRECIOS BAJOS POR TIEMPO LIMITADO ð¥\n\nð *Combo 1* â Tripack Mixto (3 Jabones: Caléndula+Cúrcuma+Avena) â *$59.000* (antes $105.000)\nð *Combo 3* â 2 Jabones + Sebo de Res 10g â *$63.000* (antes $79.000)\nâ­ *Combo 5* â MÁS VENDIDO: 4 Jabones + Sebo + Exfoliante â *$119.000* (antes $159.000)\n\nð Envío GRATIS a toda Colombia ð³ Pagas al recibir â sin riesgo\nâ° ¿Te reservo el más vendido? ð', active: true,  mediaType: null, mediaUrl: '' },
  { id: 'kw3', name: 'ð Hola / Bienvenida',        condition: 'keyword', keyword: 'hola, buenas, buenos dias, buenos días, buenas tardes, buenas noches, hi, hello, saludos', delay: 0, unit: 'min', producto: 'Inicio',    message: 'Hola {nombre} ðð ¡Bienvenido a Sánate! Qué bueno tenerte por aquí ð\n\n¿Buscas algo para *acné*, *manchas*, *piel seca* o *zonas íntimas*?\nCuéntame y te recomiendo el combo perfecto â¨', active: false, mediaType: null, mediaUrl: '' },
  { id: 'kw4', name: 'ð Confirmar / Datos pedido', condition: 'keyword', keyword: 'si quiero, sí quiero, lo quiero, lo compro, confirmar, confirmo, mis datos, datos, dirección, pedir, pedido', delay: 0, unit: 'min', producto: 'Pedidos',   message: '¡Excelente elección! ðâ¨\n\nPara confirmar tu pedido envíame:\n1ï¸â£ Nombre y Apellido\nð± Teléfono de contacto\nð Ciudad y Departamento\nð  Dirección exacta\nð¦ Barrio\n\nQuedo atenta para procesarlo de inmediato ð', active: true,  mediaType: null, mediaUrl: '' },
]

const DEFAULT_PLANTILLAS = [
  { id: 'tpl_bienvenida',  nombre: 'Bienvenida',            categoria: 'Inicio',       mensaje: 'Hola {nombre} ðð ¡Bienvenido! Qué bueno tenerte por aquí ð\n\n¿Quieres saber cómo se usa, los combos disponibles y el obsequio activo ð?\nResponde Sí o No â¨' },
  { id: 'tpl_info_ofertas', nombre: 'Info + Combos + Precios', categoria: 'Ventas',    mensaje: 'ð¥ COMBOS MÁS PEDIDOS â PRECIOS BAJOS POR TIEMPO LIMITADO ð¥\n\nð *Combo 1* â Tripack Mixto (3 Jabones: Caléndula+Cúrcuma+Avena) â *$59.000* (antes $105.000)\nð *Combo 3* â 2 Jabones + Sebo de Res 10g â *$63.000* (antes $79.000)\nâ­ *Combo 5* â MÁS VENDIDO: 4 Jabones + Sebo + Exfoliante â *$119.000* (antes $159.000)\n\nð Envío GRATIS a toda Colombia ð³ Pagas al recibir â sin riesgo\nâ° Se están agotando rápido... ¿Te reservo el más vendido? ð' },
  { id: 'tpl_confirmacion', nombre: 'Confirmación de pedido',  categoria: 'Pedidos',   mensaje: 'Tu pedido ha sido confirmado exitosamente y eres muy importante para nosotros ð\n\nð¦ Por favor, estate pendiente del envío y del repartidor de Inter Rapidísimo ð\nNormalmente la entrega se realiza en 1 a 3 días hábiles, dependiendo de tu ciudad.\n\n¡Gracias por ser parte de la familia Sánate! ð' },
  { id: 'tpl_seguimiento', nombre: 'Seguimiento sin compra',  categoria: 'Seguimiento', mensaje: 'Hola {nombre} ð\n\n¿Pudiste revisar la información que te envié? ð¿\n\nHoy tenemos un descuento especial â los precios y el obsequio son *solo por hoy* â°\n\n¿Te reservo el más vendido antes de que se agote? ð' },
  { id: 'tpl_precio',      nombre: 'Precios y combos (lista)', categoria: 'Ventas',    mensaje: 'ð *Combo 1* â Tripack Mixto (3 Jabones) â *$59.000*\nð *Combo 2* â 3 Jabones a elección â *$59.000*\nð¿ *Combo 3* â 2 Jabones + Sebo 10g â *$63.000*\nâ­ *Combo 5* â MÁS VENDIDO: 4 Jabones + Sebo + Exfoliante â *$119.000*\n\nð Envío GRATIS | ð³ Contra entrega | Nequi *8% OFF*\n\n¿Cuál te llevas hoy? ð' },
  { id: 'tpl_datos',       nombre: 'Solicitud de datos',       categoria: 'Pedidos',   mensaje: '¡Excelente elección! ðâ¨\n\nPara confirmar tu pedido envíame:\n1ï¸â£ Nombre y Apellido\nð± Teléfono de contacto\nð Ciudad y Departamento\nð  Dirección exacta\nð¦ Barrio\n\nQuedo atenta para procesarlo de inmediato ð' },
]

// ââ Mapa de geo por código de país / área Colombia ââââââââââââââ
const GEO_MAP = {
  col: { '1':'Bogotá·CUN','2':'Cali·VAL','4':'Medellín·ANT','5':'Barranquilla·ATL','6':'Manizales·CAL','7':'Bucaramanga·SAN','8':'Cartagena·BOL','9':'Leticia·AMA' },
  cc:  { '1':'USA·US ðºð¸','52':'México·MX ð²ð½','34':'España·ES ðªð¸','54':'Argentina·AR ð¦ð·','55':'Brasil·BR ð§ð·','56':'Chile·CL ð¨ð±','51':'Perú·PE ðµðª','58':'Venezuela·VE ð»ðª','593':'Ecuador·EC ðªð¨','57':'Colombia·CO ð¨ð´' },
}
function phoneToGeo(phone) {
  if (!phone) return null
  const raw = phone.replace(/\D/g, '')
  if (raw.startsWith('57') && raw.length >= 11) {
    const mobile = raw.substring(2, 4)
    if (mobile.startsWith('3')) {
      const area = raw.substring(2, 3)
      const city = GEO_MAP.col[area]
      if (city) { const [c,d] = city.split('·'); return { label: `${c} · ${d}`, flag: 'ð¨ð´' } }
      return { label: 'Colombia · CO', flag: 'ð¨ð´' }
    }
  }
  for (const [cc, label] of Object.entries(GEO_MAP.cc)) {
    if (raw.startsWith(cc)) { const [c,d] = label.split(' ')[0].split('·'); return { label: `${c} · ${d}`, flag: label.split(' ')[1] || '' } }
  }
  return null
}

const TRAINING_TEMPLATE = `ð¢ NOMBRE DEL NEGOCIO: Sanate
ð SITIO WEB: sanate.store
ð± WHATSAPP: +57 XXX XXX XXXX

ââââââââââââââââââââââââââââ
ð¯ PERSONALIDAD DEL ASISTENTE
ââââââââââââââââââââââââââââ
Eres un cerrador de ventas experto, amable, cálido y natural.
Nunca suenas como un robot. Haces pausas, usas emojis estratégicamente,
escuchas al cliente, identificas su necesidad y ofreces la solución perfecta.
Siempre terminas con una pregunta de cierre clara.

ââââââââââââââââââââââââââââ
ðï¸ PRODUCTOS Y PRECIOS
ââââââââââââââââââââââââââââ
[Pega aquí tus productos con precios]
Ejemplo:
- Combo Detox 30 días: $150.000
- Pack Energía Total: $89.000
- Kit Bienestar Premium: $220.000

ââââââââââââââââââââââââââââ
ð¥ COMBOS Y OFERTAS ESPECIALES
ââââââââââââââââââââââââââââ
[Describe tus combos, precios, descuentos, vigencia]

ââââââââââââââââââââââââââââ
ð¬ ESTILO DE CONVERSACIÓN
ââââââââââââââââââââââââââââ
1. Saluda con el nombre del cliente
2. Identifica qué necesita con 1 pregunta
3. Ofrece el producto más adecuado
4. Da 1-2 beneficios clave (no abrumes)
5. Cierre: "¿Te lo reservamos?" / "¿Lo tomamos?"
6. Si dice que va a pensar: envía oferta por tiempo limitado

ââââââââââââââââââââââââââââ
ð« NUNCA HACER
ââââââââââââââââââââââââââââ
- Dar precios sin contexto del producto
- Responder con listas largas
- Olvidar hacer una pregunta de cierre
- Sonar robotico o formal en exceso
`

const COLORS_AV  = ['#d1fae5', '#dbeafe', '#ede9fe', '#fef3c7', '#fee2e2']
const COLORS_TXT = ['#065f46', '#1d4ed8', '#5b21b6', '#92400e', '#b91c1c']

// ââ Resolver URL de media: blob / http completo / ruta relativa â
function resolveMediaUrl(url) {
  if (!url) return ''
  if (url.startsWith('blob:') || url.startsWith('data:')) return url
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  // Ruta relativa â anteponer MEDIA_BASE
  return MEDIA_BASE + (url.startsWith('/') ? url : '/' + url)
}

// ââ Componente: chat de prueba del bot IA ââââââââââââââââââââââ
function BotTestChat({ trainingPrompt, aiPrompt, openaiKey, geminiKey, aiModel, tip, msgMode, useEmojis, useStyles }) {
  const [msgs, setMsgs] = React.useState([{ role: 'assistant', txt: '¡Hola! Soy tu bot de prueba. ¿En qué te puedo ayudar? ð' }])
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
        ? `â¢ FORMATO WhatsApp: *negrita* (un asterisco cada lado), _cursiva_, ~tachado~ â úsalos en precios, nombres de combos y beneficios clave\nâ¢ NUNCA uses **doble asterisco** â solo *uno a cada lado*`
        : `â¢ Texto plano ÚNICAMENTE â sin asteriscos ni formato. PROHIBIDO *negritas*, _cursiva_ o ~tachado~`
      const tc_emojisBlock = (useEmojis !== false)
        ? `â¢ Emojis: máx 2 por mensaje, úsalos estratégicamente como viñetas o énfasis`
        : `â¢ PROHIBIDO usar emojis â solo texto plano`
      const tc_multiMsgBlock = (msgMode !== 'completo')
        ? `ENVÍO POR PARTES:\nDivide en 2 a 5 mensajes separados por el separador EXACTO: ||||\nâ¢ Parte 1 â gancho o contexto â no lo reveles todo\nâ¢ Partes intermedias â desarrolla con intriga o mini-pregunta\nâ¢ Última parte â pregunta de cierre de venta\nEjemplo:\nTenemos varias opciones${(useEmojis !== false) ? ' ð¿' : ''}\n||||\n${(useStyles !== false) ? '*Combo A*' : 'Combo A'} â beneficio â ${(useStyles !== false) ? '*$66.000*' : '$66.000'}\n||||\n¿Cuál prefieres${(useEmojis !== false) ? ' ð' : '?'}`
        : `ENVÍO COMPLETO:\nResponde en UN solo mensaje bien organizado (máx 6 líneas). NO uses |||| separador.`

      // Embudo de ventas para el Test Chat
      const tc_salesFunnel = `EMBUDO DE VENTAS PROBADO â SIGUE ESTE ORDEN:
PASO 2 â DIAGNÓSTICO (antes de precios): "¿Lo buscas para acné, manchas, piel seca o zonas íntimas?"
PASO 3 â PRESENTACIÓN: Recomienda combo exacto${(useStyles !== false) ? ' con *negrita* en precios y nombres' : ''} + obsequio.
PASO 4 â CIERRE con elección forzada: "¿Cuál te llevas, el${(useStyles !== false) ? ' *Combo 1*' : ' Combo 1'} o el${(useStyles !== false) ? ' *Combo 5*' : ' Combo 5'}? ð"
PASO 5 â DATOS: "¡Excelente elección! ðâ¨ Envíame: Nombre / Teléfono / Ciudad / Dirección / Barrio"

CATÁLOGO SÁNATE:
â¢ ${(useStyles !== false) ? '*Combo 1*' : 'Combo 1'} Tripack Mixto (3 Jabones) â ${(useStyles !== false) ? '*$59.000*' : '$59.000'} (antes $105.000)
â¢ ${(useStyles !== false) ? '*Combo 2*' : 'Combo 2'} 3 Jabones a elección â ${(useStyles !== false) ? '*$59.000*' : '$59.000'} (antes $105.000)
â¢ ${(useStyles !== false) ? '*Combo 3*' : 'Combo 3'} 2 Jabones + Sebo 10g â ${(useStyles !== false) ? '*$63.000*' : '$63.000'} (antes $79.000)
â¢ ${(useStyles !== false) ? '*Combo 5*' : 'Combo 5'} MÁS VENDIDO: 4 Jabones + Sebo + Exfoliante â ${(useStyles !== false) ? '*$119.000*' : '$119.000'} (antes $159.000)
â¢ Jabón individual: ${(useStyles !== false) ? '*$22.000*' : '$22.000'}
Nequi/transferencia: ${(useStyles !== false) ? '*8% OFF*' : '8% OFF'} | Envío GRATIS a toda Colombia | Contra entrega disponible

FRASES DE CIERRE (úsalas): "¡Excelente elección! ðâ¨" / "Los precios son de hoy solamente" / "Se agotan rápido"
REGLAS: â Nunca precio sin diagnóstico | â Nunca pregunta abierta al cierre | â Siempre celebra la elección`

      const enhancedSys = baseCtx
        ? `${baseCtx}\n\n---\nINSTRUCCIONES CRÍTICAS WHATSAPP:\nâ¢ Mensajes cortos: máx 3-4 líneas POR MENSAJE\n${tc_stylesBlock}\n${tc_emojisBlock}\nâ¢ VARÍA tus respuestas â nunca repitas el mismo saludo\nâ¢ Adapta el tono al cliente\nâ¢ Eres una persona real, NUNCA te presentes como IA o bot\n\n${tc_multiMsgBlock}\n\n${tc_salesFunnel}\n\nPROHIBIDO:\nâ Frases genéricas | â Decir que eres IA`
        : `Eres una asesora de ventas de Sánate Colombia â jabones artesanales naturales. Eres una persona real. NUNCA te presentes como IA.\n${tc_stylesBlock}\n${tc_emojisBlock}\nMensajes cortos (máx 3-4 líneas). Varía tus respuestas.\n\n${tc_multiMsgBlock}\n\n${tc_salesFunnel}`

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
        setMsgs(p => [...p, { role: 'assistant', txt: reply || 'â ï¸ Sin respuesta de la IA' }])
      }
    } catch (e) {
      const errTxt = e?.message === 'no_key'
        ? 'â ï¸ Configura tu API Key de OpenAI o Gemini en Ajustes â API & Tokens'
        : `â ï¸ Error IA: ${e?.message || 'Verifica tu API Key'}`
      setMsgs(p => [...p, { role: 'assistant', txt: errTxt }])
    }
    setBusy(false)
  }
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ background: '#075e54', padding: '.55rem 1rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#25d366', boxShadow: '0 0 0 3px rgba(37,211,102,.3)' }} />
        <span style={{ color: '#fff', fontSize: '.78rem', fontWeight: 700 }}>ð¤ Bot IA â Modo prueba</span>
        <button style={{ marginLeft: 'auto', background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: 6, padding: '.2rem .6rem', fontSize: '.68rem', cursor: 'pointer' }} onClick={() => setMsgs([{ role: 'assistant', txt: '¡Hola! Soy tu bot de prueba. ¿En qué te puedo ayudar? ð' }])}>ð Reiniciar</button>
      </div>
      <div style={{ background: '#e5ddd5', padding: '.75rem', minHeight: 200, maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ maxWidth: '78%', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', background: m.role === 'user' ? '#dcf8c6' : '#fff', borderRadius: 10, padding: '.45rem .75rem', fontSize: '.77rem', lineHeight: 1.5, boxShadow: '0 1px 2px rgba(0,0,0,.1)' }}>
            {m.role === 'assistant' && <div style={{ fontSize: '.58rem', color: '#7c3aed', fontWeight: 700, marginBottom: '.1rem' }}>ð¤ IA</div>}
            {m.txt}
          </div>
        ))}
        {busy && <div style={{ alignSelf: 'flex-start', background: '#fff', borderRadius: 10, padding: '.45rem .75rem', fontSize: '.75rem', color: '#9ca3af' }}>â³ Pensando...</div>}
      </div>
      <div style={{ background: '#f0f0f0', padding: '.5rem .75rem', display: 'flex', gap: '.5rem' }}>
        <input style={{ flex: 1, border: 'none', borderRadius: 24, padding: '.42rem 1rem', fontSize: '.76rem', outline: 'none', background: '#fff', fontFamily: 'inherit' }}
          value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder="Escribe un mensaje de prueba..." disabled={busy} />
        <button style={{ width: 36, height: 36, background: '#075e54', color: '#fff', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: '.9rem' }} onClick={send} disabled={busy}>{busy ? 'â³' : 'â¤'}</button>
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
  { id: 'tg6', name: 'Preparar',        color: '#2563eb' }, // azul â auto cuando detecta pedido
  { id: 'tg7', name: 'Facturado',       color: '#16a34a' }, // verde â cambio manual
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
    await fet