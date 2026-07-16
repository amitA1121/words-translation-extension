// Composition root for the content-script side of the extension: owns the
// saved-words cache, wires up event listeners, and keeps highlighting in
// sync with storage changes. This is the module content.js dynamically
// imports (see content.js — a thin classic-script loader, since MV3
// content_scripts declared in the manifest can't use static ES imports).

import { HIGHLIGHT_CLASS } from '../shared/dom.js';
import { MSG, getWords } from '../shared/backgroundApi.js';
import { onDocumentDblClick, onSingleClick, onMouseUpSelection, removeTooltip } from './tooltip.js';
import { highlightPageText, unhighlightPageSpans } from '../highlighting/pageHighlighter.js';
import { highlightPdfWords, unhighlightPdfWords } from '../highlighting/pdfWordHighlighter.js';
import { startViewTracking, observeHighlightedElement } from '../highlighting/viewTracker.js';

let savedWords = {};
let highlightObserver = null;
let highlightScheduled = false;

function observeAllHighlights(root) {
  const els = root.querySelectorAll ? root.querySelectorAll(`.${HIGHLIGHT_CLASS}`) : [];
  for (const el of els) observeHighlightedElement(el);
}

function highlightIn(root) {
  highlightPdfWords(root, savedWords);
  highlightPageText(root, savedWords);
  observeAllHighlights(root);
}

function refreshHighlights() {
  unhighlightPdfWords(document);
  unhighlightPageSpans(document);
  highlightIn(document.body);
}

function scheduleHighlight(root) {
  if (highlightScheduled) return;
  highlightScheduled = true;
  requestAnimationFrame(() => {
    highlightScheduled = false;
    highlightIn(root || document.body);
  });
}

function isOwnHighlightSpan(node) {
  return node.nodeType === Node.ELEMENT_NODE
    && node.classList
    && node.classList.contains(HIGHLIGHT_CLASS);
}

function setupMutationObserver() {
  if (highlightObserver) highlightObserver.disconnect();
  highlightObserver = new MutationObserver((mutations) => {
    // Re-highlight when real new content lands — but ignore the spans we
    // insert ourselves, or every highlight pass would trigger another one.
    const shouldRun = mutations.some((mutation) =>
      mutation.type === 'childList' &&
      Array.from(mutation.addedNodes).some(
        (node) =>
          (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) &&
          !isOwnHighlightSpan(node)
      )
    );
    if (shouldRun) scheduleHighlight(document.body);
  });
  highlightObserver.observe(document.body, { childList: true, subtree: true });
}

function onScrollOrResize() {
  removeTooltip();
}

async function init() {
  savedWords = await getWords();
  refreshHighlights();
  setupMutationObserver();
  startViewTracking();
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === MSG.WORDS_UPDATED) {
    savedWords = message.words || {};
    refreshHighlights();
  }
});

document.addEventListener('dblclick', (e) => onDocumentDblClick(e, () => savedWords), true);
document.addEventListener('click', (e) => onSingleClick(e, () => savedWords), true);
document.addEventListener('mouseup', onMouseUpSelection, true);
window.addEventListener('scroll', onScrollOrResize, true);
window.addEventListener('resize', onScrollOrResize);

if (document.body) {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
