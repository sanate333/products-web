/* SANATE â Super Ofertas 3D Cards + Banner Mobile Fix v3.1 */
(function(){
"use strict";

/* âââââââââââââââââââââââââââââââââââââââââââââââ
   PART 1: SUPER OFERTAS â 3 Horizontal 3D Cards
   âââââââââââââââââââââââââââââââââââââââââââââââ */

var SO_CSS = ""
/* Section container */
+"#super-ofertas{position:relative;padding:60px 20px;background:linear-gradient(135deg,#0a1628 0%,#07194e 50%,#0d2244 100%);overflow:hidden}"
+"#super-ofertas::before{content:'';position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(ellipse at 50% 0%,rgba(0,180,130,.12) 0%,transparent 70%);pointer-events:none}"

/* Header */
+".so2-hdr{text-align:center;margin-bottom:40px;position:relative;z-index:2}"
+".so2-hdr h2{font-size:28px;font-weight:900;color:#fff !important;-webkit-text-fill-color:#fff !important;background:none !important;-webkit-background-clip:unset !important;background-clip:unset !important;margin:0 0 8px;letter-spacing:-.5px}"
+".so2-hdr p{font-size:15px;color:rgba(255,255,255,.65);margin:0}"
+".marquee-track{width:max-content !important}"

/* Cards container â horizontal layout */
+".so2-track{display:flex;justify-content:center;gap:24px;perspective:1200px;position:relative;z-index:2;max-width:1100px;margin:0 auto;padding:0 10px}"

/* Individual card */
+".so2-card{display:flex;flex-direction:column;flex:0 0 calc(33.333% - 16px);max-width:340px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 15px 40px rgba(0,0,0,.3);transition:transform .5s cubic-bezier(.22,1,.36,1),box-shadow .5s ease;position:relative}"
+".so2-card:nth-child(1){transform:rotateY(4deg) translateZ(-20px)}"
+".so2-card:nth-child(2){transform:rotateY(0deg) translateZ(20px) scale(1.04);box-shadow:0 20px 60px rgba(0,180,130,.25),0 15px 40px rgba(0,0,0,.3)}"
+".so2-card:nth-child(3){transform:rotateY(-4deg) translateZ(-20px)}"
+".so2-card:hover{transform:rotateY(0deg) translateZ(30px) scale(1.05)!important;box-shadow:0 25px 60px rgba(0,180,130,.3),0 20px 50px rgba(0,0,0,.3)!important}"

/* Star card glow */
+".so2-card.so2-star{border:2px solid rgba(224,185,69,.4)}"
+".so2-card.so2-star::after{content:'';position:absolute;inset:-2px;border-radius:18px;background:linear-gradient(135deg,rgba(224,185,69,.15),transparent 50%);pointer-events:none;z-index:0}"

/* Hero image area */
+".so2-img{position:relative;aspect-ratio:1/1;height:auto;overflow:hidden;background:#f0f2f5}"
+".so2-blur-bg{position:absolute;top:-30px;left:-30px;right:-30px;bottom:-30px;width:calc(100% + 60px);height:calc(100% + 60px);object-fit:cover;filter:blur(18px) brightness(0.85) saturate(1.2);z-index:0;pointer-events:none;display:block}"
+".so2-slide{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;background:transparent !important;background-color:transparent !important;z-index:1;opacity:0;transition:opacity .8s ease}.so2-slide.so2-active{opacity:1;z-index:2}"
+".so2-grad,.so2-tag,.so2-pct,.so2-shimmer{position:absolute;z-index:2}"
+".so2-card:hover .so2-img img{transform:scale(1.08)}"
+".so2-grad{position:absolute;bottom:0;left:0;right:0;height:60px;background:linear-gradient(transparent,rgba(0,0,0,.15));pointer-events:none}"

/* Tag & discount badge */
+".so2-tag{position:absolute;top:12px;left:12px;padding:5px 12px;border-radius:20px;font-size:11px;font-weight:700;z-index:2;backdrop-filter:blur(4px);font-family:'Segoe UI Emoji','Noto Color Emoji','Apple Color Emoji',inherit}"
+".so2-pct{position:absolute;top:12px;right:12px;background:linear-gradient(135deg,#e74c3c,#c0392b);color:#fff;font-size:13px;font-weight:800;padding:6px 10px;border-radius:10px;z-index:2;box-shadow:0 3px 10px rgba(231,76,60,.3)}"

/* Shimmer effect */
+".so2-shimmer{position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent);z-index:3;animation:soShimmer 3s ease-in-out infinite}"
+"@keyframes soShimmer{0%{left:-100%}100%{left:200%}}"

/* Body content */
+".so2-body{padding:18px 20px 22px;position:relative;z-index:1}"
+".so2-body h3{font-size:16px;font-weight:800;color:#ffffff;-webkit-text-fill-color:#ffffff !important;background:none !important;-webkit-background-clip:unset !important;background-clip:unset !important;margin:0 0 6px;line-height:1.3}"
+".so2-desc{font-size:12.5px;color:#64748b;margin:0 0 14px;line-height:1.5}"

/* Urgency line */
    +".so2-urgency{color:#c0392b;font-size:.82rem;font-weight:600;display:flex;align-items:center;gap:6px;margin-bottom:8px}"
+".so2-urgency i{font-size:12px}"

/* Price row */
+".so2-row{display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap}"
+".so2-old{font-size:13px;color:#94a3b8;text-decoration:line-through}"
+".so2-new{font-size:22px;font-weight:900;color:#07194e}"
+".so2-save{font-size:11px;color:#00855e;background:#e8f7f1;padding:3px 8px;border-radius:6px;font-weight:600}"

/* CTA button */
+".so2-cta{width:100%;padding:13px;border:none;border-radius:12px;background:linear-gradient(135deg,#00b482,#008f68);color:#fff;font-size:14px;font-weight:700;cursor:pointer;transition:all .3s ease;display:flex;align-items:center;justify-content:center;gap:8px;position:relative;overflow:hidden}"
+".so2-cta:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,180,130,.35)}"
+".so2-cta::after{content:'';position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);animation:ctaBtnShine 2.8s ease-in-out infinite}"
+"@keyframes ctaBtnShine{0%{left:-100%}100%{left:200%}}"
+".so2-card.so2-star .so2-cta{background:linear-gradient(135deg,#e0b945,#c4972a)}"
+".so2-card.so2-star .so2-cta:hover{box-shadow:0 6px 20px rgba(224,185,69,.35)}"

/* Button added state */
+".so2-cta.so2-added{background:#166534!important;pointer-events:none}"
+".so2-cta.so2-added::after{display:none}"

/* âââ TOAST NOTIFICATION âââ */
+".so2-toast{position:fixed;top:20px;left:50%;transform:translateX(-50%) translateY(-120px);z-index:100000;background:linear-gradient(135deg,#166534,#15803d);color:#fff;padding:16px 28px;border-radius:14px;font-size:15px;font-weight:700;display:flex;align-items:center;gap:10px;box-shadow:0 10px 40px rgba(0,0,0,.3),0 0 0 2px rgba(22,101,52,.3);transition:transform .5s cubic-bezier(.22,1,.36,1),opacity .4s ease;opacity:0;pointer-events:none;max-width:92vw;text-align:center}"
+".so2-toast.so2-toast-show{transform:translateX(-50%) translateY(0);opacity:1}"
+".so2-toast-ico{font-size:24px;flex-shrink:0}"
+".so2-toast-gold{background:linear-gradient(135deg,#92400e,#b45309)!important;box-shadow:0 10px 40px rgba(0,0,0,.3),0 0 0 2px rgba(180,83,9,.3)!important}"

/* Navigation dots */
+".so2-dots{display:none}"

/* Mobile responsive â horizontal swipe carousel */
+"@media(max-width:768px){"
+"#super-ofertas{padding:30px 0;overflow:visible}"
+".so2-hdr{padding:0 16px}"
+".so2-hdr h2{font-size:20px}"
+".so2-hdr p{font-size:13px}"
+".so2-track{flex-direction:row;flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;gap:16px;padding:10px 20px 20px;perspective:none;max-width:100%;scroll-padding:0 20px}"
+".so2-track::-webkit-scrollbar{display:none}"
+".so2-track{-ms-overflow-style:none;scrollbar-width:none}"
+".so2-card{flex:0 0 82%;max-width:300px;scroll-snap-align:center;transform:none!important;transition:transform .3s ease,box-shadow .3s ease}"
+".so2-card:nth-child(2){transform:none!important;box-shadow:0 15px 40px rgba(0,180,130,.2),0 10px 30px rgba(0,0,0,.2)!important}"
+".so2-card:hover{transform:translateY(-4px)!important}"
+".so2-img{aspect-ratio:1/1;height:auto}"
+".so2-body{padding:14px 16px 18px}"
+".so2-body h3{font-size:15px}"
+".so2-desc{font-size:12px;margin-bottom:10px}"
+".so2-new{font-size:20px}"
+".so2-toast{top:auto;bottom:20px;font-size:14px;padding:14px 22px}"
+".so2-toast.so2-toast-show{transform:translateX(-50%) translateY(0)}"
+"}"

/* Prevent page horizontal overscroll on mobile */
+"html,body{overflow-x:hidden!important;overscroll-behavior-x:none!important}"
+"*{-webkit-tap-highlight-color:transparent}"+".var-wrap{max-height:none !important;height:auto !important;overflow:visible !important}"+".cc.star .cc-tname{color:#07192e !important;-webkit-text-fill-color:#07192e !important}"+".cc.star .cc-tsub{color:#475569 !important;-webkit-text-fill-color:#475569 !important}";

/* âââââââââââââââââââââââââââââââââââââââââââââââ
   PART 2: OFERTA DEL D&Iacute;A â Mobile Compact
   âââââââââââââââââââââââââââââââââââââââââââââââ */

var MOBILE_URG_CSS = ""
+"@media(max-width:700px){"
+".urg{padding:8px 12px!important}"
+".urg .urg-in{flex-direction:row!important;flex-wrap:wrap!important;align-items:center!important;justify-content:center!important;gap:6px!important;padding:4px 0!important}"
+".urg .urg-t{font-size:13px!important;width:100%!important;text-align:center!important;margin-bottom:0!important;line-height:1.3!important}"
+".urg .urg-t strong{font-size:14px!important}"
+".urg .timer{gap:4px!important;justify-content:center!important}"
+".urg .tb{padding:3px 6px!important;min-width:36px!important;border-radius:6px!important}"
+".urg .tb-n{font-size:16px!important;line-height:1.1!important}"
+".urg .tb-l{font-size:8px!important;letter-spacing:.5px!important;margin-top:1px!important}"
+".urg .tsep{font-size:14px!important}"
+".urg .urg-btn{font-size:12px!important;padding:6px 16px!important;border-radius:8px!important;margin-top:0!important}"
+"}";


/* âââââââââââââââââââââââââââââââââââââââââââââââ
   OFFERS DATA â with addItem cart data
   âââââââââââââââââââââââââââââââââââââââââââââââ */

  var offers = [
    {
      t: 'Tripack Jabones Artesanales',
      d: 'Cúrcuma + Avena & Arroz + Caléndula & Aloe Vera · 3 jabones 100g a elección. Limpieza natural sin químicos.',
      x: '$105.000', p: '$66.000', pct: '-37%',
      tag: '🧴 Más vendido', accent: '#27ae60',
      urg: 'Ideal para manchas, acné y piel opaca — Ahorras $39.000',
      img: '/ai-images/iMAGENES%20nEW/Curcuma%20Jabon1.webp', 
      cartId: 'j1', cartName: 'Tripack Jabones Artesanales', cartDesc: '3 jabones artesanales 100g a elección', cartPrice: 66000
    },
    {
      t: 'Secreto Japonés',
      d: 'Sebo de Res 100g frasco vidrio + 2 Jabones artesanales 100g + Exfoliante. Rutina completa piel radiante.',
      x: '$129.000', p: '$99.000', pct: '-23%',
      tag: '🔥 El más elegido', accent: '#e74c3c', star: true,
      urg: 'Piel seca, arrugas y falta de hidratación — Ahorras $30.000',
      img: '/ai-images/iMAGENES%20nEW/Combo%20Secreto%20Japones%20de%2099%2C000%202jabones%201%20sebo%20grande.webp', imgs: ['/ai-images/ecom/sebo_hero1.png'],
      cartId: 'c4', cartName: 'Secreto Japonés', cartDesc: 'Sebo 100g + 2 Jabones + Exfoliante', cartPrice: 99000
    },
    {
      t: 'Melena de León × 2 Cajas',
      d: '2 Cajas 250mg × 60 cáps = 120 cápsulas totales. 2 meses de tratamiento para memoria, enfoque e inmunidad.',
      x: '$179.800', p: '$136.000', pct: '-24%',
      tag: '🧠 Memoria & Enfoque', accent: '#9b59b6',
      urg: 'Niebla mental, falta de memoria y ansiedad — Ahorras $43.800',
      img: '/ai-images/iMAGENES%20nEW/Melena%20de%20leon%20x60%202.jpg', imgs: ['/ai-images/iMAGENES%20nEW/Melena%20de%20leon%20x60..jpg'],
      cartId: 'm2', cartName: 'Melena de León × 2 Cajas', cartDesc: '2 cajas Melena de León 250mg × 60 cáps', cartPrice: 136000
    },
    {
      t: 'Sebo Premium × 2',
      d: '2 Cremas Sebo de Res originales 100g en frasco de vidrio. Doble regeneración y nutrición profunda.',
      x: '$152.000', p: '$119.900', pct: '-21%',
      tag: '✨ Doble Poder', accent: '#d35400',
      urg: 'Piel reseca, cicatrices y estrías — Ahorras $32.100',
      img: '/ai-images/Sebo%20grande%20-%20Tabla%20beneficios%20(2).png', imgs: ['/ai-images/ecom/sebo_promo1.png'],
      cartId: 'c14', cartName: 'Sebo Premium × 2', cartDesc: '2 Sebos de Res originales 100g vidrio', cartPrice: 119900
    },
    {
      t: 'Piel & Bienestar',
      d: 'Secreto Japonés completo + Melena de León × 60 cáps. Piel regenerada y mente enfocada en un solo combo.',
      x: '$188.900', p: '$149.900', pct: '-21%',
      tag: '⭐ Combo Estrella', accent: '#f39c12', star: true,
      urg: 'Piel + mente: el combo más completo — Ahorras $39.000',
      img: '/ai-images/iMAGENES%20nEW/Combo%20Secreto%20Japones%20de%2099%2C000%202jabones%201%20sebo%20grande.webp', imgs: ['/ai-images/iMAGENES%20nEW/Melena%20de%20leon%20x60%202.jpg'],
      cartId: 'c5', cartName: 'Combo Piel & Bienestar', cartDesc: 'Secreto Japonés + Melena de León × 60', cartPrice: 149900
    },
    {
      t: 'Polen Multifloral × 90',
      d: 'Polen Multifloral Premium 500mg × 90 cápsulas. Energía, aminoácidos, vitaminas y sistema inmune.',
      x: '$120.000', p: '$99.000', pct: '-18%',
      tag: '💛 Energía Natural', accent: '#f1c40f',
      urg: 'Cansancio, sistema inmune y falta de vitalidad — Ahorras $21.000',
      img: '/ai-images/iMAGENES%20nEW/pOLEN%20X90..jpg', 
      cartId: 'p1', cartName: 'Polen Multifloral × 90', cartDesc: 'Polen Multifloral Premium 500mg × 90 cáps', cartPrice: 99000
    },
    {
      t: '2 Jabones + Sebo 10g',
      d: '2 Jabones artesanales 100g (Cúrcuma o Avena & Arroz) + Sebo de Res 10g prueba. Rutina básica natural.',
      x: '$92.000', p: '$66.000', pct: '-28%',
      tag: '💚 Inicio Natural', accent: '#1abc9c',
      urg: 'Ideal para empezar tu rutina natural — Ahorras $26.000',
      img: '/ai-images/iMAGENES%20nEW/Curcuma%20Jabon1.webp', imgs: ['/ai-images/ecom/sebo_promo1.png'],
      cartId: 'c3', cartName: '2 Jabones + Sebo 10g', cartDesc: '2 Jabones 100g + Sebo de Res 10g prueba', cartPrice: 66000
    },
    {
      t: 'Energía + Memoria',
      d: 'Polen Multifloral × 90 cáps + Melena de León × 60 cáps. El stack natural para rendimiento mental total.',
      x: '$188.900', p: '$149.900', pct: '-21%',
      tag: '💪 Rendimiento Total', accent: '#2ecc71',
      urg: 'Fatiga mental, baja concentración y sistema inmune — Ahorras $39.000',
      img: '/ai-images/iMAGENES%20nEW/Melena%20de%20leon%20x60%202.jpg', imgs: ['/ai-images/iMAGENES%20nEW/pOLEN%20X90..jpg'],
      cartId: 'c6', cartName: 'Combo Energía + Memoria', cartDesc: 'Polen × 90 + Melena de León × 60 cáps', cartPrice: 149900
    },
    {
      t: 'Kit Familia Piel',
      d: '2 Sebos de Res grandes 100g + 2 Jabones artesanales 100g. Tratamiento completo para 2 personas.',
      x: '$179.900', p: '$139.900', pct: '-22%',
      tag: '🏡 Para la Familia', accent: '#3498db',
      urg: 'Cuidado diario para toda la familia — Ahorras $40.000',
      img: '/ai-images/ecom/sebo_lifestyle1.png', imgs: ['/ai-images//iMAGENES%20nEW/Curcuma%20Jabon1.webp'],
      cartId: 'c8', cartName: 'Kit Familia Piel', cartDesc: '2 Sebos grandes 100g + 2 Jabones 100g', cartPrice: 139900
    },
    {
      t: 'Mente & Defensa',
      d: 'Melena de León × 60 cáps + Polen × 50 cáps. Memoria, concentración, sistema inmune y energía diaria.',
      x: '$158.900', p: '$129.900', pct: '-18%',
      tag: '🛡️ Inmunidad', accent: '#2c3e50',
      urg: 'Defensas bajas, niebla mental y agotamiento — Ahorras $29.000',
      img: '/ai-images/iMAGENES%20nEW/Melena%20de%20leon%20x60%202.jpg', imgs: ['/ai-images/iMAGENES%20nEW/POELNX50..jpg'],
      cartId: 'c9', cartName: 'Combo Mente & Defensa', cartDesc: 'Melena de León × 60 + Polen × 50 cáps', cartPrice: 129900
    },
    {
      t: 'Capilar Completo',
      d: 'Shampoo Nutritivo 500ml (6 activos anticaída) + Secreto Japonés. Cabello sano y piel regenerada.',
      x: '$139.000', p: '$119.900', pct: '-14%',
      tag: '💇 Cabello Sano', accent: '#16a085',
      urg: 'Caída, resequedad y cuero cabelludo irritado — Ahorras $19.100',
      img: '/ai-images/iMAGENES%20nEW/Shampo%20500ml.jpg', imgs: ['/ai-images/ecom/8shampoo%20(1).png'],
      cartId: 'c13', cartName: 'Capilar Completo', cartDesc: 'Shampoo 500ml + Secreto Japonés', cartPrice: 119900
    },
    {
      t: 'Power Mental',
      d: 'Melena de León × 2 Cajas (120 cáps) + Polen × 90 cáps. El pack número 1 para rendimiento mental.',
      x: '$228.900', p: '$179.900', pct: '-21%',
      tag: '⚡ Máx. Potencia', accent: '#8e44ad',
      urg: 'Niebla mental, memoria débil y agotamiento nervioso — Ahorras $49.000',
      img: '/ai-images/iMAGENES%20nEW/Melena%20de%20leon%20x60%202.jpg', imgs: ['/ai-images/iMAGENES%20nEW/pOLEN%20X90..jpg'],
      cartId: 'c12', cartName: 'Power Mental', cartDesc: 'Melena × 2 Cajas + Polen × 90 cáps', cartPrice: 179900
    },
    {
      t: 'Ritual Regenerador',
      d: '2 Sebos de Res grandes 100g + Melena de León × 60 cáps. Piel rejuvenecida y defensas reforzadas.',
      x: '$215.800', p: '$139.900', pct: '-35%',
      tag: '🌿 Noche Perfecta', accent: '#34495e',
      urg: 'Piel cansada, insomnio y defensas bajas — Ahorras $45.900',
      img: '/ai-images/ecom/sebo_beneficios1.png', imgs: ['/ai-images/iMAGENES%20nEW/Melena%20de%20leon%20x60%202.jpg'],
      cartId: 'c15', cartName: 'Ritual Regenerador', cartDesc: '2 Sebos grandes + Melena de León × 60 cáps', cartPrice: 139900
    },
    {
      t: 'Kit Total SÁNATE',
      d: 'Polen × 90 + Melena × 2 Cajas + Sebo grande + 3 Jabones. El pack más completo del catálogo SÁNATE.',
      x: '$370.900', p: '$259.000', pct: '-30%',
      tag: '🏆 Pack Máximo', accent: '#c0392b', star: true,
      urg: 'Transformación total: piel, mente y energía — Ahorras $111.900',
      img: '/ai-images/iMAGENES%20nEW/pOLEN%20X90..jpg', imgs: ['/ai-images/iMAGENES%20nEW/Curcuma%20Jabon1.webp'],
      cartId: 'c10', cartName: 'Kit Total SÁNATE', cartDesc: 'Polen × 90 + Melena × 2 Cajas + Sebo + 3 Jabones', cartPrice: 259000
    },
    {
      t: '2 Polen × 90 Cápsulas',
      d: '2 frascos Polen Multifloral Premium 500mg × 90 cáps (180 cáps total). Máxima energía, aminoácidos y defensas.',
      x: '$240.000', p: '$129.000', pct: '-46%',
      tag: '🔥 Doble Poder', accent: '#e67e22', star: true,
      urg: '¡Lleva 2 por menos que el precio de 1.5! — Ahorras $111.000',
      img: '/ai-images/iMAGENES%20nEW/pOLEN%20X90..jpg', 
      cartId: 'p2', cartName: '2 Polen Multifloral × 90', cartDesc: '2 frascos Polen Multifloral Premium 500mg × 90 cáps', cartPrice: 129000
    }
  ]


/* âââââââââââââââââââââââââââââââââââââââââââââââ
   TOAST NOTIFICATION SYSTEM
   âââââââââââââââââââââââââââââââââââââââââââââââ */

var toastTimer = null;

function showToast(msg, isGold){
  /* Remove existing toast */
  var old = document.querySelector('.so2-toast');
  if(old) old.remove();

  var toast = document.createElement('div');
  toast.className = 'so2-toast' + (isGold ? ' so2-toast-gold' : '');
  toast.innerHTML = '<span class="so2-toast-ico">' + (isGold ? '&#11088;' : '&#9989;') + '</span><span>' + msg + '</span>';
  document.body.appendChild(toast);

  /* Trigger animation */
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      toast.classList.add('so2-toast-show');
    });
  });

  /* Auto-hide after 3s */
  if(toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){
    toast.classList.remove('so2-toast-show');
    setTimeout(function(){ if(toast.parentNode) toast.remove(); }, 500);
  }, 3000);
}


