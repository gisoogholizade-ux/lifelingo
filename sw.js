const CACHE_NAME='lifelingo-shell-v1';
const APP_SHELL=['./','./index.html','./v66.html','./manifest.webmanifest','./lifelingo-unified.css','./assets/lifelingo-192.png','./assets/lifelingo-icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
async function networkFirst(request){const cache=await caches.open(CACHE_NAME);try{const response=await fetch(request);if(response&&response.ok)cache.put(request,response.clone());return response}catch(_){return(await cache.match(request))||(request.mode==='navigate'?cache.match('./v66.html'):Response.error())}}
async function cacheFirst(request){const cache=await caches.open(CACHE_NAME),cached=await cache.match(request);if(cached)return cached;const response=await fetch(request);if(response&&response.ok)cache.put(request,response.clone());return response}
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;event.respondWith(request.mode==='navigate'?networkFirst(request):cacheFirst(request));});
