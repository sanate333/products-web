import React, { useCallback, useEffect, useState } from 'react';
import './ImagenesIA.css';
import baseURL from '../../Components/url';

const API_BASE = process.env.REACT_APP_API_URL || '';
const API_PREFIX = API_BASE ? `${API_BASE.replace(/\/+$/, '')}/api` : '/api';
const API_FALLBACK = process.env.REACT_APP_API_FALLBACK
  || (typeof window !== 'undefined'
    ? `${window.location.origin.replace(/:\d+$/, '')}:5055/api`
    : '');

const buildApiUrl = (prefix, path) => {
  const cleanPrefix = prefix ? prefix.replace(/\/+$/, '') : '';
  const cleanPath = path.replace(/^\/+/, '');
  return cleanPrefix ? `${cleanPrefix}/${cleanPath}` : `/${cleanPath}`;
};

const fetchJsonWithFallback = async (path, options = {}) => {
  const request = async (prefix) => {
    const url = buildApiUrl(prefix, path);
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return { ok: true, data: await response.json(), url };
    }
    const text = await response.text();
    return { ok: false, text, url, status: response.status };
  };

  const primary = await request(API_PREFIX);
  if (primary.ok) return primary;
  const text = String(primary.text || '').toLowerCase();
  const looksHtml = text.includes('<!doctype') || text.includes('<html');
  if (looksHtml && API_FALLBACK && API_FALLBACK !== API_PREFIX) {
    const fallback = await request(API_FALLBACK);
    if (fallback.ok) return fallback;
  }
  return primary;
};
const TEMPLATE_MANIFEST = '/ai-templates/manifest.json';

