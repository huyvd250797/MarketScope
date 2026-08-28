if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js').catch(function(){ /* offline cache optional */ });
  });
}

(function(){
  var ticking=false;
  function applyCompactHeader(){
    var h=document.querySelector('.appbar');
    if(!h)return;
    h.classList.toggle('compact', (window.scrollY||document.documentElement.scrollTop||0)>36);
  }
  window.addEventListener('scroll',function(){
    if(ticking)return;
    ticking=true;
    requestAnimationFrame(function(){applyCompactHeader();ticking=false;});
  },{passive:true});
  document.addEventListener('DOMContentLoaded',applyCompactHeader);
})();
