/* V60 desktop-only audio-focus hold experiment. */
(()=>{'use strict';if(!/^\/desktop\/?$/.test(location.pathname))return;
let ctx=null,osc=null,gain=null,holding=false,timer=0;
function ensure(){if(ctx)return true;try{ctx=new (window.AudioContext||window.webkitAudioContext)();osc=ctx.createOscillator();gain=ctx.createGain();osc.frequency.value=30;gain.gain.value=0.00001;osc.connect(gain).connect(ctx.destination);osc.start();return true}catch{return false}}
function hold(ms=1800){if(!ensure())return;clearTimeout(timer);holding=true;ctx.resume?.();gain.gain.setValueAtTime(0.00001,ctx.currentTime);timer=setTimeout(()=>{holding=false;gain.gain.setValueAtTime(0,ctx.currentTime)},ms)}
function release(){if(!ctx)return;clearTimeout(timer);holding=false;gain.gain.setValueAtTime(0,ctx.currentTime)}
window.addEventListener('tesla-music-trackchange',()=>hold(2200));
window.addEventListener('tesla-music-tick',e=>{if(e.detail?.playing&&holding)setTimeout(release,250)});
for(const id of['next','bnext','prev','bprev'])document.addEventListener('click',e=>{if(e.target?.closest?.('#'+id))hold(2500)},true);
document.addEventListener('pointerdown',()=>{if(!ctx)ensure()},{once:true,capture:true});
window.musicAudioHoldV60=Object.freeze({version:60,desktopOnly:true,state:()=>({holding,context:ctx?.state||'none'})});})();
