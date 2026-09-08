import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { resolveConfig } from 'vite';
import { loadTypeScript } from './loadTypeScript.mjs';

const source = (path) => new URL(`../src/${path}`, import.meta.url);
const developerKeys = {
  VITE_ESV_API_KEY: 'developer-esv-key-fixture-not-a-real-key',
  VITE_SCRIPTURE_API_KEY: 'developer-scripture-key-fixture-not-a-real-key',
};
const publicEnv = { ...developerKeys, VITE_PUBLIC_BUILD: '1' };

test('public API-key defaults stay empty even when build-time keys are supplied', async () => {
  const keys = await loadTypeScript(source('utils/apiKeys.ts'), { env: publicEnv });
  assert.deepEqual({ ...keys.getDefaultApiKeys() }, { esvApiKey: '', scriptureApiKey: '' });
});

test('personal builds retain their explicitly configured build-time defaults', async () => {
  const keys = await loadTypeScript(source('utils/apiKeys.ts'), { env: developerKeys });
  assert.deepEqual({ ...keys.getDefaultApiKeys() }, {
    esvApiKey: developerKeys.VITE_ESV_API_KEY,
    scriptureApiKey: developerKeys.VITE_SCRIPTURE_API_KEY,
  });
});

test('public Bible requests require user-supplied keys, not developer defaults', async () => {
  let requests = 0;
  const api = await loadTypeScript(source('services/bibleApi.ts'), {
    env: publicEnv,
    globals: {
      localStorage: { getItem: () => null },
      fetch: async () => { requests++; throw new Error('Unexpected network request'); },
    },
    glob: () => { throw new Error('Public builds must not load private bundles'); },
  });
  for (const translation of ['ESV', 'NASB1995', 'CSB', 'NLT']) {
    await assert.rejects(api.fetchChapter('Genesis', 1, translation), /API key not configured/);
  }
  assert.equal(requests, 0);
});

test('public requests use the keys saved by the user', async () => {
  const headers = [];
  const api = await loadTypeScript(source('services/bibleApi.ts'), {
    env: publicEnv,
    globals: {
      localStorage: {
        getItem: () => JSON.stringify({ esvApiKey: 'user-esv-key', scriptureApiKey: 'user-scripture-key' }),
      },
      fetch: async (url, options) => {
        headers.push(options.headers);
        return {
          ok: true,
          json: async () => String(url).includes('api.esv.org')
            ? { passages: ['[1] Example verse.'] }
            : { data: { content: '<p><span class="v" data-number="1">1</span>Example verse.</p>' } },
        };
      },
    },
  });
  await api.fetchChapter('Genesis', 1, 'ESV');
  await api.fetchChapter('Genesis', 1, 'CSB');
  assert.equal(headers[0].Authorization, 'Token user-esv-key');
  assert.equal(headers[1]['api-key'], 'user-scripture-key');
});

test('personal Bible bundles still work without an API key', async () => {
  const api = await loadTypeScript(source('services/bibleApi.ts'), {
    globals: {
      localStorage: { getItem: () => null },
      fetch: async () => { throw new Error('Offline data must not require a request'); },
    },
    glob: () => ({
      '../data/bible-text-ESV.json': async () => ({
        Genesis: { 1: [{ verse: 1, text: 'Offline example.', heading: 'Example heading' }] },
      }),
    }),
  });
  const verses = await api.fetchChapter('Genesis', 1, 'ESV');
  assert.equal(verses[0].text, 'Offline example.');
  assert.equal(verses[0].heading, 'Example heading');
});

test('public commentary ignores private bundles and uses the desktop bridge', async () => {
  let requests = 0;
  const data = { book: 'Genesis', chapter: 1, source: 'Enduring Word', url: 'https://example.test/', sections: [] };
  const api = await loadTypeScript(source('services/commentaryApi.ts'), {
    env: publicEnv,
    globals: {
      window: { commentary: { fetch: async () => { requests++; return { ok: true, data }; } } },
    },
    glob: () => { throw new Error('Public builds must not load private commentary'); },
  });
  assert.equal(await api.fetchCommentary('Genesis', 1), data);
  assert.equal(requests, 1);
});

test('personal commentary bundles remain available offline', async () => {
  const api = await loadTypeScript(source('services/commentaryApi.ts'), {
    glob: () => ({
      '../data/commentary-enduring-word.json': async () => ({
        Genesis: { 1: { sections: [], url: 'https://example.test/offline' } },
      }),
    }),
  });
  const chapter = await api.fetchCommentary('Genesis', 1);
  assert.equal(chapter.url, 'https://example.test/offline');
});

test('both public build selectors disable environment loading and key injection', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'bible-public-config-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, '.env'), Object.entries(developerKeys).map(([key, value]) => `${key}=${value}`).join('\n'));
  const previous = process.env.VITE_PUBLIC_BUILD;
  try {
    for (const [mode, flag] of [['public', undefined], ['production', '1']]) {
      if (flag === undefined) delete process.env.VITE_PUBLIC_BUILD;
      else process.env.VITE_PUBLIC_BUILD = flag;
      const config = await resolveConfig({
        root,
        mode,
        configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)),
      }, 'build');
      assert.equal(config.envDir, false);
      assert.deepEqual(config.envPrefix, []);
      for (const key of Object.keys(developerKeys)) {
        assert.ok(!Object.hasOwn(config.env, key), 'Public Vite environment must exclude API keys');
        assert.ok(config.define[`import.meta.env.${key}`] === '""', 'Public key replacements must be empty');
      }
      assert.equal(config.define['import.meta.env.VITE_PUBLIC_BUILD'], '"1"');
    }
  } finally {
    if (previous === undefined) delete process.env.VITE_PUBLIC_BUILD;
    else process.env.VITE_PUBLIC_BUILD = previous;
  }
});

test('the public-build guard rejects exposed keys and private files without printing key values', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'bible-public-output-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const output = join(root, 'dist');
  await mkdir(output);
  await writeFile(join(output, 'index.html'), '<!doctype html><title>Public build fixture</title>');
  const inspect = () => spawnSync(process.execPath, [
    fileURLToPath(new URL('../tools/verify-public-build.mjs', import.meta.url)), output, root,
  ], { encoding: 'utf8', env: { ...process.env, ...developerKeys } });
  assert.equal(inspect().status, 0);

  await writeFile(join(output, 'app.js'), `const key = ${JSON.stringify(developerKeys.VITE_ESV_API_KEY)};`);
  const exposed = inspect();
  assert.notEqual(exposed.status, 0);
  assert.match(exposed.stderr, /configured API key/);
  assert.ok(!exposed.stderr.includes(developerKeys.VITE_ESV_API_KEY));
  await rm(join(output, 'app.js'));

  for (const name of ['.env', 'bible-text-ESV-fixture.js', 'commentary-enduring-word-fixture.js']) {
    await writeFile(join(output, name), 'fixture');
    const privateFile = inspect();
    assert.notEqual(privateFile.status, 0);
    assert.match(privateFile.stderr, /private or restricted file/);
    await rm(join(output, name));
  }
  await writeFile(join(root, 'outside.txt'), 'fixture');
  await symlink(join(root, 'outside.txt'), join(output, 'linked.txt'));
  assert.notEqual(inspect().status, 0);
});
