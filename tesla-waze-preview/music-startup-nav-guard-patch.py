from pathlib import Path
APP=Path('tesla-waze-preview/app.js')
MARK='/* MUSIC_STARTUP_NAV_GUARD_V47 */'
s=APP.read_text(encoding='utf-8')
if MARK in s: raise SystemExit(0)
if '/* MUSIC_MANUAL_NEXT_HOLD_V46 */' not in s: raise SystemExit('V46 base missing')

old="const music={profile:load(LS.music,{tracks:{},artists:{},events:[],youtube:{connected:false,email:'lukaslejko@gmail.com'}}),queue:load(LS.queue,[]),current:null,audio:null,ytPlayer:null,tab:'forYou',started:0,shuffle:load('teslaWaze:musicShuffle:v1',false),autoNext:load('teslaWaze:musicAutoNext:v1',true),userPaused:false,wantsPlayback:false,resumeTimer:null,anonymousYoutube:false,fallbackAttempts:0,fallbackTimer:null,shuffleRecent:[],shuffleBack:[]};"
new="const music={profile:load(LS.music,{tracks:{},artists:{},events:[],youtube:{connected:false,email:'lukaslejko@gmail.com'}}),queue:load(LS.queue,[]),current:null,audio:null,ytPlayer:null,tab:'forYou',started:0,shuffle:load('teslaWaze:musicShuffle:v1',false),autoNext:load('teslaWaze:musicAutoNext:v1',true),userPaused:false,wantsPlayback:false,resumeTimer:null,anonymousYoutube:false,fallbackAttempts:0,fallbackTimer:null,shuffleRecent:[],shuffleBack:[],playingSince:0,manualNavPending:0,manualNavTimer:null};"
if old not in s: raise SystemExit('music state anchor missing')
s=s.replace(old,new,1)

# Reset stability timestamp whenever a new track starts loading.
old="music.current=t;music.userPaused=false;music.wantsPlayback=true;setMusicPlaying(true);syncMediaSession();music.started=Date.now();mev(replay?'replay':'play',t);"
new="music.current=t;music.userPaused=false;music.wantsPlayback=true;music.playingSince=0;setMusicPlaying(true);syncMediaSession();music.started=Date.now();mev(replay?'replay':'play',t);"
if old not in s: raise SystemExit('mplay anchor missing')
s=s.replace(old,new,1)

# Replace manual next/prev entry points with a startup guard. Existing selection logic remains below.
old="function mnext(){\n  /* MUSIC_MANUAL_NEXT_HOLD_V46 */\n  music.userPaused=false;music.wantsPlayback=true;setMusicPlaying(true);"
new="function scheduleManualMusicNav(dir){\n  music.manualNavPending+=dir;\n  if(music.manualNavTimer)return true;\n  const wait=music.playingSince?Math.max(0,1500-(Date.now()-music.playingSince)):1500;\n  music.manualNavTimer=setTimeout(()=>{music.manualNavTimer=null;drainManualMusicNav()},wait);\n  return true;\n}\nfunction drainManualMusicNav(){\n  if(!music.manualNavPending)return;\n  if(!music.playingSince){scheduleManualMusicNav(0);return}\n  const age=Date.now()-music.playingSince;\n  if(age<1500){if(music.manualNavTimer)clearTimeout(music.manualNavTimer);music.manualNavTimer=setTimeout(()=>{music.manualNavTimer=null;drainManualMusicNav()},1500-age);return}\n  const dir=music.manualNavPending>0?1:-1;music.manualNavPending-=dir;\n  if(dir>0)mnext('guarded');else mprev('guarded');\n}\nfunction mnext(reason='manual'){\n  if(reason!=='auto'&&reason!=='guarded'&&(!music.playingSince||Date.now()-music.playingSince<1500))return scheduleManualMusicNav(1);\n  /* MUSIC_MANUAL_NEXT_HOLD_V46 */\n  music.userPaused=false;music.wantsPlayback=true;setMusicPlaying(true);"
if old not in s: raise SystemExit('mnext anchor missing')
s=s.replace(old,new,1)

old="function mprev(){"
new="function mprev(reason='manual'){\n  if(reason!=='guarded'&&(!music.playingSince||Date.now()-music.playingSince<1500))return scheduleManualMusicNav(-1);"
if old not in s: raise SystemExit('mprev anchor missing')
s=s.replace(old,new,1)

# Automatic transitions must bypass the guard.
s=s.replace("if(music.autoNext&&!music.userPaused){music.wantsPlayback=true;setMusicPlaying(true);mnext()}","if(music.autoNext&&!music.userPaused){music.wantsPlayback=true;setMusicPlaying(true);mnext('auto')}")
if "mnext('auto')" not in s: raise SystemExit('auto next bypass missing')

# Mark the moment YouTube is genuinely PLAYING; pending manual actions drain only after stability window.
old="if(e.data===YT.PlayerState.PLAYING){music.fallbackAttempts=0;music.wantsPlayback=true;setMusicPlaying(true)}"
new="if(e.data===YT.PlayerState.PLAYING){music.fallbackAttempts=0;music.wantsPlayback=true;if(!music.playingSince)music.playingSince=Date.now();setMusicPlaying(true);if(music.manualNavPending){if(music.manualNavTimer)clearTimeout(music.manualNavTimer);music.manualNavTimer=setTimeout(()=>{music.manualNavTimer=null;drainManualMusicNav()},1500)}}"
if old not in s: raise SystemExit('YT PLAYING anchor missing')
s=s.replace(old,new,1)

# Native audio follows the same rule for consistency.
old="music.audio.onplay=()=>{music.userPaused=false;music.wantsPlayback=true;setMusicPlaying(true)}"
new="music.audio.onplay=()=>{music.userPaused=false;music.wantsPlayback=true;if(!music.playingSince)music.playingSince=Date.now();setMusicPlaying(true);if(music.manualNavPending){if(music.manualNavTimer)clearTimeout(music.manualNavTimer);music.manualNavTimer=setTimeout(()=>{music.manualNavTimer=null;drainManualMusicNav()},1500)}}"
if old in s: s=s.replace(old,new,1)

s+='\n'+MARK+'\n'
APP.write_text(s,encoding='utf-8')
