(()=>{
  const qs=new URLSearchParams(location.search),MAP=qs.get('map')==='1',EMBED=qs.get('embed')==='1';
  const pw=document.getElementById('playerWindow'),head=document.getElementById('phead'),pmin=document.getElementById('pmin'),pmax=document.getElementById('pmax'),corner=document.getElementById('miniResizeCorner');
  if(!pw||!head)return;
  if(EMBED)document.body.classList.add('music-embed');
  const ORIGIN='https://tesla-waze.vercel.app',FULL_SIZE_KEY='teslaMusic:fullPlayerSize:v1';
  let videoOn=MAP?false:(sessionStorage.getItem('teslaMusic:videoVisible:v1')==='1');
  let drag=null,resize=null,lastSent='',rafMove=0,pendingMiniDx=0,pendingMiniDy=0;
  const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??d}catch{return d}},write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
  let fullSize=read(FULL_SIZE_KEY,{w:720,h:610});
  function isMini(){return pw.classList.contains('mini-recs')}
  function localizeLabels(){const q=document.querySelector('[data-tab="queue"]');if(q&&q.textContent!=='Poradie')q.textContent='Poradie';const s=document.getElementById('sectionTitle');if(s&&s.textContent==='Queue')s.textContent='Poradie'}
  function ensureVideoButton(){if(document.getElementById('videoToggle'))return document.getElementById('videoToggle');const b=document.createElement('button');b.id='videoToggle';b.className='video-toggle';b.type='button';head.insertBefore(b,pmin||pmax||null);b.onclick=e=>{e.preventDefault();e.stopPropagation();if(isMini())return;videoOn=!videoOn;sessionStorage.setItem('teslaMusic:videoVisible:v1',videoOn?'1':'0');syncUi(true)};return b}
  function ensureCloseButton(){if(!EMBED)return null;if(document.getElementById('musicClose'))return document.getElementById('musicClose');const b=document.createElement('button');b.id='musicClose';b.className='iconbtn';b.type='button';b.textContent='×';b.title='Zavrieť hudbu';b.style.fontSize='25px';head.appendChild(b);b.onclick=e=>{e.preventDefault();e.stopPropagation();videoOn=false;applyVideo();try{parent.postMessage({type:'tesla-music-close'},ORIGIN)}catch{}};return b}
  function clampFullSize(w,h){const maxW=Math.max(420,innerWidth-36),maxH=Math.max(360,innerHeight-120);return{w:Math.max(420,Math.min(maxW,Number(w)||720)),h:Math.max(360,Math.min(maxH,Number(h)||610))}}
  function applyFullSize(){if(!EMBED||isMini())return;fullSize=clampFullSize(fullSize.w,fullSize.h);write(FULL_SIZE_KEY,fullSize);pw.style.setProperty('left','auto','important');pw.style.setProperty('right','18px','important');pw.style.setProperty('top','auto','important');pw.style.setProperty('bottom','96px','important');pw.style.setProperty('width',fullSize.w+'px','important');pw.style.setProperty('height',fullSize.h+'px','important')}
  function requestMiniBottomRight(){if(!EMBED||!isMini()||window.parent===window)return;setTimeout(()=>{try{parent.postMessage({type:'tesla-music-move',dx:999999,dy:999999},ORIGIN)}catch{}},0)}
  function applyVideo(){if(isMini())videoOn=false;const off=!videoOn;if(pw.classList.contains('video-off')!==off)pw.classList.toggle('video-off',off);const b=ensureVideoButton();const txt=videoOn?'🎵 Hudba':'🎬 Video';if(b.textContent!==txt)b.textContent=txt;b.title=videoOn?'Skryť video a nechať hudobné ovládanie':'Zobraziť video';b.style.display=isMini()?'none':'';if(MAP&&!videoOn)sessionStorage.removeItem('teslaMusic:videoVisible:v1')}
  function applyMode(){const mini=isMini();document.body.classList.toggle('music-full',EMBED&&!mini);if(EMBED&&mini){const s=pw.style;pw.classList.remove('max');s.setProperty('left','0px','important');s.setProperty('top','0px','important');s.setProperty('width','100%','important');s.setProperty('height','100%','important');s.removeProperty('right');s.removeProperty('bottom')}else if(EMBED&&!mini){pw.classList.remove('max');applyFullSize()}localizeLabels()}
  function notify(force=false){if(!EMBED||window.parent===window)return;const payload={type:'tesla-music-ui-state',mode:isMini()?'mini':'full',video:videoOn},sig=payload.mode+'|'+payload.video;if(!force&&sig===lastSent)return;lastSent=sig;try{parent.postMessage(payload,ORIGIN)}catch{}}
  function syncUi(force=false){applyMode();applyVideo();notify(force)}
  function startup(){if(MAP&&typeof window.teslaMusicSetMini==='function')window.teslaMusicSetMini();if(MAP)videoOn=false;ensureCloseButton();ensureVideoButton();syncUi(true);requestMiniBottomRight()}
  setTimeout(startup,0);setTimeout(startup,350);
  window.teslaMusicSetVideo=v=>{videoOn=!!v;if(isMini())videoOn=false;sessionStorage.setItem('teslaMusic:videoVisible:v1',videoOn?'1':'0');syncUi(true)};
  window.teslaMusicToggleVideo=()=>{if(!isMini())window.teslaMusicSetVideo(!videoOn)};
  window.addEventListener('message',e=>{if(e.origin!==ORIGIN||!e.data||e.data.type!=='tesla-music-command')return;const a=e.data.action;if(a==='mini'){window.teslaMusicSetMini?.();setTimeout(()=>{syncUi(true);requestMiniBottomRight()},0);return}else if(a==='full')window.teslaMusicSetFull?.();else if(a==='video-toggle')window.teslaMusicToggleVideo?.();else if(a==='video-off')videoOn=false;else if(a==='video-on'&&!isMini())videoOn=true;setTimeout(()=>syncUi(true),0)});
  if(EMBED&&pmax){pmax.onclick=e=>{e.preventDefault();e.stopPropagation();if(isMini())window.teslaMusicSetFull?.();else window.teslaMusicSetMini?.();setTimeout(()=>{syncUi(true);if(isMini())requestMiniBottomRight()},0)}}
  if(pmin)pmin.addEventListener('click',()=>setTimeout(()=>{syncUi(true);requestMiniBottomRight()},0),false);
  function flushMiniResize(){rafMove=0;const dx=pendingMiniDx,dy=pendingMiniDy;pendingMiniDx=0;pendingMiniDy=0;if(!dx&&!dy)return;try{parent.postMessage({type:'tesla-music-resize',anchor:'tl',dx,dy},ORIGIN)}catch{}}
  if(EMBED){
    head.addEventListener('pointerdown',e=>{if(!isMini()||e.target.closest('button,input')||e.button!==0)return;e.preventDefault();e.stopImmediatePropagation();drag={id:e.pointerId,x:e.clientX,y:e.clientY};head.setPointerCapture?.(e.pointerId)},true);
    head.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;try{parent.postMessage({type:'tesla-music-move',dx,dy},ORIGIN)}catch{}},true);
    head.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();drag=null},true);
    if(corner){corner.addEventListener('pointerdown',e=>{e.preventDefault();e.stopImmediatePropagation();const r=pw.getBoundingClientRect();resize={id:e.pointerId,x:e.clientX,y:e.clientY,w:r.width,h:r.height,mini:isMini()};corner.setPointerCapture?.(e.pointerId)},true);corner.addEventListener('pointermove',e=>{if(!resize||resize.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const dx=e.clientX-resize.x,dy=e.clientY-resize.y;if(resize.mini){resize.x=e.clientX;resize.y=e.clientY;pendingMiniDx+=dx;pendingMiniDy+=dy;if(!rafMove)rafMove=requestAnimationFrame(flushMiniResize)}else{fullSize=clampFullSize(resize.w-dx,resize.h-dy);applyFullSize()}},true);corner.addEventListener('pointerup',e=>{if(!resize||resize.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();if(resize.mini&&rafMove){cancelAnimationFrame(rafMove);flushMiniResize()}if(!resize.mini)write(FULL_SIZE_KEY,fullSize);resize=null},true);corner.addEventListener('pointercancel',e=>{if(resize?.id===e.pointerId){if(!resize.mini)write(FULL_SIZE_KEY,fullSize);resize=null}},true)}
  }
  addEventListener('resize',()=>{if(!isMini())applyFullSize()});

  /* V17: active tab = playback context + progressively expanding For You feed */
  const CTX_LIMIT_STEP=48,CTX_FETCH='https://dimvegkezslqjtsxdohp.supabase.co/functions/v1/twyoutubesearch';
  let ctxSource='foryou',ctxAdvancing=false,ctxExpandBusy=false,ctxSeedCursor=0;
  const ctxLimits={foryou:60,likes:60,recent:60,queue:160};
  const ctxBaseRender=render,ctxBasePlayTrack=playTrack;
  function ctxAll(which=tab){
    const learned=Object.values(profile.tracks||{});
    if(which==='likes')return learned.filter(x=>x.liked).sort((a,b)=>score(b)-score(a)).map(item);
    if(which==='recent')return learned.filter(x=>x.lastPlayed).sort((a,b)=>Date.parse(b.lastPlayed)-Date.parse(a.lastPlayed)).map(item);
    if(which==='queue')return [...queue];
    const ranked=learned.filter(x=>isAutoMusic(item(x))).sort((a,b)=>score(b)-score(a)).map(item),seen=new Set(ranked.map(key));
    return [...ranked,...queue.filter(x=>isAutoMusic(x)&&!seen.has(key(x)))];
  }
  function ctxVisible(which=tab){const all=ctxAll(which),limit=ctxLimits[which]||60;return all.slice(0,limit)}
  render=function(list){if(Array.isArray(list))return ctxBaseRender(list);return ctxBaseRender(ctxVisible(tab))};
  function ctxSetSource(which){ctxSource=which||tab||'foryou'}
  playTrack=function(t){if(!ctxAdvancing)ctxSetSource(tab);return ctxBasePlayTrack(t)};
  window.playTrack=playTrack;
  document.querySelectorAll('[data-tab]').forEach(b=>{const old=b.onclick;b.onclick=e=>{old?.call(b,e);ctxSetSource(b.dataset.tab);if(b.dataset.tab!=='queue')render()}});
  async function ctxFetch(q){try{const r=await fetch(CTX_FETCH+'?q='+encodeURIComponent(q),{cache:'no-store'}),d=await r.json();if(!r.ok)return[];return(d.items||[]).map(x=>({id:x.youtubeId||String(x.id||'').replace(/^youtube:/,''),title:x.title||'',uploader:x.artist||'YouTube',duration:Number(x.duration||0),thumbnail:x.artwork||''})).filter(x=>x.id&&x.title&&isAutoMusic(x))}catch{return[]}}
  async function ctxExpandForYou(){
    if(ctxExpandBusy)return false;ctxExpandBusy=true;
    try{
      const seeds=Object.values(profile.tracks||{}).filter(x=>isAutoMusic(item(x))).sort((a,b)=>score(b)-score(a));
      const seed=seeds.length?seeds[ctxSeedCursor++%Math.min(seeds.length,30)]:null;
      const artist=seed?.artist||current?.uploader||'music',title=seed?.title||current?.title||'';
      const qs=[artist+' songs',artist+' '+title+' similar songs music'];
      const batches=await Promise.all(qs.map(ctxFetch)),seen=new Set(queue.map(key));let added=0;
      for(const batch of batches)for(const x of batch){tr(x);if(!seen.has(key(x))){queue.push(x);seen.add(key(x));added++}}
      if(added){save(PK,profile);save(QK,queue)}
      return added>0;
    }finally{ctxExpandBusy=false}
  }
  function ctxMusicList(which){const all=ctxAll(which);return which==='queue'?all.filter(isAutoMusic):all.filter(isAutoMusic)}
  async function ctxNext(man=true){
    let list=ctxMusicList(ctxSource);
    if(!list.length){ctxSource='foryou';list=ctxMusicList('foryou')}
    if(!list.length&&current)await ctxExpandForYou(),list=ctxMusicList(ctxSource);
    if(!list.length)return;
    const cur=current?list.findIndex(x=>key(x)===key(current)):-1;
    let pick=-1;
    if(settings.shuffle&&list.length>1){const choices=list.filter(x=>!current||key(x)!==key(current));if(choices.length)pick=Math.floor(Math.random()*choices.length)}
    else pick=cur>=0?cur+1:0;
    if(pick>=list.length){if(ctxSource==='foryou'||ctxSource==='likes'||ctxSource==='recent'){await ctxExpandForYou();list=ctxMusicList(ctxSource);pick=Math.min(cur+1,list.length-1)}else pick=0}
    let chosen=settings.shuffle&&list.length>1?list.filter(x=>!current||key(x)!==key(current))[pick]:list[pick];
    if(!chosen){const fallback=ctxMusicList('foryou');chosen=fallback.find(x=>!current||key(x)!==key(current))}
    if(!chosen)return;
    if(current&&man&&started&&Date.now()-started<15000)ev('skip',current);
    ctxAdvancing=true;try{ctxBasePlayTrack(chosen)}finally{ctxAdvancing=false}
  }
  next=ctxNext;
  prev=function(){let list=ctxMusicList(ctxSource);if(!list.length)return;const cur=current?list.findIndex(x=>key(x)===key(current)):-1,chosen=list[cur>0?cur-1:Math.max(0,list.length-1)];if(!chosen)return;ctxAdvancing=true;try{ctxBasePlayTrack(chosen)}finally{ctxAdvancing=false}};
  $('next').onclick=$('bnext').onclick=()=>next(true);$('prev').onclick=$('bprev').onclick=prev;
  try{if('mediaSession'in navigator){navigator.mediaSession.setActionHandler('nexttrack',()=>next(true));navigator.mediaSession.setActionHandler('previoustrack',prev)}}catch{}
  const ctxScroller=document.querySelector('.content');
  if(ctxScroller)ctxScroller.addEventListener('scroll',async()=>{
    if(ctxScroller.scrollHeight-ctxScroller.scrollTop-ctxScroller.clientHeight>900)return;
    const all=ctxAll(tab),old=ctxLimits[tab]||60;
    if(old<all.length){ctxLimits[tab]=Math.min(all.length,old+CTX_LIMIT_STEP);render();return}
    if(tab==='foryou'){
      const added=await ctxExpandForYou();if(added){ctxLimits.foryou+=CTX_LIMIT_STEP;render()}
    }
  },{passive:true});

  ensureCloseButton();ensureVideoButton();syncUi(true);localizeLabels();
})();

