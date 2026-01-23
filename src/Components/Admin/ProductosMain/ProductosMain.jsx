import React, { useEffect, useState } from 'react';
import { Link as Anchor } from "react-router-dom";
import './ProductosMain.css'
import baseURL from '../../url';
import moneda from '../../moneda';
import contador from '../../contador'
export default function ProductosMain() {
    const [pedidos, setPedidos] = useState([]);
    useEffect(() => {
        cargarPedidos();
    }, []);



    const cargarPedidos = () => {
        fetch(`${baseURL}/pedidoGet.php`, {
            method: 'GET',
        })
            .then(response => response.json())
            .then(data => {
                setPedidos(data.pedidos.reverse().slice(0, 5) || []);
                console.log(data.pedidos)
            })
            .catch(error => console.error('Error al cargar pedidos:', error));
    };
    const [counter, setCounter] = useState(contador);
    const [isPaused, setIsPaused] = useState(false);
    useEffect(() => {
        const interval = setInterval(() => {
            if (!isPaused) {
                setCounter((prevCounter) => {
                    if (prevCounter === 1) {
                        recargar();
                        return contador;
                    }
                    return prevCounter - 1;
                });
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isPaused]);
    const togglePause = () => {
        setIsPaused(!isPaused);
    };


    const recargar = () => {
        cargarPedidos();
    };

    return (


        <div className='table-containerPedidos'>
            <div className='deFlexMore'>
                <h3>Ultimos {pedidos?.length} pedidos</h3>
                <Anchor to={`/dashboard/pedidos`} className='logo'>
                    Ver más
                </Anchor>
            </div>
            <table className='table'>
                <thead>
                    <tr>
                        <th>Id Pedido</th>
                        <th>Estado</th>
                        <th>Nombre</th>
                        <th>WhatsApp</th>
                        <th>Total</th>
                        <th>Fecha</th>
                    </tr>
                </thead>
                <tbody>
                    {pedidos.map(item => (
                        <tr key={item.idPedido}>
                            <td>{item.idPedido}</td>

                            <td style={{
                                color: item?.estado === 'Pendiente' ? '#DAA520' :
                                    item?.estado === 'Entregado' ? '#0000FF' :
                                        item?.estado === 'Rechazado' ? '#FF0000' :
                                            item?.estado === 'Pagado' ? '#008000' :
                                                '#000000'
                            }}>
                                {item?.estado}
                            </td>
                            <td>{item.nombre}</td>
                            <td>{item.whatsapp}</td>
                            <td style={{ color: '#008000', }}>{moneda} {item.total}</td>
                            <td>{item.createdAt}</td>

                        </tr>
                    ))}
                </tbody>

            </table>
        </div>

    );
};
