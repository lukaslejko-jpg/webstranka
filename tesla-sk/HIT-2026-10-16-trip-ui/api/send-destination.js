export default async function handler(req,res){
  const room=String(req.query.room||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(req.method!=='POST'||!/^[A-Z0-9]{8}$/.test(room)) return res.status(400).json({ok:false});
  let body=req.body;
  if(typeof body==='string'){try{body=JSON.parse(body)}catch{return res.status(400).json({ok:false})}}
  const lat=Number(body?.lat),lng=Number(body?.lng);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180) return res.status(400).json({ok:false});
  const payload={lat,lng,name:String(body?.name||'Cieľ').slice(0,120),source:String(body?.source||'mobil').slice(0,20)};
  try{
    const r=await fetch('https://tesla-hotspotnav-relay-test.onrender.com/send?room='+encodeURIComponent(room),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    const text=await r.text();
    res.status(r.ok?200:502).setHeader('Cache-Control','no-store').send(text);
  }catch(e){res.status(502).json({ok:false,error:String(e)})}
}