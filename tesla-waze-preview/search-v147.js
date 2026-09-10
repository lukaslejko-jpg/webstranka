(()=>{
'use strict';
if(window.__TESLA_SEARCH_V147)return;window.__TESLA_SEARCH_V147=true;
const baseFetch=window.fetch.bind(window);
const jsonResponse=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const uniq=a=>[...new Set(a.map(x=>String(x||'').trim()).filter(Boolean))];
const variants=q=>{
  const out=[q];
  const m=q.match(/^(.*?)(\d+)\s*\/\s*(\d+)(.*)$/);
  if(m){const pre=m[1].trim(),sup=m[2],ori=m[3],post=m[4].trim();out.push(`${pre} ${ori} ${post}`.trim(),`${pre} ${sup} ${post}`.trim(),`${pre} ${sup} ${ori} ${post}`.trim());}
  return uniq(out);
};
async function nominatim(query,lat,lng){
  const u=new URL('https://nominatim.openstreetmap.org/search');
  u.searchParams.set('q',query);u.searchParams.set('format','jsonv2');u.searchParams.set('addressdetails','1');u.searchParams.set('limit','10');u.searchParams.set('countrycodes','sk,cz,hu,pl,at');u.searchParams.set('accept-language','sk');
  if(Number.isFinite(lat)&&Number.isFinite(lng)){u.searchParams.set('viewbox',`${lng-1.6},${lat+1.2},${lng+1.6},${lat-1.2}`);u.searchParams.set('bounded','0');}
  const r=await baseFetch(u.toString(),{cache:'no-store'});if(!r.ok)throw Error('nominatim '+r.status);const rows=await r.json();
  return (Array.isArray(rows)?rows:[]).map((x,i)=>{const la=Number(x.lat),ln=Number(x.lon),ad=x.address||{},house=String(ad.house_number||'').trim(),road=String(ad.road||ad.pedestrian||ad.residential||'').trim(),settlement=String(ad.village||ad.town||ad.city||ad.municipality||'').trim();let name=String(x.name||x.display_name?.split(',')[0]||query).trim();if(/^\d+[A-Za-zÀ-ž\/-]*$/.test(name)&&road)name=`${road} ${house||name}`.trim();else if(/^\d+[A-Za-zÀ-ž\/-]*$/.test(name)&&settlement)name=`${settlement} ${name}`;return{id:String(x.place_id??i),name:name||query,searchLabel:name||query,address:String(x.display_name||''),location:{lat:la,lng:ln},lat:la,lng:ln,type:String(x.type||x.addresstype||''),source:'osm-direct'};}).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng));
}
async function photon(query){
  const u=new URL('https://photon.komoot.io/api/');u.searchParams.set('q',query);u.searchParams.set('limit','10');u.searchParams.set('lang','sk');
  const r=await baseFetch(u.toString(),{cache:'no-store'});if(!r.ok)throw Error('photon '+r.status);const d=await r.json();
  return (d.features||[]).map((f,i)=>{const p=f.properties||{},c=f.geometry?.coordinates||[],lng=Number(c[0]),lat=Number(c[1]);const name=String(p.name||p.street||p.city||p.locality||query);const address=[p.street,p.housenumber,p.postcode,p.city||p.locality||p.county,p.country].filter(Boolean).join(', ');return{id:`ph-${p.osm_id||i}`,name,searchLabel:[p.street,p.housenumber].filter(Boolean).join(' ')||name,address,location:{lat,lng},lat,lng,type:String(p.osm_value||p.type||''),source:'photon'};}).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng));
}
window.fetch=async(input,init)=>{
  const raw=typeof input==='string'?input:(input&&input.url)||'';
  let u;try{u=new URL(raw,location.href)}catch{return baseFetch(input,init)}
  if(!(u.origin===location.origin&&u.pathname==='/api/search'))return baseFetch(input,init);
  const q=(u.searchParams.get('q')||'').trim();if(q.length<2)return jsonResponse({source:'search-v147',results:[]});
  const lat=Number(u.searchParams.get('lat')),lng=Number(u.searchParams.get('lng')),queries=variants(q),all=[];
  for(const query of queries){try{all.push(...await nominatim(query,lat,lng))}catch{}if(all.length>=6)break;}
  if(!all.length){for(const query of queries){try{all.push(...await photon(query))}catch{}if(all.length>=6)break;}}
  const seen=new Set(),results=[];for(const x of all){const k=`${Number(x.lat).toFixed(5)},${Number(x.lng).toFixed(5)}|${String(x.address||x.name).toLowerCase()}`;if(seen.has(k))continue;seen.add(k);results.push(x);if(results.length>=8)break;}
  return jsonResponse({source:'search-v147',results});
};
})();
