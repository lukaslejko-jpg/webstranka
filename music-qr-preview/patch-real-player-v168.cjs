const fs=require('fs');
const p='/tmp/base/app-v7.js';
let s=fs.readFileSync(p,'utf8');
let n=0;
s=s.replace(/player\s*=\s*new\s+YT\.Player\s*\(/,function(m){n++;return m.replace(/player\s*=/,'player = window.teslaMusicPlayer =')});
if(!n){const i=s.indexOf('YT.Player');console.log('YT_CONTEXT='+s.slice(Math.max(0,i-500),i+900));throw new Error('YT.Player assignment not matched')}
fs.writeFileSync(p,s);console.log('REAL_PLAYER_EXPOSED='+n);
