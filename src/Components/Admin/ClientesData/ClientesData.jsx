import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync, faBan, faCopy, faCheck, faUnlock } from '@fortawesome/free-solid-svg-icons';
import './ClientesData.css';
import baseURL from '../.././url';
import moneda from '../.././moneda';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';

export default function ClientesData() {
    const [clientes, setClientes] = useState([]);
    const [filtro, setFiltro] = useState('');
    const [copiadoId, setCopiadoId] = useState(null);

    const cargarClientes = () => {
        fetch(`${baseURL}/clientesGet.php`, {
            method: 'GET',
        })
        .then((response) => response.json())
        .then((data) => {
            setClientes(data.clientes || []);
        })
        .catch(() => {
            setClientes([]);
        });
    };

    useEffect(() => {
        cargarClientes();
    }, []);

    const clientesFiltrados = useMemo(() => {
        const term = filtro.trim().toLowerCase();
        if (!term) return clientes;
        return clientes.filter((cliente) => {
            const fields = [
                cliente.nombre,
                cliente.whatsapp,
                cliente.ciudad,
                cliente.departamento,
                cliente.direccion,
            ];
            return fields.some((value) => String(value || '').toLowerCase().includes(term));
        });
    }, [clientes, filtro]);

    const formatTotal = (value) => {
        const total = Number(value || 0);
        if (Number.isNaN(total)) return `${moneda} 0`;
        return `${moneda} ${total.toFixed(2)}`;
    };

    const copiarCliente = (cliente) => {
        const info = `Nombre: ${cliente.nombre || 'Sin nombre'}\nWhatsApp: ${cliente.whatsapp || '-'}\nCiudad: ${[cliente.ciudad, cliente.departamento].filter(Boolean).join(', ') || 'Sin ciudad'}\nDirecci\u00f3n: ${cliente.direccion || '-'}\nTotal gastado: ${formatTotal(cliente.totalGastado)}\nPedidos: ${Number(cliente.totalPedidos || 0)}`;
        navigator.clipboard.writeText(info).then(() => {
            setCopiadoId(cliente.idCliente);
            toast.success('Info del cliente copiada');
            setTimeout(() => setCopiadoId(null), 2000);
        }).catch(() => {
            toast.error('No se pudo copiar');
        });
    };

    const toggleBloqueo = (cliente) => {
        const estaBloqueado = cliente.bloqueado === '1' || cliente.bloqueado === 1;
        const accion = estaBloqueado ? 'desbloquear' : 'bloquear';
        Swal.fire({
            title: `\u00bfEstas seguro?`,
            text: `Se va a ${accion} a ${cliente.nombre || 'este cliente'}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: estaBloqueado ? '#28a745' : '#d33',
            confirmButtonText: estaBloqueado ? 'S\u00ed, desbloquear' : 'S\u00ed, bloquear',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                fetch(`${baseURL}/clienteBlock.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        idCliente: cliente.idCliente,
                        bloqueado: estaBloqueado ? 0 : 1
                    })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        toast.success(`Cliente ${accion === 'bloquear' ? 'bloqueado' : 'desbloqueado'}`);
                        cargarClientes();
                    } else {
                        toast.error(data.error || 'Error al actualizar');
                    }
                })
                .catch(() => toast.error('Error de conexi\u00f3n'));
            }
        });
    };

    return (
        <div className="clientesSection">
            <div className="clientesHeader">
                <input
                    type="text"
                    placeholder="Filtrar clientes"
                    value={filtro}
                    onChange={(event) => setFiltro(event.target.value)}
                />
                <button type="button" className="clientesReload" onClick={cargarClientes} aria-label="Recargar clientes">
                    <FontAwesomeIcon icon={faSync} />
                </button>
            </div>
            <div className="clientesList">
                {clientesFiltrados.map((cliente) => {
                    const pedidos = Number(cliente.totalPedidos || 0);
                    const ciudad = [cliente.ciudad, cliente.departamento].filter(Boolean).join(', ');
                    const estaBloqueado = cliente.bloqueado === '1' || cliente.bloqueado === 1;
                    return (
                        <div key={`${cliente.idCliente}-${cliente.whatsapp}`} className={`clienteCard${estaBloqueado ? ' clienteBloqueado' : ''}`}>
                            <div className="clienteInfo">
                                <h4>{cliente.nombre || 'Cliente'}</h4>
                                <span>{ciudad || 'Sin ciudad'}</span>
                                <span>{cliente.whatsapp || '-'}</span>
                            </div>
                            <div className="clienteMeta">
                                <strong>{formatTotal(cliente.totalGastado)}</strong>
                                <span>{pedidos} pedido{pedidos === 1 ? '' : 's'}</span>
                            </div>
                            <div className="clienteActions">
                                <button
                                    className={`btnCopiar${copiadoId === cliente.idCliente ? ' copiado' : ''}`}
                                    onClick={() => copiarCliente(cliente)}
                                    title="Copiar info"
                                >
                                    <FontAwesomeIcon icon={copiadoId === cliente.idCliente ? faCheck : faCopy} />
                                </button>
                                <button
                                    className={`btnBloquear${estaBloqueado ? ' bloqueado' : ''}`}
                                    onClick={() => toggleBloqueo(cliente)}
                                    title={estaBloqueado ? 'Desbloquear' : 'Bloquear'}
                                >
                                    <FontAwesomeIcon icon={estaBloqueado ? faUnlock : faBan} />
                                </button>
                            </div>
                        </div>
                    );
                })}
                {!clientesFiltrados.length && (
                    <div className="clientesEmpty">No hay clientes registrados.</div>
                )}
            </div>
        </div>
    );
}
