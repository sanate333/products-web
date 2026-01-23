import React, { useState } from 'react';
import '../NewBanner/NewBanner.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import baseURL from '../../url';

export default function NewSubBanner() {
    const [mensaje, setMensaje] = useState('');
    const [imagenPreviews, setImagenPreviews] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);

    const toggleModal = () => {
        setModalOpen(!modalOpen);
    };
    const postEndpoints = [
        'subbannersPost.php',
        'subbannerPost.php',
        'subBannerPost.php',
    ];

    const handleImagenChange = (event) => {
        const files = Array.from(event.target.files || []).slice(0, 6);
        if (!files.length) {
            setImagenPreviews([]);
            setSelectedFiles([]);
            return;
        }
        const previews = files.map((file) => URL.createObjectURL(file));
        setImagenPreviews(previews);
        setSelectedFiles(files);
    };

    const removePreview = (index) => {
        const nextFiles = selectedFiles.filter((_, i) => i !== index);
        const nextPreviews = imagenPreviews.filter((_, i) => i !== index);
        setSelectedFiles(nextFiles);
        setImagenPreviews(nextPreviews);
    };

    const crear = async () => {
        const form = document.getElementById("crearSubBannerForm");
        const resetForm = () => {
            form.reset();
            setImagenPreviews([]);
            setSelectedFiles([]);
        };
        setMensaje('');

        if (!selectedFiles.length) {
            toast.error('Por favor, seleccione al menos una imagen.');
            return;
        }

        setMensaje('Procesando...');

        try {
            const errors = [];
            for (const file of selectedFiles) {
                const formData = new FormData(form);
                formData.set('imagen', file);
                let uploaded = false;
                let lastError = 'Error al subir imagen.';
                for (const endpoint of postEndpoints) {
                    try {
                        const response = await fetch(`${baseURL}/${endpoint}`, {
                            method: 'POST',
                            body: formData
                        });
                        let data = {};
                        try {
                            data = await response.json();
                        } catch (parseError) {
                            data = {};
                        }
                        if (response.ok && !data?.error) {
                            uploaded = true;
                            break;
                        }
                        lastError = data?.error || lastError;
                    } catch (networkError) {
                        lastError = 'Error de conexion. Intentalo de nuevo.';
                    }
                }
                if (!uploaded) {
                    errors.push(lastError);
                }
            }
            setMensaje('');
            resetForm();
            if (errors.length) {
                toast.error(errors[0]);
                return;
            }
            toast.success('Sub-banners agregados.');
            window.location.reload();
        } catch (error) {
            console.error('Error:', error);
            setMensaje('');
            toast.error('Error de conexion. Intentalo de nuevo.');
        }
    };

    return (
        <div className='NewContain'>
            <ToastContainer />
            <button onClick={toggleModal} className='btnSave'>
                <span>+</span> Agregar
            </button>
            {modalOpen && (
                <div className="modal">
                    <div className="modal-content">
                        <div className='deFlexBtnsModal'>
                            <button className='selected'>
                                Agregar Sub-Banner
                            </button>
                            <span className='close' onClick={toggleModal}>
                                &times;
                            </span>
                        </div>
                        <form id="crearSubBannerForm">
                            <div className="flexGrap">
                                <fieldset>
                                    <legend>Imagenes (max 6)</legend>
                                    <label htmlFor="imagen"> </label>
                                    <input
                                        type="file"
                                        id="imagen"
                                        name="imagen"
                                        accept="image/*"
                                        onChange={handleImagenChange}
                                        multiple
                                    />
                                </fieldset>
                            </div>
                            {imagenPreviews.length > 0 && (
                                <div className='previevCategori'>
                                    {imagenPreviews.map((src, index) => (
                                        <div className='previewItem' key={index}>
                                            <img src={src} alt="Vista previa" />
                                            <button
                                                type="button"
                                                className='previewRemove'
                                                onClick={() => removePreview(index)}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {mensaje ? (
                                <button type="button" className='btnLoading' disabled>
                                    {mensaje}
                                </button>
                            ) : (
                                <button type="button" onClick={crear} className='btnPost'>
                                    Agregar
                                </button>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
