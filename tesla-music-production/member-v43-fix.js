/* Music V43 auth UX hotfix: visible password generation/reset, login trim. */
(()=>{
'use strict';
if(window.musicAuthFixV43)return;
const API='https://europrojekty-app.vercel.app/api/music';
const SESSION='music:memberSession:v1';
const rand=()=>{const a=new Uint8Array(9);crypto.getRandomValues(a);const s=btoa(String.fromCharCode(...a)).replace(/[^A-Za-z0-9]/g,'').slice(0,12);return 'MU-'+s.slice(0,6)+'-'+s.slice(6,12)};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
async function call(action,data={}){const token=localStorage.getItem(SESSION)||'';const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+token},body:JSON.stringify({action,...data}),cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||('HTTP '+r.status));return d}
function result(text,html=false){const e=document.getElementById('m41result');if(!e)return;if(html)e.innerHTML=text;else e.textContent=text}
function patchCreate(){const pass=document.getElementById('m41newPass');if(!pass||pass.dataset.v43)return;pass.dataset.v43='1';pass.placeholder='heslo';const btn=document.createElement('button');btn.type='button';btn.className='m41btn m43gen';btn.textContent='Generovať heslo';btn.onclick=()=>{pass.value=rand();pass.type='text';pass.select();result('Vygenerované heslo je v poli vyššie. Pred vytvorením ho môžeš upraviť.')};pass.insertAdjacentElement('afterend',btn)}
function patchRows(){document.querySelectorAll('.m41row').forEach(row=>{if(row.dataset.v43)return;row.dataset.v43='1';const actions=row.querySelector('.m41actions');if(!actions)return;const wrap=document.createElement('div');wrap.className='m43passrow';wrap.innerHTML='<input class="m43passinput" type="text" autocomplete="new-password" placeholder="nové heslo"><button type="button" class="m41btn m43make">Generovať</button><button type="button" class="m41btn m43set">Nastaviť heslo</button>';row.insertBefore(wrap,actions);const inp=wrap.querySelector('.m43passinput');wrap.querySelector('.m43make').onclick=()=>{inp.value=rand();inp.select()};wrap.querySelector('.m43set').onclick=async()=>{let password=inp.value.trim();if(!password){password=rand();inp.value=password}try{const d=await call('admin.update',{id:row.dataset.id,password});result('Nové heslo pre '+d.user.email+': <span class="m41pass">'+esc(d.password||password)+'</span>',true);inp.select()}catch(e){result(e.message)}};const old=row.querySelector('[data-pass]');if(old)old.style.display='none'})}
function trimLogin(){const p=document.getElementById('m41pass');if(p)p.value=p.value.trim()}
document.addEventListener('click',e=>{if(e.target?.id==='m41login')trimLogin()},true);
document.addEventListener('keydown',e=>{if(e.target?.id==='m41pass'&&e.key==='Enter')trimLogin()},true);
function style(){if(document.getElementById('m43style'))return;const s=document.createElement('style');s.id='m43style';s.textContent='.m43gen{margin-top:8px}.m43passrow{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;grid-column:1/-1}.m43passinput{width:100%;box-sizing:border-box;background:#0d0d10;color:#fff;border:1px solid #414149;border-radius:9px;padding:9px}@media(max-width:700px){.m43passrow{grid-template-columns:1fr 1fr}.m43passinput{grid-column:1/-1}}';document.head.appendChild(s)}
const obs=new MutationObserver(()=>{style();patchCreate();patchRows()});obs.observe(document.documentElement,{subtree:true,childList:true});
style();patchCreate();patchRows();
window.musicAuthFixV43=Object.freeze({version:43});
})();
