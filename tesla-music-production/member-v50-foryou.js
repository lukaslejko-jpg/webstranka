/* Music V50: additive fresh rotation for PRE TEBA only. No player/auth/search/admin changes. */
(()=>{
'use strict';
if(window.musicForYouV50)return;
const PROFILE='teslaMusic:brain:v1',EXPOSURE='music:foryou:exposure:v50';
const SESSION_SEED=(Date.now()^Math.floor(Math.random()*0x7fffffff))>>>0;
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??d}catch{return d}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
function hash(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function videoId(card){const src=card.querySelector('img')?.src||'';return src.match(/\/vi\/([A-Za-z0-9_-]{11})\//)?.[1]||''}
function personal(t){if(!t)return 0;return Number(t.score||0)+(t.liked?5:0)+Number(t.plays||0)*.6+Number(t.completed||0)*.8-Number(t.skips||0)*.5}
function rotate(id){return (((hash(id+':'+SESSION_SEED)%2001)-1000)/1000)*1.5}
function exposurePenalty(id,ex){const at=Number(ex[id]||0),age=Date.now()-at;if(!at)return 0;if(age<6*3600e3)return 6;if(age<24*3600e3)return 4;if(age<72*3600e3)return 2;return 0}
function isForYou(){return document.querySelector('[data-tab="foryou"]')?.classList.contains('active')}
function reorder(){
 if(!isForYou())return;
 const grid=document.getElementById('grid');if(!grid)return;
 const cards=[...grid.querySelectorAll('.card')];if(cards.length<3)return;
 const profile=load(PROFILE,{tracks:{}}),tracks=profile.tracks||{},ex=load(EXPOSURE,{});
 const info=cards.map((node,pos)=>{const id=videoId(node),t=tracks['yt:'+id]||null;return{node,id,t,pos,score:personal(t)+rotate(id||String(pos))-exposurePenalty(id,ex),fresh:!!id&&(!t||Number(t.plays||0)===0)}});
 const fresh=info.filter(x=>x.fresh).sort((a,b)=>b.score-a.score),known=info.filter(x=>!x.fresh).sort((a,b)=>b.score-a.score),out=[];
 let fi=0,ki=0;while(out.length<Math.min(12,info.length)){
  for(let n=0;n<2&&ki<known.length&&out.length<12;n++)out.push(known[ki++]);
  if(fi<fresh.length&&out.length<12)out.push(fresh[fi++]);
  if(ki>=known.length&&fi<fresh.length)out.push(fresh[fi++]);
  if(fi>=fresh.length&&ki<known.length)out.push(known[ki++]);
 }
 const used=new Set(out);const rest=info.filter(x=>!used.has(x)).sort((a,b)=>b.score-a.score);for(const x of [...out,...rest])grid.appendChild(x.node);
 const now=Date.now();for(const x of out.slice(0,8))if(x.id)ex[x.id]=now;for(const [id,at] of Object.entries(ex))if(now-Number(at)>7*86400e3)delete ex[id];save(EXPOSURE,ex);
}
function schedule(ms=120){setTimeout(reorder,ms)}
function boot(){schedule(600);document.querySelector('[data-tab="foryou"]')?.addEventListener('click',()=>schedule(80));window.addEventListener('pageshow',()=>schedule(250));}
window.musicForYouV50=Object.freeze({version:50,reorder,scope:'foryou-only',observer:false,interval:false});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
