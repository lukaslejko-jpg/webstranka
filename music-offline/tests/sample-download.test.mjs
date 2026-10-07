import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import test from "node:test";
import { SAMPLE_TRACKS, downloadSample, isStoredSample } from "../public/samples.js";

// Execute the actual app orchestration against committed Blob storage and
// localStorage metadata. DOM/audio are simulated; these tests do not establish
// Safari storage retention, audible playback, or iPhone background behavior.
const source = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/gm, "");
const fixtureBytes = new Map(SAMPLE_TRACKS.map(track => [
  track.id, fs.readFileSync(new URL(`../public/${track.path}`, import.meta.url)),
]));
const fixtures = new Map(SAMPLE_TRACKS.map(track => [
  track.id, new Blob([fixtureBytes.get(track.id)], { type: "audio/mpeg" }),
]));
const sampleIds = SAMPLE_TRACKS.map(track => track.id);
const LIB_KEY = "music-offline:lib";
const SYS = "system:imported";
const SAMPLE_PLAYLIST = "samples:bach-v1";
const plain = value => JSON.parse(JSON.stringify(value));
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const quotaError = () => Object.assign(new Error("Simulated storage quota"), { name: "QuotaExceededError" });

class Element {
  constructor() {
    this.listeners = {};
    this.dataset = {};
    this.style = { setProperty() {}, removeProperty() {} };
    const classes = new Set();
    this.classList = {
      add: value => classes.add(value), remove: value => classes.delete(value),
      contains: value => classes.has(value), toggle() {},
    };
    this._html = "";
    this.htmlWrites = 0;
    this.scrollTop = 0;
  }
  get innerHTML() { return this._html; }
  set innerHTML(value) { this._html = value; this.htmlWrites++; }
  addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
  emit(name, event = {}) { for (const fn of this.listeners[name] || []) fn(event); }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  setAttribute() {}
  removeAttribute() {}
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
  set src(value) { this._src = value; this.currentTime = 0; this.paused = true; }
  play() { this.playCalls++; this.paused = false; this.emit("play"); return Promise.resolve(); }
  pause() { this.paused = true; this.emit("pause"); }
  load() {}
  removeAttribute(name) { if (name === "src") this._src = ""; }
}

function setup({ audioData = new Map(), durable = new Map(), download = null, write = null } = {}) {
  const audio = new Audio(), document = new Element(), sampleSlot = new Element();
  const elements = Object.fromEntries([
    "#view", "#nav", "#mini", "#player", "#modal", "#toast", "#filepick", "#backupPick", "#searchIn",
  ].map(selector => [selector, new Element()]));
  document.documentElement = new Element();
  document.querySelector = selector => selector === "#audio" ? audio : elements[selector] || null;
  document.querySelectorAll = selector => selector === ".sample-slot" && elements["#view"].innerHTML.includes("sample-slot") ? [sampleSlot] : [];
  document.createElement = () => new Element();
  const downloads = [], writes = [], events = [];
  const controls = { failMetadata: false, persistenceRequests: 0 };
  let urlId = 0;
  const context = vm.createContext({
    document, window: new Element(), Audio, Blob,
    SAMPLE_TRACKS, isStoredSample,
    requestOfflineStorage() { controls.persistenceRequests++; },
    async downloadSample(track) {
      downloads.push(track.id);
      return download ? download(track) : fixtures.get(track.id);
    },
    navigator: {
      language: "sk", languages: ["sk"],
      mediaSession: { setActionHandler() {}, setPositionState() {} },
    },
    history: { pushState() {} }, console: { warn() {} },
    localStorage: {
      getItem: key => durable.get(key),
      setItem(key, value) {
        if (key === LIB_KEY && controls.failMetadata) throw quotaError();
        durable.set(key, value);
        events.push({ kind: "metadata", key, value });
      },
    },
    URL: { createObjectURL: () => `blob:sample-test-${++urlId}`, revokeObjectURL() {} },
    MediaMetadata: class { constructor(value) { Object.assign(this, value); } },
    setTimeout() { return 1; }, clearTimeout() {},
    detectLocale: () => "sk", isSupportedLocale: () => true,
    translate: (_locale, key, vars) => vars ? `${key}:${JSON.stringify(vars)}` : key,
    translateCount: (_locale, key, count) => `${count} ${key}`,
    LANGUAGES: [], storageEstimate: async () => ({}),
    getArt: async () => null, readMeta: async () => ({}), putArt: async () => {},
    delTrack: async id => audioData.delete(id),
    getAudio: async id => audioData.get(id),
    async putAudio(id, blob) {
      if (write) await write(id, blob);
      audioData.set(id, blob);
      writes.push(id);
      events.push({ kind: "audio", id });
    },
  });
  vm.runInContext(`${source}\n
    globalThis.api = {
      downloadSamples, checkSavedSamples, sampleCard, play,
      get lib() { return lib; },
      get pb() { return pb; },
      get status() { return { busy: sampleBusy, error: sampleError, message: sampleMessage, saved: [...savedSamples] }; },
      get ui() { return { view, plOpen, searchQ, libraryTab }; },
      search(query) { searchQ = query; navTo("search"); },
      seed(ids) {
        lib.tracks = Object.fromEntries(ids.map(id => [id, { id, title: id, artist: "Artist", duration: 100000, lastPlayedAt: 0 }]));
        lib.playlists = [{ id: SYS, trackIds: ids, system: true }];
        return ids.map(id => lib.tracks[id]);
      },
    };`, context, { filename: "app.js" });
  return { api: context.api, audio, audioData, durable, elements, sampleSlot, controls, downloads, writes, events };
}

