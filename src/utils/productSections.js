const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const DEFAULT_BRAND_COLOR = '#19b8ff';
export const LANDING_V2_SCHEMA = 'product_landing_v2';
export const LANDING_V2_VERSION = 2;

export const LANDING_SECTION_ORDER = Object.freeze({
  announcement: 1,
  heroPro: 2,
  highlights: 3,
  reviewsSummary: 4,
  socialCarousel: 5,
  subBannerAfterCarousel: 6,
  benefits: 7,
  testimonials: 8,
  ingredients: 9,
  comparison: 10,
  beforeAfter: 11,
  resultsChart: 12,
  interactiveHotspots: 13,
  faq: 99,
});

const EMPTY_IMAGE = Object.freeze({
  src: '',
  external_url: '',
  ai_action_requested: false,
});

const toSafeString = (value) => String(value || '').trim();

export const normalizeSectionImage = (value) => {
  if (!value) return { ...EMPTY_IMAGE };
  if (typeof value === 'string') {
    return { ...EMPTY_IMAGE, src: toSafeString(value) };
  }
  if (typeof value === 'object') {
    const src = toSafeString(value.src);
    const external = toSafeString(value.external_url || value.externalUrl || value.fallback_url || value.url);
    return {
      ...EMPTY_IMAGE,
      ...value,
      src,
      external_url: external,
      ai_action_requested: Boolean(value.ai_action_requested),
    };
  }
  return { ...EMPTY_IMAGE };
};

export const resolveSectionImageSource = (value) => {
  const image = normalizeSectionImage(value);
  return toSafeString(image.src || image.external_url || '');
};

const parseJson = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalizeReview = (item = {}) => ({
  name: toSafeString(item.name),
  stars: clamp(Number(item.stars) || 5, 1, 5),
  text: toSafeString(item.text),
});

const normalizeBannerBenefit = (item = {}) => ({
  title: toSafeString(item.title),
  subtitle: toSafeString(item.subtitle),
  image: normalizeSectionImage(item.image || item.imageUrl),
});

const normalizeTestimonial = (item = {}) => ({
  name: toSafeString(item.name),
  stars: clamp(Number(item.stars) || 5, 1, 5),
  text: toSafeString(item.text),
  image: normalizeSectionImage(item.image || item.imageUrl),
});

const normalizeIngredient = (item = {}) => ({
  title: toSafeString(item.title),
  desc: toSafeString(item.desc),
  image: normalizeSectionImage(item.image || item.imageUrl),
});

const normalizeHotspot = (item = {}) => ({
  x: clamp(Number(item.x) || 50, 0, 100),
  y: clamp(Number(item.y) || 50, 0, 100),
  title: toSafeString(item.title),
  desc: toSafeString(item.desc),
});

const withSectionBase = (id, section = {}, data = {}) => ({
  id,
  enabled: Boolean(section.enabled),
  order: Number(section.order) || LANDING_SECTION_ORDER[id] || 999,
  data,
});

/**
 * @typedef {Object} SectionBase
 * @property {string} id
 * @property {boolean} enabled
 * @property {number} order
 */

/**
 * @typedef {Object} HeroData
 * @property {number} ratingAvg
 * @property {number} ratingCount
 * @property {string} deliveryLabel
 * @property {string} country
 * @property {string} flag
 * @property {string} ctaText
 */

/**
 * @typedef {Object} CarouselData
 * @property {Array<Object>} items
 * @property {boolean} autoplay
 * @property {boolean} loop
 * @property {string} style
 */

/**
 * @typedef {Object} TestimonialsData
 * @property {string} layout
 * @property {boolean} aiImageEnabled
 * @property {Array<Object>} items
 */

/**
 * @typedef {Object} IngredientsData
 * @property {Array<Object>} cards
 */

/**
 * @typedef {Object} ComparisonData
 * @property {string} title
 * @property {string} body
 * @property {{headers: Array<string>, rows: Array<Array<string>>}} table
 * @property {boolean} brandHighlight
 */

/**
 * @typedef {Object} LandingV2Config
 * @property {string} schema
 * @property {number} version
 * @property {Object.<string, SectionBase & {data: any}>} sections
 */

