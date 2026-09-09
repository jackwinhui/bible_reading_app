import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readFile, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const LEGACY_BUNDLES = {
  NASB1995: { hash: '263d8780e7e5f8735bf214289c2d21a5a5479a801ba442592143b3b0d015a5cd', repairs: 1040 },
  CSB: { hash: '619731d521bd81e91c5b06de776d5f0dc56703d195f1d6c9e02ed8b4daf38d8f', repairs: 1771 },
  NLT: { hash: '5131d36290163636a85957314be51140dbf6ecd8ef875295234f5c44a509c369', repairs: 1292 },
};

// Only for legacy API.Bible exports. The CLI verifies their fingerprints before writing.
export function repairLegacyHeadingCopies(bundle) {
  const data = structuredClone(bundle);
  const changes = [];
  for (const [book, chapters] of Object.entries(data)) {
    for (const [chapter, verses] of Object.entries(chapters)) {
      if (!Array.isArray(verses)) throw new Error(`Invalid chapter data: ${book} ${chapter}`);
      for (let index = 1; index < verses.length; index++) {
        const heading = verses[index].heading?.trim();
        if (!heading) continue;
        const previous = verses[index - 1];
        const reference = `${book} ${chapter}:${previous.verse}`;
        const position = previous.text.lastIndexOf(heading);
        if (position < 0) continue;
        if (position === 0 || previous.text.indexOf(heading) !== position) {
          throw new Error(`Ambiguous heading copy at ${reference}; no data has been written.`);
        }
        const before = previous.text.slice(0, position).replace(/[ \t]+$/, '');
        const after = previous.text.slice(position + heading.length);
        if (!before.trim()) throw new Error(`Refusing to empty verse ${reference}`);
        const continuation = /[\r\n]$/.test(before) ? after : after.replace(/^[ \t]+/, '');
        const space = continuation && !/\s$/.test(before) && !/^\s/.test(continuation) ? ' ' : '';
        previous.text = `${before}${space}${continuation}`.trimEnd();
        changes.push({ book, chapter: Number(chapter), verse: previous.verse });
      }
    }
  }
  return { data, changes };
}

export function planBundleRepair(translation, original) {
  const expected = LEGACY_BUNDLES[translation];
  if (!expected) throw new Error(`Unsupported legacy translation: ${translation}`);
  let bundle;
  try {
    bundle = JSON.parse(original.toString());
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(`Invalid JSON in the ${translation} bundle`);
    throw error;
  }
  const result = repairLegacyHeadingCopies(bundle);
  if (!result.changes.length) return null;
  const hash = createHash('sha256').update(original).digest('hex');
  if (hash !== expected.hash || result.changes.length !== expected.repairs) {
    throw new Error(`Unrecognized ${translation} bundle; refusing to guess which text to remove.`);
  }
  const newline = original.toString().endsWith('\n') ? '\n' : '';
  return {
    translation,
    changes: result.changes,
    contents: JSON.stringify(result.data) + newline,
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--write')) {
    throw new Error('Usage: node tools/repair-bundled-headings.mjs [--write]');
  }
  const plans = [];
  for (const translation of Object.keys(LEGACY_BUNDLES)) {
    const file = join('src/data', `bible-text-${translation}.json`);
    let original;
    try {
      original = await readFile(file);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      console.log(`${translation}: no local bundle; skipped.`);
      continue;
    }
    const plan = planBundleRepair(translation, original);
    console.log(`${translation}: ${plan?.changes.length ?? 0} heading copies to remove.`);
    if (plan) plans.push({ ...plan, file });
  }
  if (!plans.length || !args.includes('--write')) {
    if (plans.length) console.log('Dry run only. Add --write to repair these recognized legacy bundles.');
    return;
  }

  const backupRoot = join('release', 'data-backups');
  await mkdir(backupRoot, { recursive: true });
  const backup = await mkdtemp(join(backupRoot, 'heading-repair-'));
  for (const plan of plans) {
    await copyFile(plan.file, join(backup, `bible-text-${plan.translation}.json`), constants.COPYFILE_EXCL);
  }
  for (const plan of plans) {
    const temporary = join(backup, `${plan.translation}.repaired.json`);
    await writeFile(temporary, plan.contents, { flag: 'wx' });
    await rename(temporary, plan.file);
  }
  console.log(`Repaired ${plans.reduce((sum, plan) => sum + plan.changes.length, 0)} heading copies without API requests.`);
  console.log(`Original bundles preserved in ${backup}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
