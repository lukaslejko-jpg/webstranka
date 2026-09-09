(()=>{
  const qs=new URLSearchParams(location.search),MAP=qs.get('map')==='1',EMBED=qs.get('embed')==='1';
  const pw=document.getElementById('playerWindow'),head=document.getElementById('phead'),pmin=document.getElementById('pmin'),pmax=document.getElementById('pmax'),corner=document.getElementById('miniResizeCorner');
  if(!pw||!head)return;
  if(EMBED)document.body.classList.add('music-embed');
  const ORIGIN='https://tesla-waze.vercel.app';
  let videoOn=MAP?false:(sessionStorage.getItem('teslaMusic:videoVisible:v1')==='1');
  let drag=null,resize=null;
  function isMini(){return pw.classList.contains('mini-recs')}
  function ensureVideoButton(){if(document.getElementById('videoToggle'))return document.getElementById('videoToggle');const b=document.createElement('button');b.id='videoToggle';b.className='video-toggle';b.type='button';head.insertBefore(b,pmin||pmax||null);b.onclick=e=>{e.preventDefault();e.stopPropagation();if(isMini())return;videoOn=!videoOn;sessionStorage.setItem('teslaMusic:videoVisible:v1',videoOn?'1':'0');applyVideo();notify()};return b}
  function applyVideo(){if(isMini())videoOn=false;pw.classList.toggle('video-off',!videoOn);const b=ensureVideoButton();b.textContent=videoOn?'🎵 Hudba':'🎬 Video';b.title=videoOn?'Skryť video a nechať hudobné ovládanie':'Zobraziť video';b.style.display=isMini()?'none':'';if(MAP&&!videoOn)sessionStorage.removeItem('teslaMusic:videoVisible:v1')}
  function normalizeEmbed(){if(!EMBED)return;pw.classList.remove('max');pw.style.setProperty('left','0px','important');pw.style.setProperty('top','0px','important');pw.style.setProperty('width','100%','important');pw.style.setProperty('height','100%','important')}
  function notify(){if(!EMBED||window.parent===window)return;try{parent.postMessage({type:'tesla-music-ui-state',mode:isMini()?'mini':'full',video:videoOn},ORIGIN)}catch{}}
  const mo=new MutationObserver(()=>{normalizeEmbed();applyVideo();notify()});mo.observe(pw,{attributes:true,attributeFilter:['class','style']});
  function startup(){if(MAP&&typeof window.teslaMusicSetMini==='function')window.teslaMusicSetMini();if(MAP)videoOn=false;normalizeEmbed();applyVideo();notify()}
  setTimeout(startup,0);setTimeout(startup,400);
  window.teslaMusicSetVideo=v=>{videoOn=!!v;if(isMini())videoOn=false;sessionStorage.setItem('teslaMusic:videoVisible:v1',videoOn?'1':'0');applyVideo();notify()};
  window.teslaMusicToggleVideo=()=>{if(!isMini())window.teslaMusicSetVideo(!videoOn)};
  window.addEventListener('message',e=>{if(e.origin!==ORIGIN||!e.data)return;const a=e.data.action;if(e.data.type!=='tesla-music-command')return;if(a==='mini')window.teslaMusicSetMini?.();if(a==='full')window.teslaMusicSetFull?.();if(a==='video-toggle')window.teslaMusicToggleVideo?.();if(a==='video-off')window.teslaMusicSetVideo?.(false);if(a==='video-on'&&!isMini())window.teslaMusicSetVideo?.(true);normalizeEmbed();applyVideo();notify()});
  if(EMBED){
    head.addEventListener('pointerdown',e=>{if(e.target.closest('button,input')||e.button!==0)return;e.preventDefault();e.stopImmediatePropagation();drag={id:e.pointerId,x:e.clientX,y:e.clientY};head.setPointerCapture?.(e.pointerId)},true);
    head.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;try{parent.postMessage({type:'tesla-music-move',dx,dy},ORIGIN)}catch{}},true);
    head.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();drag=null},true);
    if(corner){corner.addEventListener('pointerdown',e=>{if(!isMini())return;e.preventDefault();e.stopImmediatePropagation();resize={id:e.pointerId,x:e.clientX,y:e.clientY};corner.setPointerCapture?.(e.pointerId)},true);corner.addEventListener('pointermove',e=>{if(!resize||resize.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const dx=e.clientX-resize.x,dy=e.clientY-resize.y;resize.x=e.clientX;resize.y=e.clientY;try{parent.postMessage({type:'tesla-music-resize',anchor:'tl',dx,dy},ORIGIN)}catch{}},true);corner.addEventListener('pointerup',e=>{if(!resize||resize.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();resize=null},true)}
  }
  ensureVideoButton();applyVideo();notify();
})();