(()=>{
  'use strict';
  const ORIGIN='https://tesla-waze.vercel.app';
  if(window.parent===window)return;
  let lastCommandAt=0,lastState='';
  const command=a=>{
    const now=Date.now();
    if(now-lastCommandAt<280)return;
    lastCommandAt=now;
    const id=a==='next'?'next':a==='prev'?'prev':'play';
    const btn=document.getElementById(id);
    if(!btn)return;
    if(a==='play'){
      const playing=document.getElementById('play')?.textContent?.includes('⏸');
      if(!playing)btn.click();
    }else if(a==='pause'){
      const playing=document.getElementById('play')?.textContent?.includes('⏸');
      if(playing)btn.click();
    }else btn.click();
  };
  addEventListener('message',e=>{
    if(e.origin!==ORIGIN||e.data?.type!=='tesla-music-command')return;
    const a=e.data.action;
    if(a==='play'||a==='pause'||a==='next'||a==='prev')command(a);
  });
  const sendState=detail=>{
    const title=(document.getElementById('now')?.textContent||'').trim();
    if(!title||title==='Vyber skladbu')return;
    const raw=(document.getElementById('sub')?.textContent||'').trim();
    const artist=raw.split(' · ')[0]||'YouTube';
    const playing=typeof detail?.playing==='boolean'?detail.playing:document.getElementById('play')?.textContent?.includes('⏸');
    const position=Number(detail?.now)||0,duration=Number(detail?.duration)||0;
    const sig=[title,artist,playing,Math.floor(position),Math.floor(duration)].join('|');
    if(sig===lastState)return;lastState=sig;
    try{parent.postMessage({type:'tesla-music-media-state',title,artist,album:'Tesla Music',playing,position,duration},ORIGIN)}catch{}
  };
  addEventListener('tesla-music-trackchange',e=>setTimeout(()=>sendState({}),0));
  addEventListener('tesla-music-tick',e=>sendState(e.detail||{}));
  setInterval(()=>sendState({}),1800);
})();

