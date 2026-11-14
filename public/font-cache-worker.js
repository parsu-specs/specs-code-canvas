const FONT_CACHE = "launchpad-fonts-v1";
const OFFLINE_CACHE = "codecanvas-offline-v3";
const OFFLINE_URL = "/offline.html";
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/pwa/icon-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                (key.startsWith("codecanvas-offline-") && key !== OFFLINE_CACHE) ||
                key.startsWith("codecanvas-branding-"),
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (
    event.request.method === "GET" &&
    event.request.mode === "navigate" &&
    new URL(event.request.url).origin === self.location.origin
  ) {
    event.respondWith(
      fetch(event.request).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error()),
    );
    return;
  }
  if (
    new URL(event.request.url).origin === self.location.origin &&
    new URL(event.request.url).pathname === "/pwa/icon-192.png"
  ) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
    return;
  }
  if (event.request.method !== "GET" || event.request.destination !== "font") return;

  event.respondWith(
    caches.open(FONT_CACHE).then(async (cache) => {
      const cachedFont = await cache.match(event.request);
      if (cachedFont) return cachedFont;

      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    }),
  );
});
