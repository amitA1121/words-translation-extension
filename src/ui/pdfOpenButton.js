// Shows a button in the popup that opens the current tab's PDF through our
// own pdf.js-based viewer, when the active tab is a .pdf URL.

function isPdfUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return /\.pdf($|\?|#)/i.test(parsed.pathname) || /\.pdf($|\?|#)/i.test(parsed.href);
  } catch {
    return false;
  }
}

export async function setupPdfOpenButton(openPdfBtn) {
  // Always start hidden — never rely solely on the HTML default, and never
  // leave a stale visible state from a previous popup open in this session.
  openPdfBtn.hidden = true;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return;

  const alreadyInOurViewer = tab.url.startsWith(chrome.runtime.getURL('pdf-viewer.html'));
  if (alreadyInOurViewer) return;

  if (!isPdfUrl(tab.url)) return;

  openPdfBtn.hidden = false;
  openPdfBtn.addEventListener('click', () => {
    const viewerUrl = chrome.runtime.getURL('pdf-viewer.html') + '?file=' + encodeURIComponent(tab.url);
    chrome.tabs.update(tab.id, { url: viewerUrl });
    window.close();
  });
}
