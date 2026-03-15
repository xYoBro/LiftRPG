import { decryptBlob, encryptBlob } from './crypto.js?v=47';
import { qs } from './dom.js?v=47';
import { exportBookletPdf } from './pdf-export.js?v=47';
import { renderBooklet, syncLayoutMode } from './render.js?v=47';
import { getDemoPassword, normalisePassword, validateBooklet } from './utils.js?v=47';

const state = {
  data: null,
  unlockedEnding: null,
  layoutMode: 'single',
  restoreLayoutMode: null,
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

function isSafariBrowser() {
  return /^((?!chrome|android).)*safari/i.test(window.navigator.userAgent);
}

function waitForPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
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
  renderBooklet(refs, state.layoutMode, state.data, state.unlockedEnding, setStatus);
  publishAuditStatus();
  scrollPreviewTargetIntoView();
}

function waitForFontsReady() {
  if (!document.fonts || document.fonts.status === 'loaded') {
    return Promise.resolve();
  }
  return document.fonts.ready.catch(() => {});
}

function scheduleFontAwareRerender() {
  if (!state.data || !document.fonts || document.fonts.status === 'loaded') {
    return;
  }

  const token = Symbol('font-render');
  state.pendingFontRenderToken = token;
  setStatus('Loading booklet typography…', 'neutral');

  waitForFontsReady().then(() => {
    if (state.pendingFontRenderToken !== token || !state.data) return;
    state.pendingFontRenderToken = null;
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
  refs.unlockLabel.textContent = status && status.label ? status.label : 'Try decrypting the ending:';
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
    refs.booklet.innerHTML = '';
    refs.printBtn.disabled = true;
    refs.unlockRow.style.display = 'none';
    refs.encryptRow.style.display = 'none';
    setStatus(errors.join(' '), 'error');
    return;
  }

  state.data = data;
  state.unlockedEnding = null;
  state.demoPasswordRevealed = false;
  refs.layoutMode.value = state.layoutMode;
  renderCurrentBooklet();
  scheduleFontAwareRerender();

  const hasEncryptedEnding = !!(data.meta && data.meta.passwordEncryptedEnding);
  const hasEndings = Array.isArray(data.endings) && data.endings.length > 0;
  const demoPassword = state.demoMode && data.meta ? normalisePassword(getDemoPassword(data.meta)) : '';
  syncUnlockUi({
    visible: hasEncryptedEnding,
    state: 'locked',
    label: 'Try decrypting the ending:',
    message: '',
    password: demoPassword,
    inputDisabled: false,
    buttonDisabled: false
  });
  refs.encryptRow.style.display = data.meta && hasEndings && (!data.meta.passwordEncryptedEnding || data.meta.passwordEncryptedEnding.indexOf('PLACEHOLDER_') === 0) ? 'flex' : 'none';
  refs.encryptDownload.style.display = 'none';
  refs.encryptStatus.textContent = '';
  setStatus('Loaded ' + sourceLabel + '.', 'success');
}

function loadJsonFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function onLoad() {
    try {
      loadBooklet(JSON.parse(String(reader.result || '{}')), file.name);
    } catch (error) {
      setStatus('Invalid JSON: ' + error.message, 'error');
    }
  };
  reader.readAsText(file);
}

function candidateDemoPaths(name) {
  if (name === 'liftrpg-eastern-shore') {
    return [
      '../liftrpg-eastern-shore.json',
      '../content/liftrpg-eastern-shore.json'
    ];
  }

  return [
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
      loadBooklet(result.data, label);
    })
    .catch((error) => {
      setStatus(error.message, 'error');
    });
}

function attemptUnlock() {
  if (!state.data || !state.data.meta || !state.data.meta.passwordEncryptedEnding) {
    syncUnlockUi({
      visible: false,
      state: 'locked'
    });
    return;
  }

  const enteredPassword = normalisePassword(refs.unlockPassword.value || '');
  const demoPassword = state.demoMode && state.data.meta ? normalisePassword(getDemoPassword(state.data.meta)) : '';
  const password = enteredPassword || (state.demoMode ? demoPassword : '');
  if (!password) {
    syncUnlockUi({
      visible: true,
      state: 'error',
      label: 'Try decrypting the ending:',
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
    label: 'Try decrypting the ending:',
    message: 'Unlocking…',
    password,
    inputDisabled: false,
    buttonDisabled: true
  });
  decryptBlob(state.data.meta.passwordEncryptedEnding, password)
    .then((payload) => {
      unlockWithPayload(payload, password);
    })
    .catch(() => {
      if (state.demoMode && state.data.meta && normalisePassword(getDemoPassword(state.data.meta)) === password) {
        unlockWithPayload(state.data.endings && state.data.endings[0] ? state.data.endings[0].content : null, password);
        return;
      }

      syncUnlockUi({
        visible: true,
        state: 'error',
        label: 'Try decrypting the ending:',
        message: 'Password rejected',
        password,
        inputDisabled: false,
        buttonDisabled: false
      });
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
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: 'application/json' });
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
  refs.unlockPassword.addEventListener('click', () => {
    if (!state.demoMode || state.demoPasswordRevealed) return;
    state.demoPasswordRevealed = true;
    refs.unlockPassword.setAttribute('data-revealed', 'true');
    refs.unlockPassword.select();
  });
  refs.unlockBtn.addEventListener('click', attemptUnlock);
  refs.unlockPassword.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') attemptUnlock();
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
    unlockStatus: qs('unlock-status'),
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
  const params = new URLSearchParams(window.location.search);
  const requestedMode = params.get('mode');
  if (requestedMode === 'single' || requestedMode === 'spread' || requestedMode === 'booklet') {
    state.layoutMode = requestedMode;
  }
  state.previewTarget = params.get('page') || '';
  state.reviewMode = params.get('review') === '1';
  state.demoView = params.get('demoView') === '1';
  state.auditConfig = params.get('audit') === 'weekly'
    ? {
      totalWeeks: Math.max(1, parseAuditNumber(params.get('auditTotalWeeks'), 1)),
      maxFooterBottomGapPx: parseAuditNumber(params.get('auditMaxFooterGap'), 16),
      maxWorkoutSlackPx: parseAuditNumber(params.get('auditMaxWorkoutSlack'), 24),
      maxMechanicSlackPx: parseAuditNumber(params.get('auditMaxMechanicSlack'), 36),
      inspectPages: String(params.get('auditInspectPages') || '')
        .split(',')
        .map((value) => parseInt(value.trim(), 10))
        .filter((value) => Number.isInteger(value) && value > 0),
      requiredPageTypes: String(params.get('auditRequirePageTypes') || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    }
    : null;
  document.body.setAttribute('data-review-mode', state.reviewMode ? 'true' : 'false');
  document.body.setAttribute('data-demo-view', state.demoView ? 'true' : 'false');
  if (state.auditConfig) {
    document.title = 'LIFTRPG_AUDIT_PENDING';
  }
  refs.layoutMode.value = state.layoutMode;
  syncLayoutMode(refs, state.layoutMode);
  refs.printBtn.disabled = true;

  state.demoMode = !!params.get('demo');
  document.body.setAttribute('data-demo-mode', state.demoMode ? 'true' : 'false');
  state.demoPasswordRevealed = false;
  if (params.get('demo')) {
    fetchDemo(params.get('demo'));
    return;
  }

  setStatus('Load a booklet JSON to preview and print.', 'neutral');
}
