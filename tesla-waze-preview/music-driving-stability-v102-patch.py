from pathlib import Path

js_path = Path('tesla-waze-preview/app.js')
css_path = Path('tesla-waze-preview/app.css')
js = js_path.read_text(encoding='utf-8')
css = css_path.read_text(encoding='utf-8')
js_marker = '/* MUSIC_DRIVING_STABILITY_V102 */'
css_marker = '/* MUSIC_DRIVING_UI_V102 */'

if js_marker not in js:
    # Remove the old queued-nav callbacks. V101 deliberately uses one tap = one transition.
    stale = ";if(music.manualNavPending){if(music.manualNavTimer)clearTimeout(music.manualNavTimer);music.manualNavTimer=setTimeout(()=>{music.manualNavTimer=null;drainManualMusicNav()},1500)}"
    js = js.replace(stale, '')

    # Existing cars may still have shuffle=true stored from the old mplay() bug. Reset it once.
    anchor = "sanitizeMusicProfile();\n"
    migration = "sanitizeMusicProfile();\nif(!load('teslaWaze:musicDrivingV102Migrated',false)){music.shuffle=false;save('teslaWaze:musicShuffle:v1',false);save('teslaWaze:musicDrivingV102Migrated',true)}\n"
    if "teslaWaze:musicDrivingV102Migrated" not in js:
        if anchor not in js:
            raise SystemExit('sanitizeMusicProfile V102 anchor not found')
        js = js.replace(anchor, migration, 1)

    # Hard guard: old multi-click queue implementation must be gone.
    if 'function drainManualMusicNav' in js or 'function scheduleManualMusicNav' in js:
        raise SystemExit('old queued manual navigation still present')
    if "music.autoNext=true;music.shuffle=true" in js:
        raise SystemExit('forced shuffle/auto still present')

    js += '\n' + js_marker + '\n'

if css_marker not in css:
    css += r'''

/* MUSIC_DRIVING_UI_V102 */
@media (min-width:901px){
  /* Preserve the approved horizontal rails, only make the cards much easier to read/tap. */
  .music-shell.music-maximized .music-home-rail.music-home-covers{
    grid-template-columns:none!important;
    grid-auto-columns:minmax(180px,210px)!important;
  }
  .music-shell.music-maximized .music-home-rail.music-home-rows{
    grid-template-columns:none!important;
    grid-auto-columns:minmax(330px,34vw)!important;
  }
  .music-shell.music-maximized .music-home-section:last-child{
    margin-bottom:140px!important;
  }
  .music-shell.music-maximized>.music-body{
    padding-bottom:190px!important;
    scroll-padding-bottom:190px!important;
  }
  .music-shell.music-maximized #musicMaxHome{
    padding-bottom:190px!important;
  }
  .music-shell.music-maximized .music-home-row{
    width:100%!important;
  }
  /* Driving controls: back / pause-play / next are the primary large targets. */
  .music-shell.music-maximized .music-player .music-controls-6{
    grid-template-columns:1.05fr 1.28fr 1.05fr .72fr .72fr .82fr!important;
  }
  .music-shell.music-maximized .music-player .music-controls-6>[data-ma="prev"],
  .music-shell.music-maximized .music-player .music-controls-6>[data-ma="toggle"],
  .music-shell.music-maximized .music-player .music-controls-6>[data-ma="next"]{
    min-height:74px!important;
    height:74px!important;
    font-size:20px!important;
    font-weight:900!important;
  }
}
'''

js_path.write_text(js, encoding='utf-8')
css_path.write_text(css, encoding='utf-8')
print('Applied MUSIC_DRIVING_STABILITY_V102 and MUSIC_DRIVING_UI_V102')
