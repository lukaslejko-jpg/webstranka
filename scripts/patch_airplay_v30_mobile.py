from pathlib import Path
p=Path('tesla-music-v7-preview/offline-v20.js')
s=p.read_text(encoding='utf-8')
start=s.index('/* AirPlay / system playback target V29. Mobile-only, no account required. */')
end=s.index('\n})();\n})();', start)+len('\n})();')
new=r'''/* AirPlay V30: iPhone-only control in the scrollable mobile tabs. */
(()=>{
  if(window.__TESLA_AIRPLAY_V30__)return;window.__TESLA_AIRPLAY_V30__=true;
  const isiOS=/iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  if(!isiOS)return;
  const tabs=document.querySelector('.tabs');if(!tabs)return;
  const b=document.createElement('button');b.id='airplayBtn';b.type='button';b.className='chip airplay-btn';b.textContent='◉ AirPlay';b.title='AirPlay';tabs.appendChild(b);
  try{audio.setAttribute('x-webkit-airplay','allow');audio.setAttribute('webkit-playsinline','true')}catch{}
  function status(t){const e=document.getElementById('status');if(e)e.textContent=t}
  b.addEventListener('click',()=>{
    try{
      if(typeof audio.webkitShowPlaybackTargetPicker==='function'&&audio.src){audio.webkitShowPlaybackTargetPicker();status('Vyber AirPlay zariadenie');return}
      if(offlineMode&&!currentRec){status('Najprv spusti offline skladbu, potom AirPlay.');return}
      status('Online YouTube beží v oficiálnom iframe; iOS nedovolí aplikácii otvoriť jeho AirPlay picker. Použi AirPlay v Ovládacom centre iPhonu počas prehrávania.');
      alert('Online YouTube: AirPlay vyber v Ovládacom centre iPhonu počas prehrávania. Pri offline skladbe tlačidlo otvorí AirPlay výber priamo.');
    }catch(e){status('AirPlay sa nepodarilo otvoriť: '+String(e?.message||e))}
  });
})();'''
s=s[:start]+new+s[end:]
s=s.replace("if(window.__TESLA_OFFLINE_V29__)return;window.__TESLA_OFFLINE_V29__=true;","if(window.__TESLA_OFFLINE_V30__)return;window.__TESLA_OFFLINE_V30__=true;",1)
p.write_text(s,encoding='utf-8')
print('patched AirPlay V30')
