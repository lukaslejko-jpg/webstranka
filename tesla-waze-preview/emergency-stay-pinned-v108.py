from pathlib import Path
p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* RAWGITHACK_PINNED_STAY_V108 */'
if marker in s:
    print('already applied')
    raise SystemExit(0)
old="""const V98_BRANCH_PATH='/lukaslejko-jpg/webstranka/tesla-waze-preview-v1/tesla-waze-preview/';
if(location.hostname==='raw.githack.com'&&!location.pathname.startsWith(V98_BRANCH_PATH)){
  location.replace('https://raw.githack.com'+V98_BRANCH_PATH+'live3.html'+location.search+location.hash);
  return;
}
"""
new="""const V98_BRANCH_PATH='/lukaslejko-jpg/webstranka/tesla-waze-preview-v1/tesla-waze-preview/';
/* RAWGITHACK_PINNED_STAY_V108 */
// The Vercel shell already loads a pinned, known-good live3.html. Do not redirect
// that iframe to a mutable raw.githack branch URL: Tesla Chromium can strand the
// frame on a grey error page when that navigation fails. Runtime assets still
// come from the production branch through live3.html.
"""
if old not in s:
    raise SystemExit('redirect guard anchor not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
print('Applied RAWGITHACK_PINNED_STAY_V108')
