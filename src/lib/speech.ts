// Text-to-speech via the browser's built-in SpeechSynthesis API. Shared by
// the tooltip, dictionary dialog, and flashcard review — anywhere the user
// might want to hear a word pronounced.
//
// Two known Chrome quirks this works around:
// 1. speechSynthesis.cancel() is asynchronous; calling speak() immediately
//    after can silently drop the new utterance while the engine is still
//    tearing down the previous one. A short delay avoids the race.
// 2. The SpeechSynthesisUtterance can be garbage-collected mid-speech if
//    nothing keeps a reference to it alive — keeping it in a module-level
//    variable (not just a local) prevents Chrome from silently dropping it.

export type SpeechLang = 'en-US' | 'he-IL';

let currentUtterance: SpeechSynthesisUtterance | null = null;

function trySpeak(text: string, langCode: SpeechLang): void {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = langCode;
  currentUtterance = utter;
  void currentUtterance;
  speechSynthesis.speak(utter);
}

export function speakText(text: string, langCode: SpeechLang = 'en-US'): void {
  if (!text || !('speechSynthesis' in window)) return;

  if (speechSynthesis.speaking || speechSynthesis.pending) {
    speechSynthesis.cancel();
    // cancel() doesn't resolve synchronously — give the engine a beat to
    // actually stop before queuing the next utterance, otherwise it can
    // get silently dropped.
    setTimeout(() => trySpeak(text, langCode), 50);
  } else {
    trySpeak(text, langCode);
  }
}
