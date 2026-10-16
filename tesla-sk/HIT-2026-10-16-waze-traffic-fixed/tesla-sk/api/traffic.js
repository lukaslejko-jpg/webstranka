export default async function handler(req,res){
  const fromLat=Number(req.query.fromLat),fromLng=Number(req.query.fromLng),toLat=Number(req.query.toLat),toLng=Number(req.query.toLng);
  if(![fromLat,fromLng,toLat,toLng].every(Number.isFinite)||Math.abs(fromLat)>90||Math.abs(toLat)>90||Math.abs(fromLng)>180||Math.abs(toLng)>180){
    return res.status(400).json({ok:false,jams:[],error:'bad coordinates'});
  }
  try{
    const u='https://tesla-waze-traffic.vercel.app/api/traffic?fromLat='+encodeURIComponent(fromLat)+'&fromLng='+encodeURIComponent(fromLng)+
      '&toLat='+encodeURIComponent(toLat)+'&toLng='+encodeURIComponent(toLng);
    const r=await fetch(u,{headers:{accept:'application/json','user-agent':'TeslaSK/1.0'}});
    if(!r.ok)throw new Error('traffic '+r.status);
    const d=await r.json();
    res.setHeader('Cache-Control','s-maxage=30, stale-while-revalidate=60');
    res.status(200).json({ok:true,jams:Array.isArray(d.jams)?d.jams:[],source:d.source||'waze-route'});
  }catch(e){
    res.status(502).json({ok:false,jams:[],error:String(e)});
  }
}