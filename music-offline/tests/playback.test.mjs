import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import test from "node:test";

// Simulated unit regressions: execute the complete app script with module
// imports replaced by fake DOM/audio/storage dependencies. These tests cannot
// prove browser autoplay permission or locked/background playback on iPhone.
const source = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/gm, "");

class Element {
  constructor() {
    this.listeners = {};
    this.dataset = {};
    this.style = { setProperty() {}, removeProperty() {} };
    this.classList = { add() {}, remove() {}, contains() { return false; }, toggle() {} };
    this.innerHTML = "";
    this.scrollTop = 0;
  }
  addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
  emit(name, event = {}) { for (const fn of this.listeners[name] || []) fn(event); }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  setAttribute() {}
  removeAttribute() {}
  click() {}
}

class Audio extends Element {
  constructor() {
    super();
    this._src = "";
    this.currentTime = 0;
    this.duration = 100;
    this.paused = true;
    this.ended = false;
    this.playCalls = 0;
    this.playbackRate = 1;
  }
  get src() { return this._src; }
  set src(value) {
    this._src = value;
    this.currentTime = 0;
    this.paused = true;
    this.ended = false;
  }
  play() {
    this.playCalls++;
    this.paused = false;
    this.emit("play");
    return Promise.resolve();
  }
  pause() { this.paused = true; this.emit("pause"); }
  load() {}
  removeAttribute(name) { if (name === "src") this._src = ""; }
}

const tracks = ids => Object.fromEntries(ids.map(id => [id, {
  id, title: id, artist: "Artist", duration: 100000, addedAt: 0,
}]));
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

function setup({ saved = null, playback = null, read = null } = {}) {
  const audio = new Audio();
  const document = new Element();
  const elements = Object.fromEntries([
    "#view", "#nav", "#mini", "#player", "#modal", "#toast", "#filepick", "#backupPick",
  ].map(selector => [selector, new Element()]));
  document.documentElement = new Element();
  document.querySelector = selector => selector === "#audio" ? audio : elements[selector] || null;
  document.createElement = () => new Element();
  const storage = new Map();
  if (saved) storage.set("music-offline:lib", JSON.stringify({ tracks: saved, playlists: [] }));
  if (playback) storage.set("music-offline:pb", JSON.stringify(playback));
  let urlId = 0;
  const revoked = [], reads = [];
  const context = vm.createContext({
    document, window: new Element(),
    navigator: {
      language: "sk", languages: ["sk"],
      mediaSession: { setActionHandler() {}, setPositionState() {} },
    },
    history: { pushState() {} },
    console: { warn() {} },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    URL: {
      createObjectURL: blob => `blob:${blob.id}:${++urlId}`,
      revokeObjectURL: url => revoked.push(url),
    },
    MediaMetadata: class { constructor(value) { Object.assign(this, value); } },
    setTimeout() { return 1; }, clearTimeout() {},
    detectLocale: () => "sk", isSupportedLocale: () => true,
    translate: (_locale, key) => key,
    translateCount: (_locale, key, count) => `${count} ${key}`,
    LANGUAGES: [], storageEstimate: async () => ({}),
    getArt: async () => null, readMeta: async () => ({}),
    putAudio: async () => {}, putArt: async () => {}, delTrack: async () => {},
    getAudio: id => { reads.push(id); return read ? read(id) : Promise.resolve({ id }); },
  });
  vm.runInContext(`${source}
    globalThis.api = {
      play, next, pause, resume, prev, togglePlay, removeTrack, dismissMini, seekTo,
      get state() { return pb; },
      seed(ids) {
        lib.tracks = Object.fromEntries(ids.map(id => [id, {
          id, title: id, artist: "Artist", duration: 100000, addedAt: 0,
        }]));
        lib.playlists = [{ id: SYS, trackIds: ids, system: true }];
        return ids.map(id => lib.tracks[id]);
      },
    };`, context, { filename: "app.js" });
  return { context, api: context.api, audio, reads, revoked, storage, document, elements };
}

test("deleting the next song prunes the queue and prepared ended starts its successor synchronously", async () => {
  const h = setup(), queue = h.api.seed(["A", "B", "C"]);
  await h.api.play(queue[0], queue, 0);
  await flush();
  h.api.removeTrack("B");
  await flush();
  assert.equal(h.api.state.queue.map(t => t.id).join(","), "A,C");
  const before = h.audio.playCalls;
  h.audio.ended = true;
  h.audio.emit("ended");
  // No microtask/IndexedDB completion between ended and this assertion.
  assert.equal(h.audio.playCalls, before + 1);
  assert.equal(h.api.state.current.id, "C");
  assert.equal(h.api.state.qi, 1);
});

test("restore reindexes a pruned queue, loads paused, restores actual position and directly resumes", async () => {
  const h = setup({
    saved: tracks(["B", "C"]),
    playback: { currentId: "B", queueIds: ["A", "B", "C"], qi: 1, position: 37 },
  });
  await flush();
  assert.equal(h.api.state.qi, 0);
  assert.equal(h.audio.playCalls, 0);
  assert.ok(h.audio.src.startsWith("blob:B:"));
  h.audio.emit("loadedmetadata");
  assert.equal(h.audio.currentTime, 37);
  h.api.togglePlay();
  assert.equal(h.audio.playCalls, 1);
  h.api.next();
  assert.equal(h.api.state.current.id, "C");
});

