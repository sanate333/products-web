/* ═══════════════════════════════════════════════════════════════════
   SÁNATE — Chat Asesor IA v2.0
   Dr. Santiago Morales — Especialista en Cosmética Natural
   Powered by Google Gemini Flash
   ═══════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

/* ─── CONFIG ──────────────────────────────────────────────────── */
var GEMINI_URL='/chat-proxy.php';
var DOC_NAME='Dr. Santiago Morales';
var DOC_TITLE='Especialista en Cosmética Natural · SÁNATE';
var DOC_AVATAR='https://randomuser.me/api/portraits/men/32.jpg';

/* ─── CHIP LABELS MAP ─────────────────────────────────────────── */
var CHIP_LABELS={
  manchas:'🔴 Manchas en la piel',
  acne:'🌋 Acné / Granos',
  sensible:'💧 Piel sensible',
  reseca:'🏜️ Piel reseca',
  cabello:'💇 Caída del cabello',
  energia:'⚡ Energía / Mente',
  estrias:'Estrías / Cicatrices',
  axilas:'Axilas oscuras',
  cicatrices:'Cicatrices',
  precio:'💰 Ver precios',
  combo1:'Combo x3 Jabones',
  combo3:'Combo Piel Sensible',
  combo4:'⭐ Secreto Japonés',
  pagar:'✅ Quiero pedirlo',
  envio:'🚚 Info de envío',
  devolucion:'Devolución'
};

/* ─── PRODUCTS DATA ───────────────────────────────────────────── */
var P={
  c1:{id:'c1',name:'Combo x3 Jabones a Elección',price:66000,old:99000,disc:'-33%',tag:'Precio especial',
    desc:'Elige 3 jabones artesanales 100g. Caléndula, Cúrcuma o Avena & Arroz.',
    img:'https://sanate.store/imagenes_productos/Tripack_Jabones_Artesanales.png'},
  c4:{id:'c4',name:'Combo Secreto Japonés',price:89900,old:139000,disc:'-35%',tag:'⭐ El más elegido',
    desc:'Sebo de Res 100g + 2 Jabones + Exfoliante Premium. Resultados visibles en 21 días.',
    img:'https://sanate.store/imagenes_productos/Sebo_Premium_x2.png',star:true},
  c3:{id:'c3',name:'Combo 2 Jabones Cúrcuma + Sebo 10g',price:66000,old:99000,disc:'-33%',tag:'Para manchas y acné',
    desc:'2 jabones de Cúrcuma 100g + Sebo de prueba 10g. Ideal para manchas activas.',
    img:'https://sanate.store/imagenes_productos/Tripack_Jabones___Sebo_10g.png'},
  c5:{id:'c5',name:'Combo Doble Sebo Grande',price:126900,old:179000,disc:'-29%',tag:'Resultados intensivos',
    desc:'2 Sebos de Res Premium 100g + 2 Jabones. Para cicatrices, estrías y piel muy reseca.',
    img:'https://sanate.store/imagenes_productos/Sebo_Premium_x2.png'},
  c6:{id:'c6',name:'Combo 6 Jabones a Elección',price:126000,old:198000,disc:'-36%',tag:'Pack familiar',
    desc:'6 jabones artesanales a tu elección. Envío GRATIS a toda Colombia.',
    img:'https://sanate.store/imagenes_productos/Tripack_Jabones_Artesanales.png'},
  c7:{id:'c7',name:'Tratamiento Integral Colágeno',price:159900,old:219000,disc:'-27%',tag:'Tratamiento completo',
    desc:'Sebo 100g + 2 Jab. Avena & Arroz + Polen 90 cáps. La solución integral.',
    img:'https://sanate.store/imagenes_productos/Melena_de_Le_n_x2_Cajas.png'}
};

