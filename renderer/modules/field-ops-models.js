import {
  deriveBookletPassword,
  getPasswordLength,
  pad2,
  sanitizeBossTextForDisplay,
  splitParagraphs
} from './utils.js?v=48';
import {
  inferCipherFamily,
  inferMapFamily
} from './mechanic-registry.js?v=48';
import { normalizeD100Language, resolveArtifactIdentity } from './booklet-models.js?v=48';
// THE FORM CHANNEL's one home for this family (ARRANGEMENT §3). No `?v=`: the
// form-metrics modules are `.mjs` so Node can import them too, and a
// cache-busted specifier would make them two modules in one runtime.
import { resolveOracleTableForm } from './form-metrics/oracle-table-forms.mjs';
import {
  VALID_EDGE_SEMANTICS,
  DEFAULT_EDGE_SEMANTICS,
  VALID_CELL_SHAPES,
  DEFAULT_CELL_SHAPE
} from '../../contracts/contract-constants.mjs';

function splitKeyRows(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s{2,}|\s*\|\s*/).map((cell) => cell.trim()).filter(Boolean));
}

function parseClockType(clockType) {
  const normalized = String(clockType || '').trim().toLowerCase();
  if (normalized === 'danger' || normalized === 'danger-clock' || normalized === 'threat') return 'danger-clock';
  if (normalized === 'race' || normalized === 'racing' || normalized === 'racing-clock') return 'racing-clock';
  if (normalized === 'tug' || normalized === 'tug-of-war' || normalized === 'tug-of-war-clock') return 'tug-of-war-clock';
  if (normalized === 'linked' || normalized === 'linked-clock') return 'linked-clock';
  if (normalized === 'project' || normalized === 'project-clock') return 'project-clock';
  return 'progress-clock';
}

function normalizeEntries(entries) {
  return (entries || []).map((entry) => ({
    roll: entry.roll || '',
    text: entry.text || '',
    paperAction: entry.paperAction || '',
    fragmentRef: entry.fragmentRef || '',
    type: entry.type || ''
  }));
}

function splitLongNarrativeParagraphs(paragraphs) {
  var head = [];
  var tail = [];

  (paragraphs || []).forEach(function (paragraph, index) {
    var text = String(paragraph || '').trim();
    if (!text) return;

    if (index > 0) {
      tail.push(text);
      return;
    }

    if (text.length <= 260) {
      head.push(text);
      return;
    }

    var sentences = text.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [text];
    var first = '';
    var remainder = [];
    sentences.forEach(function (sentence) {
      var clean = String(sentence || '').trim();
      if (!clean) return;
      if (!first) {
        first = clean;
        return;
      }
      if ((first + ' ' + clean).length <= 260) {
        first += ' ' + clean;
      } else {
        remainder.push(clean);
      }
    });

    head.push(first || text);
    if (remainder.length) tail.push(remainder.join(' '));
  });

  return {
    head: head,
    tail: tail
  };
}

function splitLongInstruction(text, maxLength) {
  var value = String(text || '').trim();
  if (!value || value.length <= maxLength) {
    return { head: value, tail: '' };
  }

  var sentences = value.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [value];
  var head = '';
  var tail = [];
  sentences.forEach(function (sentence) {
    var clean = String(sentence || '').trim();
    if (!clean) return;
    if (!head) {
      head = clean;
      return;
    }
    if ((head + ' ' + clean).length <= maxLength) {
      head += ' ' + clean;
    } else {
      tail.push(clean);
    }
  });

  return {
    head: head || value,
    tail: tail.join(' ')
  };
}

