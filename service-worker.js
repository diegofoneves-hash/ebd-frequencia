const CACHE_NAME = 'ebd-frequency-v2.1';
const OFFLINE_URL = '/offline.html';

// Recursos para cache
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/api.js',
  '/js/utils.js',
  '/js/ui.js',
  '/js/app.js',
  '/js/charts.js',
  '/js/export.js',
  '/manifest.json',
  // Fontes e ícones
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js'
];

// Instalação
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cacheando recursos');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Ativação
self.addEventListener('activate', event => {
  console.log('[Service Worker] Ativando...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptar requisições
self.addEventListener('fetch', event => {
  // Ignorar requisições não GET
  if (event.request.method !== 'GET') return;
  
  // Para APIs, tentar network first
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache da resposta para uso offline
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Offline: retornar do cache
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Se não tiver no cache, retornar dados padrão
              return new Response(JSON.stringify({
                message: 'Modo offline ativo',
                timestamp: new Date()
              }), {
                headers: { 'Content-Type': 'application/json' }
              });
            });
        })
    );
  } else {
    // Para outros recursos: cache first
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(event.request)
            .then(response => {
              // Não cachear se não for bem-sucedido
              if (!response || response.status !== 200) {
                return response;
              }
              
              // Cachear a resposta
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
              });
              
              return response;
            })
            .catch(() => {
              // Se offline e página não está em cache, mostrar offline page
              if (event.request.mode === 'navigate') {
                return caches.match(OFFLINE_URL);
              }
              return new Response('Offline', { status: 503 });
            });
        })
    );
  }
});

// Sincronização em segundo plano
self.addEventListener('sync', event => {
  if (event.tag === 'sync-attendance') {
    console.log('[Service Worker] Sincronizando dados...');
    event.waitUntil(syncPendingData());
  }
});

async function syncPendingData() {
  // Lógica para sincronizar dados pendentes
  const pending = await getPendingData();
  
  for (const data of pending) {
    try {
      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      await removePendingData(data.id);
      console.log(`Dados ${data.id} sincronizados`);
    } catch (error) {
      console.error(`Erro ao sincronizar ${data.id}:`, error);
    }
  }
}

// Gerenciamento de dados offline
async function getPendingData() {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending'], 'readonly');
    const store = transaction.objectStore('pending');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('EBD_Offline', 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Criar store para dados pendentes
      if (!db.objectStoreNames.contains('pending')) {
        db.createObjectStore('pending', { keyPath: 'id' });
      }
      
      // Criar store para dados locais
      if (!db.objectStoreNames.contains('localData')) {
        db.createObjectStore('localData', { keyPath: 'key' });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}