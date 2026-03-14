function waitForPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function sanitizeTitle(data) {
  const raw = data && data.meta && data.meta.blockTitle ? data.meta.blockTitle : 'LiftRPG - Render';
  return String(raw)
    .replace(/[^a-zA-Z0-9\- ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    || 'LiftRPG-Render';
}

function resolveCanvasBackground(refs) {
  const element = refs && refs.booklet;
  if (!element || typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
    return '#f1ebe0';
  }

  const styles = window.getComputedStyle(element);
  const pagePaper = styles.getPropertyValue('--page-paper').trim();
  if (pagePaper) return pagePaper;

  const backgroundColor = styles.backgroundColor || '';
  return backgroundColor.trim() || '#f1ebe0';
}

export async function exportBookletPdf(refs, data, renderWithMode, setStatus) {
  if (!data) return;

  const html2canvas = window.html2canvas;
  const jsPDF = window.jspdf && window.jspdf.jsPDF;
  if (!html2canvas || !jsPDF) {
    setStatus('PDF export libraries are unavailable. Opening the browser print dialog instead.', 'error');
    await renderWithMode('booklet');
    window.print();
    return;
  }

  const previousMode = refs.layoutMode.value;

  try {
    refs.printBtn.disabled = true;
    refs.layoutMode.disabled = true;
    setStatus('Preparing booklet spreads…', 'neutral');

    await renderWithMode('booklet');
    await waitForPaint();
    await delay(200);

    const spreads = Array.from(refs.booklet.querySelectorAll('.printer-sheet'));
    if (!spreads.length) {
      throw new Error('No booklet spreads were generated for export.');
    }

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: 'letter' });
    const backgroundColor = resolveCanvasBackground(refs);

    for (let index = 0; index < spreads.length; index += 1) {
      setStatus('Generating PDF: page ' + (index + 1) + ' of ' + spreads.length + '…', 'neutral');
      const canvas = await html2canvas(spreads[index], {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor
      });
      const image = canvas.toDataURL('image/jpeg', 0.95);
      if (index > 0) {
        pdf.addPage();
      }
      pdf.addImage(image, 'JPEG', 0, 0, 11, 8.5);
    }

    pdf.save(sanitizeTitle(data) + '.pdf');
    setStatus('PDF saved: ' + spreads.length + ' spreads.', 'success');
  } finally {
    refs.layoutMode.disabled = false;
    refs.printBtn.disabled = false;
    await renderWithMode(previousMode);
  }
}
