import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import './Detail.css'
import Modal from 'react-responsive-modal';
import ModalCart from 'react-modal';
import 'react-responsive-modal/styles.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faShoppingCart, faExternalLinkAlt, faStar, faTrash, faHeart } from '@fortawesome/free-solid-svg-icons';
import whatsappIcon from '../../images/wpp.png';
import { Link as Anchor, useNavigate, useLocation } from "react-router-dom";
import SwiperCore, { Navigation, Pagination, Autoplay } from 'swiper';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/swiper-bundle.css';
import baseURL from '../url';
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
    const [contactos, setContactos] = useState([]);
    const [favoritos, setFavoritos] = useState([]);
    const items = [producto?.item1, producto?.item2, producto?.item3, producto?.item4, producto?.item5, producto?.item6, producto?.item7, producto?.item8, producto?.item9, producto?.item10]
    const [categorias, setCategorias] = useState([]);
    // const [selectedItem, setSelectedItem] = useState(items[0] || "");
    const [selectedItemIndex, setSelectedItemIndex] = useState(0);
    const location = useLocation();

    useEffect(() => {
        cargarProductos();
        cargarContacto();
        cargarFavoritos();
        cargarCategoria()
        if (items.length > 0) {
            setSelectedItemIndex(0);
        }

    }, []);
    const handleSelectionChange = (index) => {
        setSelectedItemIndex(index);
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
    const cargarContacto = () => {
        fetch(`${baseURL}/contactoGet.php`, {
            method: 'GET',
        })
            .then(response => response.json())
            .then(data => {
                setContactos(data.contacto.reverse()[0] || []);
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

    const handleWhatsappMessage = () => {
        const phoneNumber = contactos?.telefono;
        const title = encodeURIComponent(producto?.titulo?.replace(/\s+/g, '-'));
        const formattedPrice = Number(producto?.precio).toLocaleString('es-ES', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        const item = items[selectedItemIndex];

        const message = `Hola 🌟, quisiera más información sobre\n\n✅ *${title}*\n     ${item}\n     ${moneda} ${formattedPrice}`;

        const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, '_blank');
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
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            const existingItemIndex = cart.findIndex(item =>
                item.idProducto === producto.idProducto
            );
            if (existingItemIndex !== -1) {
                const existingItem = cart[existingItemIndex];
                const updatedSabores = [...existingItem.item, selectedItem];
                const updatedCantidad = existingItem.cantidad + cantidad;
                cart[existingItemIndex] = { ...existingItem, item: updatedSabores, cantidad: updatedCantidad };
            } else {
                cart.push({ idProducto: producto.idProducto, item: [selectedItem], cantidad });
            }
            localStorage.setItem('cart', JSON.stringify(cart));
            cargarProductos();
            toast.success('Producto agregado', { autoClose: 400 });
            setTimeout(() => {
                window.location.reload();

            }, 600);
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
                            producto.imagen1 ?
                                (
                                    <SwiperSlide  >
                                        <img
                                            src={producto.imagen1}
                                            alt={producto.titulo}
                                            className="imagen1"
                                            onClick={() => {
                                                setModalImage(producto.imagen1);
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
                            producto.imagen2 ?
                                (
                                    <SwiperSlide  >
                                        <img
                                            src={producto.imagen2}
                                            alt={producto.titulo}
                                            className="imagen2"
                                            onClick={() => {
                                                setModalImage(producto.imagen2);
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
                            producto.imagen3 ?
                                (
                                    <SwiperSlide  >
                                        <img
                                            src={producto.imagen3}
                                            alt={producto.titulo}
                                            className="img"
                                            onClick={() => {
                                                setModalImage(producto.imagen3);
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
                            producto.imagen4 ?
                                (
                                    <SwiperSlide  >
                                        <img
                                            src={producto.imagen4}
                                            alt={producto.titulo}
                                            className="imagen4"
                                            onClick={() => {
                                                setModalImage(producto.imagen4);
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
                        {producto.stock >= 1 ? (
                            <h4 style={{ color: 'green', backgroundColor: '#ccffcc', padding: '0px 10px', borderRadius: '6px' }}>Stock {producto.stock}</h4>
                        ) : producto.stock <= 0 ? (
                            <h4 style={{ color: 'red', backgroundColor: '#ffc1c1', padding: '0px 10px', borderRadius: '6px' }}>Agotado</h4>
                        ) : (

                            <h4>{producto.stock}</h4>
                        )}
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
                    <p>{producto.descripcion}</p>
                    <div className='itemsDetail'>
                        {producto && items.length > 0 && items.map((item, index) => (
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


                    <div className='deFlexCart'>
                        <button onClick={decrementCantidad}>-</button>
                        <span>{cantidad}</span>
                        <button onClick={incrementCantidad}>+</button>
                    </div>
                    <div className='deFlexGoTocart'>
                        <button onClick={() => addToCart(items[selectedItemIndex])} className='btnAdd'>Agregar  <FontAwesomeIcon icon={faShoppingCart} />  </button>
                        <button className="wpp" onClick={handleWhatsappMessage}>
                            WhatsApp
                            <img src={whatsappIcon} alt="whatsappIcon" />
                        </button>
                    </div>
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





