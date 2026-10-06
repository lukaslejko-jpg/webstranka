import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');

test('TEST03 retires legacy Music Offline service worker', () => {
  assert(source.includes('const VERSION = "20261004-02"'));
  assert(source.includes('music-offline-shell-'));
  assert(source.includes('self.registration.unregister()'));
  assert(!source.includes('event.respondWith'));
});

test('TEST03 keeps shell manifest only for release validation', () => {
  assert(source.includes('const SHELL = ['));
  assert(source.includes('./index.html'));
  assert(source.includes('./manifest.json'));
});
