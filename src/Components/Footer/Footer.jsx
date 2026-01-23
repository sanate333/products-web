import React, { useEffect, useState } from 'react';
import './Footer.css'
import { Link as Anchor } from 'react-router-dom';
import logo from '../../images/logo.png'
import baseURL from '../url';

const INSTAGRAM_URL = 'https://www.instagram.com/sanate.col/';
const FACEBOOK_URL = 'https://www.facebook.com/SanateColombia';
const WHATSAPP_NUMBER = '573234549614';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
export default function Footer() {
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [contactos, setContactos] = useState([]);
    useEffect(() => {
        cargarProductos();

    }, []);
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
                setCategorias(categoriasArray?.slice(0, 3));
                setProductos(data.productos?.slice(0, 3));
            })
            .catch(error => console.error('Error al cargar productos:', error));
    };

    useEffect(() => {
        cargarContacto();

    }, []);


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


    return (
        <div className='FooterContain'>
            <div className='footerText'>
                <Anchor to='' target="_blank">   <img src={logo} alt="logo" /></Anchor>
                <h2>
                    {contactos.nombre}
                </h2>
                <div className='socials'>
                    <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer"><i className='fa fa-instagram'></i></a>
                    <a href={WHATSAPP_URL} target="_blank" rel="noreferrer"><i className='fa fa-whatsapp'></i></a>
                    <a href={FACEBOOK_URL} target="_blank" rel="noreferrer"><i className='fa fa-facebook'></i></a>
                    <span className='androidInfo'><i className='fa fa-android'></i></span>

                </div>
            </div>
            <div className='footerText'>
                <h3>Productos</h3>
                {
                    productos?.map(item => (
                        <Anchor to='' >{item?.titulo?.slice(0, 33)}</Anchor>
                    ))
                }

            </div>
        </div>
    )
}
