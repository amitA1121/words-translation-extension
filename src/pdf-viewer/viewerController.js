// Owns the viewer chrome around PdfRenderer: toolbar buttons (page
// navigation, zoom), the scroll-position -> current-page tracking, and
// load/error status text. pdf-viewer.js just constructs this with the
// resolved DOM elements.

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;

export class ViewerController {
  /**
   * @param {import('./pdfRenderer.js').PdfRenderer} renderer
   * @param {{ containerEl, pagesEl, pageInfoEl, zoomLevelEl, statusEl,
   *           prevBtn, nextBtn, zoomInBtn, zoomOutBtn }} el
   */
  constructor(renderer, el) {
    this.renderer = renderer;
    this.el = el;
    this.currentPage = 1;

    el.prevBtn.addEventListener('click', () => {
      if (this.currentPage > 1) this._scrollToPage(this.currentPage - 1);
    });
    el.nextBtn.addEventListener('click', () => {
      if (renderer.pdfDoc && this.currentPage < renderer.numPages) {
        this._scrollToPage(this.currentPage + 1);
      }
    });
    el.zoomInBtn.addEventListener('click', () => this._zoomBy(ZOOM_STEP));
    el.zoomOutBtn.addEventListener('click', () => this._zoomBy(-ZOOM_STEP));
    el.containerEl.addEventListener('scroll', () => {
      if (renderer.pdfDoc) this._updatePageInfoFromScroll();
    });
  }

  setStatus(text) {
    this.el.statusEl.textContent = text;
  }

  async load(url) {
    this.setStatus('טוען...');
    try {
      await this.renderer.load(url);
      this._updatePageInfo(1);
      this._updateZoomLevel();
      await this.renderer.renderAllPages();
      this.setStatus('');
    } catch (err) {
      this.setStatus(`שגיאה בטעינת הקובץ: ${err.message}`);
    }
  }

  _updatePageInfo(pageNum) {
    this.currentPage = pageNum;
    this.el.pageInfoEl.textContent = `${pageNum} / ${this.renderer.numPages}`;
  }

  _updateZoomLevel() {
    this.el.zoomLevelEl.textContent = `${Math.round(this.renderer.scale * 100)}%`;
  }

  async _zoomBy(delta) {
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.renderer.scale + delta));
    this.renderer.setScale(next);
    this._updateZoomLevel();
    if (this.renderer.pdfDoc) await this.renderer.renderAllPages();
  }

  _scrollToPage(pageNum) {
    const target = this.el.pagesEl.querySelector(`.pv-page[data-page-number="${pageNum}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // The "current page" is whichever page sits closest to the upper third of
  // the container — feels right for both short and taller-than-viewport pages.
  _updatePageInfoFromScroll() {
    const pages = this.el.pagesEl.querySelectorAll('.pv-page');
    const containerRect = this.el.containerEl.getBoundingClientRect();
    const anchor = containerRect.top + containerRect.height / 3;

    let closest = null;
    let closestDist = Infinity;
    for (const page of pages) {
      const dist = Math.abs(page.getBoundingClientRect().top - anchor);
      if (dist < closestDist) {
        closestDist = dist;
        closest = page;
      }
    }
    if (closest) {
      this._updatePageInfo(Number(closest.dataset.pageNumber));
    }
  }
}
