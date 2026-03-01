import React, { useEffect, useMemo, useState } from 'react';
import Header from '../Header/Header';
import HeaderDash from '../../Components/Admin/HeaderDash/HeaderDash';
import baseURL from '../../Components/url';
import './CoRegistrationsAdmin.css';

export default function CoRegistrationsAdmin() {
    const [rows, setRows] = useState([]);
    const [q, setQ] = useState('');

    const load = async () => {
        try {
            const res = await fetch(`${String(baseURL || '').replace(/\/+$/, '')}/api/admin/co-registrations`);
            const data = await res.json();
            if (data?.ok) setRows(Array.isArray(data.rows) ? data.rows : []);
        } catch {
            setRows([]);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        const s = String(q || '').trim().toLowerCase();
        if (!s) return rows;
        return rows.filter((r) => (
            [
                r.templateTitle,
                r.storeName,
                r.storeSlug,
                r.email,
                r.whatsapp,
                r.status,
            ].join(' ').toLowerCase().includes(s)
        ));
    }, [q, rows]);

    return (
        <div className='containerGrid'>
            <Header />
            <section className='containerSection'>
                <HeaderDash />
                <div className='container coAdminPage'>
                    <div className='coAdminHead'>
                        <div>
                            <h1>Registros /co</h1>
                            <p>Todos los registros creados desde la pagina CO.</p>
                        </div>
                        <div className='coAdminActions'>
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder='Buscar por tienda, correo, WhatsApp...'
                            />
                            <button type='button' onClick={load}>Actualizar</button>
                        </div>
                    </div>

                    <div className='coAdminTableCard'>
                        <div className='coAdminTableWrap'>
                            <table className='coAdminTable'>
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Plantilla</th>
                                        <th>Tienda</th>
                                        <th>Link</th>
                                        <th>Correo</th>
                                        <th>WhatsApp</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((r) => (
                                        <tr key={r.id}>
                                            <td>{r.createdAt ? new Date(r.createdAt).toLocaleString('es-CO') : '-'}</td>
                                            <td>{r.templateTitle || '-'}</td>
                                            <td className='coAdminStoreName'>{r.storeName || '-'}</td>
                                            <td>
                                                <a href={`https://sanate.store/${r.storeSlug || ''}`} target='_blank' rel='noreferrer'>
                                                    /{r.storeSlug || '-'}
                                                </a>
                                            </td>
                                            <td>{r.email || '-'}</td>
                                            <td>{r.whatsapp || '-'}</td>
                                            <td>
                                                <span className={`coStatusTag ${String(r.status || 'registered')}`}>
                                                    {r.status || 'registered'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className='coAdminEmpty'>No hay registros aun.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

