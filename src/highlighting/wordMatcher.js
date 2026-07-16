// Pure text-matching helpers: finding a whole word at a point, and building
// the regex used to scan a page for saved words. No DOM mutation here.

import { WORD_RE, WORD_INNER_CHAR_RE, escapeRegExp, unlearnedKeys } from '../shared/words.js';

export function extractWordAtPoint(range) {
  if (!range) return null;
  const textNode = range.startContainer;
  if (textNode.nodeType !== Node.TEXT_NODE) return null;
  const text = textNode.textContent;
  let start = range.startOffset;
  let end = range.startOffset;
  while (start > 0 && WORD_INNER_CHAR_RE.test(text[start - 1])) start--;
  while (end < text.length && WORD_INNER_CHAR_RE.test(text[end])) end++;
  const word = text.slice(start, end).trim();
  if (!word || !WORD_RE.test(word)) return null;
  return { word, textNode, start, end };
}

export function getRangeFromPoint(x, y) {
  if (document.caretRangeFromPoint) {
    return document.caretRangeFromPoint(x, y);
  }
  if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(x, y);
    if (!pos) return null;
    const range = document.createRange();
    range.setStart(pos.offsetNode, pos.offset);
    return range;
  }
  return null;
}

export function buildWordPattern(savedWords) {
  const keys = unlearnedKeys(savedWords);
  if (keys.length === 0) return null;
  const escaped = keys
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);
  return new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
}

export function getAdjacentChar(node, direction) {
  // Looks at the real previous/next character in the document, even if it
  // lives in a sibling text node or element (e.g. across two spans in
  // regular flowed HTML). Without this, a lone fragment like "or" inside
  // a bigger word split across nodes would look like a standalone word.
  let sibling = direction === 'prev' ? node.previousSibling : node.nextSibling;
  let container = node.parentNode;
  while (!sibling && container && container !== document.body) {
    sibling = direction === 'prev' ? container.previousSibling : container.nextSibling;
    container = container.parentNode;
  }
  if (!sibling) return '';
  const text = sibling.textContent || '';
  if (!text) return '';
  return direction === 'prev' ? text[text.length - 1] : text[0];
}
