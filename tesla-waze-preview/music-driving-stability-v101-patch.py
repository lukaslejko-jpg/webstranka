from pathlib import Path

js_path = Path('tesla-waze-preview/app.js')
css_path = Path('tesla-waze-preview/app.css')
js = js_path.read_text(encoding='utf-8')
css = css_path.read_text(encoding='utf-8')
marker = '/* MUSIC_DRIVING_STABILITY_V101 */'
css_marker = '/* MUSIC_DRIVING_UI_V101 */'

if marker not in js:
    old = "manualNavPending:0,manualNavTimer:null,related:[],relatedBusy:false,relatedSeeds:[]};"
    new = "manualNavPending:0,manualNavTimer:null,related:[],relatedBusy:false,relatedSeeds:[],navBusy:false,navBusyUntil:0,suppressEndedUntil:0};"
    if old not in js:
        raise SystemExit('music state V101 anchor not found')
    js = js.replace(old, new, 1)

    old = "music.current=t;music.userPaused=false;music.wantsPlayback=true;music.playingSince=0;music.autoNext=true;music.shuffle=true;save('teslaWaze:musicAutoNext:v1',true);save('teslaWaze:musicShuffle:v1',true);setMusicPlaying(true);syncMediaSession();music.started=Date.now();"
    new = "music.current=t;music.userPaused=false;music.wantsPlayback=true;music.playingSince=0;setMusicPlaying(true);syncMediaSession();music.started=Date.now();"
    if old not in js:
        raise SystemExit('mplay forced shuffle/auto anchor not found')
    js = js.replace(old, new, 1)

    start = js.find('function scheduleManualMusicNav(dir){')
    end = js.find("function mnext(reason='manual'){", start)
    if start < 0 or end < 0:
        raise SystemExit('manual navigation block anchor not found')
    helper = "function beginManualMusicNav(){\n  const now=Date.now();\n  if(music.navBusy&&now<music.navBusyUntil)return false;\n  music.navBusy=true;music.navBusyUntil=now+900;music.suppressEndedUntil=now+1600;\n  music.manualNavPending=0;if(music.manualNavTimer){clearTimeout(music.manualNavTimer);music.manualNavTimer=null}\n  setTimeout(()=>{if(Date.now()>=music.navBusyUntil)music.navBusy=false},950);\n  return true;\n}\n"
    js = js[:start] + helper + js[end:]

    old = "function mnext(reason='manual'){\n  if(reason!=='auto'&&reason!=='guarded'&&(!music.playingSince||Date.now()-music.playingSince<1500))return scheduleManualMusicNav(1);"
    new = "function mnext(reason='manual'){\n  if(reason==='manual'&&!beginManualMusicNav())return false;"
    if old not in js:
        raise SystemExit('mnext V101 anchor not found')
    js = js.replace(old, new, 1)

    old = "function mprev(reason='manual'){\n  if(reason!=='guarded'&&(!music.playingSince||Date.now()-music.playingSince<1500))return scheduleManualMusicNav(-1);"
    new = "function mprev(reason='manual'){\n  if(reason==='manual'&&!beginManualMusicNav())return false;"
    if old not in js:
        raise SystemExit('mprev V101 anchor not found')
    js = js.replace(old, new, 1)

    old = "music.audio.onended=()=>{if(music.current)mev('complete',music.current);if(music.autoNext&&!music.userPaused){music.wantsPlayback=true;setMusicPlaying(true);mnext('auto')}else{music.wantsPlayback=false;setMusicPlaying(false)}};"
    new = "music.audio.onended=()=>{if(Date.now()<(music.suppressEndedUntil||0))return;if(music.current)mev('complete',music.current);if(music.autoNext&&!music.userPaused){music.wantsPlayback=true;setMusicPlaying(true);mnext('auto')}else{music.wantsPlayback=false;setMusicPlaying(false)}};"
    if old not in js:
        raise SystemExit('audio ended V101 anchor not found')
    js = js.replace(old, new, 1)

    old = "else if(e.data===YT.PlayerState.ENDED){if(music.current)mev('complete',music.current);if(music.autoNext&&!music.userPaused){music.wantsPlayback=true;setMusicPlaying(true);mnext('auto')}else{music.wantsPlayback=false;setMusicPlaying(false)}}"
    new = "else if(e.data===YT.PlayerState.ENDED){if(Date.now()<(music.suppressEndedUntil||0))return;if(music.current)mev('complete',music.current);if(music.autoNext&&!music.userPaused){music.wantsPlayback=true;setMusicPlaying(true);mnext('auto')}else{music.wantsPlayback=false;setMusicPlaying(false)}}"
    if old not in js:
        raise SystemExit('YouTube ended V101 anchor not found')
    js = js.replace(old, new, 1)

    js += '\n' + marker + '\n'

