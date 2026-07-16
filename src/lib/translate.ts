// Talks to Google Translate's unofficial public endpoint. No API key
// required; undocumented and may change — intended for personal use.

import type { Lang } from './types';

function endpoint(word: string, sourceLang: Lang, targetLang: Lang, extraParams = ''): string {
  return (
    'https://translate.googleapis.com/translate_a/single' +
    `?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t${extraParams}&q=${encodeURIComponent(word)}`
  );
}

// The endpoint returns a positional (untyped) JSON array:
// data[0] = translation chunks, data[1] = dictionary entries.
type GtxResponse = [
  Array<[string, ...unknown[]]> | null,
  Array<[string, string[], ...unknown[]]> | null,
  ...unknown[]
];

async function fetchGtx(url: string): Promise<GtxResponse> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Translation request failed: ${res.status}`);
  }
  return (await res.json()) as GtxResponse;
}

function primaryTranslation(data: GtxResponse): string {
  return data[0] ? data[0].map((chunk) => chunk[0]).join('') : '';
}

export async function translateWord(
  word: string,
  sourceLang: Lang = 'en',
  targetLang: Lang = 'he'
): Promise<string> {
  const data = await fetchGtx(endpoint(word, sourceLang, targetLang));
  const translation = primaryTranslation(data);
  if (!translation) {
    throw new Error('No translation found');
  }
  return translation;
}

export async function translateWordMulti(
  word: string,
  sourceLang: Lang = 'en',
  targetLang: Lang = 'he'
): Promise<string[]> {
  // dt=t only gives one primary translation; adding dt=bd surfaces
  // "alternative translations" / dictionary entries when available.
  const data = await fetchGtx(endpoint(word, sourceLang, targetLang, '&dt=bd'));

  const results: string[] = [];
  const primary = primaryTranslation(data);
  if (primary) results.push(primary);

  for (const entry of data[1] ?? []) {
    for (const term of entry?.[1] ?? []) {
      if (term && !results.includes(term)) results.push(term);
    }
  }

  if (results.length === 0) {
    throw new Error('No translation found');
  }
  return results.slice(0, 8);
}
