import React, { useEffect, useState } from 'react';
import './CardsCantidad.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faBook, faImage, faAddressBook, faTachometerAlt, faCode, faTable, faClipboardList } from '@fortawesome/free-solid-svg-icons';
import { Link as Anchor } from "react-router-dom";
import baseURL from '../../url';
import contador from '../../contador'
export default function CardsCantidad() {
    const [productos, setProductos] = useState([]);
    const [banners, setBanners] = useState([]);
    const [categorias, setCategoras] = useState([]);
    const [codigos, setCodigos] = useState([]);
    const [pedidos, setPedidos] = useState([]);
    const [mesas, setMesas] = useState([]);
    useEffect(() => {
        cargarProductos();
        cargarBanners();
        cargarCategoria();
        cargarCodigos();
        cargarPedidos();
        cargarMesas();
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



    const cargarBanners = () => {
        fetch(`${baseURL}/bannersGet.php`, {
            method: 'GET',
        })
            .then(response => response.json())
            .then(data => {
                setBanners(data.banner || []);
                console.log(data.banner)
            })
            .catch(error => console.error('Error al cargar banners:', error));
    };


    const cargarCategoria = () => {
        fetch(`${baseURL}/categoriasGet.php`, {
            method: 'GET',
        })
            .then(response => response.json())
            .then(data => {
                setCategoras(data.categorias || []);
                console.log(data.categorias)
            })
            .catch(error => console.error('Error al cargar contactos:', error));
    };


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
    const cargarPedidos = () => {
        fetch(`${baseURL}/pedidoGet.php`, {
            method: 'GET',
        })
            .then(response => response.json())
            .then(data => {
                setPedidos(data.pedidos || []);
                console.log(data.pedidos)
            })
            .catch(error => console.error('Error al cargar pedidos:', error));
    };
    const cargarMesas = () => {
        fetch(`${baseURL}/mesaGet.php`, {
            method: 'GET',
        })
            .then(response => response.json())
            .then(data => {
                setMesas(data.mesas || []);
                console.log(data.mesas)
            })
            .catch(error => console.error('Error al cargar mesas:', error));
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
        cargarMesas();
        cargarPedidos();
    };
    return (
        <div className='CardsCantidad'>

            <Anchor to={`/dashboard/productos`} className='cardCantidad' >
                <FontAwesomeIcon icon={faBook} className='icons' />
                <div>

                    <h3>Productos</h3>
                    <h2>{productos.length}</h2>
                </div>

            </Anchor>
            <Anchor to={`/dashboard/banners`} className='cardCantidad' >
                <FontAwesomeIcon icon={faImage} className='icons' />
                <div>

                    <h3>Banners</h3>
                    <h2>{banners.length}</h2>
                </div>

            </Anchor>
            <Anchor to={`/dashboard/categorias`} className='cardCantidad' >
                <FontAwesomeIcon icon={faTachometerAlt} className='icons' />
                <div>

                    <h3>Categorias</h3>
                    <h2>{categorias.length}</h2>
                </div>

            </Anchor>

            <Anchor to={`/dashboard/codigos`} className='cardCantidad' >
                <FontAwesomeIcon icon={faCode} className='icons' />
                <div>
                    <h3>Codigos</h3>
                    <h2>{codigos.length}</h2>
                </div>

            </Anchor>
            <Anchor to={`/dashboard/mesas`} className='cardCantidad' >
                <FontAwesomeIcon icon={faTable} className='icons' />
                <div>
                    <h3>Mesas</h3>
                    <h2>{mesas.length}</h2>
                </div>

            </Anchor>
            <Anchor to={`/dashboard/pedidos`} className='cardCantidad' >
                <FontAwesomeIcon icon={faClipboardList} className='icons' />
                <div>
                    <h3>Pedidos</h3>
                    <h2>{pedidos.length}</h2>
                </div>

            </Anchor>
        </div>
    )
}
