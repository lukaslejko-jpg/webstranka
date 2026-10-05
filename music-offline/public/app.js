// app.js — Kasette. Offline music player: all app logic (state, rendering,
// audio engine, import, playlists, themes) lives in this single module.

import { requestOfflineStorage } from "./offline.js";
import { putAudio, getAudio, putArt, getArt, delTrack, storageEstimate } from "./store.js";
import { readMeta } from "./meta.js";
import { LANGUAGES, detectLocale, isSupportedLocale, translate, translateCount } from "./i18n.js";
import { SAMPLE_TRACKS, downloadSample, isStoredSample } from "./samples.js";
import { YouTubeDownloadClient, parseYouTubeUrl, validYouTubeJobId, isStoredYouTubeAudio } from "./youtube-download.js";

// ───────────────────────── themes ─────────────────────────
const ACCENTS = [
  { name: "Tape Orange", hex: "#ff5500" },
  { name: "Signal Green", hex: "#22c55e" },
  { name: "Ocean Blue", hex: "#3b82f6" },
  { name: "Neon Pink", hex: "#ec4899" },
  { name: "Purple", hex: "#a855f7" },
];
const BACKGROUNDS = [
  { name: "Indigo", a: "#332c66", b: "#1c1840" },
  { name: "Night", a: "#233467", b: "#161c34" },
  { name: "Charcoal", a: "#2b2b34", b: "#17171c" },
  { name: "Crimson", a: "#6b1030", b: "#2c0b17" },
];

// ───────────────────────── icons ─────────────────────────
const P = {
  home: '<path d="M3 10.6 12 3l9 7.6"/><path d="M5.5 9.4V21h13V9.4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  library: '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
  settings:
    '<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/>',
  play: '<path d="M6 4 20 12 6 20Z" style="fill:currentColor;stroke:none"/>',
  pause: '<path d="M7 4v16M17 4v16" style="stroke-width:3.4"/>',
  next: '<path d="M5 4 15 12 5 20Z" style="fill:currentColor;stroke:none"/><path d="M19 5v14"/>',
  prev: '<path d="M19 4 9 12 19 20Z" style="fill:currentColor;stroke:none"/><path d="M5 5v14"/>',
  shuffle:
    '<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/>',
  repeat:
    '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  heart:
    '<path d="M19 14c1.5-1.5 3-3.4 3-5.6A4.4 4.4 0 0 0 12 5 4.4 4.4 0 0 0 2 8.4c0 2.2 1.5 4.1 3 5.6l7 7Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  more:
    '<circle cx="12" cy="5" r="1.6" style="fill:currentColor;stroke:none"/><circle cx="12" cy="12" r="1.6" style="fill:currentColor;stroke:none"/><circle cx="12" cy="19" r="1.6" style="fill:currentColor;stroke:none"/>',
  folder:
    '<path d="M21 18V9a2 2 0 0 0-2-2h-7l-2-3H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2Z"/><path d="M12 11v6M9 14h6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
};
const ic = (n, cls = "") =>
  `<svg class="svg ${cls}" viewBox="0 0 24 24">${P[n] || ""}</svg>`;

// ───────────────────────── i18n ─────────────────────────
const deviceLocale = () => detectLocale(navigator.languages?.length ? navigator.languages : [navigator.language || "en"]);
let LOCALE = deviceLocale();
document.documentElement.lang = LOCALE;

// Track objects already use the variable name `t` throughout this module.
const i18n = (key, vars) => translate(LOCALE, key, vars);
const nounSong = n => translateCount(LOCALE, "song", n);
const songsAddedMsg = n => translateCount(LOCALE, "songsAdded", n);
const songsRestoredMsg = n => translateCount(LOCALE, "songsRestored", n);

// ───────────────────────── state ─────────────────────────
const SYS = "system:imported";
const LS_LIB = "music-offline:lib";
const LS_SET = "music-offline:settings";
const LS_PB = "music-offline:pb";

let lib = { tracks: {}, playlists: [] };
// New installs start in Slovak; an explicit language choice is persisted.
let settings = { accentIdx: 2, bgIdx: 1, mode: "dark", locale: "sk", playlistsEnabled: true };
let pb = { current: null, queue: [], qi: -1, shuffle: false, repeat: "off", playing: false, position: 0 };

const artURLs = {}; // id -> cover art objectURL (in-memory, per session)
let curURL = null; // objectURL of the audio currently loaded
let loadedTrackId = null, playRequest = 0, pendingPlayId = null;
let preparedNext = null, preparedRestore = null, restorePosition = null;
let lastSavedPosition = 0;
let seeking = false;
let miniSwiped = false; // ignore the synthetic click after a mini-player swipe

let view = "home"; // home | search | library | settings
let plOpen = null; // id of the open playlist (detail view)
let searchQ = "";
let libraryTab = "songs";
const SAMPLE_PLAYLIST = "samples:bach-v1";
const savedSamples = new Set();
let sampleBusy = false, sampleMessage = "", sampleError = false;
const LS_YOUTUBE = "music-offline:youtube-download";
let youtubeUrl = "", youtubeJob = null, youtubeState = "idle", youtubeError = null;
let youtubeActive = null, youtubeSavedId = null;

const $ = (s, r = document) => r.querySelector(s);
const audio = $("#audio");
const elView = $("#view");
const elNav = $("#nav");
const elMini = $("#mini");
const elPlayer = $("#player");
const elModal = $("#modal");
const elToast = $("#toast");

