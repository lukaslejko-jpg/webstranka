import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp, expectPlaylist, favorites, searched, history, track, ids, flush } from './app-harness.mjs';

const homeTracks = [1, 2, 3].map(n => track(`hom${String(n).padStart(8, '0')}`, `Recommendation ${n}`));
const extra = [1, 2, 3, 4].map(n => track(`ext${String(n).padStart(8, '0')}`, `Additional ${n}`));
const buffered = Array.from({ length: 60 }, (_, n) => track(`buf${String(n).padStart(8, '0')}`, `Buffered ${n}`));
const query = 'my manual search';
const session = app => JSON.parse(app.storage.get('teslaYT:session'));
const pending = app => app.searchRequests.filter(request => !request.settled);
const requestQuery = request => new URL(request.url, 'https://music.test').searchParams.get('q');
function stored({ view = 'search', current = searched[1], homeLoaded = true,
  page = 0, prefetch = [], scroll = {}, legacy = false } = {}) {
  const positions = { home: 0, search: 0, likes: 0, recent: 0, ...scroll };
  const recent = [current, ...history.filter(t => t.id !== current.id)];
  const displayed = { search: searched, home: homeLoaded ? homeTracks : [], likes: favorites, recent }[view];
  const snapshot = {
    version: 1, current, view, items: displayed, queue: searched,
    query, searchQuery: query, searchItems: searched, searchPage: page,
    shuffle: false, repeat: false, filter: 'music', scroll: positions,
  };
  if (!legacy) snapshot.feeds = {
    search: { query, items: searched, page, prefetch, revision: 4, loaded: true, scroll: positions.search },
    home: { query: homeLoaded ? 'Test artist podobná hudba' : '', items: homeLoaded ? homeTracks : [],
      page: 0, prefetch: [], revision: 3, loaded: homeLoaded, scroll: positions.home },
  };
  return new Map([
    ['teslaYT:likes', JSON.stringify(favorites)], ['teslaYT:recent', JSON.stringify(history)],
    ['teslaYT:last', JSON.stringify(current)], ['teslaYT:session', JSON.stringify(snapshot)],
  ]);
}
function visible(app, tracks) {
  const titles = [...app.elements.get('grid').innerHTML.matchAll(/class="ct">([^<]*)</g)].map(match => match[1]);
  assert.deepEqual(titles, tracks.map(t => t.title), 'The displayed cards must belong to the selected tab, in order');
}
const playback = app => ({
  calls: structuredClone(app.calls), current: app.player.videoId,
  queue: ids(session(app).queue), queueHtml: app.elements.get('queue').innerHTML,
});
const unchangedPlayback = (app, before) => assert.deepEqual(playback(app), before,
  'Browsing and asynchronous feed completion must preserve the selected playback queue');

test('All sixteen transitions between cached Home, Search, Favorites, and Recent remain on the selected tab', async () => {
  for (const source of ['home', 'search', 'likes', 'recent']) {
    for (const destination of ['home', 'search', 'likes', 'recent']) {
      const app = createApp({ storage: stored({ view: source }) });
      app.deferSearchResponses(true);
      const before = playback(app);
      app.view(destination);
      await flush();
      assert.equal(app.activeView, destination, `${source} → ${destination}`);
      assert.equal(session(app).view, destination);
      const expected = { home: homeTracks, search: searched, likes: favorites,
        recent: JSON.parse(app.storage.get('teslaYT:recent')) }[destination];
      visible(app, expected);
      assert.equal(app.elements.get('q').value, query);
      assert.equal(app.searchRequests.length, 0, 'Revisiting a cached tab must not start another query');
      unchangedPlayback(app, before);
    }
  }
});

test('Loading Home preserves its tab and the manual search until a recommendation is explicitly selected', async () => {
  const app = createApp({ storage: stored({ homeLoaded: false }) });
  app.deferSearchResponses(true);
  const before = playback(app);
  app.view('home');
  assert.equal(app.activeView, 'home');
  assert.equal(app.elements.get('heading').textContent, 'Pre teba');
  visible(app, []);
  assert.equal(app.elements.get('q').value, query);
  pending(app)[0].respond(homeTracks);
  await flush();
  assert.equal(app.activeView, 'home');
  assert.equal(session(app).view, 'home');
  visible(app, homeTracks);
  assert.equal(app.elements.get('q').value, query);
  assert.deepEqual(ids(session(app).feeds.search.items), ids(searched));
  unchangedPlayback(app, before);
  app.view('search'); visible(app, searched);
  app.view('home'); visible(app, homeTracks);
  assert.equal(app.searchRequests.length, 1, 'The cached Home feed must be reused');
  app.card(1);
  expectPlaylist(app, homeTracks, 1);
  app.button('next');
  expectPlaylist(app, homeTracks, 2);
});