/* ─── SYSTEM PROMPT ──────────────────────────────────────────── */
var SYSTEM=`Eres el Dr. Santiago Morales, asesor de cosmética y bienestar natural de SÁNATE Colombia. Llevas 4 años ayudando clientes. Tono cercano, humano, cálido. NUNCA digas que eres IA o bot. Mensajes CORTOS (2-4 líneas máximo). UNA sola pregunta por mensaje. 1-2 emojis máximo.

HORARIO DE SALUDO: 05:00-11:59→"Buenos días" | 12:00-18:59→"Buenas tardes" | 19:00-04:59→"Buenas noches"

PRODUCTOS Y PRECIOS OFICIALES:
• Jabón Cúrcuma 100g: manchas, acné, zonas oscuras, hiperpigmentación
• Jabón Avena & Arroz 100g: piel sensible, seca, granitos, textura opaca
• Jabón Caléndula & Aloe 100g: regenera, calma irritación, piel reactiva
• Sebo de Res Premium 100g (vidrio): cicatrices, resequedad intensa, axilas, regeneración. Ingredientes: caléndula, aceite oliva, almendras, vitamina E
• Shampoo 500ml: caída del cabello → $40.000
• Melena de León 60 cáps (caja): memoria, enfoque, ansiedad, sueño → $89.900
• Melena de León 120 cáps → $129.900 | 2×120 cáps → $220.000
• Polen Premium x50 cáps: energía, colágeno, inmunidad → $69.000
• Polen Premium x90 cáps → $99.000
• Microdosis (ps1l0) 20 cáps → $99.900 | 40 cáps → $149.900 | 60 cáps → $179.900 (solo +18, no mezclar con psiquiátricos)
• ChocoFungi 2.5g → $99.000 | 5g → $139.900

TABLA COMBOS OFICIAL (NUNCA inventar precios):
c1 – Tripack Mixto o x3 Jabones a elección → $66.000
c3 – 2 Jab.Cúrcuma + Sebo 10g → $66.000
c4 ⭐ – Secreto Japonés: Sebo 100g + 2 Jabones + Exfoliante → $89.900 (Envío GRATIS)
c5 – Doble Sebo Grande: 2 Sebos 100g + 2 Jabones → $126.900 (Envío GRATIS)
c6 – 6 Jabones a elección → $126.000 (Envío GRATIS)
c7 – Tratamiento Integral: Sebo 100g + 2 Jab.Avena + Polen 90 cáps → $159.900

REGLA JABONES: mínimo x3 jabones ($66.000). No vendemos por unidad en combos normales.
Si quiere probar: 2 jabones $49.000 o 1 jabón $29.000 — SOLO por transferencia, no contra entrega.

PROTOCOLO MANCHAS: 1°Recomendar Jabón Avena&Arroz + Caléndula (prepara piel) 2°Mencionar Cúrcuma como refuerzo 3°Cerrar con Combo 4 Secreto Japonés $89.900

REGLAS DE CONVERSACIÓN:
1. NO dar precios al inicio. Si solo saluda → preguntar qué problema quiere tratar. Luego de respuesta → añadir [CHIPS:manchas,acne,reseca,sensible,cabello,energia]
2. Si pregunta precio → primero 1 pregunta de diagnóstico → luego sí precio. Plantilla de precios SOLO una vez.
3. Tras enviar precios → solo preguntas orientación, NO repetir valores
4. NO usar 😊 más de 2 veces en toda la conversación
5. NO usar "¡Gracias por confiar en Sánate!" más de 2 veces
6. Si cliente dice "gracias","listo","igualmente","hasta luego","ok gracias" → NO responder nada más
7. NO dar números de pago automáticamente. SOLO si cliente escribe "nequi" → dar Nequi 322 746 1878. Solo si escribe "cuenta de ahorros" → dar Bancolombia 912 835 42241

ENVÍOS:
- Medellín/Bogotá: 1 día | Resto ciudades principales: 1-3 días hábiles
- Sale mismo día de la compra. Guía llega por WhatsApp/SMS
- Estamos en Armenia, Quindío. No recibimos llamadas.
- Ciudades lejanas: +$4.900 (no mencionarlo salvo que pregunten)

DEVOLUCIONES: "Analizaremos tu caso y te damos razón". Si pide dirección: "Llévalo al Interrapidísimo más cercano, bien empacado con cinta"

MARCADORES ESPECIALES (siempre al final del mensaje, línea aparte, sin puntos):
[SHOW:c4,c1] → tarjetas de productos (usar al hacer PRIMERA recomendación, máx 3 combos, códigos: c1 c3 c4 c5 c6 c7)
[PEDIDO] → formulario de pedido (solo cuando cliente claramente quiere comprar)
[CHIPS:opcion1,opcion2,opcion3] → botones de selección rápida para el cliente

Usa [CHIPS:...] cada vez que hagas una pregunta al cliente. Opciones disponibles: manchas, acne, sensible, reseca, cabello, energia, estrias, axilas, cicatrices, precio, combo1, combo3, combo4, pagar, envio

EJEMPLOS DE USO CHIPS:
- "¿Qué problema tienes?" → [CHIPS:manchas,acne,sensible,reseca,cabello,energia]
- "¿Es para rostro o cuerpo?" → [CHIPS:rostro,cuerpo,ambos]
- Cuando recomiende productos → [CHIPS:pagar,envio,precio]`;

/* ─── STATE ──────────────────────────────────────────────────── */
var history=[];
var selectedProduct=null;
var chatOpen=false;
var orderSubmitted=false;
var emojiSmileCount=0;
var thanksCount=0;

/* ─── FORMAT ─────────────────────────────────────────────────── */
var fmt=function(n){return '$'+Number(n).toLocaleString('es-CO');};

/* ═══════════════════════════════════════════════════════════════
   CSS
   ═══════════════════════════════════════════════════════════════ */
