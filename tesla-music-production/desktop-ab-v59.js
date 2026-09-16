/* V59 desktop-only A/B transition experiment. No mobile/search/admin/profile changes. */
(()=>{'use strict';if(!/^\/desktop\/?$/.test(location.pathname))return;
let a=null,b=null,active='a',armed=false,lastId='',nextId='';
function boot(){const host=document.querySelector('.video');if(!host||document.getElementById('ytB'))return;const d=document.createElement('div');d.id='ytB';d.style.cssText='position:absolute;inset:0;z-index:-1;opacity:.01;pointer-events:none';host.style.position='relative';host.appendChild(d);}
function idFromEvent(e){return e?.detail?.id||e?.detail?.youtubeId||''}
window.addEventListener('tesla-music-trackchange',e=>{lastId=idFromEvent(e);armed=false;});
window.musicDesktopABV59={version:59,experimental:true,attachPlayers(x,y){a=x;b=y},arm(id){nextId=id;armed=!!id},swap(){if(!armed||!a||!b)return false;const incoming=active==='a'?b:a,outgoing=active==='a'?a:b;incoming.loadVideoById(nextId);let tries=0;const t=setInterval(()=>{tries++;try{if(incoming.getPlayerState()===1){clearInterval(t);try{outgoing.pauseVideo()}catch{}active=active==='a'?'b':'a';armed=false}}catch{}if(tries>30)clearInterval(t)},50);return true},state(){return{active,armed,lastId,nextId}}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();})();
