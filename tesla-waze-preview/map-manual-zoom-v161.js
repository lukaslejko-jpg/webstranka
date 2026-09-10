(()=>{
'use strict';
/* MAP_MANUAL_ZOOM_PREFETCH_V161
   Only Leaflet zoomIn/zoomOut controls are delayed briefly while tiles for the
   target zoom are warmed. Automatic navigation setZoom/setView logic is untouched. */
let installed=false;
const mercatorTile=(lat,lng,z)=>{
  const n=2**z,x=(lng+180)/360*n,rad=Math.max(-85.0511,Math.min(85.0511,lat))*Math.PI/180;
  const y=(1-Math.asinh(Math.tan(rad))/Math.PI)/2*n;
  return {x:Math.floor(x),y:Math.floor(y),n};
};
const templates=()=>{
  const out=new Map();
  for(const img of document.querySelectorAll('img.leaflet-tile[src]')){
    try{
      const u=new URL(img.currentSrc||img.src,location.href);
      if(u.hostname==='www.waze.com'&&/\/row-tiles\/live\/base\//.test(u.pathname))out.set('waze',{kind:'waze',origin:u.origin});
      else if(/arcgisonline\.com$/.test(u.hostname)&&/\/MapServer\/tile\//.test(u.pathname)){
        const base=u.pathname.replace(/\/tile\/\d+\/\d+\/\d+.*$/,'/tile');
        out.set(u.hostname+base,{kind:'esri',origin:u.origin,base});
      }
    }catch{}
  }
  return [...out.values()];
};
const urlsFor=(map,z)=>{
  const c=map.getCenter?.();if(!c)return [];
  const t=mercatorTile(c.lat,c.lng,z),size=map.getSize?.()||{x:1024,y:768};
  const rx=Math.min(4,Math.ceil(size.x/512)+2),ry=Math.min(4,Math.ceil(size.y/512)+2),tpls=templates(),urls=[];
  for(const tpl of tpls){
    for(let dy=-ry;dy<=ry;dy++)for(let dx=-rx;dx<=rx;dx++){
      const x=((t.x+dx)%t.n+t.n)%t.n,y=t.y+dy;if(y<0||y>=t.n)continue;
      if(tpl.kind==='waze')urls.push(`${tpl.origin}/row-tiles/live/base/${z}/${x}/${y}/tile.png`);
      else urls.push(`${tpl.origin}${tpl.base}/${z}/${y}/${x}`);
      if(urls.length>=32)return urls;
    }
  }
  return urls;
};
const warm=(urls,maxWait=220)=>new Promise(resolve=>{
  if(!urls.length){resolve();return}
  let done=0,finished=false;const need=Math.max(4,Math.ceil(urls.length*.65));
  const finish=()=>{if(finished)return;finished=true;resolve()};
  const hit=()=>{done++;if(done>=need)finish()};
  for(const url of urls){const img=new Image();img.decoding='async';img.onload=hit;img.onerror=hit;img.src=url}
  setTimeout(finish,maxWait);
});
const install=()=>{
  if(installed)return true;
  const L=window.L;if(!L?.Map?.prototype)return false;
  const p=L.Map.prototype;if(p.__teslaManualZoomV161)return true;
  const zin=p.zoomIn,zout=p.zoomOut;if(typeof zin!=='function'||typeof zout!=='function')return false;
  const run=function(dir,delta,options){
    if(this.__teslaManualZoomBusy)return this;
    const d=Math.max(1,Number(delta)||1),z=this.getZoom?.()??0,target=dir>0?Math.min(this.getMaxZoom?.()??20,z+d):Math.max(this.getMinZoom?.()??0,z-d);
    if(target===z)return this;
    this.__teslaManualZoomBusy=true;
    warm(urlsFor(this,Math.round(target))).finally(()=>{
      try{dir>0?zin.call(this,d,options):zout.call(this,d,options)}finally{setTimeout(()=>{this.__teslaManualZoomBusy=false},120)}
    });
    return this;
  };
  p.zoomIn=function(delta,options){return run.call(this,1,delta,options)};
  p.zoomOut=function(delta,options){return run.call(this,-1,delta,options)};
  p.__teslaManualZoomV161=true;installed=true;return true;
};
if(!install()){const t=setInterval(()=>{if(install())clearInterval(t)},100);setTimeout(()=>clearInterval(t),10000)}
})();
