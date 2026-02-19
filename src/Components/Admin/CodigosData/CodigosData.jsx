import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import baseURL from '../../url';
import NewCodigo from '../NewCodigo/NewCodigo';

export default function CodigosData() {
    const [codigos, setCodigos] = useState([]);

    useEffect(() => {
        cargarCodigos();
    }, []);

    const cargarCodigos = () => {
        fetch(`${baseURL}/codigosGet.php`, {
            method: 'GET',
        })
            .then(response => response.json())
            .then(data => {
                setCodigos(data.codigos || []);
            })
            .catch(error => console.error('Error al cargar codigos:', error));
    };

    const eliminarCodigo = (idCodigo) => {
        Swal.fire({
            title: 'Estas seguro?',
            text: 'No podras revertir esto',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Si, eliminar',
            cancelButtonText: 'Cancelar',
        }).then((result) => {
            if (result.isConfirmed) {
                fetch(`${baseURL}/codigosDelete.php?idCodigo=${idCodigo}`, {
                    method: 'DELETE',
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data?.error) {
                            toast.error(data.error);
                            return;
                        }
                        Swal.fire('Eliminado', data.mensaje, 'success');
                        cargarCodigos();
                    })
                    .catch(error => {
                        console.error('Error al eliminar codigo:', error);
                        toast.error('No se pudo eliminar el codigo');
                    });
            }
        });
    };

    return (
        <div>
            <ToastContainer />
            <NewCodigo />

            <div className='table-container'>
                <table className='table'>
                    <thead>
                        <tr>
                            <th>Id Codigo</th>
                            <th>Codigo</th>
                            <th>Descuento (%)</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {codigos.map(item => (
                            <tr key={item.idCodigo}>
                                <td>{item.idCodigo}</td>
                                <td>{item.codigo}</td>
                                <td style={{ color: 'green' }}>{Number(item.descuento || 0).toFixed(2)}%</td>
                                <td>
                                    <button className='eliminar' onClick={() => eliminarCodigo(item.idCodigo)}>
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
