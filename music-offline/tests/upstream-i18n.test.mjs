import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Load the vendored browser ES modules without changing Node's module mode.
const moduleURL = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
let source = await readFile(new URL('../public/i18n.js', import.meta.url), 'utf8');
for (const [, path] of source.matchAll(/from "(\.\/locales\/[^"]+)"/g)) {
  const locale = await readFile(new URL('../public/' + path, import.meta.url), 'utf8');
  source = source.replace(JSON.stringify(path), JSON.stringify(moduleURL(locale)));
}
const { DEFAULT_LOCALE, STR, LANGUAGES, detectLocale, isSupportedLocale, translate, translateCount } = await import(moduleURL(source));
const placeholders = text => [...text.matchAll(/\{\{(\w+)\}\}/g)].map(match => match[1]).sort();
const baseKeys = Object.keys(STR.en).sort();

for (const { id } of LANGUAGES) {
  test(`${id}: complete translations and matching placeholders`, () => {
    for (const key of baseKeys) assert.ok(Object.hasOwn(STR[id], key), key);
    for (const [key, text] of Object.entries(STR[id])) {
      // Extra grammatical forms must belong to an existing pluralized message.
      const referenceKey = Object.hasOwn(STR.en, key) ? key : key.replace(/(?:Zero|Two|Few|Many)$/, 'Other');
      assert.ok(Object.hasOwn(STR.en, referenceKey), key);
      assert.equal(typeof text, 'string', key);
      assert.ok(text.trim(), key);
      assert.doesNotMatch(text, /[<>\ufffd]/u, key);
      assert.deepEqual(placeholders(text), placeholders(STR.en[referenceKey]), key);
      const formatted = translate(id, key, { n:2, noun:'songs', q:'test', name:'Mix' });
      assert.doesNotMatch(formatted, /\{\{/, key);
    }
  });
}
// F-Droid store metadata is not part of this standalone web preview.

test('Device preference matching uses supported languages and safe fallbacks', () => {
  for (const [preferences, expected] of [
    [['sk-SK'], 'sk'], [['sk'], 'sk'], [['sk-Latn-SK'], 'sk'],
    [['es-CL'], 'es'], [['pt-BR'], 'pt-BR'], [['pt-PT'], 'pt-BR'],
    [['fr-CA'], 'fr'], [['de-AT'], 'de'], [['en-GB'], 'en'],
    [['zh-CN'], 'zh-Hans'], [['zh-SG'], 'zh-Hans'], [['zh'], 'zh-Hans'],
    [['zh-Hans-TW'], 'zh-Hans'], [['zh-Hant-CN'], 'sk'],
    [['zh-TW', 'fr-FR'], 'fr'], [['zh-HK'], 'sk'], [['zh-MO'], 'sk'],
    [['it-IT', 'de-DE', 'en'], 'de'], [['ja-JP'], 'sk'], [[], 'sk'],
  ]) assert.equal(detectLocale(preferences), expected, preferences.join(','));
});

test('Saved supported language choices remain valid; unknown values do not', () => {
  for (const { id } of LANGUAGES) assert.ok(isSupportedLocale(id));
  for (const id of [null, undefined, '', 'xx', '__proto__', 'constructor']) assert.ok(!isSupportedLocale(id));
});

test('Slovak is the first language and default for missing or unsupported locales', () => {
  assert.equal(DEFAULT_LOCALE, 'sk');
  assert.deepEqual(LANGUAGES[0], { id:'sk', name:'Slovenčina' });
  for (const locale of [null, undefined, '', 'xx', '__proto__', 'constructor']) {
    assert.equal(translate(locale, 'library'), 'Knižnica');
    assert.equal(translateCount(locale, 'song', 2), 'skladby');
  }
});

test('Slovak counts use singular, two-to-four, and five-plus forms in the UI', () => {
  for (const [n, noun, added, restored] of [
    [0, 'skladieb', 'Pridaných 0 skladieb', 'Obnovených 0 skladieb'],
    [1, 'skladba', 'Pridaná 1 skladba', 'Obnovená 1 skladba'],
    [2, 'skladby', 'Pridané 2 skladby', 'Obnovené 2 skladby'],
    [3, 'skladby', 'Pridané 3 skladby', 'Obnovené 3 skladby'],
    [4, 'skladby', 'Pridané 4 skladby', 'Obnovené 4 skladby'],
    [5, 'skladieb', 'Pridaných 5 skladieb', 'Obnovených 5 skladieb'],
    [11, 'skladieb', 'Pridaných 11 skladieb', 'Obnovených 11 skladieb'],
    [21, 'skladieb', 'Pridaných 21 skladieb', 'Obnovených 21 skladieb'],
    [22, 'skladieb', 'Pridaných 22 skladieb', 'Obnovených 22 skladieb'],
    [101, 'skladieb', 'Pridaných 101 skladieb', 'Obnovených 101 skladieb'],
  ]) {
    assert.equal(translateCount('sk', 'song', n), noun);
    assert.equal(translateCount('sk', 'songsAdded', n), added);
    assert.equal(translateCount('sk', 'songsRestored', n), restored);
    assert.equal(translate('sk', 'songCount', { n, noun }), `${n} ${noun}`);
  }
});

test('Counts respect English, Spanish, French, and Chinese grammar', () => {
  assert.equal(translateCount('en','songsAdded',0),'0 songs added');
  assert.equal(translateCount('en','songsAdded',1),'1 song added');
  assert.equal(translateCount('en','songsRestored',2),'2 songs restored');
  assert.equal(translateCount('es','songsAdded',1),'1 canción agregada');
  assert.equal(translateCount('es','songsAdded',2),'2 canciones agregadas');
  assert.equal(translateCount('fr','song',0),STR.fr.songOne);
  assert.equal(translateCount('fr','song',1),STR.fr.songOne);
  assert.equal(translateCount('fr','song',2),STR.fr.songOther);
  assert.equal(translateCount('fr','song',1000000),STR.fr.songOther);
  assert.equal(translateCount('pt-BR','song',1000000),STR['pt-BR'].songOther);
  for (const n of [0,1,2]) assert.equal(translateCount('zh-Hans','song',n),STR['zh-Hans'].songOther);
  assert.equal(translateCount('unknown','song',1),'skladba');
});

test('Interpolation treats replacement metacharacters as literal text', () => {
  assert.equal(translate('en','addedToPlaylist',{name:'$& $$ $`'}),'Added to $& $$ $`');
  assert.equal(translate('sk','addedToPlaylist',{name:'$& $$ $`'}),'Pridané do playlistu „$& $$ $`“');
  assert.equal(translate('unknown','library'),'Knižnica');
  assert.equal(translate('en','missing-key'),'missing-key');
});

test('Every language displays Music Offline without renaming user playlists', () => {
  for (const { id } of LANGUAGES) {
    for (const key of ['aboutText', 'backgroundPlaybackHelper', 'notKasetteBackup']) {
      const text = translate(id, key);
      assert.match(text, /Music Offline/, `${id}: ${key}`);
      assert.doesNotMatch(text, /Kasette/, `${id}: ${key}`);
    }
  }
  assert.equal(translate('en', 'addedToPlaylist', { name:'Kasette' }), 'Added to Kasette');
  assert.equal(translate('sk', 'addedToPlaylist', { name:'Kasette' }), 'Pridané do playlistu „Kasette“');
});
