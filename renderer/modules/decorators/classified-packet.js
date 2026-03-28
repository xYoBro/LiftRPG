/**
 * decorators/classified-packet.js — Shell decorator for classified-packet pages
 *
 * Implements mechanic-page and fragment-page decoration hooks for the
 * 'classified-packet' shell family. This is LiftRPG domain code — it knows
 * about cipher families, tracker types, document types, and board-state modes.
 *
 * Self-registers at import via registerShellDecorator().
 *
 * See docs/layer0/SHELL-DECORATOR-CONTRACT.md for the contract.
 *
 * @module decorators/classified-packet
 */

import { make } from '../dom.js';
import { registerShellDecorator } from '../shell-decorator-registry.js';

// ---------------------------------------------------------------------------
// Label / worksheet helpers (moved from page-renderer.js)
// ---------------------------------------------------------------------------

function extractPlacementLabel(placement) {
  const data = placement.atom?.data || placement.data || {};
  if (placement.type === 'cipher-panel') {
    return ((data.cipher || {}).title || data.label || 'Cipher').trim();
  }
  if (placement.type === 'oracle-table') {
    return ((data.oracle || {}).title || data.label || 'Oracle').trim();
  }
  if (placement.type === 'map-panel') {
    return ((data.map || {}).title || (data.map || {}).floorLabel || data.label || 'Topology').trim();
  }
  if (placement.type === 'tracker') {
    return (data.label || data.trackType || 'Companion').trim();
  }
  return '';
}

function resolveWorksheetLabel(companionPlacements) {
  const trackType = String((companionPlacements[0]?.atom?.data?.trackType) || '').trim().toLowerCase();
  if (trackType === 'stress-track') return 'Incident Log';
  if (trackType === 'token-sheet') return 'Clearance Notes';
  if (trackType === 'overlay-window') return 'Alignment Notes';
  if (trackType === 'usage-die') return 'Legibility Notes';
  return 'Board Notes';
}

function resolveWorksheetType(companionPlacements) {
  const trackType = String((companionPlacements[0]?.atom?.data?.trackType) || '').trim().toLowerCase();
  if (trackType === 'stress-track') return 'incident-log';
  if (trackType === 'token-sheet') return 'clearance-ledger';
  if (trackType === 'overlay-window') return 'alignment-ledger';
  return 'notes';
}

function resolveSoloSurfaceWorksheet(surfacePlacements) {
  const placement = surfacePlacements[0];
  if (!placement) return null;

  const data = placement.atom?.data || placement.data || {};
  if (placement.type === 'cipher-panel') {
    const cipher = data.cipher || {};
    const family = String(cipher.family || '').trim().toLowerCase();
    if (family === 'cross-reference' || family === 'route-tracing') {
      return { label: 'Decode Ledger', type: 'alignment-ledger', rows: 4 };
    }
    return { label: 'Decode Surface', type: 'decode-grid', rows: 5 };
  }

  if (placement.type === 'oracle-table') {
    return { label: 'Resolution Notes', type: 'notes', rows: 5 };
  }

  return null;
}

// ---------------------------------------------------------------------------
// DOM builders (moved from page-renderer.js)
// ---------------------------------------------------------------------------