export const buildDefaultLandingV2Config = (productName = '') => ({
  schema: LANDING_V2_SCHEMA,
  version: LANDING_V2_VERSION,
  enabled: true,
  sections: {
    announcement: withSectionBase('announcement', { enabled: false }, {
      badge: 'Oferta especial',
      text: '',
    }),
    heroPro: withSectionBase('heroPro', { enabled: true }, {
      productName: toSafeString(productName || 'tu producto'),
      ratingAvg: 4.5,
      ratingCount: 9416,
      deliveryLabel: 'Entrega 2-3 dias habiles',
      country: 'CO',
      flag: 'CO',
      ctaText: 'Comprar ahora',
    }),
    highlights: withSectionBase('highlights', { enabled: true }, {
      items: [
        { icon: 'sparkles', text: `Beneficio principal de ${productName || 'tu producto'}` },
        { icon: 'shield', text: 'Garantia de calidad y seguimiento postventa' },
        { icon: 'truck', text: 'Pago contraentrega en zonas disponibles' },
      ],
    }),
    reviewsSummary: withSectionBase('reviewsSummary', { enabled: true }, {
      autoGenerate: true,
      avg: 4.5,
      count: 9416,
      items: [],
    }),
    socialCarousel: withSectionBase('socialCarousel', { enabled: true }, {
      items: [],
      autoplay: true,
      loop: true,
      style: 'storiesVertical',
    }),
    subBannerAfterCarousel: withSectionBase('subBannerAfterCarousel', { enabled: false }, {
      image: { ...EMPTY_IMAGE },
      text: '',
      cta: '',
    }),
    benefits: withSectionBase('benefits', { enabled: true }, {
      items: [
        { title: 'Resultados que inspiran confianza', subtitle: 'Formula enfocada en uso diario', image: { ...EMPTY_IMAGE } },
        { title: 'Compra segura y acompanada', subtitle: 'Soporte por WhatsApp y envio rastreable', image: { ...EMPTY_IMAGE } },
      ],
    }),
    testimonials: withSectionBase('testimonials', { enabled: true }, {
      layout: '3x3',
      aiImageEnabled: false,
      items: [],
    }),
    ingredients: withSectionBase('ingredients', { enabled: true }, {
      cards: [
        { title: 'Ingrediente 1', image: { ...EMPTY_IMAGE }, desc: '' },
        { title: 'Ingrediente 2', image: { ...EMPTY_IMAGE }, desc: '' },
        { title: 'Ingrediente 3', image: { ...EMPTY_IMAGE }, desc: '' },
      ],
    }),
    comparison: withSectionBase('comparison', { enabled: true }, {
      title: 'Por que somos tu mejor eleccion',
      body: 'Comparamos atributos clave para que tomes una decision informada.',
      table: {
        headers: ['Caracteristica', 'Nuestra marca', 'Otras marcas'],
        rows: [
          ['Calidad de formula', 'Alta y consistente', 'Variable'],
          ['Acompanamiento', 'Si, por WhatsApp', 'Limitado'],
          ['Velocidad de entrega', '2-3 dias habiles', 'No siempre clara'],
        ],
      },
      brandHighlight: true,
    }),
    beforeAfter: withSectionBase('beforeAfter', { enabled: false }, {
      title: 'Antes y despues',
      bannerImage: { ...EMPTY_IMAGE },
      beforeImage: { ...EMPTY_IMAGE },
      afterImage: { ...EMPTY_IMAGE },
    }),
    resultsChart: withSectionBase('resultsChart', { enabled: true }, {
      stats: [
        { label: 'Satisfaccion clientes', value: 92 },
        { label: 'Recompra en 30 dias', value: 67 },
        { label: 'Entrega a tiempo', value: 95 },
      ],
    }),
    interactiveHotspots: withSectionBase('interactiveHotspots', { enabled: false }, {
      baseImage: { ...EMPTY_IMAGE },
      hotspots: [],
    }),
    faq: withSectionBase('faq', { enabled: false }, {
      autoSuggest: true,
      items: [],
    }),
  },
});

