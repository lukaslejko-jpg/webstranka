export default async function handler(req,res){
  const top=Number(req.query.top),bottom=Number(req.query.bottom),left=Number(req.query.left),right=Number(req.query.right);
  if(![top,bottom,left,right].every(Number.isFinite)||top<=bottom||right<=left||top-bottom>3||right-left>4){
    return res.status(400).json({alerts:[],jams:[],degraded:true,error:'bad bounds'});
  }
  try{
    const u='https://tesla-waze-alerts.vercel.app/api/events?top='+encodeURIComponent(top)+'&bottom='+encodeURIComponent(bottom)+'&left='+encodeURIComponent(left)+'&right='+encodeURIComponent(right);
    const r=await fetch(u,{headers:{'Accept':'application/json','User-Agent':'TeslaSK/1.0'}});
    if(!r.ok)throw new Error('upstream '+r.status);
    const d=await r.json();
    res.setHeader('Cache-Control','s-maxage=45, stale-while-revalidate=120');
    res.status(200).json({alerts:Array.isArray(d.alerts)?d.alerts:[],jams:Array.isArray(d.jams)?d.jams:[],degraded:!!d.degraded});
  }catch(e){
    res.status(502).json({alerts:[],jams:[],degraded:true,error:String(e)});
  }
}