test('A Home response arriving after another tab was selected only fills the Home cache', async () => {
  for (const destination of ['search', 'likes', 'recent']) {
    const app = createApp({ storage: stored({ homeLoaded: false }) });
    app.deferSearchResponses(true);
    app.view('home'); const response = pending(app)[0];
    app.view(destination);
    const before = playback(app), grid = app.elements.get('grid').innerHTML;
    response.respond(homeTracks); await flush();
    assert.equal(app.activeView, destination);
    assert.equal(app.elements.get('grid').innerHTML, grid);
    unchangedPlayback(app, before);
    assert.deepEqual(ids(session(app).feeds.home.items), ids(homeTracks));
    app.view('search'); visible(app, searched);
    assert.equal(app.elements.get('q').value, query);
    app.view('home'); visible(app, homeTracks);
    assert.equal(app.searchRequests.length, 1);
  }
});

test('Home and explicit Search requests complete independently without either response selecting a tab', async () => {
  const app = createApp({ storage: stored({ homeLoaded: false }) });
  app.deferSearchResponses(true);
  const before = playback(app);
  app.view('home'); const home = pending(app)[0];
  app.submitSearch('new manual query'); const manual = pending(app).find(r => r !== home);
  assert.equal(app.activeView, 'search');
  visible(app, searched);
  home.respond(homeTracks); await flush();
  assert.equal(app.activeView, 'search'); visible(app, searched);
  manual.respond(extra); await flush();
  assert.equal(app.activeView, 'search'); visible(app, extra);
  assert.equal(app.elements.get('q').value, 'new manual query');
  unchangedPlayback(app, before);
  app.view('home'); visible(app, homeTracks);
  app.view('search'); visible(app, extra);
  assert.equal(session(app).feeds.search.query, 'new manual query');
});

test('Search filters select Search immediately when generating a query and do not replace the playing Favorites queue', async () => {
  for (const filter of ['music', 'similar', 'artist']) {
    const app = createApp({ storage: stored({ view: 'likes', current: favorites[1] }) });
    app.deferSearchResponses(true);
    const before = playback(app);
    app.filter(filter);
    assert.equal(app.filters.find(button => button.classList.contains('active')).dataset.filter, filter);
    if (filter === 'music') {
      assert.equal(app.activeView, 'likes');
      assert.equal(app.searchRequests.length, 0);
    } else {
      assert.equal(app.activeView, 'search');
      const request = pending(app)[0];
      assert.ok(requestQuery(request).includes('Test artist'));
      if (filter === 'similar') assert.ok(requestQuery(request).includes(favorites[1].title));
      request.respond(homeTracks); await flush();
      visible(app, homeTracks);
      assert.equal(app.activeView, 'search');
    }
    unchangedPlayback(app, before);
  }
});

test('Home with no playback history displays an empty recommendation view instead of stale search cards', async () => {
  const app = createApp({ last: null, recent: [] });
  await app.search('results without playing');
  const count = app.searchRequests.length;
  app.view('home'); await flush();
  assert.equal(app.activeView, 'home');
  assert.equal(app.elements.get('heading').textContent, 'Pre teba');
  visible(app, []);
  assert.equal(app.searchRequests.length, count);
  assert.equal(app.elements.get('q').value, 'results without playing');
  assert.equal(app.calls.length, 0);
});

test('Repeated rapid scroll events share one pending batch and append each result once', async () => {
  const app = createApp({ storage: stored() });
  app.deferSearchResponses(true);
  for (let i = 0; i < 15; i++) app.scrollToEnd();
  const batch = pending(app);
  assert.equal(batch.length, 4, 'A burst of scroll events must create only one search batch');
  batch[0].respond([searched[0], extra[0], extra[1]]);
  batch[1].respond([extra[1], extra[2]]);
  batch[2].respond([extra[2], extra[3]]);
  batch[3].respond([extra[3]]);
  await flush();
  visible(app, [...searched, ...extra]);
  assert.deepEqual(ids(session(app).queue), ids([...searched, ...extra]));
  assert.equal(app.calls.length, 1);
});