function injectCSS(){
  if(document.getElementById('snt-ac-css'))return;
  var s=document.createElement('style');
  s.id='snt-ac-css';
  s.textContent=`
/* OVERLAY */
.sac-ov{position:fixed;inset:0;z-index:99999;background:rgba(4,13,26,.82);backdrop-filter:blur(10px);display:none;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}
.sac-ov.open{display:flex}
@keyframes sacIn{from{opacity:0;transform:scale(.9) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes sacFade{from{opacity:0}to{opacity:1}}
@keyframes sacDot{0%,80%,100%{transform:scale(0);opacity:.4}40%{transform:scale(1);opacity:1}}
@keyframes sacPulse{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.18);opacity:.2}}
@keyframes sacBlink{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes sacSlide{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes sacChip{from{opacity:0;transform:translateY(8px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}

/* ── CONNECTING SCREEN ── */
.sac-conn{background:#fff;border-radius:22px;width:360px;max-width:100%;padding:40px 28px 36px;text-align:center;animation:sacIn .4s ease;box-shadow:0 32px 80px rgba(4,13,26,.25)}
.sac-conn-ring{width:88px;height:88px;border-radius:50%;margin:0 auto 20px;position:relative;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0d47a1 0%,#1976d2 100%);box-shadow:0 8px 32px rgba(13,71,161,.38)}
.sac-conn-ring::before{content:'';position:absolute;inset:-5px;border-radius:50%;border:3px solid rgba(13,71,161,.25);animation:sacPulse 1.8s ease-in-out infinite}
.sac-conn-ring::after{content:'';position:absolute;inset:-12px;border-radius:50%;border:2px solid rgba(13,71,161,.12);animation:sacPulse 1.8s ease-in-out infinite .4s}
.sac-conn-ring svg{width:38px;height:38px;fill:white}
.sac-conn-h{font-size:18px;font-weight:700;color:#0d47a1;margin-bottom:6px;font-family:inherit}
.sac-conn-s{font-size:13.5px;color:#64748b;margin-bottom:18px;line-height:1.45}
.sac-queue{display:flex;align-items:center;justify-content:center;gap:8px;background:#f0f7ff;border:1px solid #bfdbfe;border-radius:10px;padding:11px 16px;font-size:13px;color:#1e40af;margin-bottom:20px;transition:all .5s;font-weight:500}
.sac-dots{display:flex;gap:7px;justify-content:center}
.sac-dots span{width:9px;height:9px;border-radius:50%;background:#0d47a1;animation:sacDot 1.4s ease-in-out infinite}
.sac-dots span:nth-child(2){animation-delay:.22s}
.sac-dots span:nth-child(3){animation-delay:.44s}

/* ── CHAT WINDOW ── */
.sac-win{background:#fff;border-radius:22px;width:400px;max-width:100%;height:580px;max-height:88vh;display:none;flex-direction:column;overflow:hidden;box-shadow:0 32px 80px rgba(4,13,26,.3);animation:sacIn .35s ease}
.sac-win.open{display:flex}

/* Header */
.sac-head{background:linear-gradient(135deg,#0d47a1 0%,#1565c0 100%);padding:14px 16px;display:flex;align-items:center;gap:11px;flex-shrink:0}
.sac-doc-av{width:46px;height:46px;border-radius:50%;border:2.5px solid rgba(255,255,255,.45);object-fit:cover;flex-shrink:0;background:#1976d2}
.sac-doc-info{flex:1;min-width:0}
.sac-doc-name{font-size:14.5px;font-weight:700;color:#fff;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sac-doc-role{font-size:11px;color:rgba(255,255,255,.72);margin-top:1px}
.sac-online{display:flex;align-items:center;gap:5px;font-size:10.5px;color:rgba(255,255,255,.8);margin-top:3px}
.sac-online::before{content:'';width:6px;height:6px;border-radius:50%;background:#4ade80;display:inline-block;animation:sacBlink 2s ease-in-out infinite}
.sac-x{background:rgba(255,255,255,.14);border:none;color:#fff;width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:19px;font-weight:300;display:flex;align-items:center;justify-content:center;transition:.2s;flex-shrink:0;line-height:1}
.sac-x:hover{background:rgba(255,255,255,.28)}

/* Messages */
.sac-msgs{flex:1;overflow-y:auto;padding:16px 14px;display:flex;flex-direction:column;gap:10px;background:#f8fafc;overscroll-behavior:contain}
.sac-msgs::-webkit-scrollbar{width:3px}
.sac-msgs::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:2px}

/* Message bubbles */
.sac-row{display:flex;align-items:flex-end;gap:7px;animation:sacSlide .25s ease;max-width:88%}
.sac-row.u{align-self:flex-end;flex-direction:row-reverse}
.sac-av{width:28px;height:28px;border-radius:50%;flex-shrink:0;object-fit:cover;background:#0d47a1;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700}
.sac-bbl{padding:9px 13px;font-size:13.5px;line-height:1.55;color:#1e293b;max-width:100%;word-break:break-word}
.sac-row:not(.u) .sac-bbl{background:#fff;border-radius:4px 16px 16px 16px;box-shadow:0 1px 6px rgba(0,0,0,.08)}
.sac-row.u .sac-bbl{background:linear-gradient(135deg,#0d47a1,#1565c0);color:#fff;border-radius:16px 16px 4px 16px;box-shadow:0 1px 6px rgba(13,71,161,.3)}

/* Typing indicator */
.sac-typing-row{display:flex;align-items:center;gap:7px;animation:sacSlide .25s ease}
.sac-typing-label{font-size:11px;color:#64748b;font-style:italic;margin-bottom:2px}
.sac-typing{display:flex;gap:4px;padding:10px 14px;background:#fff;border-radius:4px 16px 16px 16px;box-shadow:0 1px 6px rgba(0,0,0,.08)}
.sac-typing span{width:7px;height:7px;border-radius:50%;background:#94a3b8;animation:sacDot 1.4s ease-in-out infinite}
.sac-typing span:nth-child(2){animation-delay:.22s}
.sac-typing span:nth-child(3){animation-delay:.44s}

/* Quick reply chips */
.sac-chips-wrap{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;width:100%;padding-bottom:2px}
.sac-chip{background:#fff;border:1.5px solid #bfdbfe;color:#1e40af;border-radius:100px;padding:7px 13px;font-size:12.5px;font-weight:600;cursor:pointer;transition:all .18s;white-space:nowrap;animation:sacChip .3s ease both;box-shadow:0 1px 4px rgba(13,71,161,.08);line-height:1.2}
.sac-chip:hover,.sac-chip:active{background:#0d47a1;color:#fff;border-color:#0d47a1;transform:translateY(-1px);box-shadow:0 3px 12px rgba(13,71,161,.28)}

/* Product cards */
.sac-cards{display:flex;flex-direction:column;gap:8px;margin-top:6px;width:100%}
.sac-card{background:#fff;border-radius:13px;overflow:hidden;border:1.5px solid #e2e8f0;cursor:pointer;transition:all .2s;box-shadow:0 2px 8px rgba(0,0,0,.05)}
.sac-card:hover,.sac-card:active{border-color:#0d47a1;transform:translateY(-2px);box-shadow:0 6px 20px rgba(13,71,161,.15)}
.sac-card.star{border-color:#e4aa00;box-shadow:0 2px 12px rgba(228,170,0,.15)}
.sac-card-img{width:100%;height:105px;object-fit:cover;object-position:center top;display:block}
.sac-card-body{padding:9px 11px 10px}
.sac-card-tag{font-size:9.5px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;padding:2px 8px;border-radius:100px;display:inline-block;margin-bottom:5px;background:#f0f7ff;color:#1e40af}
.sac-card.star .sac-card-tag{background:linear-gradient(135deg,#d4a017,#f0c040);color:#fff}
.sac-card-name{font-size:13px;font-weight:700;color:#0f172a;line-height:1.3;margin-bottom:3px}
.sac-card-desc{font-size:11.5px;color:#64748b;line-height:1.4;margin-bottom:7px}
.sac-card-pr{display:flex;align-items:center;gap:7px;margin-bottom:8px}
.sac-card-old{font-size:11px;color:#94a3b8;text-decoration:line-through}
.sac-card-price{font-size:16px;font-weight:800;color:#0d47a1}
.sac-card-disc{background:#dcfce7;color:#166534;font-size:10px;font-weight:700;padding:2px 7px;border-radius:100px}
.sac-card-btn{width:100%;background:linear-gradient(135deg,#0d47a1,#1565c0);color:#fff;border:none;border-radius:9px;padding:9px;font-size:13px;font-weight:600;cursor:pointer;transition:.2s}
.sac-card-btn:hover{opacity:.88}

/* Order form */
.sac-form{background:linear-gradient(160deg,#f0f7ff,#e8f4fd);border-radius:14px;padding:14px;border:1.5px solid #bfdbfe;margin-top:6px;width:100%}
.sac-form-ttl{font-size:13.5px;font-weight:700;color:#1e40af;margin-bottom:10px;text-align:center;display:flex;align-items:center;justify-content:center;gap:6px}
.sac-form-prod{display:flex;align-items:center;gap:9px;background:#fff;border-radius:10px;padding:8px 10px;margin-bottom:10px;border:1px solid #dbeafe}
.sac-form-prod img{width:38px;height:38px;border-radius:7px;object-fit:cover;flex-shrink:0}
.sac-form-prod-name{font-size:12px;font-weight:600;color:#1e40af;flex:1;line-height:1.3}
.sac-form-prod-price{font-size:14px;font-weight:800;color:#0d47a1;flex-shrink:0}
.sac-inp{width:100%;padding:9px 12px;border:1.5px solid #bfdbfe;border-radius:9px;font-size:13px;color:#1e293b;background:#fff;font-family:inherit;box-sizing:border-box;outline:none;transition:.2s;margin-bottom:7px;display:block}
.sac-inp:focus{border-color:#0d47a1;box-shadow:0 0 0 3px rgba(13,71,161,.1)}
.sac-inp::placeholder{color:#94a3b8}
.sac-btn{width:100%;background:linear-gradient(135deg,#0d47a1,#1565c0);color:#fff;border:none;border-radius:10px;padding:12px;font-size:14px;font-weight:700;cursor:pointer;transition:.2s;letter-spacing:.2px}
.sac-btn:hover{opacity:.9;transform:translateY(-1px)}
.sac-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
.sac-form-note{font-size:10.5px;color:#64748b;text-align:center;margin-top:7px;line-height:1.4}

/* Order success */
.sac-success{background:linear-gradient(135deg,#0d47a1,#1565c0);border-radius:14px;padding:22px 18px;text-align:center;color:#fff;margin-top:6px;width:100%}
.sac-suc-ico{font-size:40px;margin-bottom:8px;display:block;animation:sacIn .4s ease}
.sac-suc-h{font-size:17px;font-weight:700;margin-bottom:6px}
.sac-suc-num{background:rgba(255,255,255,.18);border-radius:8px;padding:5px 14px;font-size:13px;font-weight:700;display:inline-block;margin:8px 0 10px;letter-spacing:.5px}
.sac-suc-s{font-size:13px;opacity:.87;line-height:1.55}

/* Input bar */
.sac-bar{padding:10px 12px;background:#fff;border-top:1px solid #e9ecef;display:flex;gap:8px;align-items:center;flex-shrink:0}
.sac-tinput{flex:1;border:1.5px solid #e2e8f0;border-radius:22px;padding:9px 15px;font-size:13.5px;outline:none;font-family:inherit;color:#1e293b;transition:.2s;background:#f8fafc;min-width:0}
.sac-tinput:focus{border-color:#0d47a1;background:#fff}
.sac-tinput:disabled{opacity:.5;cursor:not-allowed}
.sac-sbtn{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#0d47a1,#1565c0);border:none;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:.2s;flex-shrink:0}
.sac-sbtn:hover:not(:disabled){transform:scale(1.08);box-shadow:0 4px 14px rgba(13,71,161,.38)}
.sac-sbtn:disabled{opacity:.4;cursor:not-allowed;transform:none}

/* Mobile */
@media(max-width:500px){
  .sac-ov{padding:0;align-items:flex-end}
  .sac-win{width:100%;border-radius:22px 22px 0 0;height:90vh;max-height:90vh}
  .sac-conn{border-radius:22px 22px 0 0;width:100%}
  .sac-chip{font-size:12px;padding:6px 11px}
}
`;
  document.head.appendChild(s);
}

