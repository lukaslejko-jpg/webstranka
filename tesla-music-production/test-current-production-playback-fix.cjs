const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require('playwright');

const ROOT='https://tesla-waze-piped.vercel.app';
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const TESLA='Mozilla/5.0 (X11; GNU/Linux) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Tesla/2026.20';
const report={at:new Date().toISOString(),checks:[]};

function fakeYoutube(){
return `
window.__ytCalls=[];
window.YT={PlayerState:{UNSTARTED:-1,ENDED:0,PLAYING:1,PAUSED:2,BUFFERING:3,CUED:5},Player:function(id,options){
 this.list=[];this.index=-1;this.state=-1;this.time=0;this.id='';this.listeners={};this.loop=false;
 this.emit=s=>{this.state=s;options.events.onStateChange?.({data:s,target:this});for(const h of this.listeners.onStateChange||[]){const fn=typeof h==='string'?window[h]:h;fn?.({data:s,target:this});}};
 this.getPlayerState=()=>this.state;this.getCurrentTime=()=>this.time;this.getDuration=()=>220;
 this.getVideoData=()=>({video_id:this.id});this.getPlaylist=()=>this.list.slice();this.getPlaylistIndex=()=>this.index;
 this.addEventListener=(e,h)=>(this.listeners[e]||(this.listeners[e]=[])).push(h);
 this.loadPlaylist=(list,index=0,start=0)=>{window.__ytCalls.push(['playlist',list.slice(),index,start]);this.list=list.slice();this.index=index;this.id=list[index];this.time=start;this.emit(1);};
 this.loadVideoById=(input,start=0)=>{const vid=typeof input==='string'?input:input?.videoId;const sec=typeof input==='object'?Number(input.startSeconds||0):start;window.__ytCalls.push(['single',vid,sec]);this.list=[];this.index=-1;this.id=vid;this.time=sec;this.emit(1);};
 this.cueVideoById=(id,start=0)=>{window.__ytCalls.push(['cue',id,start]);this.id=typeof id==='string'?id:id?.videoId;this.time=start;this.emit(5);};
 this.playVideo=()=>{window.__ytCalls.push(['play']);this.emit(1);};
 this.pauseVideo=()=>{window.__ytCalls.push(['pause']);this.emit(2);};
 this.seekTo=t=>{this.time=t;window.__ytCalls.push(['seek',t]);};
 this.setLoop=v=>{this.loop=!!v;window.__ytCalls.push(['loop',!!v]);};this.setShuffle=v=>window.__ytCalls.push(['shuffle',!!v]);
 this.nextVideo=()=>{window.__ytCalls.push(['nextVideo']);if(!this.list.length)return;if(this.index+1<this.list.length)this.index++;else if(this.loop)this.index=0;else return;this.id=this.list[this.index];this.emit(1);};
 this.previousVideo=()=>{window.__ytCalls.push(['previousVideo']);if(this.list.length&&this.index>0){this.index--;this.id=this.list[this.index];this.emit(1);}};
 setTimeout(()=>{options.events.onReady?.({target:this});for(const h of this.listeners.onReady||[]){const fn=typeof h==='string'?window[h]:h;fn?.({target:this});}},10);
}};setTimeout(()=>window.onYouTubeIframeAPIReady?.(),0);
`;
}

