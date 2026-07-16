import { describe, expect, it } from 'vitest';
import { SYNC_MAX_BYTES_PER_SHARD, chunkWordsForSync, mergeShards, shardKey } from './syncShards';
import type { SavedWords } from './types';

function makeWords(count: number): SavedWords {
  const words: SavedWords = {};
  for (let i = 0; i < count; i++) {
    const key = `word${i}`;
    words[key] = {
      original: key,
      translation: 'תרגום ארוך יחסית כדי לתפוס מקום',
      addedAt: 1700000000000 + i,
      learned: i % 3 === 0,
      viewCount: i
    };
  }
  return words;
}

describe('chunkWordsForSync', () => {
  it('produces a single empty shard for an empty map', () => {
    expect(chunkWordsForSync({})).toEqual([{}]);
  });

  it('keeps every shard under the byte cap', () => {
    const shards = chunkWordsForSync(makeWords(300));
    expect(shards.length).toBeGreaterThan(1);
    for (const shard of shards) {
      expect(JSON.stringify(shard).length).toBeLessThanOrEqual(SYNC_MAX_BYTES_PER_SHARD);
      expect(Object.keys(shard).length).toBeGreaterThan(0);
    }
  });

  it('round-trips: merging the shards reproduces the original map', () => {
    const words = makeWords(300);
    expect(mergeShards(chunkWordsForSync(words))).toEqual(words);
  });

  it('merge ignores missing shards instead of crashing', () => {
    const words = makeWords(5);
    expect(mergeShards([undefined, words, undefined])).toEqual(words);
  });
});

describe('shardKey', () => {
  it('produces the same numbered keys the pre-TypeScript version used', () => {
    // Compatibility contract: existing users' sync backups must stay readable.
    expect(shardKey(0)).toBe('savedWordsShard_0');
    expect(shardKey(12)).toBe('savedWordsShard_12');
  });
});
