from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import asyncio, json
from pywaze.route_calculator import WazeRouteCalculator

def num(q,k):
    try: return float(q.get(k,[None])[0])
    except: return None

def point(v):
    if not isinstance(v,dict): return None
    try:
        x=float(v.get("x",v.get("lng",v.get("lon"))))
        y=float(v.get("y",v.get("lat")))
        return {"lat":y,"lng":x}
    except: return None

async def get_traffic(a,b):
    async with WazeRouteCalculator(region="EU") as c:
        routes=await c.get_routes(
            {"lat":a["lat"],"lon":a["lng"],"bounds":{}},
            {"lat":b["lat"],"lon":b["lng"],"bounds":{}},
            alternatives=1
        )
    out=[]
    for ri,route in enumerate(routes or []):
        results=route.get("results") or route.get("result") or []
        prev=a
        for i,seg in enumerate(results):
            p=point(seg.get("path")) or prev
            length=float(seg.get("length") or 0)
            actual=float(seg.get("crossTime",seg.get("cross_time",0)) or 0)
            free=float(seg.get("crossTimeWithoutRealTime",seg.get("cross_time_without_real_time",seg.get("crossTimeFreeFlow",actual))) or actual)
            ratio=(actual/free) if free>0 and actual>0 else 1
            level=4 if ratio>=2.5 else 3 if ratio>=1.75 else 2 if ratio>=1.3 else 0
            if level>=2 and p and prev:
                out.append({
                    "id":f"waze-{ri}-{i}","level":leve¶»§q«^