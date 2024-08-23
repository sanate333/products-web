import React, { useEffect, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './MiPedido.css';
import 'jspdf-autotable';
import baseURL from '../url';
import moneda from '../moneda';
import contador from '../contador';
import Modal from 'react-modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSearch, faTrash } from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';
export default function MiPedido() {
    const [pedidos, setPedidos] = useState([]);
    const [isFocused, setIsFocused] = useState(false);
    const [idPedido, setIdPedido] = useState('');
    const [pedidoDetalle, setPedidoDetalle] = useState(null);
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [mensaje, setMensaje] = useState('');
    useEffect(() => {
        cargarPedidos();
        cargarProductos();
    }, []);

    const cargarPedidos = () => {
        fetch(`${baseURL}/pedidoGet.php`, {
            method: 'GET',
        })
            .then(response => response.json())
            .then(data => {
                setPedidos(data.pedidos.reverse() || []);
                console.log(data.pedidos);
            })
            .catch(error => console.error('Error al cargar pedidos:', error));
    };

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
        cargarPedidos();
    };

    const openModal = () => {
        setModalIsOpen(true);
        setIsFocused(true);
    };

    const closeModal = () => {
        setModalIsOpen(false);
        setIsFocused(false);
        setIdPedido('');
        setPedidoDetalle(null);
    };

    const handleInputChange = (e) => {
        setIdPedido(e.target.value);
    };

    const buscarPedido = () => {
        const idPedidoInt = parseInt(idPedido, 10);
        const pedidoEncontrado = pedidos.find(pedido => pedido.idPedido === idPedidoInt);

        if (pedidoEncontrado) {
            setPedidoDetalle(pedidoEncontrado);
            Swal.fire({
                title: 'Pedido encontrado',
                text: `ID Pedido: ${pedidoEncontrado.idPedido}, Nombre: ${pedidoEncontrado.nombre}`,
                icon: 'success',
                confirmButtonText: 'Aceptar'
            });
        } else {
            Swal.fire({
                title: 'Pedido no encontrado',
                text: 'El ID del pedido no corresponde a ningún pedido existente.',
                icon: 'error',
                confirmButtonText: 'Aceptar'
            });
            setPedidoDetalle(null);
        }
    };
    const [cartItems, setCartItems] = useState([]);
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalPrice, setTotalPrice] = useState(0);

    useEffect(() => {
        // Calcular el precio total al cargar el carrito o al actualizar los productos
        let totalPriceCalc = 0;
        cartItems.forEach(item => {
            totalPriceCalc += item.precio * item.cantidad;
        });
        setTotalPrice(totalPriceCalc);
    }, [cartItems]);

    const cargarProductos = () => {
        fetch(`${baseURL}/productosGet.php`, {
            method: 'GET',
        })
            .then(response => response.json())
            .then(data => {
                setProductos(data.productos || []);
            })
            .catch(error => console.error('Error al cargar productos:', error));
    };

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
    const clearCart = () => {
        setCartItems([]);
        localStorage.removeItem('cart');
    };
    const agregarDatosPedido = () => {
        const datosPedido = {
            idPedido: pedidoDetalle.idPedido,
            productos: cartItems.map(item => ({
                titulo: item.titulo,
                cantidad: item.cantidad,
                precio: item.precio,
                imagen: obtenerImagen(item),
                item: item.item,
                categoria: item.categoria
            })),
            total: totalPrice.toFixed(2)
        };
        setMensaje('Procesando...');
        fetch(`${baseURL}/miPedidoPut.php?idPedido=${datosPedido.idPedido}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                productos: datosPedido.productos,
                total: datosPedido.total
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.mensaje) {
                    setMensaje('');
                    Swal.fire({
                        title: 'Éxito',
                        text: data.mensaje,
                        icon: 'success',
                        confirmButtonText: 'Aceptar'
                    });
                    clearCart()
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);

                } else {
                    setMensaje('');
                    Swal.fire({
                        title: 'Error al actualizar el pedido',
                        text: data.mensaje,
                        icon: 'error',
                        confirmButtonText: 'Aceptar'
                    });
                }
            })
            .catch(error => {
                console.error('Error al actualizar el pedido:', error);
                setMensaje('');
                Swal.fire({
                    title: 'Error al actualizar el pedido',
                    text: error.mensaje,
                    icon: 'error',
                    confirmButtonText: 'Aceptar'
                });

            });
    };



    return (
        <div>
            <button onClick={openModal}>Ver mi pedido</button>
            <ToastContainer />
            <Modal
                isOpen={modalIsOpen}
                className="modal-cart"
                overlayClassName="overlay-cart"
                onRequestClose={closeModal}
            >
                <div className='deFLex'>
                    <button onClick={closeModal}>
                        <FontAwesomeIcon icon={faArrowLeft} />
                    </button>
                    <button className='deleteToCart'>Mi pedido</button>
                </div>
                <div className='paddingConten'>
                    <fieldset className='inputSearch'>
                        <input
                            type="number"
                            placeholder="Ingrese ID de Pedido"
                            value={idPedido}
                            onChange={handleInputChange}
                            className="input"
                        />

                        <FontAwesomeIcon icon={faSearch} onClick={buscarPedido} className="search-icon" />
                    </fieldset>
                </div>

                {pedidoDetalle && (
                    <div className='MiPedidoContain'>


                        <div className="modal-content-cart">

                            <div className='deFlexSpanPedido'>
                                <span>ID Pedido: {pedidoDetalle.idPedido}</span>
                                <span>{pedidoDetalle.nombre}</span>
                                <span>{pedidoDetalle.estado}</span>
                            </div>
                            <div className='cardsProductData'>
                                {JSON.parse(pedidoDetalle.productos).map(producto => (
                                    <div key={producto.titulo} className='cardProductData'>
                                        <img src={producto.imagen} alt="imagen" />
                                        <div className='cardProductDataText'>
                                            <h3>{producto.titulo}</h3>
                                            <strong>{moneda} {producto.precio} <span>x{producto.cantidad}</span></strong>
                                            <span>{producto.item}</span>
                                            <h5>{producto.categoria}</h5>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <fieldset className='deNonefieldset'>
                                <legend>Productos</legend>
                                <textarea
                                    name='productos'
                                    value={cartItems.map(item => ` ${item.categoria}, ${item.titulo}, x ${item.cantidad}, ${item.item}, ${item.precio}, ${obtenerImagen(item)} `).join('\n')}
                                    readOnly
                                />
                            </fieldset>
                        </div>
                        <div className='deColumnCart'>
                            <h4>Total: {moneda} {pedidoDetalle && (
                                pedidoDetalle?.total
                            )}
                            </h4>
                            {
                                cartItems?.length >= 1 && (
                                    <>
                                        <h4>Total carrito: {moneda} {totalPrice.toFixed(2)}</h4>
                                        {mensaje ? (
                                            <button type='button' className='btn' disabled>
                                                {mensaje}
                                            </button>
                                        ) : (
                                            <button onClick={agregarDatosPedido} className='btn'>Sumar el carrito al Pedido</button>
                                        )}

                                    </>
                                )

                            }

                        </div>
                    </div>
                )}



            </Modal>
        </div>
    );
}
