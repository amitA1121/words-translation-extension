// Base class for overlay-style dialogs (dictionary, review). Owns the
// shared open/close/toggle/backdrop-click wiring so each dialog subclass
// only implements what makes it different.

export class Modal {
  /**
   * @param {{ openBtn: HTMLElement, overlay: HTMLElement, closeBtn: HTMLElement }} el
   */
  constructor(el) {
    this.el = el;
    el.openBtn.addEventListener('click', () => this.toggle());
    el.closeBtn.addEventListener('click', () => this.close());
    el.overlay.addEventListener('click', (e) => {
      if (e.target === el.overlay) this.close();
    });
  }

  get isOpen() {
    return !this.el.overlay.hidden;
  }

  open() {
    this.el.overlay.hidden = false;
    this.onOpen();
  }

  close() {
    this.el.overlay.hidden = true;
    this.onClose();
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  /** Override in subclasses; called after the overlay is shown. */
  onOpen() {}

  /** Override in subclasses; called after the overlay is hidden. */
  onClose() {}
}