/* âââââââââââââââââââââââââââââââââââââââââââââââ
   ADD TO CART HANDLER
   âââââââââââââââââââââââââââââââââââââââââââââââ */

function addToCartSO(idx){
  var offer = offers[idx];
  if(!offer || typeof window.addItem !== 'function') return;

  /* Call the site's native addItem */
  window.addItem({
    id: offer.cartId,
    name: offer.cartName,
    desc: offer.cartDesc,
    price: offer.cartPrice,
    img: offer.img
  });

  /* Visual feedback on button */
  var btns = document.querySelectorAll('.so2-cta');
  if(btns[idx]){
    btns[idx].classList.add('so2-added');
    btns[idx].innerHTML = '&#9989; &iexcl;A&ntilde;adido al carrito!';
    /* Reset after 2.5s */
    setTimeout(function(){
      btns[idx].classList.remove('so2-added');
      btns[idx].innerHTML = '&#128722; A&ntilde;adir al carrito';
    }, 2500);
  }

  /* Show toast notification */
  var toastMsg = '&iexcl;<strong>' + offer.cartName + '</strong> agregado a tu carrito!';
  showToast(toastMsg, !!offer.star);
}

/* Expose globally for onclick */
window.addToCartSO = addToCartSO;


/* âââââââââââââââââââââââââââââââââââââââââââââââ
   BUILD SUPER OFERTAS SECTION
   âââââââââââââââââââââââââââââââââââââââââââââââ */

