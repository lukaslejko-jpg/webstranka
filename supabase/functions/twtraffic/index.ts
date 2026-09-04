type Bounds = { left: number; right: number; bottom: number; top: number };
type RadarAlert = {
  id: string;
  lat: number;
  lng: number;
  location: { lat: number; lng: number };
  type: "CAMERA";
  subtype: "FIXED_SPEED_CAMERA";
  source: "openstreetmap";
  maxspeed?: string;
  direction?: string;
};

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-headers": "content-type,authorization",
};

const radarCache = new Map<string, { expiresAt: number; alerts: RadarAlert[]; source: string }>();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=30, s-maxage=60",
    },
  });
}

function normalizedBounds(url: URL): Bounds | null {
  let left = Number(url.searchParams.get("left"));
  let right = Number(url.searchParams.get("right"));
  let bottom = Number(url.searchParams.get("bottom"));
  let top = Number(url.searchParams.get("top"));
  if (![left, right, bottom, top].every(Number.isFinite)) return null;
  if (left > right) [left, right] = [right, left];
  if (bottom > top) [bottom, top] = [top, bottom];
  if (bottom < -90 || top > 90 || left < -180 || right > 180) return null;

  const latSpan = Math.min(0.9, Math.max(0.04, top - bottom));
  const lngSpan = Math.min(1.2, Math.max(0.05, right - left));
  const cy = (top + bottom) / 2;
  const cx = (left + right) / 2;
  return {
    bottom: cy - latSpan / 2,
    top: cy + latSpan / 2,
    left: cx - lngSpan / 2,
    right: cx + lngSpan / 2,
  };
}

async function loadWaze(bounds: Bounds) {
  const headers = {
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/152 Safari/537.36",
    referer: "https://www.waze.com/live-map/",
    accept: "application/json,text/plain,*/*",
    "accept-language": "sk-SK,sk;q=0.9,en;q=0.7",
  };
  const attempts: string[] = [];
  let data: any = null;
  let source = "";

  const legacy = new URL("https://www.waze.com/row-rtserver/web/TGeoRSS");
  for (const [key, value] of Object.entries({ ...bounds, ma: 500, mj: 100, mu: 50, types: "alerts,traffic,users" })) {
    legacy.searchParams.set(key, String(value));
  }
  try {
    const response = await fetch(legacy, { headers, signal: AbortSignal.timeout(6000) });
    const text = await response.text();
    attempts.push(`legacy:${response.status}`);
    if (response.ok) {
      try {
        data = JSON.parse(text);
        source = "waze-row-rtserver";
      } catch {
        attempts.push("legacy:invalid-json");
      }
    }
  } catch (error: any) {
    attempts.push(`legacy:${String(error?.name || error)}`);
  }

  if (!data) {
    const live = new URL("https://www.waze.com/live-map/api/georss");
    for (const [key, value] of Object.entries({ ...bounds, env: "row", types: "alerts,traffic", ma: 500, mj: 100, mu: 50 })) {
      live.searchParams.set(key, String(value));
    }
    try {
      const response = await fetch(live, { headers, signal: AbortSignal.timeout(6000) });
      const text = await response.text();
      attempts.push(`live:${response.status}`);
      if (response.ok) {
        try {
          data = JSON.parse(text);
          source = "waze-live-georss";
        } catch {
          attempts.push("live:invalid-json");
        }
      }
    } catch (error: any) {
      attempts.push(`live:${String(error?.name || error)}`);
    }
  }

  const alerts = (Array.isArray(data?.alerts) ? data.alerts : []).map((alert: any) => {
    const lat = Number(alert?.lat ?? alert?.location?.y ?? alert?.location?.lat);
    const lng = Number(alert?.lng ?? alert?.location?.x ?? alert?.location?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
      ...alert,
      lat,
      lng,
      location: { lat, lng },
      type: String(alert?.type || "").toUpperCase(),
      subtype: String(alert?.subtype || "").toUpperCase(),
      source: "waze-live",
    };
  }).filter(Boolean);

  const jams = (Array.isArray(data?.jams) ? data.jams : []).map((jam: any) => {
    const line = (Array.isArray(jam?.line) ? jam.line : []).map((point: any) => {
      const lat = Number(point?.lat ?? point?.y);
      const lng = Number(point?.lng ?? point?.x);
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    }).filter(Boolean);
    if (line.length < 2) return null;
    return {
      ...jam,
      line,
      level: Number(jam?.level || 0),
      speedKMH: Number(jam?.speedKMH ?? jam?.speedKPH ?? 0),
      length: Number(jam?.length || 0),
      delay: Number(jam?.delay || 0),
      street: String(jam?.street || ""),
    };
  }).filter(Boolean);

  return { alerts, jams, source: source || "waze-unavailable", attempts, degraded: !data };
}

