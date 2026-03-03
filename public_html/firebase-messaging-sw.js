importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAvPmRTqdUWohOnEsrEqR_hNhhKL25Bnx4',
  authDomain: 'notificaciones-f1eb9.firebaseapp.com',
  projectId: 'notificaciones-f1eb9',
  storageBucket: 'notificaciones-f1eb9.firebasestorage.app',
  messagingSenderId: '94043009798',
  appId: '1:94043009798:web:627198a86c67b3b3a26487',
  measurementId: 'G-5CWNE8Y342',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = data.title || notification.title || 'Sanate - Nueva orden';
  const body = data.body || notification.body || 'Tienes un nuevo pedido.';
  const icon = data.icon || notification.icon || '/logo192.png';
  const url = data.url || '/dashboard/pedidos';

  self.registration.showNotification(title, {
    body,
    icon,
    data: { url },
  });
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/dashboard/pedidos';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return null;
    })
  );
});

