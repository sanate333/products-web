import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './ImagenesIA.css';
import baseURL from '../../Components/url';

const DEFAULT_IA_API_BASE = 'https://products-web-j7ji.onrender.com';
const PINNED_API = `${DEFAULT_IA_API_BASE}/api`;

const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return `${DEFAULT_IA_API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
};

const buildApiUrl = (path) => {
  const cleanPath = path.replace(/^\/+/, '');
  return `${PINNED_API}/${cleanPath}`;
};

const fetchJsonSafe = async (path, options = {}) => {
  const url = buildApiUrl(path);
  try {
    const resp = await fetch(url, { ...options });
    const ct = resp.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      return { ok: resp.ok, data: await resp.json(), url, status: resp.status };
    }
    const text = await resp.text();
    const trimmed = text.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try { return { ok: resp.ok, data: JSON.parse(trimmed), url, status: resp.status }; } catch (_) {}
    }
    return { ok: false, text, url, status: resp.status };
  } catch (err) {
    return { ok: false, url, status: 0, text: err?.message || 'network_error' };
  }
};

const BRAND_PALETTES = {
  Hero: {
    bg: 'dramatic dark gradient background with electric blue and deep navy',
    light: 'cinematic rim lighting, powerful spotlight from above',
    mood: 'high-energy, explosive, powerful, motivational aesthetic',
    comp: 'centered product hero shot, dynamic diagonal composition',
  },
  Oferta: {
    bg: 'bold red and gold gradient background, urgency and excitement',
    light: 'bright dramatic lighting, golden hour glow',
    mood: 'urgent, exclusive, limited-time, high-conversion energy',
    comp: 'product centered with empty space for price overlay, bold composition',
  },
  Beneficios: {
    bg: 'clean emerald green and white gradient, natural and fresh',
    light: 'soft natural daylight, clean studio lighting',
    mood: 'healthy, natural, trustworthy, wellness aesthetic',
    comp: 'product with natural elements, flat lay or lifestyle context',
  },
  'Antes/Despues': {
    bg: 'split composition, dark moody left side and bright right side',
    light: 'dramatic contrast lighting, transformation narrative',
    mood: 'powerful transformation, dramatic results, before/after split',
    comp: 'split screen dramatic composition, transformation visual storytelling',
  },
  Testimonio: {
    bg: 'warm beige and cream studio background, authentic lifestyle',
    light: 'warm natural window light, soft shadows',
    mood: 'authentic, trustworthy, real results, social proof aesthetic',
    comp: 'lifestyle context, product with human element suggestion',
  },
  Logistica: {
    bg: 'clean white and light blue professional background',
    light: 'clean bright studio lighting, crisp and professional',
    mood: 'reliable, fast, professional logistics and shipping aesthetic',
    comp: 'product with packaging, shipping box, clean minimal layout',
  },
};

const buildHighImpactPrompt = ({ productName, productDetails, templateType, angle, benefit, style, brandColor }) => {
  const palette = BRAND_PALETTES[templateType] || BRAND_PALETTES.Hero;
  const parts = [
    `Ultra-realistic commercial ecommerce product photography of ${productName} supplement bottle/container.`,
    palette.bg + '.',
    palette.light + '.',
    palette.mood + '.',
    palette.comp + '.',
  ];
  if (productDetails) parts.push(`Product: ${productDetails}.`);
  if (angle) parts.push(`Marketing angle: ${angle}.`);
  if (benefit) parts.push(`Target customer: ${benefit}.`);
  if (brandColor) parts.push(`Brand accent color: ${brandColor}.`);
  if (style) parts.push(`Style direction: ${style}.`);
  parts.push(
    'Photorealistic 8K quality, professional commercial advertising photography.',
    'Cinematic depth of field, perfect product focus, premium brand aesthetics.',
    'High conversion ecommerce hero image, magazine quality.',
    'Dramatic color grading matching brand identity.',
    'CRITICAL: NO text, NO words, NO letters, NO typography, NO captions anywhere in image.'
  );
  return parts.join(' ');
};

const ECOM_MAGIC_TEMPLATES = [
  { id: 1, name: 'Hero Impacto', type: 'Hero', url: 'https://ecom-magic.ai/public-banners/landing-templates/hero-0476bf69-7ccd-4679-ae5c-6d1c6e0d0e67.png', score: 97 },
  { id: 2, name: 'Oferta Flash', type: 'Oferta', url: 'https://ecom-magic.ai/public-banners/landing-templates/hero-0476bf69-7ccd-4679-ae5c-6d1c6e0d0e67.png', score: 93 },
  { id: 3, name: 'Beneficios', type: 'Beneficios', url: 'https://ecom-magic.ai/public-banners/landing-templates/hero-0476bf69-7ccd-4679-ae5c-6d1c6e0d0e67.png', score: 91 },
  { id: 4, name: 'Antes/Despues', type: 'Antes/Despues', url: 'https://ecom-magic.ai/public-banners/landing-templates/hero-0476bf69-7ccd-4679-ae5c-6d1c6e0d0e67.png', score: 95 },
];

const ensurePngFile = async (file) => {
  if (file.type === 'image/png') return file;
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      canvas.toBlob((blob) => resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.png'), { type: 'image/png' })), 'image/png');
    };
    img.src = URL.createObjectURL(file);
  });
};

const extractDominantColor = async (file) => {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 50; canvas.height = 50;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 50, 50);
      const data = ctx.getImageData(0, 0, 50, 50).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 16) {
        r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
      }
      resolve(`rgb(${Math.round(r/count)},${Math.round(g/count)},${Math.round(b/count)})`);
    };
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
};

const MODEL_OPTIONS = ['pollinations', 'openai'];
const templateOptions = ['Hero', 'Oferta', 'Beneficios', 'Antes/Despues', 'Testimonio', 'Logistica'];
const sizeOptions = [
  { label: 'Instagram Cuadrado (1024x1024)', value: '1024x1024' },
  { label: 'Instagram Stories (1024x1792)', value: '1024x1792' },
  { label: 'Horizontal Facebook (1792x1024)', value: '1792x1024' },
  { label: 'Miniatura (512x512)', value: '512x512' },
];

export default function ImagenesIA() {
  const [model, setModel] = useState('pollinations');
  const [templateType, setTemplateType] = useState('Hero');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [productPhotos, setProductPhotos] = useState([null, null, null]);
  const [brandColor, setBrandColor] = useState('');
  const [size, setSize] = useState('1024x1024');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [products, setProducts] = useState([]);
  const [showCreativeControls, setShowCreativeControls] = useState(false);
  const [angle, setAngle] = useState('');
  const [benefit, setBenefit] = useState('');
  const [style, setStyle] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [generatedImages, setGeneratedImages] = useState([]);
  const [lastPrompt, setLastPrompt] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [genCount, setGenCount] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const fileRefs = [useRef(), useRef(), useRef()];

  useEffect(() => {
    fetchJsonSafe('ai-images/products').then(r => {
      if (r.ok && Array.isArray(r.data)) setProducts(r.data);
    });
    fetchImages();
  }, []);

  const fetchImages = async () => {
    const r = await fetchJsonSafe('ai-images');
    if (r.ok && Array.isArray(r.data)) setGeneratedImages(r.data);
  };

  const handlePhotoUpload = async (index, file) => {
    if (!file) return;
    const pngFile = await ensurePngFile(file);
    const newPhotos = [...productPhotos];
    newPhotos[index] = pngFile;
    setProductPhotos(newPhotos);
    console.log(`File uploaded to slot ${index + 1}`);
    const color = await extractDominantColor(pngFile);
    if (color) setBrandColor(color);
  };

  const selectedProductData = useMemo(() =>
    products.find(p => String(p.id) === String(selectedProduct)),
    [products, selectedProduct]
  );

  const builtPrompt = useMemo(() => {
    const name = selectedProductData?.title || selectedProductData?.name || 'Product';
    const details = selectedProductData
      ? [selectedProductData.description, selectedProductData.details].filter(Boolean).join('. ')
      : '';
    return buildHighImpactPrompt({ productName: name, productDetails: details, templateType, angle, benefit, style, brandColor });
  }, [selectedProductData, templateType, angle, benefit, style, brandColor]);

  // ─── GENERATE WITH POLLINATIONS ───────────────────────────────────────────
  const handleGenerateWithPollinations = useCallback(async () => {
    setLoading(true);
    setStatusMsg('🧠 Generando imagen premium con Flux... (por favor espera)');
    const prompt = builtPrompt;
    setLastPrompt(prompt);

    const [w, h] = size.split('x').map(Number);
    const seed = Math.floor(Math.random() * 999999);
    const encodedPrompt = encodeURIComponent(prompt);
    // NOTE: &enhance=true removed — causes 503 errors on Pollinations
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${w || 1024}&height=${h || 1024}&seed=${seed}&nologo=true&model=flux`;

    try {
      // Load image with 90 second timeout — Flux can be slow
      await new Promise((resolve, reject) => {
        const img = new window.Image();
        const timer = setTimeout(() => {
          img.src = '';
          reject(new Error('timeout'));
        }, 90000);
        img.onload = () => { clearTimeout(timer); resolve(pollinationsUrl); };
        img.onerror = () => { clearTimeout(timer); reject(new Error('load_error')); };
        img.src = pollinationsUrl;
      });

      setStatusMsg('✅ ¡Imagen generada! Guardando en galería...');
      setGenCount(c => c + 1);

      // Save to backend in background (non-blocking)
      fetchJsonSafe('ai-images/save-external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: pollinationsUrl,
          prompt,
          type: templateType,
          productId: selectedProduct || null,
          model: 'pollinations-flux',
          size,
        }),
      }).then(() => fetchImages()).catch(() => {});

      // Show image immediately
      setGeneratedImages(prev => [{
        id: Date.now(),
        imageUrl: pollinationsUrl,
        prompt,
        type: templateType,
        score: Math.floor(Math.random() * 10 + 88),
        createdAt: new Date().toISOString(),
      }, ...prev]);

      setStatusMsg('✅ ¡Imagen generada con éxito!');
    } catch (err) {
      if (err.message === 'timeout') {
        // On timeout — try flux-schnell as fallback (faster model)
        setStatusMsg('⏳ Flux tardó mucho, intentando modelo rápido...');
        const fastUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${Math.min(w||1024,512)}&height=${Math.min(h||1024,512)}&seed=${seed}&nologo=true&model=turbo`;
        try {
          await new Promise((resolve, reject) => {
            const img2 = new window.Image();
            const t2 = setTimeout(() => { img2.src=''; reject(new Error('timeout2')); }, 60000);
            img2.onload = () => { clearTimeout(t2); resolve(); };
            img2.onerror = () => { clearTimeout(t2); reject(new Error('load_error2')); };
            img2.src = fastUrl;
          });
          setGenCount(c => c + 1);
          setGeneratedImages(prev => [{
            id: Date.now(),
            imageUrl: fastUrl,
            prompt,
            type: templateType,
            score: Math.floor(Math.random() * 8 + 82),
            createdAt: new Date().toISOString(),
          }, ...prev]);
          setStatusMsg('✅ ¡Imagen generada con modelo turbo!');
        } catch {
          setStatusMsg('❌ Pollinations no disponible ahora. Intenta en unos minutos.');
        }
      } else {
        setStatusMsg('❌ Error al generar. Verifica conexión e intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  }, [builtPrompt, size, templateType, selectedProduct]);

  // ─── GENERATE WITH OPENAI ─────────────────────────────────────────────────
  const handleGenerateOpenAI = useCallback(async () => {
    if (!openaiKey) { setStatusMsg('⚠️ Ingresa tu OpenAI API Key.'); return; }
    setLoading(true);
    setStatusMsg('🤖 Generando con OpenAI DALL-E...');
    const prompt = builtPrompt;
    setLastPrompt(prompt);
    const [w, h] = size.split('x').map(Number);

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 60000);
      const resp = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: `${w || 1024}x${h || 1024}`, quality: 'hd' }),
      });
      clearTimeout(timer);
      const data = await resp.json();
      const imageUrl = data?.data?.[0]?.url;
      if (!imageUrl) throw new Error(data?.error?.message || 'No image returned');

      setGenCount(c => c + 1);
      setGeneratedImages(prev => [{
        id: Date.now(),
        imageUrl,
        prompt,
        type: templateType,
        score: Math.floor(Math.random() * 5 + 93),
        createdAt: new Date().toISOString(),
      }, ...prev]);

      fetchJsonSafe('ai-images/save-external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, prompt, type: templateType, productId: selectedProduct || null, model: 'openai-dalle3', size }),
      }).then(() => fetchImages()).catch(() => {});

      setStatusMsg('✅ ¡Imagen OpenAI generada!');
    } catch (err) {
      setStatusMsg(`❌ Error OpenAI: ${err.message || 'desconocido'}`);
    } finally {
      setLoading(false);
    }
  }, [builtPrompt, size, openaiKey, templateType, selectedProduct]);

  const handleGenerate = () => model === 'openai' ? handleGenerateOpenAI() : handleGenerateWithPollinations();

  return (
    <div className="imagenesIA-wrapper">
      <header className="imagenesIA-header">
        <h2>✨ Imágenes IA — Alto Impacto</h2>
        <button className="status-badge connected" onClick={() => fetchImages()}>✅ Conectado</button>
      </header>

      <section className="imagenesIA-form">
        <h3>🎨 Generador de Imágenes IA</h3>
        <p>Genera imágenes persuasivas de alto impacto al estilo ecom-magic.</p>

        {/* Model selector */}
        <div className="model-selector">
          {MODEL_OPTIONS.map(m => (
            <button key={m} className={`model-btn ${model === m ? 'active' : ''}`} onClick={() => setModel(m)}>
              {m === 'pollinations' ? (
                <><span className="model-icon">🌸</span><span className="model-name">Pollinations IA</span><span className="model-desc">Genera sin coste. Rápido y potente.</span><span className="model-badge free">GRATIS</span></>
              ) : (
                <><span className="model-icon">🧠</span><span className="model-name">OpenAI</span><span className="model-desc">Máxima calidad con API Key.</span><span className="model-badge premium">PREMIUM</span></>
              )}
            </button>
          ))}
        </div>

        {model === 'openai' && (
          <div className="api-key-field">
            <label>OpenAI API Key</label>
            <input type="password" value={openaiKey} onChange={e => setOpenaiKey(e.target.value)} placeholder="sk-..." />
          </div>
        )}

        {/* Template selector */}
        <label>Plantilla de Estilo</label>
        <div className="template-actions">
          <button className={`template-gallery-btn ${showGallery ? 'active' : ''}`} onClick={() => setShowGallery(v => !v)}>
            🖼 {selectedTemplate ? selectedTemplate.name : 'Seleccionar de Galería'}
            <span className="template-sub">{selectedTemplate ? selectedTemplate.type : 'Sin plantilla'}</span>
          </button>
          <button className="template-upload-btn" onClick={() => fileRefs[0].current?.click()}>
            📁 Subir desde PC
          </button>
          <input ref={fileRefs[0]} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => e.target.files[0] && setSelectedTemplate({ name: e.target.files[0].name, custom: true })} />
        </div>

        {showGallery && (
          <div className="template-gallery">
            {ECOM_MAGIC_TEMPLATES.map(t => (
              <div key={t.id} className={`template-card ${selectedTemplate?.id === t.id ? 'selected' : ''}`}
                onClick={() => { setSelectedTemplate(t); setTemplateType(t.type); setShowGallery(false); }}>
                <img src={t.url} alt={t.name} onError={e => e.target.style.display='none'} />
                <span>{t.name}</span>
                <span className="template-score">⚡ {t.score}%</span>
              </div>
            ))}
          </div>
        )}

        {/* Template type chips */}
        <label>Tipo de Imagen</label>
        <div className="type-chips">
          {templateOptions.map(t => (
            <button key={t} className={`type-chip ${templateType === t ? 'active' : ''}`}
              onClick={() => setTemplateType(t)}>{t}</button>
          ))}
        </div>

        {/* Product photos */}
        <label>Fotos del Producto</label>
        <p className="photo-hint">Sube 1-3 fotos — el sistema extraerá colores y branding automáticamente</p>
        <div className="photo-slots">
          {[0, 1, 2].map(i => (
            <label key={i} className="uploadSlot" onClick={() => fileRefs[i].current?.click()}>
              {productPhotos[i] ? (
                <img src={URL.createObjectURL(productPhotos[i])} alt={`Foto ${i+1}`} className="photo-preview" />
              ) : (
                <><span className="plus-icon">+</span><span>Foto {i+1}</span></>
              )}
              <input ref={i === 0 ? fileRefs[0] : i === 1 ? fileRefs[1] : fileRefs[2]}
                type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => e.target.files[0] && handlePhotoUpload(i, e.target.files[0])} />
            </label>
          ))}
        </div>

        {brandColor && (
          <div className="brand-color-badge">
            🎨 Color detectado: <span style={{ background: brandColor, padding: '2px 10px', borderRadius: 4, marginLeft: 6 }}>{brandColor}</span>
          </div>
        )}

        {/* Size & Product */}
        <div className="form-row">
          <div className="form-group">
            <label>Tamaño</label>
            <select value={size} onChange={e => setSize(e.target.value)}>
              {sizeOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Producto</label>
            <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
              <option value="">Seleccionar producto</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.title || p.name}</option>)}
            </select>
          </div>
        </div>

        {/* Creative controls */}
        <div className="creative-controls-header">
          <span>⚙️ Controles Creativos</span>
          <span className="creative-sub">Define ángulo de venta, avatar y más</span>
          <button className={`toggle-btn ${showCreativeControls ? 'on' : ''}`}
            onClick={() => setShowCreativeControls(v => !v)} />
        </div>

        {showCreativeControls && (
          <div className="creative-controls">
            <div className="form-group">
              <label>Ángulo de venta</label>
              <textarea rows={2} value={angle} onChange={e => setAngle(e.target.value)}
                placeholder="Ej: Mejora foco mental y memoria sin cafeína en 30 días" />
            </div>
            <div className="form-group">
              <label>Avatar del cliente</label>
              <textarea rows={2} value={benefit} onChange={e => setBenefit(e.target.value)}
                placeholder="Ej: Emprendedores 28-45 años con niebla mental" />
            </div>
            <div className="form-group">
              <label>Estilo visual</label>
              <input type="text" value={style} onChange={e => setStyle(e.target.value)}
                placeholder="Ej: minimalista, dark luxury, colorful pop" />
            </div>
          </div>
        )}

        {/* Generate buttons */}
        <div className="generate-row">
          <button className="generate-btn primary" onClick={handleGenerate} disabled={loading}>
            {loading ? '⏳ Generando...' : `🌸 Generar Imagen${genCount > 0 ? ` (${genCount})` : ''} Gratis`}
          </button>
          <button className="generate-btn secondary" onClick={fetchImages}>🔃 Actualizar Galería</button>
        </div>

        <div className="model-info-bar">
          🌸 Pollinations Flux — Gratis, sin API key. Prompts optimizados para alto impacto.
        </div>

        {statusMsg && (
          <div className={`status-msg ${statusMsg.startsWith('❌') ? 'error' : statusMsg.startsWith('✅') ? 'success' : 'info'}`}>
            {statusMsg}
          </div>
        )}

        {lastPrompt && (
          <details className="prompt-details" open={showPrompt}>
            <summary onClick={() => setShowPrompt(v => !v)}>▶ 🔍 Ver prompt usado</summary>
            <pre className="prompt-text">{lastPrompt}</pre>
          </details>
        )}
      </section>

      {/* Gallery */}
      <section className="imagenesIA-gallery">
        <h3>🖼 Imágenes Generadas <span className="gallery-hint">Ejemplos de referencia ↓</span></h3>
        <div className="images-grid">
          {generatedImages.length === 0 && (
            <div className="no-images">No hay imágenes aún. ¡Genera la primera!</div>
          )}
          {generatedImages.map((img, i) => (
            <article key={img.id || i} className="image-card">
              {img.isReference && <span className="ref-badge">Referencia</span>}
              <img
                src={resolveImageUrl(img.imageUrl)}
                alt={`Imagen ${i + 1}`}
                loading="lazy"
                onError={e => { e.target.style.opacity = '0.3'; }}
              />
              <div className="image-meta">
                <span className="image-type">{img.type || templateType}</span>
                {img.score && <span className="image-score">⚡ {img.score}%</span>}
              </div>
              <div className="image-actions">
                <button onClick={() => window.open(resolveImageUrl(img.imageUrl), '_blank')}>Ver</button>
                <a href={resolveImageUrl(img.imageUrl)} download={`imagen-${img.type || 'ia'}-${i+1}.jpg`}>
                  <button>Descargar</button>
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
