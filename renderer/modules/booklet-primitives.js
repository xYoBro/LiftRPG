import { make } from './dom.js?v=46';
import { splitRichText } from './booklet-models.js?v=46';
import { buildClockModels, buildCompanionModels } from './field-ops-models.js?v=46';
import { createBoundedPage } from './page-shell.js?v=46';
import { sanitizeHtml, sanitizeSvg } from './utils.js?v=46';
import {
  renderCipherSection,
  renderCompanionComponent,
  renderGameplayClocks,
  renderMapSection
} from './field-ops-primitives.js?v=46';
import { inferCipherFamily, inferMapFamily } from './mechanic-registry.js?v=46';

function renderCoverArt(model) {
  const source = String(model.coverArt || '').trim();
  if (!source) return null;

  const wrap = make('div', 'cover-art');
  if (/^\s*<svg[\s\S]*<\/svg>\s*$/i.test(source)) {
    const safeSvg = sanitizeSvg(source);
    if (safeSvg) {
      wrap.innerHTML = safeSvg;
    }
  } else {
    const pre = make('pre', 'cover-art-text', source);
    wrap.appendChild(pre);
  }

  if (!wrap.childNodes.length) return null;
  if (model.coverArtCaption) {
    wrap.appendChild(make('div', 'cover-art-caption', model.coverArtCaption));
  }
  return wrap;
}

function renderFragmentRefPayload(payload) {
  const refs = Array.isArray(payload.fragmentRefs)
    ? payload.fragmentRefs
    : Array.isArray(payload.refs)
      ? payload.refs
      : payload.fragmentRef
        ? [payload.fragmentRef]
        : [];
  if (!refs.length) return null;

  const wrap = make('div', 'interlude-payload interlude-fragment-refs');
  wrap.appendChild(make('div', 'doc-label', payload.title || 'Archive References'));
  const row = make('div', 'interlude-fragment-row');
  refs.forEach((ref) => {
    row.appendChild(make('div', 'cipher-reference-item', ref));
  });
  wrap.appendChild(row);
  return wrap;
}

function renderPasswordElementPayload(payload) {
  const wrap = make('div', 'interlude-payload interlude-password-element');
  wrap.appendChild(make('div', 'doc-label', payload.title || 'Password Element'));
  if (payload.instruction) {
    wrap.appendChild(make('div', 'interlude-payload-note', payload.instruction));
  }
  const row = make('div', 'password-box-row');
  const count = Math.max(1, parseInt(payload.count, 10) || String(payload.value || '').length || 5);
  for (let index = 0; index < count; index += 1) {
    const box = make('div', 'password-final-box');
    const value = String(payload.value || '');
    if (value && value[index]) {
      box.appendChild(make('span', 'password-box-hint', value[index]));
    }
    row.appendChild(box);
  }
  wrap.appendChild(row);
  return wrap;
}

function renderNarrativePayload(payload) {
  const text = payload.text || payload.body || payload.content || '';
  if (!text) return null;
  const wrap = make('div', 'interlude-payload interlude-narrative-payload');
  if (payload.title) {
    wrap.appendChild(make('div', 'doc-label', payload.title));
  }
  const body = make('div', 'interlude-payload-body');
  splitRichText(text).forEach((paragraph) => {
    body.appendChild(make('p', '', paragraph));
  });
  wrap.appendChild(body);
  return wrap;
}

