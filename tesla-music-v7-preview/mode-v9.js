(()=>{
  const qs=new URLSearchParams(location.search),MAP=qs.get('map')==='1',EMBED=qs.get('embed')==='1';
  const pw=document.getElementById('playerWindow'),head=document.getElementById('phead'),pmin=document.getElementById('pmin'),pmax=document.getElementById('pmax'),corner=document.getElementById('miniResizeCorner');
  if(!pw||!head)return;
  if(EMBED)document.body.classList.add('music-embed');
  const ORIGIN='https://tesla-waze.vercel.app';
  let videoOn=MAP?false:(sessionStorage.getItem('teslaMusic:videoVisible:v1')==='1');
  let drag=null,resize=null,lastSent='';
  function isMini(){return pw.classList.contains('mini-recs')}
  function ensureVideoButton(){if(document.getElementById('videoToggle'))return document.getElementById('videoToggle');const b=document.createElement('button');b.id='videoToggle';b.className='video-toggle';b.type='button';head.insertBefore(b,pmin||pmax||null);b.onclick=e=>{e.preventDefault();e.stopPropagation();if(isMini())return;videoOn=!videoOn;sessionStorage.setItem('teslaMusic:videoVisible:v1',videoOn?'1':'0');syncUi()};return b}
  function ensureCloseButton(){if(!EMBED)return null;if(document.getElementById('musicClose'))return document.getElementById('musicClose');const b=document.createElement('button');b.id='musicClose';b.className='iconbtn';b.type='button';b.textContent='×';b.title='Zavrieť hudbu';b.style.fontSize='25px';head.appendChild(b);b.onclick=e=>{e.preventDefault();e.stopPropagation();videoOn=false;applyVideo();try{parent.postMessage({type:'tesla-music-close'},ORIGIN)}catch{}};return b}
  function applyVideo(){if(isMini())videoOn=false;const off=!videoOn;if(pw.classList.contains('video-off')!==off)pw.classList.toggle('video-off',off);const b=ensureVideoButton();const txt=videoOn?'🎵 Hudba':'🎬 Video';if(b.textContent!==txt)b.textContent=txt;b.title=videoOn?'Skryť video a nechať hudobné ovládanie':'Zobraziť video';b.style.display=isMini()?'none':'';if(MAP&&!videoOn)sessionStorage.removeItem('teslaMusic:videoVisible:v1')}
  function applyMode(){const mini=isMini();document.body.classList.toggle('music-full',EMBED&&!mini);if(EMBED&&mini){const s=pw.style;if(pw.classList.contains('max'))pw.classList.remove('max');if(s.getPropertyValue('left')!=='0px')s.setProperty('left','0px','important');if(s.getPropertyValue('top')!=='0px')s.setProperty('top','0px','important');if(s.getPropertyValue('width')!=='100%')s.setProperty('width','100%','important');if(s.getPropertyValue('height')!=='100%')s.setProperty('height','100%','important')}else if(EMBED&&!mini){pw.style.removeProperty('left');pw.style.removeProperty('top');pw.style.removeProperty('width');pw.style.removeProperty('height');pw.classList.add('max')}}
  function notify(force=false){if(!EMBED||window.parent===window)return;const payload={type:'tesla-music-ui-state',mode:isMini()?'mini':'full',video:videoOn},sig=payload.mode+'|'+payload.video;if(!force&&sig===lastSent)return;lastSent=sig;try{parent.postMessage(payload,ORIGIN)}catch{}}
  function syncUi(force=false){applyMode();applyVideo();notify(force)}
  function startup(){if(MAP&&typeof window.teslaMusicSetMini==='function')window.teslaMusicSetMini();if(MAP)videoOn=false;ensureCloseButton();ensureVideoButton();syncUi(true)}
  setTimeout(startup,0);setTimeout(startup,350);
  window.teslaMusicSetVideo=v=>{videoOn=!!v;if(isMini())videoOn=false;sessionStorage.setItem('teslaMusic:videoVisible:v1',videoOn?'1':'0');syncUi(true)};
  window.teslaMusicToggleVideo=()=>{if(!isMini())window.teslaMusicSetVideo(!videoOn)};
  window.addEventListener('message',e=>{if(e.origin!==ORIGIN||!e.data||e.data.type!=='tesla-music-command')return;const a=e.data.action;if(a==='mini')window.teslaMusicSetMini?.();else if(a==='full')window.teslaMusicSetFull?.();else if(a==='video-toggle')window.teslaMusicToggleVideo?.();else if(a==='video-off')videoOn=false;else if(a==='video-on'&&!isMini())videoOn=true;setTimeout(()=>syncUi(true),0)});
  [pmin,pmax].filter(Boolean).forEach(b=>b.addEventListener('click',()=>setTimeout(()=>syncUi(true),0),false));
  if(EMBED){
    head.addEventListener('pointerdown',e=>{if(!isMini()||e.target.closest('button,input')||e.button!==0)return;e.preventDefault();e.stopImmediatePropagation();drag={id:e.pointerId,x:e.clientX,y:e.clientY};head.setPointerCapture?.(e.pointerId)},true);
    head.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;try{parent.postMessage({type:'tesla-music-move',dx,dy},ORIGIN)}catch{}},true);
    head.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();drag=null},true);
    if(corner){corner.addEventListener('pointerdown',e=>{if(!isMini())return;e.preventDefault();e.stopImmediatePropagation();resize={id:e.pointerId,x:e.clientX,y:e.clientY};corner.setPointerCapture?.(e.pointerId)},true);corner.addEventListener('pointermove',e=>{if(!resize||resize.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const dx=e.clientX-resize.x,dy=e.clientY-resize.y;resize.x=e.clientX;resize.y=e.clientY;try{parent.postMessage({type:'tesla-music-resize',anchor:'tl',dx,dy},ORIGIN)}catch{}},true);corner.addEventListener('pointerup',e=>{if(!resize||resize.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();resize=null},true)}
  }
  ensureCloseButton();ensureVideoButton();syncUi(true);
})();