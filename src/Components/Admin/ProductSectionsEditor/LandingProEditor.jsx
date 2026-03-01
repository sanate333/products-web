import React, { useMemo, useRef } from 'react';
import ImageField from './ImageField';
import SortableList from './SortableList';
import SectionStatusBadge from './SectionStatusBadge';
import {
  buildDefaultLandingV2Config,
  normalizeLandingV2Config,
  normalizeSectionImage,
  resolveSectionImageSource,
  shouldRenderSection,
} from '../../../utils/productSections';
import {
  suggestBannersCopy,
  suggestComparisonRows,
  suggestFAQs,
  suggestHighlights,
  suggestTestimonialsText,
} from '../../../utils/suggestions';
import { resolveImg } from '../../url';

const splitLines = (value) =>
  String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const toHotspotLines = (list) =>
  (Array.isArray(list) ? list : [])
    .map((item) => `${item.x ?? 50}|${item.y ?? 50}|${item.title || ''}|${item.desc || ''}`)
    .join('\n');

const toPreviewSrc = (image) => {
  const raw = resolveSectionImageSource(image);
  if (!raw) return '';
  return resolveImg(raw) || raw;
};

const isBlank = (value) => String(value || '').trim().length === 0;

const fillIfBlank = (value, suggestion) => (isBlank(value) ? suggestion : value);

const sectionDefs = [
  { id: 'announcement', title: '1) Announcement' },
  { id: 'heroPro', title: '2) Hero Pro' },
  { id: 'highlights', title: '3) Highlights' },
  { id: 'reviewsSummary', title: '4) Reviews summary' },
  { id: 'socialCarousel', title: '5) Social carousel stories' },
  { id: 'subBannerAfterCarousel', title: '6) Sub-banner despues del carrusel' },
  { id: 'benefits', title: '7) Beneficios' },
  { id: 'testimonials', title: '8) Testimonios (3x3)' },
  { id: 'ingredients', title: '9) Ingredientes (3 cards)' },
  { id: 'comparison', title: '10) Comparacion' },
  { id: 'beforeAfter', title: '11) Banner + antes/despues' },
  { id: 'resultsChart', title: '12) Resultados aprobados' },
  { id: 'interactiveHotspots', title: '13) Beneficios interactivos' },
  { id: 'faq', title: '14) FAQ (opcional)' },
];

