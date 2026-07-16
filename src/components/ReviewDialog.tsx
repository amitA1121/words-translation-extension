// The "שינון מילים" flashcard modal: cycles through unlearned words one at
// a time, hides the translation until clicked, and lets you mark a word
// learned or skip it for next time.

import { useState } from 'react';
import { backgroundApi } from '../lib/messaging';
import { speakText } from '../lib/speech';
import { unlearnedEntries } from '../lib/words';
import type { SavedWords, WordEntry } from '../lib/types';
import { ModalHeader, ModalOverlay } from './ModalOverlay';

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface ReviewDialogProps {
  words: SavedWords;
  onClose: () => void;
}

export function ReviewDialog({ words, onClose }: ReviewDialogProps) {
  // The deck is shuffled once when the dialog mounts (i.e. on open) — not
  // on every words change, or marking a word learned would reshuffle it.
  const [deck] = useState<WordEntry[]>(() => shuffleArray(unlearnedEntries(words)));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const entry = index < deck.length ? deck[index] : null;
  const finished = deck.length > 0 && index >= deck.length;

  function advance(markLearned: boolean): void {
    if (entry && markLearned) {
      void backgroundApi.setWordLearned(entry.original, true);
    }
    setRevealed(false);
    setIndex(index + 1);
  }

  return (
    <ModalOverlay dialogClassName="wh-review-dialog" onClose={onClose}>
      <ModalHeader
        title="מצב חזרה"
        onClose={onClose}
        trailing={
          <span className="wh-review-progress">
            {entry ? `${index + 1} / ${deck.length}` : ''}
          </span>
        }
      />

      <div className="wh-review-body">
        {deck.length === 0 && (
          <div className="wh-review-empty">
            אין מילים ללימוד כרגע. כל המילים שלך מסומנות כנלמדות, או שאין מילים שמורות.
          </div>
        )}

        {finished && (
          <div className="wh-review-empty">
            סיימת לעבור על כל המילים! 🎉
            <br />
            סגור ופתח שוב כדי להתחיל סבב חדש.
          </div>
        )}

        {entry && (
          <div className="wh-review-card-wrap">
            <div
              className={revealed ? 'wh-review-card wh-review-card-revealed' : 'wh-review-card'}
              onClick={() => setRevealed(true)}
            >
              <div className="wh-review-word-row">
                <div className="wh-review-word">{entry.original}</div>
                <button
                  className="wh-review-speak-btn"
                  title="השמע הגייה"
                  onClick={(e) => {
                    e.stopPropagation();
                    speakText(entry.original, 'en-US');
                  }}
                >
                  🔊
                </button>
              </div>
              {revealed && <div className="wh-review-translation">{entry.translation}</div>}
              <div className="wh-review-hint">לחץ על הכרטיס לחשיפת התרגום</div>
            </div>

            <div className="wh-review-actions">
              {revealed && (
                <>
                  <button className="wh-review-know-btn" onClick={() => advance(true)}>
                    ✓ ידעתי
                  </button>
                  <button className="wh-review-dont-know-btn" onClick={() => advance(false)}>
                    ✗ לא ידעתי
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
