/* WhatsApp Oasis — Chats hotfix v5.4
 * Fix 1-8: heredados de v4.4
 * Fix 9: Filter-bar persistente — inbox mantiene min-width; filtros siempre visibles
 * Fix 10: Anti-flickering — reducir frecuencia de intervalos agresivos (600ms→2s, 1s→3s)
 * Fix 11: White-screen watchdog más tolerante (espera 15 s antes de recargar)
 * Fix 12: iframeGuard solo actúa cuando hay cambio real (evita reflows constantes)
 * Fix 13: sp-chat-iframe contenido dentro de .wbv5-chat-win (no cubre inbox-list)
 * Fix 14: Grid layout — inbox SIEMPRE col-1 (izq), chat-win SIEMPRE col-2 (der), ignora orden DOM
 */
(function(){
  'use strict';
  try {
    if(window.location.pathname.indexOf('/dashboard/whatsapp-bot')!==0) return;
    if(window.__spChatsV53) return;
    window.__spChatsV53 = true;

    /* ── CSS ───────────────────────────────────────────────────────── */
    (function injectCss(){
      if(document.getElementById('waoasis-chats-css-v53')) return;
      var s = document.createElement('style');
      s.id = 'waoasis-chats-css-v53';
      s.textContent = [

        /* Fix 9+14 — Grid layout: inbox SIEMPRE col-1, chat-win SIEMPRE col-2 (ignora DOM order) */
        '@media (min-width:901px){',
        '  .wbv5-chat-wrap{',
        '    display:grid!important;',
        '    grid-template-columns:1fr 360px!important;',
        '    grid-template-rows:1fr!important;',
        '  }',
        '  .wbv5-inbox-list{',
        '    grid-column:1!important;grid-row:1!important;',
        '    min-width:0!important;max-width:none!important;',
        '    overflow:hidden!important;',
        '    display:flex!important;flex-direction:column!important;',
        '  }',
        /* Fix 13+14 — chat-win siempre col-2, posición relativa para contener iframe */
        '  .wbv5-chat-win{',
        '    grid-column:2!important;grid-row:1!important;',
        '    min-width:0!important;',
        '    position:relative!important;overflow:hidden!important;',
        '  }',
        /* Fix 13 — iframe confinado dentro del chat-win, no del chat-wrap completo */
        '  #sp-chat-iframe{',
        '    position:absolute!important;',
        '    left:0!important;top:0!important;',
        '    width:100%!important;height:100%!important;',
        '    z-index:10!important;',
        '  }',
        /* Filtros siempre visibles — scroll horizontal si hay poco espacio */
        '  .wbv5-il-filters{',
        '    flex-wrap:wrap!important;overflow-x:auto!important;',
        '    max-height:none!important;flex-shrink:0!important;',
        '    scrollbar-width:none!important;',
        '  }',
        '  .wbv5-il-filters::-webkit-scrollbar{display:none!important;}',
        '}',

        /* Fix 9 mobile: sin cambios en <900px */

        /* Fix 10 — Suprimir parpadeo en transiciones de layout */
        '.wbv5-chat-wrap{will-change:auto!important;}',
        '.wbv5-inbox-list{will-change:auto!important;}',

        /* Estilos de items (heredado v4.4) */
        '.wbv5-conv-itm .wbv5-ci-name{font-size:15.5px!important;font-weight:700!important;}',
        '.wbv5-conv-itm .wbv5-ci-prev{font-size:13px!important;font-weight:400!important;color:#374151!important;line-height:1.35!important;}',
        '.wbv5-conv-itm .wbv5-ci-time{font-size:12px!important;}',

        /* iframeGuard CSS (heredado) */
        '.wbv5-cw.sp-iframe-active .wbv5-cw-msgs{display:none!important;}',
        '.wbv5-cw.sp-iframe-active .wbv5-cw-input-bar{display:none!important;}',
        '#sp-chat-iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:none;z-index:10;background:#fff;}'

      ].join('\n');
      document.head.appendChild(s);
    })();

    /* ── Fix 5: patchReload (heredado) ─────────────────────────────── */
    (function patchReload(){
      try {
        var _orig = window.location.reload.bind(window.location);
        window.location.reload = function(force) {
          var root = document.getElementById('root');
          if (!root || !root.children.length) { return _orig(force); }
          if (document.getElementById('sp-chat-iframe')) { return; }
          if (document.querySelector('.wbv5-sidebar') || document.querySelector('.wbv5-nav-item')) { return; }
          _orig(force);
        };
      } catch(e) {}
    })();

    /* ── Fix 11: White-screen watchdog más tolerante (15 s → reload) ─ */
    (function fixWatchdog(){
      /* Cancelar el watchdog original de index.html si existe */
      if(window.__spWdOverride) return;
      window.__spWdOverride = true;
      var _wdCount = 0;
      setInterval(function(){
        var root = document.getElementById('root');
        if(!root || !root.children.length) return;
        var ok = document.querySelector('.wbv5-sidebar') || document.querySelector('.wbv5-nav-item');
        if(!ok){ _wdCount++; if(_wdCount >= 5){ console.warn('[v5] watchdog: panel blanco, recargando...'); window.location.reload(); } }
        else { _wdCount = 0; }
      }, 3000); /* 5 × 3s = 15 s antes de recargar */
    })();

    /* ── Fix 12: iframeGuard más eficiente (2 s, solo si hay cambio) ─ */
    (function iframeGuard(){
      var _lastIframe = null;
      setInterval(function(){
        var iframe = document.getElementById('sp-chat-iframe');
        var cw = document.querySelector('.wbv5-cw');
        if(!cw) return;
        if(iframe === _lastIframe) return; /* sin cambio → nada que hacer */
        _lastIframe = iframe;
        if(iframe){
          cw.classList.add('sp-iframe-active');
          var msgs = cw.querySelector('.wbv5-cw-msgs');
          var bar  = cw.querySelector('.wbv5-cw-input-bar');
          if(msgs) msgs.style.setProperty('display','none','important');
          if(bar)  bar.style.setProperty('display','none','important');
        } else {
          cw.classList.remove('sp-iframe-active');
        }
      }, 2000); /* antes: 600 ms → ahora: 2000 ms */
    })();

    /* ── Fix 9 JS: forzar inbox-list al ancho correcto cuando se estrecha ── */
    (function fixInboxWidth(){
      function enforceWidth(){
        if(window.matchMedia('(max-width:900px)').matches) return;
        var inbox = document.querySelector('.wbv5-inbox-list');
        if(!inbox) return;
        var w = inbox.getBoundingClientRect().width;
        if(w < 300 && w > 0){
          inbox.style.setProperty('min-width','340px','important');
          inbox.style.setProperty('flex','0 0 360px','important');
        }
      }
      /* Correr al cargar y cuando cambia el tamaño */
      enforceWidth();
      window.addEventListener('resize', enforceWidth);
      /* También vigilar cambios de layout con un observer liviano */
      var _roTimer = null;
      if(typeof ResizeObserver !== 'undefined'){
        var ro = new ResizeObserver(function(){
          clearTimeout(_roTimer);
          _roTimer = setTimeout(enforceWidth, 200);
        });
        function attachRO(){
          var wrap = document.querySelector('.wbv5-chat-wrap');
          if(wrap){ ro.observe(wrap); }
          else { setTimeout(attachRO, 1000); }
        }
        attachRO();
      }
    })();


    /* Fix 14: NEUTRALIZADO — Fix 17 maneja el grid (evita titileo) */

    /* ── Fix 1: hideWbv5DiagFloat eficiente (heredado) ─────────────── */
    var _diagHidden = false;
    window.hideWbv5DiagFloat = function(){
      if(_diagHidden) return;
      document.querySelectorAll('button,span,div').forEach(function(el){
        if(el.children.length > 0) return;
        var t = el.textContent.trim();
        if(t.length > 2) return;
        var pos = el.style.position || getComputedStyle(el).position;
        if(pos === 'fixed' && t.charCodeAt(0) === 128295){ el.style.display = 'none'; _diagHidden = true; }
      });
    };

    /* ── Fix 2+3: Sorter con fetch-then-sort (heredado) ─────────────── */
    var _chatOrder = {}, _lastFetch = 0, _fetchPending = false;
    var API = 'https://sanate-wa-bot.onrender.com/api/whatsapp/chats';
    var FETCH_COOLDOWN = 8000;

    function fetchOrder(cb){
      var now = Date.now();
      if(_fetchPending || (now - _lastFetch < FETCH_COOLDOWN)){ if(cb) cb(); return; }
      _fetchPending = true;
      fetch(API).then(function(r){ return r.json(); }).then(function(data){
        _lastFetch = Date.now(); _fetchPending = false;
        var chats = data.chats || [];
        _chatOrder = {};
        chats.forEach(function(c, i){
          // Rank por timestamp real — ordenar por último mensaje recibido
          var ts = c.last_timestamp || c.lastMessageAt || c.updatedAt || '';
          var rank = ts ? new Date(ts).getTime() : (chats.length - i) * 1000;
          var key = (c.jid || c.id || c.phone || '').replace(/\D/g,'');
          if(key) _chatOrder[key] = rank;
          var nm = (c.name || c.push_name || '').trim().toLowerCase();
          if(nm && nm.length > 1) _chatOrder['name:'+nm] = rank;
        });
        if(cb) cb();
      }).catch(function(){ _fetchPending = false; if(cb) cb(); });
    }

    function getItemKey(el){
      var jid = el.getAttribute('data-jid') || el.getAttribute('data-id') || '';
      if(jid) return jid.replace(/\D/g,'');
      var nameEl = el.querySelector('.wbv5-ci-name');
      var rawName = nameEl ? nameEl.textContent.replace(/⚡[^⚡]*/g,'').replace(/[^\w\s\+]/g,'').trim() : '';
      var nameNum = rawName.replace(/\D/g,'');
      if(nameNum.length >= 8) return nameNum;
      if(rawName.length > 1) return 'name:' + rawName.toLowerCase();
      var prev = (el.querySelector('.wbv5-ci-prev')||{}).textContent||'';
      var prevNum = prev.replace(/\D/g,'');
      if(prevNum.length >= 8) return prevNum;
      return '';
    }

    function getRank(el){
      var key = getItemKey(el);
      if(!key) return 0;
      var rank = _chatOrder[key] || 0;
      if(!rank && key.indexOf('name:') === -1){
        var short = key.slice(-10);
        for(var k in _chatOrder){
          if(k.indexOf('name:') === 0) continue;
          if(k.endsWith(short) || short.endsWith(k.slice(-10))){ rank = _chatOrder[k]; break; }
        }
      }
      return rank;
    }

    /* Actualizar rank local inmediatamente cuando enviamos o recibimos nuevo mensaje */
    function updateLocalRank(jidOrPhone){
      if(!jidOrPhone) return;
      var key = String(jidOrPhone).replace(/\D/g,'');
      if(key) _chatOrder[key] = Date.now(); // rank = ahora
    }
    window.__spUpdateChatRank = updateLocalRank; // exponer para uso desde otros fixes

    var _sortBusy = false;
    function sortChatList(){
      if(_sortBusy) return;
      var inbox = document.querySelector('.wbv5-inbox-list');
      if(!inbox) return;
      var items = Array.from(inbox.querySelectorAll(':scope > .wbv5-conv-itm'));
      if(items.length < 2 || !Object.keys(_chatOrder).length) return;
      _sortBusy = true;
      try {
        var scored = items.map(function(el){ return { el:el, rank:getRank(el) }; });
        scored.sort(function(a,b){ return b.rank - a.rank; });
        var changed = scored.some(function(s,i){ return s.el !== items[i]; });
        if(changed){
          var frag = document.createDocumentFragment();
          scored.forEach(function(s){ frag.appendChild(s.el); });
          inbox.appendChild(frag);
        }
      } finally { _sortBusy = false; }
    }

    var _sortTimer = null;
    var _inboxObs = new MutationObserver(function(muts){
      // Disparar si: nuevos nodos O si cambia el orden (childList sin addedNodes = movimiento DOM)
      var hasChange = muts.some(function(m){ return m.addedNodes.length > 0 || m.removedNodes.length > 0; });
      if(!hasChange) return;
      clearTimeout(_sortTimer);
      _sortTimer = setTimeout(function(){ fetchOrder(sortChatList); }, 800);
    });

    function initObs(){
      var inbox = document.querySelector('.wbv5-inbox-list');
      if(!inbox){ setTimeout(initObs, 900); return; }
      _inboxObs.observe(inbox, {childList:true, subtree:false});
    }

    fetchOrder(sortChatList);
    setTimeout(initObs, 2000);
    setInterval(function(){ fetchOrder(sortChatList); }, 12000); // cada 12s (antes 30s)

    /* ── Sort inmediato via SSE — cuando llega mensaje nuevo re-ordenar sin esperar 12s ── */
    (function hookSSE(){
      try {
        var es = new EventSource('/api/sse');
        es.addEventListener('message', function(e){
          try {
            var d = JSON.parse(e.data || '{}');
            if(d.type === 'message' && !d.data?.fromMe){
              // Mensaje entrante: re-fetch y re-sort inmediatamente
              setTimeout(function(){ fetchOrder(sortChatList); }, 400);
            }
          } catch(_){}
        });
        es.onerror = function(){ /* reconectar automatico por el browser */ };
      } catch(_){}
    })();

    /* ── Fix 6: Click tracker (heredado + mejorado) ──────────────────── */
    (function fixClickTracker(){
      var _attached = false;
      function attachOnInbox(){
        if(_attached) return;
        var inbox = document.querySelector('.wbv5-inbox-list');
        if(!inbox){ setTimeout(attachOnInbox, 800); return; }
        _attached = true;
        inbox.addEventListener('click', function(e){
          var item = e.target.closest ? e.target.closest('.wbv5-conv-itm') : null;
          if(!item) return;
          var jid = item.getAttribute('data-jid') || item.getAttribute('data-id') || '';
          if(!jid){
            var nameEl = item.querySelector('.wbv5-ci-name');
            if(nameEl){
              var rawName = nameEl.textContent.replace(/⚡[^⚡]*/g,'').trim();
              var num = rawName.replace(/\D/g,'');
              if(num.length >= 8) jid = num + '@s.whatsapp.net';
            }
          }
          window.__lastClickedJid = jid;
          window.__spUserPickedChat = true;
          setTimeout(function(){
            if(typeof window.injectDesktopChatIframe === 'function'){
              window.injectDesktopChatIframe();
            }
          }, 150);
        }, true);
        console.info('[WA-OASIS v5.0] Click tracker OK');
      }
      attachOnInbox();
    })();

    /* ── Fix 7: DOM dedup — Fix 10: reducido a 3 s (antes 1 s) ─────── */
    (function fixDedup(){
      function dedupInbox(){
        var inbox = document.querySelector('.wbv5-inbox-list');
        if(!inbox) return;
        var items = Array.prototype.slice.call(inbox.querySelectorAll('.wbv5-conv-itm'));
        var seen = {};
        items.forEach(function(item){
          var nameEl = item.querySelector('.wbv5-ci-name');
          var rawName = nameEl ? nameEl.textContent.replace(/[^\w\s\+]/g,'').trim() : '';
          var digOnly = rawName.replace(/\D/g,'');
          var key;
          if(digOnly.length >= 7 && rawName.replace(/[\d\s\+\-\(\)]/g,'').length === 0){
            key = 'p:' + digOnly.slice(-9);
          } else if(rawName.length >= 2){
            key = 'n:' + rawName.toLowerCase();
          } else { return; }
          if(seen[key]){
            item.style.setProperty('display','none','important');
            item.setAttribute('data-sp-dd','1');
          } else {
            seen[key] = true;
            if(item.getAttribute('data-sp-dd')){
              item.removeAttribute('data-sp-dd');
              item.style.removeProperty('display');
            }
          }
        });
      }
      function startDedup(){
        var inbox = document.querySelector('.wbv5-inbox-list');
        if(!inbox){ setTimeout(startDedup, 800); return; }
        dedupInbox();
        setInterval(dedupInbox, 3000); /* antes: 1000 ms → ahora: 3000 ms */
        var obs = new MutationObserver(function(muts){
          if(muts.some(function(m){ return m.addedNodes.length > 0; })) setTimeout(dedupInbox, 300);
        });
        obs.observe(inbox, {childList:true, subtree:false});
        console.info('[WA-OASIS v5.0] Dedup OK');
      }
      startDedup();
    })();

    /* ── Fix 8: Fallback injectDesktopChatIframe (heredado) ─────────── */
    (function fixInjectFallback(){
      function defineInject(){
        if(typeof window.injectDesktopChatIframe === 'function'){
          console.info('[WA-OASIS v5.0] injectDesktopChatIframe ya existe (sanate-panel.js)');
          return;
        }
        window.injectDesktopChatIframe = function(){
          if(window.matchMedia('(max-width:900px)').matches) return;
          var jid = window.__lastClickedJid || '';
          if(!jid){
            var active = document.querySelector(
              '.wbv5-conv-itm.active,.wbv5-conv-itm.selected,.wbv5-conv-itm[aria-selected="true"],.wbv5-conv-itm[data-selected]'
            );
            if(active) jid = active.getAttribute('data-jid') || active.getAttribute('data-id') || '';
          }
          var cw = document.querySelector('.wbv5-cw');
          if(!cw){ console.warn('[WA-OASIS] .wbv5-cw not found'); return; }
          var old = document.getElementById('sp-chat-iframe');
          if(old) old.remove();
          var src = '/bot/chat.html';
          if(jid) src += '?jid=' + encodeURIComponent(jid);
          var iframe = document.createElement('iframe');
          iframe.id = 'sp-chat-iframe';
          iframe.src = src;
          iframe.setAttribute('allow', 'microphone; camera');
          iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none;z-index:10;background:#fff;';
          cw.style.position = 'relative';
          cw.appendChild(iframe);
          cw.classList.add('sp-iframe-active');
          console.info('[WA-OASIS v5.0] iframe → ' + src);
        };
        console.info('[WA-OASIS v5.0] injectDesktopChatIframe fallback definido');
      }
      defineInject();
      setTimeout(defineInject, 1500);
    })();

  } catch(e) {
    console.error('[WA-OASIS v5] init error:', e);
  }
})();

