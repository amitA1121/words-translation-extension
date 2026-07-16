// Thin classic-script loader. Manifest V3's declarative content_scripts
// injection always runs classic (non-module) scripts — there's no manifest
// key to opt a content script into ES module syntax the way background
// service workers can. Dynamic import() is legal in classic scripts, so
// this file's only job is to pull in the real, ES-module implementation.
(async () => {
  const entryUrl = chrome.runtime.getURL('src/ui/contentEntry.js');
  await import(entryUrl);
})();
