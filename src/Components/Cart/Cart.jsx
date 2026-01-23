import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import baseURL, { resolveImg } from '../url';
import './Cart.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faShoppingCart, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Link as Anchor } from "react-router-dom";
import moneda from '../moneda';

const WHATSAPP_NUMBER = '573234549614';
const COLOMBIA_DEPARTMENTS = [
    { name: 'Amazonas', cities: ['Leticia'] },
    { name: 'Antioquia', cities: ['Medellin', 'Bello', 'Itagui', 'Envigado', 'Rionegro', 'Apartado'] },
    { name: 'Arauca', cities: ['Arauca'] },
    { name: 'Atlantico', cities: ['Barranquilla', 'Soledad', 'Malambo'] },
    { name: 'Bolivar', cities: ['Cartagena', 'Turbaco', 'Magangue'] },
    { name: 'Boyaca', cities: ['Tunja', 'Duitama', 'Sogamoso'] },
    { name: 'Caldas', cities: ['Manizales'] },
    { name: 'Caqueta', cities: ['Florencia'] },
    { name: 'Casanare', cities: ['Yopal'] },
    { name: 'Cauca', cities: ['Popayan'] },
    { name: 'Cesar', cities: ['Valledupar'] },
    { name: 'Choco', cities: ['Quibdo'] },
    { name: 'Cordoba', cities: ['Monteria'] },
    { name: 'Cundinamarca', cities: ['Bogota D.C.', 'Soacha', 'Chia', 'Zipaquira'] },
    { name: 'Guainia', cities: ['Inirida'] },
    { name: 'Guaviare', cities: ['San Jose del Guaviare'] },
    { name: 'Huila', cities: ['Neiva'] },
    { name: 'La Guajira', cities: ['Riohacha', 'Maicao'] },
    { name: 'Magdalena', cities: ['Santa Marta'] },
    { name: 'Meta', cities: ['Villavicencio'] },
    { name: 'Narino', cities: ['Pasto', 'Tumaco'] },
    { name: 'Norte de Santander', cities: ['Cucuta'] },
    { name: 'Putumayo', cities: ['Mocoa'] },
    { name: 'Quindio', cities: ['Armenia'] },
    { name: 'Risaralda', cities: ['Pereira'] },
    { name: 'San Andres y Providencia', cities: ['San Andres'] },
    { name: 'Santander', cities: ['Bucaramanga', 'Floridablanca', 'Giron'] },
    { name: 'Sucre', cities: ['Sincelejo'] },
    { name: 'Tolima', cities: ['Ibague'] },
    { name: 'Valle del Cauca', cities: ['Cali', 'Palmira', 'Buenaventura'] },
    { name: 'Vaupes', cities: ['Mitu'] },
    { name: 'Vichada', cities: ['Puerto Carreno'] },
];

