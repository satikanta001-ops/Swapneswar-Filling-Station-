// Network-first service worker: always tries to fetch the latest version
// first, and only serves the saved copy if there's genuinely no internet.
// This means updates to the app show up immediately on next load — no more
// manually clearing site data to see changes.
// It does NOT cache Firestore/Auth data — that always goes live to Firebase.
const CACHE_NAME = 'swapneswar-app-shell-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept Firebase/Firestore/Auth traffic — always go to the network.
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('firebaseio.com') || url.hostname.includes('firebaseapp.com')) {
    return;
  }
  if (event.request.method !== 'GET') return;

  // Network-first: always try to get the freshest copy. Only fall back to
  // the saved one if the network request genuinely fails (offline).
  event.respondWith(
    fetch(event.request, {cache: 'no-store'}).then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});
