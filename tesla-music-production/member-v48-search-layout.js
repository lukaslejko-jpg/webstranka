/* Music V48: restore V44 admin/search layout above V47 and add debounced live search. Additive only. */
(()=>{
'use strict';
if(window.musicSearchLayoutV48)return;
const SEARCH_DELAY=700;
let timer=0,lastAuto='';
function installStyle(){
 if(document.getElementById('musicV48SearchLayout'))return;
 const s=document.createElement('style');s.id='musicV48SearchLayout';s.textContent=`
@media(max-width:700px){
 .top.m41-admin-top{display:grid!important;grid-template-columns:32px minmax(0,1fr) 54px!important;align-items:center!important;gap:8px!important;position:relative!important;padding:8px 10px!important}
 .top.m41-admin-top .m41dots{position:static!important;left:auto!important;top:auto!important;transform:none!important;grid-column:1!important;grid-row:1!important;width:32px!important;min-width:32px!important;height:48px!important;margin:0!important;padding:0!important;border-radius:12px!important;display:block!important}
 .top.m41-admin-top .search{grid-column:2!important;grid-row:1!important;width:100%!important;min-width:0!important;height:48px!important;display:block!important;visibility:visible!important;opacity:1!important;padding:0 13px!important}
 .top.m41-admin-top .btn{grid-column:3!important;grid-row:1!important;width:54px!important;min-width:54px!important;height:48px!important;display:block!important;visibility:visible!important;opacity:1!important;margin:0!important}
 .top.m41-admin-top .brand,.top.m41-admin-top .m41account{display:none!important}
}
`;
 document.head.appendChild(s);
}
function syncLayout(){
 const top=document.querySelector('.top'),dots=document.getElementById('m41dots'),q=document.getElementById('q'),go=document.getElementById('go');
 if(!top||!q||!go)return;
 if(dots)top.classList.add('m41-admin-top');else top.classList.remove('m41-admin-top');
 // Never allow account/admin background work to hide the search controls.
 q.hidden=false;go.hidden=false;q.removeAttribute('aria-hidden');go.removeAttribute('aria-hidden');
}
function liveSearch(){
 const q=document.getElementById('q'),go=document.getElementById('go');if(!q||!go||q.dataset.v48live)return;
 q.dataset.v48live='1';
 q.addEventListener('input',e=>{
  if(e.isComposing)return;
  clearTimeout(timer);
  const value=q.value.trim();
  if(value.length<2){lastAuto='';return;}
  timer=setTimeout(()=>{
   const now=q.value.trim();
   if(now.length<2||now===lastAuto)return;
   lastAuto=now;
   go.click();
  },SEARCH_DELAY);
 });
 q.addEventListener('keydown',e=>{if(e.key==='Enter'){clearTimeout(timer);lastAuto=q.value.trim();}});
}
function boot(){
 installStyle();syncLayout();liveSearch();
 const obs=new MutationObserver(()=>{syncLayout();liveSearch()});
 if(document.body)obs.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']});
 window.addEventListener('pageshow',syncLayout);
 window.addEventListener('resize',syncLayout);
}
window.musicSearchLayoutV48=Object.freeze({version:48,sync:syncLayout,live:true,delay:SEARCH_DELAY});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
