import { access, readdir, readFile } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';
import { loadEnv } from 'vite';

const outputDir = resolve(process.argv[2] ?? 'dist');
const envDir = resolve(process.argv[3] ?? '.');
const keyNames = ['VITE_ESV_API_KEY', 'VITE_SCRIPTURE_API_KEY'];
const environments = ['development', 'production', 'public'].map((mode) =>
  loadEnv(mode, envDir, 'VITE_')
);
const keys = new Set(
  [...environments, process.env]
    .flatMap((env) => keyNames.map((name) => env[name]))
    .filter(Boolean)
);

await access(join(outputDir, 'index.html'));

async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const name = relative(outputDir, path);
    if (basename(path).startsWith('.env') || /bible-text-|commentary-enduring-word/i.test(name)) {
      throw new Error(`Public build contains a private or restricted file: ${name}`);
    }
    if (entry.isDirectory()) {
      await inspect(path);
    } else if (entry.isFile()) {
      const contents = await readFile(path);
      for (const key of keys) {
        if (contents.includes(key) || contents.includes(JSON.stringify(key).slice(1, -1))) {
          throw new Error(`Public build contains a configured API key in ${name}`);
        }
      }
    } else {
      throw new Error(`Public build contains an unsupported file or symbolic link: ${name}`);
    }
  }
}

await inspect(outputDir);
console.log('Public build contains no configured API keys, environment files, or bundled Bible/commentary data.');
