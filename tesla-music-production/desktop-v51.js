/* Music V51: desktop/Tesla parity layer above stable mobile V50. Desktop only. */
(()=>{
'use strict';
if(window.musicDesktopV51)return;
const DESKTOP=()=>window.innerWidth>760;
const pw=document.getElementById('playerWindow');
if(!pw)return;
function ensureDesktopMiniButton(){
 if(!DESKTOP())return null;
 let b=document.getElementById('desktopMiniToBar');
 if(b)return b;
 b=document.createElement('button');b.id='desktopMiniToBar';b.type='button';b.className='iconbtn';b.textContent='—';b.title='Stiahnuť prehrávač na lištu';b.setAttribute('aria-label','Stiahnuť prehrávač na lištu');
 const head=document.getElementById('phead'),pmin=document.getElementById('pmin');
 if(head)head.insertBefore(b,pmin||null);
 b.onclick=e=>{e.preventDefault();e.stopPropagation();window.teslaMusicSetMini?.();};
 return b;
}
function ensureDesktopRestore(){
 if(!DESKTOP())return null;
 const r=document.getElementById('restore');if(!r)return null;
 r.title='Otvoriť prehrávač';r.setAttribute('aria-label','Otvoriť prehrávač');return r;
}
function apply(){
 const b=ensureDesktopMiniButton();ensureDesktopRestore();
 if(b)b.hidden=!DESKTOP();
}
function boot(){apply();window.addEventListener('resize',apply,{passive:true});window.addEventListener('pageshow',apply,{passive:true});}
window.musicDesktopV51=Object.freeze({version:51,scope:'desktop-only',mobileUntouched:true,miniToBar:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
