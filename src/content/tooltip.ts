// The small floating popup that shows a word's translation, plus the
// double-click/single-click handlers that trigger it. Owns its own DOM
// element lifecycle (create/position/remove). Deliberately vanilla TS, not
// React: it's injected into every page, so it must stay tiny and
// dependency-free.

import { WORD_RE } from '../lib/words';
import { HIGHLIGHT_CLASS, TOOLTIP_ID, isEditable } from '../lib/dom';
import { backgroundApi } from '../lib/messaging';
import { speakText } from '../lib/speech';
import type { SavedWords } from '../lib/types';
import { extractWordAtPoint, getRangeFromPoint } from './wordMatcher';

export type GetSavedWords = () => SavedWords;

let tooltipEl: HTMLDivElement | null = null;
let tooltipWord: string | null = null;

export function removeTooltip(): void {
  if (tooltipEl) {
    tooltipEl.remove();
    tooltipEl = null;
    tooltipWord = null;
  }
}

function clampTooltipToViewport(): void {
  if (!tooltipEl) return;
  const rect = tooltipEl.getBoundingClientRect();
  const margin = 8;
  let left = rect.left;
  let top = rect.top;

  if (rect.right > window.innerWidth - margin) {
    left = window.innerWidth - rect.width - margin;
  }
  if (left < margin) left = margin;

  if (rect.top < margin) {
    top = margin;
  }
  if (rect.bottom > window.innerHeight - margin) {
    top = window.innerHeight - rect.height - margin;
  }

  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${top}px`;
}

interface TooltipShell {
  bodyRow: HTMLDivElement;
  actionsRow: HTMLDivElement;
}

// Builds the tooltip frame shared by the single-word and phrase variants:
// the spoken text row (with 🔊 button), a "מתרגם..." body, and an empty
// actions row. Returns the rows so each variant fills in what it needs.
function createTooltipShell(text: string, x: number, y: number, isPhrase = false): TooltipShell {
  removeTooltip();
  tooltipWord = isPhrase ? null : text.toLowerCase();
  tooltipEl = document.createElement('div');
  tooltipEl.id = TOOLTIP_ID;
  tooltipEl.style.left = `${x}px`;
  tooltipEl.style.top = `${y}px`;

  const wordRow = document.createElement('div');
  wordRow.className = 'wh-tooltip-word-row';

  const wordText = document.createElement('span');
  wordText.className = isPhrase ? 'wh-tooltip-word wh-tooltip-phrase' : 'wh-tooltip-word';
  wordText.textContent = text;
  wordRow.appendChild(wordText);

  const speakBtn = document.createElement('button');
  speakBtn.className = 'wh-tooltip-speak-btn';
  speakBtn.title = 'השמע הגייה';
  speakBtn.textContent = '🔊';
  speakBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    speakText(text, 'en-US');
  });
  wordRow.appendChild(speakBtn);
  tooltipEl.appendChild(wordRow);

  const bodyRow = document.createElement('div');
  bodyRow.className = 'wh-tooltip-body';
  bodyRow.textContent = 'מתרגם...';
  tooltipEl.appendChild(bodyRow);

  const actionsRow = document.createElement('div');
  actionsRow.className = 'wh-tooltip-actions';
  tooltipEl.appendChild(actionsRow);

  document.body.appendChild(tooltipEl);
  clampTooltipToViewport();

  return { bodyRow, actionsRow };
}

export function showTooltip(word: string, x: number, y: number, savedWords: SavedWords): void {
  const { bodyRow, actionsRow } = createTooltipShell(word, x, y);
  const shell = tooltipEl;

  const existing = savedWords[word.toLowerCase()];
  const translationPromise = existing
    ? Promise.resolve<string | null>(existing.translation)
    : backgroundApi.translate(word);

  void translationPromise.then((translation) => {
    if (tooltipEl !== shell) return; // tooltip was replaced/closed meanwhile
    if (translation == null) {
      bodyRow.textContent = 'שגיאה בתרגום';
      return;
    }
    bodyRow.textContent = translation;
    clampTooltipToViewport();

    const isSaved = Boolean(existing);
    const btn = document.createElement('button');
    btn.className = 'wh-tooltip-btn';
    btn.textContent = isSaved ? 'הסר סימון' : 'הוסף וסמן';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      btn.disabled = true;
      const action = isSaved
        ? backgroundApi.removeWord(word)
        : backgroundApi.saveWord(word, translation);
      void action.then(removeTooltip);
    });
    actionsRow.appendChild(btn);
  });
}

// Translation-only tooltip for an arbitrary selected phrase/sentence (not a
// single tracked word) — no save/highlight actions, since the savedWords
// schema and highlighting logic are built around single words.
export function showPhraseTooltip(phrase: string, x: number, y: number): void {
  const { bodyRow } = createTooltipShell(phrase, x, y, true);
  const shell = tooltipEl;

  void backgroundApi.translate(phrase).then((translation) => {
    if (tooltipEl !== shell) return;
    bodyRow.textContent = translation ?? 'שגיאה בתרגום';
    clampTooltipToViewport();
  });
}

// Shared by the click and dblclick handlers: when the event target is an
// already-highlighted word, toggle its tooltip (open under the element, or
// close if that word's tooltip is already open). Returns true if handled.
function toggleTooltipForHighlight(e: MouseEvent, getSavedWords: GetSavedWords): boolean {
  const target = e.target;
  if (!(target instanceof HTMLElement) || !target.classList.contains(HIGHLIGHT_CLASS)) {
    return false;
  }
  if (isEditable(target)) return true;

  const word = target.dataset.whWord ?? '';
  if (tooltipEl && tooltipWord === word.toLowerCase()) {
    removeTooltip();
    return true;
  }
  const rect = target.getBoundingClientRect();
  showTooltip(word, rect.left, rect.bottom + 6, getSavedWords());
  return true;
}

function getDoubleClickedWord(e: MouseEvent): string | null {
  const selection = window.getSelection();
  const text = selection?.toString().trim();
  if (text && WORD_RE.test(text)) return text;

  const range = getRangeFromPoint(e.clientX, e.clientY);
  const result = extractWordAtPoint(range);
  if (result) return result.word;

  // Fallback for renderers (e.g. pdf.js text layers) where each word is
  // already its own leaf element and selection/caret APIs may not line up.
  const target = e.target;
  if (target instanceof Element && target.childElementCount === 0) {
    const ownText = (target.textContent ?? '').trim();
    if (WORD_RE.test(ownText)) return ownText;
  }
  return null;
}

export function onDocumentDblClick(e: MouseEvent, getSavedWords: GetSavedWords): void {
  if (isEditable(e.target as Element)) return;
  if (tooltipEl && tooltipEl.contains(e.target as Node)) return;
  if (toggleTooltipForHighlight(e, getSavedWords)) return;

  const word = getDoubleClickedWord(e);
  if (!word) {
    removeTooltip();
    return;
  }
  showTooltip(word, e.clientX, e.clientY + 16, getSavedWords());
}

export function onMouseUpSelection(e: MouseEvent): void {
  if (isEditable(e.target as Element)) return;
  if (tooltipEl && tooltipEl.contains(e.target as Node)) return;

  const selection = window.getSelection();
  const text = selection?.toString().trim();
  if (!text || !selection) return;

  // A single word is already handled by dblclick/singleclick above — only
  // treat this as a "phrase" when the selection spans more than one word,
  // so dragging within a single word doesn't double-fire both flows.
  const isMultiWord = /\s/.test(text) && /[A-Za-z]/.test(text);
  if (!isMultiWord) return;

  const rect = selection.getRangeAt(0).getBoundingClientRect();
  showPhraseTooltip(text, rect.left, rect.bottom + 6);
}

export function onSingleClick(e: MouseEvent, getSavedWords: GetSavedWords): void {
  if (tooltipEl && tooltipEl.contains(e.target as Node)) return;

  // Single-click on an already-highlighted word shows its translation
  // immediately — no need to double-click something you've already saved.
  if (toggleTooltipForHighlight(e, getSavedWords)) return;

  removeTooltip();
}