test("an older IndexedDB completion cannot replace a later selected song", async () => {
  const deferred = {};
  const h = setup({ read: id => new Promise(resolve => { deferred[id] = resolve; }) });
  const queue = h.api.seed(["A", "B"]);
  const first = h.api.play(queue[0], [queue[0]], 0);
  const second = h.api.play(queue[1], [queue[1]], 0);
  deferred.B({ id: "B" });
  await second;
  deferred.A({ id: "A" });
  await first;
  assert.equal(h.api.state.current.id, "B");
  assert.equal(h.audio.playCalls, 1);
  assert.ok(h.revoked.some(url => url.startsWith("blob:A:")));
});

for (const action of ["pause", "dismissMini"]) {
  test(`${action} during a pending read prevents delayed playback`, async () => {
    let resolve;
    const h = setup({ read: () => new Promise(done => { resolve = done; }) });
    const queue = h.api.seed(["A"]);
    const pending = h.api.play(queue[0], queue, 0);
    h.api[action]();
    resolve({ id: "A" });
    await pending;
    assert.equal(h.audio.playCalls, 0);
    assert.equal(h.api.state.current, null);
  });
}

test("Next preserves the prepared shuffle choice and does not reread that audio", async () => {
  const h = setup(), queue = h.api.seed(["A", "B", "C"]);
  h.api.state.shuffle = true;
  vm.runInContext("Math.random = () => 0.75", h.context);
  await h.api.play(queue[0], queue, 0);
  await flush();
  assert.equal(h.reads.filter(id => id === "C").length, 1);
  // A second shuffle draw at Next would choose B instead of prepared C.
  vm.runInContext("Math.random = () => 0.1", h.context);
  h.api.next();
  assert.equal(h.api.state.current.id, "C");
  assert.equal(h.reads.filter(id => id === "C").length, 1);
});

test("position persistence uses actual audio time on progress, seek and page hiding", async () => {
  const h = setup(), queue = h.api.seed(["A"]);
  const savedPosition = () => JSON.parse(h.storage.get("music-offline:pb")).position;
  await h.api.play(queue[0], queue, 0);
  h.audio.currentTime = 18.25;
  h.audio.emit("timeupdate");
  assert.equal(savedPosition(), 18.25);
  h.api.seekTo(41);
  assert.equal(savedPosition(), 41);
  h.audio.currentTime = 42.75;
  h.document.visibilityState = "hidden";
  h.document.emit("visibilitychange");
  assert.equal(savedPosition(), 42.75);
});

test("an old play promise rejection cannot overwrite newer track metadata or show an error", async () => {
  let rejectPlay;
  const h = setup(), queue = h.api.seed(["A", "B"]);
  h.audio.play = function () {
    this.playCalls++;
    return new Promise((_resolve, reject) => { rejectPlay = reject; });
  };
  const first = h.api.play(queue[0], [queue[0]], 0);
  await flush();
  h.audio.play = Audio.prototype.play;
  await h.api.play(queue[1], [queue[1]], 0);
  rejectPlay(new Error("old playback failed"));
  await first;
  assert.equal(h.api.state.current.id, "B");
  assert.equal(h.context.navigator.mediaSession.metadata.title, "B");
  assert.notEqual(h.elements["#toast"].textContent, "playbackFailed");
});

function delayedSelection() {
  const deferred = [];
  let blocked = false;
  const h = setup({ read: id => blocked && id === "C"
    ? new Promise(resolve => { deferred.push(resolve); })
    : Promise.resolve({ id }),
  });
  return Object.assign(h, {
    block() { blocked = true; },
    complete() { for (const resolve of deferred) resolve({ id: "C" }); },
  });
}

test("Resume restores next-song preparation after cancelling a pending different selection", async () => {
  const h = delayedSelection(), queue = h.api.seed(["A", "B", "C"]);
  await h.api.play(queue[0], queue, 0);
  await flush();
  h.block();
  const pending = h.api.play(queue[2], queue, 2);
  h.api.pause();
  h.api.resume();
  await flush();
  const before = h.audio.playCalls;
  h.audio.ended = true;
  h.audio.emit("ended");
  assert.equal(h.audio.playCalls, before + 1);
  assert.equal(h.api.state.current.id, "B");
  h.complete();
  await pending;
  assert.equal(h.api.state.current.id, "B");
});

test("Previous restarting the current song cancels a pending different selection", async () => {
  const h = delayedSelection(), queue = h.api.seed(["A", "B", "C"]);
  await h.api.play(queue[0], queue, 0);
  await flush();
  h.block();
  const pending = h.api.play(queue[2], queue, 2);
  h.audio.currentTime = 20;
  h.api.prev();
  assert.equal(h.audio.currentTime, 0);
  h.complete();
  await pending;
  assert.equal(h.api.state.current.id, "A");
});
