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
  body.tesla-navigating .tesla-trip{display:block!important;visibility:visible!important;position:fixed!important;left:10px!important;right:10px!important;bottom:calc(112px + env(safe-area-inset-bottom,0px))!important;width:auto!important;max-width:none!important;z-index:7350!important}
  body.tesla-navigating:not(.music-window-open) .music-fab{display:flex!important;visibility:visible!important;opacity:.98!important;right:14px!important;bottom:calc(222px + env(safe-area-inset-bottom,0px))!important;z-index:7600!important}
  body.tesla-navigating .tesla-settings{bottom:calc(190px + env(safe-area-inset-bottom,0px))!important;max-height:48svh!important}
  body.tesla-navigating .alertbox{bottom:auto!important}
}
'''

marker_v5 = '/* MOBILE_UI_V5_RAISED_NAV_CONTROLS */'
if marker_v5 not in css:
    css += r'''

/* MOBILE_UI_V5_RAISED_NAV_CONTROLS */
@media (max-width:700px){
  body.tesla-navigating .tesla-trip{bottom:calc(210px + env(safe-area-inset-bottom,0px))!important}
  body.tesla-navigating:not(.music-window-open) .music-fab{bottom:calc(350px + env(safe-area-inset-bottom,0px))!important}
  body.tesla-navigating .tesla-settings{bottom:calc(300px + env(safe-area-inset-bottom,0px))!important;max-height:42svh!important}
}
'''

marker_v6 = '/* MOBILE_UI_V6_BALANCED_NAV */'
if marker_v6 not in css:
    css += r'''

/* MOBILE_UI_V6_BALANCED_NAV */
@media (max-width:700px){
  body.tesla-navigating .tesla-maneuver{width:calc(100vw - 178px)!important;max-width:none!important;min-width:0!important}
  body.tesla-navigating .tesla-man-main{padding:10px 12px 8px!important;gap:10px!important}
  body.tesla-navigating .tesla-turn{font-size:44px!important;width:48px!important}
  body.tesla-navigating .tesla-man-main b{font-size:25px!important}
  body.tesla-navigating .tesla-man-main span:not(.tesla-turn){font-size:15px!important;margin-top:3px!important}
  body.tesla-navigating .tesla-man-next{padding:7px 12px!important;font-size:14px!important;gap:9px!important}
  body.tesla-navigating .tesla-man-next>span{font-size:23px!important;width:30px!important}
  body.tesla-navigating .tesla-trip{left:10px!important;right:10px!important;bottom:calc(150px + env(safe-area-inset-bottom,0px))!important;border-radius:12px!important}
  body.tesla-navigating .tesla-trip-stats{padding:9px 13px 6px!important;gap:6px!important;align-items:center!important}
  body.tesla-navigating .tesla-trip-stats b{font-size:20px!important;line-height:1.05!important}
  body.tesla-navigating .tesla-trip-stats span{font-size:13px!important;line-height:1.1!important}
  body.tesla-navigating .tesla-progress{height:4px!important;margin:0 13px 7px!important}
  body.tesla-navigating .tesla-trip-actions{grid-template-columns:1fr 62px!important}
  body.tesla-navigating .tesla-trip-actions button{height:46px!important;font-size:15px!important}
  body.tesla-navigating .tesla-dots{font-size:20px!important}
  body.tesla-navigating:not(.music-window-open) .music-fab{width:54px!important;height:54px!important;right:14px!important;bottom:calc(286px + env(safe-area-inset-bottom,0px))!important;border-radius:15px!important}
  body.tesla-navigating .tesla-settings{bottom:calc(220px + env(safe-area-inset-bottom,0px))!important;max-height:46svh!important}
}
'''

marker_v7 = '/* MOBILE_UI_V7_MUSIC_HEADER */'
if marker_v7 not in css:
    css += r'''

/* MOBILE_UI_V7_MUSIC_HEADER */
@media (max-width:700px){
  .music-head{
    display:grid!important;
    grid-template-columns:42px minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)!important;
    grid-template-rows:auto auto!important;
    gap:8px!important;
    align-items:center!important;
    padding:9px!important;
  }
  .music-head .music-icon{grid-column:1!important;grid-row:1!important}
  .music-head>div:not(.music-icon):not(.spacer){grid-column:2/5!important;grid-row:1!important;min-width:0!important}
  .music-head .spacer{display:none!important}
  .music-head #musicSize{grid-column:1/3!important;grid-row:2!important;width:100%!important;min-width:0!important}
  .music-head #musicMinimize{grid-column:3!important;grid-row:2!important;width:100%!important;min-width:0!important}
  .music-head #closeMusic{grid-column:4!important;grid-row:2!important;width:100%!important;min-width:0!important}
  .music-head .btn{height:44px!important;min-height:44px!important;padding:0 7px!important;font-size:12px!important;white-space:normal!important;line-height:1.05!important;overflow:visible!important;text-overflow:clip!important}
  .music-head h2{font-size:19px!important;line-height:1.05!important;margin:0!important}
  .music-head small{font-size:10px!important;line-height:1.1!important}
}
'''

for required in (marker, marker_v2, marker_v3, marker_v4, marker_v5, marker_v6, marker_v7):
    if required not in css:
        raise SystemExit(f'{required} marker missing after patch')

css_path.write_text(css, encoding='utf-8')
