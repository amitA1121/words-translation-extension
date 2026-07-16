// DOM-aware text matching: finding a whole word at a caret point, and
// looking at adjacent characters across node boundaries.

import { WORD_RE, WORD_INNER_CHAR_RE } from '../lib/words';

export interface WordAtPoint {
  word: string;
  textNode: Text;
  start: number;
  end: number;
}

export function extractWordAtPoint(range: Range | null): WordAtPoint | null {
  if (!range) return null;
  const textNode = range.startContainer;
  if (textNode.nodeType !== Node.TEXT_NODE) return null;
  const text = textNode.textContent ?? '';
  let start = range.startOffset;
  let end = range.startOffset;
  while (start > 0 && WORD_INNER_CHAR_RE.test(text[start - 1])) start--;
  while (end < text.length && WORD_INNER_CHAR_RE.test(text[end])) end++;
  const word = text.slice(start, end).trim();
  if (!word || !WORD_RE.test(word)) return null;
  return { word, textNode: textNode as Text, start, end };
}

export function getRangeFromPoint(x: number, y: number): Range | null {
  // caretRangeFromPoint is Chrome's legacy API; caretPositionFromPoint is
  // the standard one — support both, whichever the browser provides.
  if (typeof document.caretRangeFromPoint === 'function') {
    return document.caretRangeFromPoint(x, y);
  }
  if (typeof document.caretPositionFromPoint === 'function') {
    const pos = document.caretPositionFromPoint(x, y);
    if (!pos) return null;
    const range = document.createRange();
    range.setStart(pos.offsetNode, pos.offset);
    return range;
  }
  return null;
}

export function getAdjacentChar(node: Node, direction: 'prev' | 'next'): string {
  // Looks at the real previous/next character in the document, even if it
  // lives in a sibling text node or element (e.g. across two spans in
  // regular flowed HTML). Without this, a lone fragment like "or" inside
  // a bigger word split across nodes would look like a standalone word.
  let sibling = direction === 'prev' ? node.previousSibling : node.nextSibling;
  let container: Node | null = node.parentNode;
  while (!sibling && container && container !== document.body) {
    sibling = direction === 'prev' ? container.previousSibling : container.nextSibling;
    container = container.parentNode;
  }
  if (!sibling) return '';
  const text = sibling.textContent ?? '';
  if (!text) return '';
  return direction === 'prev' ? text[text.length - 1] : text[0];
}