function buildBoardWorksheet(label, worksheetType = 'notes', rowCount = 4) {
  const wrap = make('section', 'board-worksheet');
  wrap.setAttribute('data-worksheet-type', worksheetType);
  wrap.appendChild(make('div', 'doc-label', label));

  if (worksheetType === 'incident-log') {
    const ledger = make('div', 'board-worksheet-ledger');
    const header = make('div', 'board-ledger-row board-ledger-header');
    ['Trigger', 'Shift', 'Record'].forEach((text) => header.appendChild(make('div', 'board-ledger-cell', text)));
    ledger.appendChild(header);
    for (let index = 0; index < Math.max(3, rowCount - 1); index += 1) {
      const row = make('div', 'board-ledger-row');
      row.appendChild(make('div', 'board-ledger-cell board-ledger-cell-mark'));
      row.appendChild(make('div', 'board-ledger-cell board-ledger-cell-short'));
      row.appendChild(make('div', 'board-ledger-cell board-ledger-cell-wide'));
      ledger.appendChild(row);
    }
    wrap.appendChild(ledger);
    return wrap;
  }

  if (worksheetType === 'clearance-ledger' || worksheetType === 'alignment-ledger') {
    const ledger = make('div', 'board-worksheet-ledger');
    const header = make('div', 'board-ledger-row board-ledger-header');
    const headings = worksheetType === 'clearance-ledger'
      ? ['Tier', 'Finding', 'Filed']
      : ['Window', 'Offset', 'Result'];
    headings.forEach((text) => header.appendChild(make('div', 'board-ledger-cell', text)));
    ledger.appendChild(header);
    for (let index = 0; index < Math.max(3, rowCount - 1); index += 1) {
      const row = make('div', 'board-ledger-row');
      row.appendChild(make('div', 'board-ledger-cell board-ledger-cell-short'));
      row.appendChild(make('div', 'board-ledger-cell board-ledger-cell-wide'));
      row.appendChild(make('div', 'board-ledger-cell board-ledger-cell-mark'));
      ledger.appendChild(row);
    }
    wrap.appendChild(ledger);
    return wrap;
  }

  if (worksheetType === 'decode-grid') {
    const grid = make('div', 'board-decode-grid');
    for (let index = 0; index < 10; index += 1) {
      grid.appendChild(make('div', 'board-decode-cell'));
    }
    wrap.appendChild(grid);

    const lines = make('div', 'board-worksheet-lines');
    for (let index = 0; index < Math.max(3, rowCount - 1); index += 1) {
      lines.appendChild(make('div', 'board-worksheet-line'));
    }
    wrap.appendChild(lines);
    return wrap;
  }

  const lines = make('div', 'board-worksheet-lines');
  for (let index = 0; index < rowCount; index += 1) {
    lines.appendChild(make('div', 'board-worksheet-line'));
  }
  wrap.appendChild(lines);
  return wrap;
}

function buildMechanicBriefing(pageFacts) {
  const { shellAttrs, placements, surfacePlacements, companionPlacements, isSoloSurface, isSoloCompanion } = pageFacts;

  // Same gating logic as the original inline conditional
  if (isSoloCompanion || isSoloSurface || (surfacePlacements.length > 1 && companionPlacements.length === 0)) {
    return null;
  }

  const labels = placements
    .map((placement) => extractPlacementLabel(placement))
    .filter(Boolean)
    .slice(0, 4);
  const weekContext = pageFacts.weekContext;
  const boardMode = String(shellAttrs['board-state-mode'] || 'survey-grid').replace(/-/g, ' ');

  const box = make('section', 'ops-directive-board');
  box.appendChild(make('div', 'doc-label', 'Current Board'));
  const meta = make('div', 'ops-directive-meta');
  meta.appendChild(make('div', 'ops-directive-chip', weekContext ? ('Week ' + (weekContext.weekIndex + 1)) : 'Weekly Board'));
  meta.appendChild(make('div', 'ops-directive-chip', boardMode));
  meta.appendChild(make('div', 'ops-directive-chip', labels.length ? (labels.length + ' active surfaces') : 'Companion surface'));
  box.appendChild(meta);

  if (labels.length) {
    const list = make('div', 'ops-directive-list');
    labels.forEach((label) => {
      list.appendChild(make('div', 'ops-directive-item', label));
    });
    box.appendChild(list);
  }

  return box;
}

function buildMechanicStrip(pageFacts) {
  const { shellAttrs, placements } = pageFacts;

  const strip = make('div', 'ops-incident-strip');
  const placementTypes = new Set(placements.map((placement) => placement.type));
  const surfaceLabels = [];
  if (placementTypes.has('cipher-panel')) surfaceLabels.push('Cipher');
  if (placementTypes.has('map-panel')) surfaceLabels.push('Topology');
  if (placementTypes.has('oracle-table')) surfaceLabels.push('Oracle');
  if (placementTypes.has('tracker')) surfaceLabels.push('Companion');

  [
    'Packet',
    String(shellAttrs['board-state-mode'] || 'survey-grid').replace(/-/g, ' '),
    surfaceLabels.join(' / ') || 'Evidence Surface',
  ].forEach((value) => {
    strip.appendChild(make('div', 'ops-incident-chip', value));
  });

  return strip;
}

// ---------------------------------------------------------------------------
// Fragment helpers (moved from page-renderer.js)
// ---------------------------------------------------------------------------

function shouldUsePacketEvidenceLayout(placements) {
  if (placements.length !== 2) return false;

  return placements.every((placement) => {
    const data = placement.atom?.data || placement.data || {};
    const documentType = String(data.documentType || '').trim().toLowerCase();
    const denseTypes = new Set(['form', 'inspection', 'report', 'transcript', 'anomaly']);
    if (denseTypes.has(documentType)) return false;

    const body = String(data.bodyText || data.body || data.content || '').trim();
    const paragraphCount = body ? body.split(/\n\s*\n|\n/).filter(Boolean).length : 0;
    return body.length <= 420 && paragraphCount <= 4;
  });
}

