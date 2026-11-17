export const COMPOSITION_SCRIPT = `(function(){
  function start(root){
    if(root.getAttribute('data-autoplay')!=='1')return;
    var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduce)return;
    var frames=Array.prototype.slice.call(root.querySelectorAll('.composition-frame'));
    if(frames.length<2)return;
    var loop=root.getAttribute('data-loop')!=='0';
    var index=0,timer=0;
    function show(i){frames.forEach(function(frame,n){frame.classList.toggle('is-active',n===i);});}
    function tick(){
      if(!loop&&index>=frames.length-1)return;
      index=(index+1)%frames.length;
      show(index);
      timer=setTimeout(tick,Number(frames[index].getAttribute('data-duration'))||400);
    }
    show(0);
    timer=setTimeout(tick,Number(frames[0].getAttribute('data-duration'))||400);
  }
  function boot(){Array.prototype.forEach.call(document.querySelectorAll('[data-composition-animation]'),start);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();`;
