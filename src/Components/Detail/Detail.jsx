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
import Swal from 'sweetalert2';
import contador from '../contador'
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
    const [selectedItem, setSelectedItem] = useState('');
    const [mesas, setMesas] = useState([]);
    const [idMesa, setIdMesa] = useState('');
    const [estado, setEstado] = useState('Pendiente');

    const [mensaje, setMensaje] = useState('');
    const [selectedMesa, setSelectedMesa] = useState('');
    useEffect(() => {
        cargarProductos();
        cargarContacto();
        cargarFavoritos();
        cargarMesas();
    }, []);

    const [counter, setCounter] = useState(contador);
    const [isPaused, setIsPaused] = useState(false);
    useEffect(() => {
        const interval = setInterval(() => {
            if (!isPaused) {
                setCounter((prevCounter) => {
                    if (prevCounter === 1) {
                        recargar();
                        return contador;
                    }
                    return prevCounter - 1;
                });
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isPaused]);
    const togglePause = () => {
        setIsPaused(!isPaused);
    };
    const recargar = () => {
        cargarMesas();

    };
    const cargarMesas = () => {
        fetch(`${baseURL}/mesaGet.php`, {
            method: 'GET',
        })
            .then(response => response.json())
            .then(data => {
                setMesas(data.mesas || []);
            })
            .catch(error => console.error('Error al cargar mesas:', error));
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
        const formattedPrice = Number(producto?.precio).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        const price = encodeURIComponent(formattedPrice);
        const category = encodeURIComponent(producto?.categoria);
        const item = selectedItem;
        const message = `Hola, quisiera más información sobre\n\n *${title}*
        \nCategoría: ${category}
        \n - ${item}
        \n ${moneda} ${formattedPrice}`;

        const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, '_blank');
    };

    const goBack = () => {
        navigate(-1);
    };



    const addToCart = () => {
        if (producto) {
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            // Verificar si existe un producto con el mismo ID en el carrito
            const existingItemIndex = cart.findIndex(item =>
                item.idProducto === producto.idProducto
            );
            if (existingItemIndex !== -1) {
                // Si el producto ya existe en el carrito, agregamos el nuevo sabor al array de sabores
                const existingItem = cart[existingItemIndex];
                const updatedItems = [...existingItem.item, selectedItem]; // Agregar el nuevo sabor

                // Actualizar la cantidad del producto existente en el carrito
                const updatedCantidad = existingItem.cantidad + cantidad;

                // Actualizar el producto existente en el carrito con el nuevo sabor y cantidad
                cart[existingItemIndex] = { ...existingItem, item: updatedItems, cantidad: updatedCantidad };
            } else {
                // Si el producto no existe en el carrito, lo agregamos con el sabor seleccionado
                cart.push({ idProducto: producto.idProducto, item: [selectedItem], cantidad });
            }

            // Actualizamos el carrito en el localStorage
            localStorage.setItem('cart', JSON.stringify(cart));
            // Agregamos la llamada a cargarProductos para actualizar la lista de productos en Products
            cargarProductos();
            toast.success('Producto agregado', { autoClose: 500 });

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


    // carrito------------------------------------------------------
    const [cartItems, setCartItems] = useState([]);
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [modalIsOpen2, setModalIsOpen2] = useState(false);
    const [modalIsOpen3, setModalIsOpen3] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [location, setLocation] = useState('');
    const [name, setName] = useState('');
    const [codigo, setCodigo] = useState('');
    const [descuento, setDescuento] = useState(0);
    const [codigoValido, setCodigoValido] = useState(false);
    const [totalPrice, setTotalPrice] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('efectivo');
    const [deliveryOption, setDeliveryOption] = useState('delivery');

    useEffect(() => {
        // Calcular el precio total al cargar el carrito o al actualizar los productos
        let totalPriceCalc = 0;
        cartItems.forEach(item => {
            totalPriceCalc += item.precio * item.cantidad;
        });
        setTotalPrice(totalPriceCalc);
    }, [cartItems]);

    useEffect(() => {
        const fetchCartItems = async () => {
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            const promises = cart.map(async (cartItem) => {
                const producto = productos.find(producto => producto.idProducto === cartItem.idProducto);
                return {
                    ...producto,
                    cantidad: cartItem.cantidad,
                    item: cartItem.item,
                };
            });

            Promise.all(promises)
                .then((items) => {
                    setCartItems(items);
                    setLoading(false);
                })
                .catch((error) => {
                    console.error('Error al obtener detalles del carrito:', error);
                    setLoading(false);
                });
        };

        fetchCartItems();
    }, [productos, isFocused]);



    const obtenerImagen = (item) => {
        return item.imagen1 || item.imagen2 || item.imagen3 || item.imagen4 || null;
    };

    const openModal = () => {
        setModalIsOpen(true);
        setIsFocused(true);
    };

    const closeModal = () => {
        setModalIsOpen(false);
        setIsFocused(false);
    };

    const openModal2 = () => {
        setModalIsOpen2(true);
    };

    const closeModal2 = () => {
        setModalIsOpen2(false);
    };
    const openModal3 = () => {
        setModalIsOpen3(true);
    };

    const closeModal3 = () => {
        setModalIsOpen3(false);
    };
    const removeFromCart = (id) => {
        const updatedCart = cartItems.filter(item => item.idProducto !== id);
        setCartItems(updatedCart);
        localStorage.setItem('cart', JSON.stringify(updatedCart));
    };

    const clearCart = () => {
        setCartItems([]);
        localStorage.removeItem('cart');
    };

    const [codigos, setCodigos] = useState([]);

    useEffect(() => {
        cargarCodigos();

    }, []);

    const cargarCodigos = () => {
        fetch(`${baseURL}/codigosGet.php`, {
            method: 'GET',
        })
            .then(response => response.json())
            .then(data => {
                setCodigos(data.codigos || []);
            })
            .catch(error => console.error('Error al cargar códigos:', error));
    };

    const handleWhatsappMessageCart = () => {
        const codigoDescuento = codigos.find(item => item.codigo === codigo);
        let descuentoActualizado = 0;

        if (codigoDescuento) {
            descuentoActualizado = codigoDescuento.descuento;
            setCodigoValido(true);
        } else {
            setCodigoValido(false);
        }

        let totalPrice = 0;

        cartItems.forEach(item => {
            totalPrice += item.precio * item.cantidad;
        });

        // Aplicar descuento y asegurarse de que el precio no sea negativo
        let totalPriceWithDiscount = totalPrice - descuentoActualizado;
        if (totalPriceWithDiscount < 0) {
            totalPriceWithDiscount = 0; // O cualquier otro manejo que desees
        }

        const formattedTotalPrice = totalPriceWithDiscount.toFixed(2);

        const phoneNumber = `${contactos.telefono}`;

        const cartDetails = cartItems.map((item) => (
            `\n*${item.titulo}*\nCantidad: ${item.cantidad} \n${item?.item}\nPrecio: ${moneda} ${item.precio}\n`
        ));

        let noteMessage = '';


        if (name.trim() !== '') {
            noteMessage += `\nNombre: ${name}`;
        }

        if (noteText.trim() !== '') {
            noteMessage += `\nNota: ${noteText}`;
        }
        if (codigo.trim() !== '') {
            noteMessage += `\nCodigo : ${codigo}\nDescuento de : ${moneda} ${descuentoActualizado}`;
        }

        const paymentMessage = paymentMethod === 'efectivo' ? 'Pago en efectivo' : 'Pago por transferencia bancaria';
        const paymentMessage2 = deliveryOption === 'delivery' ? 'Envio a domicilio' : 'Retiro personalmente';


        const message = `¡Hola! 🌟 Estoy interesado en encargar:\n${cartDetails.join('')}\n------------------------------------>\n ${noteMessage}\n${paymentMessage2}\n${paymentMessage}\n\n------------------------------------>\n\n*Total: ${moneda} ${formattedTotalPrice}*`;

        const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, '_blank');
        setName('');
        setLocation('');
        setNoteText('');
        setCodigo('');
        setDescuento(descuentoActualizado);
        setModalIsOpen(false);
        setModalIsOpen2(false);
    };
    if (!producto) {
        return <DetailLoading />;
    }
    // Función para aumentar la cantidad de un producto en el carrito
    const increaseQuantity = (index) => {
        const updatedCartItems = [...cartItems];
        updatedCartItems[index].cantidad += 1;
        setCartItems(updatedCartItems);
        localStorage.setItem('cart', JSON.stringify(updatedCartItems));
    };

    // Función para disminuir la cantidad de un producto en el carrito
    const decreaseQuantity = (index) => {
        const updatedCartItems = [...cartItems];
        if (updatedCartItems[index].cantidad > 1) {
            updatedCartItems[index].cantidad -= 1;
            setCartItems(updatedCartItems);
            localStorage.setItem('cart', JSON.stringify(updatedCartItems));
        }
    };


    /* realizar pedidos------------------------*/

    const crearPedido = async () => {
        setMensaje('Procesando...');

        try {
            // Construir la lista de productos del pedido
            const productosPedido = cartItems.map(item => {
                return {
                    titulo: item.titulo,
                    cantidad: item.cantidad,
                    item: item.item,
                    categoria: item.categoria,
                    precio: item.precio,
                    imagen: obtenerImagen(item)
                }
            });
            // Convertir la lista de productos a JSON
            const productosPedidoJSON = JSON.stringify(productosPedido);
            // Calcular el precio total del pedido
            let totalPrice = 0;
            cartItems.forEach(item => {
                totalPrice += item.precio * item.cantidad;
            });

            // Obtener el descuento del código de descuento
            const codigoDescuento = codigos.find(item => item.codigo === codigo);
            let descuentoCodigo = 0;

            if (codigoDescuento) {
                descuentoCodigo = codigoDescuento.descuento;
            }

            // Aplicar el descuento del código de descuento
            const totalPriceWithDiscount = totalPrice - descuentoCodigo;

            // Enviar el pedido con el precio total descontado
            const formData = new FormData();
            formData.append('idMesa', idMesa);
            formData.append('estado', estado);
            formData.append('productos', productosPedidoJSON);
            formData.append('total', totalPriceWithDiscount);
            formData.append('nombre', name);
            formData.append('nota', noteText);
            formData.append('codigo', codigo);
            const response = await fetch(`${baseURL}/pedidoPost.php`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (data.mensaje) {
                setMensaje('');
                Swal.fire(
                    'Pedido enviado!',
                    data.mensaje,
                    'success'
                );
                setName('')
                setCodigo('')
                setNoteText('')
                cargarMesas()
                closeModal()
                closeModal2()
                closeModal3()
                clearCart()
            } else if (data.error) {
                setMensaje('');
                toast.error(data.error, { autoClose: 1000 });
            }
        } catch (error) {
            console.error('Error:', error);
            setMensaje('');
            toast.error('Error de conexión. Por favor, inténtelo de nuevo.', { autoClose: 1000 });
        }
    };


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
                    <h4>  <FontAwesomeIcon icon={faStar} />{producto.categoria}</h4>
                    <div className='deFLexPrice'>
                        <h5 className="price">
                            {moneda} {producto?.precio}
                        </h5>
                        {
                            (producto?.precioAnterior > 0 && producto?.precioAnterior !== undefined) && (
                                <h5 className='precioTachadoDetail'>{moneda} {producto?.precioAnterior}</h5>
                            )
                        }
                    </div>
                    <p>{producto.descripcion}</p>
                    <div className='itemsDetail'>
                        {producto.item1 && (
                            <label>
                                <input
                                    type="radio"
                                    name="talle"
                                    value={producto.item1}
                                    checked={selectedItem === producto.item1}
                                    onChange={(e) => setSelectedItem(e.target.value)}
                                />
                                {producto.item1}
                            </label>
                        )}
                        {producto.item2 && (
                            <label>
                                <input
                                    type="radio"
                                    name="talle"
                                    value={producto.item2}
                                    checked={selectedItem === producto.item2}
                                    onChange={(e) => setSelectedItem(e.target.value)}
                                />
                                {producto.item2}
                            </label>
                        )}
                        {producto.item3 && (
                            <label>
                                <input
                                    type="radio"
                                    name="talle"
                                    value={producto.item3}
                                    checked={selectedItem === producto.item3}
                                    onChange={(e) => setSelectedItem(e.target.value)}
                                />
                                {producto.item3}
                            </label>
                        )}
                        {producto.item4 && (
                            <label>
                                <input
                                    type="radio"
                                    name="talle"
                                    value={producto.item4}
                                    checked={selectedItem === producto.item4}
                                    onChange={(e) => setSelectedItem(e.target.value)}
                                />
                                {producto.item4}
                            </label>
                        )}
                        {producto.item5 && (
                            <label>
                                <input
                                    type="radio"
                                    name="talle"
                                    value={producto.item5}
                                    checked={selectedItem === producto.item5}
                                    onChange={(e) => setSelectedItem(e.target.value)}
                                />
                                {producto.item5}
                            </label>
                        )}
                        {producto.item6 && (
                            <label>
                                <input
                                    type="radio"
                                    name="talle"
                                    value={producto.item6}
                                    checked={selectedItem === producto.item6}
                                    onChange={(e) => setSelectedItem(e.target.value)}
                                />
                                {producto.item6}
                            </label>
                        )}
                        {producto.item7 && (
                            <label>
                                <input
                                    type="radio"
                                    name="talle"
                                    value={producto.item7}
                                    checked={selectedItem === producto.item7}
                                    onChange={(e) => setSelectedItem(e.target.value)}
                                />
                                {producto.item7}
                            </label>
                        )}
                        {producto.item8 && (
                            <label>
                                <input
                                    type="radio"
                                    name="talle"
                                    value={producto.item8}
                                    checked={selectedItem === producto.item8}
                                    onChange={(e) => setSelectedItem(e.target.value)}
                                />
                                {producto.item8}
                            </label>
                        )}
                        {producto.item9 && (
                            <label>
                                <input
                                    type="radio"
                                    name="talle"
                                    value={producto.item9}
                                    checked={selectedItem === producto.item9}
                                    onChange={(e) => setSelectedItem(e.target.value)}
                                />
                                {producto.item9}
                            </label>
                        )}
                        {producto.item10 && (
                            <label>
                                <input
                                    type="radio"
                                    name="talle"
                                    value={producto.item10}
                                    checked={selectedItem === producto.item10}
                                    onChange={(e) => setSelectedItem(e.target.value)}
                                />
                                {producto.item10}
                            </label>
                        )}
                    </div>
                    <div className='deFlexCart'>
                        <button onClick={decrementCantidad}>-</button>
                        <span>{cantidad}</span>
                        <button onClick={incrementCantidad}>+</button>
                    </div>
                    <div className='deFlexGoTocart'>
                        <button onClick={addToCart} className='btnAdd'>Agregar  <FontAwesomeIcon icon={faShoppingCart} />  </button>
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


            <div>

                <button onClick={openModal} className='cartIconFixed'>
                    {
                        cartItems?.length >= 1 && (
                            <span>{cartItems.length}</span>
                        )

                    }
                    <FontAwesomeIcon icon={faShoppingCart} />
                </button>

                <ModalCart
                    isOpen={modalIsOpen}
                    className="modal-cart"
                    overlayClassName="overlay-cart"
                    onRequestClose={closeModal}
                >
                    <div className='deFLex'>
                        <button onClick={closeModal} ><FontAwesomeIcon icon={faArrowLeft} />  </button>
                        <button onClick={clearCart} className='deleteToCart'>Vaciar carrito</button>
                    </div>
                    {cartItems?.length === 0 ?
                        (<p className='nohay'> No hay productos</p>)
                        : (<>
                            <div className="modal-content-cart">


                                {loading ? (
                                    <p>Cargando...</p>
                                ) : (
                                    <div>

                                        {cartItems.map((item, index) => (
                                            <div key={item?.idProducto} className='cardProductCart' >
                                                <Anchor to={`/producto/${item?.idProducto}/${item?.titulo?.replace(/\s+/g, '-')}`} onClick={closeModal}>
                                                    <img src={obtenerImagen(item)} alt="imagen" />
                                                </Anchor>
                                                <div className='cardProductCartText'>
                                                    <h3>{item.titulo}</h3>
                                                    <span>
                                                        {item?.item?.map((sabor, index) => (
                                                            <span key={index}> {sabor}</span>
                                                        ))}
                                                    </span>
                                                    <strong>{moneda} {item?.precio}</strong>
                                                </div>
                                                <div className='deColumn'>
                                                    <button onClick={() => removeFromCart(item.idProducto)} className='deleteCart'>  <FontAwesomeIcon icon={faTrash} /></button>
                                                    <div className='deFlexCantidad'>
                                                        <button onClick={() => decreaseQuantity(index)}>-</button>
                                                        <span>{item.cantidad}</span>
                                                        <button onClick={() => increaseQuantity(index)}>+</button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className='deColumnCart'>
                                <h4>Total: {moneda} {totalPrice.toFixed(2)}</h4>
                                <div className='deFLexBtns'>
                                    <button className='btnWpp' onClick={openModal2}>
                                        Pedir por <img src={whatsappIcon} alt="WhatsApp" />
                                    </button>
                                    <button className='btn' onClick={openModal3}>
                                        Pedí en tu mesa
                                    </button>
                                </div>
                            </div>

                            <ModalCart
                                isOpen={modalIsOpen2}
                                onRequestClose={closeModal2}
                                className="modal-cart"
                                overlayClassName="overlay-cart"
                            >
                                <div className='deFLex'>
                                    <button onClick={closeModal2} ><FontAwesomeIcon icon={faArrowLeft} />  </button>
                                    <h4>Agregar Detalles</h4>
                                </div>
                                <div className="modal-send-form">
                                    <input
                                        type="text"
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder='Nombre (opcional)'
                                    />


                                    <div className='deFLexRadio'>
                                        <label>Opciones de entrega</label>

                                        <div>
                                            <input
                                                type="radio"
                                                id="delivery"
                                                name="deliveryOption"
                                                value="delivery"
                                                checked={deliveryOption === 'delivery'}
                                                onChange={() => setDeliveryOption('delivery')}
                                            />
                                            <label htmlFor="delivery">Envío a domicilio</label>
                                        </div>
                                        <div>
                                            <input
                                                type="radio"
                                                id="pickup"
                                                name="deliveryOption"
                                                value="pickup"
                                                checked={deliveryOption === 'pickup'}
                                                onChange={() => setDeliveryOption('pickup')}
                                            />
                                            <label htmlFor="pickup">Retirar personalmente</label>
                                        </div>
                                    </div>

                                    <div className='deFLexRadio'>
                                        <label>Formas de pago</label>
                                        <div >
                                            <input
                                                type="radio"
                                                id="efectivo"
                                                name="paymentMethod"
                                                value="efectivo"
                                                checked={paymentMethod === 'efectivo'}
                                                onChange={() => setPaymentMethod('efectivo')}
                                            />
                                            <label htmlFor="efectivo">Efectivo</label>
                                        </div>
                                        <div >
                                            <input
                                                type="radio"
                                                id="transferencia"
                                                name="paymentMethod"
                                                value="transferencia"
                                                checked={paymentMethod === 'transferencia'}
                                                onChange={() => setPaymentMethod('transferencia')}
                                            />
                                            <label htmlFor="transferencia">Transferencia</label>
                                        </div>

                                    </div>
                                    <input
                                        type="text"
                                        id="codigo"
                                        value={codigo}
                                        onChange={(e) => setCodigo(e.target.value)}
                                        placeholder='Codigo de descuento (opcional)'
                                    />
                                    <textarea
                                        placeholder="Agrega una nota (opcional)"
                                        value={noteText}
                                        onChange={(e) => setNoteText(e.target.value)}
                                    />
                                    <button onClick={handleWhatsappMessageCart} className='btn'>Enviar</button>

                                </div>

                            </ModalCart>
                            <ModalCart
                                isOpen={modalIsOpen3}
                                onRequestClose={closeModal3}
                                className="modal-cart"
                                overlayClassName="overlay-cart"
                            >
                                <div className='deFLex'>
                                    <button onClick={closeModal3} ><FontAwesomeIcon icon={faArrowLeft} />  </button>
                                    <h4>Elige tu mesa</h4>
                                </div>
                                <div className="modal-send-form">
                                    <input
                                        type="text"
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder='Nombre'
                                    />
                                    <input
                                        type="text"
                                        id="codigo"
                                        value={codigo}
                                        onChange={(e) => setCodigo(e.target.value)}
                                        placeholder='Codigo de descuento (opcional)'
                                    />
                                    <textarea
                                        placeholder="Agrega una nota (opcional)"
                                        value={noteText}
                                        onChange={(e) => setNoteText(e.target.value)}
                                    />
                                    <div className='mesasGrapCart'>
                                        {mesas.map(item => (
                                            <div
                                                key={item.idMesa}
                                                className={`mesaCard ${item.estado === 'libre' ? (selectedMesa === item.idMesa ? 'selectedMesa' : 'bg-green') : 'bg-red'}`}
                                                onClick={() => { if (item.estado === 'libre') setIdMesa(item.idMesa) }}
                                            >
                                                <label>
                                                    {item.mesa}
                                                </label>
                                                <span>
                                                    {item.estado === 'libre' ? (selectedMesa === item.idMesa ? 'selectedMesa' : '') : 'ocupada'}
                                                </span>
                                                {item.estado === 'libre' && (
                                                    <input
                                                        type='radio'
                                                        name='productos'
                                                        value={item.idMesa}
                                                        readOnly
                                                        checked={idMesa === item.idMesa}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <fieldset className='deNonefieldset'>
                                        <legend>Productos</legend>
                                        <textarea
                                            name='productos'
                                            value={cartItems.map(item => ` ${item.categoria}, ${item.titulo}, x ${item.cantidad}, ${item.item},${item.categoria},${item.precio}, ${obtenerImagen(item)}  `).join('\n')}
                                            readOnly
                                        />
                                    </fieldset>
                                    <fieldset className='deNonefieldset'>
                                        <legend>Productos</legend>
                                        <textarea
                                            name='productos'
                                            value={cartItems.map(item => `${item.titulo}, cantidad: ${item.cantidad}`).join('\n')}
                                            readOnly
                                        />
                                    </fieldset>
                                    {mensaje ? (
                                        <button type='button' className='btn' disabled>
                                            {mensaje}
                                        </button>
                                    ) : (
                                        <button type='button' onClick={crearPedido} className='btn'>
                                            Finalizar pedido
                                        </button>
                                    )}
                                </div>

                            </ModalCart>
                        </>)}

                </ModalCart>
            </div >
        </div >

    )
}





