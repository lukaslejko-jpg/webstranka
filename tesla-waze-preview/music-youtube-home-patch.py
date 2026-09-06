from pathlib import Path

js_path=Path('tesla-waze-preview/app.js')
css_path=Path('tesla-waze-preview/app.css')
js=js_path.read_text(encoding='utf-8')
css=css_path.read_text(encoding='utf-8')
marker='/* MUSIC_YOUTUBE_HOME_V54 */'

if marker in js and marker in css:
    print('MUSIC_YOUTUBE_HOME_V54 already applied')
    raise SystemExit(0)

# 1) Refresh the maximized home view whenever window mode changes.
old_apply="const s=$('musicSize');if(s)s.textContent=isMax?'Pôvodný rozmer':'Maximalizovať'}/* MUSIC_MINI_RESIZE_V4 */"
new_apply="const s=$('musicSize');if(s)s.textContent=isMax?'Pôvodný rozmer':'Maximalizovať';if(isMax)renderMusicMaxHome()}/* MUSIC_MINI_RESIZE_V4 */"
if old_apply not in js:
    raise SystemExit('applyMusicWindow anchor missing')
js=js.replace(old_apply,new_apply,1)

# 2) Add YouTube-like maximized home sections after the existing grouped renderer.
anchor="function renderMusicGroups(groups,node){const all=groups.flatMap(g=>g.items),byId=new Map(all.map(t=>[mt(t).id,t]));node.innerHTML=groups.filter(g=>g.items.length).map(g=>`<div class=\"music-group-title\">${esc(g.title)} <span>${g.items.length}</span></div>${g.items.map(musicCard).join('')}`).join('')||'<div class=\"music-empty\">Nenašli sa žiadne výsledky. Skontrolujte pripojenie YouTube alebo skúste iný názov.</div>';const open=t=>{if(!t)return;canPlayInApp(t)?mplay(t):musicSources(t)};node.querySelectorAll('[data-mplay]').forEach(b=>b.onclick=e=>{e.stopPropagation();open(byId.get(b.dataset.mplay))});node.querySelectorAll('[data-mrow]').forEach(r=>r.onclick=()=>open(byId.get(r.dataset.mrow)))}"
if anchor not in js:
    raise SystemExit('renderMusicGroups anchor missing')
addition=r'''

/* MUSIC_YOUTUBE_HOME_V54 */
function musicHomeLargeCard(t){
  const s=mt(t),art=t.artwork||s.artwork||'';
  return `<button type="button" class="music-home-cover" data-home-play="${esc(s.id)}"><span class="music-home-cover-art">${art?`<img src="${esc(art)}" onerror="this.style.visibility='hidden'">`:''}<i class="music-home-play">▶</i></span><b>${esc(t.title||s.title||'Bez názvu')}</b><small>${esc(t.artist||s.artist||'')}</small></button>`;
}
function musicHomeListCard(t){
  const s=mt(t),art=t.artwork||s.artwork||'';
  return `<button type="button" class="music-home-row" data-home-play="${esc(s.id)}">${art?`<img src="${esc(art)}" onerror="this.style.visibility='hidden'">`:'<span class="music-home-row-empty">♫</span>'}<span><b>${esc(t.title||s.title||'Bez názvu')}</b><small>${esc(t.artist||s.artist||'')}</small></span><i>▶</i></button>`;
}
function renderMusicMaxHome(){
  const shell=document.querySelector('.music-shell');
  if(!shell?.classList.contains('music-maximized'))return;
  const body=shell.querySelector('.music-body');if(!body)return;
  let home=body.querySelector('#musicMaxHome');
  if(!home){home=document.createElement('div');home.id='musicMaxHome';home.className='music-max-home';body.prepend(home)}
  const all=Object.values(music.profile.tracks).filter(isEligibleMusic);
  const quick=[...all].sort((a,b)=>((b.score||0)+(b.plays||0)*.7+(b.completed||0)*.6+(b.liked?4:0))-((a.score||0)+(a.plays||0)*.7+(a.completed||0)*.6+(a.liked?4:0))).slice(0,7);
  const liked=[...all].filter(x=>x.liked).sort((a,b)=>(b.score||0)-(a.score||0)).slice(0,12);
  const recent=[...all].filter(x=>x.lastPlayed).sort((a,b)=>Date.parse(b.lastPlayed||0)-Date.parse(a.lastPlayed||0)).slice(0,12);
  const fallback=[...all].sort((a,b)=>(b.score||0)-(a.score||0));
  const fav=liked.length?liked:fallback.slice(0,9);
  const rec=recent.length?recent:fallback.slice(0,9);
  const section=(title,items,kind)=>items.length?`<section class="music-home-section music-home-${kind}"><header><h3>${esc(title)}</h3><span>${items.length}</span></header><div class="${kind==='quick'?'music-home-covers':'music-home-rows'}">${items.map(kind==='quick'?musicHomeLargeCard:musicHomeListCard).join('')}</div></section>`:'';
  home.innerHTML=`${section('Rýchly výber',quick,'quick')}${section('Obľúbené',fav,'favorites')}${section('Naposledy prehrané',rec,'recent')}`;
  const byId=new Map(all.map(t=>[mt(t).id,t]));
  home.querySelectorAll('[data-home-play]').forEach(b=>b.onclick=()=>{const t=byId.get(b.dataset.homePlay);if(t)mplay(t)});
}
'''
js=js.replace(anchor,anchor+addition,1)

