import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './ImagenesIA.css';
import baseURL from '../../Components/url';

const IA_API_BASE = (process.env.REACT_APP_IA_API_URL || '').trim();
const DEFAULT_IA_API_BASE = 'https://products-web-j7ji.onrender.com';
const normalizeApiPrefix = (raw) => {
  const value = String(raw || '').trim().replace(/\/+$/, '');
  if (!value) return '';
  return /\/api$/i.test(value) ? value : `${value}/api`;
};
const PINNED_IA_API_PREFIX = normalizeApiPrefix(IA_API_BASE || DEFAULT_IA_API_BASE);

const buildApiUrl = (prefix, path) => {
  const cleanPrefix = prefix ? prefix.replace(/\/+$/, '') : '';
  const cleanPath = path.replace(/^\/+/, '');
  return cleanPrefix ? `${cleanPrefix}/${cleanPath}` : `/${cleanPath}`;
};

const fetchJsonWithFallback = async (path, options = {}) => {
  const {
    attemptTimeoutMs = 0,
    ...requestOptions
  } = options || {};
  const rawCandidates = [PINNED_IA_API_PREFIX];
  const candidatePrefixes = rawCandidates
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index);
  const attempts = [];

  const request = async (prefix) => {
    const url = buildApiUrl(prefix, path);
    let timeoutHandle = null;
    let composedSignal = requestOptions.signal;
    let localController = null;
    if (attemptTimeoutMs > 0) {
      localController = new AbortController();
      composedSignal = localController.signal;
      timeoutHandle = setTimeout(() => localController.abort(), attemptTimeoutMs);
    }
    try {
      const response = await fetch(url, {
        ...requestOptions,
        signal: composedSignal,
      });
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return {
          ok: true,
          data: await response.json(),
          url,
          status: response.status,
        };
      }
      const text = await response.text();
      const trimmed = String(text || '').trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          return {
            ok: true,
            data: JSON.parse(trimmed),
            url,
            status: response.status,
          };
        } catch (error) {
          // sigue flujo de fallo
        }
      }
      const textLower = trimmed.toLowerCase();
      const looksHtml = textLower.includes('<!doctype') || textLower.includes('<html');
      return {
        ok: false,
        text,
        url,
        status: response.status,
        errorMessage: looksHtml ? 'html_response' : 'non_json_response',
      };
    } catch (error) {
      const isAbort = error?.name === 'AbortError';
      return {
        ok: false,
        url,
        status: 0,
        text: isAbort ? 'timeout' : (error?.message || 'network_error'),
        errorMessage: isAbort ? 'timeout' : (error?.message || 'network_error'),
      };
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  };

  let last = null;
  for (const prefix of candidatePrefixes) {
    // eslint-disable-next-line no-await-in-loop
    const result = await request(prefix);
    attempts.push({
      prefix,
      url: result.url,
      status: result.status || 0,
      ok: Boolean(result.ok),
      error: result.errorMessage || '',
    });
    if (result.ok) {
      return { ...result, attempts };
    }
    last = result;
    const text = String(result.text || '').toLowerCase();
    const looksHtml = text.includes('<!doctype') || text.includes('<html');
    if (!looksHtml && result.status && result.status >= 400 && result.status < 500) {
      break;
    }
  }
  return {
    ...(last || { ok: false, text: 'No response', url: buildApiUrl('/api', path), status: 0 }),
    attempts,
  };
};
const TEMPLATE_MANIFEST = 'https://raw.githubusercontent.com/sanate333/products-web/main/public/ai-templates/manifest.json';

