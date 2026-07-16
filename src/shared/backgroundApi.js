// The extension's internal message protocol, in one place. UI and content
// modules call these typed functions instead of hand-building
// chrome.runtime.sendMessage payloads, and the background router keys its
// handlers off the same MSG constants — so the two sides can't drift apart.
//
// Every function resolves to a usable value or null on failure (background
// error, service worker asleep, no listener) — callers branch on null
// instead of unpacking {ok, ...} envelopes everywhere.

export const MSG = Object.freeze({
  TRANSLATE_WORD: 'TRANSLATE_WORD',
  TRANSLATE_WORD_MULTI: 'TRANSLATE_WORD_MULTI',
  SAVE_WORD: 'SAVE_WORD',
  REMOVE_WORD: 'REMOVE_WORD',
  SET_WORD_LEARNED: 'SET_WORD_LEARNED',
  RECORD_WORD_VIEWS: 'RECORD_WORD_VIEWS',
  GET_WORDS: 'GET_WORDS',
  WORDS_UPDATED: 'WORDS_UPDATED'
});

async function send(message) {
  try {
    const res = await chrome.runtime.sendMessage(message);
    return res && res.ok ? res : null;
  } catch {
    return null;
  }
}

/** @returns {Promise<string|null>} the translation, or null on failure */
export async function translate(word) {
  const res = await send({ type: MSG.TRANSLATE_WORD, word });
  return res ? res.translation : null;
}

/** @returns {Promise<string[]|null>} translation candidates, or null on failure */
export async function translateMulti(word, sourceLang, targetLang) {
  const res = await send({ type: MSG.TRANSLATE_WORD_MULTI, word, sourceLang, targetLang });
  return res ? res.translations : null;
}

export async function saveWord(word, translation) {
  return send({ type: MSG.SAVE_WORD, word, translation });
}

export async function removeWord(word) {
  return send({ type: MSG.REMOVE_WORD, word });
}

export async function setWordLearned(word, learned) {
  return send({ type: MSG.SET_WORD_LEARNED, word, learned });
}

/** @param {Record<string, number>} viewCounts word key -> confirmed views to add */
export async function recordWordViews(viewCounts) {
  return send({ type: MSG.RECORD_WORD_VIEWS, viewCounts });
}

/** @returns {Promise<Record<string, object>>} the saved-words map ({} on failure) */
export async function getWords() {
  const res = await send({ type: MSG.GET_WORDS });
  return res ? res.words : {};
}