const fromLegacyToLandingV2 = (parsed = {}, productName = '') => {
  const defaults = buildDefaultLandingV2Config(productName);
  defaults.enabled = parsed?.landingEnabled !== false;
  const sections = defaults.sections;
  const shipping = parsed.shipping || {};
  const highlights = parsed.highlights || {};
  const ratings = parsed.ratings || {};
  const carousel = parsed.carousel || {};
  const subBanner = parsed.subBannerAfterCarousel || {};
  const faq = parsed.faq || {};
  const verticalBanners = parsed.verticalBanners || {};
  const testimonials = parsed.testimonials || {};
  const ingredients = parsed.ingredients || {};
  const comparison = parsed.comparison || {};
  const beforeAfter = parsed.beforeAfter || {};
  const resultsChart = parsed.resultsChart || {};
  const interactive = parsed.interactiveBenefits || {};

  sections.heroPro.enabled = Boolean(shipping.enabled ?? ratings.enabled ?? true);
  sections.heroPro.data = {
    ...sections.heroPro.data,
    productName: toSafeString(productName || sections.heroPro.data.productName),
    ratingAvg: Number(ratings.avg) || sections.heroPro.data.ratingAvg,
    ratingCount: Number(ratings.count) || sections.heroPro.data.ratingCount,
    deliveryLabel: toSafeString(shipping.label) || sections.heroPro.data.deliveryLabel,
    country: toSafeString(shipping.country) || sections.heroPro.data.country,
    flag: toSafeString(shipping.flag) || sections.heroPro.data.flag,
    ctaText: toSafeString(parsed?.subBannerAfterCarousel?.cta) || sections.heroPro.data.ctaText,
  };

  sections.highlights.enabled = Boolean(highlights.enabled);
  sections.highlights.data.items = Array.isArray(highlights.items) ? highlights.items : sections.highlights.data.items;

  sections.reviewsSummary.enabled = Boolean(ratings.enabled);
  sections.reviewsSummary.data = {
    ...sections.reviewsSummary.data,
    autoGenerate: Boolean(ratings.autoGenerate),
    avg: Number(ratings.avg) || sections.reviewsSummary.data.avg,
    count: Number(ratings.count) || sections.reviewsSummary.data.count,
    items: (Array.isArray(ratings.items) ? ratings.items : []).map((item) => normalizeReview(item)),
  };

  sections.socialCarousel.enabled = Boolean(carousel.enabled);
  sections.socialCarousel.data = {
    ...sections.socialCarousel.data,
    autoplay: Boolean(carousel.autoplay),
    loop: Boolean(carousel.loop),
    style: toSafeString(carousel.style) || sections.socialCarousel.data.style,
    items: (Array.isArray(carousel.items) ? carousel.items : []).map((item) => normalizeSectionImage(item)),
  };

  sections.subBannerAfterCarousel.enabled = Boolean(subBanner.enabled);
  sections.subBannerAfterCarousel.data = {
    image: normalizeSectionImage(subBanner.image || subBanner.imageUrl),
    text: toSafeString(subBanner.text),
    cta: toSafeString(subBanner.cta),
  };

  sections.benefits.enabled = Boolean(verticalBanners.enabled);
  sections.benefits.data.items = (Array.isArray(verticalBanners.items) ? verticalBanners.items : [])
    .map((item) => normalizeBannerBenefit(item));

  sections.testimonials.enabled = Boolean(testimonials.enabled);
  sections.testimonials.data = {
    layout: toSafeString(testimonials.layout) || '3x3',
    aiImageEnabled: Boolean(testimonials.aiImageEnabled),
    items: (Array.isArray(testimonials.items) ? testimonials.items : [])
      .map((item) => normalizeTestimonial(item)),
  };

  sections.ingredients.enabled = Boolean(ingredients.enabled);
  sections.ingredients.data.cards = (Array.isArray(ingredients.cards) ? ingredients.cards : [])
    .map((item) => normalizeIngredient(item));

  sections.comparison.enabled = Boolean(comparison.enabled);
  sections.comparison.data = {
    ...sections.comparison.data,
    title: toSafeString(comparison.title) || sections.comparison.data.title,
    body: toSafeString(comparison.body) || sections.comparison.data.body,
    brandHighlight: Boolean(comparison.brandHighlight),
    table: {
      headers: Array.isArray(comparison?.table?.headers) ? comparison.table.headers : sections.comparison.data.table.headers,
      rows: Array.isArray(comparison?.table?.rows) ? comparison.table.rows : sections.comparison.data.table.rows,
    },
  };

  sections.beforeAfter.enabled = Boolean(beforeAfter.enabled);
  sections.beforeAfter.data = {
    title: toSafeString(beforeAfter.title) || sections.beforeAfter.data.title,
    bannerImage: normalizeSectionImage(beforeAfter.bannerImage || beforeAfter.bannerImageUrl),
    beforeImage: normalizeSectionImage(beforeAfter.beforeImage || beforeAfter.beforeImageUrl),
    afterImage: normalizeSectionImage(beforeAfter.afterImage || beforeAfter.afterImageUrl),
  };

  sections.resultsChart.enabled = Boolean(resultsChart.enabled);
  sections.resultsChart.data.stats = Array.isArray(resultsChart.stats) ? resultsChart.stats : sections.resultsChart.data.stats;

  sections.interactiveHotspots.enabled = Boolean(interactive.enabled);
  sections.interactiveHotspots.data = {
    baseImage: normalizeSectionImage(interactive.baseImage || interactive.baseImageUrl),
    hotspots: (Array.isArray(interactive.hotspots) ? interactive.hotspots : []).map((item) => normalizeHotspot(item)),
  };

  sections.faq.enabled = Boolean(faq.enabled);
  sections.faq.data = {
    autoSuggest: Boolean(faq.autoSuggest),
    items: Array.isArray(faq.items) ? faq.items : [],
  };

  return defaults;
};

