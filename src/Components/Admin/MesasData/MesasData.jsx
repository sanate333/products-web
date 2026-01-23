import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faEdit, faSync } from '@fortawesome/free-solid-svg-icons';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import 'jspdf-autotable';
import baseURL from '../../url';
import NewMesa from '../NewMesa/NewMesa';
import './MesasData.css';
import moneda from '../../moneda';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import contador from '../../contador'
export default function MesasData() {
    const [mesas, setMesas] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [nuevoEstado, setNuevoEstado] = useState('');
    const [nuevoEstadoPedido, setNuevoEstadoPedido] = useState('');
    const [nuevaMesa, setNuevaMesa] = useState('');
    const [mesa, setMesa] = useState({});
    const [selectedSection, setSelectedSection] = useState('texto');
    const [pedidos, setPedidos] = useState([]);
    const [pedido, setPedido] = useState({});
    const [numeroTelefono, setNumeroTelefono] = useState('');
    useEffect(() => {
        cargarMesas();
        cargarPedidos();
    }, []);

    const cargarPedidos = () => {
        fetch(`${baseURL}/pedidoGet.php`, {
            method: 'GET',
        })
            .then(response => response.json())
            .then(data => {
                setPedidos(data.pedidos.reverse() || []);
                console.log(data.pedidos);
            })
            .catch(error => console.error('Error al cargar pedidos:', error));
    };

    const cargarMesas = () => {
        fetch(`${baseURL}/mesaGet.php`, {
            method: 'GET',
        })
            .then(response => response.json())
            .then(data => {
                setMesas(data.mesas || []);
                console.log(data.mesas);
            })
            .catch(error => console.error('Error al cargar mesas:', error));
    };

    const eliminar = (idMesa) => {
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
                fetch(`${baseURL}/mesaDelete.php?idMesa=${idMesa}`, {
                    method: 'DELETE',
                })
                    .then(response => response.json())
                    .then(data => {
                        Swal.fire(
                            '¡Eliminado!',
                            data.mensaje,
                            'success'
                        );
                        cargarMesas();
                    })
                    .catch(error => {
                        console.error('Error al eliminar mesa:', error);
                        toast.error(error);
                    });
            }
        });
    };

    const abrirModal = (item) => {
        setMesa(item);
        setNuevoEstado(item.estado);
        setNuevaMesa(item.mesa);

        const mesaPedidos = pedidos.filter(pedido => pedido.idMesa === item.idMesa && pedido.estado !== "Pagado" && pedido.estado !== "Rechazado");
        if (mesaPedidos.length > 0) {
            setPedido(mesaPedidos[0]);
            setNuevoEstadoPedido(mesaPedidos[0].estado);
        } else {
            setPedido({});
            setNuevoEstadoPedido('');
        }

        setModalVisible(true);
    };

    const cerrarModal = () => {
        setModalVisible(false);
    };

    const handleUpdateText = (idMesa) => {
        const payload = {
            estado: nuevoEstado !== '' ? nuevoEstado : mesa.estado,
            mesa: nuevaMesa !== '' ? nuevaMesa : mesa.mesa,
        };

        fetch(`${baseURL}/mesaPut.php?idMesa=${idMesa}`, {
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
                    cargarMesas();
                    cerrarModal();
                }
            })
            .catch(error => {
                console.log(error.message);
                toast.error(error.message);
            });
    };

    const handleUpdateTextPedido = (idPedido) => {
        const payload = {
            estado: nuevoEstadoPedido !== '' ? nuevoEstadoPedido : pedido.estado,
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
                    cargarMesas();
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

    const handleDownloadPDF = () => {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        let y = 10;

        // Agregar título
        pdf.setFontSize(10);


        // Obtener los detalles del pedido actualmente mostrado en el modal
        const pedidoActual = pedido;

        const mesaFiltrada = mesas?.filter(mesa => mesa?.idMesa === pedidoActual?.idMesa)

        // Agregar detalles del pedido al PDF
        const pedidoData = [
            [`ID Pedido:`, `${pedidoActual.idPedido}`],
            [`Pedido:`, `${mesaFiltrada[0]?.mesa}`],
            [`Estado:`, `${pedidoActual.estado}`],
            [`Nombre:`, `${pedidoActual.nombre}`],
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
        const productosPedido = JSON.parse(pedidoActual.productos);

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
        cargarMesas();
        cargarPedidos();
    };

    const handleEnviarWhatsApp = (pedido) => {
        if (numeroTelefono) {
            const url = `https://api.whatsapp.com/send?phone=${numeroTelefono}&text=${encodeURIComponent(generarMensajePedido(pedido))}`;
            window.open(url, '_blank');
        } else {
            alert('Por favor, ingrese un número de teléfono.');
        }
    };

    const generarMensajePedido = (pedido) => {
        let mensaje = `Estimado cliente  ${pedido?.nombre}\nle dejamos el detalle de su pedido:\n\nID Pedido: ${pedido?.idPedido}\n`;


        // Asegurarse de que `pedido.productos` sea un arreglo
        const productos = typeof pedido?.productos === 'string' ? JSON.parse(pedido?.productos) : pedido?.productos;

        if (Array.isArray(productos)) {
            mensaje += `----------------------->\n`;
            productos?.forEach((producto, index) => {
                mensaje += `*${producto?.titulo}*\n${moneda} ${producto?.precio} - x ${producto?.cantidad}\n${producto?.item} \n\n`;

            });
            mensaje += `----------------------->\n`;
            mensaje += `*Total:  ${moneda} ${pedido?.total}*`;
        } else {
            mensaje += `No se encontraron productos.\n`;
        }

        return mensaje;
    };





    return (
        <div className='BannerContainer'>
            <ToastContainer />
            <div className='deFlexBtns'>
                <NewMesa />

                <button className='reload' onClick={recargar}><FontAwesomeIcon icon={faSync} /></button>
            </div>


            {modalVisible && (
                <div className="modal">
                    <div className="modal-content">
                        <div className='deFlexBtnsModal'>
                            <div className='deFlexBtnsModal'>
                                <button
                                    className={selectedSection === 'texto' ? 'selected' : ''}
                                    onClick={() => handleSectionChange('texto')}
                                >
                                    Editar Texto
                                </button>

                                <button
                                    className={selectedSection === 'pedido' ? 'selected' : ''}
                                    onClick={() => handleSectionChange('pedido')}
                                >
                                    Ver Pedido
                                </button>

                            </div>
                            <span className="close" onClick={cerrarModal}>
                                &times;
                            </span>
                        </div>

                        <div className='sectiontext' style={{ display: selectedSection === 'texto' ? 'flex' : 'none' }}>
                            <div className='flexGrap'>
                                <fieldset>
                                    <legend>Pedido</legend>
                                    <input
                                        type="text"
                                        value={nuevaMesa !== '' ? nuevaMesa : mesa.mesa}
                                        onChange={(e) => setNuevaMesa(e.target.value)}
                                    />
                                </fieldset>

                                <fieldset>
                                    <legend>Estado</legend>
                                    <select
                                        value={nuevoEstado !== '' ? nuevoEstado : mesa.estado}
                                        onChange={(e) => setNuevoEstado(e.target.value)}
                                    >
                                        <option value="libre">Libre</option>
                                        <option value="ocupada">Ocupada</option>
                                    </select>
                                </fieldset>
                            </div>
                            <button className='btnPost' onClick={() => handleUpdateText(mesa.idMesa)} >Guardar</button>
                        </div>

                        <div className='sectiontext' style={{ display: selectedSection === 'pedido' ? 'flex' : 'none' }}>
                            {
                                pedidos.filter(item => item.idMesa === mesa.idMesa && item.estado !== "Pagado" && item.estado !== "Rechazado").length > 0
                                    ? pedidos.filter(item => item.idMesa === mesa.idMesa && item.estado !== "Pagado" && item.estado !== "Rechazado").slice(0, 1).map(pedido => (
                                        <>
                                            <div key={pedido.idPedido} className='flexGrap'>
                                                <fieldset>
                                                    <legend>ID Pedido</legend>
                                                    <input
                                                        value={pedido.idPedido}
                                                        disabled
                                                    />
                                                </fieldset>
                                                <fieldset>
                                                    <legend>Pedido </legend>
                                                    {
                                                        mesas.filter(mesa => mesa?.idMesa === pedido?.idMesa).map(mapeomesa => (
                                                            <input
                                                                key={mapeomesa.idMesa}
                                                                value={mapeomesa.mesa}
                                                                disabled
                                                            />
                                                        ))
                                                    }
                                                </fieldset>
                                                <fieldset>
                                                    <legend>Nombre</legend>
                                                    <input
                                                        value={pedido.nombre}
                                                        disabled
                                                    />
                                                </fieldset>
                                                <fieldset>
                                                    <legend>Codigo</legend>
                                                    <input
                                                        value={pedido.codigo}
                                                        disabled
                                                    />
                                                </fieldset>
                                                <fieldset>
                                                    <legend>Nota</legend>
                                                    <input
                                                        value={pedido.nota}
                                                        disabled
                                                    />
                                                </fieldset>
                                                <fieldset>
                                                    <legend>Fecha </legend>
                                                    <input
                                                        value={pedido.createdAt}
                                                        disabled
                                                    />
                                                </fieldset>
                                                <fieldset>
                                                    <legend>Total </legend>
                                                    <input
                                                        value={pedido.total}
                                                        disabled
                                                    />
                                                </fieldset>
                                                <fieldset>
                                                    <legend>Estado</legend>
                                                    <select
                                                        value={nuevoEstadoPedido !== '' ? nuevoEstadoPedido : pedido.estado}
                                                        onChange={(e) => setNuevoEstadoPedido(e.target.value)}
                                                    >
                                                        <option value={pedido.estado}>{pedido.estado}</option>
                                                        <option value="Entregado">Entregado</option>
                                                        <option value="Rechazado">Rechazado</option>
                                                        <option value="Pagado">Pagado</option>
                                                    </select>
                                                </fieldset>
                                                <div className='cardsProductData'>
                                                    {JSON.parse(pedido.productos).map(producto => (
                                                        <div key={producto.titulo} className='cardProductData'>
                                                            <img src={producto.imagen} alt="imagen" />
                                                            <div className='cardProductDataText'>
                                                                <h3>{producto.titulo}</h3>
                                                                <strong>{moneda} {producto.precio} <span>x{producto.cantidad}</span></strong>
                                                                <span>{producto.item}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                            </div>
                                            <div className='InputsBtns'>
                                                <input
                                                    type="number"
                                                    placeholder="Teléfono"
                                                    value={numeroTelefono}
                                                    onChange={(e) => setNumeroTelefono(e.target.value)}
                                                    className='inputNumber'
                                                />
                                                <button
                                                    className='btnPost'
                                                    onClick={() => handleEnviarWhatsApp(pedido)}
                                                >
                                                    Enviar por<i className='fa fa-whatsapp'></i>
                                                </button>
                                            </div>
                                            <div className='deFlexBtns'>


                                                <button onClick={handleDownloadPDF} className='btnPost'>Descargar PDF</button>
                                                <button className='btnPost' onClick={() => handleUpdateTextPedido(pedido.idPedido)} >Guardar </button>

                                            </div>

                                        </>
                                    ))
                                    : <div className='noHay'><p>No hay pedidos</p></div>
                            }
                        </div>
                    </div>
                </div>
            )}

            <div className='mesasGrap'>
                {mesas.map(item => (
                    <div className={`cardMesa ${item.estado === 'libre' ? 'bg-green' : 'bg-red'}`} key={item.idMesa}>
                        <div className='deFLexBtnMesa'>
                            <button className='eliminar' onClick={() => eliminar(item.idMesa)}>
                                <FontAwesomeIcon icon={faTrash} />
                            </button>
                            <h4>{item.estado}</h4>
                            <button className='editar' onClick={() => abrirModal(item)}>
                                <FontAwesomeIcon icon={faEdit} />
                            </button>
                        </div>
                        <h3>{item.mesa}</h3>
                    </div>
                ))}
            </div>
        </div>
    );
};
