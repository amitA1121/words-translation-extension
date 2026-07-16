// Highlights saved words inside regular (non-PDF-viewer) page text, by
// wrapping matched substrings in <span class="wh-highlight"> elements.

import { WORD_CHAR_RE } from '../shared/words.js';
import { HIGHLIGHT_CLASS, PDF_WORD_CLASS, TOOLTIP_ID, isEditable } from '../shared/dom.js';
import { buildWordPattern, getAdjacentChar } from './wordMatcher.js';

function shouldSkipNode(node) {
  const parent = node.parentElement;
  if (!parent) return true;
  const tag = parent.tagName;
  if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEXTAREA' || tag === 'INPUT') {
    return true;
  }
  if (parent.closest(`#${TOOLTIP_ID}`)) return true;
  if (parent.classList && parent.classList.contains(HIGHLIGHT_CLASS)) return true;
  if (isEditable(parent)) return true;
  return false;
}

function highlightTextNode(node, pattern) {
  const text = node.textContent;
  pattern.lastIndex = 0;
  if (!pattern.test(text)) return;
  pattern.lastIndex = 0;

  const frag = document.createDocumentFragment();
  let lastIndex = 0;
  let match;
  let didMatch = false;

  while ((match = pattern.exec(text)) !== null) {
    const matchedWord = match[0];
    const matchStart = match.index;
    const matchEnd = matchStart + matchedWord.length;

    const charBefore = matchStart === 0
      ? getAdjacentChar(node, 'prev')
      : text[matchStart - 1];
    const charAfter = matchEnd === text.length
      ? getAdjacentChar(node, 'next')
      : text[matchEnd];

    if (WORD_CHAR_RE.test(charBefore) || WORD_CHAR_RE.test(charAfter)) {
      // The match touches a real letter just outside this fragment, so it's
      // actually the middle/edge of a longer word split across DOM nodes —
      // not a standalone occurrence. Skip it.
      continue;
    }

    didMatch = true;
    if (matchStart > lastIndex) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex, matchStart)));
    }
    const span = document.createElement('span');
    span.className = HIGHLIGHT_CLASS;
    span.dataset.whWord = matchedWord;
    span.textContent = matchedWord;
    frag.appendChild(span);
    lastIndex = matchEnd;
  }

  if (!didMatch) return;

  if (lastIndex < text.length) {
    frag.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  node.parentNode.replaceChild(frag, node);
}

function walkAndHighlight(root, pattern) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_REJECT;
      if (shouldSkipNode(node)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  for (const textNode of nodes) {
    if (textNode.isConnected) {
      highlightTextNode(textNode, pattern);
    }
  }
}

export function unhighlightPageSpans(root = document) {
  // Wrapper spans created for ordinary (non-positioned) page text. PDF-layer
  // words are real positioned elements that only get a class toggled — they
  // are unhighlighted by pdfWordHighlighter, not unwrapped here.
  const spans = root.querySelectorAll(`.${HIGHLIGHT_CLASS}:not(.${PDF_WORD_CLASS})`);
  for (const span of spans) {
    const textNode = document.createTextNode(span.textContent);
    span.parentNode.replaceChild(textNode, span);
  }
}

export function highlightPageText(root, savedWords) {
  const pattern = buildWordPattern(savedWords);
  if (!pattern) return;
  walkAndHighlight(root, pattern);
}
