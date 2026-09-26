/* Mobile V106: one desktop-style player flow: bottom bar -> audio mini -> video. */
(()=>{'use strict';if(!/^\/(?:index\.html)?$/.test(location.pathname))return;
function boot(){
  const playerWindow=document.getElementById('playerWindow');
  const restore=document.getElementById('restore');
  const info=document.querySelector('.bottom .binfo');
  const pmin=document.getElementById('pmin');
  const pmax=document.getElementById('pmax');
  const head=document.getElementById('phead');
  const bottom=document.querySelector('.bottom');
  const mainSeek=document.getElementById('seek');
  if(!playerWindow||!restore||!head)return;
  let userOpened=false;
  const closeToBar=()=>{
    userOpened=false;
    playerWindow.classList.remove('mini-recs','max','video-off');
    playerWindow.classList.add('minimized');
    document.body.classList.remove('mobile-player-open');
    try{localStorage.setItem('teslaMusic:miniRecommendations:v3','true')}catch{}
  };
  const openMini=event=>{
    event?.preventDefault();event?.stopPropagation();userOpened=true;
    playerWindow.classList.remove('minimized','max');
    playerWindow.classList.add('mini-recs','video-off');
    document.body.classList.remove('mobile-player-open');
    window.teslaMusicSetVideo?.(false);
  };
  const openVideo=event=>{
    event?.preventDefault();event?.stopPropagation();userOpened=true;
    window.teslaMusicSetFull?.();
    playerWindow.classList.remove('minimized','mini-recs');
    document.body.classList.add('mobile-player-open');
    setTimeout(()=>window.teslaMusicSetVideo?.(true),0);
  };
  restore.onclick=openVideo;
  restore.title='Otvoriť prehrávač s videom';
  restore.setAttribute('aria-label','Otvoriť prehrávač s videom');
  if(info){info.removeAttribute('role');info.removeAttribute('tabindex');info.style.cursor='default';info.onclick=event=>{event.preventDefault();event.stopPropagation()};info.onkeydown=null}
  if(pmin){pmin.onclick=closeToBar;pmin.title='Stiahnuť na spodnú lištu';pmin.setAttribute('aria-label','Stiahnuť na spodnú lištu')}
  if(pmax){pmax.onclick=openVideo;pmax.title='Otvoriť video';pmax.setAttribute('aria-label','Otvoriť video')}
  let video=document.getElementById('mobileMiniVideoOpen');
  if(!video){video=document.createElement('button');video.id='mobileMiniVideoOpen';video.type='button';video.className='iconbtn';video.textContent='🎬 Video';video.title='Zobraziť video';video.setAttribute('aria-label','Zobraziť video');head.insertBefore(video,pmin||pmax||null)}
  video.onclick=openVideo;
  const style=document.createElement('style');style.id='mobileV106PlayerParity';style.textContent=`
    /* iPhone: never remove the YouTube iframe from rendering while minimized.
       display:none makes Safari leave the next video cued/stopped at 0:00. */
    #playerWindow.minimized{
      display:block!important;
      position:fixed!important;
      left:1px!important;
      top:auto!important;
      right:auto!important;
      bottom:1px!important;
      width:2px!important;
      height:2px!important;
      min-width:2px!important;
      min-height:2px!important;
      max-width:2px!important;
      max-height:2px!important;
      opacity:.01!important;
      overflow:hidden!important;
      pointer-events:none!important;
      border:0!important;
      box-shadow:none!important;
      z-index:1!important;
    }
    #playerWindow.minimized .phead,
    #playerWindow.minimized .nowrow,
    #playerWindow.minimized .seek,
    #playerWindow.minimized .controls,
    #playerWindow.minimized .stats,
    #playerWindow.minimized .status,
    #playerWindow.minimized .mini-recommend,
    #playerWindow.minimized .resize,
    #playerWindow.minimized .mini-resize-zone,
    #playerWindow.minimized .mini-resize-corner{display:none!important}
    #playerWindow.minimized .player-body,
    #playerWindow.minimized .video,
    #playerWindow.minimized #yt,
    #playerWindow.minimized iframe{
      display:block!important;
      position:absolute!important;
      inset:0!important;
      width:2px!important;
      height:2px!important;
      min-width:2px!important;
      min-height:2px!important;
      opacity:.01!important;
      visibility:visible!important;
      pointer-events:none!important;
      padding:0!important;
      margin:0!important;
    }
    #mobileMiniVideoOpen{display:none;white-space:nowrap;padding:0 10px;font-size:13px}
    #playerWindow.mini-recs #mobileMiniVideoOpen{display:block}
    @media(max-width:760px){
      #playerWindow.mini-recs{left:6px!important;right:6px!important;top:auto!important;bottom:calc(86px + env(safe-area-inset-bottom))!important;width:auto!important;height:min(58dvh,520px)!important;min-width:0!important;min-height:340px!important}
      #playerWindow.mini-recs .phead{padding-left:12px!important}
      #playerWindow.mini-recs .mini-resize-corner{display:none!important}
      .bottom{overflow:visible!important}
      .bottom .btime{display:block!important}
    }
    @media(max-width:900px),(max-height:700px){
      #playerWindow:not(.minimized):not(.mini-recs){left:6px!important;right:6px!important;top:72px!important;bottom:90px!important;width:auto!important;height:auto!important;min-width:0!important;min-height:0!important;max-width:none!important;max-height:none!important}
      #playerWindow:not(.minimized):not(.mini-recs) .player-body{overflow:auto!important}
    }
    @media(max-width:520px){
      .bottom{height:90px!important;display:grid!important;grid-template-columns:44px minmax(70px,1fr) 42px 46px 42px!important;align-items:center!important;gap:5px!important;padding:11px 6px 15px!important}
      .bottom .restore{width:44px!important;min-width:44px!important;height:48px!important;padding:0!important}
      .bottom .binfo{min-width:0!important;overflow:hidden!important}
      .bottom .bname{font-size:clamp(11px,3.2vw,14px)!important;line-height:1.2!important}
      .bottom .bmeta{font-size:10px!important;line-height:1.2!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      .bottom .ctl{width:42px!important;min-width:42px!important;height:46px!important;padding:0!important;font-size:18px!important}
      .bottom .play{width:46px!important;min-width:46px!important}
      .bottom .btime{position:absolute!important;right:7px!important;bottom:1px!important;min-width:0!important;width:auto!important;font-size:10px!important;line-height:12px!important;text-align:right!important;white-space:nowrap!important}
    }`;
  document.head.appendChild(style);
  if(bottom&&mainSeek&&!document.getElementById('bottomSeek')){
    const seek=document.createElement('input');seek.id='bottomSeek';seek.type='range';seek.min='0';seek.max='1000';seek.step='1';seek.value=mainSeek.value||'0';seek.setAttribute('aria-label','Pozícia skladby');seek.style.cssText='position:absolute;left:0;right:0;top:-9px;width:100%;height:20px;margin:0;z-index:30;cursor:pointer;touch-action:none';bottom.prepend(seek);
    let dragging=false;
    seek.addEventListener('pointerdown',()=>dragging=true);
    seek.addEventListener('input',()=>mainSeek.value=seek.value);
    const commit=()=>{mainSeek.value=seek.value;mainSeek.dispatchEvent(new Event('change',{bubbles:true}));dragging=false};
    seek.addEventListener('change',commit);seek.addEventListener('pointerup',commit);
    window.addEventListener('tesla-music-tick',()=>{if(!dragging)seek.value=mainSeek.value||'0'});
  }
  window.addEventListener('tesla-music-trackchange',()=>{if(!userOpened)closeToBar()});
  const searchTab=document.querySelector('[data-tab="queue"]');
  const keepSearchLabel=()=>{if(searchTab&&searchTab.textContent!=='Vyhľadané')searchTab.textContent='Vyhľadané'};
  keepSearchLabel();if(searchTab)new MutationObserver(keepSearchLabel).observe(searchTab,{childList:true,characterData:true,subtree:true});
  closeToBar();setTimeout(()=>{if(!userOpened)closeToBar()},500);setTimeout(()=>{if(!userOpened)closeToBar()},2000);
  window.musicMobilePlayerV106=Object.freeze({version:107,openMini,openVideo,closeToBar});
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
