// quality.js — Quality gate and reporting functions
// Deterministic post-generation analysis: scores, warnings, weak-spot flags.
// Does NOT modify the booklet. Stored on window.LiftRPGAPI.lastQualityReport after each call.

import {
  VALID_MAP_TYPES, VALID_COMPANION_TYPES, DEMOTED_COMPANION_TYPES, readPipelineDebris,
  // The two-source law's table and readers (VISION §11). The referee asks the
  // SAME die the prompt handed out and the floor checked — one home, three
  // consumers — which is what lets it audit a finished book from the seed
  // recorded on it rather than from anything it had to be told.
  IDENTITY_AXES, drawSeedAssignments, readAxisValue, familyRefusesGeometry,
  // The prose caps and the report-class lens over them (VISION §8, the depth
  // wave). The caps have one home; this file never restates a number, it only
  // measures against them.
  OUTPUT_BUDGETS, PAGE_FILL_THIN_RATIO
} from './constants.js';
import { normalizeId, normalizeThemeArchetype } from './assembly.js';
import { validateAssembledBooklet, extractRosterNouns } from './validation.js';
import { buildMapEvolutionFingerprint, looksLikeFragmentRef } from './fingerprint.js';

// ── Motif cross-registration (W4b · FUSION §6's V/B promotion) ──────────────
// FUSION §6 has carried this as *not landed* since it was written: "motif
// cross-registration as a machine check (V/B someday: a declared motif
// greppable on both sides)." This is the measurement half. It stays WARN-class
// and feeds the critic as evidence, because the gate has not earned itself yet
// — the evidence is what earns it, which is this project's standing rule for
// when a floor becomes blocking.
//
// WHAT COUNTS AS "DECLARED", stated plainly because it is a compromise. The
// assembled booklet carries no motif list: `designLedger.motifPayoffs` is a
// CAMPAIGN-PLAN artifact and does not survive into the book. The only declared
// recurring-object surface that does survive is the Core Noun Roster in
// `meta.worldContract` — a superset of the motifs, which makes this measurement
// generous rather than strict, and generous in the safe direction: it can miss
// a motif the roster omits, and it cannot invent one.
//
// THE TWO SIDES. A roster noun that appears only in prose is decoration; one
// that appears only on a mechanical surface is furniture with no story attached.
// The finding is the noun that lives on exactly one side — never the noun that
// lives on neither, which is the dead-noun sweep collectNounRosterFindings
// already owns and which this must not duplicate.
var MOTIF_MIN_ROSTER = 3;

