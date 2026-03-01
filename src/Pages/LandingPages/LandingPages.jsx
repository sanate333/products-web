import React, { useEffect, useMemo, useState } from 'react';
import Header from '../Header/Header';
import HeaderDash from '../../Components/Admin/HeaderDash/HeaderDash';
import './LandingPages.css';

const PROJECTS_KEY = 'oasis_landing_projects_v1';

const BENEFITS = [
    { title: 'Importacion magica', text: 'Importa cualquier producto en segundos...' },
    { title: 'Mas de 50 secciones optimizadas', text: 'Elige entre bloques...' },
    { title: 'Generacion de imagenes con IA', text: 'Utiliza ... de forma gratuita...' },
    { title: 'Generador de Marca Instantaneo', text: 'Obten una identidad...' },
    { title: 'Optimizado para moviles por defecto', text: 'Tu tienda se ve perfecta...' },
    { title: 'Generacion de copias multilingues', text: 'Crea paginas ...' },
];

const COVERS = [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1514996937319-344454492b37?w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200&auto=format&fit=crop',
];

const PLACEHOLDER_LANDINGS = [
    { id: 'demo-1', productName: 'Landing Serum Facial', createdAt: new Date().toISOString(), status: 'Demo', coverImage: COVERS[0] },
    { id: 'demo-2', productName: 'Landing Zapatillas Running', createdAt: new Date().toISOString(), status: 'Demo', coverImage: COVERS[1] },
    { id: 'demo-3', productName: 'Landing Accesorio Premium', createdAt: new Date().toISOString(), status: 'Demo', coverImage: COVERS[2] },
];

