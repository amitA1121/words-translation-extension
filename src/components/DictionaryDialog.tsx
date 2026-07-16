// The "מילון מתקדם" modal: EN<->HE lookup with language swap, multiple
// translation candidates, text-to-speech, and save-to-list.
//
// Lookup triggering matches the original behavior exactly: debounced
// 400ms after the last keystroke, and Enter cancels the debounce and
// looks up immediately.

import { useEffect, useRef, useState } from 'react';
import { backgroundApi } from '../lib/messaging';
import { speakText } from '../lib/speech';
import { WORD_RE } from '../lib/words';
import type { Lang, SavedWords } from '../lib/types';
import { ModalHeader, ModalOverlay } from './ModalOverlay';

const HEBREW_RE = /^[֐-׿'"\s-]+$/;
const LANG_NAMES: Record<Lang, string> = { en: 'אנגלית', he: 'עברית' };
const LANG_SPEECH_CODES = { en: 'en-US', he: 'he-IL' } as const;
const LOOKUP_DEBOUNCE_MS = 400;

type LookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'done'; word: string; translations: string[] };

interface DictionaryDialogProps {
  words: SavedWords;
  onClose: () => void;
}

export function DictionaryDialog({ words, onClose }: DictionaryDialogProps) {
  const [sourceLang, setSourceLang] = useState<Lang>('en');
  const [input, setInput] = useState('');
  const [lookup, setLookup] = useState<LookupState>({ status: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const targetLang: Lang = sourceLang === 'en' ? 'he' : 'en';

  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function cancelPendingLookup(): void {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    requestIdRef.current++; // any in-flight response becomes stale
  }

  function runLookup(word: string): void {
    if (!word) {
      setLookup({ status: 'idle' });
      return;
    }
    const validator = sourceLang === 'en' ? WORD_RE : HEBREW_RE;
    if (!validator.test(word)) {
      setLookup({ status: 'error', message: `נא להקליד מילה ב${LANG_NAMES[sourceLang]}` });
      return;
    }

    const requestId = ++requestIdRef.current;
    setLookup({ status: 'loading' });
    void backgroundApi.translateMulti(word, sourceLang, targetLang).then((translations) => {
      if (requestIdRef.current !== requestId) return; // input changed while awaiting
      setLookup(
        translations
          ? { status: 'done', word, translations }
          : { status: 'error', message: 'שגיאה בתרגום' }
      );
    });
  }

  function onInputChange(value: string): void {
    setInput(value);
    cancelPendingLookup();
    const word = value.trim();
    if (!word) {
      setLookup({ status: 'idle' });
      return;
    }
    debounceRef.current = setTimeout(() => runLookup(word), LOOKUP_DEBOUNCE_MS);
  }

  function onInputKeyDown(e: React.KeyboardEvent): void {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    cancelPendingLookup();
    runLookup(input.trim());
  }

  function swapLangs(): void {
    cancelPendingLookup();
    setSourceLang(targetLang);
    setInput('');
    setLookup({ status: 'idle' });
  }

  // Saving only makes sense for EN->HE (that's the schema/highlight logic
  // savedWords expects); other directions show translations read-only.
  const canSave = sourceLang === 'en';

  return (
    <ModalOverlay dialogClassName="wh-dict-dialog" onClose={onClose}>
      <ModalHeader title="מילון מתקדם" onClose={onClose} />

      <div className="wh-dict-lang-row">
        <button className="wh-dict-lang-btn">{LANG_NAMES[sourceLang]}</button>
        <button className="wh-dict-swap-btn" title="החלף כיוון" onClick={swapLangs}>
          ⇄
        </button>
        <button className="wh-dict-lang-btn">{LANG_NAMES[targetLang]}</button>
      </div>

      <div className="wh-dict-input-row">
        <input
          ref={inputRef}
          id="wh-dict-input"
          className="wh-dict-input"
          type="text"
          dir={sourceLang === 'en' ? 'ltr' : 'rtl'}
          placeholder={sourceLang === 'en' ? 'הקלד מילה באנגלית...' : 'הקלד מילה בעברית...'}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onInputKeyDown}
        />
        <button
          className="wh-dict-speak-btn"
          title="השמע הגייה"
          onClick={() => speakText(input.trim(), LANG_SPEECH_CODES[sourceLang])}
        >
          🔊
        </button>
      </div>

      <div id="wh-dict-results" className="wh-dict-results">
        {lookup.status === 'loading' && <div className="wh-dict-loading">מתרגם...</div>}
        {lookup.status === 'error' && <div className="wh-dict-error">{lookup.message}</div>}
        {lookup.status === 'done' &&
          lookup.translations.map((translation) => {
            const isSaved = Boolean(words[lookup.word.toLowerCase()]);
            return (
              <div className="wh-dict-result-row" key={translation}>
                <span className="wh-dict-result-text">{translation}</span>
                {canSave && (
                  <button
                    className="wh-dict-add-btn"
                    disabled={isSaved}
                    onClick={() => void backgroundApi.saveWord(lookup.word, translation)}
                  >
                    {isSaved ? 'ברשימה' : 'הוסף'}
                  </button>
                )}
              </div>
            );
          })}
      </div>
    </ModalOverlay>
  );
}
