import React, { useEffect, useMemo, useRef, useState } from 'react';
import baseURL from '../../Components/url';
import HeroVideo from './components/HeroVideo';
import SocialProof from './components/SocialProof';
import TemplateCards from './components/TemplateCards';
import RegistrationModal from './components/RegistrationModal';
import FeatureSection from './components/FeatureSection';
import Carousel from './components/Carousel';
import PriceCard from './components/PriceCard';
import FAQSection from './components/FAQSection';
import './Co.css';

const TEMPLATES = [
  {
    key: 'naturales_ecommerce',
    title: 'Naturales (E-commerce)',
    subtitle: 'Empieza a vender hoy con una tienda lista para convertir visitas en pedidos.',
    badge: 'Principal',
    features: ['Montaje rapido', 'Cobro simple', 'Control de resultados'],
  },
  {
    key: 'barberia',
    title: 'Barberia',
    subtitle: 'Atrae reservas y reactiva clientes con una vitrina profesional en minutos.',
    features: ['Mas reservas', 'Contacto directo', 'Promos visibles'],
  },
  {
    key: 'restaurante',
    title: 'Restaurante',
    subtitle: 'Publica tu menu, acelera pedidos y mueve mas ventas con menos friccion.',
    features: ['Menu claro', 'Pedidos rapidos', 'Mas conversion'],
  },
];

const CAROUSEL_ITEMS = [
  { src: '/co/slide-1.svg', alt: 'Vista de home ecommerce Oasis' },
  { src: '/co/slide-2.svg', alt: 'Panel de ventas en tiempo real' },
  { src: '/co/slide-3.svg', alt: 'Catalogo con productos destacados' },
  { src: '/co/slide-4.svg', alt: 'Checkout y conversion en movil' },
  { src: '/co/slide-5.svg', alt: 'Plantillas listas para negocio' },
  { src: '/co/slide-6.svg', alt: 'Escalado con dropshipping' },
];

const templateTitle = (key) => TEMPLATES.find((item) => item.key === key)?.title || TEMPLATES[0].title;

export default function Co() {
  const templatesRef = useRef(null);
  const cleanBase = useMemo(() => String(baseURL || '').replace(/\/+$/, ''), []);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].key);
  const [lastLead, setLastLead] = useState(null);

  useEffect(() => {
    document.title = 'Oasis Tiendas | Tiendas en la nube listas para vender';
    const upsertMeta = (name, content) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    upsertMeta('description', 'Crea tu ecommerce con Oasis Tiendas en minutos. Plantillas listas, dropshipping y checkout simple por US$1 el primer mes.');
    upsertMeta('robots', 'index,follow');
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('co_last_registration');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.storeSlug) {
        setLastLead(parsed);
      }
    } catch {
      setLastLead(null);
    }
  }, []);

  const openModal = (templateKey = TEMPLATES[0].key) => {
    setSelectedTemplate(templateKey);
    setModalOpen(true);
  };

  const scrollToTemplates = () => {
    templatesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const checkSlug = async (slug) => {
    try {
      const res = await fetch(`${cleanBase}/api/co/register?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        return { ok: false, error: data?.error || 'No fue posible validar el slug.' };
      }
      return { ok: true, available: !!data.available };
    } catch {
      return { ok: false, error: 'No se pudo validar el slug. Revisa tu conexion.' };
    }
  };

  const submitRegistration = async (payload) => {
    try {
      const response = await fetch(`${cleanBase}/api/co/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateKey: payload.templateKey,
          templateTitle: templateTitle(payload.templateKey),
          storeName: payload.storeName,
          storeSlug: payload.storeSlug,
          email: payload.email,
          whatsapp: payload.whatsapp,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.ok) {
        return { ok: false, error: data?.error || 'No se pudo guardar el registro.' };
      }

      const lead = data.lead || null;
      setLastLead(lead);
      window.localStorage.setItem('co_last_registration', JSON.stringify(lead));
      return { ok: true, lead };
    } catch {
      return { ok: false, error: 'Error de red al guardar el registro.' };
    }
  };

  const panelHref = lastLead?.storeSlug ? `https://sanate.store/dashboard/s/${lastLead.storeSlug}` : 'https://sanate.store/dashboard';

  return (
    <main className='coLanding'>
      <HeroVideo
        onCreate={() => openModal(TEMPLATES[0].key)}
        onSeeTemplates={scrollToTemplates}
        panelHref={panelHref}
        isRegistered={!!lastLead?.storeSlug}
      />

      <SocialProof />
      <TemplateCards templates={TEMPLATES} onCreate={openModal} sectionRef={templatesRef} />
      <Carousel items={CAROUSEL_ITEMS} />
      <FeatureSection />
      <PriceCard onCreate={openModal} />
      <FAQSection />

      <footer className='coFooter'>
        <p>Oasis Tiendas. Tiendas en la nube, listas para vender en minutos.</p>
        <a href={panelHref} target='_blank' rel='noreferrer' aria-label='Ir al panel de tu tienda'>Ir al panel de mi tienda</a>
      </footer>

      <RegistrationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        templateOptions={TEMPLATES}
        initialTemplate={selectedTemplate}
        checkSlug={checkSlug}
        onSubmit={submitRegistration}
      />
    </main>
  );
}
