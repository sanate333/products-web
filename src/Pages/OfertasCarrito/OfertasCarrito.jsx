import React, { useEffect, useState } from 'react';
import Header from '../Header/Header';
import HeaderDash from '../../Components/Admin/HeaderDash/HeaderDash';
import './OfertasCarrito.css';
import baseURL, { resolveImg } from '../../Components/url';
import { Link as Anchor } from 'react-router-dom';
import { buildDashboardPath, getTiendaSlug } from '../../utils/tienda';
import { formatCOP } from '../../utils/price';

export default function OfertasCarrito() {
    const [productos, setProductos] = useState([]);
    const [selectedId1, setSelectedId1] = useState('');
    const [precioOferta1, setPrecioOferta1] = useState('');
    const [activaOferta1, setActivaOferta1] = useState(true);
    const [selectedId2, setSelectedId2] = useState('');
    const [precioOferta2, setPrecioOferta2] = useState('');
    const [activaOferta2, setActivaOferta2] = useState(false);
    const [guardado, setGuardado] = useState(false);

    useEffect(() => {
        fetch(`${baseURL}/productosGet.php`, { method: 'GET' })
            .then((response) => response.json())
            .then((data) => {
                setProductos(data.productos || []);
            })
            .catch(() => setProductos([]));

        const savedId1 = localStorage.getItem('ofertaCarritoId1') || '';
        const savedPrecio1 = localStorage.getItem('ofertaCarritoPrecio1') || '';
        const savedId2 = localStorage.getItem('ofertaCarritoId2') || '';
        const savedPrecio2 = localStorage.getItem('ofertaCarritoPrecio2') || '';
        const savedActiva1 = localStorage.getItem('ofertaCarritoActiva1');
        const savedActiva2 = localStorage.getItem('ofertaCarritoActiva2');
        setSelectedId1(savedId1);
        setPrecioOferta1(savedPrecio1);
        setSelectedId2(savedId2);
        setPrecioOferta2(savedPrecio2);
        setActivaOferta1(savedActiva1 === null ? true : savedActiva1 === '1');
        setActivaOferta2(savedActiva2 === '1');
    }, []);

    const selectedProduct1 = productos.find(
        (item) => String(item.idProducto) === String(selectedId1)
    );
    const selectedProduct2 = productos.find(
        (item) => String(item.idProducto) === String(selectedId2)
    );
    const ofertaProductos = productos.filter(
        (item) => (item?.estadoProducto || '').toLowerCase() !== 'desactivado'
    );

    const handleClearOffer = (index) => {
        if (index === 1) {
            setSelectedId1('');
            setPrecioOferta1('');
            setActivaOferta1(false);
            localStorage.removeItem('ofertaCarritoId1');
            localStorage.removeItem('ofertaCarritoPrecio1');
            localStorage.removeItem('ofertaCarritoActiva1');
        }
        if (index === 2) {
            setSelectedId2('');
            setPrecioOferta2('');
            setActivaOferta2(false);
            localStorage.removeItem('ofertaCarritoId2');
            localStorage.removeItem('ofertaCarritoPrecio2');
            localStorage.removeItem('ofertaCarritoActiva2');
        }
    };

    const handleGuardar = () => {
        localStorage.setItem('ofertaCarritoId1', selectedId1);
        localStorage.setItem('ofertaCarritoPrecio1', precioOferta1);
        localStorage.setItem('ofertaCarritoActiva1', activaOferta1 ? '1' : '0');
        localStorage.setItem('ofertaCarritoId2', selectedId2);
        localStorage.setItem('ofertaCarritoPrecio2', precioOferta2);
        localStorage.setItem('ofertaCarritoActiva2', activaOferta2 ? '1' : '0');
        window.dispatchEvent(new Event('cartUpdated'));
        setGuardado(true);
        setTimeout(() => setGuardado(false), 2000);
    };

    const tiendaSlug = getTiendaSlug();
    const backLink = buildDashboardPath(tiendaSlug, '/dashboard/productos');

    return (
        <div className="containerGrid">
            <Header />
            <section className="containerSection">
                <HeaderDash />
                <div className="container">
                    <div className="ofertasCard">
                        <div className="ofertasCardHeader">
                            <div>
                                <h3>Productos ofertas carrito</h3>
                                <p>Configura el producto y el precio que aparecen en la oferta.</p>
                            </div>
                            <Anchor to={backLink} className="ofertasBack">
                                Regresar
                            </Anchor>
                        </div>
                        <div className="ofertasBody">
                            <div className="ofertasGroup">
                                <h4>Oferta 1</h4>
                                <label className="ofertaToggle">
                                    <input
                                        type="checkbox"
                                        checked={activaOferta1}
                                        onChange={(event) => setActivaOferta1(event.target.checked)}
                                    />
                                    Activa
                                </label>
                                <label>Producto</label>
                                <select
                                    value={selectedId1}
                                    onChange={(event) => setSelectedId1(event.target.value)}
                                >
                                    <option value="">Selecciona un producto</option>
                                    {ofertaProductos.map((item) => (
                                        <option key={item.idProducto} value={item.idProducto}>
                                            {item.titulo}
                                        </option>
                                    ))}
                                </select>

                                <label>Precio de oferta</label>
                                <input
                                    type="number"
                                    value={precioOferta1}
                                    onChange={(event) => setPrecioOferta1(event.target.value)}
                                    placeholder="Ej: 39000"
                                />
                            </div>

                            <div className="ofertasGroup">
                                <h4>Oferta 2</h4>
                                <label className="ofertaToggle">
                                    <input
                                        type="checkbox"
                                        checked={activaOferta2}
                                        onChange={(event) => setActivaOferta2(event.target.checked)}
                                    />
                                    Activa
                                </label>
                                <label>Producto</label>
                                <select
                                    value={selectedId2}
                                    onChange={(event) => setSelectedId2(event.target.value)}
                                >
                                    <option value="">Selecciona un producto</option>
                                    {ofertaProductos.map((item) => (
                                        <option key={item.idProducto} value={item.idProducto}>
                                            {item.titulo}
                                        </option>
                                    ))}
                                </select>

                                <label>Precio de oferta</label>
                                <input
                                    type="number"
                                    value={precioOferta2}
                                    onChange={(event) => setPrecioOferta2(event.target.value)}
                                    placeholder="Ej: 39000"
                                />
                            </div>

                            <button
                                type="button"
                                className="ofertasSave"
                                onClick={handleGuardar}
                                disabled={!selectedId1 && !selectedId2}
                            >
                                Guardar ofertas
                            </button>
                            {guardado && (
                                <span className="ofertasSaved">Ofertas guardadas.</span>
                            )}
                        </div>

                        {selectedProduct1 && (
                            <div className="ofertasPreview">
                                <img src={resolveImg(selectedProduct1.imagen1)} alt={selectedProduct1.titulo} />
                                <div>
                                    <strong>{selectedProduct1.titulo}</strong>
                                    <span>
                                        Precio: {formatCOP(precioOferta1 || selectedProduct1.precio)}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="ofertasRemove"
                                    onClick={() => handleClearOffer(1)}
                                    aria-label="Quitar oferta 1"
                                >
                                    X
                                </button>
                            </div>
                        )}
                        {selectedProduct2 && (
                            <div className="ofertasPreview">
                                <img src={resolveImg(selectedProduct2.imagen1)} alt={selectedProduct2.titulo} />
                                <div>
                                    <strong>{selectedProduct2.titulo}</strong>
                                    <span>
                                        Precio: {formatCOP(precioOferta2 || selectedProduct2.precio)}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="ofertasRemove"
                                    onClick={() => handleClearOffer(2)}
                                    aria-label="Quitar oferta 2"
                                >
                                    X
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
