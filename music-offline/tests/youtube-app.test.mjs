import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { SAMPLE_TRACKS, isStoredSample } from "../public/samples.js";
import { parseYouTubeUrl, validYouTubeJobId, isStoredYouTubeAudio } from "../public/youtube-download.js";

// The real app orchestration runs with fake DOM/audio and durable local stores.
// The client transport has its own tests; these exercise actual storage commits,
// cancellation and preservation of the existing playback/view, not iOS proof.
const source = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8").replace(/^import .*;\r?\n/gm, "");
const videoId = "BaW_jenozKc", id = `youtube-${videoId}`, jobId = "1".repeat(32);
const url = `https://www.youtube.com/watch?v=${videoId}`;
const bytes = Buffer.from("bounded test audio bytes");
const blob = new Blob([bytes], { type: "audio/mpeg" });
const meta = { videoId, title: "Test skladba", artist: "Autor", durationMs: 24000, bytes: bytes.length,
  sha256: createHash("sha256").update(bytes).digest("hex"), filePath: `/api/jobs/${jobId}/audio` };
const LIB = "music-offline:lib", DRAFT = "music-offline:youtube-download";
const plain = value => JSON.parse(JSON.stringify(value));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const quota = () => Object.assign(new Error("quota"), { name: "QuotaExceededError" });

class Element {
  constructor() {
    this.listeners = {}; this.dataset = {}; this.style = { setProperty() {}, removeProperty() {} };
    const classes = new Set();
    this.classList = { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x),
      toggle: (x, on) => on ? classes.add(x) : classes.delete(x) };
    this._html = ""; this.htmlWrites = 0; this.scrollTop = 0;
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
  constructor() { super(); this._src = ""; this.currentTime = 0; this.duration = 100; this.paused = true; this.ended = false; this.playCalls = 0; this.playbackRate = 1; }
  get src() { return this._src; }
  set src(value) { this._src = value; this.currentTime = 0; this.paused = true; }
  play() { this.playCalls++; this.paused = false; this.emit("play"); return Promise.resolve(); }
  pause() { this.paused = true; this.emit("pause"); }
  load() {}
}
function setup({ durable = new Map(), audioData = new Map(), transport = null, write = null } = {}) {
  const audio = new Audio(), document = new Element();
  const elements = Object.fromEntries(["#view", "#nav", "#mini", "#player", "#modal", "#toast", "#filepick", "#backupPick", "#searchIn"].map(x => [x, new Element()]));
  const card = new Element();
  const cardParts = Object.fromEntries([".youtube-status", ".youtube-submit", ".youtube-resume", ".youtube-cancel", ".youtube-open"].map(x => [x, new Element()]));
  card.querySelector = selector => cardParts[selector];
  document.documentElement = new Element();
  document.querySelector = selector => selector === "#audio" ? audio : elements[selector] || null;
  document.querySelectorAll = selector => selector === ".youtube-card" && elements["#view"].innerHTML.includes("youtube-card") ? [card] : [];
  document.createElement = () => new Element();
  const calls = [], commits = [], cancels = [];
  const controls = { failMetadata: false };
  class Client {
    async cancel(value) { cancels.push(value); }
    async download(value, options) {
      calls.push({ value, options });
      options.onJob({ id: jobId, videoId, url });
      options.onState("downloading");
      if (transport) await transport(options);
      const stored = await options.getStoredAudio(meta);
      const reused = await isStoredYouTubeAudio(meta, stored);
      return { meta, blob: reused ? stored : blob, reused };
    }
  }
  let objectId = 0;
  const context = vm.createContext({
    document, window: new Element(), Audio, Blob, AbortController,
    parseYouTubeUrl, validYouTubeJobId, isStoredYouTubeAudio, YouTubeDownloadClient: Client,
    SAMPLE_TRACKS, isStoredSample, requestOfflineStorage() {},
    navigator: { language: "sk", languages: ["sk"], mediaSession: { setActionHandler() {}, setPositionState() {} } },
    history: { pushState() {} }, console: { warn() {} },
    localStorage: { getItem: key => durable.get(key), setItem(key, value) {
      if (key === LIB && controls.failMetadata) throw quota();
      durable.set(key, value); if (key === LIB) commits.push("metadata");
    } },
    URL: { createObjectURL: () => `blob:test-${++objectId}`, revokeObjectURL() {} },
    MediaMetadata: class { constructor(value) { Object.assign(this, value); } },
    setTimeout() { return 1; }, clearTimeout() {}, detectLocale: () => "sk", isSupportedLocale: () => true,
    translate: (_locale, key) => key, translateCount: (_locale, key, count) => `${count} ${key}`,
    LANGUAGES: [], storageEstimate: async () => ({}), getArt: async () => null, readMeta: async () => ({}), putArt: async () => {},
    delTrack: async key => audioData.delete(key), getAudio: async key => audioData.get(key),
    async putAudio(key, value) { if (write) await write(key, value); audioData.set(key, value); commits.push("audio"); },
  });
  vm.runInContext(`${source}\n globalThis.api = {
    downloadYouTube, cancelYouTube, play, renderView, refreshYouTubeCards,
    setUrl(value) { youtubeUrl = value; saveYouTubeDraft(); },
    get status() { return { state: youtubeState, error: youtubeError, busy: !!youtubeActive, job: youtubeJob, savedId: youtubeSavedId, url: youtubeUrl }; },
    get lib() { return lib; }, get pb() { return pb; },
    get ui() { return { view, plOpen, searchQ, libraryTab }; },
    search(value) { searchQ = value; navTo("search"); },
    seed(ids) { lib.tracks = Object.fromEntries(ids.map(id => [id, { id, title:id, artist:"Autor", duration:100000, lastPlayedAt:0 }]));
      lib.playlists = [{ id: SYS, trackIds:ids, system:true }]; return ids.map(id => lib.tracks[id]); }
  };`, context);
  return { api: context.api, audio, elements, card, cardParts, durable, audioData, calls, commits, cancels, controls };
}

