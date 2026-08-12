import { decryptBlob, encryptBlob } from './crypto.js?v=48';
import { qs } from './dom.js?v=48';
import { exportBookletPdf } from './pdf-export.js?v=48';
import { renderBooklet, syncLayoutMode } from './render.js?v=48';
import { deriveBookletPassword, normalisePassword, validateBooklet, waitForPaint } from './utils.js?v=48';

const state = {
  data: null,
  unlockedEnding: null,
  layoutMode: 'single',
  restoreLayoutMode: null,
  authorMode: false,
  demoMode: false,
  demoView: false,
  demoPasswordRevealed: false,
  previewTarget: '',
  reviewMode: false,
  auditConfig: null,
  pendingFontRenderToken: null
};

let refs = {};

function setStatus(message, tone) {
  refs.status.textContent = message || '';
  refs.status.setAttribute('data-tone', tone || 'neutral');
}

function syncLoadedState() {
  document.body.setAttribute('data-booklet-loaded', state.data ? 'true' : 'false');
  if (!state.data) publishRenderState('idle', 'no-booklet');
}

// ── Render-settled marker ────────────────────────────────────────────────────
//
// `document.body[data-render-state]` is the machine-readable answer to the only
// question a browser harness actually asks: "is what I am looking at the FINAL
// layout?" The status line was never that answer. It is written by four
// branches of loadBooklet() and again by every render pass, so which render a
// harness samples depends on the book's ending state rather than on the render:
// a book that lands on loadBooklet()'s `hasPlaceholderEnding` branch leaves
// "Loaded <file>. Ending is still unsealed…" on screen at the FIRST render,
// while a demo or generator book leaves a line with no "Loaded" in it and the
// harness waits — by accident — for the font-aware pass.
//
// Fonts make that a correctness problem rather than a cosmetic one. The
// vendored faces are `font-display: swap` (D92), so the first render lays out
// in FALLBACK metrics and the swap reflows the book underneath it. Measured
// 2026-08-12 by pinning the renderer pre-swap: the pre-font and post-font
// layouts differ on 3 of 4 corpus fixtures sampled (1–3 pages each). Sampling
// early does not add noise to a number — it reports a different book.
//
// States: idle (nothing loaded) → rendering → settled; stalled on timeout.
// `settled` is only ever raised by a watcher whose generation still matches,
// and only when ALL of:
//   (a) document.fonts.status === 'loaded' — no face in flight. Re-checked at
//       every sample and un-latched by the FontFaceSet 'loading' event, because
//       'loaded' is ALSO what the set reports BEFORE loading has begun. That is
//       not a hypothetical: MEASURED on this renderer, document.fonts.ready
//       resolves ~250ms in against the TOOLBAR's faces — before the booklet has
//       rendered at all (~600ms) and before its own faces have been requested.
//       Awaiting that promise proves nothing about the book.
//   (b) no font-aware re-render is pending (state.pendingFontRenderToken);
//   (c) the booklet's geometry signature is identical across two samples that
//       straddle an animation frame — nothing moved after a layout and a paint.
//       Read that literally: it means "held still across one ~76ms sample gap",
//       NOT "will never move again". MEASURED: geometry wobbling on a 120ms
//       period slips through this leg (two samples can agree between wobbles);
//       only per-frame motion always trips it. That is the honest limit of any
//       quiescence test, and the reason (a) and (b) — not (c) — are what make
//       this marker sound. (c) is the backstop for motion with no font event
//       behind it, and it is why 'stalled' exists at all.
//   (d) at least one page exists. A render that produced nothing is a failure
//       to shout about, not a quiet green sample of an empty container.
// Every render bumps the generation before touching the DOM, so a watcher from
// an earlier pass can never raise the flag for a newer one.
//
// Inert for readers: one attribute nothing styles, one bounded poll, one font
// listener. Nothing here changes what is rendered or when.

const RENDER_SETTLE_POLL_MS = 60;
const RENDER_SETTLE_MAX_MS = 20000;

let renderGeneration = 0;
let renderSettleTimer = null;

function publishRenderState(value, reason, extra) {
  document.body.setAttribute('data-render-state', value);
  window.__liftrpgRenderState = Object.assign({
    state: value,
    reason: reason || '',
    generation: renderGeneration,
    atMs: Math.round(window.performance ? window.performance.now() : 0)
  }, extra || {});
}

