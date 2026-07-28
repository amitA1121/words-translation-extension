// The chrome.storage keys, kept in their own dependency-free module.
//
// The popup only needs to know *which* key to watch for changes; the
// reading/writing/validating lives in storage.ts. Keeping the key here
// means the UI doesn't statically import that implementation (and with it
// Zod and the sync-sharding code) just to learn a string — which would put
// all of it on the popup's startup path.
//
// These names are a compatibility contract with existing installations:
// renaming one orphans the user's saved words.

export const WORDS_STORAGE_KEY = 'savedWords';