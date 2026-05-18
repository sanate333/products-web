/* Fix 103 v8: Chat panel overhaul + Lead badges
   - Clean list (only SB items, dedup)
   - Robot emoji with green/red IA indicator circle
   - Time to left of robot, date below
   - Lead badge next to name (🆕 Nuevo, 🔥 Potencial, 😊 Cliente, ❌ Perdido)
   - Hides "pausa" / "disparadores pausado" text
   - Options menu (Archivar, Bloquear, Eliminar) on hover
   - Archivados filter integration
   Uses XMLHttpRequest to bypass connection-stabilizer.js */
;(function(){
  'use strict';
  if(window.__spFix103) return;
  window.__spFix103 = true;

  var SB_URL = 'https://lvmeswlvszsmvgaasazs.supabase.co/rest/v1';
  var SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2bWVzd2x2c3pzbXZnYWFzYXpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MjYzMTEsImV4cCI6MjA4NzEwMjMxMX0.pKhuLjRLgpWMBsEUv1WhCytpbUUT6tKj3sacIGit2z4';

  var LEAD_MAP = {
    'nuevo':     {emoji: '\u{1F195}', label: 'Nuevo',     color: '#2196F3'},
    'potencial': {emoji: '\u{1F525}', label: 'Potencial',  color: '#FF9800'},
    'cliente':   {emoji: '\u{1F60A}', label: 'Cliente',    color: '#4CAF50'},
    'perdido':   {emoji: '\u{274C}',  label: 'Perdido',    color: '#F44336'}
  };

  var css = document.createElement('style');
  css.id = 'sp-fix103-css';
  css.textContent = [
    '.wbv5-conv-itm{position:relative!important;}',
    '.wbv5-conv-itm[data-sp103-hide="1"]{display:none!important;}',
    '.wbv5-conv-itm[data-sp103-show="1"]{display:flex!important;}',
    /* Hide pausa/disparadores badges and old IA inline emoji */
    '.wbv5-ci-name .sp50-ia{display:none!important;}',
    '.wbv5-ci-name [class*="pause"]{display:none!important;}',
    '.wbv5-ci-name [class*="trigger"]{display:none!important;}',
    /* Lead badge next to name */
    '.sp103-lead{display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:600;padding:1px 6px;border-radius:10px;margin-left:6px;white-space:nowrap;vertical-align:middle;line-height:1.4;}',
    '.sp103-lead[data-lead="nuevo"]{background:rgba(33,150,243,0.12);color:#1976D2;}',
    '.sp103-lead[data-lead="potencial"]{background:rgba(255,152,0,0.14);color:#E65100;}',
    '.sp103-lead[data-lead="cliente"]{background:rgba(76,175,80,0.14);color:#2E7D32;}',
    '.sp103-lead[data-lead="perdido"]{background:rgba(244,67,54,0.12);color:#C62828;}',
    /* Meta row layout */
    '.wbv5-ci-meta{display:flex!important;flex-direction:column!important;align-items:flex-end!important;justify-content:center!important;gap:2px!important;min-width:90px!important;}',
    '.sp103-meta-row{display:flex!important;align-items:center!important;gap:5px!important;}',
    '.sp103-date{font-size:11px;color:#888;opacity:0.85;white-space:nowrap;}',
    '.sp103-robot-wrap{position:relative;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;font-size:17px;line-height:1;flex-shrink:0;}',
    '.sp103-robot-wrap.ia-on{background:rgba(37,211,102,0.18);box-shadow:0 0 0 2.5px #25d366;}',
    '.sp103-robot-wrap.ia-off{background:rgba(255,59,48,0.15);box-shadow:0 0 0 2.5px #ff3b30;}',
    /* Options button */
    '.sp103-opts{position:absolute;top:4px;right:4px;width:22px;height:22px;display:none;align-items:center;justify-content:center;cursor:pointer;border-radius:50%;background:rgba(255,255,255,0.95);font-size:15px;color:#555;z-index:12;box-shadow:0 1px 3px rgba(0,0,0,0.15);user-select:none;}',
    '.wbv5-conv-itm:hover .sp103-opts{display:flex!important;}',
    '.sp103-opts.sp103-force-show{display:flex!important;}',
    '.sp103-opts:hover{background:#e8e8e8;}',
    /* Dropdown menu */
    '.sp103-menu{position:absolute;top:28px;right:4px;background:#fff;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,0.18);z-index:100;min-width:150px;overflow:hidden;display:none;}',
    '.sp103-menu.open{display:block!important;}',
    '.sp103-menu-item{padding:10px 14px;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:8px;color:#333;white-space:nowrap;user-select:none;}',
    '.sp103-menu-item:hover{background:#f5f5f5;}',
    '.sp103-menu-item.danger{color:#e53935;}',
    '.sp103-menu-item.danger:hover{background:#ffeaea;}',
    '.sp102-btn{display:none!important;}',
    '.sp103-overlay{position:fixed;top:0;left:0;width:100%;height:100%;z-index:50;}'
  ].join('\n');
  document.head.appendChild(css);

  var _sbPhones = null, _sbNames = {}, _sbData = {};
  var _activeFilter = 'todos';
  var _blocked = {};
  try { _blocked = JSON.parse(localStorage.getItem('sp103_blocked') || '{}'); } catch(e){}

  function loadSBChats(cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', SB_URL + '/oasis_wa_chats?select=phone,push_name,last_timestamp,archived,lead_status&order=last_timestamp.desc&limit=500');
    xhr.setRequestHeader('apikey', SB_ANON);
    xhr.setRequestHeader('Authorization', 'Bearer ' + SB_ANON);
    xhr.onload = function() {
      if(xhr.status !== 200) return;
      try {
        var rows = JSON.parse(xhr.responseText);
        if(!Array.isArray(rows)) return;
        _sbPhones = {}; _sbNames = {}; _sbData = {};
        rows.forEach(function(r){
          var p = (r.phone || '').replace(/\D/g, '');
          if(p.length < 7) return;
          _sbPhones[p] = true;
          if(p.length > 10) _sbPhones[p.slice(-10)] = true;
          if(p.length > 9) _sbPhones[p.slice(-9)] = true;
          _sbData[p] = {
            name: r.push_name || '',
            ts: r.last_timestamp || '',
            archived: !!r.archived,
            lead: (r.lead_status || 'nuevo').toLowerCase()
          };
          var nm = (r.push_name || '').trim().toLowerCase();
          if(nm && nm.length > 1) _sbNames[nm] = p;
        });
        if(cb) cb();
      } catch(e) {}
    };
    xhr.send();
  }

  function getItemIdentity(el) {
    var nameEl = el.querySelector('.wbv5-ci-name');
    if(!nameEl) return { phone: '', name: '', key: '' };
    var raw = nameEl.textContent.replace(/⚡[^⚡]*/g, '').replace(/🤖/g, '').replace(/🆕|🔥|😊|❌/g, '').trim();
    var digits = raw.replace(/\D/g, '');
    if(digits.length >= 7) return { phone: digits, name: '', key: 'p:' + digits.slice(-10) };
    var cn = raw.replace(/[^\w\s\+áéíóúñÁÉÍÓÚÑ]/g, '').trim().toLowerCase();
    return { phone: '', name: cn, key: 'n:' + cn };
  }
  function isInSB(id) {
    if(!_sbPhones) return false;
    if(id.phone) { return !!(_sbPhones[id.phone] || (id.phone.length>10 && _sbPhones[id.phone.slice(-10)]) || (id.phone.length>9 && _sbPhones[id.phone.slice(-9)])); }
    return !!(id.name && _sbNames[id.name]);
  }
  function getSBPhone(id) {
    if(id.phone) { if(_sbData[id.phone]) return id.phone; for(var k in _sbData) { if(k.slice(-9)===id.phone.slice(-9)) return k; } }
    if(id.name && _sbNames[id.name]) return _sbNames[id.name];
    return null;
  }
  function getSBInfo(id) { var p = getSBPhone(id); return p ? _sbData[p] : null; }
  function formatDate(s) {
    if(!s) return '';
    var d = new Date(s); if(isNaN(d.getTime())) return '';
    var now = new Date(), today = new Date(now.getFullYear(),now.getMonth(),now.getDate());
    var yest = new Date(today.getTime()-86400000), cd = new Date(d.getFullYear(),d.getMonth(),d.getDate());
    if(cd.getTime()===today.getTime()) return 'Hoy';
    if(cd.getTime()===yest.getTime()) return 'Ayer';
    return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
  }
  function isIAOn(el) { var b = el.querySelector('.sp50-ia'); return b ? b.classList.contains('sp50-ia-on') : true; }

  /* --- Actions --- */
  function archiveChat(p){var x=new XMLHttpRequest();x.open('PATCH',SB_URL+'/oasis_wa_chats?phone=eq.'+p,true);x.setRequestHeader('apikey',SB_ANON);x.setRequestHeader('Authorization','Bearer '+SB_ANON);x.setRequestHeader('Content-Type','application/json');x.send(JSON.stringify({archived:true}));if(_sbData[p])_sbData[p].archived=true;setTimeout(cleanAndDecorate,200);}
  function unarchiveChat(p){var x=new XMLHttpRequest();x.open('PATCH',SB_URL+'/oasis_wa_chats?phone=eq.'+p,true);x.setRequestHeader('apikey',SB_ANON);x.setRequestHeader('Authorization','Bearer '+SB_ANON);x.setRequestHeader('Content-Type','application/json');x.send(JSON.stringify({archived:false}));if(_sbData[p])_sbData[p].archived=false;setTimeout(cleanAndDecorate,200);}
  function blockChat(p){_blocked[p]=true;localStorage.setItem('sp103_blocked',JSON.stringify(_blocked));setTimeout(cleanAndDecorate,200);}
  function unblockChat(p){delete _blocked[p];localStorage.setItem('sp103_blocked',JSON.stringify(_blocked));setTimeout(cleanAndDecorate,200);}
  function deleteChat(p){var x=new XMLHttpRequest();x.open('DELETE',SB_URL+'/oasis_wa_chats?phone=eq.'+p,true);x.setRequestHeader('apikey',SB_ANON);x.setRequestHeader('Authorization','Bearer '+SB_ANON);x.send();delete _sbData[p];delete _sbPhones[p];setTimeout(cleanAndDecorate,200);}

  /* --- Menu system --- */
  var _overlay = null;
  function closeAllMenus() {
    document.querySelectorAll('.sp103-menu.open').forEach(function(m){m.classList.remove('open');});
    document.querySelectorAll('.sp103-opts.sp103-force-show').forEach(function(o){o.classList.remove('sp103-force-show');});
    if(_overlay && _overlay.parentNode) _overlay.parentNode.removeChild(_overlay);
    _overlay = null;
  }

  function openMenu(opts, menu, phone) {
    closeAllMenus();
    menu.innerHTML = '';
    var si = _sbData[phone], ia = si && si.archived, ib = !!_blocked[phone];
    [{t:ia?'📥 Desarchivar':'📦 Archivar',c:'',f:function(){if(ia)unarchiveChat(phone);else archiveChat(phone);}},
     {t:ib?'🔓 Desbloquear':'🚫 Bloquear',c:'',f:function(){if(ib)unblockChat(phone);else blockChat(phone);}},
     {t:'🗑️ Eliminar',c:'danger',f:function(){if(confirm('Eliminar chat de '+(si?si.name:phone)+'?'))deleteChat(phone);}}
    ].forEach(function(item){
      var div = document.createElement('div');
      div.className = 'sp103-menu-item'+(item.c?' '+item.c:'');
      div.textContent = item.t;
      div.onmousedown = function(e){e.stopPropagation();e.preventDefault();};
      div.onclick = function(e){e.stopPropagation();e.preventDefault();closeAllMenus();item.f();};
      menu.appendChild(div);
    });
    menu.classList.add('open');
    opts.classList.add('sp103-force-show');
    _overlay = document.createElement('div');
    _overlay.className = 'sp103-overlay';
    _overlay.onmousedown = function(e){e.stopPropagation();e.preventDefault();};
    _overlay.onclick = function(e){e.stopPropagation();e.preventDefault();closeAllMenus();};
    document.body.appendChild(_overlay);
  }

  function createOptionsBtn(el, phone) {
    if(el.querySelector('.sp103-opts')) return;
    var opts = document.createElement('div');
    opts.className = 'sp103-opts';
    opts.textContent = '⋮';
    opts.title = 'Opciones';
    var menu = document.createElement('div');
    menu.className = 'sp103-menu';
    opts.onmousedown = function(e) {
      e.stopPropagation(); e.preventDefault();
      var wasOpen = menu.classList.contains('open');
      if(wasOpen) { closeAllMenus(); } else { openMenu(opts, menu, phone); }
    };
    opts.onclick = function(e) { e.stopPropagation(); e.preventDefault(); };
    menu.onmousedown = function(e){e.stopPropagation();};
    menu.onclick = function(e){e.stopPropagation();};
    el.appendChild(opts);
    el.appendChild(menu);
  }

  /* --- Strip "pausa" / "disparadores pausado" from name text --- */
  function cleanNameText(el) {
    var nameEl = el.querySelector('.wbv5-ci-name');
    if(!nameEl) return;
    /* Hide any child elements with pause/trigger classes */
    nameEl.querySelectorAll('[class*="pause"],[class*="trigger"],[class*="pausa"]').forEach(function(ch){
      ch.style.display = 'none';
    });
    /* Also strip via CSS data attribute for the ::after approach */
    var spans = nameEl.querySelectorAll('span');
    spans.forEach(function(sp){
      var t = sp.textContent.trim().toLowerCase();
      if(t.indexOf('pausa') !== -1 || t.indexOf('disparador') !== -1 || t.indexOf('pausado') !== -1) {
        sp.style.display = 'none';
      }
    });
  }

  /* --- Lead badge --- */
  function addLeadBadge(el, leadStatus) {
    var lead = LEAD_MAP[leadStatus] || LEAD_MAP['nuevo'];
    var nameEl = el.querySelector('.wbv5-ci-name');
    if(!nameEl) return;
    var existing = el.querySelector('.sp103-lead');
    if(existing) {
      if(existing.getAttribute('data-lead') !== leadStatus) {
        existing.setAttribute('data-lead', leadStatus);
        existing.textContent = lead.emoji + ' ' + lead.label;
      }
      return;
    }
    var badge = document.createElement('span');
    badge.className = 'sp103-lead';
    badge.setAttribute('data-lead', leadStatus);
    badge.textContent = lead.emoji + ' ' + lead.label;
    /* Insert badge after the name element */
    nameEl.parentNode.insertBefore(badge, nameEl.nextSibling);
  }

  /* --- Decorate item --- */
  function decorateItem(el, identity) {
    var sbInfo = getSBInfo(identity), phone = getSBPhone(identity);
    var meta = el.querySelector('.wbv5-ci-meta');
    if(!meta) return;

    /* Clean "pausa" text from name */
    cleanNameText(el);

    /* Add lead badge */
    if(sbInfo) addLeadBadge(el, sbInfo.lead || 'nuevo');

    /* Meta row: time + robot */
    if(!el.querySelector('.sp103-meta-row')) {
      var timeEl = meta.querySelector('.wbv5-ci-time');
      var row = document.createElement('div');
      row.className = 'sp103-meta-row';
      if(timeEl){timeEl.style.fontSize='11px';timeEl.style.color='#667781';row.appendChild(timeEl);}
      var rw = document.createElement('div');
      rw.className = 'sp103-robot-wrap '+(isIAOn(el)?'ia-on':'ia-off');
      rw.textContent = '\u{1F916}';
      rw.title = isIAOn(el) ? 'IA Activa' : 'IA Inactiva';
      row.appendChild(rw);
      meta.insertBefore(row, meta.firstChild);
    } else {
      var rw = el.querySelector('.sp103-robot-wrap');
      if(rw){var on=isIAOn(el);rw.className='sp103-robot-wrap '+(on?'ia-on':'ia-off');rw.title=on?'IA Activa':'IA Inactiva';}
    }

    /* Date badge */
    if(sbInfo && sbInfo.ts) {
      var ds = formatDate(sbInfo.ts), ex = el.querySelector('.sp103-date');
      if(!ex && ds){var d=document.createElement('span');d.className='sp103-date';d.textContent=ds;meta.appendChild(d);}
      else if(ex && ds && ex.textContent!==ds){ex.textContent=ds;}
    }

    /* Options button */
    if(phone) createOptionsBtn(el, phone);
  }

  /* --- Filters --- */
  function hookFilters() {
    var c = document.querySelector('.wbv5-il-convs');
    if(!c) return; var p = c.parentElement;
    if(!p || p.getAttribute('data-sp103-fh')==='1') return;
    p.setAttribute('data-sp103-fh','1');
    p.addEventListener('click', function(e) {
      var btn = e.target.closest('[class*="chip"],[class*="filter"],[class*="tag-btn"]');
      if(!btn) return;
      var t = btn.textContent.trim().toLowerCase();
      _activeFilter = (t.indexOf('archivado')!==-1) ? 'archivados' : 'todos';
      setTimeout(cleanAndDecorate, 100);
    }, true);
  }

  /* --- Main loop --- */
  function cleanAndDecorate() {
    if(!_sbPhones) return;
    var c = document.querySelector('.wbv5-il-convs');
    if(!c) return;
    var items = c.querySelectorAll('.wbv5-conv-itm'), seen = {};
    items.forEach(function(el) {
      var id = getItemIdentity(el);
      if(!isInSB(id)){el.setAttribute('data-sp103-hide','1');el.removeAttribute('data-sp103-show');return;}
      if(id.key && seen[id.key]){el.setAttribute('data-sp103-hide','1');el.removeAttribute('data-sp103-show');return;}
      if(id.key) seen[id.key] = true;
      var ph = getSBPhone(id), si = ph?_sbData[ph]:null;
      var ia = si && si.archived, ib = ph && _blocked[ph];
      if(_activeFilter==='archivados'){if(!ia&&!ib){el.setAttribute('data-sp103-hide','1');el.removeAttribute('data-sp103-show');return;}}
      else{if(ia||ib){el.setAttribute('data-sp103-hide','1');el.removeAttribute('data-sp103-show');return;}}
      el.removeAttribute('data-sp103-hide');el.setAttribute('data-sp103-show','1');
      el.classList.remove('sna-duplicate');
      if(el.getAttribute('data-sp-dd')==='1') el.removeAttribute('data-sp-dd');
      el.style.removeProperty('display');
      decorateItem(el, id);
    });
  }

  /* --- Init --- */
  function init() {
    loadSBChats(function(){cleanAndDecorate();hookFilters();setInterval(cleanAndDecorate,2500);});
    setInterval(function(){loadSBChats(cleanAndDecorate);},30000);
  }
  if(document.querySelector('.wbv5-il-convs')){init();}
  else{var _t=0,_w=setInterval(function(){_t++;if(document.querySelector('.wbv5-il-convs')||_t>30){clearInterval(_w);if(document.querySelector('.wbv5-il-convs'))init();}},1000);}
  console.info('[WA-OASIS] Fix 103 v8: Leads + chat overhaul');
})();
