from pathlib import Path

js_path = Path('tesla-waze-preview/app.js')
css_path = Path('tesla-waze-preview/app.css')
js = js_path.read_text(encoding='utf-8')
css = css_path.read_text(encoding='utf-8')
marker = '/* MUSIC_FREE_FALLBACK_V15 */'
css_marker = '/* MUSIC_FULL_QUEUE_V15 */'

if marker not in js:
    old = "resumeTimer:null};"
    new = "resumeTimer:null,anonymousYoutube:false,fallbackAttempts:0,fallbackTimer:null};"
    if old not in js:
        raise SystemExit('music state anchor missing')
    js = js.replace(old, new, 1)

    old = "function ensureMusicQueue(){const items=musicItems();if(!music.queue.length||!music.current||!music.queue.some(x=>mt(x).id===mt(music.current).id)){music.queue=items;save(LS.queue,music.queue)}return music.queue}"
    new = "function ensureMusicQueue(){const items=musicItems();if(music.queue.length<2||!music.current||!music.queue.some(x=>mt(x).id===mt(music.current).id)){music.queue=items;save(LS.queue,music.queue)}return music.queue}"
    if old not in js:
        raise SystemExit('queue anchor missing')
    js = js.replace(old, new, 1)

    old = "const media=yt?`<div id=\"ytPlayerHost\" class=\"yt-player\"></div>`:'<audio controls></audio>';\n  const controls="
    new = "const media=yt?`<div id=\"ytPlayerHost\" class=\"yt-player\"></div>`:'<audio controls></audio>';\n  const freeRow=yt?`<div class=\"music-free-row\"><span data-free-status>${music.anonymousYoutube?'Free YouTube · reklamy môžu byť zobrazené':'YouTube účet'}</span><button type=\"button\" class=\"btn\" data-ma=\"free\">S reklamami</button></div>`:'';\n  const controls="
    if old not in js:
        raise SystemExit('media anchor missing')
    js = js.replace(old, new, 1)

    old = "${media}${controls}<div class=\"music-mini-panel\">"
    new = "${media}${freeRow}${controls}<div class=\"music-mini-panel\">"
    if old not in js:
        raise SystemExit('player markup anchor missing')
    js = js.replace(old, new, 1)

    old = "r.querySelector('[data-ma=toggle]').onclick=toggleMusicPlayback;"
    new = "const freeBtn=r.querySelector('[data-ma=free]');if(freeBtn)freeBtn.onclick=()=>switchYoutubeToFree(yt,true);\n  r.querySelector('[data-ma=toggle]').onclick=toggleMusicPlayback;"
    if old not in js:
        raise SystemExit('controls wire anchor missing')
    js = js.replace(old, new, 1)

    old_func = "async function setupYoutubePlayer(yt){try{await loadYoutubeApi();if(!document.getElementById('ytPlayerHost'))return;music.ytPlayer=new YT.Player('ytPlayerHost',{videoId:yt,playerVars:{autoplay:1,playsinline:1,rel:0},events:{onReady:e=>{syncMediaSession();try{e.target.playVideo()}catch{}},onStateChange:e=>{if(e.data===YT.PlayerState.PLAYING)setMusicPlaying(true);else if(e.data===YT.PlayerState.PAUSED||e.data===YT.PlayerState.CUED){setMusicPlaying(false);scheduleMusicResume()}else if(e.data===YT.PlayerState.ENDED){music.wantsPlayback=false;setMusicPlaying(false);if(music.current)mev('complete',music.current);if(music.autoNext)mnext()}}}})}catch{const h=document.getElementById('ytPlayerHost');if(h)h.innerHTML=`<iframe class=\"yt-player\" src=\"https://www.youtube.com/embed/${encodeURIComponent(yt)}?autoplay=1&playsinline=1\" allow=\"autoplay; encrypted-media; picture-in-picture\" allowfullscreen></iframe>`;syncMediaSession()}}"
    new_func = r'''function currentYoutubeId(){const t=music.current;if(!t)return'';const s=mt(t);return t.youtubeId||s.youtubeId||(String(t.id||'').startsWith('youtube:')?String(t.id).slice(8):'')}
function setYoutubeFallbackStatus(text,active=false){const el=document.querySelector('[data-free-status]');if(el){el.textContent=text;el.classList.toggle('active',active)}}
async function switchYoutubeToFree(yt,manual=false){if(!yt)return;music.anonymousYoutube=true;music.fallbackAttempts=0;if(music.fallbackTimer){clearTimeout(music.fallbackTimer);music.fallbackTimer=null}setYoutubeFallbackStatus(manual?'Spúšťam bezplatné YouTube s reklamami…':'YouTube účet je blokovaný · prepínam na prehrávanie s reklamami…',true);try{music.ytPlayer?.destroy?.()}catch{}music.ytPlayer=null;const host=document.getElementById('ytPlayerHost');if(host){host.innerHTML=''}await setupYoutubePlayer(yt,true)}
function noteYoutubeBlockedState(yt){if(music.anonymousYoutube||music.userPaused||!music.wantsPlayback)return;music.fallbackAttempts=(music.fallbackAttempts||0)+1;if(music.fallbackAttempts>=3)switchYoutubeToFree(yt,false)}
async function setupYoutubePlayer(yt,anonymous=music.anonymousYoutube){try{await loadYoutubeApi();const host=document.getElementById('ytPlayerHost');if(!host)return;music.anonymousYoutube=!!anonymous;try{music.ytPlayer?.destroy?.()}catch{}host.innerHTML='';setYoutubeFallbackStatus(anonymous?'Free YouTube · reklamy môžu byť zobrazené':'YouTube účet',anonymous);music.ytPlayer=new YT.Player('ytPlayerHost',{host:anonymous?'https://www.youtube-nocookie.com':'https://www.youtube.com',videoId:yt,playerVars:{autoplay:1,playsinline:1,rel:0,origin:location.origin},events:{onReady:e=>{syncMediaSession();try{e.target.playVideo()}catch{}},onStateChange:e=>{if(e.data===YT.PlayerState.PLAYING){music.fallbackAttempts=0;setMusicPlaying(true)}else if(e.data===YT.PlayerState.PAUSED||e.data===YT.PlayerState.CUED||e.data===YT.PlayerState.UNSTARTED){setMusicPlaying(false);scheduleMusicResume();noteYoutubeBlockedState(yt)}else if(e.data===YT.PlayerState.ENDED){music.wantsPlayback=false;setMusicPlaying(false);if(music.current)mev('complete',music.current);if(music.autoNext)mnext()}},onError:()=>{if(!anonymous&&music.wantsPlayback&&!music.userPaused)noteYoutubeBlockedState(yt)}}})}catch{const h=document.getElementById('ytPlayerHost');if(h){const base=anonymous?'https://www.youtube-nocookie.com':'https://www.youtube.com';h.innerHTML=`<iframe class="yt-player" src="${base}/embed/${encodeURIComponent(yt)}?autoplay=1&playsinline=1" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;setYoutubeFallbackStatus(anonymous?'Free YouTube · reklamy môžu byť zobrazené':'YouTube účet',anonymous)}syncMediaSession()}}
setInterval(()=>{if(music.anonymousYoutube||music.userPaused||!music.wantsPlayback||!music.ytPlayer)return;try{const st=music.ytPlayer.getPlayerState?.();if(st!==YT.PlayerState.PLAYING&&st!==YT.PlayerState.BUFFERING)noteYoutubeBlockedState(currentYoutubeId())}catch{}},2600);''' + marker
    if old_func not in js:
        raise SystemExit('setupYoutubePlayer anchor missing')
    js = js.replace(old_func, new_func, 1)