function motifNeedle(noun) {
  return String(noun || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function motifHit(needle, text) {
  if (!needle) return false;
  var hay = ' ' + String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
  return hay.indexOf(' ' + needle) !== -1;
}

/**
 * collectMotifCrossRegistrationFindings(booklet) -> string[]
 *
 * Report-only. One line per motif that reaches only one side of the seam.
 */
export function collectMotifCrossRegistrationFindings(booklet) {
  var findings = [];
  var wc = booklet && booklet.meta && booklet.meta.worldContract;
  if (!wc || typeof wc !== 'string') return findings;
  var roster = extractRosterNouns(wc);
  if (roster.length < MOTIF_MIN_ROSTER) return findings;  // absence is collectNounRosterFindings' finding

  var mechanical = [];
  var prose = [];
  (booklet.weeks || []).forEach(function (week) {
    var w = week || {};
    var fo = w.fieldOps || {};
    // MECHANICAL SURFACES: the labels a pencil interacts with.
    (w.gameplayClocks || []).forEach(function (c) { mechanical.push((c || {}).clockName); });
    (w.sessions || []).forEach(function (s) {
      (((s || {}).markStrip || {}).targets || []).forEach(function (t) { mechanical.push((t || {}).label); });
    });
    if (w.reckoning) {
      mechanical.push((w.reckoning.sink || {}).ref);
      mechanical.push((w.reckoning.sink || {}).instruction);
      mechanical.push(w.reckoning.conversion);
    }
    if (w.doorChoice) {
      mechanical.push((w.doorChoice.optionA || {}).label);
      mechanical.push((w.doorChoice.optionB || {}).label);
      mechanical.push(w.doorChoice.label);
    }
    var mapState = fo.mapState || {};
    mechanical.push(mapState.title);
    (mapState.nodes || []).forEach(function (n) { mechanical.push((n || {}).label); });
    (mapState.tiles || []).forEach(function (t) { mechanical.push((t || {}).label); });
    (fo.companionComponents || []).forEach(function (c) {
      mechanical.push((c || {}).title); mechanical.push((c || {}).statName);
    });
    if (fo.cipher) mechanical.push(fo.cipher.title);
    ((fo.oracleTable || {}).entries || []).forEach(function (e) { mechanical.push((e || {}).text); });

    // PROSE SURFACES: the sentences the reader reads.
    prose.push((w.epigraph || {}).text);
    prose.push(w.title);
    (w.sessions || []).forEach(function (s) {
      prose.push((s || {}).storyPrompt);
      prose.push(((s || {}).returnBeat || {}).closingLine);
      prose.push(((s || {}).returnBeat || {}).openingEcho);
    });
    prose.push((w.interlude || {}).body);
    prose.push((w.bossEncounter || {}).narrative);
  });
  (booklet.fragments || []).forEach(function (f) {
    prose.push((f || {}).content);
    prose.push((f || {}).title);
  });
  (booklet.endings || []).forEach(function (e) { prose.push(((e || {}).content || {}).body); });

  var mechanicalText = mechanical.filter(Boolean).join(' · ');
  var proseText = prose.filter(Boolean).join(' · ');

  roster.forEach(function (noun) {
    var needle = motifNeedle(noun);
    if (!needle || needle.length < 3) return;
    var onMech = motifHit(needle, mechanicalText);
    var onProse = motifHit(needle, proseText);
    if (onMech === onProse) return;   // both sides (good) or neither (the dead-noun sweep's finding)
    findings.push('Motif cross-registration: "' + noun + '" appears only '
      + (onProse ? 'in PROSE — no clock, strip label, map region, companion, door, cipher or oracle'
        + ' entry is named for it, so the world says it matters and the pencil never touches it'
        : 'on a MECHANICAL surface — no story prompt, epigraph, fragment, interlude or ending'
        + ' mentions it, so the player marks a thing the book never explains'));
  });
  return findings;
}

export function extractWeekCompanionTypes(week) {
  return ((((week || {}).fieldOps || {}).companionComponents) || [])
    .map(function (component) { return String((component || {}).type || '').trim(); })
    .filter(Boolean)
    .sort();
}

/**
 * Demoted companion surfaces reaching a freshly generated booklet (D122(c)).
 *
 * The pencil-only law took `token-sheet` and `overlay-window` off every
 * generation menu, and validate.mjs keeps them off. What no prompt edit can
 * reach is a REPLAYED prompt: the paste path hands a human a block of text, and
 * a prompt saved before the ruling still offers both types. The schema accepts
 * them — that is the whole point of demoting rather than removing — so this
 * must never block or score. It reports, once per occurrence, into
 * `report.warnings`, which `buildQualityGate()` does not read.
 *
 * Deliberately NOT a weakSpot: weakSpot areas carry a blocking policy and feed
 * findings counters that move the identity-variation score. A legacy-vocabulary
 * notice is neither a quality defect nor a blocker.
 */
export function collectDemotedCompanionFindings(booklet) {
  var findings = [];
  if (!booklet || !Array.isArray(booklet.weeks)) return findings;

  booklet.weeks.forEach(function (week, index) {
    var label = 'Week ' + ((week && week.weekNumber) || index + 1);
    var pools = [
      { where: 'fieldOps', list: ((week || {}).fieldOps || {}).companionComponents },
      { where: 'interlude payload', list: (((week || {}).interlude || {}).payload || {}).companionComponents }
    ];
    pools.forEach(function (pool) {
      if (!Array.isArray(pool.list)) return;
      pool.list.forEach(function (component) {
        var type = String((component || {}).type || '').trim();
        if (DEMOTED_COMPANION_TYPES.indexOf(type) === -1) return;
        findings.push(label + ' ' + pool.where + ' uses companion type "' + type +
          '" — demoted from the generation menus by the pencil-only law (D122c). ' +
          'It still validates and renders; a fresh run producing one means a ' +
          'pre-ruling prompt was replayed. Regenerate the prompt to get the current menu.');
      });
    });
  });
  return findings;
}

function findBossPasswordSpoiler(boss) {
  if (!boss || typeof boss !== 'object') return '';
  var texts = [
    boss.narrative,
    boss.mechanismDescription,
    boss.convergenceProof,
    boss.passwordRevealInstruction
  ].filter(Boolean).map(function (value) { return String(value); });

  for (var i = 0; i < texts.length; i++) {
    var text = texts[i];
    var explicit = text.match(/enter this password,\s*['"]?([A-Z0-9-]{3,16})['"]?/i);
    if (explicit && explicit[1]) return explicit[1].toUpperCase();
  }

  if (boss.passwordRevealInstruction) {
    var quoted = String(boss.passwordRevealInstruction).match(/['"]([A-Z0-9-]{3,16})['"]/);
    if (quoted && quoted[1]) return quoted[1].toUpperCase();
  }
  return '';
}

export function collectIdentityVariationFindings(booklet, nonBossWeeks, fragments, report) {
  var findings = 0;
  var meta = (booklet || {}).meta || {};
  var artifactIdentity = meta.artifactIdentity || {};

  var docTypeCounts = {};
  fragments.forEach(function (fragment) {
    var type = String((fragment || {}).documentType || '').trim().toLowerCase();
    if (!type) return;
    docTypeCounts[type] = (docTypeCounts[type] || 0) + 1;
  });
  var dominantDocType = '';
  var dominantDocCount = 0;
  Object.keys(docTypeCounts).forEach(function (type) {
    if (docTypeCounts[type] > dominantDocCount) {
      dominantDocType = type;
      dominantDocCount = docTypeCounts[type];
    }
  });
  if (dominantDocType && fragments.length >= 6 && dominantDocCount / fragments.length >= 0.5) {
    report.weakSpots.push({
      area: 'artifact-monoculture',
      detail: '"' + dominantDocType + '" accounts for ' + dominantDocCount + ' of ' + fragments.length + ' fragments',
      severity: 'high'
    });
    findings++;
  }

  var mapTypes = {};
  nonBossWeeks.forEach(function (week) {
    var mapType = String((((week || {}).fieldOps || {}).mapState || {}).mapType || 'grid');
    mapTypes[mapType] = true;
  });
  if (nonBossWeeks.length >= 4 && Object.keys(mapTypes).length < 2) {
    // Check whether the declared planning contract expects a stable map grammar.
    // If so, repeated map type is correct, not a failure.
    var intent = meta.artifactIntent || {};
    var declaredGrammar = String(intent.mechanicGrammarFamily || '').toLowerCase();
    var declaredBoard = String(artifactIdentity.boardStateMode || '').toLowerCase();
    var soleMapType = Object.keys(mapTypes)[0];

    // Grammars/board-state modes that inherently use a single map type.
    // Deliberately PARTIAL — only families with one stable expected map type
    // appear. Keys are drawn from VALID_MECHANIC_GRAMMAR_FAMILIES +
    // VALID_BOARD_STATE_MODES (contracts/contract-constants.mjs); validate.mjs
    // asserts the subset, never full coverage.
    // Deliberately PARTIAL (validate.mjs asserts subset, not coverage): a row
    // here suppresses the board-monotony finding, so it may only name a family
    // whose single map type is inherent rather than merely likely. Of Wave 2's
    // eight new families only two qualify — a loyalty web IS a node-link
    // diagram and a pursuit IS a line — and the other six can legitimately
    // vary their geometry, which means a monotonous board in one of them is
    // still worth reporting.
    // Values are LISTS because Wave 3 gave two families a second inherent
    // geometry: a pursuit is a line or a labyrinth, and a siege is rings (which
    // is the whole reason concentric was built). A one-value table would have
    // reported every maze-boarded evasion book as monotonous.
    var STABLE_MAP_GRAMMARS = {
      'survey-grid': ['grid'],
      'ledger-board': ['grid'],
      'timeline-reconstruction': ['linear-track'],
      'route-tracker': ['linear-track'],
      'node-graph': ['point-to-point'],
      'loyalty-web': ['point-to-point'],
      evasion: ['linear-track', 'maze'],
      siege: ['concentric']
    };

    var expectedByGrammar = STABLE_MAP_GRAMMARS[declaredGrammar];
    var expectedByBoard = STABLE_MAP_GRAMMARS[declaredBoard];
    var suppressed = (expectedByGrammar && expectedByGrammar.indexOf(soleMapType) !== -1) ||
                     (expectedByBoard && expectedByBoard.indexOf(soleMapType) !== -1);

    if (!suppressed) {
      report.weakSpots.push({
        area: 'board-monotony',
        detail: 'All non-boss weeks use the same mapState.mapType "' + soleMapType + '"',
        severity: 'high'
      });
      findings++;
    }
  }

  var companionSignatures = {};
  nonBossWeeks.forEach(function (week) {
    var signature = extractWeekCompanionTypes(week).join('|') || 'none';
    companionSignatures[signature] = true;
  });
  if (nonBossWeeks.length >= 4 && Object.keys(companionSignatures).length < 2) {
    report.weakSpots.push({
      area: 'companion-sameness',
      detail: 'Companion component loadout repeats across every non-boss week',
      severity: 'medium'
    });
    findings++;
  }

  // Core identity fields the skeleton always provides — missing these is a real undercommitment.
  // Optional creative fields (openingMode, rulesDeliveryMode, unlockLogic) are not required.
  if (!artifactIdentity.artifactClass && !artifactIdentity.shellFamily) {
    report.weakSpots.push({
      area: 'identity-undercommitment',
      detail: 'artifactIdentity is missing core identity fields (artifactClass, shellFamily)',
      severity: 'high'
    });
    findings++;
  } else if (!artifactIdentity.artifactClass || !artifactIdentity.shellFamily) {
    report.weakSpots.push({
      area: 'identity-undercommitment',
      detail: 'artifactIdentity has partial core identity (' +
        (artifactIdentity.artifactClass ? 'artifactClass present' : 'artifactClass missing') + ', ' +
        (artifactIdentity.shellFamily ? 'shellFamily present' : 'shellFamily missing') + ')',
      severity: 'medium'
    });
    findings++;
  }

  return findings;
}

// ── THE FOURTH REFEREE: the defaults audit (VISION §10.4 / §11, D146) ───────
// "Every identity choice is audited for its source under the two-source law.
// A choice that is neither brief-funded nor seed-assigned is a default, and
// defaults are findings — attached to the report under the severity doctrine
// (D19), the way a below-threshold critique ships attached rather than
// blocking." — VISION §10, ratified 2026-08-13.
//
// DETERMINISTIC, NO MODEL, and that is the seat rather than a cost saving. The
// other three referees read prose and need judgment; this one asks a question
// with an arithmetic answer — did this value come from the die, from the brief,
// or from nowhere? — and a model asked it would produce a plausible opinion
// where a scan produces a fact. It is also why it can run on a finished book
// with nothing but the book: the seed rides `_x.divergenceSeed`, the draw is a
// pure function of the seed, so the assignments are RECOVERABLE rather than
// remembered.
//
// REPORT-CLASS, per D19. The obedience floor already blocks the two compiler
// gates where a default is cheap to fix; by the time a booklet is assembled the
// same finding costs a whole book, and a critic that blocks delivery is the one
// thing the severity doctrine forbids. What this adds is the audit no gate can
// give: the geometry (whose blocking floor would be unanswerable at the stage
// that could catch it — see seedObedienceFloorErrors' header), every axis at
// once, and the book-level count a reader can act on.
//
// SKIP WITH A REASON, never a silent pass (D134's law). A book with no recorded
// seed cannot be audited under a law that did not exist when it was written,
// and "no findings" would be indistinguishable from "audited and clean" — which
// is the exact failure a skipped conductor pass would have been.
var IDENTITY_SOURCE_LABELS = {
  'seed-assigned': 'seed-assigned',
  'brief-funded': 'brief-funded',
  'family-decided': 'family-decided',
  'not-delivered': 'not-delivered',
  'DEFAULT': 'DEFAULT'
};

function evidenceAt(booklet, dotPath) {
  var parts = String(dotPath || '').split('.');
  var node = booklet;
  for (var i = 0; i < parts.length; i++) {
    if (!node || typeof node !== 'object') return '';
    node = node[parts[i]];
  }
  return typeof node === 'string' ? node : '';
}

function citationNames(evidence, value) {
  var text = String(evidence || '').toLowerCase();
  var needle = String(value || '').trim().toLowerCase();
  if (!text || !needle) return false;
  return text.indexOf(needle) !== -1 || text.indexOf(needle.replace(/-/g, ' ')) !== -1;
}

export function auditIdentitySources(booklet) {
  var seed = (booklet && booklet._x && booklet._x.divergenceSeed) || null;
  var seedValue = seed && seed.value;
  if (!seedValue) {
    return {
      skipped: seed
        ? 'the recorded divergence seed carries no `value` — this book predates the two-source '
          + 'law (VISION §11), so its identity choices cannot be traced to a die that was never rolled'
        : 'no divergence seed is recorded on this booklet (`_x.divergenceSeed`), so there are no '
          + 'assignments to audit against — a book written before every book drew a seed',
      seedValue: '',
      axes: [],
      defaults: []
    };
  }
  var assignments = drawSeedAssignments(seedValue);
  var family = String(((((booklet || {}).meta || {}).artifactIntent || {}).mechanicGrammarFamily) || '').trim();
  var axes = [];
  var defaults = [];

  for (var i = 0; i < IDENTITY_AXES.length; i++) {
    var axis = IDENTITY_AXES[i];
    var assigned = assignments[axis.id];
    var delivered = readAxisValue(booklet, axis);
    var row = {
      axis: axis.id,
      label: axis.label,
      assigned: assigned,
      delivered: Array.isArray(delivered) ? delivered.slice() : delivered,
      source: 'not-delivered',
      evidence: ''
    };
    if (delivered === undefined) {
      row.note = 'the book does not declare this axis, so it was never chosen — absence is a '
        + 'different finding from a default and belongs to the floor that owns presence';
      axes.push(row);
      continue;
    }
    var chosen = Array.isArray(delivered) ? delivered : [delivered];
    var obeyed = chosen.some(function (value) {
      return String(value || '').trim().toLowerCase() === String(assigned).toLowerCase();
    });
    if (obeyed) {
      row.source = 'seed-assigned';
      axes.push(row);
      continue;
    }
    var evidence = evidenceAt(booklet, axis.evidencePath);
    var funded = chosen.some(function (value) { return citationNames(evidence, value); });
    if (funded) {
      row.source = 'brief-funded';
      row.evidence = evidence;
      axes.push(row);
      continue;
    }
    // The geometry's one licensed departure (D144 W-2, made answerable in
    // contract-constants). Funded by the family axis, which is itself audited
    // on this same table — so it is a citation with a different signature, not
    // a third source.
    //
    // BOTH HALVES, as of D170. The exemption is "the family DECIDES the board",
    // and until now this asked only whether the family refuses the ASSIGNED
    // geometry — which licensed the departure and said nothing about where it
    // landed. The first completed book departed from an assignment its declared
    // family refuses and took a geometry that same family also refuses, and was
    // classified `family-decided`: a clean bill for a board no family chose.
    // A family that decides has to have decided ON something, so the delivered
    // geometry must be one its own Serves row names.
    if (axis.familyDecides && familyRefusesGeometry(family, assigned)) {
      var landed = chosen.filter(function (value) {
        return !familyRefusesGeometry(family, value);
      });
      if (landed.length) {
        row.source = 'family-decided';
        row.evidence = 'mechanicGrammarFamily `' + family + '` is not served by `' + assigned
          + '` and is served by `' + landed.join('`, `') + '`';
        axes.push(row);
        continue;
      }
      row.source = 'DEFAULT';
      row.note = 'the family `' + family + '` refuses the assigned `' + assigned
        + '` AND refuses what this book took instead — the exemption licences leaving the '
        + 'assignment, never landing anywhere; a board no declared family serves was chosen by '
        + 'neither the die, the brief, nor the family';
      axes.push(row);
      defaults.push(row);
      continue;
    }
    row.source = 'DEFAULT';
    // FLOOR-ROLE AXES ARE REPORTED AS FLOORS, NOT AS IDENTITY (directive 9,
    // 2026-08-17). Since the composition amendment the archetype is a
    // legibility and print-safety BASELINE, not a register the book expresses
    // itself in — ARRANGEMENT.md's "layout IS the identity". Calling an
    // uncited archetype "an identity default" told the reader the book failed
    // to have a personality, when what actually happened is that it took the
    // safe floor without saying why. Different sentence, different repair.
    //
    // Still a finding, and still the same finding severity: it lands in
    // `defaults` exactly as before, so the count, the report and D19's
    // report-class ruling are all untouched. Only the words change.
    row.role = axis.role || 'identity';
    row.note = axis.role === 'floor'
      ? 'the floor was taken without a citation — neither the die nor the brief put this here, '
        + 'and a floor chosen silently is still a choice nobody recorded'
      : 'neither the die nor the brief put this here';
    axes.push(row);
    defaults.push(row);
  }

  return { skipped: null, seedValue: seedValue, axes: axes, defaults: defaults };
}

/**
 * collectIdentitySourceFindings(booklet, report) -> finding count
 *
 * The referee's report surface. Findings are WARNINGS by construction — they
 * are never pushed into weakSpots, so `QUALITY_BLOCKING_AREAS` can never be
 * taught to block on them by accident.
 */
export function collectIdentitySourceFindings(booklet, report) {
  var audit = auditIdentitySources(booklet);
  report.identitySources = audit;
  if (audit.skipped) {
    report.warnings.push('Identity sources: SKIPPED — ' + audit.skipped);
    return 0;
  }
  var counts = {};
  audit.axes.forEach(function (row) {
    counts[row.source] = (counts[row.source] || 0) + 1;
  });
  report.warnings.push('Identity sources (seed `' + audit.seedValue.slice(0, 8) + '…`): '
    + Object.keys(IDENTITY_SOURCE_LABELS)
      .filter(function (key) { return counts[key]; })
      .map(function (key) { return counts[key] + ' ' + IDENTITY_SOURCE_LABELS[key]; })
      .join(', ') + '.');
  audit.defaults.forEach(function (row) {
    var evidencePath = IDENTITY_AXES
      .filter(function (axis) { return axis.id === row.axis; })
      .map(function (axis) { return axis.evidencePath; })[0];
    // Two sentences for two kinds of axis (directive 9). A floor taken without
    // a citation is not a book with no identity — it is a book that inherited
    // the safe baseline and never said so. Reporting both as "identity DEFAULT"
    // sent a reader looking for a personality problem in the one axis that is
    // no longer where personality lives.
    if (row.role === 'floor') {
      report.warnings.push('Identity FLOOR chosen without citation: ' + row.label + ' is `'
        + (Array.isArray(row.delivered) ? row.delivered.join('`, `') : row.delivered)
        + '`, the system assigned `' + row.assigned + '`, and `' + evidencePath
        + '` names neither. This axis is a legibility and print-safety FLOOR rather than a '
        + 'register the book expresses itself in (layout is the identity) — so the finding is '
        + 'that the baseline was inherited silently, not that the book has no character.');
      return;
    }
    report.warnings.push('Identity source DEFAULT: ' + row.label + ' is `'
      + (Array.isArray(row.delivered) ? row.delivered.join('`, `') : row.delivered)
      + '`, the system assigned `' + row.assigned + '`, and `' + evidencePath
      + '` names neither — under the two-source law (VISION §11) a choice that is neither '
      + 'brief-funded nor seed-assigned is a default, and defaults are findings.');
  });
  return audit.defaults.length;
}

// ── The page-fill report (VISION §8's density law; the depth wave) ──────────
// The depth wave raised three prose caps because the surfaces they govern were
// printing half-empty pages. A raised cap is a PERMISSION, not an outcome: the
// model may take it or leave it, and the difference is invisible until someone
// measures. This is the measurement.
//
// WHAT IT MEASURES, and what it deliberately does not. It reads authored
// character counts against the caps in OUTPUT_BUDGETS — the caps that were
// themselves derived from page geometry, so a surface at 95% of its budget is a
// surface filling the page its budget was cut from. It does NOT measure pixels:
// that needs a DOM, and the instrument for it is the browser-side overflow scan
// (element-overflow-scan.mjs). Naming it page fill is a claim about what the
// number is FOR, not about what it touched.
//
// REPORT-CLASS BY CONSTRUCTION, the D149 discipline: findings go into
// `report.warnings` and `report.pageFill` and never into `weakSpots`, so
// QUALITY_BLOCKING_AREAS cannot be taught to block on them by accident. The
// density law is a direction to travel, not a bar to clear — a brief that wants
// a spare, white book is a legitimate book, and a gate here would forbid it.
//
// SKIP WITH A REASON, never a silent zero (D134's law). A book with no
// interludes has no interlude fill, and reporting that as 0% would read as the
// worst possible result for a surface that was never in play.
var PAGE_FILL_SURFACES = [
  { id: 'storyPrompt', label: 'session prompts', cap: 'storyPrompt' },
  { id: 'fragmentBody', label: 'found documents', cap: 'fragmentBody' },
  { id: 'interludeBody', label: 'interludes', cap: 'interludeBody' },
  { id: 'endingBody', label: 'endings', cap: 'endingBody' }
];

/** Authored lengths for one surface family, in printed order. */
function pageFillLengths(booklet, id) {
  var lengths = [];
  var weeks = (booklet && booklet.weeks) || [];
  if (id === 'storyPrompt') {
    weeks.forEach(function (week) {
      ((week && week.sessions) || []).forEach(function (session) {
        var text = String((session && session.storyPrompt) || '').trim();
        if (text) lengths.push(text.length);
      });
    });
  } else if (id === 'interludeBody') {
    weeks.forEach(function (week) {
      var body = String(((week && week.interlude) || {}).body || '').trim();
      if (body) lengths.push(body.length);
    });
  } else if (id === 'fragmentBody') {
    ((booklet && booklet.fragments) || []).forEach(function (fragment) {
      var raw = fragment && (fragment.content || fragment.body);
      var text = String(typeof raw === 'string' ? raw : ((raw || {}).html || '')).trim();
      if (text) lengths.push(text.length);
    });
  } else if (id === 'endingBody') {
    ((booklet && booklet.endings) || []).forEach(function (ending) {
      var text = String((((ending || {}).content) || {}).body || '').trim();
      if (text) lengths.push(text.length);
    });
  }
  return lengths;
}

/**
 * auditPageFill(booklet) -> { surfaces: [...], thin: [...] }
 *
 * One row per budgeted prose surface: how many the book printed, the mean and
 * the longest, and what fraction of the surface's budget that mean represents.
 * Rows with nothing to measure carry `skipped` and a reason instead of a ratio.
 */
export function auditPageFill(booklet) {
  var surfaces = [];
  var thin = [];

  PAGE_FILL_SURFACES.forEach(function (surface) {
    var cap = OUTPUT_BUDGETS[surface.cap];
    var lengths = pageFillLengths(booklet, surface.id);
    if (!lengths.length) {
      surfaces.push({
        id: surface.id, label: surface.label, cap: cap, count: 0,
        skipped: 'this book prints none — a surface that was never in play has no fill to report'
      });
      return;
    }
    var total = lengths.reduce(function (sum, n) { return sum + n; }, 0);
    var mean = Math.round(total / lengths.length);
    var row = {
      id: surface.id, label: surface.label, cap: cap, count: lengths.length,
      mean: mean, longest: Math.max.apply(null, lengths),
      shortest: Math.min.apply(null, lengths),
      fill: cap > 0 ? Math.round((mean / cap) * 100) / 100 : 0,
      skipped: null
    };
    surfaces.push(row);
    if (row.fill < PAGE_FILL_THIN_RATIO) thin.push(row);
  });

  return { surfaces: surfaces, thin: thin };
}

/**
 * collectPageFillFindings(booklet, report) -> thin-surface count
 *
 * The report surface. Warnings only, by construction — see the header.
 */
export function collectPageFillFindings(booklet, report) {
  var audit = auditPageFill(booklet);
  report.pageFill = audit;

  var measured = audit.surfaces.filter(function (row) { return !row.skipped; });
  if (!measured.length) {
    report.warnings.push('Page fill: SKIPPED — this book prints none of the budgeted prose surfaces');
    return 0;
  }
  report.warnings.push('Page fill: ' + measured.map(function (row) {
    return row.label + ' ' + Math.round(row.fill * 100) + '% of ' + row.cap
      + ' (n=' + row.count + ', mean ' + row.mean + ')';
  }).join(', ') + '.');

  audit.thin.forEach(function (row) {
    report.warnings.push('Page fill THIN: ' + row.label + ' average ' + row.mean
      + ' characters against a budget of ' + row.cap + ' ('
      + Math.round(row.fill * 100) + '%) — under the density law (VISION §8) the cap is the'
      + ' page\'s limit, not caution\'s, and a surface running this far under it is printing'
      + ' white space the page was measured to hold text in. Report-class: a spare book the'
      + ' brief asked for is legitimate, and nothing here blocks delivery.');
  });
  return audit.thin.length;
}

export var QUALITY_BLOCKING_AREAS = {
  'artifact-monoculture': { target: 'fragments' },
  'board-monotony': { target: 'weeks' },
  'companion-sameness': { target: 'weeks' },
  'identity-undercommitment': { target: 'shell' },
  'boss-password-spoiler': { target: 'endings', alwaysBlock: true },
  'map-stagnation': { target: 'weeks' },
  'cipher-repetition': { target: 'weeks' },
  'oracle-vagueness': { target: 'weeks' },
  'identity-drift-risk': { target: 'shell', alwaysBlock: true },
  'thin-ending': { target: 'endings' },
  'unsupported-reveal': { target: 'endings' },
  'intent-forbidden-content': { target: 'shell', alwaysBlock: true },
  'intent-excluded-content': { target: 'shell' },
  'intent-ecology-drift': { target: 'fragments' },
  'intent-mechanic-drift': { target: 'weeks' }
};

export function formatQualityGateMessage(target, detail) {
  var prefix = target ? target.charAt(0).toUpperCase() + target.slice(1) : 'Booklet';
  return prefix + ': ' + detail;
}

export function buildQualityGate(report) {
  report = report || {};
  var blockers = [];
  var seen = {};

  function pushBlocker(target, detail) {
    var message = formatQualityGateMessage(target, detail);
    if (seen[message]) return;
    seen[message] = true;
    blockers.push({ target: target || '', message: message });
  }

  (report.schemaErrors || []).forEach(function (error) {
    pushBlocker('', 'schema validation failed: ' + error);
  });

  (report.weakSpots || []).forEach(function (spot) {
    var policy = QUALITY_BLOCKING_AREAS[spot.area];
    if (!policy) return;
    if (policy.alwaysBlock || spot.severity === 'high') {
      pushBlocker(policy.target, spot.detail);
    }
  });

  var identityVariationScore = (((report.scores || {}).identityVariation) || {}).score;
  if (typeof identityVariationScore === 'number' && identityVariationScore < 0.8) {
    pushBlocker('shell', 'identity variation score is ' + identityVariationScore + ' — the booklet is still converging toward the default grammar');
  }

  var aggregateScore = (((report.scores || {}).aggregate) || {}).score;
  if (typeof aggregateScore === 'number' && aggregateScore < 0.72) {
    pushBlocker('shell', 'aggregate quality score is ' + aggregateScore + ' — the booklet needs another pass before export');
  }

  return {
    passed: blockers.length === 0,
    blockers: blockers
  };
}

export function generateQualityReport(booklet) {
  var report = {
    timestamp: new Date().toISOString(),
    schemaErrors: [],
    scores: {},
    warnings: [],
    weakSpots: []
  };

  if (!booklet || typeof booklet !== 'object') {
    report.schemaErrors.push('Booklet is not a valid object');
    return report;
  }

  // ── Schema completeness (delegate to existing validator) ───────────────
  var validationResult = validateAssembledBooklet(booklet);
  report.schemaErrors = validationResult.errors;
  // Surface validator warnings (soft issues) alongside hard errors
  var validatorWarnings = validationResult.warnings || [];
  if (validatorWarnings.length > 0) {
    report.warnings = report.warnings.concat(validatorWarnings);
  }
  // Legacy-vocabulary notice, never a score input (D122c) — see the helper.
  report.warnings = report.warnings.concat(collectDemotedCompanionFindings(booklet));
  // The fourth referee (VISION §10.4). Report-class by ruling: it writes
  // warnings and an `identitySources` block, and never a weakSpot — so
  // QUALITY_BLOCKING_AREAS cannot be taught to block on it by accident.
  collectIdentitySourceFindings(booklet, report);
  // The density law's lens (VISION §8, the depth wave). Report-class on the
  // same terms: warnings and a `pageFill` block, never a weakSpot, never a
  // score input — a raised cap is a permission and this is how anyone finds
  // out whether it was taken.
  collectPageFillFindings(booklet, report);
  report.scores.schemaCompleteness = report.schemaErrors.length === 0
    ? { score: 1, label: validatorWarnings.length > 0 ? validatorWarnings.length + ' warnings' : 'clean' }
    : { score: Math.max(0, 1 - report.schemaErrors.length * 0.1), label: report.schemaErrors.length + ' errors' };

  var meta = booklet.meta || {};
  var weeks = booklet.weeks || [];
  var fragments = booklet.fragments || [];
  var endings = booklet.endings || [];
  var nonBossWeeks = weeks.filter(function (w) { return !w.isBossWeek; });
  var bossWeek = weeks.filter(function (w) { return w.isBossWeek; })[0];

  // ── Helper: collect all fragment IDs (soft-matching via normalizeId) ────
  var fragmentIdSet = {};     // exact ID → fragment
  var fragmentIdSetNorm = {}; // normalizeId(ID) → fragment
  var overflowIdSetNorm = {}; // normalizeId(ID) → overflow document
  fragments.forEach(function (f) {
    if (f.id) {
      fragmentIdSet[f.id] = f;
      fragmentIdSetNorm[normalizeId(f.id)] = f;
    }
  });
  weeks.forEach(function (week) {
    var od = week && week.overflowDocument;
    if (od && od.id) overflowIdSetNorm[normalizeId(od.id)] = od;
  });

  function fragmentExistsQR(ref) {
    return fragmentIdSet[ref] || fragmentIdSetNorm[normalizeId(ref)] || overflowIdSetNorm[normalizeId(ref)];
  }

  // ── Continuity coherence ───────────────────────────────────────────────
  var continuityIssues = [];

  // Check fragmentRefs in sessions resolve (soft-matching via normalizeId)
  var referencedFragmentIdsNorm = {}; // normalizeId(ref) → true
  weeks.forEach(function (week, wi) {
    (week.sessions || []).forEach(function (s) {
      if (s.fragmentRef) {
        referencedFragmentIdsNorm[normalizeId(s.fragmentRef)] = true;
        if (!fragmentExistsQR(s.fragmentRef)) {
          continuityIssues.push('Week ' + (wi + 1) + ' fragmentRef "' + s.fragmentRef + '" unresolved');
        }
      }
    });
    // Oracle fragment refs
    var oracle = (week.fieldOps || {}).oracleTable || (week.fieldOps || {}).oracle || {};
    (oracle.entries || []).forEach(function (e) {
      if (e.fragmentRef) {
        referencedFragmentIdsNorm[normalizeId(e.fragmentRef)] = true;
        if (!fragmentExistsQR(e.fragmentRef)) {
          continuityIssues.push('Week ' + (wi + 1) + ' oracle fragmentRef "' + e.fragmentRef + '" unresolved');
        }
      }
    });
    var cipherTargets = ((((week.fieldOps || {}).cipher || {}).body || {}).referenceTargets || []);
    cipherTargets.forEach(function (target, targetIndex) {
      if (!looksLikeFragmentRef(target)) return;
      referencedFragmentIdsNorm[normalizeId(target)] = true;
      if (!fragmentExistsQR(target)) {
        continuityIssues.push('Week ' + (wi + 1) + ' cipher.referenceTargets[' + targetIndex + '] "' + target + '" unresolved');
      }
    });
  });

  // Unreferenced fragments (never pointed to by any session, oracle, or
  // fragment-like cipher reference target, soft-matched)
  var unreferencedFragments = fragments.filter(function (f) {
    return f.id && !referencedFragmentIdsNorm[normalizeId(f.id)];
  });
  if (unreferencedFragments.length > 0) {
    continuityIssues.push(unreferencedFragments.length + ' fragment(s) never referenced: ' +
      unreferencedFragments.map(function (f) { return f.id; }).join(', '));
  }

  report.scores.continuityCoherence = continuityIssues.length === 0
    ? { score: 1, label: 'clean' }
    : { score: Math.max(0, 1 - continuityIssues.length * 0.15), label: continuityIssues.length + ' issues' };
  if (continuityIssues.length) report.warnings = report.warnings.concat(continuityIssues);

  // ── Boss convergence integrity ─────────────────────────────────────────
  // Count boss-related validator errors for scoring (they already live in
  // schemaErrors — do NOT re-add them to warnings to avoid duplication).
  // Add quality-only checks that the validator doesn't cover.
  var bossIssues = [];
  var bossQualityWarnings = []; // quality-only (not in schemaErrors)
  if (!bossWeek) {
    // Already an error in schemaErrors; just count for scoring
    bossIssues.push('No boss week found');
  } else if (!bossWeek.bossEncounter) {
    bossIssues.push('Boss week has no bossEncounter object');
  } else {
    var bossObj = bossWeek.bossEncounter;
    if (!bossObj.decodingKey) {
      bossQualityWarnings.push('Boss missing decodingKey — no reveal mechanic');
    }
    var leakedPassword = findBossPasswordSpoiler(bossObj);
    if (leakedPassword) {
      report.weakSpots.push({
        area: 'boss-password-spoiler',
        detail: 'Boss convergence text explicitly reveals the final password "' + leakedPassword + '"',
        severity: 'high'
      });
    }
    // Count boss-related hard errors from validator for scoring only
    var bossErrorCount = report.schemaErrors.filter(function (e) {
      return e.indexOf('Boss ') === 0 || e.indexOf('componentInputs') !== -1 ||
        e.indexOf('A1Z26') !== -1 || e.indexOf('demoPassword') !== -1;
    }).length;
    // Pad bossIssues length to reflect validator errors without duplicating strings
    for (var bei = 0; bei < bossErrorCount; bei++) bossIssues.push('(validator)');
  }

  var bossTotalIssues = bossIssues.length + bossQualityWarnings.length;
  report.scores.bossConvergence = bossTotalIssues === 0
    ? { score: 1, label: 'clean' }
    : { score: Math.max(0, 1 - bossTotalIssues * 0.25), label: bossTotalIssues + ' issues' };
  // Only add quality-only warnings (validator errors are already in schemaErrors)
  if (bossQualityWarnings.length) report.warnings = report.warnings.concat(bossQualityWarnings);

  // ── Fragment reference integrity ───────────────────────────────────────
  var fragIssues = [];
  var docTypes = {};
  fragments.forEach(function (f) {
    if (!f.id) fragIssues.push('Fragment missing id');
    if (!f.documentType) fragIssues.push('Fragment "' + (f.id || '?') + '" missing documentType');
    var dt = f.documentType || 'unknown';
    docTypes[dt] = (docTypes[dt] || 0) + 1;
    if (!f.content && !f.body) fragIssues.push('Fragment "' + (f.id || '?') + '" missing content');
  });

  // Document type diversity
  var typeCount = Object.keys(docTypes).length;
  if (typeCount < 3 && fragments.length >= 6) {
    report.weakSpots.push({
      area: 'fragment-diversity',
      detail: 'Only ' + typeCount + ' document type(s) across ' + fragments.length + ' fragments',
      severity: 'medium'
    });
  }

  report.scores.fragmentIntegrity = fragIssues.length === 0
    ? { score: 1, label: 'clean' }
    : { score: Math.max(0, 1 - fragIssues.length * 0.1), label: fragIssues.length + ' issues' };

  // ── Map integrity ──────────────────────────────────────────────────────
  var mapIssues = [];
  var prevMapLabels = null;
  nonBossWeeks.forEach(function (week) {
    var actualWeekNum = weeks.indexOf(week) + 1; // true week number, not filtered index
    var ms = (week.fieldOps || {}).mapState;
    if (!ms) {
      mapIssues.push('Week ' + actualWeekNum + ' missing mapState');
      return;
    }
    var labels = buildMapEvolutionFingerprint(ms);

    // Check for state evolution (tile labels AND types should differ between weeks)
    var validatorAlreadyFlaggedStagnation = report.schemaErrors.some(function (entry) {
      return entry.indexOf('Week ' + actualWeekNum + ' map tiles identical to previous week') !== -1;
    });
    if (prevMapLabels !== null && labels === prevMapLabels && !validatorAlreadyFlaggedStagnation) {
      report.weakSpots.push({
        area: 'map-stagnation',
        detail: 'Week ' + actualWeekNum + ' map tiles identical to previous week — no visible evolution',
        severity: 'high'
      });
    }
    prevMapLabels = labels;

    if (!ms.currentPosition) {
      mapIssues.push('Week ' + actualWeekNum + ' mapState missing currentPosition');
    }
  });

  // Count map regression errors from validator for scoring (already in schemaErrors)
  var mapRegressionCount = report.schemaErrors.filter(function (e) {
    return e.indexOf('impossible regression') !== -1 || e.indexOf('map tiles identical to previous week') !== -1;
  }).length;

  var mapTotalIssues = mapIssues.length + mapRegressionCount;
  report.scores.mapIntegrity = mapTotalIssues === 0
    ? { score: 1, label: 'clean' }
    : { score: Math.max(0, 1 - mapTotalIssues * 0.15), label: mapTotalIssues + ' issues' };

  // ── Oracle completeness ────────────────────────────────────────────────
  var oracleIssues = [];
  var allOracleTexts = [];
  weeks.forEach(function (week, wi) {
    if (week.isBossWeek) return;
    var oracle = (week.fieldOps || {}).oracleTable || (week.fieldOps || {}).oracle || {};
    var entries = oracle.entries || [];
    if (entries.length === 0) {
      oracleIssues.push('Week ' + (wi + 1) + ' has no oracle entries');
      return;
    }

    entries.forEach(function (e) {
      var txt = e.text || '';
      allOracleTexts.push(txt);
      // Check for vague paperAction
      if (e.paperAction) {
        var pa = e.paperAction.toLowerCase();
        if (pa.indexOf('something') !== -1 || pa.indexOf('update the board') !== -1 || pa === '') {
          report.weakSpots.push({
            area: 'oracle-vagueness',
            detail: 'Week ' + (wi + 1) + ' oracle paperAction is vague: "' + e.paperAction + '"',
            severity: 'high'
          });
        }
      }
    });
  });

  // Thin oracle variety: check for near-duplicate texts across weeks
  var oracleDupes = 0;
  for (var oi = 0; oi < allOracleTexts.length; oi++) {
    for (var oj = oi + 1; oj < allOracleTexts.length; oj++) {
      if (allOracleTexts[oi] && allOracleTexts[oi] === allOracleTexts[oj]) {
        oracleDupes++;
      }
    }
  }
  if (oracleDupes > 0) {
    report.weakSpots.push({
      area: 'oracle-variety',
      detail: oracleDupes + ' duplicate oracle text(s) across weeks',
      severity: 'medium'
    });
  }

  report.scores.oracleCompleteness = oracleIssues.length === 0
    ? { score: 1, label: 'clean' }
    : { score: Math.max(0, 1 - oracleIssues.length * 0.2), label: oracleIssues.length + ' issues' };

  // ── Overflow document planning integrity ───────────────────────────────
  var overflowIssues = [];
  weeks.forEach(function (week, wi) {
    if ((week.sessions || []).length > 3) {
      var od = week.overflowDocument;
      if (!od) {
        overflowIssues.push('Week ' + (wi + 1) + ' overflow but no overflowDocument');
      } else {
        if (!od.documentType) overflowIssues.push('Week ' + (wi + 1) + ' overflowDocument missing documentType');
        if (!od.content && !od.body) overflowIssues.push('Week ' + (wi + 1) + ' overflowDocument missing content');
      }
    }
  });

  report.scores.overflowIntegrity = overflowIssues.length === 0
    ? { score: 1, label: 'clean' }
    : { score: Math.max(0, 1 - overflowIssues.length * 0.25), label: overflowIssues.length + ' issues' };

  // ── Workout/session consistency ────────────────────────────────────────
  var sessionIssues = [];
  var totalSessions = 0;
  weeks.forEach(function (week, wi) {
    var sessions = week.sessions || [];
    totalSessions += sessions.length;
    if (sessions.length === 0) {
      sessionIssues.push('Week ' + (wi + 1) + ' has zero sessions');
    }
    sessions.forEach(function (s, si) {
      if (!s.storyPrompt && !s.prompt) {
        sessionIssues.push('Week ' + (wi + 1) + ' session ' + (si + 1) + ' missing storyPrompt');
      }
      if (!s.exercises || s.exercises.length === 0) {
        sessionIssues.push('Week ' + (wi + 1) + ' session ' + (si + 1) + ' has no exercises');
      }
    });
  });
  if (meta.totalSessions && meta.totalSessions !== totalSessions) {
    sessionIssues.push('meta.totalSessions (' + meta.totalSessions + ') != actual (' + totalSessions + ')');
  }

  report.scores.sessionConsistency = sessionIssues.length === 0
    ? { score: 1, label: 'clean' }
    : { score: Math.max(0, 1 - sessionIssues.length * 0.1), label: sessionIssues.length + ' issues' };

  var identityVariationIssues = collectIdentityVariationFindings(booklet, nonBossWeeks, fragments, report);
  report.scores.identityVariation = identityVariationIssues === 0
    ? { score: 1, label: 'clean' }
    : { score: Math.max(0, 1 - identityVariationIssues * 0.2), label: identityVariationIssues + ' issues' };

  // ── Weak spot detection (heuristics) ───────────────────────────────────

  // Repeated cipher types
  var cipherTypes = [];
  nonBossWeeks.forEach(function (w) {
    var ct = ((w.fieldOps || {}).cipher || {}).type || '';
    cipherTypes.push(ct);
  });
  for (var ci = 1; ci < cipherTypes.length; ci++) {
    if (cipherTypes[ci] && cipherTypes[ci] === cipherTypes[ci - 1]) {
      report.weakSpots.push({
        area: 'cipher-repetition',
        detail: 'Weeks ' + ci + ' and ' + (ci + 1) + ' both use cipher type "' + cipherTypes[ci] + '"',
        severity: 'high'
      });
    }
  }
  var uniqueCipherTypes = {};
  cipherTypes.forEach(function (t) { if (t) uniqueCipherTypes[t] = true; });
  if (Object.keys(uniqueCipherTypes).length < Math.min(4, nonBossWeeks.length) && nonBossWeeks.length >= 4) {
    report.weakSpots.push({
      area: 'cipher-diversity',
      detail: 'Only ' + Object.keys(uniqueCipherTypes).length + ' distinct cipher types across ' + nonBossWeeks.length + ' non-boss weeks (target: 4+)',
      severity: 'medium'
    });
  }

  // Underused fragments (exist but never referenced)
  if (unreferencedFragments.length > fragments.length * 0.3 && fragments.length > 3) {
    report.weakSpots.push({
      area: 'underused-fragments',
      detail: unreferencedFragments.length + ' of ' + fragments.length + ' fragments never referenced by sessions, oracle entries, or cipher referenceTargets',
      severity: 'medium'
    });
  }

  // Voice/register drift risk: check if meta has narrativeVoice
  if (!meta.narrativeVoice && !meta.literaryRegister) {
    report.weakSpots.push({
      area: 'voice-drift-risk',
      detail: 'meta missing narrativeVoice and literaryRegister — high risk of register drift across stages',
      severity: 'low'
    });
  }
  if (!meta.artifactIdentity) {
    report.weakSpots.push({
      area: 'identity-drift-risk',
      detail: 'meta.artifactIdentity missing — renderer will infer shell identity from weak signals only',
      severity: 'high'
    });
  }

  // Endings quality: check endings reference specifics
  endings.forEach(function (ending, ei) {
    var body = '';
    if (ending.content && typeof ending.content === 'object') {
      body = ending.content.body || ending.content.html || '';
    } else if (typeof ending.content === 'string') {
      body = ending.content;
    } else if (ending.body) {
      body = ending.body;
    }
    if (body.length < 100) {
      report.weakSpots.push({
        area: 'thin-ending',
        detail: 'Ending ' + (ei + 1) + ' body is only ' + body.length + ' chars — likely too thin for payoff',
        severity: 'high'
      });
    }
  });

  // Unsupported reveal pattern: boss without decodingKey referenceTable
  if (bossWeek) {
    var dk = (bossWeek.bossEncounter || {}).decodingKey;
    if (dk && !dk.referenceTable && !dk.instruction) {
      report.weakSpots.push({
        area: 'unsupported-reveal',
        detail: 'Boss decodingKey present but missing both referenceTable and instruction',
        severity: 'high'
      });
    }
  }

  // ── Artifact intent coherence (Layer 3 variety contract drift) ────────
  var intentDrift = (readPipelineDebris(booklet, '_artifactIntentDrift') || {}).diagnostics || [];
  var intentIssueCount = 0;

  if (intentDrift.length > 0) {
    // Severity mapping: forbidden/excluded → high, underrepresentation/proxy → medium
    var DRIFT_SEVERITY_MAP = {
      'forbidden-document-type': { area: 'intent-forbidden-content', severity: 'high' },
      'excluded-document-type-present': { area: 'intent-excluded-content', severity: 'high' },
      'excluded-mechanic-proxy-present': { area: 'intent-excluded-content', severity: 'medium' },
      'dominant-ecology-underrepresented': { area: 'intent-ecology-drift', severity: 'medium' },
      'mechanic-grammar-map-mismatch': { area: 'intent-mechanic-drift', severity: 'medium' }
    };

    intentDrift.forEach(function (d) {
      var mapping = DRIFT_SEVERITY_MAP[d.code] || { area: 'intent-ecology-drift', severity: 'medium' };
      report.weakSpots.push({
        area: mapping.area,
        detail: d.message,
        severity: mapping.severity
      });
      intentIssueCount++;
    });
  }

  // Score: clean if no drift, degrade per issue (forbidden counts more)
  if (((booklet.meta || {}).artifactIntent)) {
    var forbiddenCount = intentDrift.filter(function (d) {
      return d.code === 'forbidden-document-type' || d.code === 'excluded-document-type-present';
    }).length;
    var softCount = intentIssueCount - forbiddenCount;
    // Forbidden/excluded violations cost 0.25 each, soft drift costs 0.15 each
    var intentScore = Math.max(0, 1 - (forbiddenCount * 0.25) - (softCount * 0.15));
    report.scores.artifactIntentCoherence = {
      score: Math.round(intentScore * 100) / 100,
      label: intentIssueCount === 0 ? 'clean' : intentIssueCount + ' drift issue(s)'
    };
  }

  // ── S+F cross-stage continuity (surfaced from pipeline instrumentation) ──
  var sfContinuity = readPipelineDebris(booklet, '_continuityWarnings') || [];
  if (sfContinuity.length > 0) {
    sfContinuity.forEach(function (cw) {
      report.warnings.push('[S+F continuity/' + (cw.stage || '?') + '] ' + (cw.message || ''));
    });
    report.scores.sfContinuity = {
      score: Math.max(0, 1 - sfContinuity.length * 0.15),
      label: sfContinuity.length + ' cross-stage issue(s)'
    };
  }

  // ── Aggregate score ────────────────────────────────────────────────────
  var scoreKeys = Object.keys(report.scores);
  var totalScore = 0;
  scoreKeys.forEach(function (k) { totalScore += report.scores[k].score; });
  report.scores.aggregate = {
    score: Math.round((totalScore / scoreKeys.length) * 100) / 100,
    label: scoreKeys.length + ' dimensions'
  };

  report.weakSpotCount = report.weakSpots.length;
  report.warningCount = report.warnings.length;

  // Side-effect: store on public API for console inspection
  if (typeof window !== 'undefined' && window.LiftRPGAPI) {
    window.LiftRPGAPI.lastQualityReport = report;
  }

  return report;
}