export default function Cart() {
    const [cartItems, setCartItems] = useState([]);
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [name, setName] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [direccion, setDireccion] = useState('');
    const [ciudad, setCiudad] = useState('');
    const [departamento, setDepartamento] = useState('');
    const [ciudadManual, setCiudadManual] = useState('');
    const [adicionales, setAdicionales] = useState('');
    const [codigo, setCodigo] = useState('');
    const [nota, setNota] = useState('');
    const [totalPrice, setTotalPrice] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('efectivo');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [cartVersion, setCartVersion] = useState(0);

    useEffect(() => {
        let totalPriceCalc = 0;
        cartItems.forEach(item => {
            totalPriceCalc += item.precio * item.cantidad;
        });
        setTotalPrice(totalPriceCalc);
    }, [cartItems]);

    const selectedDepartment = COLOMBIA_DEPARTMENTS.find((item) => item.name === departamento);
    const departmentCities = selectedDepartment?.cities || [];
    const usesManualCity = ciudad === 'Otro';
    const cityValue = usesManualCity ? ciudadManual.trim() : ciudad;
    const discountRate = paymentMethod === 'transferencia' ? 0.08 : 0;
    const discountAmount = totalPrice * discountRate;
    const finalTotal = totalPrice - discountAmount;

    useEffect(() => {
        cargarProductos();
    }, [isFocused]);

    const fetchCartItems = async () => {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const items = cart.map((cartItem) => {
            const producto = productos.find(producto => producto.idProducto === cartItem.idProducto);
            return {
                ...producto,
                cantidad: cartItem.cantidad,
                item: cartItem.item,
            };
        });

        setCartItems(items);
        setLoading(false);
    };

    useEffect(() => {
        fetchCartItems().catch((error) => {
            console.error('Error al obtener detalles del carrito:', error);
            setLoading(false);
        });
    }, [productos, isFocused, cartVersion]);

    useEffect(() => {
        const handleCartUpdated = () => {
            setCartVersion((prev) => prev + 1);
        };
        window.addEventListener('cartUpdated', handleCartUpdated);
        return () => window.removeEventListener('cartUpdated', handleCartUpdated);
    }, []);

    useEffect(() => {
        const handleOpenCheckout = () => {
            setModalIsOpen(true);
            setIsFocused(true);
            setDetailsOpen(false);
        };

        window.addEventListener('openCheckout', handleOpenCheckout);
        return () => window.removeEventListener('openCheckout', handleOpenCheckout);
    }, []);

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

    const obtenerImagen = (item) => {
        const src = item.imagen1 || item.imagen2 || item.imagen3 || item.imagen4 || null;
        return resolveImg(src);
    };

    const openModal = () => {
        setModalIsOpen(true);
        setIsFocused(true);
        setDetailsOpen(false);
    };

    const closeModal = () => {
        setModalIsOpen(false);
        setIsFocused(false);
        setDetailsOpen(false);
    };

    const openDetails = () => {
        setDetailsOpen(true);
    };

    const closeDetails = () => {
        setDetailsOpen(false);
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

    const increaseQuantity = (index) => {
        const updatedCartItems = [...cartItems];
        updatedCartItems[index].cantidad += 1;
        setCartItems(updatedCartItems);
        localStorage.setItem('cart', JSON.stringify(updatedCartItems));
    };

    const decreaseQuantity = (index) => {
        const updatedCartItems = [...cartItems];
        if (updatedCartItems[index].cantidad > 1) {
            updatedCartItems[index].cantidad -= 1;
            setCartItems(updatedCartItems);
            localStorage.setItem('cart', JSON.stringify(updatedCartItems));
        }
    };

    const handleConfirmPedido = async () => {
        setFormError('');
        const nombreValue = name.trim();
        const whatsappValue = whatsapp.trim();
        const direccionValue = direccion.trim();

        if (!nombreValue || !whatsappValue || !direccionValue || !departamento || !cityValue) {
            setFormError('Completa nombre y apellido, WhatsApp, direccion, departamento y ciudad.');
            return;
        }

        if (!cartItems.length) {
            setFormError('No hay productos en el carrito.');
            return;
        }

        if (isSubmitting) {
            return;
        }

        setIsSubmitting(true);

        const productosPedido = cartItems.map(item => ({
            idProducto: item.idProducto,
            titulo: item.titulo,
            cantidad: item.cantidad,
            precio: item.precio,
            imagen: obtenerImagen(item),
        }));

        let idPedido = null;
        const backupId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const backupPedido = {
            id: backupId,
            createdAt: new Date().toISOString(),
            nombre: nombreValue,
            whatsapp: whatsappValue,
            direccion: direccionValue,
            ciudad: cityValue,
            departamento,
            adicionales: adicionales.trim(),
            codigo: codigo.trim(),
            nota: nota.trim(),
            formaPago: paymentMethod,
            total: Number(finalTotal.toFixed(2)),
            productos: productosPedido,
        };
        const pendingPedidos = JSON.parse(localStorage.getItem('pendingPedidos')) || [];
        pendingPedidos.push(backupPedido);
        localStorage.setItem('pendingPedidos', JSON.stringify(pendingPedidos));

        try {
            const formData = new FormData();
            formData.append('nombre', nombreValue);
            formData.append('whatsapp', whatsappValue);
            formData.append('direccion', direccionValue);
            formData.append('ciudad', cityValue);
            formData.append('departamento', departamento);
            formData.append('adicionales', adicionales.trim());
            formData.append('codigo', codigo.trim());
            formData.append('nota', nota.trim());
            formData.append('formaPago', paymentMethod);
            formData.append('total', Number(finalTotal.toFixed(2)));
            formData.append('productos', JSON.stringify(productosPedido));

            const response = await fetch(`${baseURL}/pedidoPost.php`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (response.ok && !data?.error) {
                idPedido = data?.idPedido || data?.pedido?.idPedido || null;
                const pending = JSON.parse(localStorage.getItem('pendingPedidos')) || [];
                const updatedPending = pending.filter((pedido) => pedido.id !== backupId);
                localStorage.setItem('pendingPedidos', JSON.stringify(updatedPending));
            }
        } catch (error) {
            console.error('Error al guardar pedido:', error);
        }

        const cartDetails = productosPedido.map((item) => (
            `- ${item.titulo} x${item.cantidad} - ${moneda} ${item.precio}`
        ));

        const messageParts = [];
        messageParts.push('SANATE - Nuevo pedido');
        if (idPedido) {
            messageParts.push(`ID Pedido: ${idPedido}`);
        }
        messageParts.push(`Nombre y apellido: ${nombreValue}`);
        messageParts.push(`WhatsApp: ${whatsappValue}`);
        messageParts.push(`Direccion: ${direccionValue}`);
        messageParts.push(`Departamento: ${departamento}`);
        messageParts.push(`Ciudad: ${cityValue}`);
        if (adicionales.trim()) {
            messageParts.push(`Adicionales: ${adicionales.trim()}`);
        }
        if (codigo.trim()) {
            messageParts.push(`Codigo: ${codigo.trim()}`);
        }
        if (nota.trim()) {
            messageParts.push(`Nota: ${nota.trim()}`);
        }
        messageParts.push(`Forma de pago: ${paymentMethod === 'efectivo' ? 'Efectivo' : 'Transferencia'}`);
        messageParts.push('Productos:');
        messageParts.push(cartDetails.join('\n'));
        if (discountRate > 0) {
            messageParts.push(`Descuento transferencia: -${moneda} ${discountAmount.toFixed(2)}`);
        }
        messageParts.push(`Total: ${moneda} ${finalTotal.toFixed(2)}`);

        const messageText = messageParts.join('\n');
        const encodedMessage = encodeURIComponent(messageText);
        const appUrl = `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=${encodedMessage}`;
        const webUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
        const fallbackTimer = setTimeout(() => {
            window.open(webUrl, '_blank', 'noopener,noreferrer');
        }, 600);
        window.addEventListener('blur', () => clearTimeout(fallbackTimer), { once: true });
        window.location.href = appUrl;

        setName('');
        setWhatsapp('');
        setDireccion('');
        setCiudad('');
        setDepartamento('');
        setCiudadManual('');
        setAdicionales('');
        setCodigo('');
        setNota('');
        setModalIsOpen(false);
        setDetailsOpen(false);
        setIsSubmitting(false);
        clearCart();
    };

    return (
        <div>
            <button onClick={openModal} className='cartIconFixed'>
                {cartItems?.length >= 1 && (
                    <span>{cartItems.length}</span>
                )}
                <FontAwesomeIcon icon={faShoppingCart} />
            </button>

            <Modal
                isOpen={modalIsOpen}
                className="modal-cart"
                overlayClassName="overlay-cart"
                onRequestClose={closeModal}
            >
                <div className='deFLex'>
                    <button onClick={closeModal} className='backToCatalog'>
                        <FontAwesomeIcon icon={faArrowLeft} /> Regresar al catalogo
                    </button>
                </div>
                <div className='infoTicker'>
                    <div className='infoTickerTrack'>
                        <span>Envios gratis a partir de $59.900</span>
                        <span>Contra entrega</span>
                        <span>Transferencia -8% descuento</span>
                        <span>Envios gratis a partir de $59.900</span>
                        <span>Contra entrega</span>
                        <span>Transferencia -8% descuento</span>
                    </div>
                </div>
                {cartItems?.length === 0 ? (
                    <p className='nohay'>No hay productos</p>
                ) : (
                    <>
                        <div className="modal-content-cart">
                            {loading ? (
                                <p>Cargando...</p>
                            ) : (
                                <div>
                                    {cartItems.map((item, index) => (
                                        <div key={item?.idProducto} className='cardProductCart' >
                                            <Anchor to={`/producto/${item?.idProducto}/${item?.titulo?.replace(/\s+/g, '-')}`} onClick={closeModal} className="cardProductCartImage">
                                                <img src={obtenerImagen(item)} alt="imagen" />
                                            </Anchor>
                                            <div className='cardProductCartText'>
                                                <h3>{item.titulo}</h3>
                                                <span>
                                                    {item?.item?.map((sabor, saborIndex) => (
                                                        <span key={saborIndex}> {sabor}</span>
                                                    ))}
                                                </span>
                                                <strong>{moneda} {item?.precio}</strong>
                                                <span className='cartSubtotal'>Subtotal: {moneda} {(item?.precio * item.cantidad).toFixed(2)}</span>
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
                            <div className='cartTotals'>
                                <span>Subtotal</span>
                                <strong>{moneda} {totalPrice.toFixed(2)}</strong>
                            </div>
                            <div className='cartTotals total'>
                                <span>Total</span>
                                <strong>{moneda} {totalPrice.toFixed(2)}</strong>
                            </div>
                            <button className='btnConfirm' onClick={openDetails}>
                                INICIAR COMPRA
                            </button>
                        </div>

                        <Modal
                            isOpen={detailsOpen}
                            onRequestClose={closeDetails}
                            className="modal-cart"
                            overlayClassName="overlay-cart"
                        >
                            <div className='deFLex'>
                                <button onClick={closeDetails} ><FontAwesomeIcon icon={faArrowLeft} />  </button>
                                <h4 className='cartHeaderTitle'>COMPLETA TU PEDIDO ⬇️</h4>
                            </div>
                            <div className="modal-send-form">
                                <p className='formNotice'>Por Favor Ingrese los Datos de envio</p>
                                <input
                                    type="text"
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder='Nombre y apellido *'
                                />
                                <input
                                    type="tel"
                                    id="whatsapp"
                                    value={whatsapp}
                                    onChange={(e) => setWhatsapp(e.target.value)}
                                    placeholder='WhatsApp *'
                                />
                                <input
                                    type="text"
                                    id="direccion"
                                    value={direccion}
                                    onChange={(e) => setDireccion(e.target.value)}
                                    placeholder='Direccion completa *'
                                />
                                <div className='selectGroup'>
                                    <label htmlFor="departamento">Departamento *</label>
                                    <select
                                        id="departamento"
                                        value={departamento}
                                        onChange={(e) => {
                                            setDepartamento(e.target.value);
                                            setCiudad('');
                                            setCiudadManual('');
                                        }}
                                    >
                                        <option value="">Departamento</option>
                                        {COLOMBIA_DEPARTMENTS.map((item) => (
                                            <option key={item.name} value={item.name}>{item.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className='selectGroup'>
                                    <label htmlFor="ciudad">Ciudad *</label>
                                    <select
                                        id="ciudad"
                                        value={ciudad}
                                        onChange={(e) => setCiudad(e.target.value)}
                                        disabled={!departamento}
                                    >
                                        <option value="">Ciudad</option>
                                        {departmentCities.map((city) => (
                                            <option key={city} value={city}>{city}</option>
                                        ))}
                                        <option value="Otro">Otra ciudad</option>
                                    </select>
                                </div>
                                {usesManualCity && (
                                    <input
                                        type="text"
                                        id="ciudadManual"
                                        value={ciudadManual}
                                        onChange={(e) => setCiudadManual(e.target.value)}
                                        placeholder='Escribe tu ciudad *'
                                    />
                                )}
                                <textarea
                                    placeholder="Datos adicionales (barrio/unidad/referencia)"
                                    value={adicionales}
                                    onChange={(e) => setAdicionales(e.target.value)}
                                    className="textAreaCompact"
                                />
                                <input
                                    type="text"
                                    id="codigo"
                                    value={codigo}
                                    onChange={(e) => setCodigo(e.target.value)}
                                    placeholder='Codigo de descuento (opcional)'
                                />
                                <textarea
                                    placeholder="Nota (opcional)"
                                    value={nota}
                                    onChange={(e) => setNota(e.target.value)}
                                    className="textAreaCompact"
                                />

                                <div className='deFLexRadio'>
                                    <label>Formas de pago</label>
                                    <div>
                                        <input
                                            type="radio"
                                            id="efectivo"
                                            name="paymentMethod"
                                            value="efectivo"
                                            checked={paymentMethod === 'efectivo'}
                                            onChange={() => setPaymentMethod('efectivo')}
                                        />
                                        <label htmlFor="efectivo">Contra entrega</label>
                                    </div>
                                    <div>
                                        <input
                                            type="radio"
                                            id="transferencia"
                                            name="paymentMethod"
                                            value="transferencia"
                                            checked={paymentMethod === 'transferencia'}
                                            onChange={() => setPaymentMethod('transferencia')}
                                        />
                                        <label htmlFor="transferencia">Transferencia - 8% Descuento (Nequi, Cuenta de Ahorros)</label>
                                    </div>
                                </div>

                                <div className='checkoutSummary'>
                                    <h5>Resumen del pedido</h5>
                                    <div className='summaryItems'>
                                        {cartItems.map((item) => (
                                            <div className='summaryRow' key={`${item.idProducto}-${item?.item?.join('-') || 'base'}`}>
                                                <span className='summaryName'>{item.titulo}</span>
                                                <span className='summaryQty'>x{item.cantidad}</span>
                                                <span className='summaryPrice'>{moneda} {(item.precio * item.cantidad).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className='summaryTotals'>
                                        <div className='summaryRow'>
                                            <span>Subtotal</span>
                                            <strong>{moneda} {totalPrice.toFixed(2)}</strong>
                                        </div>
                                    {discountRate > 0 && (
                                        <div className='summaryRow discountRow'>
                                            <span>Descuento transferencia</span>
                                            <strong>-{moneda} {discountAmount.toFixed(2)}</strong>
                                        </div>
                                    )}
                                    {discountRate > 0 && (
                                        <div className='summaryRow totalRow'>
                                            <span>Total</span>
                                            <strong>{moneda} {finalTotal.toFixed(2)}</strong>
                                        </div>
                                    )}
                                </div>
                                </div>

                                {formError && (
                                    <p className="formError" role="alert">{formError}</p>
                                )}

                                <div className='checkoutFooter'>
                                    <button onClick={handleConfirmPedido} className='btnConfirmCheckout' disabled={isSubmitting}>
                                        {isSubmitting ? 'Procesando...' : (
                                            <>
                                                <span className="btnConfirmTitle">Finaliza tu compra ✅</span>
                                                <span className="btnConfirmTotal">💰 {moneda} {finalTotal.toFixed(2)}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </Modal>
                    </>
                )}
            </Modal>
        </div >
    );
}

