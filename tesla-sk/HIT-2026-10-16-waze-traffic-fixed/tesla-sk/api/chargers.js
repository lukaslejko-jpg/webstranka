const ENBW='https://api.emp.emob-enbw.com/emobility-public-api/api/v1/';
const H={'Ocp-Apim-Subscription-Key':'90a67b9900364009b588e100e4b1cc64','Origin':'https://www.enbw.com','Referer':'https://www.enbw.com/','Accept':'application/json','User-Agent':'TeslaSK/1.0'};
async function getMarkers(box){
  const u=new URL(ENBW+'chargestations');
  u.searchParams.set('grouping','false');
  u.searchParams.set('fromLon',box.w);u.searchParams.set('toLon',box.e);u.searchParams.set('fromLat',box.s);u.searchParams.set('toLat',box.n);
  const r=await fetch(u,{headers:H}); if(!r.ok) throw new Error('live '+r.status); return r.json();
}
async function expand(markers,depth=0){
  if(depth>=2) return markers;
  const out=[];
  const grouped=markers.filter(x=>x.grouped&&x.viewPort);
  out.push(...markers.filter(x=>!x.grouped));
  for(let i=0;i<grouped.length;i+=6){
    const batch=grouped.slice(i,i+6);
    const rr=await Promise.all(batch.map(async x=>{
      try{return await getMarkers({w:x.viewPort.lowerLeftLon,e:x.viewPort.upperRightLon,s:x.viewPort.lowerLeftLat,n:x.viewPort.upperRightLat})}catch{return []}
    }));
    for(const arr of rr) out.push(...await expand(arr,depth+1));
  }
  return out;
}
function dedupeLive(arr){
  const seen=new Set(),out=[];
  for(const x of arr){
    const k=x.stationId?'id:'+x.stationId:'ll:'+Math.round(x.lat*1e5)+':'+Math.round(x.lon*1e5);
    if(seen.has(k))continue;seen.add(k);out.push(x);
  }
  return out;
}
function km(a,b){const R=6371,rad=x=>x*Math.PI/1¶»§q«^