function buildSuperOfertas(){
  var sec = document.getElementById('super-ofertas');
  if(!sec) return false;

  /* Build cards HTML */
  var h = '';
  h += '<div class="so2-hdr"><h2>&#128293; Combos Premium &mdash; M&aacute;s Ahorro</h2>';
  h += '<p>Los packs m&aacute;s completos para resultados reales. Precios oficiales S&Aacute;NATE.</p></div>';
  h += '<div class="so2-track">';

  offers.forEach(function(v, ci){
    h += '<div class="so2-card' + (v.star ? ' so2-star' : '') + '">';
    var vimgs = [v.img].concat(v.imgs || []);
    h += '<div class="so2-img">';
    h += '<div class="so2-blur-bg" style="background-image:url(' + vimgs[0] + ')"></div>';
    vimgs.forEach(function(src,ii){
      h += '<img src="'+src+'" alt="'+v.t+'" class="so2-slide'+(ii===0?' so2-active':'')+'">'; 
    });
    h += '<div class="so2-grad"></div>';
    h += '<span class="so2-tag" style="background:' + v.accent + '18;color:' + v.accent + ';backdrop-filter:blur(4px);font-family:\'Segoe UI Emoji\',\'Noto Color Emoji\',\'Apple Color Emoji\',inherit">' + v.tag + '</span>';
    h += '<span class="so2-pct">' + v.pct + '</span>';
    h += '<div class="so2-shimmer"></div>';
    h += '</div>';
    h += '<div class="so2-body">';
      h+='<div class="so2-urgency"><span class="so2-clock">&#128293;</span> '+(v.urg||'Oferta especial')+'</div>';
    h += '<h3>' + v.t + '</h3>';
    h += '<p class="so2-desc">' + v.d + '</p>';
    h += '<div class="so2-row">';
    h += '<span class="so2-old">' + v.x + '</span>';
    h += '<span class="so2-new">' + v.p + '</span>';
    h += '<span class="so2-save">Ahorras ' + v.pct.replace('-','') + '</span>';
    h += '</div>';
    h += '<button class="so2-cta" onclick="addToCartSO(' + ci + ')" style="border:none">&#128722; A&ntilde;adir al carrito</button>';
    h += '</div></div>';
  });

  h += '</div>';

  sec.innerHTML = h;
  return true;
}