// Built-in templates with Unsplash images (reliable CDN)
const BUILTIN_TEMPLATES = [
  { id: "hero_1", name: "Hero Energetico", category: "Hero", url: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&h=600&fit=crop" },
  { id: "hero_2", name: "Hero Recuperacion", category: "Hero", url: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=600&fit=crop" },
  { id: "hero_3", name: "Hero Rendimiento", category: "Hero", url: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&h=600&fit=crop" },
  { id: "hero_4", name: "Hero Potencia", category: "Hero", url: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&h=600&fit=crop" },
  { id: "hero_5", name: "Hero Fuerza", category: "Hero", url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=600&fit=crop" },
  { id: "hero_6", name: "Hero Muscular", category: "Hero", url: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=600&h=600&fit=crop" },
  { id: "oferta_1", name: "Oferta Exclusiva", category: "Oferta", url: "https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=600&h=600&fit=crop" },
  { id: "oferta_2", name: "Oferta Deportista", category: "Oferta", url: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600&h=600&fit=crop" },
  { id: "oferta_3", name: "Oferta Flash", category: "Oferta", url: "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=600&h=600&fit=crop" },
  { id: "oferta_4", name: "Oferta Recuperacion", category: "Oferta", url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=600&fit=crop" },
  { id: "beneficios_1", name: "Beneficios Energia", category: "Beneficios", url: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&h=600&fit=crop" },
  { id: "beneficios_2", name: "Beneficios Natural", category: "Beneficios", url: "https://images.unsplash.com/photo-1505576399279-0d754b4a87de?w=600&h=600&fit=crop" },
  { id: "beneficios_3", name: "Beneficios Muscular", category: "Beneficios", url: "https://images.unsplash.com/photo-1532384748853-8f54a8f476e2?w=600&h=600&fit=crop" },
  { id: "antes_despues_1", name: "Transformacion Fitness", category: "Antes/Despues", url: "https://images.unsplash.com/photo-1550345332-09e3ac987658?w=600&h=600&fit=crop" },
  { id: "antes_despues_2", name: "Transformacion Energia", category: "Antes/Despues", url: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&h=600&fit=crop" },
  { id: "antes_despues_3", name: "Resultados 30 Dias", category: "Antes/Despues", url: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&h=600&fit=crop" },
  { id: "testimonio_1", name: "Testimonio Cliente", category: "Testimonio", url: "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=600&h=600&fit=crop" },
  { id: "testimonio_2", name: "Testimonio Atleta", category: "Testimonio", url: "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=600&h=600&fit=crop" },
  { id: "logistica_1", name: "Envio Gratis", category: "Logistica", url: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=600&h=600&fit=crop" },
  { id: "logistica_2", name: "Garantia Satisfaccion", category: "Logistica", url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&h=600&fit=crop" },
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
        if (!ctx) throw new Error('No se pudo crear canvas 2D');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) return reject(new Error('No se pudo convertir imagen a PNG'));
          const cleanName = (file.name || 'image').replace(/\.[^.]+$/, '');
          resolve(new File([blob], `${cleanName}.png`, { type: 'image/png' }));
        }, 'image/png');
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo leer la imagen'));
    };
    img.src = objectUrl;
  });
};

export default function ImagenesIA() {
  const templateFileInputRef = useRef(null);
  const [form, setForm] = useState({
    userId: 'admin',
    productId: '',
    country: '',
    templateType: 'Hero',
    size: '1024x1024',
    angle: '',
    benefit: '',
    style: '',
    productDetails: '',
    language: 'es',
  });
  const [selectedModel, setSelectedModel] = useState('pollinations');
  const [files, setFiles] = useState([]);
  const [actionError, setActionError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [serverMessage, setServerMessage] = useState('');
  const [serverStatus, setServerStatus] = useState('unknown');
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateTab, setTemplateTab] = useState('Hero');
  const [templates, setTemplates] = useState([]);
  const [uploadedTemplates, setUploadedTemplates] = useState([]);
  const [products, setProducts] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [pendingTemplateId, setPendingTemplateId] = useState('');
  const [connectionPanel, setConnectionPanel] = useState({
    attempts: [],
    activeUrl: '',
    health: null,
    checkedAt: '',
  });
  const [connectionErrorDetail, setConnectionErrorDetail] = useState('');

  // Imágenes demo de alto impacto para mostrar en la galería
  const demoImages = useMemo(() => [
    {
      id: 'demo_1',
      isDemo: true,
      template: 'Hero',
      files: [{ url: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=512&h=512&fit=crop' }],
      analysis: { high_impact_score: 94, hero_style_score: 92 },
    },
    {
      id: 'demo_2',
      isDemo: true,
      template: 'Oferta',
      files: [{ url: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=512&h=512&fit=crop' }],
      analysis: { high_impact_score: 91, hero_style_score: 88 },
    },
    {
      id: 'demo_3',
      isDemo: true,
      template: 'Beneficios',
      files: [{ url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=512&h=512&fit=crop' }],
      analysis: { high_impact_score: 89, hero_style_score: 87 },
    },
    {
      id: 'demo_4',
      isDemo: true,
      template: 'Antes/Despues',
      files: [{ url: 'https://images.unsplash.com/photo-1550345332-09e3ac987658?w=512&h=512&fit=crop' }],
      analysis: { high_impact_score: 93, hero_style_score: 90 },
    },
  ], []);

  const templateOptions = ['Hero', 'Oferta', 'Beneficios', 'Antes/Despues', 'Testimonio', 'Logistica'];
  const sizeOptions = [
    { value: '1024x1024', label: 'Instagram Cuadrado (1024x1024)' },
    { value: '1024x1792', label: 'Instagram Stories (1024x1792)' },
    { value: '1792x1024', label: 'Horizontal (1792x1024)' },
    { value: '512x512', label: 'Cuadrado Chico (512x512)' },
  ];

  const MODEL_OPTIONS = [
    {
      id: 'pollinations',
      label: 'Pollinations IA',
      badge: 'GRATIS',
      description: 'Genera sin coste. Ideal para probar.',
      icon: '🌸',
    },
    {
      id: 'openai',
      label: 'OpenAI',
      badge: 'PREMIUM',
      description: 'Alta calidad con tu API Key.',
      icon: '🧠',
    },
  ];
  const allTemplates = useMemo(() => [...uploadedTemplates, ...templates], [uploadedTemplates, templates]);
  const selectedTemplate = useMemo(
    () => allTemplates.find((tpl) => tpl.id === selectedTemplateId) || null,
    [allTemplates, selectedTemplateId],
  );
  const selectedProductName = useMemo(() => {
    const selected = products.find((item) => String(item.idProducto) === String(form.productId));
    return (selected?.titulo || '').trim() || 'Producto';
  }, [products, form.productId]);

  const updateConnectionPanel = useCallback((result, nextHealth = null) => {
    setConnectionPanel((prev) => ({
      ...prev,
      attempts: result?.attempts || prev.attempts || [],
      activeUrl: result?.url || prev.activeUrl || '',
      health: nextHealth !== null ? nextHealth : prev.health,
      checkedAt: new Date().toLocaleTimeString('es-CO'),
    }));
  }, []);

  const resolveTemplateUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
      return url;
    }
    if (typeof window === 'undefined') {
      return `/${url}`;
    }
    return `${window.location.origin}/${url.replace(/^\//, '')}`;
  };

  const handleChange = (key) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const fetchImages = useCallback(async () => {
    try {
      const userId = form.userId || 'admin';
      const productId = form.productId || 'general';
      const path = `ai-images?userId=${encodeURIComponent(userId)}&productId=${encodeURIComponent(productId)}`;
      const result = await fetchJsonWithFallback(path, { method: 'GET' });
      if (result.ok && result.data?.ok) {
        const sorted = (result.data.images || []).sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
        setImages(sorted);
      }
    } catch (error) {
      console.error('fetch images', error);
    }
  }, [form.userId, form.productId]);

  const checkServer = useCallback(async () => {
    setServerStatus('checking');
    setServerMessage('Verificando conexion...');
    setConnectionErrorDetail('');
    try {
      const result = await fetchJsonWithFallback('health', { method: 'GET', attemptTimeoutMs: 15000 });
      updateConnectionPanel(result, result.ok ? (result.data || null) : null);
      if (result.ok && result.data?.ok) {
        const hasKey = Boolean(
          result.data?.has_key
          ?? result.data?.hasKey
          ?? result.data?.api_key_loaded
          ?? result.data?.key_loaded,
        );
        const imageModel = result.data?.model || 'n/a';
        const visionModel = result.data?.vision_model || 'n/a';
        if (!hasKey && String(result.data?.mock || '').toLowerCase() !== 'true') {
          setServerStatus('error');
          setServerMessage(`Servidor responde pero falta OPENAI_API_KEY en ${result.url}.`);
          setConnectionErrorDetail('Falta la variable OPENAI_API_KEY o no se esta leyendo en el servidor.');
          return false;
        }
        setServerStatus('ok');
        setServerMessage(`Conectado (${result.url}) | img:${imageModel} | vision:${visionModel}`);
        return true;
      }
      if (!result.ok) {
        const status = result.status ? ` (${result.status})` : '';
        setServerMessage(`Health no disponible${status}. Se intentara generar igualmente.`);
        const attemptError = result.errorMessage || result.text || 'sin detalle';
        const humanError = attemptError === 'html_response'
          ? 'La URL responde HTML (frontend), no JSON del backend IA.'
          : attemptError;
        setConnectionErrorDetail(`Health fallo en ${result.url || 'desconocido'}${status}. Detalle: ${humanError}`);
      }
    } catch (error) {
      setServerMessage('No se pudo validar health. Se intentara generar igualmente.');
      setConnectionErrorDetail(error?.message || 'Error de red al validar health.');
    }
    setServerStatus('error');
    return false;
  }, [updateConnectionPanel]);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch(`${baseURL}/productosGet.php`, { method: 'GET' });
      const data = await response.json();
      setProducts(data.productos || []);
    } catch (error) {
      console.error('fetch products', error);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch(TEMPLATE_MANIFEST, { cache: 'no-store' });
        const data = await response.json();
        const remote = Array.isArray(data.templates) ? data.templates : [];
        // Merge: remote templates + built-in (avoid duplicates by id)
        const remoteIds = new Set(remote.map((t) => t.id));
        const merged = [...remote, ...BUILTIN_TEMPLATES.filter((t) => !remoteIds.has(t.id))];
        setTemplates(merged);
      } catch (error) {
        // Fallback to built-in templates
        setTemplates(BUILTIN_TEMPLATES);
      }
    };
    fetchTemplates();
  }, []);

  useEffect(() => {
    checkServer();
  }, [checkServer]);

  useEffect(() => () => {
    uploadedTemplates.forEach((tpl) => {
      if (tpl?.isCustom && String(tpl.url || '').startsWith('blob:')) {
        URL.revokeObjectURL(tpl.url);
      }
    });
  }, [uploadedTemplates]);

  const handlePickTemplate = (template) => {
    const templatePrompt = [
      `Replica el estilo visual de la plantilla seleccionada (${template?.name || template?.id || 'Hero'}).`,
      'Manten composicion premium de e-commerce, alto contraste y enfoque al producto.',
      'No incluyas texto en la imagen final.',
    ].join(' ');
    setForm((prev) => ({ ...prev, templateType: template.category || prev.templateType }));
    setForm((prev) => ({ ...prev, style: templatePrompt }));
    const finalId = template.id || '';
    setSelectedTemplateId(finalId);
    setPendingTemplateId('');
    try {
      localStorage.setItem('ia_last_template_config', JSON.stringify({
        templateId: template.id || '',
        templateName: template.name || '',
        templateCategory: template.category || '',
        templateUrl: template.url || '',
        savedAt: Date.now(),
      }));
    } catch (error) {
      // ignore storage failure
    }
    setTemplateModalOpen(false);
    setStatusMessage(`Plantilla ${template?.name || ''} seleccionada y configurada.`);
  };

  const handleUploadTemplateFromPc = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const customId = `custom-${Date.now()}`;
    const category = templateTab || 'Hero';
    const url = URL.createObjectURL(file);
    const custom = {
      id: customId,
      name: file.name || 'Plantilla personalizada',
      category,
      url,
      isCustom: true,
    };
    setUploadedTemplates((prev) => [custom, ...prev]);
    setPendingTemplateId(customId);
    setSelectedTemplateId(customId);
    setForm((prev) => ({ ...prev, templateType: category }));
    setTemplateModalOpen(true);
    setStatusMessage('Plantilla subida desde PC. Ahora pulsa "Seleccionar plantilla".');
    event.target.value = '';
  };

  const handleGenerateWithPollinations = async () => {
    setLoading(true);
    setActionError('');
    setImageUrl('');
    setStatusMessage('Generando con Pollinations IA... (gratis, puede tardar 20-40s)');
    try {
      const productN = selectedProductName || 'producto natural';
      const details = form.productDetails || '';
      const template = form.templateType || 'Hero';
      const angle = form.angle || '';
      const extra = form.style || '';
      const [w, h] = (form.size || '1024x1024').split('x').map(Number);

      const promptParts = [
        `ultra realistic professional ecommerce product photo, ${productN}`,
        `template style: ${template}`,
        details ? `product details: ${details}` : '',
        angle ? `sales angle: ${angle}` : '',
        'premium commercial lighting, studio quality, clean background',
        'high impact conversion image, crisp details, photorealistic',
        'STRICT: NO text, NO words, NO captions, NO banners, NO typography',
        extra ? `extra: ${extra}` : '',
      ].filter(Boolean).join(', ');

      const encodedPrompt = encodeURIComponent(promptParts);
      const seed = Math.floor(Math.random() * 99999);
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${w || 1024}&height=${h || 1024}&seed=${seed}&nologo=true&model=flux`;

      // Precargar la imagen para confirmar que se generó
      await new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = pollinationsUrl;
      });

      setImageUrl(pollinationsUrl);

      // Guardar en el store local del servidor como referencia
      try {
        await fetchJsonWithFallback('ai-images/save-external', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: form.userId || 'admin',
            productId: form.productId || 'general',
            productName: productN,
            template,
            url: pollinationsUrl,
            model: 'pollinations-flux',
            prompt_used: promptParts,
          }),
        });
        await fetchImages();
      } catch (_) {
        // Si falla guardar, igual mostramos la imagen
      }

      setStatusMessage('✅ Imagen generada con Pollinations IA (gratis). ¡Alto impacto!');
    } catch (error) {
      setActionError('No se pudo generar con Pollinations. Verifica tu conexión o intenta de nuevo.');
      setStatusMessage('');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (selectedModel === 'pollinations') {
      return handleGenerateWithPollinations();
    }

    // — OpenAI flow —
    setLoading(true);
    setActionError('');
    setImageUrl('');
    setStatusMessage('Generando imagen con OpenAI... puede tardar hasta 60 segundos.');
    if (!files.filter(Boolean).length) {
      setActionError('Debes subir al menos 1 foto real del producto para generar la imagen.');
      setStatusMessage('');
      setLoading(false);
      return;
    }
    if (!selectedTemplateId) {
      setActionError('Selecciona una plantilla antes de generar.');
      setStatusMessage('');
      setLoading(false);
      return;
    }
    const connected = await checkServer();
    if (!connected) {
      setActionError('Servidor IA sin conexion. Verifica y vuelve a intentar.');
      setConnectionErrorDetail((prev) => prev || 'Sin conexion valida para generar. Revisa panel de endpoints y variables OPENAI.');
      setStatusMessage('');
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const payload = {
        productId: form.productId || 'producto',
        productName: selectedProductName,
        template: form.templateType || 'hero',
        size: form.size || '1024x1024',
        language: form.language || 'es',
        prompt: form.productDetails
          ? `Foto profesional del producto ${selectedProductName}. ${form.productDetails}`
          : `Foto profesional del producto ${selectedProductName}, fondo blanco, iluminacion de estudio, alta calidad.`,
      };

      const formData = new FormData();
      if (files.filter(Boolean)[0]) {
        const imageForApi = await ensurePngFile(files.filter(Boolean)[0]);
        formData.append('image', imageForApi);
      }
      formData.append('productName', payload.productName);
      formData.append('userId', form.userId || 'admin');
      formData.append('productId', form.productId || 'general');
      formData.append('template', payload.template);
      formData.append('size', payload.size);
      formData.append('language', payload.language);
      formData.append('productDetails', form.productDetails || '');
      formData.append('angle', form.angle || '');
      formData.append('avatar', form.benefit || '');
      formData.append('extraInstructions', form.style || '');

      const result = await fetchJsonWithFallback('images/generate', {
        method: 'POST',
        signal: controller.signal,
        body: formData,
      });
      updateConnectionPanel(result);

      if (result.ok && result.data?.ok) {
        const data = result.data;
        setImageUrl(data.image_url || '');
        await fetchImages();
        setStatusMessage('Imagenes generadas. Revisa la seccion de variantes.');
      } else if (result.ok && result.data) {
        const rawError = String(result.data.error || '').trim();
        const friendlyError = /images\.edits is not a function/i.test(rawError)
          ? 'Servidor IA desactualizado en Render (SDK antiguo). Haz redeploy del backend y recarga fuerte (Ctrl+F5).'
          : (rawError || 'No se pudo generar.');
        setActionError(friendlyError);
        setConnectionErrorDetail(rawError || 'Error funcional devuelto por la API.');
        setStatusMessage('');
      } else {
        const target = result.url || buildApiUrl('/api', 'images/generate');
        const status = result.status ? ` (status ${result.status})` : '';
        setActionError(`La API no respondio JSON en ${target}${status}`);
        setConnectionErrorDetail(`Respuesta invalida/no JSON en ${target}${status}. Posible proxy, ruta incorrecta o servidor caido.`);
        setStatusMessage('');
      }
    } catch (error) {
      if (error?.name === 'AbortError') {
        setActionError('Tiempo de espera agotado (60s).');
        setConnectionErrorDetail('Timeout durante generacion. Revisa carga del servidor o tamaño de imagen.');
      } else {
        setActionError(error.message);
        setConnectionErrorDetail(error.message || 'Error inesperado durante generacion.');
      }
      setStatusMessage('');
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const handleConfirmTemplate = async () => {
    const chosen = allTemplates.find((item) => item.id === pendingTemplateId);
    if (!chosen) {
      setActionError('Selecciona una plantilla antes de confirmar.');
      return;
    }
    handlePickTemplate(chosen);
    if (files.filter(Boolean)[0]) {
      setStatusMessage('Analizando plantilla y producto para generar version similar...');
      try {
        const imageForApi = await ensurePngFile(files.filter(Boolean)[0]);
        const analyzeData = new FormData();
        analyzeData.append('image', imageForApi);
        analyzeData.append('clientId', form.userId || 'admin');
        const analyzeResult = await fetchJsonWithFallback('product/analyze', {
          method: 'POST',
          body: analyzeData,
        });
        updateConnectionPanel(analyzeResult);
        if (analyzeResult.ok && analyzeResult.data?.ok) {
          const analysis = analyzeResult.data.analysis || {};
          setForm((prev) => ({
            ...prev,
            templateType: chosen.category || analysis.suggestedTemplate || prev.templateType,
            angle: analysis.suggestedAngle || prev.angle,
            style: prev.style || analysis.recommendedInstructions || prev.style,
          }));
        } else if (!analyzeResult.ok) {
          const status = analyzeResult.status ? ` (${analyzeResult.status})` : '';
          setConnectionErrorDetail(`Fallo analisis en ${analyzeResult.url || 'endpoint'}${status}: ${analyzeResult.errorMessage || analyzeResult.text || 'sin detalle'}`);
        }
      } catch (error) {
        // si falla analisis, continua con generacion
      }
      await handleGenerate();
    }
  };
  const serverStatusLabel = serverStatus === 'ok'
    ? 'Conectado'
    : serverStatus === 'checking'
      ? 'Verificando'
      : serverStatus === 'error'
        ? 'Sin conexion'
        : 'Verificar';

  const handleDelete = async (id) => {
    try {
      const result = await fetchJsonWithFallback('ai-images/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: form.userId || 'admin', imageId: id }),
      });
      if (result.ok && result.data?.ok !== false) {
        setImages((prev) => prev.filter((img) => img.id !== id));
      }
    } catch (error) {
      console.error('delete', error);
    }
  };
  const handleViewImage = (url) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  const handleDownloadImage = (url, index) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `seccion-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="imagenesIA">
      <div className="imagenesWrapper darkUi">
        <header className="topBarIa">
          <span>✨ Imágenes IA</span>
          <button type="button" className={`serverChip ${serverStatus}`} onClick={checkServer}>
            {serverStatus === 'ok' ? 'Servidor conectado' : serverStatusLabel}
          </button>
        </header>
        <section className="connectionPanel">
          <div className="connectionPanelHead">
            <strong>Panel de Conexion IA</strong>
            <button type="button" className="serverChip" onClick={checkServer}>Revisar ahora</button>
          </div>
          <p>
            Servidor IA fijo: <b>{DEFAULT_IA_API_BASE}</b>
          </p>
          <p>
            Endpoint activo: <b>{connectionPanel.activeUrl || 'No detectado'}</b>
          </p>
          <p>
            Ultima revision: <b>{connectionPanel.checkedAt || '--:--:--'}</b>
          </p>
          <p>
            API Key: <b>{
              (connectionPanel.health?.has_key
                ?? connectionPanel.health?.hasKey
                ?? connectionPanel.health?.api_key_loaded
                ?? connectionPanel.health?.key_loaded) ? 'Detectada' : 'No detectada'
            }</b> | Mock: <b>{String(connectionPanel.health?.mock || 'false')}</b>
          </p>
          <p>
            Img model: <b>{connectionPanel.health?.model || 'n/a'}</b> | Edit model: <b>{connectionPanel.health?.edit_model || 'n/a'}</b> | Vision: <b>{connectionPanel.health?.vision_model || 'n/a'}</b>
          </p>
          <div className="connectionAttempts">
            {(connectionPanel.attempts || []).map((attempt) => (
              <div key={`${attempt.url}-${attempt.status}`} className={`attemptRow ${attempt.ok ? 'ok' : 'fail'}`}>
                <span>{attempt.url}</span>
                <span>{attempt.ok ? 'OK' : `FAIL ${attempt.status || ''} ${attempt.error || ''}`}</span>
              </div>
            ))}
            {!connectionPanel.attempts?.length && <div className="attemptRow fail"><span>Sin intentos aun</span><span>--</span></div>}
          </div>
          {connectionErrorDetail && <p className="connectionErrorDetail">{connectionErrorDetail}</p>}
        </section>
        {serverStatus === 'error' && (
          <div className="offlineFloating">
            <button type="button" className="serverChip error" onClick={checkServer}>
              Sin conexion - Reintentar
            </button>
          </div>
        )}

        <section className="iaCard">
          <div className="iaCardTitle">
            <h3>Generar Imagen IA</h3>
            <p>Elige tu modelo, sube fotos del producto y genera imagenes de alto impacto.</p>
          </div>

          {/* Selector de Modelos */}
          <div className="modelSelectorRow">
            {MODEL_OPTIONS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`modelCard ${selectedModel === m.id ? 'modelCardActive' : ''}`}
                onClick={() => setSelectedModel(m.id)}
              >
                <span className="modelIcon">{m.icon}</span>
                <div className="modelInfo">
                  <span className="modelLabel">{m.label}</span>
                  <span className="modelDesc">{m.description}</span>
                </div>
                <span className={`modelBadge ${m.id === 'pollinations' ? 'badgeFree' : 'badgePremium'}`}>
                  {m.badge}
                </span>
              </button>
            ))}
          </div>

          <div className="fieldRow">
            <label>Plantilla</label>
            <button type="button" className="uploadPcBtn" onClick={() => templateFileInputRef.current?.click()}>
              Subir desde PC
            </button>
            <input
              ref={templateFileInputRef}
              type="file"
              accept="image/*"
              className="hiddenFileInput"
              onChange={handleUploadTemplateFromPc}
            />
            <button type="button" className="templateHeroBtn" onClick={() => setTemplateModalOpen(true)}>
              <span>Seleccionar Plantilla</span>
              <small>de la Galeria</small>
            </button>
            {selectedTemplate && (
              <div className="selectedTemplatePreview">
                <img src={resolveTemplateUrl(selectedTemplate.url)} alt={selectedTemplate.name} />
                <div>
                  <b>Plantilla activa:</b>
                  <span>{selectedTemplate.name}</span>
                </div>
              </div>
            )}
          </div>

          <div className="fieldRow">
            <label>Fotos del Producto</label>
            <small className="helpText">(agrega de 1 a 3 fotos)</small>
            <div className="uploadGrid">
              {['Imagen 1', 'Imagen 2', 'Imagen 3'].map((label, idx) => (
                <label key={label} className="uploadSlot">
                  {files[idx] ? (
                    <>
                      <img src={URL.createObjectURL(files[idx])} alt={label} />
                      <button
                        type="button"
                        className="slotRemove"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          const next = [...files];
                          next[idx] = null;
                          setFiles(next);
                        }}
                      >
                        x
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="plusCircle">+</span>
                      <small>{label}</small>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={(event) => {
                    const selected = Array.from(event.target.files ?? []);
                    const next = [...files];
                    next[idx] = selected[0];
                    setFiles(next);
                  }} />
                </label>
              ))}
            </div>
          </div>

          <div className="fieldGridTwo">
            <div className="fieldRow">
              <label>Tamano de Salida</label>
              <select value={form.size} onChange={handleChange('size')}>
                {sizeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="fieldRow">
              <label>Idioma de Salida</label>
              <select value={form.language} onChange={handleChange('language')}>
                <option value="es">Espanol</option>
                <option value="en">Ingles</option>
              </select>
            </div>
          </div>

          <div className="creativeHeader">
            <div>
              <strong>Controles Creativos (Opcional)</strong>
              <small>Personaliza tu seccion</small>
            </div>
            <button
              type="button"
              className={`creativeToggle ${showAdvanced ? 'active' : ''}`}
              onClick={() => setShowAdvanced((prev) => !prev)}
              aria-pressed={showAdvanced ? 'true' : 'false'}
            />
          </div>

          {showAdvanced && (
            <div className="advancedStack">
              <div className="fieldRow">
                <label>Detalles del Producto</label>
                <textarea value={form.productDetails} onChange={handleChange('productDetails')} placeholder="Describe las caracteristicas, beneficios y detalles del producto..." />
              </div>
              <div className="fieldRow">
                <label>Angulo de Venta</label>
                <textarea value={form.angle} onChange={handleChange('angle')} placeholder="Ej: Mujeres en transicion de menopausia..." />
              </div>
              <div className="fieldRow">
                <label>Avatar de Cliente Ideal</label>
                <textarea value={form.benefit} onChange={handleChange('benefit')} placeholder="Ej: Mujeres 45-55 anos..." />
              </div>
              <div className="fieldRow">
                <label>Instrucciones Adicionales</label>
                <textarea value={form.style} onChange={handleChange('style')} placeholder="Cualquier instruccion especifica..." />
              </div>
            </div>
          )}

          <div className="advancedGrid">
            <div className="fieldRow">
              <label>Producto (opcional)</label>
              <select
                value={form.productId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  setForm((prev) => ({
                    ...prev,
                    productId: nextId,
                  }));
                }}
              >
                <option value="">Selecciona un producto</option>
                {products.map((item) => (
                  <option key={item.idProducto} value={String(item.idProducto)}>
                    {item.titulo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="actions">
            <button
              type="button"
              className="primary"
              onClick={handleGenerate}
              disabled={loading || (selectedModel === 'openai' && serverStatus !== 'ok')}
            >
              {loading ? 'Generando...' : selectedModel === 'pollinations' ? '🌸 Generar Gratis' : '🧠 Generar con OpenAI'}
            </button>
            <button type="button" className="secondary" onClick={fetchImages}>
              Actualizar
            </button>
          </div>
          {selectedModel === 'pollinations' && (
            <div className="pollinationsNote">
              <span>🌸</span>
              <span>Pollinations.ai — generacion gratuita, sin API key requerida</span>
            </div>
          )}
          <small className="usageNote">{images.length} imagenes generadas para este producto.</small>
          {selectedModel === 'openai' && serverMessage && <p className="serverMessage">{serverMessage}</p>}
          {actionError && <p className="error">{actionError}</p>}
          {statusMessage && !actionError && <p className="status">{statusMessage}</p>}
        </section>

        <section className="gallerySection generatedEndSection">
          <div className="galleryHeader">
            <h2>Imagenes Generadas</h2>
            {images.length === 0 && <span className="gallerySubtitle">Ejemplos de alto impacto ↓</span>}
          </div>
          {imageUrl && (
            <div className="latestResult">
              <img src={imageUrl} alt="Ultima imagen generada" />
              <span>✨ Ultima generada</span>
            </div>
          )}
          <div className="galleryGrid">
            {(images.length > 0 ? images : demoImages).map((img, index) => (
              <article key={img.id} className={img.isDemo ? 'demoCard' : ''}>
                {!img.isDemo && (
                  <button type="button" className="quickRemoveBtn" onClick={() => handleDelete(img.id)} aria-label="Eliminar imagen">
                    ✕
                  </button>
                )}
                {img.isDemo && <span className="demoBadge">Ejemplo</span>}
                <img src={img.files?.[0]?.url} alt={`Imagen ${index + 1}`} loading="lazy" />
                <div className="galleryCardFooter">
                  <p>{img.template || (index === 0 ? 'Principal' : `Imagen ${index + 1}`)}</p>
                  {img.analysis?.high_impact_score && (
                    <span className="impactScore">⚡ {img.analysis.high_impact_score}%</span>
                  )}
                </div>
                {img.analysis && !img.isDemo && (
                  <div className="imageAnalysis">
                    <small>
                      Producto detectado: <b>{img.analysis.detected_product || 'n/a'}</b>
                    </small>
                    <small>
                      Match producto: <b>{img.analysis.product_match_score ?? 'n/a'}%</b> | Match plantilla: <b>{img.analysis.template_match_score ?? 'n/a'}%</b>
                    </small>
                    <small>
                      Hero impacto: <b>{img.analysis.hero_style_score ?? 'n/a'}%</b> | Alto impacto: <b>{img.analysis.high_impact_score ?? 'n/a'}%</b>
                    </small>
                    {img.analysis.notes && <small>{img.analysis.notes}</small>}
                  </div>
                )}
                {!img.isDemo && (
                  <div className="galleryActions">
                    <button type="button" onClick={() => handleViewImage(img.files?.[0]?.url)}>
                      Ver
                    </button>
                    <button type="button" onClick={() => handleDownloadImage(img.files?.[0]?.url, index)}>
                      Descargar
                    </button>
                    <button type="button" className="danger" onClick={() => handleDelete(img.id)}>
                      Eliminar
                    </button>
                  </div>
                )}
                {img.isDemo && (
                  <div className="galleryActions">
                    <button type="button" onClick={() => handleViewImage(img.files?.[0]?.url)}>
                      Ver
                    </button>
                    <button type="button" onClick={() => handleDownloadImage(img.files?.[0]?.url, index)}>
                      Descargar
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>


        {templateModalOpen && (
          <div className="templateModalOverlay" onClick={() => setTemplateModalOpen(false)}>
            <div className="templateModal" onClick={(event) => event.stopPropagation()}>
              <div className="templateModalHeader">
                <h3>Galeria de Disenos</h3>
                <button type="button" onClick={() => setTemplateModalOpen(false)}>x</button>
              </div>
              <div className="templateTabs">
                {templateOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={templateTab === opt ? 'active' : ''}
                    onClick={() => setTemplateTab(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <div className="templateGrid compact">
                {allTemplates.filter((item) => item.category === templateTab).map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    className={(pendingTemplateId === tpl.id || selectedTemplateId === tpl.id) ? 'templateSelected' : ''}
                    onClick={() => {
                      setPendingTemplateId(tpl.id);
                      setSelectedTemplateId(tpl.id);
                    }}
                  >
                    <img src={resolveTemplateUrl(tpl.url)} alt={tpl.name} />
                    <span>{tpl.name}</span>
                  </button>
                ))}
                {!allTemplates.filter((item) => item.category === templateTab).length && (
                  <p className="empty">No hay plantillas cargadas.</p>
                )}
              </div>
              <div className="templateModalFooter">
                <button type="button" className="secondary" onClick={() => setTemplateModalOpen(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={handleConfirmTemplate}
                  disabled={!pendingTemplateId}
                >
                  Seleccionar plantilla
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}








