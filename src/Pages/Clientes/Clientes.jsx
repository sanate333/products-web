import React from 'react';
import Header from '../Header/Header';
import HeaderDash from '../../Components/Admin/HeaderDash/HeaderDash';
import ClientesData from '../../Components/Admin/ClientesData/ClientesData';

export default function Clientes() {
    return (
        <div className='containerGrid'>
            <Header />
            <section className='containerSection'>
                <HeaderDash />
                <div className='container'>
                    <ClientesData />
                </div>
            </section>
        </div>
    );
}
