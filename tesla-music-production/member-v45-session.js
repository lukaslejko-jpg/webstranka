/* Music V45 session-visibility fix: never flash the login gate while a saved session is being verified. */
(()=>{
'use strict';
if(window.musicSessionV45)return;
const SESSION='music:memberSession:v1';
function syncGate(){
 const has=!!localStorage.getItem(SESSION);
 const g=document.getElementById('musicGate');
 if(!g)return;
 if(has){g.style.setProperty('display','none','important');g.setAttribute('aria-hidden','true');}
 else{g.style.removeProperty('display');g.removeAttribute('aria-hidden');}
}
const obs=new MutationObserver(syncGate);
function start(){syncGate();if(document.body)obs.observe(document.body,{childList:true,subtree:true});let n=0;const t=setInterval(()=>{syncGate();if(++n>40)clearInterval(t)},250);}
window.addEventListener('storage',e=>{if(e.key===SESSION)syncGate()});
window.addEventListener('pageshow',syncGate);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.musicSessionV45=Object.freeze({version:45,sync:syncGate});
})();
