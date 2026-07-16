// The searchable/sortable/filterable list of saved words, including the
// stats line and empty states.

import { useMemo, useState } from 'react';
import type { SavedWords, WordEntry } from '../lib/types';
import { WordRow } from './WordRow';

type SortMode = 'date-desc' | 'date-asc' | 'alpha-asc' | 'alpha-desc' | 'views-desc';

const SORT_COMPARATORS: Record<SortMode, (a: WordEntry, b: WordEntry) => number> = {
  'date-desc': (a, b) => b.addedAt - a.addedAt,
  'date-asc': (a, b) => a.addedAt - b.addedAt,
  'alpha-asc': (a, b) => a.original.localeCompare(b.original),
  'alpha-desc': (a, b) => b.original.localeCompare(a.original),
  'views-desc': (a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0)
};

function filterAndSort(
  allEntries: WordEntry[],
  query: string,
  sortMode: SortMode,
  unlearnedOnly: boolean
): WordEntry[] {
  const q = query.trim().toLowerCase();
  let entries = q
    ? allEntries.filter(
        (e) => e.original.toLowerCase().includes(q) || e.translation.includes(q)
      )
    : [...allEntries];

  if (unlearnedOnly) {
    entries = entries.filter((e) => !e.learned);
  }

  const comparator = SORT_COMPARATORS[sortMode];
  return entries.sort((a, b) => {
    // Learned words always sink below unlearned ones, whatever the sort.
    if (a.learned !== b.learned) return a.learned ? 1 : -1;
    return comparator(a, b);
  });
}

export function WordListSection({ words }: { words: SavedWords }) {
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('date-desc');
  const [unlearnedOnly, setUnlearnedOnly] = useState(false);

  const allEntries = useMemo(() => Object.values(words), [words]);
  const entries = useMemo(
    () => filterAndSort(allEntries, query, sortMode, unlearnedOnly),
    [allEntries, query, sortMode, unlearnedOnly]
  );
  const learnedCount = allEntries.filter((e) => e.learned).length;

  return (
    <>
      <div className="wh-search-wrap">
        <input
          id="wh-search"
          className="wh-search-input"
          type="text"
          placeholder="חיפוש מילה..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="wh-toolbar-wrap">
        <select
          id="wh-sort"
          className="wh-sort-select"
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
        >
          <option value="date-desc">חדש קודם</option>
          <option value="date-asc">ישן קודם</option>
          <option value="alpha-asc">א-ב (א עד ת)</option>
          <option value="alpha-desc">א-ב (ת עד א)</option>
          <option value="views-desc">הכי נצפות</option>
        </select>
        <label className="wh-filter-toggle">
          <input
            id="wh-filter-unlearned"
            type="checkbox"
            checked={unlearnedOnly}
            onChange={(e) => setUnlearnedOnly(e.target.checked)}
          />
          <span>רק לא נלמדות</span>
        </label>
      </div>

      <div id="wh-stats" className="wh-stats">
        {allEntries.length > 0 ? `${allEntries.length} מילים, ${learnedCount} נלמדו` : ''}
      </div>

      {allEntries.length === 0 && (
        <div id="wh-empty" className="wh-empty">
          עדיין לא סימנת מילים.
          <br />
          לחץ על מילה באנגלית באתר, וסמן אותה כדי שתופיע כאן.
        </div>
      )}

      {allEntries.length > 0 && entries.length === 0 && (
        <div id="wh-no-results" className="wh-empty">
          לא נמצאו מילים תואמות.
        </div>
      )}

      <ul id="wh-list" className="wh-list">
        {entries.map((entry) => (
          <WordRow key={entry.original} entry={entry} />
        ))}
      </ul>
    </>
  );
}
