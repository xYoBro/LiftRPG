import { make } from './dom.js?v=48';
import { splitRichText } from './booklet-models.js?v=48';
import { buildClockModels, buildCompanionModels } from './field-ops-models.js?v=48';
import { createBoundedPage } from './page-shell.js?v=48';
import { sanitizeHtml } from './utils.js?v=48';
import {
  renderCipherSection,
  renderCompanionComponent,
  renderGameplayClocks,
  renderMapSection
} from './field-ops-primitives.js?v=48';
import { inferCipherFamily, inferMapFamily } from './mechanic-registry.js?v=48';
import { renderManifestPointer } from './document-primitives.js?v=48';

function renderClassifiedPacketCoverMeta(model) {
  const wrap = make('div', 'cover-packet-meta');
  const rows = [
    ['Packet', (model.designation || model.meta.blockTitle || 'Incident Packet').slice(0, 56)],
    ['Class', (model.artifactIdentity && model.artifactIdentity.artifactClass) || 'classified packet'],
    ['Mode', (model.artifactIdentity && model.artifactIdentity.boardStateMode) || 'survey-grid'],
  ];

  rows.forEach(([label, value]) => {
    const row = make('div', 'cover-packet-row');
    row.appendChild(make('span', 'cover-packet-label', label));
    row.appendChild(make('span', 'cover-packet-value', value));
    wrap.appendChild(row);
  });

  return wrap;
}

function renderClassifiedRulesCallout(model) {
  const wrap = make('aside', 'rules-sidecar');
  wrap.appendChild(make('div', 'doc-label', 'Packet Handling'));
  [
    'Read the procedure before opening any weekly record.',
    'Treat redactions as evidence. Do not unseal the annex until the packet ledger reconciles.',
  ].forEach((item) => {
    wrap.appendChild(make('div', 'rules-sidecar-item', item));
  });
  if (model.supportNote) {
    wrap.appendChild(make('div', 'rules-sidecar-item', model.supportNote));
  }
  return wrap;
}