/* ═══════════════════════════════════════════════════════════════
   HTML TEMPLATE
   ═══════════════════════════════════════════════════════════════ */
function injectHTML(){
  if(document.getElementById('sacOv'))return;
  var wrap=document.createElement('div');
  wrap.innerHTML=`<div id="sacOv" class="sac-ov">

  <!-- CONNECTING -->
  <div id="sacConn" class="sac-conn">
    <div class="sac-conn-ring">
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
    </div>
    <div class="sac-conn-h">Conectando con asesor...</div>
    <div class="sac-conn-s">Buscando un especialista disponible para ti 🌿</div>
    <div class="sac-queue" id="sacQueue">👥 2 personas antes en la cola</div>
    <div class="sac-dots"><span></span><span></span><span></span></div>
  </div>

  <!-- CHAT WINDOW -->
  <div id="sacWin" class="sac-win">
    <div class="sac-head">
      <img id="sacAvatar" class="sac-doc-av" src="${DOC_AVATAR}" alt="Dr." onerror="this.style.display='none'"/>
      <div class="sac-doc-info">
        <div class="sac-doc-name">${DOC_NAME}</div>
        <div class="sac-doc-role">${DOC_TITLE}</div>
        <div class="sac-online" id="sacStatus">En línea · Respondiendo ahora</div>
      </div>
      <button class="sac-x" onclick="window._sacChat&&window._sacChat.close()" title="Cerrar">&#x2715;</button>
    </div>
    <div id="sacMsgs" class="sac-msgs"></div>
    <div class="sac-bar">
      <input id="sacInp" class="sac-tinput" placeholder="Escribe tu mensaje aquí..." autocomplete="off" maxlength="400"/>
      <button id="sacSend" class="sac-sbtn" title="Enviar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
  </div>

</div>`;
  document.body.appendChild(wrap.firstElementChild);

  document.getElementById('sacInp').addEventListener('keydown',function(e){
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();window._sacChat&&window._sacChat.send();}
  });
  document.getElementById('sacOv').addEventListener('click',function(e){
    if(e.target===this)window._sacChat&&window._sacChat.close();
  });
}

