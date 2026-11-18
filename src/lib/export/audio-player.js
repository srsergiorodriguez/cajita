/**
 * Small no-dependency audio player for the exported site. The native audio
 * element remains the source of truth; controls are progressive.
 */
export const AUDIO_PLAYER_SCRIPT = `(function(){
  function init(){
    Array.prototype.forEach.call(document.querySelectorAll('.audio-inner'),function(root){
      var audio=root.querySelector('audio');
      if(!audio)return;
      var button=root.querySelector('[data-audio-toggle]');
      var icon=root.querySelector('[data-audio-icon]');
      var bar=root.querySelector('[data-audio-bar]');
      var fill=bar?bar.querySelector('i'):null;
      var time=root.querySelector('[data-audio-time]');
      function fmt(value){
        if(!isFinite(value))return '0:00';
        var total=Math.max(0,Math.floor(value));
        return Math.floor(total/60)+':'+String(total%60).padStart(2,'0');
      }
      function draw(){
        var duration=audio.duration||0;
        var percent=duration?Math.min(100,(audio.currentTime/duration)*100):0;
        if(fill)fill.style.width=percent+'%';
        if(time)time.textContent=fmt(audio.currentTime)+' / '+fmt(duration);
        if(button)button.setAttribute('aria-label',audio.paused?'reproducir audio':'pausar audio');
        if(icon)icon.textContent=audio.paused?'▶':'❚❚';
      }
      function play(){
        try{
          var result=audio.play();
          if(result&&typeof result.catch==='function')result.catch(function(){});
        }catch(error){}
      }
      function toggle(event){
        event.preventDefault();
        if(audio.paused)play();
        else audio.pause();
      }
      // Safari is stricter with media loaded from data: URLs. The portable
      // export inlines audio; convert it to a Blob URL before playback while
      // keeping the normal relative-file export untouched.
      function useBlobSource(){
        var source=audio.getAttribute('src')||'';
        if(source.indexOf('data:')!==0)return;
        try{
          var comma=source.indexOf(',');
          if(comma<0)return;
          var header=source.slice(5,comma).split(';')[0]||'audio/mpeg';
          var binary=atob(source.slice(comma+1));
          var bytes=new Uint8Array(binary.length);
          for(var i=0;i<binary.length;i+=1)bytes[i]=binary.charCodeAt(i);
          audio.src=URL.createObjectURL(new Blob([bytes],{type:header}));
          audio.load();
        }catch(error){}
      }
      if(button)button.addEventListener('click',toggle);
      audio.addEventListener('play',draw);
      audio.addEventListener('pause',draw);
      audio.addEventListener('timeupdate',draw);
      audio.addEventListener('loadedmetadata',draw);
      audio.addEventListener('ended',draw);
      useBlobSource();
      if(bar)bar.addEventListener('click',function(event){
        if(!audio.duration)return;
        var rect=bar.getBoundingClientRect();
        audio.currentTime=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width))*audio.duration;
      });
      draw();
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();`;