function assertSaved(h, expectedIds) {
  const metadata = JSON.parse(h.durable.get(LIB_KEY));
  assert.deepEqual(sampleIds.filter(id => metadata.tracks[id]), expectedIds);
  assert.deepEqual(metadata.playlists.find(p => p.id === SYS).trackIds.filter(id => sampleIds.includes(id)), expectedIds);
  assert.deepEqual(metadata.playlists.find(p => p.id === SAMPLE_PLAYLIST).trackIds, expectedIds);
  for (const id of expectedIds) assert.ok(h.audioData.get(id) instanceof Blob);
}

test("samples download only on request; committed audio and both library lists survive reload", async () => {
  const h = setup();
  await flush();
  assert.deepEqual(h.downloads, []);
  await h.api.downloadSamples();
  assertSaved(h, sampleIds);
  assert.deepEqual(h.downloads, sampleIds);
  assert.equal(h.api.status.error, false);
  assert.match(h.api.sampleCard(), /sampleReadyHeading/);
  for (const track of SAMPLE_TRACKS) {
    assert.equal(h.audioData.get(track.id), fixtures.get(track.id));
    assert.equal(h.api.lib.tracks[track.id].title, track.title);
    assert.equal(h.api.lib.tracks[track.id].duration, track.duration);
    const audioIndex = h.events.findIndex(event => event.kind === "audio" && event.id === track.id);
    const metadataIndex = h.events.findIndex(event => event.kind === "metadata" && event.key === LIB_KEY && JSON.parse(event.value).tracks[track.id]);
    assert.ok(audioIndex >= 0 && audioIndex < metadataIndex, "audio commit precedes visible metadata");
  }
  const reopened = setup({ audioData: h.audioData, durable: h.durable });
  await flush();
  assert.deepEqual(plain(reopened.api.status.saved), sampleIds);
  assert.match(reopened.api.sampleCard(), /sampleReadyHeading/);
  assert.deepEqual(reopened.downloads, []);
});

