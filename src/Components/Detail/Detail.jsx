import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import './Detail.css'
import Modal from 'react-responsive-modal';
import ModalCart from 'react-modal';
import 'react-responsive-modal/styles.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faExternalLinkAlt, faStar, faTrash, faHeart } from '@fortawesome/free-solid-svg-icons';
import { Link as Anchor, useNavigate, useLocation } from "react-router-dom";
import SwiperCore, { Navigation, Pagination, Autoplay } from 'swiper';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/swiper-bundle.css';
import baseURL, { resolveImg } from '../url';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DetailLoading from "../DetailLoading/DetailLoading";
import moneda from '../moneda';

export default function Detail() {
    const navigate = useNavigate();
    const swiperRef = useRef(null);
    SwiperCore.use([Navigation, Pagination, Autoplay]);
    const { idProducto } = useParams();
    const [producto, setProducto] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalImage, setModalImage] = useState("");
    const [cantidad, setCantidad] = useState(1);
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [favoritos, setFavoritos] = useState([]);
    const items = [producto?.item1, producto?.item2, producto?.item3, producto?.item4, producto?.item5, producto?.item6]
    const [categorias, setCategorias] = useState([]);
    // const [selectedItem, setSelectedItem] = useState(items[0] || "");
    const [selectedItemIndex, setSelectedItemIndex] = useState(0);
    const location = useLocation();
    const hasVariants = String(producto?.tieneVariantes).toLowerCase() === 'si'
        || producto?.tieneVariantes === true
        || producto?.tieneVariantes === 1;
    const variantItems = hasVariants
        ? items.filter((item) => item && String(item).trim() !== '0')
        : [];

    useEffect(() => {
        cargarProductos();
        cargarFavoritos();
        cargarCategoria()
        if (items.length > 0) {
            setSelectedItemIndex(0);
        }

    }, []);
    const handleSelectionChange = (index) => {
        setSelectedItemIndex(index);
    };

    const getVariantMultiplier = (item) => {
        if (!item) return 1;
        const match = String(item).match(/\d+/);
        const value = match ? parseInt(match[0], 10) : 1;
        if (Number.isNaN(value) || value <= 0) {
            return 1;
        }
        return value;
    };
    const cargarCategoria = () => {
        fetch(`${baseURL}/categoriasGet.php`, {
            method: 'GET',
        })
            .then(response => response.json())
            .then(data => {
                setCategorias(data.categorias || []);
                console.log(data.categorias)
            })
            .catch(error => console.error('Error al cargar contactos:', error));
    };
    const cargarProductos = () => {
        fetch(`${baseURL}/productosGet.php`, {
            method: 'GET',
        })
            .then(response => response.json())
            .then(data => {
                setProductos(data.productos || []);
                console.log(data.productos)
                setLoading(false);
            })
            .catch(error => {
                console.error('Error al cargar productos:', error)
                setLoading(true);
            });
    };


    const cargarFavoritos = () => {
        const storedFavoritos = JSON.parse(localStorage.getItem('favoritos')) || [];
        setFavoritos(storedFavoritos);
    };

    useEffect(() => {
        const product = productos.find((e) => e.idProducto === parseInt(idProducto));
        setProducto(product);
    }, [idProducto, productos]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);




    function handleCompartirClick() {
        if (navigator.share) {
            navigator.share({
                title: document.title,
                text: 'Echa un vistazo a este producto',
                url: window.location.href,
            })
                .then(() => console.log('Contenido compartido correctamente'))
                .catch((error) => console.error('Error al compartir:', error));
        } else {
            console.error('La API de compartir no está disponible en este navegador.');
        }
    }

    const handleOpenCheckout = () => {
        addToCartForCheckout(variantItems[selectedItemIndex]);
    };

    const addToCartForCheckout = (selectedItem) => {
        if (!producto) {
            return;
        }
        if (producto.stock < 1) {
            toast.error('No hay stock', { autoClose: 400 });
            return;
        }
        const variantMultiplier = hasVariants ? getVariantMultiplier(selectedItem) : 1;
        const cantidadFinal = cantidad * variantMultiplier;
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const existingItemIndex = cart.findIndex(item =>
            item.idProducto === producto.idProducto
        );
        if (existingItemIndex !== -1) {
            const existingItem = cart[existingItemIndex];
            const updatedSabores = [...existingItem.item, selectedItem];
            const updatedCantidad = existingItem.cantidad + cantidadFinal;
            cart[existingItemIndex] = { ...existingItem, item: updatedSabores, cantidad: updatedCantidad };
        } else {
            cart.push({ idProducto: producto.idProducto, item: [selectedItem], cantidad: cantidadFinal });
        }
        localStorage.setItem('cart', JSON.stringify(cart));

    };

    const goBack = () => {
        if (location.key !== 'default') {
            navigate(-1);
        } else {
            navigate('/');
        }
    };




    const addToCart = (selectedItem) => {
        if (producto) {
            if (producto.stock < 1) {
                toast.error('No hay stock', { autoClose: 400 });
                return;
            }
            const variantMultiplier = hasVariants ? getVariantMultiplier(selectedItem) : 1;
            const cantidadFinal = cantidad * variantMultiplier;
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            const existingItemIndex = cart.findIndex(item =>
                item.idProducto === producto.idProducto
            );
            if (existingItemIndex !== -1) {
                const existingItem = cart[existingItemIndex];
                const updatedSabores = [...existingItem.item, selectedItem];
                const updatedCantidad = existingItem.cantidad + cantidadFinal;
                cart[existingItemIndex] = { ...existingItem, item: updatedSabores, cantidad: updatedCantidad };
            } else {
                cart.push({ idProducto: producto.idProducto, item: [selectedItem], cantidad: cantidadFinal });
            }
            localStorage.setItem('cart', JSON.stringify(cart));
            cargarProductos();
            window.dispatchEvent(new Event('cartUpdated'));
    
        }
    };

    const incrementCantidad = () => {
        setCantidad(cantidad + 1);
    };

    const decrementCantidad = () => {
        if (cantidad > 1) {
            setCantidad(cantidad - 1);
        }
    };


    const agregarAFavoritos = (idProducto) => {
        const favList = [...favoritos];
        const index = favList.indexOf(idProducto);
        if (index === -1) {
            // Si el producto no está en favoritos, lo agregamos
            favList.push(idProducto);
            setFavoritos(favList);
            localStorage.setItem('favoritos', JSON.stringify(favList));
            console.log('Producto agregado a favoritos');

        } else {
            // Si el producto está en favoritos, lo eliminamos
            favList.splice(index, 1);
            setFavoritos(favList);
            localStorage.setItem('favoritos', JSON.stringify(favList));
            console.log('Producto eliminado de favoritos');
        }
    };



    if (!producto) {
        return <DetailLoading />;
    }


    return (


        <div className="detail">

            <ToastContainer />
            <div className="deFlexDetail">
                <button className="back" onClick={goBack}> <FontAwesomeIcon icon={faArrowLeft} /> </button>

                <div className="deFLexIcon">
                    <button onClick={() => agregarAFavoritos(producto.idProducto)} className='favoritos-btn'>
                        <FontAwesomeIcon icon={faHeart} style={{ color: favoritos.includes(producto.idProducto) ? 'red' : 'gray' }} />
                    </button>
                    <button className="share" onClick={handleCompartirClick}> <FontAwesomeIcon icon={faExternalLinkAlt} /> </button>
                </div>


            </div>
            <div className="detail-contain">
                <SwiperSlide id={"swiperDetail"} >
                    <Swiper
                        effect={'coverflow'}
                        grabCursor={true}
                        loop={true}
                        slidesPerView={'auto'}
                        coverflowEffect={{ rotate: 0, stretch: 0, depth: 100, modifier: 2.5 }}
                        navigation={{ nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' }}
                        autoplay={{ delay: 3000 }} // Cambia el valor de 'delay' según tus preferencias
                        pagination={{ clickable: true, }}
                        onSwiper={(swiper) => {
                            console.log(swiper);
                            swiperRef.current = swiper;
                        }}

                    >

                        {
                            resolveImg(producto.imagen1) ?
                                (
                                    <SwiperSlide  >
                                        <img
                                            src={resolveImg(producto.imagen1)}
                                            alt={producto.titulo}
                                            className="imagen1"
                                            onClick={() => {
                                                setModalImage(resolveImg(producto.imagen1));
                                                setIsModalOpen(true);
                                            }}
                                        />
                                    </SwiperSlide>
                                ) : (
                                    <>
                                    </>
                                )
                        }

                        {
                            resolveImg(producto.imagen2) ?
                                (
                                    <SwiperSlide  >
                                        <img
                                            src={resolveImg(producto.imagen2)}
                                            alt={producto.titulo}
                                            className="imagen2"
                                            onClick={() => {
                                                setModalImage(resolveImg(producto.imagen2));
                                                setIsModalOpen(true);
                                            }}
                                        />
                                    </SwiperSlide>
                                ) : (
                                    <>
                                    </>
                                )
                        }
                        {
                            resolveImg(producto.imagen3) ?
                                (
                                    <SwiperSlide  >
                                        <img
                                            src={resolveImg(producto.imagen3)}
                                            alt={producto.titulo}
                                            className="img"
                                            onClick={() => {
                                                setModalImage(resolveImg(producto.imagen3));
                                                setIsModalOpen(true);
                                            }}
                                        />
                                    </SwiperSlide>
                                ) : (
                                    <>
                                    </>
                                )
                        }
                        {
                            resolveImg(producto.imagen4) ?
                                (
                                    <SwiperSlide  >
                                        <img
                                            src={resolveImg(producto.imagen4)}
                                            alt={producto.titulo}
                                            className="imagen4"
                                            onClick={() => {
                                                setModalImage(resolveImg(producto.imagen4));
                                                setIsModalOpen(true);
                                            }}
                                        />
                                    </SwiperSlide>
                                ) : (
                                    <>
                                    </>
                                )
                        }
                    </Swiper>
                </SwiperSlide>
                <div className="textDetail">
                    <h2 className="title">{producto.titulo}</h2>
                    <hr />
                    <div className="deFLexBuet">
                        {
                            categorias
                                .filter(categoriaFiltrada => categoriaFiltrada.idCategoria === producto.idCategoria)
                                .map(categoriaFiltrada => (
                                    <h4>  <FontAwesomeIcon icon={faStar} />{categoriaFiltrada.categoria}</h4>

                                ))
                        }
                    </div>

                    <div className='deFLexPrice'>
                        <h5 className="price">
                            {moneda} {producto?.precio}

                        </h5>

                        {
                            (producto?.precioAnterior >= 1 && producto?.precioAnterior !== undefined) && (
                                <h5 className='precioTachadoDetail'>{moneda} {producto?.precioAnterior}</h5>
                            )
                        }


                    </div>
                    <div className='deFlexCart'>
                        <button onClick={decrementCantidad}>-</button>
                        <span>{Math.max(cantidad, 1)}</span>
                        <button onClick={incrementCantidad}>+</button>
                    </div>
                    <div className='deFlexGoTocart'>
                        <button onClick={() => addToCart(variantItems[selectedItemIndex])} className='btnAdd'>
                            Agregar al carrito 🛒
                        </button>
                    </div>
                    <p className='detailDescription'>{producto.descripcion}</p>
                    {hasVariants && variantItems.length > 0 && (
                        <div className='itemsDetail'>
                            {variantItems.map((item, index) => (
                                item && (
                                    <label key={index}>
                                        <input
                                            type="radio"
                                            name="talle"
                                            value={item}
                                            checked={selectedItemIndex === index}
                                            onChange={() => handleSelectionChange(index)}
                                        />
                                        {item}
                                    </label>
                                )
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <Modal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                center
                classNames={{
                    modal: 'custom-modal',
                }}
            >
                <img src={modalImage} alt={producto.titulo} />
            </Modal>
        </div>

    )
}











