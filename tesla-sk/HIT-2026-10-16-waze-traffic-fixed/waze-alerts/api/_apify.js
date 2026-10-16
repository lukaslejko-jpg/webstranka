const {readJson,writeJson}=require('./_store');

const APIFY_URL='https://api.apify.com/v2/acts/sian.agency~waze-traffic-scraper/run-sync-get-dataset-items';
const CACHE_MS=15*60*1000;
const MONTHLY_LIMIT=100;
const ACTIVE_MS=3*60*60*1000;

function normalizeAlert(a){
  const lat=Number(a?.latitude??a?.location?.y??a?.lat),lng=Number(a?.longitude??a?.location?.x??a?.lng);
  const type=String(a?.type||a?.alertType||'HAZARD'),subtype=String(a?.subtype||a?.alertSubtype||'');
  const parsed=Date.parse(a?.publish_datetime_utc||a?.publishDatetimeUtc||''),published=Number(a?.pubMillis||(Number.isFinite(parsed)?parsed:Date.now()));
  const persistent=/ROAD_CLOSED|CONSTRUCTION/.test(`${type} ${subtype}`);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||(!persistent&&Date.now()-published>ACTIVE_MS))return null;
  return{id:String(a.alert_id||a.alertId||a.uuid||`${type}:${lat.toFixed(5)}:${lng.toFixed(5)}`),type,subtype,lat,lng,street:String(a.street||''),city:String(a.city||''),reliability:Number(a.alert_reliability??a.alertReliability??a.reliability??0),confidence:Number(a.alert_confidence??a.alertConfidence??a.confidence??0),thumbsUp:Number(a.num_thumbs_up??a.numThumbsUp??a.nThumbsUp??0),pubMillis:persistent?Date.now():published,seenAt:Date.now(),source:'waze-apify'};
}

function normalizeJam(j){
  const line=(j?.line_coordinates||j?.lineCoordinates||j?.line||j?.routeCoordinates||[]).map(p=>({lat:Number(p.lat??p.latitude??p.y??p[0]),lng:Number(p.lon??p.lng??p.longitude??p.x??p[1])¶»§q«^