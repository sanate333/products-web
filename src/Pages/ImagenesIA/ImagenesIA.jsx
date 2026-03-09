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
    mood: 'high-energy, explosive, powerful, motivational',
    comp: 'centered product hero shot, dynamic diagonal composition',
  },
  Oferta: {
    bg: 'bold vibrant gradient background, deep red to golden yellow',
    light: 'bright commercial studio lighting, warm golden tones',
    mood: 'urgent, exciting, premium value, irresistible',
    comp: 'product centered with dramatic scale, impact composition',
  },
  Beneficios: {
    bg: 'clean gradient from deep green to emerald, nature inspired',
    light: 'soft diffused lighting, natural wellness feel',
    mood: 'fresh, healthy, natural, trustworthy, clean',
    comp: 'product surrounded by natural elements, floating ingredients',
  },
  'Antes/Despues': {
    bg: 'split dramatic composition, dark moody left vs bright energetic right',
    light: 'high contrast dramatic lighting with transformation energy',
    mood: 'transformative, inspiring, before-after contrast, powerful results',
    comp: 'split screen composition, journey visualization',
  },
  Testimonio: {
    bg: 'warm studio background, soft gradient cream to warm white',
    light: 'warm portrait lighting, professional and trustworthy',
    mood: 'authentic, warm, human, real results, testimonial',
    comp: 'lifestyle product placement, natural human context',
  },
  Logistica: {
    bg: 'clean white to light blue gradient, professional and reliable',
    light: 'bright clean studio lighting, corporate professional',
    mood: 'reliable, fast, trustworthy, professional, efficient',
    comp: 'product with logistics elements, clean organized layout',
  },
};

const buildHighImpactPrompt = ({ productName, productDetails, templateType, angle, benefit, style, brandColor }) => {
  const palette = BRAND_PALETTES[templateType] || BRAND_PALETTES.Hero;
  const productDesc = productName || 'supplement product';
  const details = productDetails ? `Product: ${productDetails}.` : '';
  const salesAngle = angle ? `Marketing angle: ${angle}.` : '';
  const avatar = benefit ? `Target customer: ${benefit}.` : '';
  const brandColorHint = brandColor ? `Brand accent color: ${brandColor}.` : '';
  const extraInstructions = style || '';
  return [
    `Ultra-realistic commercial ecommerce product photography of ${productDesc} supplement bottle/container.`,
    `${palette.bg}.`,
    `${palette.light}.`,
    `${palette.mood} aesthetic.`,
    `${palette.comp}.`,
    details, salesAngle, avatar, brandColorHint,
    'Photorealistic 8K quality, professional commercial advertising photography.',
    'Cinematic depth of field, perfect product focus, premium brand aesthetics.',
    'High conversion ecommerce hero image, magazine quality.',
    'Dramatic color grading matching brand identity.',
    extraInstructions ? `Additional: ${extraInstructions}.` : '',
    'CRITICAL: NO text, NO words, NO letters, NO typography, NO captions anywhere in image.',
  ].filter(Boolean).join(' ');
};

