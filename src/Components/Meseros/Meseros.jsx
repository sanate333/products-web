import React, { useEffect, useState, useRef } from 'react';
import baseURL from '../../Components/url';
import './Meseros.css';
import SwiperCore, { Navigation, Pagination, Autoplay } from 'swiper/core';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/swiper-bundle.css';
import Modal from 'react-modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faAngleDoubleRight, faShoppingCart, faTrash } from '@fortawesome/free-solid-svg-icons';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ProductosLoading from '../../Components/ProductosLoading/ProductosLoading';
import moneda from '../moneda';
import Swal from 'sweetalert2';
SwiperCore.use([Navigation, Pagination, Autoplay]);
export default function Meseros() {

    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fixedCategories, setFixedCategories] = useState(false);
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [cantidad, setCantidad] = useState(1);
    const categoriasRefs = useRef([]);
    const categoriasInputRef = useRef(null);
    const swiperRef = useRef(null);
    const [productos, setProductos] = useState([]);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todo');
    const [selectedItem, setSelectedItem] = useState('');
    const [usuario, setUsuario] = useState({});
    // Función para manejar el clic en una categoría
    const handleClickCategoria = (categoria) => {
        setCategoriaSeleccionada(categoria);
    };
    useEffect(() => {
        cargarProductos();
        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const handleScroll = () => {
        if (window.scrollY > categoriasInputRef.current.offsetTop) {
            setFixedCategories(true);
        } else {
            setFixedCategories(false);
        }
    };

    const cargarProductos = () => {
        fetch(`${baseURL}/productosGet.php`, {
            method: 'GET',
        })
            .then(response => response.json())
            .then(data => {
                const categoriasMap = new Map();
                data.productos.forEach(producto => {
                    const categoria = producto.categoria;
                    if (categoriasMap.has(categoria)) {
                        categoriasMap.get(categoria).push(producto);
                    } else {
                        categoriasMap.set(categoria, [producto]);
                    }
                });
                const categoriasArray = Array.from(categoriasMap, ([categoria, productos]) => ({ categoria, productos }));
                setCategorias(categoriasArray);
                setLoading(false);
                setProductos(data.productos); // Guardamos todos los productos
            })
            .catch(error => console.error('Error al cargar productos:', error));
    };

    const obtenerImagen = (item) => {
        if (item.imagen1) {
            return item.imagen1;
        } else if (item.imagen2) {
            return item.imagen2;
        } else if (item.imagen3) {
            return item.imagen3;
        } else if (item.imagen4) {
            return item.imagen4;
        }
        return null;
    };


    const openModal = (producto) => {
        setProductoSeleccionado(producto);
        setModalIsOpen(true);
    };

    const closeModal = () => {
        setModalIsOpen(false);
        setCantidad(1);
    };

    const addToCart = () => {
        if (productoSeleccionado) {
            const cart = JSON.parse(localStorage.getItem('cartMesero')) || [];
            const existingItemIndex = cart.findIndex(item => item.idProducto === productoSeleccionado.idProducto);
            if (existingItemIndex !== -1) {
                // Si el producto ya existe en el carrito, actualizamos la cantidad
                // Si el producto ya existe en el carrito, agregamos el nuevo sabor al array de sabores
                const existingItem = cart[existingItemIndex];
                const updatedItems = [...existingItem.item, selectedItem]; // Agregar el nuevo sabor
                // Actualizar la cantidad del producto existente en el carrito
                const updatedCantidad = existingItem.cantidad + cantidad;
                // Actualizar el producto existente en el carrito con el nuevo sabor y cantidad
                cart[existingItemIndex] = { ...existingItem, item: updatedItems, cantidad: updatedCantidad };
            } else {
                // Si el producto no existe en el carrito, lo agregamos
                cart.push({ idProducto: productoSeleccionado.idProducto, item: [selectedItem], cantidad });
            }
            // Actualizamos el carrito en el localStorage
            localStorage.setItem('cartMesero', JSON.stringify(cart));
            // Llamamos a la función openModal() con la información del producto añadido
            openModal({ ...productoSeleccionado, cantidad });
            // Agregamos la llamada a cargarProductos para actualizar la lista de productos en Products
            cargarProductos();
            toast.success('Producto agregado', {
                autoClose: 200,
            });
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
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`${baseURL}/userLogued.php`);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                setUsuario(data);
                setLoading(false);

            } catch (error) {
                console.error('Error al obtener datos:', error);
                setLoading(false);
            }
        };

        fetchData();
    }, []);
    const [cartItems, setCartItems] = useState([]);
    const [modalIsOpenCart, setModalIsOpenCart] = useState(false);
    const [modalIsOpen3, setModalIsOpen3] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [name, setName] = useState(usuario.nombre);
    const [codigo, setCodigo] = useState('');
    const [totalPrice, setTotalPrice] = useState(0);
    useEffect(() => {
        cargarMesas();
    }, []);
    useEffect(() => {
        // Calcular el precio total al cargar el carrito o al actualizar los productos
        let totalPriceCalc = 0;
        cartItems.forEach(item => {
            totalPriceCalc += item.precio * item.cantidad;
        });
        setTotalPrice(totalPriceCalc);
    }, [cartItems]);



    useEffect(() => {
        cargarProductos();
    }, [isFocused]);

    useEffect(() => {
        const fetchCartItems = async () => {
            const cart = JSON.parse(localStorage.getItem('cartMesero')) || [];
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





    const openModalCart = () => {
        setModalIsOpenCart(true);
        setIsFocused(true);
        cargarMesas()
    };

    const closeModalCart = () => {
        setModalIsOpenCart(false);
        setIsFocused(false);
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
        localStorage.setItem('cartMesero', JSON.stringify(updatedCart));
    };

    const clearCart = () => {
        setCartItems([]);
        localStorage.removeItem('cartMesero');
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



    // Función para aumentar la cantidad de un producto en el carrito
    const increaseQuantity = (index) => {
        const updatedCartItems = [...cartItems];
        updatedCartItems[index].cantidad += 1;
        setCartItems(updatedCartItems);
        localStorage.setItem('cartMesero', JSON.stringify(updatedCartItems));
    };

    // Función para disminuir la cantidad de un producto en el carrito
    const decreaseQuantity = (index) => {
        const updatedCartItems = [...cartItems];
        if (updatedCartItems[index].cantidad > 1) {
            updatedCartItems[index].cantidad -= 1;
            setCartItems(updatedCartItems);
            localStorage.setItem('cartMesero', JSON.stringify(updatedCartItems));
        }
    };
    /* realizar pedidos------------------------*/

    const [mesas, setMesas] = useState([]);
    const [idMesa, setIdMesa] = useState('');
    const [estado, setEstado] = useState('Pendiente');
    const [mensaje, setMensaje] = useState('');
    const [selectedMesa, setSelectedMesa] = useState('');



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
            const nombre = ` ${usuario.rol} - ${usuario.nombre}`
            const formData = new FormData();
            formData.append('idMesa', idMesa);
            formData.append('estado', estado);
            formData.append('productos', productosPedidoJSON);
            formData.append('total', totalPriceWithDiscount);
            formData.append('nombre', nombre);
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
        <div className='ProductsContain'>
            <ToastContainer />
            <div className={`categoriasInputs ${fixedCategories ? 'fixed' : ''}`} ref={categoriasInputRef}>

                {categorias.length > 0 &&
                    <input
                        type="button"
                        value="Todo"
                        onClick={() => handleClickCategoria('Todo')}
                        style={{
                            backgroundColor: categoriaSeleccionada === 'Todo' ? '#F80050' : '',
                            color: categoriaSeleccionada === 'Todo' ? '#fff' : '',
                            borderBottom: categoriaSeleccionada === 'Todo' ? '2px solid #F80050' : 'none'
                        }}
                    />
                }


                {categorias.map(({ categoria }, index) => (
                    <input
                        key={categoria}
                        type="button"
                        value={categoria}
                        onClick={() => handleClickCategoria(categoria)}
                        style={{
                            backgroundColor: categoriaSeleccionada === categoria ? '#F80050' : '',
                            color: categoriaSeleccionada === categoria ? '#fff' : '',
                            borderBottom: categoriaSeleccionada === categoria ? '2px solid #F80050' : 'none'
                        }}
                    />
                ))}
            </div>
            <div>
                {loading ? (
                    <ProductosLoading />
                ) : (
                    <div >
                        {categoriaSeleccionada === 'Todo' && (
                            <div className='Products'>
                                {productos.some(item => item.masVendido === "si") && (
                                    <div className='categoriSection'>


                                        <Swiper
                                            effect={'coverflow'}
                                            grabCursor={true}
                                            slidesPerView={'auto'}
                                            id='swiper_container_products'
                                        >
                                            {productos.filter(item => item.masVendido === "si").map(item => (
                                                <SwiperSlide id='SwiperSlide-scroll-products-masvendidos' key={item.idProducto}>
                                                    <div className='cardProdcutmasVendido' onClick={() => openModal(item)}>
                                                        <img src={obtenerImagen(item)} alt="imagen" />
                                                        <h6 className='masVendido'>Más Vendido</h6>
                                                        <div className='cardText'>
                                                            <h4>{item.titulo}</h4>
                                                            <span>{item.descripcion}</span>
                                                            <div className='deFLexPrice'>
                                                                <h5>{moneda} {item?.precio}</h5>
                                                                {
                                                                    (item?.precioAnterior > 0 && item?.precioAnterior !== undefined) && (
                                                                        <h5 className='precioTachado'>{moneda} {item?.precioAnterior}</h5>
                                                                    )
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                </SwiperSlide>
                                            ))}
                                        </Swiper>
                                    </div>

                                )}

                                {categorias.map(({ categoria, productos }, index) => (
                                    <div key={categoria} className='categoriSection' ref={ref => categoriasRefs.current[index] = ref}>

                                        <div className='deFlexTitlesection'>
                                            <h3 >{categoria}</h3>
                                            <button onClick={() => {
                                                handleClickCategoria(categoria);
                                                document.querySelector('.categoriSection').scrollIntoView({ behavior: 'smooth' });
                                            }}>
                                                Ver más
                                            </button>
                                        </div>
                                        <Swiper
                                            effect={'coverflow'}
                                            grabCursor={true}
                                            slidesPerView={'auto'}
                                            id='swiper_container_products'
                                        >
                                            {productos.map(item => (
                                                <SwiperSlide id='SwiperSlide-scroll-products' key={item.idProducto}>
                                                    <div className='cardProdcut' key={item.idProducto} onClick={() => openModal(item)}>
                                                        <img src={obtenerImagen(item)} alt="imagen" />
                                                        <div className='cardText'>
                                                            <h4>{item.titulo}</h4>
                                                            <span>{item.descripcion}</span>
                                                            <div className='deFLexPrice'>
                                                                <h5>{moneda} {item?.precio}</h5>
                                                                {
                                                                    (item?.precioAnterior > 0 && item?.precioAnterior !== undefined) && (
                                                                        <h5 className='precioTachado'>{moneda} {item?.precioAnterior}</h5>
                                                                    )
                                                                }
                                                            </div>
                                                            <FontAwesomeIcon icon={faAngleDoubleRight} className='iconCard' />
                                                        </div>
                                                    </div>
                                                </SwiperSlide>
                                            ))}
                                        </Swiper>
                                    </div>
                                ))}
                            </div>
                        )}


                        <div className='categoriSectionSelected'>
                            {productos
                                // Filtra los productos solo para la categoría seleccionada
                                .filter(item => categoriaSeleccionada !== 'Todo' && item.categoria === categoriaSeleccionada)
                                // Mapea para renderizar los productos dentro de la categoría
                                .map(item => (
                                    <div key={item.idProducto}>
                                        <div className='cardProdcutSelected' onClick={() => openModal(item)}>
                                            <img src={obtenerImagen(item)} alt="imagen" />
                                            <div className='cardTextSelected'>
                                                <h4>{item.titulo}</h4>
                                                <span>{item.descripcion}</span>
                                                <div className='deFLexPrice'>
                                                    <h5>{moneda} {item?.precio}</h5>
                                                    {
                                                        (item?.precioAnterior > 0 && item?.precioAnterior !== undefined) && (
                                                            <h5 className='precioTachado'>{moneda} {item?.precioAnterior}</h5>
                                                        )
                                                    }
                                                </div>
                                                <FontAwesomeIcon icon={faAngleDoubleRight} className='iconCard' />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>





                    </div>
                )}

            </div>
            <Modal isOpen={modalIsOpen}
                onRequestClose={closeModal}
                className="modal-detail"
                overlayClassName="overlay-detail">
                {productoSeleccionado && (
                    <div className='modal-content-detail'>
                        <button onClick={closeModal} className='backModal'>  <FontAwesomeIcon icon={faArrowLeft} /></button>
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
                            id='swiper_container_Imgs'
                        >
                            {productoSeleccionado.imagen1 ? (
                                <SwiperSlide id='SwiperSlide-scroll-img'>
                                    <img src={productoSeleccionado.imagen1} alt="" />
                                </SwiperSlide>
                            ) : (
                                null
                            )}

                            {productoSeleccionado.imagen2 ? (
                                <SwiperSlide id='SwiperSlide-scroll-img'>
                                    <
                                        img src={productoSeleccionado.imagen2} alt="" />
                                </SwiperSlide>
                            ) : (
                                null
                            )}
                            {productoSeleccionado.imagen3 ? (
                                <SwiperSlide id='SwiperSlide-scroll-img'>
                                    <img src={productoSeleccionado.imagen3} alt="" />
                                </SwiperSlide>
                            ) : (
                                null
                            )}
                            {productoSeleccionado.imagen4 ? (
                                <SwiperSlide id='SwiperSlide-scroll-img'>
                                    <img src={productoSeleccionado.imagen4} alt="" />
                                </SwiperSlide>
                            ) : (
                                null
                            )}
                        </Swiper>
                        <div className='modalText'>
                            <h2>{productoSeleccionado.titulo}</h2>
                            <p>{productoSeleccionado.categoria}</p>
                            <p>{productoSeleccionado.descripcion} </p>
                            <div className='itemsDetail'>
                                {productoSeleccionado.item1 && (
                                    <label>
                                        <input
                                            type="radio"
                                            name="talle"
                                            value={productoSeleccionado.item1}
                                            checked={selectedItem === productoSeleccionado.item1}
                                            onChange={(e) => setSelectedItem(e.target.value)}
                                        />
                                        {productoSeleccionado.item1}
                                    </label>
                                )}
                                {productoSeleccionado.item2 && (
                                    <label>
                                        <input
                                            type="radio"
                                            name="talle"
                                            value={productoSeleccionado.item2}
                                            checked={selectedItem === productoSeleccionado.item2}
                                            onChange={(e) => setSelectedItem(e.target.value)}
                                        />
                                        {productoSeleccionado.item2}
                                    </label>
                                )}
                                {productoSeleccionado.item3 && (
                                    <label>
                                        <input
                                            type="radio"
                                            name="talle"
                                            value={productoSeleccionado.item3}
                                            checked={selectedItem === productoSeleccionado.item3}
                                            onChange={(e) => setSelectedItem(e.target.value)}
                                        />
                                        {productoSeleccionado.item3}
                                    </label>
                                )}
                                {productoSeleccionado.item4 && (
                                    <label>
                                        <input
                                            type="radio"
                                            name="talle"
                                            value={productoSeleccionado.item4}
                                            checked={selectedItem === productoSeleccionado.item4}
                                            onChange={(e) => setSelectedItem(e.target.value)}
                                        />
                                        {productoSeleccionado.item4}
                                    </label>
                                )}
                                {productoSeleccionado.item5 && (
                                    <label>
                                        <input
                                            type="radio"
                                            name="talle"
                                            value={productoSeleccionado.item5}
                                            checked={selectedItem === productoSeleccionado.item5}
                                            onChange={(e) => setSelectedItem(e.target.value)}
                                        />
                                        {productoSeleccionado.item5}
                                    </label>
                                )}
                                {productoSeleccionado.item6 && (
                                    <label>
                                        <input
                                            type="radio"
                                            name="talle"
                                            value={productoSeleccionado.item6}
                                            checked={selectedItem === productoSeleccionado.item6}
                                            onChange={(e) => setSelectedItem(e.target.value)}
                                        />
                                        {productoSeleccionado.item6}
                                    </label>
                                )}
                                {productoSeleccionado.item7 && (
                                    <label>
                                        <input
                                            type="radio"
                                            name="talle"
                                            value={productoSeleccionado.item7}
                                            checked={selectedItem === productoSeleccionado.item7}
                                            onChange={(e) => setSelectedItem(e.target.value)}
                                        />
                                        {productoSeleccionado.item7}
                                    </label>
                                )}
                                {productoSeleccionado.item8 && (
                                    <label>
                                        <input
                                            type="radio"
                                            name="talle"
                                            value={productoSeleccionado.item8}
                                            checked={selectedItem === productoSeleccionado.item8}
                                            onChange={(e) => setSelectedItem(e.target.value)}
                                        />
                                        {productoSeleccionado.item8}
                                    </label>
                                )}
                                {productoSeleccionado.item9 && (
                                    <label>
                                        <input
                                            type="radio"
                                            name="talle"
                                            value={productoSeleccionado.item9}
                                            checked={selectedItem === productoSeleccionado.item9}
                                            onChange={(e) => setSelectedItem(e.target.value)}
                                        />
                                        {productoSeleccionado.item9}
                                    </label>
                                )}
                                {productoSeleccionado.item10 && (
                                    <label>
                                        <input
                                            type="radio"
                                            name="talle"
                                            value={productoSeleccionado.item10}
                                            checked={selectedItem === productoSeleccionado.item10}
                                            onChange={(e) => setSelectedItem(e.target.value)}
                                        />
                                        {productoSeleccionado.item10}
                                    </label>
                                )}
                            </div>
                            <div className='deFLexPrice'>
                                <h5>{moneda} {productoSeleccionado?.precio}</h5>
                                {
                                    (productoSeleccionado?.precioAnterior > 0 && productoSeleccionado?.precioAnterior !== undefined) && (
                                        <h5 className='precioTachado'>{moneda} {productoSeleccionado?.precioAnterior}</h5>
                                    )
                                }
                            </div>

                        </div>
                        <div className='deFlexGoTocart'>
                            <div className='deFlexCart'>
                                <button onClick={decrementCantidad}>-</button>
                                <span>{cantidad}</span>
                                <button onClick={incrementCantidad}>+</button>
                            </div>
                            <button onClick={addToCart} className='btnAdd'>Agregar  <FontAwesomeIcon icon={faShoppingCart} />  </button>
                        </div>
                    </div>
                )}
            </Modal>



            <div>

                <button onClick={openModalCart} className='cartIconFixed'>
                    {
                        cartItems?.length >= 1 && (
                            <span>{cartItems.length}</span>
                        )

                    }
                    <FontAwesomeIcon icon={faShoppingCart} />
                </button>

                <Modal
                    isOpen={modalIsOpenCart}
                    className="modal-cart"
                    overlayClassName="overlay-cart"
                    onRequestClose={closeModalCart}
                >
                    <div className='deFLex'>
                        <button onClick={closeModalCart} ><FontAwesomeIcon icon={faArrowLeft} />  </button>
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
                                                <div onClick={closeModalCart}>
                                                    <img src={obtenerImagen(item)} alt="imagen" />
                                                </div>
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
                                    <button className='btn' onClick={openModal3}>
                                        Continuar pedido
                                    </button>
                                </div>
                            </div>


                            <Modal
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
                                        value={`${usuario.rol} - ${usuario.nombre}`}
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

                            </Modal>

                        </>)}

                </Modal>
            </div >
        </div>
    );
}
