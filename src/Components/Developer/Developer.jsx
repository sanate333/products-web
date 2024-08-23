import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import './Developer.css';
import { Link as Anchor } from 'react-router-dom';

export default function Developer() {
    const [modalIsOpen, setModalIsOpen] = useState(false);

    useEffect(() => {
        const isModalClosed = sessionStorage.getItem('modalClosed');
        if (!isModalClosed) {
            setModalIsOpen(true);
        }
    }, []);

    const handleCloseModal = () => {
        sessionStorage.setItem('modalClosed', 'true');
        setModalIsOpen(false);
    };

    const handleOpenModal = () => {
        setModalIsOpen(true);
    };

    const handleWhatsappMessage = () => {
        const phoneNumber = 543875683101;
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <div className='Developer'>
            <p onClick={handleOpenModal}>
                © 2024 En catálogo - Juan Rivera
            </p>

            <Modal
                isOpen={modalIsOpen}
                onRequestClose={handleCloseModal}
                className="modal-dev"
                overlayClassName="overlay-dev"
                ariaHideApp={false}
            >
                <div className='modal-dev-contain'>
                    <img src="https://i.postimg.cc/zf0V90pC/1682983895887.jpg" alt="Juan Rivera" className='banner-dev-modal' />
                    <div className='text-dev-modal'>
                        <img src="https://www.juan-rivera-developer.net/static/media/JUAN%20RIVERA.8d5ed53bbc2749a83200.png" alt="Juan Rivera" />
                        <h2><Anchor to='https://www.juan-rivera-developer.net/' target="_blank">Juan Rivera</Anchor></h2>
                        <div className='socialsDev'>
                            <Anchor to='https://www.linkedin.com/in/juan-rivera-9ba866215/' target="_blank"><i className='fa fa-linkedin' id="linkedin"></i></Anchor>
                            <Anchor to='https://github.com/RIVERA-PRO' target="_blank"><i className='fa fa-github' id="github"></i></Anchor>
                            <Anchor onClick={handleWhatsappMessage}><i className='fa fa-whatsapp' id="whatsapp"></i></Anchor>
                        </div>
                        <button onClick={handleCloseModal}>OK</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
