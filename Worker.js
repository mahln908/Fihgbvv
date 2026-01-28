// Nome do cache
const CACHE_NAME = 'sabor-de-casa-v2';

// Arquivos para cache
const urlsToCache = [
  './',
  './index.html',
  './receita.html',
  './manifest.json',
  './icone-panela-192.png',
  './icone-panela-512.png'
];

// Instalar Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Ativar Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estratégia: Cache First, depois Network
self.addEventListener('fetch', event => {
  // Ignorar requisições para a API do Google Sheets
  if (event.request.url.includes('sheets.googleapis.com')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Retornar do cache se existir
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Se não estiver no cache, buscar da rede
        return fetch(event.request)
          .then(networkResponse => {
            // Não cachear requisições não GET
            if (event.request.method !== 'GET') {
              return networkResponse;
            }
            
            // Verificar se a resposta é válida
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            
            // Clonar a resposta
            const responseToCache = networkResponse.clone();
            
            // Adicionar ao cache
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return networkResponse;
          })
          .catch(error => {
            // Fallback para página offline
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
            
            // Fallback genérico
            return new Response('Conecte-se à internet para ver este conteúdo', {
              status: 503,
              statusText: 'Offline',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Notificações push (opcional)
self.addEventListener('push', event => {
  const options = {
    body: event.data.text(),
    icon: 'icone-panela-192.png',
    badge: 'icone-panela-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('Sabor de Casa', options)
  );
});
