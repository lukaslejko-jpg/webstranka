from pathlib import Path

css_path = Path('tesla-waze-preview/app.css')
css = css_path.read_text(encoding='utf-8')
marker = '/* MOBILE_UI_V1 */'

if marker not in css:
    css += r'''

/* MOBILE_UI_V1 */
@media (max-width:700px){
  html,body{overflow:hidden!important}
  .app{
    height:100dvh!important;
    grid-template-columns:1fr!important;
    grid-template-rows:clamp(180px,23dvh,240px) minmax(0,1fr)!important;
  }
  .app.panel-off{grid-template-rows:1fr!important}
  .panel{
    grid-row:1!important;
    width:100%!important;
    max-height:clamp(180px,23dvh,240px)!important;
    padding:7px 10px 6px!important;
    overflow-y:auto!important;
    overscroll-behavior:contain!important;
    border-right:0!important;
    border-bottom:1px solid #263442!important;
  }
  .panel header{top:-7px!important;padding:4px 0 6px!important}
  .panel h1{font-size:20px!important}
  .searchbox{margin-top:4px!important;padding:8px!important;border-radius:12px!important}
  .searchbox .row{gap:7px!important}
  .searchbox .row input{
    min-height:48px!important;
    height:48px!important;
    padding:0 12px!important;
    font-size:16px!important;
    border-radius:10px!important;
  }
  .searchbox .row .btn{
    min-height:48px!important;
    height:48px!important;
    padding:0 14px!important;
    font-size:15px!important;
    border-radius:10px!important;
  }
  .search-quick-places{gap:7px!important;margin-top:7px!important}
  .quick-place{min-height:46px!important;font-size:14px!important;border-radius:10px!important}
  .searchbox .results{max-height:150px!important;overflow:auto!important}
  .mapwrap{
    grid-row:2!important;
    height:auto!important;
    min-height:0!important;
  }
  .map{height:100%!important;min-height:0!important}
  .panel-off .mapwrap{grid-row:1!important;height:100dvh!important}
  .topbar{top:10px!important;left:10px!important;right:10px!important;gap:7px!important;justify-content:space-between!important}
  .topbar .badge,.topbar .btn{min-height:44px!important;padding:0 12px!important;font-size:14px!important}
  .routebox{left:10px!important;right:10px!important;top:68px!important;max-width:none!important}
  .alertbox{left:10px!important;right:10px!important;bottom:12px!important;max-width:none!important}
  .leaflet-top.leaflet-left{right:10px!important;top:70px!important}
  .music-fab{right:12px!important;bottom:12px!important;width:50px!important;height:50px!important;font-size:22px!important;border-radius:14px!important}

  .music-modal{padding:4px!important;align-items:flex-end!important;justify-content:center!important}
  .music-shell{
    width:calc(100vw - 8px)!important;
    max-width:calc(100vw - 8px)!important;
    min-width:0!important;
    max-height:calc(100dvh - 8px)!important;
    border-radius:14px!important;
    border:1px solid #334155!important;
  }
  .music-head{padding:9px 10px!important;gap:8px!important;flex-wrap:nowrap!important}
  .music-head h2{font-size:18px!important;line-height:1.05!important}
  .music-head small{font-size:10px!important}
  .music-head .btn{min-height:44px!important;padding:0 10px!important;font-size:12px!important;white-space:nowrap!important}
  .music-icon{font-size:24px!important}
  .music-body{padding:10px!important;gap:9px!important}
  .music-player{padding:9px 10px!important}
  .music-shell.music-minimized .music-player{padding:8px 8px 9px!important}
  .music-shell.music-minimized .music-mini-search{grid-template-columns:minmax(0,1fr) 96px!important;gap:7px!important}
  .music-shell.music-minimized .music-mini-search input{height:48px!important;font-size:16px!important}
  .music-shell.music-minimized .music-mini-search .btn{height:48px!important;min-height:48px!important;font-size:13px!important}
  .music-shell.music-minimized .music-controls{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}
  .music-shell.music-minimized .music-controls .btn{min-height:48px!important;height:48px!important;font-size:14px!important}
  .music-shell.music-minimized .music-mini-track{grid-template-columns:26px 52px minmax(0,1fr) 28px!important;min-height:68px!important;gap:9px!important}
  .music-shell.music-minimized .music-mini-art{width:52px!important;height:52px!important}
  .music-shell.music-minimized .music-mini-meta b{font-size:16px!important}
  .music-shell.music-minimized .music-mini-meta small{font-size:13px!important}
  .music-shell.music-minimized.music-maximized .music-mini-queue{grid-template-columns:1fr!important}
  .music-shell.music-maximized{width:calc(100vw - 8px)!important;height:calc(100dvh - 8px)!important;max-width:calc(100vw - 8px)!important;max-height:calc(100dvh - 8px)!important}

  body.tesla-navigating .app{grid-template-rows:1fr!important}
  body.tesla-navigating .mapwrap{height:100dvh!important;min-height:100dvh!important}
  body.tesla-navigating .tesla-maneuver{left:10px!important;top:10px!important;width:min(330px,calc(100vw - 20px))!important}
  body.tesla-navigating .tesla-trip{left:10px!important;bottom:10px!important;width:min(330px,calc(100vw - 20px))!important}
  body.tesla-navigating .tesla-settings{left:10px!important;bottom:72px!important;width:min(330px,calc(100vw - 20px))!important}
}
'''

if marker not in css:
    raise SystemExit('MOBILE_UI_V1 marker missing after patch')

css_path.write_text(css, encoding='utf-8')
