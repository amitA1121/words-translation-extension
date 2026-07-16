// Shared frame for the overlay dialogs (dictionary, review): backdrop that
// closes on outside click, and the standard header with a close button.

import type { ReactNode } from 'react';

interface ModalOverlayProps {
  dialogClassName: string;
  onClose: () => void;
  children: ReactNode;
}

export function ModalOverlay({ dialogClassName, onClose, children }: ModalOverlayProps) {
  return (
    <div
      className="wh-dict-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={dialogClassName}>{children}</div>
    </div>
  );
}

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
  trailing?: ReactNode;
}

export function ModalHeader({ title, onClose, trailing }: ModalHeaderProps) {
  return (
    <div className="wh-dict-header">
      <button className="wh-dict-close-btn" title="סגור" onClick={onClose}>
        ✕
      </button>
      <span className="wh-dict-title">{title}</span>
      {trailing ?? <span className="wh-dict-spacer" />}
    </div>
  );
}
