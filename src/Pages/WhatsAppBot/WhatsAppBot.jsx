import React, { useState, useEffect, useRef } from 'react'
import EmojiPicker from 'emoji-picker-react'
import './WhatsAppBot.css'
import Header from '../Header/Header'

const DEFAULT_BU     = 'https://sanate.store/api/whatsapp'
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

// ââ limpiar JID de Baileys â nÃºmero legible âââââââââââââââââââ
function cleanPhone(phone, id) {
  if (phone && phone.startsWith('+')) return phone
  if (phone && /^\d{7,}$/.test(phone)) return '+' + phone
  const raw = String(id || '').replace(/@s\.whatsapp\.net|@g\.us|@c\.us/g, '')
  if (/^\d{7,}$/.test(raw)) return '+' + raw
  return phone || id || ''
}

// ââ campo: normalizar chats del backend ââââââââââââââââââââââââ
function normChat(c) {
  const ts = c.lastMessageAt || c.updatedAt || ''
  const hhmm = ts ? (() => { try { return new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) } catch { return '' } })() : ''
  const chatId = c.chatId || c.id || ''
  const phone  = cleanPhone(c.phone, chatId)
  const isGroup = chatId.includes('@g.us')
  // Limpia nombres que son JIDs (ej: "1234567890@s.whatsapp.net" â usa el telÃ©fono)
  const rawName = String(c.pushName || c.notify || c.name || '').trim()
  const name = (rawName && !rawName.includes('@')) ? rawName : (isGroup ? 'Grupo' : phone)
  return {
    id:       chatId,
    name,
    phone,
    isGroup,
    photoUrl: c.photoUrl || c.avatar || '',
    preview:  c.lastMessagePreview || c.preview || '',
    time:     hhmm,
    _ts:      ts ? new Date(ts).getTime() : 0,  // timestamp numÃ©rico para sort
    unread:   c.unreadCount ?? c.unread ?? 0,
  }
}

