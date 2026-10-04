import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp, expectPlaylist, favorites } from './app-harness.mjs';

const SEEK_ACTIONS = ['seekto', 'seekbackward', 'seekforward'];
function playingApp(options = {}) {
  const app = createApp({ mediaSession: true, ...options });
  app.view('likes');
  app.card(1);
  return app;
}
const playbackSnapshot = app => ({
  loads: structuredClone(app.calls), playCount: app.player.playCount,
  pauseCount: app.player.pauseCount, audioCalls: [...app.audioCalls],
  state: app.player.state, videoId: app.player.videoId,
  queue: app.elements.get('queue').innerHTML,
  savedSession: app.storage.get('teslaYT:session'),
});
function expectOnlySeek(app, action, details, target) {
  const before = playbackSnapshot(app), seekCount = app.seekCalls.length;
  app.mediaAction(action, details);
  assert.equal(app.seekCalls.length, seekCount + 1, 'One valid Media Session event must issue exactly one seek');
  assert.deepEqual(app.seekCalls.at(-1), { seconds: target, allowSeekAhead: true });
  assert.deepEqual(playbackSnapshot(app), before,
    'A seek must preserve playback state, track, queue, session, and keep-alive commands');
}

test('Absolute lock-screen seek moves the selected track without replaying or replacing its queue', () => {
  const app = playingApp();
  app.player.time = 20;
  app.player.duration = 180;
  expectOnlySeek(app, 'seekto', { seekTime: 72.5 }, 72.5);
  assert.equal(app.player.time, 20, 'A command is not confirmation of the resulting YouTube time');
  expectPlaylist(app, favorites, 1);
});

test('Relative lock-screen seek uses the default or supplied offset and reads actual player time for each event', () => {
  const app = playingApp();
  app.player.time = 60;
  expectOnlySeek(app, 'seekbackward', {}, 50);
  expectOnlySeek(app, 'seekforward', undefined, 70);
  expectOnlySeek(app, 'seekbackward', { seekOffset: 15 }, 45);
  expectOnlySeek(app, 'seekforward', { seekOffset: 25 }, 85);
  app.player.time = 95;
  expectOnlySeek(app, 'seekbackward', { seekOffset: 5 }, 90);
});

test('Absolute and relative seek targets are clamped to the current track duration', () => {
  const app = playingApp();
  app.player.duration = '180';
  expectOnlySeek(app, 'seekto', { seekTime: -50 }, 0);
  expectOnlySeek(app, 'seekto', { seekTime: 1000 }, 180);
  app.player.time = '4';
  expectOnlySeek(app, 'seekbackward', { seekOffset: 10 }, 0);
  app.player.time = 175;
  expectOnlySeek(app, 'seekforward', { seekOffset: 20 }, 180);
});

test('Malformed seek events are ignored without changing playback or keep-alive state', () => {
  const app = playingApp();
  app.player.time = 60;
  const before = playbackSnapshot(app);
  for (const details of [{}, null, { seekTime: NaN }, { seekTime: Infinity },
    { seekTime: -Infinity }, { seekTime: '30' }, { seekTime: null }]) {
    app.mediaAction('seekto', details);
  }
  for (const action of ['seekbackward', 'seekforward']) {
    for (const seekOffset of [0, -10, NaN, Infinity, '10', null]) app.mediaAction(action, { seekOffset });
  }
  assert.equal(app.seekCalls.length, 0);
  assert.deepEqual(playbackSnapshot(app), before);
});

test('Invalid or throwing YouTube timing getters leave seek actions as harmless no-ops', () => {
  const app = playingApp();
  const before = playbackSnapshot(app);
  for (const duration of [0, -1, NaN, Infinity, 'unknown', undefined]) {
    app.player.duration = duration;
    for (const action of SEEK_ACTIONS) app.mediaAction(action, { seekTime: 25, seekOffset: 10 });
  }
  app.player.duration = 180;
  for (const position of [NaN, Infinity, -Infinity, 'unknown', undefined]) {
    app.player.time = position;
    app.mediaAction('seekbackward');
    app.mediaAction('seekforward');
  }
  app.player.getCurrentTime = () => { throw new Error('Player position unavailable'); };
  assert.doesNotThrow(() => app.mediaAction('seekforward'));
  app.player.getDuration = () => { throw new Error('Player duration unavailable'); };
  for (const action of SEEK_ACTIONS) assert.doesNotThrow(() => app.mediaAction(action, { seekTime: 25 }));
  assert.equal(app.seekCalls.length, 0);
  assert.deepEqual(playbackSnapshot(app), before);
});

