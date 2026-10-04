import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp, expectAppQueue, expectPlaylist, expectRestoredPlaylist,
  favorites, searched } from './app-harness.mjs';

const BUILD = '20261004-5';
const BLOCKED = 'Prehliadač zablokoval automatické spustenie. Ťukni na ▶.';
const storedSession = () => new Map([
  ['teslaYT:likes', JSON.stringify(favorites)],
  ['teslaYT:recent', '[]'],
  ['teslaYT:last', JSON.stringify(searched[1])],
  ['teslaYT:session', JSON.stringify({
    version: 1, current: searched[1], items: searched, queue: searched,
    searchItems: searched, view: 'search', query: 'saved search', searchQuery: 'saved search',
    searchPage: 0, filter: 'music', shuffle: false, repeat: false,
  })],
]);
const result = app => app.elements.get('status').getAttribute('data-startup-result');
const marker = app => app.elements.get('status').getAttribute('data-startup-message');
function expectDiagnostic(app, expectedResult, message, state) {
  const status = app.elements.get('status');
  assert.equal(result(app), expectedResult);
  assert.equal(status.getAttribute('data-startup-build'), BUILD);
  assert.equal(status.textContent, message);
  assert.equal(marker(app), message, 'A visible startup failure must identify its own message');
  if (state !== undefined) assert.equal(status.getAttribute('data-startup-state'), String(state));
}

test('An explicit autoplay-block event marks the failed startup and manual Play clears only its own message', async () => {
  for (const newerSearchMessage of [false, true]) {
    const app = createApp({ storage: storedSession(), loadState: 5 });
    assert.equal(result(app), 'requested');
    expectRestoredPlaylist(app, searched, 1);
    app.fireAutoplayBlocked();
    expectDiagnostic(app, 'blocked', BLOCKED, 5);
    assert.equal(app.calls.length, 1);
    assert.equal(app.player.playCount, 0, 'The diagnostic event must not issue a playback command');
    const queueBefore = app.elements.get('queue').innerHTML;
    if (newerSearchMessage) await app.search('new search while blocked');
    const statusBeforePlay = app.elements.get('status').textContent;
    app.button('play');
    assert.equal(result(app), 'cancelled');
    assert.equal(marker(app), null);
    assert.equal(app.player.playCount, 1, 'Manual Play must retain its existing single playVideo command');
    assert.equal(app.calls.length, 1, 'Manual Play must not reload the restored track');
    if (newerSearchMessage) assert.equal(app.elements.get('status').textContent, statusBeforePlay,
      'Clearing the startup message must preserve a newer search status');
    else {
      assert.notEqual(app.elements.get('status').textContent, BLOCKED);
      assert.equal(app.elements.get('queue').innerHTML, queueBefore);
      expectAppQueue(app, searched, 1);
    }
    await app.advance(13000);
    assert.equal(marker(app), null, 'The old startup timeout must not recreate a failure message');
    assert.equal(app.player.playCount, 1);
    assert.equal(app.calls.length, 1);
  }
});

test('Startup timeouts distinguish player readiness, cued, buffering, and other states without claiming browser blocking', async () => {
  const cases = [
    { ready: false, state: -1, expected: 'waiting-player-timeout',
      message: 'Prehrávač sa ešte nepripravil. Skontroluj pripojenie.' },
    { ready: true, state: 5, expected: 'cued',
      message: 'Skladba je pripravená, ale prehrávanie sa nespustilo. Ťukni na ▶.' },
    { ready: true, state: 3, expected: 'buffering',
      message: 'Skladba sa stále načítava. Skontroluj pripojenie.' },
    { ready: true, state: -1, expected: 'not-started',
      message: 'Automatické spustenie sa nedokončilo. Ťukni na ▶.' },
  ];
  for (const scenario of cases) {
    const app = createApp({ storage: storedSession(), ready: scenario.ready, loadState: scenario.state });
    assert.equal(result(app), scenario.ready ? 'requested' : 'waiting-player');
    assert.equal(marker(app), null, 'Waiting for startup is not itself a visible failure');
    await app.advance(11999);
    assert.equal(marker(app), null, 'The diagnostic must respect its 12-second observation window');
    await app.advance(1);
    expectDiagnostic(app, scenario.expected, scenario.message, scenario.ready ? scenario.state : undefined);
    assert.ok(!app.elements.get('status').textContent.includes('zablokoval'));
    assert.equal(app.player.playCount, 0);
    assert.equal(app.calls.length, scenario.ready ? 1 : 0);
    if (scenario.ready) expectAppQueue(app, searched, 1);
  }
});

test('PLAYING observed by an event or polling finishes startup and a normal later pause stays quiet', async () => {
  for (const observedBy of ['event', 'poll']) {
    const app = createApp({ storage: storedSession(), loadState: 5 });
    if (observedBy === 'event') app.fireState(1);
    else { app.player.state = 1; await app.advance(350); }
    assert.equal(result(app), 'playing');
    assert.equal(marker(app), null);
    app.fireState(2);
    app.fireAutoplayBlocked();
    await app.advance(13000);
    assert.equal(result(app), 'playing', 'A normal pause must not start a new diagnostic failure');
    assert.equal(marker(app), null);
    assert.equal(app.player.state, 2);
    assert.equal(app.player.playCount, 0);
    assert.equal(app.calls.length, 1);
    expectAppQueue(app, searched, 1);
  }
});

test('An explicit pending selection, early Play, or Next cancels the startup observation with no late marker', async () => {
  for (const action of ['pending-card', 'pending-play', 'next']) {
    const app = createApp({ storage: storedSession(), ready: action === 'next', loadState: 5 });
    let expected = searched, index = 1;
    if (action === 'pending-card') {
      app.view('likes');
      app.card(2);
      expected = favorites; index = 2;
      app.fireReady();
    } else if (action === 'pending-play') {
      app.button('play');
      app.fireReady();
    } else {
      app.button('next'); index = 2;
    }
    assert.equal(result(app), 'cancelled');
    expectPlaylist(app, expected, index);
    expectAppQueue(app, expected, index);
    const loads = app.calls.length;
    app.fireAutoplayBlocked();
    await app.advance(13000);
    assert.equal(result(app), 'cancelled');
    assert.equal(marker(app), null);
    assert.equal(app.calls.length, loads);
    assert.equal(app.player.playCount, 0);
  }
});

test('A page without a stored track never displays a false startup failure', async () => {
  const app = createApp({ last: null, recent: [], loadState: 5 });
  assert.equal(result(app), 'no-track');
  assert.equal(app.elements.get('status').getAttribute('data-startup-build'), BUILD);
  app.fireAutoplayBlocked();
  await app.advance(13000);
  assert.equal(result(app), 'no-track');
  assert.equal(marker(app), null);
  assert.equal(app.calls.length, 0);
  assert.equal(app.player.playCount, 0);
});
