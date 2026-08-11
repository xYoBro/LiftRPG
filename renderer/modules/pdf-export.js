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

// ── html2canvas color() shim (D84) ──────────────────────────────────────────
//
// html2canvas is pinned at 1.4.1 — the last upstream release (Jan 2022), which
// predates CSS Color 4. booklet.css blends theme tokens with color-mix(), and
// Chrome and Safari both COMPUTE those to `color(srgb r g b / a)`. 1.4.1's
// parser rejects that function outright ("Attempting to parse an unsupported
// color function \"color\""), so the Safari export path threw on every booklet
// in the corpus; app.js caught the rejection and silently fell back to the
// print dialog.
//
// Fixed at the export boundary rather than in CSS: the mix INPUTS are re-bound
// in several cascade scopes (the #booklet-container token bridge, the
// classified-packet page scope, the pastoral archetype), so pre-mixing tokens
// at :root would rasterize colours that differ from what the screen shows.
// Screen and print rendering are correct today — only the frozen parser is not.
//
// The rewrite happens entirely inside html2canvas's own clone (the document
// handed to `onclone`, discarded after rasterization), so the live DOM is never
// touched and screen rendering carries no risk.
//
// Reading the clone rather than the live tree is deliberate: html2canvas
// injects <html2canvaspseudoelement> nodes into the clone before onclone runs,
// so the clone and live subtrees do NOT have matching element counts and
// cannot be paired positionally. Reading the clone's own computed styles needs
// no pairing, and is provably complete — html2canvas throws while parsing those
// exact computed styles, so every value that breaks it is visible here. It also
// covers pseudo-elements for free: html2canvas copies pseudo styles inline onto
// the <html2canvaspseudoelement> stand-ins, which this walk visits like any
// other element.

// Computed color(srgb …) values never nest parentheses (no calc() survives to
// computed value), so a non-greedy body match is sufficient and gradient
// strings keep their structure across a global replace.
const SRGB_COLOR_PATTERN = /color\(\s*srgb\s+([^)]*)\)/gi;

function srgbComponentToByte(token) {
  if (!token || token === 'none') return 0;
  const numeric = parseFloat(token);
  if (!isFinite(numeric)) return 0;
  const unit = token.indexOf('%') !== -1 ? numeric / 100 : numeric;
  return Math.round(Math.min(1, Math.max(0, unit)) * 255);
}

function srgbAlphaToUnit(token) {
  if (token === undefined) return 1;
  if (!token || token === 'none') return 0;
  const numeric = parseFloat(token);
  if (!isFinite(numeric)) return 1;
  const unit = token.indexOf('%') !== -1 ? numeric / 100 : numeric;
  return Math.min(1, Math.max(0, unit));
}

// Rewrites every color(srgb …) occurrence in a declaration value as rgba().
// Values without the function are returned untouched.
function convertSrgbColors(value) {
  if (!value || value.indexOf('color(srgb') === -1) return value;
  return value.replace(SRGB_COLOR_PATTERN, (match, body) => {
    const parts = String(body).split('/');
    const channels = parts[0].trim().split(/\s+/);
    if (channels.length < 3) return match;
    const r = srgbComponentToByte(channels[0]);
    const g = srgbComponentToByte(channels[1]);
    const b = srgbComponentToByte(channels[2]);
    const a = srgbAlphaToUnit(parts.length > 1 ? parts[1].trim() : undefined);
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + Number(a.toFixed(4)) + ')';
  });
}

// Every declaration in a computed style whose value carries color(srgb …),
// paired with its rgba() rewrite. Property-agnostic on purpose: this catches
// background-image gradients and box-shadow lists as well as plain colours.
function collectSrgbDeclarations(styles) {
  const fixes = [];
  for (let index = 0; index < styles.length; index += 1) {
    const property = styles.item(index);
    const value = styles.getPropertyValue(property);
    if (value && value.indexOf('color(srgb') !== -1) {
      fixes.push([property, convertSrgbColors(value)]);
    }
  }
  return fixes;
}

const PSEUDO_SELECTORS = ['::before', '::after'];
const PSEUDO_FIX_ATTRIBUTE = 'data-pdf-color-fix';

// Rewrites unparseable colours throughout a cloned spread. Mutates the clone
// only. Returns the number of declarations rewritten.
function resolveUnsupportedColors(cloneRoot, cloneDoc) {
  const view = cloneDoc && cloneDoc.defaultView;
  if (!cloneRoot || !view || typeof view.getComputedStyle !== 'function') return 0;

  const elements = [cloneRoot].concat(Array.from(cloneRoot.querySelectorAll('*')));
  const pseudoRules = [];
  let rewritten = 0;

  for (let index = 0; index < elements.length; index += 1) {
    const element = elements[index];
    const fixes = collectSrgbDeclarations(view.getComputedStyle(element));
    for (const [property, value] of fixes) {
      element.style.setProperty(property, value, 'important');
    }
    rewritten += fixes.length;

    // Defence in depth: if a real pseudo-element survives in the clone (rather
    // than being replaced by a stand-in element), inline styles cannot reach
    // it — emit a targeted stylesheet rule instead.
    for (const pseudo of PSEUDO_SELECTORS) {
      const pseudoStyles = view.getComputedStyle(element, pseudo);
      if (!pseudoStyles || !pseudoStyles.content || pseudoStyles.content === 'none') continue;
      const pseudoFixes = collectSrgbDeclarations(pseudoStyles);
      if (!pseudoFixes.length) continue;
      const token = String(pseudoRules.length);
      element.setAttribute(PSEUDO_FIX_ATTRIBUTE, token);
      const body = pseudoFixes.map(([property, value]) => property + ':' + value + ' !important;').join('');
      pseudoRules.push('[' + PSEUDO_FIX_ATTRIBUTE + '="' + token + '"]' + pseudo + '{' + body + '}');
      rewritten += pseudoFixes.length;
    }
  }

  if (pseudoRules.length) {
    const sheet = cloneDoc.createElement('style');
    sheet.textContent = pseudoRules.join('\n');
    (cloneDoc.head || cloneDoc.documentElement).appendChild(sheet);
  }

  return rewritten;
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
    // The canvas background is parsed by html2canvas too, so it goes through
    // the same rewrite as the cloned declarations.
    const backgroundColor = convertSrgbColors(resolveCanvasBackground(refs));

    for (let index = 0; index < spreads.length; index += 1) {
      setStatus('Generating PDF: page ' + (index + 1) + ' of ' + spreads.length + '…', 'neutral');
      const canvas = await html2canvas(spreads[index], {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor,
        onclone: (clonedDoc, clonedSpread) => {
          const root = clonedSpread || clonedDoc.querySelectorAll('.printer-sheet')[index];
          resolveUnsupportedColors(root, clonedDoc);
        }
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
