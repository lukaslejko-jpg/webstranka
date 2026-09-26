'use strict';
// Test/build tooling only. Never shipped as a playback interceptor.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const vm = require('node:vm');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const hiddenRule = 'body:not(.tm-video-open) #playerWindow{display:none!important}';
const mobilePath = '/^\\/(?:index\\.html)?$/.test(location.pathname)';

function patchSource(source) {
  assert.equal(source.split(hiddenRule).length - 1, 1, 'Expected exactly one rescue visibility CSS rule');
  const functions = source.match(/function killMini\(\)\{[\s\S]*?\n\}/g) || [];
  assert.equal(functions.length, 1, 'Expected exactly one known killMini function');
  const before = functions[0];
  assert.ok(before.includes("if(!document.body.classList.contains('tm-video-open'))pw.style.setProperty('display','none','important');"), 'Visibility writer changed; stop rather than guess');
  assert.ok(before.includes("pw.classList.remove('minimized','mini-recs','max','video-off');"));
  const anchor = "  const pw=$('playerWindow');";
  assert.equal(before.split(anchor).length - 1, 1);
  const after = before.replace(anchor, anchor + `
  // Mobile root only: retain the existing iframe; desktop/video-overlay paths stay unchanged.
  if(pw && ${mobilePath} && !document.body.classList.contains('tm-video-open')){
    pw.classList.remove('mini-recs','max','video-off');
    pw.classList.add('minimized');
    pw.style.removeProperty('display');
    return;
  }`);
  const css = '${' + mobilePath + " ? '' : '" + hiddenRule + "'}";
  const result = source.replace(hiddenRule, css).replace(before, after);
  new vm.Script(result, {filename:'rescue-v135.js'});
  return {result, before, after, originalCss:hiddenRule, replacementCss:css};
}

// Executed only in the instrumented test document, not in deployed source.
function displaySnapshot() {
  const host = document.getElementById('playerWindow');
  const frame = host?.querySelector('iframe');
  const measure = el => {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    return {tag:el.tagName,id:el.id,className:el.className,inline:el.getAttribute('style'),
      display:cs.display,visibility:cs.visibility,opacity:cs.opacity,
      width:r.width,height:r.height,rects:el.getClientRects().length};
  };
  const matches = [];
  const walk = (rules, sheet, context=[]) => {
    for (const rule of rules) {
      if (rule.type === CSSRule.MEDIA_RULE && !matchMedia(rule.conditionText).matches) continue;
      if (rule.type === CSSRule.SUPPORTS_RULE && !CSS.supports(rule.conditionText)) continue;
      if (rule.selectorText && rule.style?.getPropertyValue('display')) {
        try { if(host.matches(rule.selectorText)) matches.push({source:sheet.href||sheet.ownerNode?.id||'inline-style',
          selector:rule.selectorText,display:rule.style.getPropertyValue('display'),
          priority:rule.style.getPropertyPriority('display'),context}); } catch {}
      }
      if (rule.cssRules) walk(rule.cssRules, sheet, context.concat(rule.conditionText||rule.name||''));
    }
  };
  for (const sheet of document.styleSheets) {
    if(sheet.disabled || (sheet.media.mediaText && !matchMedia(sheet.media.mediaText).matches)) continue;
    try { walk(sheet.cssRules, sheet); } catch {}
  }
  const ancestors = [];
  for(let el=frame;el;el=el.parentElement){ancestors.push(measure(el));if(el===host)break;}
  return {host:host?measure(host):null,frame:frame?measure(frame):null,ancestors,matches,
    writes:window.__displayWrites||[],calls:window.__calls||[],bodyClass:document.body.className};
}

