import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync } from '@fortawesome/free-solid-svg-icons';
import './ClientesData.css';
import baseURL from '../../url';
import moneda from '../../moneda';

export default function ClientesData() {
    const [clientes, setClientes] = useState([]);
    const [filtro, setFiltro] = useState('');

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
                    return (
                        <div key={`${cliente.idCliente}-${cliente.whatsapp}`} className="clienteCard">
                            <div className="clienteInfo">
                                <h4>{cliente.nombre || 'Cliente'}</h4>
                                <span>{ciudad || 'Sin ciudad'}</span>
                                <span>{cliente.whatsapp || '-'}</span>
                            </div>
                            <div className="clienteMeta">
                                <strong>{formatTotal(cliente.totalGastado)}</strong>
                                <span>{pedidos} pedido{pedidos === 1 ? '' : 's'}</span>
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
