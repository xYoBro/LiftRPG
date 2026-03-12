import { decryptBlob, encryptBlob } from './crypto.js';
import { qs } from './dom.js';
import { exportBookletPdf } from './pdf-export.js';
import { renderBooklet, syncLayoutMode } from './render.js';
import { normalisePassword, validateBooklet } from './utils.js';

const state = {
  data: null,
  unlockedEnding: null,
  layoutMode: 'single',
  restoreLayoutMode: null
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
}

function scrollEndingIntoView() {
  const endingPage = refs.booklet.querySelector('[data-page-type="ending-unlocked"]');
  if (!endingPage) return;
  endingPage.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
  renderCurrentBooklet();

  const hasEncryptedEnding = !!(data.meta && data.meta.passwordEncryptedEnding);
  syncUnlockUi({
    visible: hasEncryptedEnding,
    state: 'locked',
    label: 'Try decrypting the ending:',
    message: '',
    password: '',
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

  paths.forEach((path) => {
    chain = chain.catch(() => fetch(path).then((response) => {
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

  const password = normalisePassword(refs.unlockPassword.value || '');
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
    })
    .catch(() => {
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
  syncLayoutMode(refs, state.layoutMode);
  refs.printBtn.disabled = true;

  const params = new URLSearchParams(window.location.search);
  if (params.get('demo')) {
    fetchDemo(params.get('demo'));
    return;
  }

  setStatus('Load a booklet JSON to preview and print.', 'neutral');
}
