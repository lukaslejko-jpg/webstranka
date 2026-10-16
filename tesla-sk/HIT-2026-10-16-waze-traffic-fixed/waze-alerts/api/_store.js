const { get, put } = require('@vercel/blob');
const PATH = 'traffic/latest.json';
const ACTIVE_MS = 3 * 60 * 60 * 1000;
function clean(s) { const now=Date.now(); return {...s, alerts:(Array.isArray(s?.alerts)?s.alerts:[]).filter(a=>/ROAD_CLOSED|CONSTRUCTION/.test(`${a?.type||''} ${a?.subtype||''}`)||now-Number(a?.pubMillis||a?.seenAt||0)<=ACTIVE_MS), jams:Array.isArray(s?.jams)?s.jams:[]}; }
async function readJson(path){const r=await get(path,{access:'private'});if(!r||r.statusCode===404||!r.stream)return null;return JSON.parse(await new Response(r.stream).text());}
async function writeJson(path,data){await put(path,JSON.stringify(data),{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json',cacheControlMaxAge:60});return data;}
async function readSnapshot(){const data=await readJson(PATH);return data?clean(data):null;}
async function writeSnapshot(s){const data=clean({...s,receivedAt:Date.now(),source:'waze-apify',degraded:false});await writeJson(PATH,data);return data;}
module.exports={readSnapshot,writeSnapshot,readJson,writeJson};
