import React from 'react';

const METRICS = [
  { label: 'Tiendas creadas', value: '+1,200' },
  { label: 'Clientes satisfechos', value: '94%' },
  { label: 'Tiempo promedio para publicar', value: '< 15 min' },
];

const TRUST = ['Checkout simple', 'Panel en tiempo real', 'Plantillas listas', 'Sin permanencia'];

export default function SocialProof() {
  return (
    <section className='coSection coProofSection' aria-labelledby='co-proof-title'>
      <h2 id='co-proof-title' className='coSectionTitle'>Confianza real para decidir hoy</h2>
      <p className='coSectionSubtitle'>Oferta de lanzamiento: US$1 el primer mes. Luego US$9.9/mes.</p>

      <div className='coMetricsGrid'>
        {METRICS.map((item) => (
          <article key={item.label} className='coMetricCard'>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </article>
        ))}
      </div>

      <div className='coTrustRow'>
        {TRUST.map((item) => <span key={item} className='coTrustChip'>{item}</span>)}
      </div>
    </section>
  );
}
