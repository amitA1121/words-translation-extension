// Owns the pdf.js document lifecycle: fetching bytes, loading the document,
// rendering pages to canvas + text layer + word layer.

import { getDocument, GlobalWorkerOptions, TextLayer } from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { browser } from 'wxt/browser';
// Vite emits the worker as an asset and hands us its URL — pdf.js runs its
// parsing/rendering off the main thread.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { buildWordLayer } from './pdfWordLayer';

GlobalWorkerOptions.workerSrc = workerUrl;

interface CancellableTask {
  cancel(): void;
}

export class PdfRenderer {
  pdfDoc: PDFDocumentProxy | null = null;
  scale = 1.25;

  private readonly pagesEl: HTMLElement;
  private renderTasks: CancellableTask[] = [];

  constructor(pagesEl: HTMLElement) {
    this.pagesEl = pagesEl;
  }

  get numPages(): number {
    return this.pdfDoc?.numPages ?? 0;
  }

  setScale(scale: number): void {
    this.scale = scale;
  }

  async load(url: string): Promise<void> {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = new Uint8Array(await res.arrayBuffer());

    // pdf.js wants directory *prefixes*, which WXT's PublicPath union (a
    // list of individual public files) can't express — hence the cast.
    const publicDirUrl = (dir: string) => browser.runtime.getURL(dir as never);
    this.pdfDoc = await getDocument({
      data,
      cMapUrl: publicDirUrl('/pdfjs/cmaps/'),
      cMapPacked: true,
      standardFontDataUrl: publicDirUrl('/pdfjs/standard_fonts/')
    }).promise;
  }

  private async renderPage(pageNum: number): Promise<void> {
    if (!this.pdfDoc) return;
    const page = await this.pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: this.scale });

    const pageWrap = document.createElement('div');
    pageWrap.className = 'pv-page';
    pageWrap.dataset.pageNumber = String(pageNum);
    pageWrap.style.width = `${viewport.width}px`;
    pageWrap.style.height = `${viewport.height}px`;
    pageWrap.style.setProperty('--scale-factor', String(viewport.scale));

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    pageWrap.appendChild(canvas);

    const textLayerDiv = document.createElement('div');
    textLayerDiv.className = 'textLayer';
    pageWrap.appendChild(textLayerDiv);

    const wordLayerDiv = document.createElement('div');
    wordLayerDiv.className = 'wh-pdf-word-layer';
    pageWrap.appendChild(wordLayerDiv);

    this.pagesEl.appendChild(pageWrap);

    const renderTask = page.render({ canvasContext: ctx, viewport });
    this.renderTasks.push(renderTask);
    await renderTask.promise;

    const textContent = await page.getTextContent();

    // Keep pdf.js's own text layer for native selection/copy/Ctrl+F support.
    await new TextLayer({
      textContentSource: textContent,
      container: textLayerDiv,
      viewport
    }).render();

    // Our own per-word layer, used only for click/highlight targeting.
    buildWordLayer(textContent, viewport, wordLayerDiv);
  }

  async renderAllPages(): Promise<void> {
    this.cancelPendingRenders();
    this.pagesEl.innerHTML = '';

    for (let i = 1; i <= this.numPages; i++) {
      await this.renderPage(i);
    }
  }

  private cancelPendingRenders(): void {
    for (const task of this.renderTasks) {
      try {
        task.cancel();
      } catch {
        // Already finished — nothing to cancel.
      }
    }
    this.renderTasks = [];
  }

  destroy(): void {
    this.cancelPendingRenders();
    this.pagesEl.innerHTML = '';
    void this.pdfDoc?.destroy();
    this.pdfDoc = null;
  }
}
