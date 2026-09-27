export default async function handler(req,res){
  try{
    const headers={'content-type':req.headers['content-type']||'application/json'};
    if(req.headers.authorization) headers.authorization=req.headers.authorization;
    const upstream=await fetch('https://tesla-waze-piped.vercel.app/api/music',{
      method:req.method,
      headers,
      body:['GET','HEAD'].includes(req.method)?undefined:JSON.stringify(req.body??{})
    });
    const text=await upstream.text();
    res.status(upstream.status);
    const ct=upstream.headers.get('content-type'); if(ct) res.setHeader('content-type',ct);
    res.setHeader('cache-control','no-store');
    return res.send(text);
  }catch(e){
    return res.status(502).json({error:'music_proxy_failed',detail:String(e?.message||e)});
  }
}