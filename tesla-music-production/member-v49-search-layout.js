/* Music V49: safe search/admin layout with no MutationObserver. Live search is debounced only. */
(()=>{
'use strict';
if(window.musicSearchLayoutV49)return;
const SEARCH_DELAY=800;
let timer=0,lastAuto='';
function installStyle(){
 if(document.getElementById('musicV49SearchLayout'))return;
 const s=document.createElement('style');
 s.id='musicV49SearchLayout';
 s.textContent=`
@media(max-width:700px){
 .top:has(#m41dots){display:grid!important;grid-template-columns:32px minmax(0,1fr) 54px!important;align-items:center!important;gap:8px!important;position:relative!important;padding:8px 10px!important}
 .top:has(#m41dots) #m41dots{position:static!important;left:auto!important;top:auto!important;transform:none!important;grid-column:1!important;grid-row:1!important;width:32px!important;min-width:32px!important;height:48px!important;margin:0!important;padding:0!important;border-radius:12px!important;display:block!important}
 .top:has(#m41dots) .search{grid-column:2!important;grid-row:1!important;width:100%!important;min-width:0!important;height:48px!important;display:block!important;visibility:visible!important;opacity:1!important;padding:0 13px!important}
 .top:has(#m41dots) .btn{grid-column:3!important;grid-row:1!important;width:54px!important;min-width:54px!important;height:48px!important;display:block!important;visibility:visible!important;opacity:1!important;margin:0!important}
 .top:has(#m41dots) .brand,.top:has(#m41dots) .m41account{display:none!important}
}
`;
 document.head.appendChild(s);
}
function installLiveSearch(){
 const q=document.getElementById('q'),go=document.getElementById('go');
 if(!q||!go||q.dataset.v49live)return;
 q.dataset.v49live='1';
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
 q.addEventListener('keydown',e=>{
  if(e.key==='Enter'){
   clearTimeout(timer);
   lastAuto=q.value.trim();
  }
 });
}
function boot(){installStyle();installLiveSearch();}
window.musicSearchLayoutV49=Object.freeze({version:49,live:true,delay:SEARCH_DELAY,observer:false});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
