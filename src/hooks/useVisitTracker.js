import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import baseURL from '../Components/url';

const KEY = 'sanate_visit_session_id';

const getSessionId = () => {
    const saved = localStorage.getItem(KEY);
    if (saved) return saved;
    const created = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(KEY, created);
    return created;
};

export default function useVisitTracker(tipo = 'public') {
    const location = useLocation();

    useEffect(() => {
        const path = `${location.pathname || '/'}${location.search || ''}`;
        if (path.startsWith('/dashboard')) return;

        const sendVisit = () => {
            const payload = {
                sessionId: getSessionId(),
                page: path,
                tipo,
                referrer: document.referrer || '',
            };

            fetch(`${baseURL}/visitasTrack.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true,
            }).catch(() => {});
        };

        sendVisit();
        const heartbeat = setInterval(() => {
            sendVisit();
        }, 60000);

        return () => clearInterval(heartbeat);
    }, [location.pathname, location.search, tipo]);
}