/* âââââââââââââââââââââââââââââââââââââââââââââââ
   MOVE SECTION AFTER .urg BANNER
   âââââââââââââââââââââââââââââââââââââââââââââââ */

function moveSuperOfertas(){
  var sec = document.getElementById('super-ofertas');
  var urg = document.querySelector('.urg');
  if(!sec || !urg) return;

  /* Move right after the urg banner */
  if(urg.nextElementSibling !== sec){
    urg.parentNode.insertBefore(sec, urg.nextSibling);
  }
}


/* âââââââââââââââââââââââââââââââââââââââââââââââ
   INJECT STYLES
   âââââââââââââââââââââââââââââââââââââââââââââââ */

function injectStyles(){
  if(document.getElementById('super-ofertas-fix')) return;
  var s = document.createElement('style');
  s.id = 'super-ofertas-fix';
  s.textContent = SO_CSS + MOBILE_URG_CSS;
  document.head.appendChild(s);
}


/* âââââââââââââââââââââââââââââââââââââââââââââââ
   INIT
   âââââââââââââââââââââââââââââââââââââââââââââââ */

/* Scroll carousel to center card on mobile */
function scrollToCenter(){
  if(window.innerWidth > 768) return;
  var track = document.querySelector('.so2-track');
  if(!track) return;
  var cards = track.querySelectorAll('.so2-card');
  if(cards.length >= 2){
    /* patched: always start at card 0 */
    track.scrollLeft = 0;
  }
}

