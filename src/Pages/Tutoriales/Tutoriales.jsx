import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Header from '../Header/Header';
import HeaderDash from '../../Components/Admin/HeaderDash/HeaderDash';
import baseURL, { resolveImg } from '../../Components/url';
import './Tutoriales.css';

const DEFAULT_CATEGORIES = [
    'Inicio rapido',
    'Tiendas',
    'Productos',
    'WhatsApp',
    'Landing',
    'Imagenes IA',
];

const EMPTY_FORM = {
    id: null,
    titulo: '',
    categoria: 'Inicio rapido',
    tipo: 'link',
    source_url: '',
    file: null,
};

const buildEmbedUrl = (url = '') => {
    const raw = String(url || '').trim();
    if (!raw) return '';

    try {
        const parsed = new URL(raw);
        const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

        if (host === 'youtu.be') {
            const id = parsed.pathname.replace('/', '').trim();
            return id ? `https://www.youtube.com/embed/${id}` : raw;
        }

        if (host.includes('youtube.com')) {
            const id = parsed.searchParams.get('v');
            if (id) return `https://www.youtube.com/embed/${id}`;
            if (parsed.pathname.startsWith('/embed/')) return raw;
        }

        if (host.includes('vimeo.com')) {
            const id = parsed.pathname.split('/').filter(Boolean).pop();
            return id ? `https://player.vimeo.com/video/${id}` : raw;
        }
    } catch (error) {
        return raw;
    }

    return raw;
};