/* ── Fix 13: Ocultar APPS CHAT (Instagram, Messenger, TikTok) del sidebar y filtros ── */
(function hideAppChats(){
  if(window.__spHideAppChats) return;
  window.__spHideAppChats = true;

  /* 1) Inyectar CSS base para ocultar elementos ya marcados */
  var st = document.createElement('style');
  st.id = 'sp-hide-appchat-style';
  st.textContent = '.sp-hide-appchat{display:none!important;}';
  if(!document.getElementById('sp-hide-appchat-style')) document.head.appendChild(st);

  var _HIDE = ['Instagram','Messenger','TikTok'];

  function hideItems(){
    /* Sidebar: ocultar nav-items de Instagram/Messenger/TikTok */
    document.querySelectorAll('.wbv5-nav-item').forEach(function(el){
      if(_HIDE.indexOf(el.textContent.trim()) !== -1){
        el.classList.add('sp-hide-appchat');
      }
    });

    /* Sidebar: ocultar encabezado "APPS CHAT" si ya no tiene hijos visibles */
    document.querySelectorAll('[class*="nav-section-title"],[class*="nav-group-title"],[class*="sidebar-title"]').forEach(function(el){
      if(el.textContent.trim().toUpperCase() === 'APPS CHAT'){
        el.classList.add('sp-hide-appchat');
      }
    });
    /* Buscar también por texto directo en cualquier span/div dentro del sidebar */
    document.querySelectorAll('.wbv5-sidebar span, .wbv5-sidebar div').forEach(function(el){
      if(el.children.length === 0 && el.textContent.trim().toUpperCase() === 'APPS CHAT'){
        el.classList.add('sp-hide-appchat');
      }
    });

    /* Filtros de chats: ocultar botones Instagram / Messenger / TikTok
       Los botones usan texto con emojis: "📷 Instagram", "💬 Messenger", "🎵 TikTok"
       Usamos .includes() para capturar independientemente del emoji */
    document.querySelectorAll('button.wbv5-il-filter, button[class*="filter"], [role="tab"]').forEach(function(el){
      var txt = el.textContent.trim();
      if(_HIDE.some(function(h){ return txt.includes(h); })){
        el.classList.add('sp-hide-appchat');
      }
    });
  }

  /* Correr inmediatamente y tras breve espera (React puede tardar en renderizar) */
  hideItems();
  [200,600,1500,3000].forEach(function(d){ setTimeout(hideItems, d); });

  /* MutationObserver con debounce — se activa cada vez que React re-renderiza el DOM */
  var _debTimer = null;
  var obs = new MutationObserver(function(){
    clearTimeout(_debTimer);
    _debTimer = setTimeout(hideItems, 300);
  });
  obs.observe(document.body, {childList:true, subtree:true});

  console.info('[WA-OASIS v5.3] Fix 13: APPS CHAT oculto (Instagram/Messenger/TikTok)');
})();


/* ── Fix 15: SIEMPRE mostrar chat.html en panel derecho (incluso sin chat seleccionado) ── */
(function fixAlwaysShowChat(){
  if(window.__spFix15) return;
  window.__spFix15 = true;
  if(window.location.pathname.indexOf('/dashboard/whatsapp-bot')!==0) return;

  /* CSS extra: .wbv5-chat-win.sp-iframe-active también oculta contenido React */
  (function addCss(){
    if(document.getElementById('sp-fix15-css')) return;
    var s = document.createElement('style');
    s.id = 'sp-fix15-css';
    s.textContent = [
      '.wbv5-chat-win.sp-iframe-active .wbv5-cw-msgs{display:none!important;}',
      '.wbv5-chat-win.sp-iframe-active .wbv5-cw-input-bar{display:none!important;}',
      '.wbv5-chat-win.sp-iframe-active #sp-no-chat{display:none!important;}',
      '#sp-chat-iframe{position:absolute!important;top:0!important;left:0!important;',
      'width:100%!important;height:100%!important;border:none!important;z-index:10!important;background:#fff!important;}',
      '.wbv5-chat-win{position:relative!important;overflow:hidden!important;}'
    ].join('');
    document.head.appendChild(s);
  })();

  function overrideInject(){
    window.injectDesktopChatIframe = function(){
      if(window.matchMedia('(max-width:900px)').matches) return;
      if(window.location.pathname.indexOf('whatsapp-bot')===-1) return;

      var cw = document.querySelector('.wbv5-chat-win');
      if(!cw) return;

      /* Limpiar placeholder "no chat" del panel */
      var noDiv = document.getElementById('sp-no-chat');
      if(noDiv) noDiv.remove();

      /* Obtener JID activo desde el header del chat */
      var sub = document.querySelector('.wbv5-cw-sub');
      var jidNum = sub ? (sub.textContent||'').replace(/[^0-9]/g,'') : '';
      if((!jidNum||jidNum.length<9) && window.__lastClickedJid){
        jidNum = (window.__lastClickedJid||'').replace(/[^0-9]/g,'');
      }
      var jid = (jidNum && jidNum.length>=9) ? jidNum+'@s.whatsapp.net' : null;

      var existing = document.getElementById('sp-chat-iframe');

      if(existing){
        /* JID cambió → actualizar iframe src */
        if(jid && existing.dataset.jid !== jid){
          existing.dataset.jid = jid;
          existing.src = '/bot/chat.html?jid='+encodeURIComponent(jid)+'&t='+Date.now();
        }
        /* Sin JID o mismo JID → mantener iframe como está (NO borrar) */
        cw.classList.add('sp-iframe-active');
        return;
      }

      /* No hay iframe → crear uno nuevo */
      var iframe = document.createElement('iframe');
      iframe.id  = 'sp-chat-iframe';
      iframe.dataset.jid = jid || '';
      iframe.src = jid
        ? '/bot/chat.html?jid='+encodeURIComponent(jid)+'&t='+Date.now()
        : '/bot/chat.html';
      iframe.allow = 'microphone';
      iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none;z-index:10;background:#fff;display:block;';
      cw.style.position = 'relative';
      cw.style.overflow = 'hidden';
      cw.classList.add('sp-iframe-active');
      cw.appendChild(iframe);
      console.info('[WA-OASIS v6] Fix15 iframe → '+iframe.src);
    };

    /* Ejecutar inmediatamente con la nueva función */
    [100,600,1500,3000].forEach(function(d){ setTimeout(window.injectDesktopChatIframe,d); });
    console.info('[WA-OASIS v6] Fix 15: injectDesktopChatIframe sobreescrito — siempre muestra chat.html');
  }

  /* Esperar a que sanate-panel.js defina su versión, luego sobreescribir la nuestra */
  setTimeout(overrideInject, 1200);
  setTimeout(overrideInject, 3500);

  console.info('[WA-OASIS v6] Fix 15 init: esperando sanate-panel.js...');
})();


/* ── Fix 16: Separación visual clara sidebar ↔ inbox-list ── */
(function fixVisualSeparator(){
  if(window.__spFix16) return;
  window.__spFix16 = true;
  if(window.location.pathname.indexOf('/dashboard/whatsapp-bot')!==0) return;

  var css = [
    /* Sidebar: borde derecho visible + sombra sutil */
    '.wbv5-sidebar{',
    '  border-right:2px solid rgba(0,0,0,0.13)!important;',
    '  box-shadow:3px 0 8px rgba(0,0,0,0.07)!important;',
    '  z-index:2!important;',
    '  position:relative!important;',
    '}',
    /* Inbox: fondo ligeramente distinto + borde izquierdo */
    '.wbv5-inbox-list{',
    '  background:rgba(248,249,251,0.97)!important;',
    '  border-left:1px solid rgba(0,0,0,0.07)!important;',
    '}',
    /* Header del inbox: fondo blanco puro para distinguir del sidebar */
    '.wbv5-il-header,.wbv5-inbox-header{',
    '  background:#ffffff!important;',
    '  border-bottom:1px solid rgba(0,0,0,0.08)!important;',
    '}'
  ].join('\n');

  var s = document.createElement('style');
  s.id = 'sp-fix16-css';
  s.textContent = css;
  if(!document.getElementById('sp-fix16-css')) document.head.appendChild(s);

  /* También forzar via JS por si el CSS no alcanza */
  function applyStyles(){
    var sidebar = document.querySelector('.wbv5-sidebar');
    if(sidebar){
      sidebar.style.setProperty('border-right','2px solid rgba(0,0,0,0.13)','important');
      sidebar.style.setProperty('box-shadow','3px 0 8px rgba(0,0,0,0.07)','important');
    }
    var inbox = document.querySelector('.wbv5-inbox-list');
    if(inbox){
      inbox.style.setProperty('background','rgba(248,249,251,0.97)','important');
    }
  }

  applyStyles();
  [300,800,2000].forEach(function(d){ setTimeout(applyStyles, d); });
  console.info('[WA-OASIS v6] Fix 16: separación visual sidebar/inbox aplicada');
})();


/* ============================================================
   FIX 17 — Swap grid columns: chat-win CENTER, inbox-list RIGHT
   chat.html (wbv5-chat-win) → column 1 (1fr, center 240-1006px)
   inbox list (wbv5-inbox-list) → column 2 (360px, right 1006-1366px)
   ============================================================ */