/* Fix popup on mobile â re-bind all QSO triggers */
function fixPopupMobile(){
  /* Make sure openQSO is properly hijacked */
  if(typeof window.openQSO2_orig === 'undefined' && typeof window.closeQSO2 === 'function'){
    /* The popup-banner-fix.js already loaded, just ensure all clickable QSO elements work */
    var links = document.querySelectorAll('a, button, [onclick]');
    for(var i = 0; i < links.length; i++){
      var el = links[i];
      var txt = el.textContent.trim();
      var oc = el.getAttribute('onclick') || '';
      if(txt === 'Qui\u00e9nes Somos' || oc.indexOf('openQSO') > -1){
        (function(elem){
          elem.addEventListener('touchstart', function(e){
            e.preventDefault();
            e.stopPropagation();
            if(typeof window.openQSO === 'function') window.openQSO();
          }, {passive: false});
        })(el);
      }
    }
  }
}

function init(){
  injectStyles();
  var built = buildSuperOfertas();
  if(built){
    moveSuperOfertas();
    scrollToCenter();
    fixPopupMobile();
    return true;
  }
  return false;
}

var tries = 0;
var iv = setInterval(function(){
  if(init() || tries++ > 40) clearInterval(iv);
}, 500);

/* ===== FIX Combo CTA button price ===== */
function fixComboBtnPr(){
  var emd = String.fromCharCode(8212);
  var sep = ' ' + emd + ' ';
  var btns = document.querySelectorAll('.cc-cta');
  for(var i=0;i<btns.length;i++){
    var t = btns[i].textContent;
    var dIdx = t.indexOf(sep);
    if(dIdx !== -1){ btns[i].textContent = t.substring(0, dIdx); }
  }
}
fixComboBtnPr();
setTimeout(fixComboBtnPr, 1000);
setTimeout(fixComboBtnPr, 3000);
setTimeout(fixComboBtnPr, 6000);