// ───────────────────────── utils ─────────────────────────
function esc(s) {
  return String(s == null ? "" : s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]),
  );
}
// Used only by the Android SAF export path, which needs the backup as a
// base64 string to hand to @capacitor/filesystem — this reads the whole blob
// into memory, fine for typical libraries but worth knowing for very large ones.
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}
function fmt(ms) {
  if (!ms || ms <= 0) return "0:00";
  const s = Math.floor(ms / 1000),
    h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    ss = s % 60;
  const p = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(ss)}` : `${m}:${p(ss)}`;
}
let toastT;
function toast(msg) {
  elToast.textContent = msg;
  elToast.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => elToast.classList.remove("show"), 1900);
}
const accent = () => ACCENTS[settings.accentIdx] || ACCENTS[0];

// ───────────────────────── persistence ─────────────────────────
function loadAll() {
  // Settings first: resolves LOCALE (device language, or the user's explicit
  // pick from the language selector) before anything below needs i18n().
  try {
    const s = JSON.parse(localStorage.getItem(LS_SET) || "null");
    if (s) settings = { ...settings, ...s };
  } catch {}
  LOCALE = isSupportedLocale(settings.locale) ? settings.locale : deviceLocale();
  document.documentElement.lang = LOCALE;
  try {
    const l = JSON.parse(localStorage.getItem(LS_LIB) || "null");
    if (l && l.tracks) lib = l;
  } catch {}
  if (!lib.playlists || !lib.playlists.length)
    lib.playlists = [{ id: SYS, name: i18n("importedSongsPlaylist"), system: true, trackIds: [], createdAt: Date.now() }];
  if (!lib.playlists.find((p) => p.id === SYS))
    lib.playlists.unshift({ id: SYS, name: i18n("importedSongsPlaylist"), system: true, trackIds: [], createdAt: Date.now() });
  if (typeof settings.playlistsEnabled !== "boolean") {
    settings.playlistsEnabled = lib.playlists.some(p => !p.system);
  }
  // the system playlist always keeps a fixed name (migrates old installs)
  const _imp = lib.playlists.find((p) => p.id === SYS);
  if (_imp) _imp.name = i18n("importedSongsPlaylist");
  try {
    const p = JSON.parse(localStorage.getItem(LS_PB) || "null");
    if (p) {
      pb.shuffle = !!p.shuffle;
      pb.repeat = ["off", "all", "one"].includes(p.repeat) ? p.repeat : "off";
      pb.queue = (p.queueIds || []).map((id) => lib.tracks[id]).filter(Boolean);
      pb.current = p.currentId ? lib.tracks[p.currentId] || null : null;
      pb.position = Number.isFinite(p.position) && p.position >= 0 ? p.position : 0;
      repairQueue();
    }
  } catch {}
}
const saveLib = () => localStorage.setItem(LS_LIB, JSON.stringify(lib));
const saveSet = () => localStorage.setItem(LS_SET, JSON.stringify(settings));
const savePB = () => {
  if (loadedTrackId === pb.current?.id && !restorePosition && Number.isFinite(audio.currentTime))
    pb.position = audio.ended ? 0 : audio.currentTime;
  lastSavedPosition = pb.position;
  localStorage.setItem(
    LS_PB,
    JSON.stringify({
      currentId: pb.current ? pb.current.id : null,
      queueIds: pb.queue.map((t) => t.id),
      qi: pb.qi,
      shuffle: pb.shuffle,
      repeat: pb.repeat,
      position: pb.position,
    }),
  );
};

function applyTheme() {
  const r = document.documentElement.style;
  r.setProperty("--accent", accent().hex);
  document.documentElement.dataset.theme = settings.mode;
  // Dark mode picks its background from BACKGROUNDS; light mode uses the
  // fixed light palette from [data-theme="light"] in index.html, so any
  // inline --bg0/--bg1 override must be cleared or it'd win over that rule.
  if (settings.mode === "dark") {
    const bg = BACKGROUNDS[settings.bgIdx] || BACKGROUNDS[0];
    r.setProperty("--bg0", bg.a);
    r.setProperty("--bg1", bg.b);
  } else {
    r.removeProperty("--bg0");
    r.removeProperty("--bg1");
  }
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute("content", settings.mode === "dark" ? "#131120" : "#ffffff");
  syncStatusBar();
}

// In the Android app, the native status bar sits outside the WebView and
// doesn't pick up CSS — without this its icons stay white-on-white on the
// light theme. Uses the runtime plugin bridge (no bundler needed): it's a
// no-op when running as a plain web page, where Capacitor isn't present.
function syncStatusBar() {
  const light = settings.mode !== "dark";
  const bg = light ? "#ffffff" : "#131120";

  // @capacitor/status-bar's Style names describe the CONTENT color, not the
  // background: Style.Light -> dark icons (for a light background),
  // Style.Dark -> light icons (for a dark background). Easy to get backwards.
  const StatusBar = window.Capacitor?.Plugins?.StatusBar;
  if (StatusBar) {
    StatusBar.setStyle({ style: light ? "LIGHT" : "DARK" }).catch(() => {});
    StatusBar.setBackgroundColor({ color: bg }).catch(() => {});
  }

  // The bottom 3-button/gesture navigation bar isn't covered by
  // @capacitor/status-bar at all; ThemeBars is this app's own tiny native
  // plugin (android/.../ThemeBarsPlugin.java) for just that.
  const ThemeBars = window.Capacitor?.Plugins?.ThemeBars;
  if (ThemeBars) ThemeBars.setLight({ light, color: bg }).catch(() => {});
}

// ───────────────────────── accessors ─────────────────────────
const imported = () => lib.playlists.find((p) => p.id === SYS) || { trackIds: [] };
const allTracks = () => imported().trackIds.map((id) => lib.tracks[id]).filter(Boolean);
const recentTracks = (n = 20) =>
  Object.values(lib.tracks)
    .filter((t) => t.lastPlayedAt > 0)
    .sort((a, b) => b.lastPlayedAt - a.lastPlayedAt)
    .slice(0, n);
const playlist = (id) => lib.playlists.find((p) => p.id === id);
const playlistTracks = (id) => {
  const p = playlist(id);
  return p ? p.trackIds.map((i) => lib.tracks[i]).filter(Boolean) : [];
};
function searchResults() {
  const q = searchQ.trim().toLowerCase();
  if (!q) return [];
  return allTracks().filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      (t.album || "").toLowerCase().includes(q),
  );
}
function queueFor(ctx) {
  if (ctx === "all") return allTracks();
  if (ctx === "recent") return recentTracks();
  if (ctx === "search") return searchResults();
  if (ctx && ctx.startsWith("pl:")) return playlistTracks(ctx.slice(3));
  return null;
}

// ───────────────────────── audio engine ─────────────────────────
function repairQueue() {
  pb.queue = pb.queue.map(t => lib.tracks[t.id]).filter(Boolean);
  pb.current = pb.current ? lib.tracks[pb.current.id] || null : null;
  if (pb.current && !pb.queue.some(t => t.id === pb.current.id)) pb.queue.unshift(pb.current);
  pb.qi = pb.current
    ? (pb.queue[pb.qi]?.id === pb.current.id ? pb.qi : pb.queue.findIndex(t => t.id === pb.current.id))
    : -1;
  if (!pb.current) pb.position = 0;
}

function prepareAudio(track) {
  const entry = { id: track.id, url: null, cancelled: false };
  entry.promise = getAudio(track.id).then(blob => {
    if (blob && !entry.cancelled && lib.tracks[entry.id]) entry.url = URL.createObjectURL(blob);
  }).catch(error => console.warn("Prepare audio:", error));
  return entry;
}
function releaseAudio(entry) {
  if (!entry) return;
  entry.cancelled = true;
  if (entry.url) URL.revokeObjectURL(entry.url);
  entry.url = null;
}
function nextKey() {
  return JSON.stringify([pb.current?.id, pb.queue.map(t => t.id), pb.qi, pb.shuffle, pb.repeat]);
}
function prepareNext() {
  const key = nextKey();
  if (preparedNext?.key === key) return;
  releaseAudio(preparedNext);
  preparedNext = null;
  if (!pb.current) return;
  const index = nextIndex();
  if (index >= 0 && pb.queue[index]) {
    // Choose shuffle once, so the prepared song is the song Next/ended uses.
    preparedNext = Object.assign(prepareAudio(pb.queue[index]), { key, index });
  }
}
function setAudioSource(entry, position = 0) {
  const oldURL = curURL;
  curURL = entry.url;
  entry.url = null; // ownership transfers from the prepared entry to <audio>
  loadedTrackId = entry.id;
  pb.position = position;
  restorePosition = position > 0 ? { id: entry.id, seconds: position } : null;
  audio.src = curURL;
  if (oldURL) URL.revokeObjectURL(oldURL);
}
function prepareRestoredCurrent() {
  if (!pb.current) return;
  const entry = preparedRestore = prepareAudio(pb.current);
  const request = playRequest;
  entry.promise.then(() => {
    // play() may have taken this entry while the IndexedDB read was pending.
    if (preparedRestore !== entry) return;
    preparedRestore = null;
    if (request !== playRequest || pb.current?.id !== entry.id || audio.src || !entry.url) {
      releaseAudio(entry);
      return;
    }
    setAudioSource(entry, pb.position);
    audio.load(); // prepare a paused source; never autoplay a restored session
    prepareNext();
  });
}

async function play(track, queue, index, prepared = null, position = 0) {
  if (!track || !lib.tracks[track.id]) { releaseAudio(prepared); return; }
  const request = ++playRequest;
  pendingPlayId = track.id;
  let entry = prepared;
  if (!entry && preparedRestore?.id === track.id) {
    entry = preparedRestore;
    preparedRestore = null;
  }
  releaseAudio(preparedRestore);
  preparedRestore = null;
  releaseAudio(preparedNext);
  preparedNext = null;
  if (!entry) entry = prepareAudio(track);
  // A prepared Next/ended transition reaches play() in the same event turn.
  if (!entry.url) await entry.promise;
  if (request !== playRequest || !lib.tracks[track.id]) { releaseAudio(entry); return; }
  pendingPlayId = null;
  if (!entry.url) { toast(i18n("audioNotAvailable")); prepareNext(); return; }
  pb.current = lib.tracks[track.id];
  if (queue) {
    pb.queue = queue.slice();
    pb.qi = index != null ? index : 0;
  }
  repairQueue();
  setAudioSource(entry, position);
  let started;
  try { started = audio.play(); } catch (error) { started = Promise.reject(error); }
  markPlayed(track.id);
  updateMediaSession(pb.current);
  savePB();
  renderMini();
  renderPlayer();
  refreshActive();
  prepareNext();
  try {
    await started;
  } catch (error) {
    if (request !== playRequest) return;
    console.warn("play():", error);
    toast(i18n("playbackFailed"));
    updateMediaSession(pb.current);
    updatePlayUI();
  }
}

function togglePlay() {
  if (!pb.current) return;
  if (!audio.src) {
    play(pb.current, pb.queue.length ? pb.queue : [pb.current], pb.qi, null, pb.position);
    return;
  }
  if (audio.paused) resume();
  else pause();
}
function resume() {
  if (audio.src) {
    prepareNext();
    const request = playRequest;
    audio.play().catch(error => {
      if (request !== playRequest) return;
      console.warn("Resume audio:", error);
      toast(i18n("playbackFailed"));
    });
  }
  else togglePlay();
}
function pause() {
  ++playRequest;
  pendingPlayId = null;
  audio.pause();
  savePB();
}
function nextIndex() {
  const { queue, qi, repeat, shuffle } = pb;
  if (!queue.length) return -1;
  if (repeat === "one") return qi;
  if (shuffle) return queue.length > 1 ? randOther(qi, queue.length) : qi;
  const n = qi + 1;
  if (n >= queue.length) return repeat === "all" ? 0 : -1;
  return n;
}
function randOther(cur, len) {
  let n = cur;
  while (n === cur) n = Math.floor(Math.random() * len);
  return n;
}
function next() {
  prepareNext();
  const entry = preparedNext;
  if (!entry) return;
  preparedNext = null;
  play(pb.queue[entry.index], pb.queue, entry.index, entry);
}
function prev() {
  if (audio.currentTime > 3) {
    seekTo(0);
    return;
  }
  const i = pb.qi - 1;
  if (i >= 0 && pb.queue[i]) play(pb.queue[i], pb.queue, i);
  else seekTo(0);
}
function seekTo(sec) {
  if (!Number.isFinite(sec) || !audio.src) return;
  if (pendingPlayId) {
    ++playRequest;
    pendingPlayId = null;
    prepareNext();
  }
  restorePosition = null;
  audio.currentTime = Math.max(0, Number.isFinite(audio.duration) ? Math.min(sec, audio.duration) : sec);
  savePB();
}
function onEnded() {
  if (pendingPlayId) return;
  savePB();
  next();
}
function markPlayed(id) {
  if (lib.tracks[id]) {
    lib.tracks[id].lastPlayedAt = Date.now();
    saveLib();
  }
}

// Fallback cover art: a canvas-rendered PNG (a tile with the initial over an
// accent gradient). Android needs a real BITMAP for the media notification;
// an SVG isn't always accepted. Cached by initial+accent.
const _fbArt = {};
function fallbackArtURL(track) {
  const letter = (track.title && track.title[0] ? track.title[0] : "♪").toUpperCase();
  const key = letter + "|" + accent().hex;
  if (_fbArt[key]) return _fbArt[key];
  try {
    const s = 512;
    const c = document.createElement("canvas");
    c.width = s;
    c.height = s;
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, accent().hex);
    g.addColorStop(1, "#0f0f18");
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
    x.fillStyle = "rgba(255,255,255,.92)";
    x.font = "900 268px system-ui, -apple-system, Roboto, sans-serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(letter, s / 2, s / 2 + 24);
    const url = c.toDataURL("image/png");
    _fbArt[key] = url;
    return url;
  } catch {
    return null;
  }
}

// Set the action handlers ONCE (always present so the notification stays
// interactive even if the first setMetadata call fails).
let _handlersSet = false;
function ensureHandlers() {
  if (_handlersSet || !("mediaSession" in navigator)) return;
  const ms = navigator.mediaSession;
  const h = (a, f) => {
    try {
      ms.setActionHandler(a, f);
    } catch {}
  };
  h("play", resume);
  h("pause", pause);
  h("previoustrack", prev);
  h("nexttrack", next);
  h("stop", pause);
  h("seekto", (d) => {
    if (d.seekTime != null) seekTo(d.seekTime);
  });
  h("seekbackward", (d) => seekTo(audio.currentTime - (d.seekOffset || 10)));
  h("seekforward", (d) => seekTo(audio.currentTime + (d.seekOffset || 10)));
  _handlersSet = true;
}

function updateMediaSession(track) {
  if (!("mediaSession" in navigator)) return;
  const ms = navigator.mediaSession;
  ensureHandlers();
  // src: real cover art (blob) or raster fallback. No `type` (optional): a
  // type that doesn't match the blob can make Chrome discard the image.
  const artUrl = artURLs[track.id] || fallbackArtURL(track);
  const artwork = artUrl
    ? [
        { src: artUrl, sizes: "512x512" },
        { src: artUrl, sizes: "256x256" },
        { src: artUrl, sizes: "96x96" },
      ]
    : [];
  let meta = null;
  try {
    meta = new MediaMetadata({
      title: track.title || i18n("untitled"),
      artist: track.artist || i18n("unknownArtist"),
      album: track.album || "",
      artwork,
    });
  } catch (e) {
    // retry without artwork in case the image upsets the constructor
    try {
      meta = new MediaMetadata({
        title: track.title || i18n("untitled"),
        artist: track.artist || i18n("unknownArtist"),
        album: track.album || "",
      });
    } catch {}
  }
  if (meta) ms.metadata = meta;
  ms.playbackState = audio.paused ? "paused" : "playing";
}

// <audio> events
audio.addEventListener("play", () => {
  pb.playing = true;
  if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
  updatePlayUI();
});
audio.addEventListener("pause", () => {
  pb.playing = false;
  if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
  updatePlayUI();
  savePB();
});
audio.addEventListener("ended", onEnded);
audio.addEventListener("timeupdate", () => {
  if ("mediaSession" in navigator && audio.duration && isFinite(audio.duration)) {
    try {
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate || 1,
        position: Math.min(audio.currentTime, audio.duration),
      });
    } catch {}
  }
  updateProgressUI();
  // Persist the real media clock without a timer or writes on every frame.
  if (!restorePosition && Math.abs(audio.currentTime - lastSavedPosition) >= 5) savePB();
});
audio.addEventListener("loadedmetadata", () => {
  if (loadedTrackId !== pb.current?.id) return;
  if (restorePosition?.id === loadedTrackId) {
    const seconds = restorePosition.seconds;
    restorePosition = null;
    audio.currentTime = Number.isFinite(audio.duration) && seconds >= audio.duration ? 0 : seconds;
    savePB();
  }
  // capture the real duration if the track didn't have one yet
  if (pb.current && (!pb.current.duration || pb.current.duration === 0) && isFinite(audio.duration)) {
    pb.current.duration = Math.round(audio.duration * 1000);
    saveLib();
  }
  updateProgressUI();
});

// Download UI is independent of playback and the current view. Async progress
// only updates this card's text/buttons; it never renders or navigates a view.
function youtubeMessage() {
  if (youtubeError) {
    const keys = {
      INVALID_URL: "youtubeInvalidUrl", INVALID_REQUEST: "youtubeInvalidUrl",
      NETWORK_ERROR: "youtubeNetworkError", SOURCE_UNAVAILABLE: "youtubeUnavailable",
      SOURCE_BLOCKED: "youtubeRestricted", UNSUPPORTED_SOURCE: "youtubeRestricted",
      RATE_LIMITED: "youtubeBusy", BUSY: "youtubeBusy", DURATION_LIMIT: "youtubeTooLarge",
      TOO_LARGE: "youtubeTooLarge", TIMEOUT: "youtubeTimeout", JOB_EXPIRED: "youtubeExpired",
      JOB_NOT_FOUND: "youtubeExpired", INVALID_AUDIO: "youtubeIntegrityError",
      QUOTA: "youtubeStorageError", PROVIDER_UNAVAILABLE: "youtubeServiceError", SERVICE_NOT_READY: "youtubeServiceNotReady",
    };
    return i18n(keys[youtubeError] || "youtubeServiceError");
  }
  const keys = {
    idle: "youtubeIdle", checking: "youtubePreparing", queued: "youtubeQueued",
    preparing: "youtubePreparing", downloading: "youtubeDownloading", converting: "youtubeConverting",
    transferring: "youtubeTransferring", saving: "youtubeSaving", done: "youtubeDone",
    existing: "youtubeAlreadySaved", cancelled: "youtubeCancelled", resume: "youtubeResumeHint",
  };
  return i18n(keys[youtubeState] || "youtubeIdle");
}
function youtubeCard() {
  const busy = !!youtubeActive, saved = !!youtubeSavedId && !!lib.tracks[youtubeSavedId];
  return `<section class="youtube-card" aria-label="${i18n("youtubeHeading")}">
    <h2>${i18n("youtubeHeading")}</h2>
    <p>${i18n("youtubeDescription")}</p>
    <form data-youtube-form novalidate>
      <label for="youtubeUrl">${i18n("youtubeUrlLabel")}</label>
      <input id="youtubeUrl" data-youtube-url class="youtube-input" type="text" inputmode="url" enterkeyhint="go" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="2048" placeholder="${i18n("youtubeUrlPlaceholder")}" value="${esc(youtubeUrl)}">
      <button class="sample-button youtube-submit" type="submit" ${busy ? "disabled" : ""}>${ic("download")}<span>${i18n("youtubeDownload")}</span></button>
    </form>
    <p class="youtube-status ${youtubeError ? "youtube-error" : ""}" role="status" aria-live="polite">${esc(youtubeMessage())}</p>
    <button class="youtube-secondary youtube-resume" data-act="resumeyoutube" type="button" ${busy || !youtubeJob ? "hidden" : ""}>${i18n("youtubeResume")}</button>
    <button class="youtube-secondary youtube-cancel" data-act="cancelyoutube" type="button" ${!busy && !youtubeJob ? "hidden" : ""}>${i18n(busy ? "youtubeCancel" : "youtubeForget")}</button>
    <button class="youtube-secondary youtube-open" data-act="openyoutube" type="button" ${!saved ? "hidden" : ""}>${i18n("youtubeOpen")}</button>
    <p class="youtube-rights">${i18n("youtubeRights")}</p>
  </section>`;
}
function refreshYouTubeCards() {
  for (const card of document.querySelectorAll(".youtube-card")) {
    const status = card.querySelector(".youtube-status");
    status.textContent = youtubeMessage();
    status.classList.toggle("youtube-error", !!youtubeError);
    card.querySelector(".youtube-submit").disabled = !!youtubeActive;
    card.querySelector(".youtube-resume").hidden = !!youtubeActive || !youtubeJob;
    const cancel = card.querySelector(".youtube-cancel");
    cancel.hidden = !youtubeActive && !youtubeJob;
    cancel.textContent = i18n(youtubeActive ? "youtubeCancel" : "youtubeForget");
    card.querySelector(".youtube-open").hidden = !youtubeSavedId || !lib.tracks[youtubeSavedId];
  }
}
function saveYouTubeDraft() {
  try { localStorage.setItem(LS_YOUTUBE, JSON.stringify({ url: youtubeUrl, job: youtubeJob })); }
  catch { /* Draft persistence is optional; committed audio uses a separate write. */ }
}
function loadYouTubeDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_YOUTUBE) || "null");
    if (typeof saved?.url === "string") youtubeUrl = saved.url.slice(0, 2048);
    if (validYouTubeJobId(saved?.job?.id)) {
      const parsed = parseYouTubeUrl(saved.job.url);
      if (parsed.videoId === saved.job.videoId) {
        youtubeJob = { id: saved.job.id, ...parsed };
        youtubeState = "resume";
      }
    }
  } catch {}
  // Never start network work just because the app was reopened offline.
}
function commitYouTubeLibrary(meta) {
  const id = `youtube-${meta.videoId}`;
  const track = { ...lib.tracks[id], id, title: meta.title, artist: meta.artist,
    album: "", duration: meta.durationMs, hasArt: false,
    lastPlayedAt: lib.tracks[id]?.lastPlayedAt || 0,
    sourceUrl: `https://www.youtube.com/watch?v=${meta.videoId}`, sourceId: meta.videoId,
    bytes: meta.bytes, sha256: meta.sha256,
  };
  const updated = { ...lib, tracks: { ...lib.tracks, [id]: track },
    playlists: lib.playlists.map(p => p.id === SYS ? { ...p, trackIds: [...new Set([...p.trackIds, id])] } : p),
  };
  // Publish only after both the Blob transaction and durable metadata succeed.
  localStorage.setItem(LS_LIB, JSON.stringify(updated));
  lib = updated;
  return id;
}
async function downloadYouTube(resume = false) {
  if (youtubeActive) return;
  let parsed, client;
  const recovered = resume ? youtubeJob : null;
  try {
    parsed = parseYouTubeUrl(recovered?.url || youtubeUrl);
    client = new YouTubeDownloadClient();
  } catch (error) {
    youtubeError = error.code || "INVALID_URL";
    refreshYouTubeCards();
    return;
  }
  if (!resume && youtubeJob) { void client.cancel(youtubeJob.id); youtubeJob = null; }
  const operation = { controller: new AbortController(), client };
  youtubeActive = operation;
  youtubeError = null; youtubeState = "checking"; youtubeSavedId = null;
  const active = () => youtubeActive === operation && !operation.controller.signal.aborted;
  saveYouTubeDraft();
  refreshYouTubeCards();
  requestOfflineStorage();
  try {
    const id = `youtube-${parsed.videoId}`, existing = lib.tracks[id];
    const stored = existing && await getAudio(id);
    if (existing && await isStoredYouTubeAudio(existing, stored)) {
      if (!active()) return;
      youtubeSavedId = id; youtubeState = "existing"; youtubeJob = null;
      saveYouTubeDraft();
      return;
    }
    if (!active()) return;
    const result = await client.download(parsed.url, {
      signal: operation.controller.signal, resumeJobId: recovered?.id || null,
      onJob(job) { if (active()) { youtubeJob = job; saveYouTubeDraft(); } },
      onState(state) { if (active()) { youtubeState = state; refreshYouTubeCards(); } },
      getStoredAudio: meta => getAudio(`youtube-${meta.videoId}`),
    });
    if (!active()) return;
    youtubeState = "saving";
    refreshYouTubeCards();
    if (!result.reused) await putAudio(id, result.blob);
    if (!active()) return;
    youtubeSavedId = commitYouTubeLibrary(result.meta);
    youtubeState = "done"; youtubeJob = null;
    saveYouTubeDraft();
  } catch (error) {
    if (!active()) return;
    youtubeError = error?.name === "QuotaExceededError" ? "QUOTA" : error?.code || "SERVICE_ERROR";
    // Only a saved, unfinished job can be explicitly resumed. Permanent
    // source failures and expired/cancelled jobs start fresh on another click.
    if (!["NETWORK_ERROR", "INVALID_AUDIO", "QUOTA"].includes(youtubeError)) youtubeJob = null;
    youtubeState = "failed";
    saveYouTubeDraft();
  } finally {
    if (youtubeActive === operation) {
      youtubeActive = null;
      refreshYouTubeCards();
    }
  }
}
function cancelYouTube() {
  if (youtubeActive) {
    youtubeActive.controller.abort();
    // Once transport finished, its abort listener has already been removed.
    if (youtubeState === "saving" && youtubeJob) void youtubeActive.client.cancel(youtubeJob.id);
  }
  else if (youtubeJob) { try { void new YouTubeDownloadClient().cancel(youtubeJob.id); } catch {} }
  youtubeActive = null; youtubeJob = null; youtubeSavedId = null;
  youtubeState = "cancelled"; youtubeError = null;
  saveYouTubeDraft();
  refreshYouTubeCards();
}

