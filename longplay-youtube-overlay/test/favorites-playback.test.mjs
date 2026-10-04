import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp, expectPlaylist, favorites, searched, history } from './app-harness.mjs';

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
