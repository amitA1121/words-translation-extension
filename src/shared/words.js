// Single source of truth for "what counts as a word" and for filtering the
// saved-words map. Every regex that matches words (tooltip extraction, page
// scanning, PDF word-layer splitting, dictionary input validation) is built
// from the same pattern source, so they can never drift apart.

// An English word: letters, optionally with internal apostrophes/hyphens
// (don't, well-known). No anchors/flags — callers compose what they need.
export const WORD_PATTERN_SOURCE = "[A-Za-z]+(?:['-][A-Za-z]+)*";

export const WORD_RE = new RegExp(`^${WORD_PATTERN_SOURCE}$`);
export const WORD_CHAR_RE = /[A-Za-z]/;
export const WORD_INNER_CHAR_RE = /[A-Za-z'-]/;

// Global regexes are stateful (lastIndex), so modules that scan with
// exec() get their own instance instead of sharing one.
export function createWordScanRegex() {
  return new RegExp(WORD_PATTERN_SOURCE, 'g');
}

export function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Words marked "learned" stay in the saved list (visible in the popup) but
// are excluded from highlighting and review.
export function unlearnedKeys(savedWords) {
  return Object.keys(savedWords).filter(key => !savedWords[key].learned);
}

export function unlearnedEntries(savedWords) {
  return Object.values(savedWords).filter(entry => !entry.learned);
}
