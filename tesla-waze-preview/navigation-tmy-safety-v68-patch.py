from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* NAV_TMY_SAFETY_V68 */'
if marker in s:
    raise SystemExit(0)

# V68 is intentionally narrow: only voice instruction safety + reroute separation.
old_instruction="function instruction(step){const op=String(step?.opcode||'').toUpperCase(), street=step?.street?` na ${step.street}`:'';if(op.includes('RAMP_RIGHT')||op.includes('EXIT_RIGHT'))return `Zíďte z diaľnice vpravo${street}.`;if(op.includes('RAMP_LEFT')||op.includes('EXIT_LEFT'))return `Zíďte z diaľnice vľavo${street}.`;if(op.includes('TURN_RIGHT'))return `Odbočte doprava${street}.`;if(op.includes('TURN_LEFT'))return `Odbočte doľava${street}.`;if(op.includes('ROUNDABOUT'))return `Pokračujte cez kruhový objazd${street}.`;if(op.includes('DESTINATION'))return 'Cieľ je pred vami.';if(op.includes('KEEP_RIGHT'))return `Držte sa vpravo${street}.`;if(op.includes('KEEP_LEFT'))return `Držte sa vľavo${street}.`;return `Pokračujte rovno${street}.`}"
new_instruction="function instruction(step){const op=String(step?.opcode||'').replace(/-/g,'_').toUpperCase(), street=step?.street?` na ${step.street}`:'';if(op.includes('RAMP_RIGHT')||op.includes('EXIT_RIGHT'))return `Zíďte z diaľnice vpravo${street}.`;if(op.includes('RAMP_LEFT')||op.includes('EXIT_LEFT'))return `Zíďte z diaľnice vľavo${street}.`;if(op.includes('TURN_RIGHT'))return `Odbočte doprava${street}.`;if(op.includes('TURN_LEFT'))return `Odbočte doľava${street}.`;if(op.includes('ROUNDABOUT'))return `Pokračujte cez kruhový objazd${street}.`;if(op.includes('DESTINATION'))return 'Cieľ je pred vami.';if(op.includes('KEEP_RIGHT'))return `Držte sa vpravo${street}.`;if(op.includes('KEEP_LEFT'))return `Držte sa vľavo${street}.`;if(op.includes('CONTINUE')||op.includes('STRAIGHT'))return `Pokračujte rovno${street}.`;return `Pokračujte podľa trasy${street}.`}"
if old_instruction not in s:
    raise SystemExit('V68 instruction anchor missing')
s=s.replace(old_instruction,new_instruction,1)

old_reroute="  const isOffRoute=!arrived&&(confirmedOffRoute(n.distance,state.accuracy)||wrongTurnDetected(r,n));\n  if(isOffRoute)state.offRouteHits=(state.offRouteHits||0)+1;else state.offRouteHits=0;\n  if(isOffRoute&&!state.routeLoading&&Date.now()-state.lastReroute>3000){state.offRouteHits=0;state.lastReroute=Date.now();calculateRoute(false)}"
new_reroute="  const isOffRoute=!arrived&&confirmedOffRoute(n.distance,state.accuracy);\n  if(isOffRoute)state.offRouteHits=(state.offRouteHits||0)+1;else state.offRouteHits=0;\n  if(state.offRouteHits>=2&&!state.routeLoading&&Date.now()-state.lastReroute>15000){state.offRouteHits=0;state.lastReroute=Date.now();calculateRoute(false)}\n  const wrongTurn=!arrived&&wrongTurnDetected(r,n);\n  if(wrongTurn&&!state.routeLoading&&Date.now()-state.lastReroute>3000){state.lastReroute=Date.now();calculateRoute(false)}"
if old_reroute not in s:
    raise SystemExit('V68 reroute anchor missing')
s=s.replace(old_reroute,new_reroute,1)

# Hard safety assertions.
checks=[
    "String(step?.opcode||'').replace(/-/g,'_').toUpperCase()",
    "if(op.includes('TURN_LEFT'))return `Odbočte doľava${street}.`",
    "if(op.includes('CONTINUE')||op.includes('STRAIGHT'))return `Pokračujte rovno${street}.`",
    "return `Pokračujte podľa trasy${street}.`",
    "const isOffRoute=!arrived&&confirmedOffRoute(n.distance,state.accuracy);",
    "state.offRouteHits>=2&&!state.routeLoading&&Date.now()-state.lastReroute>15000",
    "const wrongTurn=!arrived&&wrongTurnDetected(r,n);",
    "wrongTurn&&!state.routeLoading&&Date.now()-state.lastReroute>3000",
    "destinationPoint(markerPosition,65,h)",
    "if(now-state.lastCameraAt<500)return;",
    "const key=`${p.stepIdx}:${bucket}`",
]
for item in checks:
    if item not in s:
        raise SystemExit('V68 validation failed: '+item)

if "confirmedOffRoute(n.distance,state.accuracy)||wrongTurnDetected(r,n)" in s[s.find('function updateNavigation()'):s.find('function renderRouteBox')]:
    raise SystemExit('V68 failed: off-route and wrong-turn are still coupled')
if "learnedLocal:true" in s:
    raise SystemExit('V68 failed: synthetic learnedLocal maneuver returned')

s += "\n"+marker+"\n"
p.write_text(s,encoding='utf-8')
