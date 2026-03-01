import React from 'react';
import ButtonPrimary from './ButtonPrimary';

export default function PriceCard({ onCreate }) {
  return (
    <section className='coSection' id='precio' aria-labelledby='co-price-title'>
      <article className='coPriceCard'>
        <h2 id='co-price-title' className='coSectionTitle'>Empieza hoy por US$1</h2>
        <p className='coSectionSubtitle'>Activa tu tienda con riesgo minimo: primer mes en promocion. Luego US$9.9/mes.</p>
        <ul>
          <li>Empiezas a vender rapido con todo lo esencial activado</li>
          <li>Controlas ventas, clientes y pedidos desde un solo panel</li>
          <li>Escalas sin inventario con dropshipping cuando lo necesites</li>
          <li>Sin permanencia: cancela cuando quieras</li>
        </ul>
        <ButtonPrimary type='button' aria-label='Empieza ahora con Oasis' onClick={() => onCreate('naturales_ecommerce')}>
          Empieza ahora
        </ButtonPrimary>
      </article>
    </section>
  );
}
