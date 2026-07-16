# Words Translation Extension

A Chrome extension for learning English: double-click any word on a website or in a PDF to get an instant Hebrew translation and save it to your word list. Saved words are automatically highlighted everywhere they appear.

Built with **React 19 + TypeScript** on **[WXT](https://wxt.dev)** (Vite-based MV3 framework), with **Zod**-validated storage and **Vitest** unit tests.

## Features

- **Click to translate & highlight** — double-click a word (or single-click an already-highlighted one) for an instant translation via Google Translate.
- **Full PDF support** — a standalone [pdf.js](https://github.com/mozilla/pdf.js)-based viewer with a precise word layer (per-word, not per-line), including proportional-font support.
- **Advanced dictionary** — bidirectional lookup (English ↔ Hebrew) with multiple translation candidates and text-to-speech.
- **Flashcard review mode** — active practice on unlearned words, shuffled each round.
- **View tracking** — counts how many times each saved word was actually seen on screen (not just present on the page) while you browse.
- **Right-click to add** — select any text (including multi-word phrases) and add it to your dictionary from the context menu.
- **PDF export** — your word list as a formatted table (Word / Translation / Status) with an embedded Hebrew font.
- **Automatic backup** — the list is mirrored to `chrome.storage.sync` (sharded under its per-item size caps), so it survives uninstalling/reinstalling the extension.

## Getting started

```bash
npm install        # installs deps, copies pdf.js assets, generates WXT types
npm run dev        # dev mode: opens Chrome with the extension + HMR/auto-reload
npm run build      # production build into .output/chrome-mv3
npm test           # unit tests (Vitest)
npm run compile    # TypeScript typecheck
npm run zip        # distributable zip
```

To load the production build manually: `chrome://extensions` → Developer mode → **Load unpacked** → select `.output/chrome-mv3`.

## Architecture

```
wxt.config.ts             - manifest + build config (WXT generates manifest.json)
public/                   - static assets (icons; pdf.js cmaps/fonts copied on postinstall)

src/
  entrypoints/            - what the browser actually loads; thin composition roots
    background.ts         -   service worker: typed message router, tab broadcast, context menu
    content.ts            -   declared content script (highlighting on every page)
    popup/                -   React popup (word list, dictionary, flashcards, export)
    pdf-viewer/           -   React PDF viewer page (toolbar state in React, pdf.js in a ref)
  lib/                    - shared, mostly-pure core
    types.ts              -   WordEntry/SavedWords schema (Zod) + shared types
    messaging.ts          -   the whole message protocol: typed client + typed router
    words.ts              -   single source of truth for "what is a word" (regexes, filters)
    syncShards.ts         -   pure sync-backup sharding (unit-tested)
    storage.ts            -   chrome.storage.local + sync layer
    translate.ts          -   Google Translate calls
    speech.ts, dom.ts, pdfExport.ts
  content/                - the in-page engine (vanilla TS, no React — see below)
    index.ts              -   feature bundle shared by content script & PDF viewer page
    pageHighlighter.ts    -   wraps saved words in regular page text
    pdfWordHighlighter.ts -   toggles highlights on the viewer's word layer
    tooltip.ts            -   floating translate/save tooltip
    viewTracker.ts        -   IntersectionObserver-based "actually seen" counting
    wordMatcher.ts        -   caret-point word extraction
  pdf/                    - pdf.js integration (document rendering + per-word layer)
  components/, hooks/     - React components & hooks for the popup
```

### Design decisions

- **React for extension pages, vanilla TS for the content script.** The popup and PDF viewer are real UIs and benefit from React. The content script is injected into *every* page, so it stays a small dependency-free bundle — shipping React into every tab would be pure overhead.
- **One typed message protocol.** `lib/messaging.ts` defines request/response types once; the background implements `ProtocolHandlers` and UI code calls `backgroundApi`. The compiler guarantees both sides agree.
- **Storage compatibility.** Storage keys and the sync-shard format are unchanged from v1.x (`v1.0.0-vanilla-js` tag), and restores are Zod-validated, so existing users' word lists survive the upgrade.
- **npm-managed pdf.js/jsPDF** instead of vendored copies; pdf.js data assets (CJK cmaps, standard fonts) are copied from `node_modules` on postinstall so they always match the installed version.

## Credits

- [pdf.js](https://github.com/mozilla/pdf.js) (Mozilla, Apache-2.0) — PDF rendering.
- [jsPDF](https://github.com/parallax/jsPDF) (MIT) — word-list PDF export.
- [Noto Sans Hebrew](https://fonts.google.com/noto/specimen/Noto+Sans+Hebrew) (OFL) — Hebrew font embedded in the export.
- [WXT](https://wxt.dev) (MIT) — web extension framework.
- Translation uses Google Translate's unofficial public endpoint (no API key). It is undocumented and may change or be blocked without notice — intended for personal/educational use.

## License

[MIT](LICENSE)
