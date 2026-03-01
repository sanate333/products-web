import React, { useState, useEffect } from 'react';
import './TiendaSelector.css';
import baseURL from '../../url';
import { buildDashboardPath } from '../../../utils/tienda';

const API_URL = baseURL.replace(/\/+$/, '');

export default function TiendaSelector() {
    const [tiendas, setTiendas] = useState([]);
    const [selectedTienda, setSelectedTienda] = useState('default');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchTiendas();
        // Cargar tienda seleccionada del localStorage
        const stored = localStorage.getItem('tiendaActual');
        if (stored) {
            const normalized = ['principal', 'default', 'eco-commerce'].includes(String(stored).toLowerCase())
                ? 'default'
                : stored;
            setSelectedTienda(normalized);
        }
    }, []);

    const fetchTiendas = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/tiendasGet.php`);
            const data = await response.json();
            if (data.success) {
                setTiendas(data.tiendas);
            }
        } catch (error) {
            console.error('Error al obtener tiendas:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTiendaChange = (e) => {
        const slug = e.target.value;
        setSelectedTienda(slug);
        const storedSlug = slug === 'default' ? 'principal' : slug;
        localStorage.setItem('tiendaActual', storedSlug);
        
        // Redirigir al dashboard de la tienda seleccionada
        if (slug === 'default') {
            window.location.href = '/dashboard';
        } else {
            window.location.href = buildDashboardPath(slug, '/dashboard');
        }
    };

    if (loading || tiendas.length === 0) {
        return null;
    }

    return (
        <div className="tiendaSelectorContainer">
            <label htmlFor="tiendaSelect">Tienda:</label>
            <select 
                id="tiendaSelect"
                value={selectedTienda}
                onChange={handleTiendaChange}
                className="tiendaSelect"
            >
                <option value="default">Default / Principal</option>
                {tiendas.map((tienda) => (
                    <option key={tienda.idTienda} value={tienda.slug}>
                        {tienda.nombre}
                    </option>
                ))}
            </select>
        </div>
    );
}
