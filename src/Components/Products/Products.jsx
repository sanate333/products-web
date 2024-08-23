import React, { useEffect, useState, useRef } from 'react';
import baseURL from '../url';
import './Products.css';
import SwiperCore, { Navigation, Pagination, Autoplay } from 'swiper/core';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/swiper-bundle.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleDoubleRight } from '@fortawesome/free-solid-svg-icons';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ProductosLoading from '../ProductosLoading/ProductosLoading';
import { Link as Anchor } from "react-router-dom";
import moneda from '../moneda';

SwiperCore.use([Navigation, Pagination, Autoplay]);

export default function Products() {
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fixedCategories, setFixedCategories] = useState(false);
    const categoriasRefs = useRef([]);
    const categoriasInputRef = useRef(null);
    const swiperRef = useRef(null);
    const [productos, setProductos] = useState([]);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todo');

    const handleClickCategoria = (categoria) => {
        setCategoriaSeleccionada(categoria);
    };

    useEffect(() => {
        cargarProductos();
        cargarCategorias();

        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const handleScroll = () => {
        if (categoriasInputRef.current) {
            if (window.scrollY > categoriasInputRef.current.offsetTop) {
                setFixedCategories(true);
            } else {
                setFixedCategories(false);
            }
        }
    };


    const cargarProductos = () => {
        fetch(`${baseURL}/productosGet.php`, {
            method: 'GET',
        })
            .then(response => response.json())
            .then(data => {
                setProductos(data.productos);
                setLoading(false);
            })
            .catch(error => console.error('Error al cargar productos:', error));
    };

    const cargarCategorias = () => {
        fetch(`${baseURL}/categoriasGet.php`, {
            method: 'GET',
        })
            .then(response => response.json())
            .then(data => {
                setCategorias(data.categorias || []);
            })
            .catch(error => console.error('Error al cargar categorías:', error));
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

    const categoriasConProductos = categorias.filter(categoria =>
        productos?.some(producto => producto?.idCategoria === categoria?.idCategoria)
    );

    return (
        <div className='ProductsContain'>
            <ToastContainer />
            {productos?.length > 0 && (
                <div className={`categoriasInputs ${fixedCategories ? 'fixed' : ''}`} ref={categoriasInputRef}>
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
                    {categoriasConProductos.map(({ categoria, idCategoria }) => (
                        <input
                            key={idCategoria}
                            type="button"
                            value={categoria}
                            onClick={() => handleClickCategoria(idCategoria)}
                            style={{
                                backgroundColor: categoriaSeleccionada === idCategoria ? '#F80050' : '',
                                color: categoriaSeleccionada === idCategoria ? '#fff' : '',
                                borderBottom: categoriaSeleccionada === idCategoria ? '2px solid #F80050' : 'none'
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
                            {productos?.some(item => item.masVendido === "si") && (
                                <div className='categoriSection'>
                                    <Swiper
                                        effect={'coverflow'}
                                        grabCursor={true}
                                        slidesPerView={'auto'}
                                        id='swiper_container_products'
                                        autoplay={{ delay: 3000 }}
                                    >
                                        {productos?.filter(item => item.masVendido === "si").map(item => (
                                            <SwiperSlide key={item.idProducto} id='SwiperSlide-scroll-products-masvendidos'>
                                                <Anchor className='cardProdcutmasVendido' to={`/producto/${item.idProducto}/${item.titulo.replace(/\s+/g, '-')}`}>
                                                    <img src={obtenerImagen(item)} alt="imagen" />
                                                    <h6 className='masVendido'>Más Vendido</h6>
                                                    <div className='cardText'>
                                                        <h4>{item.titulo}</h4>
                                                        <span>{item.descripcion}</span>
                                                        <div className='deFLexPrice'>
                                                            <h5> {moneda} {item?.precio}</h5>
                                                            {(item.precioAnterior >= 1 && item.precioAnterior !== undefined) && (
                                                                <h5 className='precioTachado'>{moneda} {item?.precioAnterior}</h5>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Anchor>
                                            </SwiperSlide>
                                        ))}
                                    </Swiper>
                                </div>
                            )}

                            {categoriasConProductos?.map(({ categoria, idCategoria }) => (
                                <div key={idCategoria} className='categoriSection' ref={ref => categoriasRefs.current[categorias.findIndex(cat => cat.idCategoria === idCategoria)] = ref}>
                                    <div className='deFlexTitlesection'>
                                        <h3>{categoria}</h3>
                                        <button onClick={() => handleClickCategoria(idCategoria)}>
                                            Ver más
                                        </button>
                                    </div>

                                    <Swiper
                                        effect={'coverflow'}
                                        grabCursor={true}
                                        slidesPerView={'auto'}
                                        id='swiper_container_products'
                                    >


                                        {productos?.filter(item => item.idCategoria === idCategoria).map(item => (
                                            <SwiperSlide id='SwiperSlide-scroll-products' key={item.idProducto}>
                                                <Anchor className='cardProdcut' key={item.idProducto} to={`/producto/${item.idProducto}/${item.titulo.replace(/\s+/g, '-')}`}>

                                                    <img src={obtenerImagen(item)} alt="imagen" />
                                                    <div className='cardText'>
                                                        <h4>{item.titulo}</h4>
                                                        <span>{item.descripcion}</span>
                                                        <div className='deFLexPrice'>
                                                            <h5> {moneda} {item?.precio}</h5>
                                                            {(item.precioAnterior >= 1 && item.precioAnterior !== undefined) && (
                                                                <h5 className='precioTachado'>{moneda} {item?.precioAnterior}</h5>
                                                            )}
                                                        </div>
                                                        <FontAwesomeIcon icon={faAngleDoubleRight} className='iconCard' />
                                                    </div>

                                                </Anchor>
                                            </SwiperSlide>
                                        ))}

                                    </Swiper>
                                </div>

                            ))}
                        </>
                    )}

                    <div className='categoriSectionSelected'>
                        {productos
                            ?.filter(item => categoriaSeleccionada !== 'Todo' && item.idCategoria === categoriaSeleccionada)
                            ?.map(item => (
                                <Anchor key={item.idProducto} to={`/producto/${item.idProducto}/${item.titulo.replace(/\s+/g, '-')}`}>
                                    <div className='cardProdcutSelected'>
                                        <img src={obtenerImagen(item)} alt="imagen" />
                                        <div className='cardTextSelected'>
                                            <h4>{item.titulo}</h4>
                                            <span>{item.descripcion}</span>
                                            <div className='deFLexPrice'>
                                                <h5> {moneda} {item?.precio}</h5>
                                                {(item.precioAnterior >= 1 && item.precioAnterior !== undefined) && (
                                                    <h5 className='precioTachado'>{moneda} {item?.precioAnterior}</h5>
                                                )}
                                            </div>
                                            <FontAwesomeIcon icon={faAngleDoubleRight} className='iconCard' />
                                        </div>
                                    </div>
                                </Anchor>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
}
