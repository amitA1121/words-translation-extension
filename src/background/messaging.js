// Background-side message handling: routes every runtime message to the right
// service (storage/translation) and broadcasts word-list changes to every
// open tab. background.js just calls the two register functions.

import {
  getSavedWords,
  saveWord,
  removeWord,
  setWordLearned,
  recordWordViews,
  WORDS_STORAGE_KEY
} from '../storage/wordStorage.js';
import { translateWord, translateWordMulti } from '../translation/translationService.js';
import { MSG } from '../shared/backgroundApi.js';

// Each handler returns the payload merged into the { ok: true } response.
const handlers = {
  [MSG.TRANSLATE_WORD]: async (msg) => ({
    translation: await translateWord(msg.word)
  }),
  [MSG.TRANSLATE_WORD_MULTI]: async (msg) => ({
    translations: await translateWordMulti(msg.word, msg.sourceLang || 'en', msg.targetLang || 'he')
  }),
  [MSG.SAVE_WORD]: async (msg) => ({
    words: await saveWord(msg.word, msg.translation)
  }),
  [MSG.REMOVE_WORD]: async (msg) => ({
    words: await removeWord(msg.word)
  }),
  [MSG.SET_WORD_LEARNED]: async (msg) => ({
    words: await setWordLearned(msg.word, msg.learned)
  }),
  [MSG.RECORD_WORD_VIEWS]: async (msg) => {
    await recordWordViews(msg.viewCounts);
    return {};
  },
  [MSG.GET_WORDS]: async () => ({
    words: await getSavedWords()
  })
};

export function registerMessageRouter() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const handler = handlers[message.type];
    if (!handler) {
      sendResponse({ ok: false, error: `Unknown message type: ${message.type}` });
      return false;
    }
    handler(message)
      .then((payload) => sendResponse({ ok: true, ...payload }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true; // keep the channel open for the async response
  });
}

// Whenever the saved-words map changes in storage (from any context: popup,
// tooltip, context menu), push the new map to every tab so content scripts
// refresh their highlighting without polling.
export function registerWordsBroadcast() {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes[WORDS_STORAGE_KEY]) return;
    const words = changes[WORDS_STORAGE_KEY].newValue || {};
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        if (tab.id !== undefined) {
          chrome.tabs.sendMessage(tab.id, { type: MSG.WORDS_UPDATED, words }).catch(() => {});
        }
      }
    });
  });
}
