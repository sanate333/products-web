import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faEdit, faArrowUp, faArrowDown, faSync } from '@fortawesome/free-solid-svg-icons';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import baseURL, { resolveImg } from '../../url';
import './BannerData.css'
import NewBanner from '../NewBanner/NewBanner';

const ORDER_KEY = 'bannerOrder';

export default function BannerData() {
    const [banners, setBanners] = useState([]);
    const [draggingId, setDraggingId] = useState(null);
    useEffect(() => {
        cargarBanners();

    }, []);
    const getBannerId = (item) => item.idBanner || item.id || item.id_banner || item.idbanner;
    const getOrder = () => JSON.parse(localStorage.getItem(ORDER_KEY)) || [];
    const persistOrder = (items) => {
        const order = items.map((item) => getBannerId(item)).filter(Boolean);
        localStorage.setItem(ORDER_KEY, JSON.stringify(order));
    };
    const applyOrder = (items) => {
        const order = getOrder();
        if (!order.length) return items;
        const byId = new Map(items.map((item) => [getBannerId(item), item]));
        const ordered = order.map((id) => byId.get(id)).filter(Boolean);
        const remaining = items.filter((item) => !order.includes(getBannerId(item)));
        return [...ordered, ...remaining];
    };
    const cargarBanners = () => {
        fetch(`${baseURL}/bannersGet.php`, {
            method: 'GET',
        })
            .then(response => response.json())
            .then(data => {
                const ordered = applyOrder(data.banner || []);
                setBanners(ordered);
                console.log(data.banner)
            })
            .catch(error => console.error('Error al cargar productos:', error));
    };
    const eliminarBanner = (idBanner) => {
        // Reemplaza el window.confirm con SweetAlert2
        Swal.fire({
            title: '¿Estás seguro?',
            text: '¡No podrás revertir esto!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        }).then((result) => {
            if (result.isConfirmed) {
                fetch(`${baseURL}/bannerDelete.php?idBanner=${idBanner}`, {
                    method: 'DELETE',
                })
                    .then(response => response.json())
                    .then(data => {
                        Swal.fire(
                            '¡Eliminado!',
                            data.mensaje,
                            'success'
                        );
                        cargarBanners();
                    })
                    .catch(error => {
                        console.error('Error al eliminar la Producto:', error);
                        toast.error(error);
                    });
            }
        });
    };
    const moveBanner = (sourceId, targetId) => {
        if (!sourceId || !targetId || sourceId === targetId) return;
        const items = [...banners];
        const sourceIndex = items.findIndex((item) => getBannerId(item) === sourceId);
        const targetIndex = items.findIndex((item) => getBannerId(item) === targetId);
        if (sourceIndex < 0 || targetIndex < 0) return;
        const [moved] = items.splice(sourceIndex, 1);
        items.splice(targetIndex, 0, moved);
        setBanners(items);
        persistOrder(items);
    };
    const handleDragStart = (id) => {
        setDraggingId(id);
    };
    const handleDragOver = (event) => {
        event.preventDefault();
    };
    const handleDrop = (id) => {
        moveBanner(draggingId, id);
        setDraggingId(null);
    };
    const handleTouchMove = (event, id) => {
        const touch = event.touches[0];
        if (!touch) return;
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const card = target?.closest?.('[data-banner-id]');
        const targetId = card?.getAttribute?.('data-banner-id');
        if (targetId) {
            moveBanner(id, targetId);
        }
    };
    const handleReplace = async (item, file) => {
        if (!file) return;
        const formData = new FormData();
        formData.append('imagen', file);

        try {
            const response = await fetch(`${baseURL}/bannersPost.php`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (data.error) {
                toast.error(data.error);
                return;
            }
            await fetch(`${baseURL}/bannerDelete.php?idBanner=${getBannerId(item)}`, {
                method: 'DELETE',
            });
            cargarBanners();
        } catch (error) {
            console.error('Error al reemplazar banner:', error);
            toast.error('Error de conexiOn. Intentalo de nuevo.');
        }
    };
    return (
        <div className='BannerContainer'>
            <NewBanner />
            <div className='BannerWrap'>
                {
                    banners.map((item, index) => (
                        <div
                            key={getBannerId(item)}
                            className={`cardBanner ${draggingId === getBannerId(item) ? 'dragging' : ''}`}
                            draggable
                            data-banner-id={getBannerId(item)}
                            onDragStart={() => handleDragStart(getBannerId(item))}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(getBannerId(item))}
                            onTouchStart={() => handleDragStart(getBannerId(item))}
                            onTouchMove={(event) => handleTouchMove(event, getBannerId(item))}
                            onTouchEnd={() => setDraggingId(null)}
                        >
                            <span className='bannerBadge'>{index === 0 ? 'Principal' : `#${index + 1}`}</span>
                            <img src={resolveImg(item.imagen)} alt="banner" />
                            <div className='bannerActions'>
                                <button className='btnBannerDelete' onClick={() => eliminarBanner(getBannerId(item))}>
                                    <FontAwesomeIcon icon={faTrash} />
                                </button>
                                <label className='btnBannerReplace'>
                                    Cambiar
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(event) => handleReplace(item, event.target.files[0])}
                                    />
                                </label>
                            </div>
                        </div>
                    ))
                }

            </div>

        </div>
    )
}
