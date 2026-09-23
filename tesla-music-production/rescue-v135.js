/* Rescue V135 retired as a polling layer.
 * Compatibility-only event wiring. No periodic UI repair and no playVideo spam.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id);

function stableSearch(){
  const input=$('q'),go=$('go');
  if(!input||!go||go.dataset.rescueSearch)return;
  go.dataset.rescueSearch='1';
  const run=event=>{
    if(event){event.preventDefault();event.stopImmediatePropagation();}
    if(typeof window.search==='function')window.search();
    else if(typeof search==='function')search();
  };
  go.addEventListener('click',run,true);
  input.addEventListener('keydown',event=>{if(event.key==='Enter')run(event)},true);
}

function exposeCore(){
  try{
    if(typeof search==='function')window.search=search;
    if(typeof next==='function')window.next=next;
    if(typeof prev==='function')window.prev=prev;
  }catch{}
}

function hardenControls(){
  const binfo=$('binfo'),restore=$('restore');
  if(binfo&&!binfo.dataset.rescueNoOpen){
    binfo.dataset.rescueNoOpen='1';
    binfo.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation()},true);
  }
  if(restore&&!restore.dataset.rescueNoOpen){
    restore.dataset.rescueNoOpen='1';
    restore.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation()},true);
  }
}

let ytErrorHooked=false,lastErrorSkipAt=0;
function hookYouTubeErrors(){
  if(ytErrorHooked||!window.player||typeof window.player.addEventListener!=='function')return;
  ytErrorHooked=true;
  window.rescueV135YouTubeError=function(event){
    const now=Date.now();
    if(now-lastErrorSkipAt<2500)return;
    lastErrorSkipAt=now;
    const status=$('status');
    if(status)status.textContent='Video nejde vložiť z YouTube. Preskakujem na ďalšiu skladbu...';
    try{window.next?.(true)}catch{try{next(true)}catch{}}
  };
  try{window.player.addEventListener('onError','rescueV135YouTubeError')}catch{}
}

function armPendingPlay(active){
  const button=$('bplay');
  if(button)button.classList.toggle('pair-pending-play',!!active);
}

window.rescueV135StartRemote=function(track){
  try{window.playTrack?.(track)}catch{}
  requestAnimationFrame(()=>{
    try{
      const p=window.player;
      if(!p||typeof p.playVideo!=='function')return;
      p.playVideo();
      armPendingPlay(p.getPlayerState?.()!==1);
    }catch{}
  });
};

function boot(){
  exposeCore();
  stableSearch();
  hardenControls();
  hookYouTubeErrors();
  window.addEventListener('tesla-music-trackchange',()=>{exposeCore();hookYouTubeErrors()});
  window.addEventListener('tesla-music-profile-reloaded',exposeCore);
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
