import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faChartLine,
    faUsers,
    faBullhorn,
    faTowerBroadcast,
    faInbox,
    faRobot,
    faCodeBranch,
    faGear,
    faWindowMaximize,
    faTag,
    faPen,
    faTrash,
    faPlus,
    faEllipsisVertical,
    faPaperclip,
    faImage,
    faVideo,
    faMicrophone,
    faPaperPlane,
    faFaceSmile,
    faList,
    faBolt,
    faCircleQuestion,
    faShuffle,
    faClock,
    faPlug,
    faBars,
    faXmark,
    faMagnifyingGlass,
} from '@fortawesome/free-solid-svg-icons';
import Header from '../Header/Header';
import HeaderDash from '../../Components/Admin/HeaderDash/HeaderDash';
import './WhatsappIA.css';

const SUBMENU = [
    { label: 'Panel de control', path: 'panel', icon: faChartLine },
    { label: 'Contactos', path: 'contactos', icon: faUsers },
    { label: 'Campanas', path: 'campanas', icon: faBullhorn },
    { label: 'Transmision', path: 'transmision', icon: faTowerBroadcast },
    { label: 'Chat', path: 'chat', icon: faInbox },
    { label: 'Plantillas', path: 'plantillas', icon: faWindowMaximize },
    { label: 'Automatizacion', path: 'automatizacion', icon: faRobot },
    { label: 'Facebook', path: 'facebook', icon: faPlug, social: 'facebook' },
    { label: 'Instagram', path: 'instagram', icon: faPlug, social: 'instagram' },
    { label: 'Flujos de conversacion', path: 'flows', icon: faCodeBranch },
    { label: 'Configuraciones', path: 'configuraciones', icon: faGear },
];

const CHAT_CONTACTS = [
    { id: 'c1', name: 'Sebast', phone: '+573227461878', joinedAt: '20/02/2026 19:06', preview: 'Hola, quiero saber el precio', time: '20:48' },
    { id: 'c2', name: 'Laura M', phone: '+573105229111', joinedAt: '18/02/2026 12:18', preview: 'Me compartes medios de pago?', time: '19:31' },
    { id: 'c3', name: 'Carlos A', phone: '+573214010999', joinedAt: '17/02/2026 08:44', preview: 'Quiero comprar dos unidades', time: '18:22' },
];

const FLOW_OPTIONS = ['Flujo bienvenida', 'Flujo carrito', 'Flujo recuperacion', 'Flujo seguimiento'];
const CAMPAIGN_OPTIONS = ['Campana Febrero', 'Remarketing 20/02', 'Cliente VIP'];
const SEQUENCE_OPTIONS = ['Secuencia onboarding', 'Secuencia recompra', 'Secuencia inactivos'];

const CONFIG_ITEMS = [
    'Conexion',
    'Campos',
    'Etiquetas',
    'Respuestas rapidas',
    'Miembros del equipo',
    'Horario de oficina',
    'Flujos predeterminados',
    'Compania',
    'Registros',
    'Facturacion',
];

const OPEN_AI_STORAGE_KEY = 'whatsapp_openai_config';
const SCHEDULE_STORAGE_KEY = 'whatsapp_schedules';

const parseStoredJson = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return parsed ?? fallback;
    } catch {
        return fallback;
    }
};

