// The content-side feature bundle: owns the saved-words cache, wires up
// event listeners, and keeps highlighting in sync with storage changes.
// Used from two places: the declared content script (every web page) and
// the extension's own PDF viewer page (where declared content scripts
// don't run, so it calls this directly).

import { browser } from 'wxt/browser';
import { HIGHLIGHT_CLASS } from '../lib/dom';
import { backgroundApi, isWordsUpdatedMessage } from '../lib/messaging';
import type { SavedWords } from '../lib/types';
import { onDocumentDblClick, onSingleClick, onMouseUpSelection, removeTooltip } from './tooltip';
import { highlightPageText, unhighlightPageSpans } from './pageHighlighter';
import { highlightPdfWords, unhighlightPdfWords } from './pdfWordHighlighter';
import { startViewTracking, observeHighlightedElement } from './viewTracker';

export function initWordHighlighter(): void {
  let savedWords: SavedWords = {};
  let highlightScheduled = false;

  function highlightIn(root: Element): void {
    highlightPdfWords(root, savedWords);
    highlightPageText(root, savedWords);
    for (const el of root.querySelectorAll(`.${HIGHLIGHT_CLASS}`)) {
      observeHighlightedElement(el);
    }
  }

  function refreshHighlights(): void {
    unhighlightPdfWords(document);
    unhighlightPageSpans(document);
    highlightIn(document.body);
  }

  function scheduleHighlight(): void {
    if (highlightScheduled) return;
    highlightScheduled = true;
    requestAnimationFrame(() => {
      highlightScheduled = false;
      highlightIn(document.body);
    });
  }

  function isOwnHighlightSpan(node: Node): boolean {
    return node instanceof Element && node.classList.contains(HIGHLIGHT_CLASS);
  }

  function setupMutationObserver(): void {
    // Re-highlight when real new content lands — but ignore the spans we
    // insert ourselves, or every highlight pass would trigger another one.
    const observer = new MutationObserver((mutations) => {
      const shouldRun = mutations.some(
        (mutation) =>
          mutation.type === 'childList' &&
          Array.from(mutation.addedNodes).some(
            (node) =>
              (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) &&
              !isOwnHighlightSpan(node)
          )
      );
      if (shouldRun) scheduleHighlight();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  async function init(): Promise<void> {
    savedWords = await backgroundApi.getWords();
    refreshHighlights();
    setupMutationObserver();
    startViewTracking();
  }

  browser.runtime.onMessage.addListener((message: unknown) => {
    if (isWordsUpdatedMessage(message)) {
      savedWords = message.words ?? {};
      refreshHighlights();
    }
  });

  const getSavedWords = () => savedWords;
  document.addEventListener('dblclick', (e) => onDocumentDblClick(e, getSavedWords), true);
  document.addEventListener('click', (e) => onSingleClick(e, getSavedWords), true);
  document.addEventListener('mouseup', onMouseUpSelection, true);
  window.addEventListener('scroll', removeTooltip, true);
  window.addEventListener('resize', removeTooltip);

  if (document.body) {
    void init();
  } else {
    document.addEventListener('DOMContentLoaded', () => void init());
  }
}
