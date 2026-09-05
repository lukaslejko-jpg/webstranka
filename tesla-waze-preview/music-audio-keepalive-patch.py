from pathlib import Path

p = Path('tesla-waze-preview/app.js')
s = p.read_text(encoding='utf-8')
marker = '/* MUSIC_AUDIO_KEEPALIVE_V17 */'
if marker in s:
    raise SystemExit(0)

# Insert keepalive helpers before playMusic.
anchor = "function playMusic(){music.userPaused=false;music.wantsPlayback=true;"
helper = r'''let musicKeepalive=null,musicKeepaliveUrl=null;
function buildSilentWavUrl(){
  if(musicKeepaliveUrl)return musicKeepaliveUrl;
  try{
    const rate=8000,seconds=2,samples=rate*seconds,buf=new ArrayBuffer(44+samples*2),v=new DataView(buf);
    const w=(o,t)=>{for(let i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i))};
    w(0,'RIFF');v.setUint32(4,36+samples*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,samples*2,true);
    musicKeepaliveUrl=URL.createObjectURL(new Blob([buf],{type:'audio/wav'}));
    return musicKeepaliveUrl;
  }catch{return ''}
}
function ensureMusicKeepalive(){
  if(musicKeepalive)return musicKeepalive;
  const src=buildSilentWavUrl();if(!src)return null;
  const a=document.createElement('audio');a.src=src;a.loop=true;a.preload='auto';a.playsInline=true;a.setAttribute('playsinline','');a.volume=1;
  a.style.position='fixed';a.style.width='1px';a.style.height='1px';a.style.opacity='0';a.style.pointerEvents='none';a.setAttribute('aria-hidden','true');
  document.body.appendChild(a);musicKeepalive=a;return a;
}
function startMusicKeepalive(){
  if(music.userPaused||!music.wantsPlayback)return;
  const a=ensureMusicKeepalive();if(!a)return;
  try{if(a.paused)a.play().catch(()=>{})}catch{}
}
function stopMusicKeepalive(){try{musicKeepalive?.pause?.()}catch{}}
''' + marker + "\n" + anchor
if anchor not in s:
    raise SystemExit('playMusic anchor missing')
s = s.replace(anchor, helper, 1)

# Ensure play starts/keeps browser audio focus.
s = s.replace(
    "function playMusic(){music.userPaused=false;music.wantsPlayback=true;if(music.audio)",
    "function playMusic(){music.userPaused=false;music.wantsPlayback=true;startMusicKeepalive();if(music.audio)",
    1,
)

# Manual pause must release the keepalive too.
s = s.replace(
    "function pauseMusic(){music.userPaused=true;music.wantsPlayback=false;if(music.resumeTimer)",
    "function pauseMusic(){music.userPaused=true;music.wantsPlayback=false;stopMusicKeepalive();if(music.resumeTimer)",
    1,
)

# Starting any track should acquire keepalive before player rerender/handoff.
s = s.replace(
    "music.current=t;music.userPaused=false;music.wantsPlayback=true;renderPlayer();",
    "music.current=t;music.userPaused=false;music.wantsPlayback=true;startMusicKeepalive();renderPlayer();",
    1,
)

# On real final end (Auto disabled), stop keepalive; Auto handoff keeps it alive.
old = "else if(e.data===YT.PlayerState.ENDED){music.wantsPlayback=false;setMusicPlaying(false);if(music.current)mev('complete',music.current);if(music.autoNext)mnext()}"
new = "else if(e.data===YT.PlayerState.ENDED){if(music.current)mev('complete',music.current);if(music.autoNext){music.wantsPlayback=true;startMusicKeepalive();mnext()}else{music.wantsPlayback=false;stopMusicKeepalive();setMusicPlaying(false)}}"
if old in s:
    s = s.replace(old, new, 1)

# Native/free audio final end should behave the same way.
old2 = "music.audio.onended=()=>{music.wantsPlayback=false;setMusicPlaying(false);if(music.current)mev('complete',music.current);if(music.autoNext)mnext()}"
new2 = "music.audio.onended=()=>{if(music.current)mev('complete',music.current);if(music.autoNext){music.wantsPlayback=true;startMusicKeepalive();mnext()}else{music.wantsPlayback=false;stopMusicKeepalive();setMusicPlaying(false)}}"
if old2 in s:
    s = s.replace(old2, new2, 1)

p.write_text(s, encoding='utf-8')
