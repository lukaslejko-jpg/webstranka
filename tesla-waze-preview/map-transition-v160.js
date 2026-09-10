(()=>{
'use strict';
/* MAP_NAV_TRANSITION_V160
   On the first heading-up camera update after entering/leaving route overview,
   let Leaflet settle center/zoom first. Apply the captured bearing only after
   visible tiles are ready (or after a short bounded timeout). No animations. */
let pending=false,installed=false;
const install=()=>{
  if(installed)return true;
  const L=window.L;
  if(!L?.Map?.prototype||typeof window.applyHeadingUp!=='function')return false;
  const proto=L.Map.prototype;
  const originalApply=window.applyHeadingUp;
  const originalBegin=typeof window.beginNavigationOverview==='function'?window.beginNavigationOverview:null;
  const originalToggle=typeof window.toggleOverview==='function'?window.toggleOverview:null;
  if(originalBegin)window.beginNavigationOverview=function(...args){pending=true;return originalBegin.apply(this,args)};
  if(originalToggle)window.toggleOverview=function(...args){pending=true;return originalToggle.apply(this,args)};
  window.applyHeadingUp=function(...args){
    if(!pending)return originalApply.apply(this,args);
    pending=false;
    const originalSetHeading=proto.setHeading;
    const originalSetBearing=proto.setBearing;
    let captured=null;
    if(typeof originalSetHeading==='function')proto.setHeading=function(h,...rest){captured={map:this,kind:'heading',h,rest};return this};
    if(typeof originalSetBearing==='function')proto.setBearing=function(h,...rest){captured={map:this,kind:'bearing',h,rest};return this};
    let result;
    try{result=originalApply.apply(this,args)}finally{
      if(typeof originalSetHeading==='function')proto.setHeading=originalSetHeading;
      if(typeof originalSetBearing==='function')proto.setBearing=originalSetBearing;
    }
    if(captured){
      const started=performance.now();
      const applyBearing=()=>{
        const tiles=[...document.querySelectorAll('img.leaflet-tile')].filter(x=>x.offsetParent!==null);
        const ready=!tiles.length||tiles.filter(x=>x.complete&&x.naturalWidth>0).length>=Math.ceil(tiles.length*.85);
        if(!ready&&performance.now()-started<480){setTimeout(applyBearing,60);return}
        try{
          if(captured.kind==='heading'&&typeof originalSetHeading==='function')originalSetHeading.call(captured.map,captured.h,...captured.rest);
          else if(captured.kind==='bearing'&&typeof originalSetBearing==='function')originalSetBearing.call(captured.map,captured.h,...captured.rest);
        }catch{}
      };
      setTimeout(applyBearing,60);
    }
    return result;
  };
  installed=true;
  return true;
};
if(!install()){
  const timer=setInterval(()=>{if(install())clearInterval(timer)},100);
  setTimeout(()=>clearInterval(timer),10000);
}
})();
