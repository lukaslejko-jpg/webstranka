/* Tesla Music V40: explicit first Play and official iOS embedded playlists.
 * No autoplay on page load, no audio extraction, no storage migrations.
 */
(()=>{
  'use strict';
  if(window.teslaMusicPlaybackV40)return;
  const query=new URLSearchParams(location.search);
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||
    (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const nativeAllowed=ios&&query.get('map')!=='1'&&query.get('embed')!=='1';
  const valid=t=>!!t&&/^[A-Za-z0-9_-]{11}$/.test(String(t.id||''));
  let pendingPlay=false,pendingAt=0,active=null;
  const status=text=>{const el=$('status');if(el)el.textContent=text;};
  function startupTrack(){
    if(valid(current))return current;
    const visible=(Array.isArray(items)?items:[]).filter(valid);
    if(tab!=='foryou'&&visible.length)return visible[0];
    const recent=Object.values(profile.tracks||{}).filter(x=>x.lastPlayed)
      .sort((a,b)=>(Date.parse(b.lastPlayed)||0)-(Date.parse(a.lastPlayed)||0))
      .map(item).find(valid);
    return recent||visible.find(isAutoMusic)||(Array.isArray(queue)?queue:[]).find(valid)||null;
  }
  function requestPlay(){
    if(!player||!ready){pendingPlay=true;pendingAt=Date.now();status('Pripravujem prehrávač…');return;}
    pendingPlay=false;
    if(!current){const t=startupTrack();if(t){playTrack(t);return;}
      status('Najprv vyhľadaj skladbu. Potom ju spustíš tlačidlom Play.');$('q')?.focus();return;}
    player.playVideo();
  }
  function requestPause(){pendingPlay=false;if(player&&ready)player.pauseVideo();}
  toggle=function(){
    if(pendingPlay){pendingPlay=false;status('Spustenie zrušené.');return;}
    if(player&&ready&&player.getPlayerState()===1)requestPause();else requestPlay();
  };
  $('play').onclick=$('bplay').onclick=toggle;
  function bindActions(){
    if(!navigator.mediaSession)return;
    const actions={play:requestPlay,pause:requestPause,
      nexttrack:()=>next(true),previoustrack:()=>prev(),
      seekbackward:null,seekforward:null,
      seekto:d=>{if(!player||!ready||!Number.isFinite(d.seekTime))return;
        const duration=Number(player.getDuration())||0;
        player.seekTo(Math.max(0,duration?Math.min(d.seekTime,duration):d.seekTime),true);}};
    for(const [action,handler] of Object.entries(actions)){
      try{navigator.mediaSession.setActionHandler(action,handler);}catch{}
    }
  }
  media=function(){
    if(!current||!navigator.mediaSession)return;
    try{
      if(typeof MediaMetadata!=='undefined'){
        const artwork=[];try{if(current.thumbnail){const u=new URL(current.thumbnail,location.href);if(u.protocol==='https:')artwork.push({src:u.href});}}catch{}
        navigator.mediaSession.metadata=new MediaMetadata({title:current.title,
          artist:current.uploader||'YouTube',album:'Tesla Music',artwork});
      }
      navigator.mediaSession.playbackState=player?.getPlayerState?.()===1?'playing':'paused';
    }catch{}
  };
  function playbackList(t){
    const source=window.teslaMusicContextListV40?.()||queue;
    const list=[],seen=new Set();
    for(const x of source||[]){if(!valid(x)||seen.has(x.id))continue;seen.add(x.id);list.push(x);}
    if(!seen.has(t.id))list.unshift(t);
    if(list.length>200){const i=list.findIndex(x=>x.id===t.id),start=Math.max(0,Math.min(i-50,list.length-200));return list.slice(start,start+200);}
    return list;
  }
  function loadTrack(t){
    if(!nativeAllowed||!settings.auto){active=null;return false;}
    const list=playbackList(t);if(list.length<2){active=null;return false;}
    const signature=list.map(x=>x.id).join(',')+'|'+!!settings.shuffle;
    const nativeIds=player.getPlaylist?.()||[];
    if(active?.signature===signature&&nativeIds.includes(t.id)){
      active.pending=t.id;active.pendingAt=Date.now();active.completed=null;
      player.playVideoAt(nativeIds.indexOf(t.id));return true;
    }
    active={list,signature,pending:t.id,pendingAt:Date.now(),completed:null};
    player.loadPlaylist(list.map(x=>x.id),list.findIndex(x=>x.id===t.id),0);
    player.setLoop(false);player.setShuffle(!!settings.shuffle);
    return true;
  }
  function nativeId(){
    try{const id=new URL(player.getVideoUrl()).searchParams.get('v');if(id)return id;}catch{}
    try{return player.getPlaylist()?.[player.getPlaylistIndex()];}catch{return null;}
  }
  function adoptNative(){
    if(!active)return;
    const id=nativeId();
    if(active.pending&&id!==active.pending&&Date.now()-active.pendingAt<15000)return;
    if(id===active.pending)active.pending=null;
    if(!id||current?.id===id)return;
    const t=active.list.find(x=>x.id===id);if(!t)return;
    if(current&&started&&Date.now()-started<15000&&active.completed!==current.id)ev('skip',current);
    current=t;idx=queue.findIndex(x=>x.id===id);started=Date.now();ev('play',t);
    $('now').textContent=t.title;$('sub').textContent=(t.uploader||'YouTube')+' · '+fmt(t.duration);
    $('pcurrent').textContent=t.title;$('bname').textContent=t.title;$('bmeta').textContent=t.uploader||'YouTube';
    now();media();window.dispatchEvent(new CustomEvent('tesla-music-trackchange',{detail:t}));
    discover(t);
  }
  function onState(e){
    if(!active)return false;
    if(e.data===0){
      if(active.pending&&nativeId()!==active.pending&&Date.now()-active.pendingAt<15000)return true;
      const t=current;
      if(t&&active.completed!==t.id){ev('complete',t);active.completed=t.id;}
      if(!settings.auto){requestPause();media();return true;}
      const ids=player.getPlaylist?.()||[],i=player.getPlaylistIndex?.();
      if(i===ids.length-1&&ids.length)next(false);
      media();return true;
    }
    if([1,2,3,5].includes(e.data))adoptNative();
    bindActions();return false;
  }
  function onReady(){
    bindActions();
    if(pendingPlay&&Date.now()-pendingAt<15000&&document.visibilityState!=='hidden')requestPlay();
    else pendingPlay=false;
  }
  function onBlocked(){pendingPlay=false;status('Prehliadač čaká na potvrdenie. Ťukni na Play.');}
  function settingsChanged(){
    if(!active||!current||!player||!ready)return;
    if(!settings.auto){
      const wasPlaying=player.getPlayerState()===1,position=player.getCurrentTime()||0,t=current;
      active=null;
      if(wasPlaying)player.loadVideoById({videoId:t.id,startSeconds:position});
      else player.cueVideoById({videoId:t.id,startSeconds:position});
    }else{player.setShuffle(!!settings.shuffle);active.signature='';}
  }
  $('auto').addEventListener('click',settingsChanged);
  $('shuffle').addEventListener('click',settingsChanged);
  window.addEventListener('tesla-music-trackchange',()=>{bindActions();media();});
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden')pendingPlay=false;
    else{adoptNative();bindActions();media();}
  });
  window.addEventListener('pageshow',()=>{bindActions();media();});
  window.teslaMusicPlaybackV40={loadTrack,onState,onReady,onBlocked,requestPlay,requestPause,
    diagnostics:()=>({version:40,nativeAllowed,nativePlaylist:!!active,pendingPlay,
      playlistSize:active?.list.length||0,currentId:current?.id||null})};
  bindActions();
})();