// Font-sensitive on purpose. Page boxes are a fixed 5.5×8.5in and say nothing;
// what a font swap moves is the CONTENT — how far down the frame the last block
// ends, how much the frame scrolls, how the planner split the book.
function bookletGeometrySignature() {
  const pages = refs.booklet
    ? refs.booklet.querySelectorAll('.booklet-page[data-page-number]')
    : [];
  let hash = 5381;
  const mix = (value) => { hash = ((hash * 33) ^ (Number(value) | 0)) >>> 0; };
  mix(pages.length);
  for (let i = 0; i < pages.length; i += 1) {
    const frame = pages[i].querySelector('.page-frame') || pages[i];
    const last = frame.lastElementChild;
    mix(frame.scrollHeight);
    mix(frame.scrollWidth);
    mix(frame.childElementCount);
    mix(last ? last.offsetTop : -1);
    mix(last ? last.offsetHeight : -1);
  }
  return { pages: pages.length, hash };
}

function renderSettleBlocker(sample) {
  if (document.fonts && document.fonts.status !== 'loaded') return 'fonts-loading';
  // Two forms of the same debt. The token says a re-render has been SCHEDULED;
  // fontRerenderOwed() says the layout on screen was computed against fewer
  // faces than are down now, which is true from the instant the face lands —
  // before any event has been dispatched and before anything can schedule.
  // Without the second, a sample taken in the gap between the FontFaceSet
  // flipping to 'loaded' and its 'loadingdone' task running would latch
  // `settled` on a layout that is about to be replaced.
  if (state.pendingFontRenderToken || fontRerenderOwed()) return 'font-rerender-pending';
  if (!sample.pages) return 'no-pages';
  return '';
}

function beginRenderPass(reason) {
  renderGeneration += 1;
  if (renderSettleTimer !== null) {
    window.clearTimeout(renderSettleTimer);
    renderSettleTimer = null;
  }
  publishRenderState('rendering', reason || 'render-in-progress');
}

function watchForRenderSettled() {
  const generation = renderGeneration;
  const startedAt = window.performance ? window.performance.now() : Date.now();
  let previousHash = null;
  let samples = 0;

  function sampleOnce() {
    if (generation !== renderGeneration) return; // a newer pass owns the flag now

    const sample = bookletGeometrySignature();
    const blocker = renderSettleBlocker(sample);
    samples += 1;

    if (!blocker && previousHash !== null && previousHash === sample.hash) {
      publishRenderState('settled', 'quiescent', {
        pages: sample.pages,
        signature: sample.hash,
        samples
      });
      return;
    }

    // Any blocker voids the pair — two equal samples only mean something when
    // both were taken with the fonts down and no re-render owed.
    previousHash = blocker ? null : sample.hash;

    const elapsed = (window.performance ? window.performance.now() : Date.now()) - startedAt;
    if (elapsed > RENDER_SETTLE_MAX_MS) {
      publishRenderState('stalled', blocker || 'geometry-moving', {
        pages: sample.pages,
        samples,
        elapsedMs: Math.round(elapsed)
      });
      return;
    }

    renderSettleTimer = window.setTimeout(scheduleSample, RENDER_SETTLE_POLL_MS);
  }

  function scheduleSample() {
    // rAF first: sample after layout and paint, never mid-frame.
    window.requestAnimationFrame(sampleOnce);
  }

  scheduleSample();
}

function watchLateFontActivity() {
  if (!document.fonts || typeof document.fonts.addEventListener !== 'function') return;
  document.fonts.addEventListener('loading', () => {
    if (!state.data) return;
    if (document.body.getAttribute('data-render-state') !== 'settled') return;
    // A face began loading after we called the layout final. The swap that
    // follows reflows text, so the flag comes back down and must be re-earned.
    beginRenderPass('late-font-load');
    watchForRenderSettled();
  });
  // …and when the cycle ENDS, the book is re-planned against the faces that
  // arrived. The swap alone reflows text inside the boxes it already has; only
  // a re-render re-runs the planner, whose phase-1 estimates are per-typeface
  // arithmetic (modules/type-metrics.js). Both events, one owner: this is the
  // only place in the app that listens to the font set.
  const settleDebt = () => scheduleFontAwareRerender();
  document.fonts.addEventListener('loadingdone', settleDebt);
  document.fonts.addEventListener('loadingerror', settleDebt);
}

function isSafariBrowser() {
  return /^((?!chrome|android).)*safari/i.test(window.navigator.userAgent);
}

function parseAuditNumber(value, fallbackValue) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallbackValue;
}

function roundAuditPx(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return Math.round(value * 100) / 100;
}

