// Dev-mode auto-reload: watches this extension's own files and, on any
// change, reloads the extension AND re-injects content.js/content.css into
// every already-open http(s) tab, so you don't have to manually refresh
// chrome://extensions or the page you're testing in.

const DEV_WATCH_FILES = [
  'background.js',
  'content.js',
  'content.css',
  'popup.html',
  'popup.js',
  'popup.css',
  'pdf-viewer.html',
  'pdf-viewer.js',
  'pdf-viewer.css',
  'manifest.json',
  'src/audio/speech.js',
  'src/background/messaging.js',
  'src/dev/devReload.js',
  'src/highlighting/pageHighlighter.js',
  'src/highlighting/pdfWordHighlighter.js',
  'src/highlighting/viewTracker.js',
  'src/highlighting/wordMatcher.js',
  'src/pdf-viewer/pdfRenderer.js',
  'src/pdf-viewer/pdfWordLayer.js',
  'src/pdf-viewer/viewerController.js',
  'src/shared/backgroundApi.js',
  'src/shared/dom.js',
  'src/shared/words.js',
  'src/storage/wordStorage.js',
  'src/translation/translationService.js',
  'src/ui/Modal.js',
  'src/ui/contentEntry.js',
  'src/ui/contextMenu.js',
  'src/ui/dictionaryDialog.js',
  'src/ui/pdfExport.js',
  'src/ui/pdfOpenButton.js',
  'src/ui/reviewDialog.js',
  'src/ui/tooltip.js',
  'src/ui/wordListView.js'
];
const DEV_POLL_MS = 1000;
const DEV_FULL_RELOAD_FILES = new Set(['background.js', 'manifest.json']);

let devFileHashes = null;

async function hashText(text) {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function snapshotDevFiles() {
  const hashes = {};
  await Promise.all(DEV_WATCH_FILES.map(async (file) => {
    try {
      const res = await fetch(chrome.runtime.getURL(file), { cache: 'no-store' });
      const text = await res.text();
      hashes[file] = await hashText(text);
    } catch {
      hashes[file] = null;
    }
  }));
  return hashes;
}

async function reinjectContentScriptEverywhere() {
  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
  await Promise.all(tabs.map(async (tab) => {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ['content.js']
      });
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id, allFrames: true },
        files: ['content.css']
      });
    } catch {
      // Tab may not allow injection (chrome:// pages, etc.) — skip silently.
    }
  }));
}

async function devReloadTick() {
  const current = await snapshotDevFiles();
  if (!devFileHashes) {
    devFileHashes = current;
    return;
  }
  const changedFiles = DEV_WATCH_FILES.filter(f => current[f] !== devFileHashes[f]);
  if (changedFiles.length === 0) return;

  devFileHashes = current;

  const needsFullReload = changedFiles.some(f => DEV_FULL_RELOAD_FILES.has(f));
  if (needsFullReload) {
    // background.js/manifest.json changes (new permissions, new listeners,
    // etc.) require reloading the whole extension — this also re-registers
    // the declarative content_scripts, so open tabs get the new content.js
    // the next time they navigate, but not retroactively. Re-inject first
    // for immediate feedback in already-open tabs, then reload.
    await reinjectContentScriptEverywhere();
    setTimeout(() => chrome.runtime.reload(), 150);
  } else {
    // content.js/content.css/popup/pdf-viewer/src module changes — no
    // extension reload needed, just push updated files into open tabs now.
    await reinjectContentScriptEverywhere();
  }
}

export function startDevReloadWatcher() {
  setInterval(() => {
    devReloadTick().catch(() => {});
  }, DEV_POLL_MS);
  devReloadTick().catch(() => {});
}
