// Shows the "open this PDF in our viewer" button only when the active tab
// is a .pdf URL that isn't already open in our viewer.

import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';

function isPdfUrl(url: string): boolean {
  try {
    return /\.pdf($|\?|#)/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

interface PdfViewerButton {
  visible: boolean;
  openViewer: () => void;
}

export function usePdfViewerButton(): PdfViewerButton {
  const [tab, setTab] = useState<{ id: number; url: string } | null>(null);

  useEffect(() => {
    void browser.tabs.query({ active: true, currentWindow: true }).then(([activeTab]) => {
      if (!activeTab?.url || activeTab.id === undefined) return;
      const viewerUrl = browser.runtime.getURL('/pdf-viewer.html');
      if (activeTab.url.startsWith(viewerUrl)) return;
      if (!isPdfUrl(activeTab.url)) return;
      setTab({ id: activeTab.id, url: activeTab.url });
    });
  }, []);

  return {
    visible: tab !== null,
    openViewer: () => {
      if (!tab) return;
      const viewerUrl =
        browser.runtime.getURL('/pdf-viewer.html') + '?file=' + encodeURIComponent(tab.url);
      void browser.tabs.update(tab.id, { url: viewerUrl });
      window.close();
    }
  };
}
