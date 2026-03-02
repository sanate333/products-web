import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import baseURL, { resolveImg } from '../../url';
import './SubBannerData.css';
import NewSubBanner from '../SubBannerData/NewSubBanner';

export default function SubBannerData() {
    const [activeTab, setActiveTab] = useState('banner');
    const [banners, setBanners] = useState([]);
    const [subBanners, setSubBanners] = useState([]);
    const [catalogoBanners, setCatalogoBanners] = useState([]);
    const [draggingId, setDraggingId] = useState(null);

    useEffect(() => {
        cargarBanners();
        cargarSubBanners();
        cargarBannersCatalogo();
    }, []);

    // ===== BANNERS PRINCIPALES (HOME) =====
    const cargarBanners = async () => {
        try {
            const response = await fetch(`${baseURL}/bannersGet.php`);
            if (response.ok) {
                const data = await response.json();
                setBanners(data.banner || []);
            }
        } catch (error) {
            console.error('Error al cargar banners:', error);
        }
    };

    const eliminarBanner = (idBanner) => {
        Swal.fire({
            title: '¿Estás seguro?',
            text: 'No podrás revertir esto.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await fetch(`${baseURL}/bannerDelete.php?idBanner=${idBanner}`, {
                        method: 'DELETE',
                    });
                    if (response.ok) {
                        Swal.fire('Eliminado', 'Banner eliminado', 'success');
                        cargarBanners();
                    }
                } catch (error) {
                    toast.error('Error al eliminar banner.');
                }
            }
        });
    };

    const reemplazarBanner = async (idBanner, file) => {
        if (!file) return;
        const formData = new FormData();
        formData.append('imagen', file);

        try {
            const response = await fetch(`${baseURL}/bannersPost.php`, {
                method: 'POST',
                body: formData
            });
            if (response.ok) {
                await fetch(`${baseURL}/bannerDelete.php?idBanner=${idBanner}`, { method: 'DELETE' });
                cargarBanners();
            }
        } catch (error) {
            toast.error('Error al reemplazar banner.');
        }
    };

    // ===== SUB-BANNERS =====
    const cargarSubBanners = async () => {
        try {
            const response = await fetch(`${baseURL}/subbannersGet.php`);
            if (response.ok) {
                const data = await response.json();
                setSubBanners(data.subbanner || []);
            }
        } catch (error) {
            console.error('Error al cargar sub-banners:', error);
        }
    };

    const eliminarSubBanner = (idSubBanner) => {
        Swal.fire({
            title: '¿Estás seguro?',
            text: 'No podrás revertir esto.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await fetch(`${baseURL}/subbannerDelete.php?idSubBanner=${idSubBanner}`, {
                        method: 'DELETE',
                    });
                    if (response.ok) {
                        Swal.fire('Eliminado', 'Sub-banner eliminado', 'success');
                        cargarSubBanners();
                    }
                } catch (error) {
                    toast.error('Error al eliminar sub-banner.');
                }
            }
        });
    };

    const reemplazarSubBanner = async (idSubBanner, file) => {
        if (!file) return;
        const formData = new FormData();
        formData.append('imagen', file);

        try {
            const response = await fetch(`${baseURL}/subbannersPost.php`, {
                method: 'POST',
                body: formData
            });
            if (response.ok) {
                await fetch(`${baseURL}/subbannerDelete.php?idSubBanner=${idSubBanner}`, { method: 'DELETE' });
                cargarSubBanners();
            }
        } catch (error) {
            toast.error('Error al reemplazar sub-banner.');
        }
    };

    // ===== BANNERS CATÁLOGO =====
    const cargarBannersCatalogo = async () => {
        try {
            const response = await fetch(`${baseURL}/bannersGet.php?tipo=catalogo`);
            if (response.ok) {
                const data = await response.json();
                setCatalogoBanners(data.banner || []);
            }
        } catch (error) {
            console.error('Error al cargar banners de catálogo:', error);
        }
    };

    const eliminarBannerCatalogo = (idBanner) => {
        Swal.fire({
            title: '¿Estás seguro?',
            text: 'No podrás revertir esto.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await fetch(`${baseURL}/bannerDelete.php?idBanner=${idBanner}`, {
                        method: 'DELETE',
                    });
                    if (response.ok) {
                        Swal.fire('Eliminado', 'Banner de catálogo eliminado', 'success');
                        cargarBannersCatalogo();
                    }
                } catch (error) {
                    toast.error('Error al eliminar banner de catálogo.');
                }
            }
        });
    };

    const reemplazarBannerCatalogo = async (idBanner, file) => {
        if (!file) return;
        const formData = new FormData();
        formData.append('imagen', file);

        try {
            const response = await fetch(`${baseURL}/bannersPost.php`, {
                method: 'POST',
                body: formData
            });
            if (response.ok) {
                await fetch(`${baseURL}/bannerDelete.php?idBanner=${idBanner}`, { method: 'DELETE' });
                cargarBannersCatalogo();
            }
        } catch (error) {
            toast.error('Error al reemplazar banner de catálogo.');
        }
    };

    // ===== RENDERIZADO =====
    const currentItems = activeTab === 'banner' ? banners : activeTab === 'subbanner' ? subBanners : catalogoBanners;
    const handleEliminar = activeTab === 'banner' ? eliminarBanner : activeTab === 'subbanner' ? eliminarSubBanner : eliminarBannerCatalogo;
    const handleReemplazar = activeTab === 'banner' ? reemplazarBanner : activeTab === 'subbanner' ? reemplazarSubBanner : reemplazarBannerCatalogo;
    const getBannerId = (item) => item.idBanner || item.idSubBanner || item.id;

    return (
        <div className='BannerContainer'>
            <ToastContainer />

            {/* TABS */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button
                    onClick={() => setActiveTab('banner')}
                    style={{
                        padding: '10px 20px',
                        background: activeTab === 'banner' ? '#24b5ff' : '#eaf7ff',
                        color: activeTab === 'banner' ? '#fff' : '#169fdf',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: activeTab === 'banner' ? 'bold' : 'normal'
                    }}
                >
                    Banner
                </button>
                <button
                    onClick={() => setActiveTab('subbanner')}
                    style={{
                        padding: '10px 20px',
                        background: activeTab === 'subbanner' ? '#24b5ff' : '#eaf7ff',
                        color: activeTab === 'subbanner' ? '#fff' : '#169fdf',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: activeTab === 'subbanner' ? 'bold' : 'normal'
                    }}
                >
                    Sub-Banner
                </button>
                <button
                    onClick={() => setActiveTab('catalogo')}
                    style={{
                        padding: '10px 20px',
                        background: activeTab === 'catalogo' ? '#24b5ff' : '#eaf7ff',
                        color: activeTab === 'catalogo' ? '#fff' : '#169fdf',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: activeTab === 'catalogo' ? 'bold' : 'normal'
                    }}
                >
                    Banner Catálogo
                </button>
            </div>

            <NewSubBanner onSuccess={() => {
                if (activeTab === 'banner') cargarBanners();
                else if (activeTab === 'subbanner') cargarSubBanners();
                else cargarBannersCatalogo();
            }} />

            <p className='subBannerNote'>
                {activeTab === 'banner' && 'Banner principal del home'}
                {activeTab === 'subbanner' && 'Sub-banners debajo del banner principal'}
                {activeTab === 'catalogo' && 'Banners que aparecen en la página de catálogo'}
            </p>

            <div className='BannerWrap'>
                {currentItems.map((item, index) => (
                    <div key={getBannerId(item)} className='cardBanner'>
                        <span className='bannerBadge'>{index === 0 ? 'Principal' : `#${index + 1}`}</span>
                        <img src={resolveImg(item.imagen)} alt="banner" />
                        <div className='bannerActions'>
                            <button className='btnBannerDelete' onClick={() => handleEliminar(getBannerId(item))}>
                                <FontAwesomeIcon icon={faTrash} />
                            </button>
                            <label className='btnBannerReplace'>
                                Cambiar
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(event) => handleReemplazar(getBannerId(item), event.target.files[0])}
                                />
                            </label>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
