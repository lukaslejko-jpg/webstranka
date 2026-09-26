(function(){'use strict';
function hideYoutubeAccount(){
 var nodes=document.querySelectorAll('button,a,.chip');
 for(var i=0;i<nodes.length;i++){var t=(nodes[i].textContent||'').replace(/\s+/g,' ').trim().toLowerCase();if(t==='youtube účet'||t==='youtube ucet'){nodes[i].style.display='none';nodes[i].setAttribute('aria-hidden','true')}}
}
function setFilterDefaults(){
 var panel=document.getElementById('musicFiltersPanel');if(!panel)return;
 var only=panel.querySelector('[data-filter="onlyArtist"]'),similar=panel.querySelector('[data-filter="similar"]');
 if(only)only.checked=false;if(similar)similar.checked=true;
}
function apply(){hideYoutubeAccount();setFilterDefaults()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
var n=0,t=setInterval(function(){apply();if(++n>20)clearInterval(t)},250);
})();