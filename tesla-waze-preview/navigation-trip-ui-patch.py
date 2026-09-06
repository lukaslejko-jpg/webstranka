from pathlib import Path

js_path = Path('tesla-waze-preview/app.js')
css_path = Path('tesla-waze-preview/app.css')
js = js_path.read_text(encoding='utf-8')
css = css_path.read_text(encoding='utf-8')

JS_MARKER = '/* TESLA_MAIN_SETTINGS_BUTTON_V49 */'
CSS_MARKER = '/* TESLA_TRIP_LAYOUT_V49 */'

if JS_MARKER not in js:
    anchor = "  document.body.appendChild(wrap);\n  state.searchHome=document.createComment('search-home');"
    replacement = "  document.body.appendChild(wrap);\n  const mainSearchRow=document.querySelector('.searchbox .row');\n  if(mainSearchRow&&!document.getElementById('mainRouteSettingsBtn')){\n    const btn=document.createElement('button');\n    btn.id='mainRouteSettingsBtn';\n    btn.type='button';\n    btn.className='btn main-route-settings';\n    btn.setAttribute('aria-label','Nastavenia');\n    btn.title='Nastavenia';\n    btn.textContent='•••';\n    btn.onclick=e=>{e.preventDefault();e.stopPropagation();toggleTeslaSettings()};\n    mainSearchRow.appendChild(btn);\n  }\n  "+JS_MARKER+"\n  state.searchHome=document.createComment('search-home');"
    if anchor not in js:
        raise SystemExit('ensureTeslaNavUI anchor missing')
    js = js.replace(anchor, replacement, 1)

if CSS_MARKER not in css:
    css += r'''

/* TESLA_TRIP_LAYOUT_V49 */
@media (min-width:701px){
  .tesla-trip{
    width:380px!important;
    height:205px!important;
    display:flex!important;
    flex-direction:column!important;
  }
  .tesla-trip-stats{
    flex:1 1 auto!important;
    display:grid!important;
    grid-template-columns:1.2fr 1fr 1fr!important;
    align-items:center!important;
    gap:12px!important;
    padding:20px 18px 12px!important;
  }
  .tesla-trip-stats b{
    font-size:32px!important;
    line-height:1!important;
    font-weight:800!important;
    align-self:center!important;
  }
  .tesla-trip-stats span{
    font-size:21px!important;
    line-height:1.1!important;
    font-weight:700!important;
    color:#444!important;
    align-self:center!important;
  }
  .tesla-progress{
    flex:0 0 auto!important;
    height:7px!important;
    margin:0 18px 15px!important;
  }
  .tesla-trip-actions{
    flex:0 0 64px!important;
    grid-template-columns:1fr 76px!important;
  }
  .tesla-trip-actions button{
    height:64px!important;
  }
  .tesla-end{
    font-size:22px!important;
    font-weight:750!important;
  }
  .tesla-dots{
    font-size:27px!important;
    letter-spacing:3px!important;
  }
  .searchbox .row{
    align-items:stretch!important;
  }
  .searchbox .row .main-route-settings{
    flex:0 0 54px!important;
    width:54px!important;
    min-width:54px!important;
    padding:0!important;
    font-size:25px!important;
    letter-spacing:2px!important;
    border-radius:12px!important;
  }
}
'''

if JS_MARKER not in js:
    raise SystemExit('JS marker missing after patch')
if CSS_MARKER not in css:
    raise SystemExit('CSS marker missing after patch')

js_path.write_text(js, encoding='utf-8')
css_path.write_text(css, encoding='utf-8')
