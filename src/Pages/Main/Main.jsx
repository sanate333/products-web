import React, { useEffect, useRef, useState } from 'react'
import './Main.css'
import Header from '../Header/Header'
import HeaderDash from '../../Components/Admin/HeaderDash/HeaderDash'
import ProductosMain from '../../Components/Admin/ProductosMain/ProductosMain'
import UsuariosMain from '../../Components/Admin/UsuariosMain/UsuariosMain'
import CardsCantidad from '../../Components/Admin/CardsCantidad/CardsCantidad'
import InfoUserMain from '../../Components/Admin/InfoUserMain/InfoUserMain'
import baseURL from '../../Components/url'
import { registerFcmToken, onForegroundMessage } from '../../firebase'
export default function Main() {
    const audioRef = useRef(null)
    const [testStatus, setTestStatus] = useState('')
    const [sendingTest, setSendingTest] = useState(false)
    const [installPrompt, setInstallPrompt] = useState(null)
    const [installStatus, setInstallStatus] = useState('')
    const [installing, setInstalling] = useState(false)
    const [permissionStatus, setPermissionStatus] = useState('')
    const [pushState, setPushState] = useState('')
    const ua = navigator.userAgent || ''
    const isAndroid = /Android/i.test(ua)
    const isInAppBrowser = /(Instagram|FBAN|FBAV|FB_IAB|FB4A|FB4B|TikTok|Bytedance|Line|Snapchat|Twitter)/i.test(ua)

    const handlePlaySound = () => {
        if (!audioRef.current) {
            audioRef.current = new Audio('/shopify.mp3')
        }
        audioRef.current.currentTime = 0
        audioRef.current.play().catch(() => {
            setTestStatus('No se pudo reproducir. Toca de nuevo.')
        })
        setTestStatus('Para oir este sonido debes tener la pestaña o esta app abierta.')
    }

    const handleTestNotification = async () => {
        setSendingTest(true)
        setTestStatus('Enviando prueba...')
        try {
            await registerFcmToken(baseURL, 'admin')
            const response = await fetch(`${baseURL}/test-notification.php`, {
                method: 'GET',
                cache: 'no-store',
            })
            const data = await response.json()
            if (data?.ok) {
                const pedido = data?.pedido
                const extra = pedido ? ` Pedido: ${pedido.pedido_id} | WhatsApp: ${pedido.whatsapp} | Total: ${pedido.total}` : ''
                const mailInfo = data?.email_sent ? ' Email enviado.' : ' Email no enviado.'
                setTestStatus(`Notificacion enviada.${mailInfo}${extra}`)
            } else {
                setTestStatus(data?.error || 'No se pudo enviar la prueba.')
            }
        } catch (error) {
            setTestStatus('No se pudo enviar la prueba.')
        } finally {
            setSendingTest(false)
        }
    }

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault()
            setInstallPrompt(e)
        }
        window.addEventListener('beforeinstallprompt', handler)
        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    const handleInstall = async () => {
        if (!isAndroid) {
            setInstallStatus('Disponible solo en Android.')
            return
        }
        if (isInAppBrowser) {
            setInstallStatus('Abre en Chrome para instalar la app.')
            return
        }
        if (!installPrompt) {
            setInstallStatus('Instalacion disponible en Chrome Android.')
            return
        }
        setInstalling(true)
        installPrompt.prompt()
        const choice = await installPrompt.userChoice
        setInstallPrompt(null)
        if (choice?.outcome === 'accepted') {
            setInstallStatus('App instalada.')
        } else {
            setInstallStatus('Instalacion cancelada.')
        }
        setInstalling(false)
    }

    const handleForcePermission = async () => {
        setPermissionStatus('Solicitando permiso...')
        const result = await registerFcmToken(baseURL, 'admin')
        if (result?.ok) {
            setPermissionStatus('Permiso activado.')
            return
        }
        if (result?.reason === 'denied') {
            setPermissionStatus('Permiso bloqueado. Activalo en ajustes del navegador.')
            return
        }
        setPermissionStatus('No se pudo activar.')
    }

    const refreshPushState = async () => {
        if (Notification.permission === 'denied') {
            setPushState('Estado: Bloqueado')
            return
        }
        if (Notification.permission === 'granted' && localStorage.getItem('fcmToken')) {
            setPushState('Estado: Suscrito')
            return
        }
        setPushState('Estado: Pendiente')
    }

    useEffect(() => {
        refreshPushState().catch(() => {})
        const interval = setInterval(() => {
            refreshPushState().catch(() => {})
        }, 4000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        onForegroundMessage((payload) => {
            if (!payload) {
                return;
            }
            if (!audioRef.current) {
                audioRef.current = new Audio('/shopify.mp3')
            }
            audioRef.current.currentTime = 0
            audioRef.current.play().catch(() => {})
        })
    }, [])

    return (
        <div className='containerGrid'>
            <Header />

            <section className='containerSection'>
                <HeaderDash />
                <div className='installDashCard'>
                    <div>
                        <h3>Instalar app Sanate</h3>
                        <p>Instala el panel para recibir pedidos en tu celular.</p>
                    </div>
                    <button
                        type="button"
                        className='installDashBtn'
                        onClick={handleInstall}
                        disabled={installing}
                    >
                        <span className='androidIcon' aria-hidden="true">
                            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                                <path d="M7 9.5a1 1 0 1 1-2 0a1 1 0 0 1 2 0Zm12 0a1 1 0 1 1-2 0a1 1 0 0 1 2 0ZM6 11h12v7a2 2 0 0 1-2 2h-1.5v2a1 1 0 1 1-2 0v-2h-2v2a1 1 0 1 1-2 0v-2H8a2 2 0 0 1-2-2v-7Zm0-2a6 6 0 0 1 12 0H6Zm3.6-6.5a.7.7 0 1 1-1.2-.7l1-1.7a.7.7 0 1 1 1.2.7l-1 1.7Zm5.8-2.4a.7.7 0 0 1 1.2.7l-1 1.7a.7.7 0 0 1-1.2-.7l1-1.7Z" />
                            </svg>
                        </span>
                        {installing ? 'Instalando...' : 'Instalar app (Android)'}
                    </button>
                    {installStatus && <span className='installDashStatus'>{installStatus}</span>}
                </div>
                <div className='notifTestCard'>
                    <div>
                        <h3>Pruebas de notificaciones</h3>
                        <p>Verifica sonido y push antes de recibir pedidos.</p>
                    </div>
                    <div className='notifTestActions'>
                        <button type="button" className='notifTestBtn' onClick={handlePlaySound}>
                            Probar sonido
                        </button>
                        <button type="button" className='notifTestBtn secondary' onClick={handleTestNotification} disabled={sendingTest}>
                            {sendingTest ? 'Enviando...' : 'Enviar notificacion de prueba'}
                        </button>
                        <button type="button" className='notifTestBtn secondary' onClick={handleForcePermission}>
                            Activar notificaciones
                        </button>
                    </div>
                    {testStatus && <span className='notifTestStatus'>{testStatus}</span>}
                    {permissionStatus && <span className='notifTestStatus'>{permissionStatus}</span>}
                    {pushState && <span className='notifTestStatus'>{pushState}</span>}
                </div>
                <div className='containerMain'>
                    <div className='deFLexMain'>
                        <CardsCantidad />
                        <UsuariosMain />
                    </div>
                    <div className='deFLexMain'>
                        <ProductosMain />
                        <InfoUserMain />
                    </div>


                </div>
            </section>
        </div>
    )
}
