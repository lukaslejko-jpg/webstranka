(()=>{'use strict';if(!/^\/desktop\/?$/.test(location.pathname))return;
const audio=new Audio('/silence.wav');audio.loop=true;audio.preload='auto';audio.volume=.001;
let bridging=false,lastPlaying=false;
function hold(){bridging=true;audio.play().catch(()=>{})}
function release(){if(!bridging)return;bridging=false;setTimeout(()=>{audio.pause();audio.currentTime=0},500)}
document.addEventListener('pointerdown',()=>{audio.play().then(()=>{audio.pause();audio.currentTime=0}).catch(()=>{})},{once:true,capture:true});
window.addEventListener('tesla-music-trackchange',()=>{hold()});
window.addEventListener('tesla-music-tick',event=>{const playing=!!event.detail?.playing;if(playing&&!lastPlaying)release();lastPlaying=playing});
})();