export default function WhatsappIA() {
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const activeSubPath = useMemo(() => {
        const pathname = String(location.pathname || '');
        if (pathname.includes('/inbox')) return 'chat';
        if (pathname.includes('/flujos')) return 'flows';
        const match = pathname.match(/\/whatsapp-(?:bot|ia)\/([^/?#]+)/);
        return match?.[1] || 'panel';
    }, [location.pathname]);
    const activeMenu = useMemo(() => {
        return SUBMENU.find((item) => item.path === activeSubPath) || SUBMENU[0];
    }, [activeSubPath]);

    const handleNavClick = () => {
        if (window.innerWidth <= 900) {
            setMenuOpen(false);
        }
    };

    useEffect(() => {
        if (!menuOpen) return undefined;
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                setMenuOpen(false);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [menuOpen]);

    useEffect(() => {
        setMenuOpen(false);
    }, [location.pathname]);

    return (
        <div className="containerGrid">
            <Header />
            <section className="containerSection">
                <HeaderDash />
                <div className="container botShell">
                    <button
                        type="button"
                        className={`botDrawerOverlay ${menuOpen ? 'open' : ''}`}
                        onClick={() => setMenuOpen(false)}
                        aria-label="Cerrar menu"
                    />

                    <aside className={`botSidebar ${menuOpen ? 'open' : ''}`}>
                        <div className="botSidebarHead">
                            <div>
                                <h3>WhatsApp Bot</h3>
                                <p>Panel de gestion y automatizacion</p>
                            </div>
                            <button type="button" className="botMenuCloseBtn" onClick={() => setMenuOpen(false)} aria-label="Cerrar menu lateral">
                                <FontAwesomeIcon icon={faXmark} />
                            </button>
                        </div>
                        <nav>
                            {SUBMENU.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={handleNavClick}
                                    className={() => (item.path === activeSubPath ? 'botNav active' : 'botNav')}
                                >
                                    {item.social ? (
                                        <span className={`botSocialLogo ${item.social}`} aria-hidden="true">
                                            {item.social === 'facebook' ? 'f' : '◎'}
                                        </span>
                                    ) : (
                                        <FontAwesomeIcon icon={item.icon} />
                                    )}
                                    <span>{item.label}</span>
                                </NavLink>
                            ))}
                        </nav>
                    </aside>

                    <div className="botMain">
                        <header className="botModuleHeader">
                            <div className="botHeaderLeft">
                                <button
                                    type="button"
                                    className="botMenuToggleBtn"
                                    aria-label="Abrir menu de WhatsApp Bot"
                                    onClick={() => setMenuOpen((prev) => !prev)}
                                >
                                    <FontAwesomeIcon icon={faBars} />
                                </button>
                                <div>
                                    <h1>{activeMenu?.label || 'WhatsApp Bot'}</h1>
                                    <p>Interfaz organizada estilo TokeChat para operacion diaria.</p>
                                </div>
                            </div>
                        </header>

                        <main className="botContent">
                            <Outlet />
                        </main>
                    </div>
                </div>
            </section>
        </div>
    );
}

export function WhatsappRedirect({ to = 'panel' }) {
    return <Navigate to={to} replace />;
}

export function WhatsappPanel() {
    return (
        <section className="botCard">
            <header className="botFlowsHead">
                <div>
                    <h2>FLUJO BIENVENIDA</h2>
                    <p>Esqueleto visual inspirado en TokeChat</p>
                </div>
                <div className="botActions">
                    <button type="button" className="soft">
                        Modo edicion
                    </button>
                    <button type="button" className="primary">
                        Compartir flujo
                    </button>
                </div>
            </header>

            <div className="botPanelGrid">
                <div className="flowCanvas">
                    <div className="flowNode success">Bloque inicial</div>
                    <span>&rarr;</span>
                    <div className="flowNode">Mensaje bienvenida</div>
                    <span>&rarr;</span>
                    <div className="flowNode">Menu opciones</div>
                    <span>&rarr;</span>
                    <div className="flowNode">Respuesta final</div>
                </div>

                <aside className="flowPreview">
                    <h4>Visualizacion</h4>
                    <div className="chatPreview">
                        <div className="bubble recv">Hola, bienvenido a Oasis IA.</div>
                        <div className="bubble sent">Quiero ver opciones</div>
                        <div className="bubble recv">Perfecto, aqui tienes el menu principal.</div>
                        <div className="bubble recv">Selecciona una opcion para continuar.</div>
                    </div>
                </aside>
            </div>
        </section>
    );
}

export function WhatsappSimple({ title, subtitle }) {
    return (
        <section className="botCard">
            <header>
                <h2>{title}</h2>
                <p>{subtitle}</p>
            </header>
            <div className="botMetrics">
                <article>
                    <h4>Actividad</h4>
                    <strong>128</strong>
                    <p>Eventos del modulo en vista mock.</p>
                </article>
                <article>
                    <h4>Estado</h4>
                    <strong>Operativo</strong>
                    <p>Interfaz lista para conectar backend.</p>
                </article>
                <article>
                    <h4>Ultima actualizacion</h4>
                    <strong>Hoy</strong>
                    <p>Sincronizacion visual completada.</p>
                </article>
            </div>
        </section>
    );
}

function WhatsappSocialAutomation({ channel }) {
    const navigate = useNavigate();
    const channelLabel = channel === 'facebook' ? 'Facebook' : 'Instagram';
    return (
        <section className="botCard">
            <header className="botFlowsHead">
                <div>
                    <h2>Automatizacion {channelLabel}</h2>
                    <p>Canal listo para futuras automatizaciones con el mismo chat y flujo central.</p>
                </div>
                <div className="botActions">
                    <button type="button" className="soft" onClick={() => navigate('../chat')}>
                        Ir al chat
                    </button>
                    <button type="button" className="primary" onClick={() => navigate('../flows')}>
                        Abrir flujos
                    </button>
                </div>
            </header>

            <div className="botMetrics">
                <article>
                    <h4>Canal</h4>
                    <strong>{channelLabel}</strong>
                    <p>Configurado como módulo conectado al chat profesional.</p>
                </article>
                <article>
                    <h4>Estado</h4>
                    <strong>Preparado</strong>
                    <p>Listo para activar reglas y disparadores compartidos.</p>
                </article>
                <article>
                    <h4>Siguiente paso</h4>
                    <strong>Integrar API</strong>
                    <p>Conecta el proveedor y reutiliza el mismo motor de flujos.</p>
                </article>
            </div>
        </section>
    );
}

export function WhatsappFacebook() {
    return <WhatsappSocialAutomation channel="facebook" />;
}

export function WhatsappInstagram() {
    return <WhatsappSocialAutomation channel="instagram" />;
}

export function WhatsappChat() {
    const [contacts] = useState(CHAT_CONTACTS);
    const [activeId, setActiveId] = useState(CHAT_CONTACTS[0]?.id || '');
    const [composer, setComposer] = useState('');
    const [flowToSend, setFlowToSend] = useState(FLOW_OPTIONS[0]);
    const [messages, setMessages] = useState([
        { id: 1, from: 'recv', text: 'Hola, bienvenido. Te ayudo con tu compra.' },
        { id: 2, from: 'sent', text: 'Quiero saber cual producto me recomiendas.' },
        { id: 3, from: 'recv', text: 'Perfecto. Te envio opciones por catalogo y medios de pago.' },
    ]);
    const [contactTags, setContactTags] = useState(['Nuevo lead', 'Pendiente pago']);

    const activeContact = contacts.find((item) => item.id === activeId) || contacts[0];
    const hasChats = contacts.length > 0;

    const sendMessage = () => {
        const text = String(composer || '').trim();
        if (!text) return;
        setMessages((prev) => [...prev, { id: Date.now(), from: 'sent', text }]);
        setComposer('');
    };

    const sendFlow = () => {
        setMessages((prev) => [...prev, { id: Date.now(), from: 'sent', text: `[Flujo enviado] ${flowToSend}` }]);
    };

    const addTag = () => {
        const raw = prompt('Nueva etiqueta para este contacto:');
        const name = String(raw || '').trim();
        if (!name) return;
        if (contactTags.includes(name)) return;
        setContactTags((prev) => [...prev, name]);
    };

    const removeTag = (tag) => {
        setContactTags((prev) => prev.filter((item) => item !== tag));
    };

    return (
        <section className="botCard chatShellCard">
            <div className="waChatShell">
                <aside className="waChatList">
                    <div className="waListHead">
                        <h3>Chat</h3>
                        <input type="text" placeholder="Buscar" />
                    </div>
                    <div className="waListItems">
                        {!hasChats ? (
                            <article className="waEmptyStateMini">
                                <h4>Sin conversaciones</h4>
                                <p>Cuando entren mensajes se mostraran aqui.</p>
                            </article>
                        ) : contacts.map((contact) => (
                            <button
                                key={contact.id}
                                type="button"
                                className={`waContactItem ${contact.id === activeId ? 'active' : ''}`}
                                onClick={() => setActiveId(contact.id)}
                            >
                                <div className="waAvatar">{String(contact.name || '?').charAt(0).toUpperCase()}</div>
                                <div className="waContactMeta">
                                    <strong>{contact.name}</strong>
                                    <small>{contact.preview}</small>
                                </div>
                                <span>{contact.time}</span>
                            </button>
                        ))}
                    </div>
                </aside>

                <div className="waChatCenter">
                    {!hasChats ? (
                        <article className="waEmptyStateFull">
                            <h3>No hay chats activos</h3>
                            <p>Cuando entren mensajes en WhatsApp se mostraran aqui.</p>
                        </article>
                    ) : (
                        <>
                            <header className="waChatHeader">
                                <strong>{activeContact?.name || 'Contacto'}</strong>
                                <small>{activeContact?.phone || ''}</small>
                            </header>

                            <div className="waMessageList">
                                {messages.map((message) => (
                                    <article key={message.id} className={`waMsg ${message.from === 'sent' ? 'sent' : 'recv'}`}>
                                        {message.text}
                                    </article>
                                ))}
                            </div>

                            <footer className="waComposer">
                                <div className="waComposerTools">
                                    <button type="button" title="Emoji"><FontAwesomeIcon icon={faFaceSmile} /></button>
                                    <button type="button" title="Adjunto"><FontAwesomeIcon icon={faPaperclip} /></button>
                                    <button type="button" title="Imagen"><FontAwesomeIcon icon={faImage} /></button>
                                    <button type="button" title="Video"><FontAwesomeIcon icon={faVideo} /></button>
                                    <button type="button" title="Audio"><FontAwesomeIcon icon={faMicrophone} /></button>
                                </div>
                                <input
                                    value={composer}
                                    onChange={(event) => setComposer(event.target.value)}
                                    placeholder="Escribir un mensaje"
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            sendMessage();
                                        }
                                    }}
                                />
                                <button type="button" className="waSendBtn" onClick={sendMessage}>
                                    <FontAwesomeIcon icon={faPaperPlane} />
                                </button>
                            </footer>

                            <div className="waFlowQuick">
                                <select value={flowToSend} onChange={(event) => setFlowToSend(event.target.value)}>
                                    {FLOW_OPTIONS.map((flow) => <option key={flow} value={flow}>{flow}</option>)}
                                </select>
                                <button type="button" onClick={sendFlow}>Enviar flujo</button>
                            </div>
                        </>
                    )}
                </div>

                <aside className="waChatRight">
                    <h4>Informacion del contacto</h4>
                    {!hasChats ? (
                        <article className="waEmptyStateMini">
                            <h4>Sin datos</h4>
                            <p>No hay conversaciones para mostrar metadatos.</p>
                        </article>
                    ) : (
                        <>
                            <div className="waInfoBlock">
                                <span>Telefono</span>
                                <strong>{activeContact?.phone}</strong>
                            </div>
                            <div className="waInfoBlock">
                                <span>Fecha de inscripcion</span>
                                <strong>{activeContact?.joinedAt}</strong>
                            </div>
                            <div className="waInfoBlock">
                                <span>Etiquetas</span>
                                <div className="waTagList">
                                    {contactTags.map((tag) => (
                                        <button key={tag} type="button" className="waTagChip" onClick={() => removeTag(tag)}>
                                            {tag}
                                        </button>
                                    ))}
                                    <button type="button" className="waTagAdd" onClick={addTag}>+ Etiqueta</button>
                                </div>
                            </div>
                            <div className="waInfoBlock">
                                <span>Secuencias</span>
                                <ul>
                                    {SEQUENCE_OPTIONS.map((item) => <li key={item}>{item}</li>)}
                                </ul>
                            </div>
                            <div className="waInfoBlock">
                                <span>Campanas</span>
                                <ul>
                                    {CAMPAIGN_OPTIONS.map((item) => <li key={item}>{item}</li>)}
                                </ul>
                            </div>
                        </>
                    )}
                </aside>
            </div>
        </section>
    );
}

const KEYWORD_DEFAULTS = [
    { id: 1, keyword: 'curcuma', containsType: 'Comienza con', flow: 'Flujo bienvenida', enabled: true, executions: 0 },
    { id: 2, keyword: 'envio', containsType: 'Contiene', flow: 'Flujo carrito', enabled: true, executions: 12 },
];

const SEQUENCE_DEFAULTS = [
    { id: 1, name: 'Secuencia onboarding', trigger: 'Nuevo contacto', delayMinutes: 5, step: 'Mensaje bienvenida', enabled: true },
    { id: 2, name: 'Secuencia recompra', trigger: 'Compra completada', delayMinutes: 1440, step: 'Recordatorio recompra', enabled: true },
];

