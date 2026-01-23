import React, { useEffect, useState, useRef } from 'react';
import logo from '../../images/logo.png'
import './Profile.css'
import { Link as Anchor } from 'react-router-dom';
import baseURL from '../url';

const INSTAGRAM_URL = 'https://www.instagram.com/sanate.col/';
const FACEBOOK_URL = 'https://www.facebook.com/SanateColombia';
const WHATSAPP_NUMBER = '573234549614';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
export default function Profile() {
    const [contactos, setContactos] = useState([]);

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
        <div className='profileContain'>
            <img src={logo} alt="" />
            <h2>{contactos.nombre}</h2>
            <div className='socials'>
                <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer"><i className='fa fa-instagram'></i></a>
                <a href={WHATSAPP_URL} target="_blank" rel="noreferrer"><i className='fa fa-whatsapp'></i></a>
                <a href={FACEBOOK_URL} target="_blank" rel="noreferrer"><i className='fa fa-facebook'></i></a>
            </div>
        </div>
    )
}