function renderClassifiedSealCard(model) {
  const card = make('div', 'sealed-card');
  card.appendChild(make('div', 'sealed-card-marking', 'Sealed Material'));
  card.appendChild(make('div', 'sealed-card-title', model.title));
  card.appendChild(make('div', 'sealed-card-note', 'Open only after the packet ledger reconciles.'));
  return card;
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

/**
 * THE INTERLUDE MAP'S HEIGHT — why this is done in JS and not in a stylesheet.
 *
 * A map body is an SVG with a square viewBox and `width:100%`, so its rendered
 * HEIGHT is a function of the width it is given. In a week's field-ops page it
 * shares a half-width row and draws about 232px tall; alone on an interlude
 * page it gets the whole content column and draws ~470px. The first delivered
 * book's P.30 put a five-ring approach map under 330px of prose on a 739px
 * page and lost 304px of it off the bottom fold — the renderer's own
 * diagnostics said `w5-interlude, 303px, unresolved` and it shipped anyway
 * (D172 read, defect 1).
 *
 * The solver could not save it. The interlude atom's estimate is a flat
 * `FULL_PAGE_HEIGHT` with minHeight === preferredHeight, i.e. zero declared
 * shrink potential, and the interlude render ignores density entirely, so
 * there was no density at which the page fitted and nothing for the density
 * ladder to spend. Raising the estimate would only have moved the lie.
 *
 * `.interlude-page` is already a flex column with `overflow:hidden`, so the
 * fix is to let the payload be the flexible item it should always have been:
 * the prose takes what it needs, the diagram takes the rest, and the SVG's own
 * `preserveAspectRatio="xMidYMid meet"` scales the drawing down to fit rather
 * than running past the fold. That is not truncation (D77) — a vector diagram
 * drawn smaller loses no ink.
 *
 * The chain is set INLINE, on this payload only, rather than as a rule in
 * booklet.css, for two reasons: `min-height:0` on `.map-content` globally would
 * change every map on every week page, and an inline style is the one channel
 * that cannot disagree between the measurement harness and the render — both
 * build this exact DOM from this exact function.
 *
 * THE FLOOR IS NOT OVERRIDDEN. `.map-rings` keeps its 196px min-height (and
 * `.map-maze` its 214px): those are the pencil floors for a board the player
 * writes on, so a page with too little room left still overflows, still lands
 * in `unresolvedOverflow`, and is still reported. Crushing the writing surface
 * to make a gate green is the thing this file is not allowed to do.
 */
function makeMapPayloadFlexible(wrap, section) {
  wrap.style.flex = '1 1 auto';
  wrap.style.minHeight = '0';
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.overflow = 'hidden';

  section.style.flex = '1 1 auto';
  section.style.minHeight = '0';
  section.style.display = 'flex';
  section.style.flexDirection = 'column';

  // `.map-content` is the zone's inner column; without min-height:0 a flex item
  // refuses to shrink below its content's min-content height, which for a
  // square SVG is the full column width.
  const content = section.querySelector('.map-content');
  if (content) {
    content.style.flex = '1 1 auto';
    content.style.minHeight = '0';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
  }
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
    const section = renderMapSection({
      ...payload.mapState,
      family: payload.mapState.family || inferMapFamily(payload.mapState.mapType || '')
    });
    wrap.appendChild(section);
    return makeMapPayloadFlexible(wrap, section);
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
    const section = renderMapSection({
      ...payload.mapState,
      family: payload.mapState.family || inferMapFamily(payload.mapState.mapType || '')
    });
    wrap.appendChild(section);
    return makeMapPayloadFlexible(wrap, section);
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
  frame.setAttribute('data-shell-family', model.artifactIdentity && model.artifactIdentity.shellFamily || 'field-survey');

  if (model.designation) {
    frame.appendChild(make('div', 'cover-designation', model.designation));
  }

  if (model.subtitle) {
    frame.appendChild(make('div', 'cover-subtitle', model.subtitle));
  }

  if (model.artifactIdentity && model.artifactIdentity.shellFamily === 'classified-packet') {
    frame.appendChild(renderClassifiedPacketCoverMeta(model));
  }

  // D142 — model-drawn cover art is retired. `cover.svgArt`/`coverArtCaption`
  // are still ACCEPTED by the schema (old books validate forever) and still
  // reach the model via buildCoverPageModel; nothing draws them. The cover's
  // identity is carried entirely by type, rule and shell chrome — VISION §8.
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
  frame.setAttribute('data-shell-family', model.artifactIdentity && model.artifactIdentity.shellFamily || 'field-survey');

  const header = make('header', 'rules-header');
  header.appendChild(make('span', '', 'Orientation'));
  header.appendChild(make('span', 'page-num', ''));
  frame.appendChild(header);

  frame.appendChild(make('h2', 'rules-title', model.title));

  if (model.artifactIdentity && model.artifactIdentity.shellFamily === 'classified-packet') {
    frame.appendChild(renderClassifiedRulesCallout(model));
  }

  const body = make('div', 'rules-body');
  (model.sections || []).forEach((section) => {
    const block = make('section', 'rules-section');
    block.appendChild(make('h3', '', section.heading || 'Procedure'));
    splitRichText(section.body || section.text).forEach((para) => {
      block.appendChild(make('p', '', para));
    });
    body.appendChild(block);
  });

  if (model.reEntryText) {
    const block = make('section', 'rules-section');
    block.appendChild(make('h3', '', 'Re-entry Procedure'));
    splitRichText(model.reEntryText).forEach((para) => {
      block.appendChild(make('p', '', para));
    });
    body.appendChild(block);
  }

  if (model.supportNote && !(model.artifactIdentity && model.artifactIdentity.shellFamily === 'classified-packet')) {
    const block = make('section', 'rules-section');
    block.appendChild(make('h3', '', 'Roll Support'));
    splitRichText(model.supportNote).forEach((para) => {
      block.appendChild(make('p', '', para));
    });
    body.appendChild(block);
  }

  frame.appendChild(body);
  return page;
}

/**
 * The seal mark on the sealed page — a DRAWN lock, not an OS emoji.
 *
 * It used to be the literal character `🔒`, which the every-page read (D172,
 * P.03) caught on a letterpress binder: a colour Apple-emoji glyph, at 28pt,
 * on a monochrome page whose every other mark is a hairline rule. It is also
 * the one mark in the book whose appearance depended on the reader's operating
 * system rather than on the theme — B&W print is not negotiable here
 * (`docs/craft/VISUAL.md`: hue is never load-bearing) and an emoji font is not
 * one of the four vendored faces.
 *
 * Sized in `em` so it occupies the same 28pt box `.sealed-lock` already gave
 * the glyph (no CSS change, no measurement change), and stroked in
 * `currentColor` so it takes the archetype's ink like every other rule.
 */
function makeSealedLock() {
  const wrap = make('div', 'sealed-lock');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '1em');
  svg.setAttribute('height', '1em');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.4');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('role', 'presentation');

  // The shackle: a half-round bail rising out of the body.
  const shackle = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  shackle.setAttribute('d', 'M8 10V7a4 4 0 0 1 8 0v3');
  shackle.setAttribute('stroke-linecap', 'round');
  svg.appendChild(shackle);

  // The body, and the keyhole the player never gets a key for.
  const body = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  body.setAttribute('x', '4.5');
  body.setAttribute('y', '10');
  body.setAttribute('width', '15');
  body.setAttribute('height', '10.5');
  body.setAttribute('rx', '1.5');
  svg.appendChild(body);

  const keyhole = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  keyhole.setAttribute('cx', '12');
  keyhole.setAttribute('cy', '15.2');
  keyhole.setAttribute('r', '1.5');
  svg.appendChild(keyhole);

  wrap.appendChild(svg);
  return wrap;
}

