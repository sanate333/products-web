import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync, faCopy, faBan } from '@fortawesome/free-solid-svg-icons';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import './ClientesData.css';
import baseURL from '../../url';
import moneda from '../../moneda';

export default function ClientesData() {
    const [clientes, setClientes] = useState([]);
    const [filtro, setFiltro] = useState('');
    const [blockedIps, setBlockedIps] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('blockedIps') || '[]');
        } catch {
            return [];
        }
    });

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
                cliente.ip,
            ];
            return fields.some((value) => String(value || '').toLowerCase().includes(term));
        });
    }, [clientes, filtro]);

    const formatTotal = (value) => {
        const total = Number(value || 0);
        if (Number.isNaN(total)) return `${moneda} 0`;
        return `${moneda} ${total.toFixed(2)}`;
    };

    const handleCopyCliente = async (cliente) => {
        const text = [
            `Nombre: ${cliente.nombre || ''}`,
            `WhatsApp: ${cliente.whatsapp || ''}`,
            `Ciudad: ${cliente.ciudad || ''}`,
            `Departamento: ${cliente.departamento || ''}`,
            `Direccion: ${cliente.direccion || ''}`,
            `Total gastado: ${formatTotal(cliente.totalGastado)}`,
            `Pedidos: ${cliente.totalPedidos || 0}`,
            cliente.ip ? `IP: ${cliente.ip}` : null,
        ].filter(Boolean).join('\n');
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
            toast.success('Datos copiados');
        } catch {
            toast.error('No se pudo copiar');
        }
    };

    const handleBlockIp = (cliente) => {
        const ip = cliente.ip || cliente.whatsapp || cliente.nombre;
        if (!ip) {
            toast.error('No se encontro IP para bloquear.');
            return;
        }
        Swal.fire({
            title: 'Bloquear cliente',
            text: `Bloquear IP/identificador: ${ip}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Bloquear',
            cancelButtonText: 'Cancelar',
        }).then((result) => {
            if (result.isConfirmed) {
                const updated = [...blockedIps, ip];
                setBlockedIps(updated);
                localStorage.setItem('blockedIps', JSON.stringify(updated));
                toast.success(`Bloqueado: ${ip}`);
            }
        });
    };

    const handleUnblockIp = (ip) => {
        const updated = blockedIps.filter((item) => item !== ip);
        setBlockedIps(updated);
        localStorage.setItem('blockedIps', JSON.stringify(updated));
        toast.success(`Desbloqueado: ${ip}`);
    };

    const isBlocked = (cliente) => {
        const ip = cliente.ip || cliente.whatsapp || '';
        return blockedIps.includes(ip);
    };

    return (
        <div className="clientesSection">
            <ToastContainer />
            <div className="clientesHeader">
                <input
                    type="text"
                    placeholder="Filtrar clientes (nombre, WhatsApp, ciudad, IP...)"
                    value={filtro}
                    onChange={(event) => setFiltro(event.target.value)}
                />
                <button type="button" className="clientesReload" onClick={cargarClientes} aria-label="Recargar clientes">
                    <FontAwesomeIcon icon={faSync} />
                </button>
            </div>

            {blockedIps.length > 0 && (
                <div className="blockedIpsList">
                    <h4>IPs bloqueadas ({blockedIps.length})</h4>
                    <div className="blockedIpsChips">
                        {blockedIps.map((ip) => (
                            <span key={ip} className="blockedIpChip">
                                {ip}
                                <button type="button" onClick={() => handleUnblockIp(ip)} title="Desbloquear">&times;</button>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="clientesList">
                {clientesFiltrados.map((cliente) => {
                    const pedidos = Number(cliente.totalPedidos || 0);
                    const ciudad = [cliente.ciudad, cliente.departamento].filter(Boolean).join(', ');
                    const blocked = isBlocked(cliente);
                    return (
                        <div key={`${cliente.idCliente}-${cliente.whatsapp}`} className={`clienteCard ${blocked ? 'clienteBlocked' : ''}`}>
                            <div className="clienteInfo">
                                <h4>{cliente.nombre || 'Cliente'} {blocked && <span className="blockedBadge">BLOQUEADO</span>}</h4>
                                <span>{ciudad || 'Sin ciudad'}</span>
                                <span>{cliente.whatsapp || '-'}</span>
                                {cliente.ip && <span className="clienteIp">IP: {cliente.ip}</span>}
                            </div>
                            <div className="clienteMeta">
                                <strong>{formatTotal(cliente.totalGastado)}</strong>
                                <span>{pedidos} pedido{pedidos === 1 ? '' : 's'}</span>
                                <div className="clienteActions">
                                    <button type="button" className="clienteActionBtn" onClick={() => handleCopyCliente(cliente)} title="Copiar datos">
                                        <FontAwesomeIcon icon={faCopy} />
                                    </button>
                                    <button
                                        type="button"
                                        className={`clienteActionBtn ${blocked ? 'clienteUnblock' : 'clienteBlock'}`}
                                        onClick={() => blocked ? handleUnblockIp(cliente.ip || cliente.whatsapp) : handleBlockIp(cliente)}
                                        title={blocked ? 'Desbloquear' : 'Bloquear IP'}
                                    >
                                        <FontAwesomeIcon icon={faBan} />
                                    </button>
                                </div>
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
