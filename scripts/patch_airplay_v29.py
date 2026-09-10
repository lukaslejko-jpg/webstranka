from pathlib import Path

p = Path('tesla-music-v7-preview/offline-v20.js')
s = p.read_text()

old = "if(window.__TESLA_OFFLINE_V28__)return;window.__TESLA_OFFLINE_V28__=true;"
new = "if(window.__TESLA_OFFLINE_V29__)return;window.__TESLA_OFFLINE_V29__=true;"
if old not in s:
    raise SystemExit('V28 marker not found')
s = s.replace(old, new, 1)

anchor = "openDB().then(async()=>{await refreshStates();try{await navigator.storage?.persist?.()}catch{};setTimeout(paintAll,300);setInterval(()=>{if(!offlineMode)decorate()},1600)}).catch(e=>{console.warn('Offline DB',e);offlineBtn.disabled=true;offlineBtn.title='Offline úložisko nie je dostupné'});\n})();"

insert = r'''openDB().then(async()=>{await refreshStates();try{await navigator.storage?.persist?.()}catch{};setTimeout(paintAll,300);setInterval(()=>{if(!offlineMode)decorate()},1600)}).catch(e=>{console.warn('Offline DB',e);offlineBtn.disabled=true;offlineBtn.title='Offline úložisko nie je dostupné'});

/* AirPlay / system playback target V29. Mobile-only, no account required. */
(()=>{
  if(window.__TESLA_AIRPLAY_V29__)return;window.__TESLA_AIRPLAY_V29__=true;
  const top=document.querySelector('.top');if(!top)return;
  const b=document.createElement('button');b.id='airplayBtn';b.type='button';b.className='btn airplay-btn';b.textContent='◉ AirPlay';b.title='Prehrať na AirPlay / systémovom zariadení';top.appendChild(b);
  const css=document.createElement('style');css.textContent='.airplay-btn{white-space:nowrap;min-width:108px}@media(max-width:600px){.airplay-btn{min-width:96px;height:44px;padding:0 10px;font-size:13px}}';document.head.appendChild(css);
  try{audio.setAttribute('x-webkit-airplay','allow');audio.setAttribute('webkit-playsinline','true')}catch{}
  function prepYoutube(){try{const f=document.querySelector('#yt iframe,iframe[src*="youtube.com/embed"]');if(!f)return;f.setAttribute('webkit-playsinline','true');f.setAttribute('playsinline','true');const a=String(f.getAttribute('allow')||'');const need=['autoplay','encrypted-media','picture-in-picture'];f.setAttribute('allow',[...new Set(a.split(';').map(x=>x.trim()).filter(Boolean).concat(need))].join('; '))}catch{}}
  function status(t){const e=document.getElementById('status');if(e)e.textContent=t}
  b.addEventListener('click',()=>{
    prepYoutube();
    try{
      if(offlineMode&&currentRec&&typeof audio.webkitShowPlaybackTargetPicker==='function'){
        audio.webkitShowPlaybackTargetPicker();status('Vyber AirPlay zariadenie');return;
      }
      const local=[...document.querySelectorAll('video,audio')].find(m=>m!==audio&&typeof m.webkitShowPlaybackTargetPicker==='function'&&!m.closest('iframe'));
      if(local){local.setAttribute('x-webkit-airplay','allow');local.webkitShowPlaybackTargetPicker();status('Vyber AirPlay zariadenie');return}
      if(typeof audio.webkitShowPlaybackTargetPicker==='function'&&audio.src){audio.webkitShowPlaybackTargetPicker();status('Vyber AirPlay zariadenie');return}
      status('AirPlay pre online YouTube vyber cez prehrávač alebo Ovládacie centrum iPhonu');
    }catch(e){status('AirPlay sa nepodarilo otvoriť: '+String(e?.message||e))}
  });
  const obs=setInterval(prepYoutube,1500);setTimeout(()=>clearInterval(obs),30000);prepYoutube();
})();
})();'''

if anchor not in s:
    raise SystemExit('final anchor not found')
s = s.replace(anchor, insert, 1)
p.write_text(s)
