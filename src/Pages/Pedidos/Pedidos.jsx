import React from 'react'
import Header from '../Header/Header'
import PedidosData from '../../Components/Admin/PedidosData/PedidosData'
import HeaderDash from '../../Components/Admin/HeaderDash/HeaderDash'
export default function Productos() {
    return (
        <div className='containerGrid'>
            <Header />

            <section className='containerSection'>

                <HeaderDash />
                <div className='container'>
                    <PedidosData />
                </div>
            </section>
        </div>
    )
}
