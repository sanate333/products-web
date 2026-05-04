/* WhatsApp Oasis — Chats hotfix v5.0
 * Fix 1-8: heredados de v4.4
 * Fix 9: Filter-bar persistente — inbox mantiene min-width; filtros siempre visibles
 * Fix 10: Anti-flickering — reducir frecuencia de intervalos agresivos (600ms→2s, 1s→3s)
 * Fix 11: White-screen watchdog más tolerante (espera 15 s antes de recargar)
 * Fix 12: iframeGuard solo actúa cuando hay cambio real (evita reflows constantes)
 */
(function(){
  'use strict';
  try {
    if(window.location.pathname.indexOf('/dashboard/whatsapp-bot')!==0) return;
    if(window.__spChatsV5) return;
    window.__spChatsV5 = true;

    /* ── CSS ───────────────────────────────────────────────────────── */
    (function injectCss(){
      if(document.getElementById('waoasis-chats-css-v5')) return;
      var s = document.createElement('style');
      s.id = 'waoasis-chats-css-v5';
      s.textContent = [

        /* Fix 9 — Inbox siempre visible, filtros nunca aplastados */
        '@media (min-width:901px){',
        '  .wbv5-chat-wrap{display:flex!important;flex-direction:row!important;}',
        '  .wbv5-inbox-list{',
        '    min-width:340px!important;max-width:380px!important;',
        '    flex:0 0 360px!important;overflow:hidden!important;',
        '    display:flex!important;flex-direction:column!important;',
        '  }',
        '  .wbv5-chat-win{flex:1 1 0!important;min-width:0!important;}',
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
          var rank = chats.length - i;
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
      if(!muts.some(function(m){ return m.addedNodes.length > 0; })) return;
      clearTimeout(_sortTimer);
      _sortTimer = setTimeout(function(){ fetchOrder(sortChatList); }, 1200);
    });

    function initObs(){
      var inbox = document.querySelector('.wbv5-inbox-list');
      if(!inbox){ setTimeout(initObs, 900); return; }
      _inboxObs.observe(inbox, {childList:true, subtree:false});
    }

    fetchOrder(sortChatList);
    setTimeout(initObs, 2000);
    setInterval(function(){ fetchOrder(sortChatList); }, 30000);

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
      setTimeout(defineInject, 1000);
      setTimeout(defineInject, 3000);
    })();

  } catch(e){
    console.warn('[WA-OASIS:chats v5]', e);
  }
})();