function radarCacheKey(bounds: Bounds) {
  return [bounds.bottom, bounds.left, bounds.top, bounds.right].map((value) => value.toFixed(2)).join(":");
}

async function loadOsmRadars(bounds: Bounds) {
  const key = radarCacheKey(bounds);
  const cached = radarCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached;

  // Keep the free Overpass service bounded to the visible/route corridor.
  const queryBounds = `${bounds.bottom},${bounds.left},${bounds.top},${bounds.right}`;
  const query = `[out:json][timeout:12];(node["highway"="speed_camera"](${queryBounds});nwr["enforcement"="maxspeed"](${queryBounds});relation["type"="enforcement"]["enforcement"="maxspeed"](${queryBounds}););out tags center 250;`;
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
  ];
  const attempts: string[] = [];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
        headers: { accept: "application/json", "user-agent": "TeslaMaps/1.0" },
        signal: AbortSignal.timeout(14000),
      });
      attempts.push(`${new URL(endpoint).host}:${response.status}`);
      if (!response.ok) continue;
      const payload = await response.json();
      const alerts = (Array.isArray(payload?.elements) ? payload.elements : []).map((element: any): RadarAlert | null => {
        const lat = Number(element?.lat ?? element?.center?.lat);
        const lng = Number(element?.lon ?? element?.center?.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        const tags = element?.tags || {};
        return {
          id: `osm-camera:${element.type}:${element.id}`,
          lat,
          lng,
          location: { lat, lng },
          type: "CAMERA",
          subtype: "FIXED_SPEED_CAMERA",
          source: "openstreetmap",
          ...(tags.maxspeed ? { maxspeed: String(tags.maxspeed) } : {}),
          ...(tags.direction ? { direction: String(tags.direction) } : {}),
        };
      }).filter(Boolean).slice(0, 250) as RadarAlert[];
      const result = { alerts, source: "openstreetmap-overpass", attempts, expiresAt: Date.now() + 5 * 60_000 };
      radarCache.set(key, result);
      if (radarCache.size > 40) radarCache.delete(radarCache.keys().next().value);
      return result;
    } catch (error: any) {
      attempts.push(`${new URL(endpoint).host}:${String(error?.name || error)}`);
    }
  }

  return { alerts: [] as RadarAlert[], source: "openstreetmap-unavailable", attempts, expiresAt: Date.now() + 30_000 };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "GET") return json({ alerts: [], jams: [], error: "method not allowed" }, 405);

  try {
    const bounds = normalizedBounds(new URL(req.url));
    if (!bounds) return json({ alerts: [], jams: [], error: "bad bounds" }, 400);

    const [wazeResult, radarResult] = await Promise.allSettled([loadWaze(bounds), loadOsmRadars(bounds)]);
    const waze = wazeResult.status === "fulfilled"
      ? wazeResult.value
      : { alerts: [], jams: [], source: "waze-unavailable", attempts: [String(wazeResult.reason)], degraded: true };
    const radars = radarResult.status === "fulfilled"
      ? radarResult.value
      : { alerts: [], source: "openstreetmap-unavailable", attempts: [String(radarResult.reason)] };

    const alerts = [...waze.alerts, ...radars.alerts];
    const uniqueAlerts = [...new Map(alerts.map((alert: any) => [String(alert.id || alert.uuid || `${alert.type}:${alert.lat}:${alert.lng}`), alert])).values()];
    return json({
      source: "combined",
      sources: {
        waze: { source: waze.source, count: waze.alerts.length, degraded: waze.degraded, attempts: waze.attempts },
        openstreetmap: { source: radars.source, count: radars.alerts.length, attempts: radars.attempts },
      },
      alerts: uniqueAlerts.slice(0, 500),
      jams: waze.jams,
      degraded: waze.degraded && radars.alerts.length === 0,
      fetchedAt: Date.now(),
    });
  } catch (error: any) {
    return json({ source: "combined", alerts: [], jams: [], degraded: true, error: String(error?.message || error), fetchedAt: Date.now() });
  }
});