const FLOW_LIBRARY_DEFAULTS = [
    { id: 1, name: 'Flujo de mensaje de bienvenida', connections: 4, executions: 123, ctr: 58, updatedAt: '22/02/2026' },
    { id: 2, name: 'Flujo post-atencion', connections: 3, executions: 84, ctr: 47, updatedAt: '21/02/2026' },
    { id: 3, name: 'Flujo carrito', connections: 5, executions: 230, ctr: 63, updatedAt: '20/02/2026' },
];

const FLOW_TEMPLATES = [
    {
        id: 'tpl-welcome',
        name: 'Bienvenida inmediata',
        category: 'Onboarding',
        description: 'Responde en segundos, clasifica interes y deriva al mejor flujo.',
    },
    {
        id: 'tpl-recovery',
        name: 'Recuperacion de carrito',
        category: 'Ventas',
        description: 'Recontacta al cliente, aplica incentivo y cierra compra por WhatsApp.',
    },
    {
        id: 'tpl-followup',
        name: 'Seguimiento postventa',
        category: 'Retencion',
        description: 'Solicita feedback y ofrece recompra con mensaje corto y claro.',
    },
];

const AUTOMATION_KEYWORDS_STORAGE_KEY = 'whatsapp_automation_keywords';
const AUTOMATION_SEQUENCES_STORAGE_KEY = 'whatsapp_automation_sequences';
const FLOW_LIBRARY_STORAGE_KEY = 'whatsapp_flow_library';

const createLocalId = () => Date.now() + Math.round(Math.random() * 1000);
const readFlowLibrary = () => parseStoredJson(FLOW_LIBRARY_STORAGE_KEY, FLOW_LIBRARY_DEFAULTS);
const saveFlowLibrary = (next) => localStorage.setItem(FLOW_LIBRARY_STORAGE_KEY, JSON.stringify(next));

const FLOW_TOOLS = [
    { key: 'contenido', label: 'Contenido', icon: faTag, color: '#ef4444' },
    { key: 'menu', label: 'Menu', icon: faList, color: '#2563eb' },
    { key: 'accion', label: 'Accion', icon: faBolt, color: '#f59e0b' },
    { key: 'condicion', label: 'Condicion', icon: faCircleQuestion, color: '#6366f1' },
    { key: 'nuevo-flujo', label: 'Iniciar nuevo flujo', icon: faCodeBranch, color: '#16a34a' },
    { key: 'randomizador', label: 'Randomizador', icon: faShuffle, color: '#0ea5e9' },
    { key: 'retraso', label: 'Retraso inteligente', icon: faClock, color: '#fb7185' },
    { key: 'integracion', label: 'Integracion', icon: faPlug, color: '#a855f7' },
    { key: 'gpt', label: 'Asistente GPT', icon: faRobot, color: '#0891b2' },
];

const createFlowBlock = (toolKey, x = 120, y = 120) => {
    const tool = FLOW_TOOLS.find((item) => item.key === toolKey) || FLOW_TOOLS[0];
    return {
        id: Date.now() + Math.round(Math.random() * 1000),
        type: tool.key,
        title: tool.label,
        text: tool.key === 'contenido' ? 'Introduce texto aqui' : '',
        contentType: tool.key === 'contenido' ? 'texto' : 'texto',
        mediaUrl: '',
        mediaCaption: '',
        messageDelaySeconds: 0,
        saveKey: '',
        contactField: '',
        delaySeconds: 3,
        conditionMode: 'contiene',
        conditionValue: '',
        flowName: 'Nuevo flujo',
        menuOptions: ['Opcion 1', 'Opcion 2'],
        x,
        y,
        color: tool.color,
    };
};

const CONTENT_ACTIONS = [
    { key: 'texto', label: 'Texto' },
    { key: 'imagen', label: 'Imagen' },
    { key: 'video', label: 'Video' },
    { key: 'archivo', label: 'Archivo' },
    { key: 'audio', label: 'Audio' },
    { key: 'guardar', label: 'Guardar' },
    { key: 'retraso', label: 'Retraso' },
    { key: 'contacto', label: 'Contacto' },
];

