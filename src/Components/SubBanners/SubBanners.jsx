import React, { useEffect, useRef, useState } from 'react';
import baseURL, { resolveImg } from '../url';
import './SubBanners.css';
import SwiperCore, { Navigation, Pagination, Autoplay } from 'swiper/core';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/swiper-bundle.css';

SwiperCore.use([Navigation, Pagination, Autoplay]);

const ORDER_KEY = 'subBannerOrder';
const getEndpoints = [
    'subbannersGet.php',
    'subbannerGet.php',
    'subBannerGet.php',
];

export default function SubBanners() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const swiperRef = useRef(null);
    const handleImageError = (id) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    useEffect(() => {
        cargarSubBanners();
    }, []);

    useEffect(() => {
        if (swiperRef.current) {
            swiperRef.current?.update();
        }
    }, [items]);

    const getOrder = () => JSON.parse(localStorage.getItem(ORDER_KEY)) || [];

    const sortByOrder = (list) => {
        const order = getOrder();
        if (!order.length) return list;
        const byId = new Map(list.map((item) => [item.id, item]));
        const ordered = order.map((id) => byId.get(id)).filter(Boolean);
        const remaining = list.filter((item) => !order.includes(item.id));
        return [...ordered, ...remaining];
    };

    const cargarSubBanners = () => {
        const load = async () => {
            for (const endpoint of getEndpoints) {
                try {
                    const response = await fetch(`${baseURL}/${endpoint}`, {
                        method: 'GET',
                    });
                    if (!response.ok) {
                        continue;
                    }
                    const data = await response.json();
                    const subBanners = (data.subbanner || data.subbanners || data.banner || []).map((item, index) => {
                        const rawId = item.idSubBanner ?? item.idBanner ?? item.id ?? item.id_sub_banner ?? item.id_subbanner ?? null;
                        return {
                            id: rawId !== null ? String(rawId) : `sub-${index}`,
                            imagen: resolveImg(item.imagen),
                        };
                    }).filter((item) => item.imagen);
                    setItems(sortByOrder(subBanners));
                    setLoading(false);
                    return;
                } catch (error) {
                    console.error('Error al cargar sub banners:', error);
                }
            }
            setLoading(false);
        };
        load();
    };

    if (loading || !items.length) {
        return null;
    }

    return (
        <div className='SubBannerContain'>
            <Swiper
                grabCursor={true}
                loop={items.length > 1}
                slidesPerView={1.48}
                spaceBetween={6}
                centeredSlides={false}
                autoplay={items.length > 1 ? { delay: 3500, disableOnInteraction: false } : false}
                speed={700}
                breakpoints={{
                    480: { slidesPerView: 1.6, spaceBetween: 8 },
                    640: { slidesPerView: 2.25, spaceBetween: 10 },
                    900: { slidesPerView: 3.05, spaceBetween: 12 },
                    1200: { slidesPerView: 3.5, spaceBetween: 14 },
                }}
                onSwiper={(swiper) => {
                    swiperRef.current = swiper;
                }}
                id='swiper_container_subbanners'
            >
                {items.map((item) => (
                    <SwiperSlide key={item.id} className='swiperSlideSubbanner'>
                        <div className='subBannerCard'>
                            <img src={item.imagen} alt="sub banner" onError={() => handleImageError(item.id)} />
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    );
}