test('A duplicate-only scroll batch automatically tries the next variants and appends new tracks without another gesture', async () => {
  const app = createApp({ storage: stored() });
  app.deferSearchResponses(true);
  app.scrollToEnd();
  const duplicateBatch = pending(app);
  assert.equal(duplicateBatch.length, 4);
  duplicateBatch.forEach(request => request.respond(searched));
  await flush();
  const nextBatch = pending(app);
  assert.equal(nextBatch.length, 4, 'Duplicate-only results must trigger another bounded batch without a scroll event');
  assert.equal(app.searchRequests.length, 8);
  nextBatch.forEach((request, index) => request.respond(index ? searched : extra));
  await flush();
  visible(app, [...searched, ...extra]);
  assert.deepEqual(ids(session(app).queue), ids([...searched, ...extra]));
  assert.equal(app.player.videoId, searched[1].id);
  assert.equal(app.calls.length, 1);
});

test('A scroll whose entire variant cycle returns duplicates stops after four batches', async () => {
  const app = createApp({ storage: stored() });
  app.deferSearchResponses(true);
  const before = playback(app);
  app.scrollToEnd();
  for (let round = 0; round < 4; round++) {
    const batch = pending(app);
    assert.equal(batch.length, 4, `Expected one batch in round ${round + 1}`);
    assert.equal(app.searchRequests.length, (round + 1) * 4);
    batch.forEach(request => request.respond(searched));
    await flush();
  }
  assert.equal(pending(app).length, 0, 'The duplicate-only cycle must leave no repeating request pending');
  assert.equal(app.searchRequests.length, 16);
  await app.advance(1500);
  assert.equal(app.searchRequests.length, 16, 'No timer may silently restart the exhausted cycle');
  visible(app, searched);
  unchangedPlayback(app, before);
});

test('A newer query can paginate while an older prefetch remains unresolved, and the stale completion cannot release its pending batch', async () => {
  const app = createApp({ storage: stored() });
  app.deferSearchResponses(true);
  const before = playback(app);
  app.scrollToEnd(); const oldBatch = pending(app);
  app.submitSearch('query B'); const replacement = pending(app).find(r => !oldBatch.includes(r));
  replacement.respond(homeTracks); await flush();
  app.scrollToEnd();
  const newBatch = pending(app).filter(r => !oldBatch.includes(r));
  assert.equal(newBatch.length, 4, 'The stale query must not hold the new query busy');
  oldBatch.forEach((r, i) => r.respond(i ? [] : favorites)); await flush();
  for (let i = 0; i < 5; i++) app.scrollToEnd();
  assert.deepEqual(pending(app), newBatch, 'A stale request must not clear the newer in-flight guard');
  visible(app, homeTracks);
  newBatch.forEach((r, i) => r.respond(i ? [] : extra)); await flush();
  visible(app, [...homeTracks, ...extra]);
  assert.equal(session(app).feeds.search.query, 'query B');
  unchangedPlayback(app, before);
});

test('Search pagination cannot add tracks to Favorites playback, but selecting Search establishes its own continuation list', async () => {
  const app = createApp({ storage: stored({ view: 'likes', current: favorites[1] }) });
  app.deferSearchResponses(true);
  app.view('search'); const before = playback(app);
  app.scrollToEnd();
  pending(app).forEach((r, i) => r.respond(i ? [] : extra)); await flush();
  visible(app, [...searched, ...extra]); unchangedPlayback(app, before);
  app.button('next'); expectPlaylist(app, favorites, 2);
  app.card(0); expectPlaylist(app, [...searched, ...extra], 0);
  app.scrollToEnd();
  const batch = pending(app);
  assert.ok(batch.length > 0);
  batch.forEach((r, i) => r.respond(i ? [] : homeTracks)); await flush();
  visible(app, [...searched, ...extra, ...homeTracks]);
  assert.deepEqual(ids(session(app).queue), ids([...searched, ...extra, ...homeTracks]));
});

