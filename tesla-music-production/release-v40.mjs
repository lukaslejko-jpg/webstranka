import fs from 'node:fs/promises';
// Retain the complete, checksum-validated V39 backend, assets and icon build.
await import('./build.mjs');
await import('./patch-playback-v40.mjs');
let html=await fs.readFile('public/index.html','utf8');
if(!html.includes('tesla-music-build" content="39"'))throw Error('Unexpected baseline HTML');
html=html.replace('tesla-music-build" content="39"','tesla-music-build" content="40"').replaceAll('?v=39','?v=40');
html=html.replace('<script src="https://www.youtube.com/iframe_api">','<script src="/playback-v40.js?v=40"></script><script src="https://www.youtube.com/iframe_api">');
await fs.writeFile('public/index.html',html);
const v=JSON.parse(await fs.readFile('public/version.json','utf8'));
await fs.writeFile('public/version.json',JSON.stringify({...v,release:40,backendRelease:39,playbackPatch:40}));
console.log('Tesla Music V40: first Play + native iOS playlist; V39 search/icons unchanged.');
