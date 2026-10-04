(()=>{'use strict';const $=x=>document.getElementById(x),API='/api/youtube-search?q=';const params=new URLSearchParams(location.search);const mobileMode=params.get('mobile')==='1';if(params.get('remote')==='1'){document.body.classList.add('remoteMode');$('desktopApp').style.display='none';$('qrBtn').style.display='none';$('qrBox').style.display='none';const box=$('remoteApp');box.style.display='block';box.className='remote';box.innerHTML='<div class="rTop"><b>Music</b><form id="rf"><input id="rq" placeholder="Hľadať skladbu alebo interpreta"><button>Hľadať</button></form></div><div id="rst">Vyhľadaj hudbu a ťukni na skladbu.</div><div id="rg" class="remoteGrid"></div>';const ses=params.get('s')||'';const esc=s=>String(s||'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));async function rs(){const q=$('rq').value.trim();if(!q)return;$('rst').textContent='Hľadám…';try{let r=await fetch(API+encodeURIComponent(q)+'&_='+Date.now(),{cache:'no-store'}),d=await r.json();if(d&&d.success&&typeof d.text==='string')d=JSON.parse(d.text);const a=(d.items||[]).slice(0,30);$('rg').innerHTML=a.map((x,i)=>'<button type="button" class="remoteCard" data-i="'+i+'"><img src="'+esc(x.artwork||'')+'"><span>'+esc(x.title||'')+'</span></button>').join('');document.querySelectorAll('.remoteCard').forEach(c=>c.onclick=async()=>{const x=a[+c.dataset.i];$('rst').textContent='Posielam: '+x.title;await fetch('/api/simple-remote',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'send',session:ses,track:{id:x.youtubeId,title:x.title,uploader:x.artist,duration:x.duration,thumbnail:x.artwork}})});$('rst').textContent='Spustené v Tesle: '+x.title});$('rst').textContent=a.length+' výsledkov'}catch(e){$('rst').textContent='Chyba vyhľadávania'}}$('rf').onsubmit=e=>{e.preventDefault();rs()};return}function silentWavUrl(){const rate=8000,n=rate,b=new ArrayBuffer(44+n),v=new DataView(b),w=(o,x)=>{for(let i=0;i<x.length;i++)v.setUint8(o+i,x.charCodeAt(i))};w(0,'RIFF');v.setUint32(4,36+n,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate,true);v.setUint16(32,1,true);v.setUint16(34,8,true);w(36,'data');v.setUint32(40,n,true);for(let i=0;i<n;i++)v.setUint8(44+i,128);return URL.createObjectURL(new Blob([b],{type:'audio/wav'}))}
// Mobile system controls must follow the actual YouTube media element.
// A looping one-second helper gives Safari a competing native playback clock.
const keepAlive=mobileMode?null:new Audio(silentWavUrl());
if(keepAlive){keepAlive.loop=true;keepAlive.volume=0}
const hold=()=>keepAlive?Promise.resolve(keepAlive.play()).catch(()=>{}):Promise.resolve();
if(keepAlive){
  document.addEventListener('pointerdown',hold,{once:true,capture:true});
  document.addEventListener('touchstart',hold,{once:true,capture:true});
}
let player,ready=false,items=[],queue=[],idx=-1,current=null,shuffle=true,repeat=false,lastAuto='',view='home',pendingStart=null,restoredTrack=null;const STORE={likes:'teslaYT:likes',recent:'teslaYT:recent',last:'teslaYT:last',session:'teslaYT:session'};
const readRaw=k=>{try{return localStorage.getItem(k)}catch{return null}};
const writeRaw=(k,v)=>{try{localStorage.setItem(k,v);return true}catch{return false}};
const load=(k,fallback=[])=>{try{const raw=readRaw(k);return raw?JSON.parse(raw):fallback}catch{return fallback}};
const save=(k,v)=>{try{return writeRaw(k,JSON.stringify(v))}catch{return false}};
let likes=normalizeTracks(load(STORE.likes),Infinity),recent=normalizeTracks(load(STORE.recent)),filter='music';const fmt=n=>{n=Math.max(0,Math.round(Number(n)||0));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0')};const esc=s=>String(s||'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));const map=x=>({id:x.youtubeId||String(x.id||'').replace(/^youtube:/,''),title:x.title||'',artist:x.artist||'YouTube',duration:Number(x.duration||0),art:x.artwork||''});
// Persist the displayed list separately from the playlist used while browsing.
// On the next visit, the last displayed list becomes the continuation list.
function normalizeTrack(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const rawId=typeof value.id==='string'?value.id:typeof value.youtubeId==='string'?value.youtubeId:'';
  const id=rawId.replace(/^youtube:/,'');
  if(!/^[\w-]{11}$/.test(id))return null;
  const duration=typeof value.duration==='number'||typeof value.duration==='string'?Number(value.duration):0;
  return {id,title:typeof value.title==='string'?value.title.slice(0,1000):'',
    artist:typeof value.artist==='string'?value.artist.slice(0,500):'YouTube',
    duration:Number.isFinite(duration)&&duration>=0?duration:0,
    art:typeof value.art==='string'?value.art.slice(0,4096):typeof value.artwork==='string'?value.artwork.slice(0,4096):''};
}
function normalizeTracks(values,limit=2000){
  if(!Array.isArray(values))return [];
  const result=[],seen=new Set();
  for(const value of values.slice(0,limit)){
    const track=normalizeTrack(value);
    if(track&&!seen.has(track.id)){seen.add(track.id);result.push(track)}
  }
  return result;
}
// A browsing feed owns its results and requests. Playback keeps its own selected list.
function createFeed(name){
  return {name,query:'',items:[],page:0,prefetch:[],revision:0,loaded:false,
    request:null,prefetchRequest:null,moreRequest:null,status:'',scroll:0};
}
const feeds={home:createFeed('home'),search:createFeed('search')};
const scrollPositions={home:0,search:0,likes:0,recent:0};
let queueSource=null,scrollSaveTimer=null;
function activeFeed(){return view==='home'||view==='search'?feeds[view]:null}
function normalizedScroll(value){return Number.isFinite(value)&&value>=0?value:0}
function rememberBrowseScroll(){
  const position=normalizedScroll(Number(document.querySelector('.browse')?.scrollTop));
  scrollPositions[view]=position;
  const feed=activeFeed();
  if(feed)feed.scroll=position;
}
function restoreBrowseScroll(){
  const position=activeFeed()?.scroll??scrollPositions[view];
  document.querySelector('.browse')?.scrollTo?.({top:normalizedScroll(position)});
}
function feedSnapshot(feed){
  return {query:feed.query,items:normalizeTracks(feed.items),page:feed.page,
    prefetch:normalizeTracks(feed.prefetch),revision:feed.revision,loaded:feed.loaded,scroll:feed.scroll};
}
function persistSession(){
  const searchFeed=feeds.search;
  save(STORE.session,{version:1,current:normalizeTrack(current||pendingStart?.track||restoredTrack),
    items:normalizeTracks(items),queue:normalizeTracks(queue),view,query:$('q').value,
    searchQuery:searchFeed.query,searchPage:searchFeed.page,searchItems:normalizeTracks(searchFeed.items),
    searchPrefetch:normalizeTracks(searchFeed.prefetch),filter,shuffle,repeat,queueSource,
    feeds:{home:feedSnapshot(feeds.home),search:feedSnapshot(searchFeed)},
    scroll:{...scrollPositions,home:feeds.home.scroll,search:searchFeed.scroll}});
}
function syncBrowseControls(){
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter===filter));
  const query=feeds.search.query;
  $('heading').textContent=view==='search'?(query?'Vyhľadané · '+query:'Vyhľadané'):
    view==='likes'?'Obľúbené':view==='recent'?'Naposledy prehrané':'Pre teba';
}
function restoreFeed(name,saved,fallback){
  const data=saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:fallback;
  const feed=createFeed(name);
  feed.query=typeof data.query==='string'?data.query.slice(0,1000):'';
  feed.items=normalizeTracks(data.items);
  // Older snapshots advanced the cursor without saving the fetched buffer.
  // Replay those variants and deduplicate instead of skipping unheard results.
  feed.page=Array.isArray(data.prefetch)&&Number.isSafeInteger(data.page)&&data.page>=0?data.page:0;
  const known=new Set(feed.items.map(track=>track.id));
  feed.prefetch=normalizeTracks(data.prefetch).filter(track=>!known.has(track.id));
  feed.revision=Number.isSafeInteger(data.revision)&&data.revision>=0?data.revision:0;
  feed.loaded=typeof data.loaded==='boolean'?data.loaded:Boolean(feed.query||feed.items.length);
  feed.scroll=normalizedScroll(data.scroll);
  feed.status=feed.loaded?feed.items.length+' výsledkov':'';
  feeds[name]=feed;
  scrollPositions[name]=feed.scroll;
}
function restoreSession(){
  restoredTrack=normalizeTrack(load(STORE.last,null));
  const session=load(STORE.session,null);
  if(!session||session.version!==1){render();return}
  restoredTrack=normalizeTrack(session.current)||restoredTrack;
  view=['home','search','likes','recent'].includes(session.view)?session.view:'home';
  filter=['music','similar','artist'].includes(session.filter)?session.filter:'music';
  const displayed=normalizeTracks(session.items);
  const legacySearch=normalizeTracks(session.searchItems);
  restoreFeed('search',session.feeds?.search,{query:session.searchQuery,
    items:legacySearch.length?legacySearch:view==='search'?displayed:[],
    page:session.searchPage,prefetch:session.searchPrefetch,scroll:session.scroll?.search});
  restoreFeed('home',session.feeds?.home,{query:'',items:view==='home'?displayed:[],
    page:0,prefetch:[],loaded:false,scroll:session.scroll?.home});
  scrollPositions.likes=normalizedScroll(session.scroll?.likes);
  scrollPositions.recent=normalizedScroll(session.scroll?.recent);
  if(view==='likes')items=Array.isArray(session.items)?displayed:[...likes];
  else if(view==='recent')items=Array.isArray(session.items)?displayed:[...recent];
  else items=[...feeds[view].items];
  queue=items.length?[...items]:normalizeTracks(session.queue);
  const feed=activeFeed(),savedSource=session.queueSource;
  if(items.length&&feed)queueSource={name:feed.name,query:feed.query,revision:feed.revision};
  else if(!items.length&&['home','search'].includes(savedSource?.name)){
    const source=feeds[savedSource.name];
    if(savedSource.query===source.query&&savedSource.revision===source.revision)
      queueSource={name:source.name,query:source.query,revision:source.revision};
  }
  shuffle=typeof session.shuffle==='boolean'?session.shuffle:shuffle;
  repeat=typeof session.repeat==='boolean'?session.repeat:repeat;
  $('q').value=typeof session.query==='string'?session.query.slice(0,1000):feeds.search.query;
  $('shuffle').classList.toggle('active',shuffle);
  $('repeat').classList.toggle('active',repeat);
  render();
  restoreBrowseScroll();
}
function selectVisibleTrack(track){
  if(!track)return;
  const feed=activeFeed();
  queueSource=feed?{name:feed.name,query:feed.query,revision:feed.revision}:null;
  start(track,items);
}
function showFeed(feed){
  if(view!==feed.name)return;
  items=[...feed.items];
  render();
  $('status').textContent=feed.status;
  restoreBrowseScroll();
}
function selectView(nextView){
  if(!['home','search','likes','recent'].includes(nextView))return;
  rememberBrowseScroll();
  view=nextView;
  const feed=activeFeed();
  let homeQuery='';
  if(view==='home'&&!feed.loaded&&!feed.request){
    const seed=recent[0]||normalizeTrack(load(STORE.last,null));
    if(seed)homeQuery=(seed.artist||'')+' podobná hudba';
    else{
      feed.items=[];feed.scroll=0;
      feed.status='Pre odporúčania najprv prehraj skladbu.';
    }
  }
  items=feed?[...feed.items]:view==='likes'?[...likes]:[...recent];
  render();
  $('status').textContent=feed?feed.status:items.length+' skladieb';
  restoreBrowseScroll();
  if(homeQuery)void loadFeed(feed,homeQuery);
}
// Observe only the automatic startup attempt. Diagnostics never issue playback commands.
let startupAttempt=null;
function clearStartupMessage(){
  const status=$('status'),message=status.getAttribute('data-startup-message');
  if(message&&status.textContent===message)status.textContent=ready?'Player pripravený':'Pripravené';
  status.removeAttribute('data-startup-message');
}
function startupResult(result,state){
  const status=$('status');
  status.setAttribute('data-startup-result',result);
  if(Number.isFinite(state))status.setAttribute('data-startup-state',String(state));
}
function cancelStartupWatch(result='cancelled'){
  if(!startupAttempt)return;
  clearTimeout(startupAttempt.timer);startupAttempt=null;
  clearStartupMessage();startupResult(result);
}
function showStartupFailure(result,message){
  if(!startupAttempt)return;
  clearTimeout(startupAttempt.timer);
  startupResult(result);
  $('status').setAttribute('data-startup-message',message);
  $('status').textContent=message;
}
function observeStartupState(state){
  if(!startupAttempt||startupAttempt.stage!=='requested')return;
  $('status').setAttribute('data-startup-state',String(state));
  if(state===1)cancelStartupWatch('playing');
}
function checkStartup(attempt){
  if(startupAttempt!==attempt)return;
  if(attempt.stage==='waiting-player'){
    showStartupFailure('waiting-player-timeout','Prehrávač sa ešte nepripravil. Skontroluj pripojenie.');
    return;
  }
  let state;
  try{state=player.getPlayerState()}catch{}
  observeStartupState(state);
  if(startupAttempt!==attempt)return;
  if(state===3)showStartupFailure('buffering','Skladba sa stále načítava. Skontroluj pripojenie.');
  else if(state===5)showStartupFailure('cued','Skladba je pripravená, ale prehrávanie sa nespustilo. Ťukni na ▶.');
  else showStartupFailure('not-started','Automatické spustenie sa nedokončilo. Ťukni na ▶.');
}
function beginStartupWatch(track){
  $('status').setAttribute('data-startup-build','20261004-6');
  if(!track?.id){startupResult('no-track');return}
  cancelStartupWatch();
  const attempt={trackId:track.id,stage:'waiting-player',timer:null};
  startupAttempt=attempt;startupResult('waiting-player');
  attempt.timer=setTimeout(()=>checkStartup(attempt),12000);
}
function watchStartupRequest(track){
  if(!startupAttempt||startupAttempt.trackId!==track.id)beginStartupWatch(track);
  const attempt=startupAttempt;
  clearTimeout(attempt.timer);clearStartupMessage();
  attempt.stage='requested';startupResult('requested');
  attempt.timer=setTimeout(()=>checkStartup(attempt),12000);
}
function startupAutoplayBlocked(){
  if(!startupAttempt||startupAttempt.stage!=='requested')return;
  try{const state=player.getPlayerState();if(Number.isFinite(state))$('status').setAttribute('data-startup-state',String(state))}catch{}
  showStartupFailure('blocked','Prehliadač zablokoval automatické spustenie. Ťukni na ▶.');
}
function startupError(error){
  if(!startupAttempt)return;
  $('status').setAttribute('data-startup-error',String(error?.message||error?.data||error?.name||'unknown').slice(0,240));
  showStartupFailure('error','Obnovenie prehrávania sa nepodarilo. Ťukni na ▶.');
}
function updatePlayButton(state){
  observeStartupState(state);
  const playing=state===1,button=$('play');
  button.classList.toggle('paused',playing);
  button.setAttribute('aria-label',playing?'Pozastaviť':'Prehrať');
}
function render(){syncBrowseControls(); $('grid').innerHTML=items.map((x,i)=>'<div class="card" data-i="'+i+'"><div class="thumbWrap"><img class="thumb" src="'+esc(x.art)+'"><span class="dur">'+fmt(x.duration)+'</span><button class="fav '+(likes.some(l=>l.id===x.id)?'on':'')+'" data-like="'+i+'" aria-label="Obľúbené">'+(likes.some(l=>l.id===x.id)?'♥':'♡')+'</button></div><div class="ct">'+esc(x.title)+'</div><div class="ca">'+esc(x.artist)+'</div></div>').join('');document.querySelectorAll('.card').forEach(c=>c.onclick=e=>{if(e.target.closest('[data-like]'))return;selectVisibleTrack(items[+c.dataset.i])});document.querySelectorAll('[data-like]').forEach(b=>b.onclick=e=>{e.stopPropagation();const x=items[+b.dataset.like],on=likes.some(l=>l.id===x.id);likes=on?likes.filter(l=>l.id!==x.id):[x,...likes];save(STORE.likes,likes);if(view==='likes')items=[...likes];render()});drawQueue()}function drawQueue(){$('queue').innerHTML=queue.map((x,i)=>'<div class="qi '+(i===idx?'on':'')+'">'+esc(x.title)+'</div>').join('');persistSession()}async function fetchBatch(q){
  const response=await fetch(API+encodeURIComponent(q)+'&_='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  let data=await response.json();
  if(data&&data.success===true&&typeof data.text==='string')data=JSON.parse(data.text);
  return normalizeTracks((Array.isArray(data?.items)?data.items:[]).map(map));
}
function searchVariants(query){
  return [query+' official audio',query+' official video',query+' songs',query+' music',
    query+' hits',query+' best songs',query+' playlist',query+' mix',query+' remix',
    query+' live',query+' topic',query+' album',query+' new',query+' popular',query+' 2026',query+' 2025'];
}
function queueBelongsTo(feed){
  return queueSource?.name===feed.name&&queueSource.query===feed.query&&queueSource.revision===feed.revision;
}
function appendFeedItems(feed,more){
  const known=new Set(feed.items.map(track=>track.id)),add=[];
  for(const track of more)if(!known.has(track.id)){known.add(track.id);add.push(track)}
  if(add.length){
    feed.items.push(...add);
    if(queueBelongsTo(feed)){
      const selected=pendingStart?.sourceQueue||queue;
      const queued=new Set(selected.map(track=>track.id));
      for(const track of add)if(!queued.has(track.id)){queued.add(track.id);selected.push(track)}
    }
    feed.status=feed.items.length+' výsledkov';
    if(view===feed.name){rememberBrowseScroll();showFeed(feed)}
    else persistSession();
  }else persistSession();
}
function prefetchMore(feed){
  if(!feed?.loaded||!feed.query)return Promise.resolve(false);
  if(feed.prefetchRequest)return feed.prefetchRequest.promise;
  const request={revision:feed.revision,query:feed.query,page:feed.page,promise:null};
  feed.prefetchRequest=request;
  request.promise=(async()=>{
    try{
      const variants=searchVariants(request.query),queries=[];
      for(let i=0;i<4;i++)queries.push(variants[(request.page+i)%variants.length]);
      const batches=await Promise.all(queries.map(fetchBatch));
      if(feed.revision!==request.revision||feed.query!==request.query)return false;
      const known=new Set([...feed.items,...feed.prefetch].map(track=>track.id));
      for(const batch of batches)for(const track of batch)if(!known.has(track.id)){
        known.add(track.id);feed.prefetch.push(track);
      }
      // Commit the cursor and its buffer together only after a successful batch.
      feed.page=request.page+4;
      persistSession();
      return true;
    }catch{return false}
    finally{if(feed.prefetchRequest===request)feed.prefetchRequest=null}
  })();
  return request.promise;
}
function fetchMoreFeed(name=view){
  const feed=name==='home'||name==='search'?feeds[name]:null;
  if(!feed||view!==name||!feed.loaded||!feed.query)return Promise.resolve();
  if(feed.moreRequest)return feed.moreRequest.promise;
  const request={revision:feed.revision,query:feed.query,promise:null};
  feed.moreRequest=request;
  request.promise=(async()=>{
    try{
      let fetched=true,attempts=0;
      const maxBatches=Math.ceil(searchVariants(request.query).length/4);
      // A duplicate-only batch does not move the scroll boundary. Continue through
      // at most one variant cycle so loading cannot stall or retry indefinitely.
      while(!feed.prefetch.length&&attempts<maxBatches){
        attempts++;
        fetched=await prefetchMore(feed);
        if(feed.revision!==request.revision||feed.query!==request.query||view!==name)return;
        if(!fetched)break;
      }
      if(feed.revision!==request.revision||feed.query!==request.query||view!==name)return;
      if(feed.prefetch.length){
        appendFeedItems(feed,feed.prefetch.splice(0,24));
        if(feed.prefetch.length<48)void prefetchMore(feed);
      }else if(!fetched){
        feed.status='Ďalšie skladby sa nepodarilo načítať. Posuň zoznam a skús znova.';
        $('status').textContent=feed.status;
      }else{
        feed.status=feed.items.length+' výsledkov · Ďalšie skladby sa nenašli.';
        $('status').textContent=feed.status;
      }
    }finally{if(feed.moreRequest===request)feed.moreRequest=null}
  })();
  return request.promise;
}
function loadFeed(feed,query){
  const request={query,promise:null};
  feed.request=request;
  feed.status='Hľadám…';
  if(view===feed.name)$('status').textContent=feed.status;
  persistSession();
  request.promise=(async()=>{
    try{
      const tracks=await fetchBatch(query);
      if(feed.request!==request)return;
      feed.revision=feed.revision===Number.MAX_SAFE_INTEGER?0:feed.revision+1;
      feed.query=query;feed.items=tracks;feed.page=0;feed.prefetch=[];
      feed.prefetchRequest=null;feed.moreRequest=null;feed.loaded=true;feed.scroll=0;
      feed.status=tracks.length+' výsledkov';
      if(view===feed.name){
        if(!current&&!pendingStart&&!restoredTrack){
          queue=[...tracks];idx=-1;
          queueSource={name:feed.name,query:feed.query,revision:feed.revision};
        }
        showFeed(feed);
      }else persistSession();
      const revision=feed.revision;
      setTimeout(()=>{
        if(feed.revision!==revision)return;
        void prefetchMore(feed);
        setTimeout(()=>{if(feed.revision===revision)void prefetchMore(feed)},1200);
      },50);
    }catch(error){
      if(feed.request===request){
        feed.status='Vyhľadávanie zlyhalo: '+error.message;
        if(view===feed.name)$('status').textContent=feed.status;
        persistSession();
      }
    }finally{if(feed.request===request)feed.request=null}
  })();
  return request.promise;
}
function search(){
  const query=$('q').value.trim();
  if(!query)return;
  selectView('search');
  return loadFeed(feeds.search,query);
}
function maybeLoadMore(fromWindow=false){
  if(!activeFeed())return;
  const element=document.querySelector('.browse');
  if(!element||element.scrollTop+element.clientHeight<element.scrollHeight-240)return;
  if(fromWindow){
    const rect=element.getBoundingClientRect?.(),height=window.innerHeight;
    if(!rect||!Number.isFinite(rect.bottom)||!Number.isFinite(height)||rect.bottom<=0||rect.top>=height||rect.bottom>height+240)return;
  }
  void fetchMoreFeed();
}
function claimTeslaMedia(){if(mobileMode)return;try{keepAlive.muted=false;keepAlive.volume=0.01;keepAlive.loop=true;void keepAlive.play();if('mediaSession'in navigator){navigator.mediaSession.playbackState='playing';try{navigator.mediaSession.setActionHandler('play',()=>{void keepAlive.play();player?.playVideo()})}catch{}try{navigator.mediaSession.setActionHandler('pause',()=>{player?.pauseVideo();keepAlive.pause()})}catch{}try{navigator.mediaSession.setActionHandler('nexttrack',()=>next())}catch{}try{navigator.mediaSession.setActionHandler('previoustrack',()=>prev())}catch{}}}catch{}}function start(t,sourceQueue,resume=false){if(!t)return;if(!resume)cancelStartupWatch();const requestedQueue=sourceQueue?[...sourceQueue]:null;claimTeslaMedia();if(!ready){pendingStart={track:t,sourceQueue:requestedQueue};$('status').textContent='Player sa inicializuje…';initYT();return}pendingStart=null;hold();if(requestedQueue)queue=requestedQueue;if(!queue.some(x=>x.id===t.id))queue.unshift(t);recent=[t,...recent.filter(x=>x.id!==t.id)].slice(0,60);save(STORE.recent,recent);save(STORE.last,t);current=t;restoredTrack=t;idx=queue.findIndex(x=>x.id===t.id);const ids=resume?[t.id]:queue.map(x=>x.id);if(resume)watchStartupRequest(t);try{player.loadPlaylist({playlist:ids,index:resume?0:idx,startSeconds:0,suggestedQuality:'default'})}catch{player.loadVideoById(t.id)};$('now').textContent=t.title;$('artist').textContent=t.artist;lastAuto='';drawQueue();media()}function next(){if(!queue.length)return;if(repeat&&current){start(current);return}if(shuffle){let n=Math.floor(Math.random()*queue.length);if(n===idx&&queue.length>1)n=(n+1)%queue.length;idx=n;start(queue[idx]);return}idx=(idx+1)%queue.length;start(queue[idx])}function prev(){if(!queue.length)return;idx=(idx<=0?queue.length:idx)-1;start(queue[idx])}function tick(){if(!ready)return;try{let c=player.getCurrentTime()||0,d=player.getDuration()||0,s=player.getPlayerState();$('seek').value=d?Math.round(c/d*1000):0;$('elapsed').textContent=fmt(c);$('remaining').textContent='-'+fmt(Math.max(0,d-c));updatePlayButton(s);if((!mobileMode||s===1)&&current&&d>1&&c>0&&d-c<.8&&lastAuto!==current.id){lastAuto=current.id;setTimeout(next,80)}if(current)teslaPanelBridge();if(s===1&&current)media()}catch{}}function teslaPanelBridge(){if(mobileMode||!current||!('mediaSession'in navigator))return;try{const ms=navigator.mediaSession;ms.metadata=new MediaMetadata({title:String(current.title||'Music'),artist:String(current.artist||'YouTube'),album:'Music',artwork:current.art?[{src:current.art}]:[]});const playing=player?.getPlayerState?.()===1;ms.playbackState=playing?'playing':'paused';try{const d=Number(player?.getDuration?.()||0),p=Number(player?.getCurrentTime?.()||0);if(d>0&&ms.setPositionState)ms.setPositionState({duration:d,position:Math.max(0,Math.min(p,d)),playbackRate:1})}catch{}try{ms.setActionHandler('play',()=>player?.playVideo())}catch{}try{ms.setActionHandler('pause',()=>player?.pauseVideo())}catch{}try{ms.setActionHandler('nexttrack',()=>{try{ms.playbackState='playing'}catch{};next()})}catch{}try{ms.setActionHandler('previoustrack',()=>{try{ms.playbackState='playing'}catch{};prev()})}catch{}}catch{}}function media(){if(mobileMode)return;teslaPanelBridge();try{if('mediaSession'in navigator&&current){navigator.mediaSession.metadata=new MediaMetadata({title:current.title,artist:current.artist,album:'Music',artwork:current.art?[{src:current.art,sizes:'512x512'}]:[]});navigator.mediaSession.playbackState=player?.getPlayerState?.()===1?'playing':'paused';for(const [a,h] of [['play',()=>{claimTeslaMedia();player?.playVideo()}],['pause',()=>player?.pauseVideo()],['nexttrack',next],['previoustrack',prev]]){try{navigator.mediaSession.setActionHandler(a,h)}catch{}}}}catch{}}function initYT(){if(ready||player||!window.YT||!YT.Player)return;player=new YT.Player('yt',{width:'100%',height:'100%',playerVars:{playsinline:1,autoplay:1,controls:1,rel:0,origin:location.origin},events:{onReady:()=>{ready=true;$('status').textContent='Player pripravený';setInterval(tick,350);if(pendingStart){const requested=pendingStart;pendingStart=null;start(requested.track,requested.sourceQueue);return}try{const last=restoredTrack||normalizeTrack(load(STORE.last,null));if(last?.id){if(!queue.some(x=>x.id===last.id))queue.unshift(last);start(last,undefined,true)}else if(recent[0]?.id){if(!queue.some(x=>x.id===recent[0].id))queue.unshift(recent[0]);start(recent[0],undefined,true)}}catch(error){startupError(error)}},onAutoplayBlocked:startupAutoplayBlocked,onStateChange:e=>{updatePlayButton(e.data);if(e.data===YT.PlayerState.PLAYING){claimTeslaMedia();media()}if(e.data===YT.PlayerState.ENDED)next();media()},onError:e=>{cancelStartupWatch('error');$('status').textContent='Video nie je prehrateľné, preskakujem…';setTimeout(next,250)}}})}window.onYouTubeIframeAPIReady=initYT;const ytBoot=setInterval(()=>{if(window.YT&&YT.Player){clearInterval(ytBoot);initYT()}},250);const remoteSession=readRaw('teslaYT:remoteSession')||('t'+Date.now().toString(36)+Math.random().toString(36).slice(2));writeRaw('teslaYT:remoteSession',remoteSession);const qrUrl=location.origin+'/?remote=1&s='+encodeURIComponent(remoteSession);$('qrImg').src='https://api.qrserver.com/v1/create-qr-code/?size=320x320&data='+encodeURIComponent(qrUrl);$('qrBtn').onclick=()=>$('qrBox').classList.toggle('show');let remoteSeq=0;setInterval(async()=>{try{const r=await fetch('/api/simple-remote?session='+encodeURIComponent(remoteSession)+'&last='+remoteSeq,{cache:'no-store'});if(!r.ok)return;let d=await r.json();if(d&&d.success&&typeof d.text==='string')d=JSON.parse(d.text);if(d.seq>remoteSeq&&d.track){remoteSeq=d.seq;const t=map(d.track);if(!queue.some(x=>x.id===t.id))queue.unshift(t);start(t)}}catch{}},900);const main=$('main'),split=$('splitter');let resizing=false;split.onpointerdown=e=>{resizing=true;split.setPointerCapture?.(e.pointerId)};split.onpointermove=e=>{if(!resizing)return;const r=main.getBoundingClientRect(),pct=Math.max(38,Math.min(72,(e.clientX-r.left)/r.width*100));main.style.setProperty('--browse',pct+'%')};split.onpointerup=()=>resizing=false;$('swap').onclick=()=>{main.classList.toggle('playerLeft');const left=main.classList.contains('playerLeft');main.style.gridTemplateColumns=left?'1fr 7px minmax(430px,46%)':'minmax(430px,46%) 7px 1fr';const b=main.querySelector('.browse'),p=main.querySelector('.player'),sp=$('splitter');if(left){main.insertBefore(p,main.firstChild);main.insertBefore(sp,b)}else{main.insertBefore(b,main.firstChild);main.insertBefore(sp,p)}};$('wide').onclick=()=>{const wide=main.dataset.wide==='1';main.dataset.wide=wide?'0':'1';main.style.gridTemplateColumns=wide?'minmax(430px,46%) 7px 1fr':'minmax(330px,34%) 7px 1fr';$('wide').classList.toggle('active',!wide)};const qi=$('q');
$('clearSearch').onclick=()=>{qi.value='';qi.focus();persistSession()};
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{
  filter=b.dataset.filter;
  syncBrowseControls();
  persistSession();
  if(filter==='similar'&&current){
    qi.value=(current.artist||'')+' '+(current.title||'')+' similar music';
    search();
  }else if(filter==='artist'&&current){qi.value=current.artist||'';search()}
});
const browse=document.querySelector('.browse');
browse?.addEventListener('scroll',()=>{
  rememberBrowseScroll();
  if(!scrollSaveTimer)scrollSaveTimer=setTimeout(()=>{scrollSaveTimer=null;persistSession()},150);
  maybeLoadMore();
},{passive:true});
if(mobileMode)window.addEventListener('scroll',()=>maybeLoadMore(true),{passive:true});
const sf=$('searchForm');sf.onsubmit=e=>{e.preventDefault();search();return false};$('go').onclick=e=>{e.preventDefault();search()};qi.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();search()}};$('next').onclick=next;$('prev').onclick=prev;$('play').onclick=()=>{
  cancelStartupWatch();
  if(!current){
    const selected=pendingStart?.track||restoredTrack;
    if(selected){start(selected,pendingStart?.sourceQueue||queue);return}
    if(items.length){selectVisibleTrack(items[0]);return}
  }
  if(!ready)return;
  player.getPlayerState()===1?player.pauseVideo():player.playVideo();
};$('shuffle').classList.add('active');$('shuffle').onclick=()=>{shuffle=!shuffle;$('shuffle').classList.toggle('active',shuffle);persistSession()};$('repeat').onclick=()=>{repeat=!repeat;$('repeat').classList.toggle('active',repeat);persistSession()};$('seek').onchange=()=>{let d=player?.getDuration?.()||0;if(d)player.seekTo(+$('seek').value/1000*d,true)};try{if(!mobileMode&&'mediaSession'in navigator){navigator.mediaSession.setActionHandler('nexttrack',next);navigator.mediaSession.setActionHandler('previoustrack',prev);navigator.mediaSession.setActionHandler('play',()=>player?.playVideo());navigator.mediaSession.setActionHandler('pause',()=>player?.pauseVideo())}}catch{}document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>selectView(b.dataset.view));
restoreSession();
beginStartupWatch(restoredTrack||recent[0]);
window.addEventListener('pagehide',()=>{rememberBrowseScroll();persistSession()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){rememberBrowseScroll();persistSession()}});
})();
