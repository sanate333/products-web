import React from 'react'
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
            <Products />
            <Footer />
            <BtnWhatsapp />
            <Cart />
            <BottomBar />
        </section>
    )
}
