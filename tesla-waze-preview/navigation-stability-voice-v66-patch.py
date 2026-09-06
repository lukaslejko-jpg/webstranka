from pathlib import Path
import re

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* NAV_GPS_VOICE_STABILITY_V66 */'
if marker in s:
    raise SystemExit(0)

# 1) Remove duplicate live getCurrentPosition polling. Use it only as stale-watch recovery.
pat=re.compile(r"setInterval\(\(\)=>\{const now=Date\.now\(\);if\(state\.navigating\)navigator\.geolocation\.getCurrentPosition\(onPosition,\(\)=>\{\},\{enableHighAccuracy:true,timeout:12000,maximumAge:0\}\);if\(now-lastTs>10000&&now-lastRestart>10000\)\{lastRestart=now;\$\('gpsNotice'\)\.querySelector\('span'\)\.textContent='GPS neposiela novú polohu\. Obnovujem sledovanie\.';restart\(\)\}\},2500\);")
rep="""setInterval(()=>{const now=Date.now();if(now-lastTs>8000&&now-lastRestart>8000){lastRestart=now;$('gpsNotice').querySelector('span').textContent='GPS neposiela novú polohu. Overujem sledovanie.';navigator.geolocation.getCurrentPosition(onPosition,()=>{if(now-lastTs>12000)restart()},{enableHighAccuracy:true,timeout:8000,maximumAge:1500})}},2500);"""
s,n=pat.subn(rep,s,count=1)
if n!=1:
    raise SystemExit('GPS polling anchor missing')

# 2) Make heading updates less aggressive in Tesla Chromium.
s=s.replace("headingDelta(state.lastAppliedHeading,h)>=2.5","headingDelta(state.lastAppliedHeading,h)>=6")
s=s.replace("moved>=12","moved>=14")

# 3) Stable maneuver voice history across reroutes.
anchor="let voiceContext=null,activeVoiceSource=null,voiceGeneration=0,cloudVoiceUnavailable=false,voiceAnnouncementTimer=null;const voiceCache=new Map();"
insert="""let voiceContext=null,activeVoiceSource=null,voiceGeneration=0,cloudVoiceUnavailable=false,voiceAnnouncementTimer=null;const voiceCache=new Map();
const voiceManeuverHistory=new Map();
function voiceManeuverSignature(step){
  const op=String(step?.opcode||'').replace(/-/g,'_').toUpperCase();
  const street=norm(step?.street||'');
  const y=Number(step?.path?.y),x=Number(step?.path?.x);
  const loc=Number.isFinite(y)&&Number.isFinite(x)?`${y.toFixed(3)},${x.toFixed(3)}`:'';
  return `${op}|${street}|${loc}`;
}
function voiceBucketRank(bucket){return ({step:6,'3000':5,'2000':4,'1000':3,'500':2,'200':1,now:0})[bucket]??6}
function shouldSpeakManeuverBucket(step,bucket){
  const sig=voiceManeuverSignature(step),now=Date.now(),rank=voiceBucketRank(bucket),prev=voiceManeuverHistory.get(sig);
  for(const [k,v] of voiceManeuverHistory){if(now-v.at>20*60*1000)voiceManeuverHistory.delete(k)}
  if(prev&&rank>=prev.rank)return false;
  voiceManeuverHistory.set(sig,{rank,at:now});
  return true;
}"""
if anchor not in s:
    raise SystemExit('voice anchor missing')
s=s.replace(anchor,insert,1)

# Add guard immediately after bucket determination and before lastVoice key.
old="""  const key=`${p.stepIdx}:${bucket}`;
  if(key===state.lastVoice)return;
  state.lastVoice=key;"""
new="""  if(!shouldSpeakManeuverBucket(step,bucket))return;
  const key=`${voiceManeuverSignature(step)}:${bucket}`;
  if(key===state.lastVoice)return;
  state.lastVoice=key;"""
if old not in s:
    raise SystemExit('voice key anchor missing')
s=s.replace(old,new,1)

# Clear maneuver voice history only at the beginning/end of a navigation session, not on reroute.
old_begin="state.navigating=true;state.overview=true;state.offRouteHits=0;state.routeCursor=0;state.routeProgress=null;state.lastVoice='';state.lastTrafficVoice='';"
new_begin="state.navigating=true;state.overview=true;state.offRouteHits=0;state.routeCursor=0;state.routeProgress=null;state.lastVoice='';state.lastTrafficVoice='';voiceManeuverHistory.clear();"
if old_begin in s:s=s.replace(old_begin,new_begin,1)
old_stop="clearTimeout(state.overviewTimer);cancelNavigationVoice();if(state.navigating)rememberDrivenRoute();"
new_stop="clearTimeout(state.overviewTimer);cancelNavigationVoice();voiceManeuverHistory.clear();if(state.navigating)rememberDrivenRoute();"
if old_stop in s:s=s.replace(old_stop,new_stop,1)

s += '\n'+marker+'\n'
p.write_text(s,encoding='utf-8')
