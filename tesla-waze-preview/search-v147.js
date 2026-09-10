(()=>{
'use strict';
if(window.__TESLA_SEARCH_V147)return;window.__TESLA_SEARCH_V147=true;
const baseFetch=window.fetch.bind(window);
const BACKEND='https://europrojekty-app.vercel.app/api/tesla/search';
const jsonResponse=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
window.fetch=async(input,init)=>{
  const raw=typeof input==='string'?input:(input&&input.url)||'';
  let u;try{u=new URL(raw,location.href)}catch{return baseFetch(input,init)}
  if(!(u.origin===location.origin&&u.pathname==='/api/search'))return baseFetch(input,init);
  const q=(u.searchParams.get('q')||'').trim();
  if(q.length<2)return jsonResponse({source:'vercel-search-v148',results:[]});
  const target=new URL(BACKEND);
  target.searchParams.set('q',q);
  const lat=u.searchParams.get('lat'),lng=u.searchParams.get('lng');
  if(lat)target.searchParams.set('lat',lat);
  if(lng)target.searchParams.set('lng',lng);
  try{
    const r=await baseFetch(target.toString(),{cache:'no-store',method:'GET',mode:'cors',credentials:'omit'});
    const d=await r.json().catch(()=>({results:[]}));
    if(!r.ok)throw new Error(d?.error||('search '+r.status));
    return jsonResponse({source:'vercel-search-v148',results:Array.isArray(d.results)?d.results:[]});
  }catch(e){
    console.warn('Tesla Vercel search failed:',e?.message||e);
    return jsonResponse({source:'vercel-search-v148',results:[],error:String(e?.message||e)},502);
  }
};
})();
