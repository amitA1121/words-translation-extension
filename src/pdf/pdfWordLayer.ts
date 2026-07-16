// Builds one absolutely-positioned <span class="wh-pdf-word"> per WORD
// directly from pdf.js's raw glyph-run data (item.transform/width from
// getTextContent()), rather than relying on pdf.js's own text layer
// grouping (which batches characters by style/position, not by word — that
// mismatch is what causes highlight-position drift if you try to carve a
// sub-rectangle out of a multi-word span after the fact).

import { Util } from 'pdfjs-dist';
import { PDF_WORD_CLASS } from '../lib/dom';
import { createWordScanRegex } from '../lib/words';

// Structural types for what we actually consume from pdf.js, so this module
// doesn't depend on pdfjs-dist's deep internal type paths. getTextContent()
// items mix glyph runs with marked-content markers — the guard keeps only
// the runs that actually carry text and geometry.
export interface TextContentLike {
  items: readonly unknown[];
}

export interface ViewportLike {
  transform: number[];
  scale: number;
}

interface GlyphRun {
  str: string;
  transform: number[];
  width: number;
}

function isGlyphRun(item: unknown): item is GlyphRun {
  const run = item as Partial<GlyphRun> | null;
  return (
    typeof run === 'object' &&
    run !== null &&
    typeof run.str === 'string' &&
    Array.isArray(run.transform) &&
    typeof run.width === 'number'
  );
}

let measureCanvas: HTMLCanvasElement | null = null;
function getMeasureContext(): CanvasRenderingContext2D {
  measureCanvas ??= document.createElement('canvas');
  return measureCanvas.getContext('2d')!;
}

// Per-item cumulative-offset measurer. Proportional fonts have different
// widths per character (e.g. "i" vs "m"), so a fixed per-char width
// (totalWidth / charCount) drifts words left/right of their real rendered
// position. pdf.js's own text layer solves the same underlying problem —
// canvas-measured width vs. the PDF's reported width — by measuring the
// whole run and applying a single scale correction; we do the equivalent
// per-substring so each word's offset reflects its real position.
function makeCharOffsetLookup(
  str: string,
  fontHeight: number,
  totalWidthPx: number
): (charIndex: number) => number {
  const ctx = getMeasureContext();
  ctx.font = `${fontHeight}px sans-serif`;

  const rawFullWidth = ctx.measureText(str).width;
  // Same correction pdf.js applies: scale canvas-measured widths so they
  // match the PDF's authoritative reported width for this run.
  const scale = rawFullWidth > 0 ? totalWidthPx / rawFullWidth : 1;

  return (charIndex) => ctx.measureText(str.slice(0, charIndex)).width * scale;
}

export function buildWordLayer(
  textContent: TextContentLike,
  viewport: ViewportLike,
  wordLayerDiv: HTMLElement
): void {
  const wordScanRe = createWordScanRegex();

  for (const item of textContent.items) {
    if (!isGlyphRun(item) || !item.str.trim()) continue;

    // item.transform is a 6-value matrix [a, b, c, d, e, f]; e/f are the
    // x/y origin in PDF space (bottom-left origin). Combine with the
    // viewport transform to get CSS pixel coordinates (top-left origin).
    const combined = Util.transform(viewport.transform, item.transform);
    const fontHeight = Math.hypot(combined[2], combined[3]);
    const originX = combined[4];
    const originY = combined[5] - fontHeight;

    const totalWidth = item.width * viewport.scale;
    const offsetAt = makeCharOffsetLookup(item.str, fontHeight, totalWidth);

    let match: RegExpExecArray | null;
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