export default function LandingProEditor({
  value,
  onChange,
  productName = '',
  category = '',
  brandColor = '#19b8ff',
  onBrandColorChange,
  onUploadCarouselAssets,
  onUploadSectionAsset,
}) {
  const uploadBatchRef = useRef(null);
  const config = useMemo(() => normalizeLandingV2Config(value, productName), [value, productName]);

  const updateConfig = (updater) => {
    const next = typeof updater === 'function' ? updater(config) : updater;
    onChange?.(next);
  };

  const patchSection = (id, patcher) => {
    updateConfig((current) => {
      const next = JSON.parse(JSON.stringify(current || buildDefaultLandingV2Config(productName)));
      const section = next.sections?.[id];
      if (!section) return next;
      if (typeof patcher === 'function') {
        patcher(section, next);
      } else if (patcher && typeof patcher === 'object') {
        Object.assign(section, patcher);
      }
      return next;
    });
  };

  const sortedDefs = [...sectionDefs].sort((a, b) => {
    const orderA = Number(config.sections?.[a.id]?.order || 999);
    const orderB = Number(config.sections?.[b.id]?.order || 999);
    return orderA - orderB;
  });

  const moveSection = (id, delta) => {
    const index = sortedDefs.findIndex((item) => item.id === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= sortedDefs.length) return;
    const currentId = sortedDefs[index].id;
    const targetId = sortedDefs[target].id;
    updateConfig((current) => {
      const next = JSON.parse(JSON.stringify(current || buildDefaultLandingV2Config(productName)));
      const currentOrder = next.sections[currentId].order;
      next.sections[currentId].order = next.sections[targetId].order;
      next.sections[targetId].order = currentOrder;
      return next;
    });
  };

  const fillSectionSuggestion = (id) => {
    const previews = [];
    if (id === 'highlights') previews.push(...suggestHighlights(productName, category));
    if (id === 'faq') previews.push(...suggestFAQs(productName, category).map((row) => `${row.q} -> ${row.a}`));
    if (id === 'comparison') previews.push(...suggestComparisonRows(productName, category).map((row) => row.join(' | ')));
    if (id === 'testimonials') previews.push(...suggestTestimonialsText(productName, category));
    if (id === 'benefits') {
      const copy = suggestBannersCopy(productName, category);
      previews.push(`${copy.titles[0]} - ${copy.subtitles[0]}`);
      previews.push(`${copy.titles[1]} - ${copy.subtitles[1]}`);
    }
    if (id === 'announcement') previews.push('Oferta especial', `${productName || 'Este producto'} con envio rapido`);
    if (id === 'heroPro') previews.push('Entrega 2-3 dias habiles', 'Comprar ahora');
    if (id === 'subBannerAfterCarousel') previews.push(`Conoce los resultados de ${productName || 'este producto'}`, 'Ver mas');
    if (id === 'ingredients') previews.push('Ingrediente 1, 2 y 3 con mini texto');
    if (id === 'beforeAfter') previews.push('Antes y despues');
    if (id === 'resultsChart') previews.push('Clientes satisfechos 92, Recompra 67, Entrega 95');
    if (id === 'interactiveHotspots') previews.push('2 hotspots base: Accion principal y Refuerzo');
    if (id === 'reviewsSummary') previews.push('Rating 4.5, count 9416, 5 reseñas estilo colombiano');

    const message = previews.length
      ? `Vista previa de sugerencias:\n\n- ${previews.join('\n- ')}\n\nAplicar solo en campos vacios?`
      : 'Aplicar sugerencias en campos vacios?';
    if (!window.confirm(message)) return;

    patchSection(id, (sec) => {
      switch (id) {
        case 'announcement':
          sec.data.badge = fillIfBlank(sec.data.badge, 'Oferta especial');
          sec.data.text = fillIfBlank(sec.data.text, `${productName || 'Este producto'} con envio rapido y pago contraentrega`);
          break;
        case 'heroPro':
          sec.data.deliveryLabel = fillIfBlank(sec.data.deliveryLabel, 'Entrega 2-3 dias habiles');
          sec.data.ctaText = fillIfBlank(sec.data.ctaText, 'Comprar ahora');
          sec.data.ratingAvg = Number(sec.data.ratingAvg) || 4.5;
          sec.data.ratingCount = Number(sec.data.ratingCount) || 9416;
          break;
        case 'highlights': {
          const suggestions = suggestHighlights(productName, category);
          const items = Array.isArray(sec.data.items) ? sec.data.items : [];
          sec.data.items = Array.from({ length: 3 }).map((_, index) => {
            const current = items[index] || { icon: 'check', text: '' };
            return { ...current, text: fillIfBlank(current.text, suggestions[index] || '') };
          });
          break;
        }
        case 'reviewsSummary': {
          const reviews = suggestTestimonialsText(productName, category).slice(0, 5);
          const items = Array.isArray(sec.data.items) ? sec.data.items : [];
          sec.data.items = Array.from({ length: 5 }).map((_, index) => {
            const current = items[index] || { name: '', stars: 5, text: '' };
            return {
              ...current,
              name: fillIfBlank(current.name, `Cliente ${index + 1}`),
              stars: Number(current.stars) || 5,
              text: fillIfBlank(current.text, reviews[index] || ''),
            };
          });
          sec.data.avg = Number(sec.data.avg) || 4.5;
          sec.data.count = Number(sec.data.count) || 9416;
          break;
        }
        case 'socialCarousel':
          sec.data.autoplay = Boolean(sec.data.autoplay || true);
          sec.data.loop = Boolean(sec.data.loop || true);
          break;
        case 'subBannerAfterCarousel':
          sec.data.text = fillIfBlank(sec.data.text, `Conoce los resultados de ${productName || 'este producto'}`);
          sec.data.cta = fillIfBlank(sec.data.cta, 'Ver mas');
          break;
        case 'benefits': {
          const copy = suggestBannersCopy(productName, category);
          const items = Array.isArray(sec.data.items) ? sec.data.items : [];
          sec.data.items = Array.from({ length: 2 }).map((_, index) => {
            const current = items[index] || { title: '', subtitle: '', image: normalizeSectionImage(null) };
            return {
              ...current,
              title: fillIfBlank(current.title, copy.titles[index] || ''),
              subtitle: fillIfBlank(current.subtitle, copy.subtitles[index] || ''),
            };
          });
          break;
        }
        case 'testimonials': {
          const texts = suggestTestimonialsText(productName, category);
          const items = Array.isArray(sec.data.items) ? sec.data.items : [];
          sec.data.items = Array.from({ length: 9 }).map((_, index) => {
            const current = items[index] || { name: '', stars: 5, text: '', image: normalizeSectionImage(null) };
            return {
              ...current,
              name: fillIfBlank(current.name, `Cliente ${index + 1}`),
              stars: Number(current.stars) || 5,
              text: fillIfBlank(current.text, texts[index] || ''),
            };
          });
          break;
        }
        case 'ingredients': {
          const cards = Array.isArray(sec.data.cards) ? sec.data.cards : [];
          sec.data.cards = Array.from({ length: 3 }).map((_, index) => {
            const current = cards[index] || { title: '', desc: '', image: normalizeSectionImage(null) };
            return {
              ...current,
              title: fillIfBlank(current.title, `Ingrediente ${index + 1}`),
              desc: fillIfBlank(current.desc, 'Aporta beneficios clave para uso diario.'),
            };
          });
          break;
        }
        case 'comparison': {
          const rows = suggestComparisonRows(productName, category);
          sec.data.title = fillIfBlank(sec.data.title, `Comparacion de ${productName || 'nuestro producto'} vs otras marcas`);
          sec.data.body = fillIfBlank(sec.data.body, 'Revisa los puntos clave para tomar una decision informada.');
          if (!sec.data.table) sec.data.table = { headers: ['Caracteristica', 'Nuestra marca', 'Otras marcas'], rows: [] };
          if (!Array.isArray(sec.data.table.headers) || sec.data.table.headers.length < 3) {
            sec.data.table.headers = ['Caracteristica', 'Nuestra marca', 'Otras marcas'];
          }
          const currentRows = Array.isArray(sec.data.table.rows) ? sec.data.table.rows : [];
          sec.data.table.rows = Array.from({ length: 5 }).map((_, index) => {
            const current = Array.isArray(currentRows[index]) ? [...currentRows[index]] : ['', '', ''];
            const suggested = rows[index] || ['', '', ''];
            return [
              fillIfBlank(current[0], suggested[0]),
              fillIfBlank(current[1], suggested[1]),
              fillIfBlank(current[2], suggested[2]),
            ];
          });
          break;
        }
        case 'beforeAfter':
          sec.data.title = fillIfBlank(sec.data.title, 'Antes y despues');
          break;
        case 'resultsChart': {
          const defaults = [
            { label: 'Clientes satisfechos', value: 92 },
            { label: 'Recompra en 30 dias', value: 67 },
            { label: 'Entrega a tiempo', value: 95 },
          ];
          const current = Array.isArray(sec.data.stats) ? sec.data.stats : [];
          sec.data.stats = Array.from({ length: 3 }).map((_, index) => {
            const item = current[index] || {};
            return {
              label: fillIfBlank(item.label, defaults[index].label),
              value: Number(item.value) || defaults[index].value,
            };
          });
          break;
        }
        case 'interactiveHotspots': {
          const current = Array.isArray(sec.data.hotspots) ? sec.data.hotspots : [];
          const defaults = [
            { x: 40, y: 30, title: 'Accion principal', desc: 'Beneficio visible en zona clave.' },
            { x: 68, y: 60, title: 'Refuerzo', desc: 'Complementa el resultado general.' },
          ];
          sec.data.hotspots = Array.from({ length: 2 }).map((_, index) => {
            const item = current[index] || {};
            return {
              x: Number(item.x) || defaults[index].x,
              y: Number(item.y) || defaults[index].y,
              title: fillIfBlank(item.title, defaults[index].title),
              desc: fillIfBlank(item.desc, defaults[index].desc),
            };
          });
          break;
        }
        case 'faq': {
          const faqs = suggestFAQs(productName, category);
          const current = Array.isArray(sec.data.items) ? sec.data.items : [];
          sec.data.items = Array.from({ length: Math.min(8, faqs.length) }).map((_, index) => {
            const item = current[index] || { q: '', a: '' };
            return {
              q: fillIfBlank(item.q, faqs[index].q),
              a: fillIfBlank(item.a, faqs[index].a),
            };
          });
          break;
        }
        default:
          break;
      }
    });
  };

  const handleImage = (sectionId, path, image) => {
    patchSection(sectionId, (section) => {
      let cursor = section.data;
      for (let i = 0; i < path.length - 1; i += 1) {
        cursor = cursor[path[i]];
      }
      cursor[path[path.length - 1]] = normalizeSectionImage(image);
    });
  };

  const batchUploadStories = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    let urls = [];
    if (typeof onUploadCarouselAssets === 'function') {
      urls = await onUploadCarouselAssets(files);
    } else if (typeof onUploadSectionAsset === 'function') {
      // fallback sequential upload
      for (const file of files) {
        // eslint-disable-next-line no-await-in-loop
        const url = await onUploadSectionAsset(file);
        if (url) urls.push(url);
      }
    }
    if (!urls.length) return;
    patchSection('socialCarousel', (section) => {
      const current = Array.isArray(section.data.items) ? section.data.items : [];
      section.data.items = [...current, ...urls.map((entry) => normalizeSectionImage(entry))].slice(0, 10);
    });
  };

  const renderSectionBody = (sectionId) => {
    const section = config.sections[sectionId];
    const data = section?.data || {};
    switch (sectionId) {
      case 'announcement':
        return (
          <div className="pseGrid2">
            <input
              value={data.badge || ''}
              placeholder="Badge"
              onChange={(event) => patchSection(sectionId, (sec) => { sec.data.badge = event.target.value; })}
            />
            <input
              value={data.text || ''}
              placeholder="Texto anuncio"
              onChange={(event) => patchSection(sectionId, (sec) => { sec.data.text = event.target.value; })}
            />
          </div>
        );
      case 'heroPro':
        return (
          <div className="pseGrid3">
            <input
              value={data.deliveryLabel || ''}
              placeholder="Entrega 2-3 dias habiles"
              onChange={(event) => patchSection(sectionId, (sec) => { sec.data.deliveryLabel = event.target.value; })}
            />
            <input
              type="number"
              min="3"
              max="5"
              step="0.1"
              value={Number(data.ratingAvg || 4.5)}
              onChange={(event) => patchSection(sectionId, (sec) => { sec.data.ratingAvg = Number(event.target.value) || 4.5; })}
            />
            <input
              type="number"
              min="1"
              value={Number(data.ratingCount || 9416)}
              onChange={(event) => patchSection(sectionId, (sec) => { sec.data.ratingCount = Number(event.target.value) || 1; })}
            />
            <input
              value={data.ctaText || ''}
              placeholder="CTA"
              onChange={(event) => patchSection(sectionId, (sec) => { sec.data.ctaText = event.target.value; })}
            />
          </div>
        );
      case 'highlights':
        return (
          <div className="pseStack">
            <textarea
              rows={4}
              placeholder="Una linea por beneficio"
              value={(data.items || []).map((item) => item.text || '').join('\n')}
              onChange={(event) => patchSection(sectionId, (sec) => {
                sec.data.items = splitLines(event.target.value).slice(0, 3).map((text) => ({ icon: 'check', text }));
              })}
            />
          </div>
        );
      case 'reviewsSummary':
        return (
          <div className="pseStack">
            <div className="pseInlineActions">
              <input
                type="number"
                min="3"
                max="5"
                step="0.1"
                value={Number(data.avg || 4.5)}
                onChange={(event) => patchSection(sectionId, (sec) => { sec.data.avg = Number(event.target.value) || 4.5; })}
              />
              <input
                type="number"
                min="1"
                value={Number(data.count || 9416)}
                onChange={(event) => patchSection(sectionId, (sec) => { sec.data.count = Number(event.target.value) || 1; })}
              />
              <button type="button" onClick={() => patchSection(sectionId, (sec) => {
                const texts = suggestTestimonialsText(productName, category).slice(0, 5);
                const current = Array.isArray(sec.data.items) ? sec.data.items : [];
                sec.data.items = texts.map((text, index) => {
                  const row = current[index] || { name: '', stars: 5, text: '' };
                  return {
                    ...row,
                    name: fillIfBlank(row.name, `Cliente ${index + 1}`),
                    stars: Number(row.stars) || 5,
                    text: fillIfBlank(row.text, text),
                  };
                });
              })}
              >
                Generar reviews estilo colombiano
              </button>
            </div>
            <textarea
              rows={5}
              placeholder="Formato: Nombre|Texto"
              value={(data.items || []).map((item) => `${item.name || ''}|${item.text || ''}`).join('\n')}
              onChange={(event) => patchSection(sectionId, (sec) => {
                sec.data.items = splitLines(event.target.value)
                  .map((line) => {
                    const [name, text] = line.split('|');
                    if (!name || !text) return null;
                    return { name: name.trim(), stars: 5, text: text.trim() };
                  })
                  .filter(Boolean)
                  .slice(0, 5);
              })}
            />
          </div>
        );
      case 'socialCarousel':
        return (
          <div className="pseStack">
            <div className="pseInlineActions">
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(data.autoplay)}
                  onChange={(event) => patchSection(sectionId, (sec) => { sec.data.autoplay = event.target.checked; })}
                />
                Autoplay
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(data.loop)}
                  onChange={(event) => patchSection(sectionId, (sec) => { sec.data.loop = event.target.checked; })}
                />
                Loop
              </label>
              <button type="button" onClick={() => uploadBatchRef.current?.click()}>
                Agregar rapido (lote)
              </button>
              <input
                ref={uploadBatchRef}
                hidden
                multiple
                type="file"
                accept="image/*,video/mp4,video/webm"
                onChange={batchUploadStories}
              />
              <button type="button" onClick={() => patchSection(sectionId, (sec) => {
                if (!Array.isArray(sec.data.items)) sec.data.items = [];
                if (sec.data.items.length >= 10) return;
                sec.data.items.push(normalizeSectionImage(null));
              })}
              >
                + Historia
              </button>
            </div>
            <SortableList
              items={Array.isArray(data.items) ? data.items : []}
              onChange={(next) => patchSection(sectionId, (sec) => { sec.data.items = next; })}
              getKey={(_, index) => `story-${index}`}
              renderItem={(item, index) => (
                <div className="pseStoryRow">
                  <ImageField
                    label={`Historia ${index + 1}`}
                    value={item}
                    onChange={(nextImage) => patchSection(sectionId, (sec) => { sec.data.items[index] = nextImage; })}
                    onUpload={onUploadSectionAsset}
                  />
                  <button
                    type="button"
                    className="pseDanger"
                    onClick={() => patchSection(sectionId, (sec) => {
                      sec.data.items = sec.data.items.filter((_, i) => i !== index);
                    })}
                  >
                    Quitar
                  </button>
                </div>
              )}
            />
          </div>
        );
      case 'subBannerAfterCarousel':
        return (
          <div className="pseStack">
            <div className="pseGrid2">
              <input
                value={data.text || ''}
                placeholder="Texto sub-banner"
                onChange={(event) => patchSection(sectionId, (sec) => { sec.data.text = event.target.value; })}
              />
              <input
                value={data.cta || ''}
                placeholder="CTA"
                onChange={(event) => patchSection(sectionId, (sec) => { sec.data.cta = event.target.value; })}
              />
            </div>
            <ImageField
              label="Imagen sub-banner"
              value={data.image}
              onChange={(nextImage) => handleImage(sectionId, ['image'], nextImage)}
              onUpload={onUploadSectionAsset}
            />
          </div>
        );
      case 'benefits':
        return (
          <div className="pseStack">
            {(data.items || []).map((item, index) => (
              <div key={`benefit-${index}`} className="pseCardRow">
                <input
                  value={item.title || ''}
                  placeholder="Titulo beneficio"
                  onChange={(event) => patchSection(sectionId, (sec) => { sec.data.items[index].title = event.target.value; })}
                />
                <input
                  value={item.subtitle || ''}
                  placeholder="Subtitulo"
                  onChange={(event) => patchSection(sectionId, (sec) => { sec.data.items[index].subtitle = event.target.value; })}
                />
                <ImageField
                  label={`Imagen beneficio ${index + 1}`}
                  value={item.image}
                  onChange={(nextImage) => patchSection(sectionId, (sec) => { sec.data.items[index].image = nextImage; })}
                  onUpload={onUploadSectionAsset}
                />
              </div>
            ))}
          </div>
        );
      case 'testimonials':
        return (
          <div className="pseStack">
            <div className="pseInlineActions">
              <button type="button" onClick={() => patchSection(sectionId, (sec) => {
                sec.data.items = Array.from({ length: 9 }).map((_, index) => ({
                  name: `Cliente ${index + 1}`,
                  stars: 5,
                  text: `Me gusto mucho ${productName || 'el producto'}, lo volveria a pedir.`,
                  image: normalizeSectionImage(null),
                }));
              })}
              >
                Autocompletar 9 testimonios base
              </button>
            </div>
            <div className="pseTestimonialsGrid">
            {(Array.from({ length: 9 }).map((_, index) => data.items?.[index] || {
              name: `Cliente ${index + 1}`,
              stars: 5,
              text: '',
              image: normalizeSectionImage(null),
            })).map((item, index) => (
              <div className="pseTestimonialCard" key={`test-${index}`}>
                  <ImageField
                    label={`Imagen ${index + 1}`}
                    value={item.image}
                    onChange={(nextImage) => patchSection(sectionId, (sec) => {
                      if (!Array.isArray(sec.data.items)) sec.data.items = [];
                      if (!sec.data.items[index]) sec.data.items[index] = { name: `Cliente ${index + 1}`, stars: 5, text: '', image: normalizeSectionImage(null) };
                      sec.data.items[index].image = nextImage;
                    })}
                    onUpload={onUploadSectionAsset}
                  />
                  <input
                    value={item.name || ''}
                    placeholder="Nombre"
                    onChange={(event) => patchSection(sectionId, (sec) => {
                      if (!Array.isArray(sec.data.items)) sec.data.items = [];
                      if (!sec.data.items[index]) sec.data.items[index] = { name: `Cliente ${index + 1}`, stars: 5, text: '', image: normalizeSectionImage(null) };
                      sec.data.items[index].name = event.target.value;
                    })}
                  />
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={item.stars || 5}
                    onChange={(event) => patchSection(sectionId, (sec) => {
                      if (!Array.isArray(sec.data.items)) sec.data.items = [];
                      if (!sec.data.items[index]) sec.data.items[index] = { name: `Cliente ${index + 1}`, stars: 5, text: '', image: normalizeSectionImage(null) };
                      sec.data.items[index].stars = clamp(Number(event.target.value) || 5, 1, 5);
                    })}
                  />
                  <textarea
                    rows={3}
                    placeholder="Texto testimonio"
                    value={item.text || ''}
                    onChange={(event) => patchSection(sectionId, (sec) => {
                      if (!Array.isArray(sec.data.items)) sec.data.items = [];
                      if (!sec.data.items[index]) sec.data.items[index] = { name: `Cliente ${index + 1}`, stars: 5, text: '', image: normalizeSectionImage(null) };
                      sec.data.items[index].text = event.target.value;
                    })}
                  />
              </div>
            ))}
            </div>
          </div>
        );
      case 'ingredients':
        return (
          <div className="pseIngredientsGrid">
            {(Array.from({ length: 3 }).map((_, index) => data.cards?.[index] || {
              title: `Ingrediente ${index + 1}`,
              desc: '',
              image: normalizeSectionImage(null),
            })).map((card, index) => (
              <div className="pseIngredientCard" key={`ing-${index}`}>
                <ImageField
                  label={`Ingrediente ${index + 1} (1080x1080)`}
                  value={card.image}
                  onChange={(nextImage) => patchSection(sectionId, (sec) => {
                    if (!Array.isArray(sec.data.cards)) sec.data.cards = [];
                    if (!sec.data.cards[index]) sec.data.cards[index] = { title: `Ingrediente ${index + 1}`, desc: '', image: normalizeSectionImage(null) };
                    sec.data.cards[index].image = nextImage;
                  })}
                  onUpload={onUploadSectionAsset}
                />
                <input
                  value={card.title || ''}
                  placeholder="Titulo"
                  onChange={(event) => patchSection(sectionId, (sec) => {
                    if (!Array.isArray(sec.data.cards)) sec.data.cards = [];
                    if (!sec.data.cards[index]) sec.data.cards[index] = { title: `Ingrediente ${index + 1}`, desc: '', image: normalizeSectionImage(null) };
                    sec.data.cards[index].title = event.target.value;
                  })}
                />
                <textarea
                  rows={2}
                  placeholder="Mini texto"
                  value={card.desc || ''}
                  onChange={(event) => patchSection(sectionId, (sec) => {
                    if (!Array.isArray(sec.data.cards)) sec.data.cards = [];
                    if (!sec.data.cards[index]) sec.data.cards[index] = { title: `Ingrediente ${index + 1}`, desc: '', image: normalizeSectionImage(null) };
                    sec.data.cards[index].desc = event.target.value;
                  })}
                />
              </div>
            ))}
          </div>
        );
      case 'comparison':
        return (
          <div className="pseStack">
            <input
              value={data.title || ''}
              placeholder="Titulo comparacion"
              onChange={(event) => patchSection(sectionId, (sec) => { sec.data.title = event.target.value; })}
            />
            <input
              value={data.body || ''}
              placeholder="Texto comparacion"
              onChange={(event) => patchSection(sectionId, (sec) => { sec.data.body = event.target.value; })}
            />
            <textarea
              rows={6}
              placeholder="Caracteristica|Nuestra marca|Otras marcas"
              value={(data.table?.rows || []).map((row) => row.join('|')).join('\n')}
              onChange={(event) => patchSection(sectionId, (sec) => {
                sec.data.table.rows = splitLines(event.target.value)
                  .map((line) => line.split('|').map((cell) => cell.trim()))
                  .filter((row) => row.length >= 3);
              })}
            />
          </div>
        );
      case 'beforeAfter':
        return (
          <div className="pseGrid2">
            <input
              value={data.title || ''}
              placeholder="Titulo"
              onChange={(event) => patchSection(sectionId, (sec) => { sec.data.title = event.target.value; })}
            />
            <ImageField
              label="Banner principal"
              value={data.bannerImage}
              onChange={(nextImage) => handleImage(sectionId, ['bannerImage'], nextImage)}
              onUpload={onUploadSectionAsset}
            />
            <ImageField
              label="Imagen antes"
              value={data.beforeImage}
              onChange={(nextImage) => handleImage(sectionId, ['beforeImage'], nextImage)}
              onUpload={onUploadSectionAsset}
            />
            <ImageField
              label="Imagen despues"
              value={data.afterImage}
              onChange={(nextImage) => handleImage(sectionId, ['afterImage'], nextImage)}
              onUpload={onUploadSectionAsset}
            />
          </div>
        );
      case 'resultsChart':
        return (
          <div className="pseStack">
            <textarea
              rows={5}
              placeholder="Etiqueta|Valor(0-100)"
              value={(data.stats || []).map((row) => `${row.label || ''}|${row.value || 0}`).join('\n')}
              onChange={(event) => patchSection(sectionId, (sec) => {
                sec.data.stats = splitLines(event.target.value)
                  .map((line) => {
                    const [label, valueRaw] = line.split('|');
                    if (!label) return null;
                    return { label: label.trim(), value: clamp(Number(valueRaw) || 0, 0, 100) };
                  })
                  .filter(Boolean);
              })}
            />
          </div>
        );
      case 'interactiveHotspots':
        return (
          <div className="pseStack">
            <ImageField
              label="Imagen base hotspots"
              value={data.baseImage}
              onChange={(nextImage) => handleImage(sectionId, ['baseImage'], nextImage)}
              onUpload={onUploadSectionAsset}
            />
            <textarea
              rows={5}
              placeholder="X|Y|Titulo|Texto"
              value={toHotspotLines(data.hotspots)}
              onChange={(event) => patchSection(sectionId, (sec) => {
                sec.data.hotspots = splitLines(event.target.value)
                  .map((line) => {
                    const [xRaw, yRaw, title, desc] = line.split('|');
                    if (!title) return null;
                    return {
                      x: clamp(Number(xRaw) || 50, 0, 100),
                      y: clamp(Number(yRaw) || 50, 0, 100),
                      title: title.trim(),
                      desc: (desc || '').trim(),
                    };
                  })
                  .filter(Boolean);
              })}
            />
            {toPreviewSrc(data.baseImage) ? (
              <div className="pseHotspotPreview">
                <img src={toPreviewSrc(data.baseImage)} alt="Hotspots preview" />
                {(data.hotspots || []).map((spot, index) => (
                  <button
                    key={`spot-${index}`}
                    type="button"
                    style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                    title={`${spot.title}: ${spot.desc}`}
                  >
                    +
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        );
      case 'faq':
        return (
          <div className="pseStack">
            <textarea
              rows={6}
              placeholder="Pregunta|Respuesta"
              value={(data.items || []).map((item) => `${item.q || ''}|${item.a || ''}`).join('\n')}
              onChange={(event) => patchSection(sectionId, (sec) => {
                sec.data.items = splitLines(event.target.value)
                  .map((line) => {
                    const [q, a] = line.split('|');
                    if (!q || !a) return null;
                    return { q: q.trim(), a: a.trim() };
                  })
                  .filter(Boolean)
                  .slice(0, 8);
              })}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="productSectionsEditor">
      <div className="pseTopRow">
        <h4>Secciones Pro (Landing)</h4>
        <div className="pseTopControls">
          <button
            type="button"
            className={`pseGlobalToggle ${config?.enabled === false ? 'off' : 'on'}`}
            onClick={() => updateConfig((current) => ({ ...current, enabled: current?.enabled === false }))}
          >
            {config?.enabled === false ? 'Activar secciones Pro Landing' : 'Desactivar secciones Pro Landing'}
          </button>
          <label className="pseBrandColor">
            Color marca
            <input
              type="color"
              value={brandColor || '#19b8ff'}
              onChange={(event) => onBrandColorChange?.(event.target.value)}
            />
          </label>
        </div>
      </div>
      <small className="pseGlobalHelp">
        Este interruptor muestra/oculta todas las secciones Pro en la pagina del producto.
        Los checks de cada seccion siguen configurando visibilidad individual.
      </small>

      {sortedDefs.map((def, index) => {
        const section = config.sections[def.id];
        const canRender = shouldRenderSection(def.id, section);
        return (
          <details key={def.id} className="pseAccordion" open={index < 3}>
            <summary className="pseAccordionSummary">
              <div className="pseSummaryMain">
                <strong>{def.title}</strong>
                <SectionStatusBadge ok={canRender} />
              </div>              <div className="pseSummaryActions">
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(section.enabled)}
                    onChange={(event) => patchSection(def.id, (sec) => { sec.enabled = event.target.checked; })}
                  />
                  Mostrar seccion
                </label>
                <button type="button" onClick={(event) => { event.preventDefault(); moveSection(def.id, -1); }} disabled={index === 0}>
                  Up
                </button>
                <button type="button" onClick={(event) => { event.preventDefault(); moveSection(def.id, 1); }} disabled={index === sortedDefs.length - 1}>
                  Down
                </button>
                <button type="button" onClick={(event) => { event.preventDefault(); fillSectionSuggestion(def.id); }}>
                  Sugerir
                </button>
              </div>
            </summary>
            <div className="pseAccordionBody">{renderSectionBody(def.id)}</div>
          </details>
        );
      })}
    </div>
  );
}

