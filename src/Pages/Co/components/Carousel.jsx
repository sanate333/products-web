import React, { useMemo, useState } from 'react';

export default function Carousel({ items }) {
  const [active, setActive] = useState(0);
  const safeItems = useMemo(() => items.slice(0, 8), [items]);

  return (
    <section className='coSection' aria-labelledby='co-carousel-title'>
      <h2 id='co-carousel-title' className='coSectionTitle'>Visual de alto impacto</h2>
      <p className='coSectionSubtitle'>Plantillas, banners y estilo pro para tu marca.</p>
      <div className='coCarousel' role='region' aria-label='Carrusel visual Oasis'>
        {safeItems.map((item, idx) => (
          <figure key={item.src} className='coCarouselItem' onMouseEnter={() => setActive(idx)}>
            <img src={item.src} alt={item.alt} loading='lazy' />
          </figure>
        ))}
      </div>
      <div className='coCarouselDots' aria-hidden='true'>
        {safeItems.map((item, idx) => (
          <span key={`${item.src}-${idx}`} className={idx === active ? 'isActive' : ''} />
        ))}
      </div>
    </section>
  );
}
