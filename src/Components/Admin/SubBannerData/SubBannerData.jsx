import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import baseURL, { resolveImg } from '../../url';
import './SubBannerData.css';
import NewSubBanner from '../SubBannerData/NewSubBanner';

const ORDER_KEY = 'subBannerOrder';
const getEndpoints = [
    'subbannersGet.php',
    'subbannerGet.php',
    'subBannerGet.php',
];
const postEndpoints = [
    'subbannersPost.php',
    'subbannerPost.php',
    'subBannerPost.php',
];
const deleteEndpoints = [
    'subbannerDelete.php',
    'subbannersDelete.php',
    'subBannerDelete.php',
];

export default function SubBannerData() {
    const [subBanners, setSubBanners] = useState([]);
    const [draggingId, setDraggingId] = useState(null);

    useEffect(() => {
        cargarSubBanners();
    }, []);

    const getBannerId = (item) => item.idSubBanner || item.idBanner || item.id || item.id_sub_banner || item.id_subbanner;
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

    const cargarSubBanners = () => {
        const load = async () => {
            for (const endpoint of getEndpoints) {
                try {
                    const response = await fetch(`${baseURL}/${endpoint}`, {
                        method: 'GET',
                    });
                    if (!response.ok) {
                        continue;
                    }
                    const data = await response.json();
                    const ordered = applyOrder(data.subbanner || data.subbanners || data.banner || []);
                    setSubBanners(ordered);
                    return;
                } catch (error) {
                    console.error('Error al cargar sub banners:', error);
                }
            }
        };
        load();
    };

    const eliminarSubBanner = (idSubBanner) => {
        Swal.fire({
            title: 'Estas seguro?',
            text: 'No podras revertir esto.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Si, eliminar',
            cancelButtonText: 'Cancelar',
        }).then((result) => {
            if (result.isConfirmed) {
                const runDelete = async () => {
                    for (const endpoint of deleteEndpoints) {
                        try {
                            const response = await fetch(`${baseURL}/${endpoint}?idSubBanner=${idSubBanner}`, {
                                method: 'DELETE',
                            });
                            if (!response.ok) {
                                continue;
                            }
                            const data = await response.json();
                            Swal.fire('Eliminado', data.mensaje, 'success');
                            cargarSubBanners();
                            return;
                        } catch (error) {
                            console.error('Error al eliminar sub banner:', error);
                        }
                    }
                    toast.error('Error al eliminar sub banner.');
                };
                runDelete();
            }
        });
    };

    const moveBanner = (sourceId, targetId) => {
        if (!sourceId || !targetId || sourceId === targetId) return;
        const items = [...subBanners];
        const sourceIndex = items.findIndex((item) => getBannerId(item) === sourceId);
        const targetIndex = items.findIndex((item) => getBannerId(item) === targetId);
        if (sourceIndex < 0 || targetIndex < 0) return;
        const [moved] = items.splice(sourceIndex, 1);
        items.splice(targetIndex, 0, moved);
        setSubBanners(items);
        persistOrder(items);
    };
    const handleDragStart = (id) => setDraggingId(id);
    const handleDragOver = (event) => event.preventDefault();
    const handleDrop = (id) => {
        moveBanner(draggingId, id);
        setDraggingId(null);
    };
    const handleTouchMove = (event, id) => {
        const touch = event.touches[0];
        if (!touch) return;
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const card = target?.closest?.('[data-subbanner-id]');
        const targetId = card?.getAttribute?.('data-subbanner-id');
        if (targetId) {
            moveBanner(id, targetId);
        }
    };
    const handleReplace = async (item, file) => {
        if (!file) return;
        const formData = new FormData();
        formData.append('imagen', file);

        try {
            let uploaded = false;
            for (const endpoint of postEndpoints) {
                try {
                    const response = await fetch(`${baseURL}/${endpoint}`, {
                        method: 'POST',
                        body: formData
                    });
                    let data = {};
                    try {
                        data = await response.json();
                    } catch (parseError) {
                        data = {};
                    }
                    if (response.ok && !data.error) {
                        uploaded = true;
                        break;
                    }
                } catch (error) {
                    console.error('Error al reemplazar sub banner:', error);
                }
            }
            if (!uploaded) {
                toast.error('Error de conexion. Intentalo de nuevo.');
                return;
            }
            let deleted = false;
            for (const endpoint of deleteEndpoints) {
                try {
                    const response = await fetch(`${baseURL}/${endpoint}?idSubBanner=${getBannerId(item)}`, {
                        method: 'DELETE',
                    });
                    if (response.ok) {
                        deleted = true;
                        break;
                    }
                } catch (error) {
                    console.error('Error al eliminar sub banner:', error);
                }
            }
            if (!deleted) {
                toast.error('No se pudo eliminar el sub banner anterior.');
            }
            cargarSubBanners();
        } catch (error) {
            console.error('Error al reemplazar sub banner:', error);
            toast.error('Error de conexion. Intentalo de nuevo.');
        }
    };

    return (
        <div className='BannerContainer'>
            <ToastContainer />
            <NewSubBanner />
            <p className='subBannerNote'>Minimo recomendado: 4 imagenes.</p>
            <div className='BannerWrap'>
                {subBanners.map((item, index) => (
                    <div
                        key={getBannerId(item)}
                        className={`cardBanner ${draggingId === getBannerId(item) ? 'dragging' : ''}`}
                        draggable
                        data-subbanner-id={getBannerId(item)}
                        onDragStart={() => handleDragStart(getBannerId(item))}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(getBannerId(item))}
                        onTouchStart={() => handleDragStart(getBannerId(item))}
                        onTouchMove={(event) => handleTouchMove(event, getBannerId(item))}
                        onTouchEnd={() => setDraggingId(null)}
                    >
                        <span className='bannerBadge'>{index === 0 ? 'Principal' : `#${index + 1}`}</span>
                        <img src={resolveImg(item.imagen)} alt="sub banner" />
                        <div className='bannerActions'>
                            <button className='btnBannerDelete' onClick={() => eliminarSubBanner(getBannerId(item))}>
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
                ))}
            </div>
        </div>
    );
}
