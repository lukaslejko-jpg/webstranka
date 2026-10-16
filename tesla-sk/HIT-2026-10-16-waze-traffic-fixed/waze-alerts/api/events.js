const { readSnapshot, writeSnapshot } = require('./_store');
const { live } = require('./_apify');

function headers(res) {
  res.setHeader('cache-control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  res.setHeader('access-control-allow-origin', 'https://tesla-waze.vercel.app');
  res.setHeader('access-control-allow-methods', 'GET,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
}
module.exports = async (req, res) => {
  headers(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ alerts: [], jams: [], degraded: true, error: 'method not allowed' });
  try {
    const left=Number(req.query.left),right=Number(req.query.right),bottom=Number(req.query.bottom),top=Number(req.query.top);
    if(![left,right,bottom,top].every(Number.isFinite)||left>=right||bottom>=top||right-left>1.2||top-bottom>1.2)return res.status(400).json({alerts:[],jams:[],degraded:true,error:'bad bounds'});
    const snapshot=await writeSnapshot(await live({left,right,bottom,top}));
    const margin=.035;
    const alerts=(snapshot.alerts||[]).filter(a=>Number(a.lat)>=bottom-margin&&Number(a.lat)<=top+margin&&Number(a.lng)>=left-margin&&Number(a.lng)<=right+margin);
    const jams=(snapshot.jams||[]).filter(j=>(j.line||[]).some(p=>Number(p.lat)>=bottom-margin&&Number(p.lat)<=top+margin&&Number(p.lng)>=left-margin&&Number(p.lng)<=right+margin));
    return res.status(200).json({...snapshot,a¶»§q«^