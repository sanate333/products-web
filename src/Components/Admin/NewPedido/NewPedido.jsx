import React, { useState, useEffect } from 'react';
import './NewPedido.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import baseURL from '../../url';

export default function NewPedido() {
    const [mensaje, setMensaje] = useState('');
    const [idMesa, setIdMesa] = useState('');
    const [estado, setEstado] = useState('Pendiente');
    const [total, setTotal] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [cartItems, setCartItems] = useState([]);
    const [mesas, setMesas] = useState([]);
    const [isFocused, setIsFocused] = useState(false);
    const [productos, setProductos] = useState([]);
    useEffect(() => {
        cargarMesas();
        cargarProductos();
    }, [isFocused]);

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
                })
                .catch((error) => {
                    console.error('Error al obtener detalles del carrito:', error);
                });
        };

        fetchCartItems();
    }, [isFocused]);

    const toggleModal = () => {
        setIdMesa('');
        setTotal('');
        setMensaje('');
        setModalOpen(!modalOpen);
        setIsFocused(true);
    };

    const crearPedido = async () => {
        setMensaje('Procesando...');

        try {
            // Construir la lista de productos del pedido
            const productosPedido = cartItems.map(item => {
                return {
                    titulo: item.titulo,
                    cantidad: item.cantidad
                };
            });
            // Convertir la lista de productos a JSON
            const productosPedidoJSON = JSON.stringify(productosPedido);
            // Crear el formulario para enviar
            const formData = new FormData();
            formData.append('idMesa', idMesa);
            formData.append('estado', estado);
            formData.append('productos', productosPedidoJSON);
            formData.append('total', total);
            // Enviar la solicitud POST
            const response = await fetch(`${baseURL}/pedidoPost.php`, {
                method: 'POST',
                body: formData,
            });
            // Manejar la respuesta
            const data = await response.json();
            if (data.mensaje) {
                setMensaje('');
                toast.success(data.mensaje);
                toggleModal();
            } else if (data.error) {
                setMensaje('');
                toast.error(data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            setMensaje('');
            toast.error('Error de conexión. Por favor, inténtelo de nuevo.');
        }
    };

    return (
        <div className='NewContain'>
            <ToastContainer />
            <button onClick={toggleModal} className='btnSave'>
                <span>+</span> Agregar Pedido
            </button>
            {modalOpen && (
                <div className='modal'>
                    <div className='modal-content'>
                        <div className='deFlexBack'>
                            <h4>Agregar Pedido</h4>
                            <span className='close' onClick={toggleModal}>
                                &times;
                            </span>
                        </div>

                        <form>
                            <fieldset>
                                <legend>ID de Mesa</legend>
                                <select
                                    value={idMesa}
                                    onChange={(e) => setIdMesa(e.target.value)}
                                >
                                    <option value="">Selecciona una mesa</option>
                                    {mesas.map(item => (
                                        <option key={item.idMesa} value={item.idMesa}>{item.mesa}</option>
                                    ))}
                                </select>
                            </fieldset>
                            <fieldset className='deNonefieldset'>
                                <legend>Productos</legend>
                                <textarea
                                    name='productos'
                                    value={cartItems.map(item => `${item.titulo}, cantidad: ${item.cantidad}`).join('\n')}
                                    readOnly
                                />
                            </fieldset>

                            <fieldset>
                                <legend>Total</legend>
                                <input
                                    type='text'
                                    name='total'
                                    value={total}
                                    onChange={(e) => setTotal(e.target.value)}
                                />
                            </fieldset>

                            {mensaje ? (
                                <button type='button' className='btnLoading' disabled>
                                    {mensaje}
                                </button>
                            ) : (
                                <button type='button' onClick={crearPedido} className='btnPost'>
                                    Agregar Pedido
                                </button>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
