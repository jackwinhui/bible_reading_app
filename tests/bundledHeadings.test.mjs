import assert from 'node:assert/strict';
import test from 'node:test';
import { planBundleRepair, repairLegacyHeadingCopies } from '../tools/repair-bundled-headings.mjs';
import { loadTypeScript } from './loadTypeScript.mjs';

function fixture(text, heading = 'Next Section') {
  return {
    Ephesians: {
      6: [
        { verse: 9, text, paragraphBreak: true },
        { verse: 10, text: 'The following verse.', heading },
      ],
    },
  };
}

test('legacy repair removes the copied Ephesians heading without changing its metadata', () => {
  const source = fixture('Original verse nine. The Armor of God', 'The Armor of God');
  const original = structuredClone(source);
  const { data, changes } = repairLegacyHeadingCopies(source);
  assert.equal(data.Ephesians[6][0].text, 'Original verse nine.');
  assert.equal(data.Ephesians[6][0].paragraphBreak, true);
  assert.equal(data.Ephesians[6][1].heading, 'The Armor of God');
  assert.equal(data.Ephesians[6][1].text, 'The following verse.');
  assert.deepEqual(changes, [{ book: 'Ephesians', chapter: 6, verse: 9 }]);
  assert.deepEqual(source, original);
});

test('repair handles copied headings joined directly to punctuation or numeric verse text', () => {
  for (const [text, expected] of [
    ['Original sentence.Next Section', 'Original sentence.'],
    ['A numbered list 12,000Next Section', 'A numbered list 12,000'],
  ]) {
    assert.equal(repairLegacyHeadingCopies(fixture(text)).data.Ephesians[6][0].text, expected);
  }
});

test('repair keeps verse continuations on both sides of a copied heading', () => {
  for (const text of [
    'First portion. Next Section Second portion.',
    'First portion.Next SectionSecond portion.',
  ]) {
    assert.equal(repairLegacyHeadingCopies(fixture(text)).data.Ephesians[6][0].text,
      'First portion. Second portion.');
  }
});

test('repair preserves poetry line breaks and continuation indentation', () => {
  const source = fixture('First line.\n    Second line.\nNext Section    Third line.');
  assert.equal(repairLegacyHeadingCopies(source).data.Ephesians[6][0].text,
    'First line.\n    Second line.\n    Third line.');
});

test('repair treats heading punctuation literally and keeps other punctuation', () => {
  const source = fixture('Original sentence.A (second) section?[', 'A (second) section?');
  assert.equal(repairLegacyHeadingCopies(source).data.Ephesians[6][0].text, 'Original sentence. [');
});

test('repair is idempotent and does not invent missing headings', () => {
  const repaired = repairLegacyHeadingCopies(fixture('Original sentence. Next Section')).data;
  const again = repairLegacyHeadingCopies(repaired);
  assert.deepEqual(again.data, repaired);
  assert.deepEqual(again.changes, []);
  const clean = fixture('An ordinary verse.');
  assert.deepEqual(repairLegacyHeadingCopies(clean).data, clean);
});

test('repair refuses ambiguous matches and never removes an entire verse', () => {
  for (const text of ['Next Section', 'Next Section is mentioned here. Next Section']) {
    assert.throws(() => repairLegacyHeadingCopies(fixture(text)), /Ambiguous|empty/);
  }
});

test('file repair refuses unfamiliar data instead of deleting naturally occurring Scripture words', () => {
  const unfamiliar = Buffer.from(JSON.stringify(fixture('A phrase about Next Section in this sentence.')));
  assert.throws(() => planBundleRepair('NASB1995', unfamiliar), /Unrecognized/);
  assert.equal(planBundleRepair('NASB1995', Buffer.from(JSON.stringify(fixture('A clean verse.')))), null);
  assert.throws(() => planBundleRepair('ESV', unfamiliar), /Unsupported/);
});

test('repaired offline chapters and verse snapshots contain only verse text without API calls', async () => {
  const repaired = repairLegacyHeadingCopies(fixture('Original verse nine. The Armor of God', 'The Armor of God')).data;
  for (const translation of ['NASB1995', 'CSB', 'NLT']) {
    const api = await loadTypeScript(new URL('../src/services/bibleApi.ts', import.meta.url), {
      globals: {
        fetch: async () => { throw new Error('Offline chapter must not fetch an API'); },
        localStorage: { getItem: () => null },
      },
      glob: () => ({ [`../data/bible-text-${translation}.json`]: async () => repaired }),
    });
    const verses = await api.fetchChapter('Ephesians', 6, translation);
    assert.equal(verses[0].text, 'Original verse nine.');
    assert.equal(verses[1].heading, 'The Armor of God');
    const range = await api.fetchVerseRange('Ephesians', 6, 9, 10, translation);
    assert.equal(api.getVerseText(range), 'Original verse nine. The following verse.');
  }
});
