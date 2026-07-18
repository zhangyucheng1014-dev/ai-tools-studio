// AI 工具台 Service Worker — 缓存模型和静态资源
const CACHE = "ai-tools-v1";

self.addEventListener("install", (e) => {
  (e as any).waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (e) => {
  (e as any).waitUntil(self.clients.claim());
});

// 缓存所有静态资源（页面 + JS + CSS）
self.addEventListener("fetch", (e: any) => {
  const url = new URL(e.request.url);

  // 不拦截 API 请求
  if (url.pathname.startsWith("/api/")) return;

  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request).then(cached =>
        cached ||
        fetch(e.request).then(res => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        })
      )
    )
  );
});
