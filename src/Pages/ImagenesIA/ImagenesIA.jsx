import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import styles from './ImagenesIA.module.css';
import { useAuth } from '../../context/AuthContext';

// ============================================================================
// TEMPLATE DATA - Real URLs from ecom-magic.ai gallery
// ============================================================================
const TEMPLATE_BASE = 'https://ecom-magic.ai/public-banners/landing-templates/';

const GALLERY_CATEGORIES = [
  'Hero',
  'Oferta',
  'Antes/Después',
  'Beneficios',
  'Tabla Comparativa',
  'Prueba de Autoridad',
  'Testimonios',
  'Modo de Uso',
  'Logística',
  'Preguntas Frecuentes',
];

const ECOM_TEMPLATES = [
  // ─── Hero (12) ───
  { id: 'hero-1', category: 'Hero', thumb: `${TEMPLATE_BASE}hero-436addbe-69dd-46a9-96ee-445eda7dc8a4.png` },
  { id: 'hero-2', category: 'Hero', thumb: `${TEMPLATE_BASE}hero-e9d7b624-a836-4a90-88b3-e05c9b4d33f3.png` },
  { id: 'hero-3', category: 'Hero', thumb: `${TEMPLATE_BASE}hero-48797508-35e6-454b-a61c-39ee0c19c346.png` },
  { id: 'hero-4', category: 'Hero', thumb: `${TEMPLATE_BASE}hero-d8a76ef6-e837-45be-bf9e-104d6a7f564b.png` },
  { id: 'hero-5', category: 'Hero', thumb: `${TEMPLATE_BASE}hero-4a6fbd05-457e-41f7-84e2-b2bffb256822.png` },
  { id: 'hero-6', category: 'Hero', thumb: `${TEMPLATE_BASE}hero-6662203b-6c2c-4a94-99d9-f64145967cee.png` },
  { id: 'hero-7', category: 'Hero', thumb: `${TEMPLATE_BASE}hero-7a8739c7-33a7-482b-9a5b-5add341c8871.png` },
  { id: 'hero-8', category: 'Hero', thumb: `${TEMPLATE_BASE}hero-7ccd415c-e507-40a0-b589-e5e0db0d0702.png` },
  { id: 'hero-9', category: 'Hero', thumb: `${TEMPLATE_BASE}hero-d49c5938-7a58-42bf-9324-fb2f0ef6cc39.png` },
  { id: 'hero-10', category: 'Hero', thumb: `${TEMPLATE_BASE}hero-f04cbec9-93dd-47fe-94c7-280143955834.jpg` },
  { id: 'hero-11', category: 'Hero', thumb: `${TEMPLATE_BASE}hero-ecc308a8-d1f3-4026-aa89-9bbc390d7deb.png` },
  { id: 'hero-12', category: 'Hero', thumb: `${TEMPLATE_BASE}hero-aa668361-6c52-4515-9930-8b6c3271d843.png` },

  // ─── Oferta (12) ───
  { id: 'offer-1', category: 'Oferta', thumb: `${TEMPLATE_BASE}offer-adb906bf-828a-477d-b9fa-d49feaa0b238.png` },
  { id: 'offer-2', category: 'Oferta', thumb: `${TEMPLATE_BASE}offer-0fa69b94-0b36-4389-8484-4838937ec1a5.png` },
  { id: 'offer-3', category: 'Oferta', thumb: `${TEMPLATE_BASE}offer-b5d2290d-07e3-4964-8be4-d2d01f6a3640.png` },
  { id: 'offer-4', category: 'Oferta', thumb: `${TEMPLATE_BASE}offer-12a21e29-ca7e-4165-a900-ba2382585c7a.png` },
  { id: 'offer-5', category: 'Oferta', thumb: `${TEMPLATE_BASE}offer-d7bb13bb-1dbd-41a8-9990-ab6fa427a7a3.png` },
  { id: 'offer-6', category: 'Oferta', thumb: `${TEMPLATE_BASE}offer-da86fc7c-4743-43ae-816b-b19c4dc69073.png` },
  { id: 'offer-7', category: 'Oferta', thumb: `${TEMPLATE_BASE}offer-ea0e0deb-36fa-402e-81ab-2e1b28a74dbd.png` },
  { id: 'offer-8', category: 'Oferta', thumb: `${TEMPLATE_BASE}offer-37d5f082-4f45-4594-bb96-ca4dc4fbc040.png` },
  { id: 'offer-9', category: 'Oferta', thumb: `${TEMPLATE_BASE}offer-8b31f94c-4fd8-43c1-82ee-2e5bac24d2ee.png` },
  { id: 'offer-10', category: 'Oferta', thumb: `${TEMPLATE_BASE}offer-357173a2-b3fa-41fd-80bc-b4b6a9b839ee.jpg` },
  { id: 'offer-11', category: 'Oferta', thumb: `${TEMPLATE_BASE}offer-82b5f66e-ab77-48d0-a675-1afeb57091d6.png` },
  { id: 'offer-12', category: 'Oferta', thumb: `${TEMPLATE_BASE}offer-89670574-ad08-47ba-9d91-6ef3c67ad064.png` },

  // ─── Antes/Después (12) ───
  { id: 'ba-1', category: 'Antes/Después', thumb: `${TEMPLATE_BASE}before_after-77bcd88c-a699-4ab8-92c7-f5c1a5beaa2f.png` },
  { id: 'ba-2', category: 'Antes/Después', thumb: `${TEMPLATE_BASE}before_after-728ee75a-f3f5-4520-8cbf-6e3de6ba459c.png` },
  { id: 'ba-3', category: 'Antes/Después', thumb: `${TEMPLATE_BASE}before_after-1833bc9e-d5f1-4312-8eb4-71fe47b8f5ac.png` },
  { id: 'ba-4', category: 'Antes/Después', thumb: `${TEMPLATE_BASE}before_after-9db65107-14b5-48af-8f9a-d38d6ff5034f.png` },
  { id: 'ba-5', category: 'Antes/Después', thumb: `${TEMPLATE_BASE}before_after-81990293-0dcc-459e-a687-8d7dba9d66df.png` },
  { id: 'ba-6', category: 'Antes/Después', thumb: `${TEMPLATE_BASE}before_after-ec4bbf75-0dba-4296-9057-f04dfcbe2de0.png` },
  { id: 'ba-7', category: 'Antes/Después', thumb: `${TEMPLATE_BASE}before_after-f3407da9-938c-4cd2-b4a2-65dd587b6d48.png` },
  { id: 'ba-8', category: 'Antes/Después', thumb: `${TEMPLATE_BASE}before_after-a4bd2b49-8b0a-465d-a76a-2c5ed8118d03.png` },
  { id: 'ba-9', category: 'Antes/Después', thumb: `${TEMPLATE_BASE}before_after-8873e60f-9b75-4e05-afc9-ee9741735fed.png` },
  { id: 'ba-10', category: 'Antes/Después', thumb: `${TEMPLATE_BASE}before_after-473e9260-f9d8-4aaf-a2e7-745e007f29cc.png` },
  { id: 'ba-11', category: 'Antes/Después', thumb: `${TEMPLATE_BASE}before_after-2a53138e-aa4c-451d-8fe8-dcaf3c924962.jpg` },
  { id: 'ba-12', category: 'Antes/Después', thumb: `${TEMPLATE_BASE}before_after-e2d7004f-3141-4c51-877e-b5bf3cb7b642.png` },

  // ─── Beneficios (12) ───
  { id: 'ben-1', category: 'Beneficios', thumb: `${TEMPLATE_BASE}benefits-60a2e3d9-b57c-4b6c-bfe4-778c3750bbbc.png` },
  { id: 'ben-2', category: 'Beneficios', thumb: `${TEMPLATE_BASE}benefits-d24c923d-076e-4056-aa47-c04ce399c19c.png` },
  { id: 'ben-3', category: 'Beneficios', thumb: `${TEMPLATE_BASE}benefits-1287ed8c-a13c-4522-96f6-4ffcc433f75c.png` },
  { id: 'ben-4', category: 'Beneficios', thumb: `${TEMPLATE_BASE}benefits-69c047f1-f41d-4854-aeee-7aabc8d51daa.png` },
  { id: 'ben-5', category: 'Beneficios', thumb: `${TEMPLATE_BASE}benefits-e49f4057-bca1-4372-8e6e-4b23bf8e31fd.png` },
  { id: 'ben-6', category: 'Beneficios', thumb: `${TEMPLATE_BASE}benefits-47278e11-2ffc-4b9d-8b10-c498c7b476e9.png` },
  { id: 'ben-7', category: 'Beneficios', thumb: `${TEMPLATE_BASE}benefits-2d0e37e8-a3ee-40d2-929e-666fa2e48a1c.png` },
  { id: 'ben-8', category: 'Beneficios', thumb: `${TEMPLATE_BASE}benefits-aa650356-e98b-4148-8c4c-79cc17b1783f.png` },
  { id: 'ben-9', category: 'Beneficios', thumb: `${TEMPLATE_BASE}benefits-a0cfef59-f779-4721-b020-32a5e229efc9.png` },
  { id: 'ben-10', category: 'Beneficios', thumb: `${TEMPLATE_BASE}benefits-f53acd8d-16eb-4f4f-887d-5a3fa148c91c.png` },
  { id: 'ben-11', category: 'Beneficios', thumb: `${TEMPLATE_BASE}benefits-36ce1ea4-002a-4697-9d93-43e1014f058c.png` },
  { id: 'ben-12', category: 'Beneficios', thumb: `${TEMPLATE_BASE}benefits-80ff9ec9-a9d8-4750-864c-574019504e5c.png` },

  // ─── Tabla Comparativa (12) ───
  { id: 'tc-1', category: 'Tabla Comparativa', thumb: `${TEMPLATE_BASE}comparison_table-69257458-4780-4ca8-90b5-46229fcebd55.png` },
  { id: 'tc-2', category: 'Tabla Comparativa', thumb: `${TEMPLATE_BASE}comparison_table-5620fdbb-1a0d-4fcd-9384-5b60aa446f79.png` },
  { id: 'tc-3', category: 'Tabla Comparativa', thumb: `${TEMPLATE_BASE}comparison_table-cf26629e-a5b0-4a44-b86c-1bc951656f9c.png` },
  { id: 'tc-4', category: 'Tabla Comparativa', thumb: `${TEMPLATE_BASE}comparison_table-7fcddc55-944e-4969-9186-5a06b6dcf3bb.png` },
  { id: 'tc-5', category: 'Tabla Comparativa', thumb: `${TEMPLATE_BASE}comparison_table-bc511360-ee7c-4340-b38a-91bf7e8215e2.png` },
  { id: 'tc-6', category: 'Tabla Comparativa', thumb: `${TEMPLATE_BASE}comparison_table-e68f25e2-e67c-465d-87f3-a07152356402.png` },
  { id: 'tc-7', category: 'Tabla Comparativa', thumb: `${TEMPLATE_BASE}comparison_table-55dbbb7e-087f-4d0f-83bf-3bc1ee16dd09.jpg` },
  { id: 'tc-8', category: 'Tabla Comparativa', thumb: `${TEMPLATE_BASE}comparison_table-e010a292-3056-4760-9fe0-bfb73a461d79.jpg` },
  { id: 'tc-9', category: 'Tabla Comparativa', thumb: `${TEMPLATE_BASE}comparison_table-09af0fb4-8c17-4c7e-a3d1-77980d0f189a.jpg` },
  { id: 'tc-10', category: 'Tabla Comparativa', thumb: `${TEMPLATE_BASE}comparison_table-4e4a6cbf-64fd-4e4e-ae6c-f2caf871ca68.jpg` },
  { id: 'tc-11', category: 'Tabla Comparativa', thumb: `${TEMPLATE_BASE}comparison_table-8c5e247a-00e7-449c-ac39-d89beb0199b6.png` },
  { id: 'tc-12', category: 'Tabla Comparativa', thumb: `${TEMPLATE_BASE}comparison_table-11b5f4ef-3a19-42ad-a6e4-f6b366728be0.png` },

  // ─── Prueba de Autoridad (12) ───
  { id: 'ap-1', category: 'Prueba de Autoridad', thumb: `${TEMPLATE_BASE}authority_proof-79de460c-2d87-4837-a108-246b98af1e84.png` },
  { id: 'ap-2', category: 'Prueba de Autoridad', thumb: `${TEMPLATE_BASE}authority_proof-75a1aeed-9f06-4246-b475-84cdf5c05b00.jpg` },
  { id: 'ap-3', category: 'Prueba de Autoridad', thumb: `${TEMPLATE_BASE}authority_proof-8affea10-87c0-4826-a142-40c1e1a64a2b.png` },
  { id: 'ap-4', category: 'Prueba de Autoridad', thumb: `${TEMPLATE_BASE}authority_proof-605d06a8-693a-4fd4-80a1-330a72f2d341.png` },
  { id: 'ap-5', category: 'Prueba de Autoridad', thumb: `${TEMPLATE_BASE}authority_proof-869f6188-3e85-45ad-bc6b-27a574c13d29.png` },
  { id: 'ap-6', category: 'Prueba de Autoridad', thumb: `${TEMPLATE_BASE}authority_proof-e0d3f1ab-2ce6-415b-90d1-5278a541ed57.png` },
  { id: 'ap-7', category: 'Prueba de Autoridad', thumb: `${TEMPLATE_BASE}authority_proof-c7142965-34d3-479e-bffb-7d34e4f8ed57.png` },
  { id: 'ap-8', category: 'Prueba de Autoridad', thumb: `${TEMPLATE_BASE}authority_proof-3e827b31-95df-4a8a-a8d8-7ee41c235366.png` },
  { id: 'ap-9', category: 'Prueba de Autoridad', thumb: `${TEMPLATE_BASE}authority_proof-41903895-2bcf-4691-b087-5b67feab64af.jpg` },
  { id: 'ap-10', category: 'Prueba de Autoridad', thumb: `${TEMPLATE_BASE}authority_proof-d170681f-6a07-49d9-9a7d-63d6ae5c064d.png` },
  { id: 'ap-11', category: 'Prueba de Autoridad', thumb: `${TEMPLATE_BASE}authority_proof-0fba88c2-a050-4b9a-b3bc-d1f76578a373.png` },
  { id: 'ap-12', category: 'Prueba de Autoridad', thumb: `${TEMPLATE_BASE}authority_proof-cd759084-7f67-4c65-8fe9-51586a3272d6.png` },

  // ─── Testimonios (12) ───
  { id: 'test-1', category: 'Testimonios', thumb: `${TEMPLATE_BASE}testimonials-13f09e6f-5b2f-45ca-aa08-76a377eaf9a5.png` },
  { id: 'test-2', category: 'Testimonios', thumb: `${TEMPLATE_BASE}testimonials-585ec1bd-ad73-40f1-b97d-34eefaba940e.png` },
  { id: 'test-3', category: 'Testimonios', thumb: `${TEMPLATE_BASE}testimonials-4f3ec49f-72ff-440f-9370-a30905296850.png` },
  { id: 'test-4', category: 'Testimonios', thumb: `${TEMPLATE_BASE}testimonials-6dca41c6-a4fa-40d7-a0a4-a9df4031d88d.jpg` },
  { id: 'test-5', category: 'Testimonios', thumb: `${TEMPLATE_BASE}testimonials-c9e388a8-6e16-40ee-b8f8-824cb1f36493.png` },
  { id: 'test-6', category: 'Testimonios', thumb: `${TEMPLATE_BASE}testimonials-2c21aea6-be89-445e-bf0e-b53935502d0f.png` },
  { id: 'test-7', category: 'Testimonios', thumb: `${TEMPLATE_BASE}testimonials-e837c433-0b2f-48f9-a40a-ac983232a32a.png` },
  { id: 'test-8', category: 'Testimonios', thumb: `${TEMPLATE_BASE}testimonials-7d9496f7-8203-4cd2-a706-8f736789a8dc.png` },
  { id: 'test-9', category: 'Testimonios', thumb: `${TEMPLATE_BASE}testimonials-b583ae9b-dfa4-452e-913e-66b00399af4b.png` },
  { id: 'test-10', category: 'Testimonios', thumb: `${TEMPLATE_BASE}testimonials-b8773327-a8c3-4eb0-858c-e84186ed02ef.png` },
  { id: 'test-11', category: 'Testimonios', thumb: `${TEMPLATE_BASE}testimonials-205fcea2-9cdc-45a2-9eb6-0f7269cc50b7.png` },
  { id: 'test-12', category: 'Testimonios', thumb: `${TEMPLATE_BASE}testimonials-5d0bf44c-0eb0-4353-9c65-107401714663.png` },

  // ─── Modo de Uso (9) ───
  { id: 'hu-1', category: 'Modo de Uso', thumb: `${TEMPLATE_BASE}how_to_use-e9c3a09b-add2-4ae5-bab0-6ccde5803745.png` },
  { id: 'hu-2', category: 'Modo de Uso', thumb: `${TEMPLATE_BASE}how_to_use-fbf59ae0-6066-4698-8b4e-2efc4ae9bffe.png` },
  { id: 'hu-3', category: 'Modo de Uso', thumb: `${TEMPLATE_BASE}how_to_use-bfc4a03d-8130-4ce3-afde-612dc23d29ad.png` },
  { id: 'hu-4', category: 'Modo de Uso', thumb: `${TEMPLATE_BASE}how_to_use-be807363-b406-411f-832c-aa6e43e3c846.png` },
  { id: 'hu-5', category: 'Modo de Uso', thumb: `${TEMPLATE_BASE}how_to_use-1c0a7d3f-3f93-4776-af50-7ce510d63eda.png` },
  { id: 'hu-6', category: 'Modo de Uso', thumb: `${TEMPLATE_BASE}how_to_use-28ae28db-521b-465a-abe6-0e87e5002cd0.png` },
  { id: 'hu-7', category: 'Modo de Uso', thumb: `${TEMPLATE_BASE}how_to_use-c7c6291e-aef3-4d49-bc8a-8d5b665189bc.png` },
  { id: 'hu-8', category: 'Modo de Uso', thumb: `${TEMPLATE_BASE}how_to_use-2b4df0cf-1321-4193-991f-4195e3b5b3b1.png` },
  { id: 'hu-9', category: 'Modo de Uso', thumb: `${TEMPLATE_BASE}how_to_use-65c72156-d215-4cae-92c0-60b4109d2ba1.png` },

  // ─── Logística (3) ───
  { id: 'log-1', category: 'Logística', thumb: `${TEMPLATE_BASE}logistics-218ccffa-6735-445a-b562-876f84aa6bdb.jpg` },
  { id: 'log-2', category: 'Logística', thumb: `${TEMPLATE_BASE}logistics-3c187d9d-d389-48b8-9081-780ff95a160b.png` },
  { id: 'log-3', category: 'Logística', thumb: `${TEMPLATE_BASE}logistics-87718725-862f-4fd1-a5fd-95f0f3f22037.png` },

  // ─── Preguntas Frecuentes (8) ───
  { id: 'faq-1', category: 'Preguntas Frecuentes', thumb: `${TEMPLATE_BASE}faq-d2f1073d-559c-4de8-8957-330fe539b802.png` },
  { id: 'faq-2', category: 'Preguntas Frecuentes', thumb: `${TEMPLATE_BASE}faq-bb40335a-8016-4bad-9447-b7445f53322a.png` },
  { id: 'faq-3', category: 'Preguntas Frecuentes', thumb: `${TEMPLATE_BASE}faq-5593478b-7cb9-466a-aaff-1f7875b17beb.png` },
  { id: 'faq-4', category: 'Preguntas Frecuentes', thumb: `${TEMPLATE_BASE}faq-ddabf943-0464-4a71-b018-f614b4766af3.png` },
  { id: 'faq-5', category: 'Preguntas Frecuentes', thumb: `${TEMPLATE_BASE}faq-d2c5cae4-3421-4fdd-8b01-bd19d39fdba9.jpg` },
  { id: 'faq-6', category: 'Preguntas Frecuentes', thumb: `${TEMPLATE_BASE}faq-e9c06a57-a33d-4f8c-91a4-a3b4a9ee43fd.png` },
  { id: 'faq-7', category: 'Preguntas Frecuentes', thumb: `${TEMPLATE_BASE}faq-8d568242-c810-41d8-b389-9772a8bfbcb1.png` },
  { id: 'faq-8', category: 'Preguntas Frecuentes', thumb: `${TEMPLATE_BASE}faq-4fe52bce-c381-423c-bd2f-7f120baec334.png` },
];