test('Missing Media Session support leaves the existing page and local seek control usable', () => {
  const app = playingApp({ mediaSession: false });
  assert.equal(app.mediaActions.size, 0);
  app.elements.get('seek').value = '500';
  app.elements.get('seek').onchange();
  assert.deepEqual(app.seekCalls, [{ seconds: 90, allowSeekAhead: true }]);
  expectPlaylist(app, favorites, 1);
});

test('A browser rejecting one seek action still receives the other supported actions', () => {
  for (const rejected of SEEK_ACTIONS) {
    const app = playingApp({ unsupportedMediaActions: [rejected] });
    app.player.time = 60;
    assert.equal(app.mediaActions.has(rejected), false);
    for (const action of SEEK_ACTIONS.filter(action => action !== rejected)) {
      const target = action === 'seekto' ? 30 : action === 'seekbackward' ? 50 : 70;
      expectOnlySeek(app, action, action === 'seekto' ? { seekTime: 30 } : {}, target);
    }
    for (const action of SEEK_ACTIONS) assert.equal(
      app.mediaRegistrations.filter(registration => registration.action === action).length, 1,
      'Each supported or rejected seek action should be registered independently once');
  }
});

test('System seek cannot act before YouTube is ready or while there is no current track', async () => {
  const pending = createApp({ mediaSession: true, ready: false });
  pending.view('likes');
  pending.card(1);
  const pendingBefore = playbackSnapshot(pending);
  for (const action of SEEK_ACTIONS) pending.mediaAction(action, { seekTime: 30 });
  assert.equal(pending.seekCalls.length, 0);
  assert.deepEqual(playbackSnapshot(pending), pendingBefore);

  const empty = createApp({ mediaSession: true });
  await empty.search('displayed but not played');
  const emptyBefore = playbackSnapshot(empty);
  for (const action of SEEK_ACTIONS) empty.mediaAction(action, { seekTime: 30 });
  assert.equal(empty.seekCalls.length, 0);
  assert.deepEqual(playbackSnapshot(empty), emptyBefore);
});

test('Seeking a paused mobile track near its end cannot make the polling timer advance to another song', async () => {
  const app = playingApp();
  app.fireState(2);
  app.player.time = 20;
  const before = playbackSnapshot(app);
  expectOnlySeek(app, 'seekto', { seekTime: 179.9 }, 179.9);
  app.player.time = 179.9; // The iframe later reports the position reached by the seek.
  await app.advance(1200);
  assert.deepEqual(playbackSnapshot(app), before,
    'A paused near-end position must not trigger Next, a new playlist, Play, or keep-alive playback');
  assert.equal(app.player.state, 2);
  assert.equal(app.positionStates.at(-1).position, 179.9);
});

test('Seek handlers survive existing media updates and read the new track and confirmed position without an optimistic clock', async () => {
  const app = playingApp();
  const handlers = new Map(SEEK_ACTIONS.map(action => [action, app.mediaActions.get(action)]));
  app.player.time = 17;
  app.fireState(1);
  expectOnlySeek(app, 'seekforward', {}, 27);
  expectOnlySeek(app, 'seekforward', {}, 27);
  await app.advance(350);
  assert.equal(app.positionStates.at(-1).position, 17,
    'System position must remain the actual iframe time until the iframe confirms a change');
  app.player.time = 47;
  app.fireState(2);
  await app.advance(350);
  assert.equal(app.positionStates.at(-1).position, 47);
  expectOnlySeek(app, 'seekbackward', { seekOffset: 5 }, 42);

  app.card(2);
  app.player.time = 3;
  app.player.duration = 120;
  expectOnlySeek(app, 'seekforward', {}, 13);
  await app.advance(350);
  for (const action of SEEK_ACTIONS) {
    assert.equal(app.mediaActions.get(action), handlers.get(action), 'Existing media updates must not replace seek handlers');
    assert.equal(app.mediaRegistrations.filter(registration => registration.action === action).length, 1);
  }
});

test('Seek actions are absent outside the explicitly requested mobile mode', async () => {
  for (const locationSearch of ['', '?mobile=0', '?mobile=true']) {
    const app = playingApp({ locationSearch });
    app.fireState(1);
    await app.advance(350);
    for (const action of SEEK_ACTIONS) assert.equal(app.mediaActions.has(action), false);
    for (const action of ['play', 'pause', 'nexttrack', 'previoustrack']) {
      assert.equal(typeof app.mediaActions.get(action), 'function', 'Existing system controls must remain available');
    }
  }
});
