// Single source of truth for "what counts as a word" and for filtering the
// saved-words map. Every regex that matches words (tooltip extraction, page
// scanning, PDF word-layer splitting, dictionary input validation) is built
// from the same pattern source, so they can never drift apart.

import type { SavedWords, WordEntry } from './types';

// An English word: letters, optionally with internal apostrophes/hyphens
// (don't, well-known). No anchors/flags — callers compose what they need.
export const WORD_PATTERN_SOURCE = "[A-Za-z]+(?:['-][A-Za-z]+)*";

export const WORD_RE = new RegExp(`^${WORD_PATTERN_SOURCE}$`);
export const WORD_CHAR_RE = /[A-Za-z]/;
export const WORD_INNER_CHAR_RE = /[A-Za-z'-]/;

// Global regexes are stateful (lastIndex), so modules that scan with
// exec() get their own instance instead of sharing one.
export function createWordScanRegex(): RegExp {
  return new RegExp(WORD_PATTERN_SOURCE, 'g');
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Words marked "learned" stay in the saved list (visible in the popup) but
// are excluded from highlighting and review.
export function unlearnedKeys(savedWords: SavedWords): string[] {
  return Object.keys(savedWords).filter((key) => !savedWords[key].learned);
}

export function unlearnedEntries(savedWords: SavedWords): WordEntry[] {
  return Object.values(savedWords).filter((entry) => !entry.learned);
}

/**
 * Builds the single alternation regex used to scan page text for every
 * saved (unlearned) word at once, longest-first so overlapping saves match
 * the longer word. Returns null when there is nothing to highlight.
 */
export function buildWordPattern(savedWords: SavedWords): RegExp | null {
  const keys = unlearnedKeys(savedWords);
  if (keys.length === 0) return null;
  const escaped = keys.sort((a, b) => b.length - a.length).map(escapeRegExp);
  return new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
}
