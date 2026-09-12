const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require('playwright');
const ROOT=process.env.TEST_URL||'https://tesla-waze-piped.vercel.app';
const LIVE=process.env.TEST_LIVE==='1';
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const tracks=[{id:'unfzfe8f9NI',title:'ABBA - Mamma Mia',uploader:'ABBA',duration:210},{id:'xFrGuyw1V8s',title:'ABBA - Dancing Queen',uploader:'ABBA',duration:230},{id:'XEjLoHdbVeE',title:'ABBA - Gimme Gimme',uploader:'ABBA',duration:250}];
const report={release:40,root:ROOT,live:LIVE,at:new Date().toISOString(),checks:[],physicalIphone:false};
function fakeApi(delay){return `
window.__calls=[];
window.YT={PlayerState:{ENDED:0,PLAYING:1,PAUSED:2},Player:function(id,options){
 this.list=[];this.index=0;this.state=-1;this.time=0;this.id='';this.listeners={};
 this.emit=s=>{this.state=s;options.events.onStateChange?.({data:s,target:this});for(const h of this.listeners.onStateChange||[])(typeof h==='string'?window[h]:h)?.({data:s,target:this});};
 this.getPlayerState=()=>this.state;this.getCurrentTime=()=>this.time;this.getDuration=()=>210;
 this.getVideoData=()=>({video_id:this.id});this.getPlaylist=()=>this.list;this.getPlaylistIndex=()=>this.index;
 this.addEventListener=(e,h)=>(this.listeners[e]||(this.listeners[e]=[])).push(h);
 this.loadPlaylist=(list,index,start)=>{window.__calls.push(['playlist',list,index,start]);this.list=list;this.index=index;this.id=list[index];this.time=start;this.emit(1);};
 this.loadVideoById=(id,start=0)=>{window.__calls.push(['single',id,start]);this.list=[];this.id=typeof id==='string'?id:id.videoId;this.time=start;this.emit(1);};
 this.cueVideoById=(id,start=0)=>{window.__calls.push(['cue',id,start]);this.list=[];this.id=id;this.time=start;this.emit(5);};
 this.playVideo=()=>{window.__calls.push(['play']);this.emit(1);};this.pauseVideo=()=>{window.__calls.push(['pause']);this.emit(2);};
 this.seekTo=t=>{this.time=t;window.__calls.push(['seek',t]);};this.setLoop=()=>{};this.setShuffle=()=>{};
 this.nextVideo=()=>{this.index=(this.index+1)%this.list.length;this.id=this.list[this.index];this.emit(1);};
 setTimeout(()=>{options.events.onReady({target:this});for(const h of this.listeners.onReady||[])(typeof h==='string'?window[h]:h)?.({target:this});},${delay});
}};window.onYouTubeIframeAPIReady();`;}
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});
 async function context({mock=true,delay=0,seed=true,mobile=true}={}){
  const c=await browser.newContext({viewport:{width:mobile?390:1280,height:844},userAgent:mobile?IOS:undefined,isMobile:mobile,hasTouch:mobile});
  await c.addInitScript(({tracks,seed})=>{
   window.__actions={};if(navigator.mediaSession){const original=navigator.mediaSession.setActionHandler.bind(navigator.mediaSession);navigator.mediaSession.setActionHandler=(a,h)=>{window.__actions[a]=h;return original(a,h);};}
   if(seed&&!localStorage.getItem('teslaMusic:queue:v1'))localStorage.setItem('teslaMusic:queue:v1',JSON.stringify(tracks));
  },{tracks,seed});
  if(!LIVE)await c.route(ROOT+'/**',async route=>{
    const url=new URL(route.request().url());if(url.pathname.startsWith('/api/'))return route.continue();
    const rel=url.pathname==='/'?'index.html':url.pathname.slice(1);
    try{const body=await fs.readFile(path.join('public',rel));const type=rel.endsWith('.js')?'application/javascript':rel.endsWith('.css')?'text/css':rel.endsWith('.png')?'image/png':rel.endsWith('.html')?'text/html':'application/json';await route.fulfill({body,contentType:type});}catch{await route.continue();}
  });
  if(mock)await c.route('https://www.youtube.com/iframe_api',r=>r.fulfill({body:fakeApi(delay),contentType:'application/javascript'}));
  return c;
 }
 async function pageIn(c,qs=''){
  const p=await c.newPage();p.errors=[];p.old=[];
  p.on('pageerror',e=>p.errors.push(e.message));p.on('request',r=>{if(/supabase\.co\/functions\/v1\/(?:twyoutubesearch|music-search)/.test(r.url()))p.old.push(r.url());});
  await p.goto(ROOT+'/'+qs,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>!!window.teslaMusicPlaybackV40);
  await p.evaluate(()=>{discover=()=>{};});return p;
 }
 try{
  let c=await context(),p=await pageIn(c);await p.waitForFunction(()=>ready);
  assert.equal(await p.evaluate(()=>current),null);
  await p.locator('#bplay').click();
  assert.equal(await p.evaluate(()=>current.id),tracks[0].id);
  assert.equal(await p.evaluate(()=>window.__calls.filter(x=>x[0]==='playlist').length),1);
  await p.locator('#bplay').click();assert.equal(await p.evaluate(()=>player.getPlayerState()),2);
  await p.locator('#bplay').click();assert.equal(await p.evaluate(()=>player.getPlayerState()),1);
  assert.equal(await p.evaluate(()=>window.__calls.filter(x=>x[0]==='playlist').length),1);
  await p.evaluate(()=>window.__actions.nexttrack());assert.equal(await p.evaluate(()=>current.id),tracks[1].id);
  await p.evaluate(()=>window.__actions.previoustrack());assert.equal(await p.evaluate(()=>current.id),tracks[0].id);
  assert.equal(await p.evaluate(()=>window.__actions.seekforward),null);
  // The For You ranking legitimately changes after skips. Fix the source to
  // Poradie so this case specifically tests a native non-last track ending.
  await p.evaluate(()=>{tab='queue';playTrack(queue[0]);});
  assert.equal(await p.evaluate(()=>player.getPlaylistIndex()),0);
  const before=await p.evaluate(()=>window.__calls.length);await p.evaluate(()=>player.emit(0));assert.equal(await p.evaluate(()=>window.__calls.length),before);
  await p.evaluate(()=>player.nextVideo());assert.equal(await p.evaluate(()=>current.id),tracks[1].id);
  await p.reload({waitUntil:'domcontentloaded'});await p.waitForFunction(()=>ready);await p.evaluate(()=>{discover=()=>{};});
  assert.equal(await p.evaluate(()=>current),null);await p.locator('#bplay').click();assert.equal(await p.evaluate(()=>current.id),tracks[1].id);
  await p.evaluate(()=>{player.time=42;document.getElementById('auto').click();});
  assert.equal(await p.evaluate(()=>window.teslaMusicPlaybackV40.state().nativeActive),false);
  const noAuto=await p.evaluate(()=>window.__calls.length);await p.evaluate(()=>player.emit(0));assert.equal(await p.evaluate(()=>window.__calls.length),noAuto);
  assert.equal(p.errors.length,0,p.errors.join(';'));assert.equal(p.old.length,0);report.checks.push('mock: initial Play, pause/resume, next/previous, native advance, persisted last track, AUTO off, zero JS errors');await c.close();
  c=await context({delay:1500});p=await pageIn(c);await p.locator('#bplay').click();assert.ok(await p.evaluate(()=>window.teslaMusicPlaybackV40.state().pending));await p.waitForFunction(()=>current?.id==='unfzfe8f9NI');report.checks.push('mock: early Play waits for player readiness');await c.close();
  c=await context({mobile:false});p=await pageIn(c,'?map=1&embed=1');await p.waitForFunction(()=>ready);await p.evaluate(()=>toggle());assert.equal(await p.evaluate(()=>window.__calls.filter(x=>x[0]==='single').length),1);assert.equal(await p.evaluate(()=>window.teslaMusicPlaybackV40.state().nativeActive),false);report.checks.push('mock: Tesla map/embed retains single-video engine');await c.close();
  c=await context({seed:false});p=await pageIn(c);await p.waitForFunction(()=>ready);await p.locator('#bplay').click();assert.match(await p.locator('#status').textContent(),/vyhľadaj/);report.checks.push('mock: empty profile reports missing selection');await c.close();
  c=await context();p=await pageIn(c);await p.waitForFunction(()=>ready);
  for(const q of ['mama mia','Karel Gott']){
   await p.locator('#q').fill(q);const rp=p.waitForResponse(r=>r.url().includes('/api/youtube-search?')&&new URL(r.url()).searchParams.get('q')===q);await p.locator('#go').click();const response=await rp;assert.equal(response.status(),200);const json=await response.json();assert.ok(json.items.length>=3);await p.waitForFunction(()=>document.getElementById('status').textContent.includes('výsledkov'));
   const titles=await p.locator('#grid .ctitle').allTextContents();assert.ok(titles.some(t=>q==='Karel Gott'?/gott/i.test(t):/mamma|mama/i.test(t)));report.checks.push({search:q,count:titles.length});
  }
  const icon=await p.locator('head link[rel="apple-touch-icon"]').getAttribute('href');assert.equal(icon,'/icons/music-v39-180.png');assert.deepEqual(await p.evaluate(async src=>{const i=new Image();i.src=src;await i.decode();return[i.naturalWidth,i.naturalHeight];},icon),[180,180]);assert.equal(await p.locator('#shuffle svg').count(),1);assert.equal(p.errors.length,0,p.errors.join(';'));assert.equal(p.old.length,0);await p.screenshot({path:'mobile-v40-search.png',fullPage:true});report.checks.push('real API/UI: search, PNG decode, SVG shuffle preserved');await c.close();
  c=await context({mock:false});p=await pageIn(c);await p.waitForFunction(()=>ready,{},{timeout:30000});await p.locator('#bplay').click();
  await p.waitForTimeout(500);
  const yt=p.frames().find(f=>f.url().includes('youtube.com/embed'));assert.ok(yt);
  await yt.waitForFunction(()=>typeof window.__actions.nexttrack==='function'&&typeof window.__actions.previoustrack==='function',{},{timeout:15000});
  const actual=await yt.evaluate(()=>({next:typeof window.__actions.nexttrack,previous:typeof window.__actions.previoustrack,video:!!document.querySelector('video')}));
  assert.equal(actual.next,'function');assert.equal(actual.previous,'function');report.checks.push({realYoutubeIframeActions:actual,notPhysicalLockScreen:true});await c.close();
  await fs.writeFile('verification-v40.json',JSON.stringify(report,null,2));console.log('VERIFIED_V40 '+JSON.stringify(report));
 }finally{await browser.close();}
})().catch(async e=>{console.error(e);report.error=String(e.stack||e);await fs.writeFile('verification-v40.json',JSON.stringify(report,null,2));process.exitCode=1;});
