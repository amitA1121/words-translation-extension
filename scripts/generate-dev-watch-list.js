#!/usr/bin/env node
// Regenerates the DEV_WATCH_FILES list inside src/dev/devReload.js by
// scanning src/**/*.js and the known root-level extension files. Run this
// after adding/removing/renaming a module, then reload the extension once.
//
// Why this exists as a build script rather than runtime code: Chrome
// extensions have no directory-listing API (no way for the extension
// itself, sandboxed in the browser, to ask "what files exist under src/"),
// so genuine dynamic discovery isn't possible from inside the extension.
// Node.js runs outside that sandbox and can do real filesystem scanning.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const DEV_RELOAD_FILE = path.join(SRC_DIR, 'dev', 'devReload.js');

const ROOT_LEVEL_FILES = [
  'background.js',
  'content.js',
  'content.css',
  'popup.html',
  'popup.js',
  'popup.css',
  'pdf-viewer.html',
  'pdf-viewer.js',
  'pdf-viewer.css',
  'manifest.json'
];

function walkJsFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkJsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      results.push(path.relative(ROOT, fullPath).split(path.sep).join('/'));
    }
  }
  return results;
}

function main() {
  const srcJsFiles = walkJsFiles(SRC_DIR).sort();
  const allFiles = [...ROOT_LEVEL_FILES, ...srcJsFiles];

  const listLiteral = allFiles.map(f => `  '${f}'`).join(',\n');
  const newBlock = `const DEV_WATCH_FILES = [\n${listLiteral}\n];`;

  const current = fs.readFileSync(DEV_RELOAD_FILE, 'utf8');
  const updated = current.replace(
    /const DEV_WATCH_FILES = \[[\s\S]*?\];/,
    newBlock
  );

  if (updated === current) {
    console.log('DEV_WATCH_FILES unchanged.');
    return;
  }

  fs.writeFileSync(DEV_RELOAD_FILE, updated);
  console.log(`Updated DEV_WATCH_FILES with ${allFiles.length} files:`);
  for (const f of allFiles) console.log(`  ${f}`);
}

main();
