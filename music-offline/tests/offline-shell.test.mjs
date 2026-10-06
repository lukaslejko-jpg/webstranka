import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const sw=await readFile(new URL('../public/sw.js',import.meta.url),'utf8');
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
test('TEST03 registers its offline worker',()=>{assert(html.includes("serviceWorker.register('./sw.js'"));});
test('TEST03 caches only current shell and supports navigation fallback',()=>{assert(sw.includes('music-offline-test03-shell-'));assert(sw.includes('cache.addAll(SHELL)'));assert(sw.includes('req.mode==="navigate"'));assert(sw.includes('caches.match("./index.html"'));});
test('legacy TEST02 cache is removed on activation',()=>{assert(sw.includes('music-offline-shell-'));assert(sw.includes('caches.delete'));});
