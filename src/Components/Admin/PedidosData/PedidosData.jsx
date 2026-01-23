import React, { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync, faArrowUp, faArrowDown } from '@fortawesome/free-solid-svg-icons';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import './PedidosData.css'
import 'jspdf-autotable';
import baseURL, { resolveImg } from '../../url';
import moneda from '../../moneda';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import contador from '../../contador'

export default function PedidosData() {
    const [pedidos, setPedidos] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [nuevoEstado, setNuevoEstado] = useState('');
    const [pedido, setPedido] = useState({});
    const [selectedSection, setSelectedSection] = useState('texto');
    const [filtroId, setFiltroId] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');
    const todayIso = new Date().toISOString().slice(0, 10);
    const [filtroDesde, setFiltroDesde] = useState(todayIso);
    const [filtroHasta, setFiltroHasta] = useState(todayIso);
    const [ordenInvertido, setOrdenInvertido] = useState(false);
    const [trackingNumber, setTrackingNumber] = useState('');
    const [trackingUrl, setTrackingUrl] = useState('');
    const [isSendingTracking, setIsSendingTracking] = useState(false);
    const lastOrderIdRef = useRef(null);
    const soundRef = useRef(null);
    const INSTAGRAM_URL = 'https://www.instagram.com/sanate.col/';
    useEffect(() => {
        cargarPedidos();
    }, []);

    useEffect(() => {
        if (modalVisible) {
            document.body.classList.add('dashboard-modal-open');
        } else {
            document.body.classList.remove('dashboard-modal-open');
        }
        return () => document.body.classList.remove('dashboard-modal-open');
    }, [modalVisible]);
    const getPendingPedidos = () => {
        const pending = JSON.parse(localStorage.getItem('pendingPedidos')) || [];
        return pending.map((item) => ({
            idPedido: `LOCAL-${item.id}`,
            localId: item.id,
            isLocal: true,
            estado: item.estado || 'Pendiente',
            nombre: item.nombre,
            whatsapp: item.whatsapp,
            direccion: item.direccion,
            departamento: item.departamento,
            formaPago: item.formaPago,
            nota: item.nota,
            codigo: item.codigo,
            total: item.total,
            productos: item.productos || [],
            createdAt: item.createdAt || '',
        }));
    };
    const parseProductos = (productos) => {
        try {
            return typeof productos === 'string' ? JSON.parse(productos || '[]') : (productos || []);
        } catch (error) {
            console.error('Error al formatear productos:', error);
            return [];
        }
    };
    const removePendingPedido = (localId) => {
        const pending = JSON.parse(localStorage.getItem('pendingPedidos')) || [];
        const updatedPending = pending.filter((item) => item.id !== localId);
        localStorage.setItem('pendingPedidos', JSON.stringify(updatedPending));
    };
    const cargarPedidos = () => {
        fetch(`${baseURL}/pedidoGet.php`, {
            method: 'GET',
        })
            .then(response => response.json())
            .then(data => {
                const pending = getPendingPedidos();
                const pedidosRemotos = data.pedidos?.reverse() || [];
                const latestRemoteId = pedidosRemotos.reduce((max, item) => {
                    const id = Number(item.idPedido);
                    if (Number.isNaN(id)) return max;
                    return id > max ? id : max;
                }, 0);
                const merged = [...pending, ...pedidosRemotos].sort((a, b) => {
                    const dateA = new Date(a.createdAt || 0).getTime();
                    const dateB = new Date(b.createdAt || 0).getTime();
                    return dateB - dateA;
                });
                setPedidos(merged);
                if (latestRemoteId > 0) {
                    if (lastOrderIdRef.current === null) {
                        lastOrderIdRef.current = latestRemoteId;
                    } else if (latestRemoteId > lastOrderIdRef.current) {
                        lastOrderIdRef.current = latestRemoteId;
                        if (!soundRef.current) {
                            soundRef.current = new Audio('/shopify.mp3');
                        }
                        soundRef.current.currentTime = 0;
                        soundRef.current.play().catch(() => {});
                    }
                }
                console.log(data.pedidos)
            })
            .catch(error => {
                console.error('Error al cargar pedidos:', error);
                const pending = getPendingPedidos().sort((a, b) => {
                    const dateA = new Date(a.createdAt || 0).getTime();
                    const dateB = new Date(b.createdAt || 0).getTime();
                    return dateB - dateA;
                });
                setPedidos(pending);
            });
    };

    const eliminar = (idPedido) => {
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
                if (pedido?.isLocal || idPedido?.toString().startsWith('LOCAL-')) {
                    const localId = pedido?.localId || idPedido?.toString().replace('LOCAL-', '');
                    removePendingPedido(localId);
                    setPedidos((prev) => prev.filter((item) => item.idPedido !== idPedido));
                    Swal.fire('雁Eliminado!', 'Pedido local eliminado.', 'success');
                    return;
                }
                fetch(`${baseURL}/pedidoDelete.php?idPedido=${idPedido}`, {
                    method: 'DELETE',
                })
                    .then(response => response.json())
                    .then(data => {
                        Swal.fire(
                            '¡Eliminado!',
                            data.mensaje,
                            'success'
                        );
                        cargarPedidos();
                    })
                    .catch(error => {
                        console.error('Error al eliminar :', error);
                        toast.error(error);
                    });
            }
        });
    };

    const abrirModal = (item) => {
        setPedido(item);
        setNuevoEstado(item.estado)
        setTrackingNumber('');
        setTrackingUrl('');
        setModalVisible(true);
    };

    const cerrarModal = () => {
        setModalVisible(false);
    };

    const handleUpdateText = (idPedido) => {
        if (pedido?.isLocal) {
            const pending = JSON.parse(localStorage.getItem('pendingPedidos')) || [];
            const updatedPending = pending.map((item) => {
                if (item.id === pedido.localId) {
                    return { ...item, estado: nuevoEstado || item.estado || 'Pendiente' };
                }
                return item;
            });
            localStorage.setItem('pendingPedidos', JSON.stringify(updatedPending));
            setPedidos((prev) => prev.map((item) => {
                if (item.idPedido === pedido.idPedido) {
                    return { ...item, estado: nuevoEstado || item.estado || 'Pendiente' };
                }
                return item;
            }));
            Swal.fire('Editado!', 'Pedido local actualizado.', 'success');
            cerrarModal();
            return;
        }
        const payload = {
            estado: nuevoEstado !== '' ? nuevoEstado : pedido.estado,
        };

        fetch(`${baseURL}/pedidoPut.php?idPedido=${idPedido}`, {
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
                    cargarPedidos();
                    cerrarModal();
                }
            })
            .catch(error => {
                console.log(error.message);
                toast.error(error.message);
            });
    };



    const handleSectionChange = (section) => {
        setSelectedSection(section);
    };

    const filtrados = pedidos.filter(item => {
        const idMatch = item.idPedido.toString().includes(filtroId);
        const estadoMatch = !filtroEstado || item.estado.includes(filtroEstado);
        const desdeMatch = !filtroDesde || new Date(item.createdAt) >= new Date(filtroDesde);

        // Incrementamos la fecha "hasta" en un día para que incluya la fecha seleccionada
        const adjustedHasta = new Date(filtroHasta);
        adjustedHasta.setDate(adjustedHasta.getDate() + 1);

        const hastaMatch = !filtroHasta || new Date(item.createdAt) < adjustedHasta;
        return idMatch && estadoMatch && desdeMatch && hastaMatch;
    });


    const recargarProductos = () => {
        cargarPedidos();
    };
    const invertirOrden = () => {
        setPedidos([...pedidos].reverse());
        setOrdenInvertido(!ordenInvertido);
    };
    const descargarExcel = () => {
        let totalGeneral = 0;

        const data = filtrados.map(item => {
            const total = parseFloat(item.total); // Convertir a número
            totalGeneral += total;
            const productos = parseProductos(item.productos);
            const infoProductos = productos.map(producto => `${producto.titulo} - ${moneda}${producto.precio} - x${producto.cantidad}  `);
            return {
                'ID Pedido': item.idPedido,
                'Estado': item.estado,
                'Nombre': item.nombre,
                'WhatsApp': item.whatsapp,
                'Direccion': item.direccion,
                'Departamento': item.departamento,
                'Forma de pago': item.formaPago,
                'Nota': item.nota,
                'Productos': infoProductos.join('\n'),
                'Codigo': item.codigo,
                'Total': `${moneda} ${total.toFixed(2)}`,
                'Fecha': item.createdAt,
            };
        });

        // Formatear el total general
        const formattedTotal = `${moneda} ${totalGeneral.toFixed(2)}`;

        // Agregar fila con el total general
        const totalRow = {

            'ID Pedido': '',
            'Estado': '',
            'Nombre': '',
            'WhatsApp': '',
            'Direccion': '',
            'Forma de pago': '',
            'Nota': '',
            'Productos': '',
            'Codigo': 'Total General:',
            'Total': formattedTotal,
            'Fecha': '',
        };

        data.push(totalRow);

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'pedidos');
        XLSX.writeFile(wb, 'pedidos.xlsx');
    };


    const descargarPDF = () => {
        const pdf = new jsPDF('landscape'); // Orientación horizontal
        pdf.text('Lista de Pedidos', 10, 10);

        const columns = [
            { title: 'ID Pedido', dataKey: 'idPedido' },
            { title: 'Estado', dataKey: 'estado' },
            { title: 'Nombre', dataKey: 'nombre' },
            { title: 'WhatsApp', dataKey: 'whatsapp' },
            { title: 'Direccion', dataKey: 'direccion' },
            { title: 'Departamento', dataKey: 'departamento' },
            { title: 'Forma de pago', dataKey: 'formaPago' },
            { title: 'Nota', dataKey: 'nota' },
            { title: 'Productos', dataKey: 'productos' },
            { title: 'Codigo', dataKey: 'codigo' },
            { title: 'Total', dataKey: 'total' },
            { title: 'Fecha', dataKey: 'createdAt' },
        ];

        let totalGeneral = 0;

        const data = filtrados.map(item => {
            const total = parseFloat(item.total); // Convertir a número
            totalGeneral += total;
            const productos = parseProductos(item.productos);
            const infoProductos = productos.map(producto => `${producto.titulo} - ${moneda}${producto.precio} - x${producto.cantidad}  `);
            return {
                idPedido: item.idPedido,
                estado: item.estado,
                nombre: item.nombre,
                whatsapp: item.whatsapp,
                direccion: item.direccion,
                departamento: item.departamento,
                formaPago: item.formaPago,
                nota: item.nota,
                productos: infoProductos.join('\n'),
                codigo: item.codigo,
                total: `${moneda} ${total.toFixed(2)}`,
                createdAt: item.createdAt,
            };
        });

        // Formatear el total general
        const formattedTotal = `${moneda} ${totalGeneral.toFixed(2)}`;

        // Agregar fila con el total general
        const totalRow = {
            idPedido: '',
            estado: '',
            nombre: '',
            whatsapp: '',
            direccion: '',
            departamento: '',
            formaPago: '',
            nota: '',
            productos: '',
            codigo: 'Total General:',
            total: formattedTotal,
            createdAt: '',
        };

        data.push(totalRow);

        pdf.autoTable({
            head: [columns.map(col => col.title)],
            body: data.map(item => Object.values(item)),
        });

        pdf.save('pedidos.pdf');
    };
    const handleDownloadPDF = () => {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        let y = 10;

        // Agregar título
        pdf.setFontSize(10);


        // Obtener los detalles del pedido actualmente mostrado en el modal
        const pedidoActual = pedido;

        // Agregar detalles del pedido al PDF
        const pedidoData = [
            [`ID Pedido:`, `${pedidoActual.idPedido}`],
            [`Estado:`, `${pedidoActual.estado}`],
            [`Nombre:`, `${pedidoActual.nombre}`],
            [`WhatsApp:`, `${pedidoActual.whatsapp}`],
            [`Direccion:`, `${pedidoActual.direccion}`],
            [`Departamento:`, `${pedidoActual.departamento}`],
            [`Forma de pago:`, `${pedidoActual.formaPago}`],
            [`Nota:`, `${pedidoActual.nota}`],
            [`Código:`, `${pedidoActual.codigo}`],
            [`Total:`, `${moneda} ${pedidoActual.total}`],
            [`Fecha:`, `${pedidoActual.createdAt}`]
        ];
        pdf.autoTable({
            startY: y,
            head: [['Detalle del pedido', 'Valor']],
            body: pedidoData,
        });
        y = pdf.autoTableEndPosY() + 5;

        y += 5;

        // Obtener los productos del pedido actual
        const productosPedido = parseProductos(pedidoActual.productos);

        // Generar sección de productos con imágenes y contenido
        for (let i = 0; i < productosPedido.length; i++) {
            if (y + 30 > pdf.internal.pageSize.getHeight()) {
                pdf.addPage();
                y = 10;
            }

            const producto = productosPedido[i];

            pdf.setFontSize(8);

            // Muestra la imagen a la izquierda de los datos del producto
            if (producto.imagen) {
                pdf.addImage(producto.imagen, 'JPEG', 15, y, 20, 20); // Ajusta el tamaño de la imagen aquí
            } else {
                // Si no hay URL de imagen, simplemente dejar un espacio en blanco
                pdf.text("Imagen no disponible", 5, y + 15);
            }

            if (producto) {
                pdf.text(`Producto: ${producto.titulo}`, 39, y + 3);
                pdf.text(`Precio: ${moneda} ${producto.precio}`, 39, y + 11);
                pdf.text(`Cantidad: ${producto.cantidad}`, 39, y + 15);
                pdf.text(`${producto.item}`, 39, y + 19);
            }

            y += 25; // Incrementar y para la siguiente posición
        }

        // Guardar el PDF
        pdf.save('pedido.pdf');
    };

    const [counter, setCounter] = useState(contador);
    const [isPaused, setIsPaused] = useState(false);
    useEffect(() => {
        const interval = setInterval(() => {
            if (!isPaused) {
                setCounter((prevCounter) => {
                    if (prevCounter === 1) {
                        recargar();
                        return contador;
                    }
                    return prevCounter - 1;
                });
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isPaused]);
    const togglePause = () => {
        setIsPaused(!isPaused);
    };


    const recargar = () => {
        cargarPedidos();
    };
    const updatePedidoEstado = (item, estado) => {
        if (item?.isLocal) {
            const pending = JSON.parse(localStorage.getItem('pendingPedidos')) || [];
            const updatedPending = pending.map((p) => {
                if (p.id === item.localId) {
                    return { ...p, estado };
                }
                return p;
            });
            localStorage.setItem('pendingPedidos', JSON.stringify(updatedPending));
            setPedidos((prev) => prev.map((p) => {
                if (p.idPedido === item.idPedido) {
                    return { ...p, estado };
                }
                return p;
            }));
            cargarPedidos();
            return;
        }
        fetch(`${baseURL}/pedidoPut.php?idPedido=${item.idPedido}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ estado }),
        })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    Swal.fire('Error!', data.error, 'error');
                } else {
                    Swal.fire('Listo!', data.mensaje, 'success');
                    cargarPedidos();
                }
            })
            .catch(error => {
                console.log(error.message);
                toast.error(error.message);
            });
    };
    const formatPedidoId = (idPedido) => {
        const idNum = Number(idPedido);
        if (Number.isNaN(idNum)) {
            return `#${idPedido}`;
        }
        return `#${String(idNum).padStart(3, '0')}`;
    };
    const normalizePhone = (value) => {
        const digits = String(value || '').replace(/\D/g, '');
        if (!digits) return '';
        if (digits.startsWith('57')) return digits;
        if (digits.length === 10) return `57${digits}`;
        return digits;
    };

    const openWhatsApp = (phone, message) => {
        const encodedMessage = encodeURIComponent(message);
        const appUrl = `whatsapp://send?phone=${phone}&text=${encodedMessage}`;
        const webUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
        const fallbackTimer = setTimeout(() => {
            window.open(webUrl, '_blank', 'noopener,noreferrer');
        }, 600);
        window.addEventListener('blur', () => clearTimeout(fallbackTimer), { once: true });
        window.location.href = appUrl;
    };

    const buildCopyText = () => {
        const productos = parseProductos(pedido.productos);
        const productosLines = productos.map((producto) => {
            const cantidad = producto?.cantidad || 1;
            return `- ${producto?.titulo || 'Producto'} x${cantidad} (${moneda} ${producto?.precio})`;
        });
        return [
            `Pedido: ${formatPedidoId(pedido.idPedido)}`,
            `Nombre: ${pedido?.nombre || ''}`,
            `WhatsApp: ${pedido?.whatsapp || ''}`,
            `Direccion: ${pedido?.direccion || ''}`,
            `Departamento: ${pedido?.departamento || ''}`,
            `Forma de pago: ${pedido?.formaPago || ''}`,
            `Estado: ${pedido?.estado || ''}`,
            `Fecha: ${pedido?.createdAt || ''}`,
            `Total: ${moneda} ${pedido?.total || ''}`,
            '',
            'Productos:',
            ...productosLines,
        ].join('\n');
    };

    const handleCopyDatos = async () => {
        const text = buildCopyText();
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.setAttribute('readonly', '');
                textarea.style.position = 'absolute';
                textarea.style.left = '-9999px';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
            toast.success('Datos copiados.');
        } catch (error) {
            toast.error('No se pudo copiar.');
        }
    };

    const handleEnviarGuia = () => {
        if (isSendingTracking) {
            return;
        }
        const phone = normalizePhone(pedido?.whatsapp);
        if (!phone) {
            Swal.fire('Atencion', 'No se encontro el WhatsApp del cliente.', 'warning');
            return;
        }
        if (!trackingNumber.trim()) {
            Swal.fire('Atencion', 'Ingresa la guia de envio.', 'warning');
            return;
        }
        setIsSendingTracking(true);
        const mensaje = [
            `Hola ${pedido?.nombre || ''}, gracias por tu compra.`,
            'Tu envio ya va en camino.',
            `Guia: ${trackingNumber.trim()}`,
            trackingUrl.trim() ? `Seguimiento: ${trackingUrl.trim()}` : null,
            `Instagram: ${INSTAGRAM_URL}`,
        ].filter(Boolean).join('\n');

        updatePedidoEstado(pedido, 'Enviado');
        openWhatsApp(phone, mensaje);
        setIsSendingTracking(false);
    };

    const buildTrackingMessage = (lines) => {
        return [
            `Hola ${pedido?.nombre || ''},`,
            ...lines,
            `Guia: ${trackingNumber.trim()}`,
            trackingUrl.trim() ? `Seguimiento: ${trackingUrl.trim()}` : null,
            `Instagram: ${INSTAGRAM_URL}`,
        ].filter(Boolean).join('\n');
    };

    const handlePrimerIntento = () => {
        const phone = normalizePhone(pedido?.whatsapp);
        if (!phone) {
            Swal.fire('Atencion', 'No se encontro el WhatsApp del cliente.', 'warning');
            return;
        }
        if (!trackingNumber.trim()) {
            Swal.fire('Atencion', 'Ingresa la guia de envio.', 'warning');
            return;
        }
        const mensaje = buildTrackingMessage([
            'Hoy intentamos realizar la entrega.',
            'Por favor estar atento, gracias.',
        ]);
        openWhatsApp(phone, mensaje);
    };

    const handleSegundoIntento = () => {
        const phone = normalizePhone(pedido?.whatsapp);
        if (!phone) {
            Swal.fire('Atencion', 'No se encontro el WhatsApp del cliente.', 'warning');
            return;
        }
        if (!trackingNumber.trim()) {
            Swal.fire('Atencion', 'Ingresa la guia de envio.', 'warning');
            return;
        }
        const mensaje = buildTrackingMessage([
            'Ya intentamos entregar por segunda vez.',
            'Por favor confirma si has podido recibir o si hay algun inconveniente.',
        ]);
        openWhatsApp(phone, mensaje);
    };

    const formatProductosResumen = (productos) => {
        const items = parseProductos(productos);
        const titles = items.map((producto) => producto?.titulo).filter(Boolean);
        if (!titles.length) {
            return 'Sin productos';
        }
        const visible = titles.slice(0, 2);
        const remaining = titles.length - visible.length;
        return remaining > 0 ? `${visible.join(', ')} +${remaining}` : visible.join(', ');
    };

    const getItemsCount = (productos) => {
        const items = parseProductos(productos);
        return items.reduce((total, item) => total + (item?.cantidad || 1), 0);
    };

    const getColombiaDateKey = (date) =>
        date.toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' });

    const formatHora = (value) => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Bogota',
        });
    };

    const getDateKey = (value) => {
        if (!value) return 'Sin fecha';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Sin fecha';
        return getColombiaDateKey(date);
    };

    const getDateLabel = (key) => {
        if (key === 'Sin fecha') return 'Sin fecha';
        const today = new Date();
        const todayKey = getColombiaDateKey(today);
        const ayer = new Date(today);
        ayer.setDate(today.getDate() - 1);
        const ayerKey = getColombiaDateKey(ayer);
        if (key === todayKey) return 'Hoy';
        if (key === ayerKey) return 'Ayer';
        const date = new Date(key);
        if (Number.isNaN(date.getTime())) return key;
        return date.toLocaleDateString('es-CO', {
            day: 'numeric',
            month: 'long',
            timeZone: 'America/Bogota',
        });
    };

    const getProductoImagen = (producto) => {
        const src = producto?.imagen || producto?.imagen1 || producto?.imagen2 || producto?.imagen3 || producto?.imagen4 || null;
        return resolveImg(src);
    };

    const getEstadoBadge = (estado) => {
        const value = estado || 'Pendiente';
        const badgeMap = {
            Pendiente: 'badgePendiente',
            Enviado: 'badgeEnviado',
            Entregado: 'badgeEntregado',
            Rechazado: 'badgeRechazado',
            Pagado: 'badgePagado',
        };
        return { label: value, className: badgeMap[value] || 'badgePendiente' };
    };

    const handleEstadoChange = (value) => {
        setNuevoEstado(value);
        updatePedidoEstado(pedido, value);
        setPedido((prev) => ({ ...prev, estado: value }));
    };

    const groupedPedidos = [];
    let lastGroupKey = null;
    filtrados.forEach((item) => {
        const groupKey = getDateKey(item.createdAt);
        if (groupKey !== lastGroupKey) {
            groupedPedidos.push({ type: 'header', key: groupKey, label: getDateLabel(groupKey) });
            lastGroupKey = groupKey;
        }
        groupedPedidos.push({ type: 'item', item });
    });

    return (
        <div>

            <ToastContainer />
            <div className='deFlexContent'>

                <div className='deFlex2'>

                    <button className='excel' onClick={descargarExcel}><FontAwesomeIcon icon={faArrowDown} /> Excel</button>
                    <button className='pdf' onClick={descargarPDF}><FontAwesomeIcon icon={faArrowDown} /> PDF</button>
                </div>
                <div className='filtrosContain'>
                    <div className='inputsColumn'>
                        <input type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} placeholder='Desde' />
                    </div>
                    <div className='inputsColumn'>
                        <input type="date" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} placeholder='Hasta' />
                    </div>

                    <div className='inputsColumn'>
                        <input type="number" value={filtroId} onChange={(e) => setFiltroId(e.target.value)} placeholder='Id Pedido' />
                    </div>
                    <div className='inputsColumn'>
                        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                            <option value="">Estado</option>
                            <option value="Entregado">Entregado</option>
                            <option value="Enviado">Enviado</option>
                            <option value="Rechazado">Rechazado</option>
                            <option value="Pagado">Pagado</option>
                            <option value="Pendiente">Pendiente</option>
                        </select>
                    </div>
                    <button className='reload' onClick={recargarProductos}><FontAwesomeIcon icon={faSync} /></button>
                    <button className='reverse' onClick={invertirOrden}>
                        {ordenInvertido ? <FontAwesomeIcon icon={faArrowUp} /> : <FontAwesomeIcon icon={faArrowDown} />}
                    </button>

                </div>

            </div>

            <div className='pedidoList'>
                {groupedPedidos.map((entry) => {
                    if (entry.type === 'header') {
                        return (
                            <div key={entry.key} className='pedidoGroup'>
                                {entry.label}
                            </div>
                        );
                    }
                    const { item } = entry;
                    const itemsCount = getItemsCount(item.productos);
                    const badge = getEstadoBadge(item?.estado);
                    return (
                        <button type="button" key={item.idPedido} className='pedidoCard' onClick={() => abrirModal(item)}>
                            <div className='pedidoCardHeader'>
                                <span className='pedidoId'>{formatPedidoId(item.idPedido)}</span>
                                <span className='pedidoTotal'>{moneda} {item.total}</span>
                            </div>
                            <div className='pedidoCardMeta'>
                                <span className='pedidoNombre'>{item.nombre}</span>
                                <span className='pedidoProductos'>{formatProductosResumen(item.productos)}</span>
                                <span className='pedidoDetalle'>- {itemsCount} articulo(s) - {formatHora(item.createdAt)}</span>
                            </div>
                            <div className='pedidoBadges'>
                                <span className={`pedidoBadge ${badge.className}`}>
                                    {badge.label}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>
            {modalVisible && (
                <div className="modal">
                    <div className="modal-content pedidoModalContent">
                        <div className='deFlexBtnsModal'>
                            <div className='deFlexBtnsModal'>
                                <button
                                    className={selectedSection === 'texto' ? 'selected' : ''}
                                    onClick={() => handleSectionChange('texto')}
                                >
                                    Pedido
                                </button>
                            </div>

                            <span className="close" onClick={cerrarModal}>
                                &times;
                            </span>
                        </div>
                        <div className='sectiontext' style={{ display: selectedSection === 'texto' ? 'flex' : 'none' }}>
                            <div className='flexGrap'>
                                <div className='pedidoDatosActions'>
                                    <button type="button" className='btnPost btnCopy' onClick={handleCopyDatos}>
                                        Copiar datos
                                    </button>
                                </div>
                                <div className='pedidoDatosGrid'>
                                    <fieldset>
                                        <legend>ID Pedido</legend>
                                        <input value={pedido.idPedido} disabled />
                                    </fieldset>
                                    <fieldset>
                                        <legend>Nombre</legend>
                                        <input value={pedido.nombre || ''} disabled />
                                    </fieldset>
                                    <fieldset>
                                        <legend>WhatsApp</legend>
                                        <input value={pedido.whatsapp || ''} disabled />
                                    </fieldset>
                                    <fieldset>
                                        <legend>Direccion</legend>
                                        <input value={pedido.direccion || ''} disabled />
                                    </fieldset>
                                    <fieldset>
                                        <legend>Departamento</legend>
                                        <input value={pedido.departamento || ''} disabled />
                                    </fieldset>
                                    <fieldset>
                                        <legend>Forma de pago</legend>
                                        <input value={pedido.formaPago || ''} disabled />
                                    </fieldset>
                                    <fieldset>
                                        <legend>Estado</legend>
                                        <select
                                            value={nuevoEstado !== '' ? nuevoEstado : pedido.estado}
                                            onChange={(e) => handleEstadoChange(e.target.value)}
                                        >
                                            <option value={pedido.estado}>{pedido.estado}</option>
                                            <option value="Entregado">Entregado</option>
                                            <option value="Enviado">Enviado</option>
                                            <option value="Rechazado">Rechazado</option>
                                            <option value="Pagado">Pagado</option>
                                            <option value="Pendiente">Pendiente</option>
                                        </select>
                                    </fieldset>
                                    <fieldset>
                                        <legend>Fecha</legend>
                                        <input value={pedido.createdAt || ''} disabled />
                                    </fieldset>
                                    <fieldset>
                                        <legend>Codigo</legend>
                                        <input value={pedido.codigo || ''} disabled />
                                    </fieldset>
                                    <fieldset>
                                        <legend>Nota</legend>
                                        <input value={pedido.nota || ''} disabled />
                                    </fieldset>
                                </div>

                                <div className='cardsProductData'>
                                    {parseProductos(pedido.productos).map(producto => (
                                        <div key={producto.titulo} className='cardProductData'>
                                            <img src={getProductoImagen(producto)} alt="imagen" />
                                            <div className='cardProductDataText'>
                                                <h3>{producto.titulo}</h3>
                                                <strong>{moneda} {producto.precio} <span>x{producto.cantidad}</span></strong>
                                                <span>{producto.item}</span>

                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className='pedidoTotalRow'>
                                <span>Total</span>
                                <strong>{moneda} {pedido.total}</strong>
                            </div>
                            <div className='trackingSection'>
                                <h4>Informacion de seguimiento</h4>
                                <input
                                    type="text"
                                    placeholder="Guia de envio"
                                    value={trackingNumber}
                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                />
                                <input
                                    type="text"
                                    placeholder="URL de seguimiento (opcional)"
                                    value={trackingUrl}
                                    onChange={(e) => setTrackingUrl(e.target.value)}
                                />
                            </div>
                            <div className='pedidoModalActions'>
                                <button className='btnPost btnSendTracking' onClick={handleEnviarGuia} disabled={isSendingTracking}>
                                    {isSendingTracking ? 'Enviando...' : 'Enviar guia'}
                                </button>
                                <button className='btnPost btnSendTracking' onClick={handlePrimerIntento}>
                                    Primer intento de entrega
                                </button>
                                <button className='btnPost btnSendTracking' onClick={handleSegundoIntento}>
                                    Segundo intento de entrega
                                </button>
                                <button className='btnPost btnClose' onClick={cerrarModal}>
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
















