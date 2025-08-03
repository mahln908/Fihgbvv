// Service Worker for notifications and offline support
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open('gospel-radio-v1').then(cache => {
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
        body: data.body,
        icon: 'https://i.imgur.com/JNZF5Bw.jpg',
        badge: 'https://i.imgur.com/JNZF5Bw.jpg'
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});