test("double click starts one operation and later retry does not duplicate stored samples", async () => {
  let finishFirst;
  const blocked = new Promise(resolve => { finishFirst = resolve; });
  const h = setup({ download: track => track.id === sampleIds[0] ? blocked : fixtures.get(track.id) });
  const first = h.api.downloadSamples();
  const second = h.api.downloadSamples();
  assert.equal(h.api.status.busy, true);
  assert.match(h.api.sampleCard(), /disabled/);
  await flush();
  assert.deepEqual(h.downloads, [sampleIds[0]]);
  finishFirst(fixtures.get(sampleIds[0]));
  await Promise.all([first, second]);
  await h.api.downloadSamples();
  assertSaved(h, sampleIds);
  assert.deepEqual(h.downloads, sampleIds);
  assert.deepEqual(h.writes, sampleIds);
  assert.equal(h.api.lib.playlists.filter(p => p.id === SAMPLE_PLAYLIST).length, 1);
});

test("a failed second download preserves the first and retry downloads only missing audio", async () => {
  let failSecond = true;
  const h = setup({ download: track => {
    if (track.id === sampleIds[1] && failSecond) throw new Error("Network disconnected");
    return fixtures.get(track.id);
  } });
  await h.api.downloadSamples();
  assertSaved(h, [sampleIds[0]]);
  assert.equal(h.api.status.busy, false);
  assert.equal(h.api.status.error, true);
  assert.match(h.api.status.message, /sampleDownloadError.*"n":1/);
  assert.doesNotMatch(h.api.sampleCard(), /sampleReadyHeading/);
  failSecond = false;
  await h.api.downloadSamples();
  assertSaved(h, sampleIds);
  assert.deepEqual(h.downloads, [sampleIds[0], sampleIds[1], sampleIds[1], sampleIds[2]]);
  assert.deepEqual(h.writes, sampleIds);
  assert.equal(h.api.status.error, false);
});

test("an audio storage failure cannot publish a song or show complete download status", async () => {
  const h = setup({ write: async () => { throw quotaError(); } });
  await h.api.downloadSamples();
  assert.equal(h.audioData.size, 0);
  assert.equal(h.durable.has(LIB_KEY), false);
  assert.deepEqual(Object.keys(h.api.lib.tracks), []);
  assert.deepEqual(plain(h.api.status.saved), []);
  assert.match(h.api.status.message, /sampleStorageError.*"n":0/);
  assert.doesNotMatch(h.api.sampleCard(), /sampleReadyHeading/);
});

test("metadata quota failure remains retriable without redownloading the committed Blob", async () => {
  const h = setup();
  h.controls.failMetadata = true;
  await h.api.downloadSamples();
  assert.equal(h.audioData.get(sampleIds[0]), fixtures.get(sampleIds[0]));
  assert.equal(h.durable.has(LIB_KEY), false);
  assert.deepEqual(Object.keys(h.api.lib.tracks), []);
  assert.deepEqual(plain(h.api.status.saved), []);
  assert.match(h.api.status.message, /sampleStorageError.*"n":0/);
  assert.doesNotMatch(h.api.sampleCard(), /sampleReadyHeading/);
  h.controls.failMetadata = false;
  await h.api.downloadSamples();
  assertSaved(h, sampleIds);
  assert.deepEqual(h.downloads, sampleIds);
  assert.deepEqual(h.writes, sampleIds);
});

test("metadata alone cannot report a missing or truncated stored sample ready", async () => {
  const h = setup();
  await h.api.downloadSamples();
  h.audioData.delete(sampleIds[1]);
  h.audioData.set(sampleIds[2], new Blob(["truncated"], { type: "audio/mpeg" }));
  const reopened = setup({ audioData: h.audioData, durable: h.durable });
  await flush();
  assert.deepEqual(plain(reopened.api.status.saved), [sampleIds[0]]);
  assert.doesNotMatch(reopened.api.sampleCard(), /sampleReadyHeading/);
  await reopened.api.downloadSamples();
  assert.deepEqual(reopened.downloads, sampleIds.slice(1));
  assertSaved(reopened, sampleIds);
});

