// Exports the saved word list as a formatted PDF table: Word | Translation
// (Hebrew, right-to-left) | Status, using jsPDF with an embedded Hebrew
// font (jsPDF's built-in fonts have no Hebrew glyphs, and jsPDF needs R2L
// explicitly enabled to lay Hebrew out in correct visual order).

const HEBREW_FONT_NAME = 'NotoSansHebrew';

function reverseHebrewForPdf(text) {
  // Fallback path only, used if the embedded Hebrew font somehow fails to
  // register — reversing character order is the closest approximation
  // without a real font (still imperfect, but better than boxes/blanks).
  return text.split('').reverse().join('');
}

function registerHebrewFont(doc) {
  if (typeof NOTO_SANS_HEBREW_BASE64 === 'undefined') return false;
  doc.addFileToVFS('NotoSansHebrew-Regular.ttf', NOTO_SANS_HEBREW_BASE64);
  doc.addFont('NotoSansHebrew-Regular.ttf', HEBREW_FONT_NAME, 'normal');
  return true;
}

export function exportWordsToPdf(allWords) {
  const { jsPDF } = window.jspdf;
  const entries = Object.values(allWords).sort((a, b) => {
    if (Boolean(a.learned) !== Boolean(b.learned)) {
      return a.learned ? 1 : -1; // learned words sink to the bottom
    }
    return a.original.localeCompare(b.original);
  });

  if (entries.length === 0) {
    alert('אין מילים לייצוא.');
    return;
  }

  const doc = new jsPDF();
  const hebrewFontRegistered = registerHebrewFont(doc);
  const hebrewFont = hebrewFontRegistered ? HEBREW_FONT_NAME : undefined;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginTop = 20;
  const marginBottom = 20;
  const marginSide = 15;
  const rowHeight = 9;
  let y = marginTop;

  // Column order left-to-right: Word (English) | Translation (Hebrew) | Status.
  const colWordX = marginSide + 4;
  const colTranslationCenterX = pageWidth / 2;
  const colStatusX = pageWidth - marginSide - 4;

  function hebrewText(text, x, textY, opts, bold) {
    if (hebrewFont) {
      // jsPDF needs R2L explicitly enabled to lay out Hebrew glyphs in
      // correct visual (right-to-left) order — without it, text draws in
      // raw logical-string order, which looks scrambled/reversed even with
      // a font that has the right glyphs. Restore R2L(false) immediately
      // after so subsequent English text isn't affected.
      doc.setFont(hebrewFont, 'normal');
      doc.setR2L(true);
      if (bold) {
        // Only a Regular-weight Hebrew font file is embedded (no true Bold
        // variant), so fake boldness by drawing the glyphs twice with a
        // hairline offset — a standard workaround when no bold font exists.
        doc.text(text, x + 0.15, textY, opts);
      }
      doc.text(text, x, textY, opts);
      doc.setR2L(false);
      doc.setFont(undefined, 'normal');
    } else {
      // No embedded font available — reversing is a crude approximation,
      // only used if font registration somehow failed.
      doc.text(reverseHebrewForPdf(text), x, textY, opts);
    }
  }

  function drawHeader() {
    doc.setFont(undefined, 'bold');
    doc.setFontSize(16);
    doc.setTextColor(20, 20, 20);
    doc.text('Word List', pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    const dateStr = new Date().toLocaleDateString();
    doc.text(`${entries.length} words - exported ${dateStr}`, pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFillColor(255, 176, 102);
    doc.rect(marginSide, y, pageWidth - marginSide * 2, rowHeight, 'F');
    doc.setFontSize(11);
    doc.setTextColor(50, 25, 0);

    doc.setFont(undefined, 'bold');
    doc.text('Word', colWordX, y + 6.3, { align: 'left' });
    doc.text('Status', colStatusX, y + 6.3, { align: 'right' });
    hebrewText('תרגום', colTranslationCenterX, y + 6.3, { align: 'center' }, true);

    y += rowHeight;
  }

  drawHeader();

  doc.setFont(undefined, 'normal');
  doc.setFontSize(11);

  entries.forEach((entry, i) => {
    if (y + rowHeight > pageHeight - marginBottom) {
      doc.addPage();
      y = marginTop;
      drawHeader();
      doc.setFont(undefined, 'normal');
      doc.setFontSize(11);
    }

    if (entry.learned) {
      doc.setFillColor(235, 250, 238);
    } else if (i % 2 === 0) {
      doc.setFillColor(255, 244, 230);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(marginSide, y, pageWidth - marginSide * 2, rowHeight, 'F');

    doc.setFont(undefined, 'normal');
    doc.setTextColor(15, 15, 15);
    doc.text(entry.original, colWordX, y + 6.3, { align: 'left' });

    doc.setTextColor(180, 60, 0);
    hebrewText(entry.translation, colTranslationCenterX, y + 6.3, { align: 'center' });

    if (entry.learned) {
      doc.setFontSize(8);
      doc.setTextColor(30, 120, 50);
      doc.text('learned', colStatusX, y + 6.3, { align: 'right' });
      doc.setFontSize(11);
    }

    y += rowHeight;
  });

  doc.save('word-list.pdf');
}
