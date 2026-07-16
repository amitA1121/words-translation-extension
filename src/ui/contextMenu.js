// Right-click context menu: lets the user save the currently selected text
// (a single word OR a multi-word phrase) without needing to double-click
// an exact word — useful for phrases/idioms a double-click can't target.

import { saveWord } from '../storage/wordStorage.js';
import { translateWord } from '../translation/translationService.js';

const MENU_ID = 'wh-add-selection';

let listenerRegistered = false;

export function setupContextMenu() {
  // Service workers restart frequently (extension reload, idle timeout,
  // etc.), and this module-level function re-runs from scratch on every
  // restart. chrome.contextMenus.create() does NOT dedupe by id across
  // restarts — calling it again while the old item still exists throws
  // "duplicate id" internally, which silently corrupts the click handler
  // and produces exactly the "have to click twice" symptom. removeAll()
  // first guarantees a clean slate every time.
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: 'הוסף "%s" למילון',
      contexts: ['selection']
    });
  });

  // The onClicked listener itself must only ever be registered once per
  // service-worker lifetime — re-adding it on every setupContextMenu() call
  // would stack duplicate listeners and fire saveWord()/translateWord()
  // multiple times per single real click.
  if (listenerRegistered) return;
  listenerRegistered = true;

  chrome.contextMenus.onClicked.addListener(async (info) => {
    if (info.menuItemId !== MENU_ID) return;
    const text = (info.selectionText || '').trim();
    if (!text) return;

    // No need to notify the tab directly — saveWord() triggers
    // chrome.storage.onChanged, which background.js already uses to
    // broadcast WORDS_UPDATED to every tab and refresh highlighting.
    try {
      const translation = await translateWord(text);
      await saveWord(text, translation);
    } catch (err) {
      console.warn('Failed to add selection via context menu:', err.message);
    }
  });
}