function renderInterludePayload(model) {
  const payload = model.payload;
  if (!payload) return null;

  const type = String(model.payloadType || payload.type || '').trim().toLowerCase();
  if (type === 'fragment-ref' || type === 'fragment-reference') {
    return renderFragmentRefPayload(payload);
  }
  if (type === 'password-element') {
    return renderPasswordElementPayload(payload);
  }
  if (type === 'narrative') {
    return renderNarrativePayload(payload);
  }
  if (type === 'map' && payload.mapState) {
    const wrap = make('div', 'interlude-payload interlude-map-payload');
    wrap.appendChild(renderMapSection({
      ...payload.mapState,
      family: payload.mapState.family || inferMapFamily(payload.mapState.mapType || '')
    }));
    return wrap;
  }
  if (type === 'clock' && Array.isArray(payload.gameplayClocks) && payload.gameplayClocks.length) {
    const wrap = make('div', 'interlude-payload interlude-clock-payload');
    wrap.appendChild(renderGameplayClocks(buildClockModels(payload.gameplayClocks)));
    return wrap;
  }
  if (type === 'companion' && Array.isArray(payload.companionComponents) && payload.companionComponents.length) {
    const wrap = make('div', 'interlude-payload interlude-companion-payload');
    buildCompanionModels(payload.companionComponents).forEach((component) => {
      wrap.appendChild(renderCompanionComponent(component));
    });
    return wrap;
  }
  if (type === 'cipher' || payload.body || payload.workSpace || payload.referenceTargets) {
    const wrap = make('div', 'interlude-payload interlude-cipher-payload');
    wrap.appendChild(renderCipherSection({
      type: payload.type || 'interlude-cipher',
      family: payload.family || inferCipherFamily(payload.type || '') || 'text-extraction',
      title: payload.title || 'Embedded Cipher',
      sequenceText: payload.displayText || payload.sequenceText || '',
      keyText: payload.key || payload.keyText || '',
      keyRows: payload.keyRows || [],
      workSpace: payload.workSpace || null,
      workspaceStyle: payload.workspaceStyle || (payload.workSpace && payload.workSpace.style) || '',
      referenceTargets: payload.referenceTargets || [],
      extractionInstruction: payload.extractionInstruction || '',
      noticeabilityDesign: payload.noticeabilityDesign || '',
      characterDerivationProof: payload.characterDerivationProof || ''
    }));
    return wrap;
  }
  if (payload.mapState) {
    const wrap = make('div', 'interlude-payload interlude-map-payload');
    wrap.appendChild(renderMapSection({
      ...payload.mapState,
      family: payload.mapState.family || inferMapFamily(payload.mapState.mapType || '')
    }));
    return wrap;
  }
  if (Array.isArray(payload.gameplayClocks) && payload.gameplayClocks.length) {
    const wrap = make('div', 'interlude-payload interlude-clock-payload');
    wrap.appendChild(renderGameplayClocks(buildClockModels(payload.gameplayClocks)));
    return wrap;
  }
  if (Array.isArray(payload.companionComponents) && payload.companionComponents.length) {
    const wrap = make('div', 'interlude-payload interlude-companion-payload');
    buildCompanionModels(payload.companionComponents).forEach((component) => {
      wrap.appendChild(renderCompanionComponent(component));
    });
    return wrap;
  }

  return renderNarrativePayload(payload);
}

export function renderCoverPage(model) {
  const scaffold = createBoundedPage('cover', 'cover-page', { boundaryRole: 'cover' });
  const page = scaffold.page;
  const frame = scaffold.frame;
  frame.setAttribute('data-structural-resolution', model.meta.structuralShape && model.meta.structuralShape.resolution || '');

  if (model.designation) {
    frame.appendChild(make('div', 'cover-designation', model.designation));
  }

  if (model.subtitle) {
    frame.appendChild(make('div', 'cover-subtitle', model.subtitle));
  }

  const coverArt = renderCoverArt(model);
  if (coverArt) {
    frame.appendChild(coverArt);
  }

  const hero = make('div', 'cover-hero');
  hero.appendChild(make('h1', 'cover-title', model.title));
  hero.appendChild(make('p', 'cover-tagline', model.tagline));
  hero.appendChild(make('div', 'cover-rule'));
  frame.appendChild(hero);

  const colophon = make('div', 'cover-colophon');
  (model.colophonLines || []).forEach((line) => {
    colophon.appendChild(make('div', 'cover-colophon-line', line));
  });
  frame.appendChild(colophon);
  return page;
}

export function renderRulesLeftPage(model) {
  const scaffold = createBoundedPage('rules-left', 'rules-left', {
    boundaryRole: 'briefing',
    layoutVariant: model.layoutVariant || 'standard'
  });
  const page = scaffold.page;
  const frame = scaffold.frame;

  const header = make('header', 'rules-header');
  header.appendChild(make('span', '', 'Orientation'));
  header.appendChild(make('span', 'page-num', ''));
  frame.appendChild(header);

  frame.appendChild(make('h2', 'rules-title', model.title));

  const body = make('div', 'rules-body');
  (model.sections || []).forEach((section) => {
    body.appendChild(make('h3', '', section.heading || 'Procedure'));
    splitRichText(section.body || section.text).forEach((para) => {
      body.appendChild(make('p', '', para));
    });
  });

  if (model.reEntryText) {
    body.appendChild(make('h3', '', 'Re-entry Procedure'));
    splitRichText(model.reEntryText).forEach((para) => {
      body.appendChild(make('p', '', para));
    });
  }

  frame.appendChild(body);
  return page;
}