const ECOM_MAGIC_TEMPLATES = [
  { name: 'Hero Energético', category: 'Hero', thumb: 'https://ecom-magic.ai/public-banners/landing_78910_1772217004324.png', impactScore: 95 },
  { name: 'Hero Potencia Azul', category: 'Hero', thumb: 'https://ecom-magic.ai/public-banners/landing_70457_1771805762568.png', impactScore: 93 },
  { name: 'Hero Fuerza', category: 'Hero', thumb: 'https://ecom-magic.ai/public-banners/landing_63155_1771376700325.png', impactScore: 91 },
  { name: 'Hero Rendimiento', category: 'Hero', thumb: 'https://ecom-magic.ai/public-banners/landing_32348_1769365698492.png', impactScore: 90 },
  { name: 'Oferta Impacto', category: 'Oferta', thumb: 'https://ecom-magic.ai/public-banners/landing_4027_1766360743874.png', impactScore: 94 },
  { name: 'Oferta Flash', category: 'Oferta', thumb: 'https://ecom-magic.ai/public-banners/landing_3918_1766348761326.png', impactScore: 92 },
  { name: 'Oferta Exclusiva', category: 'Oferta', thumb: 'https://ecom-magic.ai/public-banners/landing_3804_1766311229907.png', impactScore: 89 },
  { name: 'Oferta Limitada', category: 'Oferta', thumb: 'https://ecom-magic.ai/public-banners/landing_78892_1772216487698.png', impactScore: 91 },
  { name: 'Beneficios Natural', category: 'Beneficios', thumb: 'https://ecom-magic.ai/public-banners/landing_70414_1771804525225.png', impactScore: 90 },
  { name: 'Beneficios Muscular', category: 'Beneficios', thumb: 'https://ecom-magic.ai/public-banners/landing_61014_1771275347084.png', impactScore: 88 },
  { name: 'Beneficios Premium', category: 'Beneficios', thumb: 'https://ecom-magic.ai/public-banners/landing_29572_1769149243871.png', impactScore: 87 },
  { name: 'Transformación 30 días', category: 'Antes/Despues', thumb: 'https://ecom-magic.ai/public-banners/landing_4026_1766360606976.png', impactScore: 96 },
  { name: 'Antes/Después Pro', category: 'Antes/Despues', thumb: 'https://ecom-magic.ai/public-banners/landing_3916_1766348661768.png', impactScore: 93 },
  { name: 'Cambio Real', category: 'Antes/Despues', thumb: 'https://ecom-magic.ai/public-banners/landing_3803_1766310453876.png', impactScore: 91 },
  { name: 'Testimonio Real', category: 'Testimonio', thumb: 'https://ecom-magic.ai/public-banners/landing_3789_1766304596726.png', impactScore: 92 },
  { name: 'Testimonio Estrella', category: 'Testimonio', thumb: 'https://ecom-magic.ai/public-banners/landing_68439_1771645472746.png', impactScore: 90 },
  { name: 'Testimonio Verificado', category: 'Testimonio', thumb: 'https://ecom-magic.ai/public-banners/landing_3796_1766307371835.png', impactScore: 88 },
  { name: 'Envío Express', category: 'Logistica', thumb: 'https://ecom-magic.ai/public-banners/landing_78889_1772216351316.png', impactScore: 85 },
  { name: 'Entrega Segura', category: 'Logistica', thumb: 'https://ecom-magic.ai/public-banners/landing_29572_1769149243871.png', impactScore: 83 },
];

const ensurePngFile = async (file) => {
  if (!file) return file;
  if (String(file.type || '').toLowerCase() === 'image/png') return file;
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('No canvas');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) return reject(new Error('Blob fail'));
          const cleanName = (file.name || 'image').replace(/\.[^.]+$/, '');
          resolve(new File([blob], `${cleanName}.png`, { type: 'image/png' }));
        }, 'image/png');
      } catch (err) { URL.revokeObjectURL(objectUrl); reject(err); }
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Read fail')); };
    img.src = objectUrl;
  });
};

