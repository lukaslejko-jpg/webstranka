import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp, expectPlaylist, expectRestoredPlaylist, expectAppQueue,
  favorites, searched, history, ids, flush, track } from './app-harness.mjs';

const SESSION = 'teslaYT:session';
const snapshot = (overrides = {}) => ({
  version: 1,
  items: searched,
  queue: searched,
  current: searched[1],
  view: 'search',
  query: 'saved search',
  searchQuery: 'saved search',
  searchPage: 0,
  searchItems: searched,
  filter: 'music',
  shuffle: false,
  repeat: false,
  ...overrides,
});
const seed = (session, { likes = favorites, recent = [], last = null } = {}) => new Map([
  [SESSION, typeof session === 'string' ? session : JSON.stringify(session)],
  ['teslaYT:likes', JSON.stringify(likes)],
  ['teslaYT:recent', JSON.stringify(recent)],
  ['teslaYT:last', JSON.stringify(last)],
]);
const ordered = app => {
  if (app.elements.get('shuffle').classList.contains('active')) app.button('shuffle');
};
function expectControl(app, playing) {
  const play = app.elements.get('play');
  assert.equal(play.getAttribute('aria-label'), playing ? 'Pozastaviť' : 'Prehrať',
    'The accessible action must describe the actual playback state');
  assert.equal(play.classList.contains('paused'), playing,
    'The class controlling the visible pause symbol must match playback');
}
function expectVisible(app, tracks) {
  assert.equal(app.cards.length, tracks.length, 'The full saved result list must be rendered');
  const html = app.elements.get('grid').innerHTML;
  let previous = -1;
  for (const track of tracks) {
    const position = html.indexOf(track.title);
    assert.ok(position > previous, `Missing or reordered visible track: ${track.title}`);
    previous = position;
  }
}

test('Play control starts with the play action and follows actual YouTube state events', () => {
  const app = createApp();
  expectControl(app, false);
  for (const state of [1, 2, 1, 3, 5, -1, 0]) {
    app.fireState(state);
    expectControl(app, state === 1);
  }
});

test('Periodic player polling also repairs Play/Pause state after an external player change', async () => {
  const app = createApp();
  app.player.state = 1;
  await app.advance(350);
  expectControl(app, true);
  app.player.state = 2;
  await app.advance(350);
  expectControl(app, false);
});

test('Pausing and resuming a favorite updates the action without loading a new playlist', () => {
  const app = createApp();
  app.view('likes');
  app.card(1);
  app.fireState(1);
  expectControl(app, true);
  const loads = structuredClone(app.calls);
  app.button('play');
  app.fireState(2);
  expectControl(app, false);
  app.button('play');
  app.fireState(1);
  expectControl(app, true);
  assert.deepEqual(app.calls, loads);
  assert.equal(app.player.pauseCount, 1);
  assert.equal(app.player.playCount, 1);
});

test('A full reload restores search cards, query, selected view, and current-track continuation', async () => {
  const first = createApp();
  await first.search('queen saved results');
  first.card(1);
  ordered(first);

  const restored = createApp({ storage: first.storage, ready: false });
  expectVisible(restored, searched);
  assert.equal(restored.elements.get('q').value, 'queen saved results');
  assert.equal(restored.activeView, 'search');
  assert.match(restored.elements.get('heading').textContent, /Vyhľadané/);
  assert.equal(restored.calls.length, 0, 'Restoration must not call an unready iframe');
  restored.fireReady();
  expectRestoredPlaylist(restored, searched, 1);
  restored.button('next');
  expectPlaylist(restored, searched, 2);
  assert.equal(restored.calls.length, 2, 'Next must load exactly one subsequent track');
});

test('Favorites and the selected track survive reload with Next, Previous, and automatic continuation', () => {
  const first = createApp();
  first.view('likes');
  first.card(1);
  ordered(first);

  const restored = createApp({ storage: first.storage });
  expectVisible(restored, favorites);
  assert.equal(restored.activeView, 'likes');
  assert.equal(restored.elements.get('heading').textContent, 'Obľúbené');
  expectRestoredPlaylist(restored, favorites, 1);
  restored.button('next');
  expectPlaylist(restored, favorites, 2);
  restored.button('prev');
  expectPlaylist(restored, favorites, 1);
  const beforeEnded = restored.calls.length;
  restored.fireState(0);
  expectPlaylist(restored, favorites, 2);
  assert.equal(restored.calls.length, beforeEnded + 1, 'An ended event must advance exactly once');
});

