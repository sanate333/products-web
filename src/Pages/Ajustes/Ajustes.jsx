import React from 'react';
import Header from '../Header/Header';
import HeaderDash from '../../Components/Admin/HeaderDash/HeaderDash';
import AjustesData from '../../Components/Admin/AjustesData/AjustesData';

export default function Ajustes() {
    return (
        <div className="containerGrid">
            <Header />
            <section className="containerSection">
                <HeaderDash />
                <div className="container">
                    <AjustesData />
                </div>
            </section>
        </div>
    );
}
