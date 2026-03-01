import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowUpRightFromSquare,
  faBolt,
  faCircleCheck,
  faCircleExclamation,
  faGaugeHigh,
  faRotateRight,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import './MonitorGlobalAI.css';

const IFRAME_TIMEOUT_MS = 18000;
const REFRESH_MS = 60000;
const COLOMBIA_STREAM_EMBED = 'https://www.youtube.com/embed/kMNm9L0TM1w?autoplay=1&mute=1&rel=0&modestbranding=1';
const MONITOR_PRIMARY_URL = 'https://worldmonitor.app';
const MONITOR_OWN_URL = '/monitor-own.html';
const INSTAGRAM_POPUP_KEY = 'monitor_ig_popup_at';
const IFRAME_BLOCKLIST = new Set(['tech.worldmonitor.app', 'worldmonitor.app', 'www.worldmonitor.app']);

function normalizeBase(urlValue) {
  const raw = String(urlValue || MONITOR_OWN_URL).trim();
  return raw.replace(/\/+$/, '');
}

function isEmbeddableUrl(urlValue) {
  const raw = String(urlValue || '').trim();
  if (!raw) return false;
  if (raw.startsWith('/')) return true;
  try {
    const host = new URL(raw).hostname.toLowerCase();
    if (IFRAME_BLOCKLIST.has(host)) return false;
    return true;
  } catch {
    return false;
  }
}

function sanitizeText(value, max = 180) {
  const cleaned = String(value || '')
    .split('').filter((char) => { const code = char.charCodeAt(0); return code >= 32 || code === 10 || code === 13 || code === 9; }).join('')
    .replace(/[\uFFFD]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return cleaned.slice(0, max);
}

function autoTranslateToSpanish(value) {
  const source = String(value || '');
  if (!source) return '';
  const replacements = [
    [/breaking/gi, 'ultima hora'],
    [/update/gi, 'actualizacion'],
    [/economy/gi, 'economia'],
    [/stocks?/gi, 'acciones'],
    [/market/gi, 'mercado'],
    [/security/gi, 'seguridad'],
    [/government/gi, 'gobierno'],
    [/congress/gi, 'congreso'],
    [/inflation/gi, 'inflacion'],
    [/employment/gi, 'empleo'],
    [/risk/gi, 'riesgo'],
    [/investment/gi, 'inversion'],
    [/news/gi, 'noticias'],
    [/live/gi, 'en vivo'],
  ];

  let out = source;
  replacements.forEach(([pattern, replacement]) => {
    out = out.replace(pattern, replacement);
  });
  return out;
}

function normalizeItems(items, maxItems = 10) {
  if (!Array.isArray(items)) {
    return [];
  }
  const out = [];
  for (const item of items) {
    const title = sanitizeText(item?.title || item?.name, 160);
    if (!title) {
      continue;
    }
    out.push({
      id: String(item?.id || `${title}-${item?.source || ''}-${item?.hour || ''}`),
      title: autoTranslateToSpanish(title),
      source: autoTranslateToSpanish(sanitizeText(item?.source || '', 40)),
      hour: sanitizeText(item?.hour || '', 16),
      summary: autoTranslateToSpanish(sanitizeText(item?.summary || item?.description || '', 180)),
      updatedAt: sanitizeText(item?.updatedAt || '', 24),
      link: sanitizeText(item?.link || '', 220),
      studies: sanitizeText(item?.studies || '', 120),
      recognitions: sanitizeText(item?.recognitions || '', 120),
      party: sanitizeText(item?.party || '', 80),
      sources: Array.isArray(item?.sources) ? item.sources.filter(Boolean).map((source) => sanitizeText(source, 180)) : [],
      avatar: sanitizeText(item?.avatar || '', 220),
      platform: sanitizeText(item?.platform || '', 20),
      likesLabel: sanitizeText(item?.likesLabel || '', 24),
    });
    if (out.length >= maxItems) {
      break;
    }
  }
  return out;
}

function buildMonitorSrc(base, mode, country, nonce) {
  const url = new URL(base, window.location.origin);
  const params = new URLSearchParams();

  if (mode === 'instability') {
    params.set('country', country || 'CO');
    params.set('timeRange', '24h');
    params.set('layers', 'conflicts,hotspots,military,protests,ucdpEvents,displacement,climate,economic');
    params.set('view', 'global');
    params.set('zoom', '2.3');
  } else if (mode === 'lite') {
    params.set('timeRange', '6h');
    params.set('layers', 'hotspots,conflicts,economic,weather');
    params.set('view', 'global');
    params.set('zoom', '1.5');
  } else {
    params.set('timeRange', '24h');
    params.set('layers', 'conflicts,hotspots,military,protests,ucdpEvents,displacement,climate,weather,cyberThreats,economic');
    params.set('view', 'global');
    params.set('zoom', '1.8');
  }

  params.set('embed', '1');
  params.set('lang', 'es');
  params.set('hl', 'es');
  params.set('v', String(nonce));
  url.search = params.toString();
  return url.toString();
}

function timeAgoLabel(iso, nowTs = Date.now()) {
  if (!iso) return 'Actualizado hace un momento';
  const ms = nowTs - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 60000) return 'Actualizado hace menos de 1 min';
  const min = Math.floor(ms / 60000);
  if (min < 60) return `Actualizado hace ${min} min`;
  const hr = Math.floor(min / 60);
  return `Actualizado hace ${hr} h`;
}