test('After reload a disjoint last track continues into the last displayed list', async () => {
  const first = createApp();
  await first.search();
  first.card(1);
  ordered(first);
  const loads = structuredClone(first.calls);
  first.view('likes');
  assert.deepEqual(first.calls, loads, 'Browsing alone must not disturb current playback');

  const restored = createApp({ storage: first.storage });
  const continuation = [searched[1], ...favorites];
  expectVisible(restored, favorites);
  expectRestoredPlaylist(restored, continuation, 0);
  restored.button('next');
  expectPlaylist(restored, continuation, 1);
  restored.fireState(0);
  expectPlaylist(restored, continuation, 2);
});

test('A displayed search list with no previous current track survives reload and Play starts it', async () => {
  const first = createApp();
  await first.search('unplayed saved results');
  const restored = createApp({ storage: first.storage });
  expectVisible(restored, searched);
  assert.equal(restored.calls.length, 0);
  restored.button('play');
  expectPlaylist(restored, searched, 0);
});

test('Returning to Search after restoring Favorites shows the actual saved search results', async () => {
  const first = createApp();
  await first.search('separate result set');
  first.view('likes');
  first.card(0);
  const restored = createApp({ storage: first.storage });
  expectVisible(restored, favorites);
  expectRestoredPlaylist(restored, favorites, 0);
  const loads = structuredClone(restored.calls);
  restored.view('search');
  expectVisible(restored, searched);
  assert.equal(restored.elements.get('q').value, 'separate result set');
  assert.deepEqual(restored.calls, loads, 'Restoring the saved search view must not reload playback');
});

test('Saved recent view preserves its last displayed order after playing a track from the middle', () => {
  const first = createApp({ recent: history });
  first.view('recent');
  first.card(1);
  ordered(first);
  const recentHistory = JSON.parse(first.storage.get('teslaYT:recent'));
  assert.equal(recentHistory[0].id, history[1].id, 'Playback history should still record the latest track first');
  const restored = createApp({ storage: first.storage });
  expectVisible(restored, history);
  assert.equal(restored.activeView, 'recent');
  expectRestoredPlaylist(restored, history, 1);
  restored.button('next');
  expectPlaylist(restored, history, 2);
});

test('An empty displayed list falls back to the saved active queue for continued playback', () => {
  const session = snapshot({ view: 'likes', items: [], current: searched[1] });
  const app = createApp({ storage: seed(session, { likes: [] }) });
  expectVisible(app, []);
  expectRestoredPlaylist(app, searched, 1);
  app.button('next');
  expectPlaylist(app, searched, 2);
});

test('The atomic session current track takes precedence over an older legacy last-track value', () => {
  const app = createApp({ storage: seed(snapshot(), { last: history[0] }) });
  expectRestoredPlaylist(app, searched, 1);
});

test('Full-list restoration sends the same one-track startup payload as legacy last-track-only restoration', () => {
  const legacy = createApp({ last: searched[1], loadState: 5 });
  const restored = createApp({ storage: seed(snapshot()), loadState: 5 });
  assert.deepEqual(restored.calls, legacy.calls);
  assert.equal(restored.calls.length, 1);
  assert.equal(restored.player.config.playerVars.autoplay, 1);
  expectRestoredPlaylist(restored, searched, 1);
  expectRestoredPlaylist(legacy, [searched[1]], 0);
  assert.equal(restored.player.state, 5,
    'Requesting the correct startup video must not be treated as proof of audible playback');
});

test('Recent-history fallback uses the one-track startup payload while keeping the displayed continuation list', () => {
  const app = createApp({ storage: seed(snapshot({ current: null }), { recent: history }) });
  expectRestoredPlaylist(app, [history[0], ...searched], 0);
  app.button('next');
  expectPlaylist(app, [history[0], ...searched], 1);
});

test('Next, Previous, and ENDED use the full application queue after a one-track startup load', () => {
  for (const [action, expectedIndex] of [['next', 2], ['prev', 0], ['ended', 2]]) {
    const app = createApp({ storage: seed(snapshot()) });
    expectRestoredPlaylist(app, searched, 1);
    if (action === 'ended') app.fireState(0);
    else app.button(action);
    assert.equal(app.calls.length, 2, `${action} must issue exactly one subsequent load`);
    expectPlaylist(app, searched, expectedIndex);
    expectAppQueue(app, searched, expectedIndex);
  }
});

