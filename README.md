# Words Translation Extension

A Chrome extension for learning English: double-click any word on a website or in a PDF to get an instant Hebrew translation and save it to your word list. Saved words are automatically highlighted everywhere they appear.

## Features

- **Click to translate & highlight** — double-click a word (or single-click an already-highlighted one) for an instant translation via Google Translate.
- **Full PDF support** — a standalone [pdf.js](https://github.com/mozilla/pdf.js)-based viewer with a precise word layer (per-word, not per-line), including proportional-font support.
- **Advanced dictionary** — bidirectional lookup (English ↔ Hebrew) with multiple translation candidates and text-to-speech.
- **Flashcard review mode** — active practice on unlearned words, shuffled each round.
- **View tracking** — counts how many times each saved word was actually seen on screen (not just present on the page) while you browse.
- **Right-click to add** — select any text (including multi-word phrases) and add it to your dictionary from the context menu.
- **PDF export** — your word list as a formatted table (Word / Translation / Status) with an embedded Hebrew font.
- **Automatic backup** — the list is mirrored to `chrome.storage.sync`, so it survives uninstalling/reinstalling the extension (as long as you're signed into the same Google account).

## Installation (developer mode)

1. Go to `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select this folder.

## Project structure

```
background.js           - service worker (composition root — wiring only)
content.js              - thin classic-script loader that dynamically imports contentEntry.js
popup.html/js/css       - the popup UI (composition root)
pdf-viewer.html/js/css  - the standalone PDF viewer (composition root)

src/
  shared/               - layer shared by every context (background / content / popup / viewer):
    backgroundApi.js    -   the message protocol in one place: MSG constants + a typed client per message
    words.js            -   single source of truth for "what is a word" (regexes) + learned-word filtering
    dom.js              -   shared class/id constants (highlight, pdf-word, tooltip) + isEditable/byId
  background/           - service-worker side: message router (handler map) + tab broadcast
  storage/              - chrome.storage.local + sync layer (including sharded backup)
  translation/          - Google Translate calls
  highlighting/         - word matching, highlighting on regular pages/PDFs, view tracking
  ui/                   - each UI piece as its own module/class (tooltip, dialogs, word list)
  pdf-viewer/           - PDF page rendering (PdfRenderer), word layer, toolbar/navigation (ViewerController)
  audio/                - shared text-to-speech (Web Speech API)
  dev/                  - auto-reload mechanism for development

scripts/
  generate-dev-watch-list.js  - regenerates the file list the dev-reload watcher tracks
```

## Architecture notes

- **Real ES modules** everywhere possible (`background.js`, `popup.js`, `pdf-viewer.js`) — no build step.
- **The one exception:** Manifest V3 does not allow content scripts declared in the manifest to use static `import`/`export`. The workaround: `content.js` is a thin classic-script loader that uses dynamic `import()` to load `src/ui/contentEntry.js` (a real ES module).
- **No React/Tailwind** — both require a build step (JSX transpilation / Tailwind CLI) that would break the principle of running directly in the browser with no tooling.

## Development

After adding/removing/renaming a module file, run:

```bash
node scripts/generate-dev-watch-list.js
```

This updates `src/dev/devReload.js` to track all relevant files. Then reload the extension once in `chrome://extensions` (only needed when `background.js`/`manifest.json` changed) — any other change is pushed automatically into open tabs within about a second.

## Credits

- [pdf.js](https://github.com/mozilla/pdf.js) (Mozilla, Apache-2.0) — PDF rendering.
- [jsPDF](https://github.com/parallax/jsPDF) (MIT) — word-list PDF export.
- [Noto Sans Hebrew](https://fonts.google.com/noto/specimen/Noto+Sans+Hebrew) (OFL) — Hebrew font embedded in the export.
- Translation uses Google Translate's unofficial public endpoint (no API key). It is undocumented and may change or be blocked without notice — intended for personal/educational use.

## License

[MIT](LICENSE)
