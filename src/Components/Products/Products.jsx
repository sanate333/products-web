import React, { useEffect, useState, useRef } from 'react';
import baseURL, { resolveImg } from '../url';
import './Products.css';
import SwiperCore, { Navigation, Pagination, Autoplay } from 'swiper/core';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/swiper-bundle.css';
import ProductosLoading from '../ProductosLoading/ProductosLoading';
import { Link as Anchor } from "react-router-dom";
import moneda from '../moneda';
import { registerFcmToken } from '../../firebase';

SwiperCore.use([Navigation, Pagination, Autoplay]);

export default function Products() {
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const categoriasRefs = useRef([]);
    const swiperRef = useRef(null);
    const [productos, setProductos] = useState([]);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todo');
    const [promoStatus, setPromoStatus] = useState('');
    const [promoBusy, setPromoBusy] = useState(false);
    const [randomProducts, setRandomProducts] = useState([]);
    const [installPrompt, setInstallPrompt] = useState(null);
    const [installing, setInstalling] = useState(false);
    const [showRegister, setShowRegister] = useState(false);
    const [registerName, setRegisterName] = useState('');
    const [registerPhone, setRegisterPhone] = useState('');
    const [registerStatus, setRegisterStatus] = useState('');
    const ua = navigator.userAgent || '';
    const isAndroid = /Android/i.test(ua);
    const isInAppBrowser = /(Instagram|FBAN|FBAV|FB_IAB|FB4A|FB4B|TikTok|Bytedance|Line|Snapchat|Twitter)/i.test(ua);
    const getDeviceLabel = () => {
        const uaData = navigator.userAgentData;
        if (uaData?.model) {
            return uaData.model;
        }
        const match = navigator.userAgent.match(/Android.*; ([^;)]*)/i);
        if (match && match[1]) {
            return match[1].trim();
        }
        return navigator.platform || 'Dispositivo';
    };

    const selectedButtonStyle = {
        backgroundColor: '#24b5ff',
        color: '#ffffff',
        border: 'none'
    };
    const unselectedButtonStyle = {
        backgroundColor: '#eaf7ff',
        color: '#169fdf',
        border: '1px solid #cbeeff'
    };

    const handleClickCategoria = (categoria) => {
        setCategoriaSeleccionada(categoria);
    };

    useEffect(() => {
        cargarProductos();
        cargarCategorias();
        return () => {};
    }, []);

    const handleEnablePromos = async () => {
        setPromoBusy(true);
        setPromoStatus('Activando notificaciones...');
        const result = await registerFcmToken(baseURL, 'customer');
        if (result?.ok) {
            setPromoStatus('Notificaciones activadas.');
        } else if (result?.reason === 'denied') {
            setPromoStatus('Permiso bloqueado. Activalo en ajustes del navegador.');
        } else {
            setPromoStatus('No se pudo activar.');
        }
        setPromoBusy(false);
    };

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    useEffect(() => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        if (isStandalone && !localStorage.getItem('clientRegistered')) {
            setShowRegister(true);
            handleEnablePromos();
        }
    }, []);

    const handleInstall = async () => {
        if (!isAndroid) {
            setPromoStatus('Disponible solo en Android.');
            return;
        }
        if (isInAppBrowser) {
            setPromoStatus('Abre en Chrome para instalar la app.');
            return;
        }
        if (!installPrompt) {
            setPromoStatus('Instalacion disponible en Chrome Android.');
            return;
        }
        setInstalling(true);
        installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        setInstallPrompt(null);
        if (choice?.outcome === 'accepted') {
            try {
                const deviceId = localStorage.getItem('pushDeviceId') || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
                localStorage.setItem('pushDeviceId', deviceId);
                await fetch(`${baseURL}/saveInstall.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        deviceId,
                        userAgent: navigator.userAgent,
                        deviceInfo: getDeviceLabel(),
                    }),
                });
            } catch (error) {
                console.error('Error al registrar instalacion:', error);
            }
            await handleEnablePromos();
            setShowRegister(true);
        } else {
            setPromoStatus('Instalacion cancelada.');
        }
        setInstalling(false);
    };

    const handleOpenInChrome = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setPromoStatus('Link copiado. Pegalo en Chrome para instalar.');
        } catch (error) {
            setPromoStatus('Copia el link y abre en Chrome.');
        }
    };

    const handleRegister = async () => {
        if (!registerName.trim() || !registerPhone.trim()) {
            setRegisterStatus('Completa nombre y WhatsApp.');
            return;
        }
        try {
            const deviceId = localStorage.getItem('pushDeviceId') || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
            localStorage.setItem('pushDeviceId', deviceId);
            const response = await fetch(`${baseURL}/saveSubscriber.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceId,
                    name: registerName.trim(),
                    whatsapp: registerPhone.trim(),
                    userAgent: navigator.userAgent,
                    deviceInfo: getDeviceLabel(),
                }),
            });
            const data = await response.json();
            if (data?.ok) {
                localStorage.setItem('clientRegistered', '1');
                setShowRegister(false);
                setRegisterStatus('');
            } else {
                setRegisterStatus('No se pudo registrar.');
            }
        } catch (error) {
            setRegisterStatus('No se pudo registrar.');
        }
    };


    const isVisibleProduct = (item) => {
        const estado = (item?.estadoProducto || '').toLowerCase();
        return estado !== 'desactivado';
    };

    const cargarProductos = () => {
        fetch(`${baseURL}/productosGet.php`, {
            method: 'GET',
        })
            .then(response => response.json())
            .then(data => {
                const loadedProducts = data.productos || [];
                setProductos(loadedProducts);
                const availableProducts = loadedProducts.filter(isVisibleProduct);
                const pool = availableProducts.length ? availableProducts : loadedProducts;
                const shuffled = [...pool];
                for (let i = shuffled.length - 1; i > 0; i -= 1) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }
                let showcase = shuffled;
                if (showcase.length > 0 && showcase.length < 6) {
                    const repeats = Math.ceil(6 / showcase.length);
                    showcase = Array.from({ length: repeats }, () => showcase).flat().slice(0, 6);
                }
                setRandomProducts(showcase);
                setLoading(false);
            })
            .catch(error => console.error('Error al cargar productos:', error));
    };

    const cargarCategorias = () => {
        fetch(`${baseURL}/categoriasGet.php`, {
            method: 'GET',
        })
            .then(response => response.json())
            .then(data => {
                setCategorias(data.categorias || []);
            })
            .catch(error => console.error('Error al cargar categorías:', error));
    };


    const obtenerImagen = (item) => {
        const src = item.imagen1 || item.imagen2 || item.imagen3 || item.imagen4 || null;
        return resolveImg(src);
    };
    const tituloCorto = (titulo) => {
        if (!titulo) return '';
        return titulo.split(' ').slice(0, 3).join(' ');
    };

    const categoriasConProductos = categorias.filter(categoria =>
        productos?.some(producto => producto?.idCategoria === categoria?.idCategoria && isVisibleProduct(producto))
    );


    return (
        <div className='ProductsContain'>
            {isInAppBrowser && (
                <div className='installBanner'>
                    <span>Estas en navegador de redes. Abre en Chrome para instalar.</span>
                    <button type="button" onClick={handleOpenInChrome}>Copiar link</button>
                </div>
            )}
            {productos?.length > 0 && (
                <div className='categoriasInputs'>
                    <input
                        type="button"
                        value="Todo"
                        onClick={() => handleClickCategoria('Todo')}
                        style={{
                            ...(categoriaSeleccionada === 'Todo' ? selectedButtonStyle : unselectedButtonStyle)
                        }}
                    />
                    {categoriasConProductos.map(({ categoria, idCategoria }) => (
                        <input
                            key={idCategoria}
                            type="button"
                            value={categoria}
                            onClick={() => handleClickCategoria(idCategoria)}
                            style={{
                                ...(categoriaSeleccionada === idCategoria ? selectedButtonStyle : unselectedButtonStyle)
                            }}
                        />
                    ))}
                </div>
            )}


            {loading ? (
                <ProductosLoading />
            ) : (
                <div className='Products'>
                    {categoriaSeleccionada === 'Todo' && (
                        <>
                            {productos?.some(item => item.masVendido === "si" && isVisibleProduct(item)) && (
                                <div className='categoriSection'>
                                    <Swiper
                                        effect={'coverflow'}
                                        grabCursor={true}
                                        slidesPerView={'auto'}
                                        className='swiperContainerProducts'
                                        autoplay={{ delay: 3000 }}
                                    >
                                        {productos?.filter(item => item.masVendido === "si" && isVisibleProduct(item)).map(item => (
                                            <SwiperSlide key={item.idProducto} className='swiperSlideProductsMasvendido'>
                                                <Anchor className='cardProdcutmasVendido' to={`/producto/${item.idProducto}/${item.titulo.replace(/\s+/g, '-')}`}>
                                                    <img src={obtenerImagen(item)} alt="imagen" />
                                                    <h6 className='masVendido'>Más Vendido</h6>
                                                    <div className='cardText'>
                                                        <h4>{item.titulo}</h4>
                                                        <span>{item.descripcion}</span>
                                                        <div className='deFLexPrice'>
                                                            <h5> {moneda} {item?.precio}</h5>
                                                            {(item.precioAnterior >= 1 && item.precioAnterior !== undefined) && (
                                                                <h5 className='precioTachado'>{moneda} {item?.precioAnterior}</h5>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Anchor>
                                            </SwiperSlide>
                                        ))}
                                    </Swiper>
                                </div>
                            )}
                            {randomProducts.length > 0 && (
                                <div className='categoriSection showcaseSection'>
                                    <Swiper
                                        slidesPerView={'auto'}
                                        spaceBetween={10}
                                        slidesOffsetBefore={8}
                                        slidesOffsetAfter={8}
                                        centeredSlides={false}
                                        slidesPerGroup={1}
                                        autoplay={{ delay: 3500, disableOnInteraction: false, pauseOnMouseEnter: true, stopOnLastSlide: false }}
                                        loop={randomProducts.length > 1}
                                        watchOverflow={true}
                                        speed={500}
                                        className='randomShowcase'
                                    >
                                        {randomProducts.map(item => (
                                            <SwiperSlide key={`showcase-${item.idProducto}`} className='randomShowcaseSlide'>
                                                <Anchor
                                                    className='showcaseCard'
                                                    to={`/producto/${item.idProducto}/${item.titulo.replace(/\s+/g, '-')}`}
                                                    tabIndex={-1}
                                                >
                                                    <div className='showcaseBody'>
                                                        <img src={obtenerImagen(item)} alt={item.titulo} />
                                                        <span className='showcaseArrow'>{'>>'}</span>
                                                        <div className='showcaseOverlay'>
                                                            <h4>{tituloCorto(item.titulo)}</h4>
                                                            <div className='showcasePrices'>
                                                                <h5>{moneda} {item?.precio}</h5>
                                                                {(item.precioAnterior >= 1 && item.precioAnterior !== undefined) && (
                                                                    <h6 className='precioTachado'>{moneda} {item?.precioAnterior}</h6>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Anchor>
                                            </SwiperSlide>
                                        ))}
                                    </Swiper>
                                </div>
                            )}

                            {categoriasConProductos?.map(({ categoria, idCategoria }) => (
                                <div key={idCategoria} className='categoriSection' ref={ref => categoriasRefs.current[categorias.findIndex(cat => cat.idCategoria === idCategoria)] = ref}>
                                    <div className='deFlexTitlesection'>
                                        <h3>{categoria}</h3>
                                        <button onClick={() => handleClickCategoria(idCategoria)}>
                                            Ver más
                                        </button>
                                    </div>

                                    <Swiper
                                        effect={'coverflow'}
                                        grabCursor={true}
                                        slidesPerView={'auto'}
                                        className='swiperContainerProducts'
                                    >


                                        {productos?.filter(item => item.idCategoria === idCategoria && isVisibleProduct(item)).map(item => (
                                            <SwiperSlide className='swiperSlideProducts' key={item.idProducto}>
                                                <Anchor className='cardProdcut' key={item.idProducto} to={`/producto/${item.idProducto}/${item.titulo.replace(/\s+/g, '-')}`}>

                                                    <img src={obtenerImagen(item)} alt="imagen" />
                                                    <div className='cardText'>
                                                        <h4>{item.titulo}</h4>
                                                        <span>{item.descripcion}</span>
                                                        <div className='deFLexPrice'>
                                                            <h5> {moneda} {item?.precio}</h5>
                                                            {(item.precioAnterior >= 1 && item.precioAnterior !== undefined) && (
                                                                <h5 className='precioTachado'>{moneda} {item?.precioAnterior}</h5>
                                                            )}
                                                        </div>
                                                    </div>

                                                </Anchor>
                                            </SwiperSlide>
                                        ))}

                                    </Swiper>
                                </div>

                            ))}
                        </>
                    )}

                    <div className='categoriSectionSelected'>
                        {productos
                            ?.filter(item => categoriaSeleccionada !== 'Todo' && item.idCategoria === categoriaSeleccionada && isVisibleProduct(item))
                            ?.map(item => (
                                <Anchor key={item.idProducto} to={`/producto/${item.idProducto}/${item.titulo.replace(/\s+/g, '-')}`}>
                                    <div className='cardProdcutSelected'>
                                        <img src={obtenerImagen(item)} alt="imagen" />
                                        <div className='cardTextSelected'>
                                            <h4>{item.titulo}</h4>
                                            <span>{item.descripcion}</span>
                                            <div className='deFLexPrice'>
                                                <h5> {moneda} {item?.precio}</h5>
                                                {(item.precioAnterior >= 1 && item.precioAnterior !== undefined) && (
                                                    <h5 className='precioTachado'>{moneda} {item?.precioAnterior}</h5>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Anchor>
                            ))}
                    </div>
                </div>
            )}
            {showRegister && (
                <div className='subscriberOverlay'>
                    <div className='subscriberModal'>
                        <h3>Completa tus datos</h3>
                        <p>Necesitamos tu nombre y WhatsApp para enviarte ofertas y seguimiento.</p>
                        <p className='promoNote'>Cuando el navegador lo solicite, acepta las notificaciones.</p>
                        <input
                            type="text"
                            placeholder="Nombre y apellido"
                            value={registerName}
                            onChange={(e) => setRegisterName(e.target.value)}
                        />
                        <input
                            type="tel"
                            placeholder="WhatsApp"
                            value={registerPhone}
                            onChange={(e) => setRegisterPhone(e.target.value)}
                        />
                        {registerStatus && <span className='promoStatus'>{registerStatus}</span>}
                        <button type="button" className='promoButton' onClick={handleRegister}>
                            Confirmar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

