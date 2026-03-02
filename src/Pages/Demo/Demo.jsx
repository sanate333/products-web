import React from 'react'
import { Link } from 'react-router-dom'
import Banners from '../../Components/Banners/Banners'
import Products from '../../Components/Products/Products'
import './Demo.css'
import Footer from '../../Components/Footer/Footer'
import BtnWhatsapp from '../../Components/BtnWhatsapp/BtnWhatsapp'
import Cart from '../../Components/Cart/Cart'
import BottomBar from '../../Components/BottomBar/BottomBar'
export default function Demo() {
    return (
        <section className='demo'>
            <Banners />
            <div className='catalogoBtnWrap'>
                <Link to='/catalogo' className='catalogoBtn'>Ver Catálogo</Link>
            </div>
            <Products />
            <Footer />
            <BtnWhatsapp />
            <Cart />
            <BottomBar />
        </section>
    )
}
