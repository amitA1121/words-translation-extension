import { z } from 'zod';

// The persisted schema for a saved word. Zod validates data coming back
// from chrome.storage.sync during restore (it may be from an older version
// of the extension, or partially corrupted) — defaults keep old entries
// forward-compatible.
export const WordEntrySchema = z.object({
  original: z.string(),
  translation: z.string(),
  addedAt: z.number(),
  learned: z.boolean().default(false),
  viewCount: z.number().default(0)
});

export type WordEntry = z.infer<typeof WordEntrySchema>;

export const SavedWordsSchema = z.record(z.string(), WordEntrySchema);

/** Map of lowercase word key -> entry. */
export type SavedWords = z.infer<typeof SavedWordsSchema>;

export type Lang = 'en' | 'he';
