// Declared content script. WXT bundles everything (including the CSS
// import) into a single classic script + manifest css entry — no dynamic
// import loader tricks needed, unlike the pre-build-step version.

import '../assets/content.css';
import { initWordHighlighter } from '../content';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  allFrames: true,
  cssInjectionMode: 'manifest',
  main() {
    initWordHighlighter();
  }
});
