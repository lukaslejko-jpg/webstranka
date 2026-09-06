from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* MUSIC_QUALITY_FILTER_V52 */'
if marker in s:
    print('MUSIC_QUALITY_FILTER_V52 already applied')
    raise SystemExit(0)

old="function isYoutubePreference(t){return !!(t?.youtubeId||String(t?.id||'').startsWith('youtube:')||String(t?.source||'').toLowerCase().includes('youtube'))}\nfunction musicItems(){let a=Object.values(music.profile.tracks).filter(x=>!x.disliked);"
new="""function isYoutubePreference(t){return !!(t?.youtubeId||String(t?.id||'').startsWith('youtube:')||String(t?.source||'').toLowerCase().includes('youtube'))}
const MUSIC_MIN_SECONDS=60;
function declaredMusicDuration(t){for(const k of ['durationSeconds','durationSec','duration','lengthSeconds','lengthSec']){const n=Number(t?.[k]);if(Number.isFinite(n)&&n>=0)return n}return 0}
function looksLikeNonSong(t){const text=norm(`${t?.title||''} ${t?.artist||''} ${t?.source||''}`),src=norm(t?.source||'');if(!text)return true;const badSource=/(internet archive|terraspaces|audio vault|ched|missing in alaska)/.test(src);const badText=/(podcast|episode|epizoda|interview|rozhovor|community loop|finance q a|q a|campaign|afternoons|audio vault|remembered it better|croat letter)/.test(text);return badSource||badText}
function isEligibleMusic(t){if(!t||t.invalidMedia||t.disliked)return false;if(looksLikeNonSong(t))return false;const d=declaredMusicDuration(t);if(d>0&&d<MUSIC_MIN_SECONDS)return false;return true}
function invalidateCurrentMedia(reason,duration=0){if(!music.current)return false;const st=mt(music.current);if(st.invalidMedia)return false;st.invalidMedia=true;st.invalidReason=reason||'invalid';if(duration>0)st.durationSeconds=Math.round(duration);save(LS.music,music.profile);music.queue=(music.queue||[]).filter(x=>mt(x).id!==st.id&&isEligibleMusic(x));save(LS.queue,music.queue);renderMusicStatus();renderMusicList();return true}
function sanitizeMusicProfile(){let changed=false;for(const t of Object.values(music.profile.tracks||{})){if(!t.invalidMedia&&(looksLikeNonSong(t)||(declaredMusicDuration(t)>0&&declaredMusicDuration(t)<MUSIC_MIN_SECONDS))){t.invalidMedia=true;t.invalidReason=looksLikeNonSong(t)?'non-song':'short';changed=true}}if(changed)save(LS.music,music.profile);music.queue=(music.queue||[]).filter(isEligibleMusic);save(LS.queue,music.queue)}
sanitizeMusicProfile();
function musicItems(){let a=Object.values(music.profile.tracks).filter(isEligibleMusic);"""
if old not in s: raise SystemExit('musicItems anchor missing')
s=s.replace(old,new,1)

old="function renderMusicStatus(){const n=Object.keys(music.profile.tracks).length,y=music.profile.youtube;"
new="function renderMusicStatus(){const n=Object.values(music.profile.tracks).filter(isEligibleMusic).length,y=music.profile.youtube;"
if old not in s: raise SystemExit('status anchor missing')
s=s.replace(old,new,1)

old="const items=Object.values(music.profile.tracks).filter(x=>!x.disliked).sort((x,y)=>(y.score+(isYoutubePreference(y)?3:0))-(x.score+(isYoutubePreference(x)?3:0)));"
new="const items=Object.values(music.profile.tracks).filter(isEligibleMusic).sort((x,y)=>(y.score+(isYoutubePreference(y)?3:0))-(x.score+(isYoutubePreference(x)?3:0)));"
if old not in s: raise SystemExit('queue anchor missing')
s=s.replace(old,new,1)

old="resolved=freeResult.status==='fulfilled'?freeResult.value.filter(t=>t.streamUrl):[]"
new="resolved=freeResult.status==='fulfilled'?freeResult.value.filter(t=>t.streamUrl&&isEligibleMusic(t)):[]"
if old not in s: raise SystemExit('search resolved anchor missing')
s=s.replace(old,new,1)

old="let free=[];try{free=(await resolveMusic(q)).filter(x=>x.streamUrl)}catch{}"
new="let free=[];try{free=(await resolveMusic(q)).filter(x=>x.streamUrl&&isEligibleMusic(x))}catch{}"
if old not in s: raise SystemExit('musicSources anchor missing')
s=s.replace(old,new,1)

# HTML audio: reject short/invalid tracks once metadata is known.
old="function wireAudio(){if(!music.audio)return;music.audio.onended="
new="function wireAudio(){if(!music.audio)return;music.audio.onloadedmetadata=()=>{const d=Number(music.audio?.duration||0);if((Number.isFinite(d)&&d>0&&d<MUSIC_MIN_SECONDS)||(!Number.isFinite(d)&&d!==0)){if(invalidateCurrentMedia('short-or-invalid-audio',d)){try{music.audio.pause()}catch{};setTimeout(()=>mnext('auto'),0);return}}if(music.current&&d>0){mt(music.current).durationSeconds=Math.round(d);save(LS.music,music.profile)}};music.audio.onended="
if old not in s: raise SystemExit('wireAudio anchor missing')
s=s.replace(old,new,1)

# YouTube: validate duration after PLAYING, but only when the API has a real positive duration.
old="if(e.data===YT.PlayerState.PLAYING){music.fallbackAttempts=0;music.wantsPlayback=true;if(!music.playingSince)music.playingSince=Date.now();setMusicPlaying(true);if(music.manualNavPending)"
new="if(e.data===YT.PlayerState.PLAYING){music.fallbackAttempts=0;music.wantsPlayback=true;if(!music.playingSince)music.playingSince=Date.now();setMusicPlaying(true);setTimeout(()=>{try{const d=Number(e.target?.getDuration?.()||0);if(d>0&&d<MUSIC_MIN_SECONDS){if(invalidateCurrentMedia('short-youtube',d)){try{e.target.pauseVideo?.()}catch{};mnext('auto');return}}if(d>0&&music.current){const st=mt(music.current);st.durationSeconds=Math.round(d);save(LS.music,music.profile)}}catch{}},650);if(music.manualNavPending)"
if old not in s: raise SystemExit('YT PLAYING anchor missing')
s=s.replace(old,new,1)

s+='\n'+marker+'\n'
p.write_text(s,encoding='utf-8')
print('Applied MUSIC_QUALITY_FILTER_V52')
