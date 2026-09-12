/* Tesla Music V40: user-initiated start + native YouTube queue for iPhone.
 * No audio extraction, hidden audio, background polling or account dependency.
 * iOS owns the final lock-screen UI; real-device verification remains necessary.
 */
(()=>{
  'use strict';
  if(window.teslaMusicPlaybackV40)return;
  const LAST='teslaMusic:lastTrack:v1';
  const params=new URLSearchParams(location.search);
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const nativeEnabled=ios&&params.get('map')!=='1'&&params.get('embed')!=='1';
  const basePlay=playTrack,baseNext=next,basePrev=prev,baseReady=window.onYouTubeIframeAPIReady;
  let pending=null,pendingTimer=0,installed=false,nativeActive=false,nativeTracks=new Map(),nativeContext='foryou',advancing=false,lastSaved='',lastMetadata='';
  let originalLoad=null,originalCue=null;
  const status=text=>{const e=$('status');if(e)e.textContent=text;};
  function normal(t){
    if(!t)return null;
    const id=String(t.youtubeId||t.id||'').replace(/^(?:youtube:|yt:)/,'');
    if(!/^[A-Za-z0-9_-]{11}$/.test(id))return null;
    return {id,title:String(t.title||'YouTube'),uploader:String(t.uploader||t.artist||'YouTube'),duration:Number(t.duration)||0,thumbnail:String(t.thumbnail||t.artwork||'')};
  }
  function lastTrack(){
    const saved=normal(load(LAST,null));if(saved)return saved;
    const recent=Object.values(profile.tracks||{}).filter(t=>t.lastPlayed).sort((a,b)=>Date.parse(b.lastPlayed)-Date.parse(a.lastPlayed));
    return normal(recent[0]);
  }
  function candidate(){
    if(tab==='foryou'){const last=lastTrack();if(last)return last;}
    for(const list of [items,rows(),queue])for(const t of list||[]){const n=normal(t);if(n)return n;}
    return lastTrack();
  }
  function rememberTrack(t){const n=normal(t);if(!n||lastSaved===n.id)return;save(LAST,n);lastSaved=n.id;}
  function paint(t){
    if(!t)return;
    for(const id of ['now','pcurrent','bname','miniNowTitle']){const e=$(id);if(e)e.textContent=t.title;}
    for(const id of ['bmeta','miniNowSub']){const e=$(id);if(e)e.textContent=t.uploader||'YouTube';}
    if($('sub'))$('sub').textContent=(t.uploader||'YouTube')+' · '+fmt(t.duration);
  }
  function initialHint(){if(!current&&!pending){const t=candidate();if(t)paint(t);}}
  function cancelPending(){pending=null;clearTimeout(pendingTimer);pendingTimer=0;for(const id of ['play','bplay','miniPlay'])$(id)?.removeAttribute('aria-busy');}
  function requestTrack(t){
    t=normal(t);if(!t){status('Najprv vyhľadaj skladbu. Potom ju spustíš priamo tlačidlom ▶.');return;}
    if(!ready||!player){
      pending=t;paint(t);status('Pripravujem prehrávač…');
      for(const id of ['play','bplay','miniPlay'])$(id)?.setAttribute('aria-busy','true');
      clearTimeout(pendingTimer);pendingTimer=setTimeout(()=>{if(pending){cancelPending();status('Prehrávač sa nenačítal. Skontroluj pripojenie a stlač ▶ znova.');}},15000);return;
    }
    cancelPending();installPlayer();basePlay(t);rememberTrack(t);registerMediaActions();
  }
  playTrack=requestTrack;window.playTrack=playTrack;
  function start(){
    if(pending)return;
    if(!current){requestTrack(candidate());return;}
    if(!ready||!player){requestTrack(current);return;}
    installPlayer();player.playVideo();registerMediaActions();
  }
  function pause(){cancelPending();if(ready&&player)player.pauseVideo();}
  toggle=function(){if(pending){cancelPending();status('Spustenie zrušené.');return;}if(current&&ready&&player?.getPlayerState?.()===1)pause();else start();};
  for(const id of ['play','bplay'])if($(id))$(id).onclick=()=>toggle();
  if($('miniPlay'))$('miniPlay').onclick=()=>toggle();
  function contextTracks(which){
    const all=Object.values(profile.tracks||{});
    if(which==='likes')return all.filter(t=>t.liked).sort((a,b)=>score(b)-score(a)).map(item);
    if(which==='recent')return all.filter(t=>t.lastPlayed).sort((a,b)=>Date.parse(b.lastPlayed)-Date.parse(a.lastPlayed)).map(item);
    if(which==='queue')return queue;
    const ranked=all.filter(t=>isAutoMusic(item(t))).sort((a,b)=>score(b)-score(a)).map(item);
    return [...ranked,...queue.filter(isAutoMusic)];
  }
  function makePlaylist(selected){
    const seen=new Set(),tracks=[];
    for(const raw of contextTracks(nativeContext)){
      const t=normal(raw);if(!t||seen.has(t.id)||(!isAutoMusic(t)&&t.id!==selected.id))continue;
      seen.add(t.id);tracks.push(t);
    }
    let index=tracks.findIndex(t=>t.id===selected.id);
    if(index<0){tracks.unshift(selected);index=0;}
    // Keep the selected item in a bounded native queue, including previous tracks.
    const offset=Math.max(0,index-80),list=tracks.slice(offset,offset+200);
    return {list,index:index-offset};
  }
  function loadWithQueue(input,startSeconds=0){
    const id=typeof input==='string'?input:input?.videoId;
    const seconds=Number(typeof input==='object'?input.startSeconds:startSeconds)||0;
    const selected=normal(current?.id===id?current:{id,title:'YouTube'});
    if(!nativeEnabled||!settings.auto||!selected){nativeActive=false;nativeTracks.clear();return originalLoad(input,startSeconds);}
    if(!advancing)nativeContext=tab;
    const {list,index}=makePlaylist(selected);
    if(list.length<2){nativeActive=false;nativeTracks.clear();return originalLoad(input,startSeconds);}
    nativeTracks=new Map(list.map(t=>[t.id,t]));nativeActive=true;
    player.loadPlaylist(list.map(t=>t.id),index,Math.max(0,seconds));
    player.setLoop(false);player.setShuffle(!!settings.shuffle);
  }
  function hasNativeNext(){
    if(!nativeActive)return false;
    try{const list=player.getPlaylist()||[],i=player.getPlaylistIndex();return i>=0&&i+1<list.length;}catch{return false;}
  }
  next=function(manual=true){
    // YouTube advances its native playlist itself. Do not also advance in JS.
    if(!manual&&hasNativeNext())return;
    if(advancing)return;
    advancing=true;
    try{const result=baseNext(manual);if(result?.then)return result.finally(()=>{advancing=false;});advancing=false;return result;}
    catch(e){advancing=false;throw e;}
  };
  prev=function(){if(advancing)return;advancing=true;try{return basePrev();}finally{advancing=false;}};
  for(const id of ['next','bnext'])if($(id))$(id).onclick=()=>next(true);
  for(const id of ['prev','bprev'])if($(id))$(id).onclick=()=>prev();
  function syncNativeTrack(){
    if(!nativeActive||!player)return;
    let id='';try{id=player.getVideoData?.().video_id||'';}catch{}
    if(!id||id===current?.id)return;
    const t=nativeTracks.get(id);if(!t)return;
    current=t;idx=queue.findIndex(x=>key(x)===key(t));started=Date.now();
    ev('play',t);paint(t);now();rememberTrack(t);media();discover(t);
    window.dispatchEvent(new CustomEvent('tesla-music-trackchange',{detail:t}));
  }
  function onState(e){
    if(e.data===1)syncNativeTrack();
    registerMediaActions();media();
  }
  function installPlayer(){
    if(installed||!player||typeof player.loadVideoById!=='function')return;
    installed=true;originalLoad=player.loadVideoById.bind(player);originalCue=player.cueVideoById.bind(player);
    player.loadVideoById=loadWithQueue;
    window.teslaMusicStateV40=onState;
    window.teslaMusicBlockedV40=()=>status('Safari čaká na potvrdenie prehrávania. Stlač ▶ znova.');
    player.addEventListener('onStateChange','teslaMusicStateV40');
    player.addEventListener('onAutoplayBlocked','teslaMusicBlockedV40');
  }
  window.teslaMusicReadyV40=()=>{installPlayer();registerMediaActions();if(pending){const t=pending;cancelPending();requestTrack(t);}else initialHint();};
  window.onYouTubeIframeAPIReady=function(){baseReady();player.addEventListener('onReady','teslaMusicReadyV40');};
  const oldAuto=$('auto')?.onclick;
  if($('auto'))$('auto').onclick=function(e){
    oldAuto?.call(this,e);
    if(nativeActive&&!settings.auto){
      // Disarm the native queue immediately; AUTO off must still stop at the end.
      const state=player.getPlayerState(),seconds=player.getCurrentTime()||0,id=current?.id;
      nativeActive=false;nativeTracks.clear();
      if(id){if(state===1||state===3)originalLoad(id,seconds);else originalCue(id,seconds);}
    }
  };
  const oldShuffle=$('shuffle')?.onclick;
  if($('shuffle'))$('shuffle').onclick=function(e){oldShuffle?.call(this,e);if(nativeActive)player.setShuffle(!!settings.shuffle);};
  function action(name,handler){try{navigator.mediaSession.setActionHandler(name,handler);}catch{}}
  function registerMediaActions(){
    if(!('mediaSession'in navigator))return;
    // These are the parent session handlers. The native playlist additionally
    // enables next/previous INSIDE the cross-origin YouTube media session.
    action('play',start);action('pause',pause);action('stop',pause);
    action('nexttrack',()=>next(true));action('previoustrack',()=>prev());
    action('seekbackward',null);action('seekforward',null);
    action('seekto',d=>{if(ready&&player&&Number.isFinite(d.seekTime))player.seekTo(Math.max(0,d.seekTime),true);});
  }
  media=function(){
    if(!current||!('mediaSession'in navigator))return;
    try{
      const signature=current.id+'|'+current.title;
      if(lastMetadata!==signature){
        const artwork=current.thumbnail?[{src:current.thumbnail}]:[];
        navigator.mediaSession.metadata=new MediaMetadata({title:current.title,artist:current.uploader||'YouTube',album:'Tesla Music',artwork});lastMetadata=signature;
      }
      const state=player?.getPlayerState?.();navigator.mediaSession.playbackState=state===1?'playing':'paused';
      const duration=Number(player?.getDuration?.()),position=Number(player?.getCurrentTime?.());
      if(Number.isFinite(duration)&&duration>0&&Number.isFinite(position))navigator.mediaSession.setPositionState?.({duration,position:Math.max(0,Math.min(duration,position)),playbackRate:1});
    }catch{}
  };
  window.addEventListener('tesla-music-trackchange',e=>{rememberTrack(e.detail);registerMediaActions();media();});
  window.addEventListener('tesla-music-tick',()=>{media();});
  window.addEventListener('tesla-music-profile-reloaded',initialHint);
  document.addEventListener('visibilitychange',()=>{registerMediaActions();media();});
  window.addEventListener('pageshow',()=>{initialHint();registerMediaActions();});
  document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',initialHint));
  window.teslaMusicPlaybackV40=Object.freeze({version:40,start,state:()=>({nativeEnabled,nativeActive,nativeContext,pending:pending?.id||null,current:current?.id||null,playlist:nativeActive?(player?.getPlaylist?.()||[]):[]})});
  registerMediaActions();initialHint();if(ready)window.teslaMusicReadyV40();
})();
