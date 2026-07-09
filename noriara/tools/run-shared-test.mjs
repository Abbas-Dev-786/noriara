import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const rootDir = path.resolve(process.cwd());
const sourceDir = path.join(rootDir, 'src', 'shared');
const outDir = path.join(rootDir, '.tmp-tests', 'shared');

await fs.rm(outDir, { recursive: true, force: true });
await compileDirectory(sourceDir);
await import(pathToFileURL(path.join(outDir, 'officialRunValidation.test.js')).href);

async function compileDirectory(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await compileDirectory(fullPath);
      continue;
    }
    if (!entry.name.endsWith('.ts')) continue;

    const relativePath = path.relative(sourceDir, fullPath);
    const outputPath = path.join(outDir, relativePath).replace(/\.ts$/, '.js');
    const sourceText = await fs.readFile(fullPath, 'utf8');
    const transpiled = ts.transpileModule(sourceText, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: fullPath,
    });

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, rewriteRelativeImports(transpiled.outputText), 'utf8');
  }
}

function rewriteRelativeImports(code) {
  return code.replace(
    /((?:import|export)\s+[^'"]*?from\s+|import\()(['"])(\.\.?\/[^'"]+)\2/g,
    (match, prefix, quote, specifier) => {
      if (specifier.endsWith('.js') || specifier.endsWith('.json')) {
        return `${prefix}${quote}${specifier}${quote}`;
      }
      return `${prefix}${quote}${specifier}.js${quote}`;
    }
  );
}
