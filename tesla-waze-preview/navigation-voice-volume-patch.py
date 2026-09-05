from pathlib import Path

p = Path('tesla-waze-preview/app.js')
s = p.read_text(encoding='utf-8')
marker = '/* NAV_VOICE_VOLUME_V25 */'
if marker in s:
    raise SystemExit(0)

# Persistent setting key.
old = "voice:'teslaWaze:voice:v1',voiceMode:'teslaWaze:voiceMode:v1',mapType:"
new = "voice:'teslaWaze:voice:v1',voiceMode:'teslaWaze:voiceMode:v1',voiceVolume:'teslaWaze:voiceVolume:v1',mapType:"
if old not in s:
    raise SystemExit('LS voice anchor missing')
s = s.replace(old, new, 1)

# Independent navigation voice volume, default 85%, clamped to 20-100%.
old = "voice:load(LS.voice,true),voiceMode:load(LS.voiceMode,'soft'),favorites:"
new = "voice:load(LS.voice,true),voiceMode:load(LS.voiceMode,'soft'),voiceVolume:Math.max(.2,Math.min(1,Number(load(LS.voiceVolume,.85))||.85)),favorites:"
if old not in s:
    raise SystemExit('state voice anchor missing')
s = s.replace(old, new, 1)

# Browser speech fallback obeys the same navigation-only volume.
old = "u.rate=state.voiceMode==='soft'?.9:.96;u.pitch=state.voiceMode==='soft'?1.08:1;u.volume=1;"
new = "u.rate=state.voiceMode==='soft'?.9:.96;u.pitch=state.voiceMode==='soft'?1.08:1;u.volume=state.voiceVolume;"
if old not in s:
    raise SystemExit('browser voice volume anchor missing')
s = s.replace(old, new, 1)

# Cloud TTS gain obeys navigation-only volume while preserving its previous maximum loudness.
old = "const source=voiceContext.createBufferSource(),gain=voiceContext.createGain();gain.gain.value=4;source.buffer=buffer;"
new = "const source=voiceContext.createBufferSource(),gain=voiceContext.createGain();gain.gain.value=4*state.voiceVolume;source.buffer=buffer;"
if old not in s:
    raise SystemExit('cloud voice gain anchor missing')
s = s.replace(old, new, 1)

# Tesla settings: add a large, touch-friendly volume slider in the Hlas block.
old = "<section class=\"tesla-setting-block\"><b>Hlas</b><label><span>Hlasové pokyny</span><input type=\"checkbox\" data-ts-voice ${state.voice?'checked':''}></label><div class=\"chips\"><button class=\"chip ${state.voiceMode==='soft'?'active':''}\" data-ts-vmode=\"soft\">Jemný ženský</button><button class=\"chip ${state.voiceMode==='clear'?'active':''}\" data-ts-vmode=\"clear\">Jasný ženský</button></div><small>Predvolený režim: jemný ženský hlas</small></section>"
new = "<section class=\"tesla-setting-block\"><b>Hlas</b><label><span>Hlasové pokyny</span><input type=\"checkbox\" data-ts-voice ${state.voice?'checked':''}></label><div class=\"chips\"><button class=\"chip ${state.voiceMode==='soft'?'active':''}\" data-ts-vmode=\"soft\">Jemný ženský</button><button class=\"chip ${state.voiceMode==='clear'?'active':''}\" data-ts-vmode=\"clear\">Jasný ženský</button></div><label style=\"display:block\"><span style=\"display:flex;justify-content:space-between;gap:12px;margin-bottom:8px\"><span>Hlasitosť navigácie</span><b data-ts-vvol-label>${Math.round(state.voiceVolume*100)} %</b></span><input type=\"range\" min=\"20\" max=\"100\" step=\"5\" value=\"${Math.round(state.voiceVolume*100)}\" data-ts-vvol style=\"width:100%;min-height:38px\"></label><small>Mení iba hlas navigácie. Hlasitosť hudby zostáva nezmenená.</small></section>"
if old not in s:
    raise SystemExit('voice settings block anchor missing')
s = s.replace(old, new, 1)

# Live update + persistence without re-rendering the settings panel.
old = "box.querySelectorAll('[data-ts-vmode]').forEach(b=>b.onclick=()=>{state.voiceMode=b.dataset.tsVmode;save(LS.voiceMode,state.voiceMode);renderTeslaSettings()});"
new = "box.querySelectorAll('[data-ts-vmode]').forEach(b=>b.onclick=()=>{state.voiceMode=b.dataset.tsVmode;save(LS.voiceMode,state.voiceMode);renderTeslaSettings()});const vv=box.querySelector('[data-ts-vvol]'),vvl=box.querySelector('[data-ts-vvol-label]');if(vv)vv.oninput=e=>{state.voiceVolume=Math.max(.2,Math.min(1,Number(e.target.value)/100||.85));save(LS.voiceVolume,state.voiceVolume);if(vvl)vvl.textContent=Math.round(state.voiceVolume*100)+' %'};"
if old not in s:
    raise SystemExit('voice settings wiring anchor missing')
s = s.replace(old, new, 1)

s += '\n' + marker + '\n'
p.write_text(s, encoding='utf-8')