const extractDominantColor = (file) => {
  return new Promise((resolve) => {
    if (!file) return resolve(null);
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 50; canvas.height = 50;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 50, 50);
      URL.revokeObjectURL(url);
      const imageData = ctx.getImageData(0, 0, 50, 50).data;
      let r=0, g=0, b=0, count=0;
      for (let i=0; i<imageData.length; i+=16) {
        r+=imageData[i]; g+=imageData[i+1]; b+=imageData[i+2]; count++;
      }
      r=Math.round(r/count); g=Math.round(g/count); b=Math.round(b/count);
      resolve(`rgb(${r},${g},${b})`);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

const MODEL_OPTIONS = [
  { id: 'pollinations', label: 'Pollinations IA', badge: 'GRATIS', description: 'Genera sin coste. Rápido y potente.', icon: '🌸' },
  { id: 'openai', label: 'OpenAI', badge: 'PREMIUM', description: 'Máxima calidad con API Key.', icon: '🧠' },
];

const templateOptions = ['Hero', 'Oferta', 'Beneficios', 'Antes/Despues', 'Testimonio', 'Logistica'];

const sizeOptions = [
  { value: '1024x1024', label: 'Instagram Cuadrado (1024x1024)' },
  { value: '1024x1792', label: 'Instagram Stories (1024x1792)' },
  { value: '1792x1024', label: 'Horizontal Facebook (1792x1024)' },
  { value: '512x512', label: 'Miniatura (512x512)' },
];

export default function ImagenesIA() {
  const templateFileInputRef = useRef(null);
  const [form, setForm] = useState({
    userId: 'admin', productId: '', templateType: 'Hero',
    size: '1024x1024', angle: '', benefit: '', style: '',
    productDetails: '', language: 'es',
  });
  const [selectedModel, setSelectedModel] = useState('pollinations');
  const [files, setFiles] = useState([]);
  const [actionError, setActionError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [serverStatus, setServerStatus] = useState('unknown');
  const [serverMessage, setServerMessage] = useState('');
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateTab, setTemplateTab] = useState('Hero');
  const [uploadedTemplates, setUploadedTemplates] = useState([]);
  const [products, setProducts] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [pendingTemplateId, setPendingTemplateId] = useState('');
  const [extractedColor, setExtractedColor] = useState(null);
  const [generationCount, setGenerationCount] = useState(0);
  const [lastPrompt, setLastPrompt] = useState('');

  const allTemplates = useMemo(() => [...uploadedTemplates, ...ECOM_MAGIC_TEMPLATES], [uploadedTemplates]);
  const selectedTemplate = useMemo(() => allTemplates.find((t) => t.id === selectedTemplateId) || null, [allTemplates, selectedTemplateId]);
  const selectedProductName = useMemo(() => {
    const sel = products.find((p) => String(p.idProducto) === String(form.productId));
    return (sel?.titulo || '').trim() || 'Suplemento Deportivo';
  }, [products, form.productId]);

  const handleChange = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const fetchImages = useCallback(async () => {
    try {
      const userId = form.userId || 'admin';
      const productId = form.productId || 'general';
      const result = await fetchJsonSafe(`ai-images?userId=${encodeURIComponent(userId)}&productId=${encodeURIComponent(productId)}`, { method: 'GET' });
      if (result.ok && result.data?.ok) {
        const sorted = (result.data.images || [])
          .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
          .map((img) => ({
            ...img,
            files: (img.files || []).map((f) => ({ ...f, url: resolveImageUrl(f.url) })),
          }));
        setImages(sorted);
      }
    } catch (err) { console.error('fetchImages', err); }
  }, [form.userId, form.productId]);

  const fetchProducts = useCallback(async () => {
    try {
      const resp = await fetch(`${baseURL}/productosGet.php`);
      const data = await resp.json();
      setProducts(data.productos || []);
    } catch (err) { console.error('fetchProducts', err); }
  }, []);

  const checkServer = useCallback(async () => {
    setServerStatus('checking');
    setServerMessage('Verificando...');
    try {
      const result = await fetchJsonSafe('health', { method: 'GET' });
      if (result.ok && result.data?.ok) {
        const hasKey = Boolean(result.data?.has_key ?? result.data?.hasKey ?? result.data?.api_key_loaded);
        setServerStatus('ok');
        setServerMessage(`Conectado ✅ | Key: ${hasKey ? 'Detectada' : 'No detectada'}`);
        return true;
      }
      setServerStatus('error');
      setServerMessage('Sin conexión al backend IA.');
      return false;
    } catch (err) {
      setServerStatus('error');
      setServerMessage('Error de red al verificar servidor.');
      return false;
    }
  }, []);

  useEffect(() => { fetchImages(); }, [fetchImages]);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { checkServer(); }, [checkServer]);

  useEffect(() => {
    const firstFile = files.find(Boolean);
    if (firstFile) {
      extractDominantColor(firstFile).then(setExtractedColor);
    } else {
      setExtractedColor(null);
    }
  }, [files]);

  const handleGenerateWithPollinations = async () => {
    setLoading(true);
    setActionError('');
    setImageUrl('');
    setStatusMessage('🌸 Generando imagen de alto impacto...');
    try {
      const [w, h] = (form.size || '1024x1024').split('x').map(Number);
      const prompt = buildHighImpactPrompt({
        productName: selectedProductName,
        productDetails: form.productDetails,
        templateType: form.templateType || 'Hero',
        angle: form.angle,
        benefit: form.benefit,
        style: form.style,
        brandColor: extractedColor,
      });
      setLastPrompt(prompt);
      const seed = Math.floor(Math.random() * 999999);
      const encodedPrompt = encodeURIComponent(prompt);
      const tryLoadImage = (model, timeoutMs = 90000) => {
        const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${w || 1024}&height=${h || 1024}&seed=${seed}&nologo=true&model=${model}`;
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => { img.src = ''; reject(new Error('timeout')); }, timeoutMs);
          const img = new window.Image();
          img.onload = () => { clearTimeout(timer); resolve(url); };
          img.onerror = () => { clearTimeout(timer); reject(new Error('load_error')); };
          img.src = url;
        });
      };

      let finalUrl;
      let usedModel = 'flux';
      try {
        setStatusMessage('🎨 Generando con Flux... (hasta 90s)');
        finalUrl = await tryLoadImage('flux', 90000);
      } catch (fluxErr) {
        setStatusMessage('⚡ Flux no respondió, reintentando con Turbo...');
        usedModel = 'turbo';
        finalUrl = await tryLoadImage('turbo', 90000);
      }

      setImageUrl(finalUrl);
      setGenerationCount((c) => c + 1);
      try {
        await fetchJsonSafe('ai-images/save-external', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: form.userId || 'admin',
            productId: form.productId || 'general',
            productName: selectedProductName,
            template: form.templateType || 'Hero',
            url: finalUrl,
            model: `pollinations-${usedModel}`,
            prompt_used: prompt,
          }),
        });
        await fetchImages();
      } catch (_) {}
      setStatusMessage(`✅ ¡Imagen generada con ${usedModel === 'flux' ? 'Flux' : 'Turbo'}! (${generationCount + 1} generadas)`);
    } catch (err) {
      setActionError('Error al generar. Verifica conexión e intenta de nuevo.');
      setStatusMessage('');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateOpenAI = async () => {
    setLoading(true);
    setActionError('');
    setImageUrl('');
    setStatusMessage('🧠 Generando con OpenAI... (hasta 60s)');
    const hasFiles = files.filter(Boolean).length > 0;
    if (!hasFiles) {
      setActionError('Sube al menos 1 foto del producto para usar OpenAI.');
      setLoading(false);
      return;
    }
    const connected = await checkServer();
    if (!connected) {
      setActionError('Backend IA sin conexión. Usa Pollinations (gratis) mientras tanto.');
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const formData = new FormData();
      const imageFile = await ensurePngFile(files.find(Boolean));
      formData.append('image', imageFile);
      formData.append('productName', selectedProductName);
      formData.append('userId', form.userId || 'admin');
      formData.append('productId', form.productId || 'general');
      formData.append('template', form.templateType || 'Hero');
      formData.append('size', form.size || '1024x1024');
      formData.append('language', form.language || 'es');
      formData.append('productDetails', form.productDetails || '');
      formData.append('angle', form.angle || '');
      formData.append('avatar', form.benefit || '');
      formData.append('extraInstructions', form.style || '');
      const result = await fetchJsonSafe('images/generate', { method: 'POST', signal: controller.signal, body: formData });
      if (result.ok && result.data?.ok) {
        setImageUrl(resolveImageUrl(result.data.image_url || ''));
        await fetchImages();
        setGenerationCount((c) => c + 1);
        setStatusMessage('✅ Imagen generada con OpenAI.');
      } else {
        setActionError(result.data?.error || result.text || 'Error desconocido');
      }
    } catch (err) {
      setActionError(err?.name === 'AbortError' ? 'Tiempo agotado (60s).' : err.message);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    if (selectedModel === 'pollinations') return handleGenerateWithPollinations();
    return handleGenerateOpenAI();
  };

  const handlePickTemplate = (tpl) => {
    setSelectedTemplateId(tpl.id);
    setPendingTemplateId('');
    setForm((p) => ({ ...p, templateType: tpl.category || p.templateType }));
    setTemplateModalOpen(false);
    setStatusMessage(`✅ Plantilla "${tpl.name}" seleccionada.`);
  };

  const handleUploadTemplateFromPc = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const id = `custom-${Date.now()}`;
    const url = URL.createObjectURL(file);
    const custom = { id, name: file.name || 'Personalizada', category: templateTab, url, isCustom: true };
    setUploadedTemplates((p) => [custom, ...p]);
    setSelectedTemplateId(id);
    setForm((p) => ({ ...p, templateType: templateTab }));
    setTemplateModalOpen(false);
    setStatusMessage('✅ Plantilla subida y seleccionada.');
    e.target.value = '';
  };

  const handleDelete = async (id) => {
    try {
      await fetchJsonSafe('ai-images/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: form.userId || 'admin', imageId: id }),
      });
      setImages((p) => p.filter((img) => img.id !== id));
    } catch (err) { console.error('delete', err); }
  };

  const handleRegenerate = () => { setActionError(''); setImageUrl(''); handleGenerate(); };

  const DEMO_IMAGES = useMemo(() => [
    { id: 'd1', isDemo: true, template: 'Hero', files: [{ url: 'https://ecom-magic.ai/public-banners/landing-templates/hero-0476bf69-7ccd-4679-ae5c-6d1c6e0d0e67.png' }], analysis: { high_impact_score: 97 } },
    { id: 'd2', isDemo: true, template: 'Oferta', files: [{ url: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=512&h=512&fit=crop' }], analysis: { high_impact_score: 93 } },
    { id: 'd3', isDemo: true, template: 'Beneficios', files: [{ url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=512&h=512&fit=crop' }], analysis: { high_impact_score: 91 } },
    { id: 'd4', isDemo: true, template: 'Antes/Despues', files: [{ url: 'https://images.unsplash.com/photo-1550345332-09e3ac987658?w=512&h=512&fit=crop' }], analysis: { high_impact_score: 95 } },
  ], []);

  const displayImages = images.length > 0 ? images : DEMO_IMAGES;

  return (
    <div className="imagenesIA">
      <div className="imagenesWrapper darkUi">
        <header className="topBarIa">
          <span>✨ Imágenes IA — Alto Impacto</span>
          <button type="button" className={`serverChip ${serverStatus}`} onClick={checkServer}>
            {serverStatus === 'ok' ? '✅ Conectado' : serverStatus === 'checking' ? '⏳ Verificando' : '❌ Sin conexión'}
          </button>
        </header>

        {serverStatus === 'error' && (
          <div className="offlineFloating">
            <button type="button" className="serverChip error" onClick={checkServer}>
              Sin conexión backend — click para reintentar
            </button>
          </div>
        )}

        <section className="iaCard">
          <div className="iaCardTitle">
            <h3>🎨 Generador de Imágenes IA</h3>
            <p>Genera imágenes persuasivas de alto impacto al estilo ecom-magic.</p>
            {generationCount > 0 && <span className="generationBadge">🔥 {generationCount} imágenes generadas esta sesión</span>}
          </div>

          <div className="modelSelectorRow">
            {MODEL_OPTIONS.map((m) => (
              <button key={m.id} type="button"
                className={`modelCard ${selectedModel === m.id ? 'modelCardActive' : ''}`}
                onClick={() => setSelectedModel(m.id)}>
                <span className="modelIcon">{m.icon}</span>
                <div className="modelInfo">
                  <span className="modelLabel">{m.label}</span>
                  <span className="modelDesc">{m.description}</span>
                </div>
                <span className={`modelBadge ${m.id === 'pollinations' ? 'badgeFree' : 'badgePremium'}`}>{m.badge}</span>
              </button>
            ))}
          </div>

          <div className="fieldRow">
            <label>Plantilla de Estilo</label>
            <div className="templateActions">
              <button type="button" className="templateHeroBtn" onClick={() => setTemplateModalOpen(true)}>
                <span>🖼 Seleccionar de Galería</span>
                <small>{selectedTemplate ? selectedTemplate.name : 'Sin plantilla'}</small>
              </button>
              <button type="button" className="uploadPcBtn" onClick={() => templateFileInputRef.current?.click()}>
                📁 Subir desde PC
              </button>
              <input ref={templateFileInputRef} type="file" accept="image/*" className="hiddenFileInput" onChange={handleUploadTemplateFromPc} />
            </div>
            {selectedTemplate && (
              <div className="selectedTemplatePreview">
                <img src={selectedTemplate.url} alt={selectedTemplate.name} />
                <div><b>Activa:</b> <span>{selectedTemplate.name}</span></div>
              </div>
            )}
          </div>

          <div className="fieldRow">
            <label>Tipo de Imagen</label>
            <div className="templateTypeRow">
              {templateOptions.map((t) => (
                <button key={t} type="button"
                  className={`typeChip ${form.templateType === t ? 'typeChipActive' : ''}`}
                  onClick={() => setForm((p) => ({ ...p, templateType: t }))}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="fieldRow">
            <label>Fotos del Producto</label>
            <small className="helpText">Sube 1-3 fotos — el sistema extraerá colores y branding automáticamente</small>
            {extractedColor && (
              <div className="colorExtracted">
                <span style={{ background: extractedColor, display: 'inline-block', width: 20, height: 20, borderRadius: 4, verticalAlign: 'middle', marginRight: 8 }} />
                <small>Color dominante detectado: <b>{extractedColor}</b> — se aplicará al prompt</small>
              </div>
            )}
            <div className="uploadGrid">
              {['Foto 1', 'Foto 2', 'Foto 3'].map((label, idx) => (
                <label key={label} className="uploadSlot">
                  {files[idx] ? (
                    <>
                      <img src={URL.createObjectURL(files[idx])} alt={label} />
                      <button type="button" className="slotRemove"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); const n=[...files]; n[idx]=null; setFiles(n); }}>
                        ✕
                      </button>
                    </>
                  ) : (
                    <><span className="plusCircle">+</span><small>{label}</small></>
                  )}
                  <input type="file" accept="image/*"
                    onChange={(e) => { const n=[...files]; n[idx]=e.target.files[0]; setFiles(n); }} />
                </label>
              ))}
            </div>
          </div>

          <div className="fieldGridTwo">
            <div className="fieldRow">
              <label>Tamaño</label>
              <select value={form.size} onChange={handleChange('size')}>
                {sizeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="fieldRow">
              <label>Producto</label>
              <select value={form.productId} onChange={(e) => setForm((p) => ({ ...p, productId: e.target.value }))}>
                <option value="">Seleccionar producto</option>
                {products.map((p) => <option key={p.idProducto} value={String(p.idProducto)}>{p.titulo}</option>)}
              </select>
            </div>
          </div>

          <div className="creativeHeader">
            <div>
              <strong>⚙️ Controles Creativos</strong>
              <small>Define ángulo de venta, avatar y más</small>
            </div>
            <button type="button" className={`creativeToggle ${showAdvanced ? 'active' : ''}`}
              onClick={() => setShowAdvanced((p) => !p)} />
          </div>

          {showAdvanced && (
            <div className="advancedStack">
              <div className="fieldRow">
                <label>Detalles del Producto</label>
                <textarea value={form.productDetails} onChange={handleChange('productDetails')}
                  placeholder="Ej: GlycoFuse sabor fresa, 25g carbohidratos, recipiente negro con azul eléctrico, tapa plateada..." />
              </div>
              <div className="fieldRow">
                <label>Ángulo de Venta</label>
                <textarea value={form.angle} onChange={handleChange('angle')}
                  placeholder="Ej: Recuperación post-entrenamiento en 30 minutos, para atletas de alto rendimiento..." />
              </div>
              <div className="fieldRow">
                <label>Avatar (cliente ideal)</label>
                <textarea value={form.benefit} onChange={handleChange('benefit')}
                  placeholder="Ej: Hombres 25-40 años, deportistas, buscan ganar músculo..." />
              </div>
              <div className="fieldRow">
                <label>Instrucciones Adicionales</label>
                <textarea value={form.style} onChange={handleChange('style')}
                  placeholder="Ej: Fondo dramático oscuro, iluminación de estadio, explosión de energía..." />
              </div>
            </div>
          )}

          <div className="actions">
            <button type="button" className="primary" onClick={handleGenerate}
              disabled={loading || (selectedModel === 'openai' && serverStatus !== 'ok')}>
              {loading ? '⏳ Generando...' : selectedModel === 'pollinations' ? '🌸 Generar Imagen Gratis' : '🧠 Generar con OpenAI'}
            </button>
            {imageUrl && (
              <button type="button" className="secondary" onClick={handleRegenerate} disabled={loading}>
                🔄 Regenerar
              </button>
            )}
            <button type="button" className="secondary" onClick={fetchImages}>
              🔃 Actualizar Galería
            </button>
          </div>

          {selectedModel === 'pollinations' && (
            <div className="pollinationsNote">
              <span>🌸</span>
              <span>Pollinations Flux — Gratis, sin API key. Prompts optimizados para alto impacto.</span>
            </div>
          )}

          {actionError && <p className="error">❌ {actionError}</p>}
          {statusMessage && !actionError && <p className="status">{statusMessage}</p>}
          {serverMessage && selectedModel === 'openai' && <p className="serverMessage">{serverMessage}</p>}

          {lastPrompt && (
            <details className="promptDebug">
              <summary>🔍 Ver prompt usado</summary>
              <p>{lastPrompt}</p>
            </details>
          )}
        </section>

        <section className="gallerySection generatedEndSection">
          <div className="galleryHeader">
            <h2>🖼 Imágenes Generadas</h2>
            <span className="gallerySubtitle">{images.length === 0 ? 'Ejemplos de referencia ↓' : `${images.length} imágenes guardadas`}</span>
          </div>

          {imageUrl && (
            <div className="latestResult">
              <img src={imageUrl} alt="Última generada" />
              <div className="latestActions">
                <span>✨ Última generada</span>
                <button type="button" onClick={() => window.open(imageUrl, '_blank')}>🔍 Ver grande</button>
                <button type="button" onClick={() => { const a=document.createElement('a'); a.href=imageUrl; a.download='imagen-ia.png'; a.click(); }}>⬇ Descargar</button>
              </div>
            </div>
          )}

          <div className="galleryGrid">
            {displayImages.map((img, idx) => (
              <article key={img.id} className={img.isDemo ? 'demoCard' : ''}>
                {!img.isDemo && (
                  <button type="button" className="quickRemoveBtn" onClick={() => handleDelete(img.id)}>✕</button>
                )}
                {img.isDemo && <span className="demoBadge">Referencia</span>}
                <img src={img.files?.[0]?.url} alt={`Imagen ${idx + 1}`} loading="lazy" />
                <div className="galleryCardFooter">
                  <p>{img.template || `Imagen ${idx + 1}`}</p>
                  {img.analysis?.high_impact_score && (
                    <span className="impactScore">⚡ {img.analysis.high_impact_score}%</span>
                  )}
                </div>
                <div className="galleryActions">
                  <button type="button" onClick={() => window.open(img.files?.[0]?.url, '_blank')}>Ver</button>
                  <button type="button" onClick={() => {
                    const a=document.createElement('a'); a.href=img.files?.[0]?.url;
                    a.download=`imagen-${idx+1}.png`; a.click();
                  }}>Descargar</button>
                  {!img.isDemo && (
                    <button type="button" className="danger" onClick={() => handleDelete(img.id)}>Eliminar</button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        {templateModalOpen && (
          <div className="templateModalOverlay" onClick={() => setTemplateModalOpen(false)}>
            <div className="templateModal" onClick={(e) => e.stopPropagation()}>
              <div className="templateModalHeader">
                <h3>🖼 Galería de Plantillas</h3>
                <button type="button" onClick={() => setTemplateModalOpen(false)}>✕</button>
              </div>
              <div className="templateTabs">
                {templateOptions.map((opt) => (
                  <button key={opt} type="button"
                    className={templateTab === opt ? 'active' : ''}
                    onClick={() => setTemplateTab(opt)}>{opt}</button>
                ))}
              </div>
              <div className="templateGrid compact">
                {allTemplates.filter((t) => t.category === templateTab).map((tpl) => (
                  <button key={tpl.id} type="button"
                    className={pendingTemplateId === tpl.id || selectedTemplateId === tpl.id ? 'templateSelected' : ''}
                    onClick={() => setPendingTemplateId(tpl.id)}>
                    <img src={tpl.url} alt={tpl.name} />
                    <span>{tpl.name}</span>
                  </button>
                ))}
                {!allTemplates.filter((t) => t.category === templateTab).length && (
                  <p className="empty">Sin plantillas en esta categoría.</p>
                )}
              </div>
              <div className="templateModalFooter">
                <button type="button" className="secondary" onClick={() => setTemplateModalOpen(false)}>Cancelar</button>
                <button type="button" className="primary"
                  disabled={!pendingTemplateId}
                  onClick={() => {
                    const chosen = allTemplates.find((t) => t.id === pendingTemplateId);
                    if (chosen) handlePickTemplate(chosen);
                  }}>
                  ✅ Seleccionar Plantilla
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
