import { describe, expect, it } from 'vitest';
import { WORD_RE, buildWordPattern, createWordScanRegex, escapeRegExp, unlearnedEntries, unlearnedKeys } from './words';
import type { SavedWords } from './types';

function entry(original: string, learned = false): SavedWords[string] {
  return { original, translation: 'תרגום', addedAt: 0, learned, viewCount: 0 };
}

describe('WORD_RE', () => {
  it('accepts plain words and internal apostrophes/hyphens', () => {
    expect(WORD_RE.test('hello')).toBe(true);
    expect(WORD_RE.test("don't")).toBe(true);
    expect(WORD_RE.test('well-known')).toBe(true);
  });

  it('rejects non-words', () => {
    expect(WORD_RE.test('')).toBe(false);
    expect(WORD_RE.test('two words')).toBe(false);
    expect(WORD_RE.test('שלום')).toBe(false);
    expect(WORD_RE.test('123')).toBe(false);
    expect(WORD_RE.test("-leading")).toBe(false);
    expect(WORD_RE.test("trailing-")).toBe(false);
  });
});

describe('createWordScanRegex', () => {
  it('finds every word in a mixed string', () => {
    const matches = [...'Hello, well-known world! 123 foo'.matchAll(createWordScanRegex())];
    expect(matches.map((m) => m[0])).toEqual(['Hello', 'well-known', 'world', 'foo']);
  });
});

describe('buildWordPattern', () => {
  it('returns null when there is nothing to highlight', () => {
    expect(buildWordPattern({})).toBeNull();
    expect(buildWordPattern({ cat: entry('cat', true) })).toBeNull();
  });

  it('matches saved words case-insensitively as whole words only', () => {
    const pattern = buildWordPattern({ cat: entry('cat') })!;
    expect('The CAT sat'.match(pattern)).toEqual(['CAT']);
    pattern.lastIndex = 0;
    expect(pattern.test('concatenate')).toBe(false);
  });

  it('prefers longer saved words over shorter overlapping ones', () => {
    const pattern = buildWordPattern({ cat: entry('cat'), catalog: entry('catalog') })!;
    expect('a catalog entry'.match(pattern)).toEqual(['catalog']);
  });

  it('escapes regex metacharacters in saved words', () => {
    expect(escapeRegExp('a.b*c')).toBe('a\\.b\\*c');
    const pattern = buildWordPattern({ "o'brien": entry("o'brien") })!;
    expect("met o'brien today".match(pattern)).toEqual(["o'brien"]);
  });
});

describe('learned filtering', () => {
  const words: SavedWords = {
    cat: entry('cat'),
    dog: entry('dog', true),
    fox: entry('fox')
  };

  it('unlearnedKeys keeps only unlearned words', () => {
    expect(unlearnedKeys(words).sort()).toEqual(['cat', 'fox']);
  });

  it('unlearnedEntries keeps only unlearned entries', () => {
    expect(unlearnedEntries(words).map((e) => e.original).sort()).toEqual(['cat', 'fox']);
  });
});
