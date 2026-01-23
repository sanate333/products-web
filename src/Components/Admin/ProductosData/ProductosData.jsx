import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faEdit, faArrowUp, faArrowDown, faSync, faEye, faCopy } from '@fortawesome/free-solid-svg-icons';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import './ProductosData.css'
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import baseURL from '../../url';
import NewProduct from '../NewProduct/NewProduct';
import moneda from '../../moneda';
import { Link as Anchor } from "react-router-dom";
export default function ProductosData() {
    const [productos, setProductos] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [nuevoTitulo, setNuevoTitulo] = useState('');
    const [nuevaDescripcion, setNuevaDescripcion] = useState('');
    const [nuevoPrecio, setNuevoPrecio] = useState('');
    const [nuevoPrecioAnterior, setNuevoPrecioAnterior] = useState(0);
    const [nuevaCategoria, setNuevaCategoria] = useState('');
    const [producto, setProducto] = useState({});
    const [modalImagenVisible, setModalImagenVisible] = useState(false);
    const [imagenSeleccionada, setImagenSeleccionada] = useState('');
    const [filtroId, setFiltroId] = useState('');
    const [filtroTitulo, setFiltroTitulo] = useState('');
    const [filtroCategoria, setFiltroCategoria] = useState('');
    const [filtroMasVendido, setFiltroMasVendido] = useState('');
    const [ordenInvertido, setOrdenInvertido] = useState(false);
    const [imagenPreview, setImagenPreview] = useState(null);
    const [imagenPreview2, setImagenPreview2] = useState(null);
    const [imagenPreview3, setImagenPreview3] = useState(null);
    const [imagenPreview4, setImagenPreview4] = useState(null);
    const [nuevaImagen, setNuevaImagen] = useState(null);
    const [nuevaImagen2, setNuevaImagen2] = useState(null);
    const [nuevaImagen3, setNuevaImagen3] = useState(null);
    const [nuevaImagen4, setNuevaImagen4] = useState(null);
    const [selectedSection, setSelectedSection] = useState('texto');
    const [nuevoMasVendido, setNuevoMasVendido] = useState('');
    const [categorias, setCategoras] = useState([]);
    const [item1, setItem1] = useState('');
    const [item2, setItem2] = useState('');
    const [item3, setItem3] = useState('');
    const [item4, setItem4] = useState('');
    const [item5, setItem5] = useState('');
    const [item6, setItem6] = useState('');
    const [nuevoStock, setNuevoStock] = useState('');
    const [estadoProducto, setEstadoProducto] = useState('Activo');
    const [tieneVariantes, setTieneVariantes] = useState(false);
    const [estadoFiltro, setEstadoFiltro] = useState('all');
    const [imageOrder, setImageOrder] = useState([]);
    const [dragIndex, setDragIndex] = useState(null);
    const [dragPointerId, setDragPointerId] = useState(null);
    const [aiImages, setAiImages] = useState([]);
    const [aiSlots, setAiSlots] = useState([]);
    const AI_BASE = (process.env.REACT_APP_API_URL || '').replace(/\/+$/, '');
    const AI_PREFIX = AI_BASE ? `${AI_BASE}/api` : '/api';

    const cerrarModalImagen = () => {
        setModalImagenVisible(false);
    };
    const abrirModalImagenSeleccionada = (imagen) => {
        setImagenSeleccionada(imagen);
        setModalImagenVisible(true);
    };


    useEffect(() => {
        cargarProductos();

    }, []);

    useEffect(() => {
        if (modalVisible || modalImagenVisible) {
            document.body.classList.add('dashboard-modal-open');
        } else {
            document.body.classList.remove('dashboard-modal-open');
        }
        return () => document.body.classList.remove('dashboard-modal-open');
    }, [modalVisible, modalImagenVisible]);

    useEffect(() => {
        // Actualiza el valor del select cuando cambia el estado nuevoEstado
        setNuevoTitulo(producto.titulo);
        setNuevaDescripcion(producto.descripcion);
        setNuevoPrecio(producto.precio);
        setNuevoMasVendido(producto.masVendido)
        setNuevaCategoria(producto.idCategoria)
        setItem1(producto.item1);
        setItem2(producto.item2);
        setItem3(producto.item3);
        setItem4(producto.item4);
        setItem5(producto.item5);
        setItem6(producto.item6);
        setNuevoPrecioAnterior(producto.precioAnterior)
        setNuevoStock(producto.stock ?? '')
        setEstadoProducto(producto.estadoProducto || 'Activo');
        setTieneVariantes(Boolean(producto.tieneVariantes));
        setImageOrder(
            [producto.imagen1, producto.imagen2, producto.imagen3, producto.imagen4].filter(Boolean)
        );
        const savedSlots = JSON.parse(localStorage.getItem(`landingSlots_${producto.idProducto}`) || '[]');
        setAiSlots(Array.isArray(savedSlots) ? savedSlots : []);
    }, [producto]);

    const cargarProductos = () => {
        fetch(`${baseURL}/productosGet.php?includeOutOfStock=1`, {
            method: 'GET',
        })
            .then(response => response.json())
            .then(data => {
                setProductos(data.productos || []);
                console.log(data.productos)
            })
            .catch(error => console.error('Error al cargar productos:', error));
    };

    const eliminarProducto = (idProducto) => {
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
                fetch(`${baseURL}/productDelete.php?idProducto=${idProducto}`, {
                    method: 'DELETE',
                })
                    .then(response => response.json())
                    .then(data => {
                        Swal.fire(
                            '¡Eliminado!',
                            data.mensaje,
                            'success'
                        );
                        cargarProductos();
                    })
                    .catch(error => {
                        console.error('Error al eliminar la Producto:', error);
                        toast.error(error);
                    });
            }
        });
    };

    const cargarAiImages = () => {
        if (!producto?.idProducto) {
            return;
        }
        const url = new URL(`${AI_PREFIX}/ai-images`, window.location.origin);
        url.searchParams.set('userId', 'admin');
        url.searchParams.set('productId', String(producto.idProducto));
        fetch(url)
            .then((response) => response.json())
            .then((data) => {
                if (data?.ok) {
                    const sorted = (data.images || []).sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
                    setAiImages(sorted);
                }
            })
            .catch(() => {});
    };

    const duplicarProducto = (idProducto) => {
        Swal.fire({
            title: 'Duplicar producto',
            text: 'Se creara una copia del producto seleccionado.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Duplicar',
            cancelButtonText: 'Cancelar',
        }).then((result) => {
            if (result.isConfirmed) {
                fetch(`${baseURL}/productDuplicate.php?idProducto=${idProducto}`, {
                    method: 'POST',
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data?.error) {
                            Swal.fire('Error!', data.error, 'error');
                            return;
                        }
                        Swal.fire('Duplicado!', data.mensaje || 'Producto duplicado.', 'success');
                        cargarProductos();
                    })
                    .catch(error => {
                        console.error('Error al duplicar producto:', error);
                        toast.error('Error al duplicar producto.');
                    });
            }
        });
    };

    const abrirModal = (item) => {
        setProducto(item);
        setNuevoTitulo(item.titulo);
        setNuevaDescripcion(item.descripcion);
        setNuevoPrecio(item.precio);
        setModalVisible(true);
    };

    const cerrarModal = () => {
        setModalVisible(false);
    };

    const getEstadoLabel = (item) => {
        const estado = (item?.estadoProducto || 'Activo').toLowerCase();
        if (estado === 'desactivado') return 'Desactivado';
        if (estado === 'variante') return 'Variante';
        const stockValue = item?.stock;
        const hasStock = stockValue === null || stockValue === undefined || Number(stockValue) > 0;
        return hasStock ? 'Activo' : 'Sin stock';
    };

    const productosFiltrados = productos.filter(item => {
        const idMatch = item.idProducto.toString().includes(filtroId);
        const tituloMatch = !filtroTitulo || item.titulo.includes(filtroTitulo);
        const categoriaMatch = item.idCategoria.toString().includes(filtroCategoria);
        const masVendidoMatch = !filtroMasVendido || item.masVendido.includes(filtroMasVendido);
        const stockValue = item?.stock;
        const hasStock = stockValue === null || stockValue === undefined || Number(stockValue) > 0;
        const estadoValue = (item?.estadoProducto || 'Activo').toLowerCase();
        const estadoMatch = estadoFiltro === 'all'
            || (estadoFiltro === 'active' && estadoValue === 'activo')
            || (estadoFiltro === 'disabled' && estadoValue === 'desactivado')
            || (estadoFiltro === 'variant' && estadoValue === 'variante')
            || (estadoFiltro === 'out' && !hasStock);

        return idMatch && tituloMatch && categoriaMatch && masVendidoMatch && estadoMatch;
    });

    const descargarExcel = () => {
        const data = productosFiltrados.map(item => ({
            IdProducto: item.idProducto,
            Titulo: item.titulo,
            Descripcion: item.descripcion,
            Precio: item.precio,
            Fecha: item.createdAt,
            MasVendido: item.masVendido,
            Imagen1: item.imagen1,
            Imagen2: item.imagen2,
            Imagen3: item.imagen3,
            Imagen4: item.imagen4,

        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Productos');
        XLSX.writeFile(wb, 'productos.xlsx');
    };

    const descargarPDF = () => {
        const pdf = new jsPDF();
        pdf.text('Lista de Productos', 10, 10);

        const columns = [
            { title: 'IdProducto', dataKey: 'idProducto' },
            { title: 'Titulo', dataKey: 'titulo' },
            { title: 'Descripcion', dataKey: 'descripcion' },
            { title: 'Precio', dataKey: 'precio' },
            { title: 'MasVendido', dataKey: 'masVendido' },
            { title: 'Fecha', dataKey: 'createdAt' },
        ];

        const data = productosFiltrados.map(item => ({
            IdProducto: item.idProducto,
            Titulo: item.titulo,
            Descripcion: item.descripcion,
            Precio: item.precio,
            MasVendido: item.masVendido,
            Fecha: item.createdAt,

        }));

        pdf.autoTable({
            head: [columns.map(col => col.title)],
            body: data.map(item => Object.values(item)),
        });

        pdf.save('productos.pdf');
    };

    const recargarProductos = () => {
        cargarProductos();
    };
    const invertirOrden = () => {
        setProductos([...productos].reverse());
        setOrdenInvertido(!ordenInvertido);
    };

    const handleDragStart = (event, index) => {
        if (event?.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', String(index));
        }
        setDragIndex(index);
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        if (event?.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }
    };

    const handleDrop = (event, index) => {
        event.preventDefault();
        if (dragIndex === null || dragIndex === index) {
            setDragIndex(null);
            return;
        }
        const next = [...imageOrder];
        const [moved] = next.splice(dragIndex, 1);
        next.splice(index, 0, moved);
        setImageOrder(next);
        setDragIndex(null);
    };

    const handlePointerDown = (event, index) => {
        event.preventDefault();
        setDragIndex(index);
        setDragPointerId(event.pointerId);
        if (event.currentTarget?.setPointerCapture) {
            event.currentTarget.setPointerCapture(event.pointerId);
        }
    };

    const handlePointerMove = (event) => {
        if (dragIndex === null) return;
        const target = document.elementFromPoint(event.clientX, event.clientY);
        const item = target?.closest?.('.imageOrderItem');
        if (!item) return;
        const targetIndex = Number(item.dataset.index);
        if (Number.isNaN(targetIndex) || targetIndex === dragIndex) return;
        const next = [...imageOrder];
        const [moved] = next.splice(dragIndex, 1);
        next.splice(targetIndex, 0, moved);
        setImageOrder(next);
        setDragIndex(targetIndex);
    };

    const handlePointerUp = (event) => {
        if (dragPointerId !== null && event.currentTarget?.releasePointerCapture) {
            try {
                event.currentTarget.releasePointerCapture(dragPointerId);
            } catch (error) {
                console.error(error);
            }
        }
        setDragIndex(null);
        setDragPointerId(null);
    };

    const guardarOrdenImagenes = () => {
        if (!producto?.idProducto || imageOrder.length === 0) {
            return;
        }
        fetch(`${baseURL}/productImageOrderPut.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idProducto: producto.idProducto,
                imagenes: imageOrder,
            }),
        })
            .then(response => response.json())
            .then(data => {
                if (data?.error) {
                    Swal.fire('Error!', data.error, 'error');
                    return;
                }
                Swal.fire('Guardado!', data.mensaje || 'Orden de imagenes actualizado.', 'success');
                cargarProductos();
            })
            .catch(() => {
                Swal.fire('Error!', 'No se pudo actualizar el orden.', 'error');
            });
    };


    const handleUpdateText = (idProducto) => {
        const parsedStock = nuevoStock === '' ? null : Number(nuevoStock);
        const payload = {

            nuevoTitulo: nuevoTitulo !== '' ? nuevoTitulo : producto.titulo,
            nuevaDescripcion: nuevaDescripcion !== undefined ? nuevaDescripcion : producto.descripcion,
            nuevoPrecio: nuevoPrecio !== '' ? nuevoPrecio : producto.precio,
            nuevaCategoria: nuevaCategoria !== '' ? nuevaCategoria : producto.categoria,
            masVendido: nuevoMasVendido !== '' ? nuevoMasVendido : producto.masVendido,
            item1: item1 !== undefined ? item1 : producto.item1,
            item2: item2 !== undefined ? item2 : producto.item2,
            item3: item3 !== undefined ? item3 : producto.item3,
            item4: item4 !== undefined ? item4 : producto.item4,
            item5: item5 !== undefined ? item5 : producto.item5,
            item6: item6 !== undefined ? item6 : producto.item6,
            precioAnterior: nuevoPrecioAnterior !== 0 ? nuevoPrecioAnterior : producto.precioAnterior,
            stock: parsedStock,
            estadoProducto: estadoProducto || 'Activo',
            tieneVariantes: tieneVariantes ? 1 : 0,
        };

        fetch(`${baseURL}/productoTextPut.php?idProducto=${idProducto}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })
            .then(response => response.json())
            .then(data => {
                if (data.error) {

                    Swal.fire(
                        'Error!',
                        data.error,
                        'error'
                    );
                } else {

                    Swal.fire(
                        'Editado!',
                        data.mensaje,
                        'success'
                    );
                    cargarProductos();
                    cerrarModal()
                }
            })
            .catch(error => {
                console.log(error.message);
                toast.error(error.message);
            });
    };

    const handleFileChange = (event, setFile, setPreview) => {
        const file = event.target.files[0];

        if (file) {
            // Crear una URL de objeto para la imagen seleccionada
            const previewURL = URL.createObjectURL(file);
            setFile(file);
            setPreview(previewURL);
        }
    };
    const handleEditarImagenBanner = (idProducto) => {
        const formData = new FormData();
        formData.append('idProducto', idProducto);
        formData.append('updateAction', 'update'); // Campo adicional para indicar que es una actualización

        if (nuevaImagen) {
            formData.append('imagen1', nuevaImagen);
        }
        if (nuevaImagen2) {
            formData.append('imagen2', nuevaImagen2);
        }
        if (nuevaImagen3) {
            formData.append('imagen3', nuevaImagen3);
        }
        if (nuevaImagen4) {
            formData.append('imagen4', nuevaImagen4);
        }

        fetch(`${baseURL}/productoImagePut.php`, {
            method: 'POST',  // Cambiado a POST
            body: formData
        })
            .then(response => {
                // Manejar el caso cuando la respuesta no es un JSON válido o está vacía
                if (!response.ok) {
                    throw new Error('La solicitud no fue exitosa');

                }

                return response.json();
            })
            .then(data => {
                if (data.error) {

                    toast.error(data.error);
                    console.log(formData)
                } else {

                    toast.success(data.mensaje);
                    window.location.reload();
                }
            })
            .catch(error => {
                console.log(error)
                toast.error(error.message);
                console.log(formData)
                console.log(idProducto)
            });
    };

    const handleSectionChange = (section) => {
        setSelectedSection(section);
    };

    useEffect(() => {
        if (modalVisible) {
            cargarAiImages();
        }
    }, [modalVisible, producto?.idProducto]);

    const persistAiSlots = (nextSlots) => {
        setAiSlots(nextSlots);
        if (producto?.idProducto) {
            localStorage.setItem(`landingSlots_${producto.idProducto}`, JSON.stringify(nextSlots));
        }
    };

    const handlePickAiSlot = (index) => {
        const usedIds = new Set(aiSlots.filter(Boolean));
        const nextImage = aiImages.find((img) => !usedIds.has(img.id));
        if (!nextImage) {
            toast.info('No hay imagenes disponibles en la galeria IA.');
            return;
        }
        const nextSlots = [...aiSlots];
        nextSlots[index] = nextImage.id;
        persistAiSlots(nextSlots);
    };

    const handleClearAiSlot = (index) => {
        const nextSlots = [...aiSlots];
        nextSlots[index] = null;
        persistAiSlots(nextSlots);
    };

    const getSlotImage = (id) => aiImages.find((img) => img.id === id) || null;

    useEffect(() => {
        cargarCategoria();

    }, []);


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
    return (
        <div>

            <ToastContainer />
            <div className='deFlexContent'>

                <div className='deFlex2'>
                    <NewProduct />
                    <button className='excel' onClick={descargarExcel}><FontAwesomeIcon icon={faArrowDown} /> Excel</button>
                    <button className='pdf' onClick={descargarPDF}><FontAwesomeIcon icon={faArrowDown} /> PDF</button>
                </div>
                <div className='filtrosContain'>
                    <div className='inputsColumn'>
                        <button
                            type="button"
                            className={estadoFiltro === 'all' ? 'btnFilterActive' : 'btnFilter'}
                            onClick={() => setEstadoFiltro('all')}
                        >
                            Todas
                        </button>
                    </div>
                    <div className='inputsColumn'>
                        <button
                            type="button"
                            className={estadoFiltro === 'active' ? 'btnFilterActive' : 'btnFilter'}
                            onClick={() => setEstadoFiltro('active')}
                        >
                            Activo
                        </button>
                    </div>
                    <div className='inputsColumn'>
                        <button
                            type="button"
                            className={estadoFiltro === 'disabled' ? 'btnFilterActive' : 'btnFilter'}
                            onClick={() => setEstadoFiltro('disabled')}
                        >
                            Desactivado
                        </button>
                    </div>
                    <div className='inputsColumn'>
                        <button
                            type="button"
                            className={estadoFiltro === 'variant' ? 'btnFilterActive' : 'btnFilter'}
                            onClick={() => setEstadoFiltro('variant')}
                        >
                            Variante
                        </button>
                    </div>
                    <div className='inputsColumn'>
                        <button
                            type="button"
                            className={estadoFiltro === 'out' ? 'btnFilterActive' : 'btnFilter'}
                            onClick={() => setEstadoFiltro('out')}
                        >
                            Sin stock
                        </button>
                    </div>
                </div>
                <div className='filtrosContain'>
                    <div className='inputsColumn'>
                        <input type="number" value={filtroId} onChange={(e) => setFiltroId(e.target.value)} placeholder='Id Producto' />
                    </div>

                    <div className='inputsColumn'>
                        <input type="text" value={filtroTitulo} onChange={(e) => setFiltroTitulo(e.target.value)} placeholder='Titulo' />
                    </div>

                    <div className='inputsColumn'>
                        <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
                            <option value="">Categorias</option>
                            {
                                categorias.map(item => (
                                    <option value={item?.idCategoria}>{item?.categoria}</option>
                                ))
                            }
                        </select>
                    </div>
                    <div className='inputsColumn'>
                        <select value={filtroMasVendido} onChange={(e) => setFiltroMasVendido(e.target.value)}>
                            <option value="">Más vendidos</option>
                            <option value="si">Si</option>
                            <option value="no">No</option>

                        </select>
                    </div>

                    <button className='reload' onClick={recargarProductos}><FontAwesomeIcon icon={faSync} /></button>
                    <button className='reverse' onClick={invertirOrden}>
                        {ordenInvertido ? <FontAwesomeIcon icon={faArrowUp} /> : <FontAwesomeIcon icon={faArrowDown} />}
                    </button>

                </div>

            </div>


            {modalImagenVisible && (
                <div className="modalImg">
                    <div className="modal-contentImg">


                        <span className="close2" onClick={cerrarModalImagen}>
                            &times;
                        </span>

                        <img src={imagenSeleccionada} alt="Imagen Seleccionada" />
                    </div>
                </div>
            )}

            {modalVisible && (
                <div className="modal">
                    <div className="modal-content productosModalContent">
                        <div className='deFlexBtnsModal'>

                            <div className='deFlexBtnsModal'>
                                <button
                                    className={selectedSection === 'texto' ? 'selected' : ''}
                                    onClick={() => handleSectionChange('texto')}
                                >
                                    Editar Texto
                                </button>
                                <button
                                    className={selectedSection === 'imagenes' ? 'selected' : ''}
                                    onClick={() => handleSectionChange('imagenes')}
                                >
                                    Editar Imagenes
                                </button>
                            </div>
                            <span className="close" onClick={cerrarModal}>
                                &times;
                            </span>
                        </div>
                        <div className='sectiontext' style={{ display: selectedSection === 'texto' ? 'flex' : 'none' }}>
                            {(() => {
                                const statusText = getEstadoLabel(producto);
                                const stockValue = producto?.stock;
                                const statusClass = statusText === 'Activo'
                                    ? 'statusActive'
                                    : statusText === 'Sin stock'
                                        ? 'statusOut'
                                        : statusText === 'Desactivado'
                                            ? 'statusDisabled'
                                            : 'statusVariant';
                                const mediaItems = [producto.imagen1, producto.imagen2, producto.imagen3, producto.imagen4].filter(Boolean);
                                const previewItems = mediaItems.slice(0, 4);
                                return (
                                    <div className='productOverviewCard'>
                                        <div className='productOverviewHeader'>
                                            <div>
                                                <span className='productOverviewLabel'>Estado del producto</span>
                                                <h4>{statusText}</h4>
                                            </div>
                                            <span className={`statusBadge ${statusClass}`}>{statusText}</span>
                                        </div>
                                        <div className='productOverviewMedia'>
                                            <div className='productOverviewMediaHeader'>
                                                <h4>Elementos multimedia ({mediaItems.length})</h4>
                                                <button type="button" onClick={() => handleSectionChange('imagenes')}>Ver todo</button>
                                            </div>
                                            <div className='productOverviewThumbs'>
                                                {previewItems.length === 0 ? (
                                                    <span className='productOverviewEmpty'>Sin imagenes</span>
                                                ) : (
                                                    previewItems.map((img, index) => (
                                                        <img
                                                            key={`preview-${img}-${index}`}
                                                            src={img}
                                                            alt={`Vista previa ${index + 1}`}
                                                        />
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                        <div className='productOverviewInfo'>
                                            <h3>{producto?.titulo || 'Producto'}</h3>
                                            <p>{(producto?.descripcion || '').split('\n')[0]}</p>
                                            <div className='productOverviewPrices'>
                                                <span>{moneda} {producto?.precio}</span>
                                                {producto?.precioAnterior ? (
                                                    <span className='productOverviewPrev'>{moneda} {producto?.precioAnterior}</span>
                                                ) : null}
                                            </div>
                                            <div className='productOverviewStock'>
                                                Disponible: {stockValue === null || stockValue === undefined ? '-' : stockValue}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                            <div className='flexGrap'>
                                <fieldset>
                                    <legend>Titulo</legend>
                                    <input
                                        type="text"
                                        value={nuevoTitulo !== '' ? nuevoTitulo : producto.titulo}
                                        onChange={(e) => setNuevoTitulo(e.target.value)}
                                    />
                                </fieldset>
                                <fieldset>
                                    <legend>Precio</legend>
                                    <input
                                        type="number"
                                        value={nuevoPrecio !== '' ? nuevoPrecio : producto.precio}
                                        onChange={(e) => setNuevoPrecio(e.target.value)}
                                    />
                                </fieldset>
                                <fieldset id='descripcion'>
                                    <legend>Descripcion</legend>
                                    <textarea
                                        type="text"
                                        value={nuevaDescripcion}
                                        onChange={(e) => setNuevaDescripcion(e.target.value)}
                                    />
                                </fieldset>

                                <fieldset>
                                    <legend>Categoria</legend>
                                    <select
                                        value={nuevaCategoria !== '' ? nuevaCategoria : producto.categoria}
                                        onChange={(e) => setNuevaCategoria(e.target.value)}
                                    >

                                        {
                                            categorias
                                                .filter(categoriaFiltrada => categoriaFiltrada.idCategoria === producto.idCategoria)
                                                .map(categoriaFiltrada => (

                                                    <option value={producto.categoria}> {categoriaFiltrada.categoria}</option>
                                                ))
                                        }

                                        {
                                            categorias.map(item => (
                                                <option value={item?.idCategoria}>{item?.categoria}</option>
                                            ))
                                        }
                                    </select>
                                </fieldset>

                                <fieldset>
                                    <legend>Mas vendido</legend>
                                    <select
                                        value={nuevoMasVendido !== '' ? nuevoMasVendido : producto.masVendido}
                                        onChange={(e) => setNuevoMasVendido(e.target.value)}
                                    >
                                        <option value={producto.masVendido}>{producto.masVendido}</option>
                                        <option value="si">Si</option>
                                        <option value="no">No</option>
                                    </select>
                                </fieldset>

                                <fieldset>
                                    <legend>Precio anterior</legend>
                                    <input
                                        type="number"
                                        value={nuevoPrecioAnterior !== '' ? nuevoPrecioAnterior : producto.precioAnterior}
                                        onChange={(e) => setNuevoPrecioAnterior(e.target.value)}
                                    />
                                </fieldset>
                                <fieldset>
                                    <legend>Stock disponible</legend>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={nuevoStock !== '' ? nuevoStock : (producto.stock ?? '')}
                                        onChange={(e) => setNuevoStock(e.target.value)}
                                    />
                                </fieldset>
                                <fieldset>
                                    <legend>Estado</legend>
                                    <select
                                        value={estadoProducto}
                                        onChange={(e) => setEstadoProducto(e.target.value)}
                                    >
                                        <option value="Activo">Activo</option>
                                        <option value="Desactivado">Desactivado</option>
                                        <option value="Variante">Variante</option>
                                    </select>
                                </fieldset>
                                <fieldset>
                                    <legend>Variantes</legend>
                                    <label className='variantToggle'>
                                        <input
                                            type="checkbox"
                                            checked={tieneVariantes}
                                            onChange={(e) => setTieneVariantes(e.target.checked)}
                                        />
                                        Habilitar selector en producto
                                    </label>
                                </fieldset>
                                {tieneVariantes && (
                                <div className='items'>
                                    <fieldset>
                                        <legend>Item 1</legend>
                                        <input
                                            type="text"
                                            id="item1"
                                            name="item1"
                                            required
                                            value={item1}
                                            onChange={(e) => setItem1(e.target.value)}
                                        />
                                    </fieldset>

                                    <fieldset>
                                        <legend>Item 2</legend>
                                        <input
                                            type="text"
                                            id="item2"
                                            name="item2"
                                            required
                                            value={item2}
                                            onChange={(e) => setItem2(e.target.value)}
                                        />
                                    </fieldset>

                                    <fieldset>
                                        <legend>Item 3</legend>
                                        <input
                                            type="text"
                                            id="item3"
                                            name="item3"
                                            required
                                            value={item3}
                                            onChange={(e) => setItem3(e.target.value)}
                                        />
                                    </fieldset>

                                    <fieldset>
                                        <legend>Item 4</legend>
                                        <input
                                            type="text"
                                            id="item4"
                                            name="item4"
                                            required
                                            value={item4}
                                            onChange={(e) => setItem4(e.target.value)}
                                        />
                                    </fieldset>

                                    <fieldset>
                                        <legend>Item 5</legend>
                                        <input
                                            type="text"
                                            id="item5"
                                            name="item5"
                                            required
                                            value={item5}
                                            onChange={(e) => setItem5(e.target.value)}
                                        />
                                    </fieldset>

                                    <fieldset>
                                        <legend>Item 6</legend>
                                        <input
                                            type="text"
                                            id="item6"
                                            name="item6"
                                            required
                                            value={item6}
                                            onChange={(e) => setItem6(e.target.value)}
                                        />
                                    </fieldset>

                                </div>
                                )}
                            </div>




                            <button className='btnPost' onClick={() => handleUpdateText(producto.idProducto)} >Guardar </button>

                        </div>

                        <div className='sectionImg' style={{ display: selectedSection === 'imagenes' ? 'flex' : 'none' }}>
                            <div className='imageOrderCard'>
                                <h4>Orden de imagenes</h4>
                                <p className='imageOrderHint'>Arrastra para cambiar el orden. La primera es la imagen principal.</p>
                                {imageOrder.length === 0 ? (
                                    <p className='imageOrderEmpty'>No hay imagenes para ordenar.</p>
                                ) : (
                                    <div className='imageOrderList'>
                                        {imageOrder.map((img, index) => (
                                            <div
                                                key={`${img}-${index}`}
                                                className={`imageOrderItem ${dragIndex === index ? 'imageOrderDragging' : ''}`}
                                                data-index={index}
                                                draggable
                                                onDragStart={(event) => handleDragStart(event, index)}
                                                onDragOver={handleDragOver}
                                                onDrop={(event) => handleDrop(event, index)}
                                                onPointerDown={(event) => handlePointerDown(event, index)}
                                                onPointerMove={handlePointerMove}
                                                onPointerUp={handlePointerUp}
                                                onPointerCancel={handlePointerUp}
                                            >
                                                <span className='imageOrderHandle'>:::</span>
                                                <img src={img} alt={`Imagen ${index + 1}`} className='imageOrderThumb' />
                                                <span className='imageOrderLabel'>
                                                    Imagen {index + 1}
                                                    {index === 0 && <span className='imageOrderPrimary'>Principal</span>}
                                                </span>
                                                <div className='imageOrderActions'>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const target = Math.max(0, index - 1);
                                                            if (target === index) return;
                                                            const next = [...imageOrder];
                                                            const [moved] = next.splice(index, 1);
                                                            next.splice(target, 0, moved);
                                                            setImageOrder(next);
                                                        }}
                                                    >
                                                        ↑
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const target = Math.min(imageOrder.length - 1, index + 1);
                                                            if (target === index) return;
                                                            const next = [...imageOrder];
                                                            const [moved] = next.splice(index, 1);
                                                            next.splice(target, 0, moved);
                                                            setImageOrder(next);
                                                        }}
                                                    >
                                                        ↓
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <button className='btnPost' onClick={guardarOrdenImagenes}>Guardar orden</button>
                            </div>
                            <div className='previevProduct'>

                                {imagenPreview ? (
                                    <img src={imagenPreview} alt="Vista previa de la imagen" onClick={() => abrirModalImagenSeleccionada(producto.imagen1)} />
                                ) : (
                                    <>
                                        {producto.imagen1 ? (
                                            <img src={producto.imagen1} alt="imagen" onClick={() => abrirModalImagenSeleccionada(producto.imagen1)} />

                                        ) : (
                                            <span className='imgNone'>
                                                No hay imagen

                                            </span>
                                        )}
                                    </>
                                )}

                                {imagenPreview2 ? (
                                    <img src={imagenPreview2} alt="Vista previa de la imagen" />
                                ) : (
                                    <>
                                        {producto.imagen2 ? (
                                            <img src={producto.imagen2} alt="imagen" onClick={() => abrirModalImagenSeleccionada(producto.imagen2)} />

                                        ) : (
                                            <span className='imgNone'>
                                                No hay imagen

                                            </span>
                                        )}
                                    </>
                                )}
                                {imagenPreview3 ? (
                                    <img src={imagenPreview3} alt="Vista previa de la imagen" />
                                ) : (
                                    <>
                                        {producto.imagen3 ? (
                                            <img src={producto.imagen3} alt="imagen" onClick={() => abrirModalImagenSeleccionada(producto.imagen3)} />

                                        ) : (
                                            <span className='imgNone'>
                                                No hay imagen

                                            </span>
                                        )}
                                    </>
                                )}
                                {imagenPreview4 ? (
                                    <img src={imagenPreview4} alt="Vista previa de la imagen" />
                                ) : (
                                    <>
                                        {producto.imagen4 ? (
                                            <img src={producto.imagen4} alt="imagen" onClick={() => abrirModalImagenSeleccionada(producto.imagen4)} />

                                        ) : (
                                            <span className='imgNone'>
                                                No hay imagen

                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                            <fieldset>
                                <legend>Editar Imagen1 </legend>
                                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setNuevaImagen, setImagenPreview)} />
                            </fieldset>
                            <fieldset>
                                <legend>Editar Imagen2 </legend>
                                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setNuevaImagen2, setImagenPreview2)} />
                            </fieldset>
                            <fieldset>
                                <legend>Editar Imagen3 </legend>
                                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setNuevaImagen3, setImagenPreview3)} />
                            </fieldset>
                            <fieldset>
                                <legend>Editar Imagen4 </legend>
                                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setNuevaImagen4, setImagenPreview4)} />
                            </fieldset>


                            <button className='btnPost' onClick={() => handleEditarImagenBanner(producto.idProducto)}>Guardar </button>

                            <div className='landingSlotsCard'>
                                <h4>Landings IA (10 espacios)</h4>
                                <p className='landingSlotsHint'>Selecciona imagenes generadas para usarlas en el producto.</p>
                                <div className='landingSlotsGrid'>
                                    {Array.from({ length: 10 }, (_, idx) => {
                                        const slotId = aiSlots[idx] || null;
                                        const slotImage = slotId ? getSlotImage(slotId) : null;
                                        return (
                                            <div key={`slot-${idx}`} className='landingSlot'>
                                                <span className='landingSlotLabel'>Slot {idx + 1}</span>
                                                {slotImage ? (
                                                    <img src={slotImage.files?.[0]?.url} alt={`Slot ${idx + 1}`} />
                                                ) : (
                                                    <div className='landingSlotEmpty'>Vacio</div>
                                                )}
                                                <div className='landingSlotActions'>
                                                    <button type="button" onClick={() => handlePickAiSlot(idx)}>
                                                        Elegir de galeria
                                                    </button>
                                                    <button type="button" onClick={() => handleClearAiSlot(idx)}>
                                                        Reemplazar
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>



                    </div>
                </div>
            )}
            <div className='table-container'>
                <div className='productList'>
                    {productosFiltrados.map(item => {
                        const stockValue = item?.stock;
                        const hasStock = stockValue === null || stockValue === undefined || Number(stockValue) > 0;
                        const statusText = getEstadoLabel(item);
                        const statusClass = statusText === 'Activo'
                            ? 'statusActive'
                            : statusText === 'Sin stock'
                                ? 'statusOut'
                                : statusText === 'Desactivado'
                                    ? 'statusDisabled'
                                    : 'statusVariant';
                        return (
                            <div
                                className='productRowCard'
                                key={`card-${item.idProducto}`}
                                onClick={() => abrirModal(item)}
                            >
                                <img src={item.imagen1 || item.imagen2 || item.imagen3 || item.imagen4 || ''} alt={item.titulo} />
                                <div className='productRowInfo'>
                                    <h4>{item.titulo}</h4>
                                    <span>{hasStock ? `${item?.stock ?? '-'} disponibles` : 'Sin stock'}</span>
                                </div>
                                <span className={`statusBadge ${statusClass}`}>
                                    {statusText}
                                </span>
                                <div className='productRowActions'>
                                    <button className='editar' onClick={(event) => { event.stopPropagation(); duplicarProducto(item.idProducto); }}>
                                        <FontAwesomeIcon icon={faCopy} />
                                    </button>
                                    <button className='editar' onClick={(event) => { event.stopPropagation(); abrirModal(item); }}>
                                        <FontAwesomeIcon icon={faEdit} />
                                    </button>
                                    <Anchor
                                        className='editar'
                                        to={`/producto/${item?.idProducto}/${item?.titulo?.replace(/\s+/g, '-')}`}
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        <FontAwesomeIcon icon={faEye} />
                                    </Anchor>
                                    <button className='eliminar' onClick={(event) => { event.stopPropagation(); eliminarProducto(item.idProducto); }}>
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <table className='table'>
                    <thead>
                        <tr>
                            <th>Id Producto</th>
                            <th>Titulo</th>
                            <th>Precio</th>
                            <th>Stock</th>
                            <th>Estado</th>
                            <th>Categoria</th>
                            <th>Imagen</th>
                            <th>Imagen 2</th>
                            <th>Imagen 3</th>
                            <th>Imagen 4</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {productosFiltrados.map(item => {
                            const stockValue = item?.stock;
                            const hasStock = stockValue === null || stockValue === undefined || Number(stockValue) > 0;
                            const statusText = getEstadoLabel(item);
                            const statusClass = statusText === 'Activo'
                                ? 'statusActive'
                                : statusText === 'Sin stock'
                                    ? 'statusOut'
                                    : statusText === 'Desactivado'
                                        ? 'statusDisabled'
                                        : 'statusVariant';
                            return (
                                <tr key={item.idProducto}>
                                <td>{item.idProducto}</td>
                                <td>{item.titulo}</td>

                                <td style={{
                                    color: '#008000',
                                }}>
                                    {moneda} {`${item?.precio}`}
                                </td>
                                <td>{item?.stock === null || item?.stock === undefined ? '-' : item.stock}</td>
                                <td>
                                    <span className={`statusBadge ${statusClass}`}>
                                        {statusText}
                                    </span>
                                </td>

                                {categorias
                                    .filter(categoriaFiltrada => categoriaFiltrada.idCategoria === item.idCategoria)
                                    .map(categoriaFiltrada => (
                                        <td
                                            key={categoriaFiltrada.idCategoria}
                                            style={{ color: '#DAA520' }}
                                        >
                                            {categoriaFiltrada.categoria}
                                        </td>
                                    ))
                                }

                                <td>
                                    {item.imagen1 ? (
                                        <img src={item.imagen1} alt="imagen1" />
                                    ) : (
                                        <span className='imgNonetd'>
                                            Sin imagen
                                        </span>
                                    )}
                                </td>
                                <td>
                                    {item.imagen2 ? (
                                        <img src={item.imagen2} alt="imagen2" />
                                    ) : (
                                        <span className='imgNonetd'>
                                            Sin imagen
                                        </span>
                                    )}
                                </td>
                                <td>
                                    {item.imagen3 ? (
                                        <img src={item.imagen3} alt="imagen3" />
                                    ) : (
                                        <span className='imgNonetd'>
                                            Sin imagen
                                        </span>
                                    )}
                                </td>
                                <td>
                                    {item.imagen4 ? (
                                        <img src={item.imagen4} alt="imagen4" />
                                    ) : (
                                        <span className='imgNonetd'>
                                            Sin imagen
                                        </span>
                                    )}
                                </td>

                                <td>

                                    <button className='eliminar' onClick={() => eliminarProducto(item.idProducto)}>
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                    <button className='editar' onClick={() => duplicarProducto(item.idProducto)}>
                                        <FontAwesomeIcon icon={faCopy} />
                                    </button>
                                    <button className='editar' onClick={() => abrirModal(item)}>
                                        <FontAwesomeIcon icon={faEdit} />
                                    </button>
                                    <Anchor className='editar' to={`/producto/${item?.idProducto}/${item?.titulo?.replace(/\s+/g, '-')}`}>
                                        <FontAwesomeIcon icon={faEye} />
                                    </Anchor>
                                </td>
                            </tr>
                            );
                        })}
                    </tbody>

                </table>
            </div>
        </div>
    );
};


