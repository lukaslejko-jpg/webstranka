import fs from 'node:fs/promises';
function replaceOnce(s,from,to){
 if(s.split(from).length!==2)throw Error('Unexpected V39 source: '+from.slice(0,90));
 return s.replace(from,to);
}
let app=await fs.readFile('public/app-v7.js','utf8');
app=replaceOnce(app,'player.loadVideoById(t.id);','if(!window.teslaMusicPlaybackV40?.loadTrack(t))player.loadVideoById(t.id);');
app=replaceOnce(app,"setInterval(tick,500);tabs();render();stats()}","setInterval(tick,500);tabs();render();stats();window.teslaMusicPlaybackV40?.onReady()}");
app=replaceOnce(app,'onStateChange:e=>{if(e.data===YT.PlayerState.ENDED)', 'onStateChange:e=>{if(window.teslaMusicPlaybackV40?.onState(e))return;if(e.data===YT.PlayerState.ENDED)');
app=replaceOnce(app,"onError:e=>$('status').textContent='YouTube player chyba: '+e.data", "onAutoplayBlocked:()=>window.teslaMusicPlaybackV40?.onBlocked(),onError:e=>$('status').textContent='YouTube player chyba: '+e.data");
await fs.writeFile('public/app-v7.js',app);
let mode=await fs.readFile('public/mode-v9.js','utf8');
mode=replaceOnce(mode,'  async function ctxNext(man=true){','  window.teslaMusicContextListV40=()=>ctxMusicList(ctxSource);\n  async function ctxNext(man=true){');
await fs.writeFile('public/mode-v9.js',mode);
await fs.copyFile('playback-v40.js','public/playback-v40.js');
