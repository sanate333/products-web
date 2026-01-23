import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: 'AIzaSyAvPmRTqdUWohOnEsrEqR_hNhhKL25Bnx4',
  authDomain: 'notificaciones-f1eb9.firebaseapp.com',
  projectId: 'notificaciones-f1eb9',
  storageBucket: 'notificaciones-f1eb9.firebasestorage.app',
  messagingSenderId: '94043009798',
  appId: '1:94043009798:web:627198a86c67b3b3a26487',
  measurementId: 'G-5CWNE8Y342',
};

const VAPID_KEY = 'BCCQiFWlviEf5sNgBkp8ii71_XwEcF1VGFu6itb4WnYJFGjKyOtgSSM2z9Z6Nv_QZC7eVI5THwt5FKfUAqDTQJg';

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const requestFcmToken = async () => {
  if (!('Notification' in window)) {
    return { ok: false, reason: 'unsupported' };
  }
  if (Notification.permission === 'denied') {
    return { ok: false, reason: 'denied' };
  }
  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { ok: false, reason: 'denied' };
    }
  }
  try {
    const sw = await navigator.serviceWorker.ready;
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: sw });
    if (!token) {
      return { ok: false, reason: 'no_token' };
    }
    return { ok: true, token };
  } catch (error) {
    console.error('FCM getToken error:', error);
    return { ok: false, reason: 'error' };
  }
};

export const onForegroundMessage = (handler) => {
  onMessage(messaging, handler);
};

export const registerFcmToken = async (baseUrl, role = '') => {
  const result = await requestFcmToken();
  if (!result.ok) {
    return result;
  }
  const storedDeviceId = localStorage.getItem('pushDeviceId');
  const deviceId = storedDeviceId || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  if (!storedDeviceId) {
    localStorage.setItem('pushDeviceId', deviceId);
  }
  try {
    await fetch(`${baseUrl}/savePushToken.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: result.token,
        userAgent: navigator.userAgent,
        deviceInfo: navigator.platform || '',
        deviceId,
        role,
      }),
    });
  } catch (error) {
    console.error('Error al guardar token FCM:', error);
  }
  localStorage.setItem('fcmToken', result.token);
  return { ok: true };
};
