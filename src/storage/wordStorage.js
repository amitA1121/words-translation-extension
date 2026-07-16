// Persists the user's saved word list. chrome.storage.local is the fast,
// effectively-unlimited primary store; chrome.storage.sync mirrors the same
// data across every Chrome profile signed into the same Google account, so
// the list survives an extension uninstall/reinstall. Sync has a hard
// per-item cap (~8KB) and a total cap (~100KB), so the word map is sharded
// across multiple numbered keys instead of one big blob.

const STORAGE_KEY = 'savedWords';
const SYNC_SHARD_PREFIX = 'savedWordsShard_';
const SYNC_SHARD_COUNT_KEY = 'savedWordsShardCount';
const SYNC_MAX_BYTES_PER_SHARD = 7000; // stay under the ~8KB per-item cap

function chunkWordsForSync(words) {
  const entries = Object.entries(words);
  const shards = [];
  let current = {};
  let currentSize = 2; // "{}"

  for (const [key, value] of entries) {
    const entrySize = JSON.stringify({ [key]: value }).length;
    if (currentSize + entrySize > SYNC_MAX_BYTES_PER_SHARD && Object.keys(current).length > 0) {
      shards.push(current);
      current = {};
      currentSize = 2;
    }
    current[key] = value;
    currentSize += entrySize;
  }
  if (Object.keys(current).length > 0 || shards.length === 0) {
    shards.push(current);
  }
  return shards;
}

async function backupWordsToSync(words) {
  try {
    const shards = chunkWordsForSync(words);
    const payload = {};
    shards.forEach((shard, i) => {
      payload[`${SYNC_SHARD_PREFIX}${i}`] = shard;
    });
    payload[SYNC_SHARD_COUNT_KEY] = shards.length;

    // Clear any leftover shards from a previous, larger backup.
    const existing = await chrome.storage.sync.get(SYNC_SHARD_COUNT_KEY);
    const oldCount = existing[SYNC_SHARD_COUNT_KEY] || 0;
    const removeKeys = [];
    for (let i = shards.length; i < oldCount; i++) {
      removeKeys.push(`${SYNC_SHARD_PREFIX}${i}`);
    }
    if (removeKeys.length) await chrome.storage.sync.remove(removeKeys);

    await chrome.storage.sync.set(payload);
  } catch (err) {
    // sync can fail (offline, quota exceeded, not signed in) — local storage
    // already has the data, so this is a best-effort backup, not required.
    console.warn('Sync backup failed:', err.message);
  }
}

export async function restoreWordsFromSyncIfEmpty() {
  const localData = await chrome.storage.local.get(STORAGE_KEY);
  if (localData[STORAGE_KEY] && Object.keys(localData[STORAGE_KEY]).length > 0) {
    return; // local already has data — never overwrite it with a backup
  }

  const countData = await chrome.storage.sync.get(SYNC_SHARD_COUNT_KEY);
  const shardCount = countData[SYNC_SHARD_COUNT_KEY] || 0;
  if (shardCount === 0) return;

  const shardKeys = Array.from({ length: shardCount }, (_, i) => `${SYNC_SHARD_PREFIX}${i}`);
  const shardsData = await chrome.storage.sync.get(shardKeys);

  const merged = {};
  for (const key of shardKeys) {
    Object.assign(merged, shardsData[key] || {});
  }

  if (Object.keys(merged).length > 0) {
    await chrome.storage.local.set({ [STORAGE_KEY]: merged });
  }
}

export async function getSavedWords() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || {};
}

async function persistWords(words) {
  await chrome.storage.local.set({ [STORAGE_KEY]: words });
  backupWordsToSync(words); // fire-and-forget, doesn't block the UI
}

export async function saveWord(word, translation) {
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

// Adds a batch of confirmed on-screen views ({ wordKey: count }) — the
// content script batches these to avoid a storage write per word per
// scroll frame. Silently ignores words that aren't saved.
export async function recordWordViews(viewCounts) {
  if (!viewCounts) return;
  const words = await getSavedWords();
  let changed = false;
  for (const [key, count] of Object.entries(viewCounts)) {
    if (words[key] && count > 0) {
      words[key].viewCount = (words[key].viewCount || 0) + count;
      changed = true;
    }
  }
  if (changed) await persistWords(words);
}

export async function removeWord(word) {
  const words = await getSavedWords();
  const key = word.toLowerCase();
  delete words[key];
  await persistWords(words);
  return words;
}

export async function setWordLearned(word, learned) {
  const words = await getSavedWords();
  const key = word.toLowerCase();
  if (!words[key]) return words;
  words[key].learned = learned;
  await persistWords(words);
  return words;
}

export const WORDS_STORAGE_KEY = STORAGE_KEY;
