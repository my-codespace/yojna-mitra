/**
 * sw.js — Yojana Mitra Service Worker
 *
 * Strategy:
 *   - App shell (HTML/CSS/JS):    Cache-first with network fallback
 *   - API responses (/api/*):     Network-first with cache fallback (5-min TTL)
 *   - Google Fonts:               Stale-while-revalidate
 *   - Offline fallback:           Serve cached home page if network unavailable
 *
 * Registration: done in main.jsx on first load.
 */

const CACHE_NAME = "yojana-mitra-v1";
const API_CACHE  = "yojana-api-v1";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
];

// ─── Install — pre-cache app shell ───────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ─── Activate — clean up old caches ──────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch — routing strategy ─────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and browser-extension requests
  if (request.method !== "GET") return;
  if (!url.protocol.startsWith("http")) return;

  // ── API: network-first with 5-min cache fallback ─────
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstWithCache(request, API_CACHE, 300));
    return;
  }

  // ── Google Fonts: stale-while-revalidate ─────────────
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
    return;
  }

  // ── App shell & static assets: cache-first ───────────
  event.respondWith(cacheFirstWithNetworkFallback(request));
});

// ─── Strategy implementations ─────────────────────────────

async function cacheFirstWithNetworkFallback(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline fallback — serve home page for navigation requests
    if (request.mode === "navigate") {
      const fallback = await caches.match("/index.html");
      if (fallback) return fallback;
    }
    return new Response("Offline — please check your connection", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

async function networkFirstWithCache(request, cacheName, ttlSeconds) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      const responseToCache = response.clone();
      // Add cache timestamp header so we can check TTL
      const headers = new Headers(responseToCache.headers);
      headers.append("sw-cache-time", Date.now().toString());
      const cachedResponse = new Response(await responseToCache.blob(), {
        status: responseToCache.status,
        headers,
      });
      cache.put(request, cachedResponse);
    }
    return response;
  } catch {
    // Network failed — try cache
    const cached = await caches.match(request);
    if (cached) {
      const cacheTime = parseInt(cached.headers.get("sw-cache-time") || "0");
      const age = (Date.now() - cacheTime) / 1000;
      if (age < ttlSeconds) return cached;
    }
    return new Response(JSON.stringify({ error: "Offline — cached data unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached || fetchPromise;
}