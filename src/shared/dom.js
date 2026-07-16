// Shared DOM vocabulary: the class names and element ids that multiple
// modules (highlighters, tooltip, content entry, PDF word layer) must agree
// on, plus small DOM predicates used on both the page and popup sides.

// Applied to any element currently highlighted as a saved word.
export const HIGHLIGHT_CLASS = 'wh-highlight';

// One absolutely-positioned span per word in our PDF viewer's word layer.
export const PDF_WORD_CLASS = 'wh-pdf-word';

// The floating translation tooltip's element id.
export const TOOLTIP_ID = 'wh-tooltip';

export function isEditable(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

export function byId(id) {
  return document.getElementById(id);
}
