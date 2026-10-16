export default async function handler(req,res){
  const raw=String(req.query.text||'').trim();
  if(!raw) return res.status(400).json({error:'text'});
  const text=raw.slice(0,180);
  try{
    const u='https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=sk&q='+encodeURIComponent(text);
    const r=await fetch(u,{headers:{'User-Agent':'Mozilla/5.0'}});
    if(!r.ok) return res.status(502).json({error:'tts '+r.status});
    const b=Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type','audio/mpeg');
    res.setHeader('Content-Length',String(b.length));
    res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).send(b);
  }catch(e){
    res.status(502).json({error:String(e)});
  }
}