test("YouTube save commits actual audio before metadata and needs an explicit user action", async () => {
  const h = setup(); await flush(); assert.equal(h.calls.length, 0);
  h.api.setUrl(url); await h.api.downloadYouTube();
  assert.deepEqual(h.commits, ["audio", "metadata"]);
  assert.equal(h.audioData.get(id), blob);
  assert.equal(h.api.lib.tracks[id].sourceId, videoId);
  assert.equal(h.api.lib.tracks[id].sourceUrl, url);
  assert.equal(h.api.lib.tracks[id].duration, 24000);
  assert.equal(h.api.status.state, "done"); assert.equal(h.api.status.savedId, id);
  assert.equal(h.audio.playCalls, 0); assert.equal(h.api.pb.current, null);
  assert.equal(h.api.ui.view, "home");
  assert.deepEqual(plain(h.api.lib.playlists[0].trackIds), [id]);
  await h.api.downloadYouTube();
  assert.equal(h.calls.length, 1); assert.equal(h.api.status.state, "existing");
});

test("double click starts once and navigation/input/playing queue stay intact on completion", async () => {
  const wait = deferred();
  const h = setup({ transport: () => wait.promise, audioData: new Map([["A", blob], ["B", blob]]) });
  const q = h.api.seed(["A", "B"]); await h.api.play(q[0], q, 0); await flush();
  h.audio.currentTime = 13.4; h.api.setUrl(url);
  const pending = h.api.downloadYouTube(); await flush();
  await h.api.downloadYouTube(); assert.equal(h.calls.length, 1);
  h.api.search("rozpísané vyhľadávanie"); h.elements["#view"].scrollTop = 153;
  h.elements["#searchIn"].value = "rozpísané vyhľadávanie"; h.elements["#searchIn"].selectionStart = 8;
  h.api.setUrl("https://youtu.be/jNQXAC9IVRw");
  const before = { pb: plain(h.api.pb), src: h.audio.src, writes: h.elements["#view"].htmlWrites, nav: h.elements["#nav"].htmlWrites, calls: h.audio.playCalls };
  wait.resolve(); await pending;
  assert.deepEqual(plain(h.api.pb), before.pb); assert.equal(h.audio.src, before.src);
  assert.equal(h.audio.currentTime, 13.4); assert.equal(h.audio.playCalls, before.calls);
  assert.equal(h.api.ui.view, "search"); assert.equal(h.api.ui.searchQ, "rozpísané vyhľadávanie");
  assert.equal(h.elements["#view"].htmlWrites, before.writes); assert.equal(h.elements["#nav"].htmlWrites, before.nav);
  assert.equal(h.elements["#view"].scrollTop, 153); assert.equal(h.elements["#searchIn"].selectionStart, 8);
  assert.equal(h.api.status.url, "https://youtu.be/jNQXAC9IVRw");
});

test("a failed audio write cannot publish a track or claim offline success", async () => {
  const h = setup({ write() { throw quota(); } }); h.api.setUrl(url); await h.api.downloadYouTube();
  assert.equal(h.api.lib.tracks[id], undefined); assert.equal(h.api.status.savedId, null);
  assert.equal(h.api.status.error, "QUOTA"); assert.equal(h.api.status.job.id, jobId);
});

test("metadata quota failure is resumable and reuses the committed Blob", async () => {
  const h = setup(); h.api.setUrl(url); h.controls.failMetadata = true; await h.api.downloadYouTube();
  assert.equal(h.audioData.get(id), blob); assert.equal(h.api.lib.tracks[id], undefined);
  assert.equal(h.api.status.error, "QUOTA"); assert.equal(h.api.status.savedId, null);
  h.controls.failMetadata = false; await h.api.downloadYouTube(true);
  assert.deepEqual(h.commits, ["audio", "metadata"]); assert.equal(h.api.status.state, "done");
  assert.equal(h.calls[1].options.resumeJobId, jobId);
});

test("cancelled late network completion cannot change library or show saved", async () => {
  const wait = deferred(), h = setup({ transport: () => wait.promise });
  h.api.setUrl(url); const pending = h.api.downloadYouTube(); await flush();
  h.api.cancelYouTube(); wait.resolve(); await pending;
  assert.equal(h.calls[0].options.signal.aborted, true);
  assert.equal(h.api.status.state, "cancelled"); assert.equal(h.api.status.savedId, null);
  assert.equal(h.api.lib.tracks[id], undefined); assert.deepEqual(h.commits, []);
});

test("cancel while IndexedDB is committing cannot publish metadata after cancellation", async () => {
  const wait = deferred(), h = setup({ write: () => wait.promise });
  h.api.setUrl(url); const pending = h.api.downloadYouTube();
  while (h.api.status.state !== "saving") await new Promise(resolve => setImmediate(resolve));
  h.api.cancelYouTube(); wait.resolve(); await pending;
  assert.equal(h.api.status.state, "cancelled"); assert.equal(h.api.lib.tracks[id], undefined);
  assert.deepEqual(h.commits, ["audio"]);
});

test("refresh restores draft/job without network; user resumes only on request", async () => {
  const durable = new Map([[DRAFT, JSON.stringify({ url, job: { id: jobId, videoId, url } })]]);
  const h = setup({ durable }); await flush();
  assert.equal(h.api.status.state, "resume"); assert.equal(h.api.status.url, url); assert.equal(h.calls.length, 0);
  await h.api.downloadYouTube(true);
  assert.equal(h.calls[0].options.resumeJobId, jobId); assert.equal(h.api.status.state, "done");
});