function extractKeyPoint(item) {
  const text = `${item?.title || ''} ${item?.summary || ''}`.toLowerCase();
  if (text.includes('seguridad') || text.includes('militar')) return 'Riesgo: vigilar seguridad y transporte regional.';
  if (text.includes('inflacion') || text.includes('tasas')) return 'Macro: impacto en consumo, bancos y renta fija.';
  if (text.includes('reforma') || text.includes('congreso') || text.includes('gobierno')) return 'Politica: posible impacto regulatorio y fiscal.';
  if (text.includes('mercado') || text.includes('inversion') || text.includes('fiscal')) return 'Mercado: revisar volatilidad y flujo de capital.';
  return 'Seguimiento: noticia con impacto potencial en decisiones de corto plazo.';
}

function compactSummary(item) {
  const summary = sanitizeText(item?.summary || '', 120);
  if (summary) return summary;
  return sanitizeText(extractKeyPoint(item), 120);
}

function DataModal({ open, title, items, onClose }) {
  if (!open) return null;
  return (
    <div className='monitorModalOverlay' role='presentation' onClick={onClose}>
      <div className='monitorModal' role='dialog' aria-modal='true' onClick={(event) => event.stopPropagation()}>
        <div className='monitorModalHead'>
          <h4>{title}</h4>
          <button type='button' onClick={onClose}>Cerrar</button>
        </div>
        <ul>
          {items.map((item) => (
            <li key={item.id || item.title}>{item.title || item.name}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function MonitorGlobalAI({ standalone = false }) {
  const loadStartRef = useRef(Date.now());
  const [reloadNonce, setReloadNonce] = useState(() => Date.now());
  const [iframeReady, setIframeReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [forceOwnMonitor, setForceOwnMonitor] = useState(true);
  const [mode, setMode] = useState('live');
  const [country, setCountry] = useState('CO');

  const [news, setNews] = useState([]);
  const [topics, setTopics] = useState([]);
  const [parties, setParties] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [virals, setVirals] = useState([]);
  const [investmentIdeas, setInvestmentIdeas] = useState([]);
  const [loadingColombia, setLoadingColombia] = useState(false);
  const [updatedAt, setUpdatedAt] = useState('');
  const [nowTick, setNowTick] = useState(Date.now());
  const [nextRefreshSec, setNextRefreshSec] = useState(Math.floor(REFRESH_MS / 1000));
  const [modalState, setModalState] = useState({ open: false, title: '', items: [] });
  const [showInstagramHint, setShowInstagramHint] = useState(false);

  const ownMonitorBaseUrl = useMemo(() => {
    const configured = normalizeBase(process.env.REACT_APP_MONITOR_OWN_URL || MONITOR_OWN_URL);
    return isEmbeddableUrl(configured) ? configured : MONITOR_OWN_URL;
  }, []);
  const monitorBaseUrl = useMemo(() => normalizeBase(process.env.REACT_APP_WORLDMONITOR_URL || MONITOR_PRIMARY_URL), []);
  const liteConfigured = useMemo(() => normalizeBase(process.env.REACT_APP_WORLDMONITOR_LITE_URL || MONITOR_PRIMARY_URL), []);
  const safeLiteUrl = useMemo(() => {
    try {
      const host = new URL(liteConfigured).hostname.toLowerCase();
      if (IFRAME_BLOCKLIST.has(host)) {
        return monitorBaseUrl;
      }
      return liteConfigured;
    } catch {
      return monitorBaseUrl;
    }
  }, [liteConfigured, monitorBaseUrl]);

  const effectiveMonitorBaseUrl = useMemo(() => {
    if (forceOwnMonitor) return ownMonitorBaseUrl;
    const candidate = mode === 'lite' ? safeLiteUrl : monitorBaseUrl;
    if (!isEmbeddableUrl(candidate)) return ownMonitorBaseUrl;
    return candidate;
  }, [forceOwnMonitor, ownMonitorBaseUrl, mode, monitorBaseUrl, safeLiteUrl]);

  const normalizedCountry = useMemo(() => {
    const value = String(country || '').trim().toUpperCase();
    return /^[A-Z]{2}$/.test(value) ? value : 'CO';
  }, [country]);

  const monitorUrl = useMemo(() => buildMonitorSrc(effectiveMonitorBaseUrl, mode, normalizedCountry, reloadNonce), [effectiveMonitorBaseUrl, mode, normalizedCountry, reloadNonce]);
  const externalUrl = useMemo(() => buildMonitorSrc(effectiveMonitorBaseUrl, mode, normalizedCountry, Date.now()), [effectiveMonitorBaseUrl, mode, normalizedCountry]);
  const highlightedInsights = useMemo(() => {
    const cards = [];
    news.slice(0, 4).forEach((item) => {
      cards.push({
        id: `news-${item.id}`,
        label: 'Titular IA',
        title: item.title,
        meta: `${item.source || 'Fuente'} - ${item.hour || 'Hoy'}`,
        summary: compactSummary(item),
      });
    });
    topics.slice(0, Math.max(0, 6 - cards.length)).forEach((item) => {
      cards.push({
        id: `topic-${item.id}`,
        label: 'Tema clave',
        title: item.title,
        meta: 'Deteccion IA',
        summary: compactSummary(item),
      });
    });
    return cards.slice(0, 6);
  }, [news, topics]);

  const updatedAgo = useMemo(() => timeAgoLabel(updatedAt, nowTick), [updatedAt, nowTick]);
  const refreshPct = useMemo(() => {
    const total = Math.max(1, Math.floor(REFRESH_MS / 1000));
    const remain = Math.min(total, Math.max(0, nextRefreshSec));
    return Math.round(((total - remain) / total) * 100);
  }, [nextRefreshSec]);

  const fetchJson = useCallback(async (path) => {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }, []);

  const loadColombiaData = useCallback(async () => {
    setLoadingColombia(true);
    try {
      const [newsRes, topicsRes, partiesRes, candidatesRes, viralsTikTokRes, viralsShortsRes, investmentRes] = await Promise.all([
        fetchJson('/api/colombia/news?range=today'),
        fetchJson('/api/colombia/topics?range=today'),
        fetchJson('/api/colombia/parties'),
        fetchJson('/api/colombia/candidates'),
        fetchJson('/api/colombia/virals?platform=tiktok&minLikes=50000'),
        fetchJson('/api/colombia/virals?platform=shorts'),
        fetchJson('/api/colombia/investment-insights?range=today'),
      ]);

      setNews(normalizeItems(newsRes.items || [], 10));
      setTopics(normalizeItems((topicsRes.items || []).map((item, idx) => ({ id: idx + 1, title: item.title || item })), 8));
      setParties(normalizeItems(partiesRes.items || [], 10));
      setCandidates(normalizeItems(candidatesRes.items || [], 10));
      const viralsMerged = [...(viralsTikTokRes.items || []), ...(viralsShortsRes.items || [])];
      setVirals(normalizeItems(viralsMerged, 6));
      setInvestmentIdeas(Array.isArray(investmentRes?.ideas) ? investmentRes.ideas.slice(0, 10) : []);
      setUpdatedAt(new Date().toISOString());
      setNextRefreshSec(Math.floor(REFRESH_MS / 1000));
    } catch {
      // fallback minimal safe dataset
      setNews(normalizeItems([
        { id: 'f1', source: 'Monitor', hour: 'Ahora', title: 'Sincronizando titulares de Colombia', summary: 'Actualizando fuentes en tiempo real.' },
      ], 10));
      setTopics(normalizeItems([
        { id: 't1', title: 'Gobierno y congreso' },
        { id: 't2', title: 'Seguridad regional' },
        { id: 't3', title: 'Economia y empleo' },
      ], 8));
      setParties([]);
      setCandidates([]);
      setVirals([]);
      setInvestmentIdeas([]);
      setUpdatedAt(new Date().toISOString());
      setNextRefreshSec(Math.floor(REFRESH_MS / 1000));
    } finally {
      setLoadingColombia(false);
    }
  }, [fetchJson]);

  useEffect(() => {
    setIframeReady(false);
    setTimedOut(false);
    loadStartRef.current = Date.now();
    const timer = setTimeout(() => setTimedOut(true), IFRAME_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [monitorUrl]);

  useEffect(() => {
    if (timedOut && !iframeReady) {
      setMode('live');
      setForceOwnMonitor(true);
      setReloadNonce(Date.now());
    }
  }, [timedOut, iframeReady]);

  useEffect(() => {
    if (!isEmbeddableUrl(effectiveMonitorBaseUrl)) {
      setForceOwnMonitor(true);
      setReloadNonce(Date.now());
    }
  }, [effectiveMonitorBaseUrl]);

  useEffect(() => {
    void loadColombiaData();
    const intervalId = setInterval(() => {
      void loadColombiaData();
    }, REFRESH_MS);
    return () => clearInterval(intervalId);
  }, [loadColombiaData]);

  useEffect(() => {
    const countdown = setInterval(() => {
      setNextRefreshSec((prev) => (prev <= 1 ? Math.floor(REFRESH_MS / 1000) : prev - 1));
    }, 1000);
    return () => clearInterval(countdown);
  }, []);

  useEffect(() => {
    const ticker = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(ticker);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const last = Number(localStorage.getItem(INSTAGRAM_POPUP_KEY) || 0);
      if (Date.now() - last >= 120000) {
        setShowInstagramHint(true);
        localStorage.setItem(INSTAGRAM_POPUP_KEY, String(Date.now()));
        setTimeout(() => setShowInstagramHint(false), 8000);
      }
    }, 120000);
    return () => clearTimeout(timer);
  }, []);

  const frameClass = standalone ? 'monitorGlobalAIFrame monitorGlobalAIFrameStandalone' : 'monitorGlobalAIFrame';
  const wrapClass = standalone ? 'monitorGlobalAIFrameWrap monitorGlobalAIFrameWrapStandalone' : 'monitorGlobalAIFrameWrap';

  return (
    <section className={standalone ? 'monitorGlobalAIPage monitorGlobalAIPageStandalone' : 'monitorGlobalAIPage'}>
      {!standalone ? (
        <header className='monitorGlobalAIHeader'>
          <div>
            <h2>Monitor Global AI</h2>
            <p>Cards compactas, modo lite fluido y panel Colombia inteligente.</p>
          </div>
          <div className='monitorGlobalAIActions'>
            <button type='button' onClick={() => setReloadNonce(Date.now())}>
              <FontAwesomeIcon icon={faRotateRight} /> Recargar
            </button>
            <a href={externalUrl} target='_blank' rel='noreferrer'>
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} /> Abrir en nueva pestana
            </a>
          </div>
        </header>
      ) : null}

      <div className='monitorGlobalToolbar'>
        <div className='monitorModeToggle' role='group' aria-label='Modo de monitor'>
          <button type='button' className={mode === 'live' ? 'isActive' : ''} onClick={() => setMode('live')}>
            <FontAwesomeIcon icon={faGaugeHigh} /> Insights IA en vivo
          </button>
          <button type='button' className={mode === 'lite' ? 'isActive' : ''} onClick={() => setMode('lite')}>
            <FontAwesomeIcon icon={faBolt} /> Lite IA
          </button>
          <button type='button' className={mode === 'instability' ? 'isActive' : ''} onClick={() => setMode('instability')}>
            <FontAwesomeIcon icon={faTriangleExclamation} /> Inestabilidad pais
          </button>
        </div>

        <button
          type='button'
          className='monitorColombiaBtn'
          onClick={() => {
            setCountry('CO');
            if (mode === 'instability') setReloadNonce(Date.now());
            else setMode('lite');
          }}
        >
          <span aria-hidden='true'>{'\uD83C\uDDE8\uD83C\uDDF4'}</span> COLOMBIA
        </button>

        {forceOwnMonitor ? (
          <button
            type='button'
            className='monitorColombiaBtn'
            onClick={() => {
              setForceOwnMonitor(false);
              setReloadNonce(Date.now());
            }}
          >
            Volver a Situacion Global
          </button>
        ) : null}

        {mode === 'instability' ? (
          <label className='monitorCountryInput'>
            Pais (ISO-2)
            <input value={country} onChange={(event) => setCountry(event.target.value)} maxLength={2} placeholder='CO' aria-label='Codigo de pais ISO de 2 letras' />
          </label>
        ) : null}
      </div>

      <div className={wrapClass}>
        {!iframeReady ? (
          <div className='monitorGlobalLoading'>
            <div className='monitorGlobalSpinner' aria-hidden='true' />
            <p>Cargando monitor...</p>
            <small>Normalmente toma entre 3 y 12 segundos.</small>
          </div>
        ) : null}

        {timedOut && !iframeReady ? (
          <div className='monitorGlobalWarning'>
            <p><FontAwesomeIcon icon={faCircleExclamation} /> El monitor externo no respondio. Se activo monitor propio.</p>
            <div className='monitorGlobalWarningActions'>
              <button type='button' onClick={() => setReloadNonce(Date.now())}>Reintentar carga</button>
              <a href={externalUrl} target='_blank' rel='noreferrer'>Abrir monitor externo</a>
            </div>
          </div>
        ) : null}

        {iframeReady ? (
          <div className='monitorGlobalReady'>
            <FontAwesomeIcon icon={faCircleCheck} /> Conectado
          </div>
        ) : null}

        <a className='monitorGlobalInstagramPopup' href='https://www.instagram.com/oasis.ai_/' target='_blank' rel='noreferrer' aria-label='Instagram'>
          <span className='monitorGlobalInstagramIcon' aria-hidden='true'><i className='fa fa-instagram' /></span>
        </a>
        {showInstagramHint ? <div className='monitorInstagramHint'>Siguenos en Instagram</div> : null}

        <iframe
          key={monitorUrl}
          title='monitor-global-ai'
          src={monitorUrl}
          loading='eager'
          className={frameClass}
          referrerPolicy='strict-origin-when-cross-origin'
          onLoad={() => {
            const elapsed = Date.now() - loadStartRef.current;
            const isExternal = /^https?:\/\//i.test(effectiveMonitorBaseUrl);
            const looksBlockedFast = isExternal && elapsed < 1200;
            if (looksBlockedFast) {
              setIframeReady(false);
              setTimedOut(true);
              setForceOwnMonitor(true);
              setReloadNonce(Date.now());
              return;
            }
            setIframeReady(true);
            setTimedOut(false);
          }}
          onError={() => {
            setIframeReady(false);
            setTimedOut(true);
            setForceOwnMonitor(true);
            setReloadNonce(Date.now());
          }}
        />
      </div>

      {mode !== 'instability' ? (
        <section className='monitorColombiaPanel'>
          <header>
            <div className='monitorColombiaTitle'>
              <span aria-hidden='true'>{'\uD83C\uDDE8\uD83C\uDDF4'}</span>
              <h3>Colombia Inteligente</h3>
            </div>
            <div className='monitorColombiaHeaderActions'>
              <button type='button' onClick={() => void loadColombiaData()} disabled={loadingColombia}>Actualizar</button>
              <span className='monitorAutoRefreshInfo'>Actualiza cada 1 minuto</span>
              <span className='monitorUpdatedAt'>{updatedAgo}</span>
            </div>
            <div className='monitorRefreshMeter' role='status' aria-live='polite'>
              <div className='monitorRefreshBar'>
                <b style={{ width: `${refreshPct}%` }} />
              </div>
              <small>{loadingColombia ? 'Actualizando...' : `Proxima actualizacion en ${nextRefreshSec}s`}</small>
            </div>
          </header>

          {highlightedInsights.length > 0 ? (
            <div className='monitorHighlightsGrid'>
              {highlightedInsights.map((card) => (
                <article key={card.id} className='monitorHighlightCard'>
                  <span className='monitorHighlightLabel'>{card.label}</span>
                  <h4 className='lineClamp2'>{card.title}</h4>
                  {card.summary ? <p className='lineClamp2'>{card.summary}</p> : null}
                  <small>{card.meta}</small>
                </article>
              ))}
            </div>
          ) : null}
          <div className='monitorColombiaGrid'>
            <article className='monitorColombiaLive'>
              <div className='monitorLiveBadge'>EN VIVO</div>
              <iframe
                title='Noticias Colombia en vivo'
                src={COLOMBIA_STREAM_EMBED}
                allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                allowFullScreen
                loading='lazy'
              />
            </article>

            <div className='monitorColombiaInsights'>
              {news.length > 0 ? (
                <article className='monitorInsightCard'>
                  <div className='cardHead'>
                    <h4>Titulares clave</h4>
                    {news.length >= 6 ? (
                      <button type='button' onClick={() => setModalState({ open: true, title: 'Titulares clave', items: news })}>Ver mas</button>
                    ) : null}
                  </div>
                  <ul className='compactList'>
                    {news.slice(0, 6).map((item) => (
                      <li key={item.id}>
                        <span className='meta'>{item.source || 'Fuente'} - {item.hour || 'Hoy'}</span>
                        <span className='lineClamp2'>{item.title}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ) : null}

              {topics.length > 0 ? (
                <article className='monitorInsightCard'>
                  <div className='cardHead'><h4>Temas clave detectados</h4></div>
                  <ul className='compactBullets'>
                    {topics.slice(0, 8).map((item) => (
                      <li key={item.id} className='lineClamp2'>{item.title}</li>
                    ))}
                  </ul>
                </article>
              ) : null}

              {parties.length > 0 ? (
                <article className='monitorInsightCard'>
                  <div className='cardHead'>
                    <h4>Partidos politicos</h4>
                    <button type='button' onClick={() => setModalState({ open: true, title: 'Partidos politicos', items: parties })}>Ver mas</button>
                  </div>
                  <ul className='compactList'>
                    {parties.slice(0, 6).map((item) => (
                      <li key={item.id}><span className='lineClamp2'>{item.title}</span></li>
                    ))}
                  </ul>
                </article>
              ) : null}

              {candidates.length > 0 ? (
                <article className='monitorInsightCard'>
                  <div className='cardHead'><h4>Candidatos presidenciales</h4></div>
                  <div className='candidateGrid'>
                    {candidates.slice(0, 6).map((candidate) => (
                      <div key={candidate.id} className='candidateCard'>
                        <div className='candidateName lineClamp2'>{candidate.title}</div>
                        {candidate.studies || candidate.recognitions ? (
                          <div className='candidateInfo lineClamp2'>{sanitizeText(`${candidate.studies} ${candidate.recognitions}`, 120)}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </article>
              ) : null}

              {virals.length > 0 ? (
                <article className='monitorInsightCard'>
                  <div className='cardHead'><h4>Virales (Shorts/TikTok)</h4></div>
                  <ul className='compactList'>
                    {virals.slice(0, 6).map((item) => (
                      <li key={item.id}>
                        <span className='meta'>{item.platform || 'Top del dia'} {item.likesLabel || ''}</span>
                        <span className='lineClamp2'>{item.title}</span>
                        {item.link ? (
                          <a className='viralLink' href={item.link} target='_blank' rel='noreferrer'>
                            Ver video
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </article>
              ) : null}

              {investmentIdeas.length > 0 ? (
                <article className='monitorInsightCard'>
                  <div className='cardHead'>
                    <h4>Inversiones Futuras Colombia</h4>
                    <button
                      type='button'
                      onClick={() => setModalState({ open: true, title: 'Top 10 inversiones (1d / 15d / 2m)', items: investmentIdeas.map((i, idx) => ({ id: `inv_${idx}`, title: `${i.asset} - ${i.horizon} - score ${i.score}` })) })}
                    >
                      Ver top 10
                    </button>
                  </div>
                  <ul className='compactList'>
                    {investmentIdeas.slice(0, 5).map((idea, idx) => (
                      <li key={`${idea.asset}_${idx}`}>
                        <span className='meta'>{idea.type} - {idea.horizon} - score {idea.score}</span>
                        <span className='lineClamp2'>{idea.asset}: {idea.thesis}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <DataModal open={modalState.open} title={modalState.title} items={modalState.items} onClose={() => setModalState({ open: false, title: '', items: [] })} />
    </section>
  );
}