export default function ImagenesIA() {
  const [form, setForm] = useState({
    userId: '',
    productId: '',
    country: '',
    templateType: '',
    size: '1024x1024',
    angle: '',
    benefit: '',
    style: '',
    productName: '',
    productDetails: '',
    language: 'es',
  });
  const [files, setFiles] = useState([]);
  const [actionError, setActionError] = useState('');
  const [variants, setVariants] = useState([]);
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [serverMessage, setServerMessage] = useState('');
  const [serverStatus, setServerStatus] = useState('unknown');
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateTab, setTemplateTab] = useState('Hero');
  const [templates, setTemplates] = useState([]);
  const [products, setProducts] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const userOptions = ['admin'];
  const countryOptions = ['CO', 'MX', 'AR', 'CL', 'PE', 'US'];
  const templateOptions = ['Hero', 'Oferta', 'Beneficios', 'Antes/Despues', 'Testimonio', 'Logistica'];
  const sizeOptions = [
    { value: '1024x1024', label: 'Instagram Cuadrado (1024x1024)' },
    { value: '1024x1792', label: 'Instagram Stories (1024x1792)' },
    { value: '1792x1024', label: 'Horizontal (1792x1024)' },
    { value: '512x512', label: 'Cuadrado Chico (512x512)' },
  ];

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

  const handleFiles = (event) => {
    const selected = Array.from(event.target.files ?? []).slice(0, 3);
    setFiles(selected);
  };

  const fetchImages = useCallback(async () => {
    try {
      const url = new URL(`${API_PREFIX}/ai-images`, window.location.origin);
      url.searchParams.set('userId', form.userId);
      url.searchParams.set('productId', form.productId);
      const response = await fetch(url);
      const data = await response.json();
      if (data.ok) {
        const sorted = data.images.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
        setImages(sorted);
      }
    } catch (error) {
      console.error('fetch images', error);
    }
  }, [form.userId, form.productId]);

  const checkServer = useCallback(async () => {
    setServerStatus('checking');
    setServerMessage('Verificando conexion...');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const result = await fetchJsonWithFallback('health', { method: 'GET', signal: controller.signal });
      clearTimeout(timeout);
      if (result.ok && result.data?.ok) {
        setServerStatus('ok');
        setServerMessage('Servidor conectado.');
        return true;
      }
    } catch (error) {
      if (error?.name === 'AbortError') {
        setServerMessage('Tiempo de espera agotado (10s).');
      }
    }
    setServerStatus('error');
    if (!serverMessage) {
      setServerMessage('No se pudo conectar con el servidor.');
    }
    return false;
  }, []);

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
        setTemplates(Array.isArray(data.templates) ? data.templates : []);
      } catch (error) {
        setTemplates([]);
      }
    };
    fetchTemplates();
  }, []);

  useEffect(() => {
    checkServer();
  }, [checkServer]);

  const handlePickTemplate = (template) => {
    setForm((prev) => ({ ...prev, templateType: template.category || prev.templateType }));
    setTemplateModalOpen(false);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setActionError('');
    setImageUrl('');
    setStatusMessage('Generando imagen... puede tardar hasta 60 segundos.');
    const ready = await checkServer();
    if (!ready) {
      setActionError('No se pudo conectar con el servidor.');
      setStatusMessage('');
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const payload = {
        productId: form.productId || 'producto',
        productName: form.productName || 'Producto',
        template: form.templateType || 'hero',
        size: form.size || '1024x1024',
        language: form.language || 'es',
        prompt: form.productDetails
          ? `Foto profesional del producto ${form.productName || 'Producto'}. ${form.productDetails}`
          : `Foto profesional del producto ${form.productName || 'Producto'}, fondo blanco, iluminacion de estudio, alta calidad.`,
      };

      const result = await fetchJsonWithFallback('image-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(payload),
      });
      if (result.ok && result.data?.ok) {
        const data = result.data;
        setVariants([]);
        setImageUrl(data.image_url || '');
        fetchImages();
        setStatusMessage('Imagenes generadas. Revisa la seccion de variantes.');
      } else if (result.ok && result.data) {
        setActionError(result.data.error || 'No se pudo generar.');
        setStatusMessage('');
      } else {
        const target = result.url || buildApiUrl(API_PREFIX, 'image-generate');
        const status = result.status ? ` (status ${result.status})` : '';
        setActionError(`La API no respondio JSON en ${target}${status}`);
        setStatusMessage('');
      }
    } catch (error) {
      if (error?.name === 'AbortError') {
        setActionError('Tiempo de espera agotado (60s).');
      } else {
        setActionError(error.message);
      }
      setStatusMessage('');
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const handleReorder = async (direction, idx) => {
    const swapped = [...images];
    const target = idx + (direction === 'up' ? -1 : 1);
    if (target < 0 || target >= swapped.length) return;
    const temp = swapped[idx];
    swapped[idx] = swapped[target];
    swapped[target] = temp;
    try {
      await fetch(`${API_PREFIX}/ai-images/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: form.userId,
          productId: form.productId,
          order: swapped.map((img, i) => ({ id: img.id, orderIndex: i + 1 })),
        }),
      });
      setImages(swapped);
    } catch (error) {
      console.error('reorder', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${API_PREFIX}/ai-images/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: form.userId, imageId: id }),
      });
      setImages((prev) => prev.filter((img) => img.id !== id));
    } catch (error) {
      console.error('delete', error);
    }
  };

  return (
    <div className="imagenesIA">
      <div className="imagenesWrapper">
        <header>
  <h1>Imagenes IA</h1>
  <p>Genera disenos realistas para tus landings y usalos directamente en productos.</p>
</header>

        <section className="formSection">
          <div className="cardGroup">
            <div className="cardTitle">
              <strong>Plantilla</strong>
              <span>Selecciona un layout o sube una desde tu PC</span>
            </div>
            <div className="templateButtons">
              <button type="button" className="ghostButton" onClick={() => setTemplateModalOpen(true)}>
                Ver galeria
              </button>
              <button type="button" className="gradientButton" onClick={() => setTemplateModalOpen(true)}>
                <span className="plusIcon">+</span>
                <div>
                  <strong>Seleccionar plantilla</strong>
                  <p>de la Galeria EcomMagic</p>
                </div>
              </button>
            </div>
</div>

          <div className="cardGroup">
            <div className="cardTitle">
              <strong>Fotos del producto</strong>
              <span>Agrega entre 1 y 3 imagenes</span>
            </div>
            <div className="uploadGrid">
              {['Imagen 1', 'Imagen 2', 'Imagen 3'].map((label, idx) => (
                <label key={label} className="uploadSlot">
                  {files[idx] ? (
                    <img src={URL.createObjectURL(files[idx])} alt={label} />
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

          <div className="cardGroup cardFields">
            <div className="advancedHeader">
              <strong>Configuracion avanzada</strong>
              <button
                type="button"
                className="toggleButton"
                onClick={() => setShowAdvanced((prev) => !prev)}
              >
                {showAdvanced ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <div className="serverStatusRow">
              <span>Servidor:</span>
              <button
                type="button"
                className={`serverStatus ${serverStatus}`}
                onClick={checkServer}
              >
                {serverStatus === 'ok'
                  ? 'Conectado'
                  : serverStatus === 'checking'
                    ? 'Verificando...'
                    : serverStatus === 'error'
                      ? 'Sin conexion'
                      : 'Verificar'}
              </button>
            </div>
            {serverMessage && (
              <p className="serverMessage">{serverMessage}</p>
            )}
  {showAdvanced && (
    <div className="advancedGrid">
      <div className="fieldRow">
        <label>Usuario (userId)</label>
        <select value={form.userId} onChange={handleChange('userId')}>
          <option value="">Selecciona un usuario</option>
          {userOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
      <div className="fieldRow">
        <label>Pais</label>
        <select value={form.country} onChange={handleChange('country')}>
          <option value="">Selecciona un pais</option>
          {countryOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
      <div className="fieldRow">
        <label>Angulo sugerido</label>
        <input value={form.angle} onChange={handleChange('angle')} />
      </div>
      <div className="fieldRow wide">
        <label>Detalle / instruccion adicional</label>
        <textarea value={form.productDetails} onChange={handleChange('productDetails')} />
      </div>
      <div className="fieldRow">
        <label>Beneficio clave</label>
        <input value={form.benefit} onChange={handleChange('benefit')} />
      </div>
      <div className="fieldRow">
        <label>Estilo visual</label>
        <input value={form.style} onChange={handleChange('style')} />
      </div>
    </div>
  )}
  <div className="fieldRow">
    <label>Producto (productId)</label>
    <select
      value={form.productId}
      onChange={(event) => {
        const nextId = event.target.value;
        const selected = products.find((item) => String(item.idProducto) === nextId);
        setForm((prev) => ({
          ...prev,
          productId: nextId,
          productName: selected?.titulo || prev.productName,
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
  <div className="fieldRow">
    <label>Template</label>
    <select value={form.templateType} onChange={handleChange('templateType')}>
      {templateOptions.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
  <div className="fieldRow">
    <label>Tamano de salida</label>
    <select value={form.size} onChange={handleChange('size')}>
      {sizeOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
  <div className="fieldRow">
    <label>Idioma</label>
    <select value={form.language} onChange={handleChange('language')}>
      <option value="es">Espanol</option>
      <option value="en">Ingles</option>
    </select>
  </div>
  <div className="fieldRow wide">
    <label>Nombre del producto</label>
    <input value={form.productName} onChange={handleChange('productName')} />
  </div>
</div>
<div className="actions">
  <button type="button" className="primary" onClick={handleGenerate} disabled={loading}>
    {loading ? 'Generando...' : 'Generar imagen'}
  </button>
</div>
{actionError && (
  <p className="error">
    {actionError.includes('Failed to fetch')
      ? 'No se pudo conectar con el servidor.'
      : actionError}
  </p>
)}
{statusMessage && !actionError && (
  <p className="status">{statusMessage}</p>
)}
        </section>

        <section className="variantsSection">
        <h2>Variantes generadas</h2>
        <div className="variantsGrid">
          {imageUrl ? (
            <article>
              <img src={imageUrl} alt="Imagen generada" />
            </article>
          ) : (
            <p className="empty">Genera una imagen para verla aqui.</p>
          )}
        </div>
        </section>

        <section className="gallerySection">
        <h2>Mis imagenes del producto</h2>
        <div className="galleryGrid">
          {images.map((img, index) => (
            <article key={img.id}>
              <img src={img.files?.[0]?.url} alt={`Imagen ${index + 1}`} />
              <p>Slot #{index + 1}</p>
              <div className="galleryActions">
                <button type="button" onClick={() => handleReorder('up', index)} disabled={index === 0}>
                  Subir
                </button>
                <button
                  type="button"
                  onClick={() => handleReorder('down', index)}
                  disabled={index === images.length - 1}
                >
                  Bajar
                </button>
                <button type="button" className="danger" onClick={() => handleDelete(img.id)}>
                  Eliminar
                </button>
              </div>
            </article>
          ))}
          {!images.length && <p>No hay imagenes guardadas.</p>}
        </div>
        </section>

        
        {templateModalOpen && (
          <div className="templateModalOverlay" onClick={() => setTemplateModalOpen(false)}>
            <div className="templateModal" onClick={(event) => event.stopPropagation()}>
              <div className="templateModalHeader">
                <h3>Galeria de plantillas</h3>
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
              <div className="templateGrid">
              {templates.filter((item) => item.category === templateTab).map((tpl) => (
                <button key={tpl.id} type="button" onClick={() => handlePickTemplate(tpl)}>
                  <img src={resolveTemplateUrl(tpl.url)} alt={tpl.name} />
                  <span>{tpl.name}</span>
                </button>
              ))}
                {!templates.filter((item) => item.category === templateTab).length && (
                  <p className="empty">No hay plantillas cargadas.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}