const readProjects = () => {
    try {
        const raw = localStorage.getItem(PROJECTS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
};

const saveProjects = (projects) => {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
};

export default function LandingPages() {
    const [projects, setProjects] = useState(() => readProjects());
    const [wizardOpen, setWizardOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [progress, setProgress] = useState(0);
    const [form, setForm] = useState({
        productName: '',
        importUrl: '',
        persona: '',
        angle: '',
        imageChoice: 0,
    });

    const latest = useMemo(() => projects[0] || null, [projects]);
    const landingCards = useMemo(() => (projects.length ? projects : PLACEHOLDER_LANDINGS), [projects]);

    useEffect(() => {
        if (step !== 4) return undefined;
        const interval = setInterval(() => {
            setProgress((prev) => {
                const next = prev + 10;
                if (next >= 100) {
                    clearInterval(interval);
                    const newProject = {
                        id: `landing-${Date.now()}`,
                        productName: form.productName.trim() || 'Producto sin nombre',
                        createdAt: new Date().toISOString(),
                        status: 'Borrador',
                        coverImage: COVERS[form.imageChoice] || COVERS[0],
                    };
                    const nextProjects = [newProject, ...projects];
                    setProjects(nextProjects);
                    saveProjects(nextProjects);
                    setStep(5);
                    return 100;
                }
                return next;
            });
        }, 280);

        return () => clearInterval(interval);
    }, [form.imageChoice, form.productName, projects, step]);

    const openWizard = () => {
        setForm({ productName: '', importUrl: '', persona: '', angle: '', imageChoice: 0 });
        setProgress(0);
        setStep(1);
        setWizardOpen(true);
    };

    const closeWizard = () => {
        setWizardOpen(false);
        setStep(1);
        setProgress(0);
    };

    return (
        <div className="containerGrid">
            <Header />
            <section className="containerSection">
                <HeaderDash />
                <div className="container landingShell">
                    <header className="landingHead">
                        <div>
                            <h3>Landing Pages</h3>
                            <p>Proyectos de landing generados automaticamente</p>
                        </div>
                        <button type="button" onClick={openWizard}>Crear nueva landing</button>
                    </header>

                    <div className="landingBodyLayout">
                        <aside className="landingSideMenu">
                            <a href="#landing-banners" className="active">Banners</a>
                            <a href="#landing-tiendas">Tus tiendas</a>
                        </aside>

                        <div className="landingMainSections">
                            <section className="benefitsSection" id="landing-banners">
                                <h4>Todo lo que necesitas para lanzar rapidamente</h4>
                                <div className="benefitsGrid">
                                    {BENEFITS.map((benefit) => (
                                        <article key={benefit.title}>
                                            <h5>{benefit.title}</h5>
                                            <p>{benefit.text}</p>
                                        </article>
                                    ))}
                                </div>
                            </section>

                            <section className="landingProjects" id="landing-tiendas">
                                <div className="landingSectionHead">
                                    <h4>Tiendas</h4>
                                    <span>Landings generadas por producto</span>
                                </div>
                                <div className="landingGrid">
                                    {landingCards.map((project) => (
                                        <article key={project.id} className="projectCard">
                                            <img src={project.coverImage} alt={project.productName} />
                                            <div>
                                                <h5>{project.productName}</h5>
                                                <small>{new Date(project.createdAt).toLocaleDateString('es-CO')}</small>
                                            </div>
                                            <span className="status">{project.status}</span>
                                        </article>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </section>

            {wizardOpen && (
                <div className="wizardOverlay" onClick={closeWizard}>
                    <div className="wizardCard" onClick={(event) => event.stopPropagation()}>
                        <div className="wizardSteps">Paso {step} de 5</div>

                        {step === 1 && (
                            <div className="wizardBody">
                                <h4>Importacion / Producto</h4>
                                <input
                                    placeholder="Nombre del producto"
                                    value={form.productName}
                                    onChange={(event) => setForm((prev) => ({ ...prev, productName: event.target.value }))}
                                />
                                <input
                                    placeholder="URL de importacion (mock)"
                                    value={form.importUrl}
                                    onChange={(event) => setForm((prev) => ({ ...prev, importUrl: event.target.value }))}
                                />
                            </div>
                        )}

                        {step === 2 && (
                            <div className="wizardBody">
                                <h4>Persona / Angulo</h4>
                                <input
                                    placeholder="Persona"
                                    value={form.persona}
                                    onChange={(event) => setForm((prev) => ({ ...prev, persona: event.target.value }))}
                                />
                                <input
                                    placeholder="Angulo de venta"
                                    value={form.angle}
                                    onChange={(event) => setForm((prev) => ({ ...prev, angle: event.target.value }))}
                                />
                            </div>
                        )}

                        {step === 3 && (
                            <div className="wizardBody">
                                <h4>Seleccion de imagenes</h4>
                                <div className="imageChoices">
                                    {COVERS.map((cover, index) => (
                                        <button
                                            key={cover}
                                            type="button"
                                            className={form.imageChoice === index ? 'active' : ''}
                                            onClick={() => setForm((prev) => ({ ...prev, imageChoice: index }))}
                                        >
                                            <img src={cover} alt={`Cover ${index + 1}`} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="wizardBody">
                                <h4>Preparando tu landing...</h4>
                                <div className="progressBar">
                                    <span style={{ width: `${progress}%` }} />
                                </div>
                                <small>{progress}% completado</small>
                            </div>
                        )}

                        {step === 5 && (
                            <div className="wizardBody">
                                <h4>Resultado / Editor</h4>
                                <div className="editorMock">
                                    <div className="editorTop">Editor visual mock</div>
                                    <div className="editorBlock">Hero + Oferta principal</div>
                                    <div className="editorBlock">Seccion beneficios + CTA</div>
                                    <div className="editorBlock">Resenas + Garantia</div>
                                </div>
                                {latest && <small>Proyecto creado: {latest.productName}</small>}
                            </div>
                        )}

                        <div className="wizardActions">
                            <button type="button" onClick={closeWizard}>Cerrar</button>
                            {step > 1 && step < 4 && (
                                <button type="button" onClick={() => setStep((prev) => prev - 1)}>Atras</button>
                            )}
                            {step < 3 && (
                                <button type="button" onClick={() => setStep((prev) => prev + 1)}>Siguiente</button>
                            )}
                            {step === 3 && (
                                <button type="button" onClick={() => setStep(4)}>Generar</button>
                            )}
                            {step === 5 && (
                                <button type="button" onClick={closeWizard}>Finalizar</button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}