export function WhatsappAutomation() {
    const [tab, setTab] = useState('keywords');
    const [search, setSearch] = useState('');
    const [keywords, setKeywords] = useState(() => parseStoredJson(AUTOMATION_KEYWORDS_STORAGE_KEY, KEYWORD_DEFAULTS));
    const [sequences, setSequences] = useState(() => parseStoredJson(AUTOMATION_SEQUENCES_STORAGE_KEY, SEQUENCE_DEFAULTS));
    const [menuOpen, setMenuOpen] = useState({ type: '', id: null });

    const toggleKeyword = (id) => {
        setKeywords((prev) => prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)));
    };

    const updateField = (id, key, value) => {
        setKeywords((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
    };

    const deleteKeyword = (id) => {
        setKeywords((prev) => prev.filter((item) => item.id !== id));
        setMenuOpen({ type: '', id: null });
    };

    const duplicateKeyword = (id) => {
        setKeywords((prev) => {
            const base = prev.find((item) => item.id === id);
            if (!base) return prev;
            return [{ ...base, id: createLocalId(), executions: 0 }, ...prev];
        });
        setMenuOpen({ type: '', id: null });
    };

    const updateSequenceField = (id, key, value) => {
        setSequences((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
    };

    const toggleSequence = (id) => {
        setSequences((prev) => prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)));
    };

    const deleteSequence = (id) => {
        setSequences((prev) => prev.filter((item) => item.id !== id));
        setMenuOpen({ type: '', id: null });
    };

    const duplicateSequence = (id) => {
        setSequences((prev) => {
            const base = prev.find((item) => item.id === id);
            if (!base) return prev;
            return [{ ...base, id: createLocalId(), name: `${base.name} copia` }, ...prev];
        });
        setMenuOpen({ type: '', id: null });
    };

    const createKeyword = () => {
        setKeywords((prev) => ([
            {
                id: createLocalId(),
                keyword: '',
                containsType: 'Es',
                flow: FLOW_OPTIONS[0],
                enabled: true,
                executions: 0,
            },
            ...prev,
        ]));
    };

    const createSequence = () => {
        setSequences((prev) => ([
            {
                id: createLocalId(),
                name: 'Nueva secuencia',
                trigger: 'Nuevo contacto',
                delayMinutes: 10,
                step: 'Mensaje inicial',
                enabled: true,
            },
            ...prev,
        ]));
    };

    React.useEffect(() => {
        localStorage.setItem(AUTOMATION_KEYWORDS_STORAGE_KEY, JSON.stringify(keywords));
    }, [keywords]);

    React.useEffect(() => {
        localStorage.setItem(AUTOMATION_SEQUENCES_STORAGE_KEY, JSON.stringify(sequences));
    }, [sequences]);

    const keywordFiltered = keywords.filter((item) => {
        const q = String(search || '').toLowerCase().trim();
        if (!q) return true;
        return (
            String(item.keyword || '').toLowerCase().includes(q)
            || String(item.flow || '').toLowerCase().includes(q)
        );
    });

    const sequenceFiltered = sequences.filter((item) => {
        const q = String(search || '').toLowerCase().trim();
        if (!q) return true;
        return (
            String(item.name || '').toLowerCase().includes(q)
            || String(item.trigger || '').toLowerCase().includes(q)
            || String(item.step || '').toLowerCase().includes(q)
        );
    });

    const totalRows = tab === 'keywords' ? keywordFiltered.length : sequenceFiltered.length;

    return (
        <section className="botCard waAutomationCard">
            <header className="botFlowsHead waAutomationHead">
                <div className="waAutomationTitle">
                    <h2>Automatizacion</h2>
                    <p>Gestiona palabras clave y secuencias con una vista profesional.</p>
                </div>
                <div className="waAutomationTabs">
                    <button type="button" className={tab === 'keywords' ? 'active' : ''} onClick={() => setTab('keywords')}>
                        Palabras clave
                    </button>
                    <button type="button" className={tab === 'sequences' ? 'active' : ''} onClick={() => setTab('sequences')}>
                        Secuencias
                    </button>
                </div>
            </header>

            <div className="waAutomationToolbar">
                <div className="waAutomationMeta">
                    {tab === 'keywords' ? `Todas las palabras clave ${totalRows}` : `Todas las secuencias ${totalRows}`}
                </div>
                <div className="waAutomationSearch">
                    <input
                        type="text"
                        placeholder="Buscar"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>
                <div className="botActions">
                    <button
                        type="button"
                        className="primary"
                        onClick={tab === 'keywords' ? createKeyword : createSequence}
                    >
                        {tab === 'keywords' ? 'Crear palabra clave' : 'Crear secuencia'}
                    </button>
                </div>
            </div>

            {tab === 'keywords' ? (
                <div className="waKeywordsTableWrap">
                    <table className="waKeywordsTable waSequencesTable">
                        <thead>
                            <tr>
                                <th>Iniciar flujo</th>
                                <th>Mensaje</th>
                                <th>Ejecuciones</th>
                                <th>Activo</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {keywordFiltered.map((item) => (
                                <tr key={item.id}>
                                    <td>
                                        <select value={item.flow} onChange={(event) => updateField(item.id, 'flow', event.target.value)}>
                                            {FLOW_OPTIONS.map((flow) => <option key={flow} value={flow}>{flow}</option>)}
                                        </select>
                                    </td>
                                    <td>
                                        <div className="waKeywordEditor">
                                            <select value={item.containsType} onChange={(event) => updateField(item.id, 'containsType', event.target.value)}>
                                                <option>Es</option>
                                                <option>Contiene</option>
                                                <option>Comienza con</option>
                                            </select>
                                            <input
                                                type="text"
                                                value={item.keyword}
                                                onChange={(event) => updateField(item.id, 'keyword', event.target.value)}
                                                placeholder="Palabra clave"
                                            />
                                        </div>
                                    </td>
                                    <td>{item.executions}</td>
                                    <td>
                                        <button type="button" className={`waToggleBtn ${item.enabled ? 'on' : 'off'}`} onClick={() => toggleKeyword(item.id)}>
                                            {item.enabled ? 'Activo' : 'Inactivo'}
                                        </button>
                                    </td>
                                    <td className="waRowMenuCell">
                                        <button
                                            type="button"
                                            className="waDotsBtn"
                                            onClick={() => setMenuOpen((prev) => (prev.type === 'keyword' && prev.id === item.id ? { type: '', id: null } : { type: 'keyword', id: item.id }))}
                                        >
                                            <FontAwesomeIcon icon={faEllipsisVertical} />
                                        </button>
                                        {menuOpen.type === 'keyword' && menuOpen.id === item.id && (
                                            <div className="waRowMenu">
                                                <button type="button" onClick={() => duplicateKeyword(item.id)}>Duplicar palabra clave</button>
                                                <button type="button" onClick={() => deleteKeyword(item.id)}>Eliminar palabra clave</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {keywordFiltered.length === 0 && (
                                <tr>
                                    <td colSpan={5}>No hay coincidencias en palabras clave.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="waKeywordsTableWrap">
                    <table className="waKeywordsTable">
                        <thead>
                            <tr>
                                <th>Secuencia</th>
                                <th>Disparador</th>
                                <th>Espera</th>
                                <th>Paso principal</th>
                                <th>Estado</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {sequenceFiltered.map((item) => (
                                <tr key={item.id}>
                                    <td>
                                        <input
                                            type="text"
                                            value={item.name}
                                            onChange={(event) => updateSequenceField(item.id, 'name', event.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <select value={item.trigger} onChange={(event) => updateSequenceField(item.id, 'trigger', event.target.value)}>
                                            <option>Nuevo contacto</option>
                                            <option>Compra completada</option>
                                            <option>Etiqueta aplicada</option>
                                            <option>Sin respuesta 24h</option>
                                        </select>
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            min={0}
                                            value={item.delayMinutes}
                                            onChange={(event) => updateSequenceField(item.id, 'delayMinutes', Number(event.target.value || 0))}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            value={item.step}
                                            onChange={(event) => updateSequenceField(item.id, 'step', event.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <button type="button" className={`waToggleBtn ${item.enabled ? 'on' : 'off'}`} onClick={() => toggleSequence(item.id)}>
                                            {item.enabled ? 'Activo' : 'Inactivo'}
                                        </button>
                                    </td>
                                    <td className="waRowMenuCell">
                                        <button
                                            type="button"
                                            className="waDotsBtn"
                                            onClick={() => setMenuOpen((prev) => (prev.type === 'sequence' && prev.id === item.id ? { type: '', id: null } : { type: 'sequence', id: item.id }))}
                                        >
                                            <FontAwesomeIcon icon={faEllipsisVertical} />
                                        </button>
                                        {menuOpen.type === 'sequence' && menuOpen.id === item.id && (
                                            <div className="waRowMenu">
                                                <button type="button" onClick={() => duplicateSequence(item.id)}>Duplicar secuencia</button>
                                                <button type="button" onClick={() => deleteSequence(item.id)}>Eliminar secuencia</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {sequenceFiltered.length === 0 && (
                                <tr>
                                    <td colSpan={6}>No hay coincidencias en secuencias.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

export function WhatsappFlows() {
    const navigate = useNavigate();
    const location = useLocation();
    const { flowId } = useParams();
    const canvasRef = useRef(null);
    const dragRef = useRef(null);
    const [blocks, setBlocks] = useState([
        { ...createFlowBlock('contenido', 80, 70), title: 'Inicio', text: 'Hola, te doy la bienvenida.' },
        { ...createFlowBlock('menu', 380, 120), menuOptions: ['Catalogo', 'Soporte', 'Promociones'] },
        { ...createFlowBlock('accion', 700, 220), text: 'Asignar etiqueta: lead-caliente' },
    ]);
    const [connections, setConnections] = useState([]);
    const [selectedBlockId, setSelectedBlockId] = useState(null);
    const [connectingFrom, setConnectingFrom] = useState(null);
    const [flowLibrary, setFlowLibrary] = useState(() => parseStoredJson(FLOW_LIBRARY_STORAGE_KEY, FLOW_LIBRARY_DEFAULTS));
    const [flowSearch, setFlowSearch] = useState('');

    const flowBasePath = useMemo(
        () => String(location.pathname || '').replace(/\/(flujos|flows)(?:\/[^/]+)?$/, '/flows'),
        [location.pathname]
    );
    const activeFlowId = flowId || null;
    const normalizedConnections = connections;
    const selectedFlow = flowLibrary.find((item) => String(item.id) === String(activeFlowId || '')) || null;

    const selectedBlock = blocks.find((block) => block.id === selectedBlockId) || null;

    const addBlock = (toolKey) => {
        const offset = blocks.length * 16;
        const block = createFlowBlock(toolKey, 110 + offset, 80 + offset);
        setBlocks((prev) => [...prev, block]);
        setSelectedBlockId(block.id);
    };

    const deleteSelected = () => {
        if (!selectedBlockId) return;
        setBlocks((prev) => prev.filter((block) => block.id !== selectedBlockId));
        setConnections((prev) => prev.filter((conn) => conn.from !== selectedBlockId && conn.to !== selectedBlockId));
        setSelectedBlockId(null);
        setConnectingFrom((prev) => (prev === selectedBlockId ? null : prev));
    };

    const updateSelectedField = (field, value) => {
        if (!selectedBlockId) return;
        setBlocks((prev) => prev.map((block) => (
            block.id === selectedBlockId ? { ...block, [field]: value } : block
        )));
    };

    const updateMenuOption = (index, value) => {
        if (!selectedBlockId) return;
        setBlocks((prev) => prev.map((block) => {
            if (block.id !== selectedBlockId) return block;
            const nextOptions = [...(block.menuOptions || [])];
            nextOptions[index] = value;
            return { ...block, menuOptions: nextOptions };
        }));
    };

    const addMenuOption = () => {
        if (!selectedBlockId) return;
        setBlocks((prev) => prev.map((block) => (
            block.id === selectedBlockId
                ? { ...block, menuOptions: [...(block.menuOptions || []), `Opcion ${(block.menuOptions || []).length + 1}`] }
                : block
        )));
    };

    const removeMenuOption = (index) => {
        if (!selectedBlockId) return;
        setBlocks((prev) => prev.map((block) => {
            if (block.id !== selectedBlockId) return block;
            const nextOptions = (block.menuOptions || []).filter((_, idx) => idx !== index);
            return { ...block, menuOptions: nextOptions.length ? nextOptions : ['Opcion 1'] };
        }));
    };

    const startDrag = (event, blockId) => {
        if (!canvasRef.current) return;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const block = blocks.find((item) => item.id === blockId);
        if (!block) return;
        dragRef.current = {
            id: blockId,
            offsetX: event.clientX - canvasRect.left - block.x,
            offsetY: event.clientY - canvasRect.top - block.y,
        };
        setSelectedBlockId(blockId);
        event.preventDefault();
    };

    const onCanvasMouseMove = (event) => {
        if (!dragRef.current || !canvasRef.current) return;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const nextX = event.clientX - canvasRect.left - dragRef.current.offsetX;
        const nextY = event.clientY - canvasRect.top - dragRef.current.offsetY;
        setBlocks((prev) => prev.map((block) => (
            block.id === dragRef.current.id
                ? {
                    ...block,
                    x: Math.max(8, Math.min(nextX, canvasRect.width - 230)),
                    y: Math.max(8, Math.min(nextY, canvasRect.height - 170)),
                }
                : block
        )));
    };

    const stopDrag = () => {
        dragRef.current = null;
    };

    const startConnect = (blockId) => {
        setConnectingFrom(blockId);
        setSelectedBlockId(blockId);
    };

    const connectTo = (targetId) => {
        if (!connectingFrom || connectingFrom === targetId) return;
        const exists = normalizedConnections.some((conn) => conn.from === connectingFrom && conn.to === targetId);
        if (exists) {
            setConnectingFrom(null);
            return;
        }
        setConnections((prev) => [
            ...normalizedConnections,
            { id: Date.now(), from: connectingFrom, to: targetId, label: '' },
        ]);
        setConnectingFrom(null);
    };

    const clearConnections = () => {
        setConnections([]);
        setConnectingFrom(null);
    };

    React.useEffect(() => {
        localStorage.setItem(FLOW_LIBRARY_STORAGE_KEY, JSON.stringify(flowLibrary));
    }, [flowLibrary]);

    const openFlow = (id) => {
        navigate(`${flowBasePath}/${id}`);
    };
    const goToFlowList = () => {
        navigate(flowBasePath);
    };

    const createFlow = () => {
        const nextFlow = {
            id: createLocalId(),
            name: `Nuevo flujo ${flowLibrary.length + 1}`,
            connections: 0,
            executions: 0,
            ctr: 0,
            updatedAt: new Date().toLocaleDateString('es-CO'),
        };
        setFlowLibrary((prev) => [nextFlow, ...prev]);
        openFlow(nextFlow.id);
    };

    const renameFlow = (id) => {
        const base = flowLibrary.find((item) => item.id === id);
        if (!base) return;
        const raw = prompt('Nuevo nombre del flujo:', base.name);
        const name = String(raw || '').trim();
        if (!name) return;
        setFlowLibrary((prev) => prev.map((item) => (item.id === id ? { ...item, name, updatedAt: new Date().toLocaleDateString('es-CO') } : item)));
    };

    const duplicateFlow = (id) => {
        const base = flowLibrary.find((item) => item.id === id);
        if (!base) return;
        const clone = {
            ...base,
            id: createLocalId(),
            name: `${base.name} copia`,
            updatedAt: new Date().toLocaleDateString('es-CO'),
        };
        setFlowLibrary((prev) => [clone, ...prev]);
    };

    const deleteFlow = (id) => {
        setFlowLibrary((prev) => {
            const next = prev.filter((item) => item.id !== id);
            if (String(activeFlowId || '') === String(id)) {
                goToFlowList();
            }
            return next;
        });
    };

    const filteredFlowLibrary = flowLibrary.filter((item) => {
        const q = String(flowSearch || '').toLowerCase().trim();
        if (!q) return true;
        return String(item.name || '').toLowerCase().includes(q);
    });

    const getBlockById = (id) => blocks.find((block) => block.id === id);

    if (!activeFlowId) {
        return (
            <section className="botCard flowListCard">
                <header className="botFlowsHead">
                    <div>
                        <h2>Flujos de conversacion</h2>
                        <p>Lista de flujos activos. Abre uno para entrar al editor completo.</p>
                    </div>
                    <div className="botActions">
                        <button type="button" className="primary" onClick={createFlow}>
                            Crear flujo
                        </button>
                    </div>
                </header>

                <div className="flowLibraryPanel">
                    <div className="flowLibraryHead">
                        <strong>{filteredFlowLibrary.length} flujo(s)</strong>
                        <input
                            type="text"
                            placeholder="Buscar flujo"
                            value={flowSearch}
                            onChange={(event) => setFlowSearch(event.target.value)}
                        />
                    </div>
                    {filteredFlowLibrary.length === 0 ? (
                        <article className="flowEmptyState">
                            <h3>No hay flujos para mostrar</h3>
                            <p>Crea tu primer flujo para comenzar.</p>
                            <button type="button" className="primary" onClick={createFlow}>Crear flujo</button>
                        </article>
                    ) : (
                        <div className="flowLibraryCards">
                            {filteredFlowLibrary.map((flow) => (
                                <article key={flow.id} className="flowLibraryCard">
                                    <button type="button" className="flowLibraryCardOpen" onClick={() => openFlow(flow.id)}>
                                        <h3>{flow.name}</h3>
                                        <p>Actualizado: {flow.updatedAt}</p>
                                    </button>
                                    <div className="flowLibraryMeta">
                                        <span>Conexiones: {flow.connections}</span>
                                        <span>Ejecuciones: {flow.executions}</span>
                                        <span>CTR: {flow.ctr}%</span>
                                    </div>
                                    <div className="flowLibraryActions">
                                        <button type="button" onClick={() => openFlow(flow.id)}>Abrir</button>
                                        <button type="button" onClick={() => duplicateFlow(flow.id)}>Duplicar</button>
                                        <button type="button" className="danger" onClick={() => deleteFlow(flow.id)}>Eliminar</button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        );
    }

    if (!selectedFlow) {
        return (
            <section className="botCard flowEmptyState">
                <h3>Flujo no encontrado</h3>
                <p>El flujo seleccionado no existe o fue eliminado.</p>
                <button type="button" className="primary" onClick={goToFlowList}>Volver a flujos</button>
            </section>
        );
    }

    return (
        <section className="flowEditorScreen">
            <header className="flowEditorScreenHeader">
                <div className="flowEditorBreadcrumb">
                    <button type="button" onClick={goToFlowList}>Volver a flujos</button>
                    <span>/</span>
                    <strong>{selectedFlow.name}</strong>
                </div>
                <div className="flowEditorStatus">Guardado automatico</div>
            </header>

            <div className="flowBuilderGrid flowBuilderEditorGrid">
                <aside className="flowEditorPanel flowEditorPanelLeft">
                    <div className="flowEditorHead">
                        <h4>{selectedFlow.name}</h4>
                        <div className="flowEditorHeadActions">
                            <button type="button" onClick={deleteSelected} disabled={!selectedBlock}>Borrar</button>
                        </div>
                    </div>

                    {selectedBlock ? (
                        <div className="flowEditorBody">
                            <label>
                                Titulo del bloque
                                <input
                                    type="text"
                                    value={selectedBlock.title}
                                    onChange={(event) => updateSelectedField('title', event.target.value)}
                                />
                            </label>

                            <label>
                                Introducir texto
                                <textarea
                                    value={selectedBlock.text}
                                    onChange={(event) => updateSelectedField('text', event.target.value)}
                                    rows={4}
                                />
                            </label>

                            {selectedBlock.type === 'contenido' && (
                                <div className="flowContentPanel">
                                    <strong>Contenido</strong>
                                    <div className="flowContentActions">
                                        {CONTENT_ACTIONS.map((action) => (
                                            <button
                                                key={action.key}
                                                type="button"
                                                className={selectedBlock.contentType === action.key ? 'active' : ''}
                                                onClick={() => updateSelectedField('contentType', action.key)}
                                            >
                                                {action.label}
                                            </button>
                                        ))}
                                    </div>

                                    {(selectedBlock.contentType === 'imagen'
                                        || selectedBlock.contentType === 'video'
                                        || selectedBlock.contentType === 'archivo'
                                        || selectedBlock.contentType === 'audio') && (
                                            <>
                                                <label>
                                                    URL del archivo
                                                    <input
                                                        type="text"
                                                        value={selectedBlock.mediaUrl || ''}
                                                        onChange={(event) => updateSelectedField('mediaUrl', event.target.value)}
                                                        placeholder="https://..."
                                                    />
                                                </label>
                                                <label>
                                                    Texto de apoyo
                                                    <input
                                                        type="text"
                                                        value={selectedBlock.mediaCaption || ''}
                                                        onChange={(event) => updateSelectedField('mediaCaption', event.target.value)}
                                                        placeholder="Mensaje adicional"
                                                    />
                                                </label>
                                            </>
                                        )}

                                    {selectedBlock.contentType === 'guardar' && (
                                        <label>
                                            Campo a guardar
                                            <input
                                                type="text"
                                                value={selectedBlock.saveKey || ''}
                                                onChange={(event) => updateSelectedField('saveKey', event.target.value)}
                                                placeholder="ej: email_cliente"
                                            />
                                        </label>
                                    )}

                                    {selectedBlock.contentType === 'contacto' && (
                                        <label>
                                            Campo de contacto
                                            <input
                                                type="text"
                                                value={selectedBlock.contactField || ''}
                                                onChange={(event) => updateSelectedField('contactField', event.target.value)}
                                                placeholder="ej: telefono_whatsapp"
                                            />
                                        </label>
                                    )}

                                    {(selectedBlock.contentType === 'retraso' || selectedBlock.messageDelaySeconds > 0) && (
                                        <label>
                                            Retraso del mensaje (segundos)
                                            <input
                                                type="number"
                                                min={0}
                                                value={selectedBlock.messageDelaySeconds || 0}
                                                onChange={(event) => updateSelectedField('messageDelaySeconds', Number(event.target.value || 0))}
                                            />
                                        </label>
                                    )}
                                </div>
                            )}

                            {selectedBlock.type === 'menu' && (
                                <div className="flowMenuOptions">
                                    <strong>Opciones de menu</strong>
                                    {(selectedBlock.menuOptions || []).map((option, index) => (
                                        <div key={`${selectedBlock.id}-${index}`} className="flowMenuOptionRow">
                                            <input
                                                type="text"
                                                value={option}
                                                onChange={(event) => updateMenuOption(index, event.target.value)}
                                            />
                                            <button type="button" onClick={() => removeMenuOption(index)}>x</button>
                                        </div>
                                    ))}
                                    <button type="button" className="flowMiniBtn" onClick={addMenuOption}>Agregar opcion</button>
                                </div>
                            )}

                            {selectedBlock.type === 'condicion' && (
                                <div className="flowInlineGrid">
                                    <label>
                                        Tipo condicion
                                        <select
                                            value={selectedBlock.conditionMode}
                                            onChange={(event) => updateSelectedField('conditionMode', event.target.value)}
                                        >
                                            <option value="contiene">Contiene</option>
                                            <option value="es">Es</option>
                                            <option value="comienza-con">Comienza con</option>
                                        </select>
                                    </label>
                                    <label>
                                        Valor
                                        <input
                                            type="text"
                                            value={selectedBlock.conditionValue}
                                            onChange={(event) => updateSelectedField('conditionValue', event.target.value)}
                                        />
                                    </label>
                                </div>
                            )}

                            {selectedBlock.type === 'retraso' && (
                                <label>
                                    Retraso (segundos)
                                    <input
                                        type="number"
                                        min={0}
                                        value={selectedBlock.delaySeconds}
                                        onChange={(event) => updateSelectedField('delaySeconds', Number(event.target.value || 0))}
                                    />
                                </label>
                            )}

                            {selectedBlock.type === 'nuevo-flujo' && (
                                <label>
                                    Iniciar flujo
                                    <select
                                        value={selectedBlock.flowName}
                                        onChange={(event) => updateSelectedField('flowName', event.target.value)}
                                    >
                                        {FLOW_OPTIONS.map((flow) => <option key={flow} value={flow}>{flow}</option>)}
                                    </select>
                                </label>
                            )}

                            <div className="flowEditorFoot">
                                <button
                                    type="button"
                                    className={connectingFrom === selectedBlock.id ? 'activeConnect' : ''}
                                    onClick={() => startConnect(selectedBlock.id)}
                                >
                                    {connectingFrom === selectedBlock.id ? 'Selecciona destino' : 'Conectar'}
                                </button>
                                <button type="button" className="saveBtn">Guardar</button>
                            </div>
                        </div>
                    ) : (
                        <div className="flowEditorEmpty">
                            Selecciona un recuadro en el panel para editar su contenido.
                        </div>
                    )}
                </aside>

                <div
                    className="flowBuilderCanvas"
                    ref={canvasRef}
                    onMouseMove={onCanvasMouseMove}
                    onMouseUp={stopDrag}
                    onMouseLeave={stopDrag}
                >
                    <svg className="flowConnectionsSvg">
                        {normalizedConnections.map((connection) => {
                            const from = getBlockById(connection.from);
                            const to = getBlockById(connection.to);
                            if (!from || !to) return null;
                            const x1 = from.x + 210;
                            const y1 = from.y + 50;
                            const x2 = to.x;
                            const y2 = to.y + 50;
                            const curve = Math.max(40, Math.abs(x2 - x1) * 0.45);
                            const d = `M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}`;
                            return <path key={connection.id} d={d} fill="none" stroke="#2563eb" strokeWidth="2.2" />;
                        })}
                    </svg>

                    {blocks.map((block) => (
                        <article
                            key={block.id}
                            className={`flowCanvasBlock ${block.id === selectedBlockId ? 'selected' : ''} ${connectingFrom === block.id ? 'connecting' : ''}`}
                            style={{ left: `${block.x}px`, top: `${block.y}px`, '--flow-color': block.color }}
                            onMouseDown={(event) => startDrag(event, block.id)}
                            onClick={() => {
                                setSelectedBlockId(block.id);
                                if (connectingFrom && connectingFrom !== block.id) {
                                    connectTo(block.id);
                                }
                            }}
                        >
                            <header>
                                <span>{block.title}</span>
                                <small>{block.type}</small>
                            </header>
                            <p>{block.text || 'Sin contenido'}</p>
                            {block.type === 'menu' && (
                                <ul>
                                    {(block.menuOptions || []).slice(0, 3).map((option) => <li key={`${block.id}-${option}`}>{option}</li>)}
                                </ul>
                            )}
                            {block.type === 'contenido' && <em>Tipo: {block.contentType || 'texto'}</em>}
                            {block.type === 'contenido' && Number(block.messageDelaySeconds || 0) > 0 && (
                                <em>Retraso mensaje: {block.messageDelaySeconds}s</em>
                            )}
                            {block.type === 'retraso' && <em>Retraso: {block.delaySeconds}s</em>}
                            {block.type === 'condicion' && <em>{block.conditionMode}: {block.conditionValue || '(vacio)'}</em>}
                            {block.type === 'nuevo-flujo' && <em>Iniciar: {block.flowName}</em>}
                        </article>
                    ))}
                </div>

                <aside className="flowToolbox flowToolboxRight">
                    {FLOW_TOOLS.map((tool) => (
                        <button
                            key={tool.key}
                            type="button"
                            onClick={() => addBlock(tool.key)}
                            style={{ '--tool-color': tool.color }}
                        >
                            <FontAwesomeIcon icon={tool.icon} />
                            {tool.label}
                        </button>
                    ))}
                    <button type="button" onClick={() => addBlock('contenido')} style={{ '--tool-color': '#ef4444' }}>
                        <FontAwesomeIcon icon={faTag} />
                        Contenido
                    </button>
                    <button type="button" onClick={clearConnections} style={{ '--tool-color': '#0ea5e9' }}>
                        <FontAwesomeIcon icon={faShuffle} />
                        Limpiar conexiones
                    </button>
                </aside>
            </div>
        </section>
    );
}

export function WhatsappTemplates() {
    const navigate = useNavigate();
    const location = useLocation();
    const [search, setSearch] = useState('');

    const flowBasePath = useMemo(
        () => String(location.pathname || '').replace(/\/plantillas$/, '/flows'),
        [location.pathname]
    );

    const visibleTemplates = useMemo(() => {
        const q = String(search || '').toLowerCase().trim();
        if (!q) return FLOW_TEMPLATES;
        return FLOW_TEMPLATES.filter((item) => {
            const haystack = `${item.name} ${item.category} ${item.description}`.toLowerCase();
            return haystack.includes(q);
        });
    }, [search]);

    const applyTemplate = (template) => {
        const current = readFlowLibrary();
        const nextFlow = {
            id: createLocalId(),
            name: `${template.name} (${new Date().toLocaleDateString('es-CO')})`,
            connections: 0,
            executions: 0,
            ctr: 0,
            updatedAt: new Date().toLocaleDateString('es-CO'),
        };
        saveFlowLibrary([nextFlow, ...current]);
        navigate(`${flowBasePath}/${nextFlow.id}`);
    };

    return (
        <section className="botCard waTemplatesCard">
            <header className="botFlowsHead waTemplatesHead">
                <div>
                    <h2>Plantillas</h2>
                    <p>Inicia mas rapido con plantillas listas para ventas y seguimiento.</p>
                </div>
                <label className="waTemplatesSearch">
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                    <input
                        type="text"
                        placeholder="Buscar plantilla"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </label>
            </header>

            {visibleTemplates.length === 0 ? (
                <article className="waTemplatesEmpty">
                    <h3>No hay plantillas para ese filtro</h3>
                    <p>Prueba con otro termino o crea un flujo desde cero.</p>
                    <button type="button" className="primary" onClick={() => navigate(flowBasePath)}>Ir a flujos</button>
                </article>
            ) : (
                <div className="waTemplatesGrid">
                    {visibleTemplates.map((template) => (
                        <article key={template.id} className="waTemplateCard">
                            <div className="waTemplateBadge">{template.category}</div>
                            <h3>{template.name}</h3>
                            <p>{template.description}</p>
                            <button type="button" className="primary" onClick={() => applyTemplate(template)}>
                                Usar plantilla
                            </button>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}

export function WhatsappConfig() {
    const [showQrModal, setShowQrModal] = useState(false);
    const [connectionState, setConnectionState] = useState('connecting');
    const [notice, setNotice] = useState('');

    useEffect(() => {
        let active = true;
        const endpoint = process.env.REACT_APP_WHATSAPP_STATUS_ENDPOINT;
        if (!endpoint) {
            setConnectionState('disconnected');
            setNotice('Estado local: endpoint de estado no configurado.');
            return () => { active = false; };
        }
        fetch(endpoint, { credentials: 'include' })
            .then((res) => res.json())
            .then((data) => {
                if (!active) return;
                const normalized = String(data?.status || '').toLowerCase();
                if (['connected', 'disconnected', 'connecting'].includes(normalized)) {
                    setConnectionState(normalized);
                } else {
                    setConnectionState('disconnected');
                }
                setNotice(data?.message || '');
            })
            .catch(() => {
                if (!active) return;
                setConnectionState('disconnected');
                setNotice('Sin conexion al proveedor en este entorno.');
            });
        return () => { active = false; };
    }, []);

    const reconnect = () => {
        setConnectionState('connecting');
        setNotice('Reconectando instancia WhatsApp...');
        window.setTimeout(() => {
            setConnectionState('connected');
            setNotice('Conexion restablecida.');
        }, 900);
    };

    const connectionLabel = connectionState === 'connected'
        ? 'Conectado'
        : connectionState === 'connecting'
            ? 'Conectando'
            : 'Desconectado';

    return (
        <>
            <section className="botCard">
                <h2>Configuraciones</h2>
                <div className="botConfigGrid">
                    <aside className="configNav">
                        {CONFIG_ITEMS.map((item) => (
                            <button key={item} type="button" className={item === 'Conexion' ? 'active' : ''}>
                                {item}
                            </button>
                        ))}
                    </aside>

                    <div className="configContent">
                        <article className="connectionCard">
                            <div>
                                <h4>Estado de conexion</h4>
                                <p>
                                    Estado: <span className={`waConnectionState ${connectionState}`}>{connectionLabel}</span>
                                </p>
                                {notice ? <small className="waConnectionNotice">{notice}</small> : null}
                            </div>
                            <div className="connectionActions">
                                <button type="button" className="connectQrBtn" onClick={() => setShowQrModal(true)}>
                                    Conectar con QR
                                </button>
                                <button type="button" onClick={reconnect}>Reconectar</button>
                            </div>
                        </article>
                    </div>
                </div>
            </section>

            {showQrModal && (
                <div className="botModalOverlay" onClick={() => setShowQrModal(false)}>
                    <div className="botQrModal" onClick={(event) => event.stopPropagation()}>
                        <div className="botQrModalHead">
                            <h4>Conectar con QR</h4>
                            <button type="button" onClick={() => setShowQrModal(false)}>x</button>
                        </div>
                        <div className="qrBox">QR</div>
                        <p>Escanea con WhatsApp</p>
                    </div>
                </div>
            )}
        </>
    );
}

export function WhatsappOpenAI() {
    const [form, setForm] = useState(() => (
        parseStoredJson(OPEN_AI_STORAGE_KEY, {
            provider: 'OpenAI',
            apiKey: '',
            model: 'gpt-4o-mini',
            temperature: '0.7',
            maxTokens: '300',
            systemPrompt: 'Responde de forma clara, corta y en tono colombiano natural.',
        })
    ));
    const [showKey, setShowKey] = useState(false);
    const [status, setStatus] = useState('');

    const isConnected = String(form.apiKey || '').trim().length > 20;

    const updateField = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const saveConfig = () => {
        localStorage.setItem(OPEN_AI_STORAGE_KEY, JSON.stringify(form));
        setStatus('Configuracion guardada correctamente.');
    };

    const testConnection = () => {
        if (!isConnected) {
            setStatus('Ingresa una API key valida para probar la conexion.');
            return;
        }
        setStatus(`Conexion lista con ${form.provider} (${form.model}).`);
    };

    return (
        <section className="botCard">
            <header className="botFlowsHead">
                <div>
                    <h2>Open AI</h2>
                    <p>Conecta la API key y define la configuracion base del asistente.</p>
                </div>
                <div className="botActions">
                    <button type="button" className="soft" onClick={testConnection}>Probar conexion</button>
                    <button type="button" className="primary" onClick={saveConfig}>Guardar</button>
                </div>
            </header>

            <div className="waOpenAiGrid">
                <label>
                    Proveedor
                    <select value={form.provider} onChange={(event) => updateField('provider', event.target.value)}>
                        <option value="OpenAI">OpenAI</option>
                        <option value="Azure OpenAI">Azure OpenAI</option>
                    </select>
                </label>
                <label>
                    Modelo
                    <input
                        type="text"
                        value={form.model}
                        onChange={(event) => updateField('model', event.target.value)}
                        placeholder="gpt-4o-mini"
                    />
                </label>
                <label className="waOpenAiKeyField">
                    API key
                    <div>
                        <input
                            type={showKey ? 'text' : 'password'}
                            value={form.apiKey}
                            onChange={(event) => updateField('apiKey', event.target.value)}
                            placeholder="sk-..."
                        />
                        <button type="button" onClick={() => setShowKey((prev) => !prev)}>
                            {showKey ? 'Ocultar' : 'Ver'}
                        </button>
                    </div>
                </label>
                <label>
                    Temperature
                    <input
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        value={form.temperature}
                        onChange={(event) => updateField('temperature', event.target.value)}
                    />
                </label>
                <label>
                    Max tokens
                    <input
                        type="number"
                        min="50"
                        step="10"
                        value={form.maxTokens}
                        onChange={(event) => updateField('maxTokens', event.target.value)}
                    />
                </label>
                <label className="waOpenAiPromptField">
                    Prompt del sistema
                    <textarea
                        rows={5}
                        value={form.systemPrompt}
                        onChange={(event) => updateField('systemPrompt', event.target.value)}
                        placeholder="Define el tono y reglas del bot"
                    />
                </label>
            </div>

            <div className={`waStatusBox ${isConnected ? 'ok' : 'warn'}`}>
                Estado: {isConnected ? 'Conectado' : 'Falta API key'}
            </div>
            {status && <p className="waInfoMsg">{status}</p>}
        </section>
    );
}

export function WhatsappSchedules() {
    const [items, setItems] = useState(() => (
        parseStoredJson(SCHEDULE_STORAGE_KEY, [])
    ));
    const [form, setForm] = useState({
        contacto: '',
        telefono: '',
        fecha: '',
        hora: '',
        mensaje: '',
    });
    const [status, setStatus] = useState('');

    const persist = (next) => {
        setItems(next);
        localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(next));
    };

    const createSchedule = () => {
        const contacto = String(form.contacto || '').trim();
        const telefono = String(form.telefono || '').trim();
        const fecha = String(form.fecha || '').trim();
        const hora = String(form.hora || '').trim();
        const mensaje = String(form.mensaje || '').trim();

        if (!contacto || !telefono || !fecha || !hora || !mensaje) {
            setStatus('Completa contacto, telefono, fecha, hora y mensaje.');
            return;
        }

        const next = [
            {
                id: Date.now(),
                contacto,
                telefono,
                fecha,
                hora,
                mensaje,
                estado: 'Pendiente',
                creadoEn: new Date().toISOString(),
            },
            ...items,
        ];
        persist(next);
        setForm({ contacto: '', telefono: '', fecha: '', hora: '', mensaje: '' });
        setStatus('Mensaje agendado correctamente.');
    };

    const toggleEstado = (id) => {
        const next = items.map((item) => {
            if (item.id !== id) return item;
            const estado = item.estado === 'Pendiente' ? 'Pausado' : 'Pendiente';
            return { ...item, estado };
        });
        persist(next);
    };

    const removeItem = (id) => {
        persist(items.filter((item) => item.id !== id));
    };

    return (
        <section className="botCard">
            <header className="botFlowsHead">
                <div>
                    <h2>Agendar mensaje</h2>
                    <p>Programa envios por contacto con fecha y hora especifica.</p>
                </div>
            </header>

            <div className="waScheduleForm">
                <label>
                    Contacto
                    <input
                        type="text"
                        value={form.contacto}
                        onChange={(event) => setForm((prev) => ({ ...prev, contacto: event.target.value }))}
                        placeholder="Nombre del contacto"
                    />
                </label>
                <label>
                    Telefono
                    <input
                        type="text"
                        value={form.telefono}
                        onChange={(event) => setForm((prev) => ({ ...prev, telefono: event.target.value }))}
                        placeholder="+57..."
                    />
                </label>
                <label>
                    Fecha
                    <input
                        type="date"
                        value={form.fecha}
                        onChange={(event) => setForm((prev) => ({ ...prev, fecha: event.target.value }))}
                    />
                </label>
                <label>
                    Hora
                    <input
                        type="time"
                        value={form.hora}
                        onChange={(event) => setForm((prev) => ({ ...prev, hora: event.target.value }))}
                    />
                </label>
                <label className="waScheduleMessage">
                    Mensaje
                    <textarea
                        rows={4}
                        value={form.mensaje}
                        onChange={(event) => setForm((prev) => ({ ...prev, mensaje: event.target.value }))}
                        placeholder="Texto que se enviara"
                    />
                </label>
                <button type="button" className="primary" onClick={createSchedule}>Agregar horario</button>
            </div>
            {status && <p className="waInfoMsg">{status}</p>}

            <div className="waScheduleTableWrap">
                <table className="waScheduleTable">
                    <thead>
                        <tr>
                            <th>Fecha/Hora</th>
                            <th>Contacto</th>
                            <th>Telefono</th>
                            <th>Mensaje</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 && (
                            <tr>
                                <td colSpan={6}>No hay mensajes agendados.</td>
                            </tr>
                        )}
                        {items.map((item) => (
                            <tr key={item.id}>
                                <td>{item.fecha} {item.hora}</td>
                                <td>{item.contacto}</td>
                                <td>{item.telefono}</td>
                                <td>{item.mensaje}</td>
                                <td>
                                    <span className={`waScheduleState ${item.estado === 'Pendiente' ? 'pending' : 'paused'}`}>
                                        {item.estado}
                                    </span>
                                </td>
                                <td>
                                    <div className="tagRowActions">
                                        <button type="button" className="tagActionBtn" onClick={() => toggleEstado(item.id)}>
                                            {item.estado === 'Pendiente' ? 'Pausar' : 'Reactivar'}
                                        </button>
                                        <button type="button" className="tagActionBtn danger" onClick={() => removeItem(item.id)}>
                                            Eliminar
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

const DEFAULT_TAGS = [
    { id: 1, name: 'Nuevo lead', color: '#3b82f6', description: 'Contacto recien llegado' },
    { id: 2, name: 'Cliente VIP', color: '#16a34a', description: 'Compra recurrente' },
    { id: 3, name: 'Pendiente pago', color: '#f59e0b', description: 'Requiere seguimiento' },
];

export function WhatsappTags() {
    const [tags, setTags] = useState(() => {
        try {
            const raw = localStorage.getItem('whatsapp_tags');
            const parsed = raw ? JSON.parse(raw) : null;
            return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_TAGS;
        } catch {
            return DEFAULT_TAGS;
        }
    });
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ name: '', color: '#3b82f6', description: '' });

    const persist = (next) => {
        setTags(next);
        localStorage.setItem('whatsapp_tags', JSON.stringify(next));
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingId(null);
        setForm({ name: '', color: '#3b82f6', description: '' });
    };

    const openCreate = () => {
        setShowForm(true);
        setEditingId(null);
        setForm({ name: '', color: '#3b82f6', description: '' });
    };

    const openEdit = (tag) => {
        setShowForm(true);
        setEditingId(tag.id);
        setForm({
            name: tag.name || '',
            color: tag.color || '#3b82f6',
            description: tag.description || '',
        });
    };

    const saveTag = () => {
        const name = String(form.name || '').trim();
        if (!name) return;
        if (editingId) {
            const next = tags.map((tag) => (
                tag.id === editingId
                    ? { ...tag, name, color: form.color || '#3b82f6', description: String(form.description || '').trim() }
                    : tag
            ));
            persist(next);
            resetForm();
            return;
        }

        const next = [
            {
                id: Date.now(),
                name,
                color: form.color || '#3b82f6',
                description: String(form.description || '').trim(),
            },
            ...tags,
        ];
        persist(next);
        resetForm();
    };

    const removeTag = (id) => {
        const next = tags.filter((tag) => tag.id !== id);
        persist(next);
    };

    return (
        <section className="botCard">
            <header className="botFlowsHead">
                <div>
                    <h2>Etiquetas</h2>
                    <p>Crea etiquetas con colores para organizar tus contactos y conversaciones.</p>
                </div>
                <div className="botActions">
                    <button type="button" className="primary" onClick={openCreate}>
                        <FontAwesomeIcon icon={faPlus} />
                        Crear etiqueta
                    </button>
                </div>
            </header>

            {showForm && (
                <div className="tagFormCard">
                    <div className="tagFormGrid">
                        <label>
                            Nombre
                            <input
                                type="text"
                                value={form.name}
                                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                                placeholder="Ej: Lead caliente"
                            />
                        </label>
                        <label>
                            Color
                            <input
                                type="color"
                                value={form.color}
                                onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
                            />
                        </label>
                    </div>
                    <label>
                        Descripcion
                        <input
                            type="text"
                            value={form.description}
                            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                            placeholder="Uso interno de la etiqueta"
                        />
                    </label>
                    <div className="tagFormActions">
                        <button type="button" className="soft" onClick={resetForm}>Cancelar</button>
                        <button type="button" className="primary" onClick={saveTag}>
                            {editingId ? 'Guardar cambios' : 'Agregar etiqueta'}
                        </button>
                    </div>
                </div>
            )}

            <div className="tagsTableWrap">
                <table className="tagsTable">
                    <thead>
                        <tr>
                            <th>Etiqueta</th>
                            <th>Color</th>
                            <th>Descripcion</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tags.map((tag) => (
                            <tr key={tag.id}>
                                <td>
                                    <span className="tagBadge" style={{ '--tag-color': tag.color }}>
                                        {tag.name}
                                    </span>
                                </td>
                                <td>
                                    <div className="tagColorValue">
                                        <span style={{ background: tag.color }} />
                                        {tag.color}
                                    </div>
                                </td>
                                <td>{tag.description || 'Sin descripcion'}</td>
                                <td>
                                    <div className="tagRowActions">
                                        <button type="button" className="tagActionBtn" onClick={() => openEdit(tag)}>
                                            <FontAwesomeIcon icon={faPen} />
                                            Editar
                                        </button>
                                        <button type="button" className="tagActionBtn danger" onClick={() => removeTag(tag.id)}>
                                            <FontAwesomeIcon icon={faTrash} />
                                            Eliminar
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}