// Explicit sample downloads use the same local audio store as imported files.
// They never select a view, start playback, or alter the current queue.
function sampleCard() {
  const complete = SAMPLE_TRACKS.every(t => savedSamples.has(t.id) && lib.tracks[t.id]);
  return `<section class="sample-card" aria-label="${i18n("sampleHeading")}">
    <h2>${i18n(complete ? "sampleReadyHeading" : "sampleHeading")}</h2>
    <p>${i18n(complete ? "sampleReadyHint" : "sampleDescription")}</p>
    <button class="sample-button" data-act="${complete ? "opensamples" : "downloadsamples"}" ${sampleBusy ? "disabled" : ""}>
      ${ic(complete ? "list" : "download")}<span>${i18n(sampleBusy ? "sampleDownloading" : complete ? "sampleOpen" : "sampleDownload")}</span>
    </button>
    <p class="sample-progress ${sampleError ? "sample-error" : ""}" role="status" aria-live="polite">${esc(sampleMessage)}</p>
    <a class="sample-credits" href="./sample-credits.html" target="_blank" rel="noopener">${i18n("sampleCredits")}</a>
  </section>`;
}
function refreshSampleCards() {
  for (const slot of document.querySelectorAll(".sample-slot")) slot.innerHTML = sampleCard();
}
async function checkSavedSamples() {
  for (const t of SAMPLE_TRACKS) {
    try {
      if (lib.tracks[t.id] && isStoredSample(t, await getAudio(t.id))) savedSamples.add(t.id);
      else savedSamples.delete(t.id);
    } catch { savedSamples.delete(t.id); }
  }
  refreshSampleCards();
}
function sampleLibrary(track) {
  const tracks = track ? { ...lib.tracks, [track.id]: lib.tracks[track.id] || {
    id: track.id, title: track.title, artist: track.artist,
    album: "Music Offline – Ukážkové skladby", duration: track.duration,
    hasArt: false, lastPlayedAt: 0,
  } } : lib.tracks;
  const ids = SAMPLE_TRACKS.filter(t => tracks[t.id]).map(t => t.id);
  let found = false;
  const playlists = lib.playlists.map(p => {
    if (p.id === SYS) return { ...p, trackIds: [...new Set([...p.trackIds, ...ids])] };
    if (p.id !== SAMPLE_PLAYLIST) return p;
    found = true;
    return { ...p, trackIds: [...new Set([...p.trackIds, ...ids])] };
  });
  if (!found) playlists.push({ id: SAMPLE_PLAYLIST, name: i18n("samplePlaylist"), trackIds: ids, createdAt: Date.now() });
  return { ...lib, tracks, playlists };
}
function commitSampleLibrary(track) {
  const updated = sampleLibrary(track);
  // Publish metadata only after localStorage succeeds; a failed write remains
  // retriable even when the audio transaction has already committed.
  localStorage.setItem(LS_LIB, JSON.stringify(updated));
  lib = updated;
}
async function downloadSamples() {
  if (sampleBusy) return;
  sampleBusy = true;
  sampleError = false;
  sampleMessage = "";
  dismissModal();
  requestOfflineStorage();
  refreshSampleCards();
  try {
    for (let i = 0; i < SAMPLE_TRACKS.length; i++) {
      const t = SAMPLE_TRACKS[i];
      sampleMessage = i18n("sampleDownloadProgress", { n: i + 1, name: t.title });
      refreshSampleCards();
      const existing = await getAudio(t.id);
      if (!isStoredSample(t, existing)) {
        const blob = await downloadSample(t);
        await putAudio(t.id, blob);
      }
      commitSampleLibrary(t);
      savedSamples.add(t.id);
    }
    sampleMessage = i18n("sampleDownloadDone");
    toast(sampleMessage);
  } catch (error) {
    sampleError = true;
    const n = SAMPLE_TRACKS.filter(t => savedSamples.has(t.id) && lib.tracks[t.id]).length;
    sampleMessage = i18n(error?.name === "QuotaExceededError" ? "sampleStorageError" : "sampleDownloadError", { n });
    toast(sampleMessage);
  } finally {
    sampleBusy = false;
    // Update just the card: a download finishing cannot replace an input,
    // reset scroll, or pull the user out of Search/Settings/the player.
    refreshSampleCards();
  }
}

