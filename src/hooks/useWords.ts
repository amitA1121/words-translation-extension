// The popup's single source of truth for the saved-words map. Loads once,
// then stays in sync by listening to chrome.storage changes — so any
// mutation (from this popup, a tooltip in a tab, or the context menu)
// updates the UI without manual refresh calls.

import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { backgroundApi } from '../lib/messaging';
import { WORDS_STORAGE_KEY } from '../lib/storageKeys';
import type { SavedWords } from '../lib/types';

export function useWords(): SavedWords {
  const [words, setWords] = useState<SavedWords>({});

  useEffect(() => {
    void backgroundApi.getWords().then(setWords);

    const onChanged = (
      changes: Record<string, { newValue?: unknown }>,
      areaName: string
    ): void => {
      if (areaName === 'local' && changes[WORDS_STORAGE_KEY]) {
        setWords((changes[WORDS_STORAGE_KEY].newValue as SavedWords | undefined) ?? {});
      }
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => browser.storage.onChanged.removeListener(onChanged);
  }, []);

  return words;
}
