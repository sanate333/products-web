import React from 'react';
import ButtonPrimary from './ButtonPrimary';
import ButtonGhost from './ButtonGhost';

export default function HeroVideo({ onCreate, onSeeTemplates, panelHref, isRegistered }) {
  return (
    <section className='coHero' aria-labelledby='co-hero-title'>
      <div className='coHeroMotionLayer' aria-hidden='true' style={{ backgroundImage: "url('/co/poster.svg')" }} />
      <video
        className='coHeroVideo'
        autoPlay
        muted
        loop
        playsInline
        preload='metadata'
        poster='/co/poster.svg'
      >
        <source src='/media/VideoBannerCO_nubepag.mp4' type='video/mp4' />
      </video>
      <div className='coHeroVignette' aria-hidden='true' />
      <div className='coHeroInner'>
        <span className='coHeroBadge'>US$1 primer mes</span>
        <h1 id='co-hero-title' className='coHeroTitle'>
          Oasis Tiendas - La forma mas rapida de tener tu tienda online lista hoy
          <span className='coSmoke' aria-hidden='true' />
        </h1>
        <p className='coHeroSubtitle'>
          Para marcas y emprendedores que quieren vender ya: crea tu ecommerce en minutos con plantilla lista y dropshipping opcional.
        </p>
        <ul className='coHeroBullets'>
          <li>Configura en minutos, sin programacion ni bloqueos tecnicos</li>
          <li>Publica tus productos y empieza a vender hoy</li>
          <li>Escala con dropshipping cuando quieras crecer sin inventario</li>
        </ul>
        <div className='coHeroCtas'>
          <ButtonPrimary type='button' aria-label='Crear mi tienda' onClick={onCreate}>Crear mi tienda</ButtonPrimary>
          <ButtonGhost type='button' aria-label='Ver plantillas' onClick={onSeeTemplates}>Ver plantillas</ButtonGhost>
        </div>
        <a className='coHeroInlineLink' href={panelHref} target='_blank' rel='noreferrer' aria-label='Ya tengo tienda'>Ya tengo tienda</a>
        {isRegistered ? <p className='coHeroStatus'>Tu ultima tienda registrada ya tiene acceso al panel.</p> : null}
      </div>
    </section>
  );
}
