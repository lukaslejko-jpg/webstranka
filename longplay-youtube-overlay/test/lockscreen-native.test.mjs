import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp, expectPlaylist, favorites } from './app-harness.mjs';

// These integration tests observe the parent page's commands and side effects.
// Native iPhone controls and playback while locked require a real device test.
function expectNoParentMedia(app, phase) {
  assert.equal(app.audioCalls.filter(action => action === 'play').length, 0,
    `${phase}: mobile must not start a competing helper audio clock`);
  assert.equal(app.mediaRegistrations.length, 0,
    `${phase}: mobile must leave native system actions to the YouTube media`);
  assert.equal(app.metadataWrites.length, 0,
    `${phase}: mobile must not replace the native media metadata`);
  assert.equal(app.playbackStateWrites.length, 0,
    `${phase}: mobile must not publish a competing playback state`);
  assert.equal(app.positionStates.length, 0,
    `${phase}: mobile must not publish a competing position`);
}

function selectedApp(options = {}) {
  const app = createApp({ mediaSession: true, ...options });
  app.view('likes');
  app.card(1);
  return app;
}

const playbackSnapshot = app => ({
  loads: structuredClone(app.calls),
  playCount: app.player.playCount,
  pauseCount: app.player.pauseCount,
  state: app.player.state,
  videoId: app.player.videoId,
  queue: app.elements.get('queue').innerHTML,
  savedSession: app.storage.get('teslaYT:session'),
});

test('Mobile boot, touch, restored playback and state polling never claim parent media ownership', async () => {
  const app = createApp({ mediaSession: true, ready: false, last: favorites[1] });
  assert.equal(app.calls.length, 0, 'Restored playback must wait for YouTube readiness');
  expectNoParentMedia(app, 'before readiness');

  app.fireDocument('pointerdown');
  app.fireDocument('touchstart');
  expectNoParentMedia(app, 'initial interaction');

  app.fireReady();
  assert.equal(app.calls.length, 1, 'Native ownership must not remove the existing restoration request');
  assert.equal(app.player.videoId, favorites[1].id);
  expectNoParentMedia(app, 'restored startup');

  for (const state of [1, 3, 2, 5]) {
    app.player.time = 15;
    app.fireState(state);
    await app.advance(700);
    expectNoParentMedia(app, `player state ${state} and polling`);
  }
  assert.equal(app.calls.length, 1, 'Polling state changes must not reload the restored song');
});

test('Mobile page Play, Pause, Next, Previous and ended events still control the existing playlist', () => {
  const app = selectedApp();
  app.button('shuffle'); // Use deterministic order for the existing Next/Previous controls.
  expectPlaylist(app, favorites, 1);
  expectNoParentMedia(app, 'selected favorite');

  const { playCount, pauseCount } = app.player;
  app.button('play');
  assert.equal(app.player.pauseCount, pauseCount + 1);
  assert.equal(app.player.state, 2);
  expectNoParentMedia(app, 'page Pause');
  app.button('play');
  assert.equal(app.player.playCount, playCount + 1);
  assert.equal(app.player.state, 1);
  expectNoParentMedia(app, 'page Play');

  const initialLoads = app.calls.length;
  app.button('next');
  assert.equal(app.calls.length, initialLoads + 1);
  expectPlaylist(app, favorites, 2);
  app.fireState(1);
  expectNoParentMedia(app, 'Next and PLAYING event');

  app.button('prev');
  assert.equal(app.calls.length, initialLoads + 2);
  expectPlaylist(app, favorites, 1);
  app.fireState(0);
  assert.equal(app.calls.length, initialLoads + 3, 'An actual ended event must still advance exactly once');
  expectPlaylist(app, favorites, 2);
  expectNoParentMedia(app, 'Previous and automatic continuation');
});