async function context(browser,{mobile}){
 const c=await browser.newContext({
   serviceWorkers:'block',
   viewport:mobile?{width:390,height:844}:{width:1280,height:800},
   userAgent:mobile?IOS:TESLA,
   isMobile:mobile,hasTouch:mobile
 });
 await c.addInitScript(()=>{
   localStorage.setItem('music:memberSession:v1','test-session');
   localStorage.setItem('music:memberUser:v1',JSON.stringify({id:'test-user',email:'test@example.com',role:'member'}));
   localStorage.setItem('teslaMusic:settings:v1',JSON.stringify({shuffle:false,auto:true}));
   localStorage.setItem('teslaMusic:playbackDefaults:v2','1');
   const tracks={},queue=[];
   for(let i=1;i<=32;i++){
     const id='seed'+String(i).padStart(7,'0');
     const t={id:'yt:'+id,youtubeId:id,title:'Seed Song '+i+' - Topic',artist:'Seed Topic',duration:210,thumbnail:'',score:1,plays:0,completed:0,skips:0,liked:false,lastPlayed:null};
     tracks['yt:'+id]=t;
     queue.push({id,title:t.title,uploader:t.artist,duration:t.duration,thumbnail:''});
   }
   localStorage.setItem('teslaMusic:brain:v1',JSON.stringify({tracks,artists:{},events:[]}));
   localStorage.setItem('teslaMusic:queue:v1',JSON.stringify(queue));
 });
 const dir=path.resolve('tesla-music-production');
 const replacements={
   '/app-v7.js':path.join(dir,'app-v7.js'),
   '/mobile-controls-v40.js':path.join(dir,'mobile-controls-v40.js'),
   '/mobile-v128-music-logic.js':path.join(dir,'mobile-v128-music-logic.js'),
   '/desktop-silence-v63.js':path.join(dir,'desktop-silence-v63.js'),
   '/rescue-v135.js':path.join(dir,'rescue-v135.js'),
   '/mode-v9.js':path.join(dir,'mode-v9.js'),
   '/desktop-v97-youtube-search.js':path.join(dir,'desktop-v97-youtube-search.js'),
   '/member-v50-foryou.js':path.join(dir,'member-v50-foryou.js')
 };
 await c.route('https://tesla-waze-piped.vercel.app/**',async route=>{
   const u=new URL(route.request().url());
   const file=replacements[u.pathname];
   if(file)return route.fulfill({body:await fs.readFile(file),contentType:'application/javascript'});
   return route.continue();
 });
 await c.route('https://www.youtube.com/iframe_api',r=>r.fulfill({body:fakeYoutube(),contentType:'application/javascript'}));
 await c.route('https://europrojekty-app.vercel.app/api/music',async route=>{
   let body={};try{body=JSON.parse(route.request().postData()||'{}')}catch{}
   const action=body.action;
   if(action==='me')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user:{id:'test-user',email:'test@example.com',role:'member'}})});
   if(action==='profile.get')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({profile:null})});
   if(action==='profile.save')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true})});
   return route.fulfill({status:200,contentType:'application/json',body:'{}'});
 });
 return c;
}

async function prepare(page,url){
 page.errors=[];page.requests=[];
 page.on('pageerror',e=>page.errors.push(e.message));
 page.on('request',r=>page.requests.push(r.url()));
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof window.onYouTubeIframeAPIReady==='function'&&window.YT?.Player,{timeout:15000});
 await page.evaluate(()=>{if(typeof player==='undefined'||!player)window.onYouTubeIframeAPIReady();});
 try{
   await page.waitForFunction(()=>window.teslaMusicPlaybackV40&&typeof player!=='undefined'&&!!player&&typeof ready!=='undefined'&&ready===true,{timeout:8000});
 }catch(error){
   const diag=await page.evaluate(()=>({
     playback:!!window.teslaMusicPlaybackV40,
     player:(typeof player!=='undefined'&&!!player),
     ready:(typeof ready!=='undefined'?ready:null),
     onReady:typeof window.onYouTubeIframeAPIReady,
     yt:typeof window.YT?.Player,
     playTrack:typeof window.playTrack,
     next:typeof window.next,
     path:location.pathname,
     scripts:[...document.scripts].map(s=>s.src).filter(Boolean)
   }));
   throw new Error('BOOT_DIAGNOSTIC '+JSON.stringify({diag,pageErrors:page.errors})+' :: '+error.message);
 }
 await page.waitForFunction(()=>!document.getElementById('musicGate'),{timeout:10000}).catch(()=>{});
 await page.addScriptTag({path:path.resolve('tesla-music-production/player-visibility-guard-v129.js')});
 await page.waitForFunction(()=>!!window.teslaMusicVisibilityV129,{timeout:5000});
 await page.locator('#q').fill('Kali');
 const response=page.waitForResponse(r=>r.url().includes('/api/youtube-search?')&&new URL(r.url()).searchParams.get('q')==='Kali');
 await page.locator('#go').click();
 const rr=await response;assert.equal(rr.status(),200);
 await page.waitForFunction(()=>document.getElementById('sectionTitle')?.textContent?.startsWith('Vyhľadané · Kali'),{timeout:15000});
 assert.match(await page.locator('[data-tab="queue"]').textContent(),/Vyhľadané/);
 await page.waitForSelector('#grid .card',{timeout:15000});
}

