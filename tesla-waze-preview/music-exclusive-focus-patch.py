from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* MUSIC_REAL_EARLY_HANDOFF_V32 */'
if marker in s:
    raise SystemExit(0)

# The helper bridge is not sufficient on Tesla; start the REAL next YouTube track
# before the current one reaches silence so FM never gets an audio-focus gap.
old="if(!music.gaplessBusy&&st===YT.PlayerState.PLAYING&&d>2&&left>0&&left<=0.38){const n=nextMusicTrack();if(n)handoffYoutubeTrack(n,'auto')}"
new="if(!music.gaplessBusy&&st===YT.PlayerState.PLAYING&&d>2&&left>0&&left<=1.5){const n=nextMusicTrack();if(n)handoffYoutubeTrack(n,'auto')}"
if old not in s:
    raise SystemExit('0.38s real handoff anchor missing')
s=s.replace(old,new,1)

# Keep the 5 s pre-roll helper and 2 s post-roll helper as extra protection.
if "left<=5.0)startMusicKeepalive()" not in s:
    raise SystemExit('5s transition helper missing')
if "},2000)}" not in s:
    raise SystemExit('2s post-roll helper missing')

s += '\n'+marker+'\n'
p.write_text(s,encoding='utf-8')
