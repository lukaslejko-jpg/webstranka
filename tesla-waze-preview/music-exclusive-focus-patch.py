from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* MUSIC_DISABLE_KEEPALIVE_V28 */'
if marker in s:
    raise SystemExit(0)

# Disable helper keepalive audio completely. Tesla must see only the real Smart Music source.
def replace_function(src,name,replacement):
    start=f'function {name}()'+'{'
    si=src.find(start)
    if si<0:
        raise SystemExit(f'{name} anchor missing')
    brace=src.find('{',si)
    depth=0
    end=None
    for i in range(brace,len(src)):
        ch=src[i]
        if ch=='{': depth+=1
        elif ch=='}':
            depth-=1
            if depth==0:
                end=i+1
                break
    if end is None:
        raise SystemExit(f'{name} block end missing')
    return src[:si]+replacement+src[end:]

s=replace_function(s,'startMusicKeepalive',"function startMusicKeepalive(){return false}")
s=replace_function(s,'stopMusicKeepalive',"function stopMusicKeepalive(){try{if(musicKeepalive){musicKeepalive.pause();musicKeepalive.remove();musicKeepalive=null}}catch{}return true}")

# Make sure real playback always releases any stale helper element and keeps Tesla metadata/control state synced.
s=s.replace("if(e.data===YT.PlayerState.PLAYING){music.gaplessBusy=false;music.fallbackAttempts=0;music.userPaused=false;music.wantsPlayback=true;setMusicPlaying(true);syncMediaSession()}",
            "if(e.data===YT.PlayerState.PLAYING){music.gaplessBusy=false;music.fallbackAttempts=0;music.userPaused=false;music.wantsPlayback=true;stopMusicKeepalive();setMusicPlaying(true);syncMediaSession()}",1)
s=s.replace("music.audio.onplay=()=>{music.userPaused=false;music.wantsPlayback=true;setMusicPlaying(true)};",
            "music.audio.onplay=()=>{music.userPaused=false;music.wantsPlayback=true;stopMusicKeepalive();setMusicPlaying(true)};",1)

s += '\n'+marker+'\n'
if 'function startMusicKeepalive(){return false}' not in s:
    raise SystemExit('keepalive not disabled')
p.write_text(s,encoding='utf-8')
