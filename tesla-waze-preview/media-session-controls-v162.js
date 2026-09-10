(()=>{
'use strict';
/* TESLA_PARENT_MEDIASESSION_V162
   Own MediaSession on the top-level Tesla Waze page while audio stays in the
   cross-origin Tesla Music iframe. Commands are forwarded exactly once. */
try{
  const P=window.parent;
  if(!P||P===window)return;
  const ms=P.navigator?.mediaSession;
  if(!ms||typeof ms.setActionHandler!=='function')return;
  const MUSIC_ORIGIN='https://tesla-waze-piped.vercel.app';
  let lastAction='',lastActionAt=0,lastTrackKey='';
  const musicFrame=()=>P.document?.getElementById('musicFrame');
  const send=action=>{
    const now=Date.now(),gap=(action==='next'||action==='prev')?650:220;
    if(action===lastAction&&now-lastActionAt<gap)return;
    lastAction=action;lastActionAt=now;
    const f=musicFrame();
    if(!f?.contentWindow)return;
    try{f.contentWindow.postMessage({type:'tesla-music-command',action},MUSIC_ORIGIN)}catch{}
  };
  const bind=(name,action)=>{try{ms.setActionHandler(name,()=>send(action))}catch{}};
  bind('play','play');
  bind('pause','pause');
  bind('nexttrack','next');
  bind('previoustrack','prev');
  try{ms.setActionHandler('stop',()=>send('pause'))}catch{}

  const onMessage=e=>{
    if(e.origin!==MUSIC_ORIGIN||e.data?.type!=='tesla-music-media-state')return;
    const d=e.data,title=String(d.title||'').trim(),artist=String(d.artist||'').trim();
    if(!title)return;
    const key=title+'|'+artist+'|'+String(d.album||'Tesla Music');
    if(key!==lastTrackKey){
      lastTrackKey=key;
      try{
        const MM=P.MediaMetadata||window.MediaMetadata;
        if(MM)ms.metadata=new MM({title,artist:artist||'YouTube',album:String(d.album||'Tesla Music')});
      }catch{}
    }
    try{ms.playbackState=d.playing?'playing':'paused'}catch{}
    if(typeof ms.setPositionState==='function'){
      const duration=Number(d.duration)||0,position=Number(d.position)||0;
      if(duration>0){try{ms.setPositionState({duration,position:Math.max(0,Math.min(position,duration)),playbackRate:1})}catch{}}
    }
  };
  P.addEventListener('message',onMessage);
  P.__teslaParentMediaSessionV162=true;
}catch(e){console.warn('Tesla parent MediaSession unavailable:',e?.message||e)}
})();