# 3) Keep dashboard fresh when normal library is refreshed (likes, sync, current track changes).
old_list="function renderMusicList(a=musicItems(),node=$('musicList')){node.innerHTML=a.length?a.map(musicCard).join(''):'<div class=\"music-empty\">Zatiaľ nič. Synchronizuj YouTube alebo vyhľadaj video či skladbu.</div>';const open=t=>{if(!t)return;canPlayInApp(t)?mplay(t):musicSources(t)};node.querySelectorAll('[data-mplay]').forEach(b=>b.onclick=e=>{e.stopPropagation();open(a.find(x=>mt(x).id===b.dataset.mplay))});node.querySelectorAll('[data-mrow]').forEach(r=>r.onclick=()=>open(a.find(x=>mt(x).id===r.dataset.mrow)))}"
new_list=old_list[:-1]+";if(document.querySelector('.music-shell')?.classList.contains('music-maximized'))renderMusicMaxHome()}"
if old_list not in js:
    raise SystemExit('renderMusicList anchor missing')
js=js.replace(old_list,new_list,1)

# CSS: supersede V53 with a home/dashboard layout. Keep live player in a slim bottom bar.
if marker not in css:
    css += r'''

/* MUSIC_YOUTUBE_HOME_V54 */
@media (min-width:901px){
  .music-shell.music-maximized{
    display:grid!important;
    grid-template-columns:1fr!important;
    grid-template-rows:auto minmax(0,1fr) auto!important;
    width:calc(100vw - 20px)!important;
    height:calc(100vh - 20px)!important;
    max-width:calc(100vw - 20px)!important;
    max-height:calc(100vh - 20px)!important;
    overflow:hidden!important;
  }
  .music-shell.music-maximized>.music-head{grid-column:1!important;grid-row:1!important}
  .music-shell.music-maximized>.music-body{
    grid-column:1!important;grid-row:2!important;
    min-width:0!important;min-height:0!important;
    overflow-y:auto!important;
    padding:16px 20px 18px!important;
    display:block!important;
  }
  .music-shell.music-maximized>.music-body>.music-card,
  .music-shell.music-maximized>.music-body>.music-tabs,
  .music-shell.music-maximized>.music-body>#musicList,
  .music-shell.music-maximized>.music-body>#musicSources{display:none!important}
  .music-shell.music-maximized #musicMaxHome{display:block!important}

  .music-max-home{max-width:1280px;margin:0 auto;padding:0 2px 12px}
  .music-home-section{margin:0 0 24px}
  .music-home-section>header{display:flex;align-items:center;gap:10px;margin:0 0 10px}
  .music-home-section>header h3{font-size:22px;line-height:1.15;margin:0;color:#f4f8fa;font-weight:850}
  .music-home-section>header span{font-size:11px;color:#8da3b0;border:1px solid rgba(148,184,201,.22);border-radius:999px;padding:3px 7px}

  .music-home-covers{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:12px}
  .music-home-cover{border:0;background:transparent;color:#eef7fa;text-align:left;min-width:0;padding:0;cursor:pointer}
  .music-home-cover-art{display:block;position:relative;width:100%;aspect-ratio:1/1;border-radius:10px;overflow:hidden;background:#17242e;border:1px solid rgba(148,184,201,.18);box-shadow:0 5px 18px rgba(0,0,0,.18)}
  .music-home-cover-art img{width:100%;height:100%;object-fit:cover;display:block}
  .music-home-cover .music-home-play{position:absolute;right:8px;bottom:8px;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-style:normal;background:#15bbb6;color:#041c1c;opacity:0;transform:translateY(5px);transition:.15s}
  .music-home-cover:hover .music-home-play{opacity:1;transform:none}
  .music-home-cover>b{display:block;margin-top:7px;font-size:14px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .music-home-cover>small{display:block;margin-top:2px;font-size:11px;color:#93a7b3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

  .music-home-rows{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px 14px}
  .music-home-row{display:grid;grid-template-columns:48px minmax(0,1fr) 28px;align-items:center;gap:9px;min-width:0;min-height:58px;border:0;border-bottom:1px solid rgba(148,184,201,.12);background:transparent;color:#eef7fa;text-align:left;padding:5px 2px;cursor:pointer}
  .music-home-row:hover{background:rgba(35,53,66,.36);border-radius:8px}
  .music-home-row img,.music-home-row-empty{width:48px;height:48px;border-radius:7px;object-fit:cover;background:#1b2b36;display:flex;align-items:center;justify-content:center;color:#65ded9}
  .music-home-row>span{min-width:0}
  .music-home-row b{display:block;font-size:13px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .music-home-row small{display:block;font-size:11px;color:#93a7b3;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .music-home-row>i{font-style:normal;color:#52d7d2;text-align:center;font-size:14px}

  .music-shell.music-maximized>.music-player{
    grid-column:1!important;grid-row:3!important;
    min-width:0!important;height:82px!important;min-height:82px!important;max-height:82px!important;
    overflow:hidden!important;border-top:1px solid rgba(148,184,201,.18)!important;border-right:0!important;
    padding:8px 14px!important;background:rgba(7,14,20,.97)!important;
    display:grid!important;grid-template-columns:minmax(240px,1fr) minmax(500px,1.4fr)!important;align-items:center!important;gap:14px!important;
  }
  .music-shell.music-maximized .music-player .music-mini-search,
  .music-shell.music-maximized .music-player .music-mini-panel,
  .music-shell.music-maximized .music-player .music-free-row{display:none!important}
  .music-shell.music-maximized .music-player .yt-player,
  .music-shell.music-maximized .music-player audio{
    position:absolute!important;left:-2px!important;bottom:-2px!important;width:1px!important;height:1px!important;min-width:1px!important;min-height:1px!important;max-width:1px!important;max-height:1px!important;opacity:.01!important;pointer-events:none!important;overflow:hidden!important;margin:0!important;
  }
  .music-shell.music-maximized .music-player .music-now{display:flex!important;min-width:0!important;gap:10px!important;align-items:center!important;order:initial!important;padding:0!important}
  .music-shell.music-maximized .music-player .music-now .music-art{width:54px!important;height:54px!important;border-radius:7px!important}
  .music-shell.music-maximized .music-player .music-title{font-size:15px!important;line-height:1.15!important}
  .music-shell.music-maximized .music-player .music-sub{font-size:11px!important}
  .music-shell.music-maximized .music-player .music-controls{display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:6px!important;margin:0!important;order:initial!important}
  .music-shell.music-maximized .music-player .music-controls .btn{min-height:44px!important;height:44px!important;font-size:12px!important;padding:0 6px!important}
}
@media (min-width:901px) and (max-width:1180px){
  .music-home-covers{grid-template-columns:repeat(5,minmax(0,1fr))}
  .music-home-rows{grid-template-columns:repeat(2,minmax(0,1fr))}
}
'''

js += '\n' + marker + '\n' if marker not in js else ''
js_path.write_text(js,encoding='utf-8')
css_path.write_text(css,encoding='utf-8')
print('Applied MUSIC_YOUTUBE_HOME_V54')
