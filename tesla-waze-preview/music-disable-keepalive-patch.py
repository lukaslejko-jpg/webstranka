from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* MUSIC_DISABLE_KEEPALIVE_V28 */'
if marker in s:
    raise SystemExit(0)

# Disable helper keepalive audio completely. Tesla must see only the real Smart Music source.
start='function startMusicKeepalive(){'
si=s.find(start)
if si<0:
    raise SystemExit('startMusicKeepalive anchor missing')
# find balanced function block
brace=s.find('{',si)
depth=0
end=None
for i in range(brace,len(s)):
    ch=s[i]
    if ch=='{': depth+=1
    elif ch=='}':
        depth-=1
        if depth==0:
            end=i+1
            break
if end is None:
    raise SystemExit('startMusicKeepalive block end missing')
s=s[:si]+"function startMusicKeepalive(){return false}"+s[end:]

# Also hard-stop and release any helper element that may survive from an older page state.
stop='function stopMusicKeepalive(){'
si=s.find(stop)
if si<0:
    raise SystemExit('stopMusicKeepalive anchor missing')
brace=s.find('{',si)
depth=0
end=None
for i in range(brace,len(s)):
    ch=s[i]
    if ch=='{': depth+=1
    elif ch=='}':
        depth-=1
        if depth==0:
            end=i+1
            break
if end is None:
    raise SystemExit('stopMusicKeepalive block end missing')
replacement="function stopMusicKeepalive(){try{if(musicKeepalive){musicKeepalive.pause();musicKeepalive.remove();musicKeepalive=null}}catch{}return true}"
s=s[:si]+replacement+s[end:]

# On real playback, explicitly stop any stale helper and keep MediaSession synced.
s=s.replace("if(e.data===YT.PlayerState.PLAYING){music.gaplessBusy=false;music.fallbackAttempts=0;music.userPaused=false;music.wantsPlayback=true;setMusicPlaying(true);syncMediaSession()}",
            "if(e.data===YT.PlayerState.PLAYING){music.gaplessBusy=false;music.fallbackAttempts=0;music.userPaused=false;music.wantsPlayback=true;stopMusicKeepalive();setMusicPlaying(true);syncMediaSession()}",1)
s=s.replace("music.audio.onplay=()=>{music.userPaused=false;music.wantsPlayback=true;setMusicPlaying(true)};",
            "music.audio.onplay=()=>{music.userPaused=false;music.wantsPlayback=true;stopMusicKeepalive();setMusicPlaying(true)};",1)

s+='\n'+marker+'\n'
if 'function startMusicKeepalive(){return false}' not in s:
    raise SystemExit('keepalive not disabled')
p.write_text(s,encoding='utf-8')