function summarizeWeeklyAudit(config) {
  const pages = [...refs.booklet.querySelectorAll('.booklet-page[data-page-number]')];
  if (!pages.length || !window.__v2PageCount || pages.length !== window.__v2PageCount) {
    return { status: 'pending' };
  }
  if (document.fonts && document.fonts.status !== 'loaded') {
    return { status: 'pending' };
  }

  const failures = [];
  const pageTypeCounts = {};
  const weeklyPageTypes = new Set(['workout-left', 'field-ops', 'boss']);
  const staticDensityPageTypes = new Set(Array.isArray(config.staticDensityPageTypes) ? config.staticDensityPageTypes : []);
  const requiredPageTypes = Array.isArray(config.requiredPageTypes) ? config.requiredPageTypes : [];
  const inspectPages = new Set(Array.isArray(config.inspectPages) ? config.inspectPages : []);
  const inspectedPages = [];
  let auditedPages = 0;

  function fail(message) {
    if (failures.length < 12) failures.push(message);
  }

  pages.forEach((page) => {
    const pageNumber = Number(page.dataset.pageNumber || 0);
    const pageType = page.getAttribute('data-page-type') || '';
    pageTypeCounts[pageType] = (pageTypeCounts[pageType] || 0) + 1;

    const frame = page.querySelector('.page-frame');
    const footer = page.querySelector('.week-progress');
    const footerDots = footer ? [...footer.querySelectorAll('.week-progress-dot')] : [];
    const activeDots = footerDots.filter((dot) => dot.dataset.state === 'active');
    const frameRect = frame ? frame.getBoundingClientRect() : null;
    const footerRect = footer ? footer.getBoundingClientRect() : null;
    const frameChildren = frame ? [...frame.children] : [];
    const lastChild = frameChildren.length ? frameChildren[frameChildren.length - 1] : null;
    const lastChildRect = lastChild ? lastChild.getBoundingClientRect() : null;

    if (inspectPages.has(pageNumber)) {
      const sessionCards = page.querySelector('.session-cards');
      const sessionRect = sessionCards ? sessionCards.getBoundingClientRect() : null;
      const mechanicContent = page.querySelector('.rp-content');
      const mechanicRect = mechanicContent ? mechanicContent.getBoundingClientRect() : null;
      inspectedPages.push({
        pageNumber,
        pageType,
        footerBottomGapPx: (frameRect && footerRect) ? roundAuditPx(frameRect.bottom - footerRect.bottom) : null,
        contentBottomGapPx: (frameRect && lastChildRect) ? roundAuditPx(frameRect.bottom - lastChildRect.bottom) : null,
        workoutSlackPx: (sessionRect && footerRect) ? roundAuditPx(footerRect.top - sessionRect.bottom) : null,
        mechanicSlackPx: (mechanicRect && footerRect) ? roundAuditPx(footerRect.top - mechanicRect.bottom) : null,
        frameOverflowPx: frame ? Math.max(0, frame.scrollHeight - frame.clientHeight) : null,
        sessionCardCount: page.querySelectorAll('.session-card').length,
        cardCountAttr: frame ? Number(frame.getAttribute('data-card-count') || 0) : 0,
        compaction: frame ? (frame.getAttribute('data-page-compaction') || '') : '',
        dotCount: footerDots.length,
        activeDotCount: activeDots.length,
        textSample: String((frame ? frame.textContent : page.textContent) || '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 120)
      });
    }

    if (staticDensityPageTypes.has(pageType)) {
      auditedPages += 1;
      if (frameRect && lastChildRect) {
        const contentGap = frameRect.bottom - lastChildRect.bottom;
        if (contentGap > config.maxStaticContentGapPx) {
          fail('page ' + page.dataset.pageNumber + ' (' + pageType + ') has ' + Math.round(contentGap * 100) / 100 + 'px of dead space');
        }
      }
      return;
    }

    if (!weeklyPageTypes.has(pageType)) return;

    auditedPages += 1;

    if (!footer) {
      fail('page ' + page.dataset.pageNumber + ' (' + pageType + ') missing week footer');
      return;
    }

    if (footerDots.length !== config.totalWeeks) {
      fail('page ' + page.dataset.pageNumber + ' (' + pageType + ') has ' + footerDots.length + ' dots');
    }
    if (activeDots.length !== 1) {
      fail('page ' + page.dataset.pageNumber + ' (' + pageType + ') has ' + activeDots.length + ' active dots');
    }

    if (frameRect && footerRect) {
      const footerGap = frameRect.bottom - footerRect.bottom;
      if (footerGap > config.maxFooterBottomGapPx) {
        fail('page ' + page.dataset.pageNumber + ' (' + pageType + ') footer drifted ' + Math.round(footerGap * 100) / 100 + 'px');
      }
    }

    if (pageType === 'workout-left') {
      const sessionCards = page.querySelector('.session-cards');
      const sessionRect = sessionCards ? sessionCards.getBoundingClientRect() : null;
      const cardCountAttr = frame ? Number(frame.getAttribute('data-card-count') || 0) : 0;
      const sessionCardCount = page.querySelectorAll('.session-card').length;
      if (sessionCardCount !== cardCountAttr) {
        fail('page ' + page.dataset.pageNumber + ' (workout-left) lost card-count metadata');
      }
      if (sessionRect && footerRect) {
        const slack = footerRect.top - sessionRect.bottom;
        if (slack > config.maxWorkoutSlackPx) {
          fail('page ' + page.dataset.pageNumber + ' (workout-left) has ' + Math.round(slack * 100) / 100 + 'px of slack');
        }
      }
    }

    if (pageType === 'field-ops') {
      const mechanicContent = page.querySelector('.rp-content');
      const mechanicRect = mechanicContent ? mechanicContent.getBoundingClientRect() : null;
      if (mechanicRect && footerRect) {
        const slack = footerRect.top - mechanicRect.bottom;
        if (slack > config.maxMechanicSlackPx) {
          fail('page ' + page.dataset.pageNumber + ' (field-ops) has ' + Math.round(slack * 100) / 100 + 'px of slack');
        }
      }
    }
  });

  requiredPageTypes.forEach((pageType) => {
    if (!pageTypeCounts[pageType]) {
      fail('missing page type ' + pageType);
    }
  });

  return {
    status: failures.length ? 'fail' : 'ok',
    pageCount: pages.length,
    auditedPages,
    pageTypeCounts,
    failures,
    inspectedPages
  };
}

function publishAuditStatus() {
  if (!state.auditConfig) return;

  const summary = summarizeWeeklyAudit(state.auditConfig);
  if (summary.status === 'pending') {
    document.title = 'LIFTRPG_AUDIT_PENDING';
    return;
  }

  document.title = 'LIFTRPG_AUDIT:' + encodeURIComponent(JSON.stringify(summary));
}

function renderCurrentBooklet() {
  if (!state.data) return;
  // The single funnel for every render — load, unlock, layout-mode switch and
  // the font-aware pass all arrive here, so this is the one place the marker
  // needs to be lowered and re-armed, and the one place the font debt is
  // settled. Recorded BEFORE the render, not after: a face that lands while
  // this pass runs must still leave a debt behind it.
  renderedFaceCount = loadedFaceCount();
  beginRenderPass();
  renderBooklet(refs, state.layoutMode, state.data, state.unlockedEnding, setStatus);
  publishAuditStatus();
  scrollPreviewTargetIntoView();
  // ORDER MATTERS: loadBooklet() calls scheduleFontAwareRerender() on the very
  // next line, and the watcher's first sample is an animation frame away, so
  // the pending-render token is always set before anything can read it.
  watchForRenderSettled();
}

function waitForFontsReady() {
  if (!document.fonts || document.fonts.status === 'loaded') {
    return Promise.resolve();
  }
  return document.fonts.ready.catch(() => {});
}

// ── THE FONT DEBT ────────────────────────────────────────────────────────────
//
// A render is a photograph of the faces that were down when it ran. The
// vendored faces are `font-display: swap` (D92), so a render that happens
// before a face arrives lays out in FALLBACK metrics and the swap reflows the
// text underneath it — including the planner's page assignment, because
// phase-1 estimates are per-typeface arithmetic. The re-render that repairs
// that is a DEBT, and the only real question is how the app knows it owes one.
//
// It used to ask `document.fonts.status === 'loaded'` at the single instant
// loadBooklet() ran, and schedule nothing if the answer came back 'loaded'.
// That reads as "the fonts are down", but it is equally what an IDLE set
// reports BEFORE its first face has been requested (D120) — and this booklet's
// faces are requested BY the render, which has not happened yet at that point.
// Only timing kept it honest: the toolbar's faces were usually still in
// flight, so the guard usually fell through to scheduling. Warm the cache, or
// resolve the toolbar's faces a beat earlier, and it returns early — the book
// then keeps its fallback layout permanently, with nothing anywhere to say so.
//
// So the debt is a COMPARISON, not a status string and not an event:
//
//     faces loaded NOW  >  faces loaded when this layout was computed
//
// `document.fonts` is set-like and every FontFace carries its own status, so
// that is directly observable at any moment, from any caller, with no reliance
// on having been listening at the right time. It also terminates by
// construction: the count is monotonic (a loaded face never unloads) and
// bounded by the set, and every re-render raises the recorded count to the
// current one — so a pass that requests no new face owes nothing and the chain
// stops. The cap below is belt-and-braces for a pathological cascade of
// per-glyph subset loads; if it were ever reached with a debt outstanding, the
// debt stays visible to renderSettleBlocker() and the marker goes `stalled`
// naming `font-rerender-pending`. Loud and wrong beats quiet and wrong.
const MAX_FONT_AWARE_RERENDERS = 4;

/** Faces the layout on screen was computed against. -1 until the first render. */
let renderedFaceCount = -1;
let fontAwareRerenders = 0;

function loadedFaceCount() {
  if (!document.fonts || typeof document.fonts.forEach !== 'function') return 0;
  let count = 0;
  document.fonts.forEach((face) => { if (face.status === 'loaded') count += 1; });
  return count;
}

function fontRerenderOwed() {
  return !!state.data && loadedFaceCount() > renderedFaceCount;
}

function scheduleFontAwareRerender() {
  if (!fontRerenderOwed()) {
    state.pendingFontRenderToken = null;
    return;
  }
  if (fontAwareRerenders >= MAX_FONT_AWARE_RERENDERS) {
    state.pendingFontRenderToken = null;
    console.warn('[app] font-aware re-render cap reached (' + MAX_FONT_AWARE_RERENDERS
      + '); the layout may be estimated against fewer faces than are loaded.');
    return;
  }

  const token = Symbol('font-render');
  state.pendingFontRenderToken = token;
  setStatus('Loading booklet typography…', 'neutral');

  waitForFontsReady().then(() => {
    if (state.pendingFontRenderToken !== token || !state.data) return;
    state.pendingFontRenderToken = null;
    // `document.fonts.ready` can resolve against faces that have nothing to do
    // with this booklet (D120), so it is a convenience here, not the pin: the
    // debt is re-checked before spending a render on it.
    if (!fontRerenderOwed()) return;
    fontAwareRerenders += 1;
    renderCurrentBooklet();
  });
}

function scrollEndingIntoView() {
  const endingPage = refs.booklet.querySelector('[data-page-type="ending-unlocked"]');
  if (!endingPage) return;
  endingPage.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function scrollPreviewTargetIntoView() {
  const target = String(state.previewTarget || '').trim();
  if (!target || target === '1') return;

  const selector = /^\d+$/.test(target)
    ? '[data-page-number="' + target + '"]'
    : '[data-page-type="' + target + '"]';
  const page = refs.booklet.querySelector(selector);
  if (!page) return;
  page.scrollIntoView({ behavior: 'auto', block: 'start' });
}

function hasRealEncryptedEnding(data) {
  const blob = data && data.meta ? data.meta.passwordEncryptedEnding : '';
  return !!blob && blob.indexOf('PLACEHOLDER_') !== 0;
}

function unlockWithPayload(payload, password) {
  state.unlockedEnding = payload;
  renderCurrentBooklet();
  syncUnlockUi({
    visible: true,
    state: 'unlocked',
    label: 'Ending decrypted',
    message: '✓ Unlocked',
    password,
    inputDisabled: true,
    buttonDisabled: true
  });
  scrollEndingIntoView();
}

function syncUnlockUi(status) {
  const stateValue = status && status.state ? status.state : 'locked';
  refs.unlockRow.setAttribute('data-state', stateValue);

  if (status && status.visible === false) {
    refs.unlockRow.style.display = 'none';
    return;
  }

  refs.unlockRow.style.display = status && status.visible ? 'block' : 'none';
  refs.unlockLabel.textContent = status && status.label ? status.label : 'Unlock the ending:';
  refs.unlockStatus.textContent = status && status.message ? status.message : '';
  refs.unlockStatus.style.display = status && status.message ? 'inline-flex' : 'none';

  if (status && status.password !== undefined) {
    refs.unlockPassword.value = status.password;
  }

  refs.unlockPassword.setAttribute('data-demo-password', state.demoMode ? 'true' : 'false');
  refs.unlockPassword.setAttribute('data-revealed', state.demoPasswordRevealed ? 'true' : 'false');
  refs.unlockPassword.disabled = !!(status && status.inputDisabled);
  refs.unlockPassword.readOnly = !!(status && status.inputDisabled);
  refs.unlockBtn.disabled = !!(status && status.buttonDisabled);
  if (refs.unlockRevealDemo) {
    refs.unlockRevealDemo.style.display = state.demoMode && status && status.visible && !state.demoPasswordRevealed && !(status && status.inputDisabled)
      ? 'inline-flex'
      : 'none';
  }
  if (refs.unlockHint) {
    refs.unlockHint.textContent = state.demoMode && status && status.visible
      ? 'Sample booklet loaded. Use Reveal Demo Password if you want to test the sample unlock.'
      : 'Use the final designation/password from your booklet. Scroll to explore the full booklet.';
  }
}

async function renderWithMode(layoutMode) {
  state.layoutMode = layoutMode;
  refs.layoutMode.value = layoutMode;
  syncLayoutMode(refs, state.layoutMode);
  renderCurrentBooklet();
}

async function printBooklet() {
  if (!state.data) return;

  state.restoreLayoutMode = state.layoutMode;
  await renderWithMode('booklet');
  await waitForPaint();

  window.setTimeout(() => {
    window.print();
  }, 150);
}

async function handlePrint() {
  if (!state.data) return;

  if (isSafariBrowser()) {
    try {
      await exportBookletPdf(refs, state.data, renderWithMode, setStatus);
      return;
    } catch (error) {
      setStatus('PDF export failed. Opening print dialog instead.', 'error');
    }
  }

  await printBooklet();
}

function loadBooklet(data, sourceLabel) {
  const errors = validateBooklet(data);
  if (errors.length) {
    if (!state.data) {
      refs.booklet.innerHTML = '';
      refs.printBtn.disabled = true;
      refs.unlockRow.style.display = 'none';
      refs.encryptRow.style.display = 'none';
      syncLoadedState();
    }
    setStatus(errors.join(' '), 'error');
    return;
  }

  state.data = data;
  window.__bookletData = data; // expose for diagnostics tests
  state.unlockedEnding = null;
  state.demoPasswordRevealed = false;
  refs.layoutMode.value = state.layoutMode;
  syncLoadedState();
  renderCurrentBooklet();
  scheduleFontAwareRerender();

  const hasEncryptedEnding = hasRealEncryptedEnding(data);
  const hasPlaceholderEnding = !!(data.meta && data.meta.passwordEncryptedEnding) && !hasEncryptedEnding;
  const hasEndings = Array.isArray(data.endings) && data.endings.length > 0;
  const demoPassword = state.demoMode ? deriveBookletPassword(data) : '';
  syncUnlockUi({
    visible: hasEncryptedEnding,
    state: 'locked',
    label: 'Unlock the ending:',
    message: '',
    password: demoPassword,
    inputDisabled: false,
    buttonDisabled: false
  });
  refs.encryptRow.style.display = state.authorMode && data.meta && hasEndings && !hasEncryptedEnding ? 'flex' : 'none';
  refs.encryptDownload.style.display = 'none';
  refs.encryptStatus.textContent = '';
  if (hasPlaceholderEnding && hasEndings && !state.authorMode) {
    refs.encryptRow.style.display = 'none';
    setStatus('Loaded ' + sourceLabel + '. Ending is still unsealed; this view is decrypt-only.', 'warning');
    return;
  }
  if (!state.authorMode) {
    refs.encryptRow.style.display = 'none';
  }
  if (sourceLabel === 'Booklet From Generator') {
    var genMsg = 'Booklet opened from the generator. Review the pages, then switch to Print Booklet Layout when you are ready.';
    if (hasEncryptedEnding) genMsg += ' The ending is sealed — scroll down to the unlock bar to enter your password after completing the booklet.';
    setStatus(genMsg, 'success');
    return;
  }
  if (state.demoMode) {
    setStatus('Sample booklet loaded. Review the pages or test the ending below.', 'neutral');
    return;
  }
  var loadMsg = 'Loaded ' + sourceLabel + '.';
  if (hasEncryptedEnding) loadMsg += ' The ending is sealed — use the unlock bar below the booklet to enter the password.';
  setStatus(loadMsg, 'success');
}

function loadJsonFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function onLoad() {
    try {
      autoEncryptAndLoad(JSON.parse(String(reader.result || '{}')), file.name);
    } catch (error) {
      setStatus('Invalid JSON: ' + error.message, 'error');
    }
  };
  reader.readAsText(file);
}

function candidateDemoPaths(name) {
  return [
    '../examples/' + name + '.json',
    '../' + name + '.json',
    '../content/' + name + '.json'
  ];
}

function fetchDemo(name) {
  const paths = candidateDemoPaths(name);
  let chain = Promise.reject(new Error('Demo JSON not found.'));
  const cacheBust = Date.now();

  paths.forEach((path) => {
    const requestPath = path + (path.indexOf('?') === -1 ? '?' : '&') + 'v=' + cacheBust;
    chain = chain.catch(() => fetch(requestPath, { cache: 'no-store' }).then((response) => {
      if (!response.ok) {
        throw new Error('Demo JSON not found.');
      }
      return response.json().then((data) => ({ data, path }));
    }));
  });

  return chain
    .then((result) => {
      const label = result.path.split('/').pop() || name + '.json';
      autoEncryptAndLoad(result.data, label);
    })
    .catch((error) => {
      setStatus(error.message, 'error');
    });
}

function attemptUnlock() {
  if (!state.data || !hasRealEncryptedEnding(state.data)) {
    syncUnlockUi({
      visible: false,
      state: 'locked'
    });
    return;
  }

  const enteredPassword = normalisePassword(refs.unlockPassword.value || '');
  const demoPassword = state.demoMode ? deriveBookletPassword(state.data) : '';
  const password = enteredPassword || (state.demoMode ? demoPassword : '');
  if (!password) {
    syncUnlockUi({
      visible: true,
      state: 'error',
      label: 'Unlock the ending:',
      message: 'Enter password',
      password: '',
      inputDisabled: false,
      buttonDisabled: false
    });
    return;
  }

  if (state.demoMode && demoPassword && password === demoPassword) {
    unlockWithPayload(state.data.endings && state.data.endings[0] ? state.data.endings[0].content : null, password);
    return;
  }

  syncUnlockUi({
    visible: true,
    state: 'pending',
    label: 'Unlock the ending:',
    message: 'Unlocking…',
    password,
    inputDisabled: false,
    buttonDisabled: true
  });
  // Belt-and-braces: any synchronous throw out of decryptBlob must reach the
  // rejection UX below rather than escaping to the click listener and leaving
  // the bar stuck at "Unlocking…" (crypto.js now guarantees it can only reject).
  Promise.resolve()
    .then(() => decryptBlob(state.data.meta.passwordEncryptedEnding, password))
    .then((payload) => {
      unlockWithPayload(payload, password);
    })
    .catch(() => {
      if (state.demoMode && deriveBookletPassword(state.data) === password) {
        unlockWithPayload(state.data.endings && state.data.endings[0] ? state.data.endings[0].content : null, password);
        return;
      }

      syncUnlockUi({
        visible: true,
        state: 'error',
        label: 'Unlock the ending:',
        message: 'Password rejected',
        password,
        inputDisabled: false,
        buttonDisabled: false
      });
    });
}

function autoEncryptAndLoad(data, sourceLabel = 'Generated Booklet') {
  const hasEndings = Array.isArray(data.endings) && data.endings.length > 0;
  const password = deriveBookletPassword(data);
  const alreadyEncrypted = hasRealEncryptedEnding(data);

  if (!hasEndings || !password || alreadyEncrypted) {
    loadBooklet(data, sourceLabel);
    return;
  }

  setStatus('Sealing ending…', 'neutral');
  const payload = data.endings[0].content || data.endings[0];

  encryptBlob(payload, password)
    .then((blob) => {
      data.meta.passwordEncryptedEnding = blob;
      delete data.meta.passwordPlaintext;
      data.endings = [];
      loadBooklet(data, sourceLabel);
    })
    .catch(() => {
      loadBooklet(data, sourceLabel);
    });
}

function attemptEncrypt() {
  if (!state.data || !Array.isArray(state.data.endings) || !state.data.endings.length) {
    refs.encryptStatus.textContent = 'No endings available.';
    return;
  }

  const password = normalisePassword(refs.encryptPassword.value || '');
  if (!password) {
    refs.encryptStatus.textContent = 'Enter a password.';
    return;
  }

  refs.encryptStatus.textContent = 'Encrypting…';
  encryptBlob(state.data.endings[0].content || state.data.endings[0], password)
    .then((blob) => {
      state.data.meta.passwordEncryptedEnding = blob;
      refs.encryptStatus.textContent = 'Encrypted.';
      refs.encryptDownload.style.display = 'inline-flex';
    })
    .catch(() => {
      refs.encryptStatus.textContent = 'Encryption failed.';
    });
}

function downloadJson() {
  if (!state.data) return;
  const exportData = JSON.parse(JSON.stringify(state.data));
  if (exportData.meta && exportData.meta.passwordEncryptedEnding) {
    // Sealed booklet: plaintext endings and passwords must not ship beside
    // the ciphertext (AUDIT finding 48).
    delete exportData.meta.passwordPlaintext;
    delete exportData.meta.demoPassword;
    exportData.endings = [];
  }
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'liftrpg-booklet.json';
  link.click();
  URL.revokeObjectURL(url);
}

function wireUi() {
  window.addEventListener('afterprint', () => {
    if (!state.restoreLayoutMode) return;
    const restoreLayoutMode = state.restoreLayoutMode;
    state.restoreLayoutMode = null;
    renderWithMode(restoreLayoutMode);
  });
  refs.jsonInput.addEventListener('change', (event) => {
    loadJsonFile(event.target.files && event.target.files[0]);
  });
  refs.printBtn.addEventListener('click', () => {
    handlePrint();
  });
  refs.layoutMode.addEventListener('change', () => {
    renderWithMode(refs.layoutMode.value);
  });
  refs.unlockBtn.addEventListener('click', attemptUnlock);
  refs.unlockPassword.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') attemptUnlock();
  });
  refs.unlockRevealDemo.addEventListener('click', () => {
    if (!state.demoMode || !state.data) return;
    state.demoPasswordRevealed = true;
    refs.unlockPassword.value = deriveBookletPassword(state.data);
    refs.unlockPassword.setAttribute('data-revealed', 'true');
    refs.unlockPassword.focus();
    refs.unlockPassword.select();
    syncUnlockUi({
      visible: true,
      state: refs.unlockRow.getAttribute('data-state') || 'locked',
      label: refs.unlockLabel.textContent || 'Unlock the ending:',
      message: refs.unlockStatus.textContent || '',
      password: refs.unlockPassword.value,
      inputDisabled: refs.unlockPassword.disabled,
      buttonDisabled: refs.unlockBtn.disabled
    });
  });
  refs.encryptBtn.addEventListener('click', attemptEncrypt);
  refs.encryptDownload.addEventListener('click', downloadJson);
}

