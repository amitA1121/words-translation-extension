// Builds one absolutely-positioned <span class="wh-pdf-word"> per WORD
// directly from pdf.js's raw glyph-run data (item.transform/width from
// getTextContent()), rather than relying on pdf.js's own renderTextLayer()
// grouping (which batches characters by style/position, not by word — that
// mismatch is what causes highlight-position drift if you try to carve a
// sub-rectangle out of a multi-word span after the fact).

import { createWordScanRegex } from '../shared/words.js';
import { PDF_WORD_CLASS } from '../shared/dom.js';

let measureCanvas = null;
function getMeasureContext() {
  if (!measureCanvas) measureCanvas = document.createElement('canvas');
  return measureCanvas.getContext('2d');
}

// Per-item cumulative-offset measurer. Proportional fonts have different
// widths per character (e.g. "i" vs "m"), so a fixed per-char width
// (totalWidth / charCount) drifts words left/right of their real rendered
// position. pdf.js's own text layer (src/display/text_layer.js) solves the
// same underlying problem — canvas-measured width vs. the PDF's reported
// width — by measuring the whole run with ctx.measureText() and applying a
// single scaleX() correction; we do the equivalent per-substring so each
// word's offset reflects its real proportional-font position.
function makeCharOffsetLookup(str, fontHeight, totalWidthPx) {
  const ctx = getMeasureContext();
  ctx.font = `${fontHeight}px sans-serif`;

  const rawFullWidth = ctx.measureText(str).width;
  // Same correction pdf.js applies: scale canvas-measured widths so they
  // match the PDF's authoritative reported width for this run.
  const scale = rawFullWidth > 0 ? totalWidthPx / rawFullWidth : 1;

  return (charIndex) => ctx.measureText(str.slice(0, charIndex)).width * scale;
}

export function buildWordLayer(pdfjsLib, textContent, viewport, wordLayerDiv) {
  const wordScanRe = createWordScanRegex();
  for (const item of textContent.items) {
    if (!item.str || !item.str.trim()) continue;

    // item.transform is a 6-value matrix [a, b, c, d, e, f]; e/f are the
    // x/y origin in PDF space (bottom-left origin). Combine with the
    // viewport transform to get CSS pixel coordinates (top-left origin).
    const combined = pdfjsLib.Util.transform(viewport.transform, item.transform);
    const fontHeight = Math.hypot(combined[2], combined[3]);
    const originX = combined[4];
    const originY = combined[5] - fontHeight;

    const totalWidth = item.width * viewport.scale;
    const offsetAt = makeCharOffsetLookup(item.str, fontHeight, totalWidth);

    let match;
    wordScanRe.lastIndex = 0;
    while ((match = wordScanRe.exec(item.str)) !== null) {
      const word = match[0];
      const charOffset = match.index;

      const wordX = originX + offsetAt(charOffset);
      const wordWidth = offsetAt(charOffset + word.length) - offsetAt(charOffset);

      const span = document.createElement('span');
      span.className = PDF_WORD_CLASS;
      span.textContent = word;
      span.style.position = 'absolute';
      span.style.left = `${wordX}px`;
      span.style.top = `${originY}px`;
      span.style.width = `${wordWidth}px`;
      span.style.height = `${fontHeight}px`;
      span.style.fontSize = `${fontHeight}px`;
      wordLayerDiv.appendChild(span);
    }
  }
}