/* ===== Blurred backdrop for .cc-img ===== */
function fixCCBlur(){
  document.querySelectorAll('.cc-img').forEach(function(c){
    if(c.querySelector('.cc-blur-bg')) return;
    var img = c.querySelector('img');
    if(!img || !img.src) return;
    var b = document.createElement('div');
    b.className = 'cc-blur-bg';
    b.style.cssText = 'position:absolute;inset:-20px;background:url("'+img.src+'") center/cover no-repeat;filter:blur(22px) brightness(0.5);z-index:0;transform:scale(1.08);';
    c.style.position = 'relative';
    c.style.overflow = 'hidden';
    c.insertBefore(b, c.firstChild);
    img.style.position = 'relative';
    img.style.zIndex = '1';
  });
}
fixCCBlur();
setTimeout(fixCCBlur, 1000);
setTimeout(fixCCBlur, 3000);

function installBgGuard(){
  document.querySelectorAll('.so2-slide').forEach(function(img){
    if(img._bgGuard) return;
    img._bgGuard = true;
    img.style.background = 'transparent';
    img.style.backgroundColor = 'transparent';
    var obs = new MutationObserver(function(){
      if(img.style.background !== 'transparent' || img.style.backgroundColor !== 'transparent'){
        img.style.background = 'transparent';
        img.style.backgroundColor = 'transparent';
      }
    });
    obs.observe(img, {attributes:true, attributeFilter:['style']});
  });
}
installBgGuard();
setTimeout(installBgGuard, 1000);
setTimeout(installBgGuard, 3000);


