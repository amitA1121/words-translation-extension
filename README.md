# Words Translation Extension

Chrome extension for learning English — double-click any word to get an instant Hebrew translation, and see your saved words highlighted on every page and PDF.

![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![WXT](https://img.shields.io/badge/WXT-Manifest_V3-67d55e)
![Vitest](https://img.shields.io/badge/tested_with-Vitest-6da13f?logo=vitest&logoColor=white)
![License: MIT](https://img.shields.io/badge/license-MIT-blue)

## Features

- 🖱️ **Click to translate** — double-click any word for an instant translation and one-click save
- ✨ **Auto-highlight** — saved words are marked everywhere they appear, on every site and PDF
- 📕 **Built-in PDF viewer** — pdf.js-based, with precise per-word highlighting
- 📚 **Dictionary** — English ↔ Hebrew lookup with multiple candidates and text-to-speech
- 🎴 **Flashcards** — practice your unlearned words, shuffled each round
- 👁️ **View tracking** — counts how often each saved word is actually seen on screen
- 💾 **Backups** — automatic Chrome sync, JSON export/import, and PDF export of the list

## Quick start

```bash
npm install
npm run dev     # opens Chrome with the extension + hot reload
npm run build   # production build → .output/chrome-mv3
npm test        # unit tests
```

Manual install: `chrome://extensions` → Developer mode → **Load unpacked** → `.output/chrome-mv3`

## Architecture

```
src/
  entrypoints/   # what the browser loads: background, content script, popup, PDF viewer
  lib/           # shared core: typed messaging, Zod-validated storage, translation, word matching
  content/       # in-page highlighting engine (vanilla TS — no framework shipped to pages)
  pdf/           # pdf.js document rendering + per-word layer
  components/    # React components for the popup UI
  hooks/         # React hooks (words state, PDF tab detection)
```

Notable choices:

- **React only on extension pages** — the content script stays framework-free, so every tab loads a minimal bundle.
- **One typed message protocol** (`lib/messaging.ts`) — the background implements it, the UI consumes it, the compiler keeps both in sync.
- **v1-compatible storage** — word lists from the original vanilla-JS version (tag `v1.0.0-vanilla-js`) survive the upgrade.

## Credits

[pdf.js](https://github.com/mozilla/pdf.js) · [jsPDF](https://github.com/parallax/jsPDF) · [Noto Sans Hebrew](https://fonts.google.com/noto/specimen/Noto+Sans+Hebrew) · [WXT](https://wxt.dev)
Translation via Google Translate's unofficial public endpoint — for personal/educational use.

## License

[MIT](LICENSE)
