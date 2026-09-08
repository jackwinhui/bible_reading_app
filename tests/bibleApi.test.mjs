import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTypeScript } from './loadTypeScript.mjs';

const servicePath = new URL('../src/services/bibleApi.ts', import.meta.url);

function loadApi(fetch) {
  return loadTypeScript(servicePath, {
    env: { VITE_PUBLIC_BUILD: '1' },
    globals: {
      fetch,
      localStorage: {
        getItem: () => JSON.stringify({ esvApiKey: 'test', scriptureApiKey: 'test' }),
      },
    },
  });
}

function response(body) {
  return { ok: true, json: async () => body };
}

test('ESV headings belong to the following verse, not the preceding verse', async () => {
  const api = await loadApi(async () => response({
    passages: ['Opening Heading\n\n[1] First sentence.\n\nSecond Heading\n\n[2] Second sentence. [3] Third sentence.'],
  }));
  const verses = await api.fetchChapter('Genesis', 1, 'ESV');
  assert.deepEqual(Array.from(verses, (v) => v.heading), [
    'Opening Heading', 'Second Heading', undefined,
  ]);
  assert.deepEqual(Array.from(verses, (v) => v.text), [
    'First sentence.', 'Second sentence.', 'Third sentence.',
  ]);
});

test('ESV stanza and paragraph breaks precede the next verse', async () => {
  const api = await loadApi(async () => response({
    passages: ['[1] First line.\n\n\n    [2] Second line.\n\n  [3] Third line.'],
  }));
  const verses = await api.fetchChapter('Psalms', 1, 'ESV');
  assert.deepEqual(Array.from(verses, (v) => !!v.stanzaBreak), [false, true, false]);
  assert.deepEqual(Array.from(verses, (v) => !!v.paragraphBreak), [false, false, true]);
});

test('ESV preserves multiple heading blocks with CRLF line endings', async () => {
  const api = await loadApi(async () => response({
    passages: ['Opening Heading\r\n\r\n[1] First sentence.\r\n\r\nSecond Heading\r\n\r\nSubtitle\r\n\r\n[2] Second sentence.'],
  }));
  const verses = await api.fetchChapter('Genesis', 1, 'ESV');
  assert.deepEqual(Array.from(verses, (v) => v.heading), ['Opening Heading', 'Second Heading\nSubtitle']);
  assert.deepEqual(Array.from(verses, (v) => v.text), ['First sentence.', 'Second sentence.']);
});

test('ESV poetry keeps continuation line indentation', async () => {
  const api = await loadApi(async () => response({
    passages: ['[1] First line.\n    Continuation line. [2] Second verse.'],
  }));
  const verses = await api.fetchChapter('Psalms', 1, 'ESV');
  assert.equal(verses[0].text, 'First line.\n    Continuation line.');
});

test('API.Bible headings stay out of verse text and retain their source order', async () => {
  const api = await loadApi(async () => response({
    data: {
      content: '<h2>Opening Heading</h2><p class="p"><span data-number="1" class="v">1</span>First sentence.</p>'
        + '<h3>Second Heading</h3><p class="s2">Subtitle</p>'
        + '<p class="p"><span data-number="2" class="v">2</span>Second sentence.</p>',
    },
  }));
  const verses = await api.fetchChapter('Genesis', 1, 'CSB');
  assert.deepEqual(Array.from(verses, (v) => v.text), ['First sentence.', 'Second sentence.']);
  assert.deepEqual(Array.from(verses, (v) => v.heading), [
    'Opening Heading', 'Second Heading\nSubtitle',
  ]);
});

test('API.Bible verse markers allow either attribute order and multiple classes', async () => {
  for (const attributes of [
    'data-number="1" class="v"',
    'class="v" data-number="1"',
    "class='v' data-number='1'",
    'class="verse v marker" data-number="1"',
  ]) {
    const api = await loadApi(async () => response({
      data: { content: `<p class="p"><span ${attributes}>1</span>Verse text.</p>` },
    }));
    const verses = await api.fetchChapter('Genesis', 1, 'NLT');
    assert.equal(verses.length, 1, attributes);
    assert.equal(verses[0].verse, 1);
    assert.equal(verses[0].text, 'Verse text.');
  }
});

