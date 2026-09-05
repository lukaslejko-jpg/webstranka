from pathlib import Path

css_path = Path('tesla-waze-preview/app.css')
css = css_path.read_text(encoding='utf-8')
marker = '/* MOBILE_UI_V1 */'

if marker not in css:
    css += r'''

/* MOBILE_UI_V1 */
@media (max-width:700px){
  html,body{overflow:hidden!important}
  .app{height:100dvh!important;grid-template-columns:1fr!important;grid-template-rows:auto minmax(0,1fr)!important}
  .app.panel-off{grid-template-rows:1fr!important}
  .panel{grid-row:1!important;width:100%!important;padding:7px 10px 6px!important;overflow-y:auto!important;border-right:0!important;border-bottom:1px solid #263442!important}
  .searchbox{margin-top:4px!important;padding:8px!important;border-radius:12px!important}
  .searchbox .row input{min-height:48px!important;height:48px!important;padding:0 12px!important;font-size:16px!important;border-radius:10px!important}
  .searchbox .row .btn{min-height:48px!important;height:48px!important;padding:0 14px!important;font-size:15px!important;border-radius:10px!important}
  .search-quick-places{gap:7px!important;margin-top:7px!important}
  .quick-place{min-height:46px!important;font-size:14px!important;border-radius:10px!important}
  .mapwrap{grid-row:2!important;height:auto!important;min-height:0!important}
  .map{height:100%!important;min-height:0!important}
  .music-fab{right:12px!important;bottom:82px!important;width:50px!important;height:50px!important;font-size:22px!important;border-radius:14px!important}
  .music-modal{padding:4px 4px calc(70px + env(safe-area-inset-bottom,0px))!important;align-items:flex-end!important;justify-content:center!important}
  .music-shell{width:calc(100vw - 8px)!important;max-width:calc(100vw - 8px)!important;min-width:0!important;max-height:calc(100svh - 78px - env(safe-area-inset-bottom,0px))!important;border-radius:14px!important;border:1px solid #334155!important}
  .music-shell.music-minimized.music-maximized .music-mini-queue{grid-template-columns:1fr!important}
}
'''

marker_v2 = '/* MOBILE_UI_V2 */'
if marker_v2 not in css:
    css += r'''

/* MOBILE_UI_V2 */
@media (max-width:700px){
  .app{grid-template-rows:auto minmax(0,1fr)!important}
  .panel{height:auto!important;min-height:0!important;max-height:220px!important}
  .mapwrap{grid-row:2!important;min-height:0!important;height:100%!important}
  .music-fab{right:14px!important;bottom:calc(82px + env(safe-area-inset-bottom,0px))!important;width:52px!important;height:52px!important;z-index:5900!important}
  .panel-off .mapwrap{grid-row:1!important;height:100%!important}
  body.tesla-navigating .app{grid-template-rows:1fr!important}
  body.tesla-navigating .mapwrap{grid-row:1!important;height:100%!important;min-height:0!important}
}
'''

marker_v3 = '/* MOBILE_UI_V3_FULLSCREEN_MAP */'
if marker_v3 not in css:
    css += r'''

/* MOBILE_UI_V3_FULLSCREEN_MAP */
@media (max-width:700px){
  html,body{width:100%!important;height:100%!important;overflow:hidden!important}
  #app.app{display:block!important;position:relative!important;width:100%!important;height:100dvh!important;min-height:100dvh!important;overflow:hidden!important}
  #app .mapwrap{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-height:100%!important;z-index:1!important}
  #app #map{width:100%!important;height:100%!important;min-height:100%!important}
  #preSearchDock{z-index:5600!important}
  .topbar{z-index:5550!important;top:132px!important;left:10px!important;right:10px!important;justify-content:space-between!important}
  .leaflet-top.leaflet-left{top:188px!important;right:10px!important}
  body:not(.music-window-open) .music-fab{display:flex!important;visibility:visible!important;opacity:.96!important;right:14px!important;bottom:calc(92px + env(safe-area-inset-bottom,0px))!important;z-index:7600!important}
  .music-window-open .music-fab{display:none!important}
  .music-modal{z-index:7700!important}
}
'''

marker_v4 = '/* MOBILE_UI_V4_NAV_BOTTOM */'
if marker_v4 not in css:
    css += r'''

/* MOBILE_UI_V4_NAV_BOTTOM */
@media (max-width:700px){
  body.tesla-navigating .tesla-trip{
    display:block!important;
    visibility:visible!important;
    position:fixed!important;
    left:10px!important;
    right:10px!important;
    bottom:calc(112px + env(safe-area-inset-bottom,0px))!important;
    width:auto!important;
    max-width:none!important;
    z-index:7350!important;
  }
  body.tesla-navigating:not(.music-window-open) .music-fab{
    display:flex!important;
    visibility:visible!important;
    opacity:.98!important;
    right:14px!important;
    bottom:calc(222px + env(safe-area-inset-bottom,0px))!important;
    z-index:7600!important;
  }
  body.tesla-navigating .tesla-settings{
    bottom:calc(190px + env(safe-area-inset-bottom,0px))!important;
    max-height:48svh!important;
  }
  body.tesla-navigating .alertbox{
    bottom:auto!important;
  }
}
'''

for required in (marker, marker_v2, marker_v3, marker_v4):
    if required not in css:
        raise SystemExit(f'{required} marker missing after patch')

css_path.write_text(css, encoding='utf-8')
