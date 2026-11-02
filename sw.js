// 최우영수산 후불앱 서비스워커
// - 한 번 연 뒤에는 기기에 저장된 화면·사진으로 바로 열리고(느린 폰·느린 인터넷에서도 빠름),
//   뒤에서 조용히 최신 파일을 받아 다음에 열 때 반영합니다.
// - 이 CACHE_NAME 값이 바뀌면(새 버전 배포) 앱이 스스로 알아채고 새로고침합니다. index.html의 APP_VERSION과 같아야 합니다.
const CACHE_NAME = 'cwy-susan-v47';
const CORE = ['./', 'index.html', 'manifest.json', 'icon-192.png'];
const CDN_HOSTS = ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then((c) => Promise.all(CORE.map((u) => c.add(new Request(u, {cache: 'reload'})).catch(() => {})))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function staleWhileRevalidate(e, req, key) {
  const net = fetch(req).then((res) => {
    if (res && (res.ok || res.type === 'opaque')) {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((c) => c.put(key || req, copy));
    }
    return res;
  });
  e.waitUntil(net.catch(() => {}));
  return caches.match(key || req).then((hit) => hit || net);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    if (url.pathname.endsWith('/sw.js')) return; // 버전 확인용은 항상 서버에서
    if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')) {
      // 주소 뒤 ?table=3 같은 값과 상관없이 같은 화면 파일을 사용
      e.respondWith(staleWhileRevalidate(e, req, new Request(new URL('index.html', self.registration.scope))));
      return;
    }
    e.respondWith(staleWhileRevalidate(e, req));
    return;
  }

  if (CDN_HOSTS.includes(url.hostname)) {
    e.respondWith(staleWhileRevalidate(e, req));
  }
  // Firebase 실시간 데이터·번역 등 나머지는 그대로 인터넷으로
});
