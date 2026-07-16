// JSON backup/restore for the word list: export downloads the raw map,
// import merges a previously exported file back in (Zod-validated). This is
// also the migration path for word lists from older installations of the
// extension, since an unpacked extension's storage doesn't carry over when
// it's loaded from a new path.

import { useRef } from 'react';
import { backgroundApi } from '../lib/messaging';
import { SavedWordsSchema, type SavedWords } from '../lib/types';

function downloadWordsJson(words: SavedWords): void {
  const blob = new Blob([JSON.stringify(words, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'words-backup.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function BackupRow({ words }: { words: SavedWords }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function onImportFile(file: File): Promise<void> {
    let imported: SavedWords;
    try {
      const parsed = SavedWordsSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) throw new Error('schema mismatch');
      imported = parsed.data;
    } catch {
      alert('הקובץ אינו גיבוי מילים תקין.');
      return;
    }
    await backgroundApi.importWords(imported);
    alert(`יובאו ${Object.keys(imported).length} מילים בהצלחה.`);
  }

  return (
    <div className="wh-tools-row">
      <button
        className="wh-open-dict-btn"
        title="הורדת כל המילים כקובץ JSON"
        onClick={() => downloadWordsJson(words)}
      >
        💾 גיבוי JSON
      </button>
      <button
        className="wh-open-review-btn"
        title="שחזור מילים מקובץ גיבוי JSON"
        onClick={() => fileInputRef.current?.click()}
      >
        📥 ייבוא מגיבוי
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void onImportFile(file);
        }}
      />
    </div>
  );
}
