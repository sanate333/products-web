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
import { formatCOP, parseCOP } from '../../utils/price';
import { buildProductPath } from '../../utils/publicLinks';

SwiperCore.use([Navigation, Pagination, Autoplay]);

export default function Products({ viewMode = 'home' }) {
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
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
    const [catalogoBanners, setCatalogoBanners] = useState([]);
    const isCatalogView = viewMode === 'catalogo';
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
        cargarBannersCatalogo();
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
        const hasImage = Boolean(item?.imagen1 || item?.imagen2 || item?.imagen3 || item?.imagen4 || item?.imagen || item?.image);
        return estado !== 'desactivado' && hasImage;
    };

    const normalizeProducto = (item, index) => {
        const idProducto = item.idProducto || item.id || `prod-${index}`;
        const idCategoria = item.idCategoria || item.categoria || item.category || 'general';
        return {
            idProducto,
            idCategoria,
            titulo: item.titulo || item.nombre || item.name || `Producto ${index + 1}`,
            descripcion: item.descripcion || '',
            precio: item.precio ?? item.price ?? 0,
            precioAnterior: item.precioAnterior ?? item.previousPrice,
            imagen1: item.imagen1 || item.imagen || item.image || null,
            imagen2: item.imagen2 || null,
            imagen3: item.imagen3 || null,
            imagen4: item.imagen4 || null,
            masVendido: item.masVendido || 'no',
            estadoProducto: item.estadoProducto || 'activo',
        };
    };

    const normalizeCategoria = (item, index) => ({
        idCategoria: item.idCategoria || item.id || item.slug || `cat-${index}`,
        categoria: item.categoria || item.nombre || item.name || `Categoria ${index + 1}`,
    });

    const buildShowcase = (loadedProducts) => {
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
        return showcase;
    };

    const cargarProductos = async () => {
        const endpoints = [`${baseURL}/productosGet.php`];

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint, { method: 'GET' });
                if (!response.ok) continue;
                const data = await response.json();
                const loadedProducts = (data.productos || data.data || []).map(normalizeProducto);
                if (!loadedProducts.length) continue;
                setProductos(loadedProducts);
                setRandomProducts(buildShowcase(loadedProducts));
                setLoading(false);
                return;
            } catch (error) {
                console.error('Error al cargar productos:', error);
            }
        }

        setProductos([]);
        setRandomProducts([]);
        setLoading(false);
    };

    const cargarCategorias = async () => {
        const endpoints = [`${baseURL}/categoriasGet.php`];

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint, { method: 'GET' });
                if (!response.ok) continue;
                const data = await response.json();
                const loadedCategorias = (data.categorias || data.data || []).map(normalizeCategoria);
                if (!loadedCategorias.length) continue;
                setCategorias(loadedCategorias);
                return;
            } catch (error) {
                console.error('Error al cargar categorias:', error);
            }
        }

        setCategorias([]);
    };
    const cargarBannersCatalogo = async () => {
        try {
            const response = await fetch(`${baseURL}/bannersGet.php?tipo=catalogo`, { method: 'GET' });
            if (!response.ok) {
                setCatalogoBanners([]);
                return;
            }
            const data = await response.json();
            const banners = (data?.banner || []).map((item, index) => ({
                id: item.idBanner || `catalogo-${index}`,
                imagen: resolveImg(item.imagen || item.image || ''),
            })).filter((item) => item.imagen);
            setCatalogoBanners(banners);
        } catch (error) {
            console.error('Error al cargar banner catalogo:', error);
            setCatalogoBanners([]);
        }
    };
    const obtenerImagen = (item) => {
        const src = item.imagen1 || item.imagen2 || item.imagen3 || item.imagen4 || null;
        return resolveImg(src);
    };
    const tituloConDosPalabras = (titulo) => {
        const words = String(titulo || '').trim().split(/\s+/).filter(Boolean);
        if (!words.length) return '';
        if (words.length <= 4) return words.join(' ');
        return words.slice(0, 4).join(' ');
    };
    const ahorroReal = (item) => {
        const precio = parseCOP(item?.precio);
        const anterior = parseCOP(item?.precioAnterior);
        const diff = anterior - precio;
        return diff > 0 ? diff : 0;
    };
    const ahorroLabel = (item) => ahorroReal(item);

    const categoriasBase = categorias.length
        ? categorias
        : Array.from(new Set(productos.map((p) => String(p.idCategoria))))
            .filter(Boolean)
            .map((idCategoria) => ({ idCategoria, categoria: String(idCategoria) }));

    const categoriasConProductos = categoriasBase.filter(categoria =>
        productos?.some(producto => String(producto?.idCategoria) === String(categoria?.idCategoria) && isVisibleProduct(producto))
    );
    const productosVisibles = productos.filter(isVisibleProduct);
    const productosMasVendidos = productosVisibles.filter((item) => item.masVendido === 'si');
    const cardsCatalogoHero = (productosMasVendidos.length ? productosMasVendidos : productosVisibles).slice(0, 2);
    const bannersCatalogoActivos = catalogoBanners.length ? catalogoBanners : [{ id: 'fallback-catalogo', imagen: '' }];


    return (
        <div className='ProductsContain'>
            {!isCatalogView && productos?.length > 0 && (
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
                                ...(String(categoriaSeleccionada) === String(idCategoria) ? selectedButtonStyle : unselectedButtonStyle)
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
                            {!isCatalogView && productos?.some(item => item.masVendido === "si" && isVisibleProduct(item)) && (
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
                                                <Anchor className='cardProdcutmasVendido' to={buildProductPath(item.idProducto, item.titulo)}>
                                                    <img src={obtenerImagen(item)} alt="imagen" />
                                                    <h6 className='masVendido'>Mas Vendido</h6>
                                                    <div className='cardText'>
                                                        <h4>{tituloConDosPalabras(item.titulo)}</h4>
                                                        <div className='deFLexPrice'>
                                                            <h5> {moneda} {formatCOP(item?.precio)}</h5>
                                                            {(item.precioAnterior >= 1 && item.precioAnterior !== undefined) && (
                                                                <h5 className='precioTachado'>{moneda} {formatCOP(item?.precioAnterior)}</h5>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Anchor>
                                            </SwiperSlide>
                                        ))}
                                    </Swiper>
                                </div>
                            )}
                            {!isCatalogView && randomProducts.length > 0 && (
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
                                                    to={buildProductPath(item.idProducto, item.titulo)}
                                                    tabIndex={-1}
                                                >
                                                    <div className='showcaseBody'>
                                                        <img src={obtenerImagen(item)} alt={item.titulo} />
                                                        <span className='showcaseArrow'>{'>>'}</span>
                                                        <div className='showcaseOverlay'>
                                                            <h4>{tituloConDosPalabras(item.titulo)}</h4>
                                                            <div className='showcasePrices'>
                                                                <h5>{moneda} {formatCOP(item?.precio)}</h5>
                                                                <h6 className='showcaseSaving'>Ahorra {moneda} {formatCOP(ahorroLabel(item))}</h6>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Anchor>
                                            </SwiperSlide>
                                        ))}
                                    </Swiper>
                                </div>
                            )}
                            {!isCatalogView && categoriasConProductos?.map(({ categoria, idCategoria }) => (
                                <div key={idCategoria} className='categoriSection'>
                                    <div className='deFlexTitlesection'>
                                        <h3>{categoria}</h3>
                                        <button onClick={() => handleClickCategoria(idCategoria)}>
                                            Ver mas
                                        </button>
                                    </div>
                                    <Swiper
                                        effect={'coverflow'}
                                        grabCursor={true}
                                        slidesPerView={'auto'}
                                        className='swiperContainerProducts'
                                    >
                                        {productos?.filter(item => String(item.idCategoria) === String(idCategoria) && isVisibleProduct(item)).map(item => (
                                            <SwiperSlide className='swiperSlideProducts' key={item.idProducto}>
                                                <Anchor className='cardProdcut' key={item.idProducto} to={buildProductPath(item.idProducto, item.titulo)}>
                                                    <img src={obtenerImagen(item)} alt="imagen" />
                                                    <div className='cardText'>
                                                        <h4>{tituloConDosPalabras(item.titulo)}</h4>
                                                        <span>{item.descripcion}</span>
                                                        <div className='deFLexPrice'>
                                                            <h5> {moneda} {formatCOP(item?.precio)}</h5>
                                                            {(item.precioAnterior >= 1 && item.precioAnterior !== undefined) && (
                                                                <h5 className='precioTachado'>{moneda} {formatCOP(item?.precioAnterior)}</h5>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Anchor>
                                            </SwiperSlide>
                                        ))}
                                    </Swiper>
                                </div>
                            ))}
                            {isCatalogView && (
                            <>
                            <div id='catalogo-home' className='catalogoHeroSection'>
                                <Swiper
                                    slidesPerView={1}
                                    loop={bannersCatalogoActivos.length > 1}
                                    autoplay={bannersCatalogoActivos.length > 1 ? { delay: 3000, disableOnInteraction: false } : false}
                                    speed={700}
                                    pagination={{ clickable: true }}
                                    className='catalogoHeroSwiper'
                                >
                                    {bannersCatalogoActivos.map((bannerItem) => (
                                        <SwiperSlide key={`catalogo-banner-${bannerItem.id}`}>
                                            <div
                                                className={bannerItem.imagen ? 'catalogoHeroBanner' : 'catalogoHeroBanner noImage'}
                                                style={bannerItem.imagen ? { backgroundImage: `url(${bannerItem.imagen})` } : undefined}
                                            >
                                                <div className='catalogoHeroShade' />
                                                <div className='catalogoHeroCards'>
                                                    {cardsCatalogoHero.map((item) => (
                                                        <Anchor
                                                            key={`catalogo-hero-${bannerItem.id}-${item.idProducto}`}
                                                            className='catalogoHeroCard'
                                                            to={buildProductPath(item.idProducto, item.titulo)}
                                                        >
                                                            <span className='catalogoHeroTag'>Mas Vendido</span>
                                                            <img src={obtenerImagen(item)} alt={item.titulo} />
                                                            <h4>{tituloConDosPalabras(item.titulo)}</h4>
                                                            <div className='deFLexPrice'>
                                                                <h5>{moneda} {formatCOP(item?.precio)}</h5>
                                                                {(item.precioAnterior >= 1 && item.precioAnterior !== undefined) && (
                                                                    <h5 className='precioTachado'>{moneda} {formatCOP(item?.precioAnterior)}</h5>
                                                                )}
                                                            </div>
                                                        </Anchor>
                                                    ))}
                                                </div>
                                            </div>
                                        </SwiperSlide>
                                    ))}
                                </Swiper>
                            </div>
                            {randomProducts.length > 0 && (
                                <div className='categoriSection showcaseSection'>
                                    <div className='deFlexTitlesection'>
                                        <h3>Recien agregados</h3>
                                    </div>
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
                                            <SwiperSlide key={`catalog-showcase-${item.idProducto}`} className='randomShowcaseSlide'>
                                                <Anchor
                                                    className='showcaseCard'
                                                    to={buildProductPath(item.idProducto, item.titulo)}
                                                    tabIndex={-1}
                                                >
                                                    <div className='showcaseBody'>
                                                        <img src={obtenerImagen(item)} alt={item.titulo} />
                                                        <span className='showcaseArrow'>{'>>'}</span>
                                                        <div className='showcaseOverlay'>
                                                            <h4>{tituloConDosPalabras(item.titulo)}</h4>
                                                            <div className='showcasePrices'>
                                                                <h5>{moneda} {formatCOP(item?.precio)}</h5>
                                                                <h6 className='showcaseSaving'>Ahorra {moneda} {formatCOP(ahorroLabel(item))}</h6>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Anchor>
                                            </SwiperSlide>
                                        ))}
                                    </Swiper>
                                </div>
                            )}
                            <div className='categoriSection'>
                                <div className='deFlexTitlesection'>
                                    <h3>Catalogo</h3>
                                </div>
                                <div className='catalogoGrid'>
                                    {productosVisibles.map((item) => (
                                        <Anchor
                                            className='catalogoGridCard'
                                            key={`catalogo-grid-${item.idProducto}`}
                                            to={buildProductPath(item.idProducto, item.titulo)}
                                        >
                                            <img src={obtenerImagen(item)} alt={item.titulo} />
                                            <div className='catalogoGridText'>
                                                <h4>{tituloConDosPalabras(item.titulo)}</h4>
                                                <h5>{moneda} {formatCOP(item?.precio)}</h5>
                                            </div>
                                        </Anchor>
                                    ))}
                                </div>
                            </div>
                            </>
                            )}
                        </>
                    )}

                    <div className='categoriSectionSelected'>
                        {productos
                            ?.filter(item => categoriaSeleccionada !== 'Todo' && String(item.idCategoria) === String(categoriaSeleccionada) && isVisibleProduct(item))
                            ?.map(item => (
                                <Anchor key={item.idProducto} to={buildProductPath(item.idProducto, item.titulo)}>
                                    <div className='cardProdcutSelected'>
                                        <img src={obtenerImagen(item)} alt="imagen" />
                                        <div className='cardTextSelected'>
                                            <h4>{tituloConDosPalabras(item.titulo)}</h4>
                                            <span>{item.descripcion}</span>
                                            <div className='deFLexPrice'>
                                                <h5> {moneda} {formatCOP(item?.precio)}</h5>
                                                {(item.precioAnterior >= 1 && item.precioAnterior !== undefined) && (
                                                    <h5 className='precioTachado'>{moneda} {formatCOP(item?.precioAnterior)}</h5>
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