async function main(root) {
  const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const reportDir = process.env.RENDER_REPORT_DIR || '/tmp/tesla-music-render-report';
  fs.mkdirSync(reportDir,{recursive:true});
  const save = (name,value) => fs.writeFileSync(path.join(reportDir,name+'.json'),JSON.stringify(value,null,2));
  const coreFiles = ['app-v7.js','mode-v9.js'];
  const coreBefore = Object.fromEntries(coreFiles.map(f=>[f,hash(fs.readFileSync(path.join(root,f)))]));
  const target = path.join(root,'rescue-v135.js');
  const original = fs.readFileSync(target,'utf8');
  const patch = patchSource(original); // fail closed before touching candidate
  console.log('EXACT_VISIBILITY_WRITER='+JSON.stringify({file:'rescue-v135.js',function:patch.before,css:patch.originalCss}));
  save('visibility-patch',{file:'rescue-v135.js',beforeSha256:hash(original),afterSha256:hash(patch.result),...patch, result:undefined});
  const mock = `window.__calls=[];window.__playerCount=0;
    window.YT={PlayerState:{ENDED:0,PLAYING:1,PAUSED:2,BUFFERING:3,CUED:5},Player:function(id,o){
      window.__playerCount++;this.id='';this.state=-1;this.time=0;this.listeners={};
      const node=document.getElementById(id),frame=document.createElement('iframe');
      frame.id=id;frame.title='TEST ONLY: YouTube API mock, no real audio';frame.src='about:blank';
      frame.width='640';frame.height='360';node.replaceWith(frame);this.getIframe=()=>frame;
      this.emit=s=>{this.state=s;o.events.onStateChange?.({data:s,target:this});for(const h of this.listeners.onStateChange||[])(typeof h==='string'?window[h]:h)?.({data:s,target:this});};
      this.getPlayerState=()=>this.state;this.getCurrentTime=()=>this.time;this.getDuration=()=>180;this.getVideoData=()=>({video_id:this.id});
      this.addEventListener=(e,h)=>(this.listeners[e]||(this.listeners[e]=[])).push(h);
      this.loadVideoById=(id,start=0)=>{this.id=typeof id==='string'?id:id.videoId;this.time=start;window.__calls.push(['load',this.id]);this.emit(1);};
      this.playVideo=()=>{window.__calls.push(['play']);this.emit(1)};this.pauseVideo=()=>this.emit(2);this.seekTo=()=>{};
      this.setVolume=()=>{};this.getVolume=()=>100;this.mute=()=>{};this.unMute=()=>{};this.isMuted=()=>false;
      setTimeout(()=>o.events.onReady?.({target:this}),0);
    }};setTimeout(()=>window.onYouTubeIframeAPIReady?.(),0);`;
  const launch = {args:['--no-sandbox']};
  if(process.env.CHROMIUM_EXECUTABLE) launch.executablePath=process.env.CHROMIUM_EXECUTABLE;
  const browser = await chromium.launch(launch);
  const origin = 'https://local.test';
  const tracks = [
    {id:'unfzfe8f9NI',title:'Song A',uploader:'Artist A - Topic',duration:180,thumbnail:''},
    {id:'xFrGuyw1V8s',title:'Song B',uploader:'Artist B - Topic',duration:180,thumbnail:''},
    {id:'XEjLoHdbVeE',title:'Song C',uploader:'Artist C - Topic',duration:180,thumbnail:''}
  ];
  async function open(route, mobile=true) {
    const options={serviceWorkers:'block',viewport:mobile?{width:390,height:844}:{width:1440,height:900}};
    if(mobile) Object.assign(options,{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',isMobile:true,hasTouch:true});
    const c=await browser.newContext(options);
    await c.addInitScript(()=>{
      localStorage.setItem('music:memberSession:v1','x');
      localStorage.setItem('music:memberUser:v1',JSON.stringify({id:'u',role:'member'}));
      localStorage.setItem('teslaMusic:settings:v1',JSON.stringify({shuffle:false,auto:true}));
      window.__displayWrites=[];
      const set=CSSStyleDeclaration.prototype.setProperty;
      CSSStyleDeclaration.prototype.setProperty=function(name,value,priority){
        if(name==='display' && this===document.getElementById('playerWindow')?.style)
          window.__displayWrites.push({value,priority,stack:new Error().stack});
        return set.call(this,name,value,priority);
      };
    });
    await c.route('**/*',async r=>{
      const u=new URL(r.request().url());
      if(u.href==='https://www.youtube.com/iframe_api')return r.fulfill({contentType:'application/javascript',body:mock});
      if(u.origin!==origin)return r.abort(); // no real accounts/data/media in this mock test
      if(u.pathname==='/api/music')return r.fulfill({contentType:'application/json',body:JSON.stringify({user:{id:'u',role:'member'}})});
      if(u.pathname.startsWith('/api/youtube-search'))return r.fulfill({contentType:'application/json',body:JSON.stringify({items:tracks.map(t=>({youtubeId:t.id,title:t.title,artist:t.uploader,duration:t.duration,artwork:''}))})});
      const rel=['/','/desktop','/desktop/'].includes(u.pathname)?'index.html':u.pathname.slice(1);
      const file=path.resolve(root,rel);
      if(!file.startsWith(path.resolve(root)+path.sep))return r.abort();
      try{return r.fulfill({body:fs.readFileSync(file),contentType:rel.endsWith('.js')?'application/javascript':rel.endsWith('.css')?'text/css':rel.endsWith('.json')?'application/json':'text/html'});}catch{return r.fulfill({status:404,body:''});}
    });
    const p=await c.newPage(),errors=[];
    p.on('pageerror',e=>errors.push(e.message));
    p.setDefaultTimeout(15000);
    await p.goto(origin+route,{waitUntil:'domcontentloaded'});
    await p.waitForFunction(()=>typeof ready!=='undefined'&&ready===true);
    await p.evaluate(list=>{queue=list;settings.shuffle=false;settings.auto=true;tab='queue';render(queue);},tracks);
    await p.locator('#grid .card').first().click();
    await p.waitForFunction(()=>player.getPlayerState()===1);
    return {c,p,errors};
  }
  async function rendered(p,label) {
    const samples=[];
    for(let i=0;i<15;i++){
      const s=await p.evaluate(displaySnapshot);samples.push(s);
      save(label,samples);
      assert.ok(s.host?.className.split(' ').includes('minimized'),label+': player unexpectedly restored');
      assert.ok(s.frame,label+': mock must contain an actual iframe DOM element');
      for(const box of s.ancestors){
        assert.notEqual(box.display,'none',label+': hidden '+box.id);
        assert.notEqual(box.visibility,'hidden',label+': invisible '+box.id);
        assert.ok(box.width>=1&&box.height>=1&&box.rects>0,label+': zero box '+box.id);
      }
      assert.equal(await p.evaluate(()=>document.getElementById('yt')===window.__initialFrame),true,label+': iframe recreated');
      await p.waitForTimeout(200);
    }
    console.log('RENDER_OK '+label+' '+JSON.stringify(samples.at(-1).host));
  }
  async function clickFlow(route,label) {
    const {c,p,errors}=await open(route);
    try {
      await p.evaluate(()=>window.__initialFrame=document.getElementById('yt'));
      await rendered(p,label+'-click');
      const before=await p.evaluate(()=>({id:current.id,loads:__calls.filter(x=>x[0]==='load').length}));
      assert.equal(before.loads,1,'Card must load exactly one track');
      await p.locator('#bnext').click();
      await p.waitForFunction(id=>current.id!==id&&player.getPlayerState()===1,before.id);
      await rendered(p,label+'-next');
      const second=await p.evaluate(()=>({id:current.id,loads:__calls.filter(x=>x[0]==='load').length}));
      assert.equal(second.loads,before.loads+1,'Next must load exactly one track');
      await p.evaluate(()=>player.emit(YT.PlayerState.ENDED));
      await p.waitForFunction(id=>current.id!==id&&player.getPlayerState()===1,second.id);
      await rendered(p,label+'-ended');
      assert.equal(await p.evaluate(()=>__calls.filter(x=>x[0]==='load').length),second.loads+1,'ENDED must load exactly one track');
      assert.equal(await p.evaluate(()=>__playerCount),1,'Player must not be recreated');
      assert.equal(await p.evaluate(()=>player.getPlayerState()),1);
      assert.deepEqual(errors,[]);
      await p.screenshot({path:path.join(reportDir,label+'.png')});
    } finally {await c.close();}
  }
  try {
    const before=await open('/?mobile=1&device=mobile');
    await before.p.waitForTimeout(2500);
    const observed=await before.p.evaluate(displaySnapshot);
    save('before',observed);
    console.log('MINIMIZED_BEFORE='+JSON.stringify(observed));
    assert.equal(observed.host.display,'none','Original failure must reproduce before patch');
    assert.ok(observed.writes.some(w=>w.value==='none'&&w.priority==='important'&&w.stack.includes('rescue-v135.js')),'Must prove rescue-v135.js is the live inline writer');
    await before.c.close();
    const db=await open('/desktop',false);await db.p.waitForTimeout(2500);
    const desktopBefore=(await db.p.evaluate(displaySnapshot)).host;await db.c.close();
    fs.writeFileSync(target,patch.result);
    await clickFlow('/?mobile=1&device=mobile','mobile-query');
    await clickFlow('/','mobile-root');
    const da=await open('/desktop',false);await da.p.waitForTimeout(2500);
    const desktopAfter=(await da.p.evaluate(displaySnapshot)).host;await da.c.close();
    save('desktop-unchanged',{before:desktopBefore,after:desktopAfter});
    assert.deepEqual(desktopAfter,desktopBefore,'Desktop visibility/layout changed');
    const coreAfter=Object.fromEntries(coreFiles.map(f=>[f,hash(fs.readFileSync(path.join(root,f)))]));
    assert.deepEqual(coreAfter,coreBefore,'V39 playback files changed');
    save('summary',{status:'PASS',scope:'CSS/DOM and mocked YouTube API integration only',realIPhoneAudioVerified:false,lockedBackgroundVerified:false,coreSha256:coreAfter,changedApplicationFile:'rescue-v135.js',desktopUnchanged:true});
    console.log('V39_RENDER_AND_MOCK_API_REGRESSION_OK (not a real-iPhone audio test)');
  } finally {await browser.close();}
}
module.exports={patchSource,displaySnapshot};
if(require.main===module){
  if(!process.argv[2]){console.error('Usage: node tesla-music-v39-render-regression.cjs <candidate-src>');process.exit(1);}
  main(path.resolve(process.argv[2])).catch(e=>{console.error(e);process.exit(1);});
}
