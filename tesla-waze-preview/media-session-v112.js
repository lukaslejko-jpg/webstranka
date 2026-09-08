(()=>{
'use strict';
if(!('mediaSession' in navigator)||typeof MediaMetadata==='undefined')return;
let lastKey='';
const parseClock=s=>{const p=String(s||'').trim().split(':').map(Number);if(p.some(n=>!Number.isFinite(n)))return 0;return p.reduce((a,n)=>a*60+n,0)};
function readNow(){
  const root=document.getElementById('musicPlayer'),now=root?.querySelector('.music-now');
  if(!root||!now)return null;
  const title=now.querySelector('.music-title')?.textContent?.trim()||'';
  const sub=now.querySelector('.music-sub')?.textContent?.trim()||'';
  if(!title)return null;
  const parts=sub.split(' · '),artist=(parts[0]||'').trim(),album=(parts.slice(1).join(' · ')||'Tesla Waze').trim();
  const artwork=now.querySelector('.music-art')?.currentSrc||now.querySelector('.music-art')?.src||'';
  const toggle=root.querySelector('[data-ma="toggle"]')?.textContent?.trim().toLowerCase()||'';
  const duration=parseClock(document.getElementById('musicMiniTotal')?.textContent),position=parseClock(document.getElementById('musicMiniNow')?.textContent);
  return {title,artist,album,artwork,playing:toggle==='pauza',duration,position};
}
function sync(){
  try{
    const m=readNow();if(!m)return;
    const key=[m.title,m.artist,m.album,m.artwork].join('|');
    if(key!==lastKey){
      lastKey=key;
      navigator.mediaSession.metadata=new MediaMetadata({title:m.title,artist:m.artist,album:m.album,artwork:m.artwork?[{src:m.artwork}]:[]});
    }
    try{navigator.mediaSession.playbackState=m.playing?'playing':'paused'}catch{}
    if(typeof navigator.mediaSession.setPositionState==='function'&&m.duration>0){
      try{navigator.mediaSession.setPositionState({duration:m.duration,position:Math.min(Math.max(0,m.position),m.duration),playbackRate:1})}catch{}
    }
  }catch{}
}
const player=document.getElementById('musicPlayer');
if(player)new MutationObserver(sync).observe(player,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['src','class']});
setInterval(sync,1500);
document.addEventListener('visibilitychange',sync);
sync();
})();