export default function Tutoriales() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tutoriales, setTutoriales] = useState([]);
    const [activeCategory, setActiveCategory] = useState('Inicio rapido');
    const [viewerItem, setViewerItem] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);

    const categorias = useMemo(() => {
        const map = new Set(DEFAULT_CATEGORIES);
        tutoriales.forEach((row) => {
            const categoria = String(row?.categoria || '').trim();
            if (categoria) map.add(categoria);
        });
        return Array.from(map);
    }, [tutoriales]);

    const filteredTutoriales = useMemo(
        () => tutoriales.filter((item) => String(item?.categoria || '') === activeCategory),
        [tutoriales, activeCategory]
    );

    const loadTutoriales = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${baseURL}/tutorialesGet.php?ts=${Date.now()}`, {
                method: 'GET',
                credentials: 'include',
            });
            const data = await response.json();
            const rows = Array.isArray(data?.data?.tutoriales) ? data.data.tutoriales : [];
            setTutoriales(rows);
            setActiveCategory((prev) => (
                rows.some((item) => String(item?.categoria || '') === prev)
                    ? prev
                    : (rows[0]?.categoria || 'Inicio rapido')
            ));
        } catch (err) {
            setError('No se pudieron cargar los tutoriales.');
            setTutoriales([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTutoriales();
    }, [loadTutoriales]);

    const resetForm = () => {
        setForm(EMPTY_FORM);
    };

    const openCreateModal = () => {
        resetForm();
        setIsFormOpen(true);
    };

    const openEditModal = (item) => {
        setForm({
            id: Number(item?.id || 0) || null,
            titulo: item?.titulo || '',
            categoria: item?.categoria || 'Inicio rapido',
            tipo: item?.tipo === 'mp4' ? 'mp4' : 'link',
            source_url: item?.source_url || '',
            file: null,
        });
        setIsFormOpen(true);
    };

    const closeFormModal = () => {
        setIsFormOpen(false);
        resetForm();
    };

    const submitForm = async () => {
        if (!form.titulo.trim()) {
            setError('Debes ingresar un titulo.');
            return;
        }
        if (form.tipo === 'link' && !form.source_url.trim()) {
            setError('Debes ingresar un link.');
            return;
        }
        if (form.tipo === 'mp4' && !form.id && !form.file) {
            setError('Debes subir un MP4.');
            return;
        }

        setSaving(true);
        setError('');
        try {
            const payload = new FormData();
            payload.append('titulo', form.titulo.trim());
            payload.append('categoria', form.categoria || 'Inicio rapido');
            payload.append('tipo', form.tipo);
            if (form.tipo === 'link') {
                payload.append('source_url', form.source_url.trim());
            }
            if (form.id) {
                payload.append('id', String(form.id));
            }
            if (form.file) {
                payload.append('file', form.file);
            }

            const endpoint = form.id ? 'tutorialesPut.php' : 'tutorialesPost.php';
            const response = await fetch(`${baseURL}/${endpoint}`, {
                method: 'POST',
                body: payload,
                credentials: 'include',
            });
            const data = await response.json();
            if (!response.ok || data?.ok === false) {
                throw new Error(data?.message || data?.mensaje || 'No se pudo guardar');
            }

            closeFormModal();
            await loadTutoriales();
        } catch (err) {
            setError(err.message || 'No se pudo guardar el tutorial.');
        } finally {
            setSaving(false);
        }
    };

    const deleteTutorial = async (item) => {
        const id = Number(item?.id || 0);
        if (!id) return;
        const confirmed = window.confirm(`Eliminar tutorial "${item?.titulo || ''}"?`);
        if (!confirmed) return;

        setError('');
        try {
            const response = await fetch(`${baseURL}/tutorialesDelete.php?id=${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            const data = await response.json();
            if (!response.ok || data?.ok === false) {
                throw new Error(data?.message || data?.mensaje || 'No se pudo eliminar');
            }
            await loadTutoriales();
        } catch (err) {
            setError(err.message || 'No se pudo eliminar el tutorial.');
        }
    };

    const renderViewer = () => {
        if (!viewerItem) return null;
        const isMp4 = String(viewerItem?.tipo || '').toLowerCase() === 'mp4';
        const videoUrl = isMp4 ? resolveImg(viewerItem?.file_path || '') : '';
        const embedUrl = !isMp4 ? buildEmbedUrl(viewerItem?.source_url || '') : '';

        return (
            <div className="tutorialesModalOverlay" onClick={() => setViewerItem(null)}>
                <div className="tutorialesModal" onClick={(event) => event.stopPropagation()}>
                    <div className="tutorialesModalHead">
                        <h4>{viewerItem.titulo}</h4>
                        <button type="button" onClick={() => setViewerItem(null)}>x</button>
                    </div>
                    <div className="tutorialesEmbedWrap">
                        {isMp4 ? (
                            <video src={videoUrl} controls autoPlay />
                        ) : (
                            <iframe
                                title={viewerItem.titulo}
                                src={embedUrl || viewerItem?.source_url || ''}
                                loading="lazy"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="containerGrid">
            <Header />
            <section className="containerSection">
                <HeaderDash />
                <div className="container tutorialesShell">
                    <header className="tutorialesHeader">
                        <div>
                            <h3>Tutoriales</h3>
                            <p>Gestiona videos de formacion por categorias (YouTube/Vimeo o MP4).</p>
                        </div>
                        <div className="tutorialesHeaderActions">
                            <button type="button" onClick={loadTutoriales}>Recargar</button>
                            <button type="button" className="tutorialPrimaryBtn" onClick={openCreateModal}>
                                Nuevo tutorial
                            </button>
                        </div>
                    </header>

                    <section className="tutorialesCategories">
                        {categorias.map((category) => (
                            <button
                                key={category}
                                type="button"
                                className={activeCategory === category ? 'active' : ''}
                                onClick={() => setActiveCategory(category)}
                            >
                                {category}
                            </button>
                        ))}
                    </section>

                    {error ? <p className="tutorialesError">{error}</p> : null}

                    <section className="tutorialesGrid">
                        {loading ? <div className="tutorialesEmpty">Cargando tutoriales...</div> : null}
                        {!loading && filteredTutoriales.map((video) => (
                            <article key={video.id} className="videoCard">
                                <div className="videoThumb">
                                    <span>{video.tipo === 'mp4' ? 'MP4' : 'LINK'}</span>
                                </div>
                                <div className="videoBody">
                                    <h4>{video.titulo}</h4>
                                    <small>{video.categoria}</small>
                                    <div className="videoActions">
                                        <button type="button" onClick={() => setViewerItem(video)}>Ver</button>
                                        <button type="button" onClick={() => openEditModal(video)}>Editar</button>
                                        <button type="button" className="danger" onClick={() => deleteTutorial(video)}>Eliminar</button>
                                    </div>
                                </div>
                            </article>
                        ))}
                        {!loading && filteredTutoriales.length === 0 ? (
                            <div className="tutorialesEmpty">No hay tutoriales en esta categoria.</div>
                        ) : null}
                    </section>
                </div>
            </section>

            {isFormOpen ? (
                <div className="tutorialesModalOverlay" onClick={closeFormModal}>
                    <div className="tutorialesFormModal" onClick={(event) => event.stopPropagation()}>
                        <div className="tutorialesModalHead">
                            <h4>{form.id ? 'Editar tutorial' : 'Nuevo tutorial'}</h4>
                            <button type="button" onClick={closeFormModal}>x</button>
                        </div>

                        <div className="tutorialesFormGrid">
                            <label htmlFor="tutorial-title">Titulo</label>
                            <input
                                id="tutorial-title"
                                value={form.titulo}
                                onChange={(event) => setForm((prev) => ({ ...prev, titulo: event.target.value }))}
                                placeholder="Ej: Como crear tu primera tienda"
                            />

                            <label htmlFor="tutorial-category">Categoria</label>
                            <select
                                id="tutorial-category"
                                value={form.categoria}
                                onChange={(event) => setForm((prev) => ({ ...prev, categoria: event.target.value }))}
                            >
                                {categorias.map((item) => (
                                    <option key={item} value={item}>{item}</option>
                                ))}
                            </select>

                            <label htmlFor="tutorial-type">Tipo</label>
                            <select
                                id="tutorial-type"
                                value={form.tipo}
                                onChange={(event) => setForm((prev) => ({ ...prev, tipo: event.target.value }))}
                            >
                                <option value="link">Link (YouTube/Vimeo)</option>
                                <option value="mp4">Archivo MP4</option>
                            </select>

                            {form.tipo === 'link' ? (
                                <>
                                    <label htmlFor="tutorial-link">Link</label>
                                    <input
                                        id="tutorial-link"
                                        value={form.source_url}
                                        onChange={(event) => setForm((prev) => ({ ...prev, source_url: event.target.value }))}
                                        placeholder="https://youtube.com/..."
                                    />
                                </>
                            ) : (
                                <>
                                    <label htmlFor="tutorial-file">Archivo MP4</label>
                                    <input
                                        id="tutorial-file"
                                        type="file"
                                        accept="video/mp4,video/webm,video/quicktime"
                                        onChange={(event) => setForm((prev) => ({ ...prev, file: event.target.files?.[0] || null }))}
                                    />
                                </>
                            )}
                        </div>

                        <div className="tutorialesFormActions">
                            <button type="button" className="secondary" onClick={closeFormModal}>Cancelar</button>
                            <button type="button" className="tutorialPrimaryBtn" disabled={saving} onClick={submitForm}>
                                {saving ? 'Guardando...' : (form.id ? 'Guardar cambios' : 'Crear tutorial')}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {renderViewer()}
        </div>
    );
}
