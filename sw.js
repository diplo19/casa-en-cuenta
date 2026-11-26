const CACHE='casa-en-cuenta-v23';const FILES=['./','./index.html','./styles.css?v=mobile-polish-1','./mobile.css?v=plan-1','./cloud.css?v=budget-warning-1','./supabase-config.js?v=2','./app.js?v=budget-warning-1','./plan.js?v=budget-warning-1','./themes.js?v=1','./manifest.json','./icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('casa-en-cuenta-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;if(e.request.mode==='navigate'){e.respondWith((async()=>{try{const response=await fetch(e.request);if(response.ok){const cache=await caches.open(CACHE);await cache.put(e.request,response.clone())}return response}catch{return await caches.match(e.request)||await caches.match('./index.html')}})());return}e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).catch(()=>caches.match('./index.html'))))});