function initSO2Carousel(){
  document.querySelectorAll('.so2-img').forEach(function(h){h._so2idx=0;});
}
function tickSO2Carousel(){
  document.querySelectorAll('.so2-img').forEach(function(h){
    var s=h.querySelectorAll('.so2-slide');
    if(s.length<2)return;
    var cur=h._so2idx||0;
    var nxt=(cur+1)%s.length;
    s[cur].classList.remove('so2-active');
    s[nxt].classList.add('so2-active');
    h._so2idx=nxt;
    var blur=h.querySelector('.so2-blur-bg');
    if(blur&&s[nxt].src){blur.style.backgroundImage='url('+s[nxt].src+')'}
  });
}
initSO2Carousel();
setInterval(tickSO2Carousel,3500);


/* Patch Ver solucion button on Melena card to scroll to #melena section */
(function patchMelenaBtn(){
  function doP(){
    document.querySelectorAll('.pain-cta').forEach(function(btn){
      var card = btn.closest('.pain-card')||btn.closest('.pain-item')||btn.parentElement;
      if(card && card.textContent.indexOf('Melena')!==-1){
        btn.setAttribute('onclick',"gs('melena')");
      }
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',doP);
  else setTimeout(doP,500);
})();

/* Convert 3rd vcard to Polen Instagram preview */
(function patchPolenVcard(){
  function doIt(){
    var vcards = document.querySelectorAll('.vcard');
    if(vcards.length < 3) return;
    var v = vcards[2]; // 3rd card
    var thumb = v.querySelector('.vthumb img');
    var title = v.querySelector('.vtitle');
    var desc = v.querySelector('.vdesc,.vd,[class*="desc"]');
    var addBtn = v.querySelector('[onclick*="addItem"],.vadd,button');
    if(thumb) thumb.src = '/imagenes_productos/1000750135.jpg';
    if(title) title.textContent = 'Polen Premium x50 — Energía y Colágeno Natural';
    if(desc) desc.textContent = 'Polen multifloral del Huila · 500mg · 50 cápsulas · Colágeno natural + vitalidad';
    // Add preview button if not already there
    if(!v.querySelector('.ig-preview-btn')){
      var btn = document.createElement('a');
      btn.className = 'ig-preview-btn';
      btn.href = 'https://www.instagram.com/sanate.col/';
      btn.target = '_blank';
      btn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:7px 14px;background:#E1306C;color:#fff;border-radius:20px;font-size:12px;font-weight:700;text-decoration:none;';
      btn.innerHTML = '\u25b6 Ver en Instagram';
      var vinfo = v.querySelector('.vinfo') || v;
      vinfo.appendChild(btn);
    }
    // Also fix addItem onclick
    if(addBtn && addBtn.hasAttribute('onclick')){
      addBtn.setAttribute('onclick', "addItem({id:'p2',name:'Polen Premium x50 \u2014 500mg',desc:'Col\u00e1geno natural + Polen multifloral 500mg x50',price:69900,img:'/imagenes_productos/1000750135.jpg'})");
    }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', doIt);
  else setTimeout(doIt, 800);
})();

/* Fix Melena cart thumbnail — 1000044536.jpg is Capilar, Melena needs melena_hero1.png */
(function patchMelenaImg(){
  var _orig = window.addItem;
  if(typeof _orig !== 'function') return;
  window.addItem = function(item){
    if(item && typeof item.img === 'string' && item.img.indexOf('1000044536') !== -1
       && typeof item.name === 'string' && item.name.indexOf('Melena') !== -1){
      item = Object.assign({}, item, {img: '/ai-images/ecom/melena_hero1.png'});
    }
    return _orig.call(this, item);
  };
})();
})();

/* === ROBUST PATCH: Rename Polen card === */
(function(){
  function patchPolen(){
    var cards=document.querySelectorAll('.so2-card');
    cards.forEach(function(c){
      var h3=c.querySelector('h3');
      if(!h3)return;
      var txt=h3.textContent;
      if(txt.indexOf('Col')>-1 && txt.indexOf('geno')>-1){
        h3.textContent='Polen Multifloral \u00d7 90';
        var desc=c.querySelector('.so2-desc');
        if(desc)desc.textContent='Polen Multifloral Premium 500mg \u00d7 90 c\u00e1psulas. Energ\u00eda, amino\u00e1cidos, vitaminas y sistema inmune.';
        var urg=c.querySelector('.so2-urgency');
        if(urg)urg.innerHTML='Cansancio, sistema inmune y falta de vitalidad \u2014 Ahorras $21.000';
        var btn=c.querySelector('.so2-cta');
        if(btn){var oc=btn.getAttribute('onclick')||'';btn.setAttribute('onclick',oc.replace(/Polen[^']*Col[^']*geno/g,'Polen Multifloral'));}
      }
    });
  }
  setTimeout(patchPolen,500);
  setTimeout(patchPolen,1500);
  setTimeout(patchPolen,3000);
  setTimeout(patchPolen,5000);
  setTimeout(patchPolen,8000);
})();