// ───────────────────────── import ─────────────────────────
async function importFiles(files) {
  if (!files || !files.length) return;
  toast(i18n("importing"));
  let added = 0;
  for (const file of files) {
    const id = "imp-" + hash(file.name + "|" + file.size + "|" + (file.lastModified || 0));
    if (lib.tracks[id]) continue;
    let meta = {};
    try {
      meta = await readMeta(file);
    } catch {}
    try {
      await putAudio(id, file);
    } catch (e) {
      console.warn("putAudio:", e);
      toast(i18n("notEnoughStorage"));
      continue;
    }
    let hasArt = false;
    if (meta.artBlob) {
      try {
        await putArt(id, meta.artBlob);
        artURLs[id] = URL.createObjectURL(meta.artBlob);
        hasArt = true;
      } catch {}
    }
    const fname = file.name.replace(/\.[^.]+$/, "").replace(/_/g, " ").trim();
    lib.tracks[id] = {
      id,
      title: meta.title || fname || i18n("audioFallbackTitle"),
      artist: meta.artist || i18n("unknownArtist"),
      album: meta.album || "",
      duration: 0,
      hasArt,
      lastPlayedAt: 0,
    };
    if (!imported().trackIds.includes(id)) imported().trackIds.push(id);
    added++;
  }
  saveLib();
  render();
  toast(added ? songsAddedMsg(added) : i18n("alreadyImported"));
  computeDurations();
}

async function computeDurations() {
  const pending = Object.values(lib.tracks).filter((t) => !t.duration);
  for (const t of pending) {
    try {
      const blob = await getAudio(t.id);
      if (!blob) continue;
      const url = URL.createObjectURL(blob);
      const d = await durationOf(url);
      URL.revokeObjectURL(url);
      if (d > 0) t.duration = Math.round(d * 1000);
    } catch {}
  }
  saveLib();
  render();
}
function durationOf(url) {
  return new Promise((res) => {
    const a = new Audio();
    a.preload = "metadata";
    let done = false;
    const fin = (v) => {
      if (done) return;
      done = true;
      a.src = "";
      res(v);
    };
    a.addEventListener("loadedmetadata", () => fin(isFinite(a.duration) ? a.duration : 0));
    a.addEventListener("error", () => fin(0));
    a.src = url;
    setTimeout(() => fin(isFinite(a.duration) ? a.duration : 0), 8000);
  });
}

async function warmArt() {
  const ids = Object.keys(lib.tracks).filter((id) => lib.tracks[id].hasArt && !artURLs[id]);
  if (!ids.length) return;
  for (const id of ids) {
    try {
      const b = await getArt(id);
      if (b) artURLs[id] = URL.createObjectURL(b);
    } catch {}
  }
  render();
}

// ───────────────────────── backup / restore ─────────────────────────
// A single portable ".kasette" file: a JSON header (library + an index of the
// embedded blobs) followed by the audio/art bytes back-to-back. This avoids
// pulling in a zip library while still producing one file the OS "Save As"
// dialog can put anywhere a document provider can reach — including a
// USB-C drive, if the device/file manager exposes it as one.
const BACKUP_MAGIC = "KASF1";