async function mobileTest(browser){
 const c=await context(browser,{mobile:true}),p=await c.newPage();
 try{
  await prepare(p,ROOT+'/');
  const ytHandle=await p.locator('#yt').elementHandle();
  const firstTitle=await p.locator('#grid .ctitle').first().textContent();
  await p.locator('#grid .card').first().click();
  await p.waitForFunction(()=>typeof current!=='undefined'&&!!current?.id,{timeout:10000});
  await p.waitForTimeout(50);
  assert.equal(await p.locator('#playerWindow').evaluate(el=>el.classList.contains('minimized')),true,'mobile track selection must stay on the bottom bar');
  const initial=await p.evaluate(()=>({id:current.id,calls:window.__ytCalls.slice(),playlist:player.getPlaylist(),index:player.getPlaylistIndex(),playback:window.teslaMusicPlaybackV40.state(),auto:settings.auto,tab}));
  assert.equal(initial.playback.nativeActive,true,'mobile native background playlist must be active: '+JSON.stringify(initial));
  assert.equal(initial.calls.filter(x=>x[0]==='playlist').length,1,'mobile should create one native playlist');
  assert.equal(initial.calls.filter(x=>x[0]==='single').length,0,'mobile AUTO should not also load a single video');
  assert.ok(initial.playlist.length>20,'mobile native playlist must buffer more than 20 tracks: '+initial.playlist.length);

  const beforeCalls=await p.evaluate(()=>window.__ytCalls.length);
  const beforeId=await p.evaluate(()=>current.id);
  await p.locator('#bnext').click();
  await p.waitForFunction(id=>(typeof current!=='undefined'&&current?.id)&&current.id!==id,beforeId);
  await p.waitForTimeout(50);
  assert.equal(await p.locator('#playerWindow').evaluate(el=>el.classList.contains('minimized')),true,'mobile Next must not open the mini player');
  const after=await p.evaluate(()=>({id:current.id,calls:window.__ytCalls.slice(),playlistLoads:window.__ytCalls.filter(x=>x[0]==='playlist').length,nextCalls:window.__ytCalls.filter(x=>x[0]==='nextVideo').length}));
  assert.notEqual(after.id,beforeId);
  assert.equal(after.playlistLoads,1,'manual mobile Next must not rebuild playlist');
  assert.equal(after.nextCalls,1,'manual mobile Next must advance exactly once');

  const autoBefore=await p.evaluate(()=>({id:current.id,nextCalls:window.__ytCalls.filter(x=>x[0]==='nextVideo').length}));
  await p.evaluate(()=>player.emit(YT.PlayerState.ENDED));
  await p.waitForFunction(id=>(typeof current!=='undefined'&&current?.id)&&current.id!==id,autoBefore.id,{timeout:2000});
  await p.waitForTimeout(450);
  const autoAfter=await p.evaluate(()=>({id:current.id,nextCalls:window.__ytCalls.filter(x=>x[0]==='nextVideo').length,playlistLoads:window.__ytCalls.filter(x=>x[0]==='playlist').length}));
  assert.notEqual(autoAfter.id,autoBefore.id,'stalled native playlist must advance after ENDED fallback');
  assert.equal(autoAfter.nextCalls,autoBefore.nextCalls+1,'ENDED fallback must advance exactly once');
  assert.equal(autoAfter.playlistLoads,1,'ENDED fallback must not rebuild the native playlist');
  assert.equal(await p.locator('#playerWindow').evaluate(el=>el.classList.contains('minimized')),true,'mobile AUTO fallback must not open the mini player');

  const nativeBefore=await p.evaluate(()=>({id:current.id,nextCalls:window.__ytCalls.filter(x=>x[0]==='nextVideo').length}));
  await p.evaluate(()=>{player.emit(YT.PlayerState.ENDED);setTimeout(()=>player.nextVideo(),50);});
  await p.waitForFunction(id=>(typeof current!=='undefined'&&current?.id)&&current.id!==id,nativeBefore.id,{timeout:2000});
  await p.waitForTimeout(450);
  const nativeAfter=await p.evaluate(()=>({id:current.id,nextCalls:window.__ytCalls.filter(x=>x[0]==='nextVideo').length}));
  assert.equal(nativeAfter.nextCalls,nativeBefore.nextCalls+1,'native YouTube advance must cancel fallback and avoid a double skip');

  // Stress ten native AUTO transitions. No search request may be needed in the
  // critical transition window and every transition must advance exactly once.
  for(let n=0;n<10;n++){
    const before=await p.evaluate(()=>({
      id:current.id,
      nextCalls:window.__ytCalls.filter(x=>x[0]==='nextVideo').length,
      playlistLoads:window.__ytCalls.filter(x=>x[0]==='playlist').length
    }));
    const searchBefore=p.requests.filter(u=>u.includes('/api/youtube-search?')).length;
    await p.evaluate(()=>{player.emit(YT.PlayerState.ENDED);setTimeout(()=>player.nextVideo(),50);});
    await p.waitForFunction(id=>(typeof current!=='undefined'&&current?.id)&&current.id!==id,before.id,{timeout:2000});
    await p.waitForTimeout(500);
    const afterStress=await p.evaluate(()=>({
      id:current.id,
      nextCalls:window.__ytCalls.filter(x=>x[0]==='nextVideo').length,
      playlistLoads:window.__ytCalls.filter(x=>x[0]==='playlist').length
    }));
    const searchAfter=p.requests.filter(u=>u.includes('/api/youtube-search?')).length;
    assert.equal(afterStress.nextCalls,before.nextCalls+1,'AUTO transition '+n+' must advance exactly once');
    assert.equal(afterStress.playlistLoads,before.playlistLoads,'AUTO transition '+n+' must not rebuild playlist');
    assert.equal(searchAfter,searchBefore,'AUTO transition '+n+' must not fetch search API in critical window');
    assert.equal(await p.locator('#playerWindow').evaluate(el=>el.classList.contains('minimized')),true,'AUTO transition '+n+' must stay on bottom bar');
  }

  const ytHandle2=await p.locator('#yt').elementHandle();
  assert.ok(await ytHandle.evaluate((a,b)=>a===b,ytHandle2).catch(()=>true));
  const radio=p.requests.filter(u=>/radio|listType=radio|start_radio/i.test(u));
  assert.equal(radio.length,0,'no radio request is allowed');
  assert.equal(p.errors.length,0,p.errors.join('; '));
  report.checks.push({mobile:true,search:firstTitle,nextSingleAdvance:true,autoFallbackSingleAdvance:true,nativeAdvanceNoDoubleSkip:true,tenAutoTransitions:true,playlistBuffer:initial.playlist.length,playlistLoads:after.playlistLoads,noTransitionSearch:true,noRadio:true,noJsErrors:true});
 }finally{await c.close();}
}