/* ═══════════════════════════════════════════════════════════════
   RENDER HELPERS
   ═══════════════════════════════════════════════════════════════ */
function addMsg(role,text,extra){
  var msgs=document.getElementById('sacMsgs');
  if(!msgs)return;
  var isUser=(role==='user');
  var row=document.createElement('div');
  row.className='sac-row'+(isUser?' u':'');

  var avHTML=isUser
    ?'<div class="sac-av">Tú</div>'
    :'<img class="sac-av" src="'+DOC_AVATAR+'" alt="Dr."/>';

  var safe=text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  row.innerHTML=avHTML+'<div style="flex:1;min-width:0"><div class="sac-bbl">'+safe+'</div>'+(extra||'')+'</div>';
  msgs.appendChild(row);
  msgs.scrollTop=msgs.scrollHeight;
}

/* Typing indicator con texto "Respondiendo..." */
function showTyping(){
  var msgs=document.getElementById('sacMsgs');
  if(!msgs||document.getElementById('sacTyp'))return;

  // Update header status
  var st=document.getElementById('sacStatus');
  if(st){st.textContent='Escribiendo...';}

  var t=document.createElement('div');
  t.id='sacTyp';
  t.className='sac-typing-row';
  t.innerHTML='<img class="sac-av" src="'+DOC_AVATAR+'" alt="Dr."/>'+
    '<div>'+
      '<div class="sac-typing-label">Dr. Santiago está escribiendo...</div>'+
      '<div class="sac-typing"><span></span><span></span><span></span></div>'+
    '</div>';
  msgs.appendChild(t);
  msgs.scrollTop=msgs.scrollHeight;
}