async function exportBackup() {
  const trackIds = Object.keys(lib.tracks);
  if (!trackIds.length) {
    toast(i18n("noSongsToBackUp"));
    return;
  }
  toast(i18n("preparingBackup"));
  const entries = [];
  const parts = [];
  let offset = 0;
  for (const id of trackIds) {
    const blob = await getAudio(id);
    if (!blob) continue;
    entries.push({ id, kind: "audio", mime: blob.type || "application/octet-stream", offset, length: blob.size });
    parts.push(blob);
    offset += blob.size;
    if (lib.tracks[id].hasArt) {
      const art = await getArt(id);
      if (art) {
        entries.push({ id, kind: "art", mime: art.type || "image/jpeg", offset, length: art.size });
        parts.push(art);
        offset += art.size;
      }
    }
  }
  const header = { createdAt: Date.now(), tracks: lib.tracks, playlists: lib.playlists, entries };
  const headerBytes = new TextEncoder().encode(JSON.stringify(header));
  const lenBuf = new Uint8Array(4);
  new DataView(lenBuf.buffer).setUint32(0, headerBytes.byteLength, true);
  const magicBytes = new TextEncoder().encode(BACKUP_MAGIC);
  const backupBlob = new Blob([magicBytes, lenBuf, headerBytes, ...parts], { type: "application/octet-stream" });
  const filename = `kasette-backup-${new Date().toISOString().slice(0, 10)}.kasette`;

  // In the Android app, showSaveFilePicker doesn't exist (it's a WebView, not
  // a browser), so route through the SAF export plugin instead: write the
  // backup into the app's own cache dir first (the only place @capacitor/
  // filesystem can reach), then hand that path to the native "Save As"
  // picker, which can target a folder, an SD card, or a USB drive.
  const CapFS = window.Capacitor?.Plugins?.Filesystem;
  const CapSaf = window.Capacitor?.Plugins?.SafExport;
  if (window.Capacitor?.isNativePlatform?.() && CapFS && CapSaf) {
    try {
      const base64 = await blobToBase64(backupBlob);
      await CapFS.writeFile({ path: filename, data: base64, directory: "CACHE" });
      const { uri } = await CapFS.getUri({ path: filename, directory: "CACHE" });
      const cachePath = uri.startsWith("file://") ? uri.slice(7) : uri;
      await CapSaf.exportFile({ path: cachePath, mimeType: "application/octet-stream", suggestedName: filename });
      toast(i18n("backupSaved"));
    } catch (e) {
      if (!(e && String(e.message || e).includes("cancelled"))) console.warn("SafExport:", e);
    } finally {
      CapFS.deleteFile({ path: filename, directory: "CACHE" }).catch(() => {});
    }
    return;
  }

  // File System Access API opens the native "Save As" dialog, letting the
  // user pick any destination a document provider exposes — a USB-C drive
  // included. Falls back to a plain download where it isn't supported.
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: "Music Offline backup", accept: { "application/octet-stream": [".kasette"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(backupBlob);
      await writable.close();
      toast(i18n("backupSaved"));
      return;
    } catch (e) {
      if (e && e.name === "AbortError") return;
      console.warn("showSaveFilePicker:", e);
    }
  }
  const url = URL.createObjectURL(backupBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast(i18n("backupDownloaded"));
}

async function pickRestoreFile() {
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: "Music Offline backup", accept: { "application/octet-stream": [".kasette"] } }],
      });
      restoreBackupFile(await handle.getFile());
      return;
    } catch (e) {
      if (e && e.name === "AbortError") return;
      console.warn("showOpenFilePicker:", e);
    }
  }
  $("#backupPick").click();
}

async function restoreBackupFile(file) {
  if (!file) return;
  toast(i18n("restoring"));
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    const magicLen = BACKUP_MAGIC.length;
    if (new TextDecoder().decode(buf.subarray(0, magicLen)) !== BACKUP_MAGIC) {
      toast(i18n("notKasetteBackup"));
      return;
    }
    let p = magicLen;
    const headerLen = new DataView(buf.buffer, buf.byteOffset + p, 4).getUint32(0, true);
    p += 4;
    const header = JSON.parse(new TextDecoder().decode(buf.subarray(p, p + headerLen)));
    const dataStart = p + headerLen;

    for (const e of header.entries || []) {
      const bytes = buf.subarray(dataStart + e.offset, dataStart + e.offset + e.length);
      const blob = new Blob([bytes], { type: e.mime });
      if (e.kind === "audio") await putAudio(e.id, blob);
      else if (e.kind === "art") await putArt(e.id, blob);
    }

    let added = 0;
    for (const [id, t] of Object.entries(header.tracks || {})) {
      if (!lib.tracks[id]) {
        lib.tracks[id] = t;
        added++;
      }
    }
    for (const p2 of header.playlists || []) {
      if (p2.system) continue; // never duplicate the built-in "Imported songs" playlist
      if (!lib.playlists.find((x) => x.id === p2.id)) lib.playlists.push(p2);
    }
    const sys = imported();
    for (const id of Object.keys(header.tracks || {})) {
      if (!sys.trackIds.includes(id)) sys.trackIds.push(id);
    }

    saveLib();
    render();
    warmArt();
    toast(added ? songsRestoredMsg(added) : i18n("backupUpToDate"));
  } catch (e) {
    console.warn("restoreBackupFile:", e);
    toast(i18n("couldntReadBackup"));
  }
}

function removeTrack(id) {
  delete lib.tracks[id];
  for (const p of lib.playlists) p.trackIds = p.trackIds.filter((t) => t !== id);
  if (artURLs[id]) {
    URL.revokeObjectURL(artURLs[id]);
    delete artURLs[id];
  }
  delTrack(id).catch(() => {});
  if (pendingPlayId === id) {
    ++playRequest;
    pendingPlayId = null;
  }
  if (preparedRestore?.id === id) {
    releaseAudio(preparedRestore);
    preparedRestore = null;
  }
  if (pb.current && pb.current.id === id) {
    pause();
    pb.current = null;
    loadedTrackId = null;
    restorePosition = null;
    pb.position = 0;
    if (curURL) {
      URL.revokeObjectURL(curURL);
      curURL = null;
    }
    audio.removeAttribute("src");
    audio.load();
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
    }
  }
  repairQueue();
  prepareNext();
  saveLib();
  savePB();
  render();
}

// ───────────────────────── render: UI helpers ─────────────────────────
function artHTML(track, cls = "") {
  const u = artURLs[track.id];
  return `<div class="art ${cls}">${u ? `<img src="${u}" alt="">` : ic("music")}</div>`;
}
function rowHTML(track, ctx, idx, opts = {}) {
  const active = pb.current && pb.current.id === track.id;
  const num = opts.showIndex ? `<span class="row-idx">${idx + 1}</span>` : "";
  // ⋮ opens the menu (add to playlist / remove from this playlist / delete).
  const more = `<button class="row-btn" data-act="rowmore" data-id="${track.id}"${
    opts.plId ? ` data-pl="${opts.plId}"` : ""
  }>${ic("more")}</button>`;
  return `<div class="row">
    <button class="row" style="padding:0;flex:1;gap:12px" data-act="play" data-id="${track.id}" data-ctx="${ctx}">
      ${num}${artHTML(track)}
      <span class="row-main">
        <span class="row-t ${active ? "active" : ""}">${esc(track.title)}</span>
        <span class="row-a">${esc(track.artist)}</span>
      </span>
    </button>
    ${more}
  </div>`;
}

// ───────────────────────── render: views ─────────────────────────
function greet() {
  const h = new Date().getHours();
  if (h < 6) return i18n("greetNight");
  if (h < 13) return i18n("greetMorning");
  if (h < 20) return i18n("greetAfternoon");
  return i18n("greetNight");
}

function viewHome() {
  const tracks = allTracks();
  let html = `<h1 class="h-greet">${greet()}</h1>`;
  html += youtubeCard();
  html += `<div class="sample-slot">${sampleCard()}</div>`;

  if (!tracks.length) {
    html += `<section class="sec"><div class="sec-head">${ic("music")}<span class="sec-title">${i18n("music")}</span></div>
      <button class="card-cta" data-act="import">
        <span class="cta-ic">${ic("folder")}</span>
        <span><span class="cta-t">${i18n("importFirstSong")}</span>
        <span class="cta-d">${i18n("importFirstSongDesc")}</span></span></button>
      </section><div class="pad-bottom"></div>`;
    return html;
  }

  if (settings.playlistsEnabled) {
    html += `<div class="quick-grid">`;
    html += lib.playlists
      .map(
        (p) => `<button class="quick-tile" data-act="openpl" data-id="${p.id}">
          <span class="quick-ic ${p.system ? "sys" : ""}">${ic(p.system ? "music" : "list")}</span>
          <span class="quick-t">${esc(p.name)}</span>
        </button>`,
      )
      .join("");
    html += `</div>`;
  }

  // Horizontal carousel: "Recently played" (or all your music if nothing has
  // been played yet), with square glass cards.
  const recent = recentTracks(12);
  const cx = recent.length ? recent : allTracks().slice(0, 12);
  const cxCtx = recent.length ? "recent" : "all";
  html += `<h2 class="sec-title2">${recent.length ? i18n("recentlyPlayed") : i18n("yourMusic")}</h2>`;
  html += `<div class="carousel">`;
  html += cx
    .map((t) => {
      const u = artURLs[t.id];
      return `<button class="cx-card" data-act="play" data-id="${t.id}" data-ctx="${cxCtx}">
        <span class="cx-art">${u ? `<img src="${u}" alt="">` : ic("music")}</span>
        <span class="cx-t">${esc(t.title)}</span>
        <span class="cx-a">${esc(t.artist)}</span>
      </button>`;
    })
    .join("");
  html += `</div>`;

  html += `<button class="btn-wide" data-act="goto" data-view="library">${i18n("seeWholeLibrary", { n: tracks.length, noun: nounSong(tracks.length) })}</button>`;
  html += `<button class="btn-wide" data-act="import">${i18n("importMoreSongs")}</button>`;
  html += `<div class="pad-bottom"></div>`;
  return html;
}

function searchResultsHTML() {
  const res = searchResults();
  if (!searchQ.trim())
    return `<p class="dim" style="padding-top:6px;padding-left:14px">${i18n("searchHelper")}</p>`;
  if (!res.length) return `<div class="empty-mid">${i18n("noResultsFor", { q: esc(searchQ) })}</div>`;
  return res.map((t) => rowHTML(t, "search")).join("");
}
function viewSearch() {
  // The sticky search bar keeps its own results container so it can update
  // without rebuilding the input (this preserves focus and cursor position).
  return `<h1 class="h-greet">${i18n("searchHeading")}</h1>
    <div class="search-wrap"><input id="searchIn" class="search-in" placeholder="${i18n("searchPlaceholder")}" value="${esc(searchQ)}"></div>
    <div id="searchResults">${searchResultsHTML()}</div>
    <div class="pad-bottom"></div>`;
}

