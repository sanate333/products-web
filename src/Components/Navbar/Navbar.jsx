import React, { useEffect, useState } from 'react';
import { Link as Anchor, useLocation } from 'react-router-dom';
import Modal from 'react-modal';
import logo from '../../images/logo.png';
import baseURL, { resolveImg } from '../url';
import 'swiper/swiper-bundle.css';
import Profile from '../Profile/Profile';
import './Navbar.css';
import InputSerach from '../InputSerach/InputSearchs';
import Logout from '../Admin/Logout/Logout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShoppingCart } from '@fortawesome/free-solid-svg-icons';
export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const location = useLocation();  // Obtén la ubicación actual
    const [usuario, setUsuario] = useState({});

    useEffect(() => {
        cargarBanners();
    }, []);

    const cargarBanners = () => {
        fetch(`${baseURL}/bannersGet.php`, {
            method: 'GET',
        })
            .then(response => response.json())
            .then(data => {
                const bannerImages = data.banner.map(banner => resolveImg(banner.imagen));
                setImages(bannerImages);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error al cargar productos:', error);
            });
    };

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
                console.log(data);
            })
            .catch(error => {
                console.error('Error al obtener datos:', error);
                setLoading(false);
            });
    }, []);

    return (
        <header>
            <nav>
                <Anchor to={`/`} className='logo'>
                    <img src={logo} alt="logo" />

                </Anchor>

                <div className='deFLexNavs'>
                    <button className='cartIcon' onClick={() => window.dispatchEvent(new Event('openCheckout'))}>
                        <FontAwesomeIcon icon={faShoppingCart} />
                    </button>
                    <InputSerach />

                    <div className={`nav_toggle  ${isOpen && "open"}`} onClick={() => setIsOpen(!isOpen)}>
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>

                <Modal
                    isOpen={isOpen}
                    onRequestClose={() => setIsOpen(false)}
                    className="modalNav"
                    overlayClassName="overlay"
                >
                    <div className="modalNav-content">
                        {loading ? (
                            <div className='loadingBannerFondo'>
                            </div>
                        ) : (
                            <>
                                <div className='fondo'>
                                    <img src={images[0]} alt={`imagen`} />
                                </div>
                                <Profile />
                                <div className='menuLinks'>
                                    <Anchor to='/' onClick={() => setIsOpen(false)}>Inicio</Anchor>
                                    <Anchor to='/' onClick={() => setIsOpen(false)}>Contacto</Anchor>
                                </div>
                                <div className='menuFooter'>
                                    <Anchor to='/dashboard' onClick={() => setIsOpen(false)}>Iniciar sesion</Anchor>
                                </div>
                                {loading ? (
                                    <div></div>
                                ) : usuario.idUsuario ? (
                                    <Logout />
                                ) : (
                                    <></>
                                )}

                            </>
                        )}
                    </div>

                </Modal>
            </nav>
        </header>
    );
}
