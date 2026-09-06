from pathlib import Path

p = Path('tesla-waze-preview/app.js')
s = p.read_text(encoding='utf-8')
marker46 = '/* MUSIC_MANUAL_NEXT_HOLD_V46 */'
marker47 = '/* MUSIC_STARTUP_NAV_GUARD_V47 */'

# Keep the V46 behavior as the base when rebuilding from an older app.js.
if marker46 not in s:
    old = "function mnext(){\n  const q=ensureMusicQueue();if(!q.length)return false;"
    new = "function mnext(){\n  /* MUSIC_MANUAL_NEXT_HOLD_V46 */\n  music.userPaused=false;music.wantsPlayback=true;setMusicPlaying(true);\n  const q=ensureMusicQueue();if(!q.length)return false;"
    if old not in s:
        raise SystemExit('mnext V46 anchor not found')
    s = s.replace(old, new, 1)

if marker47 in s:
    p.write_text(s, encoding='utf-8')
    print('MUSIC_STARTUP_NAV_GUARD_V47 already applied')
    raise SystemExit(0)

old = "const music={profile:load(LS.music,{tracks:{},artists:{},events:[],youtube:{connected:false,email:'lukaslejko@gmail.com'}}),queue:load(LS.queue,[]),current:null,audio:null,ytPlayer:null,tab:'forYou',started:0,shuffle:load('teslaWaze:musicShuffle:v1',false),autoNext:load('teslaWaze:musicAutoNext:v1',true),userPaused:false,wantsPlayback:false,resumeTimer:null,anonymousYoutube:false,fallbackAttempts:0,fallbackTimer:null,shuffleRecent:[],shuffleBack:[]};"
new = "const music={profile:load(LS.music,{tracks:{},artists:{},events:[],youtube:{connected:false,email:'lukaslejko@gmail.com'}}),queue:load(LS.queue,[]),current:null,audio:null,ytPlayer:null,tab:'forYou',started:0,shuffle:load('teslaWaze:musicShuffle:v1',false),autoNext:load('teslaWaze:musicAutoNext:v1',true),userPaused:false,wantsPlayback:false,resumeTimer:null,anonymousYoutube:false,fallbackAttempts:0,fallbackTimer:null,shuffleRecent:[],shuffleBack:[],playingSince:0,manualNavPending:0,manualNavTimer:null};"
if old not in s:
    raise SystemExit('music state V47 anchor not found')
s = s.replace(old, new, 1)

old = "music.current=t;music.userPaused=false;music.wantsPlayback=true;setMusicPlaying(true);syncMediaSession();music.started=Date.now();mev(replay?'replay':'play',t);"
new = "music.current=t;music.userPaused=false;music.wantsPlayback=true;music.playingSince=0;setMusicPlaying(true);syncMediaSession();music.started=Date.now();mev(replay?'replay':'play',t);"
if old not in s:
    raise SystemExit('mplay V47 anchor not found')
s = s.replace(old, new, 1)

old = "function mnext(){\n  /* MUSIC_MANUAL_NEXT_HOLD_V46 */\n  music.userPaused=false;music.wantsPlayback=true;setMusicPlaying(true);"
new = "function scheduleManualMusicNav(dir){\n  music.manualNavPending+=dir;\n  if(music.manualNavTimer)return true;\n  const wait=music.playingSince?Math.max(0,1500-(Date.now()-music.playingSince)):1500;\n  music.manualNavTimer=setTimeout(()=>{music.manualNavTimer=null;drainManualMusicNav()},wait);\n  return true;\n}\nfunction drainManualMusicNav(){\n  if(!music.manualNavPending)return;\n  if(!music.playingSince){scheduleManualMusicNav(0);return}\n  const age=Date.now()-music.playingSince;\n  if(age<1500){music.manualNavTimer=setTimeout(()=>{music.manualNavTimer=null;drainManualMusicNav()},1500-age);return}\n  const dir=music.manualNavPending>0?1:-1;\n  music.manualNavPending-=dir;\n  if(dir>0)mnext('guarded');else mprev('guarded');\n}\nfunction mnext(reason='manual'){\n  if(reason!=='auto'&&reason!=='guarded'&&(!music.playingSince||Date.now()-music.playingSince<1500))return scheduleManualMusicNav(1);\n  /* MUSIC_MANUAL_NEXT_HOLD_V46 */\n  music.userPaused=false;music.wantsPlayback=true;setMusicPlaying(true);"
if old not in s:
    raise SystemExit('mnext V47 anchor not found')
s = s.replace(old, new, 1)

old = "function mprev(){"
new = "function mprev(reason='manual'){\n  if(reason!=='guarded'&&(!music.playingSince||Date.now()-music.playingSince<1500))return scheduleManualMusicNav(-1);"
if old not in s:
    raise SystemExit('mprev V47 anchor not found')
s = s.replace(old, new, 1)

# Automatic track completion must stay exactly as responsive as the working V45/V46 behavior.
s = s.replace("if(music.autoNext&&!music.userPaused){music.wantsPlayback=true;setMusicPlaying(true);mnext()}", "if(music.autoNext&&!music.userPaused){music.wantsPlayback=true;setMusicPlaying(true);mnext('auto')}")
if "mnext('auto')" not in s:
    raise SystemExit('automatic next bypass not found')

old = "if(e.data===YT.PlayerState.PLAYING){music.fallbackAttempts=0;music.wantsPlayback=true;setMusicPlaying(true)}"
new = "if(e.data===YT.PlayerState.PLAYING){music.fallbackAttempts=0;music.wantsPlayback=true;if(!music.playingSince)music.playingSince=Date.now();setMusicPlaying(true);if(music.manualNavPending){if(music.manualNavTimer)clearTimeout(music.manualNavTimer);music.manualNavTimer=setTimeout(()=>{music.manualNavTimer=null;drainManualMusicNav()},1500)}}"
if old not in s:
    raise SystemExit('YouTube PLAYING V47 anchor not found')
s = s.replace(old, new, 1)

old = "music.audio.onplay=()=>{music.userPaused=false;music.wantsPlayback=true;setMusicPlaying(true)}"
new = "music.audio.onplay=()=>{music.userPaused=false;music.wantsPlayback=true;if(!music.playingSince)music.playingSince=Date.now();setMusicPlaying(true);if(music.manualNavPending){if(music.manualNavTimer)clearTimeout(music.manualNavTimer);music.manualNavTimer=setTimeout(()=>{music.manualNavTimer=null;drainManualMusicNav()},1500)}}"
if old in s:
    s = s.replace(old, new, 1)

s += '\n' + marker47 + '\n'
p.write_text(s, encoding='utf-8')
print('Applied MUSIC_STARTUP_NAV_GUARD_V47')