function viewLibrary() {
  if (plOpen) return viewPlaylistDetail(plOpen);
  let html = `<div class="lib-head">
    <h1 class="h-greet">${i18n("yourLibrary")}</h1>
    <button class="icon-btn" data-act="libadd" aria-label="${i18n("ariaAdd")}">${ic("plus")}</button>
  </div>`;
  html += youtubeCard();
  html += `<div class="sample-slot">${sampleCard()}</div>`;
  if (settings.playlistsEnabled) html += `<div class="chips">${["songs", "playlists"].map(tab =>
    `<button class="chip ${libraryTab === tab ? "on" : ""}" data-act="librarytab" data-tab="${tab}" aria-pressed="${libraryTab === tab}">${i18n(tab)}</button>`
  ).join("")}</div>`;
  if (!settings.playlistsEnabled || libraryTab === "songs") {
    const tracks = allTracks();
    html += tracks.length
      ? tracks.map(t => rowHTML(t, "all")).join("")
      : `<button class="btn-wide" data-act="import">${i18n("addSongs")}</button>`;
  } else html += lib.playlists
    .map((p) => {
      const n = p.trackIds.length;
      return `<button class="pl-row" data-act="openpl" data-id="${p.id}">
        <span class="pl-ic ${p.system ? "sys" : ""}">${ic(p.system ? "music" : "list")}</span>
        <span class="row-main">
          <span class="pl-t">${esc(p.name)}</span>
          <span class="pl-c">${i18n("playlistSongCount", { n, noun: nounSong(n) })}</span>
        </span>
      </button>`;
    })
    .join("");
  html += `<div class="pad-bottom"></div>`;
  return html;
}

function viewPlaylistDetail(id) {
  const p = playlist(id);
  if (!p) {
    plOpen = null;
    return viewLibrary();
  }
  const tracks = playlistTracks(id);
  const n = tracks.length;
  // Compact header: no cover art, just back / title / count, with the
  // controls (shuffle + accent play) on the right.
  let html = `<div class="detail-hero">
    <button class="icon-btn detail-back" data-act="backlib" aria-label="${i18n("ariaBack")}">${ic("back")}</button>
    <div class="detail-info"><h1 class="detail-title">${esc(p.name)}</h1>
    <p class="detail-sub">${i18n("songCount", { n, noun: nounSong(n) })}</p></div>`;
  if (n) {
    html += `<div class="detail-actions">
      <button class="det-shuffle ${pb.shuffle ? "on-accent" : ""}" data-act="shuffle" aria-label="${i18n("ariaShuffle")}">${ic("shuffle")}</button>
      <button class="fab-play" data-act="playall" data-id="${id}" aria-label="${i18n("ariaPlay")}">${ic("play")}</button>
    </div>`;
  }
  html += `</div>`;
  // "Add to this playlist" row. In the system playlist, "add" means importing
  // files; in your own playlists, it means picking from the library.
  html += `<button class="add-row" data-act="${p.system ? "import" : "addto"}" data-id="${id}">
    <span class="add-row-ic">${ic("plus")}</span>
    <span class="pl-t">${p.system ? i18n("addSongs") : i18n("addToThisPlaylist")}</span>
  </button>`;
  if (n) {
    html += tracks.map((t, i) => rowHTML(t, "pl:" + id, i, { inPlaylist: !p.system, plId: id })).join("");
  } else {
    html += `<div class="empty-mid">${i18n("emptyPlaylist")}<br>${i18n("useAddToPlaylist")}</div>`;
  }
  if (!p.system) {
    html += `<button class="btn-wide danger" data-act="delpl" data-id="${id}" style="margin-top:20px">${i18n("deletePlaylist")}</button>`;
  }
  html += `<div class="pad-bottom"></div>`;
  return html;
}

function viewSettings() {
  const est = window.__est || { usage: 0, quota: 0 };
  const mb = (b) => (b / 1048576).toFixed(b > 1073741824 ? 0 : 1);
  let html = `<h1 class="h-greet">${i18n("settingsHeading")}</h1>`;

  html += `<div class="set-grp"><label class="sub language-label" for="languageSelect">${i18n("language")}</label>
    <select id="languageSelect" class="language-select">
      ${LANGUAGES.map(({ id, name }) => `<option value="${id}" lang="${id}" ${LOCALE === id ? "selected" : ""}>${name}</option>`).join("")}
    </select>
  </div>`;

  html += `<div class="set-grp"><p class="sub">${i18n("theme")}</p><div class="chips">
    <button class="chip ${settings.mode === "light" ? "on" : ""}" data-act="mode" data-m="light">${i18n("light")}</button>
    <button class="chip ${settings.mode === "dark" ? "on" : ""}" data-act="mode" data-m="dark">${i18n("dark")}</button>
  </div></div>`;

  html += `<div class="set-grp"><p class="sub">${i18n("accentColor")}</p><div class="swatches">`;
  html += ACCENTS.map(
    (a, i) => `<button class="sw ${i === settings.accentIdx ? "on" : ""}" data-act="accent" data-i="${i}" style="background:${a.hex}"></button>`,
  ).join("");
  html += `</div></div>`;

  if (settings.mode === "dark") {
    html += `<div class="set-grp"><p class="sub">${i18n("background")}</p><div class="swatches">`;
    html += BACKGROUNDS.map(
      (b, i) =>
        `<button class="sw ${i === settings.bgIdx ? "on" : ""}" data-act="bg" data-i="${i}" style="background:linear-gradient(135deg,${b.a},${b.b})"></button>`,
    ).join("");
    html += `</div></div>`;
  }

  html += `<div class="set-grp"><p class="sub">${i18n("library")}</p>
    <div class="set-line"><span class="lbl">${i18n("songsLabel")}</span><span class="val">${allTracks().length}</span></div>
    <button class="set-line playlist-toggle" data-act="toggleplaylists" role="switch" aria-checked="${settings.playlistsEnabled}"><span class="lbl">${i18n("enablePlaylists")}</span><span class="switch-track" aria-hidden="true"></span></button>
    <p class="dim">${i18n("playlistsHelper")}</p>
    <div class="set-line"><span class="lbl">${i18n("storageUsed")}</span><span class="val">${est.usage ? mb(est.usage) + " MB" : "—"}</span></div>
    <button class="btn-wide" data-act="import" style="margin-top:14px">${i18n("importSongsBtn")}</button>
  </div>`;

  html += `<div class="set-grp"><p class="sub">${i18n("backup")}</p>
    <p class="dim" style="line-height:1.5">${i18n("backupHelper")}</p>
    <button class="btn-wide" data-act="export-backup" style="margin-top:10px">${i18n("exportBackupBtn")}</button>
    <button class="btn-wide" data-act="restore-backup" style="margin-top:10px">${i18n("restoreBackupBtn")}</button>
  </div>`;

  html += `<div class="set-grp"><p class="sub">${i18n("backgroundPlayback")}</p>
    <p class="dim" style="line-height:1.5">${i18n("backgroundPlaybackHelper")}</p></div>`;

  html += `<div class="set-grp"><p class="sub">${i18n("about")}</p>
    <p class="dim">${i18n("aboutText")}</p></div>`;
  html += `<div class="pad-bottom"></div>`;
  return html;
}

function renderView() {
  let html = "";
  if (view === "home") html = viewHome();
  else if (view === "search") html = viewSearch();
  else if (view === "library") html = viewLibrary();
  else if (view === "settings") html = viewSettings();
  elView.innerHTML = html;
  if (view === "search") {
    const inp = $("#searchIn");
    if (inp) {
      // Only updates the results container → the input never gets rebuilt,
      // so it keeps focus and cursor position.
      inp.addEventListener("input", (e) => {
        searchQ = e.target.value;
        const rc = $("#searchResults");
        if (rc) rc.innerHTML = searchResultsHTML();
      });
    }
  }
}

function renderNav() {
  const items = [
    ["home", i18n("navHome")],
    ["search", i18n("searchHeading")],
    ["library", i18n("library")],
    ["settings", i18n("settingsHeading")],
  ];
  elNav.innerHTML = items
    .map(
      ([v, label]) =>
        `<button data-act="nav" data-view="${v}" class="${view === v ? "on" : ""}">${ic(v)}<span>${label}</span></button>`,
    )
    .join("");
}

function renderMini() {
  if (!pb.current) {
    elMini.classList.remove("show");
    elMini.innerHTML = "";
    return;
  }
  const t = pb.current;
  const u = artURLs[t.id];
  const prog = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
  elMini.classList.add("show");
  elMini.innerHTML = `
    <div class="mini-row">
      <button class="mini-art" data-act="openplayer">${u ? `<img src="${u}">` : ic("music")}</button>
      <button class="mini-info" data-act="openplayer" style="text-align:left">
        <div class="mini-t">${esc(t.title)}</div>
        <div class="mini-a">${esc(t.artist)}</div>
      </button>
      <button class="mini-btn" data-act="toggle">${ic(pb.playing ? "pause" : "play")}</button>
      <button class="mini-btn" data-act="next">${ic("next")}</button>
    </div>
    <div class="mini-prog"><i style="width:${prog}%"></i></div>`;
}

