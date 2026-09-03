from pathlib import Path
import gzip, base64

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')

old_endpoint="https://tesla-waze-assets-v20.vercel.app/api/alerts?"
new_endpoint="https://dimvegkezslqjtsxdohp.supabase.co/functions/v1/twtraffic?"
if s.count(old_endpoint)!=1:
    raise SystemExit(f'Expected one old alerts endpoint, found {s.count(old_endpoint)}')
s=s.replace(old_endpoint,new_endpoint,1)

old_call="voiceNavigation();findAheadAlert()"
new_call="voiceNavigation();findAheadAlert();findAheadTraffic()"
if s.count(old_call)!=1:
    raise SystemExit(f'Expected one navigation alert call, found {s.count(old_call)}')
s=s.replace(old_call,new_call,1)

marker="function renderTraffic(){"
traffic_fn="""function findAheadTraffic(){
  if(!state.navigating||!state.pos||!state.jams?.length)return;
  const r=state.routes[state.routeIndex];if(!r?.coords?.length)return;
  const me=nearest(state.pos,r.coords,state.routeCursor||0);if(!me)return;
  const cum=cumulative(r.coords),at=(cum[me.index]||0)+me.t*((cum[me.index+1]||cum[me.index])-(cum[me.index]||0));
  let best=null;
  for(const j of state.jams){
    const level=Number(j.level||0);if(level<2||!j.line?.length)continue;
    const probes=[j.line[0],j.line[Math.floor(j.line.length/2)],j.line.at(-1)].filter(Boolean);
    for(const p of probes){
      const n=nearest(p,r.coords,me.index);if(!n||n.distance>420)continue;
      const on=(cum[n.index]||0)+n.t*((cum[n.index+1]||cum[n.index])-(cum[n.index]||0)),ahead=on-at;
      if(ahead<-120||ahead>8000)continue;
      if(!best||ahead<best.ahead)best={jam:j,ahead:Math.max(0,ahead),level};
    }
  }
  if(!best)return;
  const label=best.level>=4?'Silná kolóna':best.level===3?'Kolóna':'Spomalená doprava',street=String(best.jam.street||'').trim();
  const box=$('alertBox');if(box?.classList.contains('hidden')){box.textContent=`${label} · ${fmtD(best.ahead)} pred vozidlom${street?' · '+street:''}`;box.classList.remove('hidden')}
  if(best.ahead<=3500){const key=String(best.jam.uuid||best.jam.id||`${street}:${best.level}:${Math.round(best.ahead/250)}`);if(key!==state.lastTrafficVoice){state.lastTrafficVoice=key;speak(`${label} o ${fmtD(best.ahead)}${street?' na '+street:''}.`)}}
}
"""
if s.count(marker)!=1:
    raise SystemExit(f'Expected one traffic renderer marker, found {s.count(marker)}')
s=s.replace(marker,traffic_fn+marker,1)

old_reset="state.routeProgress=null;state.lastVoice='';"
new_reset="state.routeProgress=null;state.lastVoice='';state.lastTrafficVoice='';"
if s.count(old_reset)!=1:
    raise SystemExit(f'Expected one voice reset, found {s.count(old_reset)}')
s=s.replace(old_reset,new_reset,1)

p.write_text(s,encoding='utf-8')
packed=gzip.compress(s.encode('utf-8'),compresslevel=9,mtime=0)
Path('tesla-waze-preview/app.js.gz.b64').write_text(base64.b64encode(packed).decode('ascii'),encoding='ascii')
