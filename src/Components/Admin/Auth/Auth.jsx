import React, { useState } from 'react';
import { Link as Anchor, useLocation } from 'react-router-dom'; // Importa useLocation
import Login from '../Login/Login';
import './Auth.css';
import logo from '../../../images/logo.png';

export default function Auth() {

    const location = useLocation();

    return (
        <div className='AuthContainer'>
            <Anchor to={`/`} >
                <img src={logo} alt="Efecto Vial" className='logoAtuh' />
            </Anchor>
            <div className='deFlexActiveLink'>
                <Anchor to={`/dashboard`} className={` ${location.pathname === '/dashboard' ? 'activeLink' : ''}`}>
                    Dashboard
                </Anchor>
                <Anchor to={`/meseros`} className={` ${location.pathname === '/meseros' ? 'activeLink' : ''}`}>
                    Meseros
                </Anchor>
            </div>
            <Login />

        </div>
    );
}