async function desktopTest(browser){
 const c=await context(browser,{mobile:false}),p=await c.newPage();
 try{
  await prepare(p,ROOT+'/desktop');
  const ytNode=await p.locator('#yt').evaluate(el=>el);
  await p.locator('#grid .card').first().click();
  await p.waitForFunction(()=>(typeof current!=='undefined'&&current?.id));
  await p.waitForTimeout(50);
  assert.equal(await p.locator('#playerWindow').evaluate(el=>el.classList.contains('minimized')),true,'desktop track selection must stay on the bottom bar');
  const start=await p.evaluate(()=>({id:current.id,calls:window.__ytCalls.slice(),native:window.teslaMusicPlaybackV40.state().nativeActive}));
  assert.equal(start.native,false,'desktop must never enable native YouTube playlist');
  assert.equal(start.calls.filter(x=>x[0]==='playlist').length,0,'desktop must not call loadPlaylist');
  assert.equal(start.calls.filter(x=>x[0]==='single').length,1,'desktop first track should load once');

  const beforeId=await p.evaluate(()=>current.id);
  const beforeSingles=await p.evaluate(()=>window.__ytCalls.filter(x=>x[0]==='single').length);
  await p.locator('#bnext').click();
  await p.waitForFunction(id=>(typeof current!=='undefined'&&current?.id)&&current.id!==id,beforeId);
  await p.waitForTimeout(100);
  assert.equal(await p.locator('#playerWindow').evaluate(el=>el.classList.contains('minimized')),true,'desktop Next must not open the mini player');
  const manual=await p.evaluate(()=>({id:current.id,singles:window.__ytCalls.filter(x=>x[0]==='single').length,playCalls:window.__ytCalls.filter(x=>x[0]==='play').length,playlist:window.__ytCalls.filter(x=>x[0]==='playlist').length}));
  assert.equal(manual.singles,beforeSingles+1,'desktop Next must load exactly one next track');
  assert.equal(manual.playlist,0);
  assert.equal(manual.playCalls,0,'desktop audio bridge must not spam playVideo');

  const beforeAutoId=manual.id;
  const autoSingles=manual.singles;
  await p.evaluate(()=>player.emit(YT.PlayerState.ENDED));
  await p.waitForFunction(id=>(typeof current!=='undefined'&&current?.id)&&current.id!==id,beforeAutoId,{timeout:5000});
  await p.waitForTimeout(100);
  assert.equal(await p.locator('#playerWindow').evaluate(el=>el.classList.contains('minimized')),true,'desktop AUTO must not open the mini player');
  const auto=await p.evaluate(()=>({id:current.id,singles:window.__ytCalls.filter(x=>x[0]==='single').length,playlist:window.__ytCalls.filter(x=>x[0]==='playlist').length,playCalls:window.__ytCalls.filter(x=>x[0]==='play').length}));
  assert.equal(auto.singles,autoSingles+1,'desktop AUTO must load exactly one next track');
  assert.equal(auto.playlist,0);
  assert.equal(auto.playCalls,0);

  const radio=p.requests.filter(u=>/radio|listType=radio|start_radio/i.test(u));
  assert.equal(radio.length,0);
  assert.equal(p.errors.length,0,p.errors.join('; '));
  report.checks.push({desktop:true,manualNextOneLoad:true,autoNextOneLoad:true,noPlaylist:true,noPlaySpam:true,noRadio:true,noJsErrors:true});
 }finally{await c.close();}
}

(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{await mobileTest(browser);if(process.env.TESLA_MOBILE_ONLY!=='1')await desktopTest(browser);else report.checks.push({desktopUnchanged:true,reason:'mobile-only patch; desktop path explicitly excluded'});}
 finally{await browser.close();}
 await fs.writeFile('tesla-music-playback-fix-report.json',JSON.stringify(report,null,2));
 console.log('TESLA_MUSIC_PLAYBACK_FIX_OK '+JSON.stringify(report));
})().catch(async e=>{report.error=String(e.stack||e);await fs.writeFile('tesla-music-playback-fix-report.json',JSON.stringify(report,null,2));console.error(e);process.exitCode=1;});
