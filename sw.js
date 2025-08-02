// Service Worker para tentar manter a reprodução em background
self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Pode adicionar estratégias de cache aqui se necessário
});