export function renderSealedPage(model) {
  const scaffold = createBoundedPage('rules-right', 'rules-right sealed-page', {
    boundaryRole: 'sealed',
    layoutVariant: model.layoutVariant || 'standard'
  });
  const page = scaffold.page;
  const frame = scaffold.frame;

  frame.appendChild(make('div', 'sealed-lock', '🔒'));
  frame.appendChild(make('div', 'sealed-title', model.title));
  const body = make('div', 'sealed-body');
  body.appendChild(make('p', '', model.body));
  frame.appendChild(body);

  return page;
}

function makePasswordBoxes(count, className) {
  const row = make('div', 'password-box-row');
  for (let i = 0; i < count; i += 1) {
    row.appendChild(make('div', className));
  }
  return row;
}

export function renderGaugeLogPage(model) {
  const scaffold = createBoundedPage('gauge-log', 'rules-right gauge-log-page', {
    boundaryRole: 'unlock',
    layoutVariant: model.layoutVariant || 'standard'
  });
  const page = scaffold.page;
  const frame = scaffold.frame;

  const header = make('header', 'rules-header');
  header.appendChild(make('span', '', model.title));
  header.appendChild(make('span', 'page-num', ''));
  frame.appendChild(header);

  if (model.instruction) {
    frame.appendChild(make('div', 'password-log-subtitle', model.instruction));
  }

  const grid = make('div', 'password-log-grid');
  (model.rows || []).forEach((rowModel) => {
    const row = make('div', 'password-log-row');
    row.appendChild(make('div', 'password-log-week', rowModel.weekLabel));
    row.appendChild(make('div', 'password-log-box'));
    row.appendChild(make('div', 'password-log-instruction', rowModel.instruction));
    grid.appendChild(row);
  });
  frame.appendChild(grid);

  const finalBlock = make('div', 'password-final');
  finalBlock.appendChild(make('div', 'password-final-label', 'Complete Password'));
  finalBlock.appendChild(makePasswordBoxes(model.passwordLength, 'password-final-box'));
  frame.appendChild(finalBlock);

  return page;
}

export function renderAssemblyPage(model) {
  const scaffold = createBoundedPage('assembly', 'password-assembly-page', {
    boundaryRole: 'unlock',
    layoutVariant: model.layoutVariant || 'standard'
  });
  const page = scaffold.page;
  const frame = scaffold.frame;

  frame.appendChild(make('h2', 'password-assembly-title', model.title));
  frame.appendChild(make('p', 'password-assembly-subtitle', model.subtitle));

  const list = make('div', 'password-assembly-grid');
  (model.rows || []).forEach((rowModel) => {
    const row = make('div', 'password-assembly-row');
    row.appendChild(make('div', 'password-assembly-week-label', rowModel.weekLabel));
    row.appendChild(make('div', 'password-assembly-cell'));
    row.appendChild(make('div', 'password-assembly-arrow', '→'));
    row.appendChild(make('div', 'password-assembly-cell'));
    list.appendChild(row);
  });
  frame.appendChild(list);

  const finalBlock = make('div', 'password-final-assembly');
  finalBlock.appendChild(make('div', 'password-final-label', 'Final Word'));
  const passwordBoxes = make('div', 'password-final-row');
  for (let i = 0; i < model.passwordLength; i += 1) {
    passwordBoxes.appendChild(make('div', 'password-final-cell'));
  }
  finalBlock.appendChild(passwordBoxes);
  frame.appendChild(finalBlock);

  return page;
}

export function renderLockedEndingPage(model) {
  const scaffold = createBoundedPage('ending-locked', 'endings-page', {
    boundaryRole: 'ending',
    layoutVariant: model.layoutVariant || 'standard'
  });
  const page = scaffold.page;
  const frame = scaffold.frame;
  frame.appendChild(make('h2', 'endings-title', model.title));

  const body = make('div', 'endings-body');
  body.appendChild(make('p', '', model.body));
  frame.appendChild(body);

  if ((model.variants || []).length) {
    const variants = make('div', 'chip-row');
    model.variants.forEach((variant) => {
      variants.appendChild(make('div', 'chip chip-muted', variant));
    });
    frame.appendChild(variants);
  }

  return page;
}