const FLOW_NODES = {
  bienvenida: [
    { id: 'n1', x: 200, y: 50,  type: 'trigger',   icon: 'ð©', color: 'b', title: 'Mensaje recibido',    desc: 'Primer mensaje del usuario' },
    { id: 'n2', x: 200, y: 155, type: 'condition',  icon: 'ð', color: 'a', title: 'Â¿Es nuevo contacto?', desc: 'Verifica si es primera vez' },
    { id: 'n3', x: 70,  y: 265, type: 'message',    icon: 'ð', color: 'g', title: 'Bienvenida',          desc: 'Â¡Hola {nombre}! Bienvenido ð' },
    { id: 'n4', x: 330, y: 265, type: 'message',    icon: 'ð', color: 'g', title: 'Retorno',             desc: 'Â¡QuÃ© bueno verte de nuevo!' },
    { id: 'n5', x: 200, y: 372, type: 'menu',       icon: 'ð', color: 'b', title: 'MenÃº principal',     desc: 'ðï¸ Productos | ð¦ Pedidos | ð Soporte' },
    { id: 'n6', x: 70,  y: 468, type: 'action',     icon: 'ð', color: 'p', title: 'â Guardar',           desc: 'Guardar contacto en CRM' },
    { id: 'n7', x: 330, y: 468, type: 'end',        icon: 'ð', color: 'r', title: 'Fin',                 desc: 'ConversaciÃ³n finalizada' },
  ],
  carrito: [
    { id: 'n1', x: 200, y: 45,  type: 'trigger',   icon: 'ð', color: 'b', title: 'Carrito abandonado', desc: '>24h sin comprar' },
    { id: 'n2', x: 200, y: 150, type: 'message',   icon: 'ð', color: 'g', title: 'Recordatorio',       desc: 'Oye! Dejaste algo en tu carrito ð' },
    { id: 'n3', x: 200, y: 250, type: 'condition', icon: 'ð', color: 'a', title: 'Â¿RespondiÃ³?',        desc: 'Verificar interacciÃ³n' },
    { id: 'n4', x: 60,  y: 355, type: 'action',    icon: 'ð³', color: 'g', title: 'â Compra',           desc: 'sanate.store/checkout' },
    { id: 'n5', x: 340, y: 355, type: 'message',   icon: 'â°', color: 'b', title: 'Follow-up 48h',      desc: 'Ãltimo recordatorio' },
    { id: 'n6', x: 200, y: 455, type: 'end',       icon: 'â', color: 'g', title: 'Fin',                desc: 'Archivar' },
  ],
  soporte: [
    { id: 'n1', x: 200, y: 50,  type: 'trigger',   icon: 'ð', color: 'b', title: 'Soporte',         desc: 'Keyword: soporte/ayuda' },
    { id: 'n2', x: 200, y: 150, type: 'message',   icon: 'ð¤', color: 'g', title: 'Bot responde',    desc: 'Describe tu problema' },
    { id: 'n3', x: 200, y: 250, type: 'condition', icon: 'ð', color: 'a', title: 'Â¿Resuelto?',      desc: 'Bot | Humano' },
    { id: 'n4', x: 70,  y: 355, type: 'action',    icon: 'ð', color: 'a', title: 'â Agente',        desc: 'Desactivar bot' },
    { id: 'n5', x: 330, y: 355, type: 'message',   icon: 'â', color: 'g', title: 'ConfirmaciÃ³n',    desc: 'Â¿Algo mÃ¡s?' },
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
const TAG_NAMES = { message: 'MSG', menu: 'MENÃ', condition: 'COND', action: 'ACTION', trigger: 'TRIG', end: 'FIN', delay: 'WAIT', gpt: 'GPT' }

const FLOWS_LIST = [
  { key: 'bienvenida', name: 'Flujo de bienvenida',    trigger: 'ð© Primer mensaje', badge: 'badge-blue',  runs: 123, ctr: '58%', date: '20/02/2026' },
  { key: 'carrito',    name: 'Flujo carrito',           trigger: 'ð Carrito',        badge: 'badge-amber', runs: 230, ctr: '63%', date: '20/02/2026' },
  { key: 'soporte',    name: 'Flujo soporte',           trigger: 'ð Keyword',        badge: 'badge-green', runs: 84,  ctr: '47%', date: '20/02/2026' },
]

const DEFAULT_TRIGGERS = [
  { id: 'tr1', name: 'Sin respuesta 1h',      condition: 'no_reply',    delay: 60,   unit: 'min', producto: 'General', message: 'Â¡Hola {nombre}! ð Vi que revisaste nuestra info.\nÂ¿Te puedo ayudar a resolver alguna duda?\nTenemos combos especiales solo por hoy ð', active: false, mediaType: null, mediaUrl: '' },
  { id: 'tr2', name: 'Visto sin responder 3h', condition: 'seen',       delay: 180,  unit: 'min', producto: 'General', message: 'Hola {nombre} ð QuerÃ­a enviarte nuestra mejor oferta de hoy.\nÂ¿CuÃ¡l es tu producto favorito? ð¿\nTe armo un combo personalizado ð', active: false, mediaType: null, mediaUrl: '' },
  { id: 'tr3', name: 'Cierre 24h',             condition: 'no_purchase', delay: 1440, unit: 'min', producto: 'General', message: 'ð¥ Â¡Ãltimo aviso, {nombre}!\nTu combo favorito tiene 15% OFF solo hoy.\nÂ¿Lo reservamos? Responde SÃ y te lo aparto ahora mismo ðª', active: false, mediaType: null, mediaUrl: '' },
]

const DEFAULT_KW_TRIGGERS = [
  { id: 'kw1', name: 'ð Precio / CuÃ¡nto vale',    condition: 'keyword', keyword: 'precio, precios, cuanto vale, cuÃ¡nto vale, cuanto cuesta, cuÃ¡nto cuesta, valor, costo', delay: 0, unit: 'min', producto: 'Ventas',    message: 'ð *Combo 1* â Tripack Mixto (3 Jabones) â *$59.000*\nð *Combo 2* â 3 Jabones a elecciÃ³n â *$59.000*\nð¿ *Combo 3* â 2 Jabones + Sebo 10g â *$63.000*\nâ­ *Combo 5* â MÃS VENDIDO: 4 Jabones + Sebo + Exfoliante â *$119.000*\n\nð EnvÃ­o GRATIS | ð³ Contra entrega | Nequi *8% OFF*\n\nÂ¿CuÃ¡l te llevas hoy? ð', active: true,  mediaType: null, mediaUrl: '' },
  { id: 'kw2', name: 'ð Combos / Productos',       condition: 'keyword', keyword: 'combo, combos, productos, catalogo, catÃ¡logo, que tienes, quÃ© tienes, que vendes, quÃ© vendes, info, informaciÃ³n, informacion', delay: 0, unit: 'min', producto: 'Ventas',    message: 'ð¥ COMBOS MÃS PEDIDOS â PRECIOS BAJOS POR TIEMPO LIMITADO ð¥\n\nð *Combo 1* â Tripack Mixto (3 Jabones: CalÃ©ndula+CÃºrcuma+Avena) â *$59.000* (antes $105.000)\nð *Combo 3* â 2 Jabones + Sebo de Res 10g â *$63.000* (antes $79.000)\nâ­ *Combo 5* â MÃS VENDIDO: 4 Jabones + Sebo + Exfoliante â *$119.000* (antes $159.000)\n\nð EnvÃ­o GRATIS a toda Colombia ð³ Pagas al recibir â sin riesgo\nâ° Â¿Te reservo el mÃ¡s vendido? ð', active: true,  mediaType: null, mediaUrl: '' },
  { id: 'kw3', name: 'ð Hola / Bienvenida',        condition: 'keyword', keyword: 'hola, buenas, buenos dias, buenos dÃ­as, buenas tardes, buenas noches, hi, hello, saludos', delay: 0, unit: 'min', producto: 'Inicio',    message: 'Hola {nombre} ðð Â¡Bienvenido a SÃ¡nate! QuÃ© bueno tenerte por aquÃ­ ð\n\nÂ¿Buscas algo para *acnÃ©*, *manchas*, *piel seca* o *zonas Ã­ntimas*?\nCuÃ©ntame y te recomiendo el combo perfecto â¨', active: false, mediaType: null, mediaUrl: '' },
  { id: 'kw4', name: 'ð Confirmar / Datos pedido', condition: 'keyword', keyword: 'si quiero, sÃ­ quiero, lo quiero, lo compro, confirmar, confirmo, mis datos, datos, direcciÃ³n, pedir, pedido', delay: 0, unit: 'min', producto: 'Pedidos',   message: 'Â¡Excelente elecciÃ³n! ðâ¨\n\nPara confirmar tu pedido envÃ­ame:\n1ï¸â£ Nombre y Apellido\nð± TelÃ©fono de contacto\nð Ciudad y Departamento\nð  DirecciÃ³n exacta\nð¦ Barrio\n\nQuedo atenta para procesarlo de inmediato ð', active: true,  mediaType: null, mediaUrl: '' },
]

const DEFAULT_PLANTILLAS = [
  { id: 'tpl_bienvenida',  nombre: 'Bienvenida',            categoria: 'Inicio',       mensaje: 'Hola {nombre} ðð Â¡Bienvenido! QuÃ© bueno tenerte por aquÃ­ ð\n\nÂ¿Quieres saber cÃ³mo se usa, los combos disponibles y el obsequio activo ð?\nResponde SÃ­ o No â¨' },
  { id: 'tpl_info_ofertas', nombre: 'Info + Combos + Precios', categoria: 'Ventas',    mensaje: 'ð¥ COMBOS MÃS PEDIDOS â PRECIOS BAJOS POR TIEMPO LIMITADO ð¥\n\nð *Combo 1* â Tripack Mixto (3 Jabones: CalÃ©ndula+CÃºrcuma+Avena) â *$59.000* (antes $105.000)\nð *Combo 3* â 2 Jabones + Sebo de Res 10g â *$63.000* (antes $79.000)\nâ­ *Combo 5* â MÃS VENDIDO: 4 Jabones + Sebo + Exfoliante â *$119.000* (antes $159.000)\n\nð EnvÃ­o GRATIS a toda Colombia ð³ Pagas al recibir â sin riesgo\nâ° Se estÃ¡n agotando rÃ¡pido... Â¿Te reservo el mÃ¡s vendido? ð' },
  { id: 'tpl_confirmacion', nombre: 'ConfirmaciÃ³n de pedido',  categoria: 'Pedidos',   mensaje: 'Tu pedido ha sido confirmado exitosamente y eres muy importante para nosotros ð\n\nð¦ Por favor, estate pendiente del envÃ­o y del repartidor de Inter RapidÃ­simo ð\nNormalmente la entrega se realiza en 1 a 3 dÃ­as hÃ¡biles, dependiendo de tu ciudad.\n\nÂ¡Gracias por ser parte de la familia SÃ¡nate! ð' },
  { id: 'tpl_seguimiento', nombre: 'Seguimiento sin compra',  categoria: 'Seguimiento', mensaje: 'Hola {nombre} ð\n\nÂ¿Pudiste revisar la informaciÃ³n que te enviÃ©? ð¿\n\nHoy tenemos un descuento especial â los precios y el obsequio son *solo por hoy* â°\n\nÂ¿Te reservo el mÃ¡s vendido antes de que se agote? ð' },
  { id: 'tpl_precio',      nombre: 'Precios y combos (lista)', categoria: 'Ventas',    mensaje: 'ð *Combo 1* â Tripack Mixto (3 Jabones) â *$59.000*\nð *Combo 2* â 3 Jabones a elecciÃ³n â *$59.000*\nð¿ *Combo 3* â 2 Jabones + Sebo 10g â *$63.000*\nâ­ *Combo 5* â MÃS VENDIDO: 4 Jabones + Sebo + Exfoliante â *$119.000*\n\nð EnvÃ­o GRATIS | ð³ Contra entrega | Nequi *8% OFF*\n\nÂ¿CuÃ¡l te llevas hoy? ð' },
  { id: 'tpl_datos',       nombre: 'Solicitud de datos',       categoria: 'Pedidos',   mensaje: 'Â¡Excelente elecciÃ³n! ðâ¨\n\nPara confirmar tu pedido envÃ­ame:\n1ï¸â£ Nombre y Apellido\nð± TelÃ©fono de contacto\nð Ciudad y Departamento\nð  DirecciÃ³n exacta\nð¦ Barrio\n\nQuedo atenta para procesarlo de inmediato ð' },
]

// ââ Mapa de geo por cÃ³digo de paÃ­s / Ã¡rea Colombia ââââââââââââââ
const GEO_MAP = {
  col: { '1':'BogotÃ¡Â·CUN','2':'CaliÂ·VAL','4':'MedellÃ­nÂ·ANT','5':'BarranquillaÂ·ATL','6':'ManizalesÂ·CAL','7':'BucaramangaÂ·SAN','8':'CartagenaÂ·BOL','9':'LeticiaÂ·AMA' },
  cc:  { '1':'USAÂ·US ðºð¸','52':'MÃ©xicoÂ·MX ð²ð½','34':'EspaÃ±aÂ·ES ðªð¸','54':'ArgentinaÂ·AR ð¦ð·','55':'BrasilÂ·BR ð§ð·','56':'ChileÂ·CL ð¨ð±','51':'PerÃºÂ·PE ðµðª','58':'VenezuelaÂ·VE ð»ðª','593':'EcuadorÂ·EC ðªð¨','57':'ColombiaÂ·CO ð¨ð´' },
}
function phoneToGeo(phone) {
  if (!phone) return null
  const raw = phone.replace(/\D/g, '')
  if (raw.startsWith('57') && raw.length >= 11) {
    const mobile = raw.substring(2, 4)
    if (mobile.startsWith('3')) {
      const area = raw.substring(2, 3)
      const city = GEO_MAP.col[area]
      if (city) { const [c,d] = city.split('Â·'); return { label: `${c} Â· ${d}`, flag: 'ð¨ð´' } }
      return { label: 'Colombia Â· CO', flag: 'ð¨ð´' }
    }
  }
  for (const [cc, label] of Object.entries(GEO_MAP.cc)) {
    if (raw.startsWith(cc)) { const [c,d] = label.split(' ')[0].split('Â·'); return { label: `${c} Â· ${d}`, flag: label.split(' ')[1] || '' } }
  }
  return null
}

const TRAINING_TEMPLATE = `ð¢ NOMBRE DEL NEGOCIO: Sanate
ð SITIO WEB: sanate.store
ð± WHATSAPP: +57 XXX XXX XXXX

ââââââââââââââââââââââââââââ
ð¯ PERSONALIDAD DEL ASISTENTE
ââââââââââââââââââââââââââââ
Eres un cerrador de ventas experto, amable, cÃ¡lido y natural.
Nunca suenas como un robot. Haces pausas, usas emojis estratÃ©gicamente,
escuchas al cliente, identificas su necesidad y ofreces la soluciÃ³n perfecta.
Siempre terminas con una pregunta de cierre clara.

ââââââââââââââââââââââââââââ
ðï¸ PRODUCTOS Y PRECIOS
ââââââââââââââââââââââââââââ
[Pega aquÃ­ tus productos con precios]
Ejemplo:
- Combo Detox 30 dÃ­as: $150.000
- Pack EnergÃ­a Total: $89.000
- Kit Bienestar Premium: $220.000

ââââââââââââââââââââââââââââ
ð¥ COMBOS Y OFERTAS ESPECIALES
ââââââââââââââââââââââââââââ
[Describe tus combos, precios, descuentos, vigencia]

ââââââââââââââââââââââââââââ
ð¬ ESTILO DE CONVERSACIÃN
ââââââââââââââââââââââââââââ
1. Saluda con el nombre del cliente
2. Identifica quÃ© necesita con 1 pregunta
3. Ofrece el producto mÃ¡s adecuado
4. Da 1-2 beneficios clave (no abrumes)
5. Cierre: "Â¿Te lo reservamos?" / "Â¿Lo tomamos?"
6. Si dice que va a pensar: envÃ­a oferta por tiempo limitado

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
  const [msgs, setMsgs] = React.useState([{ role: 'assistant', txt: 'Â¡Hola! Soy tu bot de prueba. Â¿En quÃ© te puedo ayudar? ð' }])
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

      // Bloques condicionales segÃºn configuraciÃ³n de estilo
      const tc_stylesBlock = (useStyles !== false)
        ? `â¢ FORMATO WhatsApp: *negrita* (un asterisco cada lado), _cursiva_, ~tachado~ â Ãºsalos en precios, nombres de combos y beneficios clave\nâ¢ NUNCA uses **doble asterisco** â solo *uno a cada lado*`
        : `â¢ Texto plano ÃNICAMENTE â sin asteriscos ni formato. PROHIBIDO *negritas*, _cursiva_ o ~tachado~`
      const tc_emojisBlock = (useEmojis !== false)
        ? `â¢ Emojis: mÃ¡x 2 por mensaje, Ãºsalos estratÃ©gicamente como viÃ±etas o Ã©nfasis`
        : `â¢ PROHIBIDO usar emojis â solo texto plano`
      const tc_multiMsgBlock = (msgMode !== 'completo')
        ? `ENVÃO POR PARTES:\nDivide en 2 a 5 mensajes separados por el separador EXACTO: ||||\nâ¢ Parte 1 â gancho o contexto â no lo reveles todo\nâ¢ Partes intermedias â desarrolla con intriga o mini-pregunta\nâ¢ Ãltima parte â pregunta de cierre de venta\nEjemplo:\nTenemos varias opciones${(useEmojis !== false) ? ' ð¿' : ''}\n||||\n${(useStyles !== false) ? '*Combo A*' : 'Combo A'} â beneficio â ${(useStyles !== false) ? '*$66.000*' : '$66.000'}\n||||\nÂ¿CuÃ¡l prefieres${(useEmojis !== false) ? ' ð' : '?'}`
        : `ENVÃO COMPLETO:\nResponde en UN solo mensaje bien organizado (mÃ¡x 6 lÃ­neas). NO uses |||| separador.`

      // Embudo de ventas para el Test Chat
      const tc_salesFunnel = `EMBUDO DE VENTAS PROBADO â SIGUE ESTE ORDEN:
PASO 2 â DIAGNÃSTICO (antes de precios): "Â¿Lo buscas para acnÃ©, manchas, piel seca o zonas Ã­ntimas?"
PASO 3 â PRESENTACIÃN: Recomienda combo exacto${(useStyles !== false) ? ' con *negrita* en precios y nombres' : ''} + obsequio.
PASO 4 â CIERRE con elecciÃ³n forzada: "Â¿CuÃ¡l te llevas, el${(useStyles !== false) ? ' *Combo 1*' : ' Combo 1'} o el${(useStyles !== false) ? ' *Combo 5*' : ' Combo 5'}? ð"
PASO 5 â DATOS: "Â¡Excelente elecciÃ³n! ðâ¨ EnvÃ­ame: Nombre / TelÃ©fono / Ciudad / DirecciÃ³n / Barrio"

CATÃLOGO SÃNATE:
â¢ ${(useStyles !== false) ? '*Combo 1*' : 'Combo 1'} Tripack Mixto (3 Jabones) â ${(useStyles !== false) ? '*$59.000*' : '$59.000'} (antes $105.000)
â¢ ${(useStyles !== false) ? '*Combo 2*' : 'Combo 2'} 3 Jabones a elecciÃ³n â ${(useStyles !== false) ? '*$59.000*' : '$59.000'} (antes $105.000)
â¢ ${(useStyles !== false) ? '*Combo 3*' : 'Combo 3'} 2 Jabones + Sebo 10g â ${(useStyles !== false) ? '*$63.000*' : '$63.000'} (antes $79.000)
â¢ ${(useStyles !== false) ? '*Combo 5*' : 'Combo 5'} MÃS VENDIDO: 4 Jabones + Sebo + Exfoliante â ${(useStyles !== false) ? '*$119.000*' : '$119.000'} (antes $159.000)
â¢ JabÃ³n individual: ${(useStyles !== false) ? '*$22.000*' : '$22.000'}
Nequi/transferencia: ${(useStyles !== false) ? '*8% OFF*' : '8% OFF'} | EnvÃ­o GRATIS a toda Colombia | Contra entrega disponible

FRASES DE CIERRE (Ãºsalas): "Â¡Excelente elecciÃ³n! ðâ¨" / "Los precios son de hoy solamente" / "Se agotan rÃ¡pido"
REGLAS: â Nunca precio sin diagnÃ³stico | â Nunca pregunta abierta al cierre | â Siempre celebra la elecciÃ³n`

      const enhancedSys = baseCtx
        ? `${baseCtx}\n\n---\nINSTRUCCIONES CRÃTICAS WHATSAPP:\nâ¢ Mensajes cortos: mÃ¡x 3-4 lÃ­neas POR MENSAJE\n${tc_stylesBlock}\n${tc_emojisBlock}\nâ¢ VARÃA tus respuestas â nunca repitas el mismo saludo\nâ¢ Adapta el tono al cliente\nâ¢ Eres una persona real, NUNCA te presentes como IA o bot\n\n${tc_multiMsgBlock}\n\n${tc_salesFunnel}\n\nPROHIBIDO:\nâ Frases genÃ©ricas | â Decir que eres IA`
        : `Eres una asesora de ventas de SÃ¡nate Colombia â jabones artesanales naturales. Eres una persona real. NUNCA te presentes como IA.\n${tc_stylesBlock}\n${tc_emojisBlock}\nMensajes cortos (mÃ¡x 3-4 lÃ­neas). VarÃ­a tus respuestas.\n\n${tc_multiMsgBlock}\n\n${tc_salesFunnel}`

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
        <button style={{ marginLeft: 'auto', background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: 6, padding: '.2rem .6rem', fontSize: '.68rem', cursor: 'pointer' }} onClick={() => setMsgs([{ role: 'assistant', txt: 'Â¡Hola! Soy tu bot de prueba. Â¿En quÃ© te puedo ayudar? ð' }])}>ð Reiniciar</button>
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

// Keywords que indican intenciÃ³n de pedido
const ORDER_KEYWORDS = ['quiero', 'pedido', 'pedir', 'comprar', 'me lo llevan', 'llevar', 'cuÃ¡nto cuesta', 'cuanto cuesta', 'cuÃ¡nto vale', 'cuanto vale', 'precio', 'pago', 'transferencia', 'domicilio', 'envÃ­o', 'envio', 'me interesa', 'lo quiero', 'cÃ³mo pago', 'como pago', 'cÃ³mo compro', 'como compro', 'quiero uno', 'quiero comprar', 'cuantos', 'disponible', 'tienes', 'hay']


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
    if (!window.confirm('Â¿Eliminar difusiÃ³n?')) return;
    await fetch(BU+'/broadcast/'+id,{method:'DELETE',headers:{'x-secret':sec}}).catch(()=>{});
    load();
  };
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:'#111'}}>
      <div style={{display:'flex',gap:'8px',padding:'12px 16px',borderBottom:'1px solid #2a2a2a',background:'#0d0d0d'}}>
        <button onClick={()=>setTab('list')} style={{flex:1,padding:'8px',borderRadius:'8px',border:'1px solid #333',background:tab==='list'?'#25d366':'transparent',color:tab==='list'?'#fff':'#aaa',cursor:'pointer',fontWeight:'600',fontSize:'13px'}}>ð Difusiones</button>
        <button onClick={()=>setTab('new')} style={{flex:1,padding:'8px',borderRadius:'8px',border:'1px solid #333',background:tab==='new'?'#25d366':'transparent',color:tab==='new'?'#fff':'#aaa',cursor:'pointer',fontWeight:'600',fontSize:'13px'}}>â Nueva</button>
      </div>
      {tab==='list' && (
        <div style={{flex:1,overflowY:'auto',padding:'12px',display:'flex',flexDirection:'column',gap:'10px'}}>
          {jobs.length===0 && <div style={{textAlign:'center',color:'#666',marginTop:'40px',fontSize:'14px'}}>Sin difusiones activas</div>}
          {jobs.map(j=>(
            <div key={j.id} style={{background:'#1a1a1a',borderRadius:'10px',padding:'12px',border:'1px solid #2a2a2a'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                <span style={{fontWeight:'600',color:'#eee',fontSize:'13px'}}>{j.name||j.id}</span>
                <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'12px',background:j.status==='running'?'#22c55e22':'#f59e0b22',color:j.status==='running'?'#22c55e':'#f59e0b'}}>{j.status==='running'?'â¶ Activo':'â¸ Pausado'}</span>
              </div>
              <div style={{fontSize:'12px',color:'#999',marginBottom:'8px'}}>{j.sentCount||0} enviados Â· {j.totalNumbers||0} total Â· {j.errors||0} errores</div>
              <div style={{height:'4px',background:'#333',borderRadius:'2px',marginBottom:'10px',overflow:'hidden'}}>
                <div style={{height:'100%',background:'#25d366',width:j.totalNumbers?((j.sentCount||0)/j.totalNumbers*100)+'%':'0%',borderRadius:'2px',transition:'width 0.3s'}}></div>
              </div>
              <div style={{display:'flex',gap:'8px'}}>
                <button onClick={()=>toggleJob(j.id,j.status==='running'?'paused':'running')} style={{flex:1,padding:'6px',borderRadius:'6px',border:'1px solid #333',background:'transparent',color:'#25d366',cursor:'pointer',fontSize:'12px'}}>{j.status==='running'?'â¸ Pausar':'â¶ Reanudar'}</button>
                <button onClick={()=>delJob(j.id)} style={{padding:'6px 12px',borderRadius:'6px',border:'1px solid rgba(239,68,68,0.3)',background:'transparent',color:'#ef4444',cursor:'pointer',fontSize:'12px'}}>ð</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {tab==='new' && (
        <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:'12px'}}>
          <div>
            <label style={{color:'#aaa',fontSize:'12px',marginBottom:'4px',display:'block'}}>Nombre campaÃ±a</label>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Ej: Promo Marzo" style={{width:'100%',padding:'8px 10px',borderRadius:'8px',border:'1px solid #333',background:'#1a1a1a',color:'#fff',fontSize:'13px',boxSizing:'border-box'}} />
          </div>
          <div>
            <label style={{color:'#aaa',fontSize:'12px',marginBottom:'4px',display:'block'}}>NÃºmeros (uno por lÃ­nea o separados por coma)</label>
            <textarea value={form.numbers} onChange={e=>setForm(f=>({...f,numbers:e.target.value}))} rows={5} placeholder="5215512345678" style={{width:'100%',padding:'8px 10px',borderRadius:'8px',border:'1px solid #333',background:'#1a1a1a',color:'#fff',fontSize:'12px',resize:'vertical',boxSizing:'border-box'}} />
          </div>
          <div>
            <label style={{color:'#aaa',fontSize:'12px',marginBottom:'4px',display:'block'}}>Mensaje</label>
            <textarea value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} rows={4} placeholder="Escribe tu mensaje..." style={{width:'100%',padding:'8px 10px',borderRadius:'8px',border:'1px solid #333',background:'#1a1a1a',color:'#fff',fontSize:'13px',resize:'vertical',boxSizing:'border-box'}} />
          </div>
          <div>
            <label style={{color:'#aaa',fontSize:'12px',marginBottom:'4px',display:'block'}}>URL de imagen/video (opcional)</label>
            <input value={form.mediaUrl} onChange={e=>setForm(f=>({...f,mediaUrl:e.target.value}))} placeholder="https://..." style={{width:'100%',padding:'8px 10px',borderRadius:'8px',border:'1px solid #333',background:'#1a1a1a',color:'#fff',fontSize:'13px',boxSizing:'border-box'}} />
          </div>
          <div style={{display:'flex',gap:'10px'}}>
            <div style={{flex:1}}>
              <label style={{color:'#aaa',fontSize:'12px',marginBottom:'4px',display:'block'}}>Intervalo</label>
              <select value={form.delayType} onChange={e=>setForm(f=>({...f,delayType:e.target.value}))} style={{width:'100%',padding:'8px',borderRadius:'8px',border:'1px solid #333',background:'#1a1a1a',color:'#fff',fontSize:'13px'}}>
                <option value="short">Corto (5-15s)</option>
                <option value="medium">Medio (30-60s)</option>
                <option value="long">Largo (2-5min)</option>
              </select>
            </div>
            <div style={{flex:1}}>
              <label style={{color:'#aaa',fontSize:'12px',marginBottom:'4px',display:'block'}}>Horario inicio</label>
              <input type="time" value={String(form.startHour).padStart(2,'0')+':'+String(form.startMin).padStart(2,'0')} onChange={e=>{const[h,m]=e.target.value.split(':');setForm(f=>({...f,startHour:+h,startMin:+m}));}} style={{width:'100%',padding:'8px',borderRadius:'8px',border:'1px solid #333',background:'#1a1a1a',color:'#fff',fontSize:'13px'}} />
            </div>
            <div style={{flex:1}}>
              <label style={{color:'#aaa',fontSize:'12px',marginBottom:'4px',display:'block'}}>Horario fin</label>
              <input type="time" value={String(form.endHour).padStart(2,'0')+':'+String(form.endMin).padStart(2,'0')} onChange={e=>{const[h,m]=e.target.value.split(':');setForm(f=>({...f,endHour:+h,endMin:+m}));}} style={{width:'100%',padding:'8px',borderRadius:'8px',border:'1px solid #333',background:'#1a1a1a',color:'#fff',fontSize:'13px'}} />
            </div>
          </div>
          <button onClick={create} disabled={sending} style={{padding:'12px',borderRadius:'8px',border:'none',background:sending?'#333':'#25d366',color:'#fff',cursor:sending?'not-allowed':'pointer',fontWeight:'700',fontSize:'14px',marginTop:'4px'}}>
            {sending ? 'â³ Enviando...' : 'ð Iniciar DifusiÃ³n'}
          </button>
        </div>
      )}
{/* Guia Anti-Baneo - basada en mejores practicas 2025 */}
      <div style={{marginTop:'24px',padding:'16px',background:'#1a1a1a',borderRadius:'12px',border:'1px solid #2a2a2a'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px'}}>
          <span style={{fontSize:'18px'}}>&#x1F6E1;</span>
          <span style={{color:'#fff',fontSize:'14px',fontWeight:'600'}}>L&#xED;mites Diarios Anti-Baneo</span>
          <span style={{marginLeft:'auto',fontSize:'11px',color:'#888',background:'#222',padding:'2px 8px',borderRadius:'20px'}}>Gu&#xED;a 2025</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'8px',marginBottom:'16px'}}>
          {[
            {label:'Nuevo',days:'D&#xED;a 1-3',max:20,color:'#ff4444',icon:'&#x1F534;'},
            {label:'Calentando',days:'D&#xED;a 4-7',max:50,color:'#ff8c00',icon:'&#x1F7E0;'},
            {label:'Creciendo',days:'D&#xED;a 8-14',max:100,color:'#ffd700',icon:'&#x1F7E1;'},
            {label:'Estable',days:'D&#xED;a 15-30',max:200,color:'#44bb44',icon:'&#x1F7E2;'},
            {label:'Caliente',days:'30+ d&#xED;as',max:500,color:'#00cc88',icon:'&#x2705;'},
          ].map(function(item){return (
            <div key={item.label} style={{background:'#111',borderRadius:'8px',padding:'10px',textAlign:'center',border:'1px solid '+item.color+'55'}}>
              <div style={{fontSize:'18px',marginBottom:'4px'}} dangerouslySetInnerHTML={{__html:item.icon}}/>
              <div style={{color:item.color,fontSize:'11px',fontWeight:'700'}}>{item.label}</div>
              <div style={{color:'#888',fontSize:'10px'}} dangerouslySetInnerHTML={{__html:item.days}}/>
              <div style={{color:'#fff',fontSize:'20px',fontWeight:'800',margin:'4px 0'}}>{item.max}</div>
              <div style={{color:'#666',fontSize:'10px'}}>contactos/dia</div>
            </div>
          );})}
        </div>
        <div style={{borderTop:'1px solid #2a2a2a',paddingTop:'12px'}}>
          <div style={{fontSize:'11px',color:'#f59e0b',fontWeight:'600',marginBottom:'8px'}}>&#x26A0; Reglas Clave Anti-Baneo:</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
            {['Solo enviar a contactos con opt-in confirmado','Personalizar mensajes con nombre del cliente','Variar horarios, contenido y estructura','Evitar palabras: tarjeta, retiro, ultima oportunidad','Numero nuevo = empezar con pocos envios por dia','No reutilizar perfil o mensajes de numero baneado'].map(function(tip,i){return(
              <div key={i} style={{fontSize:'11px',color:'#bbb',padding:'5px 8px',background:'#111',borderRadius:'6px',display:'flex',gap:'6px',alignItems:'flex-start'}}>
                <span style={{color:i<3?'#22c55e':'#f59e0b',flexShrink:0}} dangerouslySetInnerHTML={{__html:i<3?'&#x2705;':'&#x26A0;'}}/>
                <span dangerouslySetInnerHTML={{__html:tip}}/>
              </div>
            );})}
          </div>
        </div>
      </div>
          </div>
  );
}

function DispositivosPage({ BU, sec }) {
  const S = sec || 'sanate_secret_2025';
  const [devices, setDevices] = React.useState([]);
  const [qrs, setQrs] = React.useState({});
  const [newId, setNewId] = React.useState('');
  const load=()=>fetch(BU+'/devices',{headers:{'x-secret':S}}).then(r=>r.json()).then(d=>setDevices(d.devices||[])).catch(()=>{});
  const loadQR=(id)=>fetch(BU+'/qr?deviceId='+id,{headers:{'x-secret':S}}).then(r=>r.json()).then(d=>setQrs(p=>({...p,[id]:d})));
  React.useEffect(()=>{load();const t=setInterval(load,4000);return()=>clearInterval(t);},[]);
  const add=()=>{
    if(!newId.trim())return;
    fetch(BU+'/devices',{method:'POST',headers:{'x-secret':S,'Content-Type':'application/json'},body:JSON.stringify({deviceId:newId.trim()})}).then(()=>{setNewId('');load();});
  };
  const del=(id)=>fetch(BU+'/devices/'+id,{method:'DELETE',headers:{'x-secret':S}}).then(load);
  const SC={connected:'#4caf50',qr:'#ff9800',disconnected:'#555',connecting:'#2196f3'};
  const SL={connected:'â Conectado',qr:'ð± Escanear QR',disconnected:'â­ Desconectado',connecting:'â³ Conectando'};
  return (
    <div style={{padding:24,maxWidth:800,margin:'0 auto'}}>
      <h2 style={{marginTop:0}}>ð± Dispositivos WhatsApp</h2>
      <p style={{color:'#888',marginTop:-8,marginBottom:20,fontSize:14}}>Conecta hasta 10 dispositivos WhatsApp. Cada uno tiene sus chats y puede usarse en difusiones masivas.</p>
      <div style={{display:'flex',gap:10,marginBottom:24}}>
        <input value={newId} onChange={e=>setNewId(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()} placeholder="ID del nuevo dispositivo (ej: telefono2)" style={{flex:1,padding:'10px 14px',background:'#2a2a2a',border:'1px solid #444',borderRadius:8,color:'#fff'}}/>
        <button onClick={add} style={{padding:'10px 20px',background:'#25d366',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontWeight:700}}>+ Agregar</button>
      </div>
      {!devices.length&&<div style={{textAlign:'center',color:'#555',padding:40}}>Cargando dispositivos...</div>}
      {devices.map(d=>(
        <div key={d.id} style={{background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:10,padding:20,marginBottom:14}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontWeight:700,fontSize:15}}>{d.id==='default'?'ð± Dispositivo Principal':'ð± '+d.id}</div>
              <div style={{color:'#777',fontSize:12,marginTop:3}}>{d.chats} chats &nbsp;|&nbsp; {d.contacts} contactos</div>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <span style={{background:SC[d.status]||'#555',color:'#fff',borderRadius:12,padding:'4px 12px',fontSize:12}}>{SL[d.status]||d.status}</span>
              {d.hasQR&&<button onClick={()=>loadQR(d.id)} style={{padding:'5px 12px',background:'#ff9800',color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontSize:12}}>Ver QR</button>}
              {d.id!=='default'&&<button onClick={()=>del(d.id)} style={{padding:'5px 12px',background:'#f44336',color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontSize:12}}>Eliminar</button>}
            </div>
          </div>
          {qrs[d.id]?.qr&&(
            <div style={{marginTop:16,textAlign:'center'}}>
              <img src={qrs[d.id].qr} alt="QR" style={{width:220,height:220,borderRadius:8,border:'3px solid #25d366'}}/>
              <div style={{color:'#888',fontSize:12,marginTop:8}}>Abre WhatsApp â Dispositivos vinculados â Vincular dispositivo</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function BtnMsgEditor({ BU, sec }) {
  const S = sec || 'sanate_secret_2025';
  const [body, setBody] = React.useState('');
  const [buttons, setButtons] = React.useState(['', '', '']);
  const [phone, setPhone] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [open, setOpen] = React.useState(false);
  const [contacts, setContacts] = React.useState([]);
  React.useEffect(() => {
    if (!open) return;
    fetch(BU + '/chats', { headers: { 'x-secret': S } })
      .then(r => r.json())
      .then(d => setContacts((d.chats || d || []).slice(0, 60)))
      .catch(() => {});
  }, [open]);
  const send = async () => {
    const btns = buttons.map(b => b.trim()).filter(Boolean);
    if (!phone.trim() || !body.trim() || !btns.length) { alert('Completa destinatario, mensaje y al menos 1 botÃ³n'); return; }
    setSending(true); setResult(null);
    try {
      const jid = phone.trim().replace(/\D/g, '') + '@s.whatsapp.net';
      const r = await fetch(BU + '/send-buttons', {
        method: 'POST',
        headers: { 'x-secret': S, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: jid, body: body.trim(), buttons: btns.map((b, i) => ({ id: 'b' + i, text: b })) })
      });
      const d = await r.json();
      setResult(d.ok ? 'â Enviado' : 'â ' + (d.error || 'Error'));
      if (d.ok) { setBody(''); setPhone(''); setButtons(['', '', '']); }
    } catch (e) { setResult('â ' + e.message); }
    setSending(false);
  };
  return (
    <div style={{ marginTop: 20, border: '1px solid #1e4d2b', borderRadius: 8, overflow: open ? 'visible' : 'hidden' }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ background: '#0d2b1a', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
        <span style={{ color: '#c8e6c9', fontWeight: 600, fontSize: 14 }}>ð² Mensajes con Botones Interactivos</span>
        <span style={{ color: '#888', fontSize: 12 }}>{open ? 'â² cerrar' : 'â¼ crear nuevo'}</span>
      </div>
      {open && (
        <div style={{ padding: '14px 16px', background: '#0a1f12' }}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Destinatario</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="573001234567"
              style={{ width: '100%', background: '#111', border: '1px solid #1e4d2b', borderRadius: 4, color: '#eee', padding: '6px 8px', fontSize: 13, boxSizing: 'border-box' }} />
            {contacts.length > 0 && (
              <select value={phone} onChange={e => setPhone(e.target.value)}
                style={{ width: '100%', marginTop: 4, background: '#111', border: '1px solid #1e4d2b', borderRadius: 4, color: '#aaa', padding: '5px 8px', fontSize: 12 }}>
                <option value=''>â o seleccionar contacto â</option>
                {contacts.map(c => <option key={c.id} value={(c.id || '').replace('@s.whatsapp.net', '')}>{c.name || c.id}</option>)}
              </select>
            )}
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Mensaje</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} placeholder="Cuerpo del mensaje..."
              style={{ width: '100%', background: '#111', border: '1px solid #1e4d2b', borderRadius: 4, color: '#eee', padding: '6px 8px', fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Botones (mÃ¡x 3)</label>
            {[0, 1, 2].map(i => (
              <input key={i} value={buttons[i]}
                onChange={e => setButtons(bs => { const n = [...bs]; n[i] = e.target.value; return n; })}
                placeholder={i === 0 ? 'BotÃ³n 1 (requerido)' : 'BotÃ³n ' + (i + 1) + ' (opcional)'}
                style={{ width: '100%', background: '#111', border: '1px solid ' + (i === 0 ? '#1e4d2b' : '#162e1c'), borderRadius: 4, color: '#eee', padding: '5px 8px', fontSize: 13, boxSizing: 'border-box', marginBottom: 4 }} />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={send} disabled={sending}
              style={{ background: sending ? '#1a3a2a' : '#25d366', color: '#fff', border: 'none', borderRadius: 5, padding: '7px 18px', fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', fontSize: 14 }}>
              {sending ? 'â³ Enviando...' : 'ð¤ Enviar con Botones'}
            </button>
            {result && <span style={{ fontSize: 13, color: result.startsWith('â') ? '#4caf50' : '#f44336' }}>{result}</span>}
          </div>
        </div>
      )}
    </div>
  );
}


// Social Connector
function SocialConnector({ platform }) {
  var ls = typeof localStorage !== 'undefined' ? localStorage : { getItem: () => null };
  var BASE = (ls.getItem('wa_backend_url') || 'https://sanate-baileys.onrender.com/api/whatsapp').replace('/api/whatsapp', '');
  var SECRET = ls.getItem('wa_secret') || 'sanate_secret_2025';
  var H = { 'x-secret': SECRET };
  var META_APP_ID = '1468787708298775';
  var STORE_ID = 'default';
  var CFGS = {
    instagram: {
      lbl: 'Instagram', icon: '\u{1F4F8}',
      scope: 'instagram_business_basic,instagram_manage_comments,instagram_business_manage_messages',
      color: '#E1306C', grad: 'linear-gradient(135deg,#E1306C,#833AB4)',
      note: 'Requiere Instagram Business vinculado a una P\u00e1gina de Facebook'
    },
    messenger: {
      lbl: 'Messenger', icon: '\u{1F4AC}',
      scope: 'pages_messaging,pages_manage_metadata,pages_show_list',
      color: '#0084FF', grad: 'linear-gradient(135deg,#0084FF,#0052CC)',
      note: 'Requiere una P\u00e1gina de Facebook'
    }
  };
  var cfg = CFGS[platform] || CFGS.instagram;
  var redirectUri = BASE + '/api/social/' + platform + '/callback';
  var [status, setStatus] = useState('idle');
  var [account, setAccount] = useState(null);
  function checkStatus() {
    return fetch(BASE + '/api/social/status?storeId=' + STORE_ID, { headers: H })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(data) {
        if (data && data[platform]) { setStatus('connected'); setAccount(data[platform]); return true; }
        return false;
      }).catch(function() { return false; });
  }
  useEffect(function() { checkStatus(); }, [platform]);
  function handleConnect() {
    var authUrl = 'https://www.facebook.com/dialog/oauth?client_id=' + META_APP_ID
      + '&redirect_uri=' + encodeURIComponent(redirectUri)
      + '&scope=' + encodeURIComponent(cfg.scope)
      + '&response_type=code'
      + '&state=' + platform + '_' + STORE_ID;
    var popup = window.open(authUrl, platform + '_oauth', 'width=640,height=720,scrollbars=yes');
    if (!popup) { alert('Permite ventanas emergentes para sanate.store e intenta de nuevo.'); return; }
    setStatus('connecting');
    function onMsg(e) {
      if (!e.data || !e.data.type) return;
      window.removeEventListener('message', onMsg);
      clearInterval(poll);
      if (e.data.type === 'success' || e.data.type === 'connected') {
        checkStatus().then(function(ok) { if (!ok) setStatus('idle'); });
      } else { setStatus('idle'); if (e.data.message) alert('Error: ' + e.data.message); }
    }
    window.addEventListener('message', onMsg);
    var poll = setInterval(function() {
      if (!popup || popup.closed) {
        clearInterval(poll); window.removeEventListener('message', onMsg);
        checkStatus().then(function(ok) { if (!ok) setStatus('idle'); });
      }
    }, 1000);
  }
  function handleDisconnect() {
    fetch(BASE + '/api/social/disconnect', {
      method: 'POST',
      headers: Object.assign({}, H, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ platform: platform, storeId: STORE_ID })
    }).then(function() { setStatus('idle'); setAccount(null); }).catch(function() {});
  }
  var wrap = { display:'flex', flexDirection:'column', alignItems:'center', gap:'16px', padding:'40px 20px' };
  var btnBase = { border:'none', borderRadius:'12px', padding:'14px 28px', fontSize:'1rem', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:'8px', margin:'0 auto' };
  if (status === 'connected' && account) {
    return React.createElement('div', { style: wrap },
      React.createElement('div', { style: { width:'80px', height:'80px', borderRadius:'50%', background:cfg.grad, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.5rem', color:'#fff' } }, '\u2705'),
      React.createElement('div', { style: { textAlign:'center' } },
        React.createElement('h3', { style: { color:cfg.color, margin:'0 0 4px' } }, cfg.lbl + ' Conectado'),
        React.createElement('p', { style: { color:'#555', margin:0 } }, account.name || account.username || account.page_name || 'Conectado')
      ),
      React.createElement('button', { style: Object.assign({}, btnBase, { background:'#e74c3c', color:'#fff' }), onClick: handleDisconnect }, '\u{1F50C} Desconectar ' + cfg.lbl)
    );
  }
  return React.createElement('div', { style: wrap },
    React.createElement('div', { style: { fontSize:'3rem' } }, cfg.icon),
    React.createElement('h2', { style: { color:cfg.color, margin:'0' } }, cfg.lbl + ' Direct'),
    React.createElement('p', { style: { color:'#666', textAlign:'center', maxWidth:'280px', margin:'0' } }, 'Conecta tu cuenta de ' + cfg.lbl + ' Business para gestionar mensajes directos.'),
    React.createElement('button', {
      style: Object.assign({}, btnBase, { background: status==='connecting'?'#aaa':cfg.grad, color:'#fff', opacity: status==='connecting'?0.7:1, cursor: status==='connecting'?'not-allowed':'pointer' }),
      onClick: status === 'connecting' ? undefined : handleConnect, disabled: status === 'connecting'
    }, status === 'connecting' ? '\u23f3 Conectando...' : ('\u{1F517} Conectar ' + cfg.lbl)),
    React.createElement('p', { style: { color:'#aaa', fontSize:'12px', textAlign:'center', maxWidth:'280px', margin:'0' } }, cfg.note)
  );
}
export default function WhatsAppBot() {
  const [page,        setPage]        = useState(() => { try { return localStorage.getItem('wb_current_page') || 'chat' } catch { return 'chat' } })
  const [lifecycle, setLifecycle] = useState(()=>{try{const s=localStorage.getItem('wa_lifecycle');return s?JSON.parse(s):{}}catch(e){return {}}})
  const [leadFilter, setLeadFilter] = React.useState('all');
  const updateStage = async (jid, stage) => { if(!jid||!stage) return; try { await fetch(BU+'/lifecycle',{method:'POST',headers:HJ,body:JSON.stringify({jid,stage})}); setLifecycle(p=>{ const n={...p,[jid]:{stage,updatedAt:Date.now()}}; try{localStorage.setItem('wa_lifecycle',JSON.stringify(n))}catch(_){} return n }); } catch(e){} }
  const [status,      setStatus]      = useState('disconnected')
  const [phone,       setPhone]       = useState('')
  const [qrDataUrl,   setQrDataUrl]   = useState(null)
  const [chats,       setChats]       = useState(() => chatsMasterGet())
  const [active,      setActive]      = useState(null)
  const [msgs,        setMsgs]        = useState([])
  const [inp,         setInp]         = useState('')
  const [toast,       setToast]       = useState('')
  const [search,      setSearch]      = useState('')
  const [chatFilter,  setChatFilter]  = useState('todos')
  const [showContact, setShowContact] = useState(false)

  // ââ AnÃ¡lisis de cliente âââââââââââââââââââââââââââââââââââââââ
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false)
  const [clientAnalysis,    setClientAnalysis]    = useState(() => { try { return JSON.parse(localStorage.getItem('wa_client_analysis') || '{}') } catch { return {} } })
  const [analysisLoading,   setAnalysisLoading]   = useState(false)

  // ââ Etiquetas persistentes por chat ââââââââââââââââââââââââââ
  const [chatsTags,         setChatsTags]         = useState(() => { try { return JSON.parse(localStorage.getItem('wa_chats_tags') || '{}') } catch { return {} } })
  const [n8nOk,       setN8nOk]       = useState(N8N_WH ? true : null)
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

  // ââ IA / ChatGPT ââââââââââââââââââââââââââââââââââââââââââââââ
  const [serverOnline,       setServerOnline]       = useState(null)
  const [aiEnabled,          setAiEnabled]          = useState(() => { try { return JSON.parse(localStorage.getItem('wa_ai_enabled') || 'false') } catch { return false } })
  const [aiContactMap,       setAiContactMap]       = useState(() => { try { return JSON.parse(localStorage.getItem('wa_ai_contact_map') || '{}') } catch { return {} } })
  // ââ Disparadores por contacto (true = activos, false = pausados para ese chat) ââ
  const [triggerContactMap,  setTriggerContactMap]  = useState(() => { try { return JSON.parse(localStorage.getItem('wa_trigger_contact_map') || '{}') } catch { return {} } })
  const [openaiKey,          setOpenaiKey]          = useState(() => { try { return localStorage.getItem('wa_openai_key') || '' } catch { return '' } })
  const [geminiKey,          setGeminiKey]          = useState(() => { try { return localStorage.getItem('wa_gemini_key') || '' } catch { return '' } })
  const [aiModel,        setAiModel]        = useState('gpt-4o')
  const [aiPrompt,       setAiPrompt]       = useState(() => { try { return localStorage.getItem('wa_ai_prompt') || 'Eres el asistente virtual de Sanate, una tienda de salud natural. Responde de forma amable, breve y clara en espaÃ±ol.' } catch { return 'Eres el asistente virtual de Sanate, una tienda de salud natural. Responde de forma amable, breve y clara en espaÃ±ol.' } })

  // ââ Entrenamiento IA ââââââââââââââââââââââââââââââââââââââââââ
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

  // ââ Clientes ââââââââââââââââââââââââââââââââââââââââââââââââââ
  const [clientes,       setClientes]       = useState(() => { try { return JSON.parse(localStorage.getItem('wa_clientes') || '[]') } catch { return [] } })
  const [clienteSearch,  setClienteSearch]  = useState('')
  const [clienteDetail,  setClienteDetail]  = useState(null)  // cliente seleccionado

  // ââ Disparadores ââââââââââââââââââââââââââââââââââââââââââââââ
  const [triggers,         setTriggers]         = useState(() => { try { return JSON.parse(localStorage.getItem('wa_triggers') || 'null') || DEFAULT_TRIGGERS } catch { return DEFAULT_TRIGGERS } })
  const [editTrigger,      setEditTrigger]      = useState(null)   // trigger en ediciÃ³n (null=cerrado)
  const [generatingTrigger,setGeneratingTrigger]= useState(false)

  // ââ Plantillas ââââââââââââââââââââââââââââââââââââââââââââââââ
  const [plantillas,    setPlantillas]    = useState(() => { try { return JSON.parse(localStorage.getItem('wa_plantillas') || 'null') || DEFAULT_PLANTILLAS } catch { return DEFAULT_PLANTILLAS } })
  const [editPlantilla, setEditPlantilla] = useState(null)  // null=cerrado, obj=editando

  // ââ Geo & Timing ââââââââââââââââââââââââââââââââââââââââââââââ
  const [botDelay,       setBotDelay]       = useState(() => { try { return parseInt(localStorage.getItem('wa_bot_delay') || '3') } catch { return 3 } })
  const [simulateTyping, setSimulateTyping] = useState(true)

  // ââ AI Message Style ââââââââââââââââââââââââââââââââââââââââââ
  const [msgMode,   setMsgMode]   = useState(() => { try { return localStorage.getItem('wa_msg_mode') || 'partes' } catch { return 'partes' } })
  const [useEmojis, setUseEmojis] = useState(() => { try { return JSON.parse(localStorage.getItem('wa_use_emojis') ?? 'true') } catch { return true } })
  const [useStyles, setUseStyles] = useState(() => { try { return JSON.parse(localStorage.getItem('wa_use_styles') ?? 'true') } catch { return true } })

  // ââ Backend URL & Secret ââââââââââââââââââââââââââââââââââââââ
  const [backendUrlInput, setBackendUrlInput] = useState(() => BU.replace('/api/whatsapp', ''))
  const [secretInput,     setSecretInput]     = useState(() => H['x-secret'])

  // ââ Bot Nativo (flujo conversacional sin APIs externas) ââââââ
  const [nbEnabled, setNbEnabled] = useState(() => { try { return JSON.parse(localStorage.getItem('wa_nb_enabled') || 'false') } catch { return false } })
  const [nbWelcome, setNbWelcome] = useState(() => { try { return localStorage.getItem('wa_nb_welcome') || 'Â¡Hola {{nombre}}! ð Bienvenido/a a *Sanate Store* ð¿\nÂ¿En quÃ© te puedo ayudar hoy?' } catch { return '' } })
  const [nbMenu, setNbMenu] = useState(() => { try { return localStorage.getItem('wa_nb_menu') || '1. ð Ver productos\n2. ð¦ Estado de mi pedido\n3. ð¬ Hablar con un asesor\n4. â¹ï¸ MÃ¡s informaciÃ³n' } catch { return '' } })
  const [nbMenuMap, setNbMenuMap] = useState(() => { try { return localStorage.getItem('wa_nb_menu_map') || '{"1":{"reply":"ð Puedes ver todo nuestro catÃ¡logo en:\\nhttps://sanate.store\\n\\nÂ¿Te interesa algo en especial?","next":"free"},"2":{"reply":"ð¦ EnvÃ­ame tu nÃºmero de pedido o tu nombre completo para buscarlo.","next":"free"},"3":{"reply":"ð Â¡Perfecto! Un asesor te atenderÃ¡ pronto.","next":"escalated"},"4":{"reply":"â¹ï¸ Somos *Sanate Store* â productos naturales ð¿\\nð EnvÃ­os a todo el paÃ­s\\nð³ Pagos seguros","next":"menu"}}' } catch { return '{}' } })
  const [nbTTL, setNbTTL] = useState(() => { try { return parseInt(localStorage.getItem('wa_nb_ttl') || '24') || 24 } catch { return 24 } })
  const [nbEscalate, setNbEscalate] = useState(() => { try { return localStorage.getItem('wa_nb_escalate') || 'agente,humano,persona,asesor,ayuda real,hablar con alguien' } catch { return '' } })
  const [nbDelay, setNbDelay] = useState(() => { try { return parseInt(localStorage.getItem('wa_nb_delay') || '800') || 800 } catch { return 800 } })
  const [nbAskName, setNbAskName] = useState(() => { try { return JSON.parse(localStorage.getItem('wa_nb_ask_name') || 'true') } catch { return true } })
  const [nbAskNameMsg, setNbAskNameMsg] = useState(() => { try { return localStorage.getItem('wa_nb_ask_name_msg') || 'Antes de continuar, Â¿cÃ³mo te llamas? ð' } catch { return '' } })
  const [nbFallback, setNbFallback] = useState(() => { try { return localStorage.getItem('wa_nb_fallback') || 'No entendÃ­ tu mensaje ð Escribe *menu* para ver las opciones.' } catch { return '' } })
  const [nbSessions, setNbSessions] = useState([])
  const [nbLeads, setNbLeads] = useState([])

  // ââ AI reply generator ââââââââââââââââââââââââââââââââââââââââ
  const [generatingAiReply, setGeneratingAiReply] = useState(false)
  const [aiTyping,          setAiTyping]          = useState(false) // indicator "IA respondiendo..."

  // Auto-reply deduplication: IDs ya procesados por el bot automÃ¡tico
  const aiProcessedRef      = useRef(new Set())
  const autoReplyingRef     = useRef(false)
  const autoReplyTimerRef   = useRef(null)  // debounce timer
  const autoReplyGenRef     = useRef(0)     // generaciÃ³n: se incrementa para cancelar respuesta en curso
  const chatOpenedAtRef     = useRef(0)     // timestamp al abrir chat â evita responder historial
  const kwFiredRef          = useRef(new Set()) // dedup para triggers de palabra clave (msgId_triggerId)
  const sentTextsRef        = useRef([])         // Ãºltimos 30 textos ENVIADOS por el bot â eco prevention

  // Refs para evitar stale closures en polling y ping
  const statusRef        = useRef('disconnected') // siempre tiene el status actual
  const activeRef        = useRef(null)            // siempre tiene el chat activo actual

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

  // Ocultar FloatingMenuDashboard mientras estamos en esta pÃ¡gina
  useEffect(() => { // eslint-disable-line
    document.body.classList.add('wabotPage')
    return () => document.body.classList.remove('wabotPage')
  }, []) // eslint-disable-line

  // Si localStorage tiene URL local (localhost/127.0.0.1), migrar al DEFAULT_BU pÃºblico
  useEffect(() => { // eslint-disable-line
    const stored = (() => { try { return localStorage.getItem('wa_backend_url') || '' } catch { return '' } })()
    const isLocal = !stored || stored.includes('localhost') || stored.includes('127.0.0.1')
    if (isLocal && !DEFAULT_BU.includes('localhost')) {
      try { localStorage.setItem('wa_backend_url', DEFAULT_BU) } catch {}
      BU = DEFAULT_BU
      setBackendUrlInput(DEFAULT_BU.replace('/api/whatsapp', ''))
    }
  }, []) // eslint-disable-line

  // Mantener refs sincronizadas (evitan stale closures en callbacks asÃ­ncronos)
  useEffect(() => { statusRef.current = status }, [status]) // eslint-disable-line
  useEffect(() => { activeRef.current = active  }, [active]) // eslint-disable-line

  // Polling global
  useEffect(() => { // eslint-disable-line
    ping()
    const t = setInterval(ping, 3000)
    // Page Visibility API: re-sincronizar inmediatamente cuando el usuario vuelve al tab
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        ping()
        if (activeRef.current?.id && statusRef.current === 'connected') {
          loadM(activeRef.current.id, false).catch(() => {})
        }
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisible) }
  }, []) // eslint-disable-line

  // ââ SSE real-time client âââââââââââââââââââââââââââââââââââââââââââââââââ
  React.useEffect(() => {
    if (status !== 'connected') return
    let es = null, retryTimer = null
    function connectSSE() {
      try {
        es = new EventSource(BU + '/events')
        es.onmessage = (e) => {
          try {
            const d = JSON.parse(e.data)
            if (d.type === 'chat_update') {
              setChats(prev => {
                const idx = prev.findIndex(c => c.id === d.chatId)
                if (idx === -1) { loadC().catch(() => {}); return prev }
                const next = [...prev]
                next[idx] = { ...next[idx], lastMsg: d.lastMsg, unread: d.unread, _ts: d.lastMsgTime }
                return next.sort((a,b) => (b._ts||0) - (a._ts||0))
              })
              if (activeRef.current?.id === d.chatId) loadM(d.chatId, false).catch(() => {})
            } else if (d.type === 'status') {
              const s = d.status === 'open' ? 'connected' : (d.status || 'disconnected')
              setStatus(s)
              if (s === 'connected') loadC().catch(() => {})
            }
          } catch {}
        }
        es.onerror = () => { es.close(); es = null; retryTimer = setTimeout(connectSSE, 5000) }
      } catch {}
    }
    connectSSE()
    return () => { if (es) { es.close(); es = null }; if (retryTimer) clearTimeout(retryTimer) }
  }, [status]) // eslint-disable-line

  // Polling mensajes cuando hay chat activo â 1.5s, independiente del status (usa ref)
  useEffect(() => { // eslint-disable-line
    if (!active?.id) return
    const chatId = active.id
    const t = setInterval(() => {
      if (statusRef.current === 'connected') loadM(chatId, false)
    }, 1500)
    return () => clearInterval(t)
  }, [active?.id]) // eslint-disable-line

  // Cuando cambia el chat: limpiar estado de IA y cancelar cualquier respuesta pendiente
  useEffect(() => { // eslint-disable-line
    if (!active) return
    setAiTyping(false)
    autoReplyingRef.current = false
    autoReplyGenRef.current += 1           // invalida cualquier respuesta en vuelo del chat anterior
    clearTimeout(autoReplyTimerRef.current) // cancela debounce pendiente del chat anterior
    aiProcessedRef.current = new Set()     // limpia dedup â chat nuevo = pizarra en blanco
    kwFiredRef.current     = new Set()     // limpia dedup de triggers de keyword
  }, [active?.id]) // eslint-disable-line

  // ââ Auto-reply: detectar mensajes nuevos entrantes y responder automÃ¡ticamente ââ
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

    // ââ ECO PREVENTION: ignorar mensajes que el bot enviÃ³ recientemente ââââââ
    // El backend a veces refleja el mensaje saliente como mensaje entrante (eco de Baileys).
    // Si el texto coincide con algo enviado en los Ãºltimos 60s, ignorar.
    if (lastIn.txt) {
      const incomingText = lastIn.txt.trim().toLowerCase()
      const isEcho = sentTextsRef.current.some(s => s.txt === incomingText)
      if (isEcho) {
        // Marcar como procesado para no revisarlo de nuevo
        aiProcessedRef.current.add(lastIn.id)
        aiProcessedRef.current.add(contentKey)
        return
      }
    }

    aiProcessedRef.current.add(lastIn.id)
    aiProcessedRef.current.add(contentKey)

    // Grace period de 4s al abrir el chat para no responder el historial
    if (Date.now() - chatOpenedAtRef.current < 4000) return

    // ââ Disparadores de Palabra Clave (independientes de IA ON/OFF) ââââââââââ
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

    // Verificar que IA estÃ© ON para este chat y haya API key
    if (!isAiActive(active.id)) return
    if (!hasAiKey) return
    // Si la IA ya estaba generando una respuesta â cancelarla (el cliente mandÃ³ algo nuevo)
    if (autoReplyingRef.current) {
      autoReplyGenRef.current += 1
      autoReplyingRef.current = false
      setAiTyping(false)
    }
    // Auto-etiquetar pedido si se detectan keywords de compra
    if (lastIn.txt) autoTagOrder(active.id, lastIn.txt)

    // Debounce: respetar el botDelay configurado en Ajustes
    // Lee directamente de localStorage â cap en 15s para evitar valores obsoletos altos
    const configDelay = Math.min(15, Math.max(0, parseInt(localStorage.getItem('wa_bot_delay') || '3') || 0))
    // MÃ­nimo 400ms (natural feel) + debounce para esperar si el cliente sigue escribiendo
    const totalDelay = configDelay * 1000 + 400
    // â ï¸ Capturar chatId AHORA (antes del timeout) para evitar stale closure.
    // Si el usuario cambia de chat durante la espera, el chatId capturado ya no coincide
    // con active.id al disparar â autoReplyToMsg aborta y NO responde en el chat incorrecto.
    const capturedChatId = active.id
    clearTimeout(autoReplyTimerRef.current)
    autoReplyTimerRef.current = setTimeout(() => autoReplyToMsg(lastIn, capturedChatId), totalDelay)
  }, [msgs]) // eslint-disable-line

  // ââ Persistir etiquetas cuando el usuario las cambia manualmente â
  useEffect(() => { // eslint-disable-line
    if (active?.id) saveContactTagsMap(active.id, contactTags)
  }, [contactTags]) // eslint-disable-line

  // Restaurar chat activo y pÃ¡gina desde localStorage cuando se conecta
  useEffect(() => { // eslint-disable-line
    if (status !== 'connected') return
    const saved = activeGet()
    if (saved && !active) {
      setActive(saved)
      setPage('chat')  // volver siempre al chat, no a la secciÃ³n anterior
      try { localStorage.setItem('wb_current_page', 'chat') } catch {}
      loadM(saved.id, false)
    }
  }, [status]) // eslint-disable-line

  // Polling QR agresivo cuando estamos en pÃ¡gina conexion esperando QR
  useEffect(() => { // eslint-disable-line
    if (page !== 'conexion' || (status !== 'connecting' && status !== 'qr')) return
    const t = setInterval(loadQR, 2500)
    return () => clearInterval(t)
  }, [page, status]) // eslint-disable-line

  // Redibujar QR en canvas cuando cambia la URL, la pÃ¡gina o el status
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
    } catch { tip('â No se pudo acceder al micrÃ³fono. Verifica permisos del navegador.') }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current.stop()
    setIsRecording(false)
  }

  function sendTemplate(tpl) {
    if (!active) return
    const clientName = chats.find(c => c.id === active.id)?.name || active.id.split('@')[0] || 'Cliente'
    const text = (tpl.mensaje || tpl.description || '')
      .replace(/\{nombre\}/g, clientName)
      .replace(/\{tienda\}/g, 'Sanate')
      .replace(/\{telefono\}/g, active.id.split('@')[0])
    const t = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    // Enviar al backend real
    const fd = new FormData(); fd.append('text', text)
    fetch(`${BU}/chats/${encodeURIComponent(active.id)}/send`, { method: 'POST', headers: H, body: fd }).catch(() => {})
    setMsgs(prev => { const next = [...prev, { id: Date.now().toString(), dir: 's', txt: text, time: t, type: 'text', status: 'sent' }]; cachePut(active.id, next); return next })
    setShowTemplatesModal(false)
    scroll()
  }

  // âââ API ââââââââââââââââââââââââââââââââââââââââââ
  // ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // â  ð QR CRÃTICO â NO MODIFICAR ESTAS FUNCIONES              â
  // â  ping Â· loadQR Â· drawQR Â· drawQRWaiting Â· regenerateQR     â
  // â  Cualquier cambio en estas 5 funciones puede romper el QR  â
  // ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  async function ping() {
    try {
      const d = await (await fetch(BU + '/status', { headers: H })).json()
      setServerOnline(prev => {
        // Primera vez online â sincronizar settings al backend en background
        if (prev !== true) setTimeout(() => syncSettingsToBackend({ silent: true }), 1200)
        return true
      })
      // IMPORTANTE: evaluar correctamente; sin parÃ©ntesis la precedencia es incorrecta
      const s = (d.ok === false) ? 'disconnected' : (d.status === 'qr' ? 'connecting' : (d.status || 'disconnected'))
      setStatus(s)
      setPhone(d.phone || '')
      if (s === 'connected') {
        try { await loadC() } catch {}
        // TambiÃ©n refrescar mensajes del chat activo para no perder mensajes nuevos
        if (activeRef.current?.id) loadM(activeRef.current.id, false).catch(() => {})
        setTimeout(drawQRConnected, 80)
      }
      else if (s === 'connecting' || s === 'qr') { loadQR() }
      // Auto-heal: si el servidor dice "disconnected" sin QR, pedir que reconecte
      else if (s === 'disconnected' && !d.hasQR) {
        try { await fetch(BU + '/connect', { method: 'POST', headers: H }) } catch {}
      }
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
    // PatrÃ³n de puntos central
    ctx.fillStyle = '#e5e7eb'
    for (let r=0;r<6;r++) for (let c=0;c<6;c++)
      if ((r+c)%2===0) ctx.fillRect(74+c*9, 74+r*9, 7, 7)
  }

  // Canvas de Ã©xito: QR skeleton en verde con checkmark overlay cuando estÃ¡ conectado
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
    // PatrÃ³n central de puntos verdes
    ctx.fillStyle = '#86efac'
    for (let r=0;r<6;r++) for (let c=0;c<6;c++)
      if ((r+c)%2===0) ctx.fillRect(74+c*9, 74+r*9, 7, 7)
    // Overlay verde semitransparente
    ctx.fillStyle = 'rgba(22, 163, 74, 0.78)'; ctx.fillRect(0, 0, s, s)
    // CÃ­rculo blanco central
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
    ctx.fillText('â Conectado', s/2, s - 14)
  }

  async function loadC() {
    try {
      const r = await fetch(BU + '/chats', { headers: H })
      if (!r.ok) { console.warn('[WA][loadC] HTTP', r.status); return }
      const d = await r.json()
      const serverChats = (d.chats || []).map(normChat)
      // ââ Merge: combinar server + localStorage master list ââââââââââ
      const cached = chatsMasterGet()
      const map = new Map()
      // Primero cargar cached (para no perder chats antiguos)
      cached.forEach(c => { if (c.id) map.set(c.id, c) })
      // Server data sobreescribe (tiene info mÃ¡s reciente)
      serverChats.forEach(c => {
        const old = map.get(c.id)
        map.set(c.id, {
          ...c,
          // Preservar nombre si el server devuelve solo JID
          name: c.name || (old?.name || ''),
          // Preservar foto
          photoUrl: c.photoUrl || (old?.photoUrl || ''),
        })
      })
      const merged = [...map.values()].sort((a, b) => {
        // Ordenar por timestamp ISO (no hh:mm)
        const ta = a._ts || 0, tb = b._ts || 0
        if (ta || tb) return tb - ta
        // Fallback: comparar time strings
        return (b.time || '').localeCompare(a.time || '')
      })
      setChats(merged)
      chatsMasterPut(merged)
      // Auto-fetch fotos de perfil en segundo plano (primeros 30 chats sin foto real)
      merged.filter(c => !c.photoUrl || c.photoUrl.includes('ui-avatars')).slice(0, 30).forEach(c => {
        fetch(`${BU}/chats/${encodeURIComponent(c.id)}/photo`, { headers: H })
          .then(r => r.json())
          .then(p => {
            if (p.ok && p.photoUrl) {
              setChats(prev => prev.map(x => x.id === c.id ? { ...x, photoUrl: p.photoUrl } : x))
            }
          })
          .catch(() => {})
      })
    } catch (err) {
      console.warn('[WA][loadC] error:', err?.message || err)
      // Si falla el servidor, cargar de localStorage
      const cached = chatsMasterGet()
      if (cached.length) setChats(cached)
    }
  }

  async function loadM(chatId, sc = true) {
    // Mostrar cachÃ© inmediatamente
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
    chatOpenedAtRef.current = Date.now() // marca tiempo de apertura â grace period anti-historial
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
      trackSentText(inp)
      setMsgs(p => { const next = [...p, newMsg]; cachePut(active.id, next); return next })
      setInp(''); scroll()
    } catch { tip('â ï¸ Error al enviar') }
    setSending(false)
  }

  async function sendFile(file, type) {
    if (!file || !active || status !== 'connected') return
    setSending(true); setAttachOpen(false)
    tip('ð¤ Enviando archivo...')
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
        scroll(); tip('â Archivo enviado')
      } else { tip('â ï¸ Error: ' + (d.error || 'no se pudo enviar')) }
    } catch { tip('â ï¸ Error al enviar archivo') }
    setSending(false)
  }

  async function regenerateQR() {
    setQrDataUrl(null); setStatus('connecting')
    // drawQRWaiting despuÃ©s de que React renderice el canvas (si no estaba visible)
    setTimeout(drawQRWaiting, 80)
    try { await fetch(BU + '/logout', { method: 'POST', headers: H }) } catch {}
    tip('ð Generando QR...')
    setTimeout(loadQR, 2000)
    setTimeout(loadQR, 4500)
    setTimeout(loadQR, 7000)
  }

  async function disconnectWA() {
    try { await fetch(BU + '/logout', { method: 'POST', headers: H }) } catch {}
    setStatus('disconnected'); setPhone(''); setChats([]); setActive(null); setQrDataUrl(null)
    tip('ð WhatsApp desconectado')
  }

  async function checkN8N() {
    setN8nOk(null); tip('ð Verificando n8n...')
    try {
      await fetch('https://oasiss.app.n8n.cloud', { mode: 'no-cors' })
      setN8nOk(true); tip('â n8n Cloud operativo')
    } catch { setN8nOk(false); tip('â ï¸ n8n no responde') }
  }

  // ââ IA / ChatGPT helpers âââââââââââââââââââââââââââââââââââââââ
  function saveAiKey(v)     {
    setOpenaiKey(v)
    try { localStorage.setItem('wa_openai_key', v) } catch {}
    // Sincronizar al backend para modo Chrome cerrado
    setTimeout(() => syncSettingsToBackend({ silent: true }), 500)
  }
  function saveGeminiKey(v) { setGeminiKey(v);   try { localStorage.setItem('wa_gemini_key', v) } catch {} }
  function saveAiPrompt(v)  { setAiPrompt(v);    try { localStorage.setItem('wa_ai_prompt', v) } catch {} }

  // ââ Llamada IA universal (OpenAI o Gemini) âââââââââââââââââââââ
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
      // Convertir formato OpenAI â Gemini
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
      tip(next ? 'ð¤ IA activada â respuestas automÃ¡ticas ON' : 'ð¤ IA desactivada')
      // Sincronizar al backend para que el servidor sepa el estado
      setTimeout(() => syncSettingsToBackend({ silent: true }), 300)
      return next
    })
  }
  function toggleAiContact(chatId) {
    setAiContactMap(prev => {
      const next = { ...prev, [chatId]: prev[chatId] !== true }
      try { localStorage.setItem('wa_ai_contact_map', JSON.stringify(next)) } catch {}
      // Sincronizar mapa de contactos al backend
      setTimeout(() => syncSettingsToBackend({ silent: true }), 300)
      return next
    })
  }
  function resetAllAiContacts() {
    setAiContactMap({})
    try { localStorage.setItem('wa_ai_contact_map', '{}') } catch {}
    tip('ð« IA desactivada en todos los contactos')
  }
  // IA activa SOLO si hay activaciÃ³n explÃ­cita para este contacto (true en aiContactMap)
  // Y ademÃ¡s el global aiEnabled estÃ¡ ON (interruptor maestro en Ajustes).
  // Esto evita que todos los chats respondan automÃ¡ticamente â cada contacto debe
  // ser activado individualmente con el botÃ³n "ð¤ IA OFF â IA ON" del header del chat.
  function isAiActive(chatId) {
    if (!aiEnabled) return false           // interruptor maestro apagado â nada responde
    return true   // modo Auto: IA activa para todos los contactos cuando aiEnabled es true
  }

  // ââ Eco prevention: registra texto enviado para que el bot no responda su propio eco ââ
  function trackSentText(text) {
    if (!text) return
    const now = Date.now()
    const entry = { txt: text.trim().toLowerCase().substring(0, 120), ts: now }
    sentTextsRef.current = [
      ...sentTextsRef.current.filter(s => now - s.ts < 60000),
      entry,
    ].slice(-30)
  }

  // ââ Disparadores por contacto âââââââââââââââââââââââââââââââââ
  // Por defecto los triggers estÃ¡n INACTIVOS â el usuario activa manualmente por contacto.
  function isTriggerActive(chatId) {
    if (!chatId) return false
    const override = triggerContactMap[chatId]
    return override === true   // DEBE ser activaciÃ³n explÃ­cita â default: OFF
  }
  function toggleTriggerContact(chatId) {
    if (!chatId) return
    setTriggerContactMap(prev => {
      const updated = { ...prev, [chatId]: !isTriggerActive(chatId) }
      try { localStorage.setItem('wa_trigger_contact_map', JSON.stringify(updated)) } catch {}
      return updated
    })
    tip(isTriggerActive(chatId) ? 'â¡ Disparadores pausados para este contacto' : 'â¡ Disparadores reactivados para este contacto')
  }

  // ââ Auto-reply automÃ¡tico cuando llega un mensaje nuevo y la IA estÃ¡ ON ââ
  // ââ Enviar mensaje de disparador por palabra clave ââââââââââââ
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
      trackSentText(text)  // eco prevention
      if (active?.id === targetChatId) {
        setMsgs(p => { const next = [...p, newMsg]; cachePut(targetChatId, next); return next })
        scroll()
      }
      tip(`â¡ Disparador "${trigger.name}" enviado`)
      await fetch(`${BU}/chats/${encodeURIComponent(targetChatId)}/presence`, {
        method: 'POST', headers: HJ, body: JSON.stringify({ action: 'paused' }),
      }).catch(() => {})
    } catch { tip('â ï¸ Error enviando disparador de palabra clave') }
  }

  async function autoReplyToMsg(lastClientMsg, targetChatId) {
    if (!hasAiKey || !active || autoReplyingRef.current) return
    // Si el usuario cambiÃ³ de chat durante el delay del debounce â abortar.
    // targetChatId fue capturado al momento de programar el timeout (antes del delay).
    if (targetChatId && active.id !== targetChatId) return
    autoReplyingRef.current = true
    const chatId = targetChatId || active.id
    const myGen = ++autoReplyGenRef.current  // capturar generaciÃ³n â si cambia, abortar
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
      const profileCtx = profile ? `\nPERFIL DEL CLIENTE ACTUAL:\nâ¢ Estilo: ${profile.estilo} | Tono: ${profile.tono} | IntenciÃ³n de compra: ${profile.intencion}\nâ¢ Intereses: ${(profile.intereses||[]).join(', ')}\nâ¢ Ãngulo recomendado: ${profile.angulo || 'N/A'}\n` : ''

      // Leer preferencias de estilo desde localStorage (evita stale closures)
      const lsMsgMode   = (function(){ try { return localStorage.getItem('wa_msg_mode') || 'partes' } catch { return 'partes' } })()
      const lsUseEmojis = (function(){ try { return JSON.parse(localStorage.getItem('wa_use_emojis') ?? 'true') } catch { return true } })()
      const lsUseStyles = (function(){ try { return JSON.parse(localStorage.getItem('wa_use_styles') ?? 'true') } catch { return true } })()

      // Bloque: formato de texto
      const stylesBlock = lsUseStyles
        ? `â¢ FORMATO WhatsApp: *negrita* (un asterisco cada lado), _cursiva_, ~tachado~ â Ãºsalos en precios, nombres de combos y beneficios clave\nâ¢ Ejemplo: *Combo Detox* â *$66.000* | _envÃ­o gratis_ hoy\nâ¢ NUNCA uses **doble asterisco** â solo *uno a cada lado*`
        : `â¢ Texto plano ÃNICAMENTE â sin asteriscos, guiones bajos ni tildes de formato\nâ¢ PROHIBIDO usar *negritas*, _cursiva_ o ~tachado~`

      // Bloque: emojis
      const emojisBlock = lsUseEmojis
        ? `â¢ Emojis: mÃ¡x 2 por mensaje, Ãºsalos como viÃ±etas o Ã©nfasis estratÃ©gico`
        : `â¢ PROHIBIDO usar emojis â responde solo con texto plano`

      // Bloque: envÃ­o por partes o completo
      const multiMsgBlock = lsMsgMode === 'partes'
        ? `ENVÃO POR PARTES (MUY IMPORTANTE):
Divide tu respuesta en 2 a 5 mensajes cortos separados por el separador EXACTO: ||||
Reglas para cada parte:
â¢ Parte 1 â gancho o contexto inicial â abre con intriga o dato interesante, NO reveles todo
â¢ Partes intermedias â desarrolla punto por punto, cada una termina dejando curiosidad o una mini-pregunta
â¢ Ãltima parte â pregunta de cierre de venta ("Â¿CuÃ¡l prefieres?" / "Â¿Te lo enviamos hoy?" / "Â¿Arrancamos?")
Estructura inteligente por tipo de situaciÃ³n:
  - Si el cliente pregunta por productos: parte 1 = beneficio + hook | parte 2 = opciÃ³n principal | parte 3 = opciÃ³n alternativa | Ãºltima = pregunta de decisiÃ³n
  - Si el cliente muestra objeciÃ³n: parte 1 = empatÃ­a | parte 2 = reencuadre de valor | Ãºltima = cierre con urgencia o elecciÃ³n
  - Si el cliente ya quiere comprar: mÃ¡x 2 partes â confirma + cierra directo
Ejemplo correcto:
Tenemos varias opciones que te pueden funcionar${lsUseEmojis ? ' ð¿' : ''}
||||
${lsUseStyles ? '*Combo Avena y Arroz*' : 'Combo Avena y Arroz'} â ideal para piel sensible${lsUseEmojis ? ' â¨' : ''} â ${lsUseStyles ? '*$66.000*' : '$66.000'}
||||
${lsUseStyles ? '*Combo CÃºrcuma*' : 'Combo CÃºrcuma'} â manchas y cicatrices${lsUseEmojis ? ' ð»' : ''} â ${lsUseStyles ? '*$66.000*' : '$66.000'}
||||
Â¿CuÃ¡l va mÃ¡s con lo que necesitas${lsUseEmojis ? ' ð' : '?'}`
        : `ENVÃO COMPLETO:
Responde en UN SOLO MENSAJE bien estructurado (mÃ¡x 6 lÃ­neas).
NO uses el separador |||| â todo en un bloque.
Organiza bien el texto con saltos de lÃ­nea para que sea fÃ¡cil de leer.`

      // ââ EMBUDO DE VENTAS PROBADO (extraÃ­do de cierres reales de SellerChat / SÃ¡nate)
      const salesFunnelBlock = `EMBUDO DE VENTAS PROBADO â SIGUE ESTE ORDEN EXACTO:
PASO 1 â BIENVENIDA: Recibe calurosamente. Si viene de anuncio, celebra su llegada con entusiasmo.
PASO 2 â DIAGNÃSTICO (OBLIGATORIO antes de dar precios): Pregunta "Â¿Lo buscas para acnÃ©, manchas, piel seca o zonas Ã­ntimas/axilas?" â adapta tu recomendaciÃ³n a su problema real.
PASO 3 â PRESENTACIÃN: Recomienda el combo exacto para su problema. Muestra precio${lsUseStyles ? ' con *negrita*' : ''} ANTES / HOY. Menciona el obsequio ${lsUseEmojis ? 'ð' : 'especial'}.
PASO 4 â MICRO-COMPROMISO (elecciÃ³n forzada â OBLIGATORIO): "Â¿CuÃ¡l te llevas hoy, el${lsUseStyles ? ' *Combo 1*' : ' Combo 1'} o el${lsUseStyles ? ' *Combo 5*' : ' Combo 5'}? ð" â NUNCA pregunta abierta al cierre.
PASO 5 â DATOS + CONFIRMACIÃN: Cuando el cliente elija: "Â¡Excelente elecciÃ³n! ðâ¨ Para confirmar tu pedido envÃ­ame: 1ï¸â£ Nombre y Apellido / ð± TelÃ©fono / ð Ciudad y Departamento / ð  DirecciÃ³n exacta / ð¦ Barrio"

CATÃLOGO SÃNATE${lsUseStyles ? ' (escribe precios y nombres de combos siempre en *negrita*)' : ''}:
â¢ ${lsUseStyles ? '*Combo 1*' : 'Combo 1'} â Tripack Mixto (3 Jabones: CalÃ©ndula+CÃºrcuma+Avena&Arroz) â ${lsUseStyles ? '*$59.000*' : '$59.000'} (antes $105.000 â ahorras $46.000)
â¢ ${lsUseStyles ? '*Combo 2*' : 'Combo 2'} â 3 Jabones a elecciÃ³n (CÃºrcuma, Avena&Arroz o CalÃ©ndula) â ${lsUseStyles ? '*$59.000*' : '$59.000'} (antes $105.000)
â¢ ${lsUseStyles ? '*Combo 3*' : 'Combo 3'} â 2 Jabones + Sebo de Res 10g â ${lsUseStyles ? '*$63.000*' : '$63.000'} (antes $79.000)
â¢ ${lsUseStyles ? '*Combo 4*' : 'Combo 4'} â Secreto JaponÃ©s: Sebo grande + 2 Jabones (CÃºrcuma+Avena) + Exfoliante â ${lsUseStyles ? '*$99.000*' : '$99.000'} (antes $119.000)
â¢ ${lsUseStyles ? '*Combo 5*' : 'Combo 5'} â ${lsUseEmojis ? 'â­ ' : ''}MÃS VENDIDO: 4 Jabones + Sebo 10g + Exfoliante â ${lsUseStyles ? '*$119.000*' : '$119.000'} (antes $159.000)
â¢ ${lsUseStyles ? '*Combo 6*' : 'Combo 6'} â Doble Sebo Grande: 2 Sebos + 2 Jabones a elecciÃ³n â ${lsUseStyles ? '*$136.900*' : '$136.900'} (antes $169.000)
â¢ JabÃ³n individual: ${lsUseStyles ? '*$22.000*' : '$22.000'}
Pago: contra entrega (efectivo) Ã³ Nequi/Bancolombia (${lsUseStyles ? '*8% OFF*' : '8% OFF'} + envÃ­o mÃ¡s rÃ¡pido ${lsUseEmojis ? 'ðð¨' : ''})
EnvÃ­o: GRATIS a toda Colombia ${lsUseEmojis ? 'ð' : ''} | Entrega 1-3 dÃ­as hÃ¡biles | Inter RapidÃ­simo

FRASES DE CIERRE PROBADAS (Ãºsalas textualmente â son las que funcionan en ventas reales):
â¢ ValidaciÃ³n inmediata: "Â¡Excelente elecciÃ³n! ðâ¨" / "Â¡Genial! ð" / "Â¡Perfecto! â"
â¢ Urgencia real: "Los precios y el obsequio son de hoy solamente${lsUseEmojis ? ' â°' : ''}"
â¢ Escasez: "Se estÃ¡n agotando rÃ¡pido â la reposiciÃ³n puede tardar hasta 15 dÃ­as"
â¢ Sin riesgo: "${lsUseEmojis ? 'ð¦ ' : ''}EnvÃ­o GRATIS${lsUseEmojis ? ' ð³' : ''} â pagas al recibir, sin riesgo"
â¢ Post-datos recibidos: "Â¡Todo listo! â Tu pedido estÃ¡ confirmado y en proceso${lsUseEmojis ? ' ð' : ''}"
â¢ Post-confirmaciÃ³n: "Recuerda que tu pedido saldrÃ¡ el mismo dÃ­a y recibirÃ¡s la guÃ­a de seguimiento por WhatsApp ð"
â¢ Reserve hook: "Â¿Te reservo el mÃ¡s vendido antes de que suba nuevamente? ð"

REGLAS DE ORO:
â NUNCA des precio sin diagnosticar primero quÃ© problema tiene el cliente
â NUNCA hagas preguntas abiertas al cierre â usa siempre elecciÃ³n forzada (A o B)
â NUNCA repitas la misma frase de apertura dos veces seguidas
â CELEBRA siempre cuando el cliente elige ("Â¡Excelente elecciÃ³n! ðâ¨") ANTES de pedir datos
â Si preguntan envÃ­os a su ciudad â confirma que SÃ llega, luego pide los datos
â Ofrece primero Nequi/transferencia (8% OFF), luego contra entrega como alternativa segura
â Cuando recibas todos los datos â envÃ­a confirmaciÃ³n entusiasta y cierra con calidez`

      const sysPrompt = ctx
        ? `${ctx}\n${profileCtx}\n---\nINSTRUCCIONES CRÃTICAS DE WHATSAPP:\nâ¢ Mensajes CORTOS: mÃ¡ximo 3-4 lÃ­neas POR MENSAJE\n${stylesBlock}\n${emojisBlock}\nâ¢ VarÃ­a saludos y aperturas â nunca repitas el mismo\nâ¢ Adapta el tono: si el cliente escribe informal, responde informal\n\n${multiMsgBlock}\n\n${salesFunnelBlock}\n\nPROHIBIDO SIEMPRE:\nâ "Â¡Claro que sÃ­!" / "Â¡Excelente pregunta!"\nâ MÃ¡s de 5 lÃ­neas en un solo segmento\nâ Decir que eres IA o bot`
        : `Eres una asesora de ventas de SÃ¡nate Colombia â jabones artesanales naturales 100% colombianos. Eres una persona real â NUNCA te presentes como IA.\n${profileCtx}\nINSTRUCCIONES DE MENSAJE:\nâ¢ Mensajes cortos: mÃ¡x 3-4 lÃ­neas\n${stylesBlock}\n${emojisBlock}\nâ¢ VarÃ­a saludos y apertura\nâ¢ Adapta el tono al estilo del cliente\n\n${multiMsgBlock}\n\n${salesFunnelBlock}\n\nPROHIBIDO:\nâ Frases genÃ©ricas | â Decir que eres IA | â Precios antes del diagnÃ³stico`
      // Mensaje actual del cliente para que la IA NO alucine sobre otros temas
      const currentMsgCtx = lastClientMsg.txt
        ? `\n\nâ¡ MENSAJE ACTUAL DEL CLIENTE AL QUE DEBES RESPONDER:\n"${lastClientMsg.txt}"\nResponde SOLO a esto. No inventes temas que el cliente no haya mencionado.`
        : ''
      const finalSysPrompt = sysPrompt + currentMsgCtx

      // ââ Detectar tipo de mensaje entrante âââââââââââââââââââââââââ
      const msgType = lastClientMsg.type || 'text'
      const isAudioMsg = (msgType === 'audio' || msgType === 'ptt') && lastClientMsg.mediaUrl
      const isImageMsg = (msgType === 'image' || msgType === 'sticker') && lastClientMsg.mediaUrl
      // Resolver URL completa del media (relativa â absoluta)
      const mediaFull = (url) => {
        if (!url) return ''
        if (url.startsWith('http')) return url
        return `${MEDIA_BASE}${url.startsWith('/') ? '' : '/'}${url}`
      }
      const clientNameN8n = chats.find(c => c.id === chatId)?.name || chatId.split('@')[0] || 'Cliente'
      const lsBackendUrl = (function(){ try { return localStorage.getItem('wa_backend_url') || DEFAULT_BU } catch { return DEFAULT_BU } })()
      const lsSecret     = (function(){ try { return localStorage.getItem('wa_secret') || DEFAULT_SECRET } catch { return DEFAULT_SECRET } })()

      // ââ n8n como procesador IA principal (texto + audio Whisper + imagen Vision) ââ
      let reply = ''
      let n8nHandled = false
      try {
        const n8nPayload = {
          chatId,
          messageType: isAudioMsg ? 'audio' : (isImageMsg ? 'image' : 'text'),
          text:     lastClientMsg.txt || (isAudioMsg ? '[Nota de voz]' : (isImageMsg ? '[Imagen]' : '')),
          audioUrl: isAudioMsg ? mediaFull(lastClientMsg.mediaUrl) : '',
          imageUrl: isImageMsg ? mediaFull(lastClientMsg.mediaUrl) : '',
          clientName:   clientNameN8n,
          systemPrompt: finalSysPrompt,
          openaiKey,
          history,
          backendUrl:   lsBackendUrl,
          backendSecret: lsSecret,
        }
        const n8nRes = await fetch(N8N_WH, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(n8nPayload),
          signal: AbortSignal.timeout(35000),
        })
        if (!n8nRes.ok) throw new Error(`n8n HTTP ${n8nRes.status}`)
        const n8nData = await n8nRes.json()
        if (!n8nData?.ok || !n8nData?.reply) throw new Error('n8n sin respuesta vÃ¡lida')

        reply = n8nData.reply
        n8nHandled = true

        // Si n8n transcribiÃ³ audio, mostrar la transcripciÃ³n como nota en el chat
        if (n8nData.transcription && isAudioMsg) {
          const tMsg = {
            id: `tr_${Date.now()}`, dir: 'r',
            txt: `ðï¸ TranscripciÃ³n: "${n8nData.transcription}"`,
            time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
            type: 'text', status: 'transcript',
          }
          if (active?.id === chatId) setMsgs(p => { const next = [...p, tMsg]; cachePut(chatId, next); return next })
        }

        // Si n8n ya enviÃ³ los mensajes via backend pÃºblico â solo actualizar UI y salir
        if (n8nData.sent) {
          const sentParts = (n8nData.parts || [reply]).filter(Boolean)
          const t = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
          if (active?.id === chatId) {
            setMsgs(p => {
              const next = [...p, ...sentParts.map((pt, i) => ({
                id: `n8n_${Date.now()}_${i}`, dir: 's', txt: pt, time: t, type: 'text', status: 'sent',
              }))]
              cachePut(chatId, next)
              return next
            })
            scroll()
          }
          setAiTyping(false); autoReplyingRef.current = false; return
        }
      } catch (n8nErr) {
        // n8n no disponible o fallÃ³ â fallback para texto, error para audio/imagen
        if (isAudioMsg || isImageMsg) {
          tip(`â ï¸ n8n no disponible â no se puede procesar ${isAudioMsg ? 'la nota de voz' : 'la imagen'}`)
          setAiTyping(false); autoReplyingRef.current = false; return
        }
        // Texto: fallback a OpenAI directo
        try {
          reply = await callAI({
            messages: [{ role: 'system', content: finalSysPrompt }, ...history],
            maxTokens: 480,
          })
        } catch (aiErr) {
          if (aiErr?.message !== 'no_key') tip('â ï¸ Error auto-respuesta IA')
          setAiTyping(false); autoReplyingRef.current = false; return
        }
      }

      // Verificar que no haya llegado un mensaje nuevo que invalide esta generaciÃ³n
      if (!reply || active?.id !== chatId || autoReplyGenRef.current !== myGen) {
        setAiTyping(false); autoReplyingRef.current = false; return
      }

      // ââ Soporte multi-mensaje: separar por ||||
      const parts = reply.split('||||').map(s => s.trim()).filter(Boolean)

      for (let pi = 0; pi < parts.length; pi++) {
        const part = parts[pi]
        // Verificar generaciÃ³n antes de cada segmento
        if (active?.id !== chatId || autoReplyGenRef.current !== myGen) break

        // Mostrar "escribiendo..." al cliente
        try {
          await fetch(`${BU}/chats/${encodeURIComponent(chatId)}/presence`, {
            method: 'POST', headers: HJ, body: JSON.stringify({ action: 'composing' }),
          })
        } catch {}

        // Delay de escritura: corto porque botDelay ya controlÃ³ la espera previa
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
        trackSentText(part)  // eco prevention â evita que el bot procese su propia respuesta
        setMsgs(p => { const next = [...p, newMsg]; cachePut(chatId, next); return next })
        scroll()

        // Pausa breve entre mensajes para que se vea natural (excepto el Ãºltimo)
        if (pi < parts.length - 1) await new Promise(r => setTimeout(r, 350))
      }

      // Quitar "escribiendo..." al terminar
      try {
        await fetch(`${BU}/chats/${encodeURIComponent(chatId)}/presence`, {
          method: 'POST', headers: HJ, body: JSON.stringify({ action: 'paused' }),
        })
      } catch {}
    } catch (e) {
      if (e?.message !== 'no_key') tip('â ï¸ Error auto-respuesta IA')
    }
    setAiTyping(false)
    autoReplyingRef.current = false
  }

  // ââ Analizar inteligencia del cliente con IA ââââââââââââââââââ
  async function analyzeClientIntelligence(chatId, msgsToAnalyze) {
    if (!hasAiKey || analysisLoading) return
    setAnalysisLoading(true)
    try {
      const clientMsgs = msgsToAnalyze.filter(m => m.dir === 'r')
      if (clientMsgs.length < 1) { tip('ð¬ No hay mensajes del cliente para analizar'); setAnalysisLoading(false); return }
      const conversation = msgsToAnalyze.slice(-25)
        .map(m => `[${m.dir === 'r' ? 'CLIENTE' : 'BOT'}]: ${m.txt || '[archivo/media]'}`)
        .join('\n')
      const prompt = `Analiza esta conversaciÃ³n de WhatsApp de ventas y responde ÃNICAMENTE con un JSON vÃ¡lido (sin markdown, sin explicaciones extra):
{
  "estilo": "formal|informal|muy informal",
  "tono": "ansioso|tranquilo|desconfiado|entusiasta|indiferente|impaciente",
  "intereses": ["lista de intereses detectados"],
  "intencion": "alta|media|baja",
  "objeciones": ["objeciones detectadas si hay, sino array vacÃ­o"],
  "angulo": "el mejor Ã¡ngulo de venta personalizado para ESTE cliente (mÃ¡x 1 frase)",
  "siguiente": "acciÃ³n concreta recomendada para el bot ahora mismo (mÃ¡x 1 frase)",
  "resumen": "perfil del cliente en 1-2 lÃ­neas",
  "es_cliente": true|false
}

CONVERSACIÃN:
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
          tip('ð§  AnÃ¡lisis actualizado')
        }
      }
    } catch (e) { tip('â ï¸ Error al analizar: ' + (e?.message || 'revisa tu API Key')) }
    setAnalysisLoading(false)
  }

  // EnvÃ­a mensaje via n8n (mÃ©todo legacy â mantenido para compatibilidad)
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

  // ââ Entrenamiento helpers ââââââââââââââââââââââââââââââââââââââ
  // ââ Guardar URL del backend Baileys ââââââââââââââââââââââââââ
  function saveBackendUrl() {
    const base   = backendUrlInput.trim().replace(/\/+$/, '').replace('/api/whatsapp', '')
    if (!base) { tip('â ï¸ Ingresa una URL vÃ¡lida'); return }
    const newBU  = base + '/api/whatsapp'
    const newSec = secretInput.trim() || DEFAULT_SECRET
    BU         = newBU
    MEDIA_BASE = base
    H          = { 'x-secret': newSec }
    HJ         = { ...H, 'Content-Type': 'application/json' }
    try { localStorage.setItem('wa_backend_url', newBU)   } catch {}
    try { localStorage.setItem('wa_secret',      newSec)  } catch {}
    tip('â Backend URL guardada â reconectando...')
    setTimeout(() => {
      setServerOnline(null); ping()
      // Sincronizar settings al backend con la nueva URL
      syncSettingsToBackend({ buOverride: newBU, secOverride: newSec, baseOverride: base })
    }, 800)
  }

  // ââ Sincronizar settings al backend (para operaciÃ³n con Chrome cerrado) ââ
  // Lee desde localStorage para evitar stale closures en setTimeout
  function syncSettingsToBackend({ buOverride, secOverride, baseOverride, silent = false } = {}) {
    const curBU   = buOverride   || BU
    const curSec  = secOverride  || (H['x-secret'] || DEFAULT_SECRET)
    const curBase = baseOverride || MEDIA_BASE
    const isPublic = curBase && !curBase.includes('localhost') && !curBase.includes('127.0.0.1')
    // Leer siempre de localStorage â evita problemas de stale closure
    const lsKey      = (() => { try { return localStorage.getItem('wa_openai_key') || '' } catch { return '' } })()
    const lsTraining = (() => { try { return localStorage.getItem('wa_training_prompt') || '' } catch { return '' } })()
    const lsPrompt   = (() => { try { return localStorage.getItem('wa_ai_prompt') || '' } catch { return '' } })()
    const lsAiOn     = (() => { try { return JSON.parse(localStorage.getItem('wa_ai_enabled') || 'false') } catch { return false } })()
    const sysP = (lsTraining || lsPrompt || '').substring(0, 8000)
    // Leer Bot Nativo config de localStorage
    const lsNbEnabled   = (() => { try { return JSON.parse(localStorage.getItem('wa_nb_enabled') || 'false') } catch { return false } })()
    const lsNbWelcome   = (() => { try { return localStorage.getItem('wa_nb_welcome') || '' } catch { return '' } })()
    const lsNbMenu      = (() => { try { return localStorage.getItem('wa_nb_menu') || '' } catch { return '' } })()
    const lsNbMenuMap   = (() => { try { return localStorage.getItem('wa_nb_menu_map') || '{}' } catch { return '{}' } })()
    const lsNbTTL       = (() => { try { return parseInt(localStorage.getItem('wa_nb_ttl') || '24') || 24 } catch { return 24 } })()
    const lsNbEscalate  = (() => { try { return localStorage.getItem('wa_nb_escalate') || '' } catch { return '' } })()
    const lsNbDelay     = (() => { try { return parseInt(localStorage.getItem('wa_nb_delay') || '800') || 800 } catch { return 800 } })()
    const lsNbAskName   = (() => { try { return JSON.parse(localStorage.getItem('wa_nb_ask_name') || 'true') } catch { return true } })()
    const lsNbAskNameMsg= (() => { try { return localStorage.getItem('wa_nb_ask_name_msg') || '' } catch { return '' } })()
    const lsNbFallback  = (() => { try { return localStorage.getItem('wa_nb_fallback') || '' } catch { return '' } })()
    // Leer mapa de contactos con AI activa
    const lsAiContactMap = (() => { try { return JSON.parse(localStorage.getItem('wa_ai_contact_map') || '{}') } catch { return {} } })()
    const payload = {
      botEnabled:       lsAiOn,
      n8nEnabled:       isPublic && !!N8N_WH, // solo activar si URL pÃºblica
      n8nWebhook:       N8N_WH,
      backendPublicUrl: isPublic ? curBase : '',
      openaiKey:        lsKey,
      systemPrompt:     sysP,
      aiContactMap:     lsAiContactMap,
      nativeBotEnabled:       lsNbEnabled,
      nativeBotWelcome:       lsNbWelcome,
      nativeBotMenu:          lsNbMenu,
      nativeBotMenuMap:       lsNbMenuMap,
      nativeBotSessionTTL:    lsNbTTL,
      nativeBotEscalateWords: lsNbEscalate,
      nativeBotReplyDelay:    lsNbDelay,
      nativeBotAskName:       lsNbAskName,
      nativeBotAskNameMsg:    lsNbAskNameMsg,
      nativeBotFallback:      lsNbFallback,
      // ââ Estilo de mensajes IA ââ
      msgMode:   (() => { try { return localStorage.getItem('wa_msg_mode') || 'partes' } catch { return 'partes' } })(),
      useEmojis: (() => { try { return JSON.parse(localStorage.getItem('wa_use_emojis') ?? 'true') } catch { return true } })(),
      useStyles: (() => { try { return JSON.parse(localStorage.getItem('wa_use_styles') ?? 'true') } catch { return true } })(),
      botDelay:  (() => { try { return parseInt(localStorage.getItem('wa_bot_delay') || '3') || 3 } catch { return 3 } })(),
    }
    fetch(curBU.replace('/api/whatsapp', '') + '/api/whatsapp/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-secret': curSec },
      body: JSON.stringify(payload),
    }).then(r => r.json()).then(d => {
      if (d?.ok && !silent) tip('âï¸ ConfiguraciÃ³n sincronizada al backend')
    }).catch(() => {
      if (!silent) console.warn('[syncSettings] Backend no alcanzable')
    })
  }

  function saveTraining(v) {
    setTrainingPrompt(v); setTrainingChars(v.length)
    try { localStorage.setItem('wa_training_prompt', v) } catch {}
    // Sincronizar prompt actualizado al backend
    setTimeout(() => syncSettingsToBackend({ silent: true }), 600)
  }
  async function generateWinnerPrompt() {
    if (!hasAiKey) { tip('â ï¸ Configura tu API Key (OpenAI o Gemini) en Ajustes â API'); return }
    setGeneratingPrompt(true); tip('ð¤ Generando prompt ganador con IA...')
    try {
      const generated = await callAI({
        messages: [
          { role: 'system', content: 'Eres el mejor experto en ventas conversacionales por WhatsApp del mundo. Genera prompts de sistema para bots de ventas que sean naturales, empÃ¡ticos y cierren ventas de forma efectiva.' },
          { role: 'user', content: `BasÃ¡ndote en este contexto de negocio, genera un prompt de sistema completo y optimizado para un bot de WhatsApp que sea el mejor cerrador de ventas del mundo. Incluye personalidad, tono, tÃ©cnicas de cierre, manejo de objeciones y reglas de comportamiento.\n\nContexto actual:\n${trainingPrompt.substring(0, 2000)}` },
        ],
        maxTokens: 1500,
      })
      if (generated) {
        saveTraining(trainingPrompt + '\n\nââââââââââââââââââââââââââââ\nð PROMPT GANADOR GENERADO POR IA\nââââââââââââââââââââââââââââ\n' + generated)
        tip('â Prompt ganador generado y agregado')
      }
    } catch (e) {
      tip(e?.message === 'no_key' ? 'â ï¸ Configura OpenAI o Gemini en Ajustes â API' : 'â ï¸ Error generando prompt')
    }
    setGeneratingPrompt(false)
  }

  // ââ Clientes helpers âââââââââââââââââââââââââââââââââââââââââââ
  function saveClienteFromChat(chat) {
    if (!chat?.id) return
    const existing = JSON.parse(localStorage.getItem('wa_clientes') || '[]')
    if (existing.find(c => c.id === chat.id)) return // ya guardado
    const geo = phoneToGeo(chat.phone || '')
    const newCliente = {
      id: chat.id, name: chat.name || '', phone: chat.phone || chat.id,
      pais: geo?.label?.split('Â·')[0]?.trim() || '', ciudad: geo?.label || '',
      flag: geo?.flag || '', totalPedidos: 0, noRecibidos: 0,
      etiqueta: 'Nuevo lead', primerMensaje: new Date().toLocaleDateString('es-CO'),
      ultimoMensaje: new Date().toLocaleDateString('es-CO'),
      direccion: '', notas: '', fotoUrl: chat.photoUrl || '',
    }
    const updated = [newCliente, ...existing]
    try { localStorage.setItem('wa_clientes', JSON.stringify(updated)) } catch {}
    setClientes(updated)
  }
  // ââ Guardar etiquetas persistentes por chat âââââââââââââââââââ
  function saveContactTagsMap(chatId, tags) {
    setChatsTags(prev => {
      const updated = { ...prev, [chatId]: tags }
      try { localStorage.setItem('wa_chats_tags', JSON.stringify(updated)) } catch {}
      return updated
    })
  }

  // ââ Auto-asignar etiqueta "Preparar" cuando se detecta pedido â
  function autoTagOrder(chatId, msgText) {
    if (!chatId || !msgText) return
    const text = msgText.toLowerCase()
    if (!ORDER_KEYWORDS.some(k => text.includes(k))) return
    const current = chatsTags[chatId] || []
    if (current.includes('Preparar')) return  // ya tiene la etiqueta
    const newTags = [...current.filter(t => t !== 'Nuevo lead'), 'Preparar']
    saveContactTagsMap(chatId, newTags)
    if (active?.id === chatId) setContactTags(newTags)
    tip('ð¦ IntenciÃ³n de pedido detectada â etiqueta "Preparar" asignada ðµ')
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

  // ââ Disparadores helpers âââââââââââââââââââââââââââââââââââââââ
  function saveTriggers(updated) {
    setTriggers(updated)
    try { localStorage.setItem('wa_triggers', JSON.stringify(updated)) } catch {}
  }

  // ââ Plantillas helpers âââââââââââââââââââââââââââââââââââââââââ
  function savePlantillas(updated) {
    setPlantillas(updated)
    try { localStorage.setItem('wa_plantillas', JSON.stringify(updated)) } catch {}
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
    tip('â Disparador guardado')
  }
  async function generateTriggerMsg(triggerName) {
    if (!hasAiKey) { tip('â ï¸ Configura tu API Key (OpenAI o Gemini) primero'); return }
    const producto = editTrigger?.producto || 'General'
    const condition = editTrigger?.condition || 'no_reply'
    const delay = editTrigger?.delay || 60
    const unit = editTrigger?.unit || 'min'
    setGeneratingTrigger(true); tip('ð¤ Generando mensaje ganador con IA...')
    try {
      const condLabel = { no_reply: 'sin respuesta', seen: 'visto sin responder', no_purchase: 'sin compra', keyword: 'por palabra clave', first_message: 'primer mensaje' }[condition] || condition
      const timeLabel = `${delay} ${unit === 'min' ? 'minutos' : unit === 'h' ? 'horas' : 'dÃ­as'}`
      const contextSnip = trainingPrompt ? trainingPrompt.substring(0, 600) : ''
      const msg = await callAI({
        messages: [
          { role: 'system', content: `Eres el mejor cerrador de ventas del mundo por WhatsApp.${contextSnip ? ` Contexto del negocio: "${contextSnip}"` : ''}\n\nReglas de oro:\n1. Primero conecta emocionalmente (1 frase)\n2. Menciona el producto "${producto}" naturalmente\n3. Da 1 beneficio clave (no precio aÃºn)\n4. Cierra con UNA pregunta irresistible\n5. MÃ¡ximo 3-4 lÃ­neas, 1-2 emojis, tono humano y cÃ¡lido` },
          { role: 'user', content: `Genera el mensaje perfecto de seguimiento para WhatsApp.\nTrigger: "${triggerName}"\nProducto/Plantilla: "${producto}"\nSituaciÃ³n: cliente ${condLabel} despuÃ©s de ${timeLabel}\nUsa {nombre} para personalizar. Responde SOLO el mensaje, sin explicaciones.` },
        ],
        maxTokens: 250,
      })
      if (msg && editTrigger) setEditTrigger(prev => ({ ...prev, message: msg }))
      tip('â Mensaje ganador generado â¨')
    } catch (e) {
      tip(e?.message === 'no_key' ? 'â ï¸ Configura OpenAI o Gemini en Ajustes â API' : 'â ï¸ Error generando mensaje')
    }
    setGeneratingTrigger(false)
  }

  // ââ Generar respuesta IA + enviar con simulaciÃ³n de escritura ââ
  async function generateAiReply() {
    if (!hasAiKey) { tip('â ï¸ Configura tu API Key (OpenAI o Gemini) en Ajustes â API'); return }
    const lastClientMsg = [...msgs].reverse().find(m => m.dir === 'r')
    if (!lastClientMsg) { tip('â ï¸ No hay mensajes del cliente para analizar'); return }
    setGeneratingAiReply(true); setAiTyping(true); tip('ð¤ Analizando Ã¡ngulo de venta...')
    try {
      const ctx = (trainingPrompt || aiPrompt || '').substring(0, 4000)
      const history = msgs.slice(-12).map(m => ({ role: m.dir === 'r' ? 'user' : 'assistant', content: m.txt || '[archivo]' }))
      const reply = await callAI({
        messages: [
          { role: 'system', content: `Eres el mejor asesor de ventas por WhatsApp del mundo.\n\nContexto del negocio:\n${ctx}\n\nREGLAS ABSOLUTAS:\n1. Si el cliente hizo una PREGUNTA o pide informaciÃ³n â da info clara del producto + beneficios + modo de uso (NO des precio todavÃ­a).\n2. Si el cliente muestra INTERÃS DE COMPRA ("cuÃ¡nto cuesta", "lo quiero", "cÃ³mo pago") â da precio + oferta irresistible + pregunta de cierre.\n3. Primero CONECTA emocionalmente (1 frase cÃ¡lida), luego informa o vende.\n4. MÃ¡ximo 3-4 lÃ­neas. Tono humano y natural. 1-2 emojis estratÃ©gicos.\n5. Termina SIEMPRE con una pregunta que invite a seguir o a comprar.\n6. Nunca suenes a robot. SÃ© como una persona real escribiendo en WhatsApp.` },
          ...history,
          { role: 'user', content: `El cliente acaba de escribir: "${lastClientMsg.txt}"\n\nAnaliza si es una pregunta informativa o si hay intenciÃ³n de compra, y genera LA MEJOR respuesta de ventas posible. Responde SOLO el mensaje para enviar al cliente, sin explicaciones adicionales.` },
        ],
        maxTokens: 350,
      })
      if (!reply) { tip('â ï¸ No se generÃ³ respuesta'); setGeneratingAiReply(false); return }

      // ââ Simular escritura + enviar automÃ¡ticamente ââ
      if (active && status === 'connected') {
        tip('âï¸ Enviando con efecto de escritura...')
        // 1. Enviar indicador "escribiendo..."
        try {
          await fetch(`${BU}/chats/${encodeURIComponent(active.id)}/presence`, {
            method: 'POST', headers: HJ,
            body: JSON.stringify({ action: 'composing' }),
          })
        } catch { /* si falla presence, igual enviamos */ }
        // 2. Esperar tiempo proporcional al largo del mensaje (mÃ­nimo 0.8s, mÃ¡ximo 2s)
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
          tip('â Respuesta enviada con Ã©xito ð')
        } catch { tip('â ï¸ Error al enviar la respuesta') }
        // 4. Desactivar indicador
        try {
          await fetch(`${BU}/chats/${encodeURIComponent(active.id)}/presence`, {
            method: 'POST', headers: HJ, body: JSON.stringify({ action: 'paused' }),
          })
        } catch { /* ignorar */ }
      } else {
        // No conectado: poner en el input para envÃ­o manual
        setInp(reply)
        tip('â Respuesta IA lista â revÃ­sala y envÃ­a ð')
      }
    } catch (e) {
      const msg = e?.message === 'no_key' ? 'â ï¸ Configura OpenAI o Gemini en Ajustes â API' : 'â ï¸ Error al generar respuesta con IA'
      tip(msg)
    }
    setGeneratingAiReply(false)
    setAiTyping(false)
  }

  // ââ Generar entrenamiento ganador desde el wizard ââââââââââââââ
  async function generateTrainingWizard() {
    if (!hasAiKey) { tip('â ï¸ Configura tu API Key (OpenAI o Gemini) primero'); return }
    const { empresa, descripcion, productos, precios, combos, estilo, objeciones, envio, horario, extra } = wizardData
    if (!empresa && !productos) { tip('â ï¸ Llena al menos el nombre de empresa y tus productos'); return }
    setGeneratingWizard(true); tip('ð¤ Generando entrenamiento ganador...')
    try {
      const estiloLabel = { amigable: 'amigable y cercano', profesional: 'profesional y formal', energico: 'energÃ©tico y motivador', suave: 'suave y empÃ¡tico' }[estilo] || estilo
      const generated = await callAI({
        messages: [
          { role: 'system', content: 'Eres el mejor experto del mundo en entrenar bots de ventas por WhatsApp. Generas prompts de sistema completos, naturales y altamente efectivos que convierten conversaciones en ventas. El bot PRIMERO debe conservar la conversaciÃ³n siendo amigable e informativo, y DESPUÃS buscar el cierre de ventas de forma natural y sin presiÃ³n.' },
          { role: 'user', content: `Genera el entrenamiento completo para un bot de WhatsApp cerrador de ventas con esta informaciÃ³n del negocio:\n\nð¢ NEGOCIO: ${empresa || 'Tienda online'}\nð DESCRIPCIÃN: ${descripcion || 'Productos y servicios'}\nðï¸ PRODUCTOS: ${productos || 'No especificado'}\nð° PRECIOS: ${precios || 'No especificado'}\nð COMBOS/OFERTAS: ${combos || 'Sin combos especiales'}\nð¬ ESTILO: ${estiloLabel}\nð OBJECIONES COMUNES: ${objeciones || '"EstÃ¡ muy caro", "Necesito pensarlo"'}\nð ENVÃO/LOGÃSTICA: ${envio || 'No especificado'}\nð HORARIO: ${horario || 'No especificado'}\nâ¨ INFO ADICIONAL: ${extra || 'Ninguna'}\n\nEl entrenamiento DEBE incluir en formato claro con emojis:\n1. ð¯ Personalidad del asistente (primero conecta, luego vende)\n2. ðï¸ Productos y precios detallados\n3. ð¥ Combos y ofertas especiales\n4. ð¬ Estilo de conversaciÃ³n (conectar â informar â cerrar)\n5. â TÃ©cnicas de cierre natural\n6. ð Manejo de objeciones\n7. ð« Reglas de nunca hacer\n\nIMPORTANTE: El bot SIEMPRE conserva primero e intenta cierre de ventas despuÃ©s de forma natural y sin presiÃ³n.` },
        ],
        maxTokens: 2500,
      })
      if (generated) {
        saveTraining(generated)
        setTrainingTab('contexto')
        tip('ð Entrenamiento ganador generado y guardado â¨')
      } else tip('â ï¸ No se generÃ³ contenido. Verifica tu API Key')
    } catch (e) {
      tip(e?.message === 'no_key' ? 'â ï¸ Configura OpenAI o Gemini en Ajustes â API' : 'â ï¸ Error generando entrenamiento')
    }
    setGeneratingWizard(false)
  }

  function copyText(txt) {
    navigator.clipboard?.writeText(txt).then(() => tip('ð Copiado!')).catch(() => tip('ð ' + txt.substring(0, 40)))
  }

  // âââ FLOW BUILDER âââââââââââââââââââââââââââââââââ
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
    let matchSearch = true
    if (search) {
      const q = search.toLowerCase()
      const qDigits = search.replace(/[^\d]/g, '')
      const nameMatch = (c.name || '').toLowerCase().includes(q)
      const phoneDigits = (c.phone || c.id || '').replace(/[^\d]/g, '')
      const phoneMatch = qDigits.length >= 3 && phoneDigits.includes(qDigits)
      const idMatch = (c.id || '').toLowerCase().includes(q)
      matchSearch = nameMatch || phoneMatch || idMatch
    }
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
    return matchSearch && matchFilter && (chatFilter === 'grupos' ? !!c.isGroup : !c.isGroup)
  })

  const leadFilteredChats = leadFilter === 'all' ? filteredChats : filteredChats.filter(c => (lifecycle[c.jid]?.stage||'nuevo')===leadFilter);
  const NAV = [
    { id: 'overview',       label: 'ð Resumen',            section: 'Principal',       badge: 0 },
    { id: 'chat',           label: 'ð¬ Chats',               section: 'Principal',       badge: unread },
    { id: 'clientes',       label: 'ð¥ Clientes',            section: 'Principal',       badge: clientes.filter(c => c.etiqueta === 'Nuevo lead').length },
    { id: 'flujos',         label: 'ð Flujos',              section: 'AutomatizaciÃ³n',  badge: 0 },
    { id: 'templates',      label: 'ð Plantillas',          section: 'AutomatizaciÃ³n',  badge: 0 },
    { id: 'disparadores',   label: 'â¡ Disparadores',        section: 'AutomatizaciÃ³n',  badge: triggers.filter(t => t.active).length },
    { id: 'entrenamiento',  label: 'ð§  Entrenamiento IA',    section: 'AutomatizaciÃ³n',  badge: 0 },
  { id: 'difusiones', label: 'ð£ Difusiones', section: 'AutomatizaciÃ³n', badge: 0 },
    { id: 'conexion',       label: 'ð± ConexiÃ³n WhatsApp',   section: 'ConfiguraciÃ³n',   badge: 0 },
    { id: 'config',         label: 'âï¸ Ajustes',             section: 'ConfiguraciÃ³n',   badge: 0 },
  { id: 'dispositivos', label: 'ð± Dispositivos', section: 'ConfiguraciÃ³n', badge: 0 },
    { id: 'instagram', label: 'Instagram', section: 'Apps Chat', badge: 0, brandColor: '#E1306C' },
    { id: 'facebook',  label: 'Messenger', section: 'Apps Chat', badge: 0, brandColor: '#0084FF' },
    { id: 'tiktok',    label: 'TikTok',    section: 'Apps Chat', badge: 0, brandColor: '#EE1D52' },
  ]

  function goPage(id) {
    setPage(id)
    try { localStorage.setItem('wb_current_page', id) } catch {}
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

        {/* ââ SIDEBAR ââ */}
        <div className="wbv5-sidebar">
          <div className="wbv5-sb-logo" style={{ display: 'none' }}>
            <div className="wbv5-sb-icon">ð¿</div>
            <div>
              <div className="wbv5-sb-name">Sanate Bot</div>
              <div className="wbv5-sb-sub">WhatsApp Automation</div>
            </div>
          </div>
          <div className="wbv5-sb-acct" style={{ display: 'none' }}>
            <div className="wbv5-sb-ava">S</div>
            <div className="wbv5-sb-uname">sanate.store</div>
          </div>
          {['Principal', 'AutomatizaciÃ³n', 'Apps Chat', 'ConfiguraciÃ³n'].map(section => (
            <React.Fragment key={section}>
              <div className="wbv5-nav-section">{section}</div>
              {NAV.filter(i => i.section === section).map(item => (
                <div
                  key={item.id}
                  className={`wbv5-nav-item ${page === item.id ? 'active' : ''}`}
                  onClick={() => goPage(item.id)}
                >
                  <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                {item.id === 'instagram' ? <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}><defs><linearGradient id="ig-g" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f09433"/><stop offset="50%" stopColor="#dc2743"/><stop offset="100%" stopColor="#bc1888"/></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="url(#ig-g)"/><circle cx="12" cy="12" r="4" stroke="white" strokeWidth="2" fill="none"/><circle cx="17.5" cy="6.5" r="1.5" fill="white"/></svg>
                  <span style={{color:'#E1306C'}}>{item.label}</span>
                </> : item.id === 'facebook' ? <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#0084FF" style={{flexShrink:0}}><path d="M12 2C6.477 2 2 6.145 2 11.259c0 2.928 1.448 5.545 3.71 7.26v3.48l3.384-1.855c.905.25 1.864.386 2.856.386 5.523 0 10-4.145 10-9.271C22 6.145 17.523 2 12 2zm1.037 12.49l-2.547-2.718-4.971 2.718 5.467-5.804 2.609 2.718 4.908-2.718-5.466 5.804z"/></svg>
                  <span style={{color:'#0084FF'}}>{item.label}</span>
                </> : item.id === 'tiktok' ? <>
                  <svg width="15" height="15" viewBox="0 0 448 512" style={{flexShrink:0}}><path fill="#69C9D0" d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z"/><path fill="#EE1D52" d="M446,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,183,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,379,102.39a121.43,121.43,0,0,0,67,20.14Z"/></svg>
                  <span style={{color:'#EE1D52'}}>{item.label}</span>
                </> : item.label}
              </span>
                  {item.badge > 0 && <span className="wbv5-nav-badge">{item.badge}</span>}
                </div>
              ))}
            </React.Fragment>
          ))}
          <div className="wbv5-sb-footer">
            <div className={`wbv5-status-badge ${status === 'connected' ? 'green' : status === 'connecting' ? 'amber' : 'gray'}`}>
              {status === 'connected' ? 'â Conectado' : status === 'connecting' ? 'â³ Conectando...' : serverOnline === false ? 'ð Sin servidor' : 'â³ No conectado'}
            </div>
            <div style={{ marginTop: '.3rem', fontSize: '.62rem', color: '#9ca3af' }}>n8n + Baileys</div>
            <button
              className={`wbv5-btn wbv5-btn-sm ${aiEnabled ? 'wbv5-btn-ai-on' : 'wbv5-btn-outline'}`}
              style={{ marginTop: '.4rem', width: '100%', fontSize: '.65rem', padding: '.28rem .5rem' }}
              onClick={toggleAiGlobal}
              title="Activar/desactivar IA global"
            >
              ð¤ IA {aiEnabled ? 'ON' : 'OFF'}
            </button>
            {/* Contador de contactos con triggers pausados */}
            {Object.values(triggerContactMap).filter(v => v === false).length > 0 && (
              <div
                style={{ marginTop: '.3rem', background: '#fef3c7', borderRadius: 6, padding: '.25rem .5rem', fontSize: '.6rem', color: '#92400e', fontWeight: 700, textAlign: 'center', cursor: 'pointer' }}
                onClick={() => goPage('disparadores')}
                title="Contactos con disparadores pausados"
              >
                â¡ {Object.values(triggerContactMap).filter(v => v === false).length} pausado(s)
              </div>
            )}
          </div>
        </div>

        {/* ââ MAIN ââ */}
        <div className="wbv5-main">
          <div className="wbv5-topbar">
            <div className="wbv5-topbar-title">
              {builderOpen
                ? FLOWS_LIST.find(f => f.key === curFlow)?.name || curFlow
                : NAV.find(i => i.id === page)?.label || page}
            </div>
            <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => goPage('conexion')}>
              ð± Estado WA
            </button>
          </div>

          {/* ââ OVERVIEW ââ */}
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
                  <div className="wbv5-stat-chg">Ãºltimas 24h</div>
                </div>
                <div className="wbv5-stat-card">
                  <div className="wbv5-stat-val">3</div>
                  <div className="wbv5-stat-lbl">Flujos activos</div>
                  <div className="wbv5-stat-chg">â Operativos</div>
                </div>
                <div className="wbv5-stat-card">
                  <div className="wbv5-stat-val">â</div>
                  <div className="wbv5-stat-lbl">CTR promedio</div>
                </div>
              </div>
              <div className="wbv5-card">
                <div className="wbv5-card-hd">
                  <div className="wbv5-card-title">ð± Estado WhatsApp</div>
                  <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => goPage('conexion')}>Gestionar â</button>
                </div>
                <div className="wbv5-card-bd">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className={`wbv5-status-indicator ${statusCls[status]}`}>
                      <div className="wbv5-si-dot" />
                      <span>{status === 'connected' ? `â Conectado â ${phone}` : status === 'connecting' ? 'â³ Esperando escaneo del QR...' : 'Desconectado â escanea el QR para conectar'}</span>
                    </div>
                    {phone && <div style={{ fontSize: '.72rem', color: '#6b7280' }}>ð± {phone}</div>}
                  </div>
                </div>
              </div>
              <div className="wbv5-card">
                <div className="wbv5-card-hd">
                  <div className="wbv5-card-title">ð n8n Cloud</div>
                  <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={checkN8N}>ð Verificar</button>
                </div>
                <div className="wbv5-card-bd">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.4rem' }}>
                    <span className={`wbv5-badge ${n8nOk === true ? 'badge-green' : n8nOk === false ? 'badge-red' : 'badge-amber'}`}>
                      {n8nOk === true ? 'â Online' : n8nOk === false ? 'â Error' : 'â³ Pendiente'}
                    </span>
                    <span style={{ fontSize: '.72rem', color: '#6b7280' }}>https://oasiss.app.n8n.cloud</span>
                  </div>
                  <div style={{ fontSize: '.7rem', color: '#6b7280' }}>
                    Webhook: <code style={{ background: '#f3f4f6', padding: '.1rem .3rem', borderRadius: '4px' }}>{N8N_WH}</code>
                  </div>
                </div>
              </div>
              {/* ââ Bot Nativo Status ââ */}
              <div className="wbv5-card">
                <div className="wbv5-card-hd">
                  <div className="wbv5-card-title">ð¤ Bot IA</div>
                  <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => { setCfgTab('nativebot'); goPage('config') }}>Configurar â</button>
                </div>
                <div className="wbv5-card-bd">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                    <span className={`wbv5-badge ${nbEnabled ? 'badge-green' : 'badge-red'}`}>
                      {nbEnabled ? 'â Activo' : 'â Inactivo'}
                    </span>
                    <span style={{ fontSize: '.72rem', color: '#6b7280' }}>
                      {nbEnabled
                        ? 'Flujo conversacional con menÃº, captura de leads y escalaciÃ³n'
                        : 'Activa el bot para respuestas automÃ¡ticas con menÃº'}
                    </span>
                  </div>
                </div>
              </div>
              {/* ââ Panel de Inteligencia de Ventas ââ */}
              <div className="wbv5-card">
                <div className="wbv5-card-hd">
                  <div className="wbv5-card-title">ð¡ Inteligencia de Ventas</div>
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
                    if (pendingOrders.length > 0) insights.push({ type: 'warn', msg: `${pendingOrders.length} pedido(s) con etiqueta "Preparar" sin facturar â revÃ­salos antes de que se enfrÃ­en` })
                    // Chats con keywords de precio en preview
                    const priceChats = chats.filter(c => ORDER_KEYWORDS.some(k => (c.preview || '').toLowerCase().includes(k)))
                    if (priceChats.length > 0) insights.push({ type: 'info', msg: `${priceChats.length} chat(s) con preguntas de precio/pedido recientes â abre y da seguimiento ð¦` })
                    // Contactos sin IA activa
                    const noAi = chats.filter(c => !c.isGroup && !isAiActive(c.id))
                    if (noAi.length > 0) insights.push({ type: 'tip', msg: `${noAi.length} contacto(s) sin IA activa â actÃ­valos individualmente para respuesta automÃ¡tica` })
                    // Training usando plantilla genÃ©rica
                    const lsTraining = (() => { try { return localStorage.getItem('wa_training_prompt') || '' } catch { return '' } })()
                    if (!lsTraining || lsTraining === TRAINING_TEMPLATE) insights.push({ type: 'alert', msg: 'El entrenamiento IA usa plantilla genÃ©rica â personaliza con tus productos reales para mejorar el cierre hasta un 60%' })
                    // Sin anÃ¡lisis de clientes
                    const noAnalysis = chats.filter(c => !clientAnalysis[c.id]).length
                    if (noAnalysis > 3) insights.push({ type: 'tip', msg: `${noAnalysis} clientes sin perfil IA â abre el chat y pulsa "ð§  Analizar" para obtener Ã¡ngulos de venta personalizados` })
                    // Plantillas sin imagen
                    insights.push({ type: 'tip', msg: 'AÃ±ade imÃ¡genes a tus plantillas de productos â los mensajes con imagen aumentan el cierre hasta un 40% ð¸' })
                    // Estado del sistema
                    if (status === 'connected' && aiEnabled) insights.push({ type: 'ok', msg: `WhatsApp conectado y IA activa â â El bot estÃ¡ respondiendo automÃ¡ticamente` })
                    else if (status !== 'connected') insights.push({ type: 'alert', msg: 'WhatsApp desconectado â los clientes no estÃ¡n recibiendo respuestas automÃ¡ticas ð¨' })
                    return insights.slice(0, 5).map((ins, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: '.45rem', alignItems: 'flex-start',
                        background: ins.type === 'ok' ? '#f0fdf4' : ins.type === 'warn' ? '#fef9c3' : ins.type === 'alert' ? '#fef2f2' : '#f8f9ff',
                        border: `1px solid ${ins.type === 'ok' ? '#bbf7d0' : ins.type === 'warn' ? '#fde047' : ins.type === 'alert' ? '#fca5a5' : '#e0e7ff'}`,
                        borderRadius: 7, padding: '.4rem .55rem', fontSize: '.72rem', lineHeight: 1.5
                      }}>
                        <span style={{ flexShrink: 0 }}>{ins.type === 'ok' ? 'â' : ins.type === 'warn' ? 'â ï¸' : ins.type === 'alert' ? 'ð¨' : 'ð¡'}</span>
                        <span style={{ color: '#374151' }}>{ins.msg}</span>
                      </div>
                    ))
                  })()}
                </div>
              </div>

              <div className="wbv5-card">
                <div className="wbv5-card-hd">
                  <div className="wbv5-card-title">â¡ Flujos recientes</div>
                  <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => goPage('flujos')}>Ver todos â</button>
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
                          <td><span className="wbv5-badge badge-green">â Activo</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ââ CHAT ââ */}
          {page === 'chat' && (
            <div className="wbv5-chat-wrap">
              <div className="wbv5-inbox-list">
                <div className="wbv5-il-header">
                  <input className="wbv5-il-search" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
                  <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={() => loadC().catch(() => {})}>ð</button>
                </div>
                <div className="wbv5-il-filters" style={{ flexWrap: 'wrap', gap: '.25rem' }}>
                  {[
                    { id: 'todos',    label: 'Todos' },
                    { id: 'sin leer', label: 'ð´ Sin leer' },
                    { id: 'pedidos',  label: 'ð¦ Pedidos' },
                    { id: 'ventas',   label: 'â Ventas' },
                    { id: 'soporte',  label: 'ð  Soporte' },
                    { id: 'grupos',   label: 'ð¥ Grupos' },
                    { id: 'bot',      label: 'ð¤ Bot' },
                  ].map(f => (
                    <button key={f.id} className={`wbv5-il-filter ${chatFilter === f.id ? 'active' : ''}`} onClick={() => setChatFilter(f.id)} style={{ fontSize: '.67rem', padding: '.2rem .45rem' }}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <div style={{display:'flex',gap:'6px',padding:'8px 12px',borderBottom:'1px solid #2a2a2a',background:'#111',flexWrap:'wrap'}}>
            {[['nuevo','ð Nuevo','#3b82f6'],['potencial','ð¥ Potencial','#f59e0b'],['cliente','ð Cliente','#22c55e'],['perdido','â Perdido','#ef4444']].map(([key,label,clr])=>(
              <button key={key} onClick={()=>setLeadFilter(p=>p===key?'all':key)} style={{border:'1px solid '+(leadFilter===key?(clr||'#25d366'):'#444'),borderRadius:'20px',padding:'3px 10px',background:leadFilter===key?(clr||'#25d366'):'transparent',color:leadFilter===key?'#fff':'#aaa',cursor:'pointer',fontSize:'11px',fontWeight:leadFilter===key?'600':'400'}}>{label}</button>
            ))}
          </div>
          <div className="wbv5-il-convs">
                  {status !== 'connected' ? (
                    <div className="wbv5-empty-state">
                      <div style={{ fontSize: '1.5rem', marginBottom: '.4rem' }}>ð±</div>
                      <div>Conecta WhatsApp para ver chats</div>
                      <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" style={{ marginTop: '.5rem' }} onClick={() => goPage('conexion')}>Conectar</button>
                    </div>
                  ) : leadFilteredChats.length === 0 ? (
                    <div className="wbv5-empty-state">
                      <div style={{ fontSize: '1.5rem' }}>ð¬</div>
                      <div>Sin convesaciones</div>
                    </div>
                  ) : leadFilteredChats.map((c, i) => (
                    <div key={c.id} className={`wbv5-conv-itm ${active?.id === c.id ? 'active' : ''}`} onClick={() => openChat(c)}>
                      <div className="wbv5-ci-ava" style={{ background: c.isGroup ? '#ede9fe' : COLORS_AV[i % 5], color: c.isGroup ? '#5b21b6' : COLORS_TXT[i % 5], position: 'relative', overflow: 'hidden' }}>
                        {c.isGroup ? 'ð¥' : (c.name || c.phone || '?').substring(0, 2).toUpperCase()}
                        {c.photoUrl ? <img src={c.photoUrl} alt="" className="wbv5-ci-ava-img wbv5-ci-ava-abs" onError={e => e.target.style.display='none'} /> : null}
                      </div>
                      <div className="wbv5-ci-body">
                        <div className="wbv5-ci-name">
                          {c.name || c.phone || c.id.split('@')[0]}
                          {c.isGroup && <span style={{ marginLeft: 4, fontSize: '.62rem', color: '#7c3aed' }}>Â·grupo</span>}
                          {!isTriggerActive(c.id) && <span className="wbv5-trigger-paused-badge" title="Disparadores pausados">â¡ pausa</span>}
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

              {/* ââ ventana de chat ââ */}
              <div className="wbv5-chat-win">
                {!active ? (
                  <div className="wbv5-chat-empty">
                    <div style={{ fontSize: '1.8rem', marginBottom: '.5rem' }}>ð¬</div>
                    <div>Selecciona una conversaciÃ³n</div>
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
                        <div style={{padding:'4px 12px',background:'transparent',borderBottom:'1px solid rgba(0,0,0,0.06)',display:'flex',gap:'6px',flexWrap:'wrap'}}>
                          {[{id:'nuevo',label:'Nuevo cliente',c:'#6c757d'},{id:'potencial',label:'Potencial ð¥',c:'#fd7e14'},{id:'cliente',label:'Cliente ð',c:'#0d6efd'},{id:'perdido',label:'Perdido â',c:'#dc3545'}].map(s=>(
                            <button key={s.id} onClick={()=>updateStage(active?.id,s.id)} style={{padding:'2px 10px',borderRadius:'20px',border:'none',cursor:'pointer',fontSize:'11px',fontWeight:600,background:lifecycle[active?.id]?.stage===s.id?s.c:'#e9ecef',color:lifecycle[active?.id]?.stage===s.id?'#fff':'#495057'}}>{s.label}</button>
                          ))}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                          {aiTyping ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.7rem', color: '#7c3aed', fontWeight: 600 }}>
                              <span style={{ display: 'inline-flex', gap: 2 }}>
                                {[0,1,2].map(i => (
                                  <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#7c3aed', display: 'inline-block', animation: `wbv5-pulse 0.9s ease-in-out ${i*0.22}s infinite` }} />
                                ))}
                              </span>
                              ð¤ IA respondiendo...
                            </div>
                          ) : (
                            <>
                              <div className="wbv5-cw-sub">ð¢ {active.phone || cleanPhone('', active.id)}</div>
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
                            {contactStatus} â¾
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
                        {/* BotÃ³n Disparadores por contacto */}
                        <button
                          className={`wbv5-btn wbv5-btn-sm ${isTriggerActive(active?.id) ? 'wbv5-btn-trigger-on' : 'wbv5-btn-trigger-off'}`}
                          onClick={() => toggleTriggerContact(active?.id)}
                          title={isTriggerActive(active?.id) ? 'â¡ Disparadores activos â clic para pausar' : 'â¡ Disparadores pausados â clic para reactivar'}
                        >
                          â¡ {isTriggerActive(active?.id) ? 'Auto ON' : 'Auto OFF'}
                        </button>
                        {/* BotÃ³n IA por contacto */}
                        <button
                          className={`wbv5-btn wbv5-btn-sm ${isAiActive(active?.id) ? 'wbv5-btn-ai-on' : 'wbv5-btn-outline'}`}
                          onClick={() => toggleAiContact(active?.id)}
                          title={isAiActive(active?.id) ? 'IA activa â clic para desactivar' : 'IA inactiva â clic para activar'}
                        >
                          ð¤ {isAiActive(active?.id) ? 'IA ON' : 'IA OFF'}
                        </button>
                        <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => setShowContact(s => !s)}>ð Datos</button>
                        <button
                          className={`wbv5-btn wbv5-btn-sm ${showAnalysisPanel ? 'wbv5-btn-ai-on' : 'wbv5-btn-outline'}`}
                          onClick={() => { setShowAnalysisPanel(s => !s); setShowContact(false) }}
                          title="ð§  AnÃ¡lisis IA del cliente â estilo, intenciÃ³n de compra, Ã¡ngulo de venta"
                          style={{ fontSize: '.72rem' }}
                        >
                          ð§  {clientAnalysis[active?.id] ? 'AnÃ¡lisis' : 'Analizar'}
                        </button>
                      </div>
                    </div>

                    <div className="wbv5-cw-msgs" ref={msgsRef}>
                      {msgs.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '.72rem', padding: '2rem 0' }}>Sin mensajes aÃºn</div>
                      ) : msgs.map((m) => {
                        const isMediaType = ['image', 'video', 'audio', 'document', 'sticker'].includes(m.type);
                        return (
                        <div key={m.id} className={`wbv5-msg ${m.dir}`}>
                          {/* texto â mostrar tambiÃ©n en imagen/video/audio si tiene caption */}
                          {m.txt ? <div className="wbv5-msg-txt">{m.txt}</div> : null}

                          {/* ââ imagen ââ */}
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
                                  ð¥ Ver / Descargar imagen
                                </a>
                              </div>
                            )
                          })() : <div className="wbv5-msg-media-ph">ð· Imagen</div>) : null}

                          {/* ââ video ââ */}
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
                                  ð¥ Descargar video
                                </a>
                              </div>
                            )
                          })() : <div className="wbv5-msg-media-ph">ð¥ Video</div>) : null}

                          {/* ââ audio / nota de voz ââ */}
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
                                  ðµ Descargar audio
                                </a>
                              </div>
                            )
                          })() : <div className="wbv5-msg-media-ph">ðµ Audio</div>) : null}

                          {/* ââ documento ââ */}
                          {m.type === 'document' ? (m.mediaUrl ? (
                            <a href={resolveMediaUrl(m.mediaUrl)} target="_blank" rel="noreferrer" download className="wbv5-msg-doc">
                              ð {m.fileName || 'Documento'}
                            </a>
                          ) : <div className="wbv5-msg-media-ph">ð {m.fileName || 'Documento'}</div>) : null}

                          {/* ââ sticker ââ */}
                          {m.type === 'sticker' ? <div style={{ fontSize: '2rem' }}>{m.txt || 'ð¨'}</div> : null}
                          <div className="wbv5-msg-time">{m.time}{m.dir === 's' ? (m.status === 'sent' ? ' ââ' : ' â') : ''}</div>
                        </div>
                      )})}
                    </div>

                    {/* inputs ocultos para adjuntos */}
                    <input ref={fileImgRef} type="file" accept="image/*,video/*" hidden onChange={e => { const f=e.target.files?.[0]; if(f) sendFile(f, f.type.startsWith('video') ? 'video' : 'image'); e.target.value='' }} />
                    <input ref={fileAudRef} type="file" accept="audio/*" hidden onChange={e => { const f=e.target.files?.[0]; if(f) sendFile(f,'audio'); e.target.value='' }} />
                    <input ref={fileDocRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" hidden onChange={e => { const f=e.target.files?.[0]; if(f) sendFile(f,'document'); e.target.value='' }} />

                    {/* Modal de plantillas rÃ¡pidas */}
                    {showTemplatesModal && (
                      <div className="wbv5-tpl-overlay" onClick={() => setShowTemplatesModal(false)}>
                        <div className="wbv5-tpl-popup" onClick={e => e.stopPropagation()}>
                          <div className="wbv5-tpl-head">
                            <strong>Enviar plantilla</strong>
                            <button onClick={() => setShowTemplatesModal(false)}>â</button>
                          </div>
                          <div className="wbv5-tpl-list">
                            {plantillas.map(tpl => (
                              <button key={tpl.id} className="wbv5-tpl-opt" onClick={() => sendTemplate(tpl)}>
                                <span className="wbv5-tpl-cat">{tpl.categoria}</span>
                                <strong>{tpl.nombre}</strong>
                                <small style={{ whiteSpace: 'pre-wrap', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{tpl.mensaje}</small>
                              </button>
                            ))}
                            {plantillas.length === 0 && <div style={{ padding: '1rem', color: '#9ca3af', fontSize: '.75rem', textAlign: 'center' }}>Sin plantillas â crea una en la secciÃ³n ð Plantillas</div>}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="wbv5-cw-input-bar" style={{ position: 'relative' }}>
                      {/* Emoji panel */}
                      {showEmojiPanel && (
                        <div className="wbv5-emoji-panel" ref={emojiPanelRef}>
                          <div className="wbv5-emoji-tabs">
                            <button className={emojiTab === 'emojis' ? 'active' : ''} onClick={() => setEmojiTab('emojis')}>ð Emojis</button>
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
                              {['ðð¥','â¤ï¸â¨','ðð','ðð¯','ðð','ð­ð¤£','ðªð¯','ðâ­','ðð','ðð'].flatMap(pair =>
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
                          <button className="wbv5-rec-stop" onClick={stopRecording}>â¹ Detener</button>
                        </div>
                      ) : (
                        <>
                          {attachOpen && (
                            <div className="wbv5-attach-menu">
                              <button onClick={() => { setAttachOpen(false); fileImgRef.current?.click() }}>ð¼ï¸ Imagen / Video</button>
                              <button onClick={() => { setAttachOpen(false); fileAudRef.current?.click() }}>ðµ Audio</button>
                              <button onClick={() => { setAttachOpen(false); fileDocRef.current?.click() }}>ð Documento</button>
                            </div>
                          )}
                          <button className="wbv5-cw-emoji-btn" title="Emoji y stickers"
                            onClick={() => setShowEmojiPanel(o => !o)}>ð</button>
                          <button className="wbv5-cw-attach" title="Adjuntar" onClick={() => setAttachOpen(o => !o)}>ð</button>
                          <button className="wbv5-cw-tpl-btn" title="Plantillas rÃ¡pidas"
                            onClick={() => setShowTemplatesModal(true)}>ð</button>
                          <input
                            className="wbv5-cw-input" value={inp} disabled={sending}
                            onChange={e => setInp(e.target.value)}
                            onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                            placeholder={sending ? 'Enviando...' : 'Escribe un mensaje...'}
                          />
                          {aiEnabled && (
                            <button
                              className={`wbv5-cw-ai-reply-btn${generatingAiReply ? ' loading' : ''}`}
                              title="ð¤ Generar respuesta IA â analiza el Ãºltimo mensaje y genera el mejor Ã¡ngulo de venta"
                              onClick={generateAiReply}
                              disabled={generatingAiReply || !msgs.some(m => m.dir === 'r')}
                            >
                              {generatingAiReply ? 'â³' : 'ð¤'}
                            </button>
                          )}
                          {inp.trim() ? (
                            <button className="wbv5-cw-send" onClick={send} disabled={sending}>
                              {sending ? 'â³' : 'â¤'}
                            </button>
                          ) : (
                            <button className="wbv5-cw-send wbv5-cw-mic" title="Grabar voz" onClick={startRecording}>ð¤</button>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* ââ Panel de AnÃ¡lisis IA del Cliente ââ */}
              {showAnalysisPanel && active && (
                <div className="wbv5-contact-pnl" style={{ minWidth: 250 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.6rem' }}>
                    <div className="wbv5-cp-title">ð§  AnÃ¡lisis del Cliente</div>
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.7rem', color: '#7c3aed', fontWeight: 700, padding: '.1rem .3rem' }}
                      onClick={() => analyzeClientIntelligence(active.id, msgs)}
                      disabled={analysisLoading || !hasAiKey}
                    >
                      {analysisLoading ? 'â³' : 'ð Actualizar'}
                    </button>
                  </div>
                  {!clientAnalysis[active.id] ? (
                    <div style={{ textAlign: 'center', padding: '1.2rem 0' }}>
                      <div style={{ fontSize: '1.8rem', marginBottom: '.4rem' }}>ð</div>
                      <div style={{ fontSize: '.73rem', color: '#6b7280', marginBottom: '.7rem' }}>Sin anÃ¡lisis todavÃ­a</div>
                      <button
                        className="wbv5-btn wbv5-btn-green wbv5-btn-sm"
                        onClick={() => analyzeClientIntelligence(active.id, msgs)}
                        disabled={analysisLoading || !hasAiKey}
                      >
                        {analysisLoading ? 'â³ Analizando...' : 'ð§  Analizar ahora'}
                      </button>
                      {!hasAiKey && <div style={{ fontSize: '.67rem', color: '#ef4444', marginTop: '.4rem' }}>Requiere API Key IA</div>}
                    </div>
                  ) : (() => {
                    const a = clientAnalysis[active.id]
                    const intencionColor = a.intencion === 'alta' ? '#16a34a' : a.intencion === 'media' ? '#d97706' : '#dc2626'
                    return (
                      <div style={{ fontSize: '.73rem', display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                        <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                          <span style={{ background: '#f0f4ff', color: '#3730a3', borderRadius: 4, padding: '.15rem .4rem', fontWeight: 600 }}>âï¸ {a.estilo}</span>
                          <span style={{ background: '#fef9c3', color: '#78350f', borderRadius: 4, padding: '.15rem .4rem', fontWeight: 600 }}>ð­ {a.tono}</span>
                          <span style={{ background: a.intencion === 'alta' ? '#f0fdf4' : a.intencion === 'media' ? '#fef9c3' : '#fef2f2', color: intencionColor, borderRadius: 4, padding: '.15rem .4rem', fontWeight: 700 }}>
                            ð¯ Compra {a.intencion}
                          </span>
                        </div>
                        {a.intereses?.length > 0 && (
                          <div>
                            <div style={{ fontSize: '.67rem', fontWeight: 700, color: '#374151', marginBottom: '.2rem' }}>ð¡ Intereses</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.2rem' }}>
                              {a.intereses.map((item, i) => (
                                <span key={i} style={{ background: '#ede9fe', color: '#5b21b6', borderRadius: 4, padding: '.1rem .35rem', fontSize: '.67rem' }}>{item}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {a.objeciones?.length > 0 && (
                          <div>
                            <div style={{ fontSize: '.67rem', fontWeight: 700, color: '#dc2626', marginBottom: '.2rem' }}>â ï¸ Objeciones</div>
                            {a.objeciones.map((o, i) => <div key={i} style={{ color: '#b91c1c', fontSize: '.68rem' }}>â¢ {o}</div>)}
                          </div>
                        )}
                        {a.angulo && (
                          <div style={{ background: '#faf5ff', border: '1px solid #ddd6fe', borderRadius: 6, padding: '.4rem .5rem' }}>
                            <div style={{ fontSize: '.65rem', fontWeight: 700, color: '#7c3aed', marginBottom: '.15rem' }}>ð Ãngulo de venta</div>
                            <div style={{ color: '#5b21b6', fontWeight: 600, lineHeight: 1.4 }}>{a.angulo}</div>
                          </div>
                        )}
                        {a.siguiente && (
                          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '.4rem .5rem' }}>
                            <div style={{ fontSize: '.65rem', fontWeight: 700, color: '#15803d', marginBottom: '.15rem' }}>â PrÃ³ximo paso</div>
                            <div style={{ color: '#16a34a', fontWeight: 600, lineHeight: 1.4 }}>{a.siguiente}</div>
                          </div>
                        )}
                        {a.resumen && <div style={{ fontSize: '.67rem', color: '#6b7280', fontStyle: 'italic', borderTop: '1px solid #f3f4f6', paddingTop: '.3rem' }}>{a.resumen}</div>}
                        <div style={{ fontSize: '.62rem', color: '#9ca3af', textAlign: 'right' }}>
                          Actualizado: {a.ts ? new Date(a.ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : 'â'}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              {showContact && active && (
                <div className="wbv5-contact-pnl">
                  <div className="wbv5-cp-title">ð¤ Contacto</div>
                  {active.photoUrl && active.photoUrl.startsWith('http') && (
                    <div style={{ textAlign: 'center', marginBottom: '.75rem' }}>
                      <img src={active.photoUrl} alt={active.name} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e5e7eb' }} />
                    </div>
                  )}
                  <div className="wbv5-cp-row"><div className="wbv5-cp-lbl">Nombre</div><div className="wbv5-cp-val">{active.name || 'â'}</div></div>
                  <div className="wbv5-cp-row"><div className="wbv5-cp-lbl">TelÃ©fono</div><div className="wbv5-cp-val">{active.phone || '+' + active.id}</div></div>
                  <div className="wbv5-cp-row"><div className="wbv5-cp-lbl">Ãltimo mensaje</div><div className="wbv5-cp-val">{active.preview || 'â'}</div></div>
                  <div className="wbv5-cp-row"><div className="wbv5-cp-lbl">Estado bot</div><div className="wbv5-cp-val"><span className="wbv5-badge badge-green">ð¤ Activo</span></div></div>
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
                      {isAiActive(active?.id) ? 'ð¤ ON' : 'âª OFF'}
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
                            {tag} â
                          </button>
                        )
                      })}
                      <div className="wbv5-tag-dd-wrap" ref={tagsDropdownRef}>
                        <button className="wbv5-tag-add" onClick={() => setShowTagsDropdown(o => !o)}>
                          + Etiqueta â¾
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

          {/* ââ FLUJOS â LISTA ââ */}
          {page === 'flujos' && !builderOpen && (
            <div className="wbv5-content">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem' }}>
                <div>
                  <div style={{ fontSize: '.85rem', fontWeight: 800 }}>Flujos de conversaciÃ³n</div>
                  <div style={{ fontSize: '.68rem', color: '#6b7280' }}>Automatiza respuestas y enrutamiento de mensajes</div>
                </div>
                <button className="wbv5-btn wbv5-btn-green" onClick={() => tip('â Selecciona una plantilla abajo para crear tu flujo')}>+ Crear flujo</button>
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
                          <td><button className="wbv5-flow-3btn" onClick={() => tip('âï¸ PrÃ³ximamente: mÃ¡s opciones')}>â¯</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="wbv5-card">
                <div className="wbv5-card-hd">
                  <div className="wbv5-card-title">â¡ Plantillas rÃ¡pidas</div>
                  <span style={{ fontSize: '.68rem', color: '#6b7280' }}>Haz clic para abrir el constructor</span>
                </div>
                <div className="wbv5-card-bd">
                  <div className="wbv5-tmpl-grid">
                    {[
                      { key: 'bienvenida', icon: 'ð', name: 'Bienvenida',   desc: 'Primer mensaje + menÃº', bg: '#d1fae5' },
                      { key: 'carrito',    icon: 'ð', name: 'Carrito',      desc: 'Recuperar abandono',    bg: '#dbeafe' },
                      { key: 'soporte',    icon: 'ð', name: 'Soporte',      desc: 'AtenciÃ³n al cliente',   bg: '#ede9fe' },
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

          {/* ââ FLUJOS â BUILDER ââ */}
          {page === 'flujos' && builderOpen && (
            <div className="wbv5-builder">
              <div className="wbv5-builder-header">
                <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => { setBuilderOpen(false); setSelNode(null) }}>â Flujos</button>
                <span style={{ fontSize: '.8rem', fontWeight: 700, marginLeft: '.5rem' }}>
                  {FLOWS_LIST.find(f => f.key === curFlow)?.name || curFlow}
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '.4rem' }}>
                  <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => tip('âï¸ ConfiguraciÃ³n avanzada prÃ³ximamente')}>âï¸ Avanzado</button>
                  <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={() => tip('â Flujo guardado en n8n')}>ð¾ Guardar</button>
                  <button className="wbv5-btn wbv5-btn-blue wbv5-btn-sm" onClick={() => tip('ð Flujo publicado y activo')}>Publicar â¶</button>
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
                    <button className="wbv5-zoom-btn" onClick={() => { setZoom(0.88); setPan({ x: 30, y: 18 }) }}>â¡</button>
                    <button className="wbv5-zoom-btn" onClick={() => setZoom(z => Math.max(z - .12, .22))}>â</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ââ PLANTILLAS ââ */}
          {page === 'templates' && (
            <div className="wbv5-content">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.2rem' }}>
                <div>
                  <div style={{ fontSize: '.85rem', fontWeight: 800 }}>ð Plantillas de mensajes</div>
                  <div style={{ fontSize: '.68rem', color: '#6b7280' }}>Mensajes rÃ¡pidos para el chat y disparadores de palabras clave</div>
                </div>
                <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={() => setEditPlantilla({ isNew: true, nombre: '', categoria: 'Ventas', mensaje: '' })}>+ Nueva plantilla</button>
              </div>

              {/* ââ Formulario crear/editar ââ */}
              {editPlantilla && (
                <div className="wbv5-card" style={{ border: '2px solid #2563eb', marginTop: '.75rem', marginBottom: '.75rem' }}>
                  <div className="wbv5-card-hd">
                    <div className="wbv5-card-title">âï¸ {editPlantilla.isNew ? 'Nueva' : 'Editar'} plantilla</div>
                    <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => setEditPlantilla(null)}>â Cancelar</button>
                  </div>
                  <div className="wbv5-card-bd" style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                    <div className="wbv5-form-row">
                      <div className="wbv5-form-lbl">Nombre de la plantilla</div>
                      <input className="wbv5-form-input" value={editPlantilla.nombre} onChange={e => setEditPlantilla(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Bienvenida, ConfirmaciÃ³n de pedido..." />
                    </div>
                    <div className="wbv5-form-row">
                      <div className="wbv5-form-lbl">CategorÃ­a</div>
                      <select className="wbv5-form-input" value={editPlantilla.categoria} onChange={e => setEditPlantilla(p => ({ ...p, categoria: e.target.value }))}>
                        <option>Inicio</option><option>Ventas</option><option>Pedidos</option><option>Seguimiento</option><option>Soporte</option><option>General</option>
                      </select>
                    </div>
                    <div className="wbv5-form-row">
                      <div className="wbv5-form-lbl" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Mensaje ({(editPlantilla.mensaje || '').length}/1000)</span>
                        <span style={{ fontSize: '.62rem', color: '#9ca3af' }}>Variables: {'{nombre}'} {'{telefono}'} {'{tienda}'}</span>
                      </div>
                      <textarea className="wbv5-form-input" rows={5} value={editPlantilla.mensaje} onChange={e => setEditPlantilla(p => ({ ...p, mensaje: e.target.value }))} placeholder="Escribe el mensaje. Usa {nombre} para personalizar con el nombre del cliente." style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />
                    </div>
                    <div style={{ display: 'flex', gap: '.5rem' }}>
                      <button className="wbv5-btn wbv5-btn-green" onClick={() => {
                        if (!editPlantilla.nombre.trim() || !editPlantilla.mensaje.trim()) { tip('â ï¸ Completa nombre y mensaje'); return }
                        const list = editPlantilla.isNew
                          ? [...plantillas, { id: `tpl_${Date.now()}`, nombre: editPlantilla.nombre, categoria: editPlantilla.categoria, mensaje: editPlantilla.mensaje }]
                          : plantillas.map(p => p.id === editPlantilla.id ? { id: p.id, nombre: editPlantilla.nombre, categoria: editPlantilla.categoria, mensaje: editPlantilla.mensaje } : p)
                        savePlantillas(list); setEditPlantilla(null); tip('â Plantilla guardada')
                      }}>ð¾ Guardar plantilla</button>
                      <button className="wbv5-btn wbv5-btn-outline" onClick={() => setEditPlantilla(null)}>Cancelar</button>
                    </div>
                  </div>
                </div>
              )}

              {/* ââ Lista de plantillas ââ */}
              <div className="wbv5-card" style={{ marginTop: '.75rem' }}>
                <div className="wbv5-card-hd">
                  <div className="wbv5-card-title">Mis plantillas ({plantillas.length})</div>
                  {plantillas.length === 0 && (
                    <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => { savePlantillas(DEFAULT_PLANTILLAS); tip('â Plantillas de ejemplo cargadas') }}>ð¥ Cargar ejemplos</button>
                  )}
                </div>
                <div style={{ padding: 0 }}>
                  {plantillas.map(pl => (
                    <div key={pl.id} style={{ padding: '.75rem 1rem', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'flex-start', gap: '.75rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.2rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '.8rem', fontWeight: 700 }}>{pl.nombre}</span>
                          <span style={{ background: '#eff6ff', color: '#3b82f6', fontSize: '.6rem', padding: '1px 7px', borderRadius: 4, fontWeight: 600 }}>{pl.categoria}</span>
                        </div>
                        <div style={{ fontSize: '.68rem', color: '#6b7280', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', whiteSpace: 'pre-wrap' }}>{pl.mensaje}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '.3rem', flexShrink: 0 }}>
                        <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" title="Editar" onClick={() => setEditPlantilla({ ...pl, isNew: false })}>âï¸</button>
                        <button className="wbv5-btn wbv5-btn-sm" title="Duplicar" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }} onClick={() => { const copy = { ...pl, id: `tpl_${Date.now()}`, nombre: pl.nombre + ' (copia)' }; savePlantillas([...plantillas, copy]); tip('â Plantilla duplicada') }}>ð</button>
                        <button className="wbv5-btn wbv5-btn-sm" title="Eliminar" style={{ background: '#fee2e2', color: '#dc2626', border: 'none' }} onClick={() => { if (window.confirm(`Â¿Eliminar "${pl.nombre}"?`)) { savePlantillas(plantillas.filter(p => p.id !== pl.id)); tip('ðï¸ Plantilla eliminada') } }}>ðï¸</button>
                      </div>
                    </div>
                  ))}
                  {plantillas.length === 0 && (
                    <div className="wbv5-empty-state" style={{ padding: '2.5rem 1rem' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>ð</div>
                      <div style={{ fontSize: '.8rem', fontWeight: 700, color: '#6b7280', marginBottom: '.3rem' }}>Sin plantillas</div>
                      <div style={{ fontSize: '.72rem', color: '#9ca3af', marginBottom: '.75rem' }}>Crea mensajes rÃ¡pidos para enviar desde el chat o en disparadores de palabras clave</div>
                      <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={() => { savePlantillas(DEFAULT_PLANTILLAS); tip('â Plantillas de SÃ¡nate cargadas') }}>ð¥ Cargar plantillas de SÃ¡nate</button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ fontSize: '.68rem', color: '#9ca3af', marginTop: '.75rem', lineHeight: 1.5 }}>
                ð¡ <strong>CÃ³mo usarlas:</strong> En el chat, usa el botÃ³n ð del input. En â¡ Disparadores, selecciona una plantilla al configurar un trigger de palabra clave.
              </div>
            <BtnMsgEditor BU={BU} sec={DEFAULT_SECRET}/>
            </div>
          )}

          {/* ââ CLIENTES ââ */}
          {page === 'clientes' && (
            <div className="wbv5-content">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.85rem' }}>
                <div>
                  <div style={{ fontSize: '.85rem', fontWeight: 800 }}>ð¥ Clientes</div>
                  <div style={{ fontSize: '.68rem', color: '#6b7280' }}>Clientes que han escrito al WhatsApp â guardados automÃ¡ticamente</div>
                </div>
                <div style={{ display: 'flex', gap: '.4rem' }}>
                  <input className="wbv5-il-search" placeholder="Buscar cliente..." value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} style={{ width: 180 }} />
                  <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => { navigator.clipboard?.writeText(clientes.map(c => `${c.name}\t${c.phone}\t${c.pais}\t${c.etiqueta}\t${c.primerMensaje}`).join('\n')); tip('ð Tabla copiada') }}>ð Exportar</button>
                </div>
              </div>
              {clienteDetail ? (
                <div className="wbv5-card">
                  <div className="wbv5-card-hd">
                    <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => setClienteDetail(null)}>â Volver</button>
                    <div className="wbv5-card-title" style={{ marginLeft: '.5rem' }}>{clienteDetail.name || clienteDetail.phone}</div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '.4rem' }}>
                      <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={() => { updateCliente(clienteDetail.id, clienteDetail); tip('â Guardado'); setClienteDetail(null) }}>ð¾ Guardar</button>
                      <button className="wbv5-btn wbv5-btn-red wbv5-btn-sm" onClick={() => { if(window.confirm('Â¿Eliminar cliente?')) deleteCliente(clienteDetail.id) }}>ðï¸</button>
                    </div>
                  </div>
                  <div className="wbv5-card-bd">
                    <div className="wbv5-cli-form-grid">
                      {[
                        { lbl: 'Nombre', key: 'name' }, { lbl: 'TelÃ©fono', key: 'phone' },
                        { lbl: 'PaÃ­s / RegiÃ³n', key: 'ciudad' }, { lbl: 'DirecciÃ³n', key: 'direccion' },
                        { lbl: 'Etiqueta', key: 'etiqueta' }, { lbl: 'Total Pedidos', key: 'totalPedidos', type: 'number' },
                        { lbl: 'No recibidos', key: 'noRecibidos', type: 'number' }, { lbl: 'Primer mensaje', key: 'primerMensaje' },
                        { lbl: 'Ãltimo mensaje', key: 'ultimoMensaje' },
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
                    <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" style={{ marginTop: '.4rem' }} onClick={() => { const t = `Nombre: ${clienteDetail.name}\nTelÃ©fono: ${clienteDetail.phone}\nPaÃ­s: ${clienteDetail.ciudad}\nDirecciÃ³n: ${clienteDetail.direccion}\nPedidos: ${clienteDetail.totalPedidos}\nEtiqueta: ${clienteDetail.etiqueta}`; navigator.clipboard?.writeText(t); tip('ð Datos copiados') }}>ð Copiar datos</button>
                  </div>
                </div>
              ) : (
                <div className="wbv5-card">
                  <div style={{ padding: 0 }}>
                    {clientes.filter(c => !clienteSearch || (c.name+c.phone+c.ciudad).toLowerCase().includes(clienteSearch.toLowerCase())).length === 0 ? (
                      <div className="wbv5-empty-state" style={{ padding: '2.5rem 1rem' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>ð¥</div>
                        <div style={{ fontSize: '.85rem', fontWeight: 700, color: '#6b7280' }}>Sin clientes aÃºn</div>
                        <div style={{ fontSize: '.72rem', color: '#9ca3af' }}>Los clientes se guardan automÃ¡ticamente cuando escriben al WhatsApp</div>
                      </div>
                    ) : (
                      <table className="wbv5-flows-table">
                        <thead><tr><th>Cliente</th><th>TelÃ©fono</th><th>RegiÃ³n</th><th>Etiqueta</th><th>Pedidos</th><th>Primer msg</th><th></th></tr></thead>
                        <tbody>
                          {clientes.filter(c => !clienteSearch || (c.name+c.phone+c.ciudad).toLowerCase().includes(clienteSearch.toLowerCase())).map(c => (
                            <tr key={c.id}>
                              <td style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                                {c.fotoUrl ? <img src={c.fotoUrl} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.65rem', fontWeight: 800, flexShrink: 0 }}>{(c.name || c.phone).substring(0,2).toUpperCase()}</div>}
                                <span style={{ fontWeight: 600 }}>{c.name || 'â'}</span>
                              </td>
                              <td style={{ fontSize: '.72rem', color: '#6b7280' }}>{c.phone}</td>
                              <td style={{ fontSize: '.7rem' }}>{c.flag} {c.ciudad || 'â'}</td>
                              <td><span style={{ background: c.etiqueta === 'Nuevo lead' ? '#dbeafe' : c.etiqueta === 'Cliente VIP' ? '#ede9fe' : '#dcfce7', color: c.etiqueta === 'Nuevo lead' ? '#1d4ed8' : c.etiqueta === 'Cliente VIP' ? '#5b21b6' : '#166534', borderRadius: 20, padding: '.15rem .55rem', fontSize: '.65rem', fontWeight: 700 }}>{c.etiqueta}</span></td>
                              <td style={{ textAlign: 'center' }}>{c.totalPedidos}</td>
                              <td style={{ fontSize: '.65rem', color: '#9ca3af' }}>{c.primerMensaje}</td>
                              <td>
                                <button className="wbv5-flow-3btn" onClick={() => setClienteDetail({...c})}>âï¸</button>
                                <button className="wbv5-flow-3btn" onClick={() => { navigator.clipboard?.writeText(`${c.name} | ${c.phone} | ${c.ciudad}`); tip('ð Copiado') }}>ð</button>
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

          {/* ââ DISPARADORES ââ */}
          {page === 'disparadores' && (
            <div className="wbv5-content">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.2rem' }}>
                <div>
                  <div style={{ fontSize: '.85rem', fontWeight: 800 }}>â¡ Disparadores</div>
                  <div style={{ fontSize: '.68rem', color: '#6b7280' }}>Mensajes automÃ¡ticos basados en tiempo e interacciÃ³n del cliente</div>
                </div>
                <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={() => setEditTrigger({ id: `tr${Date.now()}`, name: '', condition: 'no_reply', delay: 60, unit: 'min', producto: '', message: '', active: true, mediaType: null, mediaUrl: '' })}>+ Nuevo disparador</button>
              </div>

              {/* ââ Banner: contactos con disparadores pausados ââ */}
              {Object.values(triggerContactMap).filter(v => v === false).length > 0 && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '.65rem 1rem', marginBottom: '.75rem', display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>â¡</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '.76rem', fontWeight: 700, color: '#92400e' }}>
                      {Object.values(triggerContactMap).filter(v => v === false).length} contacto(s) con disparadores pausados
                    </span>
                    <span style={{ fontSize: '.66rem', color: '#b45309', marginLeft: '.4rem' }}>
                      â ActÃ­valo en cada chat desde el botÃ³n â¡ Auto OFF del header
                    </span>
                  </div>
                  <button
                    className="wbv5-btn wbv5-btn-sm"
                    style={{ background: '#f59e0b', color: '#fff', border: 'none', flexShrink: 0 }}
                    onClick={() => {
                      setTriggerContactMap({})
                      try { localStorage.setItem('wa_trigger_contact_map', '{}') } catch {}
                      tip('â¡ Disparadores reactivados para todos los contactos')
                    }}
                  >
                    ð Reactivar todos
                  </button>
                </div>
              )}

              {/* Panel de ediciÃ³n de disparador */}
              {editTrigger && (
                <div className="wbv5-card" style={{ border: '2px solid #2563eb' }}>
                  <div className="wbv5-card-hd">
                    <div className="wbv5-card-title">âï¸ {editTrigger.id.startsWith('tr') && triggers.find(t => t.id === editTrigger.id) ? 'Editar' : 'Nuevo'} Disparador</div>
                    <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => setEditTrigger(null)}>â</button>
                  </div>
                  <div className="wbv5-card-bd">
                    <div className="wbv5-cli-form-grid">
                      <div className="wbv5-form-row">
                        <div className="wbv5-form-lbl">Nombre del disparador</div>
                        <input className="wbv5-form-input" value={editTrigger.name} onChange={e => setEditTrigger(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Sin respuesta 1 hora" />
                      </div>
                      <div className="wbv5-form-row">
                        <div className="wbv5-form-lbl">ð¦ Producto / Plantilla <span style={{ fontWeight: 400, color: '#9ca3af' }}>(nombre del producto a promover)</span></div>
                        <input
                          className="wbv5-form-input"
                          value={editTrigger.producto || ''}
                          onChange={e => setEditTrigger(p => ({ ...p, producto: e.target.value }))}
                          placeholder="Ej: Combo Detox 30 dÃ­as, Pack EnergÃ­a Total..."
                          list="productos-list"
                        />
                        <datalist id="productos-list">
                          {trainingPrompt.match(/^[-â¢Â·]\s*(.+?):/gm)?.slice(0, 12).map((m, i) => (
                            <option key={i} value={m.replace(/^[-â¢Â·]\s*/, '').replace(/:.*/, '').trim()} />
                          ))}
                        </datalist>
                        <div style={{ fontSize: '.6rem', color: '#9ca3af', marginTop: '.15rem' }}>ð¡ La IA genera el mensaje especÃ­fico para este producto cuando presionas ð¤ Generar</div>
                      </div>
                      <div className="wbv5-form-row">
                        <div className="wbv5-form-lbl">CondiciÃ³n</div>
                        <select className="wbv5-form-input" value={editTrigger.condition} onChange={e => setEditTrigger(p => ({ ...p, condition: e.target.value }))}>
                          <option value="no_reply">Sin respuesta despuÃ©s de X tiempo</option>
                          <option value="seen">Mensaje visto pero sin responder</option>
                          <option value="no_purchase">Sin compra despuÃ©s de X tiempo</option>
                          <option value="keyword">ð Palabra clave detectada (instantÃ¡neo)</option>
                          <option value="first_message">Primer mensaje recibido</option>
                        </select>
                      </div>
                      {editTrigger.condition === 'keyword' ? (
                        <div className="wbv5-form-row">
                          <div className="wbv5-form-lbl">ð Palabras clave <span style={{ fontWeight: 400, color: '#9ca3af' }}>(separa con coma)</span></div>
                          <input
                            className="wbv5-form-input"
                            value={editTrigger.keyword || ''}
                            onChange={e => setEditTrigger(p => ({ ...p, keyword: e.target.value }))}
                            placeholder="Ej: precio, cuÃ¡nto vale, cuanto cuesta, envÃ­o"
                          />
                          <div style={{ fontSize: '.62rem', color: '#9ca3af', marginTop: '.15rem' }}>
                            ð¡ Cuando el cliente escriba alguna de estas palabras, se enviarÃ¡ automÃ¡ticamente el mensaje de abajo
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
                              <option value="d">DÃ­as</option>
                            </select>
                          </div>
                        </div>
                      )}
                      <div className="wbv5-form-row">
                        <div className="wbv5-form-lbl">Tipo de media (opcional)</div>
                        <select className="wbv5-form-input" value={editTrigger.mediaType || ''} onChange={e => setEditTrigger(p => ({ ...p, mediaType: e.target.value || null }))}>
                          <option value="">Solo texto</option>
                          <option value="image">ð¼ï¸ Imagen</option>
                          <option value="video">ð¥ Video</option>
                          <option value="audio">ðµ Audio</option>
                          <option value="document">ð Documento</option>
                        </select>
                      </div>
                    </div>
                    {editTrigger.mediaType && (
                      <div className="wbv5-form-row">
                        <div className="wbv5-form-lbl">URL del archivo media</div>
                        <input className="wbv5-form-input" value={editTrigger.mediaUrl || ''} onChange={e => setEditTrigger(p => ({ ...p, mediaUrl: e.target.value }))} placeholder="https://... o ruta relativa" />
                      </div>
                    )}
                    {/* Selector de plantilla para triggers de palabra clave */}
                    {editTrigger.condition === 'keyword' && plantillas.length > 0 && (
                      <div className="wbv5-form-row">
                        <div className="wbv5-form-lbl">ð Cargar desde plantilla guardada</div>
                        <select
                          className="wbv5-form-input"
                          defaultValue=""
                          onChange={e => {
                            if (!e.target.value) return
                            const pl = plantillas.find(p => p.id === e.target.value)
                            if (pl) setEditTrigger(prev => ({ ...prev, message: pl.mensaje }))
                            e.target.value = ''
                          }}
                        >
                          <option value="">â Seleccionar plantilla â</option>
                          {plantillas.map(pl => (
                            <option key={pl.id} value={pl.id}>{pl.nombre} ({pl.categoria})</option>
                          ))}
                        </select>
                        <div style={{ fontSize: '.62rem', color: '#9ca3af', marginTop: '.15rem' }}>
                          ð¡ Al seleccionar se carga el texto en el campo de abajo ð
                        </div>
                      </div>
                    )}
                    <div className="wbv5-form-row">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.28rem' }}>
                        <div className="wbv5-form-lbl" style={{ margin: 0 }}>
                          {editTrigger.condition === 'keyword' ? 'ð Mensaje a enviar' : 'Mensaje'} ({(editTrigger.message || '').length}/1000 chars)
                        </div>
                        <button className={`wbv5-btn wbv5-btn-sm ${aiEnabled ? 'wbv5-btn-ai-on' : 'wbv5-btn-outline'}`} style={{ fontSize: '.65rem' }} onClick={() => generateTriggerMsg(editTrigger.name || 'seguimiento')} disabled={generatingTrigger}>
                          {generatingTrigger ? 'â³ Generando...' : 'ð¤ Generar con IA'}
                        </button>
                      </div>
                      <textarea className="wbv5-form-input" rows={4} value={editTrigger.message} onChange={e => setEditTrigger(p => ({ ...p, message: e.target.value }))} placeholder="Escribe el mensaje o genera con IA. Usa {nombre} para personalizar." style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />
                      <div style={{ fontSize: '.62rem', color: '#9ca3af', marginTop: '.18rem' }}>Variables: {'{nombre}'} {'{telefono}'} {'{tienda}'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                      <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={() => saveTriggerEdit(editTrigger)}>ð¾ Guardar disparador</button>
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
                      <div style={{ fontSize: '2rem' }}>â¡</div>
                      <div>Sin disparadores. Crea uno para automatizar seguimientos.</div>
                    </div>
                  ) : triggers.map(t => (
                    <div key={t.id} className="wbv5-trigger-row">
                      <div className="wbv5-tr-left">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.18rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '.78rem', fontWeight: 700, color: '#111827' }}>{t.name || 'Sin nombre'}</span>
                          <span className={`wbv5-badge ${t.active ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '.6rem' }}>{t.active ? 'â Activo' : 'â¸ Pausado'}</span>
                          {t.producto && <span style={{ background: '#ede9fe', color: '#5b21b6', borderRadius: 20, padding: '.1rem .5rem', fontSize: '.62rem', fontWeight: 700 }}>ð¦ {t.producto}</span>}
                        </div>
                        <div style={{ fontSize: '.68rem', color: '#6b7280', display: 'flex', gap: '.8rem', flexWrap: 'wrap' }}>
                          {t.condition === 'keyword'
                            ? <span>ð Palabras: <strong style={{ color: '#5b21b6' }}>{(t.keyword || '').split(',').slice(0,3).map(k=>k.trim()).join(', ')}{(t.keyword||'').split(',').length > 3 ? 'â¦' : ''}</strong></span>
                            : <span>â± {t.delay} {t.unit === 'min' ? 'minutos' : t.unit === 'h' ? 'horas' : 'dÃ­as'}</span>
                          }
                          <span>ð¯ {t.condition === 'no_reply' ? 'Sin respuesta' : t.condition === 'seen' ? 'Visto sin responder' : t.condition === 'no_purchase' ? 'Sin compra' : t.condition === 'keyword' ? 'â¡ InstantÃ¡neo' : 'Primer mensaje'}</span>
                          {t.mediaType && <span>ð {t.mediaType}</span>}
                        </div>
                        <div style={{ fontSize: '.7rem', color: '#374151', marginTop: '.2rem', maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>ð¬ {t.message}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '.3rem', flexShrink: 0, alignItems: 'center' }}>
                        <button className={`wbv5-btn wbv5-btn-sm ${t.active ? 'wbv5-btn-outline' : 'wbv5-btn-green'}`} onClick={() => toggleTrigger(t.id)}>{t.active ? 'â¸' : 'â¶'}</button>
                        <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => setEditTrigger({...t})}>âï¸</button>
                        <button className="wbv5-btn wbv5-btn-sm" style={{ background: '#fee2e2', color: '#991b1b' }} onClick={() => deleteTrigger(t.id)}>ðï¸</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Flujos de seguimiento recomendados */}
              <div className="wbv5-card">
                <div className="wbv5-card-hd">
                  <div className="wbv5-card-title">ð Secuencias de seguimiento recomendadas</div>
                  <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={() => { saveTriggers([...triggers, ...DEFAULT_TRIGGERS.filter(d => !triggers.find(t => t.name === d.name))]); tip('â Secuencias agregadas') }}>+ Agregar todas</button>
                </div>
                <div className="wbv5-card-bd">
                  <div style={{ fontSize: '.72rem', color: '#6b7280', marginBottom: '.75rem', lineHeight: 1.5 }}>
                    Las 3 mejores secuencias de cierre de ventas optimizadas con IA para WhatsApp
                  </div>
                  {[
                    { icon: 'â¡', title: '1h sin respuesta', desc: 'ReactivaciÃ³n amable â pregunta de interÃ©s', time: '1 hora', color: '#dbeafe', tc: '#1d4ed8' },
                    { icon: 'ðï¸', title: 'Visto sin responder 3h', desc: 'Oferta personalizada â urgencia suave', time: '3 horas', color: '#fef3c7', tc: '#92400e' },
                    { icon: 'ð¥', title: 'Cierre 24h', desc: 'Ãltima oportunidad â descuento + CTA directo', time: '24 horas', color: '#dcfce7', tc: '#166534' },
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

              {/* ââ Palabras Clave recomendadas ââ */}
              <div className="wbv5-card">
                <div className="wbv5-card-hd">
                  <div>
                    <div className="wbv5-card-title">ð Disparadores de palabras clave</div>
                    <div style={{ fontSize: '.65rem', color: '#6b7280' }}>Se disparan al instante cuando el cliente escribe esa palabra</div>
                  </div>
                  <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={() => {
                    const toAdd = DEFAULT_KW_TRIGGERS.filter(d => !triggers.find(t => t.name === d.name))
                    if (!toAdd.length) { tip('Ya tienes todos los disparadores de palabras clave'); return }
                    saveTriggers([...triggers, ...toAdd])
                    tip(`â ${toAdd.length} disparadores de palabras clave agregados`)
                  }}>+ Agregar todos</button>
                </div>
                <div className="wbv5-card-bd">
                  <div style={{ fontSize: '.72rem', color: '#6b7280', marginBottom: '.75rem', lineHeight: 1.5 }}>
                    Respuestas automÃ¡ticas <strong>instantÃ¡neas</strong> cuando el cliente menciona una palabra clave. Funciona con IA ON y OFF.
                  </div>
                  {DEFAULT_KW_TRIGGERS.map((kw, i) => {
                    const alreadyAdded = triggers.find(t => t.name === kw.name)
                    const kwPreview = kw.keyword.split(',').slice(0, 3).map(k => k.trim()).join(', ')
                    const colors = ['#f0fdf4','#fefce8','#eff6ff','#fdf4ff']
                    const tcs    = ['#166534','#854d0e','#1d4ed8','#7e22ce']
                    return (
                      <div key={kw.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '.75rem', padding: '.6rem 0', borderBottom: i < DEFAULT_KW_TRIGGERS.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: colors[i], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>ð</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '.76rem', fontWeight: 700, color: '#111827', marginBottom: '.12rem' }}>{kw.name.replace('ð ', '')}</div>
                          <div style={{ fontSize: '.63rem', color: '#6b7280' }}>Palabras: <span style={{ color: tcs[i], fontWeight: 600 }}>{kwPreview}â¦</span></div>
                          <div style={{ fontSize: '.63rem', color: '#374151', marginTop: '.1rem', maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            ð¬ {kw.message.substring(0, 70)}â¦
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem', alignItems: 'flex-end', flexShrink: 0 }}>
                          <span style={{ background: colors[i], color: tcs[i], borderRadius: 20, padding: '.18rem .55rem', fontSize: '.6rem', fontWeight: 700 }}>â¡ InstantÃ¡neo</span>
                          {alreadyAdded ? (
                            <span style={{ fontSize: '.6rem', color: '#16a34a', fontWeight: 600 }}>â Ya agregado</span>
                          ) : (
                            <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" style={{ fontSize: '.62rem', padding: '.2rem .5rem' }} onClick={() => {
                              saveTriggers([...triggers, { ...kw, id: `kw_${Date.now()}` }])
                              tip(`â Disparador "${kw.name.replace('ð ', '')}" agregado`)
                            }}>+ Agregar</button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <div style={{ marginTop: '.75rem', padding: '.6rem', background: '#f0fdf4', borderRadius: 8, fontSize: '.65rem', color: '#166534', lineHeight: 1.5 }}>
                    ð¡ <strong>CÃ³mo funciona:</strong> Cuando el cliente escriba cualquiera de las palabras clave, el bot responde automÃ¡ticamente con el mensaje configurado â sin importar si la IA estÃ¡ ON u OFF. TambiÃ©n puedes crear tus propios disparadores con <strong>+ Nuevo disparador â ð Palabra clave</strong>.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ââ ENTRENAMIENTO IA ââ */}
          {page === 'entrenamiento' && (
            <div className="wbv5-content">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.85rem' }}>
                <div>
                  <div style={{ fontSize: '.85rem', fontWeight: 800 }}>ð§  Entrenamiento IA</div>
                  <div style={{ fontSize: '.68rem', color: '#6b7280' }}>Dale contexto completo a tu bot para que sea el mejor cerrador de ventas del mundo</div>
                </div>
                <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                  <button className={`wbv5-btn wbv5-btn-sm ${generatingPrompt ? 'wbv5-btn-outline' : 'wbv5-btn-ai-on'}`} onClick={generateWinnerPrompt} disabled={generatingPrompt}>
                    {generatingPrompt ? 'â³ Generando...' : 'ð¤ Generar prompt ganador'}
                  </button>
                  <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={() => { saveTraining(trainingPrompt); tip('â Entrenamiento guardado') }}>ð¾ Guardar</button>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '.3rem', marginBottom: '.75rem', flexWrap: 'wrap' }}>
                {[
                  { id: 'asistente',  label: 'ð Asistente IA' },
                  { id: 'contexto',   label: 'ð¢ Contexto empresa' },
                  { id: 'memoria',    label: 'ð§  Memoria n8n' },
                  { id: 'prueba',     label: 'ð§ª Probar bot' },
                ].map(tab => (
                  <button key={tab.id} className={`wbv5-btn wbv5-btn-sm ${trainingTab === tab.id ? 'wbv5-btn-blue' : 'wbv5-btn-outline'}`} onClick={() => setTrainingTab(tab.id)}>{tab.label}</button>
                ))}
              </div>

              {/* Tab: Asistente IA â Wizard */}
              {trainingTab === 'asistente' && (
                <div className="wbv5-card">
                  <div className="wbv5-card-hd">
                    <div className="wbv5-card-title">ð Asistente de entrenamiento IA</div>
                    <span className="wbv5-badge" style={{ background: '#ede9fe', color: '#5b21b6' }}>â¨ Wizard</span>
                  </div>
                  <div className="wbv5-card-bd">
                    <div style={{ fontSize: '.73rem', color: '#374151', marginBottom: '.85rem', lineHeight: 1.6, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '.65rem .9rem' }}>
                      ð¯ <strong>Â¿CÃ³mo funciona?</strong> Llena los datos de tu negocio y la IA genera automÃ¡ticamente el entrenamiento ganador. El bot primero <strong>conserva la conversaciÃ³n siendo amigable</strong>, y despuÃ©s busca el <strong>cierre de ventas de forma natural</strong>.
                    </div>
                    <div style={{ display: 'grid', gap: '.6rem' }}>
                      <div className="wbv5-form-row">
                        <div className="wbv5-form-lbl">ð¢ Nombre de tu empresa / negocio *</div>
                        <input className="wbv5-form-input" value={wizardData.empresa} onChange={e => setWizardData(p => ({ ...p, empresa: e.target.value }))} placeholder="Ej: Sanate Colombia" />
                      </div>
                      <div className="wbv5-form-row">
                        <div className="wbv5-form-lbl">ð Â¿QuÃ© vendes? DescripciÃ³n breve</div>
                        <input className="wbv5-form-input" value={wizardData.descripcion} onChange={e => setWizardData(p => ({ ...p, descripcion: e.target.value }))} placeholder="Ej: Suplementos naturales para salud y bienestar" />
                      </div>
                      <div className="wbv5-form-row">
                        <div className="wbv5-form-lbl">ðï¸ Productos principales *</div>
                        <textarea className="wbv5-form-input" rows={3} value={wizardData.productos} onChange={e => setWizardData(p => ({ ...p, productos: e.target.value }))} placeholder={'Ej:\n- Combo Detox 30 dÃ­as\n- Pack EnergÃ­a Total\n- Kit Bienestar Premium'} style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
                      </div>
                      <div className="wbv5-form-row">
                        <div className="wbv5-form-lbl">ð° Precios de tus productos *</div>
                        <textarea className="wbv5-form-input" rows={3} value={wizardData.precios} onChange={e => setWizardData(p => ({ ...p, precios: e.target.value }))} placeholder={'Ej:\n- Combo Detox 30 dÃ­as: $150.000\n- Pack EnergÃ­a Total: $89.000\n- Kit Bienestar Premium: $220.000'} style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
                      </div>
                      <div className="wbv5-form-row">
                        <div className="wbv5-form-lbl">ð Combos y ofertas especiales</div>
                        <textarea className="wbv5-form-input" rows={2} value={wizardData.combos} onChange={e => setWizardData(p => ({ ...p, combos: e.target.value }))} placeholder="Ej: 2x1 en Detox, envÃ­o gratis por compras +$200.000" style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
                      </div>
                      <div className="wbv5-form-row">
                        <div className="wbv5-form-lbl">ð¬ Estilo de comunicaciÃ³n del bot</div>
                        <select className="wbv5-form-input" value={wizardData.estilo} onChange={e => setWizardData(p => ({ ...p, estilo: e.target.value }))}>
                          <option value="amigable">ð Amigable y cercano</option>
                          <option value="profesional">ð Profesional y formal</option>
                          <option value="energico">â¡ EnergÃ©tico y motivador</option>
                          <option value="suave">ð¸ Suave y empÃ¡tico</option>
                        </select>
                      </div>
                      <div className="wbv5-form-row">
                        <div className="wbv5-form-lbl">ð Objeciones comunes (cÃ³mo las manejas)</div>
                        <textarea className="wbv5-form-input" rows={2} value={wizardData.objeciones} onChange={e => setWizardData(p => ({ ...p, objeciones: e.target.value }))} placeholder={'Ej: "EstÃ¡ muy caro" â Ofrezco plan de pago o combo mÃ¡s econÃ³mico'} style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
                        <div className="wbv5-form-row">
                          <div className="wbv5-form-lbl">ð EnvÃ­o y logÃ­stica</div>
                          <input className="wbv5-form-input" value={wizardData.envio} onChange={e => setWizardData(p => ({ ...p, envio: e.target.value }))} placeholder="Ej: Todo Colombia, 2-3 dÃ­as, $12.000" />
                        </div>
                        <div className="wbv5-form-row">
                          <div className="wbv5-form-lbl">ð Horario de atenciÃ³n</div>
                          <input className="wbv5-form-input" value={wizardData.horario} onChange={e => setWizardData(p => ({ ...p, horario: e.target.value }))} placeholder="Ej: Lun-SÃ¡b 8am-6pm" />
                        </div>
                      </div>
                      <div className="wbv5-form-row">
                        <div className="wbv5-form-lbl">â¨ Info adicional (mÃ©todos de pago, certificaciones, testimonios...)</div>
                        <textarea className="wbv5-form-input" rows={2} value={wizardData.extra} onChange={e => setWizardData(p => ({ ...p, extra: e.target.value }))} placeholder="Nequi, Bancolombia, contraentrega, 500+ clientes satisfechos..." style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
                      </div>
                    </div>
                    {!hasAiKey && (
                      <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, padding: '.6rem .9rem', fontSize: '.73rem', color: '#713f12', marginTop: '.75rem' }}>
                        â ï¸ Necesitas una <strong>API Key</strong> configurada en <strong>Ajustes â API & Tokens</strong>. Puedes usar OpenAI (de pago) o <strong>Google Gemini gratis</strong> (aistudio.google.com/apikey).
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '.5rem', marginTop: '.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <button
                        className={`wbv5-btn wbv5-btn-sm ${generatingWizard ? 'wbv5-btn-outline' : 'wbv5-btn-ai-on'}`}
                        onClick={generateTrainingWizard}
                        disabled={generatingWizard || !hasAiKey}
                        style={{ flex: 1, minWidth: 200, fontSize: '.78rem', padding: '.55rem 1rem' }}
                      >
                        {generatingWizard ? 'â³ Generando entrenamiento ganador...' : 'ð¯ Generar entrenamiento ganador'}
                      </button>
                      <button
                        className="wbv5-btn wbv5-btn-outline wbv5-btn-sm"
                        onClick={() => setWizardData({ empresa: '', descripcion: '', productos: '', precios: '', combos: '', estilo: 'amigable', objeciones: '', envio: '', horario: '', extra: '' })}
                      >
                        ðï¸ Limpiar
                      </button>
                    </div>
                    <div style={{ fontSize: '.65rem', color: '#9ca3af', marginTop: '.4rem', lineHeight: 1.5 }}>
                      ð¡ El resultado se guardarÃ¡ automÃ¡ticamente en <strong>Contexto empresa</strong>. Puedes editarlo despuÃ©s.
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Contexto empresa */}
              {trainingTab === 'contexto' && (
                <div className="wbv5-card">
                  <div className="wbv5-card-hd">
                    <div className="wbv5-card-title">ð¢ Contexto del negocio</div>
                    <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '.68rem', color: trainingPrompt.length > 70000 ? '#dc2626' : trainingPrompt.length > 50000 ? '#f59e0b' : '#16a34a', fontWeight: 700 }}>
                        {trainingPrompt.length.toLocaleString()} / 80,000 chars
                      </span>
                      <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => saveTraining(TRAINING_TEMPLATE)}>ð Plantilla</button>
                    </div>
                  </div>
                  <div className="wbv5-card-bd">
                    <div style={{ fontSize: '.72rem', color: '#6b7280', marginBottom: '.6rem', lineHeight: 1.5 }}>
                      ð Escribe aquÃ­ TODO sobre tu negocio: productos, precios, combos, forma de hablar, objeciones comunes, polÃ­tica de envÃ­o, historia... <strong>Entre mÃ¡s contexto, mejor vende la IA.</strong>
                    </div>
                    <textarea
                      className="wbv5-training-area"
                      value={trainingPrompt}
                      onChange={e => saveTraining(e.target.value)}
                      maxLength={80000}
                      placeholder="Pega aquÃ­ el contexto completo de tu empresa...&#10;&#10;Incluye:&#10;- Nombre y descripciÃ³n del negocio&#10;- Todos los productos con precios&#10;- Combos y ofertas especiales&#10;- Forma de hablar (formal/informal)&#10;- TÃ©cnicas de cierre de venta&#10;- Manejo de objeciones&#10;- Datos de contacto y envÃ­o"
                    />
                    <div style={{ display: 'flex', gap: '.5rem', marginTop: '.5rem', flexWrap: 'wrap' }}>
                      <button className={`wbv5-btn wbv5-btn-sm ${generatingPrompt ? 'wbv5-btn-outline' : 'wbv5-btn-ai-on'}`} onClick={generateWinnerPrompt} disabled={generatingPrompt}>
                        {generatingPrompt ? 'â³ Generando con IA...' : 'â¨ Generar prompt ganador con IA'}
                      </button>
                      <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => { navigator.clipboard?.writeText(trainingPrompt); tip('ð Contexto copiado') }}>ð Copiar todo</button>
                      <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => { if(window.confirm('Â¿Limpiar todo el contexto?')) saveTraining('') }}>ðï¸ Limpiar</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Memoria n8n */}
              {trainingTab === 'memoria' && (
                <div className="wbv5-content" style={{ padding: 0, gap: '.75rem' }}>
                  <div className="wbv5-card">
                    <div className="wbv5-card-hd"><div className="wbv5-card-title">ð§  Memoria de clientes (n8n)</div><span className="wbv5-badge badge-blue">Via n8n</span></div>
                    <div className="wbv5-card-bd">
                      <div style={{ fontSize: '.76rem', color: '#374151', lineHeight: 1.6, marginBottom: '.75rem' }}>
                        La memoria del cliente se guarda en n8n usando <strong>nodos de memoria</strong>. Cada nÃºmero de WhatsApp tiene su propio historial.
                      </div>
                      {[
                        { icon: 'ð±', title: 'IdentificaciÃ³n por nÃºmero', desc: 'Cada cliente se identifica por su nÃºmero de WhatsApp (chatId). La IA siempre sabe con quiÃ©n habla.' },
                        { icon: 'ð', title: 'Historial de pedidos', desc: 'n8n guarda quÃ© productos pidiÃ³, cuÃ¡ndo y cuÃ¡nto pagÃ³. La IA lo usa para personalizar respuestas.' },
                        { icon: 'ð¬', title: 'Contexto de conversaciÃ³n', desc: 'Los Ãºltimos 20 mensajes se incluyen en cada llamada a ChatGPT para mantener coherencia.' },
                        { icon: 'ð', title: 'Reconocimiento automÃ¡tico', desc: 'Cuando el cliente vuelve a escribir, la IA lo reconoce y saluda por su nombre con su historial.' },
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
                        ð¡ <strong>Configurar en n8n:</strong> Agrega un nodo "Window Buffer Memory" o "Postgres Chat Memory" en tu flujo de WhatsApp. El webhook ya recibe el <code style={{ background: 'rgba(0,0,0,.07)', padding: '1px 4px', borderRadius: 3 }}>chatId</code> para identificar al cliente.
                      </div>
                      <button className="wbv5-btn wbv5-btn-blue wbv5-btn-sm" style={{ marginTop: '.6rem' }} onClick={() => window.open('https://oasiss.app.n8n.cloud', '_blank')}>Abrir n8n para configurar â</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Probar bot */}
              {trainingTab === 'prueba' && (
                <div className="wbv5-card">
                  <div className="wbv5-card-hd"><div className="wbv5-card-title">ð§ª Probar bot IA</div></div>
                  <div className="wbv5-card-bd">
                    <div style={{ fontSize: '.72rem', color: '#6b7280', marginBottom: '.6rem', lineHeight: 1.5 }}>
                      Prueba cÃ³mo responderÃ¡ tu bot antes de activarlo. Requiere API Key de OpenAI configurada.
                    </div>
                    {!hasAiKey ? (
                      <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, padding: '.65rem .9rem', fontSize: '.76rem', color: '#713f12' }}>
                        â ï¸ Configura tu API Key (OpenAI o Gemini gratis) en <strong>Ajustes â API & Tokens</strong> para probar el bot.
                      </div>
                    ) : (
                      <BotTestChat trainingPrompt={trainingPrompt} aiPrompt={aiPrompt} openaiKey={openaiKey} geminiKey={geminiKey} aiModel={aiModel} tip={tip} msgMode={msgMode} useEmojis={useEmojis} useStyles={useStyles} />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          {page === 'difusiones' && <DifusionesMasivas BU={BU} sec={DEFAULT_SECRET}/>}
          {page === 'dispositivos' && <DispositivosPage BU={BU} sec={DEFAULT_SECRET}/>}

          {/* ââ CONEXIÃN ââ */}
          {page === 'conexion' && (
            <div className="wbv5-content">
              <div style={{ fontSize: '.85rem', fontWeight: 800, marginBottom: '.2rem' }}>ð± ConexiÃ³n WhatsApp</div>
              <div style={{ fontSize: '.68rem', color: '#6b7280', marginBottom: '.85rem' }}>Vincula tu WhatsApp al bot para recibir y enviar mensajes automÃ¡ticamente</div>

              {/* ââ Banner: servidor Baileys offline ââ */}
              {serverOnline === false && (
                <div className="wbv5-server-offline-banner">
                  <div className="wbv5-sob-icon">â ï¸</div>
                  <div className="wbv5-sob-body">
                    <div className="wbv5-sob-title">Servidor Baileys no disponible</div>
                    <div className="wbv5-sob-desc">
                      El backend no responde en <code>{BU.replace('/api/whatsapp','')}</code>.
                      Si accedes desde <strong>sanate.store (HTTPS)</strong>, el navegador bloquea conexiones HTTP a localhost.
                      Despliega el servidor en Railway/Render y configura la URL en <strong>Ajustes â ConexiÃ³n WA</strong>.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '.4rem', flexShrink: 0, flexWrap: 'wrap' }}>
                    <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={ping}>ð Reintentar</button>
                    <button className="wbv5-btn wbv5-btn-sm" style={{ background: '#7c3aed', color: '#fff' }} onClick={() => { goPage('config'); setCfgTab('conn') }}>âï¸ Configurar URL</button>
                  </div>
                </div>
              )}

              <div className="wbv5-qr-card">
                {/* Canvas QR â siempre visible; muestra skeleton, QR real o checkmark verde */}
                <div className="wbv5-qr-box" style={{ position: 'relative' }}>
                  {serverOnline === false && status !== 'connected' ? (
                    <div className="wbv5-qr-offline">
                      <div style={{ fontSize: '2.2rem' }}>ð</div>
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
                          â WhatsApp vinculado
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="wbv5-qr-info">
                  {status === 'connected' ? (
                    <>
                      <div style={{ fontSize: '2.5rem', marginBottom: '.4rem' }}>â</div>
                      <h3 style={{ color: '#16a34a', margin: '0 0 .3rem' }}>WhatsApp Conectado</h3>
                      <p style={{ color: '#374151', margin: '0 0 .6rem' }}>
                        Tu WhatsApp estÃ¡ vinculado. Los mensajes se procesan automÃ¡ticamente.
                      </p>
                      {phone && (
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '.6rem 1rem', marginBottom: '.8rem', fontSize: '.82rem', color: '#166534' }}>
                          ð± <strong>{phone}</strong>
                        </div>
                      )}
                      <button className="wbv5-btn wbv5-btn-red" onClick={disconnectWA} style={{ width: '100%' }}>
                        ð Desvincular WhatsApp
                      </button>
                    </>
                  ) : serverOnline === false ? (
                    <>
                      <h3 style={{ color: '#dc2626', margin: '0 0 .35rem' }}>ð Servidor no disponible</h3>
                      <p style={{ opacity: .9, margin: '0 0 .6rem' }}>
                        El servidor Baileys no responde. InÃ­cialo localmente o despliÃ©galo en Railway para generar el cÃ³digo QR.
                      </p>
                      <div className="wbv5-qr-steps">
                        <span>ð» Local: <code style={{ background: 'rgba(255,255,255,.2)', padding: '1px 5px', borderRadius: 4, fontSize: '.68rem' }}>node server.js</code></span>
                        <span>âï¸ Railway: verifica que el servicio estÃ© activo</span>
                        <span>ð Puerto por defecto: <strong>5055</strong></span>
                      </div>
                      <button className="wbv5-btn" style={{ marginTop: '1rem', width: '100%', background: '#fff', color: '#075e54', fontSize: '.85rem', padding: '.55rem 1rem', fontWeight: 700 }} onClick={ping}>
                        ð Verificar conexiÃ³n
                      </button>
                    </>
                  ) : (
                    <>
                      <h3>{qrDataUrl ? 'ð± Escanea con WhatsApp' : status === 'connecting' ? 'â³ Generando QR...' : 'ð± Vincula tu WhatsApp'}</h3>
                      <p>
                        {qrDataUrl
                          ? 'Escanea el cÃ³digo QR con tu WhatsApp para conectar el bot.'
                          : status === 'connecting'
                          ? 'El servidor estÃ¡ generando el cÃ³digo QR, espera un momento...'
                          : 'Genera un cÃ³digo QR y escanÃ©alo con WhatsApp para conectar el bot.'}
                      </p>
                      <div className="wbv5-qr-steps">
                        <span>1ï¸â£ Abre WhatsApp en tu telÃ©fono</span>
                        <span>2ï¸â£ Ve a Dispositivos vinculados</span>
                        <span>3ï¸â£ Toca "Vincular un dispositivo"</span>
                        <span>4ï¸â£ Escanea el cÃ³digo QR</span>
                      </div>
                      {!qrDataUrl && status === 'disconnected' && (
                        <button
                          className="wbv5-btn wbv5-btn-green"
                          style={{ marginTop: '1rem', width: '100%', fontSize: '.9rem', padding: '.6rem 1rem' }}
                          onClick={regenerateQR}
                        >
                          ð Generar cÃ³digo QR
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="wbv5-card">
                <div className="wbv5-card-hd"><div className="wbv5-card-title">Estado de conexiÃ³n</div></div>
                <div className="wbv5-card-bd">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.6rem', flexWrap: 'wrap' }}>
                    <div className={`wbv5-status-indicator ${statusCls[status]}`}>
                      <div className="wbv5-si-dot" />
                      <span>
                        {status === 'connected'
                          ? `â Conectado â ${phone}`
                          : status === 'connecting'
                          ? 'â³ Esperando escaneo...'
                          : 'Desconectado â escanea el QR para conectar'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                      <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={ping}>ð Verificar</button>
                      <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={regenerateQR}>ð Nuevo QR</button>
                      {status === 'connected' && (
                        <button className="wbv5-btn wbv5-btn-red wbv5-btn-sm" onClick={disconnectWA}>Desconectar</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="wbv5-conn-grid">
                {[
                  { num: '1', title: 'Escanea el QR',         desc: 'Usa WhatsApp en tu telÃ©fono â Dispositivos vinculados â Vincular dispositivo' },
                  { num: '2', title: 'Confirma conexiÃ³n',     desc: 'El indicador cambiarÃ¡ a verde. Los mensajes comenzarÃ¡n a llegar al chat.' },
                  { num: '3', title: 'Los flujos se activan', desc: 'n8n procesa los mensajes y ejecuta los flujos automÃ¡ticamente.' },
                  { num: '4', title: 'Chats disponibles',     desc: 'Los chats del dispositivo se cargan en la secciÃ³n Chat en tiempo real.' },
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
                  <div className="wbv5-card-title">ð ConfiguraciÃ³n n8n</div>
                  <span className={`wbv5-badge ${n8nOk === true ? 'badge-green' : 'badge-amber'}`}>
                    {n8nOk === true ? 'â Conectado' : 'â³ Pendiente'}
                  </span>
                </div>
                <div className="wbv5-card-bd">
                  <div className="wbv5-form-row">
                    <div className="wbv5-form-lbl">N8N Cloud URL</div>
                    <div className="wbv5-code-box" onClick={() => copyText('https://oasiss.app.n8n.cloud')}>
                      https://oasiss.app.n8n.cloud <span style={{ marginLeft: 'auto', fontSize: '.65rem' }}>ð</span>
                    </div>
                  </div>
                  <div className="wbv5-form-row">
                    <div className="wbv5-form-lbl">Webhook WhatsApp (producciÃ³n)</div>
                    <div className="wbv5-code-box" onClick={() => copyText(N8N_WH)}>
                      {N8N_WH} <span style={{ marginLeft: 'auto', fontSize: '.65rem' }}>ð</span>
                    </div>
                  </div>
                  <div className="wbv5-form-row">
                    <div className="wbv5-form-lbl">Flujo activo en n8n</div>
                    <div className="wbv5-code-box">
                      ð¢ Sanate - WhatsApp Bot <span style={{ marginLeft: 'auto' }}><span className="wbv5-badge badge-green">Activo</span></span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '.5rem', marginTop: '.3rem' }}>
                    <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={checkN8N}>ð Verificar conexiÃ³n</button>
                    <button className="wbv5-btn wbv5-btn-blue wbv5-btn-sm" onClick={() => window.open('https://oasiss.app.n8n.cloud', '_blank')}>Abrir n8n â</button>
                  </div>
                </div>
              </div>
              <div className="wbv5-card">
                <div className="wbv5-card-hd">
                  <div className="wbv5-card-title">ð Facebook & Instagram</div>
                  <span className="wbv5-badge badge-amber">â³ Pendiente</span>
                </div>
                <div className="wbv5-card-bd">
                  <div style={{ fontSize: '.72rem', color: '#6b7280', lineHeight: 1.6 }}>
                    La integraciÃ³n estarÃ¡ disponible despuÃ©s de confirmar que el QR de WhatsApp conecta correctamente.
                    <br /><br /><strong>Paso siguiente:</strong> Conecta WhatsApp â verifica mensajes en Chat â luego habilita Facebook/Instagram.
                  </div>
                  <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" style={{ marginTop: '.6rem' }} onClick={() => tip('ð PrÃ³ximamente: Facebook e Instagram')}>Configurar despuÃ©s â</button>
                </div>
              </div>
            </div>
          )}

          {/* ââ CONFIG ââ */}
          {(page==='instagram'||page==='facebook'||page==='tiktok')&&(<div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:24,padding:40}}>
{page==='instagram'&&<SocialConnector platform="instagram" />}
{page==='facebook'&&<SocialConnector platform="messenger" />}
{page==='tiktok'&&<div style={{textAlign:'center'}}><div style={{width:72,height:72,borderRadius:18,background:'#010101',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',boxShadow:'0 6px 20px rgba(0,0,0,.25)'}}><svg width="36" height="36" viewBox="0 0 24 24" fill="white"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.52V6.77a4.85 4.85 0 0 1-1.01-.08z"/></svg></div><p style={{fontSize:20,fontWeight:700,margin:'0 0 6px',color:'#262626'}}>TikTok</p><p style={{fontSize:13,color:'#8e8e8e',margin:'0 0 20px'}}>Mensajes directos de TikTok</p><button style={{background:'#010101',color:'#fff',border:'none',borderRadius:8,padding:'10px 24px',fontSize:14,fontWeight:600,cursor:'pointer'}}>Conectar TikTok</button></div>}
</div>)}
{page === 'config' && (
            <div className="wbv5-content">
              <div style={{ fontSize: '.85rem', fontWeight: 800, marginBottom: '.85rem' }}>âï¸ Ajustes</div>
              <div className="wbv5-cfg-layout">
                <div className="wbv5-cfg-sidebar">
                  <div className="wbv5-cfg-section-title" style={{ borderTop: 'none' }}>General</div>
                  {[
                    { id: 'conn',    label: 'ð± ConexiÃ³n WA' },
                    { id: 'rapidas', label: 'â¡ Respuestas rÃ¡pidas' },
                    { id: 'horario', label: 'ð Horario atenciÃ³n' },
                    { id: 'equipo',  label: 'ð¥ Equipo' },
                  ].map(t => (
                    <div key={t.id} className={`wbv5-cfg-nav ${cfgTab === t.id ? 'active' : ''}`} onClick={() => setCfgTab(t.id)}>{t.label}</div>
                  ))}
                  <div className="wbv5-cfg-section-title">Bot & IA</div>
                  {[
                    { id: 'nativebot',  label: 'ð¤ Bot IA' },
                    { id: 'bot',      label: 'âï¸ Comportamiento bot' },
                  ].map(t => (
                    <div key={t.id} className={`wbv5-cfg-nav ${cfgTab === t.id ? 'active' : ''}`} onClick={() => setCfgTab(t.id)}>{t.label}</div>
                  ))}
                  <div className="wbv5-cfg-section-title">TÃ©cnico</div>
                  {[
                    { id: 'api',      label: 'ð Tokens & APIs' },
                    { id: 'empresa',  label: 'ð¢ Empresa' },
                  ].map(t => (
                    <div key={t.id} className={`wbv5-cfg-nav ${cfgTab === t.id ? 'active' : ''}`} onClick={() => setCfgTab(t.id)}>{t.label}</div>
                  ))}
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '.75rem' }}>

                  {/* ConexiÃ³n WA */}
                  {cfgTab === 'conn' && (
                    <>
                    {/* ââ Backend URL ââ */}
                    <div className="wbv5-card">
                      <div className="wbv5-card-hd">
                        <div className="wbv5-card-title">ð Servidor Baileys</div>
                        <span className={`wbv5-badge ${serverOnline === true ? 'badge-green' : serverOnline === false ? 'badge-red' : 'badge-amber'}`}>
                          {serverOnline === true ? 'â Online' : serverOnline === false ? 'â Offline' : 'â³ Verificando'}
                        </span>
                      </div>
                      <div className="wbv5-card-bd">
                        <div style={{ fontSize: '.7rem', color: '#6b7280', marginBottom: '.75rem', lineHeight: 1.5 }}>
                          El bot necesita un servidor Baileys corriendo. Puede ser en local, Railway, Render o cualquier servicio cloud.<br />
                          {backendUrlInput.includes('localhost') && window.location.protocol === 'https:' ? (
                            <span style={{ color: '#dc2626', fontWeight: 600 }}>â ï¸ Problema actual: desde <code>{window.location.origin}</code> los navegadores bloquean <code>http://localhost</code>. Usa Railway, Render o ngrok (URL pÃºblica HTTPS).</span>
                          ) : backendUrlInput.includes('localhost') ? (
                            <span style={{ color: '#f59e0b', fontWeight: 600 }}>ð¡ Usando localhost â funciona en desarrollo local. Para producciÃ³n usa Railway o Render.</span>
                          ) : (
                            <span style={{ color: '#16a34a', fontWeight: 600 }}>â URL correcta â usando servidor HTTPS externo.</span>
                          )}
                        </div>
                        <div className="wbv5-form-row">
                          <div className="wbv5-form-lbl">URL base del servidor</div>
                          <input
                            className="wbv5-form-input"
                            value={backendUrlInput}
                            onChange={e => setBackendUrlInput(e.target.value)}
                            placeholder="https://tu-app.railway.app  Ã³  http://localhost:5055"
                          />
                          <div style={{ fontSize: '.62rem', color: '#9ca3af', marginTop: '.2rem' }}>
                            Se usarÃ¡: <code>{backendUrlInput.trim().replace(/\/+$/, '').replace('/api/whatsapp', '') || 'http://localhost:5055'}/api/whatsapp</code>
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
                          <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#166534', marginBottom: '.4rem' }}>ð Opciones de deploy del servidor</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
                            {[
                              { icon: 'ð', name: 'Railway (recomendado)', url: 'https://railway.app', desc: 'Gratis hasta 500h/mes, siempre HTTPS' },
                              { icon: 'ð', name: 'Render', url: 'https://render.com', desc: 'Free tier disponible, HTTPS automÃ¡tico' },
                              { icon: 'ð§', name: 'ngrok (local HTTPS)', url: 'https://ngrok.com', desc: 'Expone localhost:5055 con URL pÃºblica temporal' },
                            ].map((opt, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.7rem' }}>
                                <span>{opt.icon}</span>
                                <span style={{ fontWeight: 600, color: '#166534', minWidth: '150px' }}>{opt.name}</span>
                                <span style={{ color: '#6b7280', flex: 1 }}>{opt.desc}</span>
                                <button className="wbv5-btn wbv5-btn-sm wbv5-btn-outline" style={{ fontSize: '.6rem', padding: '.15rem .45rem' }} onClick={() => window.open(opt.url, '_blank')}>Abrir â</button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                          <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={saveBackendUrl}>ð¾ Guardar y reconectar</button>
                          <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => { setBackendUrlInput(DEFAULT_BU.replace('/api/whatsapp','')); setSecretInput(DEFAULT_SECRET) }}>â©ï¸ Restaurar defaults</button>
                          <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => goPage('conexion')}>ð± Ir a ConexiÃ³n â</button>
                          <button
                  onClick={async () => {
                    try { await fetch(BU+'/sync',{method:'POST',headers:H}); } catch(e){}
                    ping();
                  }}
                  className="wbv5-btn wbv5-btn-sm"
                  title="Sincronizar chats y contactos"
                >ð Sincronizar</button>
                        </div>
                      </div>
                    </div>
                    {/* ââ WhatsApp Status ââ */}
                    <div className="wbv5-card">
                      <div className="wbv5-card-hd">
                        <div className="wbv5-card-title">ð± WhatsApp</div>
                        <span className={`wbv5-badge ${status === 'connected' ? 'badge-green' : status === 'connecting' ? 'badge-amber' : 'badge-red'}`}>
                          {status === 'connected' ? 'â Conectado' : status === 'connecting' ? 'â³ Conectando' : 'â Desconectado'}
                        </span>
                      </div>
                      <div className="wbv5-card-bd">
                        {phone && <div style={{ fontSize: '.76rem', color: '#166534', background: '#f0fdf4', borderRadius: 8, padding: '.5rem .75rem', marginBottom: '.6rem' }}>ð± <strong>{phone}</strong></div>}
                        <div className="wbv5-form-row">
                          <div className="wbv5-form-lbl">Webhook n8n (producciÃ³n)</div>
                          <div className="wbv5-code-box" onClick={() => copyText(N8N_WH)}>{N8N_WH} <span style={{ marginLeft: 'auto' }}>ð</span></div>
                        </div>
                        <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => goPage('conexion')}>ð± Ver QR / ConexiÃ³n â</button>
                      </div>
                    </div>
                    </>
                  )}

                  {/* Respuestas rÃ¡pidas */}
                  {cfgTab === 'rapidas' && (
                    <div className="wbv5-card">
                      <div className="wbv5-card-hd">
                        <div className="wbv5-card-title">â¡ Respuestas rÃ¡pidas</div>
                        <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={() => tip('â Respuesta aÃ±adida')}>+ AÃ±adir</button>
                      </div>
                      <div className="wbv5-card-bd">
                        <div style={{ fontSize: '.71rem', color: '#6b7280', marginBottom: '.75rem' }}>
                          Palabras clave que el bot detecta y responde automÃ¡ticamente.
                        </div>
                        {[
                          { key: 'hola',     resp: 'Â¡Hola! ð Bienvenido a Sanate. Â¿En quÃ© te ayudo?' },
                          { key: 'precio',   resp: 'Nuestros precios estÃ¡n en sanate.store ðï¸' },
                          { key: 'horario',  resp: 'Atendemos L-V 8am-6pm y SÃ¡b 9am-2pm ð' },
                          { key: 'soporte',  resp: 'Conectando con un agente... ð Un momento.' },
                          { key: 'pedido',   resp: 'Para rastrear tu pedido envÃ­anos tu nÃºmero de orden ð¦' },
                        ].map((r, i) => (
                          <div key={i} style={{ display: 'flex', gap: '.5rem', alignItems: 'center', padding: '.45rem 0', borderBottom: '1px solid #f3f4f6' }}>
                            <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: '6px', padding: '.15rem .5rem', fontSize: '.65rem', fontWeight: 700, flexShrink: 0, minWidth: '60px', textAlign: 'center' }}>
                              {r.key}
                            </span>
                            <span style={{ flex: 1, fontSize: '.72rem', color: '#374151' }}>{r.resp}</span>
                            <button className="wbv5-flow-3btn" onClick={() => tip('âï¸ Editar respuesta â prÃ³ximamente')}>âï¸</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Horario */}
                  {cfgTab === 'horario' && (
                    <div className="wbv5-card">
                      <div className="wbv5-card-hd"><div className="wbv5-card-title">ð Horario de atenciÃ³n</div></div>
                      <div className="wbv5-card-bd">
                        <div style={{ fontSize: '.71rem', color: '#6b7280', marginBottom: '.75rem' }}>
                          Fuera de horario el bot responde automÃ¡ticamente con un mensaje de ausencia.
                        </div>
                        {[
                          { dia: 'Lunes â Viernes', desde: '08:00', hasta: '18:00', activo: true },
                          { dia: 'SÃ¡bado',           desde: '09:00', hasta: '14:00', activo: true },
                          { dia: 'Domingo',          desde: '',      hasta: '',      activo: false },
                        ].map((h, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '.5rem 0', borderBottom: '1px solid #f3f4f6' }}>
                            <span style={{ width: '130px', fontSize: '.74rem', fontWeight: 600, color: '#374151', flexShrink: 0 }}>{h.dia}</span>
                            {h.activo ? (
                              <>
                                <input className="wbv5-form-input" defaultValue={h.desde} style={{ width: '75px' }} />
                                <span style={{ fontSize: '.7rem', color: '#9ca3af' }}>â</span>
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
                          <textarea className="wbv5-form-input" rows={2} defaultValue="Â¡Hola! Estamos fuera de horario. Te respondemos el prÃ³ximo dÃ­a hÃ¡bil. ð" style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                        </div>
                        <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={() => tip('â Horario guardado')}>ð¾ Guardar horario</button>
                      </div>
                    </div>
                  )}

                  {/* Equipo */}
                  {cfgTab === 'equipo' && (
                    <div className="wbv5-card">
                      <div className="wbv5-card-hd">
                        <div className="wbv5-card-title">ð¥ Agentes del equipo</div>
                        <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={() => tip('â Invitar agente â prÃ³ximamente')}>+ Invitar</button>
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

                  {/* Bot Nativo */}
                  {cfgTab === 'nativebot' && (
                    <>
                      {/* ââ API Key de IA (OpenAI / Gemini) ââ */}
                      <div className="wbv5-card">
                        <div className="wbv5-card-hd">
                          <div className="wbv5-card-title">ð§  IA â API Key</div>
                          <span className={`wbv5-badge ${hasAiKey ? 'badge-green' : 'badge-amber'}`}>
                            {hasAiKey ? 'â Configurada' : 'â ï¸ Sin key'}
                          </span>
                        </div>
                        <div className="wbv5-card-bd">
                          <div style={{ fontSize: '.7rem', color: '#6b7280', marginBottom: '.75rem', lineHeight: 1.5 }}>
                            La API Key permite que el Bot IA responda de forma inteligente y humanizada a cada mensaje del cliente.
                            <br /><strong>Sin API Key:</strong> el bot no puede responder. <strong>Con API Key:</strong> respuestas conversacionales naturales en varios mensajes.
                          </div>
                          {!openaiKey && !geminiKey && (
                            <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, padding: '.5rem .75rem', fontSize: '.72rem', color: '#713f12', marginBottom: '.75rem' }}>
                              Configura una API Key para que el bot pueda responder mensajes.
                            </div>
                          )}
                          <div className="wbv5-form-row">
                            <div className="wbv5-form-lbl">OpenAI API Key</div>
                            <input
                              className="wbv5-form-input" type="password"
                              placeholder="sk-proj-..."
                              value={openaiKey}
                              onChange={e => saveAiKey(e.target.value)}
                            />
                            {openaiKey ? <div style={{ fontSize: '.64rem', color: '#16a34a', marginTop: '.2rem' }}>â API Key guardada</div> : <div style={{ fontSize: '.64rem', color: '#9ca3af', marginTop: '.2rem' }}>ObtÃ©n tu key en platform.openai.com/api-keys</div>}
                          </div>
                          <div className="wbv5-form-row">
                            <div className="wbv5-form-lbl">Modelo IA</div>
                            <select className="wbv5-form-input" value={aiModel} onChange={e => setAiModel(e.target.value)}>
                              <option value="gpt-4o">GPT-4o (Recomendado)</option>
                              <option value="gpt-4o-mini">GPT-4o mini (RÃ¡pido y econÃ³mico)</option>
                              <option value="gpt-4-turbo">GPT-4 Turbo</option>
                              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (MÃ¡s econÃ³mico)</option>
                            </select>
                          </div>
                          <div className="wbv5-form-row">
                            <div className="wbv5-form-lbl">Google Gemini (alternativa gratis)</div>
                            <input
                              className="wbv5-form-input" type="password"
                              placeholder="AIzaSy..."
                              value={geminiKey}
                              onChange={e => saveGeminiKey(e.target.value)}
                            />
                            {geminiKey ? <div style={{ fontSize: '.64rem', color: '#16a34a', marginTop: '.2rem' }}>â Gemini Key guardada</div> : <div style={{ fontSize: '.64rem', color: '#9ca3af', marginTop: '.2rem' }}>Gratis en aistudio.google.com/apikey â se usa como respaldo si OpenAI falla</div>}
                          </div>
                          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                              className={`wbv5-btn wbv5-btn-sm ${aiEnabled ? 'wbv5-btn-ai-on' : 'wbv5-btn-green'}`}
                              onClick={toggleAiGlobal}
                            >
                              {aiEnabled ? 'â¸ Desactivar IA global' : 'ð Activar IA global'}
                            </button>
                            <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => window.open('https://platform.openai.com/api-keys', '_blank')}>OpenAI Key â</button>
                            <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => window.open('https://aistudio.google.com/apikey', '_blank')}>Gemini Key â</button>
                          </div>
                        </div>
                      </div>

                      {/* ââ Bot IA - ConfiguraciÃ³n ââ */}
                      <div className="wbv5-card">
                        <div className="wbv5-card-hd">
                          <div className="wbv5-card-title">ð¤ Bot IA - Respuestas inteligentes</div>
                          <span className={`wbv5-badge ${nbEnabled ? 'badge-green' : 'badge-red'}`}>
                            {nbEnabled ? 'â Activo' : 'â Inactivo'}
                          </span>
                        </div>
                        <div className="wbv5-card-bd">
                          <div style={{ fontSize: '.7rem', color: '#6b7280', marginBottom: '.75rem', lineHeight: 1.5 }}>
                            La IA responde a todos los mensajes de forma natural y humana. Captura leads, detecta nombres y escala a humano cuando es necesario.
                            {!hasAiKey && <><br /><span style={{ color: '#f59e0b', fontWeight: 600 }}>Configura una API Key arriba para activar las respuestas inteligentes.</span></>}
                          </div>

                          <div className="wbv5-form-row" style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.75rem' }}>
                            <div className="wbv5-form-lbl" style={{ minWidth: '80px' }}>Activar</div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', cursor: 'pointer' }}>
                              <input type="checkbox" checked={nbEnabled} onChange={e => {
                                const v = e.target.checked
                                setNbEnabled(v)
                                try { localStorage.setItem('wa_nb_enabled', JSON.stringify(v)) } catch {}
                                setTimeout(() => syncSettingsToBackend({ silent: true }), 300)
                              }} />
                              <span style={{ fontSize: '.72rem' }}>{nbEnabled ? 'Bot IA activo â responde todos los mensajes' : 'Bot desactivado'}</span>
                            </label>
                          </div>

                          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginTop: '.75rem' }}>
                            <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={() => {
                              try {
                                localStorage.setItem('wa_nb_enabled', JSON.stringify(nbEnabled))
                                localStorage.setItem('wa_nb_ttl', String(nbTTL))
                                localStorage.setItem('wa_nb_escalate', nbEscalate)
                                localStorage.setItem('wa_nb_delay', String(nbDelay))
                              } catch {}
                              syncSettingsToBackend()
                              tip('Bot IA configuracion guardada')
                            }}>Guardar y sincronizar</button>
                            <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => {
                              fetch(BU + '/bot/sessions', { headers: H })
                                .then(r => r.json())
                                .then(d => {
                                  if (d.ok) {
                                    setNbSessions(d.sessions || [])
                                    tip(`${d.total} sesiones activas`)
                                  }
                                })
                                .catch(() => tip('Error'))
                            }}>Ver sesiones</button>
                            <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => {
                              fetch(BU + '/bot/leads', { headers: H })
                                .then(r => r.json())
                                .then(d => {
                                  if (d.ok) {
                                    setNbLeads(d.leads || [])
                                    tip(`${d.total} leads capturados`)
                                  }
                                })
                                .catch(() => tip('Error'))
                            }}>Ver leads</button>
                            <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" style={{ color: '#dc2626' }} onClick={() => {
                              if (!window.confirm('Limpiar todas las sesiones? Los clientes empezaran desde el inicio.')) return
                              fetch(BU + '/bot/sessions', { method: 'DELETE', headers: H })
                                .then(r => r.json())
                                .then(d => { if (d.ok) { setNbSessions([]); tip(`${d.cleared} sesiones eliminadas`) } })
                                .catch(() => tip('Error'))
                            }}>Limpiar sesiones</button>
                          </div>
                        </div>
                      </div>

                      {/* ââ Ajustes avanzados ââ */}
                      <div className="wbv5-card">
                        <div className="wbv5-card-hd">
                          <div className="wbv5-card-title">âï¸ Ajustes avanzados</div>
                        </div>
                        <div className="wbv5-card-bd">
                          <div className="wbv5-form-row">
                            <div className="wbv5-form-lbl">DuraciÃ³n de sesiÃ³n (horas)</div>
                            <input
                              className="wbv5-form-input"
                              type="number" min="1" max="72"
                              value={nbTTL}
                              onChange={e => setNbTTL(Math.max(1, Math.min(72, parseInt(e.target.value) || 24)))}
                              style={{ maxWidth: '120px' }}
                            />
                            <div style={{ fontSize: '.62rem', color: '#9ca3af', marginTop: '.2rem' }}>
                              DespuÃ©s de este tiempo la sesiÃ³n expira y el cliente vuelve al inicio. Recomendado: 24h.
                            </div>
                          </div>
                          <div className="wbv5-form-row">
                            <div className="wbv5-form-lbl">Delay entre mensajes (ms)</div>
                            <input
                              className="wbv5-form-input"
                              type="number" min="300" max="3000" step="100"
                              value={nbDelay}
                              onChange={e => setNbDelay(Math.max(300, Math.min(3000, parseInt(e.target.value) || 800)))}
                              style={{ maxWidth: '120px' }}
                            />
                            <div style={{ fontSize: '.62rem', color: '#9ca3af', marginTop: '.2rem' }}>
                              El bot muestra "escribiendo..." durante este tiempo antes de responder. MÃ¡s natural.
                            </div>
                          </div>
                          <div className="wbv5-form-row">
                            <div className="wbv5-form-lbl">Palabras para escalar a humano</div>
                            <input
                              className="wbv5-form-input"
                              value={nbEscalate}
                              onChange={e => setNbEscalate(e.target.value)}
                              placeholder="agente,humano,persona,asesor,hablar con alguien"
                            />
                            <div style={{ fontSize: '.62rem', color: '#9ca3af', marginTop: '.2rem' }}>
                              Si el cliente escribe alguna de estas palabras, el bot se detiene y avisa que un humano lo atenderÃ¡. Separar con comas.
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ââ Sesiones activas ââ */}
                      {nbSessions.length > 0 && (
                        <div className="wbv5-card">
                          <div className="wbv5-card-hd">
                            <div className="wbv5-card-title">ð Sesiones activas ({nbSessions.length})</div>
                          </div>
                          <div className="wbv5-card-bd">
                            <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                              {nbSessions.map((s, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.35rem 0', borderBottom: '1px solid #f3f4f6', fontSize: '.7rem' }}>
                                  <span style={{ flex: 1, fontFamily: 'monospace' }}>{s.jid?.split('@')[0] || s.jid}</span>
                                  <span style={{ color: '#2563eb', fontSize: '.62rem' }}>{s.name || '?'}</span>
                                  <span className={`wbv5-badge ${s.step === 'escalated' ? 'badge-amber' : s.step === 'menu' ? 'badge-blue' : 'badge-green'}`} style={{ fontSize: '.58rem' }}>
                                    {s.step || '?'}
                                  </span>
                                  <span style={{ color: '#6b7280', fontSize: '.62rem' }}>msgs: {s.msgCount || 0}</span>
                                  <span style={{ color: '#9ca3af', fontSize: '.6rem' }}>{s.createdAt ? new Date(s.createdAt).toLocaleString('es-CO') : ''}</span>
                                  <button className="wbv5-btn wbv5-btn-sm wbv5-btn-outline" style={{ fontSize: '.6rem', padding: '.1rem .3rem', color: '#dc2626' }} onClick={() => {
                                    fetch(`${BU}/bot/sessions/${encodeURIComponent(s.jid)}`, { method: 'DELETE', headers: H })
                                      .then(r => r.json())
                                      .then(d => { if (d.ok) { setNbSessions(prev => prev.filter(x => x.jid !== s.jid)); tip('ðï¸ Eliminada') } })
                                      .catch(() => {})
                                  }}>X</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ââ Leads capturados ââ */}
                      {nbLeads.length > 0 && (
                        <div className="wbv5-card">
                          <div className="wbv5-card-hd">
                            <div className="wbv5-card-title">ð Leads capturados ({nbLeads.length})</div>
                            <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" style={{ color: '#dc2626', fontSize: '.6rem' }} onClick={() => {
                              if (!window.confirm('Â¿Borrar todos los leads?')) return
                              fetch(BU + '/bot/leads', { method: 'DELETE', headers: H })
                                .then(r => r.json())
                                .then(d => { if (d.ok) { setNbLeads([]); tip(`ðï¸ ${d.cleared} leads borrados`) } })
                                .catch(() => {})
                            }}>ðï¸ Borrar todos</button>
                          </div>
                          <div className="wbv5-card-bd">
                            <div style={{ maxHeight: '250px', overflow: 'auto' }}>
                              <table style={{ width: '100%', fontSize: '.68rem', borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                                    <th style={{ padding: '.3rem .4rem', borderBottom: '1px solid #e5e7eb' }}>Tel</th>
                                    <th style={{ padding: '.3rem .4rem', borderBottom: '1px solid #e5e7eb' }}>Nombre</th>
                                    <th style={{ padding: '.3rem .4rem', borderBottom: '1px solid #e5e7eb' }}>InterÃ©s</th>
                                    <th style={{ padding: '.3rem .4rem', borderBottom: '1px solid #e5e7eb' }}>Fecha</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {nbLeads.map((l, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                      <td style={{ padding: '.3rem .4rem', fontFamily: 'monospace' }}>{l.phone || '-'}</td>
                                      <td style={{ padding: '.3rem .4rem' }}>{l.name || '-'}</td>
                                      <td style={{ padding: '.3rem .4rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.interest || '-'}</td>
                                      <td style={{ padding: '.3rem .4rem', color: '#9ca3af' }}>{l.capturedAt ? new Date(l.capturedAt).toLocaleString('es-CO') : ''}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ââ CÃ³mo funciona ââ */}
                      <div className="wbv5-card">
                        <div className="wbv5-card-hd">
                          <div className="wbv5-card-title">Como funciona el Bot IA</div>
                        </div>
                        <div className="wbv5-card-bd" style={{ fontSize: '.7rem', lineHeight: 1.6, color: '#4b5563' }}>
                          <div style={{ padding: '.5rem', background: '#eff6ff', borderRadius: 6, border: '1px solid #bfdbfe', marginBottom: '.5rem' }}>
                            <strong>Flujo automatico:</strong><br/>
                            1. Cliente escribe por primera vez - la IA detecta su nombre y responde de forma natural<br/>
                            2. La IA responde en varios mensajes cortos como una persona real<br/>
                            3. Guia la conversacion hacia la venta de forma natural<br/>
                            4. Si escribe "asesor/humano/agente" - el bot se detiene y avisa que un humano atendera
                          </div>
                          <div style={{ padding: '.5rem', background: '#ecfdf5', borderRadius: 6, border: '1px solid #a7f3d0', marginBottom: '.5rem' }}>
                            <strong>Captura de leads:</strong> Cada nuevo contacto se guarda automaticamente con su telefono, nombre detectado y primer mensaje.
                          </div>
                          <div style={{ padding: '.5rem', background: '#fffbeb', borderRadius: 6, border: '1px solid #fde68a' }}>
                            <strong>Respuestas humanizadas:</strong> La IA responde en multiples mensajes separados, como si fuera una persona escribiendo por WhatsApp. Usa negritas, emojis naturales y lenguaje casual.
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* API & Tokens */}
                  {cfgTab === 'api' && (
                    <>
                      {/* Estado IA Key */}
                      {!openaiKey && !geminiKey && (
                        <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, padding: '.65rem .9rem', fontSize: '.76rem', color: '#713f12', marginBottom: '.75rem' }}>
                          â ï¸ <strong>Sin API Key configurada.</strong> Agrega una de las dos opciones abajo para activar la IA. El botÃ³n ð¤ en el chat necesita al menos una key para funcionar.
                        </div>
                      )}
                      {/* ChatGPT / OpenAI */}
                      <div className="wbv5-card">
                        <div className="wbv5-card-hd">
                          <div className="wbv5-card-title">ð¤ ChatGPT / OpenAI</div>
                          <span className={`wbv5-badge ${openaiKey ? 'badge-green' : 'badge-amber'}`}>
                            {openaiKey ? 'â Conectado' : 'â³ Sin configurar'}
                          </span>
                        </div>
                        <div className="wbv5-card-bd">
                          <div style={{ fontSize: '.71rem', color: '#6b7280', marginBottom: '.75rem', lineHeight: 1.5 }}>
                            Conecta tu API de OpenAI para respuestas automÃ¡ticas con IA. El botÃ³n ð¤ en el chat usarÃ¡ esta key para generar respuestas perfectas.
                          </div>
                          <div className="wbv5-form-row">
                            <div className="wbv5-form-lbl">OpenAI API Key</div>
                            <input
                              className="wbv5-form-input" type="password"
                              placeholder="sk-proj-..."
                              value={openaiKey}
                              onChange={e => saveAiKey(e.target.value)}
                            />
                            {openaiKey ? <div style={{ fontSize: '.64rem', color: '#16a34a', marginTop: '.2rem' }}>â API Key guardada en navegador</div> : <div style={{ fontSize: '.64rem', color: '#9ca3af', marginTop: '.2rem' }}>ObtÃ©n tu key en platform.openai.com/api-keys</div>}
                          </div>
                          <div className="wbv5-form-row">
                            <div className="wbv5-form-lbl">Modelo</div>
                            <select className="wbv5-form-input" value={aiModel} onChange={e => setAiModel(e.target.value)}>
                              <option value="gpt-4o">GPT-4o (Recomendado)</option>
                              <option value="gpt-4o-mini">GPT-4o mini (RÃ¡pido y econÃ³mico)</option>
                              <option value="gpt-4-turbo">GPT-4 Turbo</option>
                              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (MÃ¡s econÃ³mico)</option>
                            </select>
                          </div>
                          <div className="wbv5-form-row">
                            <div className="wbv5-form-lbl">Webhook n8n (procesamiento IA)</div>
                            <div className="wbv5-code-box" onClick={() => copyText(N8N_WH)}>{N8N_WH} <span style={{ marginLeft: 'auto', fontSize: '.6rem' }}>ð</span></div>
                            <div style={{ fontSize: '.64rem', color: '#9ca3af', marginTop: '.2rem' }}>El webhook recibe el mensaje, llama a ChatGPT y responde automÃ¡ticamente.</div>
                          </div>
                          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                              className={`wbv5-btn wbv5-btn-sm ${aiEnabled ? 'wbv5-btn-ai-on' : 'wbv5-btn-green'}`}
                              onClick={toggleAiGlobal}
                            >
                              {aiEnabled ? 'â¸ Desactivar IA' : 'ð Activar IA'}
                            </button>
                            <button className="wbv5-btn wbv5-btn-blue wbv5-btn-sm" onClick={() => window.open('https://oasiss.app.n8n.cloud', '_blank')}>Abrir n8n â</button>
                            <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => window.open('https://platform.openai.com/api-keys', '_blank')}>Obtener API Key â</button>
                          </div>
                        </div>
                      </div>

                      {/* Google Gemini â alternativa gratuita */}
                      <div className="wbv5-card">
                        <div className="wbv5-card-hd">
                          <div className="wbv5-card-title">â¨ Google Gemini (alternativa gratuita)</div>
                          <span className={`wbv5-badge ${geminiKey ? 'badge-green' : 'badge-amber'}`}>
                            {geminiKey ? 'â Conectado' : 'â³ Sin configurar'}
                          </span>
                        </div>
                        <div className="wbv5-card-bd">
                          <div style={{ fontSize: '.71rem', color: '#6b7280', marginBottom: '.75rem', lineHeight: 1.5 }}>
                            Gemini 1.5 Flash es <strong>gratis hasta 60 req/min</strong>. Ãsalo si no tienes OpenAI. El bot usa OpenAI primero y Gemini como respaldo automÃ¡tico.
                          </div>
                          <div className="wbv5-form-row">
                            <div className="wbv5-form-lbl">Google Gemini API Key</div>
                            <input
                              className="wbv5-form-input" type="password"
                              placeholder="AIzaSy..."
                              value={geminiKey}
                              onChange={e => saveGeminiKey(e.target.value)}
                            />
                            {geminiKey ? <div style={{ fontSize: '.64rem', color: '#16a34a', marginTop: '.2rem' }}>â Gemini Key guardada en navegador</div> : <div style={{ fontSize: '.64rem', color: '#9ca3af', marginTop: '.2rem' }}>ObtÃ©n tu key gratis en aistudio.google.com/apikey</div>}
                          </div>
                          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                            <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => window.open('https://aistudio.google.com/apikey', '_blank')}>Obtener Gemini Key gratis â</button>
                          </div>
                        </div>
                      </div>

                      <div className="wbv5-card">
                        <div className="wbv5-card-hd">
                          <div className="wbv5-card-title">ð Baileys (Railway)</div>
                          <span className={`wbv5-badge ${status === 'connected' ? 'badge-green' : 'badge-amber'}`}>{status === 'connected' ? 'â Activo' : 'â³ Conectando'}</span>
                        </div>
                        <div className="wbv5-card-bd">
                          <div style={{ fontSize: '.71rem', color: '#6b7280', marginBottom: '.75rem' }}>Backend principal WhatsApp vÃ­a Baileys (Railway)</div>
                          <div className="wbv5-form-row"><div className="wbv5-form-lbl">BAILEYS_SECRET</div>
                            <div className="wbv5-code-box" onClick={() => copyText('sanate_secret_2025')}>sanate_secret_2025 <span style={{ marginLeft: 'auto', fontSize: '.6rem' }}>ð</span></div>
                          </div>
                          <div className="wbv5-form-row"><div className="wbv5-form-lbl">N8N_WEBHOOK</div>
                            <div className="wbv5-code-box" onClick={() => copyText(N8N_WH)}>{N8N_WH} <span style={{ marginLeft: 'auto', fontSize: '.6rem' }}>ð</span></div>
                          </div>
                          <button className="wbv5-btn wbv5-btn-blue wbv5-btn-sm" onClick={() => window.open('https://oasiss.app.n8n.cloud', '_blank')}>Abrir n8n â</button>
                        </div>
                      </div>
                      <div className="wbv5-card">
                        <div className="wbv5-card-hd">
                          <div className="wbv5-card-title">ð WASP API (ascendentinc.studio)</div>
                          <span className="wbv5-badge badge-amber">â ï¸ Secundario</span>
                        </div>
                        <div className="wbv5-card-bd">
                          <div style={{ fontSize: '.71rem', color: '#6b7280', marginBottom: '.75rem' }}>
                            Servicio externo WhatsApp. <strong>Nota:</strong> No conectar al mismo nÃºmero que Baileys â causarÃ­a conflicto de sesiÃ³n.
                          </div>
                          <div className="wbv5-form-row"><div className="wbv5-form-lbl">Base URL</div>
                            <div className="wbv5-code-box" onClick={() => copyText('https://ascendentinc.studio/wasp/api/v1')}>https://ascendentinc.studio/wasp/api/v1 <span style={{ marginLeft: 'auto', fontSize: '.6rem' }}>ð</span></div>
                          </div>
                          <div className="wbv5-form-row"><div className="wbv5-form-lbl">API Key</div>
                            <div className="wbv5-code-box" onClick={() => copyText('wasp_d8b3da5d3c823924505e5afa974b1999')}>wasp_d8b3da5d3c823924505e5afa974b1999 <span style={{ marginLeft: 'auto', fontSize: '.6rem' }}>ð</span></div>
                          </div>
                          <div className="wbv5-form-row"><div className="wbv5-form-lbl">Edit Token</div>
                            <div className="wbv5-code-box" onClick={() => copyText('edt_bc6fc6f2517e1541')}>edt_bc6fc6f2517e1541 <span style={{ marginLeft: 'auto', fontSize: '.6rem' }}>ð</span></div>
                          </div>
                          <div className="wbv5-form-row"><div className="wbv5-form-lbl">Auth Header</div>
                            <div className="wbv5-code-box" onClick={() => copyText('Authorization: Bearer wasp_d8b3da5d3c823924505e5afa974b1999')}>Authorization: Bearer wasp_d8b3da5d3c823924505e5afa974b1999 <span style={{ marginLeft: 'auto', fontSize: '.6rem' }}>ð</span></div>
                          </div>
                          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                            <button className="wbv5-btn wbv5-btn-outline wbv5-btn-sm" onClick={() => window.open('https://ascendentinc.studio/wasp/', '_blank')}>Abrir panel WASP â</button>
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
                        <div className="wbv5-card-hd"><div className="wbv5-card-title">â±ï¸ Tiempos de respuesta</div></div>
                        <div className="wbv5-card-bd">
                          <div style={{ fontSize: '.72rem', color: '#6b7280', marginBottom: '.75rem', lineHeight: 1.5 }}>
                            Simula un comportamiento humano â la IA esperarÃ¡ antes de responder para que no parezca robot.
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
                            <button className={`wbv5-btn wbv5-btn-sm ${simulateTyping ? 'wbv5-btn-green' : 'wbv5-btn-outline'}`} onClick={() => setSimulateTyping(s => !s)}>{simulateTyping ? 'â ON' : 'âª OFF'}</button>
                          </div>
                        </div>
                      </div>
                      {/* Estilo de mensajes */}
                      <div className="wbv5-card">
                        <div className="wbv5-card-hd"><div className="wbv5-card-title">ð¨ Estilo de mensajes</div></div>
                        <div className="wbv5-card-bd">
                          <div style={{ fontSize: '.72rem', color: '#6b7280', marginBottom: '.75rem', lineHeight: 1.5 }}>
                            Controla cÃ³mo el bot estructura y formatea sus respuestas en WhatsApp.
                          </div>
                          {/* EnvÃ­o Por Partes / Completo */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.55rem 0', borderBottom: '1px solid #f3f4f6' }}>
                            <div>
                              <div style={{ fontSize: '.76rem', fontWeight: 600, color: '#111827' }}>EnvÃ­o de mensajes</div>
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
                              <div style={{ fontSize: '.64rem', color: '#9ca3af', marginTop: '.05rem' }}>{useEmojis ? 'El bot usa emojis estratÃ©gicos en sus respuestas' : 'Sin emojis â respuestas mÃ¡s formales y textuales'}</div>
                            </div>
                            <button
                              className={`wbv5-btn wbv5-btn-sm ${useEmojis ? 'wbv5-btn-green' : 'wbv5-btn-outline'}`}
                              style={{ flexShrink: 0, marginLeft: '1rem' }}
                              onClick={() => { const nv = !useEmojis; setUseEmojis(nv); try { localStorage.setItem('wa_use_emojis', String(nv)) } catch {} }}
                            >{useEmojis ? 'â Activo' : 'âª Inactivo'}</button>
                          </div>
                          {/* Uso de Estilos */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.55rem 0' }}>
                            <div>
                              <div style={{ fontSize: '.76rem', fontWeight: 600, color: '#111827' }}>Uso de estilos</div>
                              <div style={{ fontSize: '.64rem', color: '#9ca3af', marginTop: '.05rem' }}>{useStyles ? 'Usa *negrita*, _cursiva_, ~tachado~ en WhatsApp' : 'Sin formato â texto plano Ãºnicamente'}</div>
                            </div>
                            <button
                              className={`wbv5-btn wbv5-btn-sm ${useStyles ? 'wbv5-btn-green' : 'wbv5-btn-outline'}`}
                              style={{ flexShrink: 0, marginLeft: '1rem' }}
                              onClick={() => { const nv = !useStyles; setUseStyles(nv); try { localStorage.setItem('wa_use_styles', String(nv)) } catch {} }}
                            >{useStyles ? 'â Activo' : 'âª Inactivo'}</button>
                          </div>
                        </div>
                      </div>
                      {/* IA global */}
                      <div className="wbv5-card">
                        <div className="wbv5-card-hd">
                          <div className="wbv5-card-title">ð¤ Inteligencia Artificial</div>
                          <span className={`wbv5-badge ${aiEnabled ? 'badge-green' : 'badge-amber'}`}>{aiEnabled ? 'â Activa' : 'â³ Desactivada'}</span>
                        </div>
                        <div className="wbv5-card-bd">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.55rem 0', borderBottom: '1px solid #f3f4f6' }}>
                            <div>
                              <div style={{ fontSize: '.76rem', fontWeight: 600, color: '#111827' }}>Respuestas automÃ¡ticas con ChatGPT</div>
                              <div style={{ fontSize: '.64rem', color: '#9ca3af', marginTop: '.05rem' }}>Todos los mensajes entrantes son respondidos automÃ¡ticamente por IA via n8n</div>
                            </div>
                            <button
                              className={`wbv5-btn wbv5-btn-sm ${aiEnabled ? 'wbv5-btn-ai-on' : 'wbv5-btn-outline'}`}
                              style={{ flexShrink: 0, marginLeft: '1rem' }}
                              onClick={toggleAiGlobal}
                            >
                              {aiEnabled ? 'ð¤ ON' : 'âª OFF'}
                            </button>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.55rem 0', borderTop: '1px solid #f3f4f6' }}>
                            <div>
                              <div style={{ fontSize: '.76rem', fontWeight: 600, color: '#111827' }}>ActivaciÃ³n por contacto</div>
                              <div style={{ fontSize: '.64rem', color: '#9ca3af', marginTop: '.05rem' }}>La IA solo responde en chats donde se activÃ³ manualmente con el botÃ³n <strong>ð¤ IA OFF â ON</strong> del chat</div>
                            </div>
                            <span className="wbv5-badge badge-green" style={{ flexShrink: 0, marginLeft: '1rem' }}>Auto</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.55rem 0', borderTop: '1px solid #f3f4f6' }}>
                            <div>
                              <div style={{ fontSize: '.76rem', fontWeight: 600, color: '#dc2626' }}>Desactivar IA en todos los contactos</div>
                              <div style={{ fontSize: '.64rem', color: '#9ca3af', marginTop: '.05rem' }}>
                                {Object.values(aiContactMap).filter(v => v === true).length} contacto(s) con IA activa ahora
                              </div>
                            </div>
                            <button className="wbv5-btn wbv5-btn-sm" style={{ flexShrink: 0, marginLeft: '1rem', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }} onClick={resetAllAiContacts}>
                              ð« Desactivar todos
                            </button>
                          </div>
                          <div style={{ marginTop: '.4rem', fontSize: '.7rem', color: '#6b7280' }}>
                            ð¡ Para configurar la API Key de ChatGPT ve a <strong>âï¸ Ajustes â API & Tokens â ð¤ ChatGPT</strong>
                          </div>
                        </div>
                      </div>
                      <div className="wbv5-card">
                        <div className="wbv5-card-hd"><div className="wbv5-card-title">âï¸ Comportamiento del bot</div></div>
                        <div className="wbv5-card-bd">
                          {[
                            { label: 'Activar bot automÃ¡ticamente', desc: 'El bot responde a todos los mensajes entrantes', on: true },
                            { label: 'Guardar contactos en CRM', desc: 'Guarda nombre y telÃ©fono de cada nuevo contacto', on: true },
                            { label: 'Notificaciones en tiempo real', desc: 'Recibe notificaciones al llegar mensajes nuevos', on: true },
                            { label: 'Modo silencioso fuera de horario', desc: 'El bot envÃ­a mensaje de ausencia y no notifica', on: false },
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
                                onClick={() => tip(`âï¸ ${opt.label} â ${opt.on ? 'desactivado' : 'activado'}`)}
                              >
                                {opt.on ? 'â ON' : 'â OFF'}
                              </span>
                            </div>
                          ))}
                          <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" style={{ marginTop: '.75rem' }} onClick={() => tip('â ConfiguraciÃ³n guardada')}>ð¾ Guardar</button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Empresa */}
                  {cfgTab === 'empresa' && (
                    <div className="wbv5-card">
                      <div className="wbv5-card-hd"><div className="wbv5-card-title">ð¢ Datos de empresa</div></div>
                      <div className="wbv5-card-bd">
                        <div className="wbv5-form-row"><div className="wbv5-form-lbl">Nombre de la empresa</div><input className="wbv5-form-input" defaultValue="Sanate" /></div>
                        <div className="wbv5-form-row"><div className="wbv5-form-lbl">Sitio web</div><input className="wbv5-form-input" defaultValue="sanate.store" /></div>
                        <div className="wbv5-form-row"><div className="wbv5-form-lbl">WhatsApp principal</div><input className="wbv5-form-input" defaultValue={phone || '+57 ...'} /></div>
                        <div className="wbv5-form-row"><div className="wbv5-form-lbl">Email de soporte</div><input className="wbv5-form-input" defaultValue="soporte@sanate.store" /></div>
                        <div className="wbv5-form-row">
                          <div className="wbv5-form-lbl">Mensaje de bienvenida (plantilla)</div>
                          <textarea className="wbv5-form-input" rows={3} defaultValue="Â¡Hola {nombre}! ð Bienvenido a Sanate. Puedo ayudarte con:\nðï¸ Productos y precios\nð¦ Estado de pedidos\nð Soporte tÃ©cnico\n\nÂ¿QuÃ© necesitas?" style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                        </div>
                        <button className="wbv5-btn wbv5-btn-green wbv5-btn-sm" onClick={() => tip('â Datos guardados')}>ð¾ Guardar datos</button>
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
