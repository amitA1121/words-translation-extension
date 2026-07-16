// Talks to Google Translate's public endpoint. No API key required.

export async function translateWord(word, sourceLang = 'en', targetLang = 'he') {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(word)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Translation request failed: ${res.status}`);
  }
  const data = await res.json();
  const translation = data && data[0] ? data[0].map(chunk => chunk[0]).join('') : '';
  if (!translation) {
    throw new Error('No translation found');
  }
  return translation;
}

export async function translateWordMulti(word, sourceLang = 'en', targetLang = 'he') {
  // Google's dt=t only gives one primary translation. dt=t + dt=bd surfaces
  // "alternative translations" / dictionary entries when available.
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&dt=bd&q=${encodeURIComponent(word)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Translation request failed: ${res.status}`);
  }
  const data = await res.json();

  const results = [];
  const primary = data && data[0] ? data[0].map(chunk => chunk[0]).join('') : '';
  if (primary) results.push(primary);

  // data[1] holds dictionary-style entries: [[pos, [terms...], ...], ...]
  const dict = data && data[1];
  if (Array.isArray(dict)) {
    for (const entry of dict) {
      const terms = entry && entry[1];
      if (Array.isArray(terms)) {
        for (const term of terms) {
          if (term && !results.includes(term)) results.push(term);
        }
      }
    }
  }

  if (results.length === 0) {
    throw new Error('No translation found');
  }
  return results.slice(0, 8);
}
