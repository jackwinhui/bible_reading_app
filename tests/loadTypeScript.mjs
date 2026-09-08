import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, SourceTextModule } from 'node:vm';
import ts from 'typescript';

export async function loadTypeScript(path, { env = {}, globals = {}, glob = () => ({}) } = {}) {
  const context = createContext({ URLSearchParams, ...globals });
  const modules = new Map();
  async function loadModule(file) {
    if (modules.has(file)) return modules.get(file);
    const { outputText } = ts.transpileModule(await readFile(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
    });
    const module = new SourceTextModule(outputText, {
      context,
      identifier: file,
      initializeImportMeta: (meta) => {
        meta.env = env;
        meta.glob = glob;
      },
    });
    modules.set(file, module);
    return module;
  }
  const module = await loadModule(path instanceof URL ? fileURLToPath(path) : resolve(path));
  await module.link((specifier, parent) => {
    if (!specifier.startsWith('.')) throw new Error(`Unsupported test import: ${specifier}`);
    return loadModule(resolve(dirname(parent.identifier), extname(specifier) ? specifier : `${specifier}.ts`));
  });
  await module.evaluate();
  return module.namespace;
}