// bossEncounter.decodingKey.referenceTable is authored in several shapes, and
// every one of them has to print as a readable lookup row \u2014 the decode chain
// only closes if the player can actually run it off the page. The shapes the
// corpus and the schema carry:
//   \u2022 the canonical A1Z26 string ("1=A 2=B ...") and free-form key prose
//   \u2022 [{ value, letter }] \u2014 the canonical array row, also what migrate-1.4.mjs
//     emits from the legacy { "8": "H" } object map; may carry a `derivation`
//     gloss naming the in-world reason for the mapping
//   \u2022 [{ input, instruction }] \u2014 per-input derivation steps
//   \u2022 [{ input, nodeLabel / decodedNode, fenceEra }] \u2014 map-node decode
// They all collapse to the same printed line: key \u2192 result [gloss].
//
// The previous implementation read only the last of those four, so every
// { value, letter } row printed the literal placeholder "?  \u2192  ?  []". A row
// must never render as question marks: unrecognised rows fall back to printing
// their own scalar content, and nothing here throws on malformed input.
const DECODE_ARROW = '  \u2192  ';
const DECODE_KEY_FIELDS = ['value', 'input'];
// Order matters: `nodeLabel` before `decodedNode` keeps the map-node fixtures
// rendering the human label they already shipped with.
const DECODE_RESULT_FIELDS = ['letter', 'nodeLabel', 'decodedNode', 'instruction'];
const DECODE_NOTE_FIELDS = ['derivation', 'fenceEra'];

function decodeCellText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return '';
  return String(value).trim();
}

function pickDecodeField(row, fields) {
  for (let index = 0; index < fields.length; index += 1) {
    const text = decodeCellText(row[fields[index]]);
    if (text) return text;
  }
  return '';
}

function decodeRowLine(row) {
  if (row === null || row === undefined) return '';
  if (typeof row !== 'object') return decodeCellText(row);

  const key = pickDecodeField(row, DECODE_KEY_FIELDS);
  const result = pickDecodeField(row, DECODE_RESULT_FIELDS);
  const note = pickDecodeField(row, DECODE_NOTE_FIELDS);

  let line;
  if (key && result) {
    line = key + DECODE_ARROW + result;
  } else if (key || result) {
    line = key || result;
  } else {
    // Unknown row shape \u2014 print whatever scalar content it carries rather than
    // inventing placeholders or dropping the author's table silently.
    line = Object.keys(row).map((field) => decodeCellText(row[field])).filter(Boolean).join('  ');
  }

  if (!line) return '';
  return note && note !== line ? line + '  [' + note + ']' : line;
}

function normalizeDecodingTable(raw) {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) {
    return raw.map(decodeRowLine).filter(Boolean).join('\n');
  }
  if (typeof raw === 'object') {
    // Legacy object map { "8": "H", ... }. Schema-invalid since 1.4.0 and
    // rewritten by `npm run migrate`, but a replayed or hand-edited booklet can
    // still carry one, and "[object Object]" is not an acceptable render.
    return Object.keys(raw)
      .map((key) => {
        const value = decodeCellText(raw[key]);
        return value ? key + DECODE_ARROW + value : '';
      })
      .filter(Boolean)
      .join('\n');
  }
  return String(raw);
}

/**
 * componentInputs entries are schema-open (`componentInputs: { type: 'array' }`
 * admits any element shape) and the corpus really does author more than one:
 * strings ("CHC-7-ALPHA"), numbers (19), and objects
 * ({ weekNumber, description } — Palimpsest-House). The renderer must format
 * every authored shape into a readable line (D78/AUDIT-107: never drop or
 * mangle authored content) — an object handed raw to make() stringifies to
 * "[object Object]" on the printed boss page.
 *
 * Primitives pass verbatim. Known object shapes map their real fields to a
 * diegetic line. Unknown object shapes fall back to joining their primitive
 * field values — readable, never "[object Object]".
 */
