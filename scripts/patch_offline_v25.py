from pathlib import Path

p = Path('tesla-music-v7-preview/offline-v20.js')
s = p.read_text()

old = "function sim(a,b){const A=toks(a),B=toks(b);if(!A.size||!B.size)return 0;let n=0;for(const x of A)if(B.has(x))n++;return 2*n/(A.size+B.size)}\nfunction candidateScore(qt,qa,t,a){const ts=sim(qt,t),as=qa?sim(qa,a):1;if(ts<.66)return 0;if(qa&&as<.25)return 0;return ts*.78+as*.22}"
new = "function sim(a,b){const A=toks(a),B=toks(b);if(!A.size||!B.size)return 0;let n=0;for(const x of A)if(B.has(x))n++;return 2*n/(A.size+B.size)}\nfunction dashParts(s){return String(s||'').split(/\\s+[-–—]\\s+/).map(x=>x.trim()).filter(Boolean)}\nfunction candidateScore(qt,qa,t,a){const ps=dashParts(t);const ts=Math.max(sim(qt,t),...ps.map(x=>sim(qt,x)),0),as=qa?Math.max(sim(qa,a),...ps.map(x=>sim(qa,x)),0):1;if(ts<.66)return 0;if(qa&&as<.25)return 0;return ts*.78+as*.22}\nfunction genericUploader(a){return /^(audio library|youtube|various artists|music|topic|unknown)$/i.test(fold(a))}\nfunction requestIdentity(title,artist){let t=String(title||'').replace(/\\([^)]*(no copyright|copyright free|royalty free)[^)]*\\)/ig,'').replace(/\\[[^\\]]*(no copyright|copyright free|royalty free)[^\\]]*\\]/ig,'').replace(/\\s+/g,' ').trim(),a=clean(artist);if(genericUploader(a)){const ps=dashParts(t);if(ps.length>=2){const left=clean(ps[0]),right=clean(ps.slice(1).join(' - '));if(left&&right&&right.split(/\\s+/).length<=6){t=left;a=right}else{a=''}}else a=''}return{title:clean(t),artist:a}}"
if old not in s:
    raise SystemExit('candidateScore block not found')
s = s.replace(old, new, 1)

old2 = "try{const candidates=await resolveCandidates(t.title||'',t.uploader||t.artist||'');if(!candidates.length)throw new Error('not_found');"
new2 = "try{const rq=requestIdentity(t.title||'',t.uploader||t.artist||'');const candidates=await resolveCandidates(rq.title,rq.artist);if(!candidates.length)throw new Error('not_found');"
if old2 not in s:
    raise SystemExit('saveOffline resolver call not found')
s = s.replace(old2, new2, 1)

s = s.replace("if(window.__TESLA_OFFLINE_V24__)return;window.__TESLA_OFFLINE_V24__=true;", "if(window.__TESLA_OFFLINE_V25__)return;window.__TESLA_OFFLINE_V25__=true;", 1)
p.write_text(s)
