import React, { useState, useEffect } from 'react';
import Nabvar from '../Components/Navbar/Navbar'
import Demo from '../Pages/Demo/Demo'
import Products from '../Components/Products/Products'
import Footer from '../Components/Footer/Footer'
import BtnWhatsapp from '../Components/BtnWhatsapp/BtnWhatsapp'
import Cart from '../Components/Cart/Cart'
import BottomBar from '../Components/BottomBar/BottomBar'

export default function IndexLayout({ pageMode = 'home' }) {
    const isCatalogo = pageMode === 'catalogo';

    return (
        <div className='section-bg-color'>
            <Nabvar />
            <div className='espaciobg'>

            </div>
            {isCatalogo ? (
                <section className='demo'>
                    <Products viewMode='catalogo' />
                    <Footer />
                    <BtnWhatsapp />
                    <Cart />
                    <BottomBar />
                </section>
            ) : (
                <Demo />
            )}
        </div>
    );
}