test('The mobile page slider sends a real YouTube seek without inventing a confirmed playback time', async () => {
  const app = selectedApp();
  app.fireState(2);
  app.player.time = 30;
  const before = playbackSnapshot(app);

  app.elements.get('seek').value = '750';
  app.elements.get('seek').onchange();
  assert.deepEqual(app.seekCalls, [{ seconds: 135, allowSeekAhead: true }]);
  assert.deepEqual(playbackSnapshot(app), before,
    'The slider must preserve the selected track, pause state, queue and load commands');
  assert.equal(app.player.time, 30, 'Issuing a seek is not confirmation that YouTube reached it');
  await app.advance(350);
  assert.equal(app.elements.get('elapsed').textContent, '0:30');

  app.player.time = 135; // A later player report, separate from the seek command.
  await app.advance(350);
  assert.equal(app.elements.get('elapsed').textContent, '2:15');
  assert.deepEqual(playbackSnapshot(app), before);
  expectNoParentMedia(app, 'local seek and actual player time updates');
});

test('A paused mobile page seek near the end cannot trigger Next, reload, or Play during polling', async () => {
  const app = selectedApp();
  app.fireState(2);
  app.player.time = 20;
  app.player.duration = 180;
  const before = playbackSnapshot(app);

  app.elements.get('seek').value = '1000';
  app.elements.get('seek').onchange();
  assert.deepEqual(app.seekCalls, [{ seconds: 180, allowSeekAhead: true }]);
  assert.equal(app.player.time, 20);
  app.player.time = 179.9; // The iframe subsequently reports the reached position.
  await app.advance(1200);

  assert.deepEqual(playbackSnapshot(app), before,
    'A paused near-end position must not start another track or resume playback');
  assert.equal(app.player.state, 2);
  expectNoParentMedia(app, 'paused near-end seek');
});

test('Mobile page playback and seeking remain usable without the Media Session API', async () => {
  const app = selectedApp({ mediaSession: false });
  app.fireDocument('pointerdown');
  app.fireDocument('touchstart');
  app.button('play');
  assert.equal(app.player.state, 2);
  app.elements.get('seek').value = '500';
  app.elements.get('seek').onchange();
  assert.deepEqual(app.seekCalls, [{ seconds: 90, allowSeekAhead: true }]);
  app.button('play');
  assert.equal(app.player.state, 1);
  await app.advance(350);
  expectPlaylist(app, favorites, 1);
  expectNoParentMedia(app, 'browser without Media Session');
});

test('Non-mobile URLs retain the existing helper audio, four system actions and player position publication', async () => {
  for (const locationSearch of ['', '?mobile=0', '?mobile=true']) {
    const app = selectedApp({ locationSearch });
    assert.ok(app.audioCalls.includes('play'), `${locationSearch}: existing helper must still play`);
    assert.ok(app.metadataWrites.length > 0, `${locationSearch}: existing metadata publication remains`);
    assert.ok(app.playbackStateWrites.length > 0, `${locationSearch}: existing playback state publication remains`);
    assert.deepEqual([...app.mediaActions.keys()].sort(), ['nexttrack', 'pause', 'play', 'previoustrack']);

    const playsBeforeTouch = app.audioCalls.filter(action => action === 'play').length;
    app.fireDocument('pointerdown');
    app.fireDocument('touchstart');
    assert.ok(app.audioCalls.filter(action => action === 'play').length > playsBeforeTouch,
      `${locationSearch}: the existing gesture path must still hold audio`);

    app.fireState(1);
    app.player.time = 42;
    await app.advance(350);
    assert.deepEqual(app.positionStates.at(-1), { duration: 180, position: 42, playbackRate: 1 });

    const pauses = app.player.pauseCount;
    app.mediaAction('pause');
    assert.equal(app.player.pauseCount, pauses + 1);
    const plays = app.player.playCount;
    app.mediaAction('play');
    assert.equal(app.player.playCount, plays + 1);
    expectPlaylist(app, favorites, 1);
  }
});