function formatComponentInputValue(item) {
  if (item == null) return '';
  const type = typeof item;
  if (type === 'string' || type === 'number' || type === 'boolean') return String(item);
  if (Array.isArray(item)) {
    return item.map(formatComponentInputValue).filter(Boolean).join(' · ');
  }
  if (type === 'object') {
    // Corpus shape: { weekNumber, description } (Palimpsest-House) — the
    // description IS the diegetic line; weekNumber feeds the row label.
    if (typeof item.description === 'string' && item.description.trim()) {
      return item.description.trim();
    }
    // Plausible near-miss shapes: a single value-bearing field.
    for (const key of ['value', 'input', 'text', 'label']) {
      const candidate = item[key];
      if ((typeof candidate === 'string' && candidate.trim()) || typeof candidate === 'number') {
        return String(candidate).trim();
      }
    }
    // Unknown shape: surface every primitive field value in authored order.
    const parts = Object.values(item)
      .filter((v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
      .map((v) => String(v).trim())
      .filter(Boolean);
    if (parts.length) return parts.join(' — ');
    // Nothing primitive at all — last-resort readable serialization.
    try { return JSON.stringify(item); } catch (e) { return ''; }
  }
  return String(item);
}

/** Object entries may carry their own week number; honor it for the row label. */
function componentInputWeekNumber(item, index) {
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    const n = Number(item.weekNumber);
    if (Number.isFinite(n) && n >= 1) return n;
  }
  return index + 1;
}

export function buildBossPageModel(data, week, options = 'standard') {
  const boss = week.bossEncounter || {};
  const derivedPassword = deriveBookletPassword(data || {});
  const decodingKey = boss.decodingKey || {};
  const entry = options && typeof options === 'object' ? options : {};
  const requestedLayoutVariant = typeof options === 'string' ? options : (entry.layoutVariant || 'standard');
  const continuationSegment = entry.continuationSegment || 'full';
  const isContinuation = continuationSegment === 'followup';
  const artifactIdentity = resolveArtifactIdentity(data || {});
  const shellFamily = artifactIdentity.shellFamily || 'field-survey';
  const hasAppendixContent = !!(
    boss.convergenceProof
    || (boss.binaryChoiceAcknowledgement && (boss.binaryChoiceAcknowledgement.ifA || boss.binaryChoiceAcknowledgement.ifB))
  );
  // Only classified-packet shells get a separate appendix page from the
  // adapter. Every other shell must render proof + acknowledgement inline on
  // the main boss page — previously they were withheld for an appendix that
  // never existed and silently dropped (AUDIT finding 107; shipped demo).
  const hasConvergenceAppendix = shellFamily === 'classified-packet' && hasAppendixContent;
  const layoutVariant = shellFamily === 'classified-packet' && hasConvergenceAppendix
    ? 'tight'
    : requestedLayoutVariant;
  const narrativeParagraphs = splitParagraphs(sanitizeBossTextForDisplay(boss.narrative || '', derivedPassword));
  const splitNarrative = splitLongNarrativeParagraphs(narrativeParagraphs);
  const mechanismParagraphs = splitParagraphs(sanitizeBossTextForDisplay(boss.mechanismDescription || '', derivedPassword));
  const splitInstruction = splitLongInstruction(sanitizeBossTextForDisplay(decodingKey.instruction || '', derivedPassword), 170);
  const continuationAppendixParagraphs = hasConvergenceAppendix
    ? []
    : splitParagraphs(sanitizeBossTextForDisplay(boss.convergenceProof || '', derivedPassword));
  if (hasConvergenceAppendix) {
    continuationAppendixParagraphs.push.apply(continuationAppendixParagraphs, splitNarrative.tail);
    if (splitInstruction.tail) continuationAppendixParagraphs.push(splitInstruction.tail);
    continuationAppendixParagraphs.push.apply(continuationAppendixParagraphs, mechanismParagraphs.slice(1));
    continuationAppendixParagraphs.push.apply(continuationAppendixParagraphs, splitParagraphs(sanitizeBossTextForDisplay(boss.convergenceProof || '', derivedPassword)));
  }

  return {
    layoutVariant,
    artifactIdentity,
    shellFamily,
    continuationSegment,
    continuationLabel: entry.continuationLabel || '',
    weekLabel: 'Week ' + pad2(week.weekNumber),
    title: isContinuation
      ? ((boss.title || week.title || 'Convergence') + ' — Continued')
      : (boss.title || week.title || 'Convergence'),
    narrativeParagraphs: isContinuation ? [] : (hasConvergenceAppendix ? splitNarrative.head : narrativeParagraphs),
    mechanismParagraphs: isContinuation ? [] : (hasConvergenceAppendix ? mechanismParagraphs.slice(0, 1) : mechanismParagraphs),
    decodingInstruction: isContinuation ? '' : (hasConvergenceAppendix ? splitInstruction.head : (decodingKey.instruction || '')),
    decodingTable: isContinuation ? '' : normalizeDecodingTable(decodingKey.referenceTable),
    componentInputs: isContinuation ? [] : (boss.componentInputs || []).map((item, index) => ({
      weekLabel: 'W' + pad2(componentInputWeekNumber(item, index)),
      value: formatComponentInputValue(item)
    })),
    componentLabel: shellFamily === 'classified-packet' ? 'Recovered Inputs' : 'Recorded Inputs',
    convergenceLabel: shellFamily === 'classified-packet' ? 'Incident Name' : 'Final Word',
    passwordRevealInstruction: sanitizeBossTextForDisplay(
      boss.passwordRevealInstruction || 'When the final word is assembled, enter it at liftrpg.co to unlock the ending.',
      derivedPassword
    ),
    passwordLength: getPasswordLength(data, (boss.componentInputs || []).length || 6),
    convergenceProof: (!isContinuation && hasConvergenceAppendix) ? '' : sanitizeBossTextForDisplay(boss.convergenceProof || '', derivedPassword),
    convergenceProofParagraphs: isContinuation
      ? continuationAppendixParagraphs
      : (hasConvergenceAppendix
        ? []
        : splitParagraphs(sanitizeBossTextForDisplay(boss.convergenceProof || '', derivedPassword))),
    binaryChoiceAcknowledgement: isContinuation
      ? (boss.binaryChoiceAcknowledgement || null)
      : (hasConvergenceAppendix ? null : (boss.binaryChoiceAcknowledgement || null))
  };
}

export function buildCompanionModels(components) {
  return (components || []).map((component, index) => {
    const family = component.family || 'custom-companion';
    const slotCount = typeof component.slots === 'number' ? component.slots : 0;
    const rawSlots = Array.isArray(component.slots) ? component.slots : [];
    const rawTracks = Array.isArray(component.tracks) ? component.tracks : [];

    // memory-slots: generate labeled slot objects from numeric slot count
    const slots = rawSlots.length ? rawSlots
      : (family === 'memory-slots' && slotCount > 0
        ? new Array(slotCount).fill(null).map((_, i) => ({ label: 'M' + (i + 1) }))
        : rawSlots);

    // stress-track: generate a single track from numeric slot count
    const tracks = rawTracks.length ? rawTracks
      : (family === 'stress-track' && slotCount > 0
        ? [{ label: '', segments: slotCount, startValue: 0 }]
        : rawTracks);

    return {
      id: component.id || 'companion-' + index,
      type: component.type || 'custom',
      family,
      title: component.label || component.title || 'Companion Component',
      body: component.body || component.instruction || component.prompt || '',
      subtitle: component.subtitle || '',
      rows: component.rows || 0,
      cols: component.cols || 0,
      slots,
      tracks,
      slotCount,
      tokens: Array.isArray(component.tokens) ? component.tokens : [],
      conditions: Array.isArray(component.conditions) ? component.conditions : [],
      windows: Array.isArray(component.windows) ? component.windows : [],
      usageDie: component.usageDie || component.usage || '',
      // percentile-stat (schema 1.5.0) — authored, never derived here.
      statName: component.statName || '',
      weeklyValues: Array.isArray(component.weeklyValues) ? component.weeklyValues : [],
      advantageRule: component.advantageRule || '',
      playWindow: component.playWindow || 'rest',
      reminder: component.reminder || '',
      footprint: component.footprint || 'half-page',
    };
  });
}

export function buildCipherModel(cipher, weeklyComponent, mechanicProfile = null) {
  const body = cipher.body || {};
  const keyRows = splitKeyRows(body.key || '');
  const family = inferCipherFamily(cipher.type || '') || (mechanicProfile && mechanicProfile.cipherFamily) || 'none';

  return {
    type: cipher.type || '',
    family,
    title: cipher.title || 'Cipher',
    sequenceText: body.displayText || '',
    keyText: body.key || '',
    keyRows,
    workSpace: body.workSpace || null,
    workspaceStyle: body.workSpace && body.workSpace.style || '',
    referenceTargets: Array.isArray(body.referenceTargets) ? body.referenceTargets : [],
    extractionInstruction: cipher.extractionInstruction || (weeklyComponent && weeklyComponent.extractionInstruction) || 'Record the derived value.',
    noticeabilityDesign: cipher.noticeabilityDesign || '',
    characterDerivationProof: cipher.characterDerivationProof || ''
  };
}

/**
 * @param {object} oracle the week's authored oracle table
 * @param {object} [formSpec] THE FORM CHANNEL (ARRANGEMENT §3 clause 3 — one
 *   channel). `{ form, rulesPointer }`, projected out of `atom.data` by the
 *   atom so the estimate and the render read the SAME two fields. OPTIONAL:
 *   absent or malformed resolves to `bare`, which is today's exact table, so
 *   every existing caller is byte-identical without one.
 *
 *   `rulesPointer` is an AUTHORED string (the economy's own `currencyLabel`) —
 *   the model composes no teaching of its own here, because a renderer that
 *   wrote its own sentence would print the same one in every book.
 */
export function buildOracleModel(oracle, formSpec) {
  if (!oracle) return null;
  const spec = (formSpec && typeof formSpec === 'object') ? formSpec : {};
  return {
    title: oracle.title || 'Oracle',
    instruction: normalizeD100Language(oracle.instruction || ''),
    mode: oracle.mode || '',
    entries: normalizeEntries(oracle.entries),
    form: resolveOracleTableForm(spec.form),
    rulesPointer: String(spec.rulesPointer || '').trim()
  };
}

// ---------------------------------------------------------------------------
// Clock thresholds — normalisation to printable strings
// ---------------------------------------------------------------------------
/**
 * `gameplayClock.thresholds` is schema-typed `['array','object']` with NO item
 * schema (contracts/booklet-schema.mjs), and the corpus proves the LLM took the
 * invitation: across 113 authored clocks the field arrives in twelve shapes —
 * plain strings, bare segment numbers, `{value,consequence}`, `{at,effect}`
 * (the plurality), `{segment,description}`, `{value,label,consequence}`,
 * `{side,segment,consequence}`, `{atSegment,consequence}` and friends, plus
 * three clocks where `thresholds` is a bare map (`{"4":"…"}`, `{halfway:3}`).
 *
 * The renderer prints each entry with `String(entry)`. Fifty-eight of those
 * clocks would therefore have printed the literal text "[object Object]" onto
 * a page, and the three map-shaped ones would have dropped their thresholds
 * silently (the old `Array.isArray(...) ? ... : []` clause). That never
 * surfaced because until now the ONLY clock that reached paper was the
 * tidewall interlude payload, whose thresholds are plain sentences.
 *
 * So the normalisation lives here, in the model layer, where both clock call
 * sites (interlude payload, week-level clocks panel) already pass through:
 * `thresholds` leaves this function as an array of printable strings, which is
 * also what lets the clocks-panel estimate count characters against exactly the
 * strings render() will lay out.
 *
 * Strings pass through with only `.trim()`, so tidewall's render is unchanged.
 *
 * Key names are pipeline vocabulary and are never printed; only their values
 * are. The final fallback joins every primitive value an unrecognised object
 * carries — an ugly line is a bug report, "[object Object]" is a lie.
 */
const THRESHOLD_SIDE_KEYS = ['side', 'track', 'pole'];
const THRESHOLD_AT_KEYS = ['value', 'segment', 'at', 'atSegment', 'tick'];
const THRESHOLD_TEXT_KEYS = ['consequence', 'effect', 'description', 'label', 'text', 'note'];
const THRESHOLD_JOIN = ' — ';

function isPrintablePrimitive(value) {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function thresholdEntryText(entry) {
  if (entry == null) return '';
  if (isPrintablePrimitive(entry)) return String(entry).trim();
  if (Array.isArray(entry)) {
    return entry.map(thresholdEntryText).filter(Boolean).join(THRESHOLD_JOIN);
  }
  if (typeof entry !== 'object') return '';

  const parts = [];
  const claimed = new Set();
  const claimFirst = (keys) => {
    for (const key of keys) {
      if (claimed.has(key)) continue;
      if (!isPrintablePrimitive(entry[key])) continue;
      const text = String(entry[key]).trim();
      claimed.add(key);
      if (text) { parts.push(text); return; }
    }
  };
  claimFirst(THRESHOLD_SIDE_KEYS);
  claimFirst(THRESHOLD_AT_KEYS);
  for (const key of THRESHOLD_TEXT_KEYS) {
    if (claimed.has(key) || !isPrintablePrimitive(entry[key])) continue;
    const text = String(entry[key]).trim();
    claimed.add(key);
    if (text) parts.push(text);
  }
  if (parts.length) return parts.join(THRESHOLD_JOIN);

  return Object.keys(entry)
    .map((key) => entry[key])
    .filter(isPrintablePrimitive)
    .map((value) => String(value).trim())
    .filter(Boolean)
    .join(THRESHOLD_JOIN);
}

/**
 * @param {*} raw — `clock.thresholds` exactly as authored
 * @returns {string[]} printable threshold lines (never objects, never empty strings)
 */
export function normalizeClockThresholds(raw) {
  if (Array.isArray(raw)) {
    return raw.map(thresholdEntryText).filter(Boolean);
  }
  if (raw && typeof raw === 'object') {
    // Map form. The key carries the reading in both observed variants —
    // `{"4": "the screen backs up"}` (segment → consequence) and
    // `{halfway: 3}` (label → segment) — so "key — value" reads correctly
    // either way without guessing which is which.
    return Object.keys(raw)
      .map((key) => {
        const value = thresholdEntryText(raw[key]);
        const label = String(key).trim();
        if (!value) return label;
        if (!label) return value;
        return label + THRESHOLD_JOIN + value;
      })
      .filter(Boolean);
  }
  if (isPrintablePrimitive(raw)) {
    const text = String(raw).trim();
    return text ? [text] : [];
  }
  return [];
}

export function buildClockModels(clocks) {
  return (clocks || []).map((clock) => ({
    clockName: clock.clockName || 'Clock',
    segments: parseInt(clock.segments, 10) || 4,
    clockType: parseClockType(clock.clockType),
    startValue: Math.max(0, Math.min(parseInt(clock.startValue, 10) || 0, parseInt(clock.segments, 10) || 4)),
    direction: String(clock.direction || '').trim().toLowerCase() || 'fill',
    linkedClockName: clock.linkedClockName || clock.linkedTo || '',
    opposedClockName: clock.opposedClockName || clock.racingAgainst || '',
    thresholds: normalizeClockThresholds(clock.thresholds),
    consequenceOnFull: clock.consequenceOnFull || ''
  }));
}

export function buildMapModel(mapState, mechanicProfile = null) {
  if (!mapState) return null;
  const family = inferMapFamily(mapState.mapType || '') || (mechanicProfile && mechanicProfile.mapFamily) || 'none';

  return {
    family,
    artifactIdentity: mapState.artifactIdentity || null,
    mapType: mapState.mapType || 'grid',
    title: mapState.title || 'Map',
    mapNote: mapState.mapNote || '',
    floorLabel: mapState.floorLabel || '',
    gridDimensions: mapState.gridDimensions || { columns: 6, rows: 5 },
    tiles: mapState.tiles || [],
    currentPosition: mapState.currentPosition || null,
    nodes: mapState.nodes || [],
    edges: mapState.edges || [],
    currentNode: mapState.currentNode || '',
    // Variant axes. Normalized here so the renderer never re-derives them and
    // never has to defend against an unknown string: an unrecognised value
    // falls to the default, exactly like DEFAULT_WORKSPACE_STYLE does for the
    // cipher workspace — a board must still print.
    edgeSemantics: VALID_EDGE_SEMANTICS.indexOf(mapState.edgeSemantics) === -1
      ? DEFAULT_EDGE_SEMANTICS : mapState.edgeSemantics,
    cellShape: VALID_CELL_SHAPES.indexOf(mapState.cellShape) === -1
      ? DEFAULT_CELL_SHAPE : mapState.cellShape,
    // concentric: rings are ordered outermost-first and stay in authored order.
    rings: Array.isArray(mapState.rings) ? mapState.rings : [],
    currentRing: parseInt(mapState.currentRing, 10) > 0 ? parseInt(mapState.currentRing, 10) : 0,
    breachMarks: Math.max(0, parseInt(mapState.breachMarks, 10) || 0),
    // maze: corridors between nodes[].
    passages: Array.isArray(mapState.passages) ? mapState.passages : [],
    positions: mapState.positions || [],
    direction: mapState.direction || 'horizontal',
    dimensions: mapState.dimensions || { columns: 12, rows: 8 },
    prompts: mapState.prompts || [],
    seedMarkers: mapState.seedMarkers || [],
    canvasType: mapState.canvasType || 'dot-grid'
  };
}
