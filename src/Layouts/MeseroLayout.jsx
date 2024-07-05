import React, { useState, useEffect } from 'react';
import Spiner from '../Components/Admin/Spiner/Spiner';
import { Outlet } from 'react-router-dom';
import Auth from '../Components/Admin/Auth/Auth';
import baseURL from '../Components/url';
import Nabvar from '../Components/Navbar/Navbar';

export default function MeserosPage() {
    const [usuario, setUsuario] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`${baseURL}/userLogued.php`);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                setUsuario(data);
                setLoading(false);

            } catch (error) {
                console.error('Error al obtener datos:', error);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <div className='section-bg-color'>
            {loading ? (
                <></>
            ) : usuario?.idUsuario ? (
                <>
                    <Nabvar />
                    <div className='espaciobg'></div>
                </>
            ) : (
                <>

                </>
            )}

            <div className='demo'>

                {loading ? (
                    <Spiner />
                ) : usuario?.idUsuario ? (
                    <div>
                        <div className='espaciobg2'></div>
                        {(usuario.rol === 'mesero' || usuario.rol === 'admin') ? (
                            <Outlet />
                        ) : (
                            <Auth />
                        )}
                    </div>
                ) : (
                    <Auth />
                )}
            </div>
        </div>
    );
}