test('Startup does not retry a cued load or override a later PLAYING to PAUSED transition', async () => {
  // This models command/state timing only; real Safari autoplay is verified on-device.
  const app = createApp({ storage: seed(snapshot()), loadState: 5 });
  expectRestoredPlaylist(app, searched, 1);
  await app.advance(1500);
  assert.equal(app.player.state, 5);
  assert.equal(app.player.playCount, 0);
  assert.equal(app.calls.length, 1);
  expectControl(app, false);
  app.fireState(1);
  expectControl(app, true);
  app.fireState(2);
  expectControl(app, false);
  await app.advance(3000);
  assert.equal(app.player.state, 2, 'An explicit player pause must remain paused');
  assert.equal(app.player.playCount, 0, 'No startup retry may reissue Play after a pause');
  assert.equal(app.calls.length, 1, 'No delayed startup load may replace the restored song');
  expectAppQueue(app, searched, 1);
});

test('A user selection before iframe readiness wins over restored current and queue', async () => {
  const app = createApp({ storage: seed(snapshot()), ready: false });
  app.view('likes');
  app.card(2);
  assert.equal(app.calls.length, 0);
  app.fireReady();
  assert.equal(app.calls.length, 1, 'Readiness must issue only the user-selected load');
  expectPlaylist(app, favorites, 2);
  expectAppQueue(app, favorites, 2);
  await app.advance(1500);
  assert.equal(app.calls.length, 1, 'Automatic restoration must not later replace the selected playlist');
});

test('Central Play before iframe readiness retains the restored second track', () => {
  const app = createApp({ storage: seed(snapshot()), ready: false });
  app.button('play');
  assert.equal(app.calls.length, 0);
  app.fireReady();
  assert.equal(app.calls.length, 1);
  expectPlaylist(app, searched, 1);
  expectAppQueue(app, searched, 1);
});

test('Central Play before iframe readiness retains a newer explicit card selection', () => {
  const app = createApp({ storage: seed(snapshot()), ready: false });
  app.view('likes');
  app.card(2);
  app.button('play');
  assert.equal(app.calls.length, 0);
  app.fireReady();
  assert.equal(app.calls.length, 1);
  expectPlaylist(app, favorites, 2);
  expectAppQueue(app, favorites, 2);
});

test('Toggling one favorite in a list larger than the snapshot limit retains every untouched favorite', () => {
  const largeList = Array.from({ length: 2001 }, (_, i) => track(`big${String(i).padStart(8, '0')}`, `Long list ${i}`));
  const app = createApp({ likes: largeList });
  app.view('likes');
  app.like(0);
  const saved = JSON.parse(app.storage.get('teslaYT:likes'));
  assert.equal(saved.length, 2000);
  assert.deepEqual(ids(saved), ids(largeList.slice(1)), 'Only the explicitly toggled favorite may be removed');
  assert.equal(saved.at(-1).id, largeList[2000].id);
});

test('Restoration removes invalid and duplicate saved tracks while preserving valid continuation order', () => {
  const dirty = [null, {}, { id: 'invalid-id', title: 'Invalid track' }, searched[0],
    { ...searched[0], title: 'Duplicate track' }, searched[1]];
  const session = snapshot({ items: dirty, searchItems: dirty, queue: dirty, current: searched[0] });
  const app = createApp({ storage: seed(session) });
  const expected = searched.slice(0, 2);
  expectVisible(app, expected);
  expectRestoredPlaylist(app, expected, 0);
  app.button('next');
  expectPlaylist(app, expected, 1);
  assert.ok(!app.elements.get('grid').innerHTML.includes('Invalid track'));
  assert.ok(!app.elements.get('grid').innerHTML.includes('Duplicate track'));
});

test('Malformed object IDs are discarded and malformed durations cannot crash cached-track restoration', () => {
  const dirty = [
    { id: { toString: null }, title: 'Invalid object ID' },
    { ...favorites[0], duration: { toString: null } },
    favorites[1],
  ];
  const session = snapshot({ items: dirty, searchItems: dirty, queue: dirty, current: dirty[1] });
  const app = createApp({ storage: seed(session, { likes: dirty }) });
  const expected = favorites.slice(0, 2);
  expectVisible(app, expected);
  expectRestoredPlaylist(app, expected, 0);
  assert.equal(JSON.parse(app.storage.get('teslaYT:last')).duration, 0,
    'An unusable stored duration should fall back to zero');
  app.view('likes');
  expectVisible(app, expected);
  app.card(1);
  expectPlaylist(app, expected, 1);
});

for (const [name, session] of [
  ['invalid JSON', '{"version":1'],
  ['unsupported snapshot version', snapshot({ version: 99 })],
  ['null snapshot', null],
  ['non-object snapshot', 5],
]) {
  test(`Malformed session (${name}) falls back to the legacy last track without crashing`, () => {
    const app = createApp({ storage: seed(session, { last: history[0] }) });
    expectRestoredPlaylist(app, [history[0]], 0);
    app.view('likes');
    app.card(1);
    expectPlaylist(app, favorites, 1);
  });
}