test('A scrolling response received after leaving Search preserves the visible Home feed and is saved for later', async () => {
  const app = createApp({ storage: stored() });
  app.deferSearchResponses(true); app.scrollToEnd(); const batch = pending(app);
  app.view('home'); const before = playback(app);
  batch.forEach((r, i) => r.respond(i ? [] : extra)); await flush();
  assert.equal(app.activeView, 'home'); visible(app, homeTracks);
  unchangedPlayback(app, before);
  assert.deepEqual(ids(session(app).feeds.search.prefetch), ids(extra));
  assert.equal(session(app).feeds.search.page, 4);
});

test('Version-one legacy search sessions retain their cards and current track while gaining separate feed storage', () => {
  const app = createApp({ storage: stored({ legacy: true, page: 8 }) });
  assert.equal(app.activeView, 'search'); visible(app, searched);
  assert.equal(app.player.videoId, searched[1].id);
  assert.equal(session(app).version, 1);
  assert.deepEqual(ids(session(app).feeds.search.items), ids(searched));
  assert.equal(session(app).feeds.search.query, query);
  assert.equal(session(app).feeds.search.page, 0,
    'A legacy cursor without its missing result buffer must not skip unrecoverable results');
  app.button('next'); expectPlaylist(app, searched, 2);
});

test('A saved pagination cursor and prefetched buffer survive reload and continue from the saved query position', async () => {
  const small = createApp({ storage: stored({ page: 8, prefetch: extra }) });
  small.deferSearchResponses(true);
  small.scrollToEnd();
  visible(small, [...searched, ...extra]);
  assert.ok(pending(small).length > 0,
    'A small prepared buffer must be displayed immediately while its refill remains pending');

  const app = createApp({ storage: stored({ page: 8, prefetch: buffered }) });
  app.deferSearchResponses(true);
  assert.equal(session(app).feeds.search.page, 8);
  assert.deepEqual(ids(session(app).feeds.search.prefetch), ids(buffered));
  app.scrollToEnd(); await flush();
  const requests = pending(app);
  assert.equal(requests.length, 4);
  assert.equal(requestQuery(requests[0]), `${query} remix`, 'Pagination must resume from the saved cursor');
  requests.forEach((r, i) => r.respond(i ? [] : extra)); await flush();
  const saved = session(app), displayed = saved.feeds.search.items;
  assert.ok(displayed.length > searched.length);
  assert.equal(saved.feeds.search.page, 12);
  assert.ok(saved.feeds.search.prefetch.length > 0);
  const restored = createApp({ storage: app.storage });
  assert.equal(session(restored).version, 1);
  visible(restored, displayed);
  assert.equal(session(restored).feeds.search.page, saved.feeds.search.page);
  assert.deepEqual(ids(session(restored).feeds.search.prefetch), ids(saved.feeds.search.prefetch));
});

test('Each tab remembers its own inner scroll position and restores it across a full reload', async () => {
  const app = createApp({ storage: stored() });
  app.browse.scrollHeight = 4000;
  for (const [view, position] of [['search', 120], ['home', 220], ['likes', 320], ['recent', 420]]) {
    app.view(view); app.scrollToPosition(position);
  }
  for (const [view, position] of [['search', 120], ['home', 220], ['likes', 320], ['recent', 420]]) {
    app.view(view);
    assert.equal(app.browse.scrollTop, position, `Return to ${view}`);
  }
  app.fireWindow('pagehide');
  const restored = createApp({ storage: app.storage });
  restored.browse.scrollHeight = 4000;
  assert.equal(restored.activeView, 'recent');
  assert.equal(restored.browse.scrollTop, 420);
  for (const [view, position] of [['search', 120], ['home', 220], ['likes', 320], ['recent', 420]]) {
    restored.view(view);
    assert.equal(restored.browse.scrollTop, position, `Reloaded ${view}`);
  }
  assert.deepEqual(session(restored).scroll, { home: 220, search: 120, likes: 320, recent: 420 });
});

test('A mobile window scroll can load more only when the visible feed container is near its end', () => {
  const app = createApp({ storage: stored(), windowHeight: 800,
    browseRect: { top: 100, bottom: 740, left: 0, width: 1000, height: 640 } });
  app.deferSearchResponses(true);
  app.fireWindow('scroll');
  assert.equal(pending(app).length, 0);
  app.browse.scrollTop = app.browse.scrollHeight - app.browse.clientHeight;
  app.fireWindow('scroll');
  assert.equal(pending(app).length, 4);
});
