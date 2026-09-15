/* Music V52: /desktop-only behavior. Mobile root remains V50 behavior. */
(()=>{
'use strict';
if(!/^\/desktop\/?$/.test(location.pathname))return;
document.documentElement.dataset.musicDesktop='52';
const css=document.createElement('style');css.textContent=`html[data-music-desktop="52"] body{min-width:0}html[data-music-desktop="52"] .wrap{max-width:1180px;margin-inline:auto}html[data-music-desktop="52"] #playerWindow{max-width:920px;margin-inline:auto}`;document.head.appendChild(css);
function boot(){
 const pw=document.getElementById('playerWindow');if(!pw)return;
 let b=document.getElementById('desktopMiniToBar');
 if(!b){b=document.createElement('button');b.id='desktopMiniToBar';b.type='button';b.className='iconbtn';b.textContent='—';b.title='Stiahnuť prehrávač na lištu';b.setAttribute('aria-label','Stiahnuť prehrávač na lištu');const head=document.getElementById('phead'),pmin=document.getElementById('pmin');if(head)head.insertBefore(b,pmin||null);b.onclick=e=>{e.preventDefault();e.stopPropagation();window.teslaMusicSetMini?.();};}
 const r=document.getElementById('restore');if(r){r.title='Otvoriť prehrávač';r.setAttribute('aria-label','Otvoriť prehrávač');}
}
window.musicDesktopV52=Object.freeze({version:52,path:'/desktop',mobileRootUntouched:true,miniToBar:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
