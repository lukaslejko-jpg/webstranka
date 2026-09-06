from pathlib import Path
p=Path('tesla-waze-preview/app.css')
s=p.read_text(encoding='utf-8')
marker='/* MUSIC_YOUTUBE_MAX_LAYOUT_V53 */'
if marker in s:
    print('already applied')
    raise SystemExit(0)
s += r'''

/* MUSIC_YOUTUBE_MAX_LAYOUT_V53 */
@media (min-width:901px){
  .music-shell.music-maximized{
    display:grid!important;
    grid-template-columns:minmax(0,1.65fr) minmax(330px,.75fr)!important;
    grid-template-rows:auto minmax(0,1fr)!important;
    width:calc(100vw - 20px)!important;
    height:calc(100vh - 20px)!important;
    max-width:calc(100vw - 20px)!important;
    max-height:calc(100vh - 20px)!important;
    overflow:hidden!important;
  }
  .music-shell.music-maximized>.music-head{
    grid-column:1/-1!important;
    grid-row:1!important;
  }
  .music-shell.music-maximized>.music-player{
    grid-column:1!important;
    grid-row:2!important;
    min-width:0!important;
    min-height:0!important;
    overflow:auto!important;
    border-top:0!important;
    border-right:1px solid rgba(148,184,201,.18)!important;
    padding:14px 16px 18px!important;
    display:flex!important;
    flex-direction:column!important;
    gap:10px!important;
  }
  .music-shell.music-maximized>.music-body{
    grid-column:2!important;
    grid-row:2!important;
    min-width:0!important;
    min-height:0!important;
    overflow-y:auto!important;
    padding:12px!important;
    gap:9px!important;
  }
  .music-shell.music-maximized .music-player .music-mini-search{display:none!important}
  .music-shell.music-maximized .music-player .music-mini-panel{display:none!important}
  .music-shell.music-maximized .music-player .music-now{
    order:2!important;
    padding:2px 2px 0!important;
  }
  .music-shell.music-maximized .music-player .yt-player{
    order:1!important;
    width:100%!important;
    aspect-ratio:16/9!important;
    max-height:calc(100vh - 250px)!important;
    margin:0!important;
    border-radius:14px!important;
    background:#000!important;
  }
  .music-shell.music-maximized .music-player .music-free-row{order:3!important}
  .music-shell.music-maximized .music-player .music-controls{order:4!important;margin-top:2px!important}
  .music-shell.music-maximized .music-player .music-controls .btn{
    min-height:48px!important;
    font-size:14px!important;
  }
  .music-shell.music-maximized .music-player .music-title{font-size:22px!important;line-height:1.15!important}
  .music-shell.music-maximized .music-player .music-sub{font-size:14px!important}
  .music-shell.music-maximized>.music-body>.music-card:first-child{
    padding:9px 10px!important;
  }
  .music-shell.music-maximized>.music-body>.music-card:first-child small,
  .music-shell.music-maximized>.music-body>.music-card:first-child #youtubeSync{
    display:none!important;
  }
  .music-shell.music-maximized>.music-body .music-tabs{
    position:sticky!important;
    top:0!important;
    z-index:3!important;
    padding:4px 0 6px!important;
    background:rgba(11,20,29,.92)!important;
    backdrop-filter:blur(12px)!important;
  }
  .music-shell.music-maximized>.music-body #musicList{
    display:grid!important;
    grid-template-columns:1fr!important;
    gap:6px!important;
  }
  .music-shell.music-maximized>.music-body #musicList .music-track{
    margin:0!important;
    min-height:64px!important;
    grid-template-columns:52px minmax(0,1fr) 74px!important;
    padding:6px!important;
  }
  .music-shell.music-maximized>.music-body #musicList .music-art{
    width:52px!important;height:52px!important;
  }
  .music-shell.music-maximized>.music-body #musicList .music-title{font-size:14px!important}
  .music-shell.music-maximized>.music-body #musicList .music-sub{font-size:11px!important}
  .music-shell.music-maximized>.music-body #musicList .btn{
    width:74px!important;max-width:74px!important;font-size:11px!important;padding:0 5px!important;
  }
}
'''
p.write_text(s,encoding='utf-8')
print('Applied MUSIC_YOUTUBE_MAX_LAYOUT_V53')
