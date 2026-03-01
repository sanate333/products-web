import React from 'react';
import ButtonPrimary from './ButtonPrimary';

export default function TemplateCards({ templates, onCreate, sectionRef }) {
  return (
    <section className='coSection' id='plantillas' ref={sectionRef} aria-labelledby='co-templates-title'>
      <h2 id='co-templates-title' className='coSectionTitle'>Plantillas listas para vender</h2>
      <p className='coSectionSubtitle'>Elige la que mejor va con tu negocio y crea tu tienda desde el mismo recuadro.</p>
      <div className='coTemplateGrid'>
        {templates.map((template, index) => (
          <article key={template.key} className={`coTemplateCard ${index === 0 ? 'isPrimary' : ''}`}>
            <header className='coTemplateHead'>
              <h3>{template.title}</h3>
              {template.badge ? <span className='coTemplateBadge'>{template.badge}</span> : null}
            </header>
            <p>{template.subtitle}</p>
            <ul>
              {template.features.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <ButtonPrimary type='button' aria-label={`Crear tienda con plantilla ${template.title}`} onClick={() => onCreate(template.key)}>
              Crear tienda
            </ButtonPrimary>
          </article>
        ))}
      </div>
    </section>
  );
}