const normalizeSectionWithDefaults = (id, section = {}, defaultsSection) => {
  const normalized = withSectionBase(id, section, defaultsSection.data);
  const payload = section?.data || {};

  switch (id) {
    case 'announcement':
      normalized.data = {
        badge: toSafeString(payload.badge || defaultsSection.data.badge),
        text: toSafeString(payload.text),
      };
      break;
    case 'heroPro':
      normalized.data = {
        ...defaultsSection.data,
        ...payload,
        productName: toSafeString(payload.productName || defaultsSection.data.productName),
        deliveryLabel: toSafeString(payload.deliveryLabel || defaultsSection.data.deliveryLabel),
        country: toSafeString(payload.country || defaultsSection.data.country),
        flag: toSafeString(payload.flag || defaultsSection.data.flag),
        ctaText: toSafeString(payload.ctaText || defaultsSection.data.ctaText),
        ratingAvg: Number(payload.ratingAvg ?? defaultsSection.data.ratingAvg) || defaultsSection.data.ratingAvg,
        ratingCount: Number(payload.ratingCount ?? defaultsSection.data.ratingCount) || defaultsSection.data.ratingCount,
      };
      break;
    case 'highlights':
      normalized.data = {
        items: (Array.isArray(payload.items) ? payload.items : []).map((item) => ({
          icon: toSafeString(item?.icon || 'check'),
          text: toSafeString(item?.text),
        })),
      };
      break;
    case 'reviewsSummary':
      normalized.data = {
        autoGenerate: Boolean(payload.autoGenerate),
        avg: Number(payload.avg) || 4.5,
        count: Number(payload.count) || 0,
        items: (Array.isArray(payload.items) ? payload.items : []).map((item) => normalizeReview(item)),
      };
      break;
    case 'socialCarousel':
      normalized.data = {
        autoplay: Boolean(payload.autoplay),
        loop: Boolean(payload.loop),
        style: toSafeString(payload.style || defaultsSection.data.style),
        items: (Array.isArray(payload.items) ? payload.items : []).map((item) => normalizeSectionImage(item)),
      };
      break;
    case 'subBannerAfterCarousel':
      normalized.data = {
        image: normalizeSectionImage(payload.image || payload.imageUrl),
        text: toSafeString(payload.text),
        cta: toSafeString(payload.cta),
      };
      break;
    case 'benefits':
      normalized.data = {
        items: (Array.isArray(payload.items) ? payload.items : []).map((item) => normalizeBannerBenefit(item)),
      };
      break;
    case 'testimonials':
      normalized.data = {
        layout: toSafeString(payload.layout || '3x3'),
        aiImageEnabled: Boolean(payload.aiImageEnabled),
        items: (Array.isArray(payload.items) ? payload.items : []).map((item) => normalizeTestimonial(item)),
      };
      break;
    case 'ingredients':
      normalized.data = {
        cards: (Array.isArray(payload.cards) ? payload.cards : []).map((item) => normalizeIngredient(item)),
      };
      break;
    case 'comparison':
      normalized.data = {
        title: toSafeString(payload.title || defaultsSection.data.title),
        body: toSafeString(payload.body || defaultsSection.data.body),
        brandHighlight: Boolean(payload.brandHighlight),
        table: {
          headers: Array.isArray(payload?.table?.headers) ? payload.table.headers : defaultsSection.data.table.headers,
          rows: Array.isArray(payload?.table?.rows) ? payload.table.rows : defaultsSection.data.table.rows,
        },
      };
      break;
    case 'beforeAfter':
      normalized.data = {
        title: toSafeString(payload.title || defaultsSection.data.title),
        bannerImage: normalizeSectionImage(payload.bannerImage || payload.bannerImageUrl),
        beforeImage: normalizeSectionImage(payload.beforeImage || payload.beforeImageUrl),
        afterImage: normalizeSectionImage(payload.afterImage || payload.afterImageUrl),
      };
      break;
    case 'resultsChart':
      normalized.data = {
        stats: (Array.isArray(payload.stats) ? payload.stats : []).map((item) => ({
          label: toSafeString(item?.label),
          value: clamp(Number(item?.value) || 0, 0, 100),
        })),
      };
      break;
    case 'interactiveHotspots':
      normalized.data = {
        baseImage: normalizeSectionImage(payload.baseImage || payload.baseImageUrl),
        hotspots: (Array.isArray(payload.hotspots) ? payload.hotspots : []).map((item) => normalizeHotspot(item)),
      };
      break;
    case 'faq':
      normalized.data = {
        autoSuggest: Boolean(payload.autoSuggest),
        items: Array.isArray(payload.items) ? payload.items : [],
      };
      break;
    default:
      break;
  }

  return normalized;
};

