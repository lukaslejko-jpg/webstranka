import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../public/', import.meta.url));
const version = JSON.parse(await readFile(resolve(root, 'release.json'), 'utf8'));
const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json'), 'utf8'));
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const sw = await readFile(resolve(root, 'sw.js'), 'utf8');
assert.equal(manifest.name, 'Music Offline');
assert.equal(manifest.id, './');
assert.equal(manifest.start_url, './');
assert.equal(manifest.scope, './');
assert(html.includes(`name="music-offline-version" content="${version.version}"`));
assert(sw.includes(`const VERSION = "${version.version}"`));
assert((await readFile(resolve(root, 'offline.js'), 'utf8')).includes(`const VERSION = "${version.version}"`));
const shellBlock = sw.match(/const SHELL = \[([\s\S]*?)\];/)[1];
const shell = [...shellBlock.matchAll(/"(\.\/[^"\n]+)"/g)].map(match => match[1].slice(2));
const shellSet = new Set(shell);
for (const path of shell) assert((await stat(resolve(root, path))).size > 0, `Missing shell asset ${path}`);
for (const icon of manifest.icons) assert(shellSet.has(icon.src.slice(2)), `Icon not cached: ${icon.src}`);
let checked = 0;
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) { await walk(path); continue; }
    if (!entry.name.endsWith('.js')) continue;
    const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    checked++;
    const source = await readFile(path, 'utf8');
    for (const match of source.matchAll(/(?:from\s+|import\s+)["'](\.[^"']+)["']/g)) {
      const imported = resolve(dirname(path), match[1]);
      assert((await stat(imported)).isFile(), `Missing module ${match[1]}`);
      const relative = imported.slice(root.length + (root.endsWith('/') ? 0 : 1));
      assert(shellSet.has(relative), `Module missing from offline shell: ${relative}`);
    }
  }
}
await walk(root);
assert((await readFile(resolve(root, 'LICENSE-kasette.txt'), 'utf8')).includes('BSD 3-Clause License'));
console.log(`${version.release}: ${checked} JavaScript files checked; all ${shell.length} offline shell assets and manifest valid.`);
