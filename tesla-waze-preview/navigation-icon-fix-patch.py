from pathlib import Path

p = Path('tesla-waze-preview/app.js')
s = p.read_text(encoding='utf-8')
marker = '/* NAV_SAFE_ICONS_V13 */'
if marker not in s:
    old = "function maneuverIcon(step){const op=String(step?.opcode||'').toUpperCase();if(op.includes('ROUNDABOUT'))return '↻';if(op.includes('TURN_RIGHT'))return '↱';if(op.includes('TURN_LEFT'))return '↰';if(op.includes('KEEP_RIGHT'))return '↗';if(op.includes('KEEP_LEFT'))return '↖';if(op.includes('DESTINATION'))return '◆';return '↑'}"
    new = "function maneuverIcon(step){const op=String(step?.opcode||'').toUpperCase();if(op.includes('ROUNDABOUT'))return 'O';if(op.includes('TURN_RIGHT')||op.includes('RAMP_RIGHT')||op.includes('EXIT_RIGHT'))return '→';if(op.includes('TURN_LEFT')||op.includes('RAMP_LEFT')||op.includes('EXIT_LEFT'))return '←';if(op.includes('KEEP_RIGHT'))return '↗';if(op.includes('KEEP_LEFT'))return '↖';if(op.includes('DESTINATION'))return '◆';return '↑'}/* NAV_SAFE_ICONS_V13 */"
    if old not in s:
        raise SystemExit('maneuverIcon anchor not found')
    s = s.replace(old, new, 1)

if marker not in s:
    raise SystemExit('NAV_SAFE_ICONS_V13 missing after patch')
p.write_text(s, encoding='utf-8')
