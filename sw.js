const CACHE_NAME = "nmtci-cache-v2";
const ASSETS = [
    "/nmtci/",
    "/nmtci/index.html",
    "/nmtci/assets/site/css/chapter.css",
    "/nmtci/assets/site/js/chapter.js",
    "/nmtci/assets/nmtci.jpg",
];

self.addEventListener("install", (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)),
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                }),
            );
        }),
    );
    return self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        }),
    );
});
