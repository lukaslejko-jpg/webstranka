/* Music V47: auth/profile/admin work stays in background and must never interrupt playback. */
(()=>{
'use strict';
if(window.musicBackgroundV47)return;
const API='https://europrojekty-app.vercel.app/api/music';
const SESSION='music:memberSession:v1',USER='music:memberUser:v1';
const KEYS=['teslaMusic:brain:v1','teslaMusic:queue:v1','teslaMusic:searchHistory:v1','teslaMusic:settings:v1'];
let adminCache=null,adminAt=0,prefetching=null;
const token=()=>localStorage.getItem(SESSION)||'';
const sig=()=>KEYS.map(k=>localStorage.getItem(k)||'').join('|');
async function call(action,data={}){const t=token();if(!t)throw Error('NO_SESSION');const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+t},body:JSON.stringify({action,...data}),cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||('HTTP '+r.status));return d;}
function applyProfile(p){if(!p||typeof p!=='object')return false;let changed=false;for(const k of KEYS){if(Object.prototype.hasOwnProperty.call(p,k)&&p[k]!==null){const next=JSON.stringify(p[k]),old=localStorage.getItem(k)||'';if(next!==old){localStorage.setItem(k,next);changed=true}}}if(changed){try{window.dispatchEvent(new CustomEvent('tesla-music-profile-reloaded',{detail:{source:'synology',background:true}}))}catch{}}return changed;}
async function prefetchAdmin(force=false){const u=JSON.parse(localStorage.getItem(USER)||'null');if(!u||u.role!=='admin'||!token())return null;if(!force&&adminCache&&Date.now()-adminAt<30000)return adminCache;if(prefetching)return prefetching;prefetching=call('admin.users').then(d=>{adminCache=d;adminAt=Date.now();return d}).catch(()=>null).finally(()=>{prefetching=null});return prefetching;}
async function warm(){if(!token())return;try{const me=await call('me');if(me?.user)localStorage.setItem(USER,JSON.stringify(me.user));const p=await call('profile.get');if(p?.profile)applyProfile(p.profile);if(me?.user?.role==='admin')prefetchAdmin(false);}catch{} }
// Serve a fresh prefetched admin list immediately to the existing V41 panel; refresh remains in background.
const nativeFetch=window.fetch.bind(window);window.fetch=async(input,init)=>{try{const raw=typeof input==='string'?input:String(input?.url||'');if(raw===API&&String(init?.method||'GET').toUpperCase()==='POST'){const body=JSON.parse(String(init?.body||'{}'));if(body.action==='admin.users'&&adminCache&&Date.now()-adminAt<30000){const cached=new Response(JSON.stringify(adminCache),{status:200,headers:{'content-type':'application/json'}});setTimeout(()=>prefetchAdmin(true),0);return cached;}}}catch{}return nativeFetch(input,init)};
function start(){// Never gate the player while a saved session is checked.
 if(token()){const g=document.getElementById('musicGate');if(g)g.style.setProperty('display','none','important');warm();}
 // Keep admin data hot without touching player state.
 setInterval(()=>{if(document.visibilityState==='visible')prefetchAdmin(false)},20000);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){warm();prefetchAdmin(false)}});
 window.addEventListener('pageshow',()=>{warm();prefetchAdmin(false)});
}
window.musicBackgroundV47=Object.freeze({version:47,warm,prefetchAdmin,state:()=>({adminCached:!!adminCache,adminAge:adminAt?Date.now()-adminAt:null})});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
