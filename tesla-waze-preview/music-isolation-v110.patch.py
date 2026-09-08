from pathlib import Path

jsp=Path('tesla-waze-preview/app.js')
cssp=Path('tesla-waze-preview/app.css')
js=jsp.read_text(encoding='utf-8')
css=cssp.read_text(encoding='utf-8')

# Main goal: remove YouTube's browsing context from the map document.
# The main document keeps UI/state only. A dedicated cross-origin iframe owns YouTube playback.
if '/* MUSIC_ISOLATED_ENGINE_V110 */' not in js:
    # 1) Avoid heavyweight list/home rerender on every track change.
    js=js.replace('updateMiniSeek();syncMediaSession();installTeslaMediaSession();renderMusicStatus();renderMusicList();',
                  'updateMiniSeek();syncMediaSession();installTeslaMediaSession();renderMusicStatus();',1)
    js=js.replace('updateMiniSeek();syncMediaSession();renderMusicStatus();renderMusicList();',
                  'updateMiniSeek();syncMediaSession();renderMusicStatus();',1)

    # 2) Add isolated engine bridge before mplay.
    anchor='function mplay(t){\n'
    if anchor not in js:
        raise SystemExit('mplay anchor missing')
    bridge=r'''const TW_MUSIC_ENGINE_URL='https://raw.githack.com/lukaslejko-jpg/webstranka/tesla-waze-emergency-direct/tesla-waze-preview/music-isolated-engine-v110.html?v=110';
let twMusicEngineFrame=null,twMusicEngineReady=false,twMusicEngineState={state:-1,now:0,duration:0};
let twMusicEngineWaiters=[];
function ensureTwMusicEngine(){
  if(twMusicEngineFrame&&document.body.contains(twMusicEngineFrame))return twMusicEngineFrame;
  const f=document.createElement('iframe');
  f.id='twMusicEngine';f.title='Smart Music isolated engine';f.src=TW_MUSIC_ENGINE_URL;
  f.setAttribute('allow','autoplay; encrypted-media; picture-in-picture');
  f.setAttribute('aria-hidden','true');
  f.style.cssText='position:fixed;left:-1200px;top:-1200px;width:320px;height:180px;border:0;opacity:.001;pointer-events:none;z-index:-1;background:#000;contain:strict;isolation:isolate;';
  document.body.appendChild(f);twMusicEngineFrame=f;twMusicEngineReady=false;twMusicEngineState={state:-1,now:0,duration:0};
  return f;
}
function postTwMusic(cmd,data={}){const f=ensureTwMusicEngine();try{f.contentWindow?.postMessage({source:'tw-music-main-v110',cmd,...data},'*')}catch{}}
function syncTwMusicEngineVisibility(){
  const f=ensureTwMusicEngine(),shell=document.querySelector('.music-shell'),show=!!(shell?.classList.contains('music-maximized')&&shell.classList.contains('music-video-open'));
  if(show){f.classList.add('music-engine-visible');f.removeAttribute('aria-hidden');}
  else{f.classList.remove('music-engine-visible');f.setAttribute('aria-hidden','true');}
}
window.addEventListener('message',e=>{
  const d=e.data;if(!d||d.source!=='tw-music-engine-v110')return;
  if(d.type==='boot'||d.type==='ready'){
    twMusicEngineReady=true;const q=twMusicEngineWaiters.splice(0);q.forEach(fn=>{try{fn()}catch{}});return;
  }
  if(d.type==='time'){
    twMusicEngineState.now=Number(d.now)||0;twMusicEngineState.duration=Number(d.duration)||0;twMusicEngineState.state=Number.isFinite(Number(d.state))?Number(d.state):-1;updateMiniSeek();return;
  }
  if(d.type==='state'){
    const st=Number(d.state);twMusicEngineState.state=st;
    if(st===1){music.fallbackAttempts=0;music.wantsPlayback=true;if(!music.playingSince)music.playingSince=Date.now();setMusicPlaying(true)}
    else if(st===2){if(music.userPaused||!music.wantsPlayback)setMusicPlaying(false)}
    else if(st===0){if(Date.now()<(music.suppressEndedUntil||0))return;if(music.current)mev('complete',music.current);if(music.autoNext&&!music.userPaused){music.wantsPlayback=true;setMusicPlaying(true);mnext('auto')}else{music.wantsPlayback=false;setMusicPlaying(false)}}
    return;
  }
  if(d.type==='error'){console.warn('Isolated music engine error',d.code||0)}
});
function makeTwMusicProxy(){
  return {
    loadVideoById(v){const o=typeof v==='string'?{videoId:v,startSeconds:0}:v||{};postTwMusic('load',{videoId:o.videoId||'',startSeconds:o.startSeconds||0});},
    playVideo(){postTwMusic('play')},pauseVideo(){postTwMusic('pause')},stopVideo(){postTwMusic('stop')},seekTo(seconds){postTwMusic('seek',{seconds:Number(seconds)||0})},
    getCurrentTime(){return twMusicEngineState.now||0},getDuration(){return twMusicEngineState.duration||0},getPlayerState(){return twMusicEngineState.state},destroy(){postTwMusic('stop')}
  };
}
if(!window.YT)window.YT={};if(!YT.PlayerState)YT.PlayerState={UNSTARTED:-1,ENDED:0,PLAYING:1,PAUSED:2,BUFFERING:3,CUED:5};
'''
    js=js.replace(anchor,bridge+anchor,1)

    # 3) Replace setupYoutubePlayer completely: no YouTube iframe/API in map document.
    start=js.find('async function setupYoutubePlayer(')
    end=js.find("setInterval(()=>{if(music.anonymousYoutube",start)
    if start<0 or end<0:
        raise SystemExit('setupYoutubePlayer block missing')
    setup=r'''async function setupYoutubePlayer(yt,anonymous=music.anonymousYoutube){
  try{
    ensureTwMusicEngine();music.anonymousYoutube=true;music.ytPlayer=makeTwMusicProxy();syncTwMusicEngineVisibility();
    const load=()=>{music.ytPlayer.loadVideoById({videoId:yt,startSeconds:0});syncMediaSession();installTeslaMediaSession();};
    if(twMusicEngineReady)load();else twMusicEngineWaiters.push(load);
  }catch(e){console.warn('Isolated music engine setup failed',e?.message||e);music.ytPlayer=null;setMusicPlaying(false)}
}
'''
    js=js[:start]+setup+js[end:]

    # 4) Existing interval may still use YT constants; proxy supports it. Make it harmless/no fallback UI churn.
    old="setInterval(()=>{if(music.anonymousYoutube||music.userPaused||!music.wantsPlayback||!music.ytPlayer)return;try{const st=music.ytPlayer.getPlayerState?.();if(st!==YT.PlayerState.PLAYING&&st!==YT.PlayerState.BUFFERING)setYoutubeFallbackStatus('YouTube čaká · ak nehrá, použi S reklamami',true)}catch{}},2600);/* MUSIC_FREE_FALLBACK_NONDESTRUCTIVE_V99 */"
    if old in js:
        js=js.replace(old,"setInterval(()=>{if(music.userPaused||!music.wantsPlayback||!music.ytPlayer)return;try{music.ytPlayer.getPlayerState?.()}catch{}},4000);/* MUSIC_ISOLATED_WATCHDOG_V110 */",1)

    # 5) Never destroy/recreate the engine during free-mode switch. Just reload isolated engine.
    s=js.find('async function switchYoutubeToFree(')
    e=js.find('function noteYoutubeBlockedState',s)
    if s>=0 and e>s:
        js=js[:s]+"async function switchYoutubeToFree(yt,manual=false){if(!yt)return;music.anonymousYoutube=true;ensureTwMusicEngine();if(!music.ytPlayer)music.ytPlayer=makeTwMusicProxy();music.ytPlayer.loadVideoById({videoId:yt,startSeconds:0});setYoutubeFallbackStatus('Izolované YouTube prehrávanie',true)}\n"+js[e:]

    # 6) Keep isolated frame off-map during minimize / show it only when explicitly opening Video.
    js=js.replace("const open=sh.classList.toggle('music-video-open');size.textContent=open?'Skryť video':'Video';ensureMaxMusicHeaderSearch()",
                  "const open=sh.classList.toggle('music-video-open');size.textContent=open?'Skryť video':'Video';syncTwMusicEngineVisibility();ensureMaxMusicHeaderSearch()",1)
    js=js.replace("if(!isMax)shell.classList.remove('music-video-open');if(isMax){ensureMaxMusicHeaderSearch();",
                  "if(!isMax)shell.classList.remove('music-video-open');syncTwMusicEngineVisibility();if(isMax){ensureMaxMusicHeaderSearch();",1)

    # 7) When player markup is rebuilt, local yt host remains only a zero-size compatibility placeholder.
    js=js.replace("const media=yt?`<div id=\"ytPlayerHost\" class=\"yt-player\"></div>`:'<audio controls></audio>';",
                  "const media=yt?`<div id=\"ytPlayerHost\" class=\"yt-player yt-player-isolated-placeholder\"></div>`:'<audio controls></audio>';",1)

    js+='\n/* MUSIC_ISOLATED_ENGINE_V110 */\n'

if '/* MUSIC_ISOLATED_ENGINE_UI_V110 */' not in css:
    css += r'''

/* MUSIC_ISOLATED_ENGINE_UI_V110 */
#ytPlayerHost.yt-player-isolated-placeholder{display:none!important;width:0!important;height:0!important;min-height:0!important;max-height:0!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden!important}
#twMusicEngine{contain:strict!important;isolation:isolate!important;backface-visibility:hidden!important;-webkit-backface-visibility:hidden!important}
#twMusicEngine.music-engine-visible{position:fixed!important;left:20px!important;top:76px!important;width:calc(100vw - 40px)!important;height:auto!important;aspect-ratio:16/9!important;opacity:1!important;pointer-events:auto!important;z-index:7005!important;border:0!important;border-radius:14px!important;background:#000!important}
@media(max-width:900px){#twMusicEngine.music-engine-visible{left:8px!important;top:64px!important;width:calc(100vw - 16px)!important}}
/* Explicit compositor separation: music engine is its own browsing context; map is never transformed/reparented by music. */
#map,.mapwrap{transform:none!important;filter:none!important;will-change:auto!important}
'''

jsp.write_text(js,encoding='utf-8')
cssp.write_text(css,encoding='utf-8')
print('v110 isolated engine patch applied')
