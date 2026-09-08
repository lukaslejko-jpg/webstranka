from pathlib import Path
import re

jsp=Path('tesla-waze-preview/app.js')
cssp=Path('tesla-waze-preview/app.css')
js=jsp.read_text(encoding='utf-8')
css=cssp.read_text(encoding='utf-8')

if '/* MUSIC_DRIVING_V109 */' not in js:
    old="music.current=t;music.userPaused=false;music.wantsPlayback=true;music.playingSince=0;music.autoNext=true;music.shuffle=true;save('teslaWaze:musicAutoNext:v1',true);save('teslaWaze:musicShuffle:v1',true);setMusicPlaying(true);syncMediaSession();music.started=Date.now();"
    new="music.current=t;music.userPaused=false;music.wantsPlayback=true;music.playingSince=0;setMusicPlaying(true);syncMediaSession();music.started=Date.now();"
    if old not in js: raise SystemExit('forced shuffle anchor missing')
    js=js.replace(old,new,1)

    start=js.find('function scheduleManualMusicNav(dir){')
    end=js.find("function mnext(reason='manual'){",start)
    if start<0 or end<0: raise SystemExit('manual nav block missing')
    helper="""function beginMusicNav(){\n  const now=Date.now();\n  if(music.navLockUntil&&now<music.navLockUntil)return false;\n  music.navLockUntil=now+700;\n  music.suppressEndedUntil=now+1400;\n  music.manualNavPending=0;\n  if(music.manualNavTimer){clearTimeout(music.manualNavTimer);music.manualNavTimer=null}\n  return true;\n}\n"""
    js=js[:start]+helper+js[end:]

    js=js.replace("function mnext(reason='manual'){\n  if(reason!=='auto'&&reason!=='guarded'&&(!music.playingSince||Date.now()-music.playingSince<1500))return scheduleManualMusicNav(1);","function mnext(reason='manual'){\n  if(reason==='manual'&&!beginMusicNav())return false;",1)
    js=js.replace("function mprev(reason='manual'){\n  if(reason!=='guarded'&&(!music.playingSince||Date.now()-music.playingSince<1500))return scheduleManualMusicNav(-1);","function mprev(reason='manual'){\n  if(reason==='manual'&&!beginMusicNav())return false;",1)

    js=js.replace("playingSince:0,manualNavPending:0,manualNavTimer:null,related:[]","playingSince:0,manualNavPending:0,manualNavTimer:null,navLockUntil:0,suppressEndedUntil:0,related:[]",1)

    js=js.replace("else if(e.data===YT.PlayerState.ENDED){if(music.current)mev('complete',music.current);","else if(e.data===YT.PlayerState.ENDED){if(Date.now()<(music.suppressEndedUntil||0))return;if(music.current)mev('complete',music.current);",1)
    js=js.replace("music.audio.onended=()=>{if(music.current)mev('complete',music.current);","music.audio.onended=()=>{if(Date.now()<(music.suppressEndedUntil||0))return;if(music.current)mev('complete',music.current);",1)

    # Add robust Media Session handlers without depending on existing function layout.
    anchor='sanitizeMusicProfile();\n'
    inject="""sanitizeMusicProfile();\nfunction installTeslaMediaSession(){\n  if(!('mediaSession' in navigator))return;\n  const bind=(name,fn)=>{try{navigator.mediaSession.setActionHandler(name,fn)}catch{}};\n  bind('play',()=>{music.userPaused=false;music.wantsPlayback=true;setMusicPlaying(true);if(music.audio){music.audio.play().catch(()=>{})}else try{music.ytPlayer?.playVideo?.()}catch{}});\n  bind('pause',()=>{music.userPaused=true;music.wantsPlayback=false;setMusicPlaying(false);if(music.audio)music.audio.pause();else try{music.ytPlayer?.pauseVideo?.()}catch{}});\n  bind('nexttrack',()=>mnext('manual'));\n  bind('previoustrack',()=>mprev('manual'));\n  bind('stop',()=>{music.userPaused=true;music.wantsPlayback=false;setMusicPlaying(false);if(music.audio)music.audio.pause();else try{music.ytPlayer?.pauseVideo?.()}catch{}});\n}\ninstallTeslaMediaSession();\n"""
    if anchor not in js: raise SystemExit('sanitize anchor missing')
    js=js.replace(anchor,inject,1)

    # Re-install after each current track/UI sync because some Chromium builds drop handlers.
    js=js.replace('updateMiniSeek();syncMediaSession();renderMusicStatus();renderMusicList();','updateMiniSeek();syncMediaSession();installTeslaMediaSession();renderMusicStatus();renderMusicList();',1)
    js+='\n/* MUSIC_DRIVING_V109 */\n'

if '/* MUSIC_DRIVING_UI_V109 */' not in css:
    css += r'''

/* MUSIC_DRIVING_UI_V109 */
@media (min-width:901px){
  .music-shell.music-maximized>.music-body{
    overflow-y:auto!important;
    min-height:0!important;
    padding-bottom:185px!important;
    scroll-padding-bottom:185px!important;
    overscroll-behavior-y:contain!important;
  }
  .music-shell.music-maximized #musicMaxHome{padding-bottom:185px!important}
  .music-shell.music-maximized .music-home-section:last-child{margin-bottom:130px!important}

  /* Keep horizontal rails but make all non-quick rows almost 2x larger. */
  .music-shell.music-maximized .music-home-rail:not(.music-home-covers){
    grid-auto-columns:minmax(430px,42vw)!important;
    gap:16px!important;
  }
  .music-shell.music-maximized .music-home-row{
    grid-template-columns:92px minmax(0,1fr) 54px!important;
    min-height:108px!important;
    gap:14px!important;
    padding:8px 6px!important;
  }
  .music-shell.music-maximized .music-home-row img,
  .music-shell.music-maximized .music-home-row-empty{
    width:92px!important;height:92px!important;min-width:92px!important;min-height:92px!important;border-radius:12px!important;
  }
  .music-shell.music-maximized .music-home-row b{font-size:19px!important;line-height:1.15!important}
  .music-shell.music-maximized .music-home-row small{font-size:14px!important;line-height:1.15!important;margin-top:6px!important}
  .music-shell.music-maximized .music-home-row>i{font-size:30px!important;display:flex!important;align-items:center!important;justify-content:center!important}

  .music-shell.music-maximized>.music-player{min-height:118px!important;height:118px!important;max-height:118px!important;padding:10px 14px!important}
  .music-shell.music-maximized .music-controls-6{grid-template-columns:1.06fr 1.28fr 1.06fr .78fr .78fr .88fr!important;gap:10px!important}
  .music-shell.music-maximized .music-controls-6 [data-ma="prev"],
  .music-shell.music-maximized .music-controls-6 [data-ma="toggle"],
  .music-shell.music-maximized .music-controls-6 [data-ma="next"]{
    min-height:74px!important;height:74px!important;font-size:20px!important;font-weight:900!important;border-radius:14px!important;
  }
}
'''

jsp.write_text(js,encoding='utf-8')
cssp.write_text(css,encoding='utf-8')
print('v109 patch applied')
