#!/usr/bin/env node
// Copies pdf.js data assets (CJK cmaps, standard fonts) from the installed
// pdfjs-dist package into public/, where WXT ships them with the extension.
// Runs on postinstall so the copies always match the installed pdf.js
// version; public/pdfjs/ is gitignored.

import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const pdfjsDir = join(root, 'node_modules', 'pdfjs-dist');
const outDir = join(root, 'public', 'pdfjs');

if (!existsSync(pdfjsDir)) {
  console.error('pdfjs-dist is not installed; run npm install first.');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
cpSync(join(pdfjsDir, 'cmaps'), join(outDir, 'cmaps'), { recursive: true });
cpSync(join(pdfjsDir, 'standard_fonts'), join(outDir, 'standard_fonts'), { recursive: true });
console.log('Copied pdf.js cmaps + standard_fonts into public/pdfjs/');
