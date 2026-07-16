// PDF-viewer composition root: configures pdf.js, resolves DOM elements,
// and hands everything to PdfRenderer (document/page rendering) and
// ViewerController (toolbar, navigation, zoom, status).

import * as pdfjsLib from './pdfjs/build/pdf.mjs';
import { byId } from './src/shared/dom.js';
import { PdfRenderer } from './src/pdf-viewer/pdfRenderer.js';
import { ViewerController } from './src/pdf-viewer/viewerController.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdfjs/build/pdf.worker.mjs');

const renderer = new PdfRenderer(pdfjsLib, {
  pagesEl: byId('pv-pages'),
  cmapUrl: chrome.runtime.getURL('pdfjs/cmaps/'),
  standardFontUrl: chrome.runtime.getURL('pdfjs/standard_fonts/')
});

const controller = new ViewerController(renderer, {
  containerEl: byId('pv-container'),
  pagesEl: byId('pv-pages'),
  pageInfoEl: byId('pv-page-info'),
  zoomLevelEl: byId('pv-zoom-level'),
  statusEl: byId('pv-status'),
  prevBtn: byId('pv-prev'),
  nextBtn: byId('pv-next'),
  zoomInBtn: byId('pv-zoom-in'),
  zoomOutBtn: byId('pv-zoom-out')
});

function getPdfUrlFromQuery() {
  const file = new URLSearchParams(window.location.search).get('file');
  return file ? decodeURIComponent(file) : null;
}

const pdfUrl = getPdfUrlFromQuery();
if (pdfUrl) {
  byId('pv-filename').textContent = decodeURIComponent(pdfUrl.split('/').pop().split('?')[0]);
  controller.load(pdfUrl);
} else {
  controller.setStatus('לא צוין קובץ PDF');
}
