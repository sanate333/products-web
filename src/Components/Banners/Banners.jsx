import React, { useEffect, useState, useRef } from 'react';
import 'react-toastify/dist/ReactToastify.css';
import baseURL, { resolveImg } from '../url';
import './Banners.css';
import SubBanners from '../SubBanners/SubBanners';
import SwiperCore, { Navigation, Pagination, Autoplay } from 'swiper/core';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/swiper-bundle.css';
SwiperCore.use([Navigation, Pagination, Autoplay]);

export default function Banners() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const swiperRef = useRef(null);
    const orderKey = 'bannerOrder';
    const handleImageError = (id) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    useEffect(() => {
        cargarBanners();
    }, []);

    useEffect(() => {
        if (swiperRef.current) {
            swiperRef.current?.update();
        }
    }, [items]);

    const getOrder = () => JSON.parse(localStorage.getItem(orderKey)) || [];
    const sortByOrder = (list) => {
        const order = getOrder();
        if (!order.length) return list;
        const byId = new Map(list.map((item) => [item.id, item]));
        const ordered = order.map((id) => byId.get(id)).filter(Boolean);
        const remaining = list.filter((item) => !order.includes(item.id));
        return [...ordered, ...remaining];
    };

    const cargarBanners = () => {
        fetch(`${baseURL}/bannersGet.php`, {
            method: 'GET',
        })
            .then(response => response.json())
            .then(data => {
                const bannerItems = (data.banner || []).map((banner) => ({
                    id: banner.idBanner || banner.id || banner.id_banner || banner.idbanner,
                    imagen: resolveImg(banner.imagen),
                })).filter((item) => item.id && item.imagen);
                setItems(sortByOrder(bannerItems));
                setLoading(false);
            })
            .catch(error => {
                console.error('Error al cargar productos:', error)

            });
    };

    return (
        <div className='BannerContain'>
            {loading ? (
                <div className='loadingBanner'></div>
            ) : (
                <Swiper
                    effect={'coverflow'}
                    grabCursor={true}
                    loop={true}
                    slidesPerView={'auto'}
                    coverflowEffect={{ rotate: 0, stretch: 0, depth: 100, modifier: 2.5 }}
                    navigation={{ nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' }}
                    autoplay={{ delay: 3000 }}
                    pagination={{ clickable: true }}
                    onSwiper={(swiper) => {
                        console.log(swiper);
                        swiperRef.current = swiper;
                    }}
                    id='swiper_container'
                >
                    {items.map((item) => (
                        <SwiperSlide className='swiperSlideBanner' key={item.id}>
                            <img
                                src={item.imagen}
                                alt={`imagen-${item.id}`}
                                onError={() => handleImageError(item.id)}
                            />
                        </SwiperSlide>
                    ))}
                </Swiper>
            )}
            <SubBanners />
        </div>
    );
}
