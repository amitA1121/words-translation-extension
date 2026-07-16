// Service-worker composition root: pure wiring, no logic. Each concern
// lives in its own module under src/.

import { restoreWordsFromSyncIfEmpty } from './src/storage/wordStorage.js';
import { registerMessageRouter, registerWordsBroadcast } from './src/background/messaging.js';
import { setupContextMenu } from './src/ui/contextMenu.js';
import { startDevReloadWatcher } from './src/dev/devReload.js';

registerMessageRouter();
registerWordsBroadcast();
setupContextMenu();

restoreWordsFromSyncIfEmpty().catch(() => {});
chrome.runtime.onInstalled.addListener(() => {
  restoreWordsFromSyncIfEmpty().catch(() => {});
});

startDevReloadWatcher();
