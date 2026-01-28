const CACHE_NAME = "nmtci-cache-v8";
const ASSETS = [
    "/nmtci/",
    "/nmtci/index.html",
    "/nmtci/offline.html",
    "/nmtci/assets/site/js/chapter.js",
    "/nmtci/assets/nmtci.jpg",
    "/nmtci/assets/icons/favicon-96x96.png",
    "/nmtci/assets/icons/favicon.svg",
    "/nmtci/chapters.json",
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
    const requestUrl = new URL(event.request.url);

    if (
        requestUrl.origin.includes("fonts.googleapis.com") ||
        requestUrl.origin.includes("fonts.gstatic.com")
    ) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                return (
                    cached ||
                    fetch(event.request).then((networkResponse) => {
                        return caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, networkResponse.clone());
                            return networkResponse;
                        });
                    })
                );
            }),
        );
        return;
    }

    if (requestUrl.pathname.endsWith("chapters.json")) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    return caches.match(event.request);
                }),
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request)
                .then((networkResponse) => {
                    if (
                        networkResponse &&
                        networkResponse.status === 200 &&
                        networkResponse.type === "basic"
                    ) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                })
                .catch((error) => {
                    if (event.request.mode === "navigate") {
                        return caches.match("/nmtci/offline.html");
                    }
                });

            return cachedResponse || fetchPromise;
        }),
    );
});
