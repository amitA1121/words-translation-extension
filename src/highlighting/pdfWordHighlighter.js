// Highlights saved words inside our own PDF viewer's pre-built word layer.
// pdf-viewer.js builds one .wh-pdf-word element per word up front, each
// already precisely positioned from pdf.js's raw glyph data — so no
// geometry work is needed here, just toggling a class on the real element.

import { HIGHLIGHT_CLASS, PDF_WORD_CLASS } from '../shared/dom.js';
import { unlearnedKeys } from '../shared/words.js';

export function unhighlightPdfWords(root = document) {
  const pdfWords = root.querySelectorAll(`.${PDF_WORD_CLASS}.${HIGHLIGHT_CLASS}`);
  for (const el of pdfWords) {
    el.classList.remove(HIGHLIGHT_CLASS);
    delete el.dataset.whWord;
  }
}

export function highlightPdfWords(root, savedWords) {
  const savedKeys = new Set(unlearnedKeys(savedWords));
  const words = root.querySelectorAll(`.${PDF_WORD_CLASS}`);
  for (const el of words) {
    const key = el.textContent.toLowerCase();
    if (savedKeys.has(key)) {
      el.classList.add(HIGHLIGHT_CLASS);
      el.dataset.whWord = el.textContent;
    } else {
      el.classList.remove(HIGHLIGHT_CLASS);
      delete el.dataset.whWord;
    }
  }
}
