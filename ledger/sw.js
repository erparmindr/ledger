// Ledger service worker — caches the app shell for offline use and installability.
// Bump CACHE_NAME whenever files change so returning users get the update
// instead of a stale cached copy.
const CACHE_NAME = "ledger-cache-v57";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./css/styles.css",
  "./js/constants.js",
  "./js/utils.js",
  "./js/store.js",
  "./js/services/storage.js",
  "./js/modals.js",
  "./js/modals/entity-modals.js",
  "./js/components/transaction-row.js",
  "./js/components/custom-dropdown.js",
  "./js/pages/overview.js",
  "./js/pages/register.js",
  "./js/pages/accounts.js",
  "./js/pages/categories.js",
  "./js/pages/people.js",
  "./js/pages/reports.js",
  "./js/pages/recurring.js",
  "./js/pages/settings.js",
  "./js/services/backup.js",
  "./js/services/csv-import.js",
  "./js/services/import-preview.js",
  "./js/app.js"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL);
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(name){ return name !== CACHE_NAME; })
             .map(function(name){ return caches.delete(name); })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

// Network-first for HTML/CSS/JS, cache-first for other assets.
// This ensures updates are always fetched fresh.
self.addEventListener("fetch", function(event){
  if(event.request.method !== "GET") return;
  var url = new URL(event.request.url);
  var isAppShell = event.request.mode === "navigate" ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname === "/";

  if(isAppShell){
    // Network first, fallback to cache
    event.respondWith(
      fetch(event.request).then(function(response){
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, clone); });
        return response;
      }).catch(function(){
        return caches.match(event.request, { ignoreSearch: true });
      })
    );
  } else {
    // Cache first for other assets (icons, fonts, etc.)
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then(function(cached){
        if(cached) return cached;
        return fetch(event.request).catch(function(){
          if(event.request.mode === "navigate"){
            return caches.match("./index.html", { ignoreSearch: true });
          }
        });
      })
    );
  }
});
