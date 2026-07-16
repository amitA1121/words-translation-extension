// The PDF viewer page: React owns the toolbar state (page, zoom, status)
// while PdfRenderer does the imperative pdf.js work inside a ref'd
// container — the standard React escape hatch for canvas-heavy libraries.

import { useEffect, useRef, useState } from 'react';
import { PdfRenderer } from '../../pdf/pdfRenderer';

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;

function getPdfUrlFromQuery(): string | null {
  const file = new URLSearchParams(window.location.search).get('file');
  return file ? decodeURIComponent(file) : null;
}

function filenameFromUrl(url: string): string {
  return decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? '');
}

export function ViewerApp() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<PdfRenderer | null>(null);

  const [status, setStatus] = useState('');
  const [filename, setFilename] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.25);

  useEffect(() => {
    const url = getPdfUrlFromQuery();
    if (!url) {
      setStatus('לא צוין קובץ PDF');
      return;
    }
    setFilename(filenameFromUrl(url));

    const renderer = new PdfRenderer(pagesRef.current!);
    rendererRef.current = renderer;
    setStatus('טוען...');

    void renderer
      .load(url)
      .then(async () => {
        setNumPages(renderer.numPages);
        setCurrentPage(1);
        await renderer.renderAllPages();
        setStatus('');
      })
      .catch((err: unknown) => {
        setStatus(`שגיאה בטעינת הקובץ: ${err instanceof Error ? err.message : String(err)}`);
      });

    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  function scrollToPage(pageNum: number): void {
    pagesRef.current
      ?.querySelector(`.pv-page[data-page-number="${pageNum}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function zoomBy(delta: number): Promise<void> {
    const renderer = rendererRef.current;
    if (!renderer?.pdfDoc) return;
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, renderer.scale + delta));
    renderer.setScale(next);
    setScale(next);
    await renderer.renderAllPages();
  }

  // The "current page" is whichever page sits closest to the upper third of
  // the container — feels right for both short and taller-than-viewport pages.
  function updateCurrentPageFromScroll(): void {
    const container = containerRef.current;
    const pages = pagesRef.current?.querySelectorAll<HTMLElement>('.pv-page');
    if (!container || !pages?.length) return;

    const containerRect = container.getBoundingClientRect();
    const anchor = containerRect.top + containerRect.height / 3;

    let closest: HTMLElement | null = null;
    let closestDist = Infinity;
    for (const page of pages) {
      const dist = Math.abs(page.getBoundingClientRect().top - anchor);
      if (dist < closestDist) {
        closestDist = dist;
        closest = page;
      }
    }
    if (closest) {
      setCurrentPage(Number(closest.dataset.pageNumber));
    }
  }

  return (
    <>
      <div id="pv-toolbar">
        <button
          id="pv-prev"
          title="עמוד קודם"
          onClick={() => currentPage > 1 && scrollToPage(currentPage - 1)}
        >
          ‹
        </button>
        <span id="pv-page-info">{numPages > 0 ? `${currentPage} / ${numPages}` : '- / -'}</span>
        <button
          id="pv-next"
          title="עמוד הבא"
          onClick={() => currentPage < numPages && scrollToPage(currentPage + 1)}
        >
          ›
        </button>
        <span className="pv-sep" />
        <button id="pv-zoom-out" title="הקטן" onClick={() => void zoomBy(-ZOOM_STEP)}>
          −
        </button>
        <span id="pv-zoom-level">{Math.round(scale * 100)}%</span>
        <button id="pv-zoom-in" title="הגדל" onClick={() => void zoomBy(ZOOM_STEP)}>
          +
        </button>
        <span className="pv-sep" />
        <span id="pv-filename">{filename}</span>
        <span id="pv-status">{status}</span>
      </div>
      <div id="pv-container" ref={containerRef} onScroll={updateCurrentPageFromScroll}>
        <div id="pv-pages" ref={pagesRef} />
      </div>
    </>
  );
}
