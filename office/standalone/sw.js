/* Zuchera offline cache: the app files and 3D models are saved on first visit, so the office opens with no internet. Live data (sign-in, chat) still needs a connection to your server. */
const V='zuchera-v23',SHELL=['./','index.html','config.js','shim.js','manifest.webmanifest','icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==location.origin)return;
 e.respondWith(caches.match(r).then(h=>h||fetch(r).then(n=>{if(n.ok&&/\.(js|glb|gltf|png|jpg|svg|json|webmanifest|html|bin|ktx2)$|\/$/.test(u.pathname)){const c=n.clone();caches.open(V).then(x=>x.put(r,c))}return n}).catch(()=>caches.match('index.html'))))});
