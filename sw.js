const CACHE_NAME = 'sabor-de-casa-v2';
const OFFLINE_URL = 'offline.html';

// URLs para cachear
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/receita.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  // Adicione outras páginas e recursos aqui
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
      .catch(error => {
        console.error('❌ Erro ao cachear recursos:', error);
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

// Estratégia: Network First, fallback para cache
self.addEventListener('fetch', event => {
  // Ignorar requisições que não são GET
  if (event.request.method !== 'GET') return;
  
  // Ignorar requisições do Chrome Extensions
  if (event.request.url.startsWith('chrome-extension://')) return;
  
  // Para requisições de API do Google Sheets, sempre buscar na rede
  if (event.request.url.includes('sheets.googleapis.com')) {
    event.respondWith(
      fetch(event.request)
        .catch(error => {
          console.log('❌ Erro na requisição da API:', error);
          return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }
  
  // Para HTML, usar estratégia Network First
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clonar a resposta para cachear
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then(response => response || caches.match('/index.html'));
        })
    );
    return;
  }
  
  // Para outros recursos (CSS, JS, imagens), usar Cache First
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(event.request)
          .then(response => {
            // Verificar se a resposta é válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clonar a resposta para cachear
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Fallback para ícones
            if (event.request.url.includes('.png') || 
                event.request.url.includes('.jpg') ||
                event.request.url.includes('.jpeg')) {
              return caches.match('/icon-192.png');
            }
            
            return new Response('', {
              status: 503,
              statusText: 'Offline'
            });
          });
      })
  );
});

// Sincronizar em background
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    console.log('🔄 Sincronizando dados em background...');
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // Implementar sincronização de dados se necessário
  console.log('✅ Dados sincronizados');
}

// Notificações push
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'Nova receita disponível!',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: [
      {
        action: 'open',
        title: 'Abrir'
      },
      {
        action: 'close',
        title: 'Fechar'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Sabor de Casa', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