function renderPlayer() {
  const t = pb.current;
  if (!t) {
    elPlayer.innerHTML = "";
    return;
  }
  const u = artURLs[t.id];
  const repeatOn = pb.repeat !== "off";
  elPlayer.innerHTML = `
    <div class="pl-head">
      <button data-act="closeplayer" class="row-btn">${ic("down")}</button>
      <div class="lbl">${i18n("nowPlaying")}<b>${esc(t.album || i18n("library"))}</b></div>
      <button data-act="moreplayer" class="row-btn">${ic("more")}</button>
    </div>
    <div class="pl-art-wrap"><div class="pl-art">${
      u ? `<img src="${u}">` : `<span class="big">${esc((t.title[0] || "♪").toUpperCase())}</span>`
    }</div></div>
    <div class="pl-meta">
      <div class="m"><div class="pl-song">${esc(t.title)}</div><div class="pl-artist">${esc(t.artist)}</div></div>
      ${settings.playlistsEnabled ? `<button class="row-btn on-accent" data-act="add" data-id="${t.id}" aria-label="${i18n("addToPlaylistTitle")}">${ic("plus")}</button>` : ""}
    </div>
    <input id="seek" class="pl-seek" type="range" min="0" max="1000" value="0">
    <div class="pl-time"><span id="tCur">0:00</span><span id="tDur">${fmt(t.duration)}</span></div>
    <div class="pl-ctrls">
      <button data-act="shuffle" class="${pb.shuffle ? "on-accent" : "sm"}">${ic("shuffle")}</button>
      <button data-act="prev" class="sm">${ic("prev")}</button>
      <button data-act="toggle" class="pl-play" id="bigPlay">${ic(pb.playing ? "pause" : "play")}</button>
      <button data-act="next" class="sm">${ic("next")}</button>
      <button data-act="repeat" class="${repeatOn ? "on-accent" : "sm"}" style="position:relative">${ic("repeat")}${
        pb.repeat === "one" ? '<span style="position:absolute;top:-2px;right:-2px;font-size:9px;font-weight:900">1</span>' : ""
      }</button>
    </div>
    <div class="pl-foot">
      <button class="pl-foot-btn" data-act="queue">${ic("list")}<span>${i18n("queueLabel")}</span></button>
    </div>`;
  const seek = $("#seek");
  if (seek) {
    // initial fill (played portion) based on the current position
    const dur0 = audio.duration || (t.duration ? t.duration / 1000 : 0);
    const r0 = dur0 ? Math.max(0, Math.min(1, audio.currentTime / dur0)) : 0;
    seek.value = String(Math.round(r0 * 1000));
    seek.style.setProperty("--seek", (r0 * 100).toFixed(2) + "%");
    seek.addEventListener("input", () => {
      seeking = true;
      const dur = audio.duration || (t.duration ? t.duration / 1000 : 0);
      $("#tCur").textContent = fmt((seek.value / 1000) * dur * 1000);
      seek.style.setProperty("--seek", (seek.value / 10).toFixed(2) + "%"); // 0..1000 → %
    });
    const commit = () => {
      const dur = audio.duration || (t.duration ? t.duration / 1000 : 0);
      seekTo((seek.value / 1000) * dur);
      setTimeout(() => (seeking = false), 180);
    };
    seek.addEventListener("change", commit);
    seek.addEventListener("pointerup", commit);
  }
  updateProgressUI();
}

// lightweight per-tick updates (no full re-render)
function updateProgressUI() {
  const mini = elMini.querySelector(".mini-prog > i");
  const dur = audio.duration && isFinite(audio.duration) ? audio.duration : pb.current ? pb.current.duration / 1000 : 0;
  const ratio = dur ? audio.currentTime / dur : 0;
  if (mini) mini.style.width = ratio * 100 + "%";
  if (elPlayer.classList.contains("open") && !seeking) {
    const seek = $("#seek");
    if (seek) {
      seek.value = String(Math.round(ratio * 1000));
      seek.style.setProperty("--seek", (ratio * 100).toFixed(2) + "%");
    }
    const c = $("#tCur");
    if (c) c.textContent = fmt(audio.currentTime * 1000);
    const d = $("#tDur");
    if (d && dur) d.textContent = fmt(dur * 1000);
  }
}
function updatePlayUI() {
  const mb = elMini.querySelector('[data-act="toggle"]');
  if (mb) mb.innerHTML = ic(pb.playing ? "pause" : "play");
  const bp = $("#bigPlay");
  if (bp) bp.innerHTML = ic(pb.playing ? "pause" : "play");
}
function refreshActive() {
  // re-render the view to mark the active track, preserving scroll position.
  const st = elView.scrollTop;
  renderView();
  renderNav();
  elView.scrollTop = st;
}

function render() {
  applyTheme();
  renderNav();
  renderView();
  renderMini();
  renderPlayer();
}

// ───────────────────────── player open/close + back button ─────────────────────────
function openPlayer() {
  if (!pb.current) return;
  renderPlayer();
  elPlayer.classList.add("open");
}
function closePlayer() {
  elPlayer.classList.remove("open");
}
function openModal(html) {
  elModal.innerHTML = `<div class="sheet"><div class="grab"></div>${html}</div>`;
  elModal.classList.add("show");
}
function closeModal() {
  elModal.classList.remove("show");
  elModal.innerHTML = "";
}
// dismiss the sheet via a user action (readable alias)
const dismissModal = closeModal;

// Back button: closes whatever is on top first, in order (modal → player →
// playlist detail → back to Home). Returns whether it closed something, so
// callers can decide what "nothing left to close" means for them: the web
// popstate guard below just re-arms and stops (leaving Back inert on Home,
// since a browser/PWA tab shouldn't self-close), while the native Android
// hardware back button (registered further down, if @capacitor/app is
// present) exits the app on Home instead, matching normal Android behavior.
function handleBack() {
  if (elModal.classList.contains("show")) {
    closeModal();
    return true;
  }
  if (elPlayer.classList.contains("open")) {
    closePlayer();
    return true;
  }
  if (plOpen) {
    plOpen = null;
    renderView();
    return true;
  }
  if (view !== "home") {
    view = "home";
    plOpen = null;
    renderNav();
    renderView();
    return true;
  }
  return false;
}
window.addEventListener("popstate", () => {
  handleBack();
  history.pushState(null, ""); // re-arm the guard for the next Back press
});

// The Android hardware/gesture back button doesn't reliably reach the WebView
// as a popstate event (Capacitor's native BridgeActivity needs @capacitor/app
// registered to route it into JS at all — without it, Back exits the app
// immediately instead of navigating within it). No-op on plain web, where
// Capacitor isn't present.
const CapApp = window.Capacitor?.Plugins?.App;
if (CapApp) {
  CapApp.addListener("backButton", () => {
    // Finishing the activity destroys its WebView and stops local audio.
    if (!handleBack()) CapApp.minimizeApp().catch(error => console.warn("Minimize:", error));
  });
}

// add-to-playlist sheet
function openAddSheet(trackId) {
  const t = lib.tracks[trackId];
  if (!t) return;
  const pls = lib.playlists.filter((p) => !p.system);
  let html = `<h3>${i18n("addToPlaylistTitle")}</h3>
    <div class="mk-pl"><input id="newPlName" placeholder="${i18n("newPlaylistPlaceholderInline")}"><button data-act="mkpl" data-id="${trackId}">${i18n("create")}</button></div>`;
  if (!pls.length) html += `<p class="dim">${i18n("noPlaylistsYet")}</p>`;
  else
    html += pls
      .map((p) => {
        const has = p.trackIds.includes(trackId);
        return `<button class="opt" data-act="togglepl" data-pl="${p.id}" data-id="${trackId}">
          <span class="pl-ic" style="width:38px;height:38px">${ic("list")}</span>
          <span class="pl-t">${esc(p.name)}</span>
          <span class="chk">${has ? ic("check") : ""}</span></button>`;
      })
      .join("");
  openModal(html);
  const inp = $("#newPlName");
  if (inp) inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      doCreatePlaylist(inp.value, trackId);
    }
  });
}
function libAddSheet() {
  // The library "+" button menu: import songs or create a new playlist.
  openModal(`<h3>${i18n("addToYourLibrary")}</h3>
    <button class="opt" data-act="downloadsamples">${ic("download")}<span class="pl-t">${i18n("sampleDownload")}</span></button>
    <button class="opt" data-act="import">${ic("music")}<span class="pl-t">${i18n("importSongsOpt")}</span></button>
    ${settings.playlistsEnabled ? `<button class="opt" data-act="newpl">${ic("list")}<span class="pl-t">${i18n("newPlaylistOpt")}</span></button>` : ""}`);
}
function trackMoreSheet(id, plId) {
  const t = lib.tracks[id];
  if (!t) return;
  const p = plId ? playlist(plId) : null;
  const removeOpt =
    p && !p.system
      ? `<button class="opt" data-act="rmfrom" data-id="${id}" data-pl="${plId}">${ic("x")}<span class="pl-t">${i18n("removeFromThisPlaylist")}</span></button>`
      : "";
  openModal(`<h3>${esc(t.title)}</h3>
    ${settings.playlistsEnabled ? `<button class="opt" data-act="add" data-id="${id}">${ic("plus")}<span class="pl-t">${i18n("addToPlaylistTitle")}</span></button>` : ""}
    ${removeOpt}
    <button class="opt danger" data-act="del" data-id="${id}">${ic("trash")}<span class="pl-t" style="color:#ff6b6b">${i18n("deleteFromLibrary")}</span></button>`);
}
// Playback queue sheet (up-next): actual data from pb.queue.
function openQueueSheet() {
  if (!pb.queue.length) {
    toast(i18n("queueIsEmpty"));
    return;
  }
  let html = `<h3>${i18n("playbackQueueTitle")}</h3>`;
  html += pb.queue
    .map((t, i) => {
      const cur = i === pb.qi;
      return `<button class="opt" data-act="jump" data-i="${i}">
        ${artHTML(t)}
        <span class="row-main"><span class="pl-t" style="${cur ? "color:var(--accent)" : ""}">${esc(t.title)}</span><span class="pl-c">${esc(t.artist)}</span></span>
        ${cur ? `<span class="chk">${ic("play")}</span>` : ""}</button>`;
    })
    .join("");
  openModal(html);
}
// "Add to this playlist" sheet: lists your library with checkmarks.
function openAddTracksSheet(plId) {
  const p = playlist(plId);
  if (!p) return;
  const all = allTracks();
  let html = `<h3>${i18n("addToNamed", { name: esc(p.name) })}</h3>`;
  if (!all.length) html += `<p class="dim">${i18n("noSongsImportedYet")}</p>`;
  else
    html += all
      .map((t) => {
        const has = p.trackIds.includes(t.id);
        return `<button class="opt" data-act="toggletrackpl" data-pl="${plId}" data-id="${t.id}">
          ${artHTML(t)}
          <span class="row-main"><span class="pl-t">${esc(t.title)}</span><span class="pl-c">${esc(t.artist)}</span></span>
          <span class="chk">${has ? ic("check") : ""}</span></button>`;
      })
      .join("");
  openModal(html);
}

function doCreatePlaylist(name, addId) {
  const nm = (name || "").trim();
  const p = {
    id: "pl_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: nm || i18n("newPlaylistOpt"),
    system: false,
    trackIds: addId ? [addId] : [],
    createdAt: Date.now(),
  };
  lib.playlists.push(p);
  saveLib();
  render();
  dismissModal();
  if (addId) toast(i18n("addedToPlaylist", { name: p.name }));
}

