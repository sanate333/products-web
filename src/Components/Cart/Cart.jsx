import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import baseURL, { resolveImg } from '../url';
import './Cart.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faEye, faShoppingCart, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Link as Anchor } from "react-router-dom";
import moneda from '../moneda';
import { formatCOP } from '../../utils/price';
import { buildProductPath } from '../../utils/publicLinks';

const WHATSAPP_NUMBER = '573234549614';
const INSTAGRAM_URL = 'https://www.instagram.com/sanate.col/';
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
    const [codigoAplicado, setCodigoAplicado] = useState('');
    const [codigoDescuentoPct, setCodigoDescuentoPct] = useState(0);
    const [codigoStatus, setCodigoStatus] = useState('');
    const [validandoCodigo, setValidandoCodigo] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('efectivo');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [cartVersion, setCartVersion] = useState(0);
    const [ofertasCarrito, setOfertasCarrito] = useState([]);
    const [offerPreviewOpen, setOfferPreviewOpen] = useState(false);
    const [cartAddMsg, setCartAddMsg] = useState('');
    const [shopifyDiscountApplied, setShopifyDiscountApplied] = useState(false);
    const [shopifyDiscountMsg, setShopifyDiscountMsg] = useState('');
    const [exitOfferOpen, setExitOfferOpen] = useState(false);

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
    const transferDiscountRate = paymentMethod === 'transferencia' ? 0.08 : 0;
    const transferDiscountAmount = totalPrice * transferDiscountRate;
    const popupDiscountRate = shopifyDiscountApplied ? 0.05 : 0;
    const popupDiscountAmount = totalPrice * popupDiscountRate;
    const subtotalConOfertas = Math.max(0, totalPrice - transferDiscountAmount - popupDiscountAmount);
    const codigoDiscountAmount = subtotalConOfertas * (codigoDescuentoPct / 100);
    const finalTotal = Math.max(0, subtotalConOfertas - codigoDiscountAmount);

    useEffect(() => {
        cargarProductos();
    }, [isFocused]);

    useEffect(() => {
        const savedOffers = [
            {
                idProducto: localStorage.getItem('ofertaCarritoId1') || '',
                precioOferta: localStorage.getItem('ofertaCarritoPrecio1') || '',
                activa: localStorage.getItem('ofertaCarritoActiva1') === null
                    ? true
                    : localStorage.getItem('ofertaCarritoActiva1') === '1',
            },
            {
                idProducto: localStorage.getItem('ofertaCarritoId2') || '',
                precioOferta: localStorage.getItem('ofertaCarritoPrecio2') || '',
                activa: localStorage.getItem('ofertaCarritoActiva2') === '1',
            },
        ].filter((item) => item.idProducto && item.activa);
        setOfertasCarrito(savedOffers);
    }, [cartVersion]);

    const persistCart = (items) => {
        const normalizedItems = items.map((item) => ({
            idProducto: item.idProducto,
            cantidad: item.cantidad,
            item: item.item || [],
            precio: item.precio,
            variantLabel: item.variantLabel || '',
            cartTitle: item.cartTitle || item.titulo || '',
            gananciaAprox: item.gananciaAprox ?? null,
        }));
        localStorage.setItem('cart', JSON.stringify(normalizedItems));
        window.dispatchEvent(new Event('cartUpdated'));
    };

    const fetchCartItems = async () => {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const items = cart.map((cartItem) => {
            const producto = productos.find(producto => producto.idProducto === cartItem.idProducto);
            if (!producto) return null;
            return {
                ...producto,
                precio: Number(cartItem.precio ?? producto.precio),
                cantidad: cartItem.cantidad,
                item: cartItem.item,
                variantLabel: cartItem.variantLabel || '',
                cartTitle: cartItem.cartTitle || '',
                gananciaAprox: cartItem.gananciaAprox ?? producto?.gananciaAprox ?? null,
            };
        }).filter(Boolean);

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
        const handleCartItemAdded = () => {
            setCartAddMsg('Agregado al carrito');
            setTimeout(() => setCartAddMsg(''), 1800);
        };
        window.addEventListener('cartItemAdded', handleCartItemAdded);
        return () => window.removeEventListener('cartItemAdded', handleCartItemAdded);
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

    const normalizeCodigo = (value) => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 30);

    const handleAplicarCodigo = async () => {
        const normalized = normalizeCodigo(codigo);
        if (!normalized) {
            setCodigoDescuentoPct(0);
            setCodigoAplicado('');
            setCodigoStatus('Escribe un codigo valido.');
            return;
        }

        setValidandoCodigo(true);
        setCodigoStatus('Validando codigo...');

        try {
            const response = await fetch(`${baseURL}/codigosValidate.php?codigo=${encodeURIComponent(normalized)}`, {
                method: 'GET',
            });
            const data = await response.json();
            if (!response.ok || !data?.ok) {
                setCodigoDescuentoPct(0);
                setCodigoAplicado('');
                setCodigoStatus(data?.error || 'Codigo no valido');
                return;
            }

            const pct = Math.max(0, Math.min(100, Number(data.descuento || 0)));
            if (pct <= 0) {
                setCodigoDescuentoPct(0);
                setCodigoAplicado('');
                setCodigoStatus('El codigo no tiene descuento activo.');
                return;
            }

            setCodigo(normalized);
            setCodigoAplicado(data.codigo || normalized);
            setCodigoDescuentoPct(pct);
            setCodigoStatus(`Codigo aplicado: ${pct.toFixed(2)}%`);
        } catch (error) {
            setCodigoDescuentoPct(0);
            setCodigoAplicado('');
            setCodigoStatus('No se pudo validar el codigo.');
        } finally {
            setValidandoCodigo(false);
        }
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
        setOfferPreviewOpen(false);
    };

    const openDetails = () => {
        setDetailsOpen(true);
    };

    const closeDetails = () => {
        setDetailsOpen(false);
        setExitOfferOpen(false);
    };

    const applyShopifyCloseDiscount = () => {
        if (shopifyDiscountApplied) {
            setShopifyDiscountMsg('El 5% ya esta aplicado.');
            return;
        }
        setShopifyDiscountApplied(true);
        setShopifyDiscountMsg('Se aplico 5% de descuento al total.');
    };

    const handleOpenExitOffer = () => {
        setExitOfferOpen(true);
    };

    const handleAcceptExitOffer = () => {
        applyShopifyCloseDiscount();
        setExitOfferOpen(false);
    };

    const handleDeclineExitOffer = () => {
        setExitOfferOpen(false);
        setDetailsOpen(false);
        setModalIsOpen(false);
        setIsFocused(false);
        window.location.href = INSTAGRAM_URL;
    };

    const removeFromCart = (indexToRemove) => {
        const updatedCart = cartItems.filter((_, index) => index !== indexToRemove);
        setCartItems(updatedCart);
        persistCart(updatedCart);
    };

    const clearCart = () => {
        setCartItems([]);
        localStorage.removeItem('cart');
        window.dispatchEvent(new Event('cartUpdated'));
    };

    const increaseQuantity = (index) => {
        const updatedCartItems = [...cartItems];
        updatedCartItems[index].cantidad += 1;
        setCartItems(updatedCartItems);
        persistCart(updatedCartItems);
    };

    const decreaseQuantity = (index) => {
        const updatedCartItems = [...cartItems];
        if (updatedCartItems[index].cantidad > 1) {
            updatedCartItems[index].cantidad -= 1;
            setCartItems(updatedCartItems);
            persistCart(updatedCartItems);
        }
    };

    const ofertasConfiguradas = ofertasCarrito
        .map((oferta) => {
            const producto = productos.find((item) => String(item.idProducto) === String(oferta.idProducto));
            if (!producto) return null;
            const precioOferta =
                oferta.precioOferta !== '' && !Number.isNaN(Number(oferta.precioOferta))
                    ? Number(oferta.precioOferta)
                    : Number(producto.precio);
            return {
                ...producto,
                precioOferta,
            };
        })
        .filter(Boolean)
        .filter((item, idx, arr) => arr.findIndex((x) => String(x.idProducto) === String(item.idProducto)) === idx);

    const ofertaSugerida =
        ofertasConfiguradas.find(
            (oferta) => !cartItems.some((cartItem) => String(cartItem.idProducto) === String(oferta.idProducto))
        ) || ofertasConfiguradas[0] || null;

    const ofertaYaEnCarrito = ofertaSugerida
        ? cartItems.some((cartItem) => String(cartItem.idProducto) === String(ofertaSugerida.idProducto))
        : false;

    const agregarOfertaAlCarrito = (oferta) => {
        if (!oferta) return;
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const idx = cart.findIndex((item) => String(item.idProducto) === String(oferta.idProducto));
        if (idx >= 0) {
            cart[idx].cantidad = Number(cart[idx].cantidad || 1) + 1;
            cart[idx].precio = Number(oferta.precioOferta);
        } else {
            cart.push({
                idProducto: oferta.idProducto,
                cantidad: 1,
                item: [],
                precio: Number(oferta.precioOferta),
                variantLabel: '',
                cartTitle: oferta.titulo || '',
                gananciaAprox: oferta.gananciaAprox ?? null,
            });
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        setCartVersion((prev) => prev + 1);
        window.dispatchEvent(new Event('cartUpdated'));
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
            titulo: item.cartTitle || item.titulo,
            tituloBase: item.titulo,
            variante: item.variantLabel || '',
            cantidad: item.cantidad,
            precio: item.precio,
            total: Number((item.precio * item.cantidad).toFixed(2)),
            gananciaAprox: item.gananciaAprox ?? null,
            gananciaTotal: item.gananciaAprox ? Number(item.gananciaAprox) * Number(item.cantidad || 1) : null,
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
            codigo: codigoAplicado || normalizeCodigo(codigo),
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
            formData.append('codigo', codigoAplicado || normalizeCodigo(codigo));
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
            `- ${item.titulo}${item.variante ? ` (${item.variante})` : ''} x${item.cantidad} - ${moneda} ${formatCOP(item.precio)}`
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
        if (codigoAplicado) {
            messageParts.push(`Codigo: ${codigoAplicado} (${codigoDescuentoPct.toFixed(2)}%)`);
        }
        if (nota.trim()) {
            messageParts.push(`Nota: ${nota.trim()}`);
        }
        messageParts.push(`Forma de pago: ${paymentMethod === 'efectivo' ? 'Efectivo' : 'Transferencia'}`);
        messageParts.push('Productos:');
        messageParts.push(cartDetails.join('\n'));
        if (transferDiscountRate > 0) {
            messageParts.push(`Descuento transferencia: -${moneda} ${formatCOP(transferDiscountAmount)}`);
        }
        if (popupDiscountRate > 0) {
            messageParts.push(`Descuento popup: -${moneda} ${formatCOP(popupDiscountAmount)}`);
        }
        if (codigoDescuentoPct > 0) {
            messageParts.push(`Descuento codigo: -${moneda} ${formatCOP(codigoDiscountAmount)}`);
        }
        messageParts.push(`Total: ${moneda} ${formatCOP(finalTotal)}`);

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
        setCodigoAplicado('');
        setCodigoDescuentoPct(0);
        setCodigoStatus('');
        setNota('');
        setModalIsOpen(false);
        setDetailsOpen(false);
        setIsSubmitting(false);
        setShopifyDiscountApplied(false);
        setShopifyDiscountMsg('');
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
                                        <div key={`${item?.idProducto}-${item?.variantLabel || 'base'}-${index}`} className='cardProductCart' >
                                            <Anchor to={buildProductPath(item?.idProducto, item?.titulo)} onClick={closeModal} className="cardProductCartImage">
                                                <img src={obtenerImagen(item)} alt="imagen" />
                                            </Anchor>
                                            <div className='cardProductCartText'>
                                                <h3>{item.cartTitle || item.titulo}</h3>
                                                <span>
                                                    {item?.item?.map((sabor, saborIndex) => (
                                                        <span key={saborIndex}> {sabor}</span>
                                                    ))}
                                                </span>
                                                <strong>{moneda} {formatCOP(item?.precio)}</strong>
                                                <span className='cartSubtotal'>Subtotal: {moneda} {formatCOP(item?.precio * item.cantidad)}</span>
                                            </div>
                                            <div className='deColumn'>
                                                <button onClick={() => removeFromCart(index)} className='deleteCart'>  <FontAwesomeIcon icon={faTrash} /></button>
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
                            {ofertaSugerida && (
                                <div className='cartOfferCard'>
                                    <div className='cartOfferHeader'>
                                        <span>Oferta de locura</span>
                                    </div>
                                    <div className='cartOfferBody'>
                                        <img src={obtenerImagen(ofertaSugerida)} alt={ofertaSugerida.titulo} />
                                        <div className='cartOfferInfo'>
                                            <strong>{ofertaSugerida.titulo}</strong>
                                            <span>{moneda} {formatCOP(ofertaSugerida.precioOferta)}</span>
                                        </div>
                                        <div className='cartOfferActions'>
                                            <button type='button' className='cartOfferViewBtn' onClick={() => setOfferPreviewOpen(true)}>
                                                <FontAwesomeIcon icon={faEye} /> Ver
                                            </button>
                                            <button
                                                type='button'
                                                className={`cartOfferBtn ${ofertaYaEnCarrito ? 'added' : ''}`}
                                                onClick={() => agregarOfertaAlCarrito(ofertaSugerida)}
                                                disabled={ofertaYaEnCarrito}
                                            >
                                                {ofertaYaEnCarrito ? 'Agregado :)' : 'Super oferta'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className='cartTotals'>
                                <span>Subtotal</span>
                                <strong>{moneda} {formatCOP(totalPrice)}</strong>
                            </div>
                            {transferDiscountRate > 0 && (
                                <div className='cartTotals'>
                                    <span>Desc. transferencia</span>
                                    <strong>-{moneda} {formatCOP(transferDiscountAmount)}</strong>
                                </div>
                            )}
                            {popupDiscountRate > 0 && (
                                <div className='cartTotals'>
                                    <span>Desc. popup</span>
                                    <strong>-{moneda} {formatCOP(popupDiscountAmount)}</strong>
                                </div>
                            )}
                            {codigoDescuentoPct > 0 && (
                                <div className='cartTotals'>
                                    <span>Desc. codigo ({codigoDescuentoPct.toFixed(2)}%)</span>
                                    <strong>-{moneda} {formatCOP(codigoDiscountAmount)}</strong>
                                </div>
                            )}
                            <div className='cartTotals total'>
                                <span>Total</span>
                                <strong>{moneda} {formatCOP(finalTotal)}</strong>
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
                                <button type="button" className='shopifyCloseBtn' onClick={handleOpenExitOffer}>X</button>
                            </div>
                            <div className="modal-send-form">
                                {shopifyDiscountMsg && (
                                    <p className='shopifyDiscountMsg'>{shopifyDiscountMsg}</p>
                                )}
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
                                    onChange={(e) => {
                                        const next = normalizeCodigo(e.target.value);
                                        setCodigo(next);
                                        if (next !== codigoAplicado) {
                                            setCodigoAplicado('');
                                            setCodigoDescuentoPct(0);
                                        }
                                    }}
                                    placeholder='Codigo de descuento (opcional)'
                                />
                                <button type='button' className='btnApplyCode' onClick={handleAplicarCodigo} disabled={validandoCodigo}>
                                    {validandoCodigo ? 'Validando...' : 'Aplicar codigo'}
                                </button>
                                {codigoStatus && (
                                    <p className={`codeStatus ${codigoDescuentoPct > 0 ? 'ok' : ''}`}>{codigoStatus}</p>
                                )}
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
                                            <div className='summaryRow' key={`${item.idProducto}-${item.variantLabel || 'base'}-${item.cantidad}`}>
                                                <span className='summaryName'>{item.cartTitle || item.titulo}</span>
                                                <span className='summaryQty'>x{item.cantidad}</span>
                                                <span className='summaryPrice'>{moneda} {formatCOP(item.precio * item.cantidad)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className='summaryTotals'>
                                        <div className='summaryRow'>
                                            <span>Subtotal</span>
                                            <strong>{moneda} {formatCOP(totalPrice)}</strong>
                                        </div>
                                    {transferDiscountRate > 0 && (
                                        <div className='summaryRow discountRow'>
                                            <span>Descuento transferencia</span>
                                            <strong>-{moneda} {formatCOP(transferDiscountAmount)}</strong>
                                        </div>
                                    )}
                                    {popupDiscountRate > 0 && (
                                        <div className='summaryRow discountRow'>
                                            <span>Descuento popup</span>
                                            <strong>-{moneda} {formatCOP(popupDiscountAmount)}</strong>
                                        </div>
                                    )}
                                    {codigoDescuentoPct > 0 && (
                                        <div className='summaryRow discountRow'>
                                            <span>Descuento codigo ({codigoDescuentoPct.toFixed(2)}%)</span>
                                            <strong>-{moneda} {formatCOP(codigoDiscountAmount)}</strong>
                                        </div>
                                    )}
                                    <div className='summaryRow totalRow'>
                                        <span>Total</span>
                                        <strong>{moneda} {formatCOP(finalTotal)}</strong>
                                    </div>
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
                                                <span className="btnConfirmTotal">💰 {moneda} {formatCOP(finalTotal)}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </Modal>
                        <Modal
                            isOpen={exitOfferOpen}
                            onRequestClose={() => setExitOfferOpen(false)}
                            className="cartExitOfferModal"
                            overlayClassName="cartExitOfferOverlay"
                        >
                            <div className='cartExitOfferContent'>
                                <h3>iEspera!</h3>
                                <p className='cartExitOfferSubtitle'>iTenemos una oferta para ti!</p>
                                <h4>OBTEN UN DESCUENTO EXTRA EN TU PEDIDO:</h4>
                                <div className='cartExitOfferBadge'>5%</div>
                                <p className='cartExitOfferQuestion'>iQuieres completar tu pedido?</p>
                                <button
                                    type='button'
                                    className='cartExitOfferAccept'
                                    onClick={handleAcceptExitOffer}
                                >
                                    COMPLETA TU PEDIDO CON 5% DE DESCUENTO
                                </button>
                                <button
                                    type='button'
                                    className='cartExitOfferDecline'
                                    onClick={handleDeclineExitOffer}
                                >
                                    No gracias
                                </button>
                            </div>
                        </Modal>
                    </>
                )}
            </Modal>
            {cartAddMsg && !modalIsOpen && (
                <div className='cartAddedToast'>{cartAddMsg}</div>
            )}
            <Modal
                isOpen={offerPreviewOpen && Boolean(ofertaSugerida)}
                onRequestClose={() => setOfferPreviewOpen(false)}
                className="cartOfferPreviewModal"
                overlayClassName="overlay-cart"
            >
                {ofertaSugerida && (
                    <div className='cartOfferPreviewContent'>
                        <button type='button' className='cartOfferPreviewClose' onClick={() => setOfferPreviewOpen(false)}>X</button>
                        <img src={obtenerImagen(ofertaSugerida)} alt={ofertaSugerida.titulo} />
                        <h4>{ofertaSugerida.titulo}</h4>
                        <p>{ofertaSugerida.descripcion || 'Producto recomendado para completar tu compra.'}</p>
                        <strong>{moneda} {formatCOP(ofertaSugerida.precioOferta)}</strong>
                        <button
                            type='button'
                            className={`cartOfferBtn ${ofertaYaEnCarrito ? 'added' : ''}`}
                            onClick={() => {
                                agregarOfertaAlCarrito(ofertaSugerida);
                                setOfferPreviewOpen(false);
                            }}
                            disabled={ofertaYaEnCarrito}
                        >
                            {ofertaYaEnCarrito ? 'Agregado :)' : 'Agregar super oferta al carrito'}
                        </button>
                    </div>
                )}
            </Modal>
        </div >
    );
}

