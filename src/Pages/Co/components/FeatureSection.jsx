import React from 'react';

const WHY_ITEMS = [
  'Vendes mas rapido porque arrancas en minutos, no en semanas.',
  'Sabes que te deja dinero: margen y rentabilidad visibles por producto.',
  'Tu tienda se ve profesional sin contratar diseno: banners y visuales editables.',
  'Decides mejor cada dia con ventas y conversiones en tiempo real.',
  'Tus clientes compran facil en movil y desktop sin fricciones.',
  'Recibes soporte continuo para crecer sin quedarte bloqueado.',
];

const STEPS = [
  'Elige plantilla + nombre',
  'Completa WhatsApp y correo',
  'Activa por US$1 y crece',
];

export default function FeatureSection() {
  return (
    <>
      <section className='coSection' id='por-que' aria-labelledby='co-why-title'>
        <h2 id='co-why-title' className='coSectionTitle'>Hecha para vender, no para configurar</h2>
        <div className='coWhyGrid'>
          {WHY_ITEMS.map((item) => <p key={item} className='coMiniCard'>{item}</p>)}
        </div>
      </section>

      <section className='coSection' aria-labelledby='co-steps-title'>
        <h2 id='co-steps-title' className='coSectionTitle'>Solo 3 pasos para empezar</h2>
        <div className='coStepsGrid'>
          {STEPS.map((step, idx) => (
            <article key={step} className='coStepCard'>
              <span className='coStepIndex'>Paso {idx + 1}</span>
              <p>{step}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
