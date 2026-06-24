// Service Worker — 店铺记账本
// 缓存策略: Stale-While-Revalidate（先返回缓存，后台更新）

const CACHE_NAME = 'ledger-v1';// Service Worker — 店铺记账本 (纯原生，无CDN依赖)

const CACHE_NAME = 'ledger-v4';

const ASSETS = [
  '/jzbook/',
  '/jzbook/index.html',
  '/jzbook/manifest.json'
];

self.addEventListener('install', event => {
  console.log('SW v4: install');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('SW v4: activate');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      // 后台更新
      fetch(event.request).then(resp => {
        if (resp && resp.ok) {
          caches.open(CACHE_NAME).then(c => c.put(event.request, resp));
        }
      }).catch(() => {});
      // 返回缓存或网络
      return cached || fetch(event.request);
    })
  );
});


const ASSETS = [
  '/',// Service Worker — 店铺记账本
// 策略: 安装时预缓存所有核心+CDN资源，确保首次在线访问后完全离线可用

const CACHE_NAME = 'ledger-v3';

// 所有需要缓存的资源
const ALL_ASSETS = [
  // 本站资源
  '/jzbook/',
  '/jzbook/index.html',
  '/jzbook/manifest.json',
  // CDN 库文件（离线必备）
  'https://unpkg.com/dexie@4/dist/dexie.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js',
  'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'
];

// ── Install: 一次性缓存所有资源 ──────────────────────────────
self.addEventListener('install', event => {
  console.log('SW v3: installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // 逐个添加，单个失败不影响整体
      return Promise.allSettled(
        ALL_ASSETS.map(url =>
          cache.add(url).catch(err => {
            console.warn('SW: 缓存失败 ' + url, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// ── Activate: 清旧缓存 ───────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('SW v3: activated');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: 缓存优先 ─────────────────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // 后台更新（静默）
        fetch(event.request).then(resp => {
          if (resp && resp.ok) {
            caches.open(CACHE_NAME).then(c => c.put(event.request, resp));
          }
        }).catch(() => {});
        return cached;
      }

      // 网络请求
      return fetch(event.request).then(resp => {
        // 缓存成功的响应（包括 status:0 的 opaque 响应）
        if (resp && (resp.ok || resp.status === 0)) {
          caches.open(CACHE_NAME).then(c => {
            try { c.put(event.request, resp.clone()); } catch(e) {}
          });
        }
        return resp;
      }).catch(() => {
        return new Response('离线不可用', { status: 503 });
      });
    })
  );
});

  '/index.html',
  '/manifest.json'
];
// Service Worker — 店铺记账本
// 缓存策略: 所有资源首次访问即缓存，离线时从缓存加载

const CACHE_NAME = 'ledger-v2';

// 需要预缓存的资源（安装时立即下载）
const PRECACHE = [
  '/jzbook/',
  '/jzbook/index.html',
  '/jzbook/manifest.json'
];

// CDN 库文件（首次访问后自动缓存）
const CDN_URLS = [
  'https://unpkg.com/dexie@4/dist/dexie.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js',
  'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'
];

// ── Install: 预缓存核心文件 ──────────────────────────────────
self.addEventListener('install', event => {
  console.log('SW: installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE).catch(err => {
        console.warn('SW: 预缓存部分失败', err);
      });
    })
  );
  self.skipWaiting();
});

// ── Activate: 清理旧缓存 ─────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('SW: activated');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ── Fetch: 缓存优先，网络失败用缓存兜底 ───────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // 有缓存：直接返回，后台静默更新
        fetch(event.request).then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, response);
            });
          }
        }).catch(() => {});
        return cached;
      }

      // 无缓存：请求网络并缓存
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(() => {
        // 网络也失败，返回离线页面
        return new Response('离线，此资源未缓存', { status: 503 });
      });
    })
  );
});

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
