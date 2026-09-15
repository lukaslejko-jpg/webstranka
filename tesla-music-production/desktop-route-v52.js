/* Music V53: /desktop-only window controls. Mobile root is untouched. */
(()=>{
'use strict';
if(!/^\/desktop\/?$/.test(location.pathname))return;
document.documentElement.dataset.musicDesktop='53';
const css=document.createElement('style');css.textContent=`html[data-music-desktop="53"] body{min-width:0}html[data-music-desktop="53"] #playerWindow{max-width:920px;margin-inline:auto}html[data-music-desktop="53"] #desktopToBar{font-size:0}html[data-music-desktop="53"] #desktopToBar:after{content:'▁';font-size:24px}html[data-music-desktop="53"] #pmin:after{content:'◱'}html[data-music-desktop="53"] #pmin{font-size:0}html[data-music-desktop="53"] #pmin:after{font-size:21px}html[data-music-desktop="53"] #pmax{font-size:0}html[data-music-desktop="53"] #pmax:after{content:'□';font-size:22px}`;document.head.appendChild(css);
function boot(){
 const pw=document.getElementById('playerWindow'),head=document.getElementById('phead'),pmin=document.getElementById('pmin'),pmax=document.getElementById('pmax'),restore=document.getElementById('restore');if(!pw||!head)return;
 let bar=document.getElementById('desktopToBar');if(!bar){bar=document.createElement('button');bar.id='desktopToBar';bar.type='button';bar.className='iconbtn';bar.title='Stiahnuť na spodnú lištu';bar.setAttribute('aria-label','Stiahnuť na spodnú lištu');head.insertBefore(bar,pmin||null);}
 bar.onclick=e=>{e.preventDefault();e.stopPropagation();pw.classList.remove('mini-recs','max');pw.classList.add('minimized');try{localStorage.setItem('teslaMusic:miniRecommendations:v3','false')}catch{};};
 if(pmin){pmin.title='Malé okno';pmin.setAttribute('aria-label','Malé okno');}
 if(pmax){pmax.title='Veľké okno';pmax.setAttribute('aria-label','Veľké okno');}
 if(restore){restore.title='Otvoriť prehrávač z lišty';restore.setAttribute('aria-label','Otvoriť prehrávač z lišty');restore.onclick=e=>{e.preventDefault();e.stopPropagation();pw.classList.remove('minimized');window.teslaMusicSetFull?.();};}
}
window.musicDesktopV53=Object.freeze({version:53,path:'/desktop',mobileRootUntouched:true,controls:{bar:'▁',small:'◱',max:'□'}});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
