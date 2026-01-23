import React from 'react';
import './SubBanners.css';
import Header from '../Header/Header';
import HeaderDash from '../../Components/Admin/HeaderDash/HeaderDash';
import SubBannerData from '../../Components/Admin/SubBannerData/SubBannerData';

export default function SubBanners() {
    return (
        <div className='containerGrid'>
            <Header />
            <section className='containerSection'>
                <HeaderDash />
                <div className='container'>
                    <SubBannerData />
                </div>
            </section>
        </div>
    );
}