test("finishing downloads preserves current playback and a search opened while awaiting the network", async () => {
  let finishFirst;
  const blocked = new Promise(resolve => { finishFirst = resolve; });
  const audioData = new Map([["existing-A", new Blob(["audio A"])], ["existing-B", new Blob(["audio B"])]]);
  const h = setup({ audioData, download: track => track.id === sampleIds[0] ? blocked : fixtures.get(track.id) });
  const queue = h.api.seed(["existing-A", "existing-B"]);
  await h.api.play(queue[0], queue, 0);
  await flush();
  h.audio.currentTime = 17.25;
  h.elements["#player"].classList.add("open");
  const beforePlayback = plain(h.api.pb), beforeSource = h.audio.src, beforePlayCalls = h.audio.playCalls;
  const pending = h.api.downloadSamples();
  await flush();
  h.api.search("Bach café");
  h.elements["#searchIn"].value = "Bach café";
  h.elements["#searchIn"].selectionStart = 2;
  h.elements["#searchIn"].selectionEnd = 5;
  h.elements["#view"].scrollTop = 137;
  const viewWrites = h.elements["#view"].htmlWrites, navWrites = h.elements["#nav"].htmlWrites;
  finishFirst(fixtures.get(sampleIds[0]));
  await pending;
  assert.deepEqual(plain(h.api.pb), beforePlayback);
  assert.equal(h.audio.src, beforeSource);
  assert.equal(h.audio.currentTime, 17.25);
  assert.equal(h.audio.playCalls, beforePlayCalls);
  assert.equal(h.audio.paused, false);
  assert.equal(h.api.ui.view, "search");
  assert.equal(h.api.ui.searchQ, "Bach café");
  assert.equal(h.elements["#view"].htmlWrites, viewWrites);
  assert.equal(h.elements["#nav"].htmlWrites, navWrites);
  assert.equal(h.elements["#view"].scrollTop, 137);
  assert.equal(h.elements["#searchIn"].value, "Bach café");
  assert.equal(h.elements["#searchIn"].selectionStart, 2);
  assert.equal(h.elements["#searchIn"].selectionEnd, 5);
  assert.equal(h.elements["#player"].classList.contains("open"), true);
});

test("real sample downloader verifies the packaged bytes and returns an MP3 Blob", async t => {
  const track = SAMPLE_TRACKS[0], bytes = fixtureBytes.get(track.id);
  const fetchMock = t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url.href, new URL(track.path, new URL("../public/samples.js", import.meta.url)).href);
    assert.equal(options.credentials, "omit");
    assert.equal(options.redirect, "error");
    return new Response(bytes, { status: 200, headers: { "content-type": "audio/mpeg", "content-length": String(bytes.length) } });
  });
  const blob = await downloadSample(track);
  assert.ok(blob instanceof Blob);
  assert.equal(blob.type, "audio/mpeg");
  assert.equal(blob.size, track.bytes);
  assert.deepEqual(Buffer.from(await blob.arrayBuffer()), bytes);
  assert.equal(fetchMock.mock.callCount(), 1);
});

for (const scenario of ["http-error", "html-body", "wrong-content-length", "truncated-body", "incorrect-hash"]) {
  test(`real sample downloader rejects ${scenario} without returning a saved Blob`, async t => {
    const track = SAMPLE_TRACKS[0];
    let bytes = Buffer.from(fixtureBytes.get(track.id));
    const headers = { "content-type": "audio/mpeg" };
    let status = 200, expected = /Audio download unavailable/;
    if (scenario === "http-error") status = 404;
    if (scenario === "html-body") headers["content-type"] = "text/html";
    if (scenario === "wrong-content-length") {
      headers["content-length"] = String(track.bytes - 1);
      expected = /Incomplete audio download/;
    }
    if (scenario === "truncated-body") { bytes = bytes.subarray(0, bytes.length - 1); expected = /Incomplete audio download/; }
    if (scenario === "incorrect-hash") { bytes[bytes.length - 1] ^= 1; expected = /Audio integrity check failed/; }
    t.mock.method(globalThis, "fetch", async () => new Response(bytes, { status, headers }));
    await assert.rejects(downloadSample(track), expected);
  });
}
