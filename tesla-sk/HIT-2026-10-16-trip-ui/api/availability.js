const BASE='https://api.emp.emob-enbw.com/emobility-public-api/api/v1/';
const H={'Ocp-Apim-Subscription-Key':'90a67b9900364009b588e100e4b1cc64','Origin':'https://www.enbw.com','Referer':'https://www.enbw.com/','Accept':'application/json','User-Agent':'TeslaSK/1.0'};
export default async function handler(req,res){
  const id=String(req.query.stationId||'');
  if(!/^\d+$/.test(id)) return res.status(400).json({error:'stationId'});
  try{
    const r=await fetch(BASE+'chargestations/'+id,{headers:H});
    if(!r.ok) return res.status(r.status).json({error:'live '+r.status});
    const d=await r.json();
    const points=(d.chargePoints||[]).flatMap(cp=>(cp.connectors||[]).map(c=>({evseId:cp.evseId||'',status:cp.status||'UNKNOWN',type:c.plugTypeName||'',kw:c.maxPowerInKw||null,updatedAt:cp.state&&cp.state.updatedAt||null})));
    const ts=points.map(x=>x.updatedAt).filter(Boolean).sort().pop()||null;
    res.setHeader('Cache-Control','s-maxage=30, stale-while-revalidate=60');
    res.status(200).json({stationId:d.stationId,operator:d.operator||'',available:d.availableChargePoints,total:d.numberOfChargePoints,updatedAt:ts,points});
  }catch(e){res.status(502).json({error:String(e)})}
}