function captureRefs() {
  refs = {
    booklet: qs('booklet-container'),
    jsonInput: qs('json-input'),
    printBtn: qs('print-btn'),
    layoutMode: qs('layout-mode'),
    status: qs('status'),
    unlockRow: qs('unlock-row'),
    unlockLabel: qs('unlock-label'),
    unlockPassword: qs('unlock-password'),
    unlockBtn: qs('unlock-btn'),
    unlockRevealDemo: qs('unlock-reveal-demo'),
    unlockStatus: qs('unlock-status'),
    unlockHint: qs('unlock-hint'),
    encryptRow: qs('encrypt-row'),
    encryptPassword: qs('encrypt-password'),
    encryptBtn: qs('encrypt-btn'),
    encryptDownload: qs('encrypt-download'),
    encryptStatus: qs('encrypt-status')
  };
}

export function initRendererApp() {
  captureRefs();
  wireUi();
  watchLateFontActivity();
  const params = new URLSearchParams(window.location.search);
  const requestedMode = params.get('mode');
  if (requestedMode === 'single' || requestedMode === 'spread' || requestedMode === 'booklet') {
    state.layoutMode = requestedMode;
  }
  state.previewTarget = params.get('page') || '';
  state.reviewMode = params.get('review') === '1';
  state.authorMode = state.reviewMode || params.get('author') === '1';
  state.demoView = params.get('demoView') === '1';
  state.auditConfig = params.get('audit') === 'weekly'
    ? {
      totalWeeks: Math.max(1, parseAuditNumber(params.get('auditTotalWeeks'), 1)),
      maxFooterBottomGapPx: parseAuditNumber(params.get('auditMaxFooterGap'), 16),
      maxWorkoutSlackPx: parseAuditNumber(params.get('auditMaxWorkoutSlack'), 24),
      maxMechanicSlackPx: parseAuditNumber(params.get('auditMaxMechanicSlack'), 36),
      maxStaticContentGapPx: parseAuditNumber(params.get('auditMaxStaticGap'), 96),
      inspectPages: String(params.get('auditInspectPages') || '')
        .split(',')
        .map((value) => parseInt(value.trim(), 10))
        .filter((value) => Number.isInteger(value) && value > 0),
      staticDensityPageTypes: String(params.get('auditStaticPageTypes') || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      requiredPageTypes: String(params.get('auditRequirePageTypes') || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    }
    : null;
  document.body.setAttribute('data-review-mode', state.reviewMode ? 'true' : 'false');
  document.body.setAttribute('data-demo-view', state.demoView ? 'true' : 'false');
  syncLoadedState();
  if (state.auditConfig) {
    document.title = 'LIFTRPG_AUDIT_PENDING';
  }
  refs.layoutMode.value = state.layoutMode;
  syncLayoutMode(refs, state.layoutMode);
  refs.printBtn.disabled = true;

  if (params.get('source') === 'session') {
    const pending = sessionStorage.getItem('liftrpg_pending_json');
    sessionStorage.removeItem('liftrpg_pending_json');
    if (pending) {
      let parsed;
      try { parsed = JSON.parse(pending); } catch (e) {
        setStatus('Generated JSON was invalid — could not load.', 'error');
        return;
      }
      autoEncryptAndLoad(parsed, 'Booklet From Generator');
    } else {
      setStatus('No booklet was passed from the generator. Return home to reopen the generator, or load a saved JSON here.', 'error');
    }
    return;
  }

  state.demoMode = !!params.get('demo');
  document.body.setAttribute('data-demo-mode', state.demoMode ? 'true' : 'false');
  state.demoPasswordRevealed = false;
  if (params.get('demo')) {
    fetchDemo(params.get('demo'));
    return;
  }

  setStatus('Load a booklet JSON to preview and print.', 'neutral');
}