// ============================================================================
// GALLERY MODAL COMPONENT — Matches ecom-magic.ai "Galería de Diseños"
// ============================================================================
function GalleryModal({ isOpen, onClose, onSelect, selectedId, templates, categories }) {
  const [activeCategory, setActiveCategory] = useState(categories[0] || 'Hero');
  const scrollRef = useRef(null);

  const filteredTemplates = useMemo(
    () => templates.filter((t) => t.category === activeCategory),
    [activeCategory, templates]
  );

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft += dir === 'left' ? -200 : 200;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#1a1a2e', borderRadius: '12px',
          maxWidth: '80vw', maxHeight: '85vh', width: '100%',
          display: 'flex', flexDirection: 'column', color: '#fff',
          boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid #2d2d44', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '20px', fontWeight: 600 }}>
          <span style={{ fontSize: '24px' }}>⊞</span> Galería de Diseños
        </div>

        {/* Category Tabs */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #2d2d44', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => scroll('left')} style={{ background: 'transparent', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: '18px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&lt;</button>
          <div ref={scrollRef} style={{ display: 'flex', gap: '12px', flex: 1, overflowX: 'auto', scrollBehavior: 'smooth' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '8px 16px', borderRadius: '6px', whiteSpace: 'nowrap',
                  cursor: 'pointer', fontSize: '14px', border: 'none', transition: 'all 0.2s',
                  backgroundColor: activeCategory === cat ? '#7c3aed' : 'transparent',
                  color: activeCategory === cat ? '#fff' : '#aaa',
                  fontWeight: activeCategory === cat ? 500 : 400,
                }}
              >
                {cat}
              </button>
            ))}
          </div>
          <button onClick={() => scroll('right')} style={{ background: 'transparent', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: '18px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&gt;</button>
        </div>

        {/* Image Grid */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
            {filteredTemplates.map((tpl) => (
              <div
                key={tpl.id}
                onClick={() => onSelect(tpl)}
                style={{
                  borderRadius: '8px', overflow: 'hidden', cursor: 'pointer',
                  border: selectedId === tpl.id ? '2px solid #7c3aed' : '2px solid transparent',
                  boxShadow: selectedId === tpl.id ? '0 0 0 3px rgba(124,58,237,0.5)' : 'none',
                  transition: 'all 0.2s', aspectRatio: '16/9', backgroundColor: '#2d2d44',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { if (selectedId !== tpl.id) { e.currentTarget.style.borderColor = 'transparent'; } e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <img src={tpl.thumb} alt={tpl.id} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
              </div>
            ))}
          </div>
          {filteredTemplates.length === 0 && (
            <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>No hay plantillas disponibles en esta categoría aún.</div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '24px', borderTop: '1px solid #2d2d44', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ fontSize: '14px', color: '#999', flex: 1 }}>Haz clic en un template para seleccionarlo</div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500, backgroundColor: 'transparent', color: '#999', border: '1px solid #666' }}>
              Cancelar
            </button>
            <button
              disabled={!selectedId}
              onClick={() => {
                if (selectedId) {
                  const t = templates.find((x) => x.id === selectedId);
                  if (t) { onSelect(t); onClose(); }
                }
              }}
              style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', cursor: selectedId ? 'pointer' : 'default', fontSize: '14px', fontWeight: 500, backgroundColor: '#7c3aed', color: '#fff', opacity: selectedId ? 1 : 0.5 }}
            >
              ✓ Seleccionar Plantilla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ImagenesIA() {
  const { products = [] } = useAuth() || {};

  const [selectedEngine, setSelectedEngine] = useState('pollinations');
  const [openaiKey, setOpenaiKey] = useState('');
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [productPhotos, setProductPhotos] = useState([null, null, null]);
  const [size, setSize] = useState('1024x1024');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [creativeOpen, setCreativeOpen] = useState(false);
  const [angle, setAngle] = useState('frontal');
  const [avatar, setAvatar] = useState('off');
  const [extra, setExtra] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [error, setError] = useState(null);
  const fileInputRefs = useRef([null, null, null]);

  // Handle photo upload
  const handlePhotoUpload = useCallback((index, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setProductPhotos((prev) => {
        const n = [...prev];
        n[index] = e.target.result;
        return n;
      });
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  // Build prompt
  const buildPrompt = useCallback(() => {
    const cat = selectedTemplate?.category || 'marketing banner';
    const prod = selectedProduct || 'producto';
    const sz = size === '1024x1024' ? 'cuadrado' : 'rectangular';
    let p = `Create a ${sz} ${cat.toLowerCase()} design for "${prod}". `;
    if (productPhotos.some(Boolean)) p += 'Incorporate the product photos provided. ';
    p += `Style: ${angle === 'frontal' ? 'front view' : 'diagonal view'}. `;
    if (avatar !== 'off') p += `Include ${avatar === 'male' ? 'a male' : 'a female'} person. `;
    if (extra) p += `Additional elements: ${extra}. `;
    p += 'Professional, high-impact design for e-commerce.';
    return p;
  }, [selectedTemplate, selectedProduct, size, angle, avatar, extra, productPhotos]);

  // Generate image
  const handleGenerate = useCallback(async () => {
    if (!selectedTemplate) { setError('Por favor selecciona una plantilla primero'); return; }
    if (!selectedProduct) { setError('Por favor selecciona un producto'); return; }
    setGenerating(true);
    setError(null);
    try {
      const prompt = buildPrompt();
      const [w, h] = size.split('x').map(Number);
      const seed = Math.floor(Math.random() * 1000000);
      let imageUrl;
      if (selectedEngine === 'pollinations') {
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&model=flux&nologo=true&seed=${seed}`;
        try {
          const res = await Promise.race([fetch(url), new Promise((_, rej) => setTimeout(() => rej(new Error('timeo5t')), 90000))]);
          if (!res.ok) throw new Error('fail');
          imageUrl = url;
        } catch {
          imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&model=turbo&nologo=true&seed=${seed}`;
        }
      } else {
        if (!openaiKey) { setError('Por favor ingresa tu clave de OpenAI'); setGenerating(false); return; }
        setError('OpenAI generation requires backend implementation');
        setGenerating(false);
        return;
      }
      const scores = { Hero: 95, Oferta: 88, 'Antes/Después': 92, Beneficios: 85, 'Tabla Comparativa': 78, 'Prueba de Autoridad': 80, Testimonios: 82, 'Modo de Uso': 75, 'Logística': 70, 'Preguntas Frecuentes': 72 };
      setGeneratedImages((prev) => [{ id: Date.now(), url: imageUrl, prompt, timestamp: new Date(), impact: scores[selectedTemplate.category] || 80 }, ...prev]);
    } catch (err) {
      setError(`Error al generar imagen: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  }, [selectedEngine, openaiKey, selectedTemplate, selectedProduct, size, angle, avatar, extra, buildPrompt]);

  const handleSelectTemplate = useCallback((tpl) => {
    setPendingTemplateId(tpl.id);
    setSelectedTemplate(tpl);
  }, []);

  const handleDownload = useCallback((url) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `imagen-ia-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>✨ Imágenes IA — Alto Impacto</h1>

      {/* Model Selector */}
      <div className={styles.card}>
        <div style={{ marginBottom: '16px', fontWeight: 500 }}>Selecciona tu modelo IA:</div>
        <div className={styles.modelSelector}>
          <button className={`${styles.modelOption} ${selectedEngine === 'pollinations' ? styles.modelSelected : ''}`} onClick={() => setSelectedEngine('pollinations')}>
            <div style={{ fontWeight: 500 }}>🌸 Pollinations IA</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>Genera sin coste. Rápido y potente.</div>
            <div style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600, marginTop: '4px' }}>GRATIS</div>
            {selectedEngine === 'pollinations' && <span className={styles.badge}>✓</span>}
          </button>
          <button className={`${styles.modelOption} ${selectedEngine === 'openai' ? styles.modelSelected : ''}`} onClick={() => setSelectedEngine('openai')}>
            <div style={{ fontWeight: 500 }}>🧠 OpenAI</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>Máxima calidad con API Key.</div>
            <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600, marginTop: '4px' }}>PREMIUM</div>
            {selectedEngine === 'openai' && <span className={styles.badge}>✓</span>}
          </button>
        </div>
        {selectedEngine === 'openai' && (
          <div style={{ marginTop: '16px' }}>
            <input type="password" placeholder="Ingresa tu API key de OpenAI" value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>
        )}
      </div>

      {/* Gallery Selection */}
      <div className={styles.card}>
        <button className={styles.galleryBtn} onClick={() => setGalleryOpen(true)}>📋 Seleccionar Plantilla de la Galería</button>
        {selectedTemplate && (
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center' }}>
            <img src={selectedTemplate.thumb} alt="Selected" style={{ width: '120px', height: '90px', borderRadius: '6px', objectFit: 'cover', marginRight: '12px' }} />
            <div>
              <div style={{ fontWeight: 500 }}>Plantilla seleccionada</div>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>{selectedTemplate.category}</div>
            </div>
          </div>
        )}
      </div>

      {/* Photo Upload */}
      <div className={styles.card}>
        <div style={{ marginBottom: '16px', fontWeight: 500 }}>Fotos del Producto (máx. 3)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.photoSlot} onClick={() => fileInputRefs.current[i]?.click()}>
              {productPhotos[i] ? <img src={productPhotos[i]} alt={`Foto ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} /> : <div style={{ opacity: 0.5 }}>📸 Foto {i + 1}</div>}
              <input ref={(r) => (fileInputRefs.current[i] = r)} type="file" accept="image/*" hidden onChange={(e) => handlePhotoUpload(i, e.target.files?.[0])} />
            </div>
          ))}
        </div>
      </div>

      {/* Size & Product */}
      <div className={styles.row}>
        <div className={styles.card} style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Tamaño</label>
          <select value={size} onChange={(e) => setSize(e.target.value)} className={styles.select}>
            <option value="1024x1024">1024×1024 (Cuadrado)</option>
            <option value="1024x768">1024×768 (Horizontal)</option>
            <option value="768x1024">768×1024 (Vertical)</option>
          </select>
        </div>
        <div className={styles.card} style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Producto</label>
          <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className={styles.select}>
            <option value="">Selecciona un producto</option>
            {(products || []).map((p) => (
              <option key={p.id || p.name} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Creative Controls */}
      <div className={styles.card}>
        <button onClick={() => setCreativeOpen(!creativeOpen)} style={{ width: '100%', padding: '12px', backgroundColor: '#f5f5f5', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, textAlign: 'left' }}>
          {creativeOpen ? '▼' : '▶'} Controles Creativos
        </button>
        {creativeOpen && (
          <div style={{ marginTop: '16px', display: 'grid', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Ángulo</label>
              <select value={angle} onChange={(e) => setAngle(e.target.value)} className={styles.select}>
                <option value="frontal">Frontal</option>
                <option value="diagonal">Diagonal</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Avatar</label>
              <select value={avatar} onChange={(e) => setAvatar(e.target.value)} className={styles.select}>
                <option value="off">No incluir</option>
                <option value="male">Hombre</option>
                <option value="female">Mujer</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Elementos Adicionales</label>
              <input type="text" placeholder="ej: globos, confeti, luz neon" value={extra} onChange={(e) => setExtra(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
          </div>
        )}
      </div>

      {/* Generate & Gallery Buttons */}
      <div className={styles.btnRow}>
        <button className={styles.generateBtn} onClick={handleGenerate} disabled={generating}>
          {generating ? 'Generando...' : '⚡ Generar Imagen Gratis'}
        </button>
        <button className={styles.updateBtn} onClick={() => setGalleryOpen(true)}>🔄 Actualizar Galería</button>
      </div>

      {selectedEngine === 'pollinations' && (
        <div className={styles.statusText}>Usando Pollinations Flux • Generación hasta 90 segundos</div>
      )}

      {error && (
        <div style={{ backgroundColor: '#fee', color: '#c00', padding: '12px', borderRadius: '6px', fontSize: '14px', marginBottom: '16px' }}>{error}</div>
      )}

      {/* Generated Images */}
      {generatedImages.length > 0 && (
        <div className={styles.generatedSection}>
          <h2 style={{ marginBottom: '16px' }}>Imágenes Generadas</h2>
          <div className={styles.generatedGrid}>
            {generatedImages.map((img) => (
              <div key={img.id} className={styles.generatedCard}>
                <div style={{ position: 'relative', width: '100%', paddingBottom: '100%', overflow: 'hidden', borderRadius: '8px' }}>
                  <img src={img.url} alt="Generated" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className={styles.impactBadge}>Impacto: {img.impact}%</div>
                </div>
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                  <button style={{ flex: 1, padding: '8px', backgroundColor: '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }} onClick={() => window.open(img.url)}>👁 Ver</button>
                  <button style={{ flex: 1, padding: '8px', backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }} onClick={() => handleDownload(img.url)}>⬇ Descargar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gallery Modal */}
      <GalleryModal
        isOpen={galleryOpen}
        onClose={() => { setGalleryOpen(false); setPendingTemplateId(null); }}
        onSelect={handleSelectTemplate}
        selectedId={pendingTemplateId}
        templates={ECOM_TEMPLATES}
        categories={GALLERY_CATEGORIES}
      />
    </div>
  );
}