export const normalizeLandingV2Config = (value, productName = '') => {
  const parsed = parseJson(value);
  const defaults = buildDefaultLandingV2Config(productName);

  if (!parsed || typeof parsed !== 'object') {
    return defaults;
  }

  if (parsed.schema === LANDING_V2_SCHEMA && parsed.sections && typeof parsed.sections === 'object') {
    const sections = {};
    Object.keys(defaults.sections).forEach((id) => {
      sections[id] = normalizeSectionWithDefaults(id, parsed.sections[id], defaults.sections[id]);
    });
    return {
      schema: LANDING_V2_SCHEMA,
      version: LANDING_V2_VERSION,
      enabled: parsed.enabled !== false,
      sections,
    };
  }

  return fromLegacyToLandingV2(parsed, productName);
};

export const toLandingV2Config = (value, productName = '') => normalizeLandingV2Config(value, productName);

export const toLegacyEditorSections = (value, productName = '') => {
  const normalized = normalizeLandingV2Config(value, productName);
  const sections = normalized.sections || {};

  return {
    landingEnabled: normalized.enabled !== false,
    shipping: {
      enabled: Boolean(sections.heroPro?.enabled),
      country: toSafeString(sections.heroPro?.data?.country || 'CO'),
      label: toSafeString(sections.heroPro?.data?.deliveryLabel || 'Entrega 2-3 dias habiles'),
      flag: toSafeString(sections.heroPro?.data?.flag || 'CO'),
    },
    highlights: {
      enabled: Boolean(sections.highlights?.enabled),
      items: Array.isArray(sections.highlights?.data?.items) ? sections.highlights.data.items : [],
    },
    ratings: {
      enabled: Boolean(sections.reviewsSummary?.enabled),
      avg: Number(sections.reviewsSummary?.data?.avg) || 4.5,
      count: Number(sections.reviewsSummary?.data?.count) || 0,
      autoGenerate: Boolean(sections.reviewsSummary?.data?.autoGenerate),
      items: Array.isArray(sections.reviewsSummary?.data?.items) ? sections.reviewsSummary.data.items : [],
    },
    carousel: {
      enabled: Boolean(sections.socialCarousel?.enabled),
      items: Array.isArray(sections.socialCarousel?.data?.items) ? sections.socialCarousel.data.items : [],
      autoplay: Boolean(sections.socialCarousel?.data?.autoplay),
      loop: Boolean(sections.socialCarousel?.data?.loop),
      style: toSafeString(sections.socialCarousel?.data?.style || 'storiesVertical'),
    },
    subBannerAfterCarousel: {
      enabled: Boolean(sections.subBannerAfterCarousel?.enabled),
      image: normalizeSectionImage(sections.subBannerAfterCarousel?.data?.image),
      text: toSafeString(sections.subBannerAfterCarousel?.data?.text),
      cta: toSafeString(sections.subBannerAfterCarousel?.data?.cta),
    },
    faq: {
      enabled: Boolean(sections.faq?.enabled),
      autoSuggest: Boolean(sections.faq?.data?.autoSuggest),
      items: Array.isArray(sections.faq?.data?.items) ? sections.faq.data.items : [],
    },
    verticalBanners: {
      enabled: Boolean(sections.benefits?.enabled),
      items: Array.isArray(sections.benefits?.data?.items) ? sections.benefits.data.items : [],
    },
    testimonials: {
      enabled: Boolean(sections.testimonials?.enabled),
      layout: toSafeString(sections.testimonials?.data?.layout || '3x3'),
      aiImageEnabled: Boolean(sections.testimonials?.data?.aiImageEnabled),
      items: Array.isArray(sections.testimonials?.data?.items) ? sections.testimonials.data.items : [],
    },
    ingredients: {
      enabled: Boolean(sections.ingredients?.enabled),
      cards: Array.isArray(sections.ingredients?.data?.cards) ? sections.ingredients.data.cards : [],
    },
    comparison: {
      enabled: Boolean(sections.comparison?.enabled),
      title: toSafeString(sections.comparison?.data?.title),
      body: toSafeString(sections.comparison?.data?.body),
      table: {
        headers: Array.isArray(sections.comparison?.data?.table?.headers) ? sections.comparison.data.table.headers : [],
        rows: Array.isArray(sections.comparison?.data?.table?.rows) ? sections.comparison.data.table.rows : [],
      },
      brandHighlight: Boolean(sections.comparison?.data?.brandHighlight),
    },
    beforeAfter: {
      enabled: Boolean(sections.beforeAfter?.enabled),
      title: toSafeString(sections.beforeAfter?.data?.title || 'Antes y despues'),
      bannerImage: normalizeSectionImage(sections.beforeAfter?.data?.bannerImage),
      beforeImage: normalizeSectionImage(sections.beforeAfter?.data?.beforeImage),
      afterImage: normalizeSectionImage(sections.beforeAfter?.data?.afterImage),
    },
    resultsChart: {
      enabled: Boolean(sections.resultsChart?.enabled),
      stats: Array.isArray(sections.resultsChart?.data?.stats) ? sections.resultsChart.data.stats : [],
    },
    interactiveBenefits: {
      enabled: Boolean(sections.interactiveHotspots?.enabled),
      baseImage: normalizeSectionImage(sections.interactiveHotspots?.data?.baseImage),
      hotspots: Array.isArray(sections.interactiveHotspots?.data?.hotspots) ? sections.interactiveHotspots.data.hotspots : [],
    },
  };
};

