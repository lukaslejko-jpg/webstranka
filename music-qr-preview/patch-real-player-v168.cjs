const fs=require('fs');
const p='/tmp/base/app-v7.js';
let s=fs.readFileSync(p,'utf8');
const before='player = new YT.Player(';
if(!s.includes(before)) throw new Error('YT.Player initialization not found');
s=s.replace(before,'player = window.teslaMusicPlayer = new YT.Player(');
fs.writeFileSync(p,s);
console.log('REAL_PLAYER_EXPOSED');
