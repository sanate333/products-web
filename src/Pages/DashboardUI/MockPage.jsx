import React from 'react';
import './MockPage.css';

export default function MockPage({ title, subtitle, chips = [] }) {
    return (
        <section className="mock-page">
            <header className="oasis-card mock-page-header">
                <h2>{title}</h2>
                <p>{subtitle}</p>
                <div className="mock-page-chips">
                    {chips.map((chip) => (
                        <span key={chip}>{chip}</span>
                    ))}
                </div>
            </header>

            <div className="mock-page-grid">
                <article className="oasis-card mock-metric-card">
                    <h3>Resumen semanal</h3>
                    <strong>+24%</strong>
                    <p>Crecimiento estimado respecto a la semana anterior.</p>
                </article>
                <article className="oasis-card mock-metric-card">
                    <h3>Actividad</h3>
                    <strong>128</strong>
                    <p>Eventos de panel registrados en este módulo.</p>
                </article>
                <article className="oasis-card mock-metric-card">
                    <h3>Estado</h3>
                    <strong>Operativo</strong>
                    <p>Estructura visual lista para integrar lógica real.</p>
                </article>
            </div>

            <article className="oasis-card mock-table-card">
                <div className="mock-table-head">
                    <h3>Listado mock</h3>
                    <button type="button">Nuevo</button>
                </div>
                <div className="mock-table-row">Elemento 01</div>
                <div className="mock-table-row">Elemento 02</div>
                <div className="mock-table-row">Elemento 03</div>
            </article>
        </section>
    );
}

