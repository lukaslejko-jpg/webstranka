from pathlib import Path
import re,gzip,base64

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')

pat=r"// Pairing\nasync function pairing\(action,payload=\{\}\)\{.*?\nasync function startPair\(\)\{.*?\}\n\n// Smart Music window"
repl=r'''// Pairing
const PAIR_API='https://dimvegkezslqjtsxdohp.supabase.co/functions/v1/twpair';
let pairPollTimer=null;
function stopPairPolling(){if(pairPollTimer){clearInterval(pairPollTimer);pairPollTimer=null}}
async function pairing(action,payload={}){const r=await fetch(PAIR_API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,...payload}),cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'pairing');return d}
async function beginNewPair(body){
  stopPairPolling();body.innerHTML='<p>Pripravujem bezpečné prepojenie…</p>';
  const d=await pairing('start');
  const dev={version:2,deviceId:d.deviceId,deviceSecret:d.deviceSecret,paired:false};save(LS.device,dev);
  body.innerHTML=`${d.qrDataUrl?`<img src="${esc(d.qrDataUrl)}" alt="QR kód na prepojenie mobilu" style="max-width:260px;width:80%;height:auto">`:''}<div class="code">${esc(d.pairingCode||'')}</div><p><b>Naskenujte QR kód iPhonom.</b><br>Po potvrdení sa spojenie na tejto obrazovke aktivuje automaticky.</p><p id="pairStatus">Čakám na mobil…</p>`;
  const expires=Date.parse(d.expiresAt||'')||Date.now()+10*60*1000;
  const check=async()=>{try{const st=await pairing('status',dev);if(st.paired){stopPairPolling();const saved={...dev,paired:true,claimedAt:st.claimedAt||new Date().toISOString()};save(LS.device,saved);body.innerHTML='<div style="font-size:46px">✅</div><h3>Mobil je prepojený</h3><p>Prepojenie bolo úspešne potvrdené.</p><button id="pairAgain" class="btn">Spárovať iný mobil</button>';const a=$('pairAgain');if(a)a.onclick=()=>beginNewPair(body);try{renderTeslaSettings()}catch{};return}if(st.status==='expired'||Date.now()>expires){stopPairPolling();body.innerHTML='<p>Párovací kód vypršal.</p><button id="pairAgain" class="btn">Vytvoriť nový kód</button>';const a=$('pairAgain');if(a)a.onclick=()=>beginNewPair(body)}}catch{}};
  pairPollTimer=setInterval(check,1800);setTimeout(check,350);
}
async function startPair(){const body=$('pairBody');$('pairModal').classList.remove('hidden');stopPairPolling();try{const credentials=load(LS.device,null);if(credentials?.deviceId&&credentials?.deviceSecret){try{const st=await pairing('status',credentials);if(st.paired){const saved={...credentials,paired:true,claimedAt:st.claimedAt||credentials.claimedAt};save(LS.device,saved);body.innerHTML='<div style="font-size:46px">✅</div><h3>Mobil je prepojený</h3><p>Spojenie je aktívne.</p><button id="pairAgain" class="btn">Spárovať iný mobil</button>';const a=$('pairAgain');if(a)a.onclick=()=>beginNewPair(body);return}}catch{}}await beginNewPair(body)}catch(e){body.innerHTML=`<p>${esc(e.message)}</p><button id="pairAgain" class="btn">Skúsiť znova</button>`;const a=$('pairAgain');if(a)a.onclick=()=>beginNewPair(body)}}

// Smart Music window'''
s,n=re.subn(pat,repl,s,count=1,flags=re.S)
if n!=1: raise SystemExit(f'pairing patch matches={n}')

old='<button class="btn wide" data-ts-pair>📱 Prepojiť mobil</button>'
new="<button class=\"btn wide\" data-ts-pair>${load(LS.device,null)?.paired?'📱 Mobil prepojený':'📱 Prepojiť mobil'}</button>"
if s.count(old)!=1: raise SystemExit(f'pair settings button matches={s.count(old)}')
s=s.replace(old,new,1)

old="document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).classList.add('hidden'));"
new="document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{if(b.dataset.close==='pairModal')stopPairPolling();$(b.dataset.close).classList.add('hidden')});"
if s.count(old)!=1: raise SystemExit(f'close handler matches={s.count(old)}')
s=s.replace(old,new,1)

p.write_text(s,encoding='utf-8')
Path('tesla-waze-preview/app.js.gz.b64').write_text(base64.b64encode(gzip.compress(s.encode(),9,mtime=0)).decode(),encoding='ascii')
