/* ============================================================================
   Mẹ Yêu Bé · Service Worker V15.0.72
   Nguyên tắc: MÃ NGUỒN (html/js/css/webmanifest) LUÔN LẤY MỚI TỪ MẠNG.
   Bộ nhớ đệm chỉ là phao cứu sinh khi mất mạng → không bao giờ còn cảnh
   \"mở app ra thấy giao diện của bản cũ\".
   ========================================================================== */
const BUILD='15.0.72';
const CACHE_NAME='meyeube-v'+BUILD;
const ASSETS=['./','./index.html','./boot.js','./app.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./favicon.png'];

/* Tệp mã nguồn: luôn ưu tiên mạng, bỏ qua bộ nhớ đệm HTTP của trình duyệt */
function isCode(req){
  if(req.mode==='navigate')return true;
  const d=req.destination;
  if(d==='document'||d==='script'||d==='style'||d==='manifest')return true;
  return /\.(?:js|css|html|webmanifest|json)(?:\?|$)/i.test(req.url);
}

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c=>Promise.all(
    ASSETS.map(u=>fetch(new Request(u,{cache:'reload'})).then(r=>r&&r.ok?c.put(u,r):null).catch(()=>null))
  )).catch(()=>{}));
});

/* Bản mới kích hoạt: xoá TOÀN BỘ cache cũ, giành quyền điều khiển, rồi hỏi mọi
   tab/PWA đang mở xem chúng chạy bản nào. Tab nào không trả lời (= bản cũ, mã cũ
   không biết giao thức này) hoặc trả lời sai bản → tự nạp lại giúp người dùng. */
const ACKED=new Map();
self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)));
    await self.clients.claim();
    const list=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    list.forEach(c=>{try{c.postMessage({type:'MEYEUBE_BUILD_PING',build:BUILD})}catch(err){}});
    await new Promise(r=>setTimeout(r,2200));
    const fresh=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const c of fresh){
      if(ACKED.get(c.id)===BUILD)continue;           /* đã là bản mới → để yên */
      try{await c.navigate(c.url)}catch(err){
        try{c.postMessage({type:'MEYEUBE_FORCE_RELOAD'})}catch(err2){}
      }
    }
  })());
});

self.addEventListener('message',e=>{
  const d=(e&&e.data)||{};
  if(d.type==='MEYEUBE_SKIP_WAITING')self.skipWaiting();
  if(d.type==='MEYEUBE_BUILD_ACK'&&e.source)ACKED.set(e.source.id,String(d.build||''));
});

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  if(isCode(req)){
    e.respondWith((async()=>{
      try{
        const net=await fetch(req,{cache:'no-store'});
        if(net&&net.ok){const copy=net.clone();caches.open(CACHE_NAME).then(c=>c.put(req,copy)).catch(()=>{});}
        return net;
      }catch(err){
        const hit=await caches.match(req);
        return hit||await caches.match('./index.html')||Response.error();
      }
    })());
    return;
  }
  /* Ảnh, icon, font…: lấy nhanh từ cache rồi âm thầm cập nhật nền */
  e.respondWith((async()=>{
    const hit=await caches.match(req);
    const net=fetch(req).then(r=>{
      if(r&&r.ok){const copy=r.clone();caches.open(CACHE_NAME).then(c=>c.put(req,copy)).catch(()=>{});}
      return r;
    }).catch(()=>null);
    return hit||(await net)||Response.error();
  })());
});


self.addEventListener('push',event=>{
  let payload={};
  try{payload=event.data?event.data.json():{}}catch(e){payload={body:event.data?event.data.text():'Bạn có cảnh báo mới'}}
  const title=payload.title||'Mẹ Yêu Bé';
  const options={
    body:payload.body||'Có cảnh báo mới cần chú ý.',
    icon:payload.icon||'./icon-192.png',
    badge:payload.badge||'./icon-192.png',
    tag:payload.tag||'meyeube-alert',
    renotify:payload.renotify!==false,
    data:{url:payload.url||'./index.html?openAlertCenter=1',ruleId:payload.ruleId||'',eventKey:payload.eventKey||''}
  };
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=(event.notification.data&&event.notification.data.url)||'./index.html?openAlertCenter=1';
  event.waitUntil((async()=>{
    const clientsList=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clientsList){
      if('focus' in client){
        client.postMessage({type:'MEYEUBE_NOTIFICATION_CLICK',data:event.notification.data||{}});
        return client.focus();
      }
    }
    if(self.clients.openWindow)return self.clients.openWindow(url);
  })());
});
