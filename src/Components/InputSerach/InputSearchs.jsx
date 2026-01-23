import React, { useState, useEffect } from "react";
import "./InputSearchs.css";
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import Modal from 'react-modal';
import baseURL, { resolveImg } from '../url';

export default function InputSearchs() {
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredResults, setFilteredResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [noResults, setNoResults] = useState(false);
    const [modalIsOpen, setModalIsOpen] = useState(false);

    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);

    useEffect(() => {
        cargarProductos();
        cargarCategorias();
    }, []);

    useEffect(() => {
        const handleOpenSearch = () => {
            setModalIsOpen(true);
        };
        window.addEventListener('openSearch', handleOpenSearch);
        return () => window.removeEventListener('openSearch', handleOpenSearch);
    }, []);

    const cargarProductos = () => {
        fetch(`${baseURL}/productosGet.php`, {
            method: 'GET',
        })
            .then(response => response.json())
            .then(data => {
                setProductos(data.productos || []);
            })
            .catch(error => console.error('Error al cargar productos:', error));
    };

    const cargarCategorias = () => {
        fetch(`${baseURL}/categoriasGet.php`, {
            method: 'GET',
        })
            .then(response => response.json())
            .then(data => {
                setCategorias(data.categorias || []);
            })
            .catch(error => console.error('Error al cargar categorías:', error));
    };

    const handleSearch = (event) => {
        const searchTerm = event.target.value.toLowerCase();
        setSearchTerm(searchTerm);

        const filteredResults = categorias.map((categoria) => {
            const productosFiltrados = productos.filter((producto) => {
                return (
                    producto.idCategoria === categoria.idCategoria &&
                    (producto.titulo.toLowerCase().includes(searchTerm) ||
                        categoria.categoria.toLowerCase().includes(searchTerm))
                );
            });

            return productosFiltrados.length > 0 ? { categoria, productos: productosFiltrados } : null;
        }).filter(result => result !== null);

        setFilteredResults(filteredResults);
        setShowResults(searchTerm !== "");
        setNoResults(searchTerm !== "" && filteredResults.length === 0);
    };

    const openModal = () => {
        setModalIsOpen(true);
    };

    const closeModal = () => {
        setModalIsOpen(false);
    };

    return (
        <div className="fondo-input">
            <div className="search-container">
                <FontAwesomeIcon icon={faSearch} className="search-icon" onClick={openModal} />
                <Modal isOpen={modalIsOpen} onRequestClose={closeModal} className="modalInput" overlayClassName="overlayInput">
                    <fieldset className="inputSearch">
                        <FontAwesomeIcon icon={faSearch} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className="input"
                        />
                    </fieldset>
                    {showResults && (
                        <div className="modalSearch">
                            {filteredResults.map(({ categoria, productos }) => (
                                <div key={categoria.idCategoria} className="sectionSearch">
                                    <h3>{categoria.categoria}</h3>
                                    <hr />
                                    {productos.map((producto) => (
                                        <div key={producto.idProducto}>
                                            <Link to={`/producto/${producto.idProducto}/${producto.titulo.replace(/\s+/g, '-')}`} onClick={closeModal}>
                                                <img src={resolveImg(producto.imagen1)} alt="" />
                                                <p>{producto.titulo}</p>
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            ))}
                            {noResults && <p>No se encontraron resultados.</p>}
                        </div>
                    )}
                </Modal>
            </div>
        </div>
    );
}
