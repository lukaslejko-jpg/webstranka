(()=>{
  const MINI_KEY='teslaMusic:miniRecommendations:v3';
  const SIZE_KEY='teslaMusic:miniSize:v5';
  const MAP_MODE=new URLSearchParams(location.search).get('map')==='1';
  const MOBILE_STANDALONE=()=>!MAP_MODE&&window.innerWidth<=600;
  const pw=document.getElementById('playerWindow'),pmin=document.getElementById('pmin'),restore=document.getElementById('restore'),binfo=document.getElementById('binfo'),pmax=document.getElementById('pmax'),list=document.getElementById('miniRecList');
  const miniSeek=document.getElementById('miniSeek'),miniNowTime=document.getElementById('miniNowTime'),miniTotalTime=document.getElementById('miniTotalTime');
  const corner=document.getElementById('miniResizeCorner');
  if(!pw||!pmin||!list)return;
  const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??d}catch{return d}},write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
  let mini=MAP_MODE?true:!!read(MINI_KEY,false),scrubbing=false,lastDuration=0,drag=null;
  if(MOBILE_STANDALONE())mini=true;
  let size=read(SIZE_KEY,{w:520,h:570});
  const itemKey=t=>'yt:'+String(t?.id||t?.youtubeId||'');
  const fmt=v=>{v=Math.max(0,Math.floor(Number(v)||0));return Math.floor(v/60)+':'+String(v%60).padStart(2,'0')};
  function recommendations(){
    const profile=read('teslaMusic:brain:v1',{tracks:{},artists:{}}),queue=read('teslaMusic:queue:v1',[]),tracks=Object.values(profile.tracks||{}),artists=profile.artists||{};
    const score=s=>(Number(s.score)||0)+(s.liked?6:0)+(Number(s.plays)||0)*.7+(Number(s.completed)||0)*.9-(Number(s.skips)||0)*.6+(Number(artists[String(s.artist||'YouTube').toLowerCase()]?.score)||0)*.35;
    const learned=[...tracks].sort((a,b)=>score(b)-score(a)).map(s=>({id:s.youtubeId,title:s.title,uploader:s.artist,duration:s.duration,thumbnail:s.thumbnail,brainScore:score(s)}));
    const seen=new Set(),out=[];
    for(const x of [...learned,...queue]){const k=itemKey(x);if(!x||(!x.id&&!x.youtubeId)||seen.has(k))continue;seen.add(k);out.push(x);if(out.length>=10)break}
    return out;
  }
  function renderList(){
    const rows=recommendations();
    list.innerHTML=rows.length?rows.map((x,i)=>`<button class="mini-rec-row" data-r="${i}"><img src="${String(x.thumbnail||'').replace(/"/g,'&quot;')}"><span><b>${String(x.title||'Bez názvu').replace(/[&<>]/g,'')}</b><small>${String(x.uploader||x.artist||'YouTube').replace(/[&<>]/g,'')}</small></span></button>`).join(''):'<div class="empty">Najprv prehraj alebo označ ♥ niekoľko skladieb.</div>';
    list.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{const x=rows[Number(b.dataset.r)];if(x&&typeof window.playTrack==='function')window.playTrack(x)});
  }
  function renderStatic(){
    document.getElementById('miniNowTitle').textContent=document.getElementById('bname')?.textContent||'Bez skladby';
    document.getElementById('miniNowSub').textContent=document.getElementById('bmeta')?.textContent||'YouTube';
    document.getElementById('miniLike').textContent=document.getElementById('like')?.textContent||'♡';
    document.getElementById('miniPlay').textContent=document.getElementById('bplay')?.textContent||'▶';
    renderList();
  }
  function syncSeek(now,duration,playing){
    lastDuration=Number(duration)||0;
    if(!scrubbing){miniSeek.value=lastDuration>0?Math.round((Number(now)||0)/lastDuration*1000):0;miniNowTime.textContent=fmt(now);miniTotalTime.textContent=fmt(duration)}
    document.getElementById('miniPlay').textContent=playing?'⏸':'▶';
  }
  function clampSize(w,h){
    const maxW=Math.max(380,window.innerWidth-16),maxH=Math.max(390,window.innerHeight-110);
    return {w:Math.max(380,Math.min(maxW,w)),h:Math.max(390,Math.min(maxH,h))};
  }
  function applySize(){
    if(!mini||MOBILE_STANDALONE())return;
    const s=clampSize(Number(size.w)||520,Number(size.h)||570);size=s;write(SIZE_KEY,size);
    if(window.innerWidth>760){pw.style.setProperty('width',s.w+'px','important');pw.style.setProperty('height',s.h+'px','important')}
  }
  function clearMiniSizeStyles(){pw.style.removeProperty('width');pw.style.removeProperty('height')}
  function apply(){
    if(MOBILE_STANDALONE()){
      clearMiniSizeStyles();
      pw.classList.remove('mini-recs','max');
      pw.classList.toggle('minimized',mini);
      document.body.classList.toggle('mobile-player-open',!mini);
      write(MINI_KEY,mini);
      if(mini)renderStatic();
      return;
    }
    document.body.classList.remove('mobile-player-open');
    pw.classList.remove('minimized');pw.classList.toggle('mini-recs',mini);write(MINI_KEY,mini);
    if(mini){pw.classList.remove('max');applySize();renderStatic()}else clearMiniSizeStyles();
  }
  function enter(){mini=true;apply()}
  function exit(){mini=false;apply()}
  pmin.onclick=e=>{e.preventDefault();e.stopPropagation();enter()};
  if(restore)restore.onclick=e=>{e.preventDefault();e.stopPropagation();exit()};
  if(binfo)binfo.onclick=e=>{e.preventDefault();e.stopPropagation();exit()};
  const oldMax=pmax?.onclick;if(pmax)pmax.onclick=e=>{if(mini)exit();if(typeof oldMax==='function')oldMax.call(pmax,e)};
  document.getElementById('miniPrev').onclick=()=>document.getElementById('bprev')?.click();
  document.getElementById('miniPlay').onclick=()=>document.getElementById('bplay')?.click();
  document.getElementById('miniNext').onclick=()=>document.getElementById('bnext')?.click();
  document.getElementById('miniLike').onclick=()=>document.getElementById('like')?.click();
  miniSeek.addEventListener('pointerdown',()=>scrubbing=true);
  miniSeek.addEventListener('input',()=>{if(lastDuration>0)miniNowTime.textContent=fmt(Number(miniSeek.value)/1000*lastDuration)});
  function commitSeek(){const main=document.getElementById('seek');if(main){main.value=miniSeek.value;main.dispatchEvent(new Event('change',{bubbles:true}))}scrubbing=false}
  miniSeek.addEventListener('change',commitSeek);miniSeek.addEventListener('pointerup',commitSeek);
  function startResize(e){
    if(!mini||window.innerWidth<=760)return;
    e.preventDefault();e.stopPropagation();
    const r=pw.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,w:r.width,h:r.height,left:r.left,top:r.top};
    e.currentTarget.setPointerCapture?.(e.pointerId);
    document.body.style.userSelect='none';
  }
  function moveResize(e){
    if(!drag||drag.id!==e.pointerId)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    const s=clampSize(drag.w-dx,drag.h-dy);
    size=s;
    const left=drag.left+(drag.w-s.w),top=drag.top+(drag.h-s.h);
    pw.style.setProperty('width',s.w+'px','important');
    pw.style.setProperty('height',s.h+'px','important');
    pw.style.setProperty('left',Math.max(4,left)+'px','important');
    pw.style.setProperty('top',Math.max(70,top)+'px','important');
    write(SIZE_KEY,size);
  }
  function endResize(e){if(!drag||drag.id!==e.pointerId)return;drag=null;document.body.style.userSelect='';write(SIZE_KEY,size)}
  if(corner){corner.addEventListener('pointerdown',startResize);corner.addEventListener('pointermove',moveResize);corner.addEventListener('pointerup',endResize);corner.addEventListener('pointercancel',endResize)};
  window.addEventListener('resize',()=>{if(MOBILE_STANDALONE()&&mini!==pw.classList.contains('minimized'))mini=true;apply();if(mini)applySize()});
  window.addEventListener('tesla-music-trackchange',()=>mini&&renderStatic());
  window.addEventListener('tesla-music-tick',e=>{if(mini)syncSeek(e.detail?.now,e.detail?.duration,e.detail?.playing)});
  setInterval(()=>{if(mini)renderList()},4000);
  window.teslaMusicSetMini=enter;
  window.teslaMusicSetFull=exit;
  apply();
})();