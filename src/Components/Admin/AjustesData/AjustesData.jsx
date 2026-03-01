import React, { useEffect, useState } from 'react';
import { Link as Anchor } from 'react-router-dom';
import useLogo from '../../../hooks/useLogo';
import useBrandingColor, { setBrandingColor } from '../../../hooks/useBrandingColor';
import useWhatsappNumber, { setWhatsappNumber } from '../../../hooks/useWhatsappNumber';
import { getStoredBrandTheme, setStoredBrandTheme, suggestAccent } from '../../../utils/brandTheme';
import './AjustesData.css';
import baseURL from '../../url';
import { buildDashboardPath, getTiendaSlug } from '../../../utils/tienda';

export default function AjustesData() {
    const [showLogo, setShowLogo] = useState(false);
    const [showBrandingColor, setShowBrandingColor] = useState(false);
    const logoUrl = useLogo();
    const { brandingColor } = useBrandingColor();
    const [selectedColor, setSelectedColor] = useState(brandingColor);
    const [tiendaId, setTiendaId] = useState(null);
    const [tiendaSlug, setTiendaSlug] = useState('');
    const [showWhatsappButtons, setShowWhatsappButtons] = useState(false);
    const [savingWhatsapp, setSavingWhatsapp] = useState(false);
    const [whatsappSavedMsg, setWhatsappSavedMsg] = useState('');
    const { whatsappNumber } = useWhatsappNumber();
    const [whatsappInput, setWhatsappInput] = useState(whatsappNumber);
    const [brandingMode, setBrandingMode] = useState('luxury');
    const [accentColor, setAccentColor] = useState('#d4af37');
    const previewWhatsappNumber = String(whatsappInput || '').replace(/\D/g, '') || whatsappNumber;

    const predefinedColors = [
        { name: 'Azul Cielo', value: '#2aaae2' },
        { name: 'Púrpura', value: '#8b5cf6' },
        { name: 'Rosa', value: '#ec4899' },
        { name: 'Verde', value: '#10b981' },
        { name: 'Rojo', value: '#ef4444' },
        { name: 'Naranja', value: '#f97316' },
        { name: 'Amarillo', value: '#eab308' },
        { name: 'Cian', value: '#06b6d4' },
        { name: 'Indigo', value: '#4f46e5' },
        { name: 'Negro', value: '#1f2937' },
    ];

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
                if (tienda?.color) {
                    setSelectedColor(tienda.color);
                    setBrandingColor(tienda.color);
                }
                const savedTheme = getStoredBrandTheme(slug);
                setBrandingMode(savedTheme?.mode || 'luxury');
                setAccentColor(savedTheme?.accentHex || suggestAccent(tienda?.color || '#2aaae2'));
                if (tienda?.whatsapp) {
                    const number = String(tienda.whatsapp).replace(/\D/g, '');
                    setWhatsappInput(number);
                    setWhatsappNumber(number, slug);
                }
            } catch (error) {
                console.error('Error cargando tienda:', error);
            }
        };

        loadTienda();
    }, []);

    useEffect(() => {
        setWhatsappInput(whatsappNumber);
    }, [whatsappNumber]);

    const handleColorChange = (color) => {
        setSelectedColor(color);
        setBrandingColor(color);
        const nextAccent = suggestAccent(color);
        setAccentColor(nextAccent);
        setStoredBrandTheme(tiendaSlug, {
            baseHex: color,
            accentHex: nextAccent,
            mode: brandingMode,
        });
        if (!tiendaId) return;

        const apiBase = baseURL.replace(/\/+$/, '');
        const formData = new FormData();
        formData.append('color', color);

        fetch(`${apiBase}/tiendaPut.php?idTienda=${tiendaId}`, {
            method: 'POST',
            body: formData,
            cache: 'no-store'
        }).catch((error) => {
            console.error('Error guardando color:', error);
        });
    };

    const handleModeChange = (mode) => {
        setBrandingMode(mode);
        setStoredBrandTheme(tiendaSlug, {
            baseHex: selectedColor,
            accentHex: accentColor || suggestAccent(selectedColor),
            mode,
        });
    };

    const handleAccentChange = (hex) => {
        setAccentColor(hex);
        setStoredBrandTheme(tiendaSlug, {
            baseHex: selectedColor,
            accentHex: hex,
            mode: brandingMode,
        });
    };

    const handleSaveWhatsapp = async () => {
        const clean = String(whatsappInput || '').replace(/\D/g, '').slice(0, 20);
        if (!clean) {
            setWhatsappSavedMsg('Ingresa un numero valido con codigo de pais.');
            return;
        }

        if (!tiendaId) {
            setWhatsappNumber(clean, tiendaSlug);
            setWhatsappSavedMsg('Numero guardado localmente. Se sincronizara al cargar la tienda.');
            return;
        }

        setSavingWhatsapp(true);
        setWhatsappSavedMsg('');
        try {
            const apiBase = baseURL.replace(/\/+$/, '');
            const formData = new FormData();
            formData.append('whatsapp', clean);
            const response = await fetch(`${apiBase}/tiendaPut.php?idTienda=${tiendaId}`, {
                method: 'POST',
                body: formData,
                cache: 'no-store',
            });
            const data = await response.json();
            if (!response.ok || data?.ok === false) {
                setWhatsappSavedMsg(data?.message || 'No se pudo guardar el numero.');
                return;
            }
            setWhatsappNumber(clean, tiendaSlug);
            setWhatsappSavedMsg('Numero guardado. Ya se aplica en botones y popups de WhatsApp.');
        } catch (error) {
            console.error('Error guardando whatsapp:', error);
            setWhatsappSavedMsg('Error de conexion al guardar.');
        } finally {
            setSavingWhatsapp(false);
        }
    };

    return (
        <div className="ajustesSection premium-bg">
            <div className="ajustesCard glass-card glow-border">
                <div className="ajustesCardHeader">
                    <div>
                        <h3>Logo</h3>
                        <p>Personaliza la identidad visual de tu tienda desde un solo lugar.</p>
                    </div>
                    <button
                        type="button"
                        className="ajustesBtn btn-primary-lux"
                        onClick={() => setShowLogo((prev) => !prev)}
                    >
                        {showLogo ? 'Ocultar' : 'Mostrar'}
                    </button>
                </div>
                {showLogo && (
                    <div className="ajustesLogoBody">
                        <div className="ajustesLogoPreview">
                            <img src={logoUrl} alt="Logo" />
                        </div>
                        <Anchor
                            to={buildDashboardPath(tiendaSlug, '/dashboard/ajustes/logo')}
                            className="ajustesBtn ajustesLinkBtn"
                        >
                            Editar logo
                        </Anchor>
                    </div>
                )}
            </div>

            <div className="ajustesCard glass-card glow-border">
                <div className="ajustesCardHeader">
                    <div>
                        <h3>Color Branding</h3>
                        <p>Elige el color de tu marca y toda la página cambiará automáticamente.</p>
                    </div>
                    <button
                        type="button"
                        className="ajustesBtn btn-primary-lux"
                        onClick={() => setShowBrandingColor((prev) => !prev)}
                    >
                        {showBrandingColor ? 'Ocultar' : 'Mostrar'}
                    </button>
                </div>
                {showBrandingColor && (
                    <div className="ColorBrandingBody">
                        <div className="colorPreviewSection">
                            <div className="colorPreviewLabel">Color actual:</div>
                            <div 
                                className="colorPreview" 
                                style={{ backgroundColor: selectedColor }}
                            >
                                <span className="colorCode">{selectedColor}</span>
                            </div>
                        </div>

                        <div className="colorInputSection">
                            <label>Color base:</label>
                            <input
                                type="color"
                                value={selectedColor}
                                onChange={(e) => handleColorChange(e.target.value)}
                                className="colorInput"
                            />
                        </div>

                        <div className="colorInputSection">
                            <label>Acento sugerido:</label>
                            <input
                                type="color"
                                value={accentColor}
                                onChange={(e) => handleAccentChange(e.target.value)}
                                className="colorInput"
                            />
                        </div>

                        <div className="modeButtons">
                            <button
                                type="button"
                                className={`modeBtn ${brandingMode === 'clean' ? 'active' : ''}`}
                                onClick={() => handleModeChange('clean')}
                            >
                                Clean
                            </button>
                            <button
                                type="button"
                                className={`modeBtn ${brandingMode === 'luxury' ? 'active' : ''}`}
                                onClick={() => handleModeChange('luxury')}
                            >
                                Luxury
                            </button>
                            <button
                                type="button"
                                className={`modeBtn ${brandingMode === 'dark' ? 'active' : ''}`}
                                onClick={() => handleModeChange('dark')}
                            >
                                Dark Luxury
                            </button>
                        </div>

                        <div className="predefinedColorsSection">
                            <label>Colores predefinidos:</label>
                            <div className="colorGrid">
                                {predefinedColors.map((color) => (
                                    <button
                                        key={color.value}
                                        className={`colorButton ${selectedColor === color.value ? 'active' : ''}`}
                                        style={{ backgroundColor: color.value }}
                                        onClick={() => handleColorChange(color.value)}
                                        title={color.name}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="ajustesCard glass-card glow-border">
                <div className="ajustesCardHeader">
                    <div>
                        <h3><i className="fa fa-whatsapp ajustesWppIcon" /> WhatsApp Botones</h3>
                        <p>Define el numero global de WhatsApp para botones, popups y enlaces de toda la pagina.</p>
                    </div>
                    <button
                        type="button"
                        className="ajustesBtn btn-primary-lux"
                        onClick={() => setShowWhatsappButtons((prev) => !prev)}
                    >
                        {showWhatsappButtons ? 'Ocultar' : 'Mostrar'}
                    </button>
                </div>
                {showWhatsappButtons && (
                    <div className="ajustesWhatsappBody">
                        <label htmlFor="ajustesWhatsappNumber">Numero WhatsApp (con codigo de pais)</label>
                        <input
                            id="ajustesWhatsappNumber"
                            type="tel"
                            value={whatsappInput}
                            onChange={(event) => setWhatsappInput(String(event.target.value || '').replace(/\D/g, '').slice(0, 20))}
                            placeholder="573001112233"
                        />
                        <div className="ajustesWhatsappPreview">
                            Vista previa: <a href={`https://wa.me/${previewWhatsappNumber}`} target="_blank" rel="noreferrer">{`https://wa.me/${previewWhatsappNumber}`}</a>
                        </div>
                        <button type="button" className="ajustesBtn btn-primary-lux" onClick={handleSaveWhatsapp} disabled={savingWhatsapp}>
                            {savingWhatsapp ? 'Guardando...' : 'Guardar numero WhatsApp'}
                        </button>
                        {whatsappSavedMsg && <p className="ajustesWhatsappMsg">{whatsappSavedMsg}</p>}
                    </div>
                )}
            </div>

            <div className="ajustesCard glass-card glow-border">
                <div className="ajustesCardHeader">
                    <div>
                        <h3>Tipografia</h3>
                        <p>Proximamente: estilos de titulos y textos.</p>
                    </div>
                    <span className="ajustesBadge">Proximamente</span>
                </div>
            </div>
        </div>
    );
}
