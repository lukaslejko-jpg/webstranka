from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* MUSIC_DUAL_PLAYER_HANDOFF_V33 */'
if marker in s:
    raise SystemExit(0)

# Extend music state with a standby YouTube player.
old="gaplessBusy:false,gaplessTimer:null};"
new="gaplessBusy:false,gaplessTimer:null,ytStandby:null,ytStandbyTrack:null,ytStandbyReady:false,ytStandbyStarting:false};"
if old not in s:
    raise SystemExit('music state anchor missing')
s=s.replace(old,new,1)

old_handoff="function handoffYoutubeTrack(next,reason='next'){if(!next||music.gaplessBusy||!music.ytPlayer)return false;const id=youtubeIdForTrack(next);if(!id)return false;const currentId=currentYoutubeId();if(!currentId)return false;music.gaplessBusy=true;startMusicKeepalive();const prev=music.current;music.current=next;music.userPaused=false;music.wantsPlayback=true;music.started=Date.now();if(prev)mev(reason==='auto'?'complete':'skip',prev);mev('play',next);refreshCurrentMusicUi();try{music.ytPlayer.loadVideoById(id,0,'default');setMusicPlaying(true);setTimeout(()=>{music.gaplessBusy=false},900);return true}catch{music.gaplessBusy=false;music.current=prev;return false}}"
new_handoff=r'''function clearYoutubeStandby(){
  try{music.ytStandby?.destroy?.()}catch{}
  music.ytStandby=null;music.ytStandbyTrack=null;music.ytStandbyReady=false;music.ytStandbyStarting=false;
  const h=document.getElementById('ytStandbyHost');if(h)h.remove();
}
async function prepareYoutubeStandby(next){
  if(!next||!music.ytPlayer||music.userPaused||!music.wantsPlayback)return false;
  const id=youtubeIdForTrack(next);if(!id)return false;
  if(music.ytStandby&&music.ytStandbyTrack&&youtubeIdForTrack(music.ytStandbyTrack)===id)return true;
  clearYoutubeStandby();
  try{
    await loadYoutubeApi();
    const h=document.createElement('div');h.id='ytStandbyHost';h.style.cssText='position:fixed;width:1px;height:1px;left:-10000px;top:-10000px;opacity:0;pointer-events:none';document.body.appendChild(h);
    music.ytStandbyTrack=next;
    music.ytStandby=new YT.Player('ytStandbyHost',{host:music.anonymousYoutube?'https://www.youtube-nocookie.com':'https://www.youtube.com',videoId:id,playerVars:{autoplay:0,playsinline:1,rel:0,origin:location.origin},events:{
      onReady:e=>{try{e.target.mute();e.target.cueVideoById(id,0,'default');music.ytStandbyReady=true}catch{}},
      onStateChange:e=>{
        if(e.data!==YT.PlayerState.PLAYING||!music.ytStandbyStarting)return;
        const oldPlayer=music.ytPlayer,prev=music.current,nextTrack=music.ytStandbyTrack,newPlayer=music.ytStandby;
        if(!newPlayer||!nextTrack)return;
        music.gaplessBusy=true;
        try{newPlayer.unMute?.();newPlayer.setVolume?.(100)}catch{}
        try{oldPlayer?.pauseVideo?.()}catch{}
        music.ytPlayer=newPlayer;music.ytStandby=null;music.ytStandbyTrack=null;music.ytStandbyReady=false;music.ytStandbyStarting=false;
        music.current=nextTrack;music.userPaused=false;music.wantsPlayback=true;music.started=Date.now();
        if(prev)mev('complete',prev);mev('play',nextTrack);refreshCurrentMusicUi();setMusicPlaying(true);syncMediaSession();
        try{const main=document.getElementById('ytPlayerHost'),iframe=newPlayer.getIframe?.();if(main&&iframe){main.innerHTML='';main.appendChild(iframe)}}catch{}
        setTimeout(()=>{try{oldPlayer?.destroy?.()}catch{};music.gaplessBusy=false;stopMusicKeepalive();syncMediaSession()},350);
      },
      onError:()=>{clearYoutubeStandby()}
    }});
    return true;
  }catch{clearYoutubeStandby();return false}
}
function handoffYoutubeTrack(next,reason='next'){
  if(!next||music.gaplessBusy||!music.ytPlayer)return false;
  const id=youtubeIdForTrack(next);if(!id)return false;
  if(!music.ytStandby||!music.ytStandbyTrack||youtubeIdForTrack(music.ytStandbyTrack)!==id){prepareYoutubeStandby(next);return false}
  try{music.ytStandbyStarting=true;music.ytStandby.mute?.();music.ytStandby.seekTo?.(0,true);music.ytStandby.playVideo?.();return true}catch{music.ytStandbyStarting=false;return false}
}'''
if old_handoff not in s:
    raise SystemExit('handoff function anchor missing')
s=s.replace(old_handoff,new_handoff,1)

# Replace the end-of-track timer: preload next track at 5 s, start standby at 1.2 s.
old_timer="setInterval(()=>{if(!music.autoNext||music.userPaused||!music.wantsPlayback||!music.ytPlayer)return;try{const st=music.ytPlayer.getPlayerState?.(),d=Number(music.ytPlayer.getDuration?.()||0),t=Number(music.ytPlayer.getCurrentTime?.()||0),left=d-t;if(st===YT.PlayerState.PLAYING&&d>2&&left>0&&left<=5.0)startMusicKeepalive();if(!music.gaplessBusy&&st===YT.PlayerState.PLAYING&&d>2&&left>0&&left<=1.5){const n=nextMusicTrack();if(n)handoffYoutubeTrack(n,'auto')}}catch{}},120);"
new_timer="setInterval(()=>{if(!music.autoNext||music.userPaused||!music.wantsPlayback||!music.ytPlayer)return;try{const st=music.ytPlayer.getPlayerState?.(),d=Number(music.ytPlayer.getDuration?.()||0),t=Number(music.ytPlayer.getCurrentTime?.()||0),left=d-t;if(st!==YT.PlayerState.PLAYING||d<=2||left<=0)return;const n=nextMusicTrack();if(left<=5.0&&n&&!music.ytStandby&&!music.ytStandbyStarting)prepareYoutubeStandby(n);if(left<=1.2&&n&&!music.gaplessBusy&&!music.ytStandbyStarting){if(!handoffYoutubeTrack(n,'auto'))prepareYoutubeStandby(n)}}catch{}},100);"
if old_timer not in s:
    raise SystemExit('early handoff timer anchor missing')
s=s.replace(old_timer,new_timer,1)

# If playback is manually paused, destroy any standby player too.
old_pause="function pauseMusic(){music.userPaused=true;music.wantsPlayback=false;stopMusicKeepalive();"
new_pause="function pauseMusic(){music.userPaused=true;music.wantsPlayback=false;clearYoutubeStandby();stopMusicKeepalive();"
if old_pause not in s:
    raise SystemExit('pause anchor missing')
s=s.replace(old_pause,new_pause,1)

s+='\n'+marker+'\n'
p.write_text(s,encoding='utf-8')
