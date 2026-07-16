// Renders the searchable/sortable/filterable list of saved words in the
// popup, and owns the delete/mark-learned actions per row.

import * as backgroundApi from '../shared/backgroundApi.js';

const SORT_COMPARATORS = {
  'date-desc': (a, b) => b.addedAt - a.addedAt,
  'date-asc': (a, b) => a.addedAt - b.addedAt,
  'alpha-asc': (a, b) => a.original.localeCompare(b.original),
  'alpha-desc': (a, b) => b.original.localeCompare(a.original),
  'views-desc': (a, b) => (b.viewCount || 0) - (a.viewCount || 0)
};

export class WordListView {
  constructor(elements, { getAllWords, onWordsChanged }) {
    this.el = elements;
    this.getAllWords = getAllWords;
    this.onWordsChanged = onWordsChanged;

    this.searchQuery = '';
    this.sortMode = 'date-desc';
    this.filterUnlearnedOnly = false;

    this.el.searchInput.addEventListener('input', () => {
      this.searchQuery = this.el.searchInput.value;
      this.render();
    });
    this.el.sortSelect.addEventListener('change', () => {
      this.sortMode = this.el.sortSelect.value;
      this.render();
    });
    this.el.filterUnlearnedCheckbox.addEventListener('change', () => {
      this.filterUnlearnedOnly = this.el.filterUnlearnedCheckbox.checked;
      this.render();
    });
  }

  render() {
    const allWords = this.getAllWords();
    const allEntries = Object.values(allWords);
    const learnedCount = allEntries.filter(e => e.learned).length;

    this.el.countEl.textContent = String(allEntries.length);
    this.el.statsEl.textContent = allEntries.length
      ? `${allEntries.length} מילים, ${learnedCount} נלמדו`
      : '';
    this.el.listEl.innerHTML = '';

    if (allEntries.length === 0) {
      this.el.emptyEl.hidden = false;
      this.el.noResultsEl.hidden = true;
      return;
    }
    this.el.emptyEl.hidden = true;

    const query = this.searchQuery.trim().toLowerCase();
    let entries = query
      ? allEntries.filter(e =>
          e.original.toLowerCase().includes(query) ||
          e.translation.includes(query))
      : allEntries.slice();

    if (this.filterUnlearnedOnly) {
      entries = entries.filter(e => !e.learned);
    }

    const comparator = SORT_COMPARATORS[this.sortMode] || SORT_COMPARATORS['date-desc'];
    entries.sort((a, b) => {
      if (Boolean(a.learned) !== Boolean(b.learned)) {
        return a.learned ? 1 : -1;
      }
      return comparator(a, b);
    });

    if (entries.length === 0) {
      this.el.noResultsEl.hidden = false;
      return;
    }
    this.el.noResultsEl.hidden = true;

    for (const entry of entries) {
      this.el.listEl.appendChild(this._buildRow(entry));
    }
  }

  _buildRow(entry) {
    const li = document.createElement('li');
    li.className = 'wh-item';
    if (entry.learned) li.classList.add('wh-item-learned');

    const textWrap = document.createElement('div');
    textWrap.className = 'wh-item-text';

    const wordEl = document.createElement('span');
    wordEl.className = 'wh-item-word';
    wordEl.textContent = entry.original;

    const translationEl = document.createElement('span');
    translationEl.className = 'wh-item-translation';
    translationEl.textContent = entry.translation;

    textWrap.appendChild(wordEl);
    textWrap.appendChild(translationEl);
    if (entry.learned) {
      const badge = document.createElement('span');
      badge.className = 'wh-item-badge';
      badge.textContent = 'נלמד';
      textWrap.appendChild(badge);
    }
    if (entry.viewCount > 0) {
      const viewsBadge = document.createElement('span');
      viewsBadge.className = 'wh-item-views';
      viewsBadge.textContent = `נצפתה ${entry.viewCount} פעמים`;
      textWrap.appendChild(viewsBadge);
    }

    const learnedBtn = document.createElement('button');
    learnedBtn.className = 'wh-item-learned-btn';
    learnedBtn.textContent = entry.learned ? '↺ החזר לסימון' : '✓ אני יודע את זה';
    learnedBtn.title = entry.learned ? 'סמן שוב כמילה ללימוד' : 'סמן כנלמד (יפסיק להיות מסומן בכתום)';
    learnedBtn.addEventListener('click', async () => {
      await backgroundApi.setWordLearned(entry.original, !entry.learned);
      this.onWordsChanged();
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'wh-item-delete';
    deleteBtn.textContent = '✕';
    deleteBtn.title = 'הסר';
    deleteBtn.addEventListener('click', async () => {
      await backgroundApi.removeWord(entry.original);
      this.onWordsChanged();
    });

    const actionsWrap = document.createElement('div');
    actionsWrap.className = 'wh-item-actions';
    actionsWrap.appendChild(learnedBtn);
    actionsWrap.appendChild(deleteBtn);

    li.appendChild(textWrap);
    li.appendChild(actionsWrap);
    return li;
  }
}
