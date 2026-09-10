import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const BASE='https://raw.githubusercontent.com/lukaslejko-jpg/webstranka/e75b715b6ae67f0ca1b4efd36110acaddf6c3c8b/tesla-music-v7-preview/';
await fs.mkdir('public/icons',{recursive:true});
const names=['index.html','style-v7.css','mode-v9.css','app-v7.js','mini-v7.js','account-v8.js','mode-v9.js'];
await Promise.all(names.map(async name=>{const r=await fetch(BASE+name,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(name+': HTTP '+r.status);await fs.writeFile('public/'+name,Buffer.from(await r.arrayBuffer()));}));
let html=await fs.readFile('public/index.html','utf8');
html=html.replace(/<link\b[^>]*rel="(?:icon|shortcut icon|apple-touch-icon|manifest)"[^>]*>/gi,'');
html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
html=html.replace('</head>',`<meta name="tesla-music-build" content="39"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Tesla Music"><meta name="theme-color" content="#111111"><link rel="apple-touch-icon" sizes="180x180" href="/icons/music-v39-180.png"><link rel="icon" type="image/png" sizes="32x32" href="/icons/music-v39-32.png"><link rel="manifest" href="/manifest.webmanifest"><link rel="stylesheet" href="/mode-v9.css?v=39"></head>`);
html=html.replace('</body>',`<script src="/app-v7.js?v=39"></script><script src="/mini-v7.js?v=39"></script><script src="/account-v8.js?v=39"></script><script src="/mode-v9.js?v=39"></script><script src="https://www.youtube.com/iframe_api"></script><script>if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{});}</script></body>`);
html=html.replace('./style-v7.css','/style-v7.css?v=39');
await fs.writeFile('public/index.html',html);
for(const name of ['app-v7.js','mode-v9.js']){const s=await fs.readFile('public/'+name,'utf8');if(!s.includes('/api/youtube-search')||/https:\/\/[^'"\s]+supabase\.co\/functions\/v1\/(?:twyoutubesearch|music-search)/.test(s))throw Error('Invalid search route: '+name);}
let icon;
try{icon=await fs.readFile('selected-vinyl-v39.webp');}catch{const r=await fetch('https://api.github.com/repos/lukaslejko-jpg/webstranka/git/blobs/6c30a34e513e52c627785ddc3b3532f15dab63d9',{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Selected icon download: '+r.status);const d=await r.json();icon=Buffer.from(d.content,'base64');}
if(createHash('sha256').update(icon).digest('hex')!=='c219e78c0ce44d7cf49ad3213f8fb0aaa48a13a9f27fdf017640f67e837c9dfb')throw Error('Selected icon checksum mismatch');
const meta=await sharp(icon,{failOn:'warning'}).metadata();if(meta.width!==256||meta.height!==256)throw Error('Invalid selected icon');
for(const n of [32,180,192,512])await sharp(icon,{failOn:'warning'}).resize(n,n).flatten({background:'#111111'}).png().toFile('public/icons/music-v39-'+n+'.png');
await fs.copyFile('public/icons/music-v39-180.png','public/apple-touch-icon.png');
await fs.writeFile('public/manifest.webmanifest',JSON.stringify({id:'/',name:'Tesla Music',short_name:'Tesla Music',lang:'sk',start_url:'/',scope:'/',display:'standalone',background_color:'#ffffff',theme_color:'#111111',icons:[192,512].map(n=>({src:'/icons/music-v39-'+n+'.png',sizes:n+'x'+n,type:'image/png',purpose:'any'}))}));
await fs.writeFile('public/sw.js',`/* Tesla Music V39: online only; no offline module. */\nself.addEventListener('install',()=>self.skipWaiting());\nself.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys()){if(k.startsWith('tesla-music-pwa-'))await caches.delete(k);}await self.clients.claim();})()));\nself.addEventListener('fetch',e=>{if(new URL(e.request.url).origin===self.location.origin)e.respondWith(fetch(e.request));});\n`);
await fs.writeFile('public/version.json',JSON.stringify({release:39,source:'e75b715b6ae67f0ca1b4efd36110acaddf6c3c8b',production:'https://tesla-waze-piped.vercel.app',search:'/api/youtube-search',offline:false,airplay:false,icon:'/icons/music-v39-180.png'}));
console.log('Tesla Music V39: complete frontend, checksum-verified selected PNG icons, manifest and online-only worker built.');
