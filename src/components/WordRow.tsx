import { backgroundApi } from '../lib/messaging';
import type { WordEntry } from '../lib/types';

// One row in the saved-words list. Mutations go through the background;
// the storage.onChanged listener in useWords refreshes the UI.
export function WordRow({ entry }: { entry: WordEntry }) {
  return (
    <li className={entry.learned ? 'wh-item wh-item-learned' : 'wh-item'}>
      <div className="wh-item-text">
        <span className="wh-item-word">{entry.original}</span>
        <span className="wh-item-translation">{entry.translation}</span>
        {entry.learned && <span className="wh-item-badge">נלמד</span>}
        {entry.viewCount > 0 && (
          <span className="wh-item-views">נצפתה {entry.viewCount} פעמים</span>
        )}
      </div>
      <div className="wh-item-actions">
        <button
          className="wh-item-learned-btn"
          title={entry.learned ? 'סמן שוב כמילה ללימוד' : 'סמן כנלמד (יפסיק להיות מסומן בכתום)'}
          onClick={() => void backgroundApi.setWordLearned(entry.original, !entry.learned)}
        >
          {entry.learned ? '↺ החזר לסימון' : '✓ אני יודע את זה'}
        </button>
        <button
          className="wh-item-delete"
          title="הסר"
          onClick={() => void backgroundApi.removeWord(entry.original)}
        >
          ✕
        </button>
      </div>
    </li>
  );
}