function buildArchiveFooter(placements) {
  const footer = make('section', 'archive-footer');
  footer.appendChild(make('div', 'doc-label', 'Packet Ledger'));

  const grid = make('div', 'archive-footer-grid');
  const header = make('div', 'archive-footer-row archive-footer-row-header');
  ['Ref', 'Type', 'Checked'].forEach((text) => {
    header.appendChild(make('div', 'archive-footer-cell', text));
  });
  grid.appendChild(header);

  placements.slice(0, 3).forEach((placement) => {
    const data = placement.atom?.data || placement.data || {};
    const row = make('div', 'archive-footer-row');
    row.appendChild(make('div', 'archive-footer-cell', data.id || placement.id || 'F.--'));
    row.appendChild(make('div', 'archive-footer-cell', String(data.documentType || 'Document')));
    const mark = make('div', 'archive-footer-cell archive-footer-cell-mark');
    mark.appendChild(make('div', 'archive-footer-checkbox'));
    row.appendChild(mark);
    grid.appendChild(row);
  });

  footer.appendChild(grid);
  return footer;
}

// ---------------------------------------------------------------------------
// Decorator hooks
// ---------------------------------------------------------------------------

const classifiedPacketDecorator = {
  /**
   * Build header chrome: incident strip + optional directive briefing.
   * Appended to the frame between rp-header and rp-content.
   *
   * @param {object} pageFacts
   * @returns {DocumentFragment|null}
   */
  buildHeaderChrome(pageFacts) {
    const frag = document.createDocumentFragment();

    const strip = buildMechanicStrip(pageFacts);
    frag.appendChild(strip);

    const briefing = buildMechanicBriefing(pageFacts);
    if (briefing) {
      frag.appendChild(briefing);
    }

    return frag;
  },

  /**
   * Build a worksheet supplement for a solo-surface page
   * (exactly one mechanic surface, no companions).
   *
   * @param {object} pageFacts
   * @returns {HTMLElement|null}
   */
  buildSoloSurfaceSupplement(pageFacts) {
    const worksheet = resolveSoloSurfaceWorksheet(pageFacts.surfacePlacements);
    if (!worksheet) return null;
    return buildBoardWorksheet(worksheet.label, worksheet.type, worksheet.rows);
  },

  /**
   * Build a worksheet supplement for a companion-only page
   * (no main surfaces, exactly one companion).
   *
   * @param {object} pageFacts
   * @returns {HTMLElement|null}
   */
  buildCompanionOnlySupplement(pageFacts) {
    return buildBoardWorksheet(
      resolveWorksheetLabel(pageFacts.companionPlacements),
      resolveWorksheetType(pageFacts.companionPlacements),
      4
    );
  },

  // --- Fragment page hooks ---

  /**
   * Override fragment page layout with evidence layout when eligible.
   * Returns a DocumentFragment containing the evidence layout + archive footer,
   * or null to fall through to the default sequential rendering path.
   *
   * @param {object} fragmentFacts
   * @returns {DocumentFragment|null}
   */
  buildFragmentLayout(fragmentFacts) {
    if (!shouldUsePacketEvidenceLayout(fragmentFacts.placements)) return null;

    const { placements, renderPlacementInto } = fragmentFacts;
    const frag = document.createDocumentFragment();

    const evidenceLayout = make('div', 'fragment-evidence-layout');
    evidenceLayout.setAttribute('data-fragment-count', String(placements.length));
    placements.forEach((placement, index) => {
      const cell = make('div', index === 0 ? 'fragment-evidence-primary' : 'fragment-evidence-sidebar');
      renderPlacementInto(cell, placement);
      evidenceLayout.appendChild(cell);
    });

    frag.appendChild(evidenceLayout);
    frag.appendChild(buildArchiveFooter(placements));
    return frag;
  },

  /**
   * Return an archive footer for fragment pages with ≤ 2 fragments.
   * Called after the default sequential rendering path.
   *
   * @param {object} fragmentFacts
   * @returns {HTMLElement|null}
   */
  buildFragmentFooter(fragmentFacts) {
    if (fragmentFacts.fragmentCount > 2) return null;
    return buildArchiveFooter(fragmentFacts.placements);
  },
};

// ---------------------------------------------------------------------------
// Self-registration
// ---------------------------------------------------------------------------

registerShellDecorator('classified-packet', classifiedPacketDecorator);
