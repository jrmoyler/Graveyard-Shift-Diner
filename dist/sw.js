const CACHE='f033-game-1';
const SHELL=['./','./index.html','./style.css','./app.js','./sim.js','./phaser.min.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
importScripts('./precache.js');
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll([...SHELL,...self.F033_ASSETS])).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('f033-game-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin||new URL(event.request.url).pathname.endsWith('.zip'))return;
 event.respondWith(caches.match(event.request.url).then(async cached=>{
  if(cached&&event.request.headers.has('range'))return rangedResponse(cached,event.request.headers.get('range'));
  return cached||fetch(event.request).then(response=>{
  if(response.ok&&response.type!=='opaque'){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));}
  return response;
 });}));
});
async function rangedResponse(response,range){
 const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match)return response;
 const bytes=await response.arrayBuffer();let start=match[1]?Number(match[1]):Math.max(0,bytes.byteLength-Number(match[2]));
 let end=match[1]&&match[2]?Math.min(bytes.byteLength-1,Number(match[2])):bytes.byteLength-1;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=bytes.byteLength)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+bytes.byteLength}});
 return new Response(bytes.slice(start,end+1),{status:206,headers:{'Content-Type':response.headers.get('Content-Type')||'application/octet-stream','Content-Range':'bytes '+start+'-'+end+'/'+bytes.byteLength,'Content-Length':String(end-start+1),'Accept-Ranges':'bytes'}});
}
