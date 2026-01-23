import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faEdit, faArrowUp, faArrowDown, faSync } from '@fortawesome/free-solid-svg-icons';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import './ContactoData.css'
import 'jspdf-autotable';
import baseURL from '../../url';
import NewContact from '../NewContact/NewContact';
export default function ContactoData() {
    const [contactos, setContactos] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [nuevoNombre, setNuevoNombre] = useState('');
    const [nuevoTelefono, setNuevoTelefono] = useState('');
    const [nuevoInstagram, setNuevoInstagram] = useState('');
    const [nuevofacebook, setNuevofacebook] = useState('');
    const [quickNombre, setQuickNombre] = useState('');
    const [quickTelefono, setQuickTelefono] = useState('');
    const [quickInstagram, setQuickInstagram] = useState('');
    const [quickFacebook, setQuickFacebook] = useState('');
    const [quickEmail, setQuickEmail] = useState('');
    const [quickDireccion, setQuickDireccion] = useState('');
    const [principalId, setPrincipalId] = useState(null);
    const [quickStatus, setQuickStatus] = useState('');
    const [contacto, setContacto] = useState({});
    const [selectedSection, setSelectedSection] = useState('texto');

    useEffect(() => {
        cargarContacto();

    }, []);


    const cargarContacto = () => {
        fetch(`${baseURL}/contactoGet.php`, {
            method: 'GET',
        })
            .then(response => response.json())
            .then(data => {
                const list = data.contacto || [];
                setContactos(list);
                const principal = list.length ? list[0] : null;
                setPrincipalId(principal ? principal.idContacto : null);
                setQuickNombre(principal ? principal.nombre || '' : '');
                setQuickTelefono(principal ? principal.telefono || '' : '');
                setQuickInstagram(principal ? principal.instagram || '' : '');
                setQuickFacebook(principal ? principal.facebook || '' : '');
                setQuickEmail(principal ? principal.email || '' : '');
                setQuickDireccion(principal ? principal.direccion || '' : '');
                setQuickStatus('');
            })
            .catch(error => console.error('Error al cargar contactos:', error));
    };

    const eliminarContacto = (idContacto) => {
        // Reemplaza el window.confirm con SweetAlert2
        Swal.fire({
            title: '¿Estás seguro?',
            text: '¡No podrás revertir esto!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        }).then((result) => {
            if (result.isConfirmed) {
                fetch(`${baseURL}/contactoDelete.php?idContacto=${idContacto}`, {
                    method: 'DELETE',
                })
                    .then(response => response.json())
                    .then(data => {
                        Swal.fire(
                            '¡Eliminado!',
                            data.mensaje,
                            'success'
                        );
                        cargarContacto();
                    })
                    .catch(error => {
                        console.error('Error al eliminar contacto:', error);
                        toast.error(error);
                    });
            }
        });
    };

    const abrirModal = (item) => {
        setContacto(item);
        setNuevoNombre(item.nombre);
        setNuevoTelefono(item.telefono);
        setNuevoInstagram(item.instagram);
        setNuevofacebook(item.facebook);
        setModalVisible(true);
    };

    const cerrarModal = () => {
        setModalVisible(false);
    };



    const handleUpdateText = (idContacto) => {
        const payload = {
            nombre: nuevoNombre !== '' ? nuevoNombre : contacto.nombre,
            telefono: nuevoTelefono !== '' ? nuevoTelefono : contacto.telefono,
            instagram: nuevoInstagram !== '' ? nuevoInstagram : contacto.instagram,
            email: contacto.email,
            direccion: contacto.direccion,
            facebook: nuevofacebook !== '' ? nuevofacebook : contacto.facebook,
        };

        fetch(`${baseURL}/contactoPut.php?idContacto=${idContacto}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    Swal.fire(
                        'Error!',
                        data.error,
                        'error'
                    );
                } else {
                    Swal.fire(
                        'Editado!',
                        data.mensaje,
                        'success'
                    );
                    cargarContacto();
                    cerrarModal();
                }
            })
            .catch(error => {
                console.log(error.message);
                toast.error(error.message);
            });
    };



    const handleSectionChange = (section) => {
        setSelectedSection(section);
    };
    const formatWhatsAppLink = (telefono) => {
        if (!telefono) return '';
        const digits = `${telefono}`.replace(/\D/g, '');
        return `https://wa.me/${digits}`;
    };
    const formatSocialLink = (value, baseUrl) => {
        if (!value) return '';
        const trimmed = `${value}`.trim();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            return trimmed;
        }
        return `${baseUrl}/${trimmed.replace('@', '')}`;
    };

    const handleQuickSave = async () => {
        if (!quickNombre.trim() && !quickTelefono.trim()) {
            toast.error('Ingresa al menos Nombre o WhatsApp.');
            return;
        }
        setQuickStatus('Guardando...');
        try {
            if (principalId) {
                const payload = {
                    nombre: quickNombre,
                    telefono: quickTelefono,
                    instagram: quickInstagram,
                    email: quickEmail,
                    direccion: quickDireccion,
                    facebook: quickFacebook,
                };
                const res = await fetch(`${baseURL}/contactoPut.php?idContacto=${principalId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                if (data.error) {
                    toast.error(data.error);
                    setQuickStatus('');
                    return;
                }
            } else {
                const formData = new FormData();
                formData.append('nombre', quickNombre);
                formData.append('telefono', quickTelefono);
                formData.append('instagram', quickInstagram);
                formData.append('email', quickEmail);
                formData.append('direccion', quickDireccion);
                formData.append('facebook', quickFacebook);
                const res = await fetch(`${baseURL}/contactoPost.php`, {
                    method: 'POST',
                    body: formData,
                });
                const data = await res.json();
                if (data.error) {
                    toast.error(data.error);
                    setQuickStatus('');
                    return;
                }
            }
            toast.success('Contacto guardado.');
            setQuickStatus('Guardado');
            cargarContacto();
        } catch (error) {
            console.error(error);
            toast.error('Error guardando el contacto.');
            setQuickStatus('');
        }
    };
    return (
        <div>

            <ToastContainer />

            <div className="contactoQuickCard">
                <div className="contactoQuickHeader">
                    <div>
                        <h3>Redes principales</h3>
                        <span>Se muestran en la pestaña de contacto.</span>
                    </div>
                    <span className={`contactoQuickTag ${principalId ? 'ok' : 'pending'}`}>
                        {principalId ? 'Guardado' : 'Pendiente'}
                    </span>
                </div>
                <div className="contactoQuickGrid">
                    <label>
                        Nombre
                        <input
                            type="text"
                            value={quickNombre}
                            placeholder="Sánate"
                            onChange={(e) => setQuickNombre(e.target.value)}
                        />
                    </label>
                    <label>
                        WhatsApp
                        <input
                            type="tel"
                            value={quickTelefono}
                            placeholder="Ej: 3221234567"
                            onChange={(e) => setQuickTelefono(e.target.value)}
                        />
                    </label>
                    <label>
                        Instagram
                        <input
                            type="text"
                            value={quickInstagram}
                            placeholder="@sanate.col"
                            onChange={(e) => setQuickInstagram(e.target.value)}
                        />
                    </label>
                    <label>
                        Facebook
                        <input
                            type="text"
                            value={quickFacebook}
                            placeholder="SanateColombia"
                            onChange={(e) => setQuickFacebook(e.target.value)}
                        />
                    </label>
                    <label>
                        Email (opcional)
                        <input
                            type="email"
                            value={quickEmail}
                            placeholder="ventas@sanate.store"
                            onChange={(e) => setQuickEmail(e.target.value)}
                        />
                    </label>
                    <label>
                        Dirección (opcional)
                        <input
                            type="text"
                            value={quickDireccion}
                            placeholder="Ciudad, Colombia"
                            onChange={(e) => setQuickDireccion(e.target.value)}
                        />
                    </label>
                </div>
            <div className="contactoQuickPreview">
                <div>
                    <strong>Vista previa:</strong>
                    {(() => {
                        const whatsLink = formatWhatsAppLink(quickTelefono);
                        const instaLink = formatSocialLink(quickInstagram, 'https://instagram.com');
                        const fbLink = formatSocialLink(quickFacebook, 'https://facebook.com');
                        return (
                    <div className="contactoQuickLinks">
                        {whatsLink ? (
                            <a href={whatsLink} target="_blank" rel="noopener noreferrer">
                                WhatsApp
                            </a>
                        ) : (
                            <span className="contactoQuickEmpty">WhatsApp</span>
                        )}
                        {instaLink ? (
                            <a href={instaLink} target="_blank" rel="noopener noreferrer">
                                Instagram
                            </a>
                        ) : (
                            <span className="contactoQuickEmpty">Instagram</span>
                        )}
                        {fbLink ? (
                            <a href={fbLink} target="_blank" rel="noopener noreferrer">
                                Facebook
                            </a>
                        ) : (
                            <span className="contactoQuickEmpty">Facebook</span>
                        )}
                    </div>
                        );
                    })()}
                </div>
                    <button className="btnPost" type="button" onClick={handleQuickSave}>
                        {quickStatus ? quickStatus : 'Guardar'}
                    </button>
                </div>
            </div>

            <NewContact />





            {modalVisible && (
                <div className="modal">
                    <div className="modal-content">
                        <div className='deFlexBtnsModal'>

                            <div className='deFlexBtnsModal'>
                                <button
                                    className={selectedSection === 'texto' ? 'selected' : ''}
                                    onClick={() => handleSectionChange('texto')}
                                >
                                    Editar Texto
                                </button>

                            </div>
                            <span className="close" onClick={cerrarModal}>
                                &times;
                            </span>
                        </div>
                        <div className='sectiontext' style={{ display: selectedSection === 'texto' ? 'flex' : 'none' }}>
                            <div className='flexGrap'>
                                <fieldset>
                                    <legend>Nombre</legend>
                                    <input
                                        type="text"
                                        value={nuevoNombre !== '' ? nuevoNombre : contacto.nombre}
                                        onChange={(e) => setNuevoNombre(e.target.value)}
                                    />
                                </fieldset>
                                <fieldset>
                                    <legend>WhatsApp</legend>
                                    <input
                                        type="number"
                                        value={nuevoTelefono !== '' ? nuevoTelefono : contacto.telefono}
                                        onChange={(e) => setNuevoTelefono(e.target.value)}
                                    />
                                </fieldset>
                                <fieldset>
                                    <legend>Instagram</legend>
                                    <input
                                        type="url"
                                        value={nuevoInstagram !== '' ? nuevoInstagram : contacto.instagram}
                                        onChange={(e) => setNuevoInstagram(e.target.value)}
                                    />
                                </fieldset>
                                <fieldset >
                                    <legend>Facebook</legend>
                                    <input
                                        type="text"
                                        value={nuevofacebook !== '' ? nuevofacebook : contacto.facebook}
                                        onChange={(e) => setNuevofacebook(e.target.value)}
                                    />
                                </fieldset>
                            </div>




                            <button className='btnPost' onClick={() => handleUpdateText(contacto.idContacto)} >Guardar </button>

                        </div>




                    </div>
                </div>
            )}
            <div className='table-container'>
                <table className='table'>
                    <thead>
                        <tr>
                            <th>Id Contacto</th>
                            <th>Nombre</th>
                            <th>WhatsApp</th>
                            <th>Instagram</th>
                            <th>Facebook</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {contactos.map(item => (
                            <tr key={item.idContacto}>
                                <td>{item.idContacto}</td>
                                <td>{item.nombre}</td>
                                <td>
                                    {item.telefono ? (
                                        <a
                                            className='editar'
                                            href={formatWhatsAppLink(item.telefono)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <i className='fa fa-whatsapp'></i>
                                        </a>
                                    ) : (
                                        '-'
                                    )}
                                </td>
                                <td>
                                    {item.instagram ? (
                                        <a
                                            className='editar'
                                            href={formatSocialLink(item.instagram, 'https://instagram.com')}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <i className='fa fa-instagram'></i>
                                        </a>
                                    ) : (
                                        '-'
                                    )}
                                </td>
                                <td>
                                    {item.facebook ? (
                                        <a
                                            className='editar'
                                            href={formatSocialLink(item.facebook, 'https://facebook.com')}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <i className='fa fa-facebook'></i>
                                        </a>
                                    ) : (
                                        '-'
                                    )}
                                </td>
                                <td>

                                    <button className='eliminar' onClick={() => eliminarContacto(item.idContacto)}>
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                    <button className='editar' onClick={() => abrirModal(item)}>
                                        <FontAwesomeIcon icon={faEdit} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>

                </table>
            </div>
        </div>
    );
};
