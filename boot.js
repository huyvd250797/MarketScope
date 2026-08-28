/* ============================================================================
   🛡️ V15.0.72 · BOOT GUARD — "không bao giờ mở lại giao diện cũ"
   Chạy TRƯỚC app.js. Ba lớp bảo vệ, độc lập nhau:
     1) Đăng ký Service Worker với updateViaCache:'none' → file sw.js luôn được
        tải mới, không bị bộ nhớ đệm HTTP của iOS giữ lại bản cũ.
     2) Đối chiếu số hiệu bản dựng (build) của trang đang mở với build.json trên
        máy chủ (no-store). Lệch nhau = trang này là bản CŨ → xoá sạch cache,
        gỡ Service Worker và nạp lại đúng MỘT lần.
     3) Nghe tín hiệu từ Service Worker mới kích hoạt → nạp lại ngay.
   Toàn bộ đều có khoá chống lặp vô hạn (sessionStorage), không đụng dữ liệu.
   ========================================================================== */
(function(){
  var BUILD='15.0.72';
  var RELOAD_FLAG='mybReloadGuard_v1';
  window.MYB_BUILD=BUILD;
  try{document.documentElement.setAttribute('data-myb-build',BUILD)}catch(e){}

  /* --------------------------------------------------------------------------
     🌗 V15.0.72 · THEME BOOTSTRAP — chọn đúng sáng/tối TRƯỚC khi vẽ khung hình
     đầu tiên. boot.js nằm trong <head> và chạy đồng bộ, nên màn hình chờ
     (splash) và màn hình loading không bao giờ loé sáng rồi mới đổi sang tối.
     Ba chế độ: 'auto' (theo hệ điều hành) · 'light' · 'dark'.
     Người dùng chưa từng chọn → 'auto' = đúng ý "app tự biết máy đang tối hay sáng".
     Chỉ ĐỌC localStorage, không ghi, không đụng dữ liệu của bé.
     ------------------------------------------------------------------------ */
  var DB_KEY='meYeuBePWA_v4';
  var THEME_LIGHT='#f8b8c8', THEME_DARK='#1b1216';

  function sysDark(){
    try{return !!(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)}catch(e){return false}
  }
  /* Chế độ người dùng đã chọn. Bản cũ chỉ có settings.theme ('' | 'dark');
     '' vừa là "sáng" vừa là "chưa từng chọn" → quy về 'auto' cho đúng mong đợi. */
  function readMode(){
    var s=null;
    try{var db=JSON.parse(localStorage.getItem(DB_KEY)||'null');s=(db&&db.settings)||null}catch(e){}
    if(!s)return 'auto';
    var mode=s.themeMode;
    if(mode==='light'||mode==='dark'||mode==='auto')return mode;
    return (s.theme==='dark')?'dark':'auto';
  }
  function resolve(mode){
    if(mode==='dark')return 'dark';
    if(mode==='light')return '';
    return sysDark()?'dark':'';
  }
  function apply(){
    var mode=readMode(), theme=resolve(mode);
    try{
      var el=document.documentElement;
      el.setAttribute('data-theme',theme);
      el.setAttribute('data-theme-mode',mode);
    }catch(e){}
    try{
      var meta=document.querySelector('meta[name="theme-color"]');
      if(meta)meta.setAttribute('content',theme==='dark'?THEME_DARK:THEME_LIGHT);
    }catch(e){}
    return theme;
  }
  window.mybThemeApply=apply;
  window.mybThemeMode=readMode;
  window.mybThemeSystemDark=sysDark;
  apply();

  /* Đang ở 'auto' mà người dùng bật/tắt Dark Mode của máy → đổi theo ngay */
  try{
    var mq=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)');
    if(mq){
      var onChange=function(){if(readMode()==='auto')apply()};
      if(mq.addEventListener)mq.addEventListener('change',onChange);
      else if(mq.addListener)mq.addListener(onChange);
    }
  }catch(e){}


  var LAST_USER_TOUCH=0, PENDING_RELOAD='';
  function markUserActive(){LAST_USER_TOUCH=Date.now()}
  try{
    ['pointerdown','touchstart','mousedown','keydown','click'].forEach(function(ev){
      window.addEventListener(ev,markUserActive,{capture:true,passive:true});
    });
  }catch(e){}
  function uiBusy(){
    try{
      var b=document.body;
      if(Date.now()-LAST_USER_TOUCH<4500)return true;
      if(b&&(b.classList.contains('careModalOpen')||b.classList.contains('menuOpen')||b.classList.contains('mybScrollLock')||b.classList.contains('mybBottomSheetLock')))return true;
      if(document.querySelector('.show[class*="Overlay"],.show[class*="overlay"],.moreSheet.show,.tfOverlay.show,.hb2Modal:not(.hidden)'))return true;
    }catch(e){}
    return false;
  }
  function requestReload(reason){
    if(uiBusy()){
      PENDING_RELOAD=reason||'pending';
      try{console.info('[MYB] defer reload while user is interacting:',PENDING_RELOAD)}catch(e){}
      setTimeout(function(){if(PENDING_RELOAD&&!uiBusy()){var r=PENDING_RELOAD;PENDING_RELOAD='';reloadOnce(r)}},7000);
      return;
    }
    reloadOnce(reason);
  }

  function reloadOnce(reason){
    var now=Date.now(),last=0;
    try{last=Number(sessionStorage.getItem(RELOAD_FLAG)||0)}catch(e){}
    if(now-last<20000)return;                       /* vừa nạp lại xong → thôi */
    try{sessionStorage.setItem(RELOAD_FLAG,String(now))}catch(e){}
    try{console.info('[MYB] reload:',reason)}catch(e){}
    var url=location.href.split('#')[0]
      .replace(/[?&]b=\d+/g,'')          /* bỏ tham số nạp lại của lần trước */
      .replace(/\?&/,'?').replace(/[?&]$/,'');
    url+=(url.indexOf('?')>=0?'&':'?')+'b='+now;
    location.replace(url);
  }

  /* Xoá sạch mọi bộ nhớ đệm của app (không đụng localStorage = dữ liệu của bé) */
  function purge(){
    var jobs=[];
    try{
      if('caches' in window)jobs.push(caches.keys().then(function(keys){
        return Promise.all(keys.map(function(k){return caches.delete(k)}));
      }));
    }catch(e){}
    try{
      if('serviceWorker' in navigator)jobs.push(navigator.serviceWorker.getRegistrations().then(function(rs){
        return Promise.all(rs.map(function(r){return r.unregister()}));
      }));
    }catch(e){}
    return Promise.all(jobs).catch(function(){});
  }
  window.mybPurgeCaches=purge;

  /* ---- Lớp 2: đối chiếu build với máy chủ ---- */
  function checkBuild(){
    if(!window.fetch)return;
    fetch('./build.json?t='+Date.now(),{cache:'no-store'})
      .then(function(r){return r.ok?r.json():null})
      .then(function(j){
        if(!j||!j.build)return;
        if(String(j.build)!==BUILD)purge().then(function(){requestReload('build '+BUILD+' → '+j.build)});
      })
      .catch(function(){});
  }

  /* ---- Lớp 1 + 3: Service Worker ---- */
  function registerSW(){
    if(!('serviceWorker' in navigator))return;
    var opt={scope:'./'};
    try{opt.updateViaCache='none'}catch(e){}
    navigator.serviceWorker.register('./sw.js',opt).then(function(reg){
      window.MYB_SW_REG=reg;
      try{reg.update()}catch(e){}
      setInterval(function(){try{reg.update()}catch(e){}},15*60*1000);
      if(reg.waiting&&reg.waiting.postMessage)reg.waiting.postMessage({type:'MEYEUBE_SKIP_WAITING'});
      reg.addEventListener('updatefound',function(){
        var sw=reg.installing;if(!sw)return;
        sw.addEventListener('statechange',function(){
          if(sw.state==='installed'&&navigator.serviceWorker.controller)sw.postMessage({type:'MEYEUBE_SKIP_WAITING'});
        });
      });
    }).catch(function(){});

    /* Bản mới giành quyền điều khiển → trang đang mở là bản cũ → nạp lại */
    navigator.serviceWorker.addEventListener('controllerchange',function(){requestReload('controllerchange')});

    /* Service Worker hỏi \"bạn đang chạy bản nào?\" → trả lời để nó biết trang này
       có cần bị làm mới không. Trang bản cũ không biết trả lời → SW tự nạp lại hộ. */
    navigator.serviceWorker.addEventListener('message',function(ev){
      var d=(ev&&ev.data)||{};
      if(d.type==='MEYEUBE_BUILD_PING'&&navigator.serviceWorker.controller){
        navigator.serviceWorker.controller.postMessage({type:'MEYEUBE_BUILD_ACK',build:BUILD});
      }
      if(d.type==='MEYEUBE_FORCE_RELOAD')requestReload('sw force');
    });
  }

  registerSW();
  checkBuild();
  /* Mở lại app từ nền (PWA trên iOS hay giữ trang cả tuần) → kiểm tra lại */
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState!=='visible')return;
    try{apply()}catch(e){}
    checkBuild();
    try{if(window.MYB_SW_REG)window.MYB_SW_REG.update()}catch(e){}
  });
  window.addEventListener('pageshow',function(e){if(e&&e.persisted)checkBuild()});
})();