(function fixSwapColumns(){
  if(window.__spFix17) return;
  window.__spFix17 = true;
  if(window.location.pathname.indexOf('/dashboard/whatsapp-bot')!==0) return;

  var css = `
    .wbv5-chat-wrap {
      display: grid !important;
      grid-template-columns: 1fr 360px !important;
      grid-template-rows: 1fr !important;
    }
    .wbv5-chat-win {
      grid-column: 1 !important;
      grid-row: 1 !important;
      order: 1 !important;
    }
    .wbv5-inbox-list {
      grid-column: 2 !important;
      grid-row: 1 !important;
      order: 2 !important;
      border-left: 1.5px solid rgba(0,0,0,0.1) !important;
      border-right: none !important;
    }
  `;
  var styleEl = document.getElementById('sp-fix17-styles');
  if(!styleEl){
    styleEl = document.createElement('style');
    styleEl.id = 'sp-fix17-styles';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = css;

  function enforceSwap(){
    // Solo aplicar en desktop (>900px)
    if(window.matchMedia('(max-width:900px)').matches) return;
    var wrap    = document.querySelector('.wbv5-chat-wrap');
    var inbox   = document.querySelector('.wbv5-inbox-list');
    var chatWin = document.querySelector('.wbv5-chat-win');
    if(!wrap || !inbox || !chatWin) return;
    wrap.style.setProperty('display','grid','important');
    wrap.style.setProperty('grid-template-columns','1fr 360px','important');
    wrap.style.setProperty('grid-template-rows','1fr','important');
    chatWin.style.setProperty('grid-column','1','important');
    chatWin.style.setProperty('grid-row','1','important');
    chatWin.style.setProperty('order','1','important');
    inbox.style.setProperty('grid-column','2','important');
    inbox.style.setProperty('grid-row','1','important');
    inbox.style.setProperty('order','2','important');
    inbox.style.setProperty('border-left','1.5px solid rgba(0,0,0,0.1)','important');
    inbox.style.removeProperty('border-right');
  }

  enforceSwap();
  [200,500,1000,2000,4000].forEach(function(d){ setTimeout(enforceSwap,d); });

  // MutationObserver to resist React re-renders
  var _swapBusy=false;
  var observer = new MutationObserver(function(muts){
    if(_swapBusy) return;
    for(var m of muts){
      if(m.target && (m.target.classList.contains('wbv5-chat-wrap')||
                      m.target.classList.contains('wbv5-chat-win')||
                      m.target.classList.contains('wbv5-inbox-list'))){
        _swapBusy=true; setTimeout(function(){_swapBusy=false;},200);
        enforceSwap();
        break;
      }
    }
  });
  function startObserver(){
    var wrap = document.querySelector('.wbv5-chat-wrap');
    if(wrap){
      observer.observe(wrap, {attributes:true, subtree:true, attributeFilter:['style','class']});
    }
  }
  [300,1000,2500].forEach(function(d){ setTimeout(startObserver,d); });

  // Periodic enforcement to beat any JS that resets styles
  setInterval(enforceSwap, 1500);

  console.info('[WA-OASIS v7] Fix 17: columnas intercambiadas — chat-win CENTRO, inbox-list DERECHA');
})();


/* ============================================================
   FIX 18 — Mobile mode: restaurar layout natural del inbox (sin forzar grid)
   En móvil (<= 900px) la lista de chats debe verse completa como estaba
   ============================================================ */
(function fixMobileInbox(){
  if(window.__spFix18) return;
  window.__spFix18 = true;
  if(window.location.pathname.indexOf('/dashboard/whatsapp-bot')!==0) return;

  function restoreMobile(){
    if(!window.matchMedia('(max-width:900px)').matches) return;
    var wrap = document.querySelector('.wbv5-chat-wrap');
    var inbox = document.querySelector('.wbv5-inbox-list');
    var chatWin = document.querySelector('.wbv5-chat-win');
    if(!wrap || !inbox || !chatWin) return;
    // Quitar estilos inline forzados en móvil
    wrap.style.removeProperty('display');
    wrap.style.removeProperty('grid-template-columns');
    wrap.style.removeProperty('grid-template-rows');
    chatWin.style.removeProperty('grid-column');
    chatWin.style.removeProperty('grid-row');
    chatWin.style.removeProperty('order');
    inbox.style.removeProperty('grid-column');
    inbox.style.removeProperty('grid-row');
    inbox.style.removeProperty('order');
  }

  restoreMobile();
  [300,800,1500,3000].forEach(function(d){ setTimeout(restoreMobile,d); });
  setInterval(restoreMobile, 2000);

  // Escuchar resize para aplicar cuando se cambie de desktop a móvil
  window.addEventListener('resize', restoreMobile);

  console.info('[WA-OASIS v7] Fix 18: móvil restaurado — inbox completo en pantalla pequeña');
})();


/* ============================================================
   FIX 17b — Corrige el CSS de Fix 17: agregar @media desktop
   El CSS original no tenía media query, rompía el layout móvil
   ============================================================ */
(function fixColumnCssMediaQuery(){
  if(window.__spFix17b) return;
  window.__spFix17b = true;
  if(window.location.pathname.indexOf('/dashboard/whatsapp-bot')!==0) return;

  // Reemplazar el style tag de Fix 17 con versión correcta (media query desktop)
  var styleEl = document.getElementById('sp-fix17-styles');
  if(!styleEl){
    styleEl = document.createElement('style');
    styleEl.id = 'sp-fix17-styles';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = [
    '@media screen and (min-width:901px){',
    '  .wbv5-chat-wrap{display:grid!important;grid-template-columns:1fr 360px!important;grid-template-rows:1fr!important;}',
    '  .wbv5-chat-win{grid-column:1!important;grid-row:1!important;order:1!important;}',
    '  .wbv5-inbox-list{grid-column:2!important;grid-row:1!important;order:2!important;border-left:1.5px solid rgba(0,0,0,0.1)!important;border-right:none!important;}',
    '}',
    '@media screen and (max-width:900px){',
    '  .wbv5-chat-wrap{display:block!important;}',
    '  .wbv5-chat-win{grid-column:unset!important;grid-row:unset!important;order:unset!important;}',
    '  .wbv5-inbox-list{grid-column:unset!important;grid-row:unset!important;order:unset!important;border-left:none!important;}',
    '}'
  ].join('\n');

  console.info('[WA-OASIS v7] Fix 17b: CSS actualizado con @media desktop');
})();


/* ============================================================
   FIX 19 — Móvil: tap en contacto abre chat.html de ese chat
   En pantallas <= 900px, al hacer click en un wbv5-conv-itm,
   se inyecta chat.html con el JID correcto en modo fullscreen.
   ============================================================ */
(function fixMobileChatTap(){
  if(window.__spFix19) return;
  window.__spFix19 = true;
  if(window.location.pathname.indexOf('/dashboard/whatsapp-bot')!==0) return;

  function isMobile(){ return window.innerWidth <= 900 || document.documentElement.clientWidth <= 900; }

  function openChatMobile(jid){
    if(!jid) return;
    var phone = jid.replace(/@.*/,'');
    var chatUrl = '/bot/chat.html?jid=' + encodeURIComponent(jid) + '&t=' + Date.now();

    // Buscar o crear overlay fullscreen
    var overlay = document.getElementById('sp-mobile-chat-overlay');
    if(!overlay){
      overlay = document.createElement('div');
      overlay.id = 'sp-mobile-chat-overlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;background:#fff;display:flex;flex-direction:column;border:none;outline:none;box-shadow:none;';

      // iframe de chat.html — sin barra encima; #back-btn de chat.html cierra el overlay
      var iframe = document.createElement('iframe');
      iframe.id = 'sp-mobile-chat-frame';
      iframe.allow = 'microphone';
      iframe.style.cssText = 'flex:1;width:100%;border:none;background:#fff;';
      overlay.appendChild(iframe);
      
      document.body.appendChild(overlay);
    }

    // Actualizar src del iframe
    var frame = overlay.querySelector('#sp-mobile-chat-frame');
    if(frame){
      frame.src = chatUrl;
      frame.onload = function(){
        setTimeout(function(){
          try {
            var doc = frame.contentDocument;
            var btn = doc && doc.getElementById('back-btn');
            if(btn && !btn.__sp19back){
              btn.__sp19back = true;
              btn.addEventListener('click', function(){ overlay.style.display = 'none'; });
            }
          } catch(e){}
        }, 200);
      };
    }
    overlay.style.display = 'flex';
  }

  function extractJidFromItem(item){
    // 1) atributo data-jid/data-id del DOM
    var jid = item.getAttribute('data-jid') || item.getAttribute('data-id') || '';
    if(jid) return jid;
    // 2) leer número del nombre visible
    var nameEl = item.querySelector('.wbv5-ci-name');
    if(nameEl){
      var raw = nameEl.textContent.replace(/⚡[^⚡]*/g,'').trim();
      var num = raw.replace(/\D/g,'');
      if(num.length >= 8) return num + '@s.whatsapp.net';
    }
    // 3) fallback a último jid registrado
    return window.__lastClickedJid || '';
  }

  function attachMobileTapListener(){
    // Usar .wbv5-il-convs si existe, si no .wbv5-inbox-list
    var convs = document.querySelector('.wbv5-il-convs') || document.querySelector('.wbv5-inbox-list');
    if(!convs || convs.__sp19Attached) return;
    convs.__sp19Attached = true;

    convs.addEventListener('click', function(e){
      if(!isMobile()) return;
      var item = e.target.closest('.wbv5-conv-itm');
      if(!item) return;
      e.preventDefault();
      e.stopPropagation();
      var jid = extractJidFromItem(item);
      if(jid){
        window.__lastClickedJid = jid;
        window.__spUserPickedChat = true;
        openChatMobile(jid);
      }
    }, true);
  }

  [300,800,1500,3000,5000].forEach(function(d){ setTimeout(attachMobileTapListener, d); });

  // Reconectar si React recrea el DOM
  var obs = new MutationObserver(function(){
    var target = document.querySelector('.wbv5-il-convs') || document.querySelector('.wbv5-inbox-list');
    if(target && !target.__sp19Attached) attachMobileTapListener();
  });
  setTimeout(function(){
    var root = document.querySelector('.wbv5-inbox-list') || document.body;
    obs.observe(root, {childList:true, subtree:false});
  }, 1000);

  console.info('[WA-OASIS v7] Fix 19: móvil tap → chat.html activo');
})();


/* ============================================================
   FIX 20 — Nombres en inbox: mostrar nombre real si está guardado
   Carga /api/whatsapp/contacts y reemplaza números por nombres
   en .wbv5-ci-name cuando el nombre difiere del teléfono.
   ============================================================ */
(function fixInboxNames(){
  if(window.__spFix20) return;
  window.__spFix20 = true;
  if(window.location.pathname.indexOf('/dashboard/whatsapp-bot')!==0) return;

  var nameMap = {}; // jid/phone → displayName

  function buildNameMap(contacts){
    nameMap = {};
    contacts.forEach(function(c){
      var jid = (c.jid||'').replace(/@.*/,'');
      var phone = (c.phone||'');
      var name = (c.name || c.push_name || c.pushName || '').trim();
      // Solo guardar si el nombre es diferente al número
      if(name && name !== jid && name !== phone){
        if(jid) nameMap[jid] = name;
        if(phone) nameMap[phone] = name;
      }
    });
    applyNames();
  }

  function applyNames(){
    var nameEls = document.querySelectorAll('.wbv5-ci-name');
    nameEls.forEach(function(el){
      // Obtener solo el texto (sin spans hijos)
      var textNodes = [...el.childNodes].filter(function(n){ return n.nodeType === 3; });
      var phone = textNodes.map(function(n){ return n.textContent.trim(); }).join('');
      var stripped = phone.replace(/[^0-9]/g,'');
      var realName = nameMap[phone] || nameMap[stripped] || null;
      if(realName && el.dataset.spOrigPhone !== phone){
        textNodes.forEach(function(n){ n.textContent = realName + ' '; });
        el.dataset.spOrigPhone = phone;
        el.title = phone; // mostrar número al hacer hover
      }
    });
  }

  function loadNames(){
    fetch('https://sanate-wa-bot.onrender.com/api/whatsapp/contacts')
      .then(function(r){ return r.json(); })
      .then(function(d){ buildNameMap(d.clients || d.chats || []); })
      .catch(function(){});
  }

  loadNames();
  setInterval(loadNames, 30000); // refresca cada 30s
  window.__spInt20 = setInterval(applyNames, 3000); // aplica cada 3s para nuevos items

  console.info('[WA-OASIS v7] Fix 20: nombres de contactos en inbox activo');
})();


/* ============================================================
   FIX 21 — Limpieza overlay móvil (legacy cleanup)
   Fix 19 ya no crea la barra ← Chats.
   Este fix limpia cualquier overlay antiguo en caché.
   ============================================================ */
(function fixMobileOverlayCleanup(){
  if(window.__spFix21) return;
  window.__spFix21 = true;
  if(window.location.pathname.indexOf('/dashboard/whatsapp-bot')!==0) return;

  function cleanLegacyBar(){
    var overlay = document.getElementById('sp-mobile-chat-overlay');
    if(!overlay) return;
    var bar = overlay.querySelector('div[style*="background:#128c7e"]');
    if(bar) bar.remove();
    overlay.style.border = 'none';
    overlay.style.outline = 'none';
    overlay.style.boxShadow = 'none';
  }

  setTimeout(cleanLegacyBar, 200);
  window.__spInt21cl = setInterval(cleanLegacyBar, 2000);

  console.info('[WA-OASIS v7] Fix 21: legacy bar cleanup activo');
})();


/* ============================================================
   FIX 22 — Nombres reales en inbox desde oasis_wa_chats (Supabase)
   Reemplaza Fix 20 — usa la tabla correcta con los nombres reales.
   ============================================================ */
(function fixInboxNamesV2(){
  if(window.__spFix22) return;
  window.__spFix22 = true;
  if(window.location.pathname.indexOf('/dashboard/whatsapp-bot')!==0) return;

  var nameMap22 = {};
  var sbLoaded = false;

  function getSBCreds(){
    // Get from main chat iframe (same-origin)
    var iframe = document.getElementById('sp-chat-iframe');
    if(iframe && iframe.contentWindow && iframe.contentWindow.SK){
      return {sb: iframe.contentWindow.SB, sk: iframe.contentWindow.SK};
    }
    var mframe = document.getElementById('sp-mobile-chat-frame');
    if(mframe && mframe.contentWindow && mframe.contentWindow.SK){
      return {sb: mframe.contentWindow.SB, sk: mframe.contentWindow.SK};
    }
    return null;
  }

  function applyNames22(){
    var nameEls = document.querySelectorAll('.wbv5-ci-name');
    nameEls.forEach(function(el){
      var textNodes = [...el.childNodes].filter(function(n){ return n.nodeType === 3; });
      var raw = textNodes.map(function(n){ return n.textContent; }).join('').trim();
      var stripped = raw.replace(/[^0-9]/g,'');
      var realName = nameMap22[raw] || nameMap22[stripped] || null;
      if(realName && el.dataset.sp22Done !== realName){
        textNodes.forEach(function(n){ n.textContent = realName; });
        // Preserve space before span
        if(el.childNodes.length > 1) el.childNodes[0].textContent = realName + ' ';
        el.dataset.sp22Done = realName;
        el.title = raw; // show original number on hover
      }
    });
  }

  function loadFromSupabase(){
    var creds = getSBCreds();
    if(!creds) return;
    fetch(creds.sb + '/rest/v1/oasis_wa_chats?select=jid,name,phone,push_name&limit=500', {
      headers: {'apikey': creds.sk, 'Authorization': 'Bearer ' + creds.sk}
    })
    .then(function(r){ return r.json(); })
    .then(function(data){
      if(!Array.isArray(data)) return;
      nameMap22 = {};
      data.forEach(function(c){
        var jid = (c.jid||'').replace(/@.*/,'');
        var phone = (c.phone||'');
        var name = (c.name||c.push_name||'').trim();
        // Only store if it's a real name (not just the phone number)
        if(name && name !== jid && name !== phone && !/^[0-9+]+$/.test(name)){
          if(jid) nameMap22[jid] = name;
          if(phone) nameMap22[phone] = name;
        }
      });
      sbLoaded = true;
      applyNames22();
    })
    .catch(function(){});
  }

  // Wait for iframe to load to get credentials
  function tryLoad(){
    var creds = getSBCreds();
    if(creds){ loadFromSupabase(); }
    else { setTimeout(tryLoad, 1500); }
  }
  tryLoad();

  // Re-apply when DOM changes (new chat items loaded)
  window.__spInt22 = setInterval(applyNames22, 2500);
  // Reload names every minute
  setInterval(loadFromSupabase, 60000);

  console.info('[WA-OASIS v7] Fix 22: nombres desde oasis_wa_chats activo');
})();


/* ============================================================
   FIX 23 — Placeholder + anti-titileo (MutationObserver)
   ============================================================ */
(function fixPlaceholder(){
  if(window.__spFix23) return;
  window.__spFix23 = true;
  /* Matar intervalos Fix 20/21/22 para eliminar titileo */
  clearInterval(window.__spInt20);   window.__spInt20   = null;
  clearInterval(window.__spInt21cl); window.__spInt21cl = null;
  clearInterval(window.__spInt22);   window.__spInt22   = null;
  if(window.location.pathname.indexOf('/dashboard/whatsapp-bot')!==0) return;

  /* CSS */
  if(!document.getElementById('sp-fix23-css')){
    var s=document.createElement('style'); s.id='sp-fix23-css';
    s.textContent='@media(max-width:900px){#sp-chat-placeholder{display:none!important;}.wbv5-chat-win{display:none!important;overflow:hidden!important;}.wbv5-inbox-list{width:100%!important;display:block!important;}.wbv5-chat-wrap{display:block!important;}}'+'#sp-chat-placeholder{position:absolute;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f0f2f5;z-index:15;pointer-events:none;}'+
    '#sp-chat-placeholder .sp-ph-ico{font-size:72px;margin-bottom:20px;opacity:0.55;}'+
    '#sp-chat-placeholder .sp-ph-title{font-size:19px;color:#41525d;font-weight:500;margin-bottom:6px;}'+
    '#sp-chat-placeholder .sp-ph-sub{font-size:14px;color:#8696a0;}';
    document.head.appendChild(s);
  }

  function getCW(){ return document.querySelector('.wbv5-chat-win'); }

  function ensurePH(){
    var ph=document.getElementById('sp-chat-placeholder');
    if(!ph){
      var cw=getCW(); if(!cw) return null;
      ph=document.createElement('div'); ph.id='sp-chat-placeholder';
      ph.innerHTML='<div class="sp-ph-ico">💬</div><div class="sp-ph-title">Selecciona un chat</div><div class="sp-ph-sub">Elige una conversacion de la lista</div>';
      cw.style.position='relative'; cw.appendChild(ph);
    }
    return ph;
  }

  window.__spShowPlaceholder=function(){
    var ph=ensurePH(); if(!ph) return;
    ph.style.display='flex';
    var f=document.getElementById('sp-chat-iframe');
    if(f){f.style.display='none'; f.style.zIndex='9';}
    var cw=getCW(); if(cw) cw.classList.remove('sp-iframe-active');
  };

  window.__spHidePlaceholder=function(){
    var ph=document.getElementById('sp-chat-placeholder');
    if(ph) ph.style.display='none';
    var f=document.getElementById('sp-chat-iframe');
    if(f){f.style.display='block'; f.style.zIndex='10';}
    var cw=getCW(); if(cw) cw.classList.add('sp-iframe-active');
  };

  function patchInject(){
    window.injectDesktopChatIframe=function(){
      if(window.matchMedia('(max-width:900px)').matches) return;
      if(window.location.pathname.indexOf('whatsapp-bot')===-1) return;
      var cw=getCW(); if(!cw) return;
      var jid=window.__lastClickedJid||null;
      if(!jid){ window.__spShowPlaceholder(); return; }
      window.__spHidePlaceholder();
      var existing=document.getElementById('sp-chat-iframe');
      if(existing){
        if(existing.dataset.jid!==jid){
          existing.dataset.jid=jid;
          existing.src='/bot/chat.html?jid='+encodeURIComponent(jid)+'&t='+Date.now();
        }
        existing.style.display='block'; existing.style.zIndex='10';
        cw.classList.add('sp-iframe-active'); return;
      }
      var iframe=document.createElement('iframe');
      iframe.id='sp-chat-iframe'; iframe.dataset.jid=jid;
      iframe.src='/bot/chat.html?jid='+encodeURIComponent(jid)+'&t='+Date.now();
      iframe.allow='microphone';
      iframe.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;border:none;z-index:10;background:#fff;display:block;';
      cw.style.position='relative'; cw.style.overflow='hidden';
      cw.classList.add('sp-iframe-active'); cw.appendChild(iframe);
    };
  }
  patchInject();
  setTimeout(patchInject, 1300);
  setTimeout(patchInject, 3600);
  setTimeout(patchInject, 6000);

  function initPH(){
    if(window.__lastClickedJid) return;
    if(window.innerWidth<=900||document.documentElement.clientWidth<=900) return;
    var iframe=document.getElementById('sp-chat-iframe');
    if(iframe){ iframe.remove(); }
    window.__spShowPlaceholder();
  }
  [100,400,900,1500,2000,4000].forEach(function(d){ setTimeout(initPH,d); });

  var nm23={};
  function loadSBNames(){
    var f=document.getElementById('sp-chat-iframe');
    var m=(f&&f.contentWindow&&f.contentWindow.SK)?{sb:f.contentWindow.SB,sk:f.contentWindow.SK}:null;
    if(!m) return;
    fetch(m.sb+'/rest/v1/oasis_wa_chats?select=jid,name,phone,push_name&limit=500',{headers:{'apikey':m.sk,'Authorization':'Bearer '+m.sk}})
    .then(function(r){return r.json();}).then(function(data){
      if(!Array.isArray(data)) return;
      nm23={};
      data.forEach(function(c){
        var jid=(c.jid||'').replace(/@.*/,'');
        var n=(c.name||c.push_name||'').trim();
        if(n&&n!==jid&&n!==(c.phone||'')&&!/^[0-9+]+$/.test(n)){
          if(jid) nm23[jid]=n;
          if(c.phone) nm23[c.phone]=n;
        }
      });
      applyNames23();
    }).catch(function(){});
  }
  function applyNames23(){
    document.querySelectorAll('.wbv5-ci-name').forEach(function(el){
      var nodes=[...el.childNodes].filter(function(n){return n.nodeType===3;});
      var raw=nodes.map(function(n){return n.textContent;}).join('').trim();
      var stripped=raw.replace(/[^0-9]/g,'');
      var real=nm23[raw]||nm23[stripped]||null;
      if(real&&el.dataset.sp23!==real){
        nodes.forEach(function(n){n.textContent=real;}); el.dataset.sp23=real; el.title=raw;
      }
    });
  }
  var obs23=null;
  function startObs(){
    var root=document.querySelector('.wbv5-il-convs')||document.querySelector('.wbv5-inbox-list');
    if(!root||obs23) return;
    obs23=new MutationObserver(function(){
      document.querySelectorAll('.wbv5-ci-name[data-sp23]').forEach(function(el){el.dataset.sp23='';});
      applyNames23();
    });
    obs23.observe(root,{childList:true,subtree:true});
  }
  setTimeout(function(){loadSBNames();startObs();},3000);
  setTimeout(loadSBNames,30000);
  console.info('[WA-OASIS v7] Fix 23: placeholder+antititileo activo');
})();


/* ============================================================
   FIX 24 — Eliminar recuadro blanco: fondo gris + visibility hidden
   visibility:hidden preserva layout/dimensiones para React,
   pero oculta visualmente. NO usar display:none en children React.
   ============================================================ */
(function fixWhiteBox(){
  if(window.__spFix24) return;
  window.__spFix24 = true;
  if(window.location.pathname.indexOf('/dashboard/whatsapp-bot')!==0) return;

  if(!document.getElementById('sp-fix24-css')){
    var s=document.createElement('style'); s.id='sp-fix24-css';
    s.textContent=
      /* Chat-win siempre con fondo gris — nunca blanco */
      '.wbv5-chat-win{background:#f0f2f5!important;}'+
      /* visibility:hidden oculta visualmente pero React puede medir los elementos */
      '.wbv5-cw-header{visibility:hidden!important;}'+
      '.wbv5-cw-msgs{visibility:hidden!important;}'+
      '.wbv5-cw-input-bar{visibility:hidden!important;}'+
      /* Mobile: ocultar SOLO el contenedor (no los hijos) para no romper React */
      '@media(max-width:900px){'+
        '.wbv5-chat-win{display:none!important;}'+
        '.wbv5-inbox-list{width:100%!important;max-width:100%!important;'+
          'flex:1 1 100%!important;min-width:0!important;}'+
        '.wbv5-chat-wrap{display:block!important;}'+
      '}';
    document.head.appendChild(s);
  }
  console.info('[WA-OASIS v7] Fix 24b: no-white-box safe CSS activo');
})();


/* ============================================================
   FIX 25 — Placeholder fuera del DOM de React (position:fixed)
   React no puede remover elementos que son hijos directos de body.
   Elimina el titileo causado por reconciliacion de React.
   ============================================================ */
(function fixPlaceholderStable(){
  if(window.__spFix25) return;
  window.__spFix25 = true;
  if(window.location.pathname.indexOf('/dashboard/whatsapp-bot')!==0) return;

  function isMobile(){ return window.innerWidth<=900; }

  /* Crear placeholder en body (fuera del arbol React) */
  function ensureBodyPH(){
    var ph = document.getElementById('sp-chat-placeholder');
    if(ph && ph.parentElement !== document.body){
      ph.remove(); ph = null;
    }
    if(!ph){
      ph = document.createElement('div');
      ph.id = 'sp-chat-placeholder';
      ph.innerHTML = '<div style="font-size:64px;margin-bottom:16px;opacity:0.5">💬</div>'+
        '<div style="font-size:18px;color:#41525d;font-weight:500;margin-bottom:4px">Selecciona un chat</div>'+
        '<div style="font-size:13px;color:#8696a0">Elige una conversacion de la lista</div>';
      ph.style.cssText = 'position:fixed;z-index:2000;background:#f0f2f5;'+
        'display:none;flex-direction:column;align-items:center;justify-content:center;'+
        'pointer-events:none;';
      document.body.appendChild(ph);
    }
    return ph;
  }

  /* Posicionar placeholder exactamente sobre .wbv5-chat-win */
  function positionPH(){
    if(isMobile()) return;
    var ph = ensureBodyPH();
    var cw = document.querySelector('.wbv5-chat-win');
    if(!cw){ ph.style.display='none'; return; }
    var r = cw.getBoundingClientRect();
    if(r.width < 50 || r.height < 50){ ph.style.display='none'; return; }
    ph.style.left   = r.left   + 'px';
    ph.style.top    = r.top    + 'px';
    ph.style.width  = r.width  + 'px';
    ph.style.height = r.height + 'px';
  }

  /* Override show/hide para usar el placeholder de body */
  window.__spShowPlaceholder = function(){
    if(isMobile()) return;
    positionPH();
    var ph = document.getElementById('sp-chat-placeholder');
    if(ph) ph.style.display = 'flex';
    var f = document.getElementById('sp-chat-iframe');
    if(f){ f.style.display='none'; f.style.zIndex='9'; }
    var cw = document.querySelector('.wbv5-chat-win');
    if(cw) cw.classList.remove('sp-iframe-active');
  };

  window.__spHidePlaceholder = function(){
    var ph = document.getElementById('sp-chat-placeholder');
    if(ph) ph.style.display = 'none';
    var f = document.getElementById('sp-chat-iframe');
    if(f){ f.style.display='block'; f.style.zIndex='10'; }
    var cw = document.querySelector('.wbv5-chat-win');
    if(cw) cw.classList.add('sp-iframe-active');
  };

  /* Mantener posicion al cambiar tamano */
  if(typeof ResizeObserver !== 'undefined'){
    var ro = new ResizeObserver(function(){ positionPH(); });
    function attachRO(){
      var cw = document.querySelector('.wbv5-chat-win');
      if(cw){ ro.observe(cw); }
      else { setTimeout(attachRO, 500); }
    }
    attachRO();
  }
  window.addEventListener('resize', function(){ positionPH(); });

  /* Inicializar */
  function init25(){
    if(window.__lastClickedJid || isMobile()) return;
    window.__spShowPlaceholder();
  }
  [200, 600, 1200, 2000].forEach(function(d){ setTimeout(init25, d); });

  console.info('[WA-OASIS v7] Fix 25: placeholder estable en body activo');
})();


/* ============================================================
   FIX 26 — Nuclear cleanup v2: recuadro blanco + pantalla 30s + titileo
   FIX: agrega display:flex en chat-win para desktop (evita colapso de grid)
   ============================================================ */
(function fix26(){
  if(window.__spFix26) return;
  window.__spFix26 = true;
  if(window.location.pathname.indexOf('/dashboard/whatsapp-bot')!==0) return;

  // sin nuclear kill

  /* ── 2. CSS corregido con display:flex en chat-win para desktop ── */
  var s = document.getElementById('sp-fix26-css');
  if(!s){ s=document.createElement('style'); s.id='sp-fix26-css'; document.head.appendChild(s); }
  s.textContent =
    '#sp-chat-iframe{display:none!important;}' +
    '.wbv5-chat-win.sp-iframe-active #sp-chat-iframe{display:block!important;}' +
    '@media(min-width:901px){' +
      '.wbv5-chat-wrap{display:grid!important;grid-template-columns:1fr 360px!important;grid-template-rows:1fr!important;}' +
      '.wbv5-chat-win{display:flex!important;flex-direction:column!important;grid-column:1!important;grid-row:1!important;order:1!important;background:#f0f2f5!important;position:relative!important;overflow:hidden!important;}' +
      '.wbv5-inbox-list{display:flex!important;flex-direction:column!important;grid-column:2!important;grid-row:1!important;order:2!important;border-left:1.5px solid rgba(0,0,0,0.1)!important;}' +
    '}' +
    '@media(max-width:900px){' +
      '.wbv5-chat-wrap{display:block!important;}' +
      '.wbv5-chat-win{display:none!important;}' +
      '.wbv5-inbox-list{width:100%!important;max-width:100%!important;display:flex!important;flex-direction:column!important;}' +
      '#sp-chat-placeholder{display:none!important;}' +
    '}';

  /* ── 3. Mostrar placeholder ── */
  function tryShowPH(){
    if(window.__lastClickedJid) return;
    if(window.innerWidth <= 900) return;
    if(window.__spShowPlaceholder) window.__spShowPlaceholder();
  }
  setTimeout(tryShowPH, 300);
  setTimeout(tryShowPH, 1000);
  setTimeout(tryShowPH, 2500);

  console.info('[WA-OASIS v7] Fix 26 v2: iframe hidden, display:flex chat-win, sin loops');
})();


/* ============================================================
   FIX 27 — Click/tap unificado con fallback a header
   PROBLEMA: .wbv5-conv-itm no tiene data-jid.
   SOLUCIÓN: tras click, esperar ~350ms a que React actualice
   .wbv5-cw-sub (que sí tiene el teléfono), usarlo como JID.
   Desktop: inject iframe. Móvil: overlay fullscreen.
   También corrige placeholder z-index tapando iframe.
   ============================================================ */
(function fix27(){
  if(window.__spFix27) return;
  window.__spFix27 = true;
  if(window.location.pathname.indexOf('/dashboard/whatsapp-bot') !== 0) return;

  /* Lee el teléfono del header del chat (React lo actualiza al seleccionar) */
  function headerJid(){
    var sub = document.querySelector('.wbv5-cw-sub');
    if(!sub) return '';
    var n = sub.textContent.replace(/[^0-9]/g,'');
    return (n && n.length >= 8) ? n + '@s.whatsapp.net' : '';
  }

  /* Abre chat en móvil vía overlay fullscreen */
  function openMobileChat(jid){
    if(!jid) return;
    var url = '/bot/chat.html?jid=' + encodeURIComponent(jid) + '&t=' + Date.now();
    var ov = document.getElementById('sp-mobile-chat-overlay');
    if(!ov){
      ov = document.createElement('div');
      ov.id = 'sp-mobile-chat-overlay';
      ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;background:#fff;display:flex;flex-direction:column;';
      var fr = document.createElement('iframe');
      fr.id = 'sp-mobile-chat-frame';
      fr.allow = 'microphone';
      fr.style.cssText = 'flex:1;width:100%;border:none;background:#fff;';
      ov.appendChild(fr);
      document.body.appendChild(ov);
    }
    var fr = document.getElementById('sp-mobile-chat-frame');
    if(fr) fr.src = url;
    ov.style.display = 'flex';
    console.info('[Fix27] móvil abierto: ' + jid);
  }
  window.__spOpenMobileChat27 = openMobileChat;

  /* Patch injectDesktopChatIframe: usa header como fallback cuando __lastClickedJid es null */
  function patchDesktop27(){
    window.injectDesktopChatIframe = function(){
      if(window.matchMedia('(max-width:900px)').matches) return;
      if(window.location.pathname.indexOf('whatsapp-bot') === -1) return;
      var cw = document.querySelector('.wbv5-chat-win');
      if(!cw) return;

      /* Obtener JID: __lastClickedJid → header de React → existente en iframe */
      var jid = window.__lastClickedJid || headerJid();
      if(!jid){
        var ex = document.getElementById('sp-chat-iframe');
        if(!ex || !ex.dataset.jid){
          window.__spShowPlaceholder && window.__spShowPlaceholder();
        }
        return;
      }

      window.__lastClickedJid = jid;
      window.__spHidePlaceholder && window.__spHidePlaceholder();

      var existing = document.getElementById('sp-chat-iframe');
      if(existing){
        if(existing.dataset.jid !== jid){
          existing.dataset.jid = jid;
          existing.src = '/bot/chat.html?jid=' + encodeURIComponent(jid) + '&t=' + Date.now();
        }
        existing.style.display = 'block';
        existing.style.zIndex = '10';
        cw.classList.add('sp-iframe-active');
        return;
      }
      var iframe = document.createElement('iframe');
      iframe.id = 'sp-chat-iframe';
      iframe.dataset.jid = jid;
      iframe.src = '/bot/chat.html?jid=' + encodeURIComponent(jid) + '&t=' + Date.now();
      iframe.allow = 'microphone';
      iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none;z-index:10;background:#fff;display:block;';
      cw.style.position = 'relative';
      cw.style.overflow = 'hidden';
      cw.classList.add('sp-iframe-active');
      cw.appendChild(iframe);
      console.info('[Fix27] desktop iframe → ' + jid);
    };
  }

  /* Listener unificado en inbox — detecta click en conv-item */
  function attachListener27(){
    var inbox = document.querySelector('.wbv5-inbox-list');
    if(!inbox || inbox.__sp27) return;
    inbox.__sp27 = true;

    inbox.addEventListener('click', function(e){
      var item = e.target.closest ? e.target.closest('.wbv5-conv-itm') : null;
      if(!item) return;

      var isMob = window.innerWidth <= 900 || document.documentElement.clientWidth <= 900;

      /* Intentar JID inmediato desde atributos DOM o nombre numérico */
      var jid = item.getAttribute('data-jid') || item.getAttribute('data-id') || '';
      if(!jid){
        var nameEl = item.querySelector('.wbv5-ci-name');
        if(nameEl){
          var raw = nameEl.textContent.replace(/⚡[^⚡]*/g,'').trim();
          var num = raw.replace(/\D/g,'');
          if(num.length >= 8) jid = num + '@s.whatsapp.net';
        }
      }
      if(jid) window.__lastClickedJid = jid;
      window.__spUserPickedChat = true;

      if(isMob){
        /* Móvil: prevenir comportamiento nativo, abrir overlay */
        e.preventDefault();
        e.stopPropagation();
        if(jid){
          openMobileChat(jid);
        } else {
          /* Sin JID inmediato → esperar que React actualice el header (~80-400ms) */
          var tries = 0;
          var poll = setInterval(function(){
            tries++;
            var hj = headerJid();
            if(hj){
              clearInterval(poll);
              window.__lastClickedJid = hj;
              openMobileChat(hj);
            } else if(tries >= 10){ clearInterval(poll); }
          }, 80);
        }
      } else {
        /* Desktop: esperar React, luego inject */
        setTimeout(function(){
          if(!window.__lastClickedJid){
            var hj = headerJid();
            if(hj) window.__lastClickedJid = hj;
          }
          if(typeof window.injectDesktopChatIframe === 'function'){
            window.injectDesktopChatIframe();
          }
        }, 350);
      }
    }, true);
  }

  /* Fix inmediato: placeholder tapando iframe con JID válido */
  function fixPlaceholderOverIframe(){
    var ph = document.getElementById('sp-chat-placeholder');
    if(!ph || ph.style.display === 'none') return;
    var iframe = document.getElementById('sp-chat-iframe');
    if(iframe && iframe.dataset.jid){
      ph.style.display = 'none';
      if(!window.__lastClickedJid) window.__lastClickedJid = iframe.dataset.jid;
    }
  }

  /* Aplicar patches */
  patchDesktop27();
  [0, 1600, 4100, 7100].forEach(function(d){ setTimeout(patchDesktop27, d); });
  [300, 800, 1600, 3100, 5100].forEach(function(d){ setTimeout(attachListener27, d); });
  setInterval(fixPlaceholderOverIframe, 600);

  /* Reconectar si React recrea inbox */
  setTimeout(function(){
    var obs = new MutationObserver(function(){
      var inbox = document.querySelector('.wbv5-inbox-list');
      if(inbox && !inbox.__sp27) attachListener27();
    });
    obs.observe(document.body, {childList: true, subtree: true});
  }, 1000);

  console.info('[WA-OASIS v8] Fix 27: click/tap unificado con header-JID fallback');
})();


/* ============================================================
   FIX 28 — Placeholder en carga inicial + sin auto-apertura
   PROBLEMA: Fix 27 lee .wbv5-cw-sub como fallback en llamadas
   automáticas → abre el chat de React sin que el usuario haga click.
   SOLUCIÓN:
     1. injectDesktopChatIframe solo usa __lastClickedJid (sin header fallback)
     2. En carga: resetear estado y forzar placeholder
     3. El click del usuario sigue usando Fix 27's listener (que sí usa header)
   ============================================================ */
(function fix28(){
  if(window.__spFix28) return;
  window.__spFix28 = true;
  if(window.location.pathname.indexOf('/dashboard/whatsapp-bot') !== 0) return;

  /* ── 1. Patch definitivo: injectDesktopChatIframe SIN fallback de header ── */
  function patchDesktop28(){
    window.injectDesktopChatIframe = function(){
      if(window.matchMedia('(max-width:900px)').matches) return;
      if(window.location.pathname.indexOf('whatsapp-bot') === -1) return;
      var cw = document.querySelector('.wbv5-chat-win');
      if(!cw) return;

      /* Solo JID explícito — NO leer de .wbv5-cw-sub en llamadas automáticas */
      var jid = window.__lastClickedJid || null;
      if(!jid){
        window.__spShowPlaceholder && window.__spShowPlaceholder();
        return;
      }

      window.__spHidePlaceholder && window.__spHidePlaceholder();
      var existing = document.getElementById('sp-chat-iframe');
      if(existing){
        if(existing.dataset.jid !== jid){
          existing.dataset.jid = jid;
          existing.src = '/bot/chat.html?jid=' + encodeURIComponent(jid) + '&t=' + Date.now();
        }
        existing.style.display = 'block';
        existing.style.zIndex = '10';
        cw.classList.add('sp-iframe-active');
        return;
      }
      var iframe = document.createElement('iframe');
      iframe.id = 'sp-chat-iframe';
      iframe.dataset.jid = jid;
      iframe.src = '/bot/chat.html?jid=' + encodeURIComponent(jid) + '&t=' + Date.now();
      iframe.allow = 'microphone';
      iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none;z-index:10;background:#fff;display:block;';
      cw.style.position = 'relative';
      cw.style.overflow = 'hidden';
      cw.classList.add('sp-iframe-active');
      cw.appendChild(iframe);
      console.info('[Fix28] desktop iframe → ' + jid);
    };
  }

  /* ── 2. Reset de estado en carga inicial ── */
  function resetOnLoad(){
    if(window.__spUserPickedChat) return; /* ya hubo click: no limpiar */

    /* Limpiar JID para que placeholder se muestre */
    window.__lastClickedJid = null;

    /* Eliminar iframe auto-creado por Fix 15/23/27 */
    var iframe = document.getElementById('sp-chat-iframe');
    if(iframe){ iframe.remove(); }

    /* Ocultar overlay móvil si quedó de sesión anterior */
    var ov = document.getElementById('sp-mobile-chat-overlay');
    if(ov) ov.style.display = 'none';

    /* Quitar sp-iframe-active del chat-win */
    var cw = document.querySelector('.wbv5-chat-win');
    if(cw) cw.classList.remove('sp-iframe-active');

    /* Mostrar placeholder */
    window.__spShowPlaceholder && window.__spShowPlaceholder();
  }

  /* ── 3. Listener de click: usa header como fallback (comportamiento de Fix27 OK) ── */
  /* Fix 27 ya tiene attachListener27 que llama injectDesktopChatIframe con __lastClickedJid.
     Aquí solo nos aseguramos de que la función inyectada (patchDesktop28) sea la correcta
     en el momento del click, y de parar el reset cuando el usuario elige un chat. */
  var _origInbox = null;
  function wrapInboxForUserFlag(){
    var inbox = document.querySelector('.wbv5-inbox-list');
    if(!inbox || inbox.__sp28flag) return;
    inbox.__sp28flag = true;
    inbox.addEventListener('click', function(e){
      var item = e.target.closest ? e.target.closest('.wbv5-conv-itm') : null;
      if(!item) return;
      window.__spUserPickedChat = true; /* marcar que el usuario ya eligió un chat */

      /* En desktop: leer header 350ms después (React actualiza) y abrir iframe */
      var isMob = window.innerWidth <= 900 || document.documentElement.clientWidth <= 900;
      if(!isMob){
        setTimeout(function(){
          if(!window.__lastClickedJid){
            var sub = document.querySelector('.wbv5-cw-sub');
            if(sub){
              var n = sub.textContent.replace(/[^0-9]/g,'');
              if(n && n.length >= 8) window.__lastClickedJid = n + '@s.whatsapp.net';
            }
          }
          if(window.__lastClickedJid && typeof window.injectDesktopChatIframe === 'function'){
            window.injectDesktopChatIframe();
          }
        }, 350);
      }
    }, true);
  }

  /* ── Aplicar ── */
  patchDesktop28();
  [0, 50, 200, 1800, 4300, 7300].forEach(function(d){ setTimeout(patchDesktop28, d); });

  /* Reset en carga inicial: varias pasadas hasta que React renderice */
  [150, 400, 900, 1600, 2500].forEach(function(d){
    setTimeout(resetOnLoad, d);
  });

  /* Adjuntar flag de usuario */
  [300, 800, 1600, 3200].forEach(function(d){ setTimeout(wrapInboxForUserFlag, d); });

  /* Reconectar si React recrea DOM */
  setTimeout(function(){
    var obs = new MutationObserver(function(){
      var inbox = document.querySelector('.wbv5-inbox-list');
      if(inbox && !inbox.__sp28flag) wrapInboxForUserFlag();
    });
    obs.observe(document.body, {childList: true, subtree: true});
  }, 1000);

  console.info('[WA-OASIS v8] Fix 28: placeholder en carga, sin auto-apertura de chat');
})();


/* ============================================================
   FIX 28b — Guard interval: placeholder forzado hasta click
   Fix 15 tiene referencias capturadas que abren chat automático
   incluso después del reset. Este guard corre cada 300ms y limpia
   cualquier iframe auto-creado hasta que el usuario elija un chat.
   ============================================================ */
(function fix28b(){
  if(window.__spFix28b) return;
  window.__spFix28b = true;
  if(window.location.pathname.indexOf('/dashboard/whatsapp-bot') !== 0) return;

  var _guard = setInterval(function(){
    /* Parar en cuanto el usuario haya elegido un chat */
    if(window.__spUserPickedChat){ clearInterval(_guard); return; }

    /* Eliminar cualquier iframe auto-creado */
    var f = document.getElementById('sp-chat-iframe');
    if(f){ f.remove(); }

    /* Limpiar estado */
    window.__lastClickedJid = null;
    var cw = document.querySelector('.wbv5-chat-win');
    if(cw) cw.classList.remove('sp-iframe-active');

    /* Mostrar placeholder */
    if(window.__spShowPlaceholder) window.__spShowPlaceholder();
  }, 300);

  /* Seguridad: máximo 10 segundos de guard */
  setTimeout(function(){ clearInterval(_guard); }, 10000);

  console.info('[WA-OASIS v8] Fix 28b: guard activo — placeholder hasta click usuario');
})();


/* ============================================================
   FIX 29 — Placeholder solo en Chats + nombres reales corregidos
   BUG 1: placeholder aparece en Clientes/Flujos etc (SPA nav)
   BUG 2: nombres no cargan porque Fix 28b elimina iframe antes de que
          Fix 22/23 pueda leer SB/SK (credenciales Supabase)
   SOLUCIÓN:
     1. Interceptar navegación SPA → ocultar placeholder fuera de whatsapp-bot
     2. Iframe oculto con ID diferente (Fix 28b no lo elimina) para SB/SK
   ============================================================ */
(function fix29(){
  if(window.__spFix29) return;
  window.__spFix29 = true;

  function isOnWABot(){
    return window.location.pathname.indexOf('/dashboard/whatsapp-bot') === 0;
  }

  /* ── 1. Ocultar placeholder al navegar fuera de whatsapp-bot ── */
  function syncPlaceholderToPath(){
    var ph = document.getElementById('sp-chat-placeholder');
    if(!ph) return;
    if(!isOnWABot()){
      ph.style.display = 'none';
    }
  }

  /* Interceptar navegación SPA: pushState / replaceState / popstate */
  (function patchHistory(){
    var _push = history.pushState.bind(history);
    var _replace = history.replaceState.bind(history);
    history.pushState = function(){ _push.apply(history, arguments); setTimeout(syncPlaceholderToPath, 60); };
    history.replaceState = function(){ _replace.apply(history, arguments); setTimeout(syncPlaceholderToPath, 60); };
    window.addEventListener('popstate', function(){ setTimeout(syncPlaceholderToPath, 60); });
  })();

  /* Fallback: polling de ruta para React Router interno */
  var _prevPath = window.location.pathname;
  setInterval(function(){
    var cur = window.location.pathname;
    if(cur !== _prevPath){ _prevPath = cur; syncPlaceholderToPath(); }
  }, 150);

  /* Override __spShowPlaceholder con verificación de ruta */
  var _origShow = window.__spShowPlaceholder;
  window.__spShowPlaceholder = function(){
    if(!isOnWABot()) return;
    _origShow && _origShow();
  };

  /* ── 2. Nombres reales: iframe oculto específico para SB/SK ── */
  /* Fix 28b solo elimina #sp-chat-iframe — este tiene ID diferente */
  function loadCredentials(){
    /* Si ya tenemos credenciales cacheadas, ir directo */
    if(window.__spCachedSB && window.__spCachedSK){
      fetchAndApplyNames();
      return;
    }
    /* Intentar leer del iframe principal si existe y cargó */
    var main = document.getElementById('sp-chat-iframe');
    if(main){
      try {
        if(main.contentWindow && main.contentWindow.SK){
          window.__spCachedSB = main.contentWindow.SB;
          window.__spCachedSK = main.contentWindow.SK;
          fetchAndApplyNames();
          return;
        }
      } catch(e){}
    }
    /* Crear iframe oculto de credenciales */
    if(document.getElementById('sp-cred-frame')) return;
    var fr = document.createElement('iframe');
    fr.id = 'sp-cred-frame';
    fr.src = '/bot/chat.html';
    fr.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;border:none;z-index:-1;';
    fr.onload = function(){
      try {
        if(fr.contentWindow && fr.contentWindow.SK){
          window.__spCachedSB = fr.contentWindow.SB;
          window.__spCachedSK = fr.contentWindow.SK;
          fetchAndApplyNames();
          setTimeout(function(){ if(fr.parentElement) fr.remove(); }, 1000);
        }
      } catch(e){}
    };
    document.body.appendChild(fr);
  }

  function fetchAndApplyNames(){
    var sb = window.__spCachedSB, sk = window.__spCachedSK;
    if(!sb || !sk) return;
    fetch(sb + '/rest/v1/oasis_wa_chats?select=jid,name,push_name,phone&limit=1000', {
      headers: {'apikey': sk, 'Authorization': 'Bearer ' + sk}
    }).then(function(r){ return r.json(); }).then(function(data){
      if(!Array.isArray(data)) return;
      var map = {};
      data.forEach(function(c){
        var jid = (c.jid || '').replace(/@.*/, '');
        var nm = (c.name || c.push_name || '').trim();
        if(!nm || nm === jid || /^[0-9+\-\s()]+$/.test(nm)) return;
        if(jid) map[jid] = nm;
        /* Guardar también sin prefijo 57 (Colombia) */
        var short = jid.replace(/^57/, '');
        if(short.length >= 8) map[short] = nm;
        if(c.phone){
          var p = String(c.phone).replace(/\D/g,'');
          map[p] = nm;
          map[p.replace(/^57/,'')] = nm;
        }
      });
      window.__spNames29 = map;
      applyNames29();
      console.info('[Fix29] nombres cargados:', Object.keys(map).length, 'contactos');
    }).catch(function(){});
  }

  function applyNames29(){
    if(!window.__spNames29 || !isOnWABot()) return;
    document.querySelectorAll('.wbv5-conv-itm').forEach(function(item){
      var nameEl = item.querySelector('.wbv5-ci-name');
      if(!nameEl) return;
      /* Leer solo nodos de texto directos (excluye badges <span>) */
      var txts = Array.from(nameEl.childNodes).filter(function(n){ return n.nodeType === 3; });
      var raw = txts.map(function(n){ return n.textContent; }).join('').trim();
      var num = raw.replace(/[^0-9]/g, '');
      var shortNum = num.replace(/^57/, '');
      var real = window.__spNames29[raw] || window.__spNames29[num] || window.__spNames29[shortNum] || null;
      if(real && txts.length > 0 && txts[0].textContent.trim() !== real){
        txts[0].textContent = real + ' ';
      }
    });
  }

  /* Iniciar carga de credenciales */
  [800, 2000, 4000].forEach(function(d){ setTimeout(loadCredentials, d); });

  /* Re-aplicar nombres cada vez que React re-renderice la lista */
  setInterval(applyNames29, 2000);

  /* Cuando el usuario abre un chat, cachear SB/SK del iframe principal */
  var _credCheck = setInterval(function(){
    if(window.__spCachedSB) { clearInterval(_credCheck); return; }
    var f = document.getElementById('sp-chat-iframe');
    try {
      if(f && f.contentWindow && f.contentWindow.SK){
        window.__spCachedSB = f.contentWindow.SB;
        window.__spCachedSK = f.contentWindow.SK;
        fetchAndApplyNames();
        clearInterval(_credCheck);
      }
    } catch(e){}
  }, 500);

  console.info('[WA-OASIS v8] Fix 29: placeholder solo en whatsapp-bot + nombres corregidos');
})();


/* ============================================================
   FIX 30 — Placeholder solo en seccion Chats (deteccion por DOM)
   BUG: Fix 29 detectaba cambio de seccion por URL, pero la URL
        NUNCA cambia en esta SPA (siempre /dashboard/whatsapp-bot).
   SOLUCION: .wbv5-inbox-list solo existe en DOM cuando React renderiza
        la seccion Chats. En Clientes/Flujos etc ese elemento no existe.
        Polling 150ms fuerza display:none fuera de Chats.
   ============================================================ */
(function fix30(){
  if(window.__spFix30) return;
  window.__spFix30 = true;
  function isOnChatsSection(){
    return !!document.querySelector('.wbv5-inbox-list');
  }
  window.__spShowPlaceholder = function(){
    if(!isOnChatsSection()) return;
    var ph = document.getElementById('sp-chat-placeholder');
    if(!ph) return;
    ph.style.display = 'flex';
  };
  setInterval(function(){
    if(!isOnChatsSection()){
      var ph = document.getElementById('sp-chat-placeholder');
      if(ph && ph.style.display !== 'none') ph.style.display = 'none';
    }
  }, 150);
  console.info('[WA-OASIS v8] Fix 30: placeholder solo en seccion Chats (deteccion DOM)');
})();


/* ============================================================
   FIX 31 — Eliminar placeholder del DOM fuera de Chats (no solo ocultar)
   BUG: Fix 30 ponia display:none pero el elemento sigue en body con
        position:fixed z-index:2000 — cualquier timer puede re-mostrarlo.
   SOLUCION: Eliminarlo completamente del DOM cuando no estamos en Chats.
        Override total de __spShowPlaceholder para recrearlo al volver.
   ============================================================ */
(function fix31(){
  if(window.__spFix31) return;
  window.__spFix31 = true;

  function isOnChatsSection(){
    return !!document.querySelector('.wbv5-inbox-list');
  }

  window.__spShowPlaceholder = function(){
    if(!isOnChatsSection()) return;
    var ph = document.getElementById('sp-chat-placeholder');
    if(ph){ ph.style.display = 'flex'; return; }
    ph = document.createElement('div');
    ph.id = 'sp-chat-placeholder';
    ph.style.cssText = 'position:fixed;z-index:2000;background:#f0f2f5;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;left:240px;top:0;width:calc(100vw - 640px);height:100vh;';
    var ico = document.createElement('div');
    ico.style.cssText = 'width:80px;height:80px;border-radius:50%;background:#e9edef;display:flex;align-items:center;justify-content:center;margin-bottom:16px;';
    ico.innerHTML = '<svg width="36" height="36" fill="#8696a0" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>';
    var txt = document.createElement('div');
    txt.textContent = 'Selecciona un chat';
    txt.style.cssText = 'font-size:16px;color:#667781;font-weight:400;';
    var sub = document.createElement('div');
    sub.textContent = 'Elige una conversacion de la lista';
    sub.style.cssText = 'font-size:13px;color:#8696a0;margin-top:4px;';
    ph.appendChild(ico); ph.appendChild(txt); ph.appendChild(sub);
    document.body.appendChild(ph);
  };

  setInterval(function(){
    if(!isOnChatsSection()){
      var ph = document.getElementById('sp-chat-placeholder');
      if(ph && ph.parentElement) ph.parentElement.removeChild(ph);
    }
  }, 100);

  console.info('[WA-OASIS v8] Fix 31: placeholder eliminado del DOM fuera de Chats');
})();


/* ============================================================
   FIX 32 — Placeholder dentro de .wbv5-chat-win (position:absolute)
   BUG: Fix 31 crea placeholder con ancho hardcodeado dejando gap derecho.
        .wbv5-chat-win ya tiene position:relative — meter el placeholder
        adentro con inset:0 lo hace llenar exactamente el panel sin calculos.
        Cuando React desmonta .wbv5-chat-win (al navegar a Clientes etc.),
        el placeholder desaparece naturalmente con su padre.
   ============================================================ */
(function fix32(){
  if(window.__spFix32) return;
  window.__spFix32 = true;

  function isOnChatsSection(){ return !!document.querySelector('.wbv5-inbox-list'); }

  function relocate(){
    var ph = document.getElementById('sp-chat-placeholder');
    if(!ph) return;
    var cw = document.querySelector('.wbv5-chat-win');
    if(!cw){
      if(ph.parentElement) ph.parentElement.removeChild(ph);
      return;
    }
    if(ph.parentElement === cw) return;
    /* Cambiar a absolute dentro del contenedor */
    ph.style.position = 'absolute';
    ph.style.left = '0'; ph.style.top = '0';
    ph.style.right = '0'; ph.style.bottom = '0';
    ph.style.width = ''; ph.style.height = '';
    ph.style.zIndex = '5';
    cw.appendChild(ph);
  }

  /* Override __spShowPlaceholder con logica limpia */
  window.__spShowPlaceholder = function(){
    if(!isOnChatsSection()) return;
    var ph = document.getElementById('sp-chat-placeholder');
    if(!ph){
      var cw = document.querySelector('.wbv5-chat-win');
      if(!cw) return;
      ph = document.createElement('div');
      ph.id = 'sp-chat-placeholder';
      ph.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;z-index:5;'
        + 'background:#f0f2f5;display:flex;flex-direction:column;'
        + 'align-items:center;justify-content:center;pointer-events:none;';
      var ico = document.createElement('div');
      ico.style.cssText = 'width:80px;height:80px;border-radius:50%;background:#e9edef;'
        + 'display:flex;align-items:center;justify-content:center;margin-bottom:16px;';
      ico.innerHTML = '<svg width="36" height="36" fill="#8696a0" viewBox="0 0 24 24">'
        + '<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>';
      var txt = document.createElement('div');
      txt.textContent = 'Selecciona un chat';
      txt.style.cssText = 'font-size:16px;color:#667781;font-weight:400;';
      var sub = document.createElement('div');
      sub.textContent = 'Elige una conversacion de la lista';
      sub.style.cssText = 'font-size:13px;color:#8696a0;margin-top:4px;';
      ph.appendChild(ico); ph.appendChild(txt); ph.appendChild(sub);
      cw.appendChild(ph);
    } else {
      ph.style.display = 'flex';
      relocate();
    }
  };

  /* Polling 200ms: mover al lugar correcto si algo lo sacó */
  setInterval(relocate, 200);

  /* Relocalizar el placeholder que ya existe ahora mismo */
  setTimeout(relocate, 50);

  console.info('[WA-OASIS v8] Fix 32: placeholder en .wbv5-chat-win, sin gap lateral');
})();


/* ============================================================
   FIX 33 — Ocultar flecha ← en desktop, visible solo en móvil
   En desktop la flecha no tiene sentido (no hay "volver a lista").
   En móvil es necesaria para regresar a la lista de chats.
   Detecta el botón por texto "←" (no tiene clase CSS propia).
   ============================================================ */
(function fix33(){
  if(window.__spFix33) return;
  window.__spFix33 = true;

  function applyBackBtn(){
    var btns = Array.from(document.querySelectorAll('button'));
    var backBtn = btns.find(function(b){ return b.textContent.trim() === '←'; });
    if(!backBtn) return;
    var isMobile = window.innerWidth <= 768;
    backBtn.style.display = isMobile ? '' : 'none';
  }

  /* Aplicar al cargar, en resize y periódicamente (React re-renderiza) */
  setInterval(applyBackBtn, 500);
  window.addEventListener('resize', applyBackBtn);
  setTimeout(applyBackBtn, 300);

  console.info('[WA-OASIS v8] Fix 33: flecha <- oculta en desktop, visible en movil');
})();

(function fix34(){
  if(window.__spFix34) return; window.__spFix34 = true;
  function applyBackBtnIframe(){
    var f = document.getElementById("sp-chat-iframe");
    if(!f) return;
    var cd;
    try { cd = f.contentDocument || f.contentWindow.document; } catch(e){ return; }
    var backBtn = cd.getElementById("back-btn");
    if(!backBtn) return;
    var isMobile = window.innerWidth <= 768;
    backBtn.style.display = isMobile ? "" : "none";
  }
  setInterval(applyBackBtnIframe, 500);
  window.addEventListener("resize", applyBackBtnIframe);
  setTimeout(applyBackBtnIframe, 300);
  console.info("[WA-OASIS v8] Fix 34: back-btn iframe oculto desktop");
})();

(function fix35(){
  if(window.__spFix35) return; window.__spFix35 = true;

  // 1. Restore hamburger — v31 killFixedHam() hides sp-hamburger because it has position:fixed + "ham" in ID
  function restoreHamburger(){
    var ham = document.getElementById("sp-hamburger");
    if(ham && window.getComputedStyle(ham).display === "none"){
      ham.style.setProperty("display","flex","important");
    }
  }
  setInterval(restoreHamburger, 250);
  [100,300,700,1200,2000,3500].forEach(function(d){ setTimeout(restoreHamburger,d); });

  // 2. Fix 20px white-space gap on right side of inbox list
  var gapStyle = document.createElement("style");
  gapStyle.id = "sp-fix35-css";
  gapStyle.textContent =
    ".wbv5-inbox-list{flex:1 1 auto!important;min-width:280px!important;max-width:400px!important;}" +
    ".wbv5-main,.wbv5-root{width:100vw!important;max-width:100vw!important;overflow-x:hidden!important;}" +
    ".wbv5-root > *{flex-shrink:0!important;}";
  document.head.appendChild(gapStyle);
  function fixGap(){
    var inbox = document.querySelector(".wbv5-inbox-list");
    if(!inbox) return;
    var main = document.querySelector(".wbv5-main") || inbox.parentElement;
    if(!main) return;
    // Make main fill to viewport edge
    main.style.setProperty("width","100%","important");
    main.style.setProperty("flex","1","important");
  }
  setInterval(fixGap, 1500);
  [200,600,1200].forEach(function(d){ setTimeout(fixGap,d); });

  // 3. Day divider — separator between today vs older chats
  var divStyle = document.createElement("style");
  divStyle.textContent = ".sp35-divider{display:block!important;width:100%!important;padding:3px 14px!important;font-size:10px!important;font-weight:700!important;color:#94a3b8!important;text-transform:uppercase!important;letter-spacing:0.6px!important;background:linear-gradient(to right,#f1f5f9,#e8edf4)!important;border-top:1px solid #e2e8f0!important;border-bottom:1px solid #e2e8f0!important;margin:1px 0!important;box-sizing:border-box!important;pointer-events:none!important;}";
  document.head.appendChild(divStyle);

  function injectDayDividers(){
    var convs = document.querySelector(".wbv5-il-convs");
    if(!convs) return;
    var items = Array.from(convs.querySelectorAll(".wbv5-il-item")).filter(function(el){
      return el.style.display !== "none" && !el.getAttribute("data-sp-dd");
    });
    if(items.length < 2) return;
    convs.querySelectorAll(".sp35-divider").forEach(function(d){ d.remove(); });
    var todayBoundaryDone = false;
    items.forEach(function(item){
      var timeEl = item.querySelector("[class*=ci-time],[class*=il-time]");
      if(!timeEl) return;
      var t = timeEl.textContent.trim();
      var isToday = /^d{1,2}:d{2}/.test(t);
      if(!isToday && !todayBoundaryDone){
        todayBoundaryDone = true;
        var div = document.createElement("div");
        div.className = "sp35-divider";
        div.textContent = "Anteriores";
        convs.insertBefore(div, item);
      }
    });
    // Insert "Hoy" at very top if first item is today
    var firstTime = items[0] && items[0].querySelector("[class*=ci-time],[class*=il-time]");
    if(firstTime && /^d{1,2}:d{2}/.test(firstTime.textContent.trim())){
      var existing = convs.querySelector(".sp35-divider-hoy");
      if(!existing){
        var divH = document.createElement("div");
        divH.className = "sp35-divider sp35-divider-hoy";
        divH.textContent = "Hoy";
        convs.insertBefore(divH, convs.firstChild);
      }
    }
  }
  setInterval(injectDayDividers, 2500);
  [1500,2500,4000].forEach(function(d){ setTimeout(injectDayDividers,d); });

  // 4. Kill AI error toast (belt+suspenders backup to v36)
  function killAIToast(){
    try{
      document.querySelectorAll("*").forEach(function(el){
        try{
          if(el.childElementCount < 5 && el.textContent &&
             (el.textContent.indexOf("Error") !== -1 || el.textContent.indexOf("error") !== -1) &&
             el.textContent.indexOf("IA") !== -1 &&
             ["fixed","absolute"].indexOf(window.getComputedStyle(el).position) !== -1 &&
             window.getComputedStyle(el).display !== "none" &&
             window.getComputedStyle(el).opacity !== "0"){
            el.style.setProperty("display","none","important");
          }
        }catch(ei){}
      });
    }catch(e){}
  }
  setInterval(killAIToast, 800);

  console.info("[WA-OASIS v8] Fix 35: hamburger restaurado, gap corregido, divisores dia, AI toast");
})();

(function fix35(){
  if(window.__spFix35) return; window.__spFix35 = true;

  // 1. Restore hamburger — v31 killFixedHam() hides sp-hamburger because it has position:fixed + "ham" in ID
  function restoreHamburger(){
    var ham = document.getElementById("sp-hamburger");
    if(ham && window.getComputedStyle(ham).display === "none"){
      ham.style.setProperty("display","flex","important");
    }
  }
  setInterval(restoreHamburger, 250);
  [100,300,700,1200,2000,3500].forEach(function(d){ setTimeout(restoreHamburger,d); });

  // 2. Fix 20px white-space gap on right side of inbox list
  var gapStyle = document.createElement("style");
  gapStyle.id = "sp-fix35-css";
  gapStyle.textContent =
    ".wbv5-inbox-list{flex:1 1 auto!important;min-width:280px!important;max-width:400px!important;}" +
    ".wbv5-main,.wbv5-root{width:100vw!important;max-width:100vw!important;overflow-x:hidden!important;}" +
    ".wbv5-root > *{flex-shrink:0!important;}";
  document.head.appendChild(gapStyle);
  function fixGap(){
    var inbox = document.querySelector(".wbv5-inbox-list");
    if(!inbox) return;
    var main = document.querySelector(".wbv5-main") || inbox.parentElement;
    if(!main) return;
    // Make main fill to viewport edge
    main.style.setProperty("width","100%","important");
    main.style.setProperty("flex","1","important");
  }
  setInterval(fixGap, 1500);
  [200,600,1200].forEach(function(d){ setTimeout(fixGap,d); });

  // 3. Day divider — separator between today vs older chats
  var divStyle = document.createElement("style");
  divStyle.textContent = ".sp35-divider{display:block!important;width:100%!important;padding:3px 14px!important;font-size:10px!important;font-weight:700!important;color:#94a3b8!important;text-transform:uppercase!important;letter-spacing:0.6px!important;background:linear-gradient(to right,#f1f5f9,#e8edf4)!important;border-top:1px solid #e2e8f0!important;border-bottom:1px solid #e2e8f0!important;margin:1px 0!important;box-sizing:border-box!important;pointer-events:none!important;}";
  document.head.appendChild(divStyle);

  function injectDayDividers(){
    var convs = document.querySelector(".wbv5-il-convs");
    if(!convs) return;
    var items = Array.from(convs.querySelectorAll(".wbv5-il-item")).filter(function(el){
      return el.style.display !== "none" && !el.getAttribute("data-sp-dd");
    });
    if(items.length < 2) return;
    convs.querySelectorAll(".sp35-divider").forEach(function(d){ d.remove(); });
    var todayBoundaryDone = false;
    items.forEach(function(item){
      var timeEl = item.querySelector("[class*=ci-time],[class*=il-time]");
      if(!timeEl) return;
      var t = timeEl.textContent.trim();
      var isToday = /^d{1,2}:d{2}/.test(t);
      if(!isToday && !todayBoundaryDone){
        todayBoundaryDone = true;
        var div = document.createElement("div");
        div.className = "sp35-divider";
        div.textContent = "Anteriores";
        convs.insertBefore(div, item);
      }
    });
    // Insert "Hoy" at very top if first item is today
    var firstTime = items[0] && items[0].querySelector("[class*=ci-time],[class*=il-time]");
    if(firstTime && /^d{1,2}:d{2}/.test(firstTime.textContent.trim())){
      var existing = convs.querySelector(".sp35-divider-hoy");
      if(!existing){
        var divH = document.createElement("div");
        divH.className = "sp35-divider sp35-divider-hoy";
        divH.textContent = "Hoy";
        convs.insertBefore(divH, convs.firstChild);
      }
    }
  }
  setInterval(injectDayDividers, 2500);
  [1500,2500,4000].forEach(function(d){ setTimeout(injectDayDividers,d); });

  // 4. Kill AI error toast (belt+suspenders backup to v36)
  function killAIToast(){
    try{
      document.querySelectorAll("*").forEach(function(el){
        try{
          if(el.childElementCount < 5 && el.textContent &&
             (el.textContent.indexOf("Error") !== -1 || el.textContent.indexOf("error") !== -1) &&
             el.textContent.indexOf("IA") !== -1 &&
             ["fixed","absolute"].indexOf(window.getComputedStyle(el).position) !== -1 &&
             window.getComputedStyle(el).display !== "none" &&
             window.getComputedStyle(el).opacity !== "0"){
            el.style.setProperty("display","none","important");
          }
        }catch(ei){}
      });
    }catch(e){}
  }
  setInterval(killAIToast, 800);

  console.info("[WA-OASIS v8] Fix 35: hamburger restaurado, gap corregido, divisores dia, AI toast");
})();

(function fix36(){
  if(window.__spFix36) return; window.__spFix36 = true;

  // 1. Fix 20px white-space gap: inbox-list has app CSS width:340px but grid column is 360px
  var gapCss = document.createElement("style");
  gapCss.id = "sp-fix36-css";
  gapCss.textContent =
    "@media(min-width:769px){" +
    ".wbv5-inbox-list{width:100%!important;max-width:100%!important;}" +
    "}";
  document.head.appendChild(gapCss);
  function fixInboxWidth(){
    var inbox = document.querySelector(".wbv5-inbox-list");
    if(!inbox) return;
    inbox.style.setProperty("width","100%","important");
    inbox.style.setProperty("max-width","100%","important");
  }
  setInterval(fixInboxWidth, 1000);
  [100,300,700,1500].forEach(function(d){ setTimeout(fixInboxWidth,d); });

  // 2. Day dividers using correct class wbv5-conv-itm
  var divStyle = document.createElement("style");
  divStyle.textContent =
    ".sp36-div{display:flex!important;align-items:center!important;gap:8px!important;" +
    "padding:4px 12px!important;font-size:10px!important;font-weight:700!important;" +
    "color:#94a3b8!important;text-transform:uppercase!important;letter-spacing:0.5px!important;" +
    "background:#f1f5f9!important;border-top:1px solid #e2e8f0!important;" +
    "border-bottom:1px solid #e2e8f0!important;margin:0!important;" +
    "width:100%!important;box-sizing:border-box!important;pointer-events:none!important;}" +
    ".sp36-div::before,.sp36-div::after{content:'';flex:1;height:1px;background:#e2e8f0!important;}";
  document.head.appendChild(divStyle);

  var _lastDivCount = -1;
  function injectDayDividers(){
    var convs = document.querySelector(".wbv5-il-convs");
    if(!convs) return;
    var items = Array.from(convs.querySelectorAll(".wbv5-conv-itm")).filter(function(el){
      return el.style.display !== "none";
    });
    if(items.length === _lastDivCount) return;
    _lastDivCount = items.length;

    // Remove existing dividers
    convs.querySelectorAll(".sp36-div").forEach(function(d){ d.remove(); });
    if(items.length === 0) return;

    var todayGroupDone = false;
    var anteriorDone = false;

    // Insert HOY at top if first item is today (HH:MM format)
    var firstTimeEl = items[0].querySelector("[class*=ci-time],[class*=conv-time],[class*=time]");
    var firstTime = firstTimeEl ? firstTimeEl.textContent.trim() : "";
    var firstIsToday = /^\d{1,2}:\d{2}/.test(firstTime);
    if(firstIsToday){
      var divHoy = document.createElement("div");
      divHoy.className = "sp36-div";
      divHoy.setAttribute("data-sp36","hoy");
      divHoy.textContent = "Hoy";
      convs.insertBefore(divHoy, items[0]);
    }

    // Insert ANTERIORES divider before first non-today item
    items.forEach(function(item){
      var timeEl = item.querySelector("[class*=ci-time],[class*=conv-time],[class*=time]");
      if(!timeEl) return;
      var t = timeEl.textContent.trim();
      var isToday = /^\d{1,2}:\d{2}/.test(t);
      if(!isToday && !anteriorDone){
        anteriorDone = true;
        var divAnt = document.createElement("div");
        divAnt.className = "sp36-div";
        divAnt.setAttribute("data-sp36","ant");
        divAnt.textContent = "Anteriores";
        convs.insertBefore(divAnt, item);
      }
    });
  }

  setInterval(injectDayDividers, 2000);
  [1000,2000,3500,5000].forEach(function(d){ setTimeout(injectDayDividers,d); });

  console.info("[WA-OASIS v8] Fix 36: gap cerrado, divisores dia correctos");
})();

(function fix37(){
  if(window.__spFix37b) return; window.__spFix37b = true;

  // 1. Hamburger: SOLO en movil (<=768px). Override Fix35 que lo deja siempre visible.
  //    Corre a 200ms para ganar la carrera contra Fix35 (250ms).
  var hamCSS = document.createElement("style");
  hamCSS.id = "sp-fix37-css";
  hamCSS.textContent =
    // Desktop: ocultar
    "@media(min-width:769px){#sp-hamburger{display:none!important;}}" +
    // Movil: mostrar + compensar search/inbox header
    "@media(max-width:768px){" +
    "#sp-hamburger{display:flex!important;}" +
    ".wbv5-il-search{padding-left:56px!important;box-sizing:border-box!important;}" +
    "[class*=inbox-header],[class*=il-header]{padding-left:56px!important;}" +
    "}";
  document.head.appendChild(hamCSS);

  function syncHamburger(){
    var ham = document.getElementById("sp-hamburger");
    if(!ham) return;
    var isMobile = window.innerWidth <= 768;
    if(isMobile){
      ham.style.setProperty("display","flex","important");
    } else {
      // Forzar none — override Fix35 inline style
      ham.style.setProperty("display","none","important");
    }
  }
  setInterval(syncHamburger, 200);
  window.addEventListener("resize", syncHamburger);
  [50,200,500,1000,2000].forEach(function(d){ setTimeout(syncHamburger,d); });

  // 2. Panel button — abrir navbarDashboard correctamente
  function fixPanelBtn(){
    var btn = document.getElementById("sp-panel-btn");
    if(!btn || btn.__fix37patched) return;
    btn.__fix37patched = true;
    btn.addEventListener("click", function(e){
      e.stopPropagation();
      e.preventDefault();
      var grid = document.querySelector(".containerGrid");
      if(!grid) return;
      var isOpen = grid.classList.contains("sp-nav-open");
      if(isOpen){
        grid.classList.remove("sp-nav-open");
        var bd = document.getElementById("sp-nav-bd");
        if(bd) bd.remove();
      } else {
        grid.classList.add("sp-nav-open");
        // Ensure backdrop exists
        var bd = document.getElementById("sp-nav-bd");
        if(!bd){
          bd = document.createElement("div");
          bd.id = "sp-nav-bd";
          bd.style.cssText = "position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,.38);cursor:pointer";
          bd.addEventListener("click", function(){
            var g2 = document.querySelector(".containerGrid");
            if(g2) g2.classList.remove("sp-nav-open");
            bd.remove();
          });
          document.body.appendChild(bd);
        }
      }
      // Also close sp-hamburger sidebar when Panel is clicked
      var sidebar = document.querySelector(".wbv5-sidebar");
      var overlay = document.getElementById("sp-sidebar-overlay");
      var hamBtn = document.getElementById("sp-hamburger");
      if(sidebar) sidebar.classList.remove("sp-open");
      if(overlay) overlay.classList.remove("active");
      if(hamBtn) hamBtn.classList.remove("open");
    }, true); // capture phase to override v28
  }

  // Inject Panel button if missing
  function ensurePanelBtn(){
    if(document.getElementById("sp-panel-btn")) { fixPanelBtn(); return; }
    var sb = document.querySelector(".wbv5-sidebar");
    if(!sb) return;
    var fs = sb.querySelector(".wbv5-nav-section");
    if(!fs) return;
    var btn = document.createElement("button");
    btn.id = "sp-panel-btn";
    btn.innerHTML = "&#127968; Panel";
    btn.style.cssText = "display:flex!important;align-items:center;gap:6px;padding:9px 14px;" +
      "margin:4px 8px 10px;background:#25D366;color:#fff;border:none;border-radius:8px;" +
      "cursor:pointer;font-size:13px;font-weight:600;width:calc(100% - 16px);box-sizing:border-box;";
    btn.__fix37patched = true;
    btn.addEventListener("click", function(e){
      e.stopPropagation(); e.preventDefault();
      var grid = document.querySelector(".containerGrid"); if(!grid) return;
      var isOpen = grid.classList.contains("sp-nav-open");
      if(isOpen){ grid.classList.remove("sp-nav-open"); var bd=document.getElementById("sp-nav-bd"); if(bd) bd.remove(); }
      else {
        grid.classList.add("sp-nav-open");
        var bd2 = document.getElementById("sp-nav-bd");
        if(!bd2){ bd2=document.createElement("div"); bd2.id="sp-nav-bd"; bd2.style.cssText="position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,.38);cursor:pointer"; bd2.onclick=function(){ var g2=document.querySelector(".containerGrid"); if(g2) g2.classList.remove("sp-nav-open"); bd2.remove(); }; document.body.appendChild(bd2); }
      }
      var sidebar2 = document.querySelector(".wbv5-sidebar"); var ov2 = document.getElementById("sp-sidebar-overlay"); var hb2 = document.getElementById("sp-hamburger");
      if(sidebar2) sidebar2.classList.remove("sp-open"); if(ov2) ov2.classList.remove("active"); if(hb2) hb2.classList.remove("open");
    });
    sb.insertBefore(btn, fs);
  }

  setInterval(ensurePanelBtn, 1500);
  [500,1200,2500].forEach(function(d){ setTimeout(ensurePanelBtn,d); });

  console.info("[WA-OASIS v8] Fix 37: hamburger movil-only, search padding, panel btn fix");
})();

(function fix38(){
  if(window.__spFix38) return; window.__spFix38 = true;

  // 1. CSS base: desktop=none, mobile=flex, search padding fix
  var css = document.createElement("style");
  css.id = "sp-fix38-css";
  css.textContent =
    "@media(min-width:769px){#sp-hamburger{display:none!important;}}" +
    "@media(max-width:768px){" +
    "#sp-hamburger{display:flex!important;}" +
    ".wbv5-il-search{padding-left:58px!important;width:100%!important;box-sizing:border-box!important;}" +
    "}";
  document.head.appendChild(css);

  // 2. MutationObserver: corrects hamburger display INSTANTLY on every style mutation
  //    Stops the Fix35/Fix37 setInterval fight completely.
  function getWantedDisplay(){
    return window.innerWidth <= 768 ? "flex" : "none";
  }
  function applyHam(ham){
    var want = getWantedDisplay();
    var cur = ham.style.getPropertyValue("display");
    var pri = ham.style.getPropertyPriority("display");
    if(cur !== want || pri !== "important"){
      // Temporarily disconnect to avoid re-triggering observer
      if(ham.__fix38obs) ham.__fix38obs.disconnect();
      ham.style.setProperty("display", want, "important");
      if(ham.__fix38obs) ham.__fix38obs.observe(ham, {attributes:true,attributeFilter:["style"]});
    }
  }
  function attachObserver(){
    var ham = document.getElementById("sp-hamburger");
    if(!ham || ham.__fix38obs) return;
    applyHam(ham);
    var obs = new MutationObserver(function(){ applyHam(ham); });
    ham.__fix38obs = obs;
    obs.observe(ham, {attributes:true, attributeFilter:["style"]});
  }
  attachObserver();
  setInterval(function(){
    var ham = document.getElementById("sp-hamburger");
    if(ham && !ham.__fix38obs) attachObserver();
    else if(ham) applyHam(ham);
  }, 400);
  window.addEventListener("resize", function(){
    var ham = document.getElementById("sp-hamburger");
    if(ham) applyHam(ham);
  });

  // 3. Search padding enforcement on mobile
  function fixSearch(){
    if(window.innerWidth > 768) return;
    var s = document.querySelector(".wbv5-il-search");
    if(s) s.style.setProperty("padding-left","58px","important");
  }
  setInterval(fixSearch, 1500);
  [500,1200,2500].forEach(function(d){ setTimeout(fixSearch,d); });

  console.info("[WA-OASIS v8] Fix 38: ham MutationObserver, no flicker, search padding");
})();

(function fix39(){
  if(window.__spFix39) return; window.__spFix39 = true;

  // ===== 1. PANEL BUTTON FIX =====
  // The navbarDashboard has class "navbarDashboardClosed" (display:none).
  // sp-nav-open class alone is not enough — must directly show/hide navbar.
  var panelCSS = document.createElement("style");
  panelCSS.textContent =
    ".navbarDashboard.sp-nav-panel-open{" +
    "display:block!important;position:fixed!important;" +
    "left:0!important;top:0!important;height:100vh!important;" +
    "width:220px!important;z-index:99999!important;" +
    "overflow-y:auto!important;background:#fff!important;" +
    "box-shadow:4px 0 20px rgba(0,0,0,0.15)!important;}" +
    "#sp-nav-bd39{position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.4);cursor:pointer;}";
  document.head.appendChild(panelCSS);

  function openDashNav(){
    var navbar = document.querySelector(".navbarDashboard");
    if(!navbar) return;
    navbar.classList.add("sp-nav-panel-open");
    // Also add backdrop
    if(!document.getElementById("sp-nav-bd39")){
      var bd = document.createElement("div");
      bd.id = "sp-nav-bd39";
      bd.onclick = closeDashNav;
      document.body.appendChild(bd);
    }
  }
  function closeDashNav(){
    var navbar = document.querySelector(".navbarDashboard");
    if(navbar) navbar.classList.remove("sp-nav-panel-open");
    var bd = document.getElementById("sp-nav-bd39");
    if(bd) bd.remove();
  }

  function patchPanelBtn(){
    var btn = document.getElementById("sp-panel-btn");
    if(!btn || btn.__fix39) return;
    btn.__fix39 = true;
    btn.addEventListener("click", function(e){
      e.stopImmediatePropagation(); e.preventDefault();
      var navbar = document.querySelector(".navbarDashboard");
      if(!navbar) return;
      var isOpen = navbar.classList.contains("sp-nav-panel-open");
      if(isOpen){ closeDashNav(); }
      else { openDashNav(); }
      // Close hamburger sidebar too
      var sb = document.querySelector(".wbv5-sidebar");
      var ov = document.getElementById("sp-sidebar-overlay");
      var hb = document.getElementById("sp-hamburger");
      if(sb) sb.classList.remove("sp-open");
      if(ov) ov.classList.remove("active");
      if(hb){ hb.classList.remove("open"); hb.style.setProperty("display","none","important"); setTimeout(function(){ hb.style.setProperty("display",window.innerWidth<=768?"flex":"none","important"); },50); }
    }, true);
  }

  patchPanelBtn();
  setInterval(patchPanelBtn, 1500);

  // ===== 2. FLASH FIX — suppress iframe injection for 3s on page load =====
  // The flash is caused by Fix28b injecting/removing sp-chat-iframe briefly.
  // Mark page-load time so existing code can gate itself.
  if(!window.__spPageLoadTime) window.__spPageLoadTime = Date.now();
  
  // Override __spShowPlaceholder to also suppress iframe flash
  var _origShow = window.__spShowPlaceholder;
  window.__spShowPlaceholder = function(){
    // Remove any lingering iframe on page load
    var iframe = document.getElementById("sp-chat-iframe");
    if(iframe && (Date.now() - (window.__spPageLoadTime||0)) < 4000){
      iframe.remove();
    }
    if(_origShow) _origShow.apply(this, arguments);
  };

  // On page load, immediately clear active chat state to prevent flash
  setTimeout(function(){
    var iframe = document.getElementById("sp-chat-iframe");
    if(iframe) iframe.remove();
    if(window.__spShowPlaceholder) window.__spShowPlaceholder();
  }, 50);

  // ===== 3. SMOOTH SORT — add CSS transitions to reduce visual jump =====
  var sortCSS = document.createElement("style");
  sortCSS.textContent =
    ".wbv5-conv-itm{transition:background 0.2s!important;}" +
    ".wbv5-il-convs{overflow-anchor:none!important;}";
  document.head.appendChild(sortCSS);

  // ===== 4. KEEP SEBASTIAN ORDER STABLE =====
  // Prevent re-sort during first 5 seconds so React initial render is stable.
  window.__spSortGrace = Date.now() + 5000;
  var _origFetch = window.fetchOrder;
  if(typeof _origFetch === "function"){
    window.fetchOrder = function(cb){
      if(Date.now() < (window.__spSortGrace||0)){
        console.info("[Fix39] Sort blocked during grace period");
        return;
      }
      return _origFetch.apply(this, arguments);
    };
  }

  console.info("[WA-OASIS v8] Fix 39: panel btn fixed, flash suppressed, sort stable");
})();

(function fix40(){
  if(window.__spFix40) return; window.__spFix40 = true;
  // Correct the navbarDashboard overlay background — Fix39 forced white bg, making white text invisible
  var css = document.createElement("style");
  css.textContent = ".navbarDashboard.sp-nav-panel-open{background:linear-gradient(rgb(11,61,91),rgb(10,46,68))!important;box-shadow:4px 0 20px rgba(0,0,0,0.3)!important;}";
  document.head.appendChild(css);
})();

(function fix41(){
  if(window.__spFix41) return; window.__spFix41 = true;
  function parseMin(s){
    if(!s) return -1;
    var m=s.replace(/\.\s*/g,"").match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
    if(!m) return -1;
    var h=parseInt(m[1]),mn=parseInt(m[2]),ap=m[3].toLowerCase();
    if(ap==="pm"&&h<12)h+=12; if(ap==="am"&&h===12)h=0;
    return h*60+mn;
  }
  function getTxt(el){var q=el.querySelector("[class*=time],[class*=Time]");return q?q.textContent.trim():"";}
  function sortChats(){
    var list=document.querySelector(".wbv5-il-convs");
    if(!list) return;
    list.querySelectorAll(".wbv5-conv-itm[data-sp-dd46]").forEach(function(el){el.remove();});
    var divs=[...list.querySelectorAll(".sp36-div")];
    var its=[...list.querySelectorAll(".wbv5-conv-itm:not(.sp36-div)")].filter(function(el){return getComputedStyle(el).display!=="none";});
    if(its.length<2) return;
    var tod=its.filter(function(el){return /\d{1,2}:\d{2}/.test(getTxt(el));});
    var old=its.filter(function(el){return !/\d{1,2}:\d{2}/.test(getTxt(el));});
    tod.sort(function(a,b){return parseMin(getTxt(b))-parseMin(getTxt(a));});
    var srt=tod.concat(old);
    var cur=[...list.querySelectorAll(".wbv5-conv-itm:not(.sp36-div)")].filter(function(el){return getComputedStyle(el).display!=="none";});
    if(srt.length===cur.length&&srt.every(function(el,i){return el===cur[i];})) return;
    divs.forEach(function(d){d.remove();});
    srt.forEach(function(el){list.appendChild(el);});
    if(tod.length>0){var h=divs.find(function(d){return /HOY/i.test(d.textContent);})||Object.assign(document.createElement("div"),{className:"sp36-div",textContent:"HOY"});list.insertBefore(h,tod[0]);}
    if(old.length>0){var a=divs.find(function(d){return /ANTERIOR|AYER/i.test(d.textContent);})||Object.assign(document.createElement("div"),{className:"sp36-div",textContent:"ANTERIORES"});list.insertBefore(a,old[0]);}
  }
  [1500,3000,5000,8000].forEach(function(d){setTimeout(sortChats,d);});
  setInterval(sortChats,6000);
  console.info("[WA-OASIS] Fix 41: chat sort by real time");
})();

/* ═══ FIX 42: Plantillas — anti-flash + refresh dropdown + cleanup old panel ═══ */
(function fix42(){
  if(window.__spFix42) return; window.__spFix42=true;

  /* ─── 1. Patch cargarTplsPagina to clear stale data first + refresh prod dropdown ─── */
  var _fix42Gen=0; /* generation counter — invalidates stale promise callbacks */
  var _orig_cargarTplsPagina = window.cargarTplsPagina;
  window.cargarTplsPagina = function() {
    var gen=++_fix42Gen;
    /* Clear stale data immediately so buildPlantillasHTML shows 0 counts (no flash) */
    if(window._panelTpls) window._panelTpls=[];
    /* Also clear the grid while fetching */
    var grid=document.getElementById('sp-pag-grid');
    if(grid){
      grid.innerHTML='<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#94a3b8;gap:10px;padding:40px;">'+
        '<div style="font-size:28px;">⏳</div>'+
        '<div style="font-size:13px;font-weight:600;color:#64748b;">Cargando plantillas...</div>'+
      '</div>';
    }
    var SB_P=window.SB_P||'https://lvmeswlvszsmvgaasazs.supabase.co';
    var SK_P=window.SK_P;
    if(!SK_P){
      /* fallback if orig function exists */
      if(_orig_cargarTplsPagina) _orig_cargarTplsPagina();
      return;
    }
    var p1=fetch(SB_P+'/rest/v1/oasis_wa_config?select=system_prompt&id=eq.wa_templates&limit=1',{
      headers:{'apikey':SK_P,'Authorization':'Bearer '+SK_P}
    }).then(function(r){return r.json();});
    var p2=fetch(SB_P+'/rest/v1/oasis_wa_config?select=system_prompt&id=eq.wa_products&limit=1',{
      headers:{'apikey':SK_P,'Authorization':'Bearer '+SK_P}
    }).then(function(r){return r.json();});
    Promise.all([p1,p2]).then(function(results){
      if(gen!==_fix42Gen) return; /* stale — newer fetch already in flight */
      var sp=results[0]&&results[0][0]&&results[0][0].system_prompt;
      window._panelTpls=sp?JSON.parse(sp):[];
      var pp=results[1]&&results[1][0]&&results[1][0].system_prompt;
      if(pp) window._panelProducts=JSON.parse(pp);
      /* Rebuild product dropdown list with fresh counts */
      var prodList=document.getElementById('sp-prod-list');
      if(prodList&&window._panelProducts&&window._panelProducts.length){
        var CMAP={jabones:'#e879f9',sebo:'#f97316',cierre:'#22c55e',seguimiento:'#3b82f6'};
        var CUST=['#8b5cf6','#ec4899','#14b8a6','#f59e0b','#6366f1','#ef4444','#06b6d4'];
        window._panelProducts.forEach(function(p,i){if(!CMAP[p.id])CMAP[p.id]=CUST[i%CUST.length];});
        var freshHtml=window._panelProducts.map(function(p){
          var cnt=(window._panelTpls||[]).filter(function(t){return (t.category||t.product||'')===p.id;}).length;
          return '<button onclick="elegirProducto(\''+p.id+'\')" '+
            'style="width:100%;padding:11px 16px;border:none;background:#fff;cursor:pointer;text-align:left;'+
            'font-size:13px;font-weight:600;color:#1e293b;display:flex;align-items:center;justify-content:space-between;transition:background 0.12s;" '+
            'onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'#fff\'">'+
            '<span>'+(p.icon||'📦')+' '+p.name+'</span>'+
            '<span style="font-size:10px;color:#94a3b8;">'+cnt+'</span>'+
            '</button><div style="height:1px;background:#f0f4f8;margin:0 8px;"></div>';
        }).join('');
        freshHtml+='<button onclick="elegirProducto(\'todos\')" style="width:100%;padding:11px 16px;border:none;background:#fff;cursor:pointer;text-align:left;font-size:13px;font-weight:600;color:#00a888;transition:background 0.12s;" onmouseover="this.style.background=\'#f0fffe\'" onmouseout="this.style.background=\'#fff\'">🔎 Todas las plantillas</button>';
        prodList.innerHTML=freshHtml;
      }
      if(typeof window.elegirProducto==='function') window.elegirProducto('todos');
    }).catch(function(){
      if(gen!==_fix42Gen) return;
      var g=document.getElementById('sp-pag-grid');
      if(g) g.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:40px;color:#ef4444;">Error cargando plantillas</div>';
    });
  };

  /* ─── 2. Disable old floating panel (sp-plantillas-panel) to avoid double-panel clash ─── */
  var _origMostrar=window.mostrarPanelPlantillas;
  window.mostrarPanelPlantillas=function(){
    /* If the new panel system is active, just activate Plantillas section instead */
    if(window._enPlantillas&&document.getElementById('sp-plantillas-pagina')) return;
    /* Otherwise redirect to new system by simulating nav click */
    var navItems=document.querySelectorAll('.wbv5-nav-item,[class*="nav-item"],[class*="navItem"]');
    for(var i=0;i<navItems.length;i++){
      if(/plantillas/i.test(navItems[i].textContent)&&!/pro/i.test(navItems[i].textContent)){
        navItems[i].click(); return;
      }
    }
    /* Fallback: open old panel */
    if(_origMostrar) _origMostrar();
  };

  /* ─── 3. Force-refresh on every Plantillas section entry (not just first time) ─── */
  var _origInyectar=window.inyectarPanelPlantillasEnPagina;
  window.inyectarPanelPlantillasEnPagina=function(){
    if(!window._enPlantillas) return;
    var existing=document.getElementById('sp-plantillas-pagina');
    /* If visible but last refresh was >30s ago, force a data refresh */
    if(existing&&existing.offsetParent!==null){
      var now=Date.now();
      if(!existing._spLastLoad||now-existing._spLastLoad>30000){
        existing._spLastLoad=now;
        window.cargarTplsPagina(); /* refresh data silently */
      }
      return;
    }
    /* Call original to build the panel */
    if(_origInyectar) _origInyectar();
    /* Mark load time */
    setTimeout(function(){
      var p=document.getElementById('sp-plantillas-pagina');
      if(p) p._spLastLoad=Date.now();
    },100);
  };

  console.info('[WA-OASIS] Fix 42: Plantillas anti-flash + prod dropdown refresh + old panel cleanup');
})();
