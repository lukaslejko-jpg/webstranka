// Public video metadata only. Playback remains in the official YouTube player.
const cache=new Map();
const text=n=>typeof n==='string'?n:n?.simpleText||n?.runs?.map(x=>x.text||'').join('')||'';
function initialData(html){
 for(const marker of ['var ytInitialData =','window["ytInitialData"] =','ytInitialData =']){
  let p=html.indexOf(marker);if(p<0)continue;p=html.indexOf('{',p+marker.length);if(p<0)continue;
  let depth=0,quoted=false,escaped=false;
  for(let i=p;i<html.length;i++){const c=html[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;}else if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&!--depth){try{return JSON.parse(html.slice(p,i+1));}catch{break;}}}
 }
 throw Error('YouTube search metadata missing');
}
function collect(data){
 const out=[],seen=new Set();
 function walk(node){if(!node||typeof node!=='object')return;
  const v=node.videoRenderer||node.compactVideoRenderer;
  if(v?.videoId&&!seen.has(v.videoId)){
   seen.add(v.videoId);const title=text(v.title);if(title){const d=text(v.lengthText)||text(v.thumbnailOverlays?.find(x=>x.thumbnailOverlayTimeStatusRenderer)?.thumbnailOverlayTimeStatusRenderer?.text);const duration=/^\d+(?::\d+){1,2}$/.test(d)?d.split(':').reduce((s,x)=>s*60+Number(x),0):0;
    out.push({id:'youtube:'+v.videoId,youtubeId:v.videoId,title,artist:text(v.ownerText||v.shortBylineText||v.longBylineText)||'YouTube',duration,artwork:v.thumbnail?.thumbnails?.slice(-1)[0]?.url||'https://i.ytimg.com/vi/'+v.videoId+'/hqdefault.jpg'});
   }
  }
  if(Array.isArray(node))node.forEach(walk);else for(const value of Object.values(node))walk(value);
 }
 walk(data);return out.slice(0,40);
}
export default async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Tesla-Music-Release','39');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed',items:[]});}
 const q=String(new URL(req.url,'https://tesla-waze-piped.vercel.app').searchParams.get('q')||'').trim().slice(0,200);
 if(!q)return res.status(400).json({error:'Zadaj názov skladby alebo interpreta.',items:[]});
 const k=q.toLowerCase(),hit=cache.get(k);if(hit&&Date.now()-hit.at<300000){res.setHeader('Cache-Control','public, max-age=0, s-maxage=120');return res.status(200).json(hit.data);}
 try{
  let items=[],last='';
  for(const host of ['www.youtube.com','m.youtube.com']){
   try{const u='https://'+host+'/results?search_query='+encodeURIComponent(q)+'&hl=en';const r=await fetch(u,{headers:{'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36','Accept-Language':'en-US,en;q=0.9'},signal:AbortSignal.timeout(10000)});
    if(!r.ok)throw Error('YouTube HTTP '+r.status);if(!new URL(r.url).hostname.endsWith('youtube.com'))throw Error('YouTube consent or login redirect');
    items=collect(initialData(await r.text()));if(items.length)break;last='No video results';
   }catch(e){last=e.message;}
  }
  if(!items.length)throw Error(last||'No video results');
  const data={query:q,items,source:'youtube-public-metadata',release:39};if(cache.size>100)cache.delete(cache.keys().next().value);cache.set(k,{at:Date.now(),data});
  res.setHeader('Cache-Control','public, max-age=0, s-maxage=120');return res.status(200).json(data);
 }catch(e){console.error('Tesla Music search:',e.message);res.setHeader('Cache-Control','no-store');return res.status(502).json({error:'Vyhľadávanie je dočasne nedostupné. Skús to znovu.',code:'SEARCH_UPSTREAM',items:[],release:39});}
}
