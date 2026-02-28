import React from 'react'
import Header from '../Header/Header'
import './ComingSoon.css'

export default function ComingSoon({ title = 'Próximamente' }) {
    return (
        <div className='containerGrid'>
            <Header />
            <section className='comingSoonSection'>
                <div className='comingSoonCard'>
                    <div className='comingSoonIcon'>🚧</div>
                    <h2>{title}</h2>
                    <p>Esta sección está en desarrollo. Estará disponible pronto.</p>
                </div>
            </section>
        </div>
    )
}
