import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source = await readFile(new URL('../public/meta.js', import.meta.url), 'utf8');
const {readMeta} = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const syncsafe = size => [size >>> 21 & 127, size >>> 14 & 127, size >>> 7 & 127, size & 127];
function id3(text, {version=3, encoding=1, be=false, terminated=false}={}) {
  let data;
  if (encoding === 0) data = Buffer.from(text, 'latin1');
  else if (encoding === 3) data = Buffer.from(text, 'utf8');
  else {
    data = Buffer.from(text, 'utf16le');
    if (be || encoding === 2) data.swap16();
    if (encoding === 1) data = Buffer.concat([Buffer.from(be ? [0xfe,0xff] : [0xff,0xfe]), data]);
  }
  if (terminated) data = Buffer.concat([data, Buffer.alloc(encoding === 1 || encoding === 2 ? 2 : 1)]);
  const body = Buffer.concat([Buffer.from([encoding]), data]);
  const size = Buffer.alloc(4); size.writeUInt32BE(body.length);
  const frames = ['TIT2','TPE1','TALB'].map(id => Buffer.concat([
    Buffer.from(version === 2 ? {TIT2:'TT2',TPE1:'TP1',TALB:'TAL'}[id] : id),
    version === 2 ? size.subarray(1) : version === 4 ? Buffer.from(syncsafe(body.length)) : size,
    Buffer.alloc(version === 2 ? 0 : 2), body
  ]));
  const payload = Buffer.concat(frames);
  return new Blob([Buffer.from([73,68,51,version,0,0,...syncsafe(payload.length)]), payload]);
}
for (const version of [2,3,4]) {
  for (const be of [false,true]) {
    for (const terminated of [false,true]) {
      test(`ID3v2.${version} UTF-16${be?'BE':'LE'} ${terminated?'with':'without'} terminator preserves the last character`, async () => {
        const text = 'If I Were You';
        assert.deepEqual(await readMeta(id3(text,{version,be,terminated})),{title:text,artist:text,album:text});
      });
    }
  }
}
for (const [encoding,text] of [[0,'Beyoncé'],[1,'Música 🎵'],[2,'終わりĀ'],[3,'日本語 🎵']]) {
  test(`Text encoding ${encoding} preserves Unicode`, async () => {
    assert.equal((await readMeta(id3(text,{encoding,terminated:true}))).title, text);
  });
}
test('Multiple text values keep the first value', async () => {
  assert.equal((await readMeta(id3('First\0Second'))).title, 'First');
});
test('Truncated and untagged files do not throw', async () => {
  assert.deepEqual(await readMeta(new Blob([Buffer.from('ID3')])), {});
  assert.deepEqual(await readMeta(new Blob([Buffer.from('untagged')])), {});
});
