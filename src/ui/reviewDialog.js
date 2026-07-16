// The "שינון מילים" flashcard modal: cycles through unlearned words one at
// a time, hides the translation until clicked, and lets you mark a word
// learned or skip it for next time.

import { Modal } from './Modal.js';
import { speakText } from '../audio/speech.js';
import { unlearnedEntries } from '../shared/words.js';
import * as backgroundApi from '../shared/backgroundApi.js';

function shuffleArray(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export class ReviewDialog extends Modal {
  constructor(elements, { getAllWords, onWordsChanged }) {
    super(elements);
    this.getAllWords = getAllWords;
    this.onWordsChanged = onWordsChanged;

    this.deck = [];
    this.index = 0;
    this.revealed = false;

    this.el.cardEl.addEventListener('click', () => this._reveal());
    this.el.knowBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._advance(true);
    });
    this.el.dontKnowBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._advance(false);
    });
    this.el.speakBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const entry = this.deck[this.index];
      if (entry) speakText(entry.original, 'en-US');
    });
  }

  onOpen() {
    this.deck = shuffleArray(unlearnedEntries(this.getAllWords()));
    this.index = 0;

    if (this.deck.length === 0) {
      this.el.cardWrapEl.hidden = true;
      this.el.emptyEl.hidden = false;
      this.el.emptyEl.textContent = 'אין מילים ללימוד כרגע. כל המילים שלך מסומנות כנלמדות, או שאין מילים שמורות.';
      this.el.progressEl.textContent = '';
      return;
    }

    this.el.emptyEl.hidden = true;
    this.el.cardWrapEl.hidden = false;
    this._showCard();
  }

  _updateProgress() {
    this.el.progressEl.textContent = this.deck.length
      ? `${this.index + 1} / ${this.deck.length}`
      : '';
  }

  _showCard() {
    if (this.index >= this.deck.length) {
      this.el.cardWrapEl.hidden = true;
      this.el.emptyEl.hidden = false;
      this.el.emptyEl.innerHTML = 'סיימת לעבור על כל המילים! 🎉<br />סגור ופתח שוב כדי להתחיל סבב חדש.';
      this.el.progressEl.textContent = '';
      return;
    }

    this.revealed = false;
    const entry = this.deck[this.index];
    this.el.wordEl.textContent = entry.original;
    this.el.translationEl.textContent = entry.translation;
    this.el.translationEl.hidden = true;
    this.el.knowBtn.hidden = true;
    this.el.dontKnowBtn.hidden = true;
    this.el.cardEl.classList.remove('wh-review-card-revealed');
    this._updateProgress();
  }

  _reveal() {
    if (this.revealed || this.index >= this.deck.length) return;
    this.revealed = true;
    this.el.translationEl.hidden = false;
    this.el.knowBtn.hidden = false;
    this.el.dontKnowBtn.hidden = false;
    this.el.cardEl.classList.add('wh-review-card-revealed');
  }

  async _advance(markLearned) {
    const entry = this.deck[this.index];
    if (entry && markLearned) {
      await backgroundApi.setWordLearned(entry.original, true);
      await this.onWordsChanged();
    }
    this.index++;
    this._showCard();
  }
}
