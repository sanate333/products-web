import React from 'react'
import './Productos.css'
import Header from '../Header/Header'
import ProductosData from '../../Components/Admin/ProductosData/ProductosData'
import HeaderDash from '../../Components/Admin/HeaderDash/HeaderDash'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGift } from '@fortawesome/free-solid-svg-icons'
export default function Productos() {
    return (
        <div className='containerGrid'>
            <Header />

            <section className='containerSection'>

                <HeaderDash />
                <div className='container'>
                    <div className='productosTopActions'>
                        <Link to='/dashboard/ofertas-carrito' className='btnOfertasCarrito'>
                            <FontAwesomeIcon icon={faGift} /> Ofertas Carrito
                        </Link>
                    </div>
                    <ProductosData />
                </div>
            </section>
        </div>
    )
}