if css_marker not in css:
    css += r'''

/* MUSIC_DRIVING_UI_V101 */
@media (min-width:901px){
  .music-shell.music-maximized>.music-body{
    overflow-y:auto!important;
    overscroll-behavior:contain!important;
    min-height:0!important;
    padding-bottom:170px!important;
    scroll-padding-bottom:170px!important;
  }
  .music-shell.music-maximized #musicMaxHome{
    padding-bottom:170px!important;
  }
  .music-shell.music-maximized .music-home-covers{
    grid-template-columns:repeat(6,minmax(0,1fr))!important;
    gap:14px!important;
  }
  .music-shell.music-maximized .music-home-cover .music-home-play{
    width:52px!important;height:52px!important;font-size:24px!important;opacity:1!important;transform:none!important;
  }
  .music-shell.music-maximized .music-home-cover>b{font-size:16px!important}
  .music-shell.music-maximized .music-home-cover>small{font-size:13px!important}
  .music-shell.music-maximized .music-home-rows{
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
    gap:10px 18px!important;
  }
  .music-shell.music-maximized .music-home-row{
    grid-template-columns:84px minmax(0,1fr) 46px!important;
    min-height:98px!important;
    gap:12px!important;
    padding:7px 4px!important;
  }
  .music-shell.music-maximized .music-home-row img,
  .music-shell.music-maximized .music-home-row-empty{
    width:84px!important;height:84px!important;border-radius:11px!important;
  }
  .music-shell.music-maximized .music-home-row b{font-size:18px!important;line-height:1.2!important}
  .music-shell.music-maximized .music-home-row small{font-size:14px!important;line-height:1.2!important;margin-top:5px!important}
  .music-shell.music-maximized .music-home-row>i{font-size:26px!important}

  .music-shell.music-maximized>.music-player{
    height:116px!important;min-height:116px!important;max-height:116px!important;
    padding:10px 16px!important;
    grid-template-columns:minmax(260px,1fr) minmax(620px,1.7fr)!important;
    gap:16px!important;
  }
  .music-shell.music-maximized .music-player .music-controls-6{
    display:grid!important;
    grid-template-columns:1fr 1.18fr 1fr .78fr .78fr .88fr!important;
    gap:12px!important;
  }
  .music-shell.music-maximized .music-player .music-controls .btn{
    min-height:70px!important;height:70px!important;border-radius:14px!important;
    font-size:18px!important;font-weight:850!important;padding:0 12px!important;
  }
  .music-shell.music-maximized .music-player .music-title{font-size:20px!important}
  .music-shell.music-maximized .music-player .music-sub{font-size:14px!important}
}

.music-shell:not(.music-maximized)>.music-body{
  overflow-y:auto!important;
  overscroll-behavior:contain!important;
  min-height:0!important;
  padding-bottom:120px!important;
  scroll-padding-bottom:120px!important;
}
.music-shell:not(.music-maximized) #musicMaxHome{padding-bottom:120px!important}
.music-shell:not(.music-maximized) .music-home-row{
  grid-template-columns:74px minmax(0,1fr) 40px!important;
  min-height:88px!important;gap:10px!important;
}
.music-shell:not(.music-maximized) .music-home-row img,
.music-shell:not(.music-maximized) .music-home-row-empty{
  width:74px!important;height:74px!important;border-radius:10px!important;
}
.music-shell:not(.music-maximized) .music-home-row b{font-size:16px!important}
.music-shell:not(.music-maximized) .music-home-row small{font-size:13px!important}
.music-shell:not(.music-maximized) .music-home-row>i{font-size:24px!important}
'''

js_path.write_text(js, encoding='utf-8')
css_path.write_text(css, encoding='utf-8')
print('Applied MUSIC_DRIVING_STABILITY_V101 and MUSIC_DRIVING_UI_V101')
