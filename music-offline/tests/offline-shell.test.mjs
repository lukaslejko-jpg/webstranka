import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
const origin = 'https://offline.example.test';
function harness({ failAsset = null } = {}) {
  const handlers = new Map();
  const stores = new Map();
  const requests = [];
  let network = true;
  const absolute = value => new URL(typeof value === 'string' ? value : value.url, origin + '/').href;
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async name => stores.delete(name),
    open: async name => {
      if (!stores.has(name)) stores.set(name, new Map());
      const data = stores.get(name);
      return {
        addAll: async paths => {
          if (paths.includes(failAsset)) throw new Error('Incomplete download');
          for (const path of paths) data.set(absolute(path), { body: 'asset:' + path });
        },
        match: async (request, options = {}) => {
          const url = new URL(absolute(request));
          if (options.ignoreSearch) url.search = '';
          return data.get(url.href);
        },
      };
    },
  };
  const ctx = {
    URL, caches,
    fetch: async request => {
      requests.push(absolute(request));
      if (!network) throw new Error('Network unavailable');
      return { body: 'network' };
    },
    self: {
      location: { href: origin + '/sw.js' },
      clients: { claim: async () => {} },
      skipWaiting: async () => {},
      addEventListener: (name, callback) => handlers.set(name, callback),
    },
  };
  vm.runInNewContext(source, ctx);
  async function event(name, extra = {}) {
    let pending;
    const evt = { waitUntil: promise => { pending = promise; }, respondWith: promise => { pending = promise; }, ...extra };
    handlers.get(name)(evt);
    return await pending;
  }
  return { event, stores, requests, offline: () => { network = false; } };
}

test('installed shell opens root and versioned index with network unavailable', async () => {
  const h = harness();
  await h.event('install');
  await h.event('activate');
  h.offline();
  for (const path of ['/', '/?v=20261004-01', '/index.html?v=test']) {
    const response = await h.event('fetch', { request: { url: origin + path, method: 'GET', mode: 'navigate' } });
    assert.equal(response.body, 'asset:./index.html');
  }
  const script = await h.event('fetch', { request: { url: origin + '/locales/sk.js', method: 'GET', mode: 'cors' } });
  assert.equal(script.body, 'asset:./locales/sk.js');
  assert.equal(h.requests.length, 0);
});

test('activation deletes old owned caches and preserves unrelated app caches', async () => {
  const h = harness();
  h.stores.set('unrelated-app-cache', new Map([['keep', true]]));
  h.stores.set('music-offline-shell-old', new Map());
  await h.event('install');
  await h.event('activate');
  assert(h.stores.has('unrelated-app-cache'));
  assert(!h.stores.has('music-offline-shell-old'));
  assert(h.stores.has('music-offline-shell-20261004-01'));
});

test('readiness detects missing assets and rejects an incomplete installation', async () => {
  const failed = harness({ failAsset: './app.js' });
  await assert.rejects(failed.event('install'), /Incomplete download/);
  const h = harness();
  await h.event('install');
  let reply;
  const msg = { data: { type: 'MUSIC_OFFLINE_STATUS' }, ports: [{ postMessage: value => { reply = value; } }] };
  await h.event('message', msg);
  assert.equal(reply.ready, true);
  h.stores.get('music-offline-shell-20261004-01').delete(origin + '/app.js');
  await h.event('message', msg);
  assert.equal(reply.ready, false);
});

test('worker does not intercept other origins and does not serve HTML for a missing script', async () => {
  const h = harness();
  await h.event('install');
  h.offline();
  assert.equal(await h.event('fetch', { request: { url: 'https://other.example/app.js', method: 'GET', mode: 'cors' } }), undefined);
  await assert.rejects(h.event('fetch', { request: { url: origin + '/missing.js', method: 'GET', mode: 'cors' } }), /Network unavailable/);
});