export const normalizeProductSections = (value, productName = '') => toLegacyEditorSections(value, productName);
export const buildDefaultProductSections = (productName = '') => toLegacyEditorSections(buildDefaultLandingV2Config(productName), productName);

export const shouldRenderSection = (sectionOrId, maybeSection) => {
  const section = typeof sectionOrId === 'string' ? maybeSection : sectionOrId;
  const sectionId = typeof sectionOrId === 'string' ? sectionOrId : sectionOrId?.id;
  if (!section || section.enabled !== true) {
    return false;
  }

  const data = section.data || {};
  switch (sectionId) {
    case 'announcement':
      return toSafeString(data.text).length > 0;
    case 'heroPro':
      return Number(data.ratingAvg) > 0 || Number(data.ratingCount) > 0 || toSafeString(data.deliveryLabel).length > 0 || toSafeString(data.ctaText).length > 0;
    case 'highlights':
      return Array.isArray(data.items) && data.items.filter((item) => toSafeString(item?.text)).length > 0;
    case 'reviewsSummary':
      return (Array.isArray(data.items) && data.items.filter((item) => toSafeString(item?.text)).length > 0)
        || Number(data.count) > 0
        || Number(data.avg) > 0;
    case 'socialCarousel':
      return Array.isArray(data.items)
        && data.items.map((item) => resolveSectionImageSource(item)).filter(Boolean).length >= 5;
    case 'subBannerAfterCarousel':
      return Boolean(resolveSectionImageSource(data.image));
    case 'benefits':
      return Array.isArray(data.items)
        && data.items.filter((item) => resolveSectionImageSource(item?.image) || toSafeString(item?.title)).length > 0;
    case 'testimonials':
      return Array.isArray(data.items)
        && data.items.filter((item) => toSafeString(item?.text) && resolveSectionImageSource(item?.image)).length >= 3;
    case 'ingredients':
      return Array.isArray(data.cards)
        && data.cards.filter((item) => toSafeString(item?.title) && resolveSectionImageSource(item?.image)).length >= 3;
    case 'comparison':
      return Array.isArray(data?.table?.headers)
        && data.table.headers.length >= 3
        && Array.isArray(data?.table?.rows)
        && data.table.rows.length > 0;
    case 'beforeAfter':
      return Boolean(resolveSectionImageSource(data.bannerImage) || resolveSectionImageSource(data.beforeImage) || resolveSectionImageSource(data.afterImage));
    case 'resultsChart':
      return Array.isArray(data.stats) && data.stats.filter((item) => toSafeString(item?.label)).length > 0;
    case 'interactiveHotspots':
      return Boolean(resolveSectionImageSource(data.baseImage))
        && Array.isArray(data.hotspots)
        && data.hotspots.filter((item) => toSafeString(item?.title)).length > 0;
    case 'faq':
      return Array.isArray(data.items) && data.items.filter((item) => toSafeString(item?.q) && toSafeString(item?.a)).length > 0;
    default:
      return false;
  }
};

