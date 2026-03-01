/**
 * Panel de Administración de URLs Acortadas
 * Admin Dashboard para ver y gestionar todos los enlaces cortos
 * 
 * Componente React para mostrar:
 * - Lista de URLs acortadas
 * - Estadísticas de clics
 * - Opción de desactivar URLs
 * - Exportar datos
 */

import React, { useState, useEffect } from 'react';
import './UrlShortenerAdmin.css';

export const UrlShortenerAdmin = () => {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    tipo: 'todos',
    activo: 'todos',
    buscar: '',
  });

  useEffect(() => {
    cargarUrls();
  }, [filters]);

  const cargarUrls = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        tipo: filters.tipo,
        activo: filters.activo,
        buscar: filters.buscar,
      });

      const response = await fetch(`/api/urls/list.php?${query}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setUrls(data.urls || []);
      }
    } catch (error) {
      console.error('Error cargando URLs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleActivo = async (id, activo) => {
    try {
      const response = await fetch('/api/urls/toggle.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, activo: !activo }),
      });

      if (response.ok) {
        cargarUrls();
      }
    } catch (error) {
      console.error('Error actualizando URL:', error);
    }
  };

  const exportarCSV = () => {
    const csv = [
      ['Código', 'URL Original', 'Tipo', 'Título', 'Clicks', 'Creado', 'Estado'],
      ...urls.map(u => [
        u.codigo_corto,
        u.url_original,
        u.tipo,
        u.titulo,
        u.clicks,
        new Date(u.creado_en).toLocaleDateString(),
        u.activo ? 'Activo' : 'Inactivo'
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `urls-acortadas-${Date.now()}.csv`;
    a.click();
  };

  const stats = {
    total: urls.length,
    activos: urls.filter(u => u.activo).length,
    clicksTotal: urls.reduce((sum, u) => sum + (u.clicks || 0), 0),
  };

  return (
    <div className="url-shortener-admin">
      <h2>🔗 Administración de URLs Acortadas</h2>

      {/* Estadísticas */}
      <div className="stats">
        <div className="stat-card">
          <h3>{stats.total}</h3>
          <p>URLs Totales</p>
        </div>
        <div className="stat-card">
          <h3>{stats.activos}</h3>
          <p>Activos</p>
        </div>
        <div className="stat-card">
          <h3>{stats.clicksTotal}</h3>
          <p>Clics Totales</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters">
        <select
          value={filters.tipo}
          onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
        >
          <option value="todos">Todos los tipos</option>
          <option value="guia">Guías</option>
          <option value="producto">Productos</option>
          <option value="pedido">Pedidos</option>
          <option value="oferta">Ofertas</option>
        </select>

        <select
          value={filters.activo}
          onChange={(e) => setFilters({ ...filters, activo: e.target.value })}
        >
          <option value="todos">Todos</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>

        <input
          type="text"
          placeholder="Buscar..."
          value={filters.buscar}
          onChange={(e) => setFilters({ ...filters, buscar: e.target.value })}
        />

        <button onClick={exportarCSV} className="btn-export">
          📥 Exportar CSV
        </button>
      </div>

      {/* Tabla */}
      <div className="table-container">
        {loading ? (
          <p className="loading">Cargando...</p>
        ) : urls.length === 0 ? (
          <p className="empty">No hay URLs que mostrar</p>
        ) : (
          <table className="urls-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Título</th>
                <th>Tipo</th>
                <th>Clicks</th>
                <th>Creado</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {urls.map((url) => (
                <tr key={url.id} className={!url.activo ? 'inactive' : ''}>
                  <td>
                    <code>{url.codigo_corto}</code>
                  </td>
                  <td title={url.url_original}>{url.titulo || '—'}</td>
                  <td>
                    <span className={`badge badge-${url.tipo}`}>{url.tipo}</span>
                  </td>
                  <td className="clicks">{url.clicks || 0}</td>
                  <td>{new Date(url.creado_en).toLocaleDateString()}</td>
                  <td>
                    <span className={`status ${url.activo ? 'active' : 'inactive'}`}>
                      {url.activo ? '✓ Activo' : '✗ Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`btn-toggle ${!url.activo ? 'activate' : 'deactivate'}`}
                      onClick={() => toggleActivo(url.id, url.activo)}
                    >
                      {url.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default UrlShortenerAdmin;
