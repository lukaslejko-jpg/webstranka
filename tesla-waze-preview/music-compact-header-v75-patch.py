from pathlib import Path

css_path=Path('tesla-waze-preview/app.css')
css=css_path.read_text(encoding='utf-8')
MARK='MUSIC_COMPACT_HEADER_V75'
if MARK in css:
    raise SystemExit('V75 already applied')
css += r'''

/* MUSIC_COMPACT_HEADER_V75 */
/* Exact approved compact Smart Music layout: brand + sync on top, 3 full-width actions stacked below. */
.music-shell:not(.music-maximized)>.music-compact-head{
  display:grid!important;
  grid-template-rows:auto auto!important;
  gap:10px!important;
  padding:10px 12px 12px!important;
  background:rgba(19,32,43,.96)!important;
}
.music-shell:not(.music-maximized)>.music-head{display:none!important}
.music-shell:not(.music-maximized) .music-card:has(#youtubeSync){display:none!important}
.music-shell:not(.music-maximized) .music-body #youtubeSync{display:none!important}
.music-shell:not(.music-maximized) .music-compact-top{
  display:grid!important;
  grid-template-columns:minmax(145px,.85fr) minmax(220px,1.45fr)!important;
  gap:10px!important;
  align-items:center!important;
  width:100%!important;
}
.music-shell:not(.music-maximized) .music-compact-brand{
  min-width:0!important;
  align-self:center!important;
}
.music-shell:not(.music-maximized) .music-compact-brand b{
  display:block!important;
  font-size:18px!important;
  line-height:1.05!important;
  white-space:nowrap!important;
  overflow:visible!important;
}
.music-shell:not(.music-maximized) .music-compact-top #musicCompactSync{
  display:block!important;
  width:100%!important;
  max-width:none!important;
  min-width:0!important;
  height:46px!important;
  min-height:46px!important;
  margin:0!important;
  padding:0 10px!important;
  font-size:13px!important;
  font-weight:800!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
}
.music-shell:not(.music-maximized) .music-compact-actions{
  display:grid!important;
  grid-template-columns:1fr!important;
  grid-template-rows:repeat(3,44px)!important;
  gap:7px!important;
  width:100%!important;
  min-width:0!important;
}
.music-shell:not(.music-maximized) .music-compact-actions .btn{
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  visibility:visible!important;
  width:100%!important;
  max-width:none!important;
  min-width:0!important;
  height:44px!important;
  min-height:44px!important;
  margin:0!important;
  padding:0 12px!important;
  font-size:13px!important;
  line-height:1!important;
  white-space:nowrap!important;
  overflow:visible!important;
  text-overflow:clip!important;
}
.music-shell:not(.music-maximized) #musicCompactBack{display:flex!important}
@media(max-width:520px){
  .music-shell:not(.music-maximized)>.music-compact-head{padding:9px!important;gap:8px!important}
  .music-shell:not(.music-maximized) .music-compact-top{grid-template-columns:minmax(116px,.8fr) minmax(180px,1.4fr)!important;gap:8px!important}
  .music-shell:not(.music-maximized) .music-compact-brand b{font-size:16px!important}
  .music-shell:not(.music-maximized) .music-compact-top #musicCompactSync{font-size:11px!important;height:44px!important;min-height:44px!important;padding:0 7px!important}
  .music-shell:not(.music-maximized) .music-compact-actions{grid-template-rows:repeat(3,42px)!important;gap:6px!important}
  .music-shell:not(.music-maximized) .music-compact-actions .btn{height:42px!important;min-height:42px!important;font-size:12px!important}
}
'''
css_path.write_text(css,encoding='utf-8')
print('V75 CSS applied')