export function renderSealedPage(model) {
  const scaffold = createBoundedPage('rules-right', 'rules-right sealed-page', {
    boundaryRole: 'sealed',
    layoutVariant: model.layoutVariant || 'standard'
  });
  const page = scaffold.page;
  const frame = scaffold.frame;
  frame.setAttribute('data-shell-family', model.artifactIdentity && model.artifactIdentity.shellFamily || 'field-survey');

  frame.appendChild(makeSealedLock());
  if (model.artifactIdentity && model.artifactIdentity.shellFamily === 'classified-packet') {
    frame.appendChild(renderClassifiedSealCard(model));
  }
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
  frame.setAttribute('data-shell-family', model.artifactIdentity && model.artifactIdentity.shellFamily || 'field-survey');

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
  finalBlock.appendChild(make('div', 'password-final-label', model.artifactIdentity && model.artifactIdentity.copy && model.artifactIdentity.copy.gaugeLabel || 'Complete Password'));
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
  frame.setAttribute('data-shell-family', model.artifactIdentity && model.artifactIdentity.shellFamily || 'field-survey');

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
  finalBlock.appendChild(make('div', 'password-final-label', model.artifactIdentity && model.artifactIdentity.copy && model.artifactIdentity.copy.finalLabel || 'Final Word'));
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
  frame.setAttribute('data-shell-family', model.artifactIdentity && model.artifactIdentity.shellFamily || 'field-survey');
  frame.appendChild(make('h2', 'endings-title', model.title));

  const body = make('div', 'endings-body');
  body.appendChild(make('p', '', model.body));
  frame.appendChild(body);

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

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * `meta.generatedAt` reaches the back cover as whatever the pipeline stamped —
 * on the first delivered book that was `2026-08-17T00:00:00Z`, printed raw in
 * the colophon of a hand-set-looking binder (D172 read, P.40). A machine
 * timestamp is the one thing on that page that could not exist inside any
 * fiction (Design Principle 1), and the seconds and the `T` carry no
 * information a reader wants.
 *
 * Typeset only the shape we can read with certainty: a leading ISO calendar
 * date. Anything else — an in-world date, a horizon, a season, an authored
 * phrase — is passed through untouched, because this field is also a place a
 * book may legitimately say "Third Horizon, year eleven".
 *
 * Parsed off the STRING, never through `new Date()`: `2026-08-17T00:00:00Z`
 * put through a local-timezone Date renders as 16 August west of Greenwich,
 * which would make the printed date differ by machine and every visual
 * baseline non-deterministic.
 */
function typesetGeneratedAt(raw) {
  const value = String(raw || '').trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ]|$)/.exec(value);
  if (!iso) return value;
  const year = Number(iso[1]);
  const month = Number(iso[2]);
  const day = Number(iso[3]);
  if (!(month >= 1 && month <= 12) || !(day >= 1 && day <= 31)) return value;
  return day + ' ' + MONTH_NAMES[month - 1] + ' ' + year;
}

export function renderBackCover(model) {
  const scaffold = createBoundedPage('back-cover', 'back-cover', {
    boundaryRole: 'back-cover',
    pageClass: 'page-back'
  });
  const page = scaffold.page;
  const frame = scaffold.frame;
  frame.setAttribute('data-shell-family', model.artifactIdentity && model.artifactIdentity.shellFamily || 'field-survey');
  frame.appendChild(make('p', 'back-cover-colophon', model.colophon));
  if (model.generatedAt || model.weekCount || model.totalSessions) {
    const meta = make('div', 'back-cover-meta');
    if (model.generatedAt) meta.appendChild(make('div', '', typesetGeneratedAt(model.generatedAt)));
    if (model.weekCount || model.totalSessions) {
      meta.appendChild(make('div', '', 'Weeks ' + model.weekCount + ' · Sessions ' + model.totalSessions));
    }
    frame.appendChild(meta);
  }
  frame.appendChild(make('div', 'back-cover-mark', model.mark));
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

  const manifest = renderManifestPointer(model.manifestPointer);
  if (manifest) frame.appendChild(manifest);

  const payload = renderInterludePayload(model);
  if (payload) {
    frame.appendChild(payload);
  }
  return page;
}
