from pathlib import Path
import re

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* TMY_VOICE_V23 */'
if marker in s:
    raise SystemExit(0)

# Add a cancellable 200 ms announcement timer, matching tm-y's delayed announcement effect.
old="let voiceContext=null,activeVoiceSource=null,voiceGeneration=0,cloudVoiceUnavailable=false;const voiceCache=new Map();"
new="let voiceContext=null,activeVoiceSource=null,voiceGeneration=0,cloudVoiceUnavailable=false,voiceAnnouncementTimer=null;const voiceCache=new Map();"
if old not in s:
    raise SystemExit('voice globals anchor missing')
s=s.replace(old,new,1)

# Stop navigation / voice toggle must cancel both queued and active speech immediately.
old_cancel="function cancelNavigationVoice(){\n  voiceGeneration++;\n  try{activeVoiceSource?.stop()}catch{}\n  activeVoiceSource=null;\n  try{window.speechSynthesis?.cancel()}catch{}\n  state.lastVoice='';\n}"
new_cancel="function cancelNavigationVoice(){\n  voiceGeneration++;\n  if(voiceAnnouncementTimer){clearTimeout(voiceAnnouncementTimer);voiceAnnouncementTimer=null}\n  try{activeVoiceSource?.stop()}catch{}\n  activeVoiceSource=null;\n  try{window.speechSynthesis?.cancel()}catch{}\n  state.lastVoice='';\n}"
if old_cancel not in s:
    raise SystemExit('cancelNavigationVoice anchor missing')
s=s.replace(old_cancel,new_cancel,1)

# Exact tm-y announcement buckets.
pat=re.compile(r"function voiceNavigation\(\)\{.*?\}\nfunction findAheadTraffic\(\)\{",re.S)
repl=r'''function voiceNavigation(){
  if(!state.voice||!state.navigating)return;
  const r=state.routes[state.routeIndex],p=state.routeProgress;
  if(!r||!p)return;
  const step=r.steps?.[p.stepIdx];
  if(!step)return;
  const d=Number(p.distanceToManeuver),op=String(step?.opcode||'').replace(/-/g,'_').toUpperCase(),ramp=op.startsWith('RAMP_')||op.startsWith('EXIT_');
  let bucket='step';
  if(Number.isFinite(d)&&d>=0){
    if(ramp) bucket=d<=100?'now':d<=250?'200':d<=600?'500':d<=1200?'1000':d<=2200?'2000':d<=3200?'3000':'step';
    else bucket=d<=100?'now':d<=250?'200':d<=600?'500':d<=1200?'1000':'step';
  }
  const key=`${p.stepIdx}:${bucket}`;
  if(key===state.lastVoice)return;
  state.lastVoice=key;
  const distance=Number.isFinite(d)&&d>=0?`${fmtSpeechD(d)}. `:'';
  const text=`${distance}${instruction(step)}`;
  if(voiceAnnouncementTimer)clearTimeout(voiceAnnouncementTimer);
  voiceAnnouncementTimer=setTimeout(()=>{
    voiceAnnouncementTimer=null;
    if(!state.voice||!state.navigating||state.lastVoice!==key)return;
    speak(text);
  },200);
}''' + marker + r'''
function findAheadTraffic(){'''
s,n=pat.subn(repl,s,count=1)
if n!=1:
    raise SystemExit('voiceNavigation block missing')

# Self-validate exact tm-y voice behavior and removal of the old far/mid/near bands.
checks=[
    marker,
    "d<=100?'now':d<=250?'200':d<=600?'500':d<=1200?'1000':d<=2200?'2000':d<=3200?'3000':'step'",
    "d<=100?'now':d<=250?'200':d<=600?'500':d<=1200?'1000':'step'",
    "const key=`${p.stepIdx}:${bucket}`",
    "},200);",
]
for item in checks:
    if item not in s:
        raise SystemExit('tm-y voice validation failed: '+item)
if "p.distanceToManeuver<=120?'now':p.distanceToManeuver<=550?'near':p.distanceToManeuver<=1500?'mid':'far'" in s:
    raise SystemExit('old voice bands still present')

p.write_text(s,encoding='utf-8')
