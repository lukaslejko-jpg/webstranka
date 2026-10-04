import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';

// Run the complete, unchanged application in an isolated browser-shaped VM.
// SCRIPT_PATH permits the same interaction tests against a captured live build.
const scriptPath = resolve(process.env.SCRIPT_PATH || process.argv[2] ||
  fileURLToPath(new URL('../public/tesla-app.js', import.meta.url)));
const script = new vm.Script(readFileSync(scriptPath, 'utf8'), { filename: scriptPath });

const track = (id, title) => ({ id, title, artist: 'Test artist', duration: 180, art: '' });
const favorites = [1, 2, 3].map(n => track(`fav0000000${n}`, `Favorite ${n}`));
const searched = [1, 2, 3].map(n => track(`sea0000000${n}`, `Search ${n}`));
const history = [1, 2, 3].map(n => track(`rec0000000${n}`, `Recent ${n}`));
const ids = list => list.map(item => item.id);
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };

class ClassList {
  values = new Set();
  add(...names) { names.forEach(name => this.values.add(name)); }
  remove(...names) { names.forEach(name => this.values.delete(name)); }
  contains(name) { return this.values.has(name); }
  toggle(name, force) {
    const enabled = force === undefined ? !this.contains(name) : force;
    enabled ? this.add(name) : this.remove(name);
    return enabled;
  }
}

function createApp({ likes = favorites, recent = [], last = null, ready = true } = {}) {
  let clock = 0, sequence = 0, player;
  const timers = new Map(), elements = new Map(), calls = [];
  const storage = new Map([
    ['teslaYT:likes', JSON.stringify(likes)],
    ['teslaYT:recent', JSON.stringify(recent)],
    ['teslaYT:last', JSON.stringify(last)],
  ]);
  let renderedCards = [], renderedLikes = [];

  class Element {
    constructor(id, dataset = {}) {
      Object.assign(this, { id, dataset, classList: new ClassList(), value: '',
        textContent: '', scrollTop: 0, clientHeight: 600, scrollHeight: 1000,
        style: { setProperty() {} }, listeners: new Map() });
    }
    set innerHTML(html) {
      this.html = html;
      if (this.id === 'grid') {
        // Clickable nodes are derived from the HTML that render() actually emits.
        renderedCards = [...html.matchAll(/class="card" data-i="(\d+)"/g)]
          .map(match => new Element('card', { i: match[1] }));
        renderedLikes = [...html.matchAll(/data-like="(\d+)"/g)]
          .map(match => new Element('like', { like: match[1] }));
      }
    }
    get innerHTML() { return this.html || ''; }
    closest(selector) { return selector === '[data-like]' && this.dataset.like !== undefined ? this : null; }
    addEventListener(name, handler) { this.listeners.set(name, handler); }
    querySelector(selector) { return selector === '.browse' ? browse : selector === '.player' ? playerElement : null; }
    scrollTo({ top }) { this.scrollTop = top; }
    focus() {}
    setPointerCapture() {}
    insertBefore() {}
    getBoundingClientRect() { return { left: 0, width: 1000 }; }
  }
  const elementIds = ['remoteApp', 'desktopApp', 'qrBtn', 'qrBox', 'qrImg', 'grid',
    'queue', 'status', 'heading', 'q', 'searchForm', 'clearSearch', 'go', 'main',
    'splitter', 'swap', 'wide', 'prev', 'play', 'next', 'shuffle', 'repeat', 'seek',
    'elapsed', 'remaining', 'now', 'artist', 'yt'];
  elementIds.forEach(id => elements.set(id, new Element(id)));
  const browse = new Element('browse'), playerElement = new Element('player');
  const views = ['home', 'search', 'likes', 'recent'].map(view => new Element(view, { view }));
  const filters = ['music', 'similar', 'artist'].map(filter => new Element(filter, { filter }));
  const document = {
    body: new Element('body'),
    getElementById(id) {
      assert.ok(elements.has(id), `Unexpected DOM id: ${id}`);
      return elements.get(id);
    },
    querySelector: selector => selector === '.browse' ? browse : null,
    querySelectorAll(selector) {
      if (selector === '.card') return renderedCards;
      if (selector === '[data-like]') return renderedLikes;
      if (selector === '[data-view]') return views;
      if (selector === '[data-filter]') return filters;
      throw new Error(`Unexpected selector: ${selector}`);
    },
    addEventListener() {},
  };

  class FakePlayer {
    constructor(id, config) {
      assert.equal(id, 'yt');
      this.config = config;
      this.state = -1;
      this.videoId = null;
      this.playCount = 0;
      this.pauseCount = 0;
      player = this;
    }
    loadPlaylist(options) {
      const call = { method: 'loadPlaylist', playlist: Array.from(options.playlist), index: options.index };
      calls.push(call);
      this.videoId = call.playlist[call.index] || null;
      this.state = 1;
    }
    loadVideoById(id) { calls.push({ method: 'loadVideoById', id }); this.videoId = id; this.state = 1; }
    playVideo() { this.playCount++; this.state = 1; }
    pauseVideo() { this.pauseCount++; this.state = 2; }
    getPlayerState() { return this.state; }
    getCurrentTime() { return 0; }
    getDuration() { return 180; }
    seekTo() {}
  }
  class Audio {
    play() { return Promise.resolve(); }
    pause() {}
  }
  class LocalURL extends URL {
    static createObjectURL() { return 'blob:local-test-audio'; }
  }
  const schedule = (callback, delay, interval) => {
    const id = ++sequence;
    timers.set(id, { callback, at: clock + Number(delay || 0), interval });
    return id;
  };
  const context = vm.createContext({
    console, document, Audio, Blob, URL: LocalURL, URLSearchParams,
    location: { search: '?mobile=1', origin: 'https://music.test' },
    navigator: {},
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
    },
    YT: { Player: FakePlayer, PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 } },
    fetch: async url => ({
      ok: true, status: 200,
      json: async () => String(url).startsWith('/api/youtube-search')
        ? { items: searched.map(item => ({ youtubeId: item.id, title: item.title,
          artist: item.artist, duration: item.duration, artwork: item.art })) }
        : { seq: 0 },
    }),
    setTimeout: (fn, delay) => schedule(fn, delay, 0),
    clearTimeout: id => timers.delete(id),
    setInterval: (fn, delay) => schedule(fn, delay, Number(delay)),
    clearInterval: id => timers.delete(id),
  });
  context.window = context;
  script.runInContext(context, { timeout: 1000 });
  context.onYouTubeIframeAPIReady();

  const click = element => {
    assert.equal(typeof element?.onclick, 'function', `Missing click handler for ${element?.id}`);
    return element.onclick({ target: element, preventDefault() {}, stopPropagation() {} });
  };
  const fireReady = () => player.config.events.onReady({ target: player });
  if (ready) fireReady();

  return {
    calls, elements, get player() { return player; },
    get cards() { return renderedCards; },
    async search(query = 'fixture search') {
      elements.get('q').value = query;
      elements.get('searchForm').onsubmit({ preventDefault() {} });
      await flush();
      assert.equal(renderedCards.length, searched.length, 'Search response must render actual cards');
    },
    view: view => click(views.find(button => button.dataset.view === view)),
    card: index => click(renderedCards[index]),
    button: id => click(elements.get(id)),
    fireReady,
    async advance(milliseconds) {
      const end = clock + milliseconds;
      for (let count = 0; count < 1000; count++) {
        const next = [...timers].filter(([, task]) => task.at <= end)
          .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
        if (!next) { clock = end; await flush(); return; }
        const [id, task] = next;
        clock = task.at;
        if (task.interval) task.at += task.interval;
        else timers.delete(id);
        task.callback();
        await flush();
      }
      throw new Error('Timer loop exceeded the deterministic test budget');
    },
  };
}

