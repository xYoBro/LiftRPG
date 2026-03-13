import { make } from './dom.js?v=21';
import { splitRichText } from './booklet-models.js?v=21';

export function renderCoverPage(model) {
  const page = make('section', 'booklet-page');
  page.setAttribute('data-page-type', 'cover');
  const frame = make('div', 'cover-page');
  frame.setAttribute('data-structural-resolution', model.meta.structuralShape && model.meta.structuralShape.resolution || '');

  if (model.designation) {
    frame.appendChild(make('div', 'cover-designation', model.designation));
  }

  if (model.subtitle) {
    frame.appendChild(make('div', 'cover-subtitle', model.subtitle));
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
  page.appendChild(frame);
  return page;
}

export function renderRulesLeftPage(model) {
  const page = make('section', 'booklet-page');
  page.setAttribute('data-page-type', 'rules-left');
  const frame = make('div', 'rules-left');
  frame.setAttribute('data-layout-variant', model.layoutVariant || 'standard');

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
  page.appendChild(frame);
  return page;
}

export function renderSealedPage(model) {
  const page = make('section', 'booklet-page');
  page.setAttribute('data-page-type', 'rules-right');
  const frame = make('div', 'rules-right sealed-page');
  frame.setAttribute('data-layout-variant', model.layoutVariant || 'standard');

  frame.appendChild(make('div', 'sealed-lock', '🔒'));
  frame.appendChild(make('div', 'sealed-title', model.title));
  const body = make('div', 'sealed-body');
  body.appendChild(make('p', '', model.body));
  frame.appendChild(body);

  page.appendChild(frame);
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
  const page = make('section', 'booklet-page');
  page.setAttribute('data-page-type', 'gauge-log');
  const frame = make('div', 'rules-right gauge-log-page');
  frame.setAttribute('data-layout-variant', model.layoutVariant || 'standard');

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

  page.appendChild(frame);
  return page;
}

export function renderAssemblyPage(model) {
  const page = make('section', 'booklet-page');
  page.setAttribute('data-page-type', 'assembly');
  const frame = make('div', 'password-assembly-page');
  frame.setAttribute('data-layout-variant', model.layoutVariant || 'standard');

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

  page.appendChild(frame);
  return page;
}

export function renderLockedEndingPage(model) {
  const page = make('section', 'booklet-page');
  page.setAttribute('data-page-type', 'ending-locked');
  const frame = make('div', 'endings-page');
  frame.setAttribute('data-layout-variant', model.layoutVariant || 'standard');
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

  page.appendChild(frame);
  return page;
}

function appendFormattedBody(container, rawContent) {
  const content = String(rawContent || '').trim();
  if (!content) return;

  if (/<[a-z][\s\S]*>/i.test(content)) {
    container.innerHTML = content;
    return;
  }

  splitRichText(content).forEach((para) => {
    container.appendChild(make('p', '', para));
  });
}

export function renderUnlockedEndingPage(model) {
  const page = make('section', 'booklet-page');
  page.setAttribute('data-page-type', 'ending-unlocked');
  const frame = make('div', 'endings-page');
  frame.setAttribute('data-ending-treatment', model.treatment || 'default');
  frame.setAttribute('data-layout-variant', model.layoutVariant || 'document');

  if (model.kicker) frame.appendChild(make('div', 'doc-label', model.kicker));
  frame.appendChild(make('h2', 'endings-title', model.title));
  if (model.documentType) frame.appendChild(make('div', 'doc-label', model.documentType));

  const body = make('div', 'endings-body');
  appendFormattedBody(body, model.body);
  frame.appendChild(body);

  if (model.finalLine) {
    frame.appendChild(make('div', 'endings-final-line', model.finalLine));
  }

  page.appendChild(frame);
  return page;
}

export function renderBackCover(model) {
  const page = make('section', 'booklet-page page-back');
  page.setAttribute('data-page-type', 'back-cover');
  const frame = make('div', 'back-cover');
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
  page.appendChild(frame);
  return page;
}

export function renderNotesPage(model) {
  const page = make('section', 'booklet-page');
  page.setAttribute('data-page-type', 'notes');
  const frame = make('div', 'notes-page');

  const header = make('header', 'page-header');
  header.appendChild(make('span', '', 'Field Notes'));
  header.appendChild(make('span', 'page-num', ''));
  frame.appendChild(header);

  const notes = make('div', 'notes-grid');
  for (let i = 0; i < model.cellCount; i += 1) {
    notes.appendChild(make('div', 'notes-cell'));
  }
  frame.appendChild(notes);
  page.appendChild(frame);
  return page;
}

export function renderInterludePage(model) {
  const page = make('section', 'booklet-page');
  page.setAttribute('data-page-type', 'interlude');
  const frame = make('div', 'interlude-page');
  frame.setAttribute('data-layout-variant', model.layoutVariant || 'quiet');
  frame.setAttribute('data-spread-aware', model.spreadAware ? 'true' : 'false');
  if (model.payloadType) {
    frame.setAttribute('data-payload-type', model.payloadType);
  }

  const header = make('header', 'page-header');
  header.appendChild(make('span', '', 'Interlude'));
  header.appendChild(make('span', 'page-num', ''));
  frame.appendChild(header);

  frame.appendChild(make('h2', 'interlude-title', model.title || 'Interlude'));
  if (model.reason) {
    frame.appendChild(make('div', 'interlude-reason', model.reason));
  }

  const body = make('div', 'interlude-body');
  splitRichText(model.body).forEach((paragraph) => {
    body.appendChild(make('p', '', paragraph));
  });
  frame.appendChild(body);
  page.appendChild(frame);
  return page;
}