// ───────────────────────── events (delegation) ─────────────────────────
document.addEventListener("click", (e) => {
  if (miniSwiped) return; // was a swipe on the mini-player, not a tap
  const el = e.target.closest("[data-act]");
  if (!el) {
    if (e.target === elModal) dismissModal();
    return;
  }
  const a = el.dataset.act;
  const id = el.dataset.id;
  switch (a) {
    case "nav":
      navTo(el.dataset.view);
      break;
    case "goto":
      navTo(el.dataset.view);
      break;
    case "toggleplaylists":
      settings.playlistsEnabled = !settings.playlistsEnabled;
      libraryTab = "songs";
      plOpen = null;
      saveSet();
      renderView();
      renderPlayer();
      break;
    case "librarytab":
      libraryTab = el.dataset.tab === "playlists" ? "playlists" : "songs";
      renderView();
      break;
    case "libadd":
      libAddSheet();
      break;
    case "downloadsamples":
      void downloadSamples();
      break;
    case "resumeyoutube":
      void downloadYouTube(true);
      break;
    case "cancelyoutube":
      cancelYouTube();
      break;
    case "openyoutube":
      if (youtubeSavedId && lib.tracks[youtubeSavedId]) {
        searchQ = lib.tracks[youtubeSavedId].title;
        navTo("search");
      }
      break;
    case "opensamples":
      try {
        commitSampleLibrary();
        plOpen = SAMPLE_PLAYLIST;
        view = "library";
        renderNav();
        renderView();
      } catch { toast(i18n("notEnoughStorage")); }
      break;
    case "import":
      $("#filepick").click();
      // if opened from the library "+" menu, close the sheet
      if (elModal.classList.contains("show")) dismissModal();
      break;
    case "play": {
      const q = queueFor(el.dataset.ctx);
      const t = lib.tracks[id];
      if (t) {
        const idx = q ? q.findIndex((x) => x.id === id) : 0;
        play(t, q || [t], idx < 0 ? 0 : idx);
      }
      break;
    }
    case "playall": {
      const q = playlistTracks(id);
      if (q.length) {
        const start = pb.shuffle ? Math.floor(Math.random() * q.length) : 0;
        play(q[start], q, start);
      }
      break;
    }
    case "toggle":
      togglePlay();
      break;
    case "next":
      next();
      break;
    case "prev":
      prev();
      break;
    case "shuffle":
      pb.shuffle = !pb.shuffle;
      prepareNext();
      savePB();
      renderPlayer();
      if (view === "library" && plOpen) renderView(); // refresh the button in detail view
      break;
    case "repeat":
      pb.repeat = pb.repeat === "off" ? "all" : pb.repeat === "all" ? "one" : "off";
      prepareNext();
      savePB();
      renderPlayer();
      break;
    case "openplayer":
      openPlayer();
      break;
    case "closeplayer":
      closePlayer();
      break;
    case "moreplayer":
      if (pb.current) trackMoreSheet(pb.current.id);
      break;
    case "openpl":
      plOpen = id;
      view = "library";
      renderNav();
      renderView();
      break;
    case "backlib":
      plOpen = null;
      renderView();
      break;
    case "newpl":
      openModal(`<h3>${i18n("newPlaylistOpt")}</h3><div class="mk-pl"><input id="newPlName" placeholder="${i18n("namePlaceholder")}"><button data-act="mkpl">${i18n("create")}</button></div>`);
      {
        const inp = $("#newPlName");
        if (inp) {
          inp.focus();
          inp.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter") {
              ev.preventDefault();
              doCreatePlaylist(inp.value);
            }
          });
        }
      }
      break;
    case "mkpl": {
      const inp = $("#newPlName");
      doCreatePlaylist(inp ? inp.value : "", id);
      break;
    }
    case "delpl":
      lib.playlists = lib.playlists.filter((p) => p.id !== id || p.system);
      saveLib();
      plOpen = null;
      renderView();
      toast(i18n("playlistDeleted"));
      break;
    case "rowmore":
      trackMoreSheet(id, el.dataset.pl);
      break;
    case "queue":
      openQueueSheet();
      break;
    case "jump": {
      const i = +el.dataset.i;
      if (pb.queue[i]) {
        play(pb.queue[i], pb.queue, i);
        dismissModal();
      }
      break;
    }
    case "addto":
      openAddTracksSheet(id);
      break;
    case "add":
      // openModal swaps content if a sheet is already open (without a new
      // history entry), so it's enough to just open it.
      openAddSheet(id);
      break;
    case "togglepl": {
      const p = playlist(el.dataset.pl);
      if (p) {
        if (p.trackIds.includes(id)) p.trackIds = p.trackIds.filter((t) => t !== id);
        else p.trackIds.push(id);
        saveLib();
        openAddSheet(id); // refresh checkmarks
      }
      break;
    }
    case "toggletrackpl": {
      const p = playlist(el.dataset.pl);
      if (p) {
        if (p.trackIds.includes(id)) p.trackIds = p.trackIds.filter((t) => t !== id);
        else p.trackIds.push(id);
        saveLib();
        openAddTracksSheet(el.dataset.pl); // refresh checkmarks
        renderView(); // update the detail view behind the sheet
      }
      break;
    }
    case "rmfrom": {
      const p = playlist(el.dataset.pl);
      if (p) {
        p.trackIds = p.trackIds.filter((t) => t !== id);
        saveLib();
        renderView();
      }
      dismissModal(); // rmfrom now comes from the ⋮ menu
      toast(i18n("removedFromPlaylist"));
      break;
    }
    case "del":
      removeTrack(id);
      dismissModal();
      toast(i18n("deletedToast"));
      break;
    case "accent":
      settings.accentIdx = +el.dataset.i;
      saveSet();
      applyTheme();
      render();
      break;
    case "bg":
      settings.bgIdx = +el.dataset.i;
      saveSet();
      applyTheme();
      render();
      break;
    case "mode":
      settings.mode = el.dataset.m;
      saveSet();
      applyTheme();
      render();
      break;
    case "export-backup":
      exportBackup();
      break;
    case "restore-backup":
      pickRestoreFile();
      break;
  }
});

document.addEventListener("input", (event) => {
  if (!event.target.matches?.("[data-youtube-url]")) return;
  youtubeUrl = event.target.value;
  saveYouTubeDraft();
});
document.addEventListener("submit", (event) => {
  if (!event.target.matches?.("[data-youtube-form]")) return;
  event.preventDefault();
  void downloadYouTube();
});

document.addEventListener("change", (event) => {
  if (event.target.id !== "languageSelect") return;
  const locale = event.target.value;
  if (!isSupportedLocale(locale)) return;
  settings.locale = locale;
  saveSet();
  LOCALE = locale;
  document.documentElement.lang = LOCALE;
  const systemPlaylist = lib.playlists.find(p => p.id === SYS);
  if (systemPlaylist) systemPlaylist.name = i18n("importedSongsPlaylist");
  saveLib();
  render();
  $("#languageSelect")?.focus({ preventScroll: true });
});

function navTo(v) {
  if (!v) return;
  if (v === "library" && view === "library") plOpen = null;
  view = v;
  if (v !== "library") plOpen = null;
  renderNav();
  renderView();
  if (v === "settings") refreshEstimate();
}

async function refreshEstimate() {
  window.__est = await storageEstimate();
  if (view === "settings") renderView();
}

$("#filepick").addEventListener("change", (e) => {
  const files = Array.from(e.target.files || []);
  e.target.value = "";
  importFiles(files);
});

$("#backupPick").addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = "";
  restoreBackupFile(file);
});

// Save the actual position without pausing background playback.
window.addEventListener("pagehide", savePB);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") savePB();
});

// ───────────────────── mini-player: swipe to dismiss ─────────────────────
// Swipe down or to the left on the mini-player → stops playback and hides it.
function dismissMini() {
  pause();
  releaseAudio(preparedNext);
  releaseAudio(preparedRestore);
  preparedNext = preparedRestore = null;
  if (curURL) {
    URL.revokeObjectURL(curURL);
    curURL = null;
  }
  audio.removeAttribute("src");
  audio.load();
  pb.current = null;
  loadedTrackId = null;
  restorePosition = null;
  pb.position = 0;
  pb.queue = [];
  pb.qi = -1;
  savePB();
  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
    } catch {}
  }
  renderMini();
  refreshActive(); // clear the active-track highlight
}
let _mTouch = null;
elMini.addEventListener(
  "touchstart",
  (e) => {
    const t = e.touches[0];
    _mTouch = { x: t.clientX, y: t.clientY };
  },
  { passive: true },
);
elMini.addEventListener(
  "touchend",
  (e) => {
    if (!_mTouch) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - _mTouch.x;
    const dy = t.clientY - _mTouch.y;
    _mTouch = null;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const down = ady > 46 && ady > adx && dy > 0;
    const left = adx > 60 && adx > ady && dx < 0;
    if (down || left) {
      miniSwiped = true;
      setTimeout(() => (miniSwiped = false), 350);
      dismissMini();
    }
  },
  { passive: true },
);

// Repair tags already cached by the old UTF-16 decoder from the stored audio.
async function repairImportedMetadata() {
  let changed = false;
  for (const track of Object.values(lib.tracks)) {
    const fields = ["title", "artist", "album"];
    if (!fields.some(key => /[\ufffd\ufffe]/u.test(track[key] || ""))) continue;
    try {
      const blob = await getAudio(track.id);
      if (!blob) continue;
      const meta = await readMeta(blob);
      if (lib.tracks[track.id] !== track) continue;
      for (const key of fields) {
        if (meta[key] && meta[key] !== track[key]) {
          track[key] = meta[key];
          changed = true;
        }
      }
    } catch (error) {
      console.warn("Metadata repair:", error);
    }
  }
  if (changed) {
    saveLib();
    render();
    if (pb.current) updateMediaSession(pb.current);
  }
}

// ───────────────────────── startup ─────────────────────────
loadAll();
loadYouTubeDraft();
applyTheme();
render();
history.pushState(null, ""); // initial guard to catch the Back button
warmArt();
refreshEstimate();
ensureHandlers();
repairImportedMetadata().catch(error => console.warn("Metadata repair:", error));
if (pb.current) updateMediaSession(pb.current);
prepareRestoredCurrent();
void checkSavedSamples();
