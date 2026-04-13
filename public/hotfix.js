/* v10.6-panelfix 1776068993 */
/* hotfix.js v10.6 — sanate.store — autopub panel inside marketing-redes */
/* Image patch loader */if(typeof window!=='undefined'&&window.location.pathname.indexOf('/dashboard')===-1&&window.location.pathname.indexOf('/admin')===-1){var _ips=document.createElement('script');_ips.src='/hotfixes/image-update-patch.js?v=2';document.head.appendChild(_ips);}

/* ═══════════════════════════════════════════════════════════════════════════════
   PART 0: SERVICE WORKER DETECTION & ROUTING
   ═══════════════════════════════════════════════════════════════════════════════ */

if(typeof ServiceWorkerGlobalScope!=='undefined'&&self instanceof ServiceWorkerGlobalScope){
  // ─ SERVICE WORKER MODE ─
  self.addEventListener('install',function(e){self.skipWaiting();});
  self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim());});
  self.addEventListener('fetch',function(e){
    var u=new URL(e.request.url);
    var isHome=(u.pathname==='/'||u.pathname==='/home-serve.php'||u.pathname==='/index.php'||u.pathname==='/index.html');
    var isDash=(u.pathname.indexOf('/dashboard')===0||u.pathname.indexOf('/admin')===0);
    if((isHome||isDash)&&e.request.mode==='navigate'){
      e.respondWith(fetch(e.request).then(function(r){
        return r.text().then(function(html){
          var s='<script src="/hotfix.js?v=2"><\/script>';
          if(html.indexOf('hotfix.js')!==-1)return new Response(html,{status:r.status,headers:{'content-type':'text/html;charset=utf-8'}});
          return new Response(html.replace('</body>',s+'</body>'),
            {status:r.status,headers:{'content-type':'text/html;charset=utf-8'}});
        });
      }).catch(function(){return fetch(e.request);}));
    }
  });
}else if(typeof window!=='undefined'&&(window.location.pathname.indexOf('/dashboard')===0||window.location.pathname.indexOf('/admin')===0)){
  // ─ DASHBOARD MODE ─ (Email Marketing Module)
(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    dashboardPath: '/dashboard',
    emailMarketingPath: '/dashboard/email-marketing',
    storeName: 'sanate.store',
    primaryColor: '#3dc9e8',
    secondaryColor: '#e8c87a',
    darkBg: '#0a1628',
    darkBgSecond: '#0d1f3c',
    localStorage: {
      emailSubscribers: 'sanate_email_sub',
      subscribers: 'sanate_subscribers',
      campaigns: 'sanate_campaigns',
      flows: 'sanate_automation_flows',
      templates: 'sanate_templates'
    }
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  function log(message) {
    console.log(`[EmailMarketing] ${message}`);
  }

  function getAllSubscribers() {
    const emailSub = JSON.parse(localStorage.getItem(CONFIG.localStorage.emailSubscribers) || '[]');
    const subscribers = JSON.parse(localStorage.getItem(CONFIG.localStorage.subscribers) || '[]');
    const allSubs = [...emailSub, ...subscribers];

    // Deduplicate by email
    const seen = new Set();
    return allSubs.filter(sub => {
      const email = (sub.email || '').toLowerCase();
      if (seen.has(email)) return false;
      seen.add(email);
      return true;
    });
  }

  function getCampaigns() {
    return JSON.parse(localStorage.getItem(CONFIG.localStorage.campaigns) || '[]');
  }

  function getFlows() {
    return JSON.parse(localStorage.getItem(CONFIG.localStorage.flows) || JSON.stringify(getDefaultFlows()));
  }

  function getDefaultFlows() {
    return [
      {
        id: 'welcome',
        name: 'Bienvenida',
        trigger: 'Cuando se suscribe un nuevo cliente',
        active: true,
        emailCount: 1,
        type: 'welcome'
      },
      {
        id: 'abandoned_cart',
        name: 'Carrito Abandonado',
        trigger: 'Cuando un cliente abandona el carrito',
        active: false,
        emailCount: 2,
        type: 'abandoned_cart'
      },
      {
        id: 'repurchase',
        name: 'Recompra',
        trigger: 'X días después de la última compra',
        active: false,
        emailCount: 3,
        type: 'repurchase'
      },
      {
        id: 'birthday',
        name: 'Cumpleaños',
        trigger: 'En la fecha de cumpleaños del suscriptor',
        active: false,
        emailCount: 1,
        type: 'birthday'
      }
    ];
  }

  function getTemplates() {
    const defaults = [
      { id: 1, name: 'Promoción Moderna', category: 'Promoción', image: 'promo_1' },
      { id: 2, name: 'Bienvenida Elegante', category: 'Bienvenida', image: 'welcome_1' },
      { id: 3, name: 'Carrito Recordatorio', category: 'Carrito abandonado', image: 'cart_1' },
      { id: 4, name: 'Newsletter Semanal', category: 'Newsletter', image: 'news_1' },
      { id: 5, name: 'Flash Sale', category: 'Promoción', image: 'promo_2' },
      { id: 6, name: 'Welcome Minimal', category: 'Bienvenida', image: 'welcome_2' },
      { id: 7, name: 'Carrito Premium', category: 'Carrito abandonado', image: 'cart_2' },
      { id: 8, name: 'Newsletter Creative', category: 'Newsletter', image: 'news_2' }
    ];
    return JSON.parse(localStorage.getItem(CONFIG.localStorage.templates) || JSON.stringify(defaults));
  }

  function formatDate(date) {
    if (typeof date === 'string') date = new Date(date);
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  }

  function getDaysAgo(date) {
    const now = new Date();
    const past = new Date(date);
    return Math.floor((now - past) / (1000 * 60 * 60 * 24));
  }

  function getSubscriberStats() {
    const allSubs = getAllSubscribers();
    const activeCount = allSubs.filter(s => s.estado !== 'inactivo').length;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newCount = allSubs.filter(s => {
      const subDate = new Date(s.fecha_registro || s.createdAt);
      return subDate >= sevenDaysAgo;
    }).length;

    return {
      total: allSubs.length,
      active: activeCount,
      new: newCount
    };
  }

  function exportToCSV(data, filename) {
    const headers = Object.keys(data[0] || {});
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const val = row[h];
        const quoted = String(val).includes(',') ? `"${val}"` : val;
        return quoted;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ============================================
  // DOM CREATION HELPERS
  // ============================================

  function createEl(tag, className = '', innerHTML = '') {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (innerHTML) el.innerHTML = innerHTML;
    return el;
  }

  function createStatsCard(label, value, icon) {
    const card = createEl('div', 'email-stats-card');
    card.innerHTML = `
      <div class="email-stats-card-content">
        <div class="email-stats-value">${value}</div>
        <div class="email-stats-label">${label}</div>
      </div>
      <div class="email-stats-icon">
        <i class="fa ${icon}"></i>
      </div>
    `;
    return card;
  }

  function createTemplateCard(template) {
    const card = createEl('div', 'email-template-card');
    const colors = {
      'promo_1': ['#3dc9e8', '#e8c87a'],
      'promo_2': ['#e8c87a', '#3dc9e8'],
      'welcome_1': ['#c83dc9', '#3dc9e8'],
      'welcome_2': ['#3dc9e8', '#c83dc9'],
      'cart_1': ['#e8c87a', '#c83dc9'],
      'cart_2': ['#3dc9e8', '#e8c87a'],
      'news_1': ['#c83dc9', '#e8c87a'],
      'news_2': ['#e8c87a', '#3dc9e8']
    };
    const [color1, color2] = colors[template.image] || [CONFIG.primaryColor, CONFIG.secondaryColor];

    card.innerHTML = `
      <div class="email-template-preview" style="background: linear-gradient(135deg, ${color1}, ${color2});">
        <div class="email-template-overlay">
          <i class="fa fa-envelope"></i>
        </div>
      </div>
      <div class="email-template-info">
        <div class="email-template-name">${template.name}</div>
        <div class="email-template-category">${template.category}</div>
        <button class="email-btn email-btn-primary email-btn-sm" onclick="window.emailMarketing.selectTemplate(${template.id})">
          Usar
        </button>
      </div>
    `;
    return card;
  }

  function createFlowCard(flow) {
    const card = createEl('div', 'email-flow-card');
    const statusClass = flow.active ? 'active' : 'inactive';

    card.innerHTML = `
      <div class="email-flow-header">
        <div>
          <h3 class="email-flow-name">${flow.name}</h3>
          <p class="email-flow-trigger">${flow.trigger}</p>
        </div>
        <div class="email-flow-toggle">
          <label class="email-toggle">
            <input type="checkbox" ${flow.active ? 'checked' : ''} onchange="window.emailMarketing.toggleFlow('${flow.id}', this.checked)">
            <span class="email-toggle-slider"></span>
          </label>
        </div>
      </div>
      <div class="email-flow-footer">
        <span class="email-flow-status ${statusClass}">${flow.active ? 'Activo' : 'Inactivo'}</span>
        <span class="email-flow-count"><i class="fa fa-envelope"></i> ${flow.emailCount} correos</span>
      </div>
    `;
    return card;
  }

  // ============================================
  // TAB CONTENT BUILDERS
  // ============================================

  function buildSubscribersTab() {
    const stats = getSubscriberStats();
    const subscribers = getAllSubscribers();

    const container = createEl('div', 'email-tab-content');
    container.innerHTML = `
      <div class="email-section">
        <h2 class="email-section-title">Estadísticas de Suscriptores</h2>
        <div class="email-stats-grid">
          ${createEl('div', '', createStatsCard('Total Suscriptores', stats.total, 'fa-users').outerHTML).innerHTML}
          ${createEl('div', '', createStatsCard('Suscriptores Activos', stats.active, 'fa-check-circle').outerHTML).innerHTML}
          ${createEl('div', '', createStatsCard('Nuevos (7 días)', stats.new, 'fa-star').outerHTML).innerHTML}
        </div>
      </div>

      <div class="email-section">
        <div class="email-section-header">
          <h2 class="email-section-title">Gestionar Suscriptores</h2>
          <div class="email-section-actions">
            <button class="email-btn email-btn-secondary" onclick="window.emailMarketing.showAddSubscriber()">
              <i class="fa fa-plus"></i> Agregar Suscriptor
            </button>
            <button class="email-btn email-btn-outline" onclick="window.emailMarketing.exportSubscribers()">
              <i class="fa fa-download"></i> Exportar CSV
            </button>
          </div>
        </div>

        <div class="email-table-wrapper">
          <table class="email-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Fecha Registro</th>
                <th>Origen</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${subscribers.map(sub => `
                <tr>
                  <td class="email-cell-email">${sub.email}</td>
                  <td>${formatDate(sub.fecha_registro || sub.createdAt || new Date())}</td>
                  <td>
                    <span class="email-badge email-badge-origin">
                      ${sub.origen === 'popup' ? '🔔 Popup' : '📝 Manual'}
                    </span>
                  </td>
                  <td>
                    <span class="email-badge ${sub.estado === 'activo' ? 'email-badge-active' : 'email-badge-inactive'}">
                      ${sub.estado === 'activo' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button class="email-btn email-btn-sm email-btn-danger" onclick="window.emailMarketing.removeSubscriber('${sub.email}')">
                      <i class="fa fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${subscribers.length === 0 ? '<div class="email-empty-state"><i class="fa fa-inbox"></i> No hay suscriptores aún</div>' : ''}
        </div>
      </div>
    `;

    const statsContainer = container.querySelector('.email-stats-grid');
    if (statsContainer) {
      const cards = [
        createStatsCard('Total Suscriptores', stats.total, 'fa-users'),
        createStatsCard('Suscriptores Activos', stats.active, 'fa-check-circle'),
        createStatsCard('Nuevos (7 días)', stats.new, 'fa-star')
      ];
      statsContainer.innerHTML = '';
      cards.forEach(card => statsContainer.appendChild(card));
    }

    return container;
  }

  function buildCampaignsTab() {
    const campaigns = getCampaigns();
    const container = createEl('div', 'email-tab-content');

    container.innerHTML = `
      <div class="email-section">
        <div class="email-section-header">
          <h2 class="email-section-title">Mis Campañas</h2>
          <button class="email-btn email-btn-secondary" onclick="window.emailMarketing.showCreateCampaign()">
            <i class="fa fa-plus"></i> Nueva Campaña
          </button>
        </div>

        ${campaigns.length === 0 ? `
          <div class="email-empty-state">
            <i class="fa fa-envelope"></i>
            <p>No tienes campañas creadas aún</p>
            <button class="email-btn email-btn-primary" onclick="window.emailMarketing.showCreateCampaign()">
              Crear Primera Campaña
            </button>
          </div>
        ` : `
          <div class="email-campaigns-list">
            ${campaigns.map(campaign => `
              <div class="email-campaign-item">
                <div class="email-campaign-content">
                  <h3 class="email-campaign-subject">${campaign.subject}</h3>
                  <p class="email-campaign-preview">${campaign.previewText || 'Sin texto de vista previa'}</p>
                  <div class="email-campaign-meta">
                    <span><i class="fa fa-calendar"></i> ${formatDate(campaign.createdAt)}</span>
                    <span><i class="fa fa-users"></i> ${campaign.recipients?.length || 0} destinatarios</span>
                  </div>
                </div>
                <div class="email-campaign-status">
                  <span class="email-badge email-badge-${campaign.status}">
                    ${campaign.status === 'Borrador' ? '📝 Borrador' : campaign.status === 'Programada' ? '⏰ Programada' : '✅ Enviada'}
                  </span>
                </div>
                <div class="email-campaign-actions">
                  ${campaign.status === 'Borrador' ? `
                    <button class="email-btn email-btn-sm email-btn-primary" onclick="window.emailMarketing.editCampaign(${JSON.stringify(campaign).replace(/"/g, '&quot;')})">
                      Editar
                    </button>
                    <button class="email-btn email-btn-sm email-btn-danger" onclick="window.emailMarketing.deleteCampaign('${campaign.id}')">
                      Eliminar
                    </button>
                  ` : `
                    <button class="email-btn email-btn-sm email-btn-outline" onclick="window.emailMarketing.viewCampaignStats('${campaign.id}')">
                      Ver Estadísticas
                    </button>
                  `}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;

    return container;
  }

  function buildFlowsTab() {
    const flows = getFlows();
    const container = createEl('div', 'email-tab-content');

    container.innerHTML = `
      <div class="email-section">
        <h2 class="email-section-title">Automatizaciones</h2>
        <p class="email-section-subtitle">Crea flujos de correo automáticos basados en acciones de tus clientes</p>
        <div class="email-flows-grid">
          ${flows.map(flow => createFlowCard(flow).outerHTML).join('')}
        </div>
      </div>
    `;

    const grid = container.querySelector('.email-flows-grid');
    if (grid) {
      grid.innerHTML = '';
      flows.forEach(flow => grid.appendChild(createFlowCard(flow)));
    }

    return container;
  }

  function buildTemplatesTab() {
    const templates = getTemplates();
    const categories = [...new Set(templates.map(t => t.category))];
    const container = createEl('div', 'email-tab-content');

    container.innerHTML = `
      <div class="email-section">
        <h2 class="email-section-title">Plantillas de Email</h2>
        <p class="email-section-subtitle">Elige una plantilla profesional para comenzar tu campaña</p>
      </div>

      ${categories.map(category => `
        <div class="email-section">
          <h3 class="email-subsection-title">${category}</h3>
          <div class="email-templates-grid">
            ${templates.filter(t => t.category === category).map(t => createTemplateCard(t).outerHTML).join('')}
          </div>
        </div>
      `).join('')}
    `;

    return container;
  }

  // ============================================
  // MODAL & INTERACTION HANDLERS
  // ============================================

  function createModal(title, content, actions = []) {
    const modal = createEl('div', 'email-modal-overlay');
    modal.innerHTML = `
      <div class="email-modal">
        <div class="email-modal-header">
          <h2>${title}</h2>
          <button class="email-modal-close" onclick="this.closest('.email-modal-overlay').remove()">
            <i class="fa fa-times"></i>
          </button>
        </div>
        <div class="email-modal-content">
          ${content}
        </div>
        ${actions.length > 0 ? `
          <div class="email-modal-footer">
            ${actions.map(action => `
              <button class="email-btn ${action.className || 'email-btn-secondary'}" onclick="${action.onclick}">
                ${action.label}
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    return modal;
  }

  function showAddSubscriberModal() {
    const content = `
      <div class="email-form-group">
        <label class="email-form-label">Email</label>
        <input type="email" id="emailInput" class="email-form-input" placeholder="usuario@ejemplo.com">
      </div>
      <div class="email-form-group">
        <label class="email-form-label">Origen</label>
        <select id="originInput" class="email-form-input">
          <option value="manual">Manual</option>
          <option value="popup">Popup</option>
        </select>
      </div>
    `;

    const modal = createModal('Agregar Suscriptor', content, [
      {
        label: 'Cancelar',
        className: 'email-btn-secondary',
        onclick: 'this.closest(".email-modal-overlay").remove()'
      },
      {
        label: 'Agregar',
        className: 'email-btn-primary',
        onclick: 'window.emailMarketing.addSubscriber()'
      }
    ]);

    document.body.appendChild(modal);

    // Focus on input
    setTimeout(() => {
      const input = document.getElementById('emailInput');
      if (input) input.focus();
    }, 100);
  }

  // ============================================
  // MAIN MODULE API
  // ============================================

  const EmailMarketing = {
    currentTab: 'subscribers',
    mainContentArea: null,

    init() {
      log('Initializing Email Marketing Module');

      if (!this.isOnDashboard()) {
        log('Not on dashboard, skipping initialization');
        return;
      }

      // Wait for dashboard to be ready
      this.waitForDashboard();
    },

    isOnDashboard() {
      return location.pathname.startsWith(CONFIG.dashboardPath);
    },

    isOnEmailMarketing() {
      return location.pathname === CONFIG.emailMarketingPath;
    },

    waitForDashboard() {
      const checkDashboard = setInterval(() => {
        const navSection = document.querySelector('div.nav-section-label');

        if (navSection) {
          clearInterval(checkDashboard);
          this.setupSidebar();
          this.setupContentArea();
          log('Dashboard ready');
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => clearInterval(checkDashboard), 10000);
    },

    setupSidebar() {
      // Find MARKETING section
      const navSections = document.querySelectorAll('div.nav-section-label');
      let marketingSection = null;

      for (let section of navSections) {
        if (section.textContent.includes('MARKETING')) {
          marketingSection = section;
          break;
        }
      }

      if (!marketingSection) {
        log('MARKETING section not found in sidebar');
        return;
      }

      // Find the container holding nav links for this section
      let linksContainer = marketingSection.closest('.nav-section, [class*="section"]');
      if (!linksContainer) {
        linksContainer = marketingSection.parentElement;
      }

      // Look for Chat IA link to insert after
      const allLinks = document.querySelectorAll('a, [role="link"], button');
      let insertAfter = null;

      for (let link of allLinks) {
        if (link.textContent.includes('Chat IA') || link.textContent.includes('IA')) {
          insertAfter = link;
          break;
        }
      }

      // Create Email Marketing link
      const emailLink = createEl('a', 'email-marketing-nav-link', `
        <i class="fa fa-envelope"></i>
        <span>Email Marketing</span>
      `);
      emailLink.href = CONFIG.emailMarketingPath;
      emailLink.onclick = (e) => {
        e.preventDefault();
        window.history.pushState({}, '', CONFIG.emailMarketingPath);
        this.showDashboard();
      };

      // Get existing link styling to match
      const existingLink = linksContainer.querySelector('a, [role="link"]');
      if (existingLink && existingLink.className) {
        const baseClass = existingLink.className.split(' ')[0];
        emailLink.className = `${baseClass} ${emailLink.className}`;
      }

      if (insertAfter && insertAfter.parentElement) {
        insertAfter.parentElement.insertAdjacentElement('afterend', emailLink);
      } else if (linksContainer) {
        linksContainer.appendChild(emailLink);
      }

      log('Email Marketing link added to sidebar');
    },

    setupContentArea() {
      // Watch for route changes
      window.addEventListener('popstate', () => {
        if (this.isOnEmailMarketing()) {
          this.showDashboard();
        }
      });

      // Check if already on email-marketing route
      if (this.isOnEmailMarketing()) {
        this.showDashboard();
      }
    },

    showDashboard() {
      const container = document.querySelector('div.containerGrid > div:nth-child(2)') ||
                       document.querySelector('main') ||
                       document.querySelector('[class*="content"]');

      if (!container) {
        log('Main content area not found');
        return;
      }

      this.mainContentArea = container;
      container.innerHTML = '';

      // Create dashboard structure
      const dashboard = createEl('div', 'email-marketing-dashboard');
      dashboard.innerHTML = `
        <div class="email-header">
          <div class="email-header-content">
            <h1 class="email-header-title">Email Marketing</h1>
            <p class="email-header-subtitle">Gestiona campañas, suscriptores y automatizaciones</p>
          </div>
        </div>

        <div class="email-tabs">
          <button class="email-tab-btn email-tab-active" data-tab="subscribers">
            <i class="fa fa-users"></i> Suscriptores
          </button>
          <button class="email-tab-btn" data-tab="campaigns">
            <i class="fa fa-envelope"></i> Campañas
          </button>
          <button class="email-tab-btn" data-tab="flows">
            <i class="fa fa-random"></i> Automatizaciones
          </button>
          <button class="email-tab-btn" data-tab="templates">
            <i class="fa fa-paint-brush"></i> Plantillas
          </button>
        </div>

        <div class="email-content"></div>
      `;

      container.appendChild(dashboard);

      // Setup tab functionality
      const tabButtons = dashboard.querySelectorAll('.email-tab-btn');
      const contentArea = dashboard.querySelector('.email-content');

      tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const tab = btn.dataset.tab;
          this.switchTab(tab, tabButtons, contentArea);
        });
      });

      // Load initial tab
      this.switchTab('subscribers', tabButtons, contentArea);
      log('Dashboard rendered');
    },

    switchTab(tabName, buttons, contentArea) {
      this.currentTab = tabName;

      // Update button states
      buttons.forEach(btn => {
        if (btn.dataset.tab === tabName) {
          btn.classList.add('email-tab-active');
        } else {
          btn.classList.remove('email-tab-active');
        }
      });

      // Load content
      let content;
      switch (tabName) {
        case 'subscribers':
          content = buildSubscribersTab();
          break;
        case 'campaigns':
          content = buildCampaignsTab();
          break;
        case 'flows':
          content = buildFlowsTab();
          break;
        case 'templates':
          content = buildTemplatesTab();
          break;
        default:
          content = createEl('div');
      }

      contentArea.innerHTML = '';
      contentArea.appendChild(content);
      log(`Switched to ${tabName} tab`);
    },

    // Subscriber actions
    showAddSubscriber() {
      showAddSubscriberModal();
    },

    addSubscriber() {
      const email = document.getElementById('emailInput')?.value;
      const origin = document.getElementById('originInput')?.value || 'manual';

      if (!email || !email.includes('@')) {
        alert('Por favor ingresa un email válido');
        return;
      }

      const subscribers = JSON.parse(localStorage.getItem(CONFIG.localStorage.subscribers) || '[]');
      subscribers.push({
        email,
        origen: origin,
        estado: 'activo',
        fecha_registro: new Date().toISOString()
      });

      localStorage.setItem(CONFIG.localStorage.subscribers, JSON.stringify(subscribers));
      document.querySelector('.email-modal-overlay')?.remove();

      // Refresh current tab
      this.switchTab(this.currentTab,
        document.querySelectorAll('.email-tab-btn'),
        document.querySelector('.email-content')
      );

      log(`Subscriber added: ${email}`);
    },

    removeSubscriber(email) {
      if (!confirm(`¿Eliminar ${email}?`)) return;

      const subscribers = JSON.parse(localStorage.getItem(CONFIG.localStorage.subscribers) || '[]');
      const filtered = subscribers.filter(s => s.email !== email);
      localStorage.setItem(CONFIG.localStorage.subscribers, JSON.stringify(filtered));

      this.switchTab(this.currentTab,
        document.querySelectorAll('.email-tab-btn'),
        document.querySelector('.email-content')
      );

      log(`Subscriber removed: ${email}`);
    },

    exportSubscribers() {
      const subscribers = getAllSubscribers();
      const data = subscribers.map(s => ({
        Email: s.email,
        'Fecha Registro': formatDate(s.fecha_registro || s.createdAt || new Date()),
        Origen: s.origen === 'popup' ? 'Popup' : 'Manual',
        Estado: s.estado || 'activo'
      }));

      exportToCSV(data, `suscriptores-${new Date().toISOString().split('T')[0]}.csv`);
      log('Subscribers exported to CSV');
    },

    // Campaign actions
    showCreateCampaign() {
      alert('Editor de campañas: Esta funcionalidad está disponible próximamente');
    },

    editCampaign(campaign) {
      alert('Editando campaña: ' + campaign.subject);
    },

    deleteCampaign(id) {
      if (!confirm('¿Eliminar esta campaña?')) return;

      const campaigns = getCampaigns().filter(c => c.id !== id);
      localStorage.setItem(CONFIG.localStorage.campaigns, JSON.stringify(campaigns));

      this.switchTab('campaigns',
        document.querySelectorAll('.email-tab-btn'),
        document.querySelector('.email-content')
      );
    },

    viewCampaignStats(id) {
      alert('Estadísticas de campaña: Esta funcionalidad está disponible próximamente');
    },

    // Flow actions
    toggleFlow(flowId, enabled) {
      const flows = getFlows();
      const flow = flows.find(f => f.id === flowId);

      if (flow) {
        flow.active = enabled;
        localStorage.setItem(CONFIG.localStorage.flows, JSON.stringify(flows));
        log(`Flow ${flowId} toggled: ${enabled}`);
      }
    },

    // Template actions
    selectTemplate(templateId) {
      const templates = getTemplates();
      const template = templates.find(t => t.id === templateId);

      if (template) {
        alert(`Plantilla seleccionada: ${template.name}\n\nEditor de campaña: disponible próximamente`);
        log(`Template selected: ${template.name}`);
      }
    }
  };

  // ============================================
  // STYLES INJECTION
  // ============================================

  function injectStyles() {
    if (document.getElementById('email-marketing-styles')) {
      return; // Already injected
    }

    const style = document.createElement('style');
    style.id = 'email-marketing-styles';
    style.textContent = `
      /* Navigation Link */
      .email-marketing-nav-link {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        color: #8899aa;
        text-decoration: none;
        border-radius: 8px;
        transition: all 0.3s ease;
        font-size: 14px;
        font-weight: 500;
      }

      .email-marketing-nav-link:hover {
        color: ${CONFIG.primaryColor};
        background-color: rgba(61, 201, 232, 0.1);
      }

      .email-marketing-nav-link i {
        font-size: 16px;
        width: 20px;
        text-align: center;
      }

      /* Dashboard Container */
      .email-marketing-dashboard {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 24px;
        padding: 24px;
        background: ${CONFIG.darkBg};
        border-radius: 16px;
        overflow-y: auto;
      }

      /* Header */
      .email-header {
        background: linear-gradient(135deg, rgba(61, 201, 232, 0.1), rgba(232, 200, 122, 0.1));
        border: 1px solid rgba(61, 201, 232, 0.2);
        border-radius: 12px;
        padding: 24px;
      }

      .email-header-title {
        font-size: 28px;
        font-weight: 700;
        color: #ffffff;
        margin: 0 0 8px 0;
      }

      .email-header-subtitle {
        font-size: 14px;
        color: #8899aa;
        margin: 0;
      }

      /* Tabs */
      .email-tabs {
        display: flex;
        gap: 12px;
        border-bottom: 1px solid rgba(61, 201, 232, 0.1);
        padding-bottom: 0;
        overflow-x: auto;
      }

      .email-tab-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: none;
        border: none;
        color: #8899aa;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        border-bottom: 3px solid transparent;
        transition: all 0.3s ease;
        white-space: nowrap;
      }

      .email-tab-btn:hover {
        color: ${CONFIG.primaryColor};
      }

      .email-tab-btn.email-tab-active {
        color: ${CONFIG.primaryColor};
        border-bottom-color: ${CONFIG.primaryColor};
      }

      .email-tab-btn i {
        font-size: 16px;
      }

      /* Content */
      .email-content {
        flex: 1;
      }

      .email-tab-content {
        display: flex;
        flex-direction: column;
        gap: 32px;
      }

      /* Sections */
      .email-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .email-section-title {
        font-size: 18px;
        font-weight: 700;
        color: #ffffff;
        margin: 0;
      }

      .email-section-subtitle {
        font-size: 14px;
        color: #8899aa;
        margin: 0;
      }

      .email-subsection-title {
        font-size: 14px;
        font-weight: 600;
        color: #8899aa;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin: 0;
      }

      .email-section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
      }

      .email-section-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      /* Stats */
      .email-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
      }

      .email-stats-card {
        background: linear-gradient(135deg, rgba(61, 201, 232, 0.1), rgba(61, 201, 232, 0.05));
        border: 1px solid rgba(61, 201, 232, 0.2);
        border-radius: 12px;
        padding: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: all 0.3s ease;
      }

      .email-stats-card:hover {
        border-color: ${CONFIG.primaryColor};
        background: linear-gradient(135deg, rgba(61, 201, 232, 0.15), rgba(61, 201, 232, 0.08));
      }

      .email-stats-card-content {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .email-stats-value {
        font-size: 28px;
        font-weight: 700;
        color: ${CONFIG.primaryColor};
      }

      .email-stats-label {
        font-size: 12px;
        color: #8899aa;
        font-weight: 600;
      }

      .email-stats-icon {
        font-size: 32px;
        color: ${CONFIG.primaryColor};
        opacity: 0.3;
      }

      /* Table */
      .email-table-wrapper {
        background: rgba(13, 31, 60, 0.5);
        border: 1px solid rgba(61, 201, 232, 0.1);
        border-radius: 8px;
        overflow: hidden;
      }

      .email-table {
        width: 100%;
        border-collapse: collapse;
      }

      .email-table thead {
        background: rgba(61, 201, 232, 0.05);
        border-bottom: 1px solid rgba(61, 201, 232, 0.1);
      }

      .email-table th {
        padding: 12px 16px;
        text-align: left;
        font-size: 12px;
        font-weight: 600;
        color: #8899aa;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .email-table td {
        padding: 14px 16px;
        border-bottom: 1px solid rgba(61, 201, 232, 0.05);
        font-size: 14px;
        color: #b8c5d6;
      }

      .email-table tbody tr:hover {
        background: rgba(61, 201, 232, 0.05);
      }

      .email-cell-email {
        color: ${CONFIG.primaryColor};
        font-weight: 500;
      }

      /* Badges */
      .email-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
      }

      .email-badge-origin {
        background: rgba(232, 200, 122, 0.2);
        color: ${CONFIG.secondaryColor};
        border: 1px solid rgba(232, 200, 122, 0.3);
      }

      .email-badge-active {
        background: rgba(76, 175, 80, 0.2);
        color: #4caf50;
        border: 1px solid rgba(76, 175, 80, 0.3);
      }

      .email-badge-inactive {
        background: rgba(244, 67, 54, 0.2);
        color: #f44336;
        border: 1px solid rgba(244, 67, 54, 0.3);
      }

      .email-badge-Borrador {
        background: rgba(33, 150, 243, 0.2);
        color: #2196f3;
        border: 1px solid rgba(33, 150, 243, 0.3);
      }

      .email-badge-Programada {
        background: rgba(255, 152, 0, 0.2);
        color: #ff9800;
        border: 1px solid rgba(255, 152, 0, 0.3);
      }

      .email-badge-Enviada {
        background: rgba(76, 175, 80, 0.2);
        color: #4caf50;
        border: 1px solid rgba(76, 175, 80, 0.3);
      }

      /* Buttons */
      .email-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        text-decoration: none;
        white-space: nowrap;
      }

      .email-btn i {
        font-size: 14px;
      }

      .email-btn-primary {
        background: ${CONFIG.primaryColor};
        color: #ffffff;
      }

      .email-btn-primary:hover {
        background: #2ab0d8;
        box-shadow: 0 8px 24px rgba(61, 201, 232, 0.3);
      }

      .email-btn-secondary {
        background: ${CONFIG.secondaryColor};
        color: #0a1628;
      }

      .email-btn-secondary:hover {
        background: #f0d460;
        box-shadow: 0 8px 24px rgba(232, 200, 122, 0.3);
      }

      .email-btn-outline {
        background: transparent;
        color: ${CONFIG.primaryColor};
        border: 1px solid ${CONFIG.primaryColor};
      }

      .email-btn-outline:hover {
        background: rgba(61, 201, 232, 0.1);
      }

      .email-btn-danger {
        background: rgba(244, 67, 54, 0.2);
        color: #f44336;
        border: 1px solid rgba(244, 67, 54, 0.3);
      }

      .email-btn-danger:hover {
        background: rgba(244, 67, 54, 0.3);
      }

      .email-btn-sm {
        padding: 6px 12px;
        font-size: 12px;
      }

      /* Campaigns */
      .email-campaigns-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .email-campaign-item {
        background: rgba(13, 31, 60, 0.5);
        border: 1px solid rgba(61, 201, 232, 0.1);
        border-radius: 12px;
        padding: 16px;
        display: grid;
        grid-template-columns: 1fr auto auto;
        gap: 16px;
        align-items: start;
        transition: all 0.3s ease;
      }

      .email-campaign-item:hover {
        border-color: ${CONFIG.primaryColor};
        background: rgba(13, 31, 60, 0.8);
      }

      .email-campaign-subject {
        font-size: 16px;
        font-weight: 600;
        color: #ffffff;
        margin: 0 0 8px 0;
      }

      .email-campaign-preview {
        font-size: 14px;
        color: #8899aa;
        margin: 0 0 12px 0;
        line-height: 1.4;
      }

      .email-campaign-meta {
        display: flex;
        gap: 16px;
        font-size: 12px;
        color: #6b7c8f;
      }

      .email-campaign-meta span {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .email-campaign-status {
        text-align: right;
      }

      .email-campaign-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      /* Flows */
      .email-flows-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 16px;
      }

      .email-flow-card {
        background: linear-gradient(135deg, rgba(61, 201, 232, 0.05), rgba(232, 200, 122, 0.05));
        border: 1px solid rgba(61, 201, 232, 0.2);
        border-radius: 12px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        transition: all 0.3s ease;
      }

      .email-flow-card:hover {
        border-color: ${CONFIG.primaryColor};
        background: linear-gradient(135deg, rgba(61, 201, 232, 0.1), rgba(232, 200, 122, 0.08));
      }

      .email-flow-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
      }

      .email-flow-name {
        font-size: 16px;
        font-weight: 700;
        color: #ffffff;
        margin: 0 0 8px 0;
      }

      .email-flow-trigger {
        font-size: 13px;
        color: #8899aa;
        margin: 0;
        line-height: 1.4;
      }

      .email-flow-toggle {
        flex-shrink: 0;
      }

      .email-flow-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 12px;
        border-top: 1px solid rgba(61, 201, 232, 0.1);
      }

      .email-flow-status {
        font-size: 12px;
        font-weight: 600;
      }

      .email-flow-status.active {
        color: #4caf50;
      }

      .email-flow-status.inactive {
        color: #8899aa;
      }

      .email-flow-count {
        font-size: 12px;
        color: #8899aa;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      /* Toggle Switch */
      .email-toggle {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
      }

      .email-toggle input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .email-toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(61, 201, 232, 0.2);
        transition: 0.3s;
        border-radius: 24px;
        border: 1px solid rgba(61, 201, 232, 0.3);
      }

      .email-toggle-slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: ${CONFIG.primaryColor};
        transition: 0.3s;
        border-radius: 50%;
      }

      .email-toggle input:checked + .email-toggle-slider {
        background-color: rgba(61, 201, 232, 0.3);
      }

      .email-toggle input:checked + .email-toggle-slider:before {
        transform: translateX(20px);
      }

      /* Templates Grid */
      .email-templates-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 16px;
      }

      .email-template-card {
        background: rgba(13, 31, 60, 0.5);
        border: 1px solid rgba(61, 201, 232, 0.1);
        border-radius: 12px;
        overflow: hidden;
        transition: all 0.3s ease;
        cursor: pointer;
      }

      .email-template-card:hover {
        border-color: ${CONFIG.primaryColor};
        transform: translateY(-4px);
      }

      .email-template-preview {
        width: 100%;
        aspect-ratio: 2/3;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
      }

      .email-template-overlay {
        font-size: 32px;
        color: rgba(255, 255, 255, 0.3);
        transition: all 0.3s ease;
      }

      .email-template-card:hover .email-template-overlay {
        color: rgba(255, 255, 255, 0.6);
        transform: scale(1.2);
      }

      .email-template-info {
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .email-template-name {
        font-size: 13px;
        font-weight: 600;
        color: #ffffff;
      }

      .email-template-category {
        font-size: 11px;
        color: #8899aa;
      }

      /* Modal */
      .email-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: emailFadeIn 0.3s ease;
      }

      @keyframes emailFadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      .email-modal {
        background: ${CONFIG.darkBgSecond};
        border: 1px solid rgba(61, 201, 232, 0.2);
        border-radius: 16px;
        width: 90%;
        max-width: 500px;
        max-height: 90vh;
        overflow-y: auto;
        animation: emailSlideIn 0.3s ease;
      }

      @keyframes emailSlideIn {
        from {
          transform: translateY(-20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      .email-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid rgba(61, 201, 232, 0.1);
      }

      .email-modal-header h2 {
        font-size: 18px;
        font-weight: 700;
        color: #ffffff;
        margin: 0;
      }

      .email-modal-close {
        background: none;
        border: none;
        color: #8899aa;
        font-size: 20px;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .email-modal-close:hover {
        color: ${CONFIG.primaryColor};
      }

      .email-modal-content {
        padding: 20px;
      }

      .email-modal-footer {
        display: flex;
        gap: 12px;
        padding: 16px 20px;
        border-top: 1px solid rgba(61, 201, 232, 0.1);
        justify-content: flex-end;
      }

      /* Form */
      .email-form-group {
        margin-bottom: 16px;
      }

      .email-form-label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: #b8c5d6;
        margin-bottom: 8px;
      }

      .email-form-input {
        width: 100%;
        padding: 10px 12px;
        background: rgba(10, 22, 40, 0.8);
        border: 1px solid rgba(61, 201, 232, 0.2);
        border-radius: 8px;
        color: #ffffff;
        font-size: 14px;
        transition: all 0.3s ease;
        box-sizing: border-box;
      }

      .email-form-input:focus {
        outline: none;
        border-color: ${CONFIG.primaryColor};
        background: rgba(10, 22, 40, 0.95);
        box-shadow: 0 0 0 3px rgba(61, 201, 232, 0.1);
      }

      .email-form-input::placeholder {
        color: #6b7c8f;
      }

      /* Empty State */
      .email-empty-state {
        text-align: center;
        padding: 60px 20px;
        color: #8899aa;
      }

      .email-empty-state i {
        font-size: 48px;
        color: rgba(61, 201, 232, 0.3);
        display: block;
        margin-bottom: 16px;
      }

      .email-empty-state p {
        font-size: 16px;
        margin-bottom: 20px;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .email-marketing-dashboard {
          padding: 16px;
          gap: 16px;
        }

        .email-tabs {
          flex-wrap: wrap;
        }

        .email-tab-btn {
          padding: 10px 12px;
          font-size: 12px;
        }

        .email-section-header {
          flex-direction: column;
          align-items: flex-start;
        }

        .email-section-actions {
          width: 100%;
        }

        .email-stats-grid {
          grid-template-columns: 1fr;
        }

        .email-campaign-item {
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .email-flows-grid {
          grid-template-columns: 1fr;
        }

        .email-templates-grid {
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        }

        .email-modal {
          width: 95%;
        }

        @media (max-width: 480px) {
          .email-header-title {
            font-size: 22px;
          }

          .email-tab-btn {
            padding: 8px 10px;
            font-size: 11px;
          }

          .email-tabs {
            gap: 8px;
          }

          .email-btn {
            padding: 8px 12px;
            font-size: 12px;
          }
        }
      }

      /* Scrollbar Styling */
      .email-marketing-dashboard::-webkit-scrollbar {
        width: 8px;
      }

      .email-marketing-dashboard::-webkit-scrollbar-track {
        background: transparent;
      }

      .email-marketing-dashboard::-webkit-scrollbar-thumb {
        background: rgba(61, 201, 232, 0.3);
        border-radius: 4px;
      }

      .email-marketing-dashboard::-webkit-scrollbar-thumb:hover {
        background: rgba(61, 201, 232, 0.5);
      }
    `;

    document.head.appendChild(style);
    log('Styles injected');
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function init() {
    // Only run on dashboard pages
    if (!location.pathname.startsWith(CONFIG.dashboardPath)) {
      return;
    }

    injectStyles();
    EmailMarketing.init();
    window.emailMarketing = EmailMarketing;
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  log('Module loaded');
})();
}else if(typeof window!=='undefined'){
  // ─ HOME PAGE MODE ─ (Hotfix + Service Worker Registration)
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/hotfix.js',{scope:'/'}).catch(function(){});
  }

/* ═══════════════════════════════════════════════════════════════════════════════
   PART 1: PRE-IIFE CODE (Runs Immediately)
   ═══════════════════════════════════════════════════════════════════════════════ */

/* Block React Web Animations on .fu elements */
var _origAnimate=Element.prototype.animate;
Element.prototype.animate=function(kf,opts){
  if((this.dataset&&this.dataset.fxReady)||(this.classList&&this.classList.contains('fu'))){
    return{cancel:function(){},finish:function(){},play:function(){},pause:function(){},
      get playState(){return'finished'},get finished(){return Promise.resolve()},
      onfinish:null,oncancel:null,effect:null,timeline:null,currentTime:0,startTime:0};
  }
  return _origAnimate.call(this,kf,opts);
};
var _hst=document.createElement("style");
_hst.id="_hfix";_hst.textContent="html,body{visibility:hidden!important;opacity:0!important}";
(document.head||document.documentElement).appendChild(_hst);
document.documentElement.style.opacity="0";
/* Immediate boundary text removal */
(function(){var b=document.body||document.documentElement;if(b){b.childNodes.forEach(function(n){if(n.nodeType===3&&n.textContent.indexOf('WebKitFormBoundary')!==-1)n.remove();});}})();
setTimeout(function(){
  var h=document.getElementById("_hfix");if(h)h.remove();
  document.documentElement.style.opacity="";
  if(document.body){document.body.style.visibility="";document.body.style.opacity="";}
},1000);

/* ═══════════════════════════════════════════════════════════════════════════════
   PART 2: MAIN IIFE WITH ALL FUNCTIONS
   ═══════════════════════════════════════════════════════════════════════════════ */

(function(){
'use strict';

/* ── 0. Remove WebKitFormBoundary garbage ── */
function removeFormBoundary(){
  var b=document.body;
  if(!b)return;
  b.childNodes.forEach(function(n){
    if(n.nodeType===3&&n.textContent.indexOf('WebKitFormBoundary')!==-1)n.remove();
  });
  var first=b.firstChild;
  if(first&&first.nodeType===3&&first.textContent.trim().length>0&&first.textContent.indexOf('------')!==-1)first.remove();
}

/* ── 1. Fix broken images ── */
function fixBroken(){
  var map={'1000044531.jpg':'melena_hero1.png','1000750135.jpg':'sebo_hero1.png'};
  document.querySelectorAll('img').forEach(function(img){
    Object.keys(map).forEach(function(k){
      if(img.src.indexOf(k)!==-1)img.src='/ai-images/ecom/'+map[k];
    });
  });
}

/* ── 2. Fix prov-catalog ── */
function fixProvCatalog(){
  var imgs=[
    '/ai-images/ecom/melena_hero1.png',
    '/ai-images/ecom/sebo_hero1.png',
    '/ai-images/ecom/calendula_hero1.png',
    '/imagenes_productos/1000748981.jpg',
    '/imagenes_productos/1000744990.jpg',
    '/ai-images/ecom/pack_jabones.png'
  ];
  document.querySelectorAll('.pc-item img').forEach(function(img,i){
    if(imgs[i])img.src=imgs[i];
  });
}

/* ── 3. Fix combos — unique images ── */
function fixCombos(){
  var imgs=[
    '/ai-images/ecom/combo1_jabones.png',
    '/ai-images/ecom/combo_secreto.png',
    '/ai-images/ecom/combo3_piel.png',
    '/ai-images/ecom/combo5_doble.png',
    '/ai-images/ecom/pack_jabones.png',
    '/ai-images/ecom/combo6_jabones6.png'
  ];
  document.querySelectorAll('.cc .cc-img img, .cc .cc-img picture img').forEach(function(img,i){
    if(imgs[i])img.src=imgs[i];
  });
}

/* ── 4. Fix tickeras — unique images ── */
function fixTickeras(){
  var imgs=[
    '/ai-images/ecom/melena_hero1.png',
    '/ai-images/ecom/sebo_hero1.png',
    '/ai-images/ecom/calendula_hero1.png',
    '/imagenes_productos/1000748981.jpg',
    '/imagenes_productos/1000744990.jpg',
    '/ai-images/ecom/melena_hero2.png',
    '/ai-images/ecom/calendula_beneficios1.png',
    '/ai-images/ecom/combo5_doble.png',
    '/ai-images/ecom/melena_leon.png'
  ];
  document.querySelectorAll('.tcard .tc-img img').forEach(function(img,i){
    if(imgs[i])img.src=imgs[i];
  });
}

/* ── 5. Fix productos — unique images ── */
function fixProductos(){
  var imgs=[
    '/ai-images/ecom/melena_hero1.png',
    '/ai-images/ecom/sebo_hero1.png',
    '/ai-images/ecom/calendula_hero1.png',
    '/imagenes_productos/1000748981.jpg',
    '/imagenes_productos/1000744990.jpg',
    '/ai-images/ecom/melena_hero2.png',
    '/ai-images/ecom/calendula_beneficios1.png',
    '/ai-images/ecom/pack_jabones.png',
    '/ai-images/ecom/melena_leon.png'
  ];
  document.querySelectorAll('#productos .pc img').forEach(function(img,i){
    if(imgs[i])img.src=imgs[i];
  });
}

/* ── 6. Fix sec-last ── */
function fixSecLast(){
  var imgs=document.querySelectorAll('.ic-img-wrap img');
  var lastImgs=['/ai-images/ecom/melena_hero2.png','/ai-images/ecom/sebo_hero1.png','/ai-images/ecom/calendula_beneficios1.png','/ai-images/ecom/combo5_doble.png'];
  imgs.forEach(function(img,i){if(lastImgs[i])img.src=lastImgs[i];});
}

/* ── 7. Fix WhatsApp links ── */
function fixWhatsApp(){
  document.querySelectorAll('a[href*="wa.me"],a[href*="whatsapp"]').forEach(function(a){
    if(a.href.indexOf('wa.me')!==-1||a.href.indexOf('whatsapp')!==-1){
      a.href='https://wa.me/573001234567';
    }
  });
}

/* ── 8. Add CSS ── */
function addCSS(){
  var s=document.createElement('style');
  s.id='hotfix-css';
  s.textContent='.fu{animation:none!important;}.fx{animation:none!important;}.padd{opacity:1!important;background:linear-gradient(135deg,#3dc9e8,#2ba8c4)!important;color:#fff!important;border:none!important;font-size:18px!important;width:40px!important;height:40px!important;border-radius:50%!important;cursor:pointer!important;box-shadow:0 2px 8px rgba(61,201,232,.3)!important;display:flex!important;align-items:center!important;justify-content:center!important;}.upc-add{min-width:90px!important;min-height:34px!important;font-size:13px!important;padding:6px 14px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;}.fu.from-left{transform:translateX(-60px)!important;}.fu.from-right{transform:translateX(60px)!important;}.fu.from-left.vis,.fu.from-right.vis,.fx.from-left.vis,.fx.from-right.vis{transform:translateX(0)!important;opacity:1!important;}.fu.scale-in{transform:scale(0.85)!important;}.fu.scale-in.vis,.fx.scale-in.vis{transform:scale(1)!important;opacity:1!important;}.ship-bar{background:linear-gradient(90deg,#07192e,#0d2d4a);color:#fff;text-align:center;padding:10px 16px;font-size:13px;position:relative;z-index:100;display:flex;align-items:center;justify-content:center;gap:8px;}.ship-bar i{color:#3dc9e8;font-size:16px;}.faq-sec{max-width:800px;margin:40px auto;padding:0 20px;}.faq-sec h3{color:#fff;font-size:1.3rem;margin-bottom:20px;text-align:center;}.faq-item{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;margin-bottom:10px;overflow:hidden;}.faq-q{padding:16px 20px;cursor:pointer;color:#fff;font-weight:600;display:flex;justify-content:space-between;align-items:center;transition:background .3s;}.faq-q:hover{background:rgba(255,255,255,.06);}.faq-a{padding:0 20px;max-height:0;overflow:hidden;transition:max-height .4s ease,padding .4s ease;color:rgba(255,255,255,.7);font-size:.9rem;line-height:1.6;}.faq-item.open .faq-a{max-height:300px;padding:0 20px 16px;}.faq-item.open .faq-q .fa{transform:rotate(180deg);}.trust-badges{display:flex;flex-wrap:wrap;justify-content:center;gap:20px;padding:30px 20px;max-width:900px;margin:0 auto;}.trust-badge{display:flex;flex-direction:column;align-items:center;gap:8px;color:#fff;font-size:12px;text-align:center;opacity:.85;}.trust-badge i{font-size:24px;color:#3dc9e8;}.float-cart{position:fixed;bottom:90px;right:20px;z-index:9998;width:50px;height:50px;background:linear-gradient(135deg,#3dc9e8,#2ba8c4);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 15px rgba(61,201,232,.4);transition:transform .3s;}.float-cart:hover{transform:scale(1.1);}.float-cart i{color:#fff;font-size:20px;}.float-cart .cart-badge{position:absolute;top:-4px;right:-4px;background:#e74c3c;color:#fff;border-radius:50%;width:20px;height:20px;font-size:11px;display:flex;align-items:center;justify-content:center;font-weight:700;}.email-pop-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .5s;}.email-pop-overlay.show{opacity:1;pointer-events:auto;}.email-pop{background:linear-gradient(135deg,#0a1628,#0d2d4a);border:1px solid rgba(61,201,232,.3);border-radius:20px;padding:40px 30px;max-width:420px;width:90%;text-align:center;position:relative;transform:scale(.8);transition:transform .5s;}.email-pop-overlay.show .email-pop{transform:scale(1);}.email-pop .ep-close{position:absolute;top:12px;right:16px;background:none;border:none;color:rgba(255,255,255,.5);font-size:24px;cursor:pointer;}.email-pop .ep-title{color:#fff;font-size:1.4rem;margin:0 0 8px;font-weight:700;}.email-pop .ep-sub{color:rgba(255,255,255,.6);font-size:.9rem;margin:0 0 20px;}.ep-discount{font-size:38px;font-weight:800;background:linear-gradient(135deg,#3dc9e8,#07192e);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0 0 16px;display:block;}.email-pop input[type="email"]{width:100%;padding:14px 16px;border-radius:12px;border:1px solid rgba(61,201,232,.3);background:rgba(255,255,255,.05);color:#fff;font-size:1rem;outline:none;margin-bottom:12px;box-sizing:border-box;}.email-pop input[type="email"]:focus{border-color:#3dc9e8;}.email-pop .ep-btn{width:100%;padding:14px;background:linear-gradient(135deg,#3dc9e8,#2ba8c4);color:#fff;border:none;border-radius:12px;font-size:1rem;font-weight:700;cursor:pointer;transition:transform .2s;}.email-pop .ep-btn:hover{transform:scale(1.03);}.email-pop .ep-terms{color:rgba(255,255,255,.4);font-size:.75rem;margin-top:12px;}#super-ofertas{background:linear-gradient(135deg,#0a1628,#0d1f3c);padding:30px 20px;text-align:center}#super-ofertas h3{color:#e8c87a;font-size:1.1rem;letter-spacing:2px;margin:0 0 20px;text-transform:uppercase}.so-grid{display:flex;gap:12px;overflow-x:scroll;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;padding:0 16px 20px;scrollbar-width:none}.so-grid::-webkit-scrollbar{display:none}.so-card{flex:0 0 78%;max-width:300px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:20px;text-align:left;transition:transform .35s,box-shadow .35s,opacity .35s;scroll-snap-align:center;opacity:.7;transform:scale(.92)}.so-card:hover{transform:translateY(-4px)}.so-card.so-active{opacity:1!important;transform:scale(1)!important;box-shadow:0 10px 32px rgba(232,200,122,.3)!important;border-color:rgba(232,200,122,.45)!important}.so-card img{width:100%;border-radius:10px;margin-bottom:12px}.so-card h4{color:#fff;font-size:1rem;margin:0 0 4px}.so-card .so-sub{color:rgba(255,255,255,.6);font-size:.85rem;margin:0 0 10px}.so-card .so-price{display:flex;align-items:center;gap:10px}.so-card .so-old{color:rgba(255,255,255,.4);text-decoration:line-through;font-size:.85rem}.so-card .so-new{color:#e8c87a;font-size:1.3rem;font-weight:700}.so-card .so-save{background:#22c55e;color:#fff;font-size:.7rem;padding:3px 8px;border-radius:20px;font-weight:600}.so-card .so-btn{display:block;text-align:center;margin-top:12px;padding:10px;background:linear-gradient(135deg,#c9952b,#e8c87a);color:#1a1207;border-radius:50px;font-weight:600;font-size:.9rem;border:none;cursor:pointer;width:100%;transition:transform .2s}.so-card .so-btn:hover{transform:scale(1.05)}@media(min-width:769px){.so-grid{flex-wrap:wrap;overflow-x:visible;scroll-snap-type:none;padding:0;justify-content:center;max-width:1100px;margin:0 auto}.so-card{flex:1;min-width:260px;max-width:320px;opacity:1;transform:none;scroll-snap-align:unset}}.ba-strip{display:flex;overflow-x:auto;gap:10px;padding:10px 16px;scrollbar-width:none}.ba-strip::-webkit-scrollbar{display:none}.ba-item{flex:0 0 auto;width:140px;text-align:center;cursor:pointer}.ba-item img{width:100%;border-radius:10px;border:2px solid transparent;transition:border-color .3s}.ba-item:hover img{border-color:#3dc9e8}.ba-item span{display:block;color:#fff;font-size:.75rem;margin-top:4px}.cc-img,.tc-img,.pc img,.pc-item img,.ocard img,.ic-img-wrap img,.pimg{aspect-ratio:1/1!important;height:auto!important;max-height:400px!important;object-fit:cover!important;}.cc-img img,.tc-img img{width:100%!important;height:100%!important;object-fit:cover!important;}.cc-img img,.tc-img img,.pc img,.pc-item img{object-position:top center!important;}@media(max-width:768px){.tickera-grid{grid-template-columns:repeat(2,1fr)!important;gap:10px!important;}.tcard{min-width:0!important;}.tc-img{height:auto!important;aspect-ratio:1/1!important;}}@media(max-width:420px){.tickera-grid{grid-template-columns:1fr!important;}}.cc{position:relative!important;overflow:hidden!important;background:#fff!important;}.cc-top{position:relative!important;z-index:2!important;background:rgba(255,255,255,0.95)!important;padding:16px 18px 12px!important;}.cc.star .cc-top{background:linear-gradient(140deg,#07192e,#132d50)!important}.cc.star .cc-body{background:linear-gradient(160deg,#0a1929,#0f2744)!important}.cc.star .cc-body .cc-it{color:#e2e8f0!important}.cc.star .cc-body .ck{color:#4ade80!important}.cc.star .cc-body .var-lbl{color:#e2e8f0!important;font-weight:600!important}.cc.star .cc-body .var-name{color:#e2e8f0!important}.cc.star .cc-body .var-sub{color:rgba(226,232,240,.7)!important}.cc.star .cc-body .var-emo{color:#fff!important}.cc.star .cc-body .var-total{color:#fbbf24!important}.cc.star .cc-body .var-row{background:rgba(255,255,255,.08)!important;border:1px solid rgba(255,255,255,.18)!important;border-radius:8px!important}.cc.star .cc-body .var-row.sel{background:rgba(196,160,48,.28)!important;border-color:rgba(196,160,48,.6)!important}.cc.star .cc-body .vqb{background:rgba(255,255,255,.18)!important;color:#fff!important;border:1px solid rgba(255,255,255,.25)!important}.cc.star .cc-body .vqb:hover{background:rgba(255,255,255,.3)!important}.cc.star .cc-body .vcnt{color:#fbbf24!important;font-weight:700!important}.cc.star .cc-body .cc-pricing{background:rgba(196,160,48,.1)!important;border-radius:8px!important}.cc.star .cc-body .cc-old{color:rgba(226,232,240,.55)!important;text-decoration:line-through!important}.cc.star .cc-body .cc-price{color:#fbbf24!important;font-weight:800!important}.cc.star .cc-body .cc-disc{color:#fff!important}.cc.star .cc-body .cc-micro{color:rgba(226,232,240,.55)!important}.cc.star .cc-tname{color:#fff!important;-webkit-text-fill-color:#fff!important}.cc-top h3,.cc-top .cc-title{color:#07192e!important;font-weight:700!important;}.cc-top .cc-sub,.cc-top p{color:#334155!important;}.cc-body{position:relative!important;z-index:2!important;background:rgba(255,255,255,0.95)!important;padding:12px 18px 16px!important;}.cc-body *{color:#07192e!important;}.pain-before-after{display:block!important;position:relative!important;width:100%!important;max-width:500px!important;margin:0 auto 30px!important;overflow:hidden!important;border-radius:16px!important;aspect-ratio:1/1!important;cursor:ew-resize!important;-webkit-user-select:none!important;user-select:none!important;}.pain-before-after .pain-img-wrap{position:absolute!important;top:0!important;left:0!important;width:100%!important;height:100%!important;}.pain-before-after .pain-img-wrap img{width:100%!important;height:100%!important;object-fit:cover!important;object-position:top center!important;display:block!important;}.pain-before-after .pain-img-wrap.after-wrap{overflow:hidden!important;z-index:2!important;}.pain-before-after .pain-slider-line{position:absolute!important;top:0!important;width:3px!important;height:100%!important;background:#fff!important;z-index:10!important;cursor:ew-resize!important;box-shadow:0 0 6px rgba(0,0,0,.4)!important;}.pain-before-after .pain-slider-handle{position:absolute!important;top:50%!important;left:50%!important;transform:translate(-50%,-50%)!important;width:40px!important;height:40px!important;background:#fff!important;border-radius:50%!important;display:flex!important;align-items:center!important;justify-content:center!important;box-shadow:0 2px 8px rgba(0,0,0,.3)!important;}.pain-before-after .pain-label{position:absolute!important;top:12px!important;padding:4px 14px!important;border-radius:20px!important;font-size:12px!important;font-weight:700!important;letter-spacing:1px!important;text-transform:uppercase!important;z-index:5!important;pointer-events:none!important;}.pain-before-after .before-lbl{left:12px!important;background:rgba(220,38,38,.85)!important;color:#fff!important;}.pain-before-after .after-lbl{right:12px!important;background:rgba(22,163,74,.85)!important;color:#fff!important;}.pain-before-after .pain-overlay,.pain-before-after .pain-after-badge{display:none!important;}.var-name{font-size:15px!important;font-weight:600!important}.var-sub{font-size:13px!important;color:#555!important}.var-total{font-size:16px!important;font-weight:700!important}.cc-old{font-size:14px!important}.tcard{overflow:hidden!important}.tcard .var-wrap{display:none!important}.tc-body>div:not([class]){font-size:14px!important;line-height:1.6!important;font-weight:500!important;color:#1e293b!important}.sh .sh-tag{font-size:13px!important;letter-spacing:.5px!important}.cc-cta{font-size:15px!important;padding:14px 18px!important;font-weight:700!important;background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%)!important;color:#fff!important;border:none!important;border-radius:12px!important;cursor:pointer!important;text-align:center!important;justify-content:center!important;box-shadow:0 4px 14px rgba(34,197,94,.35)!important;letter-spacing:.3px!important;text-decoration:none!important}.tc-desc{font-size:14px!important;line-height:1.4!important}.tc-old{font-size:14px!important}.tc-btn{font-size:14px!important;padding:12px 16px!important;font-weight:700!important;background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%)!important;color:#fff!important;border:none!important;border-radius:10px!important;cursor:pointer!important;box-shadow:0 4px 14px rgba(34,197,94,.3)!important;text-decoration:none!important}.cc-top{font-size:18px!important}.cc-body li{font-size:15px!important;line-height:1.5!important}.cc-body p{font-size:14px!important;line-height:1.5!important}.cc-micro{font-size:13px!important}';
  document.head.appendChild(s);
}

/* ── 9. Fix Fonts ── */
function fixFonts(){
  document.querySelectorAll('*').forEach(function(el){
    var fs=window.getComputedStyle(el).fontSize;
    var val=parseFloat(fs);
    if(val>0&&val<10){
      el.style.fontSize='14px';
    }
  });
}

/* ── 10. Fix Pain Cards (Before/After Sliders) ── */
function fixPainCards(){
  var pains=document.querySelectorAll('.pain-before-after');
  pains.forEach(function(container){
    var wraps=container.querySelectorAll('.pain-img-wrap');
    if(wraps.length<2)return;
    var beforeWrap=wraps[0];
    var afterWrap=wraps[1];
    beforeWrap.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;z-index:1;';
    afterWrap.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;z-index:2;overflow:hidden;';
    afterWrap.style.clipPath='inset(0 0 0 50%)';
    var afterLabel=afterWrap.querySelector('.after-lbl');
    if(afterLabel){
      afterLabel.style.cssText='position:absolute;top:12px;right:12px;z-index:15;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:rgba(22,163,74,.85);color:#fff;pointer-events:none;';
      container.appendChild(afterLabel);
    }
    var beforeLabel=beforeWrap.querySelector('.before-lbl');
    if(beforeLabel){
      beforeLabel.style.cssText='position:absolute;top:12px;left:12px;z-index:15;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:rgba(220,38,38,.85);color:#fff;pointer-events:none;';
      container.appendChild(beforeLabel);
    }
    var line=document.createElement('div');
    line.className='pain-slider-line';
    line.style.left='50%';
    line.innerHTML='<div class="pain-slider-handle"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#07192e" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#07192e" stroke-width="2.5"><path d="M9 6l6 6-6 6"/></svg></div>';
    container.appendChild(line);
    function onMove(clientX){
      var rect=container.getBoundingClientRect();
      var x=clientX-rect.left;
      var pct=Math.max(0,Math.min(100,(x/rect.width)*100));
      afterWrap.style.clipPath='inset(0 0 0 '+pct+'%)';
      line.style.left=pct+'%';
    }
    var dragging=false;
    container.addEventListener('mousedown',function(e){dragging=true;onMove(e.clientX);e.preventDefault();});
    document.addEventListener('mousemove',function(e){if(dragging)onMove(e.clientX);});
    document.addEventListener('mouseup',function(){dragging=false;});
    container.addEventListener('touchstart',function(e){dragging=true;onMove(e.touches[0].clientX);e.preventDefault();},{passive:false});
    document.addEventListener('touchmove',function(e){if(dragging)onMove(e.touches[0].clientX);});
    document.addEventListener('touchend',function(){dragging=false;});
  });
}

/* ── 11. Inject Super Ofertas — Premium 3D Carousel v2 ── */
function injectSuperOfertas(){
  if(document.getElementById('super-ofertas'))return;
  var u=document.querySelector('.urg');if(!u)return;
  var base='https://sanate.store/ai-images/';
  var offers=[
    {imgs:['https://sanate.store/ai-images/ecom/combo1_jabones.png'],t:'',d:'',p:'',x:'',pct:'',tag:'',accent:'#e8c87a'},
    {imgs:['https://sanate.store/ai-images/ecom/combo4_secreto.png'],t:'',d:'',p:'',x:'',pct:'',tag:'',accent:'#e8c87a'},
    {imgs:['https://sanate.store/ai-images/ecom/melena_leon.png'],t:'',d:'',p:'',x:'',pct:'',tag:'',accent:'#e8c87a'},
    {imgs:['https://sanate.store/ai-images/ecom/sebo_hero1.png'],t:'',d:'',p:'',x:'',pct:'',tag:'',accent:'#e8c87a'},
    {imgs:['https://sanate.store/ai-images/ecom/melena_hero1.png'],t:'',d:'',p:'',x:'',pct:'',tag:'',accent:'#e8c87a'},
    {imgs:['https://sanate.store/ai-images/ecom/Polen2_opt.jpg'],t:'',d:'',p:'',x:'',pct:'',tag:'',accent:'#e8c87a'},
    {imgs:['https://sanate.store/ai-images/ecom/combo3_piel.png'],t:'',d:'',p:'',x:'',pct:'',tag:'',accent:'#e8c87a'},
    {imgs:['https://sanate.store/ai-images/section-84912-optimized.webp'],t:'',d:'',p:'',x:'',pct:'',tag:'',accent:'#e8c87a'},
    {imgs:['https://sanate.store/ai-images/ecom/combo5_doble.png'],t:'',d:'',p:'',x:'',pct:'',tag:'',accent:'#e8c87a'},
    {imgs:['https://sanate.store/ai-images/ecom/POLEN5_opt.jpg'],t:'',d:'',p:'',x:'',pct:'',tag:'',accent:'#3dc9e8'},
    {imgs:['https://sanate.store/ai-images/ecom/melena_hero2.png'],t:'',d:'',p:'',x:'',pct:'',tag:'',accent:'#3dc9e8'},
    {imgs:['https://sanate.store/ai-images/section-84912-optimized.webp'],t:'',d:'',p:'',x:'',pct:'',tag:'',accent:'#3dc9e8'},
    {imgs:['https://sanate.store/ai-images/ecom/sebo_lifestyle1.png'],t:'',d:'',p:'',x:'',pct:'',tag:'',accent:'#3dc9e8'},
    {imgs:['https://sanate.store/ai-images/ecom/combo6_jabones6.png'],t:'',d:'',p:'',x:'',pct:'',tag:'',accent:'#3dc9e8'}
  ];
  /* ── Inject Scoped CSS ── */
  var st=document.createElement('style');st.id='so-v2-css';
  st.textContent='#super-ofertas{background:linear-gradient(160deg,#020617 0%,#0f172a 50%,#020617 100%)!important;padding:52px 0 44px!important;overflow:hidden!important;position:relative!important;text-align:left!important;max-width:none!important;margin:0!important}#super-ofertas *{box-sizing:border-box}#super-ofertas::before{content:"";position:absolute;top:-60px;left:50%;transform:translateX(-50%);width:400px;height:400px;background:radial-gradient(circle,rgba(232,200,122,.08),transparent 70%);pointer-events:none}.so2-hdr{text-align:center;padding:0 20px;margin-bottom:36px}.so2-hdr h2{font-size:clamp(24px,6vw,34px);font-weight:800;color:#f8fafc!important;-webkit-text-fill-color:#f8fafc!important;background:none!important;-webkit-background-clip:unset!important;background-clip:unset!important;margin:0 0 10px;letter-spacing:-.5px;line-height:1.2}.so2-hdr p{color:#64748b;font-size:14px;margin:0 auto;max-width:380px;line-height:1.5}.so2-vp{position:relative;width:100%;overflow:hidden;touch-action:pan-y;-webkit-user-select:none;user-select:none}.so2-track{display:flex;transition:transform .55s cubic-bezier(.22,.68,0,1.04);will-change:transform;padding:24px 0}.so2-track.drag{transition:none!important}.so2-card{flex:0 0 82vw;max-width:400px;margin:0 8px;border-radius:22px;overflow:hidden;position:relative;transition:transform .55s cubic-bezier(.22,.68,0,1.04),opacity .5s,box-shadow .5s;transform:scale(.86) translateZ(0);opacity:.5;background:#0f172a;box-shadow:0 4px 20px rgba(0,0,0,.3)}.so2-card.act{transform:scale(1) translateZ(0)!important;opacity:1!important;box-shadow:0 20px 60px rgba(0,0,0,.6),0 0 0 1px rgba(232,200,122,.15),0 0 40px rgba(232,200,122,.08)!important;z-index:3}.so2-card.prv{transform:scale(.86) perspective(1000px) rotateY(4deg) translateZ(0);transform-origin:right center;z-index:1}.so2-card.nxt{transform:scale(.86) perspective(1000px) rotateY(-4deg) translateZ(0);transform-origin:left center;z-index:1}.so2-hero{position:relative;width:100%;aspect-ratio:1/1;overflow:hidden;background:#0a0f1a}.so2-hero img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:center 30%;transition:opacity .8s ease;opacity:0;z-index:1}.so2-hero img.on{opacity:1;z-index:2}.so2-hero img.so2-blur-bg{position:absolute!important;top:-30px!important;left:-30px!important;width:calc(100% + 60px)!important;height:calc(100% + 60px)!important;object-fit:cover!important;filter:blur(20px) brightness(0.75) saturate(1.3)!important;z-index:0!important;opacity:1!important;transform:scale(1.0)!important;transition:none!important;pointer-events:none!important}.so2-grad{position:absolute;bottom:0;left:0;right:0;height:50%;background:linear-gradient(transparent,rgba(2,6,23,.85));z-index:3;pointer-events:none}.so2-tag{position:absolute;top:14px;left:14px;z-index:6;padding:6px 14px;border-radius:30px;font-size:11px;font-weight:700;letter-spacing:.4px;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.12);text-transform:uppercase}.so2-pct{position:absolute;top:14px;right:14px;z-index:6;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:7px 11px;border-radius:12px;font-size:15px;font-weight:800;letter-spacing:.3px;box-shadow:0 4px 16px rgba(239,68,68,.4)}.so2-idots{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);z-index:6;display:flex;gap:5px}.so2-idot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.3);transition:all .3s}.so2-idot.on{background:#fff;box-shadow:0 0 6px rgba(255,255,255,.5)}.so2-body{padding:18px 20px 20px;position:relative;z-index:2;background:linear-gradient(180deg,#0f172a,#0c1322)}.so2-body h3{margin:0 0 8px;font-size:20px;font-weight:800;background:linear-gradient(90deg,#f1f5f9 0%,#f1f5f9 40%,#e8c87a 50%,#f5d98a 55%,#f1f5f9 60%,#f1f5f9 100%);background-size:200% 100%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:so2GoldShimmer 3.5s ease-in-out infinite;letter-spacing:-.2px;line-height:1.3}.so2-desc{margin:0 0 14px;font-size:15px;color:#cbd5e1;line-height:1.5;font-weight:400}.so2-row{display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap}.so2-old{text-decoration:line-through;color:#475569;font-size:13px}.so2-new{font-size:26px;font-weight:800;color:#22c55e;letter-spacing:-.5px}.so2-save{background:rgba(34,197,94,.12);color:#22c55e;font-size:10px;padding:4px 10px;border-radius:8px;font-weight:700;letter-spacing:.3px;text-transform:uppercase}.so2-cta{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:15px;background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;text-decoration:none;box-shadow:0 6px 20px rgba(34,197,94,.35);transition:transform .2s,box-shadow .2s;letter-spacing:.2px}.so2-cta:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(34,197,94,.45)}.so2-cta i{font-size:18px}.so2-dots{display:flex;justify-content:center;gap:12px;margin-top:28px;padding:0 20px}.so2-dot{width:11px;height:11px;border-radius:50%;background:rgba(255,255,255,.15);border:2px solid rgba(255,255,255,.1);cursor:pointer;transition:all .3s;padding:0;display:block}.so2-dot.on{background:#e8c87a;border-color:#e8c87a;box-shadow:0 0 14px rgba(232,200,122,.5);transform:scale(1.15)}.so2-shimmer{position:absolute;top:0;left:0;right:0;bottom:0;z-index:5;pointer-events:none;background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.03) 50%,transparent 60%);background-size:250% 100%;animation:so2Shim 4s ease-in-out infinite}@keyframes so2Shim{0%{background-position:250% 0}100%{background-position:-250% 0}}.so2-urgency{display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;color:#f97316;font-weight:600;margin-bottom:12px;letter-spacing:.3px}.so2-urgency i{font-size:13px;animation:so2Pulse 1.5s ease-in-out infinite}@keyframes so2Pulse{0%,100%{opacity:.6}50%{opacity:1}}@keyframes so2GoldShimmer{0%{background-position:200% 0}50%{background-position:-200% 0}100%{background-position:200% 0}}@media(max-width:430px){.so2-card{flex:0 0 84vw;margin:0 6px}.so2-hero{aspect-ratio:1/1}.so2-body h3{font-size:18px}.so2-new{font-size:24px}.so2-cta{padding:14px;font-size:14px}}@media(min-width:769px){.so2-card{flex:0 0 380px;max-width:400px;margin:0 12px}.so2-hero{aspect-ratio:1/1}}';
  document.head.appendChild(st);
  /* ── Build HTML ── */
  var h='<section id="super-ofertas"><div class="so2-hdr"><h2>\ud83d\udd25 Combos Premium — Más Ahorro</h2><p>Los packs más completos para resultados reales. Precios oficiales SÁNATE.</p></div><div class="so2-vp"><div class="so2-track">';
  offers.forEach(function(v,ci){
    h+='<div class="so2-card'+(ci===1?' act':ci===0?' prv':' nxt')+'" data-ci="'+ci+'">';
    h+='<div class="so2-hero">';
    h+='<img class="so2-blur-bg" src="'+v.imgs[0]+'" style="position:absolute;top:-30px;left:-30px;width:calc(100% + 60px);height:calc(100% + 60px);object-fit:cover;filter:blur(20px) brightness(0.75) saturate(1.3);z-index:0;opacity:1;transition:none;pointer-events:none" alt="">';
    v.imgs.forEach(function(src,ii){h+='<img class="so2-si so2-si-'+ci+(ii===0?' on':'')+'" data-ci="'+ci+'" data-ii="'+ii+'" src="'+src+'" alt="'+v.t+'" loading="lazy">';});
    h+='<div class="so2-grad"></div>';
    h+='<span class="so2-tag" style="background:'+v.accent+'18;color:'+v.accent+'">'+v.tag+'</span>';
    h+='<span class="so2-pct">'+v.pct+'</span>';
    h+='<div class="so2-idots">';v.imgs.forEach(function(_,ii){h+='<span class="so2-idot so2-idot-'+ci+(ii===0?' on':'')+'" data-ii="'+ii+'"></span>';});h+='</div>';
    h+='<div class="so2-shimmer"></div>';
    h+='</div>';
    h+='<div class="so2-body">';
    h+='<div class="so2-urgency"><i class="fa fa-clock-o"></i> Oferta por tiempo limitado</div>';
    h+='<h3>'+v.t+'</h3>';
    h+='<p class="so2-desc">'+v.d+'</p>';
    h+='<div class="so2-row"><span class="so2-old">'+v.x+'</span><span class="so2-new">'+v.p+'</span><span class="so2-save">Ahorras '+v.pct.replace('-','')+'</span></div>';
    h+='<button class="so2-cta" onclick="alert(\'Producto agregado al carrito\')" style="border:none"><i class="fa fa-shopping-cart"></i> \ud83d\uded2 A\u00f1adir al carrito</button>';
    h+='</div></div>';
  });
  h+='</div></div><div class="so2-dots">';
  offers.forEach(function(_,ci){h+='<button class="so2-dot'+(ci===1?' on':'')+'" data-ci="'+ci+'"></button>';});
  h+='</div></section>';
  u.insertAdjacentHTML('afterend',h);
  /* ── Carousel Engine ── */
  var sec=document.getElementById('super-ofertas');
  var vp=sec.querySelector('.so2-vp');
  var track=sec.querySelector('.so2-track');
  var cards=sec.querySelectorAll('.so2-card');
  var dots=sec.querySelectorAll('.so2-dot');
  var cur=1,total=cards.length,autoTmr=null;
  var dragging=false,startX=0,dx=0,baseOff=0;
  function center(){
    var vpW=vp.offsetWidth;
    var el=cards[cur];if(!el)return;
    var off=(vpW/2)-(el.offsetLeft+el.offsetWidth/2);
    baseOff=off;
    if(!dragging)track.style.transform='translateX('+off+'px)';
  }
  function activate(){
    cards.forEach(function(c,i){
      c.classList.remove('act','prv','nxt');
      if(i===cur)c.classList.add('act');
      else if(i===((cur-1+total)%total))c.classList.add('prv');
      else if(i===((cur+1)%total))c.classList.add('nxt');
    });
    dots.forEach(function(d,i){d.classList.toggle('on',i===cur);});
    center();
  }
  function goTo(idx){cur=((idx%total)+total)%total;activate();resetAuto();}
  function resetAuto(){clearInterval(autoTmr);autoTmr=setInterval(function(){goTo(cur+1);},4500);}
  /* Touch */
  vp.addEventListener('touchstart',function(e){dragging=true;startX=e.touches[0].clientX;dx=0;track.classList.add('drag');clearInterval(autoTmr);},{passive:true});
  vp.addEventListener('touchmove',function(e){if(!dragging)return;dx=e.touches[0].clientX-startX;track.style.transform='translateX('+(baseOff+dx)+'px)';},{passive:true});
  vp.addEventListener('touchend',function(e){if(!dragging)return;dragging=false;track.classList.remove('drag');if(Math.abs(dx)>45){goTo(dx>0?cur-1:cur+1);}else{activate();}resetAuto();});
  /* Mouse drag for desktop */
  vp.addEventListener('mousedown',function(e){dragging=true;startX=e.clientX;dx=0;track.classList.add('drag');clearInterval(autoTmr);e.preventDefault();});
  document.addEventListener('mousemove',function(e){if(!dragging)return;dx=e.clientX-startX;track.style.transform='translateX('+(baseOff+dx)+'px)';});
  document.addEventListener('mouseup',function(){if(!dragging)return;dragging=false;track.classList.remove('drag');if(Math.abs(dx)>45){goTo(dx>0?cur-1:cur+1);}else{activate();}resetAuto();});
  /* Dot clicks */
  dots.forEach(function(d){d.addEventListener('click',function(){goTo(parseInt(d.dataset.ci));});});
  /* Card click to center */
  cards.forEach(function(c){c.addEventListener('click',function(){var ci=parseInt(c.dataset.ci);if(ci!==cur)goTo(ci);});});
  /* Image slideshow per card */
  [0,1,2,3,4,5,6,7,8,9,10,11,12,13].forEach(function(ci){
    var imgs=sec.querySelectorAll('.so2-si-'+ci);
    var idts=sec.querySelectorAll('.so2-idot-'+ci);
    if(imgs.length<2)return;var ic=0;
    setInterval(function(){imgs[ic].classList.remove('on');if(idts[ic])idts[ic].classList.remove('on');ic=(ic+1)%imgs.length;imgs[ic].classList.add('on');if(idts[ic])idts[ic].classList.add('on');},3200+ci*300);
  });
  /* Init */
  activate();resetAuto();
  window.addEventListener('resize',function(){center();});
}

function fixHeroButtons(){
  var btns=document.querySelectorAll('section.hero a, section.hero button');
  btns.forEach(function(b){
    var txt=b.textContent.trim().toLowerCase();
    if(txt.indexOf('combo')!==-1){
      b.setAttribute('href','#combos');
      b.onclick=function(e){e.preventDefault();var c=document.getElementById('combos');if(c)c.scrollIntoView({behavior:'smooth'});};
    }
    if(txt.indexOf('quienes')!==-1||txt.indexOf('quiénes')!==-1){
      b.removeAttribute('href');
      b.onclick=function(e){e.preventDefault();};
    }
  });
}

/* ── 13. Fix Before/After Compare ── */
function fixBACompare(){
  var strip=document.querySelector('.ba-strip');
  if(!strip)return;
  var items=[
    {img:'/ai-images/ecom/sebo_hero1.png',label:'Antes'},
    {img:'/ai-images/ecom/combo5_doble.png',label:'Después'},
    {img:'/ai-images/ecom/calendula_hero1.png',label:'Resultado'}
  ];
  items.forEach(function(item){
    var div=document.createElement('div');
    div.className='ba-item';
    div.innerHTML='<img src="'+item.img+'" alt="'+item.label+'"><span>'+item.label+'</span>';
    strip.appendChild(div);
  });
}

/* ── 14. Fix Cabello Section ── */
function fixCabello(){
  document.querySelectorAll('[class*="cabello"] img').forEach(function(img,i){
    var imgs=['/ai-images/ecom/melena_hero1.png','/ai-images/ecom/melena_hero2.png','/ai-images/ecom/melena_leon.png'];
    if(imgs[i])img.src=imgs[i];
  });
}

/* ── 15. Fix Star Combos ── */
function fixStarCombos(){
  document.querySelectorAll('.cc').forEach(function(card){
    if(card.querySelector('.star-rating'))return;
    var rating=document.createElement('div');
    rating.className='star-rating';
    rating.innerHTML='<span style="color:#ffc107;font-size:14px">★★★★★ (4.9)</span>';
    var top=card.querySelector('.cc-top');
    if(top)top.appendChild(rating);
  });
}

/* ── 16. Fix Instagram ── */
function fixInstagram(){
  var feedId='jgkaj29KiSHGOSbnLaqO';
  var apiUrl='https://feeds.behold.so/'+feedId;
  var containers=document.querySelectorAll('.ig-feed-container,[class*="instagram-feed"],[class*="instafeed"]');
  if(!containers.length)return;
  fetch(apiUrl).then(function(r){return r.json();}).then(function(data){
    var posts=Array.isArray(data)?data:(data.posts||[]);
    if(!posts.length)return;
    containers.forEach(function(container){
      var html='<div style="text-align:center;margin-bottom:16px"><a href="https://www.instagram.com/sanateproductos/" target="_blank" style="color:#fff;text-decoration:none;display:inline-flex;align-items:center;gap:8px"><i class="fab fa-instagram" style="font-size:28px;color:#e1306c"></i><span style="font-size:15px;font-weight:600">@sanateproductos</span></a></div>';
      html+='<div style="display:contents">';
      posts.slice(0,6).forEach(function(post){
        var thumb=post.thumbnailUrl||post.mediaUrl||post.image||post.media||'';
        var link=post.permalink||post.link||'https://www.instagram.com/sanateproductos/';
        html+='<a href="'+link+'" target="_blank" style="display:block;text-decoration:none"><img src="'+thumb+'" style="width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:8px;background:#f0f0f0" alt="Instagram" loading="eager"></a>';
      });
      html+='</div>';
      container.innerHTML=html;
    });
  }).catch(function(){});
}

function setupComboSlideshow(){
  document.querySelectorAll('.cc-img').forEach(function(card){
    var img=card.querySelector('img');
    if(!img)return;
    var origSrc=img.src;
    var imgs=[origSrc,'/ai-images/ecom/combo1_jabones.png','/ai-images/ecom/combo_secreto.png'];
    var idx=0;
    setInterval(function(){
      idx=(idx+1)%imgs.length;
      img.style.opacity='0.5';
      setTimeout(function(){
        img.src=imgs[idx];
        img.style.opacity='1';
      },150);
    },3000);
  });
}

/* ── 18. Fix Reels Section ── */
function fixReelsSection(){
  var vcards=document.querySelectorAll(".vcard");
  if(!vcards.length)return;
  var reels=[
    {url:"https://www.instagram.com/p/DMbqs6FtZZZ/",embed:"https://www.instagram.com/p/DMbqs6FtZZZ/embed/",thumb:"https://behold.pictures/jgkaj29KiSHGOSbnLaqOGOSbnLaqO/18046314614722426/medium.jpg"},
    {url:"https://www.instagram.com/reel/DS1Q3RkDQ6l/",embed:"https://www.instagram.com/reel/DS1Q3RkDQ6l/embed/",thumb:"https://behold.pictures/jgkaj29KiSHGOSbnLaqOGOSbnLaqO/18125795308570389/medium.jpg"},
    {url:"https://www.instagram.com/reel/DVsEUosDUKZ/",embed:"https://www.instagram.com/reel/DVsEUosDUKZ/embed/",thumb:"https://behold.pictures/jgkaj29KiSHGOSbnLaqOGOSbnLaqO/18385314640080728/medium.jpg"}
  ];
  vcards.forEach(function(vcard,i){
    var r=reels[i%reels.length];
    var img=vcard.querySelector('img');
    if(img) img.src=r.thumb;
    vcard.style.cursor='pointer';
    vcard.addEventListener('click',function(){
      var existing=document.querySelector('.reel-embed-overlay');
      if(existing){existing.remove();return;}
      var ov=document.createElement('div');
      ov.className='reel-embed-overlay';
      ov.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.85);z-index:10000;display:flex;align-items:center;justify-content:center;';
      ov.innerHTML='<div style="position:relative;width:90%;max-width:400px;aspect-ratio:9/16"><iframe src="'+r.embed+'" style="width:100%;height:100%;border:none;border-radius:12px" frameborder="0" allowfullscreen></iframe><button onclick="this.closest(\'.reel-embed-overlay\').remove()" style="position:absolute;top:-12px;right:-12px;background:#fff;border:none;border-radius:50%;width:32px;height:32px;font-size:20px;cursor:pointer;line-height:1">×</button></div>';
      document.body.appendChild(ov);
    });
  });
}

function fixAfter(){
  /* Fix combo/product images in SO cards and combo cards */
  var imgMap={
    'combo3_piel.png':'sebo%20de%20res%20y%20avena%20y%20arroz.webp',
    'combo_doble_sebo.png':'x2%20Sebos%20Grandes%20-%20LadingPage%20%20Medico.webp',
    'X50Caps_opt.jpg':'Sebo%20Grande%20y%20Jabon%20-%20Curcuma.webp',
    'POLEN5_opt.jpg':'sebo%20de%20res%20y%20avena%20y%20arroz.webp',
    'combo1_jabones.png':'ecom/pack_jabones.png',
    'combo_secreto.png':'sebo%20de%20res%20y%20avena%20y%20arroz.webp',
    'combo6_jabones6.png':'Jabon%20Curcuma%20Antes%20y%20despues.webp'
  };
  document.querySelectorAll('.so-card img,.cc-img img').forEach(function(img){
    var fn=img.src.split('/').pop();
    if(imgMap[fn])img.src='/ai-images/'+imgMap[fn];
  });
}

function fixScrollObserver(){
  var _pinned=new WeakSet();
  function reveal(){
    var vh=window.innerHeight;
    document.querySelectorAll('.fx,.fu').forEach(function(el){
      if(!el.dataset.fxReady){
        el.dataset.fxReady='1';
        el.classList.remove('fu');
        el.classList.add('fx');
      }
      if(el.getAnimations){
        el.getAnimations().forEach(function(a){
          if(!_pinned.has(a)){
            try{a.cancel();}catch(e){}
          }
        });
      }
      var r=el.getBoundingClientRect();
      if(r.top<vh+80&&r.bottom>-80&&!el.classList.contains('vis')){
        el.classList.add('vis');
        el.style.setProperty('opacity','1','important');
        el.style.setProperty('transform','none','important');
        if(window._origAnimate){
          var pin=window._origAnimate.call(el,[{opacity:'1',transform:'none'}],{duration:1,fill:'forwards'});
          _pinned.add(pin);
        }
      }
    });
    document.querySelectorAll('.fx.vis').forEach(function(el){
      if(el.getAnimations){
        el.getAnimations().forEach(function(a){
          if(!_pinned.has(a)){
            try{a.cancel();}catch(e){}
          }
        });
      }
    });
  }
  window.addEventListener('scroll',reveal,{passive:true});
  setInterval(reveal,400);
  reveal();
}

/* ── 21. Add Scroll Directions ── */
function addScrollDirections(){
  var fus=document.querySelectorAll('.fu');
  fus.forEach(function(f,i){
    if(f.closest('#super-ofertas')||f.closest('.hero'))return;
    if(i%3===0){
      f.classList.add('from-left');
      f.style.setProperty('transform','translateX(-60px)','important');
    }else if(i%3===1){
      f.classList.add('from-right');
      f.style.setProperty('transform','translateX(60px)','important');
    }else{
      f.classList.add('scale-in');
      f.style.setProperty('transform','scale(0.85)','important');
    }
  });
}

/* ── 22. Add Shipping Bar ── */
function addShippingBar(){
  if(document.querySelector('.ship-bar'))return;
  var bar=document.createElement('div');
  bar.className='ship-bar';
  bar.innerHTML='<i class="fa fa-truck"></i> Envío GRATIS a toda Colombia en pedidos +$80.000 · <strong>Entrega 2-5 días hábiles</strong>';
  var hero=document.querySelector('.hero');
  if(hero&&hero.parentNode)hero.parentNode.insertBefore(bar,hero);
}

/* ── 23. Add Floating Cart ── */
function addFloatingCart(){
  if(document.querySelector('.float-cart'))return;
  var cart=document.createElement('div');
  cart.className='float-cart';
  cart.innerHTML='<i class="fa fa-shopping-cart"></i><span class="cart-badge">0</span>';
  cart.onclick=function(){
    var cp=document.querySelector('.cart-panel,.cart-drawer,[class*="cart"]');
    if(cp)cp.click();
  };
  document.body.appendChild(cart);
}

/* ── 24. Add FAQ Section ── */
function addFAQSection(){
  if(document.querySelector('.faq-sec'))return;
  var faqs=[
    {q:'¿Los productos son 100% naturales?',a:'Sí, todos nuestros productos están elaborados con ingredientes naturales y artesanales. Utilizamos sebo de res, caléndula, cúrcuma y otros ingredientes de origen natural sin químicos dañinos.'},
    {q:'¿Cuánto tarda el envío?',a:'Realizamos envíos a toda Colombia. El tiempo de entrega es de 2 a 5 días hábiles. Envío GRATIS en pedidos superiores a $80.000 COP.'},
    {q:'¿Puedo devolver un producto?',a:'Sí, tienes 30 días para solicitar una devolución si el producto no cumple tus expectativas. Contáctanos por WhatsApp para gestionar tu devolución.'},
    {q:'¿Los jabones son aptos para piel sensible?',a:'Nuestros jabones artesanales son suaves y aptos para todo tipo de piel, incluyendo piel sensible. El sebo de res y la caléndula tienen propiedades calmantes naturales.'},
    {q:'¿Cómo aplico mi código de descuento?',a:'Ingresa tu código en el campo "Código de descuento" al momento de finalizar tu compra. El descuento se aplica automáticamente al total de tu pedido.'}
  ];
  var sec=document.createElement('div');
  sec.className='faq-sec';
  sec.innerHTML='<h3>Preguntas Frecuentes</h3>';
  faqs.forEach(function(faq){
    var item=document.createElement('div');
    item.className='faq-item';
    item.innerHTML='<div class="faq-q">'+faq.q+' <i class="fa fa-chevron-down"></i></div><div class="faq-a">'+faq.a+'</div>';
    item.querySelector('.faq-q').onclick=function(){item.classList.toggle('open');};
    sec.appendChild(item);
  });
  var footer=document.querySelector('footer,.footer,[class*="footer"]');
  if(footer&&footer.parentNode)footer.parentNode.insertBefore(sec,footer);
  else document.body.appendChild(sec);
}

/* ── 25. Add Trust Badges ── */
function addTrustBadges(){
  if(document.querySelector('.trust-badges'))return;
  var badges=[
    {icon:'fa-leaf',text:'100% Natural'},
    {icon:'fa-truck',text:'Envío Gratis +$80k'},
    {icon:'fa-shield',text:'Compra Segura'},
    {icon:'fa-undo',text:'30 Días Devolución'},
    {icon:'fa-star',text:'4.9★ Valoración'}
  ];
  var div=document.createElement('div');
  div.className='trust-badges';
  badges.forEach(function(b){
    var badge=document.createElement('div');
    badge.className='trust-badge';
    badge.innerHTML='<i class="fa '+b.icon+'"></i><span>'+b.text+'</span>';
    div.appendChild(badge);
  });
  var faq=document.querySelector('.faq-sec');
  if(faq&&faq.parentNode)faq.parentNode.insertBefore(div,faq);
  else document.body.appendChild(div);
}

/* ── 26. Register Email ── */
function registerEmail(email,cb){
  try{
    var subs=JSON.parse(localStorage.getItem('sanate_subscribers')||'[]');
    var exists=subs.some(function(s){return s.email===email;});
    if(!exists){
      subs.push({email:email,date:new Date().toISOString(),origin:'popup',active:true});
      localStorage.setItem('sanate_subscribers',JSON.stringify(subs));
    }
  }catch(e){}
  if(cb)cb();
}

/* ── 27. Apply Discount ── */
function applyDiscount(email){
  var codeFields=document.querySelectorAll('input[name*="code"],input[name*="coupon"],input[name*="discount"],input[placeholder*="código"],input[placeholder*="descuento"]');
  codeFields.forEach(function(f){
    f.value='BIENVENIDO10';
    f.dispatchEvent(new Event('input',{bubbles:true}));
    f.dispatchEvent(new Event('change',{bubbles:true}));
  });
}

/* ── 28. Setup Email Popup ── */
function setupEmailPopup(){
  if(document.querySelector('.email-pop-overlay'))return;
  var KEY='sanate_email_sub';
  var saved=null;
  try{saved=localStorage.getItem(KEY);}catch(e){}
  if(saved){applyDiscount(saved);return;}
  var overlay=document.createElement('div');
  overlay.className='email-pop-overlay';
  overlay.innerHTML='<div class="email-pop"><button class="ep-close">&times;</button><div class="ep-title">¡Bienvenido a SÁNATE!</div><div class="ep-sub">Suscríbete y obtén un descuento exclusivo</div><span class="ep-discount">10% OFF</span><form><input type="email" placeholder="Tu correo electrónico" required><button type="submit" class="ep-btn">OBTENER MI DESCUENTO</button></form><div class="ep-terms">Al suscribirte aceptas recibir ofertas por email. Puedes cancelar en cualquier momento.</div></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('.ep-close').onclick=function(){overlay.classList.remove('show');};
  overlay.onclick=function(e){if(e.target===overlay)overlay.classList.remove('show');};
  overlay.querySelector('form').onsubmit=function(e){
    e.preventDefault();
    var email=overlay.querySelector('input[type="email"]').value;
    if(email){
      try{localStorage.setItem(KEY,email);}catch(e){}
      registerEmail(email,function(){});
      applyDiscount(email);
      overlay.classList.remove('show');
    }
  };
  setTimeout(function(){overlay.classList.add('show');},8000);
}

/* ── MAIN EXECUTION ── */
document.addEventListener('DOMContentLoaded',function(){
  removeFormBoundary();
  fixBroken();
  fixProvCatalog();
  fixCombos();
  fixTickeras();
  fixProductos();
  fixSecLast();
  fixWhatsApp();
  addCSS();
  fixFonts();
  fixPainCards();
  injectSuperOfertas();
  fixHeroButtons();
  fixBACompare();
  fixTickeras();
  fixCabello();document.querySelectorAll('.tc-name').forEach(function(n){var t=n.textContent;var card=n.closest('.tcard');if(!card)return;var desc=card.querySelector('.tc-desc');if(t.indexOf('Capilar B')!==-1&&desc){desc.textContent='Shampoo 450ml + N\u00e9ctar Capilar 200ml. Cabello fuerte y brillante.';}if(t.indexOf('Cabello & Piel')!==-1&&desc){desc.textContent='Shampoo + N\u00e9ctar + 3 Jabones: C\u00farcuma, Avena & Arroz, Cal\u00e9ndula. Piel y cabello completo.';}if(t.indexOf('Kit Capilar')!==-1&&desc){desc.textContent='Shampoo + N\u00e9ctar + Sebo de Res + 2 Jabones. Rutina premium cuerpo y cabello.';}var kids=card.querySelector('.tc-body').children;for(var j=0;j<kids.length;j++){if(!kids[j].className&&kids[j].tagName==='DIV')kids[j].style.display='none';}});
  fixStarCombos();
  fixInstagram();
  fixAfter();
  fixReelsSection();
  setupComboSlideshow();
  setTimeout(fixStarCombos,500);
  setTimeout(fixStarCombos,1500);
  fixScrollObserver();
  addScrollDirections();
  addShippingBar();
  addFloatingCart();
  addFAQSection();
  addTrustBadges();
  setupEmailPopup();
});

})(); // End IIFE

} // End HOME PAGE MODE




// ============================================================
// PROGRAMADOR MASIVO - Injected by hotfix.js
// ============================================================
(function() {
  'use strict';

  var EDGE = 'https://lvmeswlvszsmvgaasazs.supabase.co/functions/v1/social-api';

  function isMarketingRedes() {
    return window.location.pathname.includes('/dashboard/marketing-redes');
  }

  function api(action, data) {
    return fetch(EDGE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ action: action }, data || {}))
    }).then(function(r) { return r.json(); });
  }

  function injectStyles() {
    if (document.getElementById('prog-styles')) return;
    var s = document.createElement('style');
    s.id = 'prog-styles';
    s.textContent = `
      @keyframes schedSlideIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
      @keyframes schedPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(139,92,246,0.4); } 50% { box-shadow: 0 0 0 8px rgba(139,92,246,0); } }
      .prog-tab-btn {
        padding: 8px 18px !important;
        border-radius: 8px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        border: 1.5px solid rgba(139,92,246,0.5) !important;
        background: linear-gradient(135deg,#1e1b4b,#312e81) !important;
        color: #a5b4fc !important;
        transition: all 0.2s !important;
        margin: 0 4px !important;
        white-space: nowrap !important;
      }
      .prog-tab-btn:hover, .prog-tab-btn.active {
        background: linear-gradient(135deg,#7c3aed,#4f46e5) !important;
        color: #fff !important;
        border-color: #8b5cf6 !important;
        animation: schedPulse 1.5s infinite !important;
      }
      #prog-panel {
        display: none;
        animation: schedSlideIn 0.3s ease;
        background: linear-gradient(135deg,#0f0c29,#1a1a2e,#16213e);
        border-radius: 16px;
        padding: 24px;
        margin: 16px 0;
        border: 1px solid rgba(139,92,246,0.3);
        color: #e2e8f0;
        font-family: 'Inter', sans-serif;
      }
      #prog-panel.visible { display: block !important; }
      .prog-section {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(139,92,246,0.2);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 20px;
      }
      .prog-section-title {
        font-size: 15px;
        font-weight: 700;
        color: #a5b4fc;
        margin: 0 0 16px 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .prog-dropzone {
        border: 2px dashed rgba(139,92,246,0.4);
        border-radius: 12px;
        padding: 40px 20px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
        background: rgba(139,92,246,0.05);
      }
      .prog-dropzone:hover, .prog-dropzone.dragover {
        border-color: #8b5cf6;
        background: rgba(139,92,246,0.12);
      }
      .prog-dropzone-text { color: #94a3b8; font-size: 14px; margin-top: 8px; }
      .prog-img-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px,1fr));
        gap: 12px;
        margin-top: 16px;
      }
      .prog-img-card {
        position: relative;
        border-radius: 10px;
        overflow: hidden;
        border: 2px solid rgba(139,92,246,0.2);
        background: #1e1b4b;
        transition: all 0.2s;
      }
      .prog-img-card.approved { border-color: #10b981 !important; }
      .prog-img-card img { width:100%; aspect-ratio:1; object-fit:cover; display:block; }
      .prog-img-caption {
        padding: 8px;
        font-size: 11px;
        color: #94a3b8;
        max-height: 60px;
        overflow-y: auto;
        line-height: 1.4;
      }
      .prog-img-actions { display:flex; gap:4px; padding:6px 8px; background:rgba(0,0,0,0.3); }
      .prog-btn-approve {
        flex:1; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:600;
        cursor:pointer; border:none; background:#10b981; color:#fff; transition:all 0.2s;
      }
      .prog-btn-approve.approved { background:#6b7280; }
      .prog-btn-remove {
        padding:4px 8px; border-radius:6px; font-size:11px; font-weight:600;
        cursor:pointer; border:none; background:#ef4444; color:#fff;
      }
      .prog-btn {
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .prog-btn-primary { background: linear-gradient(135deg,#7c3aed,#4f46e5); color:#fff; }
      .prog-btn-primary:hover { opacity:0.9; transform:translateY(-1px); }
      .prog-btn-primary:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
      .prog-btn-secondary { background: rgba(139,92,246,0.15); color:#a5b4fc; border:1px solid rgba(139,92,246,0.3); }
      .prog-btn-secondary:hover { background:rgba(139,92,246,0.25); }
      .prog-btn-danger { background:#ef4444; color:#fff; }
      .prog-btn-danger:hover { background:#dc2626; }
      .prog-btn-success { background:#10b981; color:#fff; }
      .prog-actions-row { display:flex; gap:10px; flex-wrap:wrap; margin-top:12px; align-items:center; }
      .prog-spinner {
        display:inline-block; width:16px; height:16px;
        border:2px solid rgba(255,255,255,0.3); border-top-color:#fff;
        border-radius:50%; animation:spin 0.8s linear infinite;
      }
      @keyframes spin { to { transform:rotate(360deg); } }
      .prog-status { font-size:13px; color:#94a3b8; padding:8px 0; }
      .prog-sched-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px,1fr));
        gap: 14px;
        margin-top: 12px;
      }
      .prog-sched-card {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(139,92,246,0.2);
        border-radius: 10px;
        overflow: hidden;
        transition: all 0.2s;
      }
      .prog-sched-card:hover { border-color:rgba(139,92,246,0.5); transform:translateY(-2px); }
      .prog-sched-card img { width:100%; aspect-ratio:16/9; object-fit:cover; display:block; }
      .prog-sched-card-body { padding:10px; }
      .prog-sched-card-caption { font-size:12px; color:#94a3b8; margin-bottom:8px; line-height:1.4; max-height:50px; overflow:hidden; }
      .prog-sched-card-meta { font-size:11px; color:#6366f1; margin-bottom:8px; }
      .prog-sched-card-status {
        display:inline-block; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:700;
        text-transform:uppercase; letter-spacing:0.5px;
      }
      .prog-sched-card-status.pending { background:rgba(251,191,36,0.2); color:#fbbf24; }
      .prog-sched-card-status.published { background:rgba(16,185,129,0.2); color:#10b981; }
      .prog-sched-card-status.failed { background:rgba(239,68,68,0.2); color:#ef4444; }
      .prog-sched-actions { display:flex; gap:6px; margin-top:8px; }
      .prog-sched-btn-del { padding:4px 10px; border-radius:6px; font-size:11px; cursor:pointer; border:none; background:#ef4444; color:#fff; }
      .prog-sched-btn-pub { padding:4px 10px; border-radius:6px; font-size:11px; cursor:pointer; border:none; background:#10b981; color:#fff; }
      .prog-tabs { display:flex; gap:4px; margin-bottom:20px; background:rgba(255,255,255,0.03); border-radius:10px; padding:4px; }
      .prog-sub-tab { padding:8px 16px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; border:none; background:transparent; color:#94a3b8; transition:all 0.2s; }
      .prog-sub-tab.active { background:rgba(139,92,246,0.2); color:#a5b4fc; }
      .prog-empty { text-align:center; padding:40px; color:#4b5563; font-size:14px; }
      .prog-type-select { display:flex; gap:8px; margin-bottom:12px; }
      .prog-type-btn { padding:6px 14px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; border:1px solid rgba(139,92,246,0.3); background:transparent; color:#94a3b8; transition:all 0.2s; }
      .prog-type-btn.active { background:rgba(139,92,246,0.2); color:#a5b4fc; border-color:#8b5cf6; }
      .prog-date-input { background:rgba(255,255,255,0.06); border:1px solid rgba(139,92,246,0.3); border-radius:8px; padding:8px 12px; color:#e2e8f0; font-size:13px; }
      label.prog-label { font-size:12px; color:#94a3b8; display:block; margin-bottom:6px; }
      .prog-alert { padding:10px 14px; border-radius:8px; font-size:13px; margin-bottom:12px; }
      .prog-alert-success { background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); color:#10b981; }
      .prog-alert-error { background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3); color:#ef4444; }
    `;
    document.head.appendChild(s);
  }

  var _prog = {
    images: [],
    subTab: 'upload',
    postType: 'feed',

    init: function() {
      injectStyles();
      this.render();
    },

    render: function() {
      var panel = document.getElementById('prog-panel');
      if (!panel) return;
      panel.innerHTML = this.buildHTML();
      this.bindEvents();
      if (this.subTab === 'queue') this.loadQueue();
    },

    buildHTML: function() {
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
          <h2 style="margin:0;font-size:20px;font-weight:800;background:linear-gradient(135deg,#a5b4fc,#818cf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
            📅 Programador Masivo
          </h2>
          <span style="font-size:12px;color:#6b7280;background:rgba(139,92,246,0.1);padding:4px 12px;border-radius:20px;border:1px solid rgba(139,92,246,0.2);">
            IA · Programación automática
          </span>
        </div>

        <div class="prog-tabs">
          <button class="prog-sub-tab ${this.subTab==='upload'?'active':''}" onclick="window._prog.switchTab('upload')">📤 Subir Imágenes</button>
          <button class="prog-sub-tab ${this.subTab==='queue'?'active':''}" onclick="window._prog.switchTab('queue')">🗓 Cola Programada</button>
        </div>

        ${this.subTab === 'upload' ? this.buildUploadSection() : this.buildQueueSection()}
      `;
    },

    buildUploadSection: function() {
      var imgs = this.images;
      var approvedCount = imgs.filter(function(i){ return i.approved; }).length;
      return `
        <div class="prog-section">
          <div class="prog-section-title">🖼 Sube hasta 10 imágenes</div>

          <div class="prog-type-select">
            <button class="prog-type-btn ${this.postType==='feed'?'active':''}" onclick="window._prog.setType('feed')">📷 Feed Post</button>
            <button class="prog-type-btn ${this.postType==='story'?'active':''}" onclick="window._prog.setType('story')">📱 Story</button>
            <button class="prog-type-btn ${this.postType==='both'?'active':''}" onclick="window._prog.setType('both')">✨ Ambos</button>
          </div>

          <div class="prog-dropzone" id="prog-dropzone" onclick="document.getElementById('prog-file-input').click()">
            <div style="font-size:40px;">📁</div>
            <div class="prog-dropzone-text">Arrastra imágenes aquí o haz clic para seleccionar</div>
            <div style="font-size:11px;color:#6b7280;margin-top:4px;">Máximo 10 imágenes · JPG, PNG, WEBP</div>
          </div>
          <input type="file" id="prog-file-input" multiple accept="image/*" style="display:none" onchange="window._prog.onFiles(this.files)">

          ${imgs.length > 0 ? `
            <div class="prog-img-grid" id="prog-img-grid">
              ${imgs.map(function(img, idx) {
                return `<div class="prog-img-card ${img.approved?'approved':''}" id="prog-card-${idx}">
                  <img src="${img.dataUrl}" alt="img${idx}">
                  <div class="prog-img-caption" id="prog-cap-${idx}">${img.caption || '<em style=color:#6b7280>Analizando con IA...</em>'}</div>
                  <div class="prog-img-actions">
                    <button class="prog-btn-approve ${img.approved?'approved':''}" onclick="window._prog.toggleApprove(${idx})">
                      ${img.approved ? '✓ Aprobado' : '✓ Aprobar'}
                    </button>
                    <button class="prog-btn-remove" onclick="window._prog.removeImage(${idx})">✕</button>
                  </div>
                </div>`;
              }).join('')}
            </div>

            <div class="prog-actions-row">
              <button class="prog-btn prog-btn-primary" id="prog-ai-btn" onclick="window._prog.runAI()">
                🤖 Analizar con IA (${imgs.length} imágenes)
              </button>
              ${approvedCount > 0 ? `
                <div style="display:flex;align-items:center;gap:10px;">
                  <label class="prog-label" style="margin:0;">Fecha inicio:</label>
                  <input type="datetime-local" class="prog-date-input" id="prog-start-date" value="${this.getDefaultDate()}">
                </div>
                <button class="prog-btn prog-btn-success" onclick="window._prog.scheduleApproved()">
                  📅 Programar ${approvedCount} aprobadas
                </button>
                <button class="prog-btn prog-btn-secondary" onclick="window._prog.approveAll()">✓ Aprobar todo</button>
              ` : `
                <button class="prog-btn prog-btn-secondary" onclick="window._prog.approveAll()">✓ Aprobar todo</button>
              `}
              <button class="prog-btn prog-btn-danger" onclick="window._prog.clearImages()">🗑 Limpiar</button>
            </div>
          ` : ''}
          <div class="prog-status" id="prog-status"></div>
        </div>
      `;
    },

    buildQueueSection: function() {
      return `
        <div class="prog-section">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div class="prog-section-title">🗓 Cola de Publicaciones</div>
            <div style="display:flex;gap:8px;">
              <button class="prog-btn prog-btn-primary" onclick="window._prog.publishPending()" style="padding:8px 14px;font-size:12px;">
                ⚡ Publicar pendientes ahora
              </button>
              <button class="prog-btn prog-btn-secondary" onclick="window._prog.loadQueue()" style="padding:8px 14px;font-size:12px;">
                🔄 Actualizar
              </button>
            </div>
          </div>
          <div id="prog-queue-container">
            <div class="prog-empty">⏳ Cargando cola...</div>
          </div>
        </div>
      `;
    },

    getDefaultDate: function() {
      var d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d.toISOString().slice(0,16);
    },

    setType: function(type) {
      this.postType = type;
      this.render();
    },

    switchTab: function(tab) {
      this.subTab = tab;
      this.render();
    },

    onFiles: function(files) {
      var self = this;
      var remaining = 10 - this.images.length;
      var toAdd = Math.min(files.length, remaining);
      var loaded = 0;
      for (var i = 0; i < toAdd; i++) {
        (function(file) {
          var reader = new FileReader();
          reader.onload = function(e) {
            self.images.push({ dataUrl: e.target.result, file: file, caption: '', approved: false, analyzing: false });
            loaded++;
            if (loaded === toAdd) self.render();
          };
          reader.readAsDataURL(file);
        })(files[i]);
      }
      if (files.length > remaining) {
        self.showStatus('Solo se pueden subir 10 imágenes máximo. Se añadieron ' + toAdd + '.', 'error');
      }
    },

    removeImage: function(idx) {
      this.images.splice(idx, 1);
      this.render();
    },

    clearImages: function() {
      this.images = [];
      this.render();
    },

    toggleApprove: function(idx) {
      this.images[idx].approved = !this.images[idx].approved;
      this.render();
    },

    approveAll: function() {
      this.images.forEach(function(img) { img.approved = true; });
      this.render();
    },

    runAI: function() {
      var self = this;
      var btn = document.getElementById('prog-ai-btn');
      if (btn) { btn.disabled = true; btn.innerHTML = '<span class="prog-spinner"></span> Analizando...'; }
      self.showStatus('Enviando imágenes a la IA... esto puede tomar unos segundos.', '');

      // Build base64 list
      var imgData = this.images.map(function(img, idx) {
        return { index: idx, base64: img.dataUrl.split(',')[1], type: img.file ? img.file.type : 'image/jpeg' };
      });

      api('ai_analyze_images', { images: imgData, post_type: self.postType })
        .then(function(res) {
          if (res.captions && Array.isArray(res.captions)) {
            res.captions.forEach(function(cap, idx) {
              if (self.images[idx]) {
                self.images[idx].caption = cap.caption || cap.text || cap;
              }
            });
          } else if (res.error) {
            // Fallback: generate generic captions
            self.images.forEach(function(img, idx) {
              if (!img.caption) {
                img.caption = '✨ Publicación #' + (idx+1) + ' · Descubre nuestra nueva colección. Calidad y estilo para ti. 🛍️ #sanate #bienestar #salud';
              }
            });
          }
          self.render();
          self.showStatus('✅ IA completada. Revisa y aprueba los textos generados.', 'success');
        })
        .catch(function(err) {
          // Fallback captions on error
          self.images.forEach(function(img, idx) {
            if (!img.caption) {
              img.caption = '✨ Publicación #' + (idx+1) + ' · Descubre lo mejor para tu bienestar. Calidad garantizada. 🌿 #sanate #natural #salud';
            }
          });
          self.render();
          self.showStatus('⚠️ IA no disponible. Se generaron textos de ejemplo. Puedes editarlos.', 'error');
        });
    },

    scheduleApproved: function() {
      var self = this;
      var approved = this.images.filter(function(i){ return i.approved; });
      if (approved.length === 0) { self.showStatus('No hay imágenes aprobadas.', 'error'); return; }

      var startDateEl = document.getElementById('prog-start-date');
      var startDate = startDateEl ? startDateEl.value : this.getDefaultDate();

      self.showStatus('📅 Programando ' + approved.length + ' publicaciones...', '');

      var posts = approved.map(function(img, idx) {
        // Space posts 4 hours apart
        var d = new Date(startDate);
        d.setHours(d.getHours() + idx * 4);
        return {
          image_base64: img.dataUrl.split(',')[1],
          image_type: img.file ? img.file.type : 'image/jpeg',
          caption: img.caption,
          post_type: self.postType,
          scheduled_time: d.toISOString()
        };
      });

      api('create_schedule_batch', { posts: posts })
        .then(function(res) {
          if (res.success || res.created) {
            self.showStatus('✅ ' + approved.length + ' publicaciones programadas correctamente.', 'success');
            self.clearImages();
            setTimeout(function() { self.switchTab('queue'); }, 1500);
          } else {
            self.showStatus('❌ Error al programar: ' + (res.error || JSON.stringify(res)), 'error');
          }
        })
        .catch(function(err) {
          self.showStatus('❌ Error de red: ' + err.message, 'error');
        });
    },

    loadQueue: function() {
      var self = this;
      var container = document.getElementById('prog-queue-container');
      if (container) container.innerHTML = '<div class="prog-empty">⏳ Cargando...</div>';

      api('get_schedule_queue', {})
        .then(function(res) {
          var posts = res.posts || res.queue || res.data || [];
          if (!container) container = document.getElementById('prog-queue-container');
          if (!container) return;

          if (posts.length === 0) {
            container.innerHTML = '<div class="prog-empty">📭 No hay publicaciones programadas.<br><small style="color:#6b7280">Sube imágenes en la pestaña "Subir" para comenzar.</small></div>';
            return;
          }

          container.innerHTML = `
            <div style="font-size:13px;color:#94a3b8;margin-bottom:12px;">
              ${posts.length} publicación(es) en cola
            </div>
            <div class="prog-sched-grid">
              ${posts.map(function(p) {
                var d = p.scheduled_time ? new Date(p.scheduled_time).toLocaleString('es-MX') : 'Sin fecha';
                var statusClass = p.status || 'pending';
                var statusLabel = statusClass === 'published' ? '✅ Publicado' : statusClass === 'failed' ? '❌ Fallido' : '⏳ Pendiente';
                return `<div class="prog-sched-card">
                  ${p.image_url ? `<img src="${p.image_url}" alt="post">` : `<div style="width:100%;aspect-ratio:16/9;background:#1e1b4b;display:flex;align-items:center;justify-content:center;font-size:30px;">📷</div>`}
                  <div class="prog-sched-card-body">
                    <div class="prog-sched-card-caption">${p.caption || ''}</div>
                    <div class="prog-sched-card-meta">🕐 ${d}</div>
                    <div>
                      <span class="prog-sched-card-status ${statusClass}">${statusLabel}</span>
                      <span style="font-size:10px;color:#6b7280;margin-left:6px;">${p.post_type || 'feed'}</span>
                    </div>
                    ${p.status !== 'published' ? `<div class="prog-sched-actions">
                      <button class="prog-sched-btn-pub" onclick="window._prog.publishSingle('${p.id}')">⚡ Publicar</button>
                      <button class="prog-sched-btn-del" onclick="window._prog.deletePost('${p.id}')">🗑 Borrar</button>
                    </div>` : ''}
                  </div>
                </div>`;
              }).join('')}
            </div>
          `;
        })
        .catch(function(err) {
          if (container) container.innerHTML = '<div class="prog-empty" style="color:#ef4444">❌ Error cargando cola: ' + err.message + '</div>';
        });
    },

    deletePost: function(id) {
      var self = this;
      if (!confirm('¿Eliminar esta publicación programada?')) return;
      api('delete_scheduled_post', { post_id: id })
        .then(function(res) { self.loadQueue(); })
        .catch(function(err) { alert('Error: ' + err.message); });
    },

    publishSingle: function(id) {
      var self = this;
      self.showStatus('⚡ Publicando...', '');
      api('publish_pending_scheduled', { post_id: id })
        .then(function(res) {
          self.showStatus(res.success ? '✅ Publicado exitosamente.' : '❌ ' + (res.error || 'Error'), res.success ? 'success' : 'error');
          self.loadQueue();
        })
        .catch(function(err) { self.showStatus('❌ Error: ' + err.message, 'error'); });
    },

    publishPending: function() {
      var self = this;
      self.showStatus('⚡ Publicando todos los pendientes...', '');
      api('publish_pending_scheduled', {})
        .then(function(res) {
          var msg = res.published ? '✅ Publicadas: ' + res.published + ' posts.' : (res.error || JSON.stringify(res));
          self.showStatus(msg, res.published ? 'success' : 'error');
          self.loadQueue();
        })
        .catch(function(err) { self.showStatus('❌ Error: ' + err.message, 'error'); });
    },

    showStatus: function(msg, type) {
      var el = document.getElementById('prog-status');
      if (!el) return;
      var cls = type === 'success' ? 'prog-alert-success' : type === 'error' ? 'prog-alert-error' : '';
      el.innerHTML = `<div class="prog-alert ${cls}">${msg}</div>`;
    },

    bindEvents: function() {
      var dz = document.getElementById('prog-dropzone');
      if (!dz) return;
      var self = this;
      dz.addEventListener('dragover', function(e) { e.preventDefault(); dz.classList.add('dragover'); });
      dz.addEventListener('dragleave', function() { dz.classList.remove('dragover'); });
      dz.addEventListener('drop', function(e) {
        e.preventDefault();
        dz.classList.remove('dragover');
        self.onFiles(e.dataTransfer.files);
      });
    }
  };

  window._prog = _prog;

  // ── Tab injection ──────────────────────────────────────────
  var _injected = false;

  function tryInject() {
    if (!isMarketingRedes()) return;

    // Find the tab bar (look for the tab buttons in the React component)
    var tabBtns = document.querySelectorAll('[class*="tab"], button[class*="Tab"]');
    var tabBar = null;

    // Look for the conexiones/autopublicar tab bar specifically
    var allBtns = document.querySelectorAll('button');
    for (var i = 0; i < allBtns.length; i++) {
      var txt = allBtns[i].textContent.trim().toLowerCase();
      if (txt === 'conexiones' || txt === 'autopublicador' || txt === 'historial' || txt === 'reglas anti-ban') {
        tabBar = allBtns[i].parentElement;
        break;
      }
    }

    if (!tabBar) return;

    // Check if already injected
    if (document.getElementById('prog-tab-btn')) return;

    // Create Programador tab button
    var progBtn = document.createElement('button');
    progBtn.id = 'prog-tab-btn';
    progBtn.className = 'prog-tab-btn';
    progBtn.textContent = '📅 Programador';
    progBtn.onclick = function() {
      // Hide other content (find the tab content container)
      var panel = document.getElementById('prog-panel');
      var isVisible = panel && panel.classList.contains('visible');

      // Toggle panel
      if (isVisible) {
        panel.classList.remove('visible');
        progBtn.classList.remove('active');
      } else {
        // Show panel
        if (!panel) {
          // Create and insert panel after the tab bar
          panel = document.createElement('div');
          panel.id = 'prog-panel';
          var tabBarParent = tabBar.parentElement;
          tabBarParent.insertAdjacentElement('afterend', panel);
        }
        panel.classList.add('visible');
        progBtn.classList.add('active');
        _prog.init();

        // Scroll to panel
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    tabBar.appendChild(progBtn);
    _injected = true;
  }

  // Re-check on SPA navigation
  var _lastPath = window.location.pathname;
  setInterval(function() {
    var curPath = window.location.pathname;
    if (curPath !== _lastPath) {
      _lastPath = curPath;
      _injected = false;
      var old = document.getElementById('prog-panel');
      if (old) old.remove();
    }
    if (!_injected && isMarketingRedes()) {
      tryInject();
    }
  }, 800);

  // Initial injection attempt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(tryInject, 1000); });
  } else {
    setTimeout(tryInject, 1000);
  }

})();

/* ===== COMBO IMAGE FIX - Auto-assign correct images to each combo ===== */
(function fixComboImages() {
  var map = {
    'x3 Jabones a Elecci\u00f3n': '/ai-images/ecom/combo1_jabones.png',
    'Secreto Japon\u00e9s': '/ai-images/ecom/combo4_secreto.png',
    'Piel Sensible': '/ai-images/ecom/combo3_piel.png',
    'Mente + Piel': '/ai-images/ecom/melena_hero1.png',
    'Estrella Total': '/ai-images/ecom/combo5_doble.png',
    'Polen Premium': '/ai-images/ecom/Polen2_opt.jpg',
    'Pack Familiar': '/ai-images/ecom/combo6_jabones6.png',
    'Power Mental': '/ai-images/ecom/melena_oferta1.png',
    'M\u00e1xima S\u00c1NATE': '/ai-images/ecom/sebo_beneficios1.png',
    'Capilar B\u00e1sico': '/ai-images/ecom/sebo_lifestyle1.png',
    'Cabello & Piel': '/ai-images/ecom/calendula_hero2.png',
    'Kit Capilar Premium': '/ai-images/ecom/sebo_oferta1.png',
    'Duo Sebo de Oso': '/ai-images/ecom/sebo_promo1.png',
    'Ritual Nocturno': '/ai-images/ecom/calendula_hero1.png'
  };

  function applyImages() {
    var cards = document.querySelectorAll('.so2-card');
    if (!cards.length) return false;
    cards.forEach(function(card) {
      var h3 = card.querySelector('h3');
      if (!h3) return;
      var name = h3.textContent.trim();
      if (map[name]) {
        var img = card.querySelector('.so2-hero img');
        if (img) {
          img.src = map[name];
          img.style.objectFit = 'cover';
        }
      }
    });
    return true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(applyImages, 500);
      setTimeout(applyImages, 2000);
    });
  } else {
    setTimeout(applyImages, 500);
    setTimeout(applyImages, 2000);
  }

  var obs = new MutationObserver(function() { applyImages(); });
  obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
  setTimeout(function() { obs.disconnect(); }, 15000);
})();
/* ===== END COMBO IMAGE FIX ===== */


/* rescue.js - sanate store emergency function restoration */
(function(){
  'use strict';
  function fmt(n){ return '$' + Number(n).toLocaleString('es-CO'); }
  if(typeof window.formatPrice==='undefined') window.formatPrice = fmt;

  var CART_KEY = 'sanate_cart_v2';
  function loadCart(){
    try{ return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch(e){ return []; }
  }
  function saveCart(items){ localStorage.setItem(CART_KEY, JSON.stringify(items)); }

  function renderCart(){
    var items = loadCart();
    var crtItems = document.getElementById('crtItems');
    var crtEmpty = document.getElementById('crtEmpty');
    var crtFoot  = document.getElementById('crtFoot');
    if(!crtItems) return;
    if(items.length === 0){
      crtItems.innerHTML = ''; crtItems.style.display = 'none';
      if(crtEmpty) crtEmpty.style.display = '';
      if(crtFoot)  crtFoot.style.display = 'none';
      updateCartBadge(0);
      return;
    }
    if(crtEmpty) crtEmpty.style.display = 'none';
    if(crtFoot)  crtFoot.style.display = '';
    var html = '';
    var total = 0;
    items.forEach(function(item, idx){
      var subtotal = item.price * (item.qty || 1);
      total += subtotal;
      html += '<div class="citem" data-idx="'+idx+'" style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid rgba(0,0,0,0.08);align-items:center">';
      html += '<img src="'+(item.img||'')+'" alt="'+item.name+'" style="width:64px;height:64px;object-fit:cover;border-radius:8px;background:#f0f0f0">';
      html += '<div style="flex:1;min-width:0">';
      html += '<div style="font-weight:600;font-size:14px;line-height:1.3">'+item.name+'</div>';
      if(item.desc) html += '<div style="font-size:12px;color:#666;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+item.desc+'</div>';
      html += '<div style="display:flex;align-items:center;gap:8px;margin-top:6px">';
      html += '<button onclick="changeQty('+idx+',-1)" style="width:26px;height:26px;border:1px solid #ddd;background:#fff;border-radius:6px;cursor:pointer;font-size:14px">\u2212</button>';
      html += '<span style="font-size:14px;font-weight:500;min-width:18px;text-align:center">'+(item.qty||1)+'</span>';
      html += '<button onclick="changeQty('+idx+',1)" style="width:26px;height:26px;border:1px solid #ddd;background:#fff;border-radius:6px;cursor:pointer;font-size:14px">+</button>';
      html += '<span style="margin-left:auto;font-weight:700;color:#07192e">'+fmt(subtotal)+'</span>';
      html += '</div></div>';
      html += '<button onclick="removeItem('+idx+')" style="background:none;border:none;color:#999;cursor:pointer;font-size:18px;padding:4px" title="Eliminar">\u00D7</button>';
      html += '</div>';
    });
    crtItems.style.display = 'flex'; crtItems.style.flexDirection = 'column';
    crtItems.innerHTML = html;
    var totalEl = crtFoot ? crtFoot.querySelector('.ctsubt span:last-child, .cart-total, #cartTotal') : null;
    if(!totalEl){
      var spans = crtFoot ? crtFoot.querySelectorAll('span') : [];
      for(var i=0;i<spans.length;i++){
        if(spans[i].textContent.indexOf('$')!==-1 || spans[i].className.indexOf('total')!==-1){
          totalEl = spans[i]; break;
        }
      }
    }
    if(totalEl) totalEl.textContent = fmt(total);
    updateCartBadge(items.length);
  }

  function updateCartBadge(count){
    var badges = document.querySelectorAll('.cart-count, .cart-badge, [class*="cart"] [class*="count"], [class*="cart"] [class*="badge"]');
    badges.forEach(function(b){ b.textContent = count; if(count>0) b.style.display=''; else b.style.display='none'; });
    var shipBar = document.querySelector('.ship-bar');
    if(shipBar){
      var badge = shipBar.querySelector('span[style*="background"]') || shipBar.querySelector('.cbadge');
      if(badge){ badge.textContent = count; badge.style.display = count > 0 ? '' : 'none'; }
    }
  }
  window.addItem = function(product){
    if(!product || !product.id) return;
    var items = loadCart();
    var existing = null;
    for(var i=0;i<items.length;i++){
      if(items[i].id === product.id){ existing = items[i]; break; }
    }
    if(existing){
      existing.qty = (existing.qty||1) + 1;
    } else {
      product.qty = 1;
      items.push(product);
    }
    saveCart(items);
    renderCart();
    openCartDrawer();
    if(event && event.target){
      var btn = event.target.closest('button') || event.target;
      var orig = btn.innerHTML;
      btn.innerHTML = '\u2713';
      btn.style.background = '#2ecc71';
      btn.style.color = '#fff';
      setTimeout(function(){ btn.innerHTML = orig; btn.style.background = ''; btn.style.color = ''; }, 800);
    }
  };

  window.changeQty = function(idx, delta){
    var items = loadCart();
    if(!items[idx]) return;
    items[idx].qty = (items[idx].qty||1) + delta;
    if(items[idx].qty < 1) items.splice(idx, 1);
    saveCart(items);
    renderCart();
  };

  window.removeItem = function(idx){
    var items = loadCart();
    items.splice(idx, 1);
    saveCart(items);
    renderCart();
  };

  function openCartDrawer(){
    var ov = document.getElementById('crtOv');
    if(!ov) return;
    ov.style.display = 'flex';
    ov.style.opacity = '0';
    ov.offsetHeight;
    ov.style.transition = 'opacity 0.3s';
    ov.style.opacity = '1';
    document.body.style.overflow = 'hidden';
    var drw = ov.querySelector('.crt-drw');
    if(drw){
      drw.style.transform = 'translateX(100%)';
      drw.style.transition = 'transform 0.35s cubic-bezier(0.22,1,0.36,1)';
      drw.offsetHeight;
      drw.style.transform = 'translateX(0)';
    }
  }

  function closeCartDrawer(){
    var ov = document.getElementById('crtOv');
    if(!ov) return;
    var drw = ov.querySelector('.crt-drw');
    if(drw){ drw.style.transform = 'translateX(100%)'; }
    ov.style.opacity = '0';
    setTimeout(function(){
      ov.style.display = 'none';
      document.body.style.overflow = '';
    }, 350);
  }

  window.openCart     = openCartDrawer;
  window.closeCartOv  = closeCartDrawer;
  window.closeCart     = closeCartDrawer;
  window.toggleCart    = function(){
    var ov = document.getElementById('crtOv');
    if(ov && (ov.style.display === 'flex' || ov.style.display === 'block')) closeCartDrawer();
    else openCartDrawer();
  };

  var crtOv = document.getElementById('crtOv');
  if(crtOv){
    crtOv.addEventListener('click', function(e){
      if(e.target === crtOv || e.target.classList.contains('crt-x')) closeCartDrawer();
    });
  }

  window.openCheckout = function(){
    var chkOv = document.getElementById('chkOv');
    if(chkOv){ chkOv.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
  };
  window.closeCheckout = function(){
    var chkOv = document.getElementById('chkOv');
    if(chkOv){ chkOv.style.display = 'none'; document.body.style.overflow = ''; }
  };
  window.selPay = function(method){
    document.querySelectorAll('.pay-opt').forEach(function(el){ el.classList.remove('active'); });
    if(event && event.target){
      var opt = event.target.closest('.pay-opt');
      if(opt) opt.classList.add('active');
    }
    var payInput = document.getElementById('payMethod');
    if(payInput) payInput.value = method;
  };
  window.sendWA = function(msg){
    var phone = '573001234567';
    var waLink = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(msg || '');
    window.open(waLink, '_blank');
  };

  window.submitOrder = function(){
    var items = loadCart();
    if(items.length === 0){ alert('Tu carrito est\u00E1 vac\u00EDo'); return; }
    var nameEl = document.getElementById('custName') || document.getElementById('oName');
    var phoneEl = document.getElementById('custPhone') || document.getElementById('oPhone');
    var name = nameEl ? nameEl.value : '';
    var phone = phoneEl ? phoneEl.value : '';
    if(!name || !phone){ alert('Por favor completa tu nombre y tel\u00E9fono'); return; }
    var total = 0;
    var msg = '\uD83D\uDED2 *Nuevo Pedido SANATE*\n\n';
    msg += '\uD83D\uDC64 ' + name + '\n\uD83D\uDCF1 ' + phone + '\n\n';
    items.forEach(function(item){
      var sub = item.price * (item.qty||1);
      total += sub;
      msg += '\u2022 ' + item.name + ' x' + (item.qty||1) + ' \u2014 ' + fmt(sub) + '\n';
    });
    msg += '\n\uD83D\uDCB0 *Total: ' + fmt(total) + '*';
    var storePhone = document.querySelector('[href*="wa.me"]');
    var waNum = '573000000000';
    if(storePhone){
      var match = storePhone.href.match(/wa\.me\/(\d+)/);
      if(match) waNum = match[1];
    }
    window.open('https://wa.me/' + waNum + '?text=' + encodeURIComponent(msg), '_blank');
  };

  window.chgVar = function(comboId, variant, direction){
    var combo = document.querySelector('[data-combo="'+comboId+'"]') || document.getElementById(comboId);
    if(!combo) return;
    var varEls = combo.querySelectorAll('[data-variant]');
    if(varEls.length === 0) return;
    var current = combo.querySelector('[data-variant].active') || varEls[0];
    var idx = Array.from(varEls).indexOf(current);
    idx += direction;
    if(idx < 0) idx = varEls.length - 1;
    if(idx >= varEls.length) idx = 0;
    varEls.forEach(function(v){ v.classList.remove('active'); v.style.display = 'none'; });
    varEls[idx].classList.add('active');
    varEls[idx].style.display = '';
  };
  window.addVarItem = function(product){ window.addItem(product); };
  window.openQSO = function(){
    var el = document.getElementById('quOv');
    if(el){ el.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
  };
  window.closeQSO = function(){
    var el = document.getElementById('quOv');
    if(el){ el.style.display = 'none'; document.body.style.overflow = ''; }
  };
  window.openLoginModal = function(){
    var el = document.getElementById('loginOv');
    if(el){ el.style.display = 'flex'; }
  };
  window.closeLoginModal = function(){
    var el = document.getElementById('loginOv');
    if(el){ el.style.display = 'none'; }
  };
  window.switchLoginTab = function(tab){
    document.querySelectorAll('.login-tab').forEach(function(t){ t.classList.remove('active'); });
    document.querySelectorAll('.login-form').forEach(function(f){ f.style.display = 'none'; });
    var tabEl = document.querySelector('[data-tab="'+tab+'"]');
    var formEl = document.getElementById('form-'+tab);
    if(tabEl) tabEl.classList.add('active');
    if(formEl) formEl.style.display = '';
  };
  window.openProveedores = function(){
    var el = document.getElementById('provOv');
    if(el){ el.style.display = 'flex'; }
  };
  window.closeProveedores = function(){
    var el = document.getElementById('provOv');
    if(el){ el.style.display = 'none'; }
  };
  window.openProvCatalogGate = function(){ window.openProveedores(); };
  window.addProvCart = function(id, name, price){ console.log('Prov cart:', id, name, price); };
  window.sendProviderQuote = function(){};
  window.handleLogin = function(e){ if(e) e.preventDefault(); };
  window.handleSocialLogin = function(provider){ console.log('Social login:', provider); };
  window.handleRegister = function(e){ if(e) e.preventDefault(); };
  window.handleLogout = function(){};

  window.toggleNavMenu = function(){
    var nav = document.getElementById('navDropdown') || document.querySelector('.nav-dropdown');
    if(!nav) return;
    if(nav.style.opacity === '1'){
      nav.style.opacity = '0';
      nav.style.pointerEvents = 'none';
    } else {
      nav.style.opacity = '1';
      nav.style.pointerEvents = 'auto';
    }
  };
  window.gs = function(){};

  function fixHeroAnimations(){
    if(typeof gsap === 'undefined') return;
    var hero = document.querySelector('.hero');
    if(!hero) return;
    // Fix CSS animations stuck at opacity:0 (fadeSlideUp etc)
    hero.querySelectorAll('*').forEach(function(el){
      var s = window.getComputedStyle(el);
      if(s.animationName && s.animationName !== 'none' && s.opacity === '0'){
        el.style.animation = 'none';
        el.style.opacity = '1';
        el.style.transform = 'none';
      }
    });
    var stuck = [];
    hero.querySelectorAll('*').forEach(function(el){
      var s = window.getComputedStyle(el);
      if(s.opacity === '0' && el.offsetHeight > 10 && el.offsetWidth > 10){
        stuck.push(el);
      }
    });
    if(stuck.length > 0){
      stuck.forEach(function(el){ gsap.killTweensOf(el); });
      gsap.to(stuck, {
        opacity: 1, y: 0, duration: 0.8, stagger: 0.15,
        ease: 'power2.out', clearProps: 'opacity,transform'
      });
    }
    var shimmer = hero.querySelector('.hero-shimmer');
    if(shimmer){
      gsap.to(shimmer, {opacity: 0.3, duration: 2, repeat: -1, yoyo: true, ease: 'sine.inOut'});
    }
  }

  function initScrollAnimations(){
    if(typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);
    var sections = document.querySelectorAll('section');
    sections.forEach(function(sec){
      if(sec.classList.contains('hero')) return;
      var headings = sec.querySelectorAll('h2, h3');
      headings.forEach(function(h){
        gsap.fromTo(h,
          {opacity: 0, y: 30},
          {opacity: 1, y: 0, duration: 0.7, ease: 'power2.out',
           scrollTrigger: {trigger: h, start: 'top 85%', once: true}}
        );
      });
      var cards = sec.querySelectorAll('[class*="card"], [class*="prod"], [class*="combo"], [class*="oferta"]');
      if(cards.length > 0){
        gsap.fromTo(cards,
          {opacity: 0, y: 40, scale: 0.95},
          {opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out',
           scrollTrigger: {trigger: sec, start: 'top 80%', once: true}}
        );
      }
      var btns = sec.querySelectorAll('.btn, [class*="cta"], a[class*="btn"]');
      btns.forEach(function(btn){
        gsap.fromTo(btn,
          {opacity: 0, y: 20},
          {opacity: 1, y: 0, duration: 0.5, ease: 'power2.out',
           scrollTrigger: {trigger: btn, start: 'top 90%', once: true}}
        );
      });
    });
    var hero = document.querySelector('.hero');
    if(hero){
      gsap.to(hero, {
        backgroundPositionY: '30%', ease: 'none',
        scrollTrigger: {trigger: hero, start: 'top top', end: 'bottom top', scrub: true}
      });
    }
    var stats = document.querySelectorAll('.hero [class*="stat"], .hero [class*="count"]');
    stats.forEach(function(stat){
      gsap.fromTo(stat,
        {opacity: 0, scale: 0.8},
        {opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)',
         scrollTrigger: {trigger: stat, start: 'top 90%', once: true}}
      );
    });
  }

  function fixEmailPopup(){
    var pop = document.querySelector('.email-pop-overlay');
    if(pop && pop.classList.contains('show')){
      pop.style.opacity = '0';
      pop.style.pointerEvents = 'none';
      setTimeout(function(){
        pop.style.transition = 'opacity 0.5s';
        pop.style.opacity = '1';
        pop.style.pointerEvents = 'auto';
      }, 15000);
    }
  }

  function init(){
    renderCart();
    fixHeroAnimations();
    fixEmailPopup();
    setTimeout(initScrollAnimations, 500);
    setTimeout(fixHeroAnimations, 1500);
    setTimeout(fixHeroAnimations, 3000);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* PATCH: Update Polen card + add 2 Polen card */
(function(){
  function patchPolen(){
    var cards=document.querySelectorAll('.so2-card');
    cards.forEach(function(c){
      var h3=c.querySelector('h3');
      if(!h3)return;
      if(h3.textContent.indexOf('Col\u00e1geno')>-1 && h3.textContent.indexOf('Polen')>-1){
        h3.textContent='Polen Multifloral \u00d7 90';
        var tag=c.querySelector('.so2-tag');
        if(tag)tag.innerHTML='\uD83D\uDC9B Energ\u00eda Natural';
        var desc=c.querySelector('.so2-desc');
        if(desc)desc.textContent='Polen Multifloral Premium 500mg \u00d7 90 c\u00e1psulas. Energ\u00eda, amino\u00e1cidos, vitaminas y sistema inmune.';
        var cartBtn=c.querySelector('.so2-cta');
        if(cartBtn){
          var oc=cartBtn.getAttribute('onclick')||'';
          oc=oc.replace('Polen & Col\u00e1geno','Polen Multifloral');
          cartBtn.setAttribute('onclick',oc);
        }
      }
    });
  }
  setTimeout(patchPolen,2000);
  setTimeout(patchPolen,5000);
})();


/* ============================================================
   AUTOPUBLICADOR PRO v2 (ap2) — injected by hotfix.js
   ============================================================ */

/* HIDE OLD AUTOPUBLICADOR REACT PANEL - CSS hide only, no DOM removal (avoids React reconciler crash) */
(function() {
  function hideOldAutopub() {
    var mr = document.querySelector('.marketing-redes');
    if (!mr) return;
    Array.from(mr.children).forEach(function(kid) {
      // Skip our injected panels
      if (kid.id === 're-panel-wrapper' || kid.id === 'ap2-panel') return;
      // Skip structural elements
      if (kid.tagName === 'H2' || kid.tagName === 'P') return;
      // Skip the tab bar (contains tab buttons with "Conexiones")
      if (kid.textContent && kid.textContent.indexOf('Conexiones') !== -1 &&
          kid.querySelector('button')) return;
      // Hide old autopublicador panel by detecting its content keywords
      var txt = kid.textContent || '';
      if (txt.indexOf('Crear Publicaci') !== -1 ||
          txt.indexOf('Publicar Ahora') !== -1 ||
          txt.indexOf('URL de Imagen') !== -1 ||
          txt.indexOf('Precio (COP)') !== -1) {
        kid.style.setProperty('display', 'none', 'important');
        kid.style.setProperty('visibility', 'hidden', 'important');
        kid.style.setProperty('pointer-events', 'none', 'important');
        kid.setAttribute('data-ap2-hidden', '1');
      }
    });
  }

  // Run immediately
  hideOldAutopub();

  // Re-run on React re-renders — hide only, never remove (avoids removeChild crash)
  var _obs = new MutationObserver(function() {
    clearTimeout(window.__hd_old_ap_timer);
    window.__hd_old_ap_timer = setTimeout(hideOldAutopub, 50);
  });
  _obs.observe(document.body, { childList: true, subtree: true });
})();

/* AUTOPUBLICADOR MASIVO v2 - Sanate Store */
(function () {
  'use strict';

  var EDGE = 'https://lvmeswlvszsmvgaasazs.supabase.co/functions/v1/social-api';

  /* ── helpers ─────────────────────────────────────────── */
  function getApAuthToken() {
    try {
      for (var k of Object.keys(localStorage)) {
        if ((k.includes('auth-token') || k.includes('supabase.auth') || k.startsWith('sb-')) && k.includes('auth')) {
          var val = JSON.parse(localStorage.getItem(k) || '{}');
          var token = (val && (val.access_token || (val.session && val.session.access_token)));
          if (token && token.length > 50) return token;
        }
      }
    } catch (e) {}
    return window.__SANATE_ANON || '';
  }

  function api(action, data) {
    var payload = { action: action };
    if (data) { var ks = Object.keys(data); for (var i = 0; i < ks.length; i++) payload[ks[i]] = data[ks[i]]; }
    var token = getApAuthToken();
    var hdrs = { 'Content-Type': 'application/json' };
    if (token) { hdrs['Authorization'] = 'Bearer ' + token; hdrs['apikey'] = token; }
    return fetch(EDGE, { method: 'POST', headers: hdrs, body: JSON.stringify(payload) }).then(function (r) { return r.json(); });
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function isMarketingRedes() {
    return window.location.pathname.indexOf('/dashboard/marketing-redes') !== -1;
  }

  /* ── Smart schedule: next available slot ─────────────── */
  // Peak hours: 8am, 12pm, 6pm, 9pm — min gap 5h
  var PEAK_HOURS = [8, 12, 18, 21];
  var MIN_GAP_H = 5;

  function getNextSlot(existingISOs) {
    var now = new Date();
    var usedTimes = (existingISOs || []).map(function (s) { return new Date(s).getTime(); }).filter(function (t) { return !isNaN(t); }).sort(function (a, b) { return a - b; });

    // Try each peak hour slot starting from now+1h
    var candidate = new Date(now.getTime() + 60 * 60 * 1000);

    for (var attempts = 0; attempts < 200; attempts++) {
      var ct = candidate.getTime();
      var conflict = false;
      for (var i = 0; i < usedTimes.length; i++) {
        if (Math.abs(usedTimes[i] - ct) < MIN_GAP_H * 3600 * 1000) { conflict = true; break; }
      }
      if (!conflict) {
        // Snap to nearest peak hour on that day if within 2h
        var h = candidate.getHours();
        for (var j = 0; j < PEAK_HOURS.length; j++) {
          if (Math.abs(h - PEAK_HOURS[j]) <= 2) {
            var snapped = new Date(candidate);
            snapped.setHours(PEAK_HOURS[j], 0, 0, 0);
            var snapT = snapped.getTime();
            var snapConflict = false;
            for (var k = 0; k < usedTimes.length; k++) {
              if (Math.abs(usedTimes[k] - snapT) < MIN_GAP_H * 3600 * 1000) { snapConflict = true; break; }
            }
            if (!snapConflict && snapT > now.getTime()) { return snapped; }
          }
        }
        return candidate;
      }
      candidate = new Date(candidate.getTime() + 60 * 60 * 1000); // +1h
    }
    return new Date(now.getTime() + MIN_GAP_H * 3600 * 1000);
  }

  function isoToLocal(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  /* ── Styles ───────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('ap2-styles')) return;
    var s = document.createElement('style');
    s.id = 'ap2-styles';
    s.textContent = [
      /* layout */
      '#ap2-panel{display:none;font-family:Inter,system-ui,sans-serif;color:#e2e8f0;background:linear-gradient(135deg,#0f0c29,#1a1a2e,#16213e);border-radius:16px;padding:24px;margin:16px 0;border:1px solid rgba(139,92,246,.3);box-sizing:border-box;animation:ap2SlideIn .3s ease}',
      '#ap2-panel *{box-sizing:border-box}',
      '#ap2-panel.visible{display:block!important}',
      '@keyframes ap2SlideIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}',
      '@keyframes ap2Spin{to{transform:rotate(360deg)}}',

      /* header */
      '.ap2-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px}',
      '.ap2-title{font-size:20px;font-weight:800;background:linear-gradient(135deg,#a78bfa,#60a5fa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0}',
      '.ap2-badge{font-size:11px;color:#94a3b8;background:rgba(139,92,246,.1);padding:3px 10px;border-radius:20px;border:1px solid rgba(139,92,246,.2)}',

      /* section */
      '.ap2-section{background:rgba(255,255,255,.03);border:1px solid rgba(139,92,246,.15);border-radius:12px;padding:18px;margin-bottom:16px}',
      '.ap2-section-title{font-size:13px;font-weight:700;color:#a78bfa;margin:0 0 14px 0;display:flex;align-items:center;gap:8px;text-transform:uppercase;letter-spacing:.5px}',
      '.ap2-label{font-size:12px;color:#94a3b8;margin-bottom:6px;font-weight:500;display:block}',

      /* platform selector — radio style */
      '.ap2-platforms{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:0}',
      '.ap2-platform-btn{padding:10px 12px;border-radius:10px;border:1.5px solid rgba(139,92,246,.25);background:rgba(139,92,246,.05);color:#94a3b8;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s;text-align:left;display:flex;align-items:center;gap:8px}',
      '.ap2-platform-btn:hover{border-color:rgba(139,92,246,.5);color:#c4b5fd}',
      '.ap2-platform-btn.selected{border-color:#8b5cf6;background:linear-gradient(135deg,rgba(124,58,237,.2),rgba(79,70,229,.15));color:#fff}',
      '.ap2-platform-btn .ap2-platform-icon{font-size:18px;flex-shrink:0}',
      '.ap2-platform-btn .ap2-platform-text{display:flex;flex-direction:column}',
      '.ap2-platform-btn .ap2-platform-name{font-size:12px;font-weight:700;line-height:1.2}',
      '.ap2-platform-btn .ap2-platform-sub{font-size:10px;opacity:.7;font-weight:400}',
      '.ap2-platform-info{margin-top:10px;padding:8px 12px;background:rgba(139,92,246,.08);border-radius:8px;font-size:11px;color:#94a3b8;display:none}',
      '.ap2-platform-info.visible{display:block}',

      /* image upload */
      '.ap2-dropzone{border:2px dashed rgba(139,92,246,.35);border-radius:12px;padding:32px 16px;text-align:center;cursor:pointer;transition:all .2s;background:rgba(139,92,246,.04)}',
      '.ap2-dropzone:hover,.ap2-dropzone.dragover{border-color:#8b5cf6;background:rgba(139,92,246,.1)}',
      '.ap2-img-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;margin-top:12px}',
      '.ap2-img-thumb{position:relative;border-radius:8px;overflow:hidden;aspect-ratio:1;background:#1e1b4b;border:1.5px solid rgba(139,92,246,.2)}',
      '.ap2-img-thumb img{width:100%;height:100%;object-fit:cover;display:block}',
      '.ap2-img-del{position:absolute;top:3px;right:3px;width:18px;height:18px;border-radius:50%;background:rgba(239,68,68,.85);color:#fff;font-size:10px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1}',
      '.ap2-format-pills{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}',
      '.ap2-format-pill{padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid rgba(139,92,246,.3);background:transparent;color:#94a3b8;transition:all .2s}',
      '.ap2-format-pill.active{background:rgba(139,92,246,.2);color:#a78bfa;border-color:#7c3aed}',

      /* fields */
      '.ap2-input{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(139,92,246,.25);border-radius:8px;padding:9px 12px;color:#e2e8f0;font-size:13px;outline:none;transition:border-color .2s;margin-bottom:12px}',
      '.ap2-input:focus{border-color:#8b5cf6}',
      '.ap2-textarea{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(139,92,246,.25);border-radius:8px;padding:9px 12px;color:#e2e8f0;font-size:13px;outline:none;resize:vertical;min-height:90px;font-family:inherit;line-height:1.5;transition:border-color .2s;margin-bottom:12px}',
      '.ap2-textarea:focus{border-color:#8b5cf6}',
      '.ap2-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
      '.ap2-row-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}',

      /* AI bar */
      '.ap2-ai-bar{display:flex;gap:8px;align-items:center;padding:10px 12px;background:rgba(99,102,241,.07);border:1px solid rgba(99,102,241,.2);border-radius:10px;margin-bottom:12px}',
      '.ap2-ai-badge{font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px}',
      '.ap2-ai-badge.gemini{background:rgba(16,185,129,.15);color:#10b981;border:1px solid rgba(16,185,129,.2)}',
      '.ap2-ai-badge.claude{background:rgba(168,85,247,.15);color:#a855f7;border:1px solid rgba(168,85,247,.2)}',

      /* buttons */
      '.ap2-btn{padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:all .2s;display:inline-flex;align-items:center;gap:6px;text-decoration:none}',
      '.ap2-btn-primary{background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff}',
      '.ap2-btn-primary:hover{background:linear-gradient(135deg,#6d28d9,#4338ca)}',
      '.ap2-btn-primary:disabled{opacity:.5;cursor:not-allowed}',
      '.ap2-btn-secondary{background:rgba(139,92,246,.12);color:#a78bfa;border:1px solid rgba(139,92,246,.3)!important}',
      '.ap2-btn-success{background:linear-gradient(135deg,#059669,#10b981);color:#fff}',
      '.ap2-btn-danger{background:rgba(239,68,68,.15);color:#f87171;border:1px solid rgba(239,68,68,.2)!important}',
      '.ap2-btn-sm{padding:6px 14px;font-size:12px}',
      '.ap2-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}',
      '.ap2-spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:ap2Spin .7s linear infinite}',

      /* status */
      '.ap2-status{min-height:36px;margin-top:8px}',
      '.ap2-alert{padding:10px 14px;border-radius:8px;font-size:12px;font-weight:500;display:flex;align-items:center;gap:8px}',
      '.ap2-alert-success{background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.25);color:#34d399}',
      '.ap2-alert-error{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.25);color:#f87171}',
      '.ap2-alert-info{background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.25);color:#818cf8}',
      '.ap2-alert-warn{background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.2);color:#fbbf24}',

      /* link-repost */
      '.ap2-link-preview{background:rgba(255,255,255,.04);border:1px solid rgba(139,92,246,.2);border-radius:10px;padding:12px;margin-top:10px;display:none}',
      '.ap2-link-preview.visible{display:block}',
      '.ap2-link-preview img{width:60px;height:60px;object-fit:cover;border-radius:6px;float:left;margin-right:10px}',
      '.ap2-link-caption{font-size:12px;color:#94a3b8;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical}',

      /* scheduled time display */
      '.ap2-time-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.2);border-radius:20px;font-size:12px;color:#818cf8;margin-top:8px}',

      /* marketplace info box */
      '.ap2-mkt-info{padding:10px 14px;background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.2);border-radius:10px;margin-top:8px;font-size:12px;color:#93c5fd}',
      '.ap2-mkt-link{color:#60a5fa;text-decoration:underline;word-break:break-all}',

      /* divider */
      '.ap2-divider{border:none;border-top:1px solid rgba(139,92,246,.1);margin:16px 0}',

      /* counter */
      '.ap2-counter{font-size:11px;color:#6b7280;text-align:right;margin-top:-8px;margin-bottom:8px}'
    ].join('');
    document.head.appendChild(s);
  }

  /* ── State ────────────────────────────────────────────── */
  var _ap = {
    platform: 'ig_feed',          // selected platform (radio)
    images: [],                    // [{dataUrl, file, mime}]
    format: 'auto',                // 'feed','carousel','story','auto'
    description: '',
    ctaKeyword: 'INFO',
    igLink: '',
    igLinkData: null,              // {image_url, caption} fetched from IG
    scheduledAt: '',               // ISO — auto-calculated
    queuedISOs: [],                // existing scheduled_at values from queue
    connection: null,              // {ig_username, page_name, page_id, ...}
    aiProvider: '',                // 'gemini' | 'claude'
    isGenerating: false,
    isPublishing: false,
    isLoadingLink: false,

    /* platform metadata */
    PLATFORMS: [
      { id: 'ig_feed',   icon: '📸', name: 'Feed Instagram', sub: 'Foto o carrusel en el feed' },
      { id: 'ig_story',  icon: '📱', name: 'Historia Instagram', sub: 'Imagen en Historias (24h)' },
      { id: 'fb_page',   icon: '📘', name: 'Página de Facebook', sub: 'Publicación en tu página' },
      { id: 'fb_mkt',    icon: '🛒', name: 'Marketplace Facebook', sub: 'Producto en Marketplace' }
    ]
  };

  /* ── Init ─────────────────────────────────────────────── */
  _ap.init = function () {
    injectStyles();
    this.loadConnection();
    this.loadQueue();
    this.render();
  };

  _ap.loadConnection = function () {
    var self = this;
    // Try to get the real user UID from Supabase session (most accurate store_id)
    var storeId = 'default';
    try {
      for (var k of Object.keys(localStorage)) {
        if (k.startsWith('sb-') && k.includes('auth')) {
          var parsed = JSON.parse(localStorage.getItem(k) || '{}');
          var uid = (parsed && parsed.user && parsed.user.id) ||
                    (parsed && parsed.session && parsed.session.user && parsed.session.user.id);
          if (uid) { storeId = uid; break; }
        }
      }
    } catch (e) {}
    // Try with found store_id first, fallback to 'default' if no connection found
    api('get_connection_status', { store_id: storeId, platform: 'instagram' }).then(function (r) {
      if (r && r.connected) {
        self.connection = r.connection;
        self.renderConnectionInfo();
      } else if (storeId !== 'default') {
        // Retry with 'default' as fallback
        return api('get_connection_status', { store_id: 'default', platform: 'instagram' }).then(function (r2) {
          if (r2 && r2.connected) self.connection = r2.connection;
          self.renderConnectionInfo();
        });
      } else {
        self.renderConnectionInfo();
      }
    }).catch(function () { self.renderConnectionInfo(); });
  };

  _ap.loadQueue = function () {
    var self = this;
    api('get_schedule_queue', { store_id: 'default' }).then(function (r) {
      var q = r.queue || [];
      self.queuedISOs = q.filter(function (p) { return p.status === 'pending' || p.status === 'approved'; }).map(function (p) { return p.scheduled_at; });
      // auto-set next slot
      var next = getNextSlot(self.queuedISOs);
      self.scheduledAt = next.toISOString();
      self.renderTimeChip();
    }).catch(function () {});
  };

  /* ── Render ───────────────────────────────────────────── */
  _ap.render = function () {
    var p = document.getElementById('ap2-panel');
    if (!p) return;
    p.innerHTML = this.buildHTML();
    this.bindEvents();
    this.loadConnection();
    this.loadQueue();
  };

  _ap.renderConnectionInfo = function () {
    var el = document.getElementById('ap2-conn-info');
    if (!el) return;
    var c = this.connection;
    if (c) {
      el.innerHTML = '<span style="color:#10b981">✅</span> Conectado: <strong>' + (c.ig_username ? '@' + c.ig_username : c.page_name || 'Instagram') + '</strong>';
    } else {
      el.innerHTML = '<span style="color:#ef4444">⚠️</span> No conectado — ve a <strong>Conexiones</strong> para vincular Instagram';
    }
  };

  _ap.renderTimeChip = function () {
    var el = document.getElementById('ap2-time-chip');
    if (!el) return;
    var d = new Date(this.scheduledAt);
    var label = d.toLocaleDateString('es-CO', { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    el.innerHTML = '🕐 Próxima hora libre: <strong>' + label + '</strong>';
    var inp = document.getElementById('ap2-scheduled-at');
    if (inp) inp.value = isoToLocal(d);
  };

  /* ── HTML builder ─────────────────────────────────────── */
  _ap.buildHTML = function () {
    var self = this;

    /* platform buttons */
    var platformBtns = '';
    for (var i = 0; i < self.PLATFORMS.length; i++) {
      var pl = self.PLATFORMS[i];
      var sel = self.platform === pl.id ? ' selected' : '';
      platformBtns += '<button class="ap2-platform-btn' + sel + '" data-platform="' + pl.id + '">' +
        '<span class="ap2-platform-icon">' + pl.icon + '</span>' +
        '<span class="ap2-platform-text"><span class="ap2-platform-name">' + pl.name + '</span><span class="ap2-platform-sub">' + pl.sub + '</span></span>' +
        '</button>';
    }

    /* platform info / marketplace box */
    var platformInfo = '';
    if (self.platform === 'fb_mkt') {
      var pageLink = self.connection && self.connection.page_id
        ? 'https://www.facebook.com/marketplace/' + self.connection.page_id + '/selling/'
        : 'https://www.facebook.com/marketplace/';
      var pageName = self.connection && self.connection.page_name ? self.connection.page_name : 'tu página';
      platformInfo = '<div class="ap2-mkt-info">' +
        '🛒 Se publicará en Marketplace desde la página <strong>' + pageName + '</strong>.<br>' +
        '<a href="' + pageLink + '" target="_blank" class="ap2-mkt-link">👁 Ver mis productos en Marketplace →</a>' +
        '</div>';
    } else if (self.platform === 'ig_story') {
      platformInfo = '<div class="ap2-platform-info visible" style="display:block">📱 Las historias desaparecen en 24h. Solo se usa la primera imagen.</div>';
    } else if (self.platform === 'fb_page') {
      platformInfo = '<div class="ap2-platform-info visible" style="display:block">📘 Se publicará en el feed de tu Página de Facebook vinculada.</div>';
    }

    /* image grid */
    var imgGrid = '';
    for (var j = 0; j < self.images.length; j++) {
      imgGrid += '<div class="ap2-img-thumb">' +
        '<img src="' + self.images[j].dataUrl + '" alt="img' + j + '">' +
        '<button class="ap2-img-del" data-idx="' + j + '">✕</button>' +
        '</div>';
    }

    /* format pills (only for feed / fb_page) */
    var formatSection = '';
    if (self.platform === 'ig_feed' || self.platform === 'fb_page') {
      var autoLabel = self.images.length > 1 ? '🔀 Auto (' + (self.images.length > 1 ? 'Carrusel' : 'Feed') + ')' : '🔀 Auto';
      var formats = [
        { id: 'auto', label: autoLabel },
        { id: 'feed', label: '📷 Feed único' },
        { id: 'carousel', label: '🎠 Carrusel' }
      ];
      var pills = '';
      for (var f = 0; f < formats.length; f++) {
        var act = self.format === formats[f].id ? ' active' : '';
        pills += '<button class="ap2-format-pill' + act + '" data-format="' + formats[f].id + '">' + formats[f].label + '</button>';
      }
      formatSection = '<div class="ap2-format-pills">' + pills + '</div>';
    }

    /* AI provider badge */
    var aiBadge = '';
    if (self.aiProvider) {
      var provClass = self.aiProvider === 'gemini' ? 'gemini' : 'claude';
      var provLabel = self.aiProvider === 'gemini' ? '✦ Gemini Vision' : '◆ Claude Vision';
      aiBadge = '<span class="ap2-ai-badge ' + provClass + '">' + provLabel + '</span>';
    }

    /* marketplace extra fields */
    var mktFields = '';
    if (self.platform === 'fb_mkt') {
      mktFields = '<label class="ap2-label">Precio (COP)</label>' +
        '<input class="ap2-input" id="ap2-precio" type="number" placeholder="0" min="0">' +
        '<label class="ap2-label">Categoría</label>' +
        '<select class="ap2-input" id="ap2-categoria">' +
        '<option>General</option><option>Ropa y accesorios</option><option>Salud y belleza</option>' +
        '<option>Hogar y jardín</option><option>Electrónica</option><option>Deportes</option>' +
        '<option>Juguetes</option><option>Vehículos</option><option>Otro</option>' +
        '</select>';
    }

    /* scheduled time */
    var d = new Date(self.scheduledAt || Date.now() + 5 * 3600 * 1000);
    var timeValue = isoToLocal(d);

    var html = '' +
      '<div class="ap2-header">' +
        '<h2 class="ap2-title">🚀 Autopublicador</h2>' +
        '<span class="ap2-badge">IA · Sanate</span>' +
      '</div>' +

      /* connection */
      '<div id="ap2-conn-info" style="font-size:12px;color:#94a3b8;margin-bottom:16px;padding:8px 12px;background:rgba(255,255,255,.03);border-radius:8px;border:1px solid rgba(139,92,246,.1)">Cargando conexión...</div>' +

      /* 1. Platform selector */
      '<div class="ap2-section">' +
        '<div class="ap2-section-title">📡 Plataforma de destino</div>' +
        '<div class="ap2-platforms">' + platformBtns + '</div>' +
        platformInfo +
      '</div>' +

      /* 2. Images */
      '<div class="ap2-section">' +
        '<div class="ap2-section-title">🖼 Imágenes <span style="font-weight:400;font-size:11px;color:#6b7280;text-transform:none;letter-spacing:0">— hasta 10 · JPG, PNG, WEBP</span></div>' +
        '<div class="ap2-dropzone" id="ap2-dz">' +
          '<div style="font-size:36px">📁</div>' +
          '<div style="font-size:13px;color:#94a3b8;margin-top:6px">Arrastra imágenes aquí o haz clic para seleccionar</div>' +
          '<div style="font-size:11px;color:#6b7280;margin-top:4px">' + (self.images.length > 0 ? self.images.length + ' imagen(es) cargada(s)' : 'Soporta múltiples archivos') + '</div>' +
        '</div>' +
        '<input type="file" id="ap2-fi" multiple accept="image/*" style="display:none">' +
        (self.images.length > 0 ? '<div class="ap2-img-grid">' + imgGrid + '</div>' + formatSection : '') +
      '</div>' +

      /* 3. OR link repost */
      '<div class="ap2-section">' +
        '<div class="ap2-section-title">🔗 O pega un link de Instagram</div>' +
        '<div style="display:flex;gap:8px">' +
          '<input class="ap2-input" id="ap2-ig-link" placeholder="https://www.instagram.com/p/..." style="margin-bottom:0;flex:1" value="' + (self.igLink || '') + '">' +
          '<button class="ap2-btn ap2-btn-secondary ap2-btn-sm" id="ap2-load-link">🔍 Cargar</button>' +
        '</div>' +
        '<div id="ap2-link-preview" class="ap2-link-preview' + (self.igLinkData ? ' visible' : '') + '">' +
          (self.igLinkData ? '<img src="' + (self.igLinkData.image_url || '') + '" onerror="this.style.display=\'none\'">' +
            '<div class="ap2-link-caption">' + (self.igLinkData.caption || 'Sin descripción').substring(0, 200) + '</div>' +
            '<div style="clear:both;padding-top:4px;font-size:11px;color:#6b7280">✅ Se usará esta imagen y descripción</div>'
          : '') +
        '</div>' +
      '</div>' +

      /* 4. Description */
      '<div class="ap2-section">' +
        '<div class="ap2-section-title">✍️ Descripción</div>' +
        (self.aiProvider ? '<div class="ap2-ai-bar">' + aiBadge + '<span style="font-size:11px;color:#94a3b8">Generada por IA según tu imagen</span></div>' : '') +
        '<textarea class="ap2-textarea" id="ap2-description" placeholder="Describe tu publicación o deja que la IA lo genere según tu imagen...">' + (self.description || '') + '</textarea>' +
        '<div class="ap2-counter"><span id="ap2-desc-count">' + (self.description || '').length + '</span> caracteres</div>' +

        '<div class="ap2-row">' +
          '<div>' +
            '<label class="ap2-label">💬 Palabra clave CTA</label>' +
            '<input class="ap2-input" id="ap2-cta" placeholder="INFO" value="' + (self.ctaKeyword || 'INFO') + '">' +
          '</div>' +
          '<div style="display:flex;align-items:flex-end">' +
            '<button class="ap2-btn ap2-btn-secondary ap2-btn-sm" id="ap2-gen-ai" style="margin-bottom:12px;width:100%">' +
              (self.isGenerating ? '<span class="ap2-spinner"></span> Generando...' : '🤖 Generar con IA') +
            '</button>' +
          '</div>' +
        '</div>' +

        mktFields +
      '</div>' +

      /* 5. Schedule */
      '<div class="ap2-section">' +
        '<div class="ap2-section-title">🕐 Programar</div>' +
        '<div id="ap2-time-chip" class="ap2-time-chip" style="margin-bottom:12px">Calculando horario...</div>' +
        '<div class="ap2-row">' +
          '<div>' +
            '<label class="ap2-label">Fecha y hora</label>' +
            '<input type="datetime-local" class="ap2-input" id="ap2-scheduled-at" value="' + timeValue + '">' +
          '</div>' +
          '<div style="display:flex;align-items:flex-end">' +
            '<button class="ap2-btn ap2-btn-secondary ap2-btn-sm" id="ap2-recalc" style="margin-bottom:12px;width:100%">🔄 Recalcular hora</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* 6. Actions */
      '<div class="ap2-actions">' +
        '<button class="ap2-btn ap2-btn-primary" id="ap2-schedule-btn" ' + (self.isPublishing ? 'disabled' : '') + '>' +
          (self.isPublishing ? '<span class="ap2-spinner"></span> Programando...' : '📅 Programar publicación') +
        '</button>' +
        '<button class="ap2-btn ap2-btn-success" id="ap2-now-btn" ' + (self.isPublishing ? 'disabled' : '') + '>' +
          '⚡ Publicar ahora' +
        '</button>' +
      '</div>' +

      '<div class="ap2-status" id="ap2-status"></div>';

    return html;
  };

  /* ── Events ───────────────────────────────────────────── */
  _ap.bindEvents = function () {
    var self = this;

    /* platform radio */
    var platBtns = document.querySelectorAll('.ap2-platform-btn');
    for (var i = 0; i < platBtns.length; i++) {
      (function (btn) {
        btn.onclick = function () {
          self.platform = btn.getAttribute('data-platform');
          self.render();
        };
      })(platBtns[i]);
    }

    /* dropzone */
    var dz = document.getElementById('ap2-dz');
    var fi = document.getElementById('ap2-fi');
    if (dz && fi) {
      dz.onclick = function () { fi.click(); };
      fi.onchange = function () { if (fi.files && fi.files.length) { self.onFiles(fi.files); fi.value = ''; } };
      dz.ondragover = function (e) { e.preventDefault(); e.stopPropagation(); dz.classList.add('dragover'); };
      dz.ondragleave = function (e) { e.preventDefault(); e.stopPropagation(); dz.classList.remove('dragover'); };
      dz.ondrop = function (e) { e.preventDefault(); e.stopPropagation(); dz.classList.remove('dragover'); var dt = e.dataTransfer; if (dt && dt.files && dt.files.length) self.onFiles(dt.files); };
    }

    /* image delete */
    var delBtns = document.querySelectorAll('.ap2-img-del');
    for (var d = 0; d < delBtns.length; d++) {
      (function (btn) {
        btn.onclick = function (e) { e.stopPropagation(); self.images.splice(parseInt(btn.getAttribute('data-idx')), 1); self.render(); };
      })(delBtns[d]);
    }

    /* format pills */
    var pills = document.querySelectorAll('.ap2-format-pill');
    for (var f = 0; f < pills.length; f++) {
      (function (pill) {
        pill.onclick = function () { self.format = pill.getAttribute('data-format'); self.render(); };
      })(pills[f]);
    }

    /* description counter */
    var ta = document.getElementById('ap2-description');
    var counter = document.getElementById('ap2-desc-count');
    if (ta && counter) {
      ta.oninput = function () {
        self.description = ta.value;
        counter.textContent = ta.value.length;
      };
    }

    /* CTA input */
    var ctaInp = document.getElementById('ap2-cta');
    if (ctaInp) ctaInp.oninput = function () { self.ctaKeyword = ctaInp.value; };

    /* AI generate */
    var genBtn = document.getElementById('ap2-gen-ai');
    if (genBtn) genBtn.onclick = function () { self.generateDescription(); };

    /* IG link load */
    var linkInput = document.getElementById('ap2-ig-link');
    var loadLinkBtn = document.getElementById('ap2-load-link');
    if (linkInput) linkInput.oninput = function () { self.igLink = linkInput.value.trim(); };
    if (loadLinkBtn) loadLinkBtn.onclick = function () { self.loadIgLink(); };

    /* recalc slot */
    var recalcBtn = document.getElementById('ap2-recalc');
    if (recalcBtn) recalcBtn.onclick = function () {
      var next = getNextSlot(self.queuedISOs);
      self.scheduledAt = next.toISOString();
      var inp = document.getElementById('ap2-scheduled-at');
      if (inp) inp.value = isoToLocal(next);
      self.renderTimeChip();
    };

    /* schedule */
    var schedBtn = document.getElementById('ap2-schedule-btn');
    if (schedBtn) schedBtn.onclick = function () { self.submit(false); };

    /* publish now */
    var nowBtn = document.getElementById('ap2-now-btn');
    if (nowBtn) nowBtn.onclick = function () { self.submit(true); };
  };

  /* ── File handling ────────────────────────────────────── */
  _ap.onFiles = function (files) {
    var self = this;
    var remaining = 10 - self.images.length;
    var toAdd = Math.min(files.length, remaining);
    if (toAdd <= 0) { self.showStatus('Ya tienes 10 imágenes (máximo).', 'error'); return; }
    var loaded = 0;
    for (var i = 0; i < toAdd; i++) {
      (function (file) {
        var reader = new FileReader();
        reader.onload = function (e) {
          self.images.push({ dataUrl: e.target.result, file: file, mime: file.type || 'image/jpeg' });
          loaded++;
          if (loaded === toAdd) {
            // Auto-detect format
            if (self.images.length === 1) self.format = 'feed';
            else if (self.platform === 'ig_story') self.format = 'story';
            else self.format = 'carousel';
            // Trigger AI if images just added
            self.render();
            self.generateDescription();
          }
        };
        reader.readAsDataURL(file);
      })(files[i]);
    }
  };

  /* ── AI description ───────────────────────────────────── */
  _ap.generateDescription = function () {
    var self = this;
    if (self.isGenerating) return;
    var cta = (document.getElementById('ap2-cta') || {}).value || self.ctaKeyword || 'INFO';
    self.ctaKeyword = cta;
    self.isGenerating = true;
    self.showStatus('🤖 Generando descripción con IA...', 'info');

    var imgData = [];
    for (var i = 0; i < self.images.length; i++) {
      imgData.push({ index: i, base64: self.images[i].dataUrl.split(',')[1] || '', mime_type: self.images[i].mime });
    }

    var payload = {
      store_id: 'default',
      platform: self.platform,
      post_type: self.format === 'story' ? 'story' : 'feed',
      cta_keyword: cta,
      tone: 'cercano, motivador y profesional'
    };

    // Use ai_generate_description with base64 images
    if (imgData.length > 0) {
      payload.images = imgData;
      payload.image_urls = [];
    }

    api('ai_generate_description', payload).then(function (r) {
      self.isGenerating = false;
      if (r.ok && r.description) {
        self.description = r.description;
        self.aiProvider = r.ai_provider || 'gemini';
        var ta = document.getElementById('ap2-description');
        if (ta) { ta.value = r.description; var counter = document.getElementById('ap2-desc-count'); if (counter) counter.textContent = r.description.length; }
        // Update AI badge without full re-render
        var aiBar = document.querySelector('.ap2-ai-bar');
        if (!aiBar) {
          // Re-render description section only
          self.render();
          return;
        }
        var provClass = self.aiProvider === 'gemini' ? 'gemini' : 'claude';
        var provLabel = self.aiProvider === 'gemini' ? '✦ Gemini Vision' : '◆ Claude Vision';
        aiBar.innerHTML = '<span class="ap2-ai-badge ' + provClass + '">' + provLabel + '</span><span style="font-size:11px;color:#94a3b8">Generada por IA según tu imagen</span>';
        self.showStatus('✅ Descripción generada. Puedes editarla antes de publicar.', 'success');
      } else {
        self.showStatus('⚠️ IA no disponible: ' + (r.error || 'error desconocido'), 'warn');
        // Default fallback
        var fallback = '✨ Descubre nuestra colección de bienestar y salud natural.\n\n¿Quieres saber más? Comenta "' + cta + '" y te damos toda la info 🌿\n\n#sanate #bienestar #salud #colombia #natural #wellness';
        self.description = fallback;
        var taEl = document.getElementById('ap2-description');
        if (taEl) taEl.value = fallback;
      }
    }).catch(function (err) {
      self.isGenerating = false;
      self.showStatus('❌ Error IA: ' + (err.message || 'Error de red'), 'error');
    });
  };

  /* ── Load IG link ─────────────────────────────────────── */
  _ap.loadIgLink = function () {
    var self = this;
    var link = (document.getElementById('ap2-ig-link') || {}).value || '';
    if (!link || link.indexOf('instagram.com') === -1) {
      self.showStatus('⚠️ Pega un link válido de Instagram (instagram.com/p/...)', 'warn');
      return;
    }
    self.igLink = link;
    self.isLoadingLink = true;
    self.showStatus('🔍 Cargando post de Instagram...', 'info');

    // Use oEmbed to get post data
    var oembedUrl = 'https://graph.facebook.com/v21.0/instagram_oembed?url=' + encodeURIComponent(link) + '&fields=thumbnail_url,title,author_name&access_token=';

    // Try to get via Edge Function
    api('get_ig_oembed', { url: link }).then(function (r) {
      self.isLoadingLink = false;
      if (r.ok && r.data) {
        self.igLinkData = r.data;
        self.description = r.data.caption || r.data.title || '';
        var ta = document.getElementById('ap2-description');
        if (ta) ta.value = self.description;
        var preview = document.getElementById('ap2-link-preview');
        if (preview) {
          preview.classList.add('visible');
          preview.innerHTML = '<img src="' + (r.data.image_url || '') + '" onerror="this.style.display=\'none\'" style="width:60px;height:60px;object-fit:cover;border-radius:6px;float:left;margin-right:10px">' +
            '<div class="ap2-link-caption">' + (r.data.caption || 'Sin descripción').substring(0, 200) + '</div>' +
            '<div style="clear:both;padding-top:6px;font-size:11px;color:#10b981">✅ Imagen y descripción cargadas — se reprogramará automáticamente</div>';
        }
        self.showStatus('✅ Post cargado. Se programará en la próxima hora disponible.', 'success');
      } else {
        // Fallback — just use the link and let user fill description
        self.showStatus('ℹ️ No se pudo cargar el preview. Puedes escribir la descripción manualmente y se reprogramará el post.', 'info');
      }
    }).catch(function () {
      self.isLoadingLink = false;
      self.showStatus('ℹ️ Preview no disponible. Escribe la descripción y programa manualmente.', 'info');
    });
  };

  /* ── Submit ───────────────────────────────────────────── */
  _ap.submit = function (publishNow) {
    var self = this;
    if (self.isPublishing) return;

    // Gather fields
    var ta = document.getElementById('ap2-description');
    var desc = (ta ? ta.value : '') || self.description || '';
    var cta = (document.getElementById('ap2-cta') || {}).value || self.ctaKeyword || '';
    var timeInp = document.getElementById('ap2-scheduled-at');
    var schedVal = timeInp ? timeInp.value : '';
    var precio = (document.getElementById('ap2-precio') || {}).value || '';
    var categoria = (document.getElementById('ap2-categoria') || {}).value || '';

    // Validate
    if (self.images.length === 0 && !self.igLinkData) {
      self.showStatus('⚠️ Necesitas al menos una imagen o un link de Instagram.', 'warn');
      return;
    }
    if (!self.connection && (self.platform === 'ig_feed' || self.platform === 'ig_story')) {
      self.showStatus('⚠️ Conecta Instagram primero en la pestaña Conexiones.', 'warn');
      return;
    }

    // Build scheduled time
    var scheduledAt;
    if (publishNow) {
      scheduledAt = new Date().toISOString();
    } else {
      if (schedVal) {
        var d = new Date(schedVal);
        scheduledAt = d.toISOString();
      } else {
        scheduledAt = self.scheduledAt || new Date(Date.now() + 5 * 3600 * 1000).toISOString();
      }
    }

    // Build image_urls — for now we store base64 refs; Edge Function handles upload
    var imgUrls = [];
    if (self.igLinkData && self.igLinkData.image_url) imgUrls = [self.igLinkData.image_url];

    // Build platform mapping
    var platformMap = { ig_feed: 'ig_feed', ig_story: 'ig_story', fb_page: 'fb_page', fb_mkt: 'fb_marketplace' };
    var apiPlatform = platformMap[self.platform] || self.platform;

    // Determine post_type
    var postType = 'feed';
    if (self.platform === 'ig_story') postType = 'story';
    else if (self.format === 'carousel' || (self.format === 'auto' && self.images.length > 1)) postType = 'carousel';

    // Append CTA to description if not already there
    var fullDesc = desc;
    if (cta && fullDesc.indexOf(cta) === -1) {
      fullDesc += '\n\n💬 Comenta "' + cta + '" para recibir más información.';
    }

    // Build posts array
    var posts = [];
    var basePost = {
      platform: apiPlatform,
      post_type: postType,
      image_urls: imgUrls,
      description: fullDesc,
      hashtags: '',
      cta_keyword: cta,
      title: '',
      scheduled_at: scheduledAt,
      ai_generated: !!self.aiProvider,
      ai_provider: self.aiProvider || ''
    };

    // Add base64 images
    if (self.images.length > 0) {
      basePost.image_base64_list = self.images.map(function (img) { return { base64: img.dataUrl.split(',')[1] || '', mime: img.mime }; });
    }

    if (self.platform === 'fb_mkt') {
      basePost.price = precio;
      basePost.category = categoria;
      basePost.platform = 'fb_marketplace';
    }

    posts.push(basePost);

    self.isPublishing = true;
    self.showStatus((publishNow ? '⚡ Publicando ahora...' : '📅 Programando...'), 'info');

    if (publishNow) {
      // Publish immediately
      var publishAction = self.platform === 'ig_story' ? 'publish_ig_story' : self.platform === 'fb_page' ? 'publish_fb_page' : self.platform === 'fb_mkt' ? 'publish_fb_marketplace' : 'publish_ig_feed';
      var publishPayload = { store_id: 'default', image_urls: imgUrls, description: fullDesc, caption: fullDesc, title: '' };
      if (self.images.length > 0 && imgUrls.length === 0) {
        self.showStatus('⚠️ Para publicar ahora, las imágenes deben estar subidas a una URL pública. Usa "Programar" para procesar las imágenes.', 'warn');
        self.isPublishing = false;
        return;
      }
      api(publishAction, publishPayload).then(function (r) {
        self.isPublishing = false;
        if (r.ok) {
          self.showStatus('✅ Publicado correctamente! ' + (r.post_id ? 'ID: ' + r.post_id : ''), 'success');
          self.images = []; self.description = ''; self.igLinkData = null; self.igLink = '';
          setTimeout(function () { self.render(); }, 2000);
        } else {
          self.showStatus('❌ Error al publicar: ' + (r.error || JSON.stringify(r)), 'error');
        }
      }).catch(function (e) {
        self.isPublishing = false;
        self.showStatus('❌ Error: ' + (e.message || 'Error de red'), 'error');
      });
    } else {
      // Schedule
      api('create_schedule_batch', { posts: posts, store_id: 'default' }).then(function (r) {
        self.isPublishing = false;
        if (r.ok || r.created) {
          var count = r.created || 1;
          var d2 = new Date(scheduledAt);
          var label = d2.toLocaleDateString('es-CO', { weekday: 'long', month: 'long', day: 'numeric' }) + ' a las ' + pad(d2.getHours()) + ':' + pad(d2.getMinutes());
          self.showStatus('✅ ' + count + ' publicación programada para el ' + label + '.', 'success');
          self.images = []; self.description = ''; self.igLinkData = null; self.igLink = '';
          // Update queue and recalc next slot
          if (scheduledAt) self.queuedISOs.push(scheduledAt);
          var next = getNextSlot(self.queuedISOs);
          self.scheduledAt = next.toISOString();
          setTimeout(function () { self.render(); }, 2500);
        } else {
          self.showStatus('❌ Error: ' + (r.error || JSON.stringify(r)), 'error');
        }
      }).catch(function (e) {
        self.isPublishing = false;
        self.showStatus('❌ Error: ' + (e.message || 'Error de red'), 'error');
      });
    }
  };

  /* ── Status ───────────────────────────────────────────── */
  _ap.showStatus = function (msg, type) {
    var el = document.getElementById('ap2-status');
    if (!el) return;
    var cls = type === 'success' ? 'ap2-alert-success' : type === 'error' ? 'ap2-alert-error' : type === 'warn' ? 'ap2-alert-warn' : 'ap2-alert-info';
    el.innerHTML = '<div class="ap2-alert ' + cls + '">' + msg + '</div>';
  };

  /* ── Tab injection ────────────────────────────────────── */
  window._ap2 = _ap;

  var _injected = false;
  var _lastPath = window.location.pathname;

  function tryInjectAutopub() {
    if (!isMarketingRedes()) return;

    // Find the Autopublicador tab button and its content panel
    var allBtns = document.querySelectorAll('button');
    var autopubBtn = null;
    for (var i = 0; i < allBtns.length; i++) {
      var t = allBtns[i].textContent.trim();
      if (t === 'Autopublicador') { autopubBtn = allBtns[i]; break; }
    }
    if (!autopubBtn) return;
    if (document.getElementById('ap2-injected')) return;

    // Mark as injected
    var marker = document.createElement('span');
    marker.id = 'ap2-injected';
    marker.style.display = 'none';
    document.body.appendChild(marker);

    // Intercept click on Autopublicador tab to show our panel
    var origOnClick = autopubBtn.onclick;
    autopubBtn.onclick = function (e) {
      // Let the original tab switch happen first
      if (origOnClick) origOnClick.call(this, e);
      setTimeout(function () {
        injectPanel();
        // Siempre re-verificar conexión al entrar a este tab (para reflejar cambios en Conexiones)
        if (_ap && typeof _ap.loadConnection === 'function') {
          _ap.loadConnection();
        }
      }, 200);
    };

    // Also inject if already on autopublicador tab
    var activeClass = autopubBtn.className;
    if (activeClass.indexOf('active') > -1 || activeClass.indexOf('selected') > -1) {
      setTimeout(function () { injectPanel(); }, 300);
    }

    _injected = true;
  }

  function injectPanel() {
    if (document.getElementById('ap2-panel')) return;

    // Find tab bar inside .marketing-redes
    var container = document.querySelector('.marketing-redes');
    if (!container) return;
    var allBtns = Array.from(container.querySelectorAll('button'));
    var tabBtn = allBtns.find(function(b) {
      var t = b.textContent.trim();
      return t === 'Conexiones' || t === 'Autopublicador' || t === 'Historial' || t === 'Reglas Anti-Ban';
    });
    if (!tabBtn) return;
    var tabBar = tabBtn.parentElement;

    // Hide the Vue content area: first direct DIV child of container that is NOT the tab bar or our panels
    var ownIds = ['re-panel-wrapper', 'ap2-panel', 'cx-panel-wrapper'];
    Array.from(container.children).forEach(function(child) {
      if (child === tabBar) return;
      if (ownIds.indexOf(child.id) > -1) return;
      if (child.tagName !== 'DIV') return;
      child._apWasVisible = child.style.display;
      child.style.display = 'none';
    });

    // Insert our panel right after the tab bar — inside .marketing-redes
    var panel = document.createElement('div');
    panel.id = 'ap2-panel';
    panel.classList.add('visible');
    tabBar.insertAdjacentElement('afterend', panel);
    _ap.init();
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  setInterval(function () {
    var p = window.location.pathname;
    if (p !== _lastPath) {
      _lastPath = p;
      _injected = false;
      var old = document.getElementById('ap2-panel');
      if (old) old.remove();
      var mark = document.getElementById('ap2-injected');
      if (mark) mark.remove();
    }
    if (!_injected && isMarketingRedes()) tryInjectAutopub();
  }, 800);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(tryInjectAutopub, 600); });
  } else {
    setTimeout(tryInjectAutopub, 600);
  }

})();






/* ===== AUTOPUB v2 PATCHES (v4-fix) ===== */
(function applyAutopubPatches(){
var SUPA_URL="https://lvmeswlvszsmvgaasazs.supabase.co";
var SUPA_ANON="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2bWVzd2x2c3pzbXZnYWFzYXpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MjYzMTEsImV4cCI6MjA4NzEwMjMxMX0.pKhuLjRLgpWMBsEUv1WhCytpbUUT6tKj3sacIGit2z4";
function waitEl(id,cb,ms){ms=ms||50;var el=document.getElementById(id);if(el)return cb(el);setTimeout(function(){waitEl(id,cb,ms);},ms);}
waitEl("ap2-panel",function(){
var css=document.createElement("style");css.id="ap2-patch-css";
css.textContent="@keyframes ap2spin{to{transform:rotate(360deg)}}.ap2-spinner-mini{width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:ap2spin .6s linear infinite;display:inline-block}.ap2-preview-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:8px;width:100%;padding:8px}.ap2-preview-thumb{position:relative;aspect-ratio:1;border-radius:10px;overflow:hidden;border:2px solid rgba(255,255,255,.1)}.ap2-preview-thumb img{width:100%;height:100%;object-fit:cover}.ap2-preview-thumb .ap2-rm{position:absolute;top:2px;right:2px;background:rgba(0,0,0,.7);color:#ff4444;border:none;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center}.ap2-preview-thumb .ap2-rm:hover{background:#ff4444;color:#fff}.ap2-dz-has-preview{padding:8px!important;min-height:auto!important}.ap2-add-more{aspect-ratio:1;border-radius:10px;border:2px dashed rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:28px;color:rgba(255,255,255,.4);transition:all .2s}.ap2-add-more:hover{border-color:#e07a2f;color:#e07a2f}.ap2-loading-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(10,10,20,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99999;backdrop-filter:blur(8px)}.ap2-rocket-c{position:relative;width:120px;height:200px;display:flex;align-items:center;justify-content:center}.ap2-rocket{font-size:64px;animation:ap2rf 1.5s ease-in-out infinite;filter:drop-shadow(0 0 20px rgba(224,122,47,.6));position:relative;z-index:2}@keyframes ap2rf{0%,100%{transform:translateY(0) rotate(-5deg)}50%{transform:translateY(-15px) rotate(5deg)}}.ap2-flame{position:absolute;bottom:10px;left:50%;transform:translateX(-50%);width:30px;height:60px;background:linear-gradient(to bottom,#e07a2f,#ff4444,transparent);border-radius:50% 50% 50% 50%/20% 20% 80% 80%;animation:ap2fl .3s ease-in-out infinite alternate;opacity:.8;z-index:1}@keyframes ap2fl{0%{height:50px;opacity:.7}100%{height:70px;opacity:1}}.ap2-ptcl{position:absolute;width:4px;height:4px;background:#e07a2f;border-radius:50%;animation:ap2pf 1s linear infinite}.ap2-ptcl:nth-child(2){left:30%;animation-delay:.2s;background:#ff6644}.ap2-ptcl:nth-child(3){left:60%;animation-delay:.4s;background:#ffaa33}.ap2-ptcl:nth-child(4){left:80%;animation-delay:.6s}.ap2-ptcl:nth-child(5){left:10%;animation-delay:.8s;background:#ff6644}@keyframes ap2pf{0%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(80px) scale(0);opacity:0}}.ap2-ld-txt{color:#fff;font-size:18px;font-weight:600;margin-top:30px;letter-spacing:1px}.ap2-ld-sub{color:rgba(255,255,255,.5);font-size:13px;margin-top:8px}.ap2-pbar{width:250px;height:4px;background:rgba(255,255,255,.1);border-radius:4px;margin-top:20px;overflow:hidden}.ap2-pfill{height:100%;background:linear-gradient(90deg,#e07a2f,#ff6644,#e07a2f);background-size:200% 100%;border-radius:4px;animation:ap2pm 1.5s ease-in-out infinite;width:60%}@keyframes ap2pm{0%{background-position:200% 0;width:20%}50%{width:70%}100%{background-position:-200% 0;width:20%}}";
document.head.appendChild(css);
window._ap2Files=[];
var dz=document.getElementById("ap2-dz");
var fi=document.getElementById("ap2-fi");
var descTA=document.getElementById("ap2-description");
var genBtn=document.getElementById("ap2-gen-ai");
var pubBtn=document.getElementById("ap2-now-btn");
var schedBtn=document.getElementById("ap2-schedule-btn");
if(!dz||!fi||!descTA||!genBtn||!pubBtn||!schedBtn)return;

/* PATCH A: AI gen loading + remove ** */
var origGen=genBtn.onclick;
genBtn.onclick=async function(e){
var origPH=descTA.placeholder;
descTA.value="";
descTA.placeholder="Generando descripcion con IA... por favor espera";
descTA.disabled=true;descTA.style.opacity="0.6";
var origBT=genBtn.innerHTML;
genBtn.innerHTML='<span style="display:inline-flex;align-items:center;gap:6px"><span class="ap2-spinner-mini"><\/span> Generando...</span>';
genBtn.disabled=true;
try{await origGen.call(this,e);}catch(err){console.error(err);}
await new Promise(function(r){setTimeout(r,500);});
if(descTA.value)descTA.value=descTA.value.replace(/\*\*/g,"");
descTA.disabled=false;descTA.style.opacity="1";descTA.placeholder=origPH;
genBtn.innerHTML=origBT;genBtn.disabled=false;
};

/* PATCH B: Image preview */
function renderPreviews(){
var files=window._ap2Files;
if(!files.length){
dz.innerHTML='<div style="font-size:2.5rem">\u{1F4C1}<\/div><div>Arrastra imagenes aqui o haz clic para seleccionar<\/div><div style="font-size:.85rem;opacity:.5">Soporta multiples archivos<\/div>';
dz.classList.remove("ap2-dz-has-preview");return;}
dz.classList.add("ap2-dz-has-preview");
var htm="<div class=\"ap2-preview-grid\">";
files.forEach(function(f,i){
var u=URL.createObjectURL(f);
htm+='<div class="ap2-preview-thumb"><img src="'+u+'"><button class="ap2-rm" data-i="'+i+'">&times;<\/button><\/div>';
});
if(files.length<10)htm+='<div class="ap2-add-more" id="ap2-add-more">+<\/div>';
htm+="<\/div>";
dz.innerHTML=htm;
dz.querySelectorAll(".ap2-rm").forEach(function(b){
b.onclick=function(ev){ev.stopPropagation();window._ap2Files.splice(parseInt(this.dataset.i),1);renderPreviews();};
});
var am=document.getElementById("ap2-add-more");
if(am)am.onclick=function(ev){ev.stopPropagation();fi.click();};
}
fi.addEventListener("change",function(e){
window._ap2Files=window._ap2Files.concat(Array.from(e.target.files)).slice(0,10);
renderPreviews();fi.value="";
},true);
dz.addEventListener("click",function(){if(!window._ap2Files.length)fi.click();});
dz.addEventListener("dragover",function(e){e.preventDefault();dz.style.borderColor="#e07a2f";});
dz.addEventListener("dragleave",function(e){e.preventDefault();dz.style.borderColor="";});
dz.addEventListener("drop",function(e){
e.preventDefault();dz.style.borderColor="";
window._ap2Files=window._ap2Files.concat(Array.from(e.dataTransfer.files).filter(function(f){return f.type.startsWith("image/");})).slice(0,10);
renderPreviews();
});

/* PATCH C: Upload to Supabase Storage */
async function uploadImages(files){
var urls=[];
for(var i=0;i<files.length;i++){
var f=files[i];
var ts=Date.now();
var rand=Math.random().toString(36).substring(2,8);
var ext=(f.name.split(".").pop()||"jpg").toLowerCase();
var path="posts/"+ts+"_"+rand+"."+ext;
var resp=await fetch(SUPA_URL+"/storage/v1/object/social-images/"+path,{
method:"POST",
headers:{"Authorization":"Bearer "+SUPA_ANON,"apikey":SUPA_ANON,"Content-Type":f.type,"x-upsert":"true"},
body:f
});
if(!resp.ok)throw new Error("Upload failed: "+(await resp.text()));
urls.push(SUPA_URL+"/storage/v1/object/public/social-images/"+path);
}
return urls;
}

/* PATCH D: Rocket loading overlay */
function showLoading(msg,sub){
if(document.getElementById("ap2-ld-ov"))return;
var ov=document.createElement("div");ov.id="ap2-ld-ov";ov.className="ap2-loading-overlay";
ov.innerHTML='<div class="ap2-rocket-c"><div class="ap2-rocket">\u{1F680}<\/div><div class="ap2-flame"><\/div><div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:100px;height:100px"><div class="ap2-ptcl"><\/div><div class="ap2-ptcl"><\/div><div class="ap2-ptcl"><\/div><div class="ap2-ptcl"><\/div><div class="ap2-ptcl"><\/div><\/div><\/div><div class="ap2-ld-txt" id="ap2-ld-msg">'+(msg||"Procesando...")+'<\/div><div class="ap2-ld-sub" id="ap2-ld-sub">'+(sub||"Esto puede tomar unos segundos")+'<\/div><div class="ap2-pbar"><div class="ap2-pfill"><\/div><\/div>';
document.body.appendChild(ov);
}
function hideLoading(){var o=document.getElementById("ap2-ld-ov");if(o)o.remove();}
function updateLoading(m,s){var a=document.getElementById("ap2-ld-msg"),b=document.getElementById("ap2-ld-sub");if(a&&m)a.textContent=m;if(b&&s)b.textContent=s;}

/* PATCH E: Wrap publish/schedule */
var origPub=pubBtn.onclick;
var origSched=schedBtn.onclick;
async function wrapPublish(origFn,e,isSched){
var files=window._ap2Files||[];
if(!files.length)return origFn.call(this,e);
showLoading("Subiendo imagenes...","Preparando "+files.length+" imagen(es) para publicar");
try{
var urls=await uploadImages(files);
updateLoading(isSched?"Programando publicacion...":"Publicando...","Imagenes subidas correctamente");
window._ap2UploadedUrls=urls;
window._ap2ImageUrls=urls;
await origFn.call(this,e);
setTimeout(hideLoading,1500);
window._ap2Files=[];renderPreviews();
}catch(err){
hideLoading();
var st=document.getElementById("ap2-status");
if(st){st.textContent="Error: "+err.message;st.style.color="#ff4444";}
}
}
pubBtn.onclick=function(e){return wrapPublish.call(this,origPub,e,false);};
schedBtn.onclick=function(e){return wrapPublish.call(this,origSched,e,true);};
});
})();
/* ===== END PATCHES ===== */

/* ============================================================
   EXTRACTOR DE CARRETES v2.2 — injected by hotfix.js
   ============================================================ */
/**
 * reels-extractor.js v2.2
 * Sanate Dashboard — Extractor de Reels / Carretes
 * Features: TikTok + IG trending, Competencia, Cola, Auto-IA, CTA selector, Bulk select
 * v2.2: Imágenes ultra-rápidas via edge proxy (?thumb=ID&user=USERNAME), oEmbed lazy, fade-in
 */
(function () {
  if (window.__reelsExtractorLoaded) return;
  window.__reelsExtractorLoaded = true;

  /* ─── CONFIG ─────────────────────────────────────────────── */
  const EDGE = 'https://lvmeswlvszsmvgaasazs.supabase.co/functions/v1/reels-api';

  const CTA_WORDS = ['SALUD', 'INFO', 'OASIS', 'SANAR', 'MELENA', 'NATURAL', 'GRATIS', 'COLÁGENO', 'DETOX', 'QUIERO'];

  /* ─── STATE ──────────────────────────────────────────────── */
  const S = {
    tab: 'trend',         // trend | comp | queue
    keyword: '',
    customHashtags: [],
    platform: 'both',    // ig | tiktok | both
    minLikes: 0,
    minViews: 0,
    ctaWord: 'SALUD',
    results: [],
    selected: new Set(),
    competitors: [],
    compVideos: [],
    activeComp: null,
    queue: [],
    loadingSearch: false,
    loadingComp: false,
  };

  /* ─── API ─────────────────────────────────────────────────── */
  function getAuthToken() {
    // Priority 1: User's session token from localStorage (always present when logged in)
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.includes('auth-token') || k.includes('supabase.auth') || k.startsWith('sb-')) {
          const val = JSON.parse(localStorage.getItem(k) || '{}');
          const token = val.access_token || val?.session?.access_token;
          if (token && token.length > 50) return token;
        }
      }
    } catch {}
    // Priority 2: Try from window objects (Supabase client)
    try {
      for (const key of Object.keys(window)) {
        const v = window[key];
        if (v && typeof v === 'object') {
          if (v.supabaseKey && v.supabaseKey.length > 50) return v.supabaseKey;
          if (v.headers?.apikey) return v.headers.apikey;
        }
      }
    } catch {}
    // Priority 3: Cached from main bundle fetch
    return window.__SANATE_ANON || '';
  }

  async function api(action, data = {}) {
    const token = getAuthToken();
    const r = await fetch(EDGE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': token,
      },
      body: JSON.stringify({ action, ...data }),
    });
    if (!r.ok && r.status !== 400) {
      const t = await r.text();
      throw new Error(t.substring(0, 200));
    }
    return r.json();
  }

  /* ─── TOAST ─────────────────────────────────────────────── */
  function toast(msg, type = 'info', dur = 3000) {
    let el = document.getElementById('re-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 're-toast';
      el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(20px);z-index:99999;padding:10px 20px;border-radius:30px;font-size:14px;font-weight:600;color:#fff;opacity:0;transition:all .3s;pointer-events:none;max-width:360px;text-align:center;';
      document.body.appendChild(el);
    }
    const colors = { success: 'linear-gradient(135deg,#22c55e,#16a34a)', error: 'linear-gradient(135deg,#ef4444,#dc2626)', info: 'linear-gradient(135deg,#7c3aed,#6d28d9)', warn: 'linear-gradient(135deg,#f59e0b,#d97706)' };
    el.style.background = colors[type] || colors.info;
    el.textContent = msg;
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(-50%) translateY(20px)'; }, dur);
  }

  /* ─── STYLES ─────────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('re-styles')) return;
    const css = `
      #re-panel { display:none; background:linear-gradient(135deg,#0f0c29,#1a1a2e,#16213e); border-radius:12px; overflow:hidden; font-family:Arial,sans-serif; min-height:500px; }
      .re-header { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; background:rgba(124,58,237,.15); border-bottom:1px solid rgba(124,58,237,.25); }
      .re-header h3 { margin:0; font-size:16px; color:#fff; font-weight:700; }
      .re-tabs-bar { display:flex; gap:4px; padding:10px 14px 0; background:rgba(0,0,0,.2); }
      .re-tab-btn { padding:8px 16px; border:none; border-radius:8px 8px 0 0; font-size:13px; font-weight:600; cursor:pointer; transition:.2s; color:#aaa; background:transparent; }
      .re-tab-btn.active { background:rgba(124,58,237,.3); color:#fff; border-bottom:2px solid #7c3aed; }
      .re-tab-btn:hover:not(.active) { background:rgba(255,255,255,.05); color:#ddd; }
      .re-tab-content { padding:14px; display:none; }
      .re-tab-content.active { display:block; }
      .re-row { display:flex; gap:8px; align-items:center; margin-bottom:10px; flex-wrap:wrap; }
      .re-input { flex:1; min-width:120px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.15); border-radius:8px; padding:8px 12px; color:#fff; font-size:14px; outline:none; }
      .re-input::placeholder { color:#666; }
      .re-input:focus { border-color:#7c3aed; }
      .re-select { background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.15); border-radius:8px; padding:8px 10px; color:#fff; font-size:13px; cursor:pointer; outline:none; }
      .re-select option { background:#1a1a2e; }
      .re-btn { padding:8px 16px; border:none; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; transition:.2s; display:inline-flex; align-items:center; gap:5px; }
      .re-btn-primary { background:linear-gradient(135deg,#7c3aed,#6d28d9); color:#fff; }
      .re-btn-primary:hover { background:linear-gradient(135deg,#8b5cf6,#7c3aed); }
      .re-btn-outline { background:rgba(255,255,255,.06); color:#ccc; border:1px solid rgba(255,255,255,.15); }
      .re-btn-outline:hover { background:rgba(255,255,255,.12); color:#fff; }
      .re-btn-green { background:linear-gradient(135deg,#22c55e,#16a34a); color:#fff; }
      .re-btn-green:hover { background:linear-gradient(135deg,#4ade80,#22c55e); }
      .re-btn-red { background:rgba(239,68,68,.15); color:#f87171; border:1px solid rgba(239,68,68,.3); }
      .re-btn-sm { padding:5px 10px; font-size:12px; }
      .re-btn:disabled { opacity:.5; cursor:not-allowed; }
      .re-chips { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px; }
      .re-chip { padding:4px 10px; border-radius:20px; font-size:12px; cursor:pointer; border:1px solid rgba(255,255,255,.15); color:#ccc; background:rgba(255,255,255,.05); transition:.15s; display:inline-flex; align-items:center; gap:5px; }
      .re-chip:hover { background:rgba(124,58,237,.25); color:#fff; border-color:#7c3aed; }
      .re-chip-del { font-size:11px; color:#888; line-height:1; padding:0 1px; }
      .re-chip-del:hover { color:#f87171; }
      .re-chip-add { padding:4px 10px; border-radius:20px; font-size:12px; cursor:pointer; border:1px dashed rgba(124,58,237,.5); color:#7c3aed; background:transparent; transition:.15s; display:inline-flex; align-items:center; gap:4px; }
      .re-chip-add:hover { background:rgba(124,58,237,.15); border-color:#7c3aed; color:#a78bfa; }
      .re-chip-input-wrap { display:inline-flex; align-items:center; gap:4px; }
      .re-chip-input { background:rgba(255,255,255,.08); border:1px solid #7c3aed; border-radius:20px; padding:3px 10px; color:#fff; font-size:12px; outline:none; width:120px; }
      .re-card-thumb { width:100%; aspect-ratio:9/16; object-fit:cover; background:#1a1a2e; display:block; opacity:0; transition:opacity .3s ease; }
      .re-card-thumb.loaded { opacity:1; }
      .re-section-title { font-size:12px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:.8px; margin:12px 0 6px; display:flex; align-items:center; gap:8px; }
      .re-section-title span { flex:1; height:1px; background:rgba(255,255,255,.08); }
      .re-platform-row { display:flex; gap:8px; margin-bottom:10px; }
      .re-plat-btn { flex:1; padding:8px; border:1px solid rgba(255,255,255,.12); border-radius:8px; background:rgba(255,255,255,.05); color:#aaa; font-size:13px; font-weight:600; cursor:pointer; text-align:center; transition:.15s; }
      .re-sort-bar { display:flex; gap:6px; margin-bottom:10px; }
      .re-sort-btn { flex:1; padding:6px 8px; border:1px solid rgba(255,255,255,.12); border-radius:8px; background:rgba(255,255,255,.04); color:#aaa; font-size:12px; font-weight:600; cursor:pointer; text-align:center; transition:.15s; }
      .re-sort-btn.active { border-color:#7c3aed; background:rgba(124,58,237,.2); color:#fff; }
      .re-sort-btn:hover:not(.active) { background:rgba(255,255,255,.08); color:#ddd; }
      .re-plat-btn.active { border-color:#7c3aed; background:rgba(124,58,237,.2); color:#fff; }
      .re-bulk-bar { display:flex; gap:8px; align-items:center; padding:8px 0; margin-bottom:8px; flex-wrap:wrap; }
      .re-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:10px; }
      @media (max-width:600px) { .re-grid { grid-template-columns:repeat(2,1fr); } }
      .re-card { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.08); border-radius:10px; overflow:hidden; cursor:pointer; transition:.2s; position:relative; }
      .re-card:hover { border-color:rgba(124,58,237,.5); transform:translateY(-2px); box-shadow:0 4px 20px rgba(124,58,237,.2); }
      .re-card.selected { border-color:#7c3aed; background:rgba(124,58,237,.15); }
      .re-card-check { position:absolute; top:6px; left:6px; z-index:2; width:20px; height:20px; border-radius:5px; background:rgba(0,0,0,.6); border:2px solid rgba(255,255,255,.4); display:flex; align-items:center; justify-content:center; font-size:12px; }
      .re-card.selected .re-card-check { background:#7c3aed; border-color:#7c3aed; }
      .re-card-thumb-base { width:100%; aspect-ratio:9/16; object-fit:cover; background:#1a1a2e; display:block; }
      .re-card-thumb-ph { width:100%; aspect-ratio:9/16; background:linear-gradient(135deg,#1a1a2e,#2d2d4e); display:flex; align-items:center; justify-content:center; font-size:28px; }
      .re-card-body { padding:7px; }
      .re-card-stats { display:flex; gap:5px; font-size:10px; color:#aaa; margin-bottom:5px; flex-wrap:wrap; }
      .re-card-stat { display:flex; align-items:center; gap:2px; }
      .re-card-caption { font-size:11px; color:#ccc; line-height:1.3; max-height:32px; overflow:hidden; margin-bottom:6px; }
      .re-card-author { font-size:10px; color:#7c3aed; font-weight:600; }
      .re-card-actions { padding:6px 7px; border-top:1px solid rgba(255,255,255,.06); display:flex; gap:5px; align-items:center; }
      .re-card-ia { font-size:10px; color:#22c55e; padding:3px 0; }
      .re-section-header { display:flex; align-items:center; justify-content:space-between; padding:8px 10px; border-radius:8px; margin-bottom:6px; font-size:13px; font-weight:600; color:#fff; }
      .re-section-ig { background:linear-gradient(135deg,rgba(214,93,177,.15),rgba(240,148,51,.1)); border:1px solid rgba(214,93,177,.2); }
      .re-section-tt { background:linear-gradient(135deg,rgba(0,0,0,.3),rgba(255,0,80,.1)); border:1px solid rgba(255,0,80,.15); }
      .re-empty { text-align:center; padding:30px 20px; color:#666; font-size:13px; }
      .re-empty-icon { font-size:36px; margin-bottom:8px; }
      .re-connect-box { background:rgba(214,93,177,.08); border:1px solid rgba(214,93,177,.2); border-radius:10px; padding:14px; text-align:center; margin:10px 0; }
      .re-connect-box p { margin:0 0 10px; color:#ccc; font-size:13px; }
      .re-comp-item { display:flex; align-items:center; gap:10px; padding:10px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:8px; margin-bottom:8px; }
      .re-comp-avatar { width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg,#7c3aed,#ec4899); display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; overflow:hidden; }
      .re-comp-avatar img { width:100%; height:100%; object-fit:cover; }
      .re-comp-info { flex:1; min-width:0; }
      .re-comp-name { font-size:13px; font-weight:600; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .re-comp-meta { font-size:11px; color:#888; }
      .re-queue-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:12px; }
      .re-stat-box { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.08); border-radius:8px; padding:10px; text-align:center; }
      .re-stat-num { font-size:22px; font-weight:700; color:#fff; }
      .re-stat-label { font-size:11px; color:#888; }
      .re-queue-item { display:flex; gap:10px; padding:10px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:8px; margin-bottom:8px; }
      .re-queue-thumb { width:48px; height:80px; border-radius:6px; object-fit:cover; background:#1a1a2e; flex-shrink:0; }
      .re-queue-thumb-ph { width:48px; height:80px; border-radius:6px; background:linear-gradient(135deg,#2d2d4e,#1a1a2e); display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
      .re-queue-info { flex:1; min-width:0; }
      .re-queue-meta { font-size:11px; color:#888; margin-bottom:4px; }
      .re-queue-caption { font-size:12px; color:#ccc; line-height:1.3; margin-bottom:6px; max-height:36px; overflow:hidden; }
      .re-queue-hashtags { font-size:10px; color:#7c3aed; margin-bottom:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .re-queue-actions { display:flex; gap:5px; flex-wrap:wrap; }
      .re-badge { display:inline-block; padding:2px 8px; border-radius:20px; font-size:11px; font-weight:600; }
      .re-badge-pending { background:rgba(251,191,36,.15); color:#fbbf24; }
      .re-badge-queued { background:rgba(124,58,237,.2); color:#a78bfa; }
      .re-badge-pub { background:rgba(34,197,94,.15); color:#4ade80; }
      .re-badge-fail { background:rgba(239,68,68,.15); color:#f87171; }
      .re-loading { text-align:center; padding:20px; color:#888; animation:re-pulse 1.5s ease infinite; }
      @keyframes re-pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
      .re-cta-bar { display:flex; align-items:center; gap:8px; padding:8px 12px; background:rgba(124,58,237,.1); border:1px solid rgba(124,58,237,.2); border-radius:8px; margin-bottom:10px; }
      .re-cta-bar label { font-size:12px; color:#aaa; white-space:nowrap; }
      .re-cta-select { flex:1; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.15); border-radius:6px; padding:5px 8px; color:#fff; font-size:13px; font-weight:600; }
      .re-modal-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,.7); z-index:9999; align-items:center; justify-content:center; }
      .re-modal-overlay.open { display:flex; }
      .re-modal { background:linear-gradient(135deg,#1a1a2e,#16213e); border:1px solid rgba(124,58,237,.3); border-radius:12px; padding:20px; width:90%; max-width:400px; }
      .re-modal h4 { margin:0 0 12px; color:#fff; font-size:16px; }
      .re-modal-btns { display:flex; gap:8px; margin-top:14px; justify-content:flex-end; }
      .re-ia-preview { background:rgba(34,197,94,.07); border:1px solid rgba(34,197,94,.2); border-radius:8px; padding:10px; margin-top:10px; font-size:12px; color:#ccc; line-height:1.5; }
      .re-ia-preview strong { color:#4ade80; display:block; margin-bottom:4px; }
    `;
    const s = document.createElement('style');
    s.id = 're-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ─── HELPERS ────────────────────────────────────────────── */
  function fmt(n) {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }

  function platformBadge(p) {
    return p === 'tiktok'
      ? '<span style="color:#ff0050;font-size:10px;font-weight:700;">TT</span>'
      : '<span style="color:#d65db1;font-size:10px;font-weight:700;">IG</span>';
  }

  function thumbHTML(url, ph = '🎬') {
    if (url) return `<img class="re-card-thumb" src="${url}" loading="lazy" decoding="async" onload="this.classList.add('loaded')" onerror="this.style.display='none';this.nextSibling.style.display='flex'" /><div class="re-card-thumb-ph" style="display:none">${ph}</div>`;
    return `<div class="re-card-thumb-ph">${ph}</div>`;
  }

  // v2.2: Proxy de thumbnails via edge function → 1 llamada oEmbed → redirect al CDN de TikTok
  // Para IG usa la URL directa (su CDN permite requests del browser sin problemas)
  function thumbProxy(v) {
    if (!v) return '';
    if ((v.platform === 'tiktok' || !v.platform) && v.id) {
      return `${EDGE}?thumb=${encodeURIComponent(v.id)}&user=${encodeURIComponent(v.author_username || '')}`;
    }
    return v.thumbnail_url || '';
  }

  /* ─── BUILD PANEL HTML ───────────────────────────────────── */
  function buildPanelHTML() {
    return `
    <div id="re-panel">
      <div class="re-header">
        <h3>🎬 Extractor de Reels</h3>
        <div style="display:flex;gap:8px;align-items:center;">
          <span id="re-sel-count" style="display:none;font-size:12px;color:#a78bfa;"></span>
          <button class="re-btn re-btn-outline re-btn-sm" onclick="window.__reClose()">✕ Cerrar</button>
        </div>
      </div>

      <div class="re-tabs-bar">
        <button class="re-tab-btn active" data-tab="trend" onclick="window.__reTab('trend')">🔥 Tendencia</button>
        <button class="re-tab-btn" data-tab="comp" onclick="window.__reTab('comp')">🔍 Competencia</button>
        <button class="re-tab-btn" data-tab="queue" onclick="window.__reTab('queue')">📅 Cola <span id="re-queue-count">0</span></button>
      </div>

      <!-- ══ TENDENCIA ══ -->
      <div id="re-tab-trend" class="re-tab-content active">
        <!-- CTA Word selector -->
        <div class="re-cta-bar">
          <label>💬 CTA:</label>
          <select class="re-cta-select" id="re-cta-word" onchange="window.__reCTA(this.value)">
            ${CTA_WORDS.map(w => `<option value="${w}" ${w === 'SALUD' ? 'selected' : ''}>${w}</option>`).join('')}
          </select>
          <span style="font-size:11px;color:#666;">→ "Comenta <b id="re-cta-preview" style="color:#a78bfa">SALUD</b> si quieres saber más"</span>
        </div>

        <!-- Platform selector -->
        <div class="re-platform-row">
          <button class="re-plat-btn" id="re-plat-ig" onclick="window.__rePlat('ig')">📷 Instagram</button>
          <button class="re-plat-btn active" id="re-plat-both" onclick="window.__rePlat('both')">IG + TikTok</button>
          <button class="re-plat-btn" id="re-plat-tt" onclick="window.__rePlat('tiktok')">🎵 TikTok</button>
        </div>

        <!-- Search row -->
        <div class="re-row">
          <input id="re-keyword" class="re-input" placeholder="#hashtag o tema..." value="" />
          <button class="re-btn re-btn-primary" id="re-search-btn" onclick="window.__reSearch()">🔍 Buscar</button>
        </div>

        <!-- Hashtag chips (vacío por defecto, el usuario agrega los suyos) -->
        <div class="re-chips" id="re-chips">
          <button class="re-chip-add" id="re-add-chip-btn" onclick="window.__reShowChipInput()">＋ Hashtag</button>
        </div>

        <!-- Sort buttons — ocultos hasta que haya resultados -->
        <div class="re-sort-bar" id="re-sort-bar" style="display:none;">
          <button class="re-sort-btn active" id="re-sort-recent" onclick="window.__reSort('recent')">🕐 Recientes</button>
          <button class="re-sort-btn" id="re-sort-views" onclick="window.__reSort('views')">👁 Más vistos</button>
          <button class="re-sort-btn" id="re-sort-likes" onclick="window.__reSort('likes')">❤️ Más likes</button>
        </div>

        <!-- Bulk action bar (shows when items selected) -->
        <div class="re-bulk-bar" id="re-bulk-bar" style="display:none;">
          <button class="re-btn re-btn-outline re-btn-sm" onclick="window.__reSelectAll()">☑ Todos</button>
          <button class="re-btn re-btn-outline re-btn-sm" onclick="window.__reDeselect()">☐ Ninguno</button>
          <button class="re-btn re-btn-primary" id="re-bulk-reenviar" onclick="window.__reBulkReenviar()">⬆ Reenviar seleccionados (0)</button>
        </div>

        <!-- Results area -->
        <div id="re-results">
          <div class="re-empty"><div class="re-empty-icon">🔥</div>Busca por hashtag para descubrir contenido viral</div>
        </div>
      </div>

      <!-- ══ COMPETENCIA ══ -->
      <div id="re-tab-comp" class="re-tab-content">
        <div class="re-row" style="margin-bottom:12px;">
          <button class="re-btn re-btn-primary" onclick="window.__reAddComp()">➕ Agregar competidor</button>
        </div>

        <div id="re-comp-list"><div class="re-loading">Cargando...</div></div>
        <div id="re-comp-results"></div>
      </div>

      <!-- ══ COLA ══ -->
      <div id="re-tab-queue" class="re-tab-content">
        <div class="re-queue-stats">
          <div class="re-stat-box"><div class="re-stat-num" id="re-q-pending">0</div><div class="re-stat-label">En Cola</div></div>
          <div class="re-stat-box"><div class="re-stat-num" id="re-q-pub">0</div><div class="re-stat-label">Publicados</div></div>
          <div class="re-stat-box"><div class="re-stat-num" id="re-q-fail">0</div><div class="re-stat-label">Fallidos</div></div>
        </div>

        <!-- Queue CTA -->
        <div class="re-cta-bar" style="margin-bottom:10px;">
          <label>💬 CTA:</label>
          <select class="re-cta-select" id="re-cta-word-queue" onchange="window.__reCTA(this.value)">
            ${CTA_WORDS.map(w => `<option value="${w}" ${w === 'SALUD' ? 'selected' : ''}>${w}</option>`).join('')}
          </select>
        </div>

        <div class="re-row" style="margin-bottom:10px;">
          <button class="re-btn re-btn-primary" onclick="window.__reGenAll()">✨ Generar Descripciones IA</button>
          <button class="re-btn re-btn-green" onclick="window.__rePubAll()">🚀 Publicar Todo</button>
          <button class="re-btn re-btn-outline re-btn-sm" onclick="window.__reLoadQueue()">🔄</button>
        </div>

        <div id="re-queue-list"><div class="re-loading">Cargando cola...</div></div>
      </div>

      <!-- Modal: Add Competitor -->
      <div class="re-modal-overlay" id="re-modal-comp">
        <div class="re-modal">
          <h4>🔍 Agregar Competidor</h4>
          <p style="color:#aaa;font-size:13px;margin:0 0 10px;">Pega el enlace del perfil de Instagram o TikTok:</p>
          <input id="re-comp-url" class="re-input" placeholder="https://www.tiktok.com/@ejemplo" style="width:100%;box-sizing:border-box;" />
          <div style="font-size:11px;color:#666;margin-top:6px;">
            <span style="color:#d65db1">●</span> Instagram: instagram.com/usuario<br>
            <span style="color:#ff0050">●</span> TikTok: tiktok.com/@usuario
          </div>
          <div class="re-modal-btns">
            <button class="re-btn re-btn-outline" onclick="window.__reCloseModal('re-modal-comp')">Cancelar</button>
            <button class="re-btn re-btn-primary" id="re-comp-add-btn" onclick="window.__reDoAddComp()">Agregar ✓</button>
          </div>
        </div>
      </div>
    </div>
    `;
  }

  /* ─── RENDER RESULTS ────────────────────────────────────── */
  function renderResults(igVideos, ttVideos, warning) {
    S.results = [...(igVideos || []), ...(ttVideos || [])];
    S.selected.clear();
    updateSelectionUI();

    let html = '';

    // Instagram section — solo mostrar si hay resultados (IG deshabilitado temporalmente)
    if (igVideos && igVideos.length > 0) {
      html += `<div class="re-section-header re-section-ig">📷 Reels de Instagram <span style="font-size:12px;color:#aaa;font-weight:400;">${igVideos.length} videos</span></div>`;
      html += `<div class="re-grid">${igVideos.map((v, i) => cardHTML(v, i)).join('')}</div>`;
    }

    // TikTok section
    html += `<div class="re-section-header re-section-tt" style="margin-top:12px;">🎵 TikTok <span style="font-size:12px;color:#aaa;font-weight:400;">${ttVideos ? ttVideos.length + ' videos' : ''}</span></div>`;
    if (!ttVideos || ttVideos.length === 0) {
      if (warning) {
        html += `<div class="re-empty" style="color:#f59e0b;font-size:12px;">⚠️ ${warning}</div>`;
      } else {
        html += `<div class="re-empty">Sin resultados para este hashtag en TikTok.</div>`;
      }
    } else {
      html += `<div class="re-grid">${ttVideos.map((v, i) => cardHTML(v, igVideos.length + i)).join('')}</div>`;
    }

    document.getElementById('re-results').innerHTML = html;
    // Mostrar/ocultar botones de sort según si hay resultados
    const sortBar = document.getElementById('re-sort-bar');
    if (sortBar) sortBar.style.display = S.results.length > 0 ? 'flex' : 'none';
    // Reset sort mode a 'recent' en cada búsqueda nueva
    S.sortMode = 'recent';
    ['recent','views','likes'].forEach(m => {
      const btn = document.getElementById(`re-sort-${m}`);
      if (btn) btn.classList.toggle('active', m === 'recent');
    });
    document.getElementById('re-bulk-bar').style.display = S.results.length ? 'flex' : 'none';
    if (document.getElementById('re-bulk-reenviar')) {
      document.getElementById('re-bulk-reenviar').textContent = `⬆ Reenviar seleccionados (0)`;
    }
  }

  function cardHTML(v, idx) {
    const platform = v.platform || 'tiktok';
    const isSelected = S.selected.has(idx);
    return `
    <div class="re-card${isSelected ? ' selected' : ''}" id="re-card-${idx}" onclick="window.__reToggleCard(${idx})">
      <div class="re-card-check">${isSelected ? '✓' : ''}</div>
      ${thumbHTML(thumbProxy(v))}
      <div class="re-card-body">
        <div class="re-card-stats">
          ${platformBadge(platform)}
          <span class="re-card-stat">❤️ ${fmt(v.likes_count)}</span>
          ${v.views_count ? `<span class="re-card-stat">👁 ${fmt(v.views_count)}</span>` : ''}
          ${v.comments_count ? `<span class="re-card-stat">💬 ${fmt(v.comments_count)}</span>` : ''}
        </div>
        ${v.ai_description ? `<div class="re-card-ia">✨ IA listo</div>` : ''}
        <div class="re-card-caption">${(v.caption || '').substring(0, 60)}</div>
        <div class="re-card-author">@${v.author_username || 'desconocido'}</div>
      </div>
      <div class="re-card-actions">
        <button class="re-btn re-btn-primary re-btn-sm" onclick="event.stopPropagation();window.__reReenviar(${idx})" title="Generar IA y agregar a cola">⬆ Reenviar</button>
        ${v.source_url ? `<a href="${v.source_url}" target="_blank" onclick="event.stopPropagation()" style="color:#7c3aed;font-size:18px;text-decoration:none;" title="Ver original">🔗</a>` : ''}
      </div>
    </div>`;
  }

  function renderCompResults(videos, competitor) {
    S.compVideos = videos || [];
    if (!videos || videos.length === 0) {
      document.getElementById('re-comp-results').innerHTML = `
        <div class="re-section-header re-section-tt" style="margin-top:10px;">
          📱 Videos de @${competitor.username}
        </div>
        <div class="re-empty">No se encontraron videos para este competidor</div>`;
      return;
    }
    let html = `<div class="re-section-header re-section-tt" style="margin-top:10px;">📱 Videos de @${competitor.username} <span style="font-size:12px;color:#aaa;">${videos.length} videos</span></div>`;
    html += `<div class="re-grid">${videos.map((v, i) => cardHTMLComp(v, i)).join('')}</div>`;
    document.getElementById('re-comp-results').innerHTML = html;
  }

  function cardHTMLComp(v, idx) {
    return `
    <div class="re-card">
      ${thumbHTML(thumbProxy(v))}
      <div class="re-card-body">
        <div class="re-card-stats">
          ${platformBadge(v.platform)}
          <span class="re-card-stat">❤️ ${fmt(v.likes_count)}</span>
          ${v.views_count ? `<span class="re-card-stat">👁 ${fmt(v.views_count)}</span>` : ''}
        </div>
        <div class="re-card-caption">${(v.caption || '').substring(0, 60)}</div>
        <div class="re-card-author">@${v.author_username || v.author_display || 'desconocido'}</div>
      </div>
      <div class="re-card-actions">
        <button class="re-btn re-btn-primary re-btn-sm" onclick="window.__reReenviarComp(${idx})">⬆ Reenviar</button>
        ${v.source_url ? `<a href="${v.source_url}" target="_blank" style="color:#7c3aed;font-size:18px;text-decoration:none;">🔗</a>` : ''}
      </div>
    </div>`;
  }

  /* ─── QUEUE RENDER ───────────────────────────────────────── */
  function renderQueue(items) {
    S.queue = items || [];
    const pending = items.filter(i => i.status === 'pending' || i.status === 'queued').length;
    const pub = items.filter(i => i.status === 'published').length;
    const fail = items.filter(i => i.status === 'failed').length;
    if (document.getElementById('re-q-pending')) document.getElementById('re-q-pending').textContent = pending;
    if (document.getElementById('re-q-pub')) document.getElementById('re-q-pub').textContent = pub;
    if (document.getElementById('re-q-fail')) document.getElementById('re-q-fail').textContent = fail;
    const colaCount = document.getElementById('re-queue-count');
    if (colaCount) colaCount.textContent = pending;

    if (!items || items.length === 0) {
      document.getElementById('re-queue-list').innerHTML = `<div class="re-empty"><div class="re-empty-icon">📅</div>La cola está vacía. Agrega videos con el botón Reenviar.</div>`;
      return;
    }

    const html = items.map((item, idx) => queueItemHTML(item, idx)).join('');
    document.getElementById('re-queue-list').innerHTML = html;
  }

  function queueItemHTML(item, idx) {
    const reel = item.reel || {};
    const statusMap = { pending: 're-badge-pending Pendiente', queued: 're-badge-queued En cola', published: 're-badge-pub ✅ Publicado', failed: 're-badge-fail ❌ Fallido', publishing: 're-badge-queued Publicando...' };
    const [badgeClass, badgeLabel] = (statusMap[item.status] || 're-badge-pending Pendiente').split(' ', 2);
    const scheduledTime = item.scheduled_at ? new Date(item.scheduled_at).toLocaleString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
    const thumbSrc = item.thumbnail_url || reel.thumbnail_url;
    const caption = item.description || reel.caption || item.hashtags || '(sin descripción)';
    const errorMsg = item.error_log ? `<div style="color:#f87171;font-size:11px;margin-top:3px;">⚠ ${item.error_log.substring(0,80)}</div>` : '';

    return `
    <div class="re-queue-item">
      ${thumbSrc ? `<img class="re-queue-thumb" src="${thumbSrc}" loading="lazy" />` : `<div class="re-queue-thumb-ph">🎬</div>`}
      <div class="re-queue-info">
        <div class="re-queue-meta">
          <span style="color:#888;">${reel.platform === 'tiktok' ? '🎵' : '📷'} Feed de IG</span>
          &nbsp;│&nbsp; 📅 ${scheduledTime}
          &nbsp;│&nbsp; <span class="re-badge ${badgeClass}">${badgeLabel}</span>
        </div>
        <div class="re-queue-caption">${caption.substring(0, 100)}</div>
        ${item.hashtags ? `<div class="re-queue-hashtags">${item.hashtags.substring(0,80)}</div>` : ''}
        ${errorMsg}
        <div class="re-queue-actions">
          ${item.status !== 'published' ? `<button class="re-btn re-btn-green re-btn-sm" onclick="window.__rePubItem('${item.id}')">🚀 Publicar</button>` : ''}
          <button class="re-btn re-btn-outline re-btn-sm" onclick="window.__reGenItem('${item.id}','${item.reel_id || ''}','${reel.caption ? reel.caption.substring(0,50).replace(/'/g,'') : ''}')">✨ IA</button>
          <button class="re-btn re-btn-outline re-btn-sm" onclick="window.__reEditItem('${item.id}')">✏</button>
          <button class="re-btn re-btn-red re-btn-sm" onclick="window.__reDelItem('${item.id}')">🗑</button>
          ${reel.source_url ? `<a href="${reel.source_url}" target="_blank" style="color:#7c3aed;font-size:16px;text-decoration:none;align-self:center;">🔗</a>` : ''}
        </div>
      </div>
    </div>`;
  }

  /* ─── SELECTION UI ───────────────────────────────────────── */
  function updateSelectionUI() {
    const count = S.selected.size;
    const countEl = document.getElementById('re-sel-count');
    const bulkBtn = document.getElementById('re-bulk-reenviar');
    if (countEl) {
      countEl.textContent = count > 0 ? `${count} seleccionados` : '';
      countEl.style.display = count > 0 ? 'inline' : 'none';
    }
    if (bulkBtn) bulkBtn.textContent = `⬆ Reenviar seleccionados (${count})`;
  }

  /* ─── SEARCH ────────────────────────────────────────────── */
  async function doSearch() {
    if (S.loadingSearch) return;
    S.loadingSearch = true;
    const keyword = document.getElementById('re-keyword')?.value?.replace('#', '').trim() || '';
    const minLikes = parseInt(document.getElementById('re-min-likes')?.value || '0');
    const minViews = parseInt(document.getElementById('re-min-views')?.value || '0');
    const platform = S.platform;
    S.keyword = keyword;
    S.minLikes = minLikes;
    S.minViews = minViews;

    const btn = document.getElementById('re-search-btn');
    if (btn) { btn.disabled = true; btn.textContent = '🔄 Buscando...'; }
    // v2.2: render skeleton instantáneo — imágenes cargan lazy después via proxy
    document.getElementById('re-results').innerHTML = `
      <div class="re-loading" style="text-align:center;padding:20px;">
        <div style="font-size:24px;margin-bottom:8px;">🔍</div>
        <div style="color:#a78bfa;font-size:13px;">Buscando contenido viral...</div>
        <div style="color:#666;font-size:11px;margin-top:4px;">Las imágenes cargan al instante una vez encontrados los videos</div>
      </div>`;

    try {
      let igVideos = null, ttVideos = null, ttWarning = null;

      const searches = [];
      if (platform === 'ig' || platform === 'both') {
        searches.push(api('search_ig_trending', { hashtag: keyword, min_likes: minLikes })
          .then(r => { igVideos = r.ok ? (r.data?.videos || []) : []; })
          .catch(() => { igVideos = []; }));
      } else {
        igVideos = [];
      }

      if (platform === 'tiktok' || platform === 'both') {
        searches.push(api('search_tiktok_trending', { keywords: keyword, min_likes: minLikes, min_views: minViews })
          .then(r => {
            if (r.ok) { ttVideos = r.data?.videos || []; ttWarning = r.data?.warning; }
            else { ttVideos = []; ttWarning = r.error; }
          })
          .catch(e => { ttVideos = []; ttWarning = e.message; }));
      } else {
        ttVideos = [];
      }

      await Promise.all(searches);
      renderResults(igVideos, ttVideos, ttWarning);

      const total = (igVideos?.length || 0) + (ttVideos?.length || 0);
      if (total > 0) toast(`✅ ${total} videos encontrados`, 'success');
      else toast('Sin resultados. Prueba otro hashtag.', 'warn');
    } catch (e) {
      document.getElementById('re-results').innerHTML = `<div class="re-empty" style="color:#f87171;">Error: ${e.message}</div>`;
      toast('Error al buscar: ' + e.message, 'error');
    } finally {
      S.loadingSearch = false;
      if (btn) { btn.disabled = false; btn.textContent = '🔍 Buscar'; }
    }
  }

  /* ─── REENVIAR (with auto IA) ────────────────────────────── */
  async function reenviarVideo(video, btnEl) {
    if (!video) return;
    if (btnEl) { btnEl.disabled = true; btnEl.textContent = '✨ Generando IA...'; }

    try {
      // Auto-generate IA description before adding to queue
      let aiDescription = video.ai_description || '';
      let aiHashtags = video.ai_hashtags || '';

      if (!aiDescription) {
        toast('✨ Generando descripción IA...', 'info', 5000);
        try {
          const iaRes = await api('generate_reel_description', {
            caption: video.caption || '',
            niche: 'salud y bienestar natural',
            cta_word: S.ctaWord,
            platform: video.platform || 'instagram',
          });
          if (iaRes.ok) {
            aiDescription = iaRes.data?.description || '';
            aiHashtags = iaRes.data?.hashtags || '';
            video.ai_description = aiDescription;
            video.ai_hashtags = aiHashtags;
          }
        } catch {}
      }

      if (btnEl) btnEl.textContent = '⬆ Agregando...';
      const qRes = await api('queue_bulk', {
        reels: [{ ...video, ai_description: aiDescription, ai_hashtags: aiHashtags }],
        platform_target: 'ig_feed',
        cta_word: S.ctaWord,
      });

      if (qRes.ok) {
        toast('✅ Agregado a la cola con IA', 'success');
        if (btnEl) { btnEl.textContent = '✓ En Cola'; btnEl.disabled = true; btnEl.style.background = '#22c55e'; }
        // Update queue count
        loadQueueCount();
      } else {
        throw new Error(qRes.error || 'Error al agregar');
      }
    } catch (e) {
      toast('Error: ' + e.message, 'error');
      if (btnEl) { btnEl.disabled = false; btnEl.textContent = '⬆ Reenviar'; }
    }
  }

  /* ─── LOAD COMPETITORS ───────────────────────────────────── */
  async function loadCompetitors() {
    try {
      const res = await api('list_competitors');
      S.competitors = res.ok ? (res.data || []) : [];
      renderCompetitorList(S.competitors);
    } catch (e) {
      document.getElementById('re-comp-list').innerHTML = `<div class="re-empty" style="color:#f87171;">Error: ${e.message}</div>`;
    }
  }

  function renderCompetitorList(comps) {
    if (!comps || comps.length === 0) {
      document.getElementById('re-comp-list').innerHTML = `
        <div class="re-empty">
          <div class="re-empty-icon">🔍</div>
          Agrega competidores de Instagram o TikTok<br>para monitorear sus mejores videos
        </div>`;
      return;
    }
    const html = comps.map(c => `
      <div class="re-comp-item">
        <div class="re-comp-avatar">
          ${c.avatar_url ? `<img src="${c.avatar_url}" alt="" />` : (c.platform === 'instagram' ? '📷' : '🎵')}
        </div>
        <div class="re-comp-info">
          <div class="re-comp-name">${c.display_name || c.username}</div>
          <div class="re-comp-meta">@${c.username} ${c.last_scraped_at ? '· Escaneado: ' + new Date(c.last_scraped_at).toLocaleDateString('es-CO') : ''}</div>
        </div>
        <button class="re-btn re-btn-primary re-btn-sm" onclick="window.__reScan('${c.id}','${c.username}')">Escanear</button>
        <button class="re-btn re-btn-red re-btn-sm" onclick="window.__reDelComp('${c.id}')">🗑</button>
      </div>
    `).join('');
    document.getElementById('re-comp-list').innerHTML = html;
  }

  /* ─── SCAN COMPETITOR ────────────────────────────────────── */
  async function scanCompetitor(compId, username, btn) {
    S.loadingComp = true;
    if (btn) { btn.disabled = true; btn.textContent = '⏳...'; }
    document.getElementById('re-comp-results').innerHTML = `<div class="re-loading">Escaneando @${username}...</div>`;
    try {
      const res = await api('scan_competitor', { competitor_id: compId, min_likes: 0, min_views: 0 });
      if (res.ok) {
        renderCompResults(res.data?.videos, res.data?.competitor || { username });
        if (res.data?.warning) toast('⚠️ ' + res.data.warning, 'warn', 5000);
        else toast(`✅ ${res.data?.total || 0} videos encontrados`, 'success');
      } else {
        document.getElementById('re-comp-results').innerHTML = `<div class="re-empty" style="color:#f87171;">Error: ${res.error}</div>`;
        toast('Error: ' + res.error, 'error');
      }
    } catch (e) {
      document.getElementById('re-comp-results').innerHTML = `<div class="re-empty" style="color:#f87171;">Error: ${e.message}</div>`;
      toast('Error: ' + e.message, 'error');
    } finally {
      S.loadingComp = false;
      if (btn) { btn.disabled = false; btn.textContent = 'Escanear'; }
    }
  }

  /* ─── LOAD QUEUE ─────────────────────────────────────────── */
  async function loadQueue() {
    try {
      const res = await api('get_queue');
      if (res.ok) renderQueue(res.data || []);
      else document.getElementById('re-queue-list').innerHTML = `<div class="re-empty" style="color:#f87171;">Error: ${res.error}</div>`;
    } catch (e) {
      document.getElementById('re-queue-list').innerHTML = `<div class="re-empty" style="color:#f87171;">Error: ${e.message}</div>`;
    }
  }

  async function loadQueueCount() {
    try {
      const res = await api('get_queue');
      if (res.ok) {
        const pending = (res.data || []).filter(i => i.status === 'pending' || i.status === 'queued').length;
        const el = document.getElementById('re-queue-count');
        if (el) el.textContent = pending;
      }
    } catch {}
  }

  /* ─── TAB INJECTION ──────────────────────────────────────── */
  function injectTab() {
    if (document.getElementById('re-panel')) return;

    // Find the marketing-redes container
    const container = document.querySelector('.marketing-redes');
    if (!container) {
      setTimeout(injectTab, 500);
      return;
    }

    // Find the tab bar (div containing Conexiones button)
    const allBtns = Array.from(container.querySelectorAll('button'));
    const conxBtn = allBtns.find(b => b.textContent.trim() === 'Conexiones' || b.textContent.includes('Conexiones'));
    if (!conxBtn) {
      setTimeout(injectTab, 500);
      return;
    }

    const tabBar = conxBtn.parentElement;

    // Find the content area (sibling div after tab bar)
    const contentArea = tabBar.nextElementSibling;

    // Inject extractor tab button into the tab bar
    const tabBtn = document.createElement('button');
    tabBtn.id = 're-tab-btn';
    tabBtn.textContent = '🎬 Extractor de carretes';
    // Copy style from existing tab buttons
    tabBtn.style.cssText = conxBtn.style.cssText || '';
    // Try to match the class of existing inactive tab buttons
    tabBtn.className = conxBtn.className;
    tabBtn.setAttribute('data-re-btn', '1');
    tabBar.appendChild(tabBtn);

    // Inject panel INSIDE the container (after the tab bar)
    const panelWrapper = document.createElement('div');
    panelWrapper.id = 're-panel-wrapper';
    panelWrapper.style.cssText = 'display:none;';
    panelWrapper.innerHTML = buildPanelHTML();
    container.appendChild(panelWrapper);

    // Tab button click
    tabBtn.addEventListener('click', activateReelsExtractor);

    // Watch other tab clicks
    watchOtherTabs(tabBar, contentArea, panelWrapper);

    // Initialize ANON key from main bundle
    loadAnonKey();

    injectStyles();
  }

  async function loadAnonKey() {
    if (window.__SANATE_ANON) return;
    try {
      const r = await fetch('/main.b29121b2.js');
      const t = await r.text();
      const match = t.match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g);
      if (match && match[0]) {
        window.__SANATE_ANON = match[0];
        // Patch ANON in the closure scope
        Object.defineProperty(window, '__RE_ANON', { value: match[0], writable: false });
      }
    } catch {}
  }

  function activateReelsExtractor() {
    const panelWrapper = document.getElementById('re-panel-wrapper');
    const panel = document.getElementById('re-panel');
    if (!panelWrapper || !panel) return;

    // Find content area
    const container = document.querySelector('.marketing-redes');
    const tabBar = panel ? panelWrapper.previousElementSibling : null;

    // Hide React content area — keep only the tab bar, hide everything else
    if (container) {
      Array.from(container.children).forEach(child => {
        const isTitle = child.tagName === 'H2' || child.tagName === 'P';
        const isPanel = child.id === 're-panel-wrapper';
        const isTabBar = child.querySelector && Array.from(child.querySelectorAll('button')).some(b => b.textContent.includes('Conexiones'));
        if (!isTitle && !isPanel && !isTabBar) {
          child._reWasVisible = child.style.display !== undefined ? child.style.display : '';
          child.style.display = 'none';
        }
      });
    }

    // Show panel
    panelWrapper.style.display = 'block';
    panel.style.display = 'block';
    renderChips();

    // Restore sub-tab (Tendencia/Competencia/Cola)
    try {
      const savedSub = localStorage.getItem('re_active_sub_tab');
      if (savedSub && savedSub !== S.tab) {
        S.tab = savedSub;
        document.querySelectorAll('.re-tab-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === savedSub));
        document.querySelectorAll('.re-tab-content').forEach(c => c.classList.toggle('active', c.id === `re-tab-${savedSub}`));
      }
    } catch {}

    // Mark tab button active
    const tabBtn = document.getElementById('re-tab-btn');
    if (tabBtn) {
      // Remove active from siblings
      Array.from(tabBtn.parentElement.children).forEach(b => {
        if (!b.getAttribute('data-re-btn')) {
          b.style.borderBottom = '';
          b.style.color = '';
          b.style.opacity = '0.7';
        }
      });
      tabBtn.style.borderBottom = '2px solid #7c3aed';
      tabBtn.style.color = '#fff';
      tabBtn.style.opacity = '1';
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Persist: mark extractor tab as active so reload restores it
    try { localStorage.setItem('re_active_main_tab', 'extractor'); } catch {}

    // Load data for active sub-tab
    if (S.tab === 'queue') loadQueue();
    else if (S.tab === 'comp') loadCompetitors();
  }

  function watchOtherTabs(tabBar, contentArea, panelWrapper) {
    if (!tabBar) return;
    tabBar.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn || btn.getAttribute('data-re-btn')) return;

      // A React tab was clicked - hide extractor panel, restore React content
      // Persist which React tab is now active
      try { localStorage.setItem('re_active_main_tab', btn.textContent.trim()); } catch {}
      if (panelWrapper) panelWrapper.style.display = 'none';
      const panel = document.getElementById('re-panel');
      if (panel) panel.style.display = 'none';

      // Restore hidden React content (hidden by extractor OR by autopublicador panel)
      const container = document.querySelector('.marketing-redes');
      if (container) {
        Array.from(container.children).forEach(child => {
          if (child._reWasVisible !== undefined) {
            child.style.display = child._reWasVisible;
          }
          if (child._apWasVisible !== undefined) {
            child.style.display = child._apWasVisible;
            delete child._apWasVisible;
          }
        });
      }
      // Also remove ap2-panel so it re-injects fresh on next autopublicador click
      const ap2 = document.getElementById('ap2-panel');
      if (ap2) ap2.remove();
      const ap2mark = document.getElementById('ap2-injected');
      if (ap2mark) { ap2mark.remove(); window._apInjected = false; }

      // Reset tab button style
      const tabBtn = document.getElementById('re-tab-btn');
      if (tabBtn) {
        tabBtn.style.borderBottom = '';
        tabBtn.style.color = '';
        tabBtn.style.opacity = '0.7';
      }
    });
  }

  /* ─── GLOBAL FUNCTIONS ───────────────────────────────────── */
  window.__reClose = function () {
    const tabBar = document.getElementById('re-tab-btn')?.parentElement;
    if (tabBar) {
      // Click first real tab button (Conexiones)
      const firstBtn = Array.from(tabBar.children).find(b => !b.getAttribute('data-re-btn'));
      if (firstBtn) firstBtn.click();
    }
  };

  window.__reTab = function (tab) {
    S.tab = tab;
    try { localStorage.setItem('re_active_sub_tab', tab); } catch {}
    document.querySelectorAll('.re-tab-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === tab));
    document.querySelectorAll('.re-tab-content').forEach(c => c.classList.toggle('active', c.id === `re-tab-${tab}`));
    if (tab === 'queue') loadQueue();
    else if (tab === 'comp') loadCompetitors();
  };

  window.__reCTA = function (word) {
    S.ctaWord = word;
    const preview = document.getElementById('re-cta-preview');
    if (preview) preview.textContent = word;
    // Sync both dropdowns
    ['re-cta-word', 're-cta-word-queue'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = word;
    });
  };

  window.__rePlat = function (plat) {
    S.platform = plat;
    ['ig', 'both', 'tiktok'].forEach(p => {
      const el = document.getElementById(`re-plat-${p}`);
      if (el) el.classList.toggle('active', p === plat);
    });
    // Auto-buscar si ya hay keyword ingresado
    const kw = document.getElementById('re-keyword')?.value?.trim() || '';
    if (kw) doSearch();
  };

  window.__reSearch = doSearch;

  /* ─── SORT RESULTS ──────────────────────────────────────── */
  S.sortMode = 'recent';

  window.__reSort = function(mode) {
    S.sortMode = mode;
    // Update button styles
    ['recent','views','likes'].forEach(m => {
      const btn = document.getElementById(`re-sort-${m}`);
      if (btn) btn.classList.toggle('active', m === mode);
    });
    if (!S.results || !S.results.length) return;
    // Sort the full combined results array
    const sorted = [...S.results].sort((a, b) => {
      if (mode === 'views') {
        return (b.views_count || b.play_count || 0) - (a.views_count || a.play_count || 0);
      }
      if (mode === 'likes') {
        return (b.likes_count || b.digg_count || 0) - (a.likes_count || a.digg_count || 0);
      }
      // 'recent' — by date descending
      const bTime = b.created_at ? new Date(b.created_at).getTime() : (b.createTime ? b.createTime * 1000 : 0);
      const aTime = a.created_at ? new Date(a.created_at).getTime() : (a.createTime ? a.createTime * 1000 : 0);
      return bTime - aTime;
    });
    // Replace entire results area with a single unified sorted grid
    const results = document.getElementById('re-results');
    if (results) {
      results.innerHTML = `<div class="re-grid">${sorted.map((v, i) => cardHTML(v, i)).join('')}</div>`;
    }
  };

  window.__reChip = function (el) {
    const kw = el.dataset.kw || el.textContent.replace('#', '').replace('×','').trim();
    const input = document.getElementById('re-keyword');
    if (input) input.value = kw;
    doSearch();
  };

  function renderChips() {
    const container = document.getElementById('re-chips');
    if (!container) return;
    const chips = S.customHashtags.map((tag, i) => `
      <span class="re-chip" data-kw="${tag}" onclick="window.__reChip(this)">
        #${tag}<span class="re-chip-del" onclick="event.stopPropagation();window.__reRemoveChip(${i})">×</span>
      </span>`).join('');
    container.innerHTML = chips + `<button class="re-chip-add" id="re-add-chip-btn" onclick="window.__reShowChipInput()">＋ Hashtag</button>`;
  }

  window.__reRemoveChip = function (idx) {
    S.customHashtags.splice(idx, 1);
    try { localStorage.setItem('re_hashtags', JSON.stringify(S.customHashtags)); } catch {}
    renderChips();
  };

  window.__reShowChipInput = function () {
    const btn = document.getElementById('re-add-chip-btn');
    if (!btn) return;
    btn.style.display = 'none';
    const wrap = document.createElement('span');
    wrap.className = 're-chip-input-wrap';
    wrap.id = 're-chip-input-wrap';
    wrap.innerHTML = `<input class="re-chip-input" id="re-chip-new-input" placeholder="#hashtag" autofocus />
      <button class="re-btn re-btn-primary re-btn-sm" onclick="window.__reConfirmChip()">✓</button>
      <button class="re-btn re-btn-outline re-btn-sm" onclick="window.__reCancelChipInput()">✕</button>`;
    btn.parentNode.insertBefore(wrap, btn);
    const inp = document.getElementById('re-chip-new-input');
    if (inp) { inp.focus(); inp.addEventListener('keydown', e => { if (e.key === 'Enter') window.__reConfirmChip(); if (e.key === 'Escape') window.__reCancelChipInput(); }); }
  };

  window.__reConfirmChip = function () {
    const inp = document.getElementById('re-chip-new-input');
    if (!inp) return;
    const tag = inp.value.replace(/^#+/, '').trim();
    if (tag && !S.customHashtags.includes(tag)) {
      S.customHashtags.push(tag);
      try { localStorage.setItem('re_hashtags', JSON.stringify(S.customHashtags)); } catch {}
    }
    renderChips();
  };

  window.__reCancelChipInput = function () {
    const wrap = document.getElementById('re-chip-input-wrap');
    if (wrap) wrap.remove();
    const btn = document.getElementById('re-add-chip-btn');
    if (btn) btn.style.display = '';
  };

  window.__reToggleCard = function (idx) {
    if (S.selected.has(idx)) S.selected.delete(idx);
    else S.selected.add(idx);
    const card = document.getElementById(`re-card-${idx}`);
    if (card) {
      card.classList.toggle('selected', S.selected.has(idx));
      const check = card.querySelector('.re-card-check');
      if (check) check.textContent = S.selected.has(idx) ? '✓' : '';
    }
    updateSelectionUI();
  };

  window.__reSelectAll = function () {
    S.results.forEach((_, i) => S.selected.add(i));
    document.querySelectorAll('.re-card').forEach((c, i) => {
      c.classList.add('selected');
      const check = c.querySelector('.re-card-check');
      if (check) check.textContent = '✓';
    });
    updateSelectionUI();
  };

  window.__reDeselect = function () {
    S.selected.clear();
    document.querySelectorAll('.re-card').forEach(c => {
      c.classList.remove('selected');
      const check = c.querySelector('.re-card-check');
      if (check) check.textContent = '';
    });
    updateSelectionUI();
  };

  window.__reReenviar = async function (idx) {
    const video = S.results[idx];
    if (!video) return;
    const card = document.getElementById(`re-card-${idx}`);
    const btn = card ? card.querySelector('.re-btn-primary') : null;
    await reenviarVideo(video, btn);
  };

  window.__reReenviarComp = async function (idx) {
    const video = S.compVideos[idx];
    if (!video) return;
    const cards = document.querySelectorAll('#re-comp-results .re-card');
    const btn = cards[idx] ? cards[idx].querySelector('.re-btn-primary') : null;
    await reenviarVideo(video, btn);
  };

  window.__reBulkReenviar = async function () {
    if (S.selected.size === 0) { toast('Selecciona al menos un video', 'warn'); return; }
    const videos = Array.from(S.selected).map(i => S.results[i]).filter(Boolean);
    if (!videos.length) return;

    const btn = document.getElementById('re-bulk-reenviar');
    if (btn) { btn.disabled = true; btn.textContent = `⏳ Procesando ${videos.length}...`; }
    toast(`✨ Generando IA para ${videos.length} videos...`, 'info', 8000);

    // Generate IA for all, then bulk-add
    const enriched = [];
    for (const v of videos) {
      let aiDescription = v.ai_description || '';
      let aiHashtags = v.ai_hashtags || '';
      if (!aiDescription) {
        try {
          const iaRes = await api('generate_reel_description', {
            caption: v.caption || '',
            niche: 'salud y bienestar natural',
            cta_word: S.ctaWord,
            platform: v.platform || 'instagram',
          });
          if (iaRes.ok) { aiDescription = iaRes.data?.description || ''; aiHashtags = iaRes.data?.hashtags || ''; }
        } catch {}
      }
      enriched.push({ ...v, ai_description: aiDescription, ai_hashtags: aiHashtags });
    }

    try {
      const res = await api('queue_bulk', { reels: enriched, platform_target: 'ig_feed', cta_word: S.ctaWord });
      if (res.ok) {
        toast(`✅ ${res.data?.queued || enriched.length} videos en cola con IA`, 'success');
        window.__reDeselect();
        loadQueueCount();
      } else {
        toast('Error: ' + res.error, 'error');
      }
    } catch (e) {
      toast('Error: ' + e.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = `⬆ Reenviar seleccionados (0)`; }
    }
  };

  /* ─── COMPETITOR ACTIONS ─────────────────────────────────── */
  window.__reAddComp = function () {
    const modal = document.getElementById('re-modal-comp');
    if (modal) { modal.classList.add('open'); document.getElementById('re-comp-url').value = ''; }
  };

  window.__reCloseModal = function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  };

  window.__reDoAddComp = async function () {
    const url = document.getElementById('re-comp-url')?.value?.trim();
    if (!url) { toast('Pega la URL del perfil', 'warn'); return; }
    const btn = document.getElementById('re-comp-add-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Agregando...'; }
    try {
      const res = await api('add_competitor', { profile_url: url });
      if (res.ok) {
        toast(`✅ @${res.data?.username || 'competidor'} agregado`, 'success');
        window.__reCloseModal('re-modal-comp');
        loadCompetitors();
      } else {
        toast('Error: ' + res.error, 'error');
      }
    } catch (e) {
      toast('Error: ' + e.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Agregar ✓'; }
    }
  };

  window.__reScan = function (id, username) {
    const comps = document.querySelectorAll('#re-comp-list .re-comp-item');
    // Find the scan button for this competitor
    let btn = null;
    comps.forEach(c => {
      if (c.querySelector('.re-comp-name')?.textContent.includes(username) || c.innerHTML.includes(id)) {
        btn = c.querySelector('.re-btn-primary');
      }
    });
    scanCompetitor(id, username, btn);
  };

  window.__reDelComp = async function (id) {
    if (!confirm('¿Eliminar este competidor?')) return;
    try {
      await api('delete_competitor', { id });
      toast('Competidor eliminado', 'info');
      loadCompetitors();
    } catch (e) {
      toast('Error: ' + e.message, 'error');
    }
  };

  /* ─── QUEUE ACTIONS ──────────────────────────────────────── */
  window.__reLoadQueue = loadQueue;

  window.__rePubItem = async function (id) {
    toast('🚀 Publicando...', 'info', 8000);
    try {
      const res = await api('publish_from_queue', { id });
      if (res.ok) { toast('✅ Publicado exitosamente', 'success'); loadQueue(); }
      else { toast('Error: ' + res.error, 'error'); loadQueue(); }
    } catch (e) {
      toast('Error: ' + e.message, 'error');
      loadQueue();
    }
  };

  window.__reGenItem = async function (qId, reelId, captionHint) {
    toast('✨ Generando descripción IA...', 'info', 6000);
    try {
      let caption = captionHint || '';
      if (reelId) {
        const res = await api('generate_reel_description', {
          caption, niche: 'salud y bienestar natural', cta_word: S.ctaWord, platform: 'instagram',
        });
        if (res.ok) {
          const { description, hashtags } = res.data;
          await api('update_queue_item', { id: qId, updates: { description, hashtags, cta_word: S.ctaWord } });
          toast('✅ Descripción IA generada', 'success');
          loadQueue();
        } else {
          toast('Error IA: ' + res.error, 'error');
        }
      }
    } catch (e) {
      toast('Error: ' + e.message, 'error');
    }
  };

  window.__reGenAll = async function () {
    if (!S.queue.length) { toast('La cola está vacía', 'warn'); return; }
    const pendingIds = S.queue.filter(i => !i.description).map(i => i.id);
    if (!pendingIds.length) { toast('Todos los items ya tienen descripción IA', 'info'); return; }
    toast(`✨ Generando IA para ${pendingIds.length} items...`, 'info', 10000);
    try {
      const res = await api('generate_descriptions_bulk', { ids: pendingIds, cta_word: S.ctaWord });
      if (res.ok) { toast(`✅ ${res.data?.generated} descripciones generadas`, 'success'); loadQueue(); }
      else { toast('Error: ' + res.error, 'error'); }
    } catch (e) {
      toast('Error: ' + e.message, 'error');
    }
  };

  window.__rePubAll = async function () {
    const pending = S.queue.filter(i => i.status === 'pending' || i.status === 'queued');
    if (!pending.length) { toast('No hay items pendientes', 'warn'); return; }
    if (!confirm(`¿Publicar ${pending.length} videos ahora?`)) return;
    for (const item of pending) {
      await window.__rePubItem(item.id);
      await new Promise(r => setTimeout(r, 500));
    }
  };

  window.__reDelItem = async function (id) {
    if (!confirm('¿Eliminar este item de la cola?')) return;
    try {
      await api('delete_queue_item', { id });
      toast('Item eliminado', 'info');
      loadQueue();
    } catch (e) {
      toast('Error: ' + e.message, 'error');
    }
  };

  window.__reEditItem = function (id) {
    const item = S.queue.find(i => i.id === id);
    if (!item) return;
    const desc = prompt('Editar descripción:', item.description || '');
    if (desc === null) return;
    api('update_queue_item', { id, updates: { description: desc } })
      .then(r => { if (r.ok) { toast('✅ Descripción actualizada', 'success'); loadQueue(); } })
      .catch(e => toast('Error: ' + e.message, 'error'));
  };

  window.__reGoConnect = function () {
    // Navigate to Conexiones tab
    const conxBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Conexiones');
    if (conxBtn) conxBtn.click();
    else window.location.href = '/dashboard/marketing-redes';
  };

  /* ─── INIT ───────────────────────────────────────────────── */
  function init() {
    console.log('[RE] reels-extractor v2.1 init');
    // Restore saved hashtags from localStorage
    try { S.customHashtags = JSON.parse(localStorage.getItem('re_hashtags') || '[]'); } catch { S.customHashtags = []; }
    injectStyles();

    let injecting = false;
    function tryInjectSafe() {
      if (injecting) return;
      const container = document.querySelector('.marketing-redes');
      if (!container || !container.querySelector('button')) return;
      if (document.getElementById('re-tab-btn')) return; // already injected
      injecting = true;
      try { injectTab(); } catch(e) { console.error('[RE] injectTab error:', e); }
      injecting = false;
      // Restore last active tab after injection
      try {
        const savedTab = localStorage.getItem('re_active_main_tab');
        if (savedTab === 'extractor') {
          setTimeout(function() {
            const tabBtn = document.getElementById('re-tab-btn');
            if (tabBtn) tabBtn.click();
          }, 300);
        } else if (savedTab) {
          // Try to click the saved React tab by matching button text
          setTimeout(function() {
            const tabBar = document.getElementById('re-tab-btn')?.parentElement;
            if (tabBar) {
              const allBtns = Array.from(tabBar.querySelectorAll('button'));
              const target = allBtns.find(b => !b.getAttribute('data-re-btn') && b.textContent.trim() === savedTab);
              if (target) target.click();
            }
          }, 300);
        }
      } catch {}
    }

    // Initial attempt with retries
    let attempts = 0;
    const tryInject = () => {
      const container = document.querySelector('.marketing-redes');
      if (container && container.querySelector('button')) {
        tryInjectSafe();
      } else if (attempts++ < 40) {
        setTimeout(tryInject, 300);
      }
    };
    tryInject();

    // MutationObserver: re-inject if React wipes our elements
    const obs = new MutationObserver(() => {
      if (!document.getElementById('re-tab-btn')) {
        tryInjectSafe();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }

})();

/* v10.7-whitespace-fix — remove blank padding around product landing sections */
(function(){
  function injectWhitespaceFix(){
    var style=document.getElementById('snt-whitespace-fix');
    if(style)return;
    var s=document.createElement('style');
    s.id='snt-whitespace-fix';
    s.textContent='.pageDetail .detail{padding-top:0!important;padding-bottom:0!important}';
    document.head.appendChild(s);
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',injectWhitespaceFix);
  } else {
    injectWhitespaceFix();
  }
})();
