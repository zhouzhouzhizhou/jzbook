// Service Worker — 店铺记账本
// 缓存策略: Stale-While-Revalidate（先返回缓存，后台更新）

const CACHE_NAME = 'ledger-v1';

const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// ── Install: 预缓存核心文件 ──────────────────────────────────
self.addEventListener('install', event => {
  console.log('🔧 SW: installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('SW: cache.addAll 部分失败（可能离线安装）', err);
      });
    })
  );
  // 立即激活，不等待旧 SW
  self.skipWaiting();
});

// ── Activate: 清理旧版本缓存 ─────────────────────────────────
self.addEventListener('activate', event => {
  console.log('✅ SW: activated');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    })
  );
  // 立即接管所有页面
  self.clients.claim();
});

// ── Fetch: Stale-While-Revalidate ────────────────────────────
self.addEventListener('fetch', event => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;

  // 跳过 chrome-extension 等非 http(s) 请求
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      // 后台发起网络请求更新缓存
      const fetchPromise = fetch(event.request).then(response => {
        // 只缓存成功的响应
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        // 网络失败，如果有缓存就用缓存
        return cached || new Response('离线状态下该资源未缓存', { status: 503 });
      });

      // 优先返回缓存，没有缓存则等待网络
      return cached || fetchPromise;
    })
  );
});
