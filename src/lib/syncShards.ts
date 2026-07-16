// Pure sharding logic for backing the word map up to chrome.storage.sync.
// Sync has a hard per-item cap (~8KB) and a total cap (~100KB), so the map
// is split across multiple numbered keys instead of one big blob. Kept free
// of browser APIs so it's directly unit-testable.

import type { SavedWords } from './types';

export const SYNC_SHARD_PREFIX = 'savedWordsShard_';
export const SYNC_SHARD_COUNT_KEY = 'savedWordsShardCount';
export const SYNC_MAX_BYTES_PER_SHARD = 7000; // stay under the ~8KB per-item cap

export function shardKey(index: number): string {
  return `${SYNC_SHARD_PREFIX}${index}`;
}

export function chunkWordsForSync(
  words: SavedWords,
  maxBytesPerShard: number = SYNC_MAX_BYTES_PER_SHARD
): SavedWords[] {
  const shards: SavedWords[] = [];
  let current: SavedWords = {};
  let currentSize = 2; // "{}"

  for (const [key, value] of Object.entries(words)) {
    const entrySize = JSON.stringify({ [key]: value }).length;
    if (currentSize + entrySize > maxBytesPerShard && Object.keys(current).length > 0) {
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

export function mergeShards(shards: Array<SavedWords | undefined>): SavedWords {
  const merged: SavedWords = {};
  for (const shard of shards) {
    Object.assign(merged, shard ?? {});
  }
  return merged;
}