test('API.Bible poetry keeps its opening and indented continuation lines', async () => {
  const api = await loadApi(async () => response({
    data: {
      content: '<p class="q1"><span data-number="1" class="v">1</span>First line.</p>'
        + '<p class="q2">Continuation line.</p>'
        + '<p class="q1"><span data-number="2" class="v">2</span>Second verse.</p>',
    },
  }));
  const verses = await api.fetchChapter('Psalms', 1, 'NASB1995');
  assert.equal(verses[0].text, 'First line.\n        Continuation line.');
});

test('API.Bible excludes the next marker when consecutive verses use different attribute orders', async () => {
  const api = await loadApi(async () => response({
    data: {
      content: '<p class="p"><span data-number="1" class="v">1</span>First sentence.'
        + '<span class="v" data-number="2">2</span>Second sentence.</p>',
    },
  }));
  const verses = await api.fetchChapter('Genesis', 1, 'NLT');
  assert.deepEqual(Array.from(verses, (v) => v.text), ['First sentence.', 'Second sentence.']);
  assert.deepEqual(Array.from(verses, (v) => v.verse), [1, 2]);
});

test('ESV requests the whole book for single-chapter books', async () => {
  const queries = [];
  const api = await loadApi(async (url) => {
    queries.push(new URL(url).searchParams.get('q'));
    return response({ passages: ['[1] First verse. [2] Second verse.'] });
  });
  const singleChapterBooks = ['Obadiah', 'Philemon', '2 John', '3 John', 'Jude'];
  for (const book of singleChapterBooks) await api.fetchChapter(book, 1, 'ESV');
  assert.deepEqual(queries, singleChapterBooks);
});

test('invalid chapters fail before making an API request', async () => {
  let requests = 0;
  const api = await loadApi(async () => {
    requests++;
    return response({ passages: ['[1] Verse text.'] });
  });
  for (const chapter of [0, -1, 1.5, NaN, 51]) {
    await assert.rejects(api.fetchChapter('Genesis', chapter, 'ESV'), /chapter/i);
  }
  await assert.rejects(api.fetchChapter('Unknown', 1, 'ESV'), /book/i);
  assert.equal(requests, 0);
});

test('canonical and abbreviated book names share a successful cached chapter', async () => {
  let requests = 0;
  const api = await loadApi(async (url) => {
    requests++;
    assert.equal(new URL(url).searchParams.get('q'), 'Genesis 1');
    return response({ passages: ['[1] Verse text.'] });
  });
  const abbreviated = await api.fetchChapter('Gen', 1, 'ESV');
  assert.equal(abbreviated[0].book, 'Genesis');
  assert.equal(await api.fetchChapter('Genesis', 1, 'ESV'), abbreviated);
  assert.equal(requests, 1);
});

test('empty responses are errors and do not poison the chapter cache', async () => {
  for (const translation of ['ESV', 'CSB']) {
    let requests = 0;
    const api = await loadApi(async () => {
      requests++;
      return response(translation === 'ESV'
        ? { passages: requests === 1 ? [] : ['[1] Verse text.'] }
        : { data: { content: requests === 1 ? '' : '<p><span class="v" data-number="1">1</span>Verse text.</p>' } });
    });
    await assert.rejects(api.fetchChapter('Genesis', 1, translation), /verses/i);
    assert.equal((await api.fetchChapter('Genesis', 1, translation)).length, 1);
    assert.equal(requests, 2);
  }
});

test('invalid or empty verse ranges cannot be used as memory verses', async () => {
  const api = await loadApi(async () => response({
    passages: ['[1] First verse. [2] Second verse.'],
  }));
  for (const [start, end] of [[0, null], [1.5, null], [2, 1], [1, NaN], [3, null], [1, 3]]) {
    await assert.rejects(api.fetchVerseRange('Genesis', 1, start, end, 'ESV'), /verse/i);
  }
  const verses = await api.fetchVerseRange('Genesis', 1, 1, 2, 'ESV');
  assert.deepEqual(Array.from(verses, (v) => v.verse), [1, 2]);
});
