import React, { useState, useRef, useEffect } from 'react';
import Header from '../Header/Header';
import HeaderDash from '../../Components/Admin/HeaderDash/HeaderDash';
import useLogo, { setLogoUrl } from '../../hooks/useLogo';
import './AjustesLogo.css';
import baseURL from '../../Components/url';
import { getTiendaSlug } from '../../utils/tienda';

export default function AjustesLogo() {
    const currentLogo = useLogo();
    const [tiendaId, setTiendaId] = useState(null);
    const [tiendaSlug, setTiendaSlug] = useState('');
    const [serverLogo, setServerLogo] = useState('');
    const [logoUrl, setLogoUrlState] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const slug = getTiendaSlug();
        setTiendaSlug(slug);
        const loadTienda = async () => {
            try {
                const apiBase = baseURL.replace(/\/+$/, '');
                const response = await fetch(`${apiBase}/tiendasGet.php`);
                const data = await response.json();
                const tienda = data?.tiendas?.find((item) => item.slug === slug);
                if (tienda?.idTienda) {
                    setTiendaId(tienda.idTienda);
                }
                if (tienda?.logo) {
                    setServerLogo(tienda.logo);
                    setLogoUrl(tienda.logo, slug);
                }
            } catch (error) {
                console.error('Error cargando tienda:', error);
            }
        };

        loadTienda();
    }, []);

    const handleSaveUrl = () => {
        if (!logoUrl.trim() || !tiendaId) return;
        setIsSaving(true);
        const cleanUrl = logoUrl.trim();
        setLogoUrl(cleanUrl, tiendaSlug);
        setLogoUrlState('');
        const apiBase = baseURL.replace(/\/+$/, '');
        const formData = new FormData();
        formData.append('logoUrl', cleanUrl);

        fetch(`${apiBase}/tiendaPut.php?idTienda=${tiendaId}`, {
            method: 'POST',
            body: formData,
            cache: 'no-store'
        })
            .then(() => {
                setServerLogo(cleanUrl);
            })
            .catch((error) => {
                console.error('Error guardando logo:', error);
            })
            .finally(() => setTimeout(() => setIsSaving(false), 800));
    };

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (!file || !tiendaId) return;
        
        // Validar que sea una imagen
        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona una imagen válida');
            return;
        }

        setIsSaving(true);
        const apiBase = baseURL.replace(/\/+$/, '');
        const formData = new FormData();
        formData.append('logo', file);

        fetch(`${apiBase}/tiendaPut.php?idTienda=${tiendaId}`, {
            method: 'POST',
            body: formData,
            cache: 'no-store'
        })
            .then(async (response) => {
                const data = await response.json();
                if (data?.tienda?.logo) {
                    setServerLogo(data.tienda.logo);
                    setLogoUrl(data.tienda.logo, tiendaSlug);
                }
            })
            .catch((error) => {
                console.error('Error subiendo logo:', error);
            })
            .finally(() => {
                setTimeout(() => setIsSaving(false), 800);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            });
    };

    return (
        <div className="containerGrid">
            <Header />
            <section className="containerSection">
                <HeaderDash />
                <div className="container">
                    <div className="logoCard">
                        <h3>Editar Logo</h3>
                        <p>Sube una imagen o pega la URL del logo. Recomendamos usar un fondo transparente.</p>
                        
                        <div className="logoPreview">
                            <img src={serverLogo || currentLogo} alt="Logo actual" />
                        </div>

                        <div className="logoSection">
                            <h4>Opción 1: URL del logo</h4>
                            <input
                                type="text"
                                value={logoUrl}
                                onChange={(event) => setLogoUrlState(event.target.value)}
                                placeholder="https://..."
                            />
                            <button type="button" className="logoSave" onClick={handleSaveUrl} disabled={isSaving}>
                                {isSaving ? 'Guardando...' : 'Guardar logo desde URL'}
                            </button>
                        </div>

                        <div className="logoSection">
                            <h4>Opción 2: Subir imagen</h4>
                            <label htmlFor="fileInput" className="fileInputLabel">
                                <span>📁 Seleccionar imagen</span>
                                <input 
                                    ref={fileInputRef}
                                    id="fileInput"
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleFileChange}
                                    className="fileInput"
                                />
                            </label>
                        </div>

                        <div className="logoTip">
                            <span>💡 Quitar fondo automáticamente:</span>
                            <a
                                href="https://www.iloveimg.com/es/eliminar-fondo"
                                target="_blank"
                                rel="noreferrer"
                            >
                                iloveimg.com/eliminar-fondo
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
