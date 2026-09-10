(()=>{
'use strict';
try{
  if(window.parent===window)return;
  const top=window.parent;
  const musicFrame=top.document?.getElementById('musicFrame');
  if(!musicFrame||!('mediaSession' in top.navigator))return;
  const MUSIC_ORIGIN='https://tesla-waze-piped.vercel.app';
  let lastState=null,holdUntil=0,lastCommandAt=0;
  const send=action=>{
    const now=Date.now();
    if(now-lastCommandAt<250)return;
    lastCommandAt=now;
    if(action==='next'||action==='prev')holdUntil=now+5000;
    try{musicFrame.contentWindow?.postMessage({type:'tesla-music-command',action},MUSIC_ORIGIN)}catch{}
  };
  const keepPlaying=()=>{
    try{top.navigator.mediaSession.playbackState='playing'}catch{}
  };
  const applyState=d=>{
    if(!d||d.type!=='tesla-music-media-state')return;
    lastState=d;
    try{
      if(typeof top.MediaMetadata==='function'&&d.title){
        top.navigator.mediaSession.metadata=new top.MediaMetadata({
          title:String(d.title||''),
          artist:String(d.artist||'YouTube'),
          album:String(d.album||'Tesla Music')
        });
      }
    }catch{}
    const transitionHold=Date.now()<holdUntil;
    try{top.navigator.mediaSession.playbackState=(d.playing||transitionHold)?'playing':'paused'}catch{}
    if(transitionHold)keepPlaying();
    try{
      const duration=Number(d.duration),position=Number(d.position);
      if(duration>0&&Number.isFinite(position)&&typeof top.navigator.mediaSession.setPositionState==='function'){
        top.navigator.mediaSession.setPositionState({duration,position:Math.min(Math.max(0,position),duration),playbackRate:1});
      }
    }catch{}
  };
  top.addEventListener('message',e=>{
    if(e.origin!==MUSIC_ORIGIN)return;
    applyState(e.data);
  });
  const ms=top.navigator.mediaSession;
  try{ms.setActionHandler('play',()=>{if(lastState?.title)send('play');else send('next')})}catch{}
  try{ms.setActionHandler('pause',()=>send('pause'))}catch{}
  try{ms.setActionHandler('nexttrack',()=>{keepPlaying();send('next')})}catch{}
  try{ms.setActionHandler('previoustrack',()=>{keepPlaying();send('prev')})}catch{}
  try{ms.setActionHandler('seekto',null)}catch{}
  setInterval(()=>{if(Date.now()<holdUntil)keepPlaying()},500);
}catch(e){try{console.warn('Tesla native media bridge unavailable:',e?.message||e)}catch{}}
})();