function appendFormattedBody(container, rawContent) {
  const content = String(rawContent || '').trim();
  if (!content) return;

  if (/<[a-z][\s\S]*>/i.test(content)) {
    container.innerHTML = sanitizeHtml(content);
    return;
  }

  splitRichText(content).forEach((para) => {
    container.appendChild(make('p', '', para));
  });
}

export function renderUnlockedEndingPage(model) {
  const scaffold = createBoundedPage('ending-unlocked', 'endings-page', {
    boundaryRole: 'ending',
    layoutVariant: model.layoutVariant || 'document'
  });
  const page = scaffold.page;
  const frame = scaffold.frame;
  frame.setAttribute('data-ending-treatment', model.treatment || 'default');

  if (model.kicker) frame.appendChild(make('div', 'doc-label', model.kicker));
  if (model.continuationLabel) frame.appendChild(make('div', 'doc-label continuation-label', model.continuationLabel));
  frame.appendChild(make('h2', 'endings-title', model.title));
  if (model.documentType) frame.appendChild(make('div', 'doc-label', model.documentType));

  const body = make('div', 'endings-body');
  appendFormattedBody(body, model.body);
  frame.appendChild(body);

  if (model.finalLine) {
    frame.appendChild(make('div', 'endings-final-line', model.finalLine));
  }

  return page;
}

export function renderBackCover(model) {
  const scaffold = createBoundedPage('back-cover', 'back-cover', {
    boundaryRole: 'back-cover',
    pageClass: 'page-back'
  });
  const page = scaffold.page;
  const frame = scaffold.frame;
  frame.appendChild(make('p', 'back-cover-colophon', model.colophon));
  if (model.generatedAt || model.weekCount || model.totalSessions) {
    const meta = make('div', 'back-cover-meta');
    if (model.generatedAt) meta.appendChild(make('div', '', model.generatedAt));
    if (model.weekCount || model.totalSessions) {
      meta.appendChild(make('div', '', 'Weeks ' + model.weekCount + ' · Sessions ' + model.totalSessions));
    }
    frame.appendChild(meta);
  }
  frame.appendChild(make('div', 'back-cover-mark', model.mark));
  return page;
}

export function renderNotesPage(model) {
  const scaffold = createBoundedPage('notes', 'notes-page', { boundaryRole: 'notes' });
  const page = scaffold.page;
  const frame = scaffold.frame;

  const header = make('header', 'page-header');
  header.appendChild(make('span', '', 'Field Notes'));
  header.appendChild(make('span', 'page-num', ''));
  frame.appendChild(header);

  const notes = make('div', 'notes-grid');
  for (let i = 0; i < model.cellCount; i += 1) {
    notes.appendChild(make('div', 'notes-cell'));
  }
  frame.appendChild(notes);
  return page;
}

export function renderInterludePage(model) {
  const scaffold = createBoundedPage('interlude', 'interlude-page', {
    boundaryRole: 'interlude',
    layoutVariant: model.layoutVariant || 'quiet'
  });
  const page = scaffold.page;
  const frame = scaffold.frame;
  frame.setAttribute('data-spread-aware', model.spreadAware ? 'true' : 'false');
  if (model.payloadType) {
    frame.setAttribute('data-payload-type', model.payloadType);
  }

  const header = make('header', 'page-header');
  header.appendChild(make('span', '', 'Interlude'));
  header.appendChild(make('span', 'page-num', ''));
  frame.appendChild(header);

  if (model.continuationLabel) {
    frame.appendChild(make('div', 'doc-label continuation-label', model.continuationLabel));
  }
  frame.appendChild(make('h2', 'interlude-title', model.title || 'Interlude'));
  if (model.reason) {
    frame.appendChild(make('div', 'interlude-reason', model.reason));
  }

  const body = make('div', 'interlude-body');
  splitRichText(model.body).forEach((paragraph) => {
    body.appendChild(make('p', '', paragraph));
  });
  frame.appendChild(body);

  const payload = renderInterludePayload(model);
  if (payload) {
    frame.appendChild(payload);
  }
  return page;
}
