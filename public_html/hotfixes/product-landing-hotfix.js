/**
 * sanate.store Product Landing Page Hotfix
 * Injects mini-landing page sections into product detail pages
 * Matches URL pattern: /producto/{id}/{slug}
 */

(function() {
  'use strict';

  // Product content mapping with benefits, usage, and studies
  const productContent = {
    'curcuma|kójico|kojico': {
      landing: '/landing-curcuma.html',
      benefits: [
        { icon: '✨', title: 'Aclara Manchas', desc: 'Reduce hiperpigmentación y paño con cúrcuma + ácido kójico' },
        { icon: '🔥', title: 'Combate Acné', desc: 'Propiedades antiinflamatorias que limpian a profundidad' },
        { icon: '🌿', title: '100% Natural', desc: 'Ingredientes artesanales sin químicos agresivos' }
      ],
      usage: 'Humedece el rostro, aplica el jabón y masajea 2 min. Enjuaga. Usa mañana y noche.',
      study: 'Journal of Cosmetic Dermatology (2019): La curcumina reduce hiperpigmentación significativamente'
    },
    'melena|león|leon': {
      landing: '/landing-melena.html',
      benefits: [
        { icon: '🧠', title: 'Claridad Mental', desc: 'Estimula el Factor de Crecimiento Nervioso (NGF)' },
        { icon: '💡', title: 'Memoria y Enfoque', desc: 'Mejora la concentración y la capacidad cognitiva' },
        { icon: '⚡', title: 'Energía Natural', desc: 'Vitalidad sostenida sin efectos secundarios' }
      ],
      usage: 'Tomar 1-2 cápsulas al día con agua, preferiblemente en la mañana.',
      study: 'Mori et al. (2009): Mejora significativa de función cognitiva en adultos mayores'
    },
    'sebo|res': {
      landing: '/landing-sebo.html',
      benefits: [
        { icon: '💧', title: 'Hidratación Profunda', desc: 'Ácidos grasos que imitan los lípidos naturales de la piel' },
        { icon: '🌟', title: 'Regenera Manchas', desc: 'Reduce cicatrices y estrías con uso constante' },
        { icon: '👵', title: 'Remedio Ancestral', desc: 'Usado por generaciones en Colombia con resultados reales' }
      ],
      usage: 'Aplica una pequeña cantidad en piel limpia, masajea suavemente. Mañana y noche.',
      study: 'Journal of Lipid Research: El perfil de ácidos grasos del sebo imita los lípidos de la piel humana'
    },
    'polen|colágeno|colageno': {
      landing: '/landing-polen.html',
      benefits: [
        { icon: '🐝', title: 'Superalimento Natural', desc: 'Rico en aminoácidos, vitaminas B y minerales esenciales' },
        { icon: '⚡', title: 'Energía sin Cafeína', desc: 'Vitalidad sostenida todo el día de forma natural' },
        { icon: '🛡️', title: 'Defensas Altas', desc: 'Fortalece el sistema inmunológico naturalmente' }
      ],
      usage: 'Tomar 2-3 cápsulas al día con agua, preferiblemente en la mañana.',
      study: 'Journal of Food Science and Technology: Perfil completo de aminoácidos en el polen de abeja'
    },
    'néctar|nectar|capilar': {
      landing: '/landing-nectar.html',
      benefits: [
        { icon: '💎', title: 'Brillo Intenso', desc: 'Cabello radiante desde la primera aplicación' },
        { icon: '🌊', title: 'Elimina Frizz', desc: 'Control total del encrespamiento y la sequedad' },
        { icon: '🔥', title: 'Hidratación Total', desc: 'Nutrición profunda que dura todo el día' }
      ],
      usage: 'Después de lavar, aplica en cabello húmedo. No enjuagues. Peina normalmente.',
      study: 'Biotina y queratina: componentes clave para la fortaleza y brillo capilar'
    },
    'secreto|japonés|japones|arroz': {
      landing: '/landing-secreto.html',
      benefits: [
        { icon: '🌸', title: 'Luminosidad', desc: 'Ritual milenario de las geishas para piel radiante' },
        { icon: '🧴', title: 'Doble Ritual', desc: 'Jabón de arroz + crema facial para resultados completos' },
        { icon: '⏰', title: 'Anti-Edad', desc: 'Antioxidantes del arroz que combaten el envejecimiento' }
      ],
      usage: 'Paso 1: Jabón de arroz para limpieza diaria. Paso 2: Crema facial día y noche.',
      study: 'El ácido ferúlico del salvado de arroz es un potente antioxidante (Japanese Dermatology Research)'
    },
    'kit total|kit definitivo': {
      landing: '/landing-kit-total.html',
      benefits: [
        { icon: '🎁', title: 'Todo en Uno', desc: 'Jabones + Sebo + Melena + Polen + Néctar + Crema' },
        { icon: '💰', title: '30% de Ahorro', desc: 'El mejor precio comprando el kit completo' },
        { icon: '✅', title: 'Bienestar Total', desc: 'Piel, cabello, mente y energía en un solo paquete' }
      ],
      usage: 'Usa cada producto según sus instrucciones. Rutina diaria para resultados óptimos.',
      study: 'Combinar cuidado interno (suplementos) + externo (tópicos) maximiza resultados'
    },
    'kit familia|tripack|avena|calendula|mix': {
      landing: '/landing-curcuma.html',
      benefits: [
        { icon: '👨‍👩‍👧', title: 'Para toda la Familia', desc: 'Jabones naturales para cada tipo de piel' },
        { icon: '🌿', title: '100% Artesanal', desc: 'Ingredientes naturales sin químicos dañinos' },
        { icon: '✨', title: 'Piel Limpia', desc: 'Limpieza profunda que nutre mientras limpia' }
      ],
      usage: 'Humedece, aplica el jabón y masajea 2 min. Enjuaga con agua tibia.',
      study: 'Los jabones artesanales conservan la glicerina natural, ideal para pieles sensibles'
    },
    'energía|energia|mente|power|mental|defensa': {
      landing: '/landing-melena.html',
      benefits: [
        { icon: '🧠', title: 'Mente Clara', desc: 'Melena de León para enfoque + Polen para energía' },
        { icon: '🛡️', title: 'Defensas', desc: 'Antioxidantes naturales que protegen tu sistema inmune' },
        { icon: '⚡', title: 'Rendimiento', desc: 'Máxima potencia mental y física sin estimulantes' }
      ],
      usage: 'Melena de León: 2 caps/día. Polen: 2-3 caps/día. Preferiblemente en la mañana.',
      study: 'La combinación de hongos funcionales + superalimentos potencia los efectos nootrópicos'
    },
    'ritual|regenerador|piel y bienestar': {
      landing: '/landing-sebo.html',
      benefits: [
        { icon: '🌟', title: 'Regeneración Total', desc: 'Sebo + Jabones + Crema para renovar tu piel' },
        { icon: '💧', title: 'Hidratación 360°', desc: 'Nutrición desde la limpieza hasta la hidratación' },
        { icon: '🧴', title: 'Ritual Completo', desc: 'Todo lo que tu piel necesita en un solo combo' }
      ],
      usage: 'Limpia con jabón, hidrata con sebo de res, nutre con crema de arroz. 2 veces al día.',
      study: 'La combinación de limpieza + hidratación + nutrición es el estándar en dermatología'
    }
  };

  // Brand colors
  const colors = {
    celeste: '#3dc9e8',
    gold: '#e8c87a',
    dark: '#0a1628',
    white: '#ffffff',
    lightGray: '#f5f5f5',
    borderGray: '#e0e0e0'
  };

  /**
   * Injects CSS styles for the product landing section
   */
  function injectStyles() {
    const styleId = 'product-landing-inject-styles';
    if (document.getElementById(styleId)) return;

    const styles = document.createElement('style');
    styles.id = styleId;
    styles.textContent = `
      .product-landing-inject {
        margin: 40px 0;
        padding: 30px 20px;
        background: linear-gradient(135deg, rgba(61, 201, 232, 0.05) 0%, rgba(232, 200, 122, 0.05) 100%);
        border-radius: 12px;
        border-top: 3px solid ${colors.celeste};
        animation: fadeInSlide 0.6s ease-out;
      }

      @keyframes fadeInSlide {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .product-landing-inject h3 {
        color: ${colors.dark};
        font-size: 24px;
        font-weight: 700;
        margin: 0 0 25px 0;
        text-align: center;
      }

      .product-landing-inject h4 {
        color: ${colors.dark};
        font-size: 18px;
        font-weight: 600;
        margin: 30px 0 15px 0;
      }

      /* Benefits Grid */
      .landing-benefits-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
        margin-bottom: 30px;
      }

      .benefit-card {
        padding: 20px;
        background: ${colors.white};
        border: 1px solid ${colors.borderGray};
        border-radius: 8px;
        text-align: center;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(10, 22, 40, 0.05);
      }

      .benefit-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 4px 12px rgba(61, 201, 232, 0.15);
        border-color: ${colors.celeste};
      }

      .benefit-icon {
        font-size: 32px;
        margin-bottom: 10px;
        display: block;
      }

      .benefit-title {
        color: ${colors.dark};
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 8px;
      }

      .benefit-desc {
        color: #666;
        font-size: 13px;
        line-height: 1.5;
      }

      /* Modo de Uso Box */
      .landing-usage-box {
        background: ${colors.white};
        border: 2px solid ${colors.gold};
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 25px;
        line-height: 1.8;
        color: ${colors.dark};
        font-size: 14px;
      }

      /* Study/Trust Box */
      .landing-study-box {
        background: ${colors.lightGray};
        padding: 18px;
        border-left: 4px solid ${colors.celeste};
        margin-bottom: 25px;
        border-radius: 4px;
      }

      .landing-study-box {
        font-style: italic;
        color: #555;
        font-size: 14px;
        line-height: 1.6;
      }

      /* CTA Button */
      .landing-cta-button {
        display: inline-block;
        background: ${colors.celeste};
        color: ${colors.white};
        padding: 12px 24px;
        border-radius: 6px;
        text-decoration: none;
        font-weight: 600;
        font-size: 14px;
        border: none;
        cursor: pointer;
        transition: all 0.3s ease;
        margin-top: 10px;
      }

      .landing-cta-button:hover {
        background: #2aafce;
        box-shadow: 0 4px 12px rgba(61, 201, 232, 0.3);
        transform: translateY(-2px);
      }

      .landing-button-wrapper {
        text-align: center;
        margin-top: 20px;
      }

      /* Mobile Responsive */
      @media (max-width: 768px) {
        .product-landing-inject {
          padding: 20px 15px;
          margin: 25px 0;
        }

        .product-landing-inject h3 {
          font-size: 20px;
          margin-bottom: 20px;
        }

        .product-landing-inject h4 {
          font-size: 16px;
        }

        .landing-benefits-grid {
          grid-template-columns: 1fr;
          gap: 15px;
          margin-bottom: 25px;
        }

        .benefit-card {
          padding: 15px;
        }

        .benefit-icon {
          font-size: 28px;
        }

        .benefit-title {
          font-size: 13px;
        }

        .benefit-desc {
          font-size: 12px;
        }

        .landing-usage-box,
        .landing-study-box {
          padding: 15px;
          font-size: 13px;
        }

        .landing-cta-button {
          padding: 10px 20px;
          font-size: 13px;
          width: 100%;
          box-sizing: border-box;
        }
      }

      @media (max-width: 480px) {
        .product-landing-inject {
          padding: 15px 10px;
          margin: 20px 0;
        }

        .product-landing-inject h3 {
          font-size: 18px;
          margin-bottom: 15px;
        }

        .benefit-icon {
          font-size: 24px;
        }

        .benefit-title {
          font-size: 12px;
        }

        .benefit-desc {
          font-size: 11px;
        }
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Extracts product title from the page
   * @returns {string} Product title in lowercase
   */
  function getProductTitle() {
    const pageDetail = document.querySelector('.pageDetail');
    if (!pageDetail) return '';

    // Try multiple selectors to find the product title
    const titleSelectors = ['h1', 'h2', '.product-title', '[data-product-title]'];
    for (const selector of titleSelectors) {
      const titleEl = pageDetail.querySelector(selector);
      if (titleEl) {
        return titleEl.textContent.toLowerCase().trim();
      }
    }

    return '';
  }

  /**
   * Determines which product content to use based on title keywords
   * @param {string} title - Product title in lowercase
   * @returns {object|null} Product content object or null if no match
   */
  function getProductContentByTitle(title) {
    for (const [keywords, content] of Object.entries(productContent)) {
      const keywordList = keywords.split('|');
      const matches = keywordList.some(keyword => title.includes(keyword.toLowerCase()));
      if (matches) {
        return content;
      }
    }
    return null;
  }

  /**
   * Creates and returns the HTML for the benefits grid
   * @param {array} benefits - Array of benefit objects
   * @returns {string} HTML string
   */
  function createBenefitsGrid(benefits) {
    const benefitCards = benefits
      .map(
        (benefit) => `
      <div class="benefit-card">
        <span class="benefit-icon">${benefit.icon}</span>
        <div class="benefit-title">${benefit.title}</div>
        <div class="benefit-desc">${benefit.desc}</div>
      </div>
    `
      )
      .join('');

    return `<div class="landing-benefits-grid">${benefitCards}</div>`;
  }

  /**
   * Creates the complete landing injection HTML
   * @param {object} content - Product content object
   * @returns {string} HTML string
   */
  function createLandingHTML(content) {
    return `
      <section class="product-landing-inject">
        <h3>Beneficios Principales</h3>
        ${createBenefitsGrid(content.benefits)}

        <h4>Modo de Uso</h4>
        <div class="landing-usage-box">
          ${content.usage}
        </div>

        <h4>Respaldado por Estudios</h4>
        <div class="landing-study-box">
          ${content.study}
        </div>

        <div class="landing-button-wrapper">
          <a href="${content.landing}" class="landing-cta-button">
            Ver detalles completos →
          </a>
        </div>
      </section>
    `;
  }

  /**
   * Injects the landing section into the page
   */
  function injectLandingSection() {
    // Check if already injected
    if (document.querySelector('.product-landing-inject')) {
      return;
    }

    // Find insertion point
    const pageDetail = document.querySelector('.pageDetail');
    if (!pageDetail) {
      return;
    }

    // Try to find the best insertion point (below description or add button)
    let insertionPoint = null;
    const detailDescription = pageDetail.querySelector('.detailDescription');
    const btnAdd = pageDetail.querySelector('.btnAdd');

    if (detailDescription) {
      insertionPoint = detailDescription;
    } else if (btnAdd) {
      insertionPoint = btnAdd;
    } else {
      // Fallback: insert at the end of pageDetail
      insertionPoint = pageDetail;
    }

    // Get product title and find matching content
    const title = getProductTitle();
    if (!title) {
      return;
    }

    const content = getProductContentByTitle(title);
    if (!content) {
      return;
    }

    // Create and inject the landing HTML
    const landingHTML = createLandingHTML(content);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = landingHTML;
    const landingElement = tempDiv.firstElementChild;

    // Insert after the insertion point
    if (insertionPoint === pageDetail) {
      pageDetail.appendChild(landingElement);
    } else {
      insertionPoint.parentNode.insertBefore(landingElement, insertionPoint.nextSibling);
    }
  }

  /**
   * Checks if the current page is a product detail page
   * @returns {boolean}
   */
  function isProductDetailPage() {
    return /\/producto\//.test(window.location.pathname);
  }

  /**
   * Initialize the hotfix
   */
  function init() {
    if (!isProductDetailPage()) {
      return;
    }

    // Inject styles once
    injectStyles();

    // Try to inject landing section
    injectLandingSection();

    // Set up observer for React re-renders
    // Check every 1.5 seconds for changes (catches React updates and component mounting)
    let checkCount = 0;
    const maxChecks = 100; // Stop checking after ~150 seconds
    const intervalId = setInterval(() => {
      checkCount++;

      if (!document.querySelector('.product-landing-inject')) {
        injectLandingSection();
      }

      // Stop checking after maxChecks attempts
      if (checkCount >= maxChecks) {
        clearInterval(intervalId);
      }
    }, 1500);

    // Also listen for common React/SPA navigation events
    const originalPushState = window.history.pushState;
    window.history.pushState = function(...args) {
      const result = originalPushState.apply(window.history, args);
      if (isProductDetailPage()) {
        setTimeout(injectLandingSection, 500);
      }
      return result;
    };

    // Listen for custom events that some SPAs use
    document.addEventListener('pagechange', () => {
      if (isProductDetailPage()) {
        setTimeout(injectLandingSection, 300);
      }
    });
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Also initialize after a short delay to catch dynamically loaded pages
  setTimeout(init, 100);
})();
