import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import baseURL, { resolveImg } from '../../url';
import './SubBannerData.css';
import NewSubBanner from '../SubBannerData/NewSubBanner';
import NewBanner from '../NewBanner/NewBanner';

export default function SubBannerData() {
    const [activeTab, setActiveTab] = useState('banner');
    const [banners, setBanners] = useState([]);
    const [subBanners, setSubBanners] = useState([]);
    const [catalogoBanners, setCatalogoBanners] = useState([]);
    const [draggingId, setDraggingId] = useState(null);
    const [dragOverId, setDragOverId] = useState(null);

    useEffect(() => {
        cargarBanners();
        cargarSubBanners();
        cargarBannersCatalogo();
    }, []);

    // ===== BANNERS PRINCIPALES (HOME) =====
    const cargarBanners = async () => {
        try {
            const response = await fetch(`${baseURL}/bannersGet.php?tipo=home`);
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
        formData.append('tipo', 'home');

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
        formData.append('tipo', 'catalogo');

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

    // ===== DRAG TO REORDER =====
    const handleDragStart = (id) => {
        setDraggingId(id);
    };

    const handleDragOver = (e, id) => {
        e.preventDefault();
        if (id !== draggingId) setDragOverId(id);
    };

    const handleDrop = async (droppedOnId) => {
        if (!draggingId || draggingId === droppedOnId) {
            setDraggingId(null);
            setDragOverId(null);
            return;
        }

        if (activeTab === 'subbanner') {
            const list = [...subBanners];
            const fromIdx = list.findIndex(i => i.idSubBanner === draggingId);
            const toIdx = list.findIndex(i => i.idSubBanner === droppedOnId);
            if (fromIdx === -1 || toIdx === -1) { setDraggingId(null); setDragOverId(null); return; }
            const [moved] = list.splice(fromIdx, 1);
            list.splice(toIdx, 0, moved);
            setSubBanners(list);
            const items = list.map((item, idx) => ({ idSubBanner: item.idSubBanner, orden: idx }));
            try {
                await fetch(`${baseURL}/subbannerReorder.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items })
                });
            } catch (e) { toast.error('Error al guardar orden.'); }
        } else {
            const list = activeTab === 'banner' ? [...banners] : [...catalogoBanners];
            const setter = activeTab === 'banner' ? setBanners : setCatalogoBanners;
            const fromIdx = list.findIndex(i => i.idBanner === draggingId);
            const toIdx = list.findIndex(i => i.idBanner === droppedOnId);
            if (fromIdx === -1 || toIdx === -1) { setDraggingId(null); setDragOverId(null); return; }
            const [moved] = list.splice(fromIdx, 1);
            list.splice(toIdx, 0, moved);
            setter(list);
            const items = list.map((item, idx) => ({ idBanner: item.idBanner, orden: idx }));
            try {
                await fetch(`${baseURL}/bannerReorder.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items })
                });
            } catch (e) { toast.error('Error al guardar orden.'); }
        }

        setDraggingId(null);
        setDragOverId(null);
    };

    const handleDragEnd = () => {
        setDraggingId(null);
        setDragOverId(null);
    };

    // ===== RENDERIZADO =====
    const currentItems = activeTab === 'banner' ? banners : activeTab === 'subbanner' ? subBanners : catalogoBanners;
    const handleEliminar = activeTab === 'banner' ? eliminarBanner : activeTab === 'subbanner' ? eliminarSubBanner : eliminarBannerCatalogo;
    const handleReemplazar = activeTab === 'banner' ? reemplazarBanner : activeTab === 'subbanner' ? reemplazarSubBanner : reemplazarBannerCatalogo;
    const getBannerId = (item) => item.idBanner || item.idSubBanner || item.id;
    const isCatalogoTab = activeTab === 'catalogo';

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

            {activeTab === 'subbanner'
                ? <NewSubBanner onCreated={cargarSubBanners} />
                : <NewBanner
                    tipo={activeTab === 'catalogo' ? 'catalogo' : 'home'}
                    onCreated={activeTab === 'catalogo' ? cargarBannersCatalogo : cargarBanners}
                  />
            }

            <p className='subBannerNote'>
                {activeTab === 'banner' && 'Banner principal del home — arrastra para reordenar'}
                {activeTab === 'subbanner' && 'Sub-banners debajo del banner principal — arrastra para reordenar'}
                {activeTab === 'catalogo' && 'Banners de la página de catálogo — arrastra para reordenar'}
            </p>

            <div className='BannerWrap'>
                {currentItems.map((item, index) => {
                    const id = getBannerId(item);
                    const isDragging = draggingId === id;
                    const isOver = dragOverId === id;
                    return (
                        <div
                            key={id}
                            className={`cardBanner${isDragging ? ' dragging' : ''}${isOver ? ' dragOver' : ''}${isCatalogoTab ? ' cardBannerCatalogo' : ''}`}
                            draggable
                            onDragStart={() => handleDragStart(id)}
                            onDragOver={(e) => handleDragOver(e, id)}
                            onDrop={() => handleDrop(id)}
                            onDragEnd={handleDragEnd}
                        >
                            <span className='bannerBadge'>{index === 0 ? 'Principal' : `#${index + 1}`}</span>
                            <img
                                src={resolveImg(item.imagen)}
                                alt="banner"
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            <div className='bannerActions'>
                                <button className='btnBannerDelete' onClick={() => handleEliminar(id)}>
                                    <FontAwesomeIcon icon={faTrash} />
                                </button>
                                <label className='btnBannerReplace'>
                                    Cambiar
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(event) => handleReemplazar(id, event.target.files[0])}
                                    />
                                </label>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
