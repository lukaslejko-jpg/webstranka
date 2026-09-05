from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* MUSIC_GAPLESS_HANDOFF_V16 */'
if marker in s:
    raise SystemExit(0)

# Extend music state with handoff guard/timer state.
old="autoNext:load('teslaWaze:musicAutoNext:v1',true),userPaused:false,wantsPlayback:false,resumeTimer:null,anonymousYoutube:false,fallbackAttempts:0,fallbackTimer:null};"
new="autoNext:load('teslaWaze:musicAutoNext:v1',true),userPaused:false,wantsPlayback:false,resumeTimer:null,anonymousYoutube:false,fallbackAttempts:0,fallbackTimer:null,gaplessBusy:false,gaplessTimer:null};"
if old not in s: raise SystemExit('music state anchor missing')
s=s.replace(old,new,1)

# Replace queue navigation with same-player YouTube handoff helpers.
old2="function mnext(){const q=ensureMusicQueue();if(!q.length)return;let n;if(music.shuffle&&q.length>1){const cur=music.current?mt(music.current).id:'';const candidates=q.filter(x=>mt(x).id!==cur);n=candidates[Math.floor(Math.random()*candidates.length)]}else{const i=q.findIndex(x=>music.current&&mt(x).id===mt(music.current).id);n=q[(i+1+q.length)%q.length]}if(n)mplay(n)}function mprev(){const q=ensureMusicQueue();if(!q.length)return;const i=q.findIndex(x=>music.current&&mt(x).id===mt(music.current).id),p=q[(i-1+q.length)%q.length];if(p)mplay(p)}"
new2="function youtubeIdForTrack(t){if(!t)return'';const st=mt(t);return t.youtubeId||st.youtubeId||(String(t.id||'').startsWith('youtube:')?String(t.id).slice(8):'')}\nfunction nextMusicTrack(){const q=ensureMusicQueue();if(!q.length)return null;if(music.shuffle&&q.length>1){const cur=music.current?mt(music.current).id:'';const candidates=q.filter(x=>mt(x).id!==cur);return candidates[Math.floor(Math.random()*candidates.length)]||null}const i=q.findIndex(x=>music.current&&mt(x).id===mt(music.current).id);return q[(i+1+q.length)%q.length]||null}\nfunction prevMusicTrack(){const q=ensureMusicQueue();if(!q.length)return null;const i=q.findIndex(x=>music.current&&mt(x).id===mt(music.current).id);return q[(i-1+q.length)%q.length]||null}\nfunction refreshCurrentMusicUi(){const r=$('musicPlayer'),t=music.current;if(!r||!t)return;const st=mt(t),art=r.querySelector('.music-now .music-art'),title=r.querySelector('.music-now .music-title'),sub=r.querySelector('.music-now .music-sub');if(art)art.src=t.artwork||st.artwork||'';if(title)title.textContent=t.title||st.title||'Bez názvu';if(sub)sub.textContent=`${t.artist||st.artist||''} · ${t.source||st.source||''}`;const like=r.querySelector('[data-ma=like]');if(like)like.classList.toggle('primary',!!st.liked);wireMiniQueue(r.querySelector('.music-mini-queue'),ensureMusicQueue(),st.id);syncMediaSession();setTimeout(updateMiniSeek,80)}\nfunction handoffYoutubeTrack(next,reason='next'){if(!next||music.gaplessBusy||!music.ytPlayer)return false;const id=youtubeIdForTrack(next);if(!id)return false;const currentId=currentYoutubeId();if(!currentId)return false;music.gaplessBusy=true;const prev=music.current;music.current=next;music.userPaused=false;music.wantsPlayback=true;music.started=Date.now();if(prev)mev(reason==='auto'?'complete':'skip',prev);mev('play',next);refreshCurrentMusicUi();try{music.ytPlayer.loadVideoById(id,0,'default');setMusicPlaying(true);setTimeout(()=>{music.gaplessBusy=false},900);return true}catch{music.gaplessBusy=false;music.current=prev;return false}}\nfunction mnext(reason='next'){const n=nextMusicTrack();if(!n)return;if(handoffYoutubeTrack(n,reason))return;mplay(n)}function mprev(){const p=prevMusicTrack();if(!p)return;if(handoffYoutubeTrack(p,'prev'))return;mplay(p)}"
if old2 not in s: raise SystemExit('mnext anchor missing')
s=s.replace(old2,new2,1)

# On PLAYING clear gapless guard; on ENDED prefer same-player handoff and don't briefly mark paused first.
old3="if(e.data===YT.PlayerState.PLAYING){music.fallbackAttempts=0;setMusicPlaying(true)}else if(e.data===YT.PlayerState.PAUSED||e.data===YT.PlayerState.CUED||e.data===YT.PlayerState.UNSTARTED){setMusicPlaying(false);scheduleMusicResume();noteYoutubeBlockedState(yt)}else if(e.data===YT.PlayerState.ENDED){music.wantsPlayback=false;setMusicPlaying(false);if(music.current)mev('complete',music.current);if(music.autoNext)mnext()}"
new3="if(e.data===YT.PlayerState.PLAYING){music.gaplessBusy=false;music.fallbackAttempts=0;setMusicPlaying(true)}else if(e.data===YT.PlayerState.PAUSED||e.data===YT.PlayerState.CUED||e.data===YT.PlayerState.UNSTARTED){if(!music.gaplessBusy){setMusicPlaying(false);scheduleMusicResume();noteYoutubeBlockedState(currentYoutubeId()||yt)}}else if(e.data===YT.PlayerState.ENDED){if(music.autoNext&&mnext('auto'))return;music.wantsPlayback=false;setMusicPlaying(false);if(music.current)mev('complete',music.current)}"
if old3 not in s: raise SystemExit('YT state anchor missing')
s=s.replace(old3,new3,1)

# Start a lightweight near-end monitor. It advances before ENDED so Tesla never sees a silent browser handoff.
anchor="setInterval(()=>{if(music.anonymousYoutube||music.userPaused||!music.wantsPlayback||!music.ytPlayer)return;try{const st=music.ytPlayer.getPlayerState?.();if(st!==YT.PlayerState.PLAYING&&st!==YT.PlayerState.BUFFERING)noteYoutubeBlockedState(currentYoutubeId())}catch{}},2600);/* MUSIC_FREE_FALLBACK_V15 */"
insert="setInterval(()=>{if(!music.autoNext||music.userPaused||!music.wantsPlayback||music.gaplessBusy||!music.ytPlayer)return;try{const st=music.ytPlayer.getPlayerState?.(),d=Number(music.ytPlayer.getDuration?.()||0),t=Number(music.ytPlayer.getCurrentTime?.()||0);if(st===YT.PlayerState.PLAYING&&d>2&&d-t>0&&d-t<=0.38){const n=nextMusicTrack();if(n)handoffYoutubeTrack(n,'auto')}}catch{}},120);\n"
if anchor not in s: raise SystemExit('fallback interval anchor missing')
s=s.replace(anchor,anchor.replace('/* MUSIC_FREE_FALLBACK_V15 */','')+insert+marker+'/* MUSIC_FREE_FALLBACK_V15 */',1)

p.write_text(s,encoding='utf-8')
