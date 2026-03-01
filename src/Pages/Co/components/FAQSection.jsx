import React from 'react';

const FAQS = [
  {
    q: 'Puedo cambiar mis colores y logo?',
    a: 'Si, personalizas tu tienda desde el panel en minutos.',
  },
  {
    q: 'Necesito inventario para comenzar?',
    a: 'No. Puedes activar dropshipping y vender sin stock propio.',
  },
  {
    q: 'La tienda funciona en celular?',
    a: 'Si, viene optimizada para movil y desktop.',
  },
  {
    q: 'Puedo cancelar cuando quiera?',
    a: 'Si, no hay permanencia obligatoria.',
  },
  {
    q: 'Cuanto tarda en quedar lista?',
    a: 'En minutos. Solo eliges plantilla, datos y publicas.',
  },
];

export default function FAQSection() {
  return (
    <section className='coSection' aria-labelledby='co-faq-title'>
      <h2 id='co-faq-title' className='coSectionTitle'>FAQ</h2>
      <div className='coFaqGrid'>
        {FAQS.map((item) => (
          <details key={item.q} className='coFaqItem'>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
