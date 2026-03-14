import { decryptBlob, encryptBlob } from './crypto.js?v=30';
import { qs } from './dom.js?v=30';
import { exportBookletPdf } from './pdf-export.js?v=30';
import { renderBooklet, syncLayoutMode } from './render.js?v=30';
import { getDemoPassword, normalisePassword, validateBooklet } from './utils.js?v=30';

const state = {
  data: null,
  unlockedEnding: null,
  layoutMode: 'single',
  restoreLayoutMode: null,
  demoMode: false,
  demoPasswordRevealed: false,
  previewTarget: '',
  reviewMode: false,
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

function renderCurrentBooklet() {
  if (!state.data) return;
  renderBooklet(refs, state.layoutMode, state.data, state.unlockedEnding, setStatus);
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
    ? '[data-page-index="' + target + '"]'
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
  renderCurrentBooklet();
  scheduleFontAwareRerender();

  const hasEncryptedEnding = !!(data.meta && data.meta.passwordEncryptedEnding);
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
  refs.encryptRow.style.display = data.meta && (!data.meta.passwordEncryptedEnding || data.meta.passwordEncryptedEnding.indexOf('PLACEHOLDER_') === 0) ? 'flex' : 'none';
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
      '../content/liftrpg-eastern-shore.json',
      '../liftrpg-eastern-shore.json'
    ];
  }

  return [
    '../content/' + name + '.json',
    '../' + name + '.json'
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
  document.body.setAttribute('data-review-mode', state.reviewMode ? 'true' : 'false');
  syncLayoutMode(refs, state.layoutMode);
  refs.printBtn.disabled = true;

  state.demoMode = !!params.get('demo');
  state.demoPasswordRevealed = false;
  if (params.get('demo')) {
    fetchDemo(params.get('demo'));
    return;
  }

  setStatus('Load a booklet JSON to preview and print.', 'neutral');
}
