import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Header from '../Header/Header';
import HeaderDash from '../../Components/Admin/HeaderDash/HeaderDash';
import baseURL from '../../Components/url';
import { getTiendaSlug, isStoreDashboardRoute } from '../../utils/tienda';
import './CalendarioTributario.css';

const PLAN_STORAGE_KEY = 'tributario_2026_plan_v2';
const ALERT_STORAGE_KEY = 'tributario_2026_alerts_v1';
const AUTOMATION_STORAGE_KEY = 'tributario_2026_automation_v1';
const PROFILE_STORAGE_KEY = 'tributario_2026_profile_v1';
const BANNER_SRC = '/calendario-tributario-banner-oasis.jpeg';

const GRANDES_CUOTAS = [
  { label: 'Primera cuota (febrero)', month: '2026-02', byNit: { 1: 10, 2: 11, 3: 12, 4: 13, 5: 16, 6: 17, 7: 18, 8: 18, 9: 20, 0: 23 } },
  { label: 'Segunda cuota (abril)', month: '2026-04', byNit: { 1: 12, 2: 13, 3: 14, 4: 15, 5: 19, 6: 20, 7: 21, 8: 22, 9: 25, 0: 26 } },
  { label: 'Tercera cuota (junio)', month: '2026-06', byNit: { 1: 9, 2: 10, 3: 13, 4: 14, 5: 15, 6: 16, 7: 17, 8: 21, 9: 22, 0: 23 } },
];


const PDF_SUMMARY_NOTES = [
  'Grandes contribuyentes: renta en 3 cuotas (febrero, abril y junio).',
  'Personas naturales: vencimientos de renta desde agosto hasta octubre por rangos de dos ultimos digitos.',
  'IVA e impuesto al consumo: periodos bimestrales y cuatrimestrales con vencimientos durante marzo, mayo, julio, septiembre, noviembre y enero 2027.',
  'Retencion en la fuente: declaracion y pago mensual por ultimo digito de NIT.',
  'Patrimonio: primera cuota en mayo por NIT y segunda cuota en septiembre (dia 14).',
  'RST: anticipo bimestral y consolidada anual (incluyendo IVA) en abril.',
];

const MONTH_LABEL = {
  '2026-01': 'Enero 2026',
  '2026-02': 'Febrero 2026',
  '2026-03': 'Marzo 2026',
  '2026-04': 'Abril 2026',
  '2026-05': 'Mayo 2026',
  '2026-06': 'Junio 2026',
  '2026-07': 'Julio 2026',
  '2026-08': 'Agosto 2026',
  '2026-09': 'Septiembre 2026',
  '2026-10': 'Octubre 2026',
  '2026-11': 'Noviembre 2026',
  '2026-12': 'Diciembre 2026',
  '2027-01': 'Enero 2027',
};

