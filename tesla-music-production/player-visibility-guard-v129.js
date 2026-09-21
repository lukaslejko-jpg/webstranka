/* Music V129: track changes never open the player; only an explicit player control may open it. */
(()=>{'use strict';
function boot(){
  const playerWindow=document.getElementById('playerWindow');
  const restore=document.getElementById('restore');
  const pmin=document.getElementById('pmin');
  const pmax=document.getElementById('pmax');
  const desktopToBar=document.getElementById('desktopToBar');
  if(!playerWindow)return;

  let explicitlyOpen=!playerWindow.classList.contains('minimized');
  let closing=false;
  const closeToBar=()=>{
    closing=true;
    explicitlyOpen=false;
    playerWindow.classList.remove('mini-recs','max','video-off');
    playerWindow.classList.add('minimized');
    document.body.classList.remove('mobile-player-open');
    try{localStorage.setItem('teslaMusic:miniRecommendations:v3','false')}catch{}
    closing=false;
  };
  const allowOpen=()=>{if(!closing)explicitlyOpen=true};

  restore?.addEventListener('click',allowOpen,{capture:true});
  pmax?.addEventListener('click',allowOpen,{capture:true});
  pmin?.addEventListener('click',event=>{
    if(/^\/desktop\/?$/.test(location.pathname)&&!playerWindow.classList.contains('minimized'))allowOpen();
    else if(!event.defaultPrevented)closeToBar();
  },{capture:true});
  desktopToBar?.addEventListener('click',closeToBar,{capture:true});

  window.addEventListener('tesla-music-trackchange',()=>{
    if(!explicitlyOpen){closeToBar();queueMicrotask(closeToBar);requestAnimationFrame(closeToBar)}
  });
  new MutationObserver(()=>{
    if(!closing&&!explicitlyOpen&&!playerWindow.classList.contains('minimized'))closeToBar();
  }).observe(playerWindow,{attributes:true,attributeFilter:['class']});

  if(playerWindow.classList.contains('minimized'))closeToBar();
  window.teslaMusicVisibilityV129=Object.freeze({version:129,closeToBar,isExplicitlyOpen:()=>explicitlyOpen});
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