function hideTyping(){
  var t=document.getElementById('sacTyp');
  if(t)t.remove();
  var st=document.getElementById('sacStatus');
  if(st){st.textContent='En línea · Respondiendo ahora';}
}

/* Remove all existing chips from chat */
function clearChips(){
  var all=document.querySelectorAll('.sac-chips-wrap');
  all.forEach(function(el){el.remove();});
}

/* Build quick reply chip buttons */
function buildChips(codesStr){
  var keys=codesStr.split(',').map(function(s){return s.trim();}).filter(Boolean);
  if(!keys.length)return '';
  var h='<div class="sac-chips-wrap">';
  keys.forEach(function(k,i){
    var label=CHIP_LABELS[k]||k;
    // staggered animation delay
    h+='<button class="sac-chip" style="animation-delay:'+(i*0.06)+'s" onclick="window._sacChat&&window._sacChat.chipClick('+JSON.stringify(label)+')">'+label+'</button>';
  });
  return h+'</div>';
}

/* Build product cards */
function buildCards(codes){
  var ids=codes.split(',').map(function(s){return s.trim();}).filter(function(c){return P[c];});
  if(!ids.length)return '';
  var h='<div class="sac-cards">';
  ids.forEach(function(c){
    var p=P[c];
    h+='<div class="sac-card'+(p.star?' star':'')+'" onclick="window._sacChat.pick(\''+c+'\')" role="button" tabindex="0">'+
      '<img class="sac-card-img" src="'+p.img+'" alt="'+p.name+'" loading="lazy"/>'+
      '<div class="sac-card-body">'+
        '<span class="sac-card-tag">'+p.tag+'</span>'+
        '<div class="sac-card-name">'+p.name+'</div>'+
        '<div class="sac-card-desc">'+p.desc+'</div>'+
        '<div class="sac-card-pr">'+
          '<span class="sac-card-old">'+fmt(p.old)+'</span>'+
          '<span class="sac-card-price">'+fmt(p.price)+'</span>'+
          '<span class="sac-card-disc">'+p.disc+'</span>'+
        '</div>'+
        '<button class="sac-card-btn">🛒 Quiero este combo</button>'+
      '</div>'+
    '</div>';
  });
  return h+'</div>';
}

/* Build order form */
function buildOrderForm(){
  var prod=selectedProduct?P[selectedProduct]:null;
  var prodH=prod?
    '<div class="sac-form-prod">'+
      '<img src="'+prod.img+'" alt="'+prod.name+'"/>'+
      '<span class="sac-form-prod-name">'+prod.name+'</span>'+
      '<span class="sac-form-prod-price">'+fmt(prod.price)+'</span>'+
    '</div>':'';
  return '<div class="sac-form" id="sacOrderForm">'+
    '<div class="sac-form-ttl">📦 Completa tu pedido</div>'+
    prodH+
    '<input class="sac-inp" id="sacN" placeholder="Tu nombre completo" autocomplete="name"/>'+
    '<input class="sac-inp" id="sacP" placeholder="Teléfono / WhatsApp" type="tel" autocomplete="tel"/>'+
    '<input class="sac-inp" id="sacC" placeholder="Ciudad de entrega" autocomplete="address-level2"/>'+
    '<input class="sac-inp" id="sacA" placeholder="Dirección exacta (barrio, calle, número)" autocomplete="street-address"/>'+
    '<button class="sac-btn" id="sacConfirm" onclick="window._sacChat.confirm()">✓ Confirmar pedido — Pago contra entrega</button>'+
    '<div class="sac-form-note">🔒 Pagas cuando recibes · Envío GRATIS · Garantía 30 días</div>'+
  '</div>';
}

