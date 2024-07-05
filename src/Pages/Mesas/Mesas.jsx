import React from 'react'
import Header from '../Header/Header'
import MesasData from '../../Components/Admin/MesasData/MesasData'
import HeaderDash from '../../Components/Admin/HeaderDash/HeaderDash'
export default function Mesas() {
    return (
        <div className='containerGrid'>
            <Header />

            <section className='containerSection'>

                <HeaderDash />
                <div className='container'>
                    <MesasData />
                </div>
            </section>
        </div>
    )
}

