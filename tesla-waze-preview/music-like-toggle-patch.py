from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* MUSIC_LIKE_TOGGLE_V36 */'
if marker in s:
    raise SystemExit(0)

old="r.querySelector('[data-ma=like]').onclick=()=>{mev('like',music.current);renderMusicList();r.querySelector('[data-ma=like]').classList.toggle('primary',mt(music.current).liked)};"
new="""r.querySelector('[data-ma=like]').onclick=()=>{
  const st=mt(music.current);
  if(st.liked){
    st.liked=false;
    st.score-=5;
    music.profile.events.push({type:'unlike',id:st.id,at:new Date().toISOString()});
    music.profile.events=music.profile.events.slice(-500);
    save(LS.music,music.profile);
    renderMusicStatus();
  }else{
    mev('like',music.current);
  }
  renderMusicList();
  const btn=r.querySelector('[data-ma=like]');
  if(btn)btn.classList.toggle('primary',!!mt(music.current).liked);
};"""
if old not in s:
    raise SystemExit('like button anchor missing')
s=s.replace(old,new,1)

s+='\n'+marker+'\n'
p.write_text(s,encoding='utf-8')