if css_marker not in css:
    css += r'''

/* MUSIC_FULL_QUEUE_V15 */
.music-free-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:7px 0 2px;padding:7px 9px;border:1px solid #2b3a47;border-radius:10px;background:#101b25;color:#a8bac7;font-size:12px;font-weight:800}
.music-free-row [data-free-status].active{color:#67e8f9}
.music-free-row .btn{min-height:38px;height:38px;padding:0 10px;font-size:12px;white-space:nowrap}
.music-shell.music-minimized .music-free-row{display:none!important}
.music-shell:not(.music-minimized) .music-mini-panel{display:flex!important;flex-direction:column;gap:7px;margin-top:8px;min-height:150px;max-height:290px;overflow:hidden}
.music-shell:not(.music-minimized) .music-mini-panel>.music-mini-queue{flex:1;min-height:110px;overflow-y:auto}
.music-shell.music-maximized:not(.music-minimized) .music-mini-panel{max-height:38vh!important}
.music-shell.music-maximized:not(.music-minimized) .music-mini-queue{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));align-content:start;gap:8px 10px;padding:8px 2px 4px!important}
.music-shell.music-maximized:not(.music-minimized) .music-mini-track{margin:0!important;border:1px solid #263746!important;min-width:0!important}
@media(max-width:760px){
  .music-shell.music-maximized:not(.music-minimized) .music-mini-queue{grid-template-columns:1fr!important}
  .music-shell:not(.music-minimized) .music-mini-panel{max-height:34vh}
}
'''

for required in (marker, css_marker):
    target = js if required == marker else css
    if required not in target:
        raise SystemExit(f'{required} missing after patch')

js_path.write_text(js, encoding='utf-8')
css_path.write_text(css, encoding='utf-8')