test('Invalid session track falls back to a valid legacy last track and displayed list', () => {
  const app = createApp({ storage: seed(snapshot({ current: { id: 'bad' } }), { last: searched[2] }) });
  expectRestoredPlaylist(app, searched, 2);
});

for (const [name, storageOptions] of [
  ['reads and writes denied', { denyStorageReads: true, denyStorageWrites: true }],
  ['storage quota exceeded', { denyStorageWrites: true }],
]) {
  test(`Unavailable storage (${name}) leaves search, favorite buttons, and playback usable`, async () => {
    const app = createApp(storageOptions);
    await app.search('works without storage');
    app.like(0);
    app.card(0);
    expectPlaylist(app, searched, 0);
    ordered(app);
    app.button('next');
    expectPlaylist(app, searched, 1);
    app.view('likes');
    assert.ok(app.cards.length > 0, 'Favorites should still update in memory');
    assert.ok(ids(searched).includes(app.player.videoId));
  });
}

test('A search completed after navigating to Favorites preserves that displayed view and its saved list', async () => {
  const app = createApp();
  app.deferSearchResponses(true);
  app.submitSearch('late results');
  const pending = app.searchRequests.at(-1);
  assert.equal(pending.settled, false);
  app.view('likes');
  app.card(0);
  pending.respond(searched);
  await flush();
  expectVisible(app, favorites);
  assert.equal(app.activeView, 'likes');
  assert.equal(app.elements.get('heading').textContent, 'Obľúbené');
  expectPlaylist(app, favorites, 0);

  const restored = createApp({ storage: app.storage });
  expectVisible(restored, favorites);
  assert.equal(restored.activeView, 'likes');
  expectRestoredPlaylist(restored, favorites, 0);
  restored.view('search');
  expectVisible(restored, searched);
});

test('An in-flight infinite-scroll request cannot append search tracks into subsequently displayed Favorites', async () => {
  const app = createApp();
  await app.search('scrolling results');
  app.card(0);
  app.deferSearchResponses(true);
  app.scrollToEnd();
  const pending = app.searchRequests.filter(request => !request.settled);
  assert.ok(pending.length > 0, 'Scrolling must start an actual delayed search request');
  app.view('likes');
  const queueHtml = app.elements.get('queue').innerHTML;
  pending.forEach((request, index) => request.respond(index ? [] : history));
  await flush();
  expectVisible(app, favorites);
  assert.equal(app.elements.get('queue').innerHTML, queueHtml,
    'An offscreen search completion must not change the active playback queue');

  const restored = createApp({ storage: app.storage });
  expectVisible(restored, favorites);
  assert.equal(restored.activeView, 'likes');
  expectRestoredPlaylist(restored, [searched[0], ...favorites], 0);
});

test('When two searches complete out of order only the latest query is displayed and saved', async () => {
  const app = createApp();
  app.deferSearchResponses(true);
  app.submitSearch('older query');
  const older = app.searchRequests.at(-1);
  app.submitSearch('latest query');
  const latest = app.searchRequests.at(-1);
  latest.respond(history);
  await flush();
  expectVisible(app, history);
  older.respond(searched);
  await flush();
  expectVisible(app, history);
  assert.equal(app.elements.get('q').value, 'latest query');
  assert.equal(app.activeView, 'search');
  assert.match(app.elements.get('heading').textContent, /latest query/);

  const restored = createApp({ storage: app.storage });
  expectVisible(restored, history);
  assert.equal(restored.elements.get('q').value, 'latest query');
  restored.button('play');
  expectPlaylist(restored, history, 0);
});

test('Scrolling older displayed results while a newer search is pending cannot mix the old query into its results', async () => {
  const app = createApp();
  await app.search('query A');
  app.deferSearchResponses(true);
  app.submitSearch('query B');
  const queryB = app.searchRequests.at(-1);
  app.scrollToEnd();
  const queryAPrefetch = app.searchRequests.filter(request => !request.settled && request !== queryB);
  assert.ok(queryAPrefetch.length > 0, 'Scrolling displayed A results should exercise pending A prefetch');

  queryB.respond(history);
  await flush();
  expectVisible(app, history);
  queryAPrefetch.forEach((request, index) => request.respond(index ? [] : favorites));
  await flush();
  expectVisible(app, history);
  assert.equal(app.elements.get('q').value, 'query B');
  assert.match(app.elements.get('heading').textContent, /query B/);
  const restored = createApp({ storage: app.storage });
  expectVisible(restored, history);
  restored.button('play');
  expectPlaylist(restored, history, 0);
});
