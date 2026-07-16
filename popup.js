// Popup composition root: resolves DOM elements, constructs the view/dialog
// components, and owns the single shared words cache they all read from.

import { byId } from './src/shared/dom.js';
import { getWords } from './src/shared/backgroundApi.js';
import { setupPdfOpenButton } from './src/ui/pdfOpenButton.js';
import { WordListView } from './src/ui/wordListView.js';
import { DictionaryDialog } from './src/ui/dictionaryDialog.js';
import { ReviewDialog } from './src/ui/reviewDialog.js';
import { exportWordsToPdf } from './src/ui/pdfExport.js';

let allWords = {};
const getAllWords = () => allWords;

async function loadWords() {
  allWords = await getWords();
  wordListView.render();
}

const wordListView = new WordListView(
  {
    listEl: byId('wh-list'),
    emptyEl: byId('wh-empty'),
    noResultsEl: byId('wh-no-results'),
    countEl: byId('wh-count'),
    statsEl: byId('wh-stats'),
    searchInput: byId('wh-search'),
    sortSelect: byId('wh-sort'),
    filterUnlearnedCheckbox: byId('wh-filter-unlearned')
  },
  { getAllWords, onWordsChanged: loadWords }
);

new DictionaryDialog(
  {
    openBtn: byId('wh-open-dict'),
    overlay: byId('wh-dict-overlay'),
    closeBtn: byId('wh-dict-close'),
    langFromBtn: byId('wh-dict-lang-from'),
    langToBtn: byId('wh-dict-lang-to'),
    swapBtn: byId('wh-dict-swap'),
    input: byId('wh-dict-input'),
    speakBtn: byId('wh-dict-speak'),
    results: byId('wh-dict-results')
  },
  { getAllWords, onWordsChanged: loadWords }
);

new ReviewDialog(
  {
    openBtn: byId('wh-open-review'),
    overlay: byId('wh-review-overlay'),
    closeBtn: byId('wh-review-close'),
    progressEl: byId('wh-review-progress'),
    emptyEl: byId('wh-review-empty'),
    cardWrapEl: byId('wh-review-card-wrap'),
    cardEl: byId('wh-review-card'),
    wordEl: byId('wh-review-word'),
    translationEl: byId('wh-review-translation'),
    knowBtn: byId('wh-review-know'),
    dontKnowBtn: byId('wh-review-dont-know'),
    speakBtn: byId('wh-review-speak')
  },
  { getAllWords, onWordsChanged: loadWords }
);

byId('wh-export-pdf').addEventListener('click', () => {
  exportWordsToPdf(getAllWords());
});

// Raw-JSON backup, used to migrate the word list into the v2 (WXT/React)
// build, whose unpacked install has a different extension identity and
// therefore separate storage.
byId('wh-export-json').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(getAllWords(), null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'words-backup.json';
  a.click();
  URL.revokeObjectURL(url);
});

loadWords();
setupPdfOpenButton(byId('wh-open-pdf'));
