// Service Worker para notificações e suporte offline
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open('radio-gospel-v1').then(cache => {
            return cache.addAll([
                '/',
                '/index.html',
                'https://i.imgur.com/JNZF5Bw.jpg'
            ]);
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});

self.addEventListener('push', event => {
    const data = event.data.json();
    const options = {
        body: data.body || 'Nova música tocando na Rádio Gospel',
        icon: 'https://i.imgur.com/JNZF5Bw.jpg',
        badge: 'https://i.imgur.com/JNZF5Bw.jpg',
        vibrate: [200, 100, 200]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'Rádio Gospel', options)
    );
});
