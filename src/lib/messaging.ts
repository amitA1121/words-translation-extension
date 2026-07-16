// The extension's internal message protocol, fully typed in one place.
// UI and content code call the `backgroundApi` client instead of
// hand-building sendMessage payloads; the background implements
// `ProtocolHandlers`, so both sides are checked against the same contract
// and can't drift apart.

import { browser } from 'wxt/browser';
import type { Lang, SavedWords } from './types';

export interface Protocol {
  TRANSLATE_WORD: {
    req: { word: string };
    res: { translation: string };
  };
  TRANSLATE_WORD_MULTI: {
    req: { word: string; sourceLang: Lang; targetLang: Lang };
    res: { translations: string[] };
  };
  SAVE_WORD: {
    req: { word: string; translation: string };
    res: { words: SavedWords };
  };
  REMOVE_WORD: {
    req: { word: string };
    res: { words: SavedWords };
  };
  SET_WORD_LEARNED: {
    req: { word: string; learned: boolean };
    res: { words: SavedWords };
  };
  RECORD_WORD_VIEWS: {
    req: { viewCounts: Record<string, number> };
    res: { recorded: true };
  };
  GET_WORDS: {
    req: Record<string, never>;
    res: { words: SavedWords };
  };
}

export type MessageType = keyof Protocol;

/** What the background must implement — one async handler per message. */
export type ProtocolHandlers = {
  [K in MessageType]: (req: Protocol[K]['req']) => Promise<Protocol[K]['res']>;
};

type WireResponse<K extends MessageType> =
  | { ok: true; data: Protocol[K]['res'] }
  | { ok: false; error: string };

// Broadcast (background -> every tab/popup) when the word list changes.
export const WORDS_UPDATED = 'WORDS_UPDATED' as const;
export interface WordsUpdatedMessage {
  type: typeof WORDS_UPDATED;
  words: SavedWords;
}

export function isWordsUpdatedMessage(message: unknown): message is WordsUpdatedMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: unknown }).type === WORDS_UPDATED
  );
}

async function sendRequest<K extends MessageType>(
  type: K,
  payload: Protocol[K]['req']
): Promise<Protocol[K]['res'] | null> {
  try {
    const res = (await browser.runtime.sendMessage({ type, ...payload })) as
      | WireResponse<K>
      | undefined;
    return res && res.ok ? res.data : null;
  } catch {
    // Background error, service worker asleep, or no listener — callers
    // branch on null instead of unpacking envelopes everywhere.
    return null;
  }
}

export const backgroundApi = {
  async translate(word: string): Promise<string | null> {
    const res = await sendRequest('TRANSLATE_WORD', { word });
    return res?.translation ?? null;
  },

  async translateMulti(word: string, sourceLang: Lang, targetLang: Lang): Promise<string[] | null> {
    const res = await sendRequest('TRANSLATE_WORD_MULTI', { word, sourceLang, targetLang });
    return res?.translations ?? null;
  },

  async saveWord(word: string, translation: string): Promise<SavedWords | null> {
    const res = await sendRequest('SAVE_WORD', { word, translation });
    return res?.words ?? null;
  },

  async removeWord(word: string): Promise<SavedWords | null> {
    const res = await sendRequest('REMOVE_WORD', { word });
    return res?.words ?? null;
  },

  async setWordLearned(word: string, learned: boolean): Promise<SavedWords | null> {
    const res = await sendRequest('SET_WORD_LEARNED', { word, learned });
    return res?.words ?? null;
  },

  async recordWordViews(viewCounts: Record<string, number>): Promise<void> {
    await sendRequest('RECORD_WORD_VIEWS', { viewCounts });
  },

  async getWords(): Promise<SavedWords> {
    const res = await sendRequest('GET_WORDS', {});
    return res?.words ?? {};
  }
};

/**
 * Builds the chrome-style onMessage listener from a full set of typed
 * handlers. Returns `true` (keep the response channel open) only for
 * messages that belong to the protocol.
 */
export function createMessageListener(handlers: ProtocolHandlers) {
  return (
    message: unknown,
    _sender: unknown,
    sendResponse: (response: unknown) => void
  ): true | undefined => {
    const type = (message as { type?: string } | null)?.type as MessageType | undefined;
    if (!type || !(type in handlers)) return undefined; // not ours (e.g. WORDS_UPDATED)

    const handler = handlers[type] as (req: unknown) => Promise<unknown>;
    handler(message)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err: unknown) =>
        sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) })
      );
    return true; // async response
  };
}
