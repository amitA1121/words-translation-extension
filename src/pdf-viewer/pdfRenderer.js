// Owns the pdf.js document lifecycle: fetching bytes, loading the document,
// rendering pages to canvas + text layer + word layer, and page navigation.

import { buildWordLayer } from './pdfWordLayer.js';

export class PdfRenderer {
  constructor(pdfjsLib, { pagesEl, cmapUrl, standardFontUrl }) {
    this.pdfjsLib = pdfjsLib;
    this.pagesEl = pagesEl;
    this.cmapUrl = cmapUrl;
    this.standardFontUrl = standardFontUrl;

    this.pdfDoc = null;
    this.scale = 1.25;
    this.renderTasks = [];
  }

  async fetchPdfBytes(url) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  }

  async load(url) {
    const data = await this.fetchPdfBytes(url);
    const loadingTask = this.pdfjsLib.getDocument({
      data,
      cMapUrl: this.cmapUrl,
      cMapPacked: true,
      standardFontDataUrl: this.standardFontUrl
    });
    this.pdfDoc = await loadingTask.promise;
    return this.pdfDoc;
  }

  get numPages() {
    return this.pdfDoc ? this.pdfDoc.numPages : 0;
  }

  setScale(scale) {
    this.scale = scale;
  }

  async renderPage(pageNum) {
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
    const ctx = canvas.getContext('2d');
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
    const textLayerTask = this.pdfjsLib.renderTextLayer({
      textContentSource: textContent,
      container: textLayerDiv,
      viewport
    });
    await textLayerTask.promise;

    // Our own per-word layer, used only for click/highlight targeting.
    buildWordLayer(this.pdfjsLib, textContent, viewport, wordLayerDiv);
  }

  async renderAllPages() {
    this.pagesEl.innerHTML = '';
    this.renderTasks.forEach(t => { try { t.cancel(); } catch (e) {} });
    this.renderTasks = [];

    for (let i = 1; i <= this.numPages; i++) {
      await this.renderPage(i);
    }
  }
}