function expectPlaylist(app, list, index) {
  assert.deepEqual(app.calls.at(-1), { method: 'loadPlaylist', playlist: ids(list), index });
  assert.equal(app.player.videoId, list[index].id, 'Loaded video must match the selected card');
  assert.equal(app.elements.get('now').textContent, list[index].title, 'Displayed track must match the loaded video');
}

test('Favorites card selects its displayed list instead of a disjoint search queue', async () => {
  const app = createApp();
  await app.search();
  app.view('likes');
  assert.equal(app.cards.length, favorites.length);
  app.card(0);
  expectPlaylist(app, favorites, 0);
});

test('Selecting the second favorite loads that video at its correct playlist index', async () => {
  const app = createApp();
  await app.search();
  app.view('likes');
  app.card(1);
  expectPlaylist(app, favorites, 1);
});

test('Favorites play after a fresh load with no existing playback queue', () => {
  const app = createApp();
  app.view('likes');
  app.card(1);
  expectPlaylist(app, favorites, 1);
});

test('Recent card selects its displayed list instead of a disjoint search queue', async () => {
  const app = createApp({ recent: history });
  await app.search();
  app.view('recent');
  app.card(1);
  expectPlaylist(app, history, 1);
});

test('Play starts the first visible favorite when no track has been selected', () => {
  const app = createApp();
  app.view('likes');
  app.button('play');
  expectPlaylist(app, favorites, 0);
});

test('Play resumes the paused current track while browsing Favorites without replacing its playlist', async () => {
  const app = createApp();
  await app.search();
  app.card(1);
  expectPlaylist(app, searched, 1);
  app.button('play');
  assert.equal(app.player.getPlayerState(), 2);
  app.view('likes');
  const before = structuredClone(app.calls);
  const playCount = app.player.playCount;
  app.button('play');
  assert.deepEqual(app.calls, before, 'Resume must not load a replacement playlist');
  assert.equal(app.player.playCount, playCount + 1);
  assert.equal(app.player.videoId, searched[1].id);
});

test('Browsing tabs alone preserves the playing track and its active Next queue', async () => {
  const app = createApp();
  await app.search();
  app.card(0);
  const before = structuredClone(app.calls);
  app.view('likes');
  app.view('recent');
  assert.deepEqual(app.calls, before, 'Tab changes must not reload playback');
  assert.equal(app.player.videoId, searched[0].id);
  app.button('shuffle');
  app.button('next');
  expectPlaylist(app, searched, 1);
});

test('Next and Previous stay inside the selected Favorites playlist', async () => {
  const app = createApp();
  await app.search();
  app.view('likes');
  app.card(1);
  app.button('shuffle');
  app.button('next');
  expectPlaylist(app, favorites, 2);
  app.button('prev');
  expectPlaylist(app, favorites, 1);
});

test('A favorite selected before YouTube readiness wins over restoring the stored last track', async () => {
  const app = createApp({ ready: false, last: history[0] });
  await app.search();
  app.view('likes');
  app.card(1);
  assert.equal(app.calls.length, 0, 'A not-ready player must not receive playback loads');
  app.fireReady();
  await app.advance(600);
  expectPlaylist(app, favorites, 1);
});

test('Play requested before YouTube readiness eventually starts the visible Favorites list', async () => {
  const app = createApp({ ready: false });
  app.view('likes');
  app.button('play');
  app.fireReady();
  await app.advance(600);
  expectPlaylist(app, favorites, 0);
});
