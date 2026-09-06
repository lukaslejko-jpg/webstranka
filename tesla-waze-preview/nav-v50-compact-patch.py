from pathlib import Path

p=Path('tesla-waze-preview/app.css')
s=p.read_text(encoding='utf-8')
marker='/* TESLA_NAV_COMPACT_V50 */'
if marker in s:
    raise SystemExit(0)
s += r'''

/* TESLA_NAV_COMPACT_V50 */
/* Keep trip card hidden outside active navigation, despite older display:flex overrides. */
.tesla-trip.hidden{display:none!important;visibility:hidden!important}
@media (min-width:701px){
  body.tesla-navigating .tesla-trip:not(.hidden){
    display:flex!important;
    visibility:visible!important;
    width:380px!important;
    height:185px!important;
    min-height:185px!important;
    max-height:185px!important;
    flex-direction:column!important;
  }
  body.tesla-navigating .tesla-trip-stats{
    flex:1 1 auto!important;
    align-items:center!important;
    padding:18px 16px 12px!important;
  }
  body.tesla-navigating .tesla-trip-stats b{font-size:28px!important;line-height:1!important}
  body.tesla-navigating .tesla-trip-stats span{font-size:18px!important;line-height:1.05!important}
  body.tesla-navigating .tesla-progress{height:6px!important;margin:0 16px 10px!important;flex:0 0 auto!important}
  body.tesla-navigating .tesla-trip-actions{flex:0 0 auto!important;margin-top:auto!important;grid-template-columns:1fr 66px!important}
  body.tesla-navigating .tesla-trip-actions button{height:54px!important}
  body.tesla-navigating .tesla-end{font-size:19px!important;font-weight:750!important}
  body.tesla-navigating .tesla-dots{font-size:22px!important}

  #preSearchDock{width:min(430px,calc(100vw - 36px))!important}
  #preSearchDock .searchbox{padding:6px!important;border-radius:12px!important}
  #preSearchDock .row{gap:5px!important}
  #preSearchDock .row input{height:40px!important;min-height:40px!important;padding:0 10px!important;font-size:12px!important}
  #preSearchDock #searchBtn{height:40px!important;min-height:40px!important;padding:0 10px!important;font-size:11px!important}
  #preSearchDock [data-main-settings]{width:40px!important;min-width:40px!important;height:40px!important;min-height:40px!important;padding:0!important;font-size:20px!important}
  #preSearchDock .search-quick-places{gap:5px!important;margin-top:5px!important;grid-template-columns:1fr 1fr!important}
  #preSearchDock .quick-place{height:32px!important;min-height:32px!important;padding:0 7px!important;font-size:11px!important}
}
'''
p.write_text(s,encoding='utf-8')