/* ═══════════════════════════════════════════════════════════════
   GEMINI API
   ═══════════════════════════════════════════════════════════════ */
async function askGemini(userText){
  history.push({role:'user',parts:[{text:userText}]});
  try{
    var res=await fetch(GEMINI_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        system_instruction:{parts:[{text:SYSTEM}]},
        contents:history,
        generationConfig:{temperature:0.75,maxOutputTokens:420,topP:0.92,topK:40}
      })
    });
    var json=await res.json();
    var txt=json.candidates&&json.candidates[0]&&json.candidates[0].content&&json.candidates[0].content.parts[0].text;
    if(!txt)txt='Disculpa, hubo un problema. ¿Puedes repetir tu pregunta? 🙏';
    history.push({role:'model',parts:[{text:txt}]});
    return txt;
  }catch(e){
    history.pop();
    return 'Disculpa, se perdió la conexión un momento. ¿Puedes intentar de nuevo?';
  }
}

function parseResponse(raw){
  var showM=raw.match(/\[SHOW:([^\]]+)\]/);
  var chipsM=raw.match(/\[CHIPS:([^\]]+)\]/);
  var doPedido=raw.indexOf('[PEDIDO]')>=0;
  var clean=raw
    .replace(/\[SHOW:[^\]]+\]/g,'')
    .replace(/\[CHIPS:[^\]]+\]/g,'')
    .replace(/\[PEDIDO\]/g,'')
    .trim();
  var extra='';
  if(showM)extra+=buildCards(showM[1]);
  if(doPedido&&!orderSubmitted)extra+=buildOrderForm();
  if(chipsM)extra+=buildChips(chipsM[1]);
  return{text:clean,extra:extra};
}

/* ═══════════════════════════════════════════════════════════════
   ORDER PROCESSING
   ═══════════════════════════════════════════════════════════════ */
function submitOrder(){
  var nombre=(document.getElementById('sacN')||{}).value||'';
  var tel=(document.getElementById('sacP')||{}).value||'';
  var ciudad=(document.getElementById('sacC')||{}).value||'';
  var dir=(document.getElementById('sacA')||{}).value||'';

  nombre=nombre.trim();tel=tel.trim();ciudad=ciudad.trim();dir=dir.trim();
  if(!nombre||!tel||!ciudad||!dir){
    ['sacN','sacP','sacC','sacA'].forEach(function(id){
      var el=document.getElementById(id);
      if(el&&!el.value.trim()){el.style.borderColor='#ef4444';el.focus();}
    });
    return;
  }

  var prod=selectedProduct?P[selectedProduct]:{name:'Combo SÁNATE',price:0,img:''};
  var ref='SN'+Date.now().toString().slice(-6);

  var btn=document.getElementById('sacConfirm');
  if(btn){btn.disabled=true;btn.textContent='Procesando...';}

  var fd=new FormData();
  fd.append('nombre',nombre);
  fd.append('whatsapp',tel);
  fd.append('direccion',dir);
  fd.append('ciudad',ciudad);
  fd.append('departamento','');
  fd.append('adicionales','Pedido por chat IA');
  fd.append('codigo','');
  fd.append('nota','Chat Asesor IA - Ref: '+ref);
  fd.append('formaPago','efectivo');
  fd.append('total',String(prod.price));
  fd.append('productos',JSON.stringify([{idProducto:0,titulo:prod.name,cantidad:1,precio:prod.price,imagen:prod.img}]));

  fetch('/pedidoPost.php',{method:'POST',body:fd})
    .then(function(r){return r.json();})
    .then(function(d){console.log('[ChatAsesor] Pedido guardado:',d);})
    .catch(function(e){console.log('[ChatAsesor] Backend:',e.message);});

  var form=document.getElementById('sacOrderForm');
  if(form)form.remove();
  clearChips();
  orderSubmitted=true;

  var msgs=document.getElementById('sacMsgs');
  var srow=document.createElement('div');
  srow.className='sac-row';
  srow.innerHTML='<img class="sac-av" src="'+DOC_AVATAR+'" alt="Dr."/>'+
    '<div style="flex:1">'+
      '<div class="sac-success">'+
        '<span class="sac-suc-ico">🎉</span>'+
        '<div class="sac-suc-h">¡Pedido confirmado, '+nombre.split(' ')[0]+'!</div>'+
        '<div class="sac-suc-num">Pedido #'+ref+'</div>'+
        '<div class="sac-suc-s"><strong>'+prod.name+'</strong><br>'+fmt(prod.price)+' · Pago contra entrega<br>📍 '+ciudad+' — llega en <strong>1-3 días hábiles</strong><br>Te contactamos al <strong>'+tel+'</strong> para confirmar. 📦</div>'+
      '</div>'+
    '</div>';
  msgs.appendChild(srow);
  msgs.scrollTop=msgs.scrollHeight;

  var inp=document.getElementById('sacInp');
  var sbtn=document.getElementById('sacSend');
  if(inp){inp.disabled=true;inp.placeholder='¡Pedido recibido! 🎉';}
  if(sbtn)sbtn.disabled=true;

  setTimeout(function(){
    addMsg('doc','¡Listo, '+nombre.split(' ')[0]+'! Tu piel lo va a agradecer 🌿 Nuestro equipo te confirma por WhatsApp pronto. ¡Gracias por elegir SÁNATE!');
  },1800);
}

