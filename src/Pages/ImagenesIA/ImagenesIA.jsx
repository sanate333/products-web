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

const buildApiUrl = (path) => `${PINNED_API}/${path.replace(/^\/+/, '')}`;

const fetchJsonSafe = async (path, options = {}) => {
  const url = buildApiUrl(path);
  try {
    const resp = await fetch(url, { ...options });
    const ct = resp.headers.get('content-type') || '';
    if (ct.includes('application/json')) return { ok: resp.ok, data: await resp.json(), url, status: resp.status };
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

// ─── PROMPT ENGINE estilo ecom-magic ───
const BRAND_PALETTES = {
  Hero: {
    bg: 'dramatic dark gradient background with electric blue and deep navy, powerful energy',
    light: 'cinematic rim lighting, powerful spotlight from above, dramatic shadows',
    mood: 'high-energy explosive powerful motivational supplement advertising',
    comp: 'centered product hero shot, dynamic diagonal composition, magazine quality',
  },
  Oferta: {
    bg: 'bold vibrant gradient background, deep red to golden yellow, urgent and exciting',
    light: 'bright commercial studio lighting, warm golden tones, premium feel',
    mood: 'urgent exciting premium value irresistible deal advertising',
    comp: 'product centered with dramatic scale, impact composition, conversion focused',
  },
  Beneficios: {
    bg: 'clean gradient from deep green to emerald, nature inspired wellness',
    light: 'soft diffused lighting, natural wellness feel, clean and fresh',
    mood: 'fresh healthy natural trustworthy clean wellness supplement',
    comp: 'product surrounded by natural elements, floating ingredients, health focused',
  },
  'Antes/Despues': {
    bg: 'split dramatic composition, dark moody left vs bright energetic right',
    light: 'high contrast dramatic lighting, transformation energy, before-after',
    mood: 'transformative inspiring powerful results journey visualization',
    comp: 'split screen composition, transformation journey, dynamic contrast',
  },
  Testimonio: {
    bg: 'warm studio background, soft gradient cream to warm white, authentic',
    light: 'warm portrait lighting, professional trustworthy, soft shadows',
    mood: 'authentic warm human real results testimonial lifestyle',
    comp: 'lifestyle product placement, natural human context, relatable',
  },
  Logistica: {
    bg: 'clean white to light blue gradient, professional reliable corporate',
    light: 'bright clean studio lighting, corporate professional, crisp',
    mood: 'reliable fast trustworthy professional efficient delivery',
    comp: 'product with logistics elements, clean organized layout, professional',
  },
};

const buildHighImpactPrompt = ({ productName, productDetails, templateType, angle, benefit, style, brandColor }) => {
  const palette = BRAND_PALETTES[templateType] || BRAND_PALETTES.Hero;
  const parts = [
    `Ultra-realistic commercial ecommerce product photography of ${productName || 'supplement product'} container/bottle.`,
    `${palette.bg}.`,
    `${palette.light}.`,
    `${palette.mood} aesthetic.`,
    `${palette.comp}.`,
    productDetails ? `Product details: ${productDetails}.` : '',
    angle ? `Marketing angle: ${angle}.` : '',
    benefit ? `Target customer: ${benefit}.` : '',
    brandColor ? `Brand accent color: ${brandColor}.` : '',
    style ? `Additional style: ${style}.` : '',
    'Photorealistic 8K quality professional commercial advertising photography.',
    'Cinematic depth of field perfect product focus premium brand aesthetics.',
    'High conversion ecommerce hero image magazine quality dramatic color grading.',
    'CRITICAL: NO text NO words NO letters NO typography NO captions anywhere.',
  ].filter(Boolean).join(' ');
  return parts;
};

const ECOM_TEMPLATES = [
  { id: 'em_h1', name: 'Hero Energético', category: 'Hero', url: 'https://ecom-magic.ai/public-banners/landing-templates/hero-0476bf69-7ccd-4679-ae5c-6d1c6e0d0e67.png' },
  { id: 'em_h2', name: 'Hero Potencia', category: 'Hero', url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&h=600&fit=crop' },
  { id: 'em_h3', name: 'Hero Fuerza', category: 'Hero', url: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=600&h=600&fit=crop' },
  { id: 'em_o1', name: 'Oferta Impacto', category: 'Oferta', url: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=600&h=600&fit=crop' },
  { id: 'em_o2', name: 'Oferta Flash', category: 'Oferta', url: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=600&h=600&fit=crop' },
  { id: 'em_b1', name: 'Beneficios Natural', category: 'Beneficios', url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&h=600&fit=crop' },
  { id: 'em_b2', name: 'Beneficios Muscular', category: 'Beneficios', url: 'https://images.unsplash.com/photo-1532384748853-8f54a8f476e2?w=600&h=600&fit=crop' },
  { id: 'em_a1', name: 'Transformación 30 días', category: 'Antes/Despues', url: 'https://images.unsplash.com/photo-1550345332-09e3ac987658?w=600&h=600&fit=crop' },
  { id: 'em_t1', name: 'Testimonio Real', category: 'Testimonio', url: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=600&h=600&fit=crop' },
  { id: 'em_l1', name: 'Envío Express', category: 'Logistica', url: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=600&h=600&fit=crop' },
];

const ensurePng = async (file) => {
  if (!file || file.type === 'image/png') return file;
  return new Promise((res, rej) => {
    const img = new Image(); const u = URL.createObjectURL(file);
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
      c.toBlob(b => { URL.revokeObjectURL(u); res(new File([b], file.name.replace(/\.[^.]+$/, '') + '.png', { type: 'image/png' })); }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('read fail')); };
    img.src = u;
  });
};

const extractColor = (file) => new Promise(res => {
  if (!file) return res(null);
  const img = new Image(); const u = URL.createObjectURL(file);
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = 50; c.height = 50;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, 50, 50);
    URL.revokeObjectURL(u);
    const d = ctx.getImageData(0, 0, 50, 50).data;
    let r=0,g=0,b=0,n=0;
    for (let i=0;i<d.length;i+=16){r+=d[i];g+=d[i+1];b+=d[i+2];n++;}
    res(`rgb(${Math.round(r/n)},${Math.round(g/n)},${Math.round(b/n)})`);
  };
  img.onerror = () => res(null);
  img.src = u;
});

const MODEL_OPTIONS = [
  { id: 'pollinations', label: 'Pollinations IA', badge: 'GRATIS', desc: 'Genera sin coste. Rápido y potente con Flux.', icon: '🌸' },
  { id: 'openai', label: 'OpenAI DALL-E', badge: 'PREMIUM', desc: 'Máxima calidad con tu API Key.', icon: '🧠' },
];
const TPL_TYPES = ['Hero','Oferta','Beneficios','Antes/Despues','Testimonio','Logistica'];
const SIZE_OPTS = [
  { value: '1024x1024', label: 'Cuadrado Instagram (1024x1024)' },
  { value: '1024x1792', label: 'Stories/Reels (1024x1792)' },
  { value: '1792x1024', label: 'Facebook Horizontal (1792x1024)' },
  { value: '512x512', label: 'Miniatura (512x512)' },
];

export default function ImagenesIA() {
  const tplFileRef = useRef(null);
  const [form, setForm] = useState({ userId:'admin', productId:'', templateType:'Hero', size:'1024x1024', angle:'', benefit:'', style:'', productDetails:'', language:'es' });
  const [model, setModel] = useState('pollinations');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [serverStatus, setServerStatus] = useState('unknown');
  const [tplModal, setTplModal] = useState(false);
  const [tplTab, setTplTab] = useState('Hero');
  const [customTpls, setCustomTpls] = useState([]);
  const [products, setProducts] = useState([]);
  const [showAdv, setShowAdv] = useState(false);
  const [selTpl, setSelTpl] = useState('');
  const [pendingTpl, setPendingTpl] = useState('');
  const [brandColor, setBrandColor] = useState(null);
  const [genCount, setGenCount] = useState(0);
  const [lastPrompt, setLastPrompt] = useState('');

  const allTpls = useMemo(() => [...customTpls, ...ECOM_TEMPLATES], [customTpls]);
  const activeTpl = useMemo(() => allTpls.find(t => t.id === selTpl) || null, [allTpls, selTpl]);
  const productName = useMemo(() => {
    const p = products.find(p => String(p.idProducto) === String(form.productId));
    return (p?.titulo || '').trim() || 'Suplemento Deportivo';
  }, [products, form.productId]);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const fetchGallery = useCallback(async () => {
    try {
      const r = await fetchJsonSafe(`ai-images?userId=${encodeURIComponent(form.userId||'admin')}&productId=${encodeURIComponent(form.productId||'general')}`);
      if (r.ok && r.data?.ok) {
        setImages((r.data.images||[]).sort((a,b)=>(a.orderIndex??0)-(b.orderIndex??0)).map(img=>({...img,files:(img.files||[]).map(f=>({...f,url:resolveImageUrl(f.url)}))})));
      }
    } catch(e){console.error(e);}
  }, [form.userId, form.productId]);

  const fetchProducts = useCallback(async () => {
    try { const r = await fetch(`${baseURL}/productosGet.php`); const d = await r.json(); setProducts(d.productos||[]); }
    catch(e){console.error(e);}
  }, []);

  const checkServer = useCallback(async () => {
    setServerStatus('checking');
    try {
      const r = await fetchJsonSafe('health');
      if (r.ok && r.data?.ok) { setServerStatus('ok'); return true; }
      setServerStatus('error'); return false;
    } catch(e) { setServerStatus('error'); return false; }
  }, []);

  useEffect(() => { fetchGallery(); }, [fetchGallery]);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { checkServer(); }, [checkServer]);
  useEffect(() => {
    const f = files.find(Boolean);
    if (f) extractColor(f).then(setBrandColor); else setBrandColor(null);
  }, [files]);

  const generatePollinations = async () => {
    setLoading(true); setError(''); setImageUrl('');
    setStatus('🌸 Construyendo prompt de alto impacto...');
    try {
      const [w,h] = (form.size||'1024x1024').split('x').map(Number);
      const prompt = buildHighImpactPrompt({ productName, productDetails:form.productDetails, templateType:form.templateType||'Hero', angle:form.angle, benefit:form.benefit, style:form.style, brandColor });
      setLastPrompt(prompt);
      setStatus('🎨 Generando con Flux AI... (20-45s, por favor espera)');
      const seed = Math.floor(Math.random()*999999);
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w||1024}&height=${h||1024}&seed=${seed}&nologo=true&model=flux&enhance=true`;
      await new Promise((res,rej)=>{ const i=new window.Image(); i.onload=res; i.onerror=rej; i.src=url; });
      setImageUrl(url);
      setGenCount(c=>c+1);
      try {
        await fetchJsonSafe('ai-images/save-external',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ userId:form.userId||'admin', productId:form.productId||'general', productName, template:form.templateType||'Hero', url, model:'pollinations-flux', prompt_used:prompt }) });
        await fetchGallery();
      } catch(_){}
      setStatus('✅ ¡Imagen de alto impacto generada!');
    } catch(e) { setError('Error al generar. Revisa conexión e intenta de nuevo.'); setStatus(''); }
    finally { setLoading(false); }
  };

  const generateOpenAI = async () => {
    if (!files.filter(Boolean).length) { setError('Sube al menos 1 foto del producto para OpenAI.'); return; }
    setLoading(true); setError(''); setImageUrl('');
    setStatus('🧠 Generando con OpenAI...');
    const ok = await checkServer();
    if (!ok) { setError('Backend sin conexión. Usa Pollinations (gratis) por ahora.'); setLoading(false); return; }
    const ctrl = new AbortController(); const t = setTimeout(()=>ctrl.abort(),60000);
    try {
      const fd = new FormData();
      fd.append('image', await ensurePng(files.find(Boolean)));
      fd.append('productName', productName); fd.append('userId', form.userId||'admin');
      fd.append('productId', form.productId||'general'); fd.append('template', form.templateType||'Hero');
      fd.append('size', form.size||'1024x1024'); fd.append('language', form.language||'es');
      fd.append('productDetails', form.productDetails||''); fd.append('angle', form.angle||'');
      fd.append('avatar', form.benefit||''); fd.append('extraInstructions', form.style||'');
      const r = await fetchJsonSafe('images/generate',{ method:'POST', signal:ctrl.signal, body:fd });
      if (r.ok && r.data?.ok) { setImageUrl(resolveImageUrl(r.data.image_url||'')); await fetchGallery(); setGenCount(c=>c+1); setStatus('✅ Imagen generada con OpenAI.'); }
      else setError(r.data?.error || r.text || 'Error desconocido');
    } catch(e) { setError(e?.name==='AbortError'?'Tiempo agotado (60s).':e.message); }
    finally { clearTimeout(t); setLoading(false); }
  };

  const handleGenerate = () => model==='pollinations' ? generatePollinations() : generateOpenAI();

  const pickTpl = (tpl) => { setSelTpl(tpl.id); setPendingTpl(''); setForm(p=>({...p,templateType:tpl.category||p.templateType})); setTplModal(false); setStatus(`✅ Plantilla "${tpl.name}" seleccionada.`); };

  const uploadTpl = (e) => {
    const f = e.target.files?.[0]; if(!f) return;
    const id = `custom-${Date.now()}`; const url = URL.createObjectURL(f);
    setCustomTpls(p=>[{id,name:f.name||'Personalizada',category:tplTab,url,isCustom:true},...p]);
    setSelTpl(id); setForm(p=>({...p,templateType:tplTab})); setTplModal(false);
    setStatus('✅ Plantilla cargada y seleccionada.'); e.target.value='';
  };

  const deleteImg = async (id) => {
    try { await fetchJsonSafe('ai-images/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:form.userId||'admin',imageId:id})}); setImages(p=>p.filter(i=>i.id!==id)); }
    catch(e){console.error(e);}
  };

  const DEMO = useMemo(()=>[
    {id:'d1',isDemo:true,template:'Hero',files:[{url:'https://ecom-magic.ai/public-banners/landing-templates/hero-0476bf69-7ccd-4679-ae5c-6d1c6e0d0e67.png'}],analysis:{high_impact_score:97}},
    {id:'d2',isDemo:true,template:'Oferta',files:[{url:'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=512&h=512&fit=crop'}],analysis:{high_impact_score:93}},
    {id:'d3',isDemo:true,template:'Beneficios',files:[{url:'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=512&h=512&fit=crop'}],analysis:{high_impact_score:91}},
    {id:'d4',isDemo:true,template:'Transformación',files:[{url:'https://images.unsplash.com/photo-1550345332-09e3ac987658?w=512&h=512&fit=crop'}],analysis:{high_impact_score:95}},
  ],[]);

  const displayImages = images.length > 0 ? images : DEMO;

  return (
    <div className="imagenesIA"><div className="imagenesWrapper darkUi">
      <header className="topBarIa">
        <span>✨ Imágenes IA — Alto Impacto</span>
        <button type="button" className={`serverChip ${serverStatus}`} onClick={checkServer}>
          {serverStatus==='ok'?'✅ Conectado':serverStatus==='checking'?'⏳ Verificando':'❌ Sin conexión'}
        </button>
      </header>

      {serverStatus==='error'&&<div className="offlineFloating"><button type="button" className="serverChip error" onClick={checkServer}>Sin conexión — Reintentar</button></div>}

      <section className="iaCard">
        <div className="iaCardTitle">
          <h3>🎨 Generador de Imágenes IA</h3>
          <p>Imágenes persuasivas de alto impacto al estilo ecom-magic.</p>
          {genCount>0&&<span className="generationBadge">🔥 {genCount} imágenes esta sesión</span>}
        </div>

        <div className="modelSelectorRow">
          {MODEL_OPTIONS.map(m=>(
            <button key={m.id} type="button" className={`modelCard ${model===m.id?'modelCardActive':''}`} onClick={()=>setModel(m.id)}>
              <span className="modelIcon">{m.icon}</span>
              <div className="modelInfo"><span className="modelLabel">{m.label}</span><span className="modelDesc">{m.desc}</span></div>
              <span className={`modelBadge ${m.id==='pollinations'?'badgeFree':'badgePremium'}`}>{m.badge}</span>
            </button>
          ))}
        </div>

        <div className="fieldRow">
          <label>Tipo de Imagen</label>
          <div className="templateTypeRow">
            {TPL_TYPES.map(t=>(
              <button key={t} type="button" className={`typeChip ${form.templateType===t?'typeChipActive':''`} onClick={()=>setForm(p=>({...p,templateType:t}))}>{t}</button>
            ))}
          </div>
        </div>

        <div className="fieldRow">
          <label>Plantilla de Referencia</label>
          <div className="templateActions">
            <button type="button" className="templateHeroBtn" onClick={()=>setTplModal(true)}>
              <span>🖼 Galería de Plantillas</span><small>{activeTpl?activeTpl.name:'Sin seleccionar'}</small>
            </button>
            <button type="button" className="uploadPcBtn" onClick={()=>tplFileRef.current?.click()}>📁 Subir desde PC</button>
            <input ref={tplFileRef} type="file" accept="image/*" className="hiddenFileInput" onChange={uploadTpl}/>
          </div>
          {activeTpl&&<div className="selectedTemplatePreview"><img src={activeTpl.url} alt={activeTpl.name}/><div><b>Activa:</b> <span>{activeTpl.name}</span></div></div>}
        </div>

        <div className="fieldRow">
          <label>Fotos del Producto</label>
          <small className="helpText">Sube 1-3 fotos — se extrae color de marca automáticamente</small>
          {brandColor&&<div className="colorExtracted"><span style={{background:brandColor,display:'inline-block',width:16,height:16,borderRadius:3,verticalAlign:'middle',marginRight:6}}/><small>Color detectado: <b>{brandColor}</b></small></div>}
          <div className="uploadGrid">
            {['Foto 1','Foto 2','Foto 3'].map((lbl,idx)=>(
              <label key={lbl} className="uploadSlot">
                {files[idx]?(<><img src={URL.createObjectURL(files[idx])} alt={lbl}/><button type="button" className="slotRemove" onClick={e=>{e.preventDefault();e.stopPropagation();const n=[...files];n[idx]=null;setFiles(n);}}>✕</button></>):(<><span className="plusCircle">+</span><small>{lbl}</small></>)}
                <input type="file" accept="image/*" onChange={e=>{const n=[...files];n[idx]=e.target.files[0];setFiles(n);}}/>
              </label>
            ))}
          </div>
        </div>

        <div className="fieldGridTwo">
          <div className="fieldRow"><label>Tamaño</label><select value={form.size} onChange={set('size')}>{SIZE_OPTS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
          <div className="fieldRow"><label>Producto</label>
            <select value={form.productId} onChange={e=>setForm(p=>({...p,productId:e.target.value}))}>
              <option value="">Seleccionar producto</option>
              {products.map(p=><option key={p.idProducto} value={String(p.idProducto)}>{p.titulo}</option>)}
            </select>
          </div>
        </div>

        <div className="creativeHeader">
          <div><strong>⚙️ Controles Creativos</strong><small>Ángulo de venta, avatar, branding</small></div>
          <button type="button" className={`creativeToggle ${showAdv?'active':''}`} onClick={()=>setShowAdv(p=>!p)}/>
        </div>
        {showAdv&&(
          <div className="advancedStack">
            <div className="fieldRow"><label>Detalles del Producto</label><textarea value={form.productDetails} onChange={set('productDetails')} placeholder="Ej: GlycoFuse sabor fresa, 25g carbohidratos, recipiente negro con azul eléctrico..."/></div>
            <div className="fieldRow"><label>Ángulo de Venta</label><textarea value={form.angle} onChange={set('angle')} placeholder="Ej: Recuperación post-entrenamiento, para atletas de alto rendimiento..."/></div>
            <div className="fieldRow"><label>Avatar Cliente Ideal</label><textarea value={form.benefit} onChange={set('benefit')} placeholder="Ej: Hombres 25-40 años, deportistas, quieren ganar músculo..."/></div>
            <div className="fieldRow"><label>Instrucciones Extra</label><textarea value={form.style} onChange={set('style')} placeholder="Ej: Fondo oscuro dramático, explosión de energía, colores vibrantes..."/></div>
          </div>
        )}

        <div className="actions">
          <button type="button" className="primary" onClick={handleGenerate} disabled={loading||(model==='openai'&&serverStatus!=='ok')}>
            {loading?'⏳ Generando...':model==='pollinations'?'🌸 Generar Imagen Gratis':'🧠 Generar con OpenAI'}
          </button>
          {imageUrl&&<button type="button" className="secondary" onClick={handleGenerate} disabled={loading}>🔄 Regenerar</button>}
          <button type="button" className="secondary" onClick={fetchGallery}>🔃 Actualizar</button>
        </div>

        {model==='pollinations'&&<div className="pollinationsNote"><span>🌸</span><span>Pollinations Flux — Gratis, sin API key. Prompts premium de alto impacto.</span></div>}
        {error&&<p className="error">❌ {error}</p>}
        {status&&!error&&<p className="status">{status}</p>}
        {lastPrompt&&<details className="promptDebug"><summary>🔍 Ver prompt generado</summary><p>{lastPrompt}</p></details>}
      </section>

      <section className="gallerySection generatedEndSection">
        <div className="galleryHeader">
          <h2>🖼 Imágenes Generadas</h2>
          <span className="gallerySubtitle">{images.length===0?'Referencias de estilo ↓':`${images.length} imágenes guardadas`}</span>
        </div>
        {imageUrl&&(
          <div className="latestResult">
            <img src={imageUrl} alt="Última generada"/>
            <div className="latestActions">
              <span>✨ Última generada</span>
              <button type="button" onClick={()=>window.open(imageUrl,'_blank')}>🔍 Ver grande</button>
              <button type="button" onClick={()=>{const a=document.createElement('a');a.href=imageUrl;a.download='imagen-ia.png';a.click();}}>⬇ Descargar</button>
            </div>
          </div>
        )}
        <div className="galleryGrid">
          {displayImages.map((img,idx)=>(
            <article key={img.id} className={img.isDemo?'demoCard':''}>
              {!img.isDemo&&<button type="button" className="quickRemoveBtn" onClick={()=>deleteImg(img.id)}>✕</button>}
              {img.isDemo&&<span className="demoBadge">Referencia</span>}
              <img src={img.files?.[0]?.url} alt={`Imagen ${idx+1}`} loading="lazy"/>
              <div className="galleryCardFooter">
                <p>{img.template||`Imagen ${idx+1}`}</p>
                {img.analysis?.high_impact_score&&<span className="impactScore">⚡ {img.analysis.high_impact_score}%</span>}
              </div>
              <div className="galleryActions">
                <button type="button" onClick={()=>window.open(img.files?.[0]?.url,'_blank')}>Ver</button>
                <button type="button" onClick={()=>{const a=document.createElement('a');a.href=img.files?.[0]?.url;a.download=`img-${idx+1}.png`;a.click();}}>Descargar</button>
                {!img.isDemo&&<button type="button" className="danger" onClick={()=>deleteImg(img.id)}>Eliminar</button>}
              </div>
            </article>
          ))}
        </div>
      </section>

      {tplModal&&(
        <div className="templateModalOverlay" onClick={()=>setTplModal(false)}>
          <div className="templateModal" onClick={e=>e.stopPropagation()}>
            <div className="templateModalHeader"><h3>🖼 Galería de Plantillas</h3><button type="button" onClick={()=>setTplModal(false)}>✕</button></div>
            <div className="templateTabs">{TPL_TYPES.map(t=><button key={t} type="button" className={tplTab===t?'active':''} onClick={()=>setTplTab(t)}>{t}</button>)}</div>
            <div className="templateGrid compact">
              {allTpls.filter(t=>t.category===tplTab).map(tpl=>(
                <button key={tpl.id} type="button" className={pendingTpl===tpl.id||selTpl===tpl.id?'templateSelected':''} onClick={()=>setPendingTpl(tpl.id)}>
                  <img src={tpl.url} alt={tpl.name}/><span>{tpl.name}</span>
                </button>
              ))}
              {!allTpls.filter(t=>t.category===tplTab).length&&<p className="empty">Sin plantillas en esta categoría.</p>}
            </div>
            <div className="templateModalFooter">
              <button type="button" className="secondary" onClick={()=>setTplModal(false)}>Cancelar</button>
              <button type="button" className="primary" disabled={!pendingTpl} onClick={()=>{const t=allTpls.find(t=>t.id===pendingTpl);if(t)pickTpl(t);}}>✅ Seleccionar</button>
            </div>
          </div>
        </div>
      )}
    </div></div>
  );
}