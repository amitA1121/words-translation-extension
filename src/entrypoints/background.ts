// Service-worker composition root: implements the typed message protocol,
// broadcasts word-list changes to every tab, and owns the context menu.

import { browser } from 'wxt/browser';
import {
  WORDS_UPDATED,
  createMessageListener,
  type ProtocolHandlers
} from '../lib/messaging';
import {
  WORDS_STORAGE_KEY,
  getSavedWords,
  saveWord,
  removeWord,
  setWordLearned,
  recordWordViews,
  importWords,
  restoreWordsFromSyncIfEmpty
} from '../lib/storage';
import { translateWord, translateWordMulti } from '../lib/translate';
import type { SavedWords } from '../lib/types';

const handlers: ProtocolHandlers = {
  TRANSLATE_WORD: async ({ word }) => ({ translation: await translateWord(word) }),
  TRANSLATE_WORD_MULTI: async ({ word, sourceLang, targetLang }) => ({
    translations: await translateWordMulti(word, sourceLang, targetLang)
  }),
  SAVE_WORD: async ({ word, translation }) => ({ words: await saveWord(word, translation) }),
  REMOVE_WORD: async ({ word }) => ({ words: await removeWord(word) }),
  SET_WORD_LEARNED: async ({ word, learned }) => ({ words: await setWordLearned(word, learned) }),
  RECORD_WORD_VIEWS: async ({ viewCounts }) => {
    await recordWordViews(viewCounts);
    return { recorded: true };
  },
  GET_WORDS: async () => ({ words: await getSavedWords() }),
  IMPORT_WORDS: async ({ words }) => ({ words: await importWords(words) })
};

// Whenever the saved-words map changes in storage (from any context: popup,
// tooltip, context menu), push the new map to every tab so content scripts
// refresh their highlighting without polling.
function registerWordsBroadcast(): void {
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes[WORDS_STORAGE_KEY]) return;
    const words = (changes[WORDS_STORAGE_KEY].newValue as SavedWords | undefined) ?? {};
    void browser.tabs.query({}).then((tabs) => {
      for (const tab of tabs) {
        if (tab.id !== undefined) {
          browser.tabs.sendMessage(tab.id, { type: WORDS_UPDATED, words }).catch(() => {
            // Tab has no content script (chrome:// pages etc.) — fine.
          });
        }
      }
    });
  });
}

// Right-click context menu: lets the user save the currently selected text
// (a single word OR a multi-word phrase) without needing to double-click
// an exact word — useful for phrases/idioms a double-click can't target.
const MENU_ID = 'wh-add-selection';

function setupContextMenu(): void {
  // Service workers restart frequently, and this code re-runs from scratch
  // on every restart. contextMenus.create() does NOT dedupe by id across
  // restarts — removeAll() first guarantees a clean slate every time.
  browser.contextMenus.removeAll(() => {
    browser.contextMenus.create({
      id: MENU_ID,
      title: 'הוסף "%s" למילון',
      contexts: ['selection']
    });
  });

  browser.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId !== MENU_ID) return;
    const text = (info.selectionText ?? '').trim();
    if (!text) return;

    // No need to notify tabs directly — saveWord() triggers
    // storage.onChanged, which already broadcasts WORDS_UPDATED everywhere.
    void translateWord(text)
      .then((translation) => saveWord(text, translation))
      .catch((err: unknown) => console.warn('Failed to add selection via context menu:', err));
  });
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(createMessageListener(handlers));
  registerWordsBroadcast();
  setupContextMenu();

  void restoreWordsFromSyncIfEmpty().catch(() => {});
  browser.runtime.onInstalled.addListener(() => {
    void restoreWordsFromSyncIfEmpty().catch(() => {});
  });
});