/* ═══════════════════════════════════════════════════════════════
   OPEN / CLOSE / SEND / CHIP
   ═══════════════════════════════════════════════════════════════ */
var _timers=[];

function openChat(){
  if(chatOpen)return;
  chatOpen=true;
  orderSubmitted=false;
  history=[];
  selectedProduct=null;
  emojiSmileCount=0;
  thanksCount=0;
  _timers.forEach(clearTimeout);
  _timers=[];

  var ov=document.getElementById('sacOv');
  var conn=document.getElementById('sacConn');
  var win=document.getElementById('sacWin');
  var msgs=document.getElementById('sacMsgs');
  var q=document.getElementById('sacQueue');

  msgs.innerHTML='';
  ov.classList.add('open');
  conn.style.display='block';
  win.classList.remove('open');

  // Queue countdown animation
  _timers.push(setTimeout(function(){
    q.textContent='👤 1 persona antes en la cola';
  },3200));
  _timers.push(setTimeout(function(){
    q.textContent='✅ Conectado con Dr. Santiago';
    q.style.background='#dcfce7';
    q.style.borderColor='#86efac';
    q.style.color='#166534';
  },6000));
  _timers.push(setTimeout(function(){
    conn.style.display='none';
    win.classList.add('open');
    setTimeout(function(){
      q.textContent='👥 2 personas antes en la cola';
      q.style.background='';q.style.borderColor='';q.style.color='';
    },500);

    // Doctor greeting with typing delay
    showTyping();
    _timers.push(setTimeout(function(){
      hideTyping();
      // Greeting + initial chips
      var greetChips=buildChips('manchas,acne,reseca,sensible,cabello,energia');
      addMsg('doc','¡Hola! Soy el Dr. Santiago 👨‍⚕️ Especialista en cosmética natural de SÁNATE.\n\n¿Cuéntame, qué problema de piel o salud te está preocupando?',greetChips);
      var inp=document.getElementById('sacInp');
      if(inp){inp.disabled=false;inp.focus();}
    },1400));
  },7200));

  var inp=document.getElementById('sacInp');
  var sbtn=document.getElementById('sacSend');
  if(inp)inp.disabled=true;
  if(sbtn)sbtn.disabled=true;
}

function closeChat(){
  _timers.forEach(clearTimeout);_timers=[];
  var ov=document.getElementById('sacOv');
  if(ov)ov.classList.remove('open');
  chatOpen=false;
}

async function sendMsg(){
  var inp=document.getElementById('sacInp');
  var sbtn=document.getElementById('sacSend');
  if(!inp||!sbtn||inp.disabled)return;
  var txt=inp.value.trim();
  if(!txt)return;

  inp.value='';
  inp.disabled=true;
  sbtn.disabled=true;

  // Clear existing chips when user sends a message
  clearChips();

  addMsg('user',txt);
  showTyping();

  var raw=await askGemini(txt);
  hideTyping();

  var parsed=parseResponse(raw);
  addMsg('doc',parsed.text,parsed.extra);

  if(!orderSubmitted){
    inp.disabled=false;
    sbtn.disabled=false;
    inp.focus();
  }
}

function chipClick(label){
  var inp=document.getElementById('sacInp');
  if(!inp||inp.disabled)return;
  inp.value=label;
  sendMsg();
}

function pickProduct(id){
  selectedProduct=id;
  var prod=P[id];
  if(!prod)return;
  var inp=document.getElementById('sacInp');
  if(inp&&!inp.disabled){
    inp.value='Quiero el '+prod.name;
    sendMsg();
  }
}

/* ═══════════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════════ */
function init(){
  injectCSS();
  injectHTML();

  window._sacChat={
    open:openChat,
    close:closeChat,
    send:sendMsg,
    pick:pickProduct,
    confirm:submitOrder,
    chipClick:chipClick
  };

  // Intercept "Asesoría gratis" WhatsApp button
  document.addEventListener('click',function(e){
    var btn=e.target.closest('.flwa');
    if(btn){
      e.preventDefault();
      e.stopImmediatePropagation();
      openChat();
      return false;
    }
  },true);

  // Support any button with data-chat="asesor"
  document.addEventListener('click',function(e){
    var btn=e.target.closest('[data-chat="asesor"]');
    if(btn){e.preventDefault();openChat();}
  });
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',init);
}else{
  init();
}