/* V18_PLAY_BOOTSTRAP: only when Play has no current track yet. */
(()=>{
  const pickStartTrack=()=>{
    const learned=Object.values(profile?.tracks||{}).filter(x=>x?.lastPlayed).sort((a,b)=>Date.parse(b.lastPlayed||0)-Date.parse(a.lastPlayed||0));
    if(learned.length)return item(learned[0]);
    return queue.find(isAutoMusic)||queue[0]||null;
  };
  const bind=id=>{
    const el=document.getElementById(id);if(!el)return;
    el.addEventListener('click',e=>{
      if(current||!ready)return;
      const first=pickStartTrack();if(!first)return;
      e.preventDefault();e.stopImmediatePropagation();
      playTrack(first);
    },true);
  };
  bind('play');bind('bplay');
})();

/* V19_TRANSITION_AUDIO_HOLD: keep Tesla media focus during YouTube track handoff. */
(()=>{
  const PARENT_ORIGIN='https://tesla-waze.vercel.app';
  let holdUntil=0;
  const arm=()=>{
    holdUntil=Date.now()+5000;
    try{if('mediaSession'in navigator)navigator.mediaSession.playbackState='playing'}catch{}
    pushParent();
  };
  const pushParent=()=>{
    if(window.parent===window||!current)return;
    try{
      const position=Number(player?.getCurrentTime?.())||0,duration=Number(player?.getDuration?.())||Number(current?.duration)||0;
      parent.postMessage({type:'tesla-music-media-state',title:current.title||'',artist:current.uploader||'YouTube',album:'Tesla Music',playing:true,position,duration},PARENT_ORIGIN);
    }catch{}
  };

  const previousMedia=media;
  media=function(){
    if(!current)return;
    try{
      if('mediaSession'in navigator){
        navigator.mediaSession.metadata=new MediaMetadata({title:current.title,artist:current.uploader||'YouTube',album:'Tesla Music'});
        const s=player?.getPlayerState?.();
        const trulyPaused=s===2;
        navigator.mediaSession.playbackState=(s===1||(!trulyPaused&&Date.now()<holdUntil))?'playing':'paused';
      }
    }catch{try{previousMedia?.()}catch{}}
  };

  const previousPlayTrack=playTrack;
  playTrack=function(t){if(t&&(!current||key(t)!==key(current)))arm();return previousPlayTrack(t)};
  window.playTrack=playTrack;

  const previousNext=next;
  next=async function(...args){arm();return previousNext(...args)};
  const previousPrev=prev;
  prev=function(...args){arm();return previousPrev(...args)};

  $('next').onclick=$('bnext').onclick=()=>next(true);
  $('prev').onclick=$('bprev').onclick=prev;
  try{
    if('mediaSession'in navigator){
      navigator.mediaSession.setActionHandler('nexttrack',()=>next(true));
      navigator.mediaSession.setActionHandler('previoustrack',prev);
    }
  }catch{}

  addEventListener('tesla-music-tick',e=>{
    const s=player?.getPlayerState?.();
    if(s===1)holdUntil=0;
    else if(Date.now()<holdUntil&&s!==2){
      try{navigator.mediaSession.playbackState='playing'}catch{}
      pushParent();
    }
  });
  setInterval(()=>{if(Date.now()<holdUntil){try{navigator.mediaSession.playbackState='playing'}catch{}pushParent()}},350);
})();
