import { useState } from 'react';
import { useWords } from '../../hooks/useWords';
import { usePdfViewerButton } from '../../hooks/usePdfViewerButton';
import { WordListSection } from '../../components/WordListSection';
import { DictionaryDialog } from '../../components/DictionaryDialog';
import { ReviewDialog } from '../../components/ReviewDialog';
import { BackupRow } from '../../components/BackupRow';

type OpenDialog = 'none' | 'dictionary' | 'review';

export function App() {
  const words = useWords();
  const pdfViewer = usePdfViewerButton();
  const [openDialog, setOpenDialog] = useState<OpenDialog>('none');
  const [exporting, setExporting] = useState(false);
  const closeDialog = () => setOpenDialog('none');

  // jsPDF plus the embedded Hebrew font weigh several hundred KB. A static
  // import would put them on the popup's startup path — the popup can't
  // paint until its bundle is parsed — so they're pulled in only when the
  // user actually exports.
  async function handleExportPdf(): Promise<void> {
    setExporting(true);
    try {
      const { exportWordsToPdf } = await import('../../lib/pdfExport');
      exportWordsToPdf(words);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <header>
        <h1>המילים שלי</h1>
        <span id="wh-count" className="wh-count">
          {Object.keys(words).length}
        </span>
      </header>

      {pdfViewer.visible && (
        <button id="wh-open-pdf" className="wh-open-pdf-btn" onClick={pdfViewer.openViewer}>
          פתח PDF זה במילון (עם סימון מילים)
        </button>
      )}

      <div className="wh-tools-row">
        <button
          id="wh-open-dict"
          className="wh-open-dict-btn"
          onClick={() => setOpenDialog('dictionary')}
        >
          🔤 מילון מתקדם
        </button>
        <button
          id="wh-open-review"
          className="wh-open-review-btn"
          onClick={() => setOpenDialog('review')}
        >
          שינון מילים 🎴
        </button>
      </div>

      <button
        id="wh-export-pdf"
        className="wh-export-pdf-btn"
        disabled={exporting}
        onClick={() => void handleExportPdf()}
      >
        {exporting ? '📄 מייצא...' : '📄 ייצוא הרשימה ל-PDF'}
      </button>

      <BackupRow words={words} />

      {openDialog === 'dictionary' && <DictionaryDialog words={words} onClose={closeDialog} />}
      {openDialog === 'review' && <ReviewDialog words={words} onClose={closeDialog} />}

      <WordListSection words={words} />
    </>
  );
}
