// Public video metadata only. Playback remains in the official YouTube player.
// Anonymous search: no Google/YouTube account or OAuth session is required.
const cache=new Map();
const RELEASE=40;
const text=n=>typeof n==='string'?n:n?.simpleText||n?.runs?.map(x=>x.text||'').join('')||'';
const clean=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
const validId=id=>/^[A-Za-z0-9_-]{11}$/.test(id||'');
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
function parseSearchHtml(html,q){
 const out=[],seen=new Set();
 const decoded=String(html||'').replace(/\\u0026/g,'&').replace(/&amp;/g,'&').replace(/%3F/g,'?').replace(/%3D/g,'=').replace(/%26/g,'&');
 const re=/(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?[^\s"'<>]*?v=([A-Za-z0-9_-]{11})[^\s"'<>]*/gi;
 let m;while((m=re.exec(decoded))&&out.length<30){const id=m[1];if(!validId(id)||seen.has(id))continue;seen.add(id);
  const around=decoded.slice(Math.max(0,m.index-500),Math.min(decoded.length,re.lastIndex+500));
  const h3=[...around.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)].pop();
  const title=clean(h3?.[1])||clean(around.match(/title="([^"]{3,180})"/i)?.[1])||`${q} · YouTube`;
  out.push({id:'youtube:'+id,youtubeId:id,title,artist:'YouTube',duration:0,artwork:'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg'});
 }
 return out;
}
async function directYouTube(q){
 let last='';
 for(const host of ['www.youtube.com','m.youtube.com','youtube.com']){
  try{const u='https://'+host+'/results?search_query='+encodeURIComponent(q)+'&hl=en';const r=await fetch(u,{headers:{'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36','Accept-Language':'en-US,en;q=0.9'},signal:AbortSignal.timeout(7000)});
   if(!r.ok)throw Error('YouTube HTTP '+r.status);if(!new URL(r.url).hostname.endsWith('youtube.com'))throw Error('YouTube redirect');
   const items=collect(initialData(await r.text()));if(items.length)return {items,source:'youtube-public-metadata'};last='No video results';
  }catch(e){last=e.message;}
 }
 throw Error(last||'YouTube unavailable');
}
async function officialApi(q){
 const key=process.env.YOUTUBE_API_KEY||process.env.GOOGLE_YOUTUBE_API_KEY||'';if(!key)return null;
 const u='https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=40&q='+encodeURIComponent(q)+'&key='+encodeURIComponent(key);
 const r=await fetch(u,{signal:AbortSignal.timeout(7000)});if(!r.ok)throw Error('YouTube Data API HTTP '+r.status);const d=await r.json();
 const items=(d.items||[]).map(x=>({id:'youtube:'+x.id?.videoId,youtubeId:x.id?.videoId,title:x.snippet?.title||'',artist:x.snippet?.channelTitle||'YouTube',duration:0,artwork:x.snippet?.thumbnails?.high?.url||x.snippet?.thumbnails?.medium?.url||''})).filter(x=>validId(x.youtubeId)&&x.title);
 return items.length?{items,source:'youtube-data-api'}:null;
}
async function webFallback(q){
 const targets=[
  ['google','https://www.google.com/search?tbm=vid&num=30&q='+encodeURIComponent(q+' site:youtube.com/watch')],
  ['bing','https://www.bing.com/videos/search?count=30&q='+encodeURIComponent(q+' site:youtube.com/watch')]
 ];
 let last='';
 for(const [name,u] of targets){try{const r=await fetch(u,{headers:{'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36','Accept-Language':'en-US,en;q=0.9'},signal:AbortSignal.timeout(7000)});if(!r.ok)throw Error(name+' HTTP '+r.status);const items=parseSearchHtml(await r.text(),q);if(items.length)return {items,source:name+'-video-fallback'};last=name+' no results';}catch(e){last=e.message;}}
 throw Error(last||'Fallback unavailable');
}
export default async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Tesla-Music-Release',String(RELEASE));
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed',items:[]});}
 const q=String(new URL(req.url,'https://tesla-waze-piped.vercel.app').searchParams.get('q')||'').trim().slice(0,200);
 if(!q)return res.status(400).json({error:'Zadaj názov skladby alebo interpreta.',items:[]});
 const k=q.toLowerCase(),hit=cache.get(k);if(hit&&Date.now()-hit.at<300000){res.setHeader('Cache-Control','public, max-age=0, s-maxage=120');return res.status(200).json(hit.data);}
 try{
  let result=null,errors=[];
  for(const search of [officialApi,directYouTube,webFallback]){try{result=await search(q);if(result?.items?.length)break;}catch(e){errors.push(e.message);}}
  if(!result?.items?.length)throw Error(errors.join(' | ')||'No video results');
  const data={query:q,items:result.items.slice(0,40),source:result.source,release:RELEASE,anonymous:true};if(cache.size>100)cache.delete(cache.keys().next().value);cache.set(k,{at:Date.now(),data});
  res.setHeader('Cache-Control','public, max-age=0, s-maxage=120');return res.status(200).json(data);
 }catch(e){console.error('Tesla Music search:',e.message);res.setHeader('Cache-Control','no-store');return res.status(502).json({error:'Vyhľadávanie je dočasne nedostupné. Skús to znovu.',code:'SEARCH_UPSTREAM',items:[],release:RELEASE,anonymous:true});}
}
