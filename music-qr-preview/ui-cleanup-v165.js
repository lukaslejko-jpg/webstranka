(function(){'use strict';
function norm(s){return String(s||'').replace(/\s+/g,' ').trim().toLowerCase()}
function hideYoutubeAccount(){var nodes=document.querySelectorAll('button,a,.chip');for(var i=0;i<nodes.length;i++){var t=norm(nodes[i].textContent);if(t==='youtube účet'||t==='youtube ucet'){nodes[i].style.display='none';nodes[i].setAttribute('aria-hidden','true')}}}
function apply(){hideYoutubeAccount()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
var n=0,t=setInterval(function(){apply();if(++n>24)clearInterval(t)},250);
})();