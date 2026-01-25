// Nome do cache
const CACHE_NAME = 'sabor-casa-v3';

// URLs para cachear
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/receita.html',
  '/manifest.json'
];

// Instalar Service Worker
self.addEventListener('install', event => {
  console.log('📦 Instalando Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Cache aberto');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Todos os recursos cacheados');
        return self.skipWaiting();
      })
  );
});

// Ativar Service Worker
self.addEventListener('activate', event => {
  console.log('🚀 Ativando Service Worker...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('✅ Service Worker ativado');
      return self.clients.claim();
    })
  );
});

// Estratégia: Network First com fallback para cache
self.addEventListener('fetch', event => {
  // Para requisições da API do Google Sheets, sempre buscar na rede
  if (event.request.url.includes('sheets.googleapis.com')) {
    event.respondWith(
      fetch(event.request)
        .catch(error => {
          console.log('❌ Erro na requisição da API (offline):', error);
          // Retornar mensagem de offline para API
          return new Response(
            JSON.stringify({ 
              error: 'offline',
              message: 'Sem conexão com a internet. É preciso dados móveis ou Wi-Fi.' 
            }),
            { 
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }
  
  // Para outras requisições, usar cache com fallback para rede
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(event.request)
          .then(response => {
            // Não cachear respostas inválidas
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clonar resposta para cachear
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Fallback para páginas HTML
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
            
            // Fallback para outros recursos
            return new Response('Offline - Sem conexão com a internet', {
              status: 503,
              statusText: 'Offline'
            });
          });
      })
  );
});
