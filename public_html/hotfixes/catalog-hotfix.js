/**
 * Sanate.store Catalog Hotfix v2
 * Enhances product cards with better titles, descriptions, and "Añadir al Carrito" buttons
 * Runs on React SPA catalog page at /catalogo
 */

(function() {
  'use strict';

  // ========== LANDING PAGE MAPPING ==========
  // Maps product keywords to landing page filenames
  const landingPageMap = {
    'curcuma': 'landing-curcuma',
    'cúrcuma': 'landing-curcuma',
    'kójico': 'landing-curcuma',
    'kojico': 'landing-curcuma',
    'melena': 'landing-melena',
    'sebo': 'landing-sebo',
    'polen': 'landing-polen',
    'néctar': 'landing-nectar',
    'nectar': 'landing-nectar',
    'capilar completo': 'landing-nectar',
    'secreto': 'landing-secreto',
    'japonés': 'landing-secreto',
    'japones': 'landing-secreto',
    'kit total': 'landing-kit-total',
    'kit familia': 'landing-kit-total',
    'avena': 'landing-curcuma',
    'calendula': 'landing-curcuma',
    'tripack': 'landing-curcuma',
    'energía': 'landing-polen',
    'energia': 'landing-polen',
    'power': 'landing-melena',
    'mente': 'landing-melena',
    'ritual': 'landing-sebo',
    'piel': 'landing-sebo',
    'regenerador': 'landing-sebo'
  };

  function getLandingPage(productName) {
    const lower = productName.toLowerCase();
    for (const [keyword, page] of Object.entries(landingPageMap)) {
      if (lower.includes(keyword)) return '/' + page + '.html';
    }
    return null;
  }

  // ========== CONFIGURATION ==========
  const CONFIG = {
    checkInterval: 500, // ms between render checks
    cartKey: 'sanate_cart_v2',
    buttonClass: 'cat-add-btn',
    cardSelectors: [
      '.catalogoGridCard',
      '.cardProdcut',
      '.cardProdcutmasVendido'
    ],
    brandColors: {
      green: '#1a7a3a',
      greenLight: '#22a047',
      gray: '#666666',
      grayLight: '#999999'
    }
  };

  // ========== PRODUCT DESCRIPTIONS MAPPING ==========
  const productDescriptions = {
    'Cúrcuma': '3 Jabones 100g · Aclara manchas · Reduce acné · Piel luminosa',
    'Kójico': '3 Jabones 100g · Aclara manchas · Reduce acné · Piel luminosa',
    'Melena': '60 Cápsulas 250mg · Claridad mental · Memoria · Enfoque',
    'Sebo': 'Hidratación profunda · Regenera manchas · Piel restaurada',
    'Polen': '90 Cáps · Energía natural · Defensas · Colágeno puro del Huila',
    'Néctar': '200ml · Brillo intenso · Sin frizz · Hidratación capilar',
    'Avena': '3 Jabones 100g · Piel sensible · Hidratación · Suavidad',
    'Calendula': '3 Jabones 100g · Cicatrizante · Antinflamatorio · Piel sana',
    'Mix': '3 Jabones variados 100g · Cúrcuma + Avena + Caléndula',
    'Tripack': '3 Jabones artesanales · Carbón + Avena + Arcilla verde',
    'Secreto': 'Jabón de Arroz + Crema Facial · Ritual japonés · Luminosidad',
    'Kit': 'Combo completo · Jabones + Sebo + Crema · Cuidado familiar',
    'Energía': 'Polen + Melena de León · Mente clara + Defensas altas',
    'Capilar': 'Melena de León + Néctar · Fortalece + Brillo + Crecimiento',
    'Power': '2x Melena + Polen · Triple potencia · Máximo rendimiento',
    'Ritual': 'Sebo + Jabones + Crema de Arroz · Regeneración total',
    'Total': 'TODOS nuestros productos estrella · Kit definitivo'
  };

  const cardDescriptions = {
    'Jabon': 'Ataca manchas desde la primera lavada',
    'Melena': 'Recupera tu claridad mental',
    'Sebo': 'Tu piel merece hidratación profunda',
    'Polen': 'Energía natural sin cafeína'
  };

  // ========== INJECT CSS STYLES ==========
  function injectStyles() {
    const styleId = 'catalog-hotfix-styles-v2';
    if (document.getElementById(styleId)) return;

    const css = `
      /* Enhanced card titles */
      .catalogoGridCard h4,
      .cardProdcut h4,
      .cardProdcutmasVendido h4 {
        font-size: 16px !important;
        font-weight: 700 !important;
        white-space: normal !important;
        word-wrap: break-word !important;
        overflow: visible !important;
        text-overflow: clip !important;
        line-height: 1.3 !important;
        margin-bottom: 6px !important;
      }

      /* Enhanced prices */
      .catalogoGridCard h5,
      .cardProdcut h5,
      .cardProdcutmasVendido h5 {
        font-size: 16px !important;
        font-weight: 700 !important;
      }

      /* Mini-description styling */
      .cat-mini-desc {
        font-size: 11px;
        color: #666;
        margin: 4px 0 8px 0;
        font-style: italic;
        line-height: 1.3;
      }

      /* Card description styling */
      .cat-card-desc {
        font-size: 12px;
        color: #666666;
        font-style: italic;
        margin: 6px 0 8px 0;
        line-height: 1.4;
      }

      /* Add to cart button */
      .cat-add-btn {
        background: linear-gradient(135deg, #1a7a3a 0%, #22a047 100%);
        color: white;
        border: none;
        padding: 10px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        width: 100%;
        margin: 6px 0;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(26, 122, 58, 0.25);
      }

      .cat-add-btn:hover {
        background: linear-gradient(135deg, #155a2f 0%, #1a7a3a 100%);
        box-shadow: 0 4px 12px rgba(26, 122, 58, 0.4);
        transform: translateY(-2px);
      }

      .cat-add-btn:active {
        transform: translateY(0);
      }

      /* Ver más link */
      .cat-see-more {
        color: #1a7a3a;
        text-decoration: none;
        font-size: 11px;
        font-weight: 600;
        transition: all 0.2s ease;
      }

      .cat-see-more:hover {
        text-decoration: underline;
      }

      /* Card hover effect */
      .catalogoGridCard,
      .cardProdcut,
      .cardProdcutmasVendido {
        transition: box-shadow 0.3s ease !important;
      }

      .catalogoGridCard:hover,
      .cardProdcut:hover,
      .cardProdcutmasVendido:hover {
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12) !important;
      }

      /* Toast notification */
      .cat-toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #1a7a3a;
        color: white;
        padding: 14px 20px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        animation: slideIn 0.3s ease-out;
        z-index: 10000;
      }

      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      /* Mobile responsive */
      @media (max-width: 768px) {
        .catalogoGridCard h4,
        .cardProdcut h4,
        .cardProdcutmasVendido h4 {
          font-size: 14px !important;
        }

        .cat-mini-desc {
          font-size: 10px;
        }

        .cat-add-btn {
          font-size: 11px;
          padding: 8px 10px;
        }

        .cat-toast {
          bottom: 10px;
          right: 10px;
          font-size: 12px;
        }
      }
    `;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ========== UTILITY FUNCTIONS ==========

  /**
   * Extract product name from card element
   */
  function getProductName(cardEl) {
    const titleEl = cardEl.querySelector('h4');
    return titleEl ? titleEl.textContent.trim() : 'Producto Sanate';
  }

  /**
   * Extract product price from card element
   */
  function getProductPrice(cardEl) {
    const priceEl = cardEl.querySelector('h5');
    return priceEl ? priceEl.textContent.trim() : '$0';
  }

  /**
   * Extract product image URL
   */
  function getProductImage(cardEl) {
    const img = cardEl.querySelector('img');
    return img ? img.src : '';
  }

  /**
   * Generate slug from product name
   */
  function generateSlug(productName) {
    return productName
      .toLowerCase()
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Get mini-description based on product name
   */
  function getMiniDescription(productName) {
    for (const [keyword, desc] of Object.entries(productDescriptions)) {
      if (productName.includes(keyword)) {
        return desc;
      }
    }
    return 'Producto natural premium · Envío a toda Colombia';
  }

  /**
   * Get card description based on product type
   */
  function getCardDescription(productName) {
    for (const [keyword, desc] of Object.entries(cardDescriptions)) {
      if (productName.includes(keyword)) {
        return desc;
      }
    }
    return null;
  }

  /**
   * Initialize or get cart from localStorage
   */
  function getCart() {
    try {
      const cart = localStorage.getItem(CONFIG.cartKey);
      return cart ? JSON.parse(cart) : [];
    } catch (e) {
      console.warn('Error reading cart:', e);
      return [];
    }
  }

  /**
   * Save cart to localStorage and window
   */
  function saveCart(cart) {
    try {
      localStorage.setItem(CONFIG.cartKey, JSON.stringify(cart));
      window._cart = cart;
    } catch (e) {
      console.warn('Error saving cart:', e);
    }
  }

  /**
   * Add product to cart
   */
  function addToCart(productName, price, image) {
    const cart = getCart();
    const existingItem = cart.find(item => item.name === productName);

    if (existingItem) {
      existingItem.quantity = (existingItem.quantity || 1) + 1;
    } else {
      cart.push({
        name: productName,
        price: price,
        image: image,
        quantity: 1,
        addedAt: new Date().toISOString()
      });
    }

    saveCart(cart);
    return cart;
  }

  /**
   * Show toast notification
   */
  function showToast(message) {
    const existing = document.querySelector('.cat-toast');
    if (existing) {
      existing.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'cat-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  /**
   * Handle add to cart button click
   */
  function handleAddToCart(e, productName, price, image) {
    e.stopPropagation();
    e.preventDefault();

    addToCart(productName, price, image);
    showToast(`✅ ${productName} añadido al carrito`);

    // Visual feedback on button
    const btn = e.target.closest(`.${CONFIG.buttonClass}`);
    if (btn) {
      const originalText = btn.textContent;
      btn.textContent = '✅ Añadido';
      btn.style.opacity = '0.7';

      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.opacity = '1';
      }, 1500);
    }
  }

  /**
   * Enhance a single card element
   */
  function enhanceCard(cardEl) {
    // Skip if already enhanced
    if (cardEl.dataset.enhanced === 'true') {
      return;
    }

    const productName = getProductName(cardEl);
    const price = getProductPrice(cardEl);
    const image = getProductImage(cardEl);
    const miniDesc = getMiniDescription(productName);
    const cardDesc = getCardDescription(productName);
    const slug = generateSlug(productName);

    // Find the text container
    const textContainer = cardEl.querySelector('.catalogoGridText');
    if (!textContainer) return;

    const h4 = textContainer.querySelector('h4');
    const h5 = textContainer.querySelector('h5');

    // Ensure h4 and h5 are properly styled
    if (h4) {
      h4.style.fontSize = '16px';
      h4.style.fontWeight = '700';
      h4.style.whiteSpace = 'normal';
      h4.style.overflow = 'visible';
    }

    if (h5) {
      h5.style.fontSize = '16px';
      h5.style.fontWeight = '700';
    }

    // Add mini-description if not already present
    if (!cardEl.querySelector('.cat-mini-desc')) {
      const miniDescEl = document.createElement('div');
      miniDescEl.className = 'cat-mini-desc';
      miniDescEl.textContent = miniDesc;
      h5 ? h5.parentNode.insertBefore(miniDescEl, h5.nextSibling) : textContainer.appendChild(miniDescEl);
    }

    // Add card description (pain-point + benefit) if not already present
    if (cardDesc && !cardEl.querySelector('.cat-card-desc')) {
      const cardDescEl = document.createElement('div');
      cardDescEl.className = 'cat-card-desc';
      cardDescEl.textContent = cardDesc;
      textContainer.appendChild(cardDescEl);
    }

    // Add "Añadir al carrito" button if not already present
    if (!cardEl.querySelector(`.${CONFIG.buttonClass}`)) {
      const addBtn = document.createElement('button');
      addBtn.className = CONFIG.buttonClass;
      addBtn.textContent = '🛒 AÑADIR AL CARRITO';
      addBtn.addEventListener('click', (e) => handleAddToCart(e, productName, price, image));
      textContainer.appendChild(addBtn);
    }

    // Add "Ver más" link if not already present
    if (!cardEl.querySelector('.cat-see-more')) {
      const seeMoreLink = document.createElement('a');
      seeMoreLink.className = 'cat-see-more';
      const landingUrl = getLandingPage(productName);
      seeMoreLink.href = landingUrl || `/landing-${slug}.html`;
      seeMoreLink.textContent = '→ Ver más';
      seeMoreLink.style.display = 'block';
      seeMoreLink.style.marginTop = '4px';
      textContainer.appendChild(seeMoreLink);
    }

    cardEl.dataset.enhanced = 'true';
  }

  /**
   * Main enhancement function - process all visible cards
   */
  function enhanceAllCards() {
    const allCards = [];

    CONFIG.cardSelectors.forEach(selector => {
      const cards = document.querySelectorAll(selector);
      allCards.push(...Array.from(cards));
    });

    allCards.forEach(card => {
      enhanceCard(card);
    });

    return allCards.length;
  }

  /**
   * Check if we're on the catalog page
   */
  function isOnCatalogPage() {
    return (
      window.location.pathname.includes('/catalogo') ||
      window.location.pathname.includes('/catálogo')
    );
  }

  // ========== INITIALIZATION ==========

  function init() {
    // Only run on catalog page
    if (!isOnCatalogPage()) {
      console.log('[Catalog Hotfix] Not on catalog page, skipping initialization');
      return;
    }

    console.log('[Catalog Hotfix v2] Initializing...');

    // Inject styles
    injectStyles();

    // Initial enhancement
    const count = enhanceAllCards();
    console.log(`[Catalog Hotfix v2] Enhanced ${count} cards`);

    // Set up interval to catch React re-renders
    let lastCount = count;
    const interval = setInterval(() => {
      const newCount = enhanceAllCards();
      if (newCount !== lastCount) {
        console.log(`[Catalog Hotfix v2] React re-render detected, enhanced ${newCount} total cards`);
        lastCount = newCount;
      }
    }, CONFIG.checkInterval);

    // Cleanup on page leave
    window.addEventListener('beforeunload', () => {
      clearInterval(interval);
    });

    // Also check on route changes (for SPA)
    const observer = new MutationObserver(() => {
      if (isOnCatalogPage()) {
        const count = enhanceAllCards();
        if (count > 0) {
          console.log(`[Catalog Hotfix v2] Route change, enhanced ${count} cards`);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });

    console.log('[Catalog Hotfix v2] Initialization complete ✅');
  }

  // ========== START ==========

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Also initialize on a short delay to catch SPA apps
  setTimeout(init, 100);

})();
