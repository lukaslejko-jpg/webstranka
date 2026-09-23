import fs from 'node:fs/promises';
const BASE="https://tesla-waze-piped-i9nw8dg6c-lukaslejko-9932s-projects.vercel.app";
const paths=[
'/style-v7.css','/mode-v9.css','/app-v7.js','/mini-v7.js','/account-v8.js','/mode-v9.js',
'/member-v47-background.js','/member-v47-core.js','/member-v46-youtube.js','/member-v49-search-layout.js','/member-v50-foryou.js',
'/desktop-route-v52.js','/bottom-seek-only.js','/desktop-silence-v63.js','/desktop-v91-guard.js','/desktop-v93-search-ui.js','/desktop-v97-youtube-search.js',
'/mobile-v128-music-logic.js','/mobile-v106-search-ui.js','/mobile-v106-player-parity.js','/qr-link-v129.js','/ux-v130.js','/mobile-pair-v133.js','/rescue-v135.js',
'/manifest.webmanifest','/sw.js','/version.json','/favicon.ico',
'/icons/music-v39-32.png','/icons/music-v39-180.png','/icons/music-v39-192.png','/icons/music-v39-512.png'
];
async function copy(urlPath,outPath=urlPath){
 const r=await fetch(BASE+urlPath,{redirect:'follow'}); if(!r.ok)throw new Error(urlPath+' '+r.status);
 const out='public'+outPath; await fs.mkdir(out.slice(0,out.lastIndexOf('/'))||'public',{recursive:true});
 await fs.writeFile(out,Buffer.from(await r.arrayBuffer()));
}
await fs.rm('public',{recursive:true,force:true}); await fs.mkdir('public/desktop',{recursive:true});
await copy('/','/index.html'); await copy('/desktop/','/desktop/index.html');
for(const p of paths)await copy(p);
await fs.copyFile('mobile-controls-v40.js','public/mobile-controls-v40.js');
console.log('TESLA_MUSIC_HOTFIX: immutable production snapshot + one mobile playback file');
