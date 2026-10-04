import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

// Run the complete, unchanged application in an isolated browser-shaped VM.
// SCRIPT_PATH permits the same interaction tests against a captured live build.
const scriptPath = resolve(process.env.SCRIPT_PATH || process.argv[2] ||
  fileURLToPath(new URL('../public/tesla-app.js', import.meta.url)));
const script = new vm.Script(readFileSync(scriptPath, 'utf8'), { filename: scriptPath });
const htmlPath = resolve(process.env.HTML_PATH ||
  fileURLToPath(new URL('../public/index.html', import.meta.url)));
const initialHtml = readFileSync(htmlPath, 'utf8');

export const track = (id, title) => ({ id, title, artist: 'Test artist', duration: 180, art: '' });
export const favorites = [1, 2, 3].map(n => track(`fav0000000${n}`, `Favorite ${n}`));
export const searched = [1, 2, 3].map(n => track(`sea0000000${n}`, `Search ${n}`));
export const history = [1, 2, 3].map(n => track(`rec0000000${n}`, `Recent ${n}`));
export const ids = list => list.map(item => item.id);
export const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };

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

export function createApp(options = {}) {
  const { ready = true, denyStorageReads = false, denyStorageWrites = false,
    searchResults = searched, loadState = 1 } = options;
  let clock = 0, sequence = 0, player;
  const timers = new Map(), elements = new Map(), calls = [];
  let deferSearchResponses = false;
  const searchRequests = [];
  // Reusing this Map with createApp({ storage }) simulates a full page reload:
  // all application variables, the DOM, and the iframe player are recreated.
  const storage = options.storage ?? new Map();
  for (const [option, key, fallback] of [['likes', 'teslaYT:likes', favorites],
    ['recent', 'teslaYT:recent', []], ['last', 'teslaYT:last', null]]) {
    if (!options.storage || Object.hasOwn(options, option)) {
      storage.set(key, JSON.stringify(options[option] ?? fallback));
    }
  }
  const windowListeners = new Map(), documentListeners = new Map();
  const listen = (listeners, name, handler) => {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(handler);
  };
  const dispatch = (listeners, name, event = {}) => {
    for (const handler of listeners.get(name) || []) handler({ type: name, ...event });
  };
  let renderedCards = [], renderedLikes = [];

  class Element {
    constructor(id, dataset = {}) {
      Object.assign(this, { id, dataset, classList: new ClassList(), value: '',
        textContent: '', scrollTop: 0, clientHeight: 600, scrollHeight: 1000,
        style: { setProperty() {} }, listeners: new Map(), attributes: new Map() });
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
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    removeAttribute(name) { this.attributes.delete(name); }
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
  // Take initial button attributes from the real page, including the initial
  // Play label. Runtime assertions must not depend on hard-coded DOM defaults.
  for (const match of initialHtml.matchAll(/<\w+\b([^>]*\bid="([^"]+)"[^>]*)>/g)) {
    const element = elements.get(match[2]);
    if (!element) continue;
    for (const [, name, value] of match[1].matchAll(/([\w-]+)="([^"]*)"/g)) {
      element.setAttribute(name, value);
      if (name === 'class') element.classList.add(...value.split(/\s+/));
    }
  }
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
    visibilityState: 'visible',
    addEventListener: (name, handler) => listen(documentListeners, name, handler),
    removeEventListener: (name, handler) => documentListeners.get(name)?.delete(handler),
  };

  class FakePlayer {
    constructor(id, config) {
      assert.equal(id, 'yt');
      this.config = config;
      this.state = -1;
      this.videoId = null;
      this.playCount = 0;
      this.pauseCount = 0;
      this.time = 0;
      this.duration = 180;
      // Loading a video is not proof that a browser permitted playback.
      // Tests may leave the iframe cued/unstarted and emit PLAYING separately.
      this.loadState = loadState;
      player = this;
    }
    loadPlaylist(options) {
      const call = { method: 'loadPlaylist', playlist: Array.from(options.playlist), index: options.index };
      calls.push(call);
      this.videoId = call.playlist[call.index] || null;
      this.state = this.loadState;
    }
    loadVideoById(id) { calls.push({ method: 'loadVideoById', id }); this.videoId = id; this.state = this.loadState; }
    playVideo() { this.playCount++; this.state = 1; }
    pauseVideo() { this.pauseCount++; this.state = 2; }
    getPlayerState() { return this.state; }
    getCurrentTime() { return this.time; }
    getDuration() { return this.duration; }
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
  const searchResponse = tracks => ({
    ok: true, status: 200,
    json: async () => ({ items: tracks.map(item => ({ youtubeId: item.id,
      title: item.title, artist: item.artist, duration: item.duration, artwork: item.art })) }),
  });
  const context = vm.createContext({
    console, document, Audio, Blob, URL: LocalURL, URLSearchParams,
    location: { search: '?mobile=1', origin: 'https://music.test' },
    navigator: {},
    localStorage: {
      getItem: key => {
        if (denyStorageReads) throw new Error('SecurityError: storage is denied');
        return storage.get(key) ?? null;
      },
      setItem: (key, value) => {
        if (denyStorageWrites) throw new Error('QuotaExceededError: storage is unavailable');
        storage.set(key, String(value));
      },
      removeItem: key => {
        if (denyStorageWrites) throw new Error('SecurityError: storage is denied');
        storage.delete(key);
      },
    },
    YT: { Player: FakePlayer, PlayerState: { UNSTARTED: -1, ENDED: 0, PLAYING: 1,
      PAUSED: 2, BUFFERING: 3, CUED: 5 } },
    fetch: async url => {
      if (!String(url).startsWith('/api/youtube-search')) {
        return { ok: true, status: 200, json: async () => ({ seq: 0 }) };
      }
      const request = { url: String(url), settled: false };
      searchRequests.push(request);
      if (!deferSearchResponses) { request.settled = true; return searchResponse(searchResults); }
      return new Promise(resolve => {
        request.respond = tracks => {
          assert.equal(request.settled, false, 'A deferred search must only be completed once');
          request.settled = true;
          resolve(searchResponse(tracks));
        };
      });
    },
    setTimeout: (fn, delay) => schedule(fn, delay, 0),
    clearTimeout: id => timers.delete(id),
    setInterval: (fn, delay) => schedule(fn, delay, Number(delay)),
    clearInterval: id => timers.delete(id),
    addEventListener: (name, handler) => listen(windowListeners, name, handler),
    removeEventListener: (name, handler) => windowListeners.get(name)?.delete(handler),
  });
  context.window = context;
  script.runInContext(context, { timeout: 1000 });
  context.onYouTubeIframeAPIReady();

  const click = element => {
    assert.equal(typeof element?.onclick, 'function', `Missing click handler for ${element?.id}`);
    return element.onclick({ target: element, preventDefault() {}, stopPropagation() {} });
  };
  const fireReady = () => player.config.events.onReady({ target: player });
  const submitSearch = query => {
    elements.get('q').value = query;
    elements.get('searchForm').onsubmit({ preventDefault() {} });
  };
  if (ready) fireReady();

  return {
    calls, elements, storage, views, filters, searchRequests, get player() { return player; },
    get cards() { return renderedCards; },
    get activeView() { return views.find(button => button.classList.contains('active'))?.dataset.view; },
    async search(query = 'fixture search') {
      submitSearch(query);
      await flush();
      assert.equal(renderedCards.length, searchResults.length, 'Search response must render actual cards');
    },
    submitSearch,
    deferSearchResponses: enabled => { deferSearchResponses = enabled; },
    scrollToEnd() {
      browse.scrollTop = browse.scrollHeight - browse.clientHeight;
      return browse.listeners.get('scroll')?.({ type: 'scroll', target: browse });
    },
    view: view => click(views.find(button => button.dataset.view === view)),
    card: index => click(renderedCards[index]),
    like: index => click(renderedLikes[index]),
    button: id => click(elements.get(id)),
    fireReady,
    fireState(state) {
      player.state = state;
      player.config.events.onStateChange({ data: state, target: player });
    },
    fireWindow: (name, event) => dispatch(windowListeners, name, event),
    fireDocument: (name, event) => dispatch(documentListeners, name, event),
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

export function expectPlaylist(app, list, index) {
  assert.deepEqual(app.calls.at(-1), { method: 'loadPlaylist', playlist: ids(list), index });
  assert.equal(app.player.videoId, list[index].id, 'Loaded video must match the selected card');
  assert.equal(app.elements.get('now').textContent, list[index].title, 'Displayed track must match the loaded video');
}

export function expectAppQueue(app, list, index) {
  const visible = [...app.elements.get('queue').innerHTML.matchAll(/<div class="qi([^"]*)">([^<]*)<\/div>/g)];
  const escape = text => String(text).replace(/[&<>"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  }[char]));
  assert.deepEqual(visible.map(match => match[2]), list.map(item => escape(item.title)),
    'The complete application queue must remain displayed in its original order');
  assert.deepEqual(visible.flatMap((match, i) => match[1].trim() === 'on' ? [i] : []), [index],
    'The queue highlight must retain the selected index within the full list');
  const session = JSON.parse(app.storage.get('teslaYT:session'));
  assert.deepEqual(ids(session.queue), ids(list), 'The complete continuation queue must remain persisted');
  assert.equal(session.current.id, list[index].id, 'The persisted current track must match the full-list index');
}

export function expectRestoredPlaylist(app, list, index) {
  const selected = list[index];
  assert.deepEqual(app.calls.at(-1), { method: 'loadPlaylist', playlist: [selected.id], index: 0 },
    'Automatic restoration must send the legacy single-track startup payload');
  assert.equal(app.player.videoId, selected.id, 'The requested video must be the stored last track');
  assert.equal(app.elements.get('now').textContent, selected.title);
  expectAppQueue(app, list, index);
}