function daysBetween(fromIso, toIso) {
  const from = new Date(`${fromIso}T00:00:00`);
  const to = new Date(`${toIso}T00:00:00`);
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function loadLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function defaultOfficialEvents() {
  return [
    { id: 'pdf-renta-gc-feb', title: 'Renta grandes contribuyentes (1ra cuota)', date: '2026-02-01', source: 'pdf' },
    { id: 'pdf-renta-gc-apr', title: 'Renta grandes contribuyentes (2da cuota)', date: '2026-04-01', source: 'pdf' },
    { id: 'pdf-renta-gc-jun', title: 'Renta grandes contribuyentes (3ra cuota)', date: '2026-06-01', source: 'pdf' },
    { id: 'pdf-renta-natural-window', title: 'Renta personas naturales (ventana de vencimientos)', date: '2026-08-13', source: 'pdf' },
    { id: 'pdf-renta-natural-window-end', title: 'Renta personas naturales (cierre de ventana)', date: '2026-10-16', source: 'pdf' },
    { id: 'pdf-iva-bim-1', title: 'IVA bimestral: periodo enero-febrero', date: '2026-03-01', source: 'pdf' },
    { id: 'pdf-iva-bim-2', title: 'IVA bimestral: periodo marzo-abril', date: '2026-05-01', source: 'pdf' },
    { id: 'pdf-iva-bim-3', title: 'IVA bimestral: periodo mayo-junio', date: '2026-07-01', source: 'pdf' },
    { id: 'pdf-iva-bim-4', title: 'IVA bimestral: periodo julio-agosto', date: '2026-09-01', source: 'pdf' },
    { id: 'pdf-iva-bim-5', title: 'IVA bimestral: periodo septiembre-octubre', date: '2026-11-01', source: 'pdf' },
    { id: 'pdf-iva-bim-6', title: 'IVA bimestral: periodo noviembre-diciembre', date: '2027-01-01', source: 'pdf' },
    { id: 'pdf-rst-ann', title: 'RST consolidada anual', date: '2026-04-16', source: 'pdf' },
    { id: 'pdf-rst-ann-iva', title: 'RST consolidada anual de IVA', date: '2026-04-16', source: 'pdf' },
    { id: 'pdf-patrimonio-2', title: 'Patrimonio: segunda cuota (dia 14)', date: '2026-09-14', source: 'pdf' },
  ];
}

function monthKeyFromIso(iso) {
  return String(iso || '').slice(0, 7);
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key) {
  if (MONTH_LABEL[key]) return MONTH_LABEL[key];
  const [year, month] = String(key || '').split('-');
  if (!year || !month) return key;
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
}

function monthGrid(month) {
  const [yearStr, monStr] = month.split('-');
  const year = Number(yearStr);
  const mon = Number(monStr);
  const first = new Date(year, mon - 1, 1);
  const last = new Date(year, mon, 0);
  const pad = (first.getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < pad; i += 1) cells.push(null);
  for (let d = 1; d <= last.getDate(); d += 1) cells.push(d);
  return cells;
}

function inferRuleFromTitle(title = '') {
  const lower = String(title).toLowerCase();
  if (lower.includes('renta')) return 'renta';
  if (lower.includes('iva') || lower.includes('consumo')) return 'iva';
  if (lower.includes('patrimonio')) return 'patrimonio';
  if (lower.includes('retencion') || lower.includes('rete')) return 'retencion';
  if (lower.includes('rst')) return 'rst';
  return 'custom';
}

function actionByRule(rule) {
  const map = {
    renta: 'Revisar borrador, validar soportes y presentar declaracion/pago en portal DIAN.',
    iva: 'Consolidar ventas/compras del periodo y declarar IVA/consumo con pago.',
    patrimonio: 'Verificar base gravable y presentar cuota correspondiente.',
    retencion: 'Cerrar retefuente del mes y enviar declaracion con pago.',
    rst: 'Liquidar anticipo/consolidada del RST y pagar dentro del plazo.',
    custom: 'Validar obligacion aplicable y dejar soporte del pago/declaracion.',
  };
  return map[rule] || map.custom;
}

function toGoogleDatePart(isoDate) {
  return String(isoDate || '').replaceAll('-', '').slice(0, 8);
}

function addDaysIso(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + Number(days || 0));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function escapeIcsText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function buildGoogleCalendarUrl(event) {
  const start = toGoogleDatePart(event.dueDate || event.date);
  const end = toGoogleDatePart(addDaysIso(event.dueDate || event.date, 1));
  const title = encodeURIComponent(event.title || 'Vencimiento tributario');
  const details = encodeURIComponent(`${event.note || ''}\nPanel Calendario Tributario 2026`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`;
}

function buildIcs(events) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sanate//Calendario Tributario 2026//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  events.forEach((event, idx) => {
    const baseDate = String(event.dueDate || event.date || '').slice(0, 10);
    if (!baseDate) return;
    const start = toGoogleDatePart(baseDate);
    const end = toGoogleDatePart(addDaysIso(baseDate, 1));
    const stamp = `${toGoogleDatePart(new Date().toISOString().slice(0, 10))}T000000Z`;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:tributario-2026-${Date.now()}-${idx}@sanate.store`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART;VALUE=DATE:${start}`);
    lines.push(`DTEND;VALUE=DATE:${end}`);
    lines.push(`SUMMARY:${escapeIcsText(event.title || 'Vencimiento tributario')}`);
    lines.push(`DESCRIPTION:${escapeIcsText(event.note || 'Recordatorio tributario generado desde el panel de Operacion.')}`);
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

function downloadFile(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function CalendarioTributario() {
  const storeSlug = getTiendaSlug();
  const isStoreScope = isStoreDashboardRoute(window.location.pathname || '');
  const api = useMemo(() => String(baseURL || '').replace(/\/+$/, ''), []);

  const [month, setMonth] = useState(getCurrentMonthKey());
  const [interestType, setInterestType] = useState('todos');
  const [status, setStatus] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const [plan, setPlan] = useState(() => loadLocal(PLAN_STORAGE_KEY, []));
  const [alerts, setAlerts] = useState(() => loadLocal(ALERT_STORAGE_KEY, {
    enabledBrowser: false,
    daysBefore: 7,
    lastCheckDate: '',
  }));
  const [automation, setAutomation] = useState(() => loadLocal(AUTOMATION_STORAGE_KEY, {
    enabled: true,
    cadenceHours: 12,
    lastRunAt: '',
  }));
  const [profile, setProfile] = useState(() => loadLocal(PROFILE_STORAGE_KEY, {
    companyName: 'Oasis',
    alertEmail: '',
  }));

  const officialEvents = useMemo(() => defaultOfficialEvents(), []);

  const allEvents = useMemo(() => {
    const manual = plan.map((row) => ({
      id: row.id,
      title: row.title,
      date: row.dueDate,
      note: row.note || '',
      source: row.source || 'manual',
      contributorType: row.contributorType || 'natural',
      done: Boolean(row.done),
    }));
    return [...officialEvents, ...manual];
  }, [officialEvents, plan]);

  const monthOptions = useMemo(() => {
    const set = new Set([...Object.keys(MONTH_LABEL), getCurrentMonthKey()]);
    allEvents.forEach((item) => {
      const key = monthKeyFromIso(item.date);
      if (key) set.add(key);
    });
    return Array.from(set).sort();
  }, [allEvents]);

  const eventsByDate = useMemo(() => {
    const map = new Map();
    allEvents.forEach((item) => {
      const key = String(item.date || '').slice(0, 10);
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return map;
  }, [allEvents]);

  const monthEvents = useMemo(() => {
    return allEvents.filter((item) => monthKeyFromIso(item.date || item.dueDate) === month);
  }, [allEvents, month]);

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDate.get(selectedDate) || [];
  }, [eventsByDate, selectedDate]);

  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const kpis = useMemo(() => {
    const planned = allEvents.length;
    const done = allEvents.filter((row) => row.done).length;
    const upcoming = allEvents.filter((row) => {
      const dueDate = row.dueDate || row.date;
      if (!dueDate) return false;
      const diff = daysBetween(todayIso, dueDate);
      return diff >= 0 && diff <= Number(alerts.daysBefore || 7) && !row.done;
    }).length;
    const overdue = allEvents.filter((row) => {
      const dueDate = row.dueDate || row.date;
      return Boolean(dueDate) && daysBetween(dueDate, todayIso) > 0 && !row.done;
    }).length;
    return { planned, done, upcoming, overdue, doneRate: planned ? Math.round((done / planned) * 100) : 0 };
  }, [alerts.daysBefore, allEvents, todayIso]);

  const monthlyCompliance = useMemo(() => {
    const counter = {};
    plan.forEach((item) => {
      const key = monthKeyFromIso(item.dueDate);
      if (!key) return;
      if (!counter[key]) counter[key] = { month: key, total: 0, done: 0, pending: 0, overdue: 0 };
      counter[key].total += 1;
      if (item.done) counter[key].done += 1;
      else if (daysBetween(item.dueDate, todayIso) > 0) counter[key].overdue += 1;
      else counter[key].pending += 1;
    });
    return Object.values(counter)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((row) => ({ ...row, completionRate: row.total ? Math.round((row.done / row.total) * 100) : 0 }));
  }, [plan, todayIso]);

  const monthBars = useMemo(() => {
    const counter = {};
    allEvents.forEach((item) => {
      const key = monthKeyFromIso(item.date || item.dueDate);
      if (!key) return;
      counter[key] = (counter[key] || 0) + 1;
    });
    const keys = Object.keys(counter).sort();
    const max = Math.max(1, ...keys.map((k) => counter[k]));
    return keys.map((key) => ({ key, count: counter[key], width: Math.round((counter[key] / max) * 100) }));
  }, [allEvents]);

  const guideRows = useMemo(() => {
    const target = allEvents
      .filter((item) => monthKeyFromIso(item.date || item.dueDate) === month)
      .filter((item) => {
        if (interestType === 'todos') return true;
        return inferRuleFromTitle(item.title) === interestType;
      })
      .map((item) => {
        const rule = inferRuleFromTitle(item.title);
        const date = (item.dueDate || item.date || '').slice(0, 10);
        return {
          id: item.id,
          date,
          title: item.title,
          action: actionByRule(rule),
          source: item.source || 'pdf',
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
    return target;
  }, [allEvents, interestType, month]);

  const savePlan = (next) => {
    setPlan(next);
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(next));
  };

  const saveAlerts = (next) => {
    setAlerts(next);
    localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(next));
  };

  const saveAutomation = (next) => {
    setAutomation(next);
    localStorage.setItem(AUTOMATION_STORAGE_KEY, JSON.stringify(next));
  };

  const saveProfile = (next) => {
    setProfile(next);
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
  };

  const markDone = (id) => savePlan(plan.map((row) => (row.id === id ? { ...row, done: !row.done } : row)));
  const removeTask = (id) => savePlan(plan.filter((row) => row.id !== id));

  const getFilteredUpcoming = useCallback((baseIsoDate, maxDays) => {
    return allEvents.filter((item) => {
      if (!item || item.done) return false;
      const dueDate = item.dueDate || item.date;
      if (!dueDate) return false;
      const rule = inferRuleFromTitle(item.title);
      if (interestType !== 'todos' && rule !== interestType) return false;
      const diff = daysBetween(baseIsoDate, dueDate);
      return diff >= 0 && diff <= Number(maxDays || 7);
    });
  }, [allEvents, interestType]);

  const maybeBrowserAlerts = useCallback((opts = {}) => {
    const silent = Boolean(opts.silent);
    if (!alerts.enabledBrowser) {
      if (!silent) setStatus('Activa primero las alertas del navegador.');
      return;
    }
    if (!('Notification' in window)) {
      if (!silent) setStatus('Este navegador no soporta notificaciones.');
      return;
    }
    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const upcoming = getFilteredUpcoming(todayIso, alerts.daysBefore || 7);

    const fire = () => {
      if (!upcoming.length) {
        if (!silent) setStatus('No hay vencimientos proximos para alertar.');
        return;
      }
      upcoming.slice(0, 3).forEach((item) => {
        const dueDate = item.dueDate || item.date;
        new Notification(`Alerta tributaria by ${profile.companyName || 'Oasis'}`, {
          body: `${item.title} vence el ${dueDate}`,
        });
      });
      const updated = { ...alerts, lastCheckDate: todayIso };
      saveAlerts(updated);
      if (!silent) setStatus(`Alertas emitidas para ${upcoming.length} vencimiento(s).`);
    };

    if (Notification.permission === 'granted') {
      fire();
      return;
    }
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') fire();
      else if (!silent) setStatus('Permiso de notificaciones denegado.');
    });
  }, [alerts, getFilteredUpcoming, profile.companyName]);

  const sendUpcomingToNotifications = useCallback(async (opts = {}) => {
    const silent = Boolean(opts.silent);
    if (isStoreScope) {
      if (!silent) setStatus('Esta accion requiere rol admin.');
      return;
    }
    const now = new Date();
    const isoNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const upcoming = getFilteredUpcoming(isoNow, alerts.daysBefore || 7);
    if (!upcoming.length) {
      if (!silent) setStatus('No hay vencimientos proximos para enviar a Notificaciones.');
      return;
    }

    try {
      const title = `Alerta tributaria by ${profile.companyName || 'Oasis'} (${upcoming.length})`;
      const header = profile.alertEmail ? `Email vinculado: ${profile.alertEmail}` : `Tienda: ${storeSlug || 'global'}`;
      const body = `${header} | ${upcoming.slice(0, 6).map((item) => `${item.title}: ${item.dueDate || item.date}`).join(' | ')}`;
      const create = await fetch(`${api}/api/ops/notifications/campaigns`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          type: 'info',
          audienceType: 'all',
          sendEmail: true,
        }),
      });
      const createData = await create.json();
      if (!createData?.ok || !createData?.campaign?.id) {
        throw new Error(createData?.error || 'No se pudo crear campana.');
      }
      const send = await fetch(`${api}/api/ops/notifications/campaigns/${createData.campaign.id}/send`, {
        method: 'POST',
        credentials: 'include',
      });
      const sendData = await send.json();
      if (!sendData?.ok) {
        throw new Error(sendData?.error || 'No se pudo enviar campana.');
      }
      if (!silent) setStatus(`Campana enviada. Entregas nuevas: ${sendData?.result?.newDeliveries || 0}.`);
    } catch (error) {
      if (!silent) setStatus(error?.message || 'Error enviando a Notificaciones.');
    }
  }, [alerts.daysBefore, api, getFilteredUpcoming, isStoreScope, profile.alertEmail, profile.companyName, storeSlug]);

  const runServerAutomations = useCallback(async () => {
    if (isStoreScope) return;
    try {
      await fetch(`${api}/api/ops/notifications/run-automations`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // endpoint opcional en algunos entornos
    }
  }, [api, isStoreScope]);

  const runReminderAutomation = useCallback(async (opts = {}) => {
    const force = Boolean(opts.force);
    const now = Date.now();
    const lastRunAt = automation.lastRunAt ? new Date(automation.lastRunAt).getTime() : 0;
    const cadenceMs = Number(automation.cadenceHours || 12) * 60 * 60 * 1000;
    if (!force && (Number.isNaN(lastRunAt) ? false : now - lastRunAt < cadenceMs)) return;

    maybeBrowserAlerts({ silent: true });
    await sendUpcomingToNotifications({ silent: true });
    await runServerAutomations();
    saveAutomation({ ...automation, lastRunAt: new Date(now).toISOString() });
    if (force) setStatus('Recordatorios ejecutados correctamente.');
  }, [automation, maybeBrowserAlerts, runServerAutomations, sendUpcomingToNotifications]);

  const openInGoogleCalendar = (item) => {
    const url = buildGoogleCalendarUrl(item);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDateClick = (isoDate) => {
    setSelectedDate(isoDate);
  };

  const enableAllAlerts = async () => {
    saveAlerts({ ...alerts, enabledBrowser: true });
    saveAutomation({ ...automation, enabled: true });
    await runReminderAutomation({ force: true });
    setStatus(`Alertas activadas automaticamente para ${interestType === 'todos' ? 'todos los intereses' : interestType}. Recordatorios activos para ${profile.alertEmail || 'tiendas registradas'}.`);
  };

  useEffect(() => {
    if (!alerts.enabledBrowser) return;
    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (alerts.lastCheckDate === todayIso) return;
    maybeBrowserAlerts();
  }, [alerts.enabledBrowser, alerts.lastCheckDate, maybeBrowserAlerts]);

  useEffect(() => {
    if (!automation.enabled) return;
    runReminderAutomation({ force: false });
    const timer = window.setInterval(() => {
      runReminderAutomation({ force: false });
    }, 60000);
    return () => window.clearInterval(timer);
  }, [automation.enabled, runReminderAutomation]);

  useEffect(() => {
    if (!monthOptions.includes(month)) {
      setMonth(getCurrentMonthKey());
    }
  }, [month, monthOptions]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = getCurrentMonthKey();
      setMonth(current);
    }, 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const cells = useMemo(() => monthGrid(month), [month]);

  return (
    <div className='containerGrid'>
      <Header />
      <section className='containerSection'>
        <HeaderDash />
        <div className='container tributarioPage'>
          <header className='tributarioHero'>
            <img src={BANNER_SRC} alt='Calendario tributario 2026' />
            <div className='tributarioHeroOverlay'>
              <p>OPERACION TRIBUTARIA</p>
              <h1>Calendario Tributario 2026</h1>
            </div>
          </header>

          <section className='tributarioCard tributarioQuickConfig'>
            <h3>Configuracion de alertas by Oasis</h3>
            <div className='tributarioFormGrid'>
              <label>Nombre empresa
                <input
                  value={profile.companyName}
                  onChange={(e) => saveProfile({ ...profile, companyName: e.target.value })}
                  placeholder='Ej: Oasis'
                />
              </label>
              <label>Correo para recordatorios
                <input
                  type='email'
                  value={profile.alertEmail}
                  onChange={(e) => saveProfile({ ...profile, alertEmail: e.target.value })}
                  placeholder='alertas@empresa.com'
                />
              </label>
            </div>
            <p>Las notificaciones email se enviaran desde campanas a tiendas registradas. Correo vinculado: <b>{profile.alertEmail || 'no configurado'}</b>.</p>
          </section>

          <section className='tributarioKpis'>
            <article><strong>{kpis.planned}</strong><span>Vencimientos planificados</span></article>
            <article><strong>{kpis.upcoming}</strong><span>Proximos ({alerts.daysBefore} dias)</span></article>
            <article><strong>{kpis.overdue}</strong><span>Vencidos pendientes</span></article>
            <article><strong>{kpis.doneRate}%</strong><span>Cumplimiento del plan</span></article>
          </section>

          <section className='tributarioGrid'>
            <article className='tributarioCard'>
              <h3>Calendario mensual interactivo</h3>
              <div className='tributarioMonthToolbar'>
                <select value={month} onChange={(e) => setMonth(e.target.value)}>
                  {monthOptions.map((key) => <option key={key} value={key}>{monthLabel(key)}</option>)}
                </select>
                <span>{monthEvents.length} eventos en este mes</span>
              </div>
              <div className='tributarioCalendar'>
                {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map((d) => <i key={d}>{d}</i>)}
                {cells.map((day, idx) => {
                  if (!day) return <div key={`empty_${idx}`} className='calendarEmpty' />;
                  const iso = `${month}-${String(day).padStart(2, '0')}`;
                  const rows = eventsByDate.get(iso) || [];
                  const isToday = iso === todayIso;
                  return (
                    <button key={iso} type='button' className={`cell ${isToday ? 'today' : ''} ${selectedDate === iso ? 'selected' : ''}`} onClick={() => handleDateClick(iso)}>
                      <strong>{day}</strong>
                      {rows.slice(0, 1).map((row) => (
                        <span key={`${row.id}_${row.title}`} className={row.source === 'pdf' ? 'pdf' : 'manual'}>
                          {row.title}
                        </span>
                      ))}
                      {rows.length > 1 ? <small>+{rows.length - 1} mas</small> : null}
                    </button>
                  );
                })}
              </div>
              <div className='tributarioDateActions'>
                <p><b>Fecha seleccionada:</b> {selectedDate || 'sin seleccionar'}</p>
                {!!selectedDateEvents.length && <p>{selectedDateEvents[0].title}</p>}
              </div>
            </article>

            <article className='tributarioCard'>
              <h3>Graficas de carga tributaria</h3>
              <div className='tributarioBars'>
                {monthBars.map((row) => (
                  <div key={row.key} className='barRow'>
                    <span>{MONTH_LABEL[row.key] || row.key}</span>
                    <div><b style={{ width: `${row.width}%` }} /></div>
                    <strong>{row.count}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className='tributarioCard'>
              <h3>Reglas oficiales estructuradas</h3>
              <ul>{PDF_SUMMARY_NOTES.map((line) => <li key={line}>{line}</li>)}</ul>
              <h4>Renta - Grandes contribuyentes (NIT)</h4>
              <div className='tributarioTableWrap'>
                <table className='tributarioTable'>
                  <thead>
                    <tr><th>Cuota</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th><th>0</th></tr>
                  </thead>
                  <tbody>
                    {GRANDES_CUOTAS.map((q) => (
                      <tr key={q.label}>
                        <td>{q.label}</td>
                        <td>{q.byNit[1]}</td><td>{q.byNit[2]}</td><td>{q.byNit[3]}</td><td>{q.byNit[4]}</td><td>{q.byNit[5]}</td>
                        <td>{q.byNit[6]}</td><td>{q.byNit[7]}</td><td>{q.byNit[8]}</td><td>{q.byNit[9]}</td><td>{q.byNit[0]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className='tributarioCard'>
              <h3>Alertas automaticas</h3>
              <div className='tributarioAlerts'>
                <label>
                  Interes tributario
                  <select value={interestType} onChange={(e) => setInterestType(e.target.value)}>
                    <option value='todos'>Todos</option>
                    <option value='renta'>Renta</option>
                    <option value='iva'>IVA / Consumo</option>
                    <option value='patrimonio'>Patrimonio</option>
                    <option value='retencion'>Retencion</option>
                    <option value='rst'>RST</option>
                  </select>
                </label>
                <button type='button' onClick={enableAllAlerts}>Activar todas las alertas</button>
                <p className='tributarioHint'>Se activan recordatorios de navegador + envio a notificaciones/email segun fechas del calendario y el interes seleccionado.</p>
                <span className='tributarioMeta'>Ultima automatizacion: {automation.lastRunAt ? new Date(automation.lastRunAt).toLocaleString('es-CO') : 'sin ejecucion'}</span>
              </div>
              <h4>Guia de cumplimiento del mes</h4>
              {!guideRows.length ? <p>No hay eventos para este filtro en {monthLabel(month)}.</p> : null}
              <div className='tributarioGuide'>
                {guideRows.map((item) => (
                  <article key={`${item.id}_${item.date}`} className='guideRow'>
                    <strong>{item.date}</strong>
                    <p>{item.title}</p>
                    <small>{item.action}</small>
                  </article>
                ))}
              </div>
              {status ? <p className='tributarioStatus'>{status}</p> : null}
            </article>
          </section>

          <section className='tributarioCard'>
            <h3>Mi plan tributario</h3>
            {!plan.length ? <p>No hay vencimientos personalizados aun.</p> : null}
            <div className='tributarioTasks'>
              {plan
                .slice()
                .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
                .map((item) => (
                  <article key={item.id} className={`task ${item.done ? 'done' : ''}`}>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.dueDate} | {item.contributorType} | {item.source}</span>
                      {item.note ? <p>{item.note}</p> : null}
                    </div>
                    <div className='taskActions'>
                      <button type='button' onClick={() => markDone(item.id)}>{item.done ? 'Reabrir' : 'Pagado'}</button>
                      <button type='button' className='secondary' onClick={() => openInGoogleCalendar(item)}>Google</button>
                      <button type='button' className='secondary' onClick={() => downloadFile(`vencimiento-${item.id}.ics`, buildIcs([item]), 'text/calendar;charset=utf-8')}>ICS</button>
                      <button type='button' className='danger' onClick={() => removeTask(item.id)}>Eliminar</button>
                    </div>
                  </article>
                ))}
            </div>
          </section>

          <section className='tributarioCard'>
            <h3>Cumplimiento mensual</h3>
            {!monthlyCompliance.length ? <p>Agrega vencimientos para visualizar cumplimiento por mes.</p> : null}
            <div className='complianceRows'>
              {monthlyCompliance.map((row) => (
                <article key={row.month} className='complianceRow'>
                  <div>
                    <strong>{MONTH_LABEL[row.month] || row.month}</strong>
                    <span>Total: {row.total} | Pagados: {row.done} | Pendientes: {row.pending} | Vencidos: {row.overdue}</span>
                  </div>
                  <div className='complianceBar'>
                    <b style={{ width: `${row.completionRate}%` }} />
                  </div>
                  <strong>{row.completionRate}%</strong>
                </article>
              ))}
            </div>
          </section>

        </div>
      </section>
    </div>
  );
}

