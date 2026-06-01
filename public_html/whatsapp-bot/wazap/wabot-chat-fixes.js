/* wabot-chat-fixes v1.6 - 15 fixes + anti-fantasma-QR */
(function () {
  'use strict';
  if (window.__wabotChatFixesLoaded) return;
  window.__wabotChatFixesLoaded = true;
  var VER = 'v3.3';

  // FIX 35: Suprimir alert() nativo de "Bot status: connection: qr..."
  try {
    var _origAlert = window.alert;
    window.alert = function (msg) {
      if (msg && /Bot status|connection: qr|phone: desconectado|baileys: (true|false)/i.test(String(msg))) {
        console.info('[wcf] suppressed bot-status alert:', String(msg).slice(0,80));
        return;
      }
      return _origAlert.apply(this, arguments);
    };
  } catch (e) {}

  /* ---------- Boot-time: skip auth-gate on /dashboard, kill stale "Conectado" text ---------- */
  try {
    if (/^\/dashboard\//.test(location.pathname)) {
      localStorage.setItem('sanate_admin_session', '1');
      var g = document.getElementById('sa-gate-overlay'); if (g) g.remove();
    }
  } catch (e) {}

  /* ---------- CSS injection ---------- */
  function injectCSS() {
    if (document.getElementById('wcf-css')) return;
    var s = document.createElement('style'); s.id = 'wcf-css';
    s.textContent = [
      '.wcf-archived-tab{display:inline-flex;align-items:center;gap:4px;background:transparent;color:inherit;border:1px solid rgba(255,255,255,.15);padding:6px 14px;border-radius:14px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;margin-left:4px;transition:background .12s}',
      '.wcf-archived-tab:hover{background:rgba(255,255,255,.05)}',
      '.wcf-archived-tab.active{background:rgba(34,197,94,.18);color:#86efac;border-color:rgba(34,197,94,.4)}',
      '.wcf-archived-count{background:rgba(0,0,0,.15);padding:1px 6px;border-radius:8px;font-size:10px;margin-left:4px;opacity:.8}',
      '.client-tags-row,.clientTagsCurrent,[data-tags-row="current"]{display:none !important}',
      '.wcf-blackpopup-killed{display:none !important}',
      'body:not([data-page="recarga"]) #recarga-menu-overlay,body:not([data-page="recarga"]) .recargasMenuFloat,body:not([data-page="recarga"]) [data-recarga-overlay]{display:none !important}',
      '.wcf-date-stable{transition:opacity .25s ease !important}',
      '[id*="difusion-control" i]:not([data-keep]),[class*="difusion-v1" i]:not([data-keep]),[id*="oldDifusion" i],[id*="legacy" i]:not([data-keep]){display:none !important}',
      // FIX 28: NO toggle de opacity en sp50-placeholder (causaba flicker)
      '#sp50-placeholder{opacity:1 !important;transition:none !important}',
      'main > div[class*="Panel" i],main > section[class*="Panel" i]{animation:wcfFadeIn .2s ease-out}',
      '@keyframes wcfFadeIn{from{opacity:0}to{opacity:1}}',
      '.wcf-fantasma-hidden{visibility:hidden !important;opacity:0 !important;height:0 !important;overflow:hidden !important}',
      // FIX 16: anti-flicker en "WhatsApp CRM" title + zona empty chat
      '[class*="ChatEmpty" i],[class*="emptyChat" i],[class*="crm-title" i],h2:not([data-keep]):not(.mr-modal-head h3){animation:none !important}',
      'main h1,main h2,main h3{transition:none !important}',
      // FIX 17: HOY/fecha date label - fijar POSICIÓN absoluta para no titilear
      '[class*="DateDivider" i],[class*="date-divider" i],[class*="dayLabel" i],[class*="DateLabel" i]{position:relative !important;z-index:5 !important;background:rgba(255,255,255,.95) !important;padding:6px 12px !important;font-size:11px !important;font-weight:700 !important;color:#64748b !important;letter-spacing:.4px !important;text-transform:uppercase !important;transition:none !important;animation:none !important;contain:layout !important}',
      '.wcf-date-stable{transition:none !important;animation:none !important;will-change:auto !important;contain:layout !important}',
      // FIX 21: panel central anti-titileo (sin contain:layout que causaba más bugs)
      'main h1,main h2,main h3,[class*="CrmTitle" i],[class*="ChatHeader" i]{animation:none !important;transition:none !important}',
      // FIX 23: ocultar items sociales con clase .sp-hide-appchat (Instagram/Messenger/TikTok)
      '.sp-hide-appchat,.wbv5-nav-item.sp-hide-appchat{display:none !important;visibility:hidden !important}',
      // FIX 24: ocultar "apps chat" panel viejo si reaparece
      '[id*="apps-chat" i],[class*="apps-chat" i],[class*="appsChat" i],[class*="AppsChat" i]:not(.mr-modal):not([data-keep]){display:none !important}',
      // FIX 25: ESTABILIZAR "Hoy" (sp36-div) y fechas individuales (sp103-date)
      // FIX 31: SEPARADOR de fecha (sp103-date-sep) descubierto en diagnóstico
      // FIX 34: HIDE .sp36-div (HOY duplicado) — solo dejamos .sp103-date-sep como el real
      '.sp36-div{display:none !important}',
      '.sp103-date,.sp103-date-sep{transition:none !important;animation:none !important;contain:layout !important;will-change:auto !important}',
      '.sp103-date-sep{position:relative !important;height:28px !important;min-height:28px !important;max-height:28px !important;font-size:11px !important;font-weight:700 !important;color:#64748b !important;letter-spacing:.4px !important;text-transform:uppercase !important;font-variant-numeric:tabular-nums !important;padding:6px 12px !important;background:rgba(0,0,0,.025) !important;text-align:center !important}',
      '.sp103-date{font-variant-numeric:tabular-nums !important;color:#94a3b8 !important;font-size:10px !important}',
      // Estabilizar el contenedor wbv5-il-convs.sna-stable (chat list)
      '.wbv5-il-convs.sna-stable,.wbv5-inbox-list{contain:layout !important;transform:translateZ(0) !important}',
      // FIX 26: ocultar 🔄 refresh button del chat list que aparece detrás del coin badge
      '.wbv5-il-header > .wbv5-btn-sm.wbv5-btn-green,.wbv5-il-header button.wbv5-btn-green{position:relative !important;z-index:1 !important;margin-right:80px !important}',
      // FIX 27: 3 puntos en chat header (cuando hay chat abierto)
      '[class*="chat-header" i] [class*="dots" i],[class*="ChatHeader" i] [class*="dots" i],[class*="chat-header" i] button[aria-label*="options" i]{display:none !important}',
      // FIX 29: conv-itm style mutations son causa principal del flicker (panel-stabilizer modifies style every 1.5s)
      '.wbv5-conv-itm{transition:none !important;animation:none !important;contain:layout !important}',
      '.wbv5-conv-itm.sna-duplicate{display:none !important}',
      // FIX 30 RESTRICTED: solo translateZ(0) en chat-wrap, sin contain (causaba white screen)
      '.wbv5-chat-wrap{transform:translateZ(0) !important}',
      '.wbv5-chat-win > div{transition:none !important;animation:none !important;will-change:auto !important}',
      // FIX 22: Recarga overlay persiste · cerrar al cambiar de ruta · z-index controlado
      '[id*="recarga" i][class*="overlay" i]:not([data-keep-recarga]),[id*="recarga-modal" i]:not([data-keep-recarga]){display:none !important;pointer-events:none !important}',
      'body:not([data-page="recarga"]) [id*="recarga" i][style*="display"],body:not([data-page="recarga"]) [id*="recarga" i][style*="position:fixed"]{display:none !important;visibility:hidden !important;opacity:0 !important;pointer-events:none !important;z-index:-1 !important}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function injectSidebarCSS() {
    if (document.getElementById('wcf-sidebar-css')) return;
    var s = document.createElement('style'); s.id = 'wcf-sidebar-css';
    s.textContent = [
      // LIGHT theme · fondo blanco/celeste suave · cards separadas profesionales
      // Sidebar COMPACTO · Ajustes visible sin scroll
      '.wbv5-sidebar{background:linear-gradient(180deg,#f8fafc 0%,#eff6ff 60%,#ddd6fe 100%) !important;border-right:1px solid #c7d2fe !important;padding:8px 8px !important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif !important;box-shadow:2px 0 16px rgba(99,102,241,.12) !important;height:100vh !important;max-height:100vh !important;overflow-y:auto !important;overflow-x:hidden !important;scrollbar-width:thin !important;scrollbar-color:#a5b4fc transparent !important;position:sticky !important;top:0 !important}',
      // Custom scrollbar webkit
      '.wbv5-sidebar::-webkit-scrollbar{width:5px}',
      '.wbv5-sidebar::-webkit-scrollbar-track{background:transparent}',
      '.wbv5-sidebar::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#a5b4fc,#818cf8);border-radius:10px}',
      '.wbv5-sidebar::-webkit-scrollbar-thumb:hover{background:linear-gradient(180deg,#818cf8,#6366f1)}',
      // OCULTAR header "Sanate Bot WHATSAPP AUTOMATION" y account block "sanate.store"
      '.wbv5-sb-logo,.wbv5-sb-acct{display:none !important}',
      // Section headers compactos · subir cerca al Panel
      '.wbv5-nav-section{font-size:9px !important;font-weight:800 !important;color:#3b82f6 !important;text-transform:uppercase !important;letter-spacing:1.2px !important;padding:8px 8px 3px !important;margin:0 !important;border:none !important;background:transparent !important}',
      // PRIMERA section (PRINCIPAL) más pegada al Panel
      '.wbv5-nav-section:first-of-type{padding-top:4px !important}',
      // Cada nav-item es una CARD separada con borde celeste suave
      // Nav items - elegantes, neon translúcido, tamaño UNIFORME
      '.wbv5-nav-item{display:flex !important;align-items:center !important;gap:9px !important;padding:7px 11px !important;margin:1px 0 !important;border-radius:8px !important;font-size:12.5px !important;line-height:1.2 !important;font-weight:600 !important;color:#1e40af !important;cursor:pointer !important;transition:all .15s cubic-bezier(.4,0,.2,1) !important;text-decoration:none !important;background:rgba(255,255,255,.35) !important;backdrop-filter:blur(6px) !important;border:1px solid rgba(125,211,252,.4) !important;box-shadow:0 1px 3px rgba(56,189,248,.06),inset 0 1px 0 rgba(255,255,255,.6) !important;position:relative !important;overflow:hidden !important;height:32px !important;min-height:32px !important;max-height:32px !important;box-sizing:border-box !important}',
      // FORZAR tamaño igual en TODO el contenido interno (icons + text + badges)
      '.wbv5-nav-item *{font-size:12.5px !important;font-weight:600 !important;line-height:1.1 !important}',
      // Badges (WA BUSINESS, CREDITOS) MUCHO más pequeños y discretos
      '.wbv5-nav-item .wa-business,.wbv5-nav-item .creditos,.wbv5-nav-item [class*="badge"],.wbv5-nav-item [class*="Badge"],.wbv5-nav-item .wbv5-badge,.sp-meta-nav-badge,.sp-recarga-nav-badge{font-size:8px !important;font-weight:700 !important;padding:1px 5px !important;border-radius:6px !important;letter-spacing:.3px !important;background:linear-gradient(135deg,#06b6d4,#3b82f6) !important;color:#fff !important;margin-left:auto !important;text-transform:uppercase !important;line-height:1.4 !important;box-shadow:0 1px 3px rgba(56,189,248,.3) !important}',
      // FIX 20: Meta WA Business + Recarga créditos - IGUAL que .wbv5-nav-item
      '.sp-meta-nav-item,.sp-recarga-nav-item{display:flex !important;align-items:center !important;gap:9px !important;padding:7px 11px !important;margin:1px 0 !important;border-radius:8px !important;font-size:12.5px !important;line-height:1.2 !important;font-weight:600 !important;color:#1e40af !important;cursor:pointer !important;transition:all .15s cubic-bezier(.4,0,.2,1) !important;text-decoration:none !important;background:rgba(255,255,255,.35) !important;backdrop-filter:blur(6px) !important;border:1px solid rgba(125,211,252,.4) !important;box-shadow:0 1px 3px rgba(56,189,248,.06),inset 0 1px 0 rgba(255,255,255,.6) !important;position:relative !important;overflow:hidden !important;height:32px !important;min-height:32px !important;max-height:32px !important;box-sizing:border-box !important}',
      '.sp-meta-nav-item *,.sp-recarga-nav-item *{font-size:12.5px !important;font-weight:600 !important;line-height:1.1 !important}',
      '.sp-meta-nav-item:hover,.sp-recarga-nav-item:hover{background:rgba(255,255,255,.75) !important;border-color:#818cf8 !important;color:#312e81 !important;transform:translateX(3px) !important;box-shadow:0 3px 10px rgba(99,102,241,.18),0 0 0 1px rgba(129,140,248,.2) !important}',
      '.sp-meta-nav-item svg,.sp-recarga-nav-item svg{width:14px !important;height:14px !important;flex-shrink:0 !important}',
      '.wbv5-nav-item::before{content:"" !important;position:absolute !important;left:0 !important;top:0 !important;bottom:0 !important;width:3px !important;background:linear-gradient(180deg,#06b6d4,#3b82f6) !important;opacity:0 !important;transition:opacity .2s !important;border-radius:0 2px 2px 0 !important}',
      '.wbv5-nav-item:hover{background:rgba(255,255,255,.75) !important;border-color:#818cf8 !important;color:#312e81 !important;transform:translateX(3px) !important;box-shadow:0 3px 10px rgba(99,102,241,.18),0 0 0 1px rgba(129,140,248,.2) !important}',
      '.wbv5-nav-item:hover::before{opacity:1 !important}',
      // ACTIVO con NEON glow celeste futurista
      '.wbv5-nav-item.active,.wbv5-nav-item[aria-current="page"]{background:linear-gradient(135deg,#0ea5e9 0%,#3b82f6 50%,#6366f1 100%) !important;color:#fff !important;border-color:#0284c7 !important;box-shadow:0 6px 20px rgba(14,165,233,.5),0 0 30px rgba(99,102,241,.4),inset 0 1px 0 rgba(255,255,255,.3),0 0 0 1px rgba(56,189,248,.5) !important;font-weight:700 !important;text-shadow:0 1px 2px rgba(0,0,0,.15) !important}',
      '.wbv5-nav-item.active::before,.wbv5-nav-item[aria-current="page"]::before{opacity:0 !important}',
      // Glow animado en el item activo
      '@keyframes wcfNeonPulse{0%,100%{box-shadow:0 6px 20px rgba(14,165,233,.5),0 0 30px rgba(99,102,241,.4),inset 0 1px 0 rgba(255,255,255,.3),0 0 0 1px rgba(56,189,248,.5)}50%{box-shadow:0 8px 26px rgba(14,165,233,.65),0 0 40px rgba(99,102,241,.55),inset 0 1px 0 rgba(255,255,255,.4),0 0 0 1px rgba(56,189,248,.7)}}',
      '.wbv5-nav-item.active,.wbv5-nav-item[aria-current="page"]{animation:wcfNeonPulse 2.5s ease-in-out infinite !important}',
      // Submenu items (Dispositivos) más pequeños
      '.wbv5-nav-item[data-sub],.wbv5-nav-item.wbv5-sub{padding-left:32px !important;font-size:12px !important;background:#f1f5f9 !important;border-color:#e2e8f0 !important}',
      // Footer compacto
      '.wbv5-sb-footer{padding:6px 6px !important;border-top:1px solid #dbeafe !important;margin-top:6px !important}',
      // Status badge
      '.wbv5-status-badge{display:inline-flex !important;align-items:center !important;gap:6px !important;padding:6px 11px !important;border-radius:12px !important;font-size:11px !important;font-weight:800 !important;letter-spacing:.3px !important;background:#fee2e2 !important;color:#dc2626 !important;border:1px solid #fecaca !important}',
      // IA ON button - violet futurista
      '.wbv5-btn-ai-on{width:100% !important;display:flex !important;align-items:center !important;justify-content:center !important;gap:6px !important;padding:8px 12px !important;background:linear-gradient(135deg,#8b5cf6 0%,#6366f1 100%) !important;color:#fff !important;border:none !important;border-radius:9px !important;font-size:12px !important;font-weight:800 !important;letter-spacing:.4px !important;cursor:pointer !important;box-shadow:0 3px 10px rgba(139,92,246,.3) !important;transition:transform .15s,box-shadow .15s !important;margin-top:6px !important}',
      '.wbv5-btn-ai-on:hover{transform:translateY(-2px) !important;box-shadow:0 6px 18px rgba(139,92,246,.45) !important}',
      // Ocultar texto "n8n + Baileys"
      '.wbv5-sb-footer > div:not(.wbv5-status-badge):not(button):not(.wbv5-btn-ai-on){font-size:0 !important;height:0 !important;overflow:hidden !important;margin:0 !important;padding:0 !important}',
      // Inyectar un mini-header limpio en lugar del Sanate Bot original
      '.wbv5-sidebar::before{content:"⚡ WaZap Panel";display:block;font-size:13px;font-weight:800;color:#1e3a8a;padding:4px 10px 6px;border-bottom:1px solid #dbeafe;margin-bottom:4px;letter-spacing:-.2px}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ---------- FIX 15: ANTI-FANTASMA QR ---------- */
  // Pre-load status BEFORE React renders to avoid showing stale "Conectado"
  // Hide green-check / Desvincular UI until verified
  var WORKER = 'https://sanate-wa-bot.onrender.com';
  var realConn = null; // null=unknown, true/false=verified
  function hideFantasmaUI() {
    // Hide green check icon, "Conectado" text, "Desvincular WhatsApp" button
    // until realConn is verified
    var nodes = document.querySelectorAll('*');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.children.length > 0) continue;
      var t = (el.textContent || '').trim();
      if (!/^(✓\s*Conectado|🟢\s*Conectado|Conectado|WhatsApp Conectado|Desvincular WhatsApp|🔌\s*Desvincular)/i.test(t)) continue;
      if (t.length > 60) continue;
      if (realConn === false) {
        if (!el.dataset.wcfFantasmaHidden) {
          el.dataset.wcfFantasmaHidden = '1';
          el.dataset.wcfOriginalText = t;
          if (/^(✓\s*Conectado|🟢\s*Conectado|Conectado)/i.test(t)) {
            el.textContent = '⏳ Verificando...';
            el.style.color = '#f59e0b';
            el.style.opacity = '0.6';
          } else if (/Desvincular/i.test(t)) {
            // Hide Desvincular button — should not show if disconnected
            var btn = el.closest('button') || el.parentElement;
            if (btn) btn.classList.add('wcf-fantasma-hidden');
          }
        }
      } else if (realConn === true) {
        // Verified connected — restore originals
        if (el.dataset.wcfFantasmaHidden && el.dataset.wcfOriginalText) {
          el.textContent = el.dataset.wcfOriginalText;
          el.style.color = '';
          el.style.opacity = '';
        }
      }
    }
  }

  function verifyRealConnection() {
    fetch(WORKER + '/api/whatsapp/status', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (s) {
        // Truly connected = rawState===open AND connectedPhone is non-empty
        realConn = (s.rawState === 'open' || s.baileysConnected === true) && !!s.connectedPhone;
        hideFantasmaUI();
        // If not connected, auto force-connect to get QR fast
        if (!realConn && !window.__wcfAutoQRTried) {
          window.__wcfAutoQRTried = true;
          if (!s.hasQR && s.qrAttempts === 0) {
            fetch(WORKER + '/api/whatsapp/connect', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ force: true })
            }).then(function () { console.info('[wcf] auto force-connect triggered'); })
              .catch(function () {});
          }
        }
      })
      .catch(function () {});
  }

  /* FIX 11 DESACTIVADO: toggle de wcf-ready cada 1.5s era LA CAUSA del flicker */
  function antiFlashOnNavigation() {
    var ph = document.getElementById('sp50-placeholder');
    if (ph && !ph.classList.contains('wcf-ready')) ph.classList.add('wcf-ready');
  }

  /* ---------- FIX 1+2: Archivados tab ---------- */
  function ensureArchivadosTab() {
    if (document.querySelector('.wcf-archived-tab')) return;
    var btns = Array.from(document.querySelectorAll('button'));
    var waBtn = btns.find(function (b) {
      var t = (b.textContent || '').trim();
      return /^📱?\s*WhatsApp\s*$/.test(t) && b.offsetWidth > 0 && b.offsetWidth < 200;
    });
    if (!waBtn || !waBtn.parentElement) return;
    var ar = document.createElement('button');
    ar.type = 'button';
    ar.className = 'wcf-archived-tab';
    ar.innerHTML = '📂 Archivados <span class="wcf-archived-count">0</span>';
    ar.addEventListener('click', function (e) { e.stopPropagation(); toggleArchivedFilter(); });
    if (waBtn.nextSibling) waBtn.parentElement.insertBefore(ar, waBtn.nextSibling);
    else waBtn.parentElement.appendChild(ar);
    var todos = btns.find(function (b) { return (b.textContent || '').trim() === 'Todos' && b.offsetWidth > 0; });
    var hasActive = btns.some(function (b) { return b.classList.contains('active') || b.classList.contains('chip-active') || b.getAttribute('aria-selected') === 'true'; });
    if (todos && !hasActive) todos.classList.add('active');
  }
  function toggleArchivedFilter() {
    var btn = document.querySelector('.wcf-archived-tab'); if (!btn) return;
    var was = btn.classList.contains('active');
    if (!was) Array.from(btn.parentElement.children).forEach(function (b) { if (b !== btn) b.classList.remove('active'); });
    else { var todos = Array.from(btn.parentElement.children).find(function (b) { return (b.textContent || '').trim() === 'Todos'; }); if (todos) todos.classList.add('active'); }
    btn.classList.toggle('active', !was);
    window.__wcfShowArchivedOnly = !was;
    applyArchivedFilter();
  }
  function isChatArchived(row) {
    return row.dataset.archived === '1' || row.classList.contains('archived') || row.classList.contains('chatArchived') || !!row.querySelector('[class*="archived" i]:not(button)');
  }
  function applyArchivedFilter() {
    var show = !!window.__wcfShowArchivedOnly;
    var rows = document.querySelectorAll('[class*="chatItem"], [class*="ChatListItem"], [class*="chat-row"], .conversation-item');
    var n = 0;
    rows.forEach(function (row) {
      var a = isChatArchived(row); if (a) n++;
      if (show) row.style.display = a ? '' : 'none';
      else row.style.display = a ? 'none' : '';
    });
    var ct = document.querySelector('.wcf-archived-count');
    if (ct) ct.textContent = n;
  }

  /* ---------- FIX 5: Hoy ---------- */
  function stabilizeHoyLabel() {
    document.querySelectorAll('span, div').forEach(function (el) {
      if (el.children.length > 0) return;
      var t = (el.textContent || '').trim();
      if (/^(Hoy|Ayer)$/i.test(t) && !el.dataset.wcfStable) {
        el.dataset.wcfStable = '1';
        el.classList.add('wcf-date-stable');
      }
    });
  }

  /* ---------- FIX 6: Tags popup ---------- */
  function hideClientTagsPopup() {
    document.querySelectorAll('div, ul, nav').forEach(function (row) {
      if (row.dataset.wcfChecked || row.children.length < 3 || row.children.length > 6) return;
      var labels = Array.from(row.children).map(function (c) { return (c.textContent || '').trim(); });
      var ls = labels.join(',');
      var lc = /Nuevo/.test(ls) && /Potencial/.test(ls) && /Cliente/.test(ls) && /Perdido/.test(ls);
      var fil = /Todos|Sin leer|WhatsApp/.test(ls);
      if (lc && !fil && labels.length <= 5) {
        row.dataset.wcfChecked = '1';
        var r = row.getBoundingClientRect();
        if (r.top < 250 && r.left > 250) row.style.display = 'none';
      }
    });
  }

  function hideBotStatusPopup() {
    var p = document.getElementById('ccs-standalone-pill') || document.getElementById('oasis-coins') || document.getElementById('coin-badge');
    if (!p) return;
    var pr = p.getBoundingClientRect();
    document.querySelectorAll('div, span, section').forEach(function (el) {
      if (el === p || p.contains(el) || el.dataset.wcfBotChecked) return;
      var t = (el.textContent || '').trim();
      if (t.length > 100 || el.children.length > 5) return;
      if (!/bot.?status|estado.?bot|status.?bot/i.test(t)) return;
      var rc = el.getBoundingClientRect();
      if (Math.abs(rc.top - pr.top) < 150 && rc.right > pr.left - 100 && rc.width > 30) {
        el.dataset.wcfBotChecked = '1';
        el.classList.add('wcf-blackpopup-killed');
      }
    });
  }

  function fixRecargasOverlay() {
    var path = location.pathname.toLowerCase();
    var isR = /recarga|recargas|precios|pricing/.test(path);
    document.body.setAttribute('data-page', isR ? 'recarga' : path.replace(/^\//,'').replace(/\//g,'-') || 'home');
    if (!isR) {
      // Selector AMPLIO + JS removal forzado
      document.querySelectorAll('#recarga-menu-overlay, .recargasMenuFloat, [data-recarga-overlay], [class*="recargaFloat" i], [id*="recarga-modal" i], [id*="recarga"][style*="position:fixed"], [class*="recarga"][style*="z-index"]').forEach(function (el) {
        var cs = getComputedStyle(el);
        if (cs.position === 'fixed' || parseInt(cs.zIndex || 0, 10) > 100) {
          el.style.setProperty('display', 'none', 'important');
          el.style.setProperty('visibility', 'hidden', 'important');
          el.style.setProperty('pointer-events', 'none', 'important');
        }
      });
    }
  }

  // FIX 33: Meta modal cierra al hacer click en cualquier otro nav-item
  function setupMetaModalAutoClose() {
    if (window.__wcfMetaModalHooked) return;
    window.__wcfMetaModalHooked = true;
    document.addEventListener('click', function (ev) {
      var t = ev.target;
      if (!t) return;
      // Si el click es en cualquier nav-item del sidebar EXCEPTO Meta
      var navItem = t.closest && (t.closest('.wbv5-nav-item') || t.closest('.sp-recarga-nav-item'));
      var isMetaItem = t.closest && t.closest('#sp-meta-nav-btn, .sp-meta-nav-item');
      if (navItem && !isMetaItem) {
        // Cerrar Meta modal si está abierto
        var metaPanel = document.getElementById('sp-meta-panel') || document.querySelector('.sp-meta-modal');
        if (metaPanel && getComputedStyle(metaPanel).display !== 'none') {
          metaPanel.style.setProperty('display', 'none', 'important');
        }
      }
    }, true);
  }

  // FIX 18: ocultar Instagram/Messenger/TikTok que vuelven a aparecer
  function hideSocialNavItems() {
    document.querySelectorAll('.wbv5-nav-item').forEach(function (el) {
      var t = (el.textContent || '').trim();
      if (/^(Instagram|Messenger|TikTok|Facebook|Twitter|YouTube)$/i.test(t) && !el.dataset.wcfSocialHidden) {
        el.dataset.wcfSocialHidden = '1';
        el.style.setProperty('display', 'none', 'important');
      }
    });
  }

  // FIX 32: Recarga panel sync con coins reales (NO hardcoded 1000)
  var SB_URL_ = 'https://lvmeswlvszsmvgaasazs.supabase.co';
  var SB_KEY_ = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2bWVzd2x2c3pzbXZnYWFzYXpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MjYzMTEsImV4cCI6MjA4NzEwMjMxMX0.pKhuLjRLgpWMBsEUv1WhCytpbUUT6tKj3sacIGit2z4';
  var wcfCoins = { wazap: null, plan: null, t: 0 };
  function syncRecargaPanel() {
    // Buscar dentro de .sp-recarga-quota-card (estructura real descubierta)
    var card = document.querySelector('.sp-recarga-quota-card');
    if (!card) return;
    var labels = [];
    card.querySelectorAll('*').forEach(function (el) {
      if (el.children.length > 0) return;
      if (/^(usadas|disponibles)$/i.test((el.textContent || '').trim())) labels.push(el);
    });
    if (!labels.length) return;
    var now = Date.now();
    if (now - wcfCoins.t < 6000 && wcfCoins.wazap != null) { applyRecargaNums(); return; }
    fetch(SB_URL_ + '/rest/v1/oasis_stores?select=coins_wazap,plan_type&is_active=eq.true&limit=1', {
      headers: { apikey: SB_KEY_, Authorization: 'Bearer ' + SB_KEY_ }
    }).then(function (r) { return r.json(); }).then(function (rows) {
      var s = (rows && rows[0]) || {};
      wcfCoins.wazap = s.coins_wazap;
      wcfCoins.plan = s.plan_type;
      wcfCoins.t = now;
      applyRecargaNums();
    }).catch(function () {});
  }
  function applyRecargaNums() {
    if (wcfCoins.wazap == null) return;
    var card = document.querySelector('.sp-recarga-quota-card');
    if (!card) return;
    var planInc = { trial: 0, basic: 0, standard: 200, plus: 500, pro: 800, premium: 9999 };
    var inc = planInc[wcfCoins.plan] || 0;
    var avail = wcfCoins.wazap;
    var used = wcfCoins.plan === 'premium' ? 0 : Math.max(0, inc - avail);
    // ESTRUCTURA REAL: labels y vals son siblings PLANOS dentro del card (no anidados en pares)
    // Pareamos por ORDEN: caminamos el card y agrupamos por aparicion secuencial label->val
    var labs = Array.prototype.slice.call(card.querySelectorAll('.sp-recarga-quota-label'));
    var vals = Array.prototype.slice.call(card.querySelectorAll('.sp-recarga-quota-val'));
    for (var i = 0; i < labs.length; i++) {
      var lab = labs[i];
      var val = vals[i];
      if (!lab || !val) continue;
      var lt = (lab.textContent || '').trim().toLowerCase();
      if (lt !== 'usadas' && lt !== 'disponibles') continue;
      var target = lt === 'disponibles' ? avail : used;
      var currentRaw = val.textContent.trim().replace(/[.,]/g, '');
      var current = parseInt(currentRaw, 10);
      if (current !== target) {
        val.textContent = target.toLocaleString('es-CO');
      }
      // MutationObserver para defender contra React re-renders
      if (!val.dataset.wcfObs) {
        val.dataset.wcfObs = '1';
        val.dataset.wcfTarget = String(target);
        (function (v) {
          new MutationObserver(function () {
            var tt = parseInt(v.textContent.trim().replace(/[.,]/g,''), 10);
            var expected = parseInt(v.dataset.wcfTarget || '0', 10);
            if (tt !== expected) v.textContent = expected.toLocaleString('es-CO');
          }).observe(v, {childList: true, characterData: true, subtree: true});
        })(val);
      } else {
        val.dataset.wcfTarget = String(target);
      }
    }
    // Update .sp-recarga-quota-limit ("0% utilizado")
    card.querySelectorAll('.sp-recarga-quota-limit').forEach(function (lim) {
      var t = (lim.textContent || '').trim();
      var mUti = t.match(/^(\d+)%\s*utilizado/i);
      if (mUti && inc > 0) {
        var pct = wcfCoins.plan === 'premium' ? 0 : Math.round((used / inc) * 100);
        if (+mUti[1] !== pct) lim.textContent = pct + '% utilizado';
      }
    });
    card.querySelectorAll('*').forEach(function (el) {
      if (el.children.length > 0) return;
      var t = (el.textContent || '').trim();
      // "de 1.000 permitidas" / "de 1000 permitidos"
      var mPer = t.match(/^de\s+([\d.,]+)\s+permitid(?:os|as|a|o)$/i);
      if (mPer) {
        var curPer = parseInt(mPer[1].replace(/[.,]/g,''), 10);
        if (curPer !== inc) {
          var suffix = t.endsWith('s') ? 'permitidas' : 'permitidos';
          el.textContent = 'de ' + inc.toLocaleString('es-CO') + ' ' + suffix;
        }
      }
      var mUti = t.match(/^(\d+)%\s*utilizado$/i);
      if (mUti && inc > 0) {
        var pct = wcfCoins.plan === 'premium' ? 0 : Math.round((used / inc) * 100);
        if (+mUti[1] !== pct) el.textContent = pct + '% utilizado';
      }
    });
  }

  function tick() {
    try { injectCSS(); } catch (e) {}
    try { injectSidebarCSS(); } catch (e) {}
    try { hideSocialNavItems(); } catch (e) {}
    try { setupMetaModalAutoClose(); } catch (e) {}
    try { syncRecargaPanel(); } catch (e) {}
    try { ensureArchivadosTab(); } catch (e) {}
    try { applyArchivedFilter(); } catch (e) {}
    try { stabilizeHoyLabel(); } catch (e) {}
    try { hideClientTagsPopup(); } catch (e) {}
    try { hideBotStatusPopup(); } catch (e) {}
    try { fixRecargasOverlay(); } catch (e) {}
    try { antiFlashOnNavigation(); } catch (e) {}
    try { hideFantasmaUI(); } catch (e) {}
  }

  injectCSS();
  realConn = false;
  hideFantasmaUI();
  verifyRealConnection();
  setInterval(verifyRealConnection, 4000);
  setupMetaModalAutoClose();

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tick);
  else tick(