export const getOrderedLandingSections = (config) => {
  const sections = config?.sections || {};
  return Object.keys(sections)
    .map((id) => ({ id, ...sections[id] }))
    .sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999));
};

export const buildColombianReviewSuggestions = (productName = '', count = 5) => {
  const safeName = String(productName || 'el producto').trim();
  const bank = [
    `Lo pedi para ${safeName} y en una semana ya notaba cambio.`,
    'Me gusto porque llego rapido y la textura es agradable.',
    'Lo uso todos los dias y me ha funcionado super bien.',
    'La atencion por WhatsApp fue clara y me ayudaron a elegir.',
    'No deja sensacion pesada, eso me encanto.',
    'Recomiendo pedir el combo, sale mejor y rinde bastante.',
    'Se nota la diferencia cuando uno es constante.',
    'Me llego en dos dias, muy bien empacado.',
  ];
  const limit = clamp(Number(count) || 5, 3, 5);
  return bank.slice(0, limit).map((text, index) => ({
    name: ['Laura M.', 'Camilo R.', 'Diana P.', 'Andres G.', 'Natalia V.'][index] || `Cliente ${index + 1}`,
    stars: 5,
    text,
  }));
};

export const buildFaqSuggestions = (productName = '') => {
  const safeName = String(productName || 'este producto').trim();
  return [
    { q: `Como uso ${safeName} correctamente?`, a: 'Aplicalo de forma constante siguiendo la indicacion del empaque y el asesor te puede guiar por WhatsApp.' },
    { q: 'En cuanto tiempo se ven resultados?', a: 'Depende del tipo de piel/cabello, pero la mayoria de clientes reporta cambios desde la primera semana de uso continuo.' },
    { q: 'Puedo pagar contraentrega?', a: 'Si, segun cobertura de tu ciudad. Al finalizar compra te mostramos las opciones activas.' },
    { q: 'Sirve para hombres y mujeres?', a: 'Si. Esta formulado para uso unisex.' },
  ];
};

export const buildWinningCopySuggestions = (productName = '') => {
  const safeName = String(productName || 'tu producto').trim();
  return [
    {
      title: `Resultados reales con ${safeName}`,
      subtitle: 'Constancia diaria, formula confiable y soporte cercano.',
    },
    {
      title: 'Compra sin enredos',
      subtitle: 'Entrega rapida, pago seguro y acompanamiento por WhatsApp.',
    },
  ];
};
