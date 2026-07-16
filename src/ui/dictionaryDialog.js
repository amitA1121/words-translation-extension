// The "מילון מתקדם" modal: EN<->HE lookup with language swap, multiple
// translation candidates, text-to-speech, and save-to-list.

import { Modal } from './Modal.js';
import { speakText } from '../audio/speech.js';
import { WORD_RE } from '../shared/words.js';
import * as backgroundApi from '../shared/backgroundApi.js';

const HEBREW_RE = /^[֐-׿'"\s-]+$/;
const LANG_NAMES = { en: 'אנגלית', he: 'עברית' };
const LANG_SPEECH_CODES = { en: 'en-US', he: 'he-IL' };

export class DictionaryDialog extends Modal {
  constructor(elements, { getAllWords, onWordsChanged }) {
    super(elements);
    this.getAllWords = getAllWords;
    this.onWordsChanged = onWordsChanged;

    this.sourceLang = 'en';
    this.targetLang = 'he';
    this.debounceTimer = null;

    this.el.swapBtn.addEventListener('click', () => this._swapLangs());
    this.el.speakBtn.addEventListener('click', () => {
      speakText(this.el.input.value.trim(), LANG_SPEECH_CODES[this.sourceLang]);
    });

    this.el.input.addEventListener('input', () => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this._lookup(), 400);
    });
    this.el.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this._lookup();
      }
    });
  }

  onOpen() {
    this.el.results.innerHTML = '';
    this.el.input.value = '';
    this._updateLangButtons();
    this.el.input.focus();
  }

  onClose() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  _updateLangButtons() {
    this.el.langFromBtn.textContent = LANG_NAMES[this.sourceLang];
    this.el.langToBtn.textContent = LANG_NAMES[this.targetLang];
    this.el.input.placeholder = this.sourceLang === 'en' ? 'הקלד מילה באנגלית...' : 'הקלד מילה בעברית...';
    this.el.input.dir = this.sourceLang === 'en' ? 'ltr' : 'rtl';
  }

  _swapLangs() {
    [this.sourceLang, this.targetLang] = [this.targetLang, this.sourceLang];
    this._updateLangButtons();
    this.el.input.value = '';
    this.el.results.innerHTML = '';
  }

  _renderResults(word, translations, err) {
    this.el.results.innerHTML = '';

    if (err) {
      const errEl = document.createElement('div');
      errEl.className = 'wh-dict-error';
      errEl.textContent = err;
      this.el.results.appendChild(errEl);
      return;
    }

    if (!translations || translations.length === 0) return;

    // Saving only makes sense for EN->HE (that's the schema/highlight logic
    // savedWords expects); other directions show translations read-only.
    const canSave = this.sourceLang === 'en' && this.targetLang === 'he';
    const key = word.toLowerCase();
    const isSaved = Boolean(this.getAllWords()[key]);

    for (const translation of translations) {
      const row = document.createElement('div');
      row.className = 'wh-dict-result-row';

      const text = document.createElement('span');
      text.className = 'wh-dict-result-text';
      text.textContent = translation;
      row.appendChild(text);

      if (canSave) {
        const addBtn = document.createElement('button');
        addBtn.className = 'wh-dict-add-btn';
        addBtn.textContent = isSaved ? 'ברשימה' : 'הוסף';
        addBtn.disabled = isSaved;
        addBtn.addEventListener('click', async () => {
          addBtn.disabled = true;
          await backgroundApi.saveWord(word, translation);
          await this.onWordsChanged();
          this._renderResults(word, translations);
        });
        row.appendChild(addBtn);
      }

      this.el.results.appendChild(row);
    }
  }

  async _lookup() {
    const word = this.el.input.value.trim();
    this.el.results.innerHTML = '';
    if (!word) return;

    const validator = this.sourceLang === 'en' ? WORD_RE : HEBREW_RE;
    if (!validator.test(word)) {
      this._renderResults(word, null, `נא להקליד מילה ב${LANG_NAMES[this.sourceLang]}`);
      return;
    }

    const loading = document.createElement('div');
    loading.className = 'wh-dict-loading';
    loading.textContent = 'מתרגם...';
    this.el.results.appendChild(loading);

    const translations = await backgroundApi.translateMulti(word, this.sourceLang, this.targetLang);

    if (this.el.input.value.trim() !== word) return; // input changed while awaiting

    if (translations == null) {
      this._renderResults(word, null, 'שגיאה בתרגום');
      return;
    }

    this._renderResults(word, translations);
  }
}
