// Persists the user's saved word list. chrome.storage.local is the fast,
// effectively-unlimited primary store; chrome.storage.sync mirrors the same
// data across every Chrome profile signed into the same Google account, so
// the list survives an extension uninstall/reinstall.
//
// The storage keys are unchanged from the pre-TypeScript version of the
// extension, so an existing installation keeps its data after upgrading.

import { browser } from 'wxt/browser';
import { SavedWordsSchema, type SavedWords } from './types';
import { WORDS_STORAGE_KEY } from './storageKeys';
import {
  SYNC_SHARD_COUNT_KEY,
  chunkWordsForSync,
  mergeShards,
  shardKey
} from './syncShards';

export async function getSavedWords(): Promise<SavedWords> {
  const data = await browser.storage.local.get(WORDS_STORAGE_KEY);
  return (data[WORDS_STORAGE_KEY] as SavedWords | undefined) ?? {};
}

async function backupWordsToSync(words: SavedWords): Promise<void> {
  try {
    const shards = chunkWordsForSync(words);
    const payload: Record<string, unknown> = { [SYNC_SHARD_COUNT_KEY]: shards.length };
    shards.forEach((shard, i) => {
      payload[shardKey(i)] = shard;
    });

    // Clear any leftover shards from a previous, larger backup.
    const existing = await browser.storage.sync.get(SYNC_SHARD_COUNT_KEY);
    const oldCount = (existing[SYNC_SHARD_COUNT_KEY] as number | undefined) ?? 0;
    const removeKeys: string[] = [];
    for (let i = shards.length; i < oldCount; i++) {
      removeKeys.push(shardKey(i));
    }
    if (removeKeys.length > 0) await browser.storage.sync.remove(removeKeys);

    await browser.storage.sync.set(payload);
  } catch (err) {
    // sync can fail (offline, quota exceeded, not signed in) — local storage
    // already has the data, so this is a best-effort backup, not required.
    console.warn('Sync backup failed:', err);
  }
}

export async function restoreWordsFromSyncIfEmpty(): Promise<void> {
  const local = await getSavedWords();
  if (Object.keys(local).length > 0) {
    return; // local already has data — never overwrite it with a backup
  }

  const countData = await browser.storage.sync.get(SYNC_SHARD_COUNT_KEY);
  const shardCount = (countData[SYNC_SHARD_COUNT_KEY] as number | undefined) ?? 0;
  if (shardCount === 0) return;

  const keys = Array.from({ length: shardCount }, (_, i) => shardKey(i));
  const shardsData = await browser.storage.sync.get(keys);
  const merged = mergeShards(keys.map((k) => shardsData[k] as SavedWords | undefined));

  // The backup may come from an older extension version — validate and
  // normalize (fill defaults) instead of trusting it blindly.
  const parsed = SavedWordsSchema.safeParse(merged);
  if (parsed.success && Object.keys(parsed.data).length > 0) {
    await browser.storage.local.set({ [WORDS_STORAGE_KEY]: parsed.data });
  }
}

async function persistWords(words: SavedWords): Promise<void> {
  await browser.storage.local.set({ [WORDS_STORAGE_KEY]: words });
  void backupWordsToSync(words); // fire-and-forget, doesn't block the UI
}

export async function saveWord(word: string, translation: string): Promise<SavedWords> {
  const words = await getSavedWords();
  const key = word.toLowerCase();
  words[key] = {
    original: key,
    translation,
    addedAt: Date.now(),
    learned: false,
    viewCount: 0
  };
  await persistWords(words);
  return words;
}

export async function removeWord(word: string): Promise<SavedWords> {
  const words = await getSavedWords();
  delete words[word.toLowerCase()];
  await persistWords(words);
  return words;
}

export async function setWordLearned(word: string, learned: boolean): Promise<SavedWords> {
  const words = await getSavedWords();
  const entry = words[word.toLowerCase()];
  if (!entry) return words;
  entry.learned = learned;
  await persistWords(words);
  return words;
}

// Merges a backup (e.g. exported from an older installation) into the
// current list. Imported entries win on key conflicts — a restore should
// bring back what the backup says.
export async function importWords(imported: SavedWords): Promise<SavedWords> {
  const words = await getSavedWords();
  const merged = { ...words, ...imported };
  await persistWords(merged);
  return merged;
}

// Adds a batch of confirmed on-screen views ({ wordKey: count }) — the
// content script batches these to avoid a storage write per word per
// scroll frame. Silently ignores words that aren't saved.
export async function recordWordViews(viewCounts: Record<string, number>): Promise<void> {
  const words = await getSavedWords();
  let changed = false;
  for (const [key, count] of Object.entries(viewCounts)) {
    if (words[key] && count > 0) {
      words[key].viewCount = (words[key].viewCount ?? 0) + count;
      changed = true;
    }
  }
  if (changed) await persistWords(words);
}
