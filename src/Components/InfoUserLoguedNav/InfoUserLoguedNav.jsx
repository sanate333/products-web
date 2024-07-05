import React, { useState, useEffect } from 'react';
import './InfoUserLoguedNav.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, } from '@fortawesome/free-solid-svg-icons';
import { Link as Anchor } from 'react-router-dom';
import baseURL from '../url';
export default function InfoUserLoguedNav() {
    const [usuario, setUsuario] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${baseURL}/userLogued.php`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                setUsuario(data);
                setLoading(false);
                console.log(data)
            })
            .catch(error => {
                console.error('Error al obtener datos:', error);
                setLoading(false);
            });
    }, []);

    return (
        <div>
            {loading ? (
                <div>cargando</div>
            ) : usuario.idUsuario ? ( // Verifica si hay un usuario válido
                <Anchor to={`meseros`} className='InfoUserLoguedNav'>
                    <strong>{usuario.nombre.slice(0.13)}</strong>
                    <span> {usuario.rol}</span>
                </Anchor>
            ) : (
                <Anchor to={`meseros`} className='InfoUserLoguedNav'>

                    <strong> Usuario</strong>
                    <span>  Mesero</span>

                </Anchor>
            )}
        </div>
    );
}
