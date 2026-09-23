import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.argv[2]||'public';
const BUILD='154';

async function exists(p){try{await fs.access(p);return true}catch{return false}}
async function normalizeHtml(file){
  if(!await exists(file))return;
  let html=await fs.readFile(file,'utf8');
  html=html.replace(/(<meta\s+name=["']tesla-music-build["']\s+content=["'])\d+(["'])/i,'$1'+BUILD+'$2');
  html=html.replace(/\?v=\d+/g,'?v='+BUILD);
  await fs.writeFile(file,html);
}
await normalizeHtml(path.join(root,'index.html'));
await normalizeHtml(path.join(root,'desktop','index.html'));
await fs.writeFile(path.join(root,'version.json'),JSON.stringify({build:Number(BUILD),channel:'stable'},null,2)+'\n');
console.log('TESLA_MUSIC_BUILD_NORMALIZED='+BUILD);
