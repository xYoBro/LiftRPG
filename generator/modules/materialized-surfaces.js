// Planning and post-assembly surface inventory share this single traversal.
// Policy changes only what counts as evidence; grammar and normalization live
// in contract-constants.mjs and are never restated here.
import { parseSurfaceRef, surfaceRefKey } from '../../contracts/contract-constants.mjs';
import { deriveAssemblyTransferRows } from '../../renderer/modules/assembly-transfer-rows.mjs';

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (!value || typeof value !== 'object') return value;
  var out = {};
  Object.keys(value).forEach(function (key) { out[key] = clone(value[key]); });
  return out;
}

function surfaceIdKey(kind, value) {
  var key = surfaceRefKey(String(kind || '') + ':' + String(value == null ? '' : value));
  var colon = key.indexOf(':');
  return colon < 0 ? '' : key.slice(colon + 1);
}

function occurrence(kind, id, evidence) {
  return Object.assign({ kind: kind, id: String(id || '') }, evidence || {});
}

export function deriveWeekSurfaces(week, fallbackNumber, options) {
  var policy = (options || {}).policy === 'materialized' ? 'materialized' : 'planning';
  var out = { weekNumber: Number(fallbackNumber) || 1, kinds: {} };
  if (!week || typeof week !== 'object') return out;
  var n = Number(week.weekNumber);
  if (!Number.isFinite(n) || n < 1) n = Number(fallbackNumber) || 1;
  out.weekNumber = n;
  function note(kind, value) {
    var key = surfaceIdKey(kind, value);
    if (!key) return;
    if (!out.kinds[kind]) out.kinds[kind] = {};
    if (!out.kinds[kind][key]) out.kinds[kind][key] = [];
    out.kinds[kind][key].push(occurrence(kind, value, { weekNumber: n,
      weekIndex: Number((options || {}).weekIndex) }));
  }

  note('week', 'W' + n);
  var sessions = Array.isArray(week.sessions) ? week.sessions : [];
  var sessionCount = policy === 'planning'
    ? Math.max(sessions.length, Number(week.sessionCount) || 0) : sessions.length;
  for (var si = 0; si < sessionCount; si++) {
    note('session', 'W' + n + '.' + (si + 1));
    if (policy === 'planning' || (sessions[si] && sessions[si].markStrip
        && typeof sessions[si].markStrip === 'object' && !Array.isArray(sessions[si].markStrip))) {
      note('markStrip', 'W' + n + '.' + (si + 1));
      note('markStrip', 'W' + n);
    }
  }
  if (policy === 'planning' || (week.reckoning && typeof week.reckoning === 'object'
      && !Array.isArray(week.reckoning))) note('reckoning', 'W' + n);

  var fo = week.fieldOps || {};
  if (fo.oracleTable || fo.oracle) note('oracle', 'W' + n);
  if (fo.cipher) note('cipher', 'W' + n);
  if (week.doorChoice) note('door', 'W' + n);
  (Array.isArray(week.gameplayClocks) ? week.gameplayClocks : []).forEach(function (clock) {
    if (clock) note('clock', clock.clockName);
  });
  var mapState = fo.mapState || {};
  if (mapState.title) note('map', mapState.title);
  if (mapState.title || (Array.isArray(mapState.nodes) && mapState.nodes.length)) note('map', 'W' + n);
  (mapState.nodes || []).forEach(function (node) { if (node) { note('map', node.label); note('map', node.id); } });
  (mapState.tiles || []).forEach(function (tile) { if (tile) note('map', tile.label); });
  function noteCompanions(pool) {
    (Array.isArray(pool) ? pool : []).forEach(function (item) {
      if (!item) return;
      note('companion', item.title); note('companion', item.label);
      note('companion', item.statName); note('companion', item.type);
    });
  }
  noteCompanions(fo.companionComponents);
  if (week.interlude && week.interlude.payload) noteCompanions(week.interlude.payload.companionComponents);
  if (week.overflowDocument && typeof week.overflowDocument === 'object'
      && week.overflowDocument.id) note('fragment', week.overflowDocument.id);
  return out;
}

export function buildSurfaceIndex(booklet, options) {
  var policy = (options || {}).policy === 'materialized' ? 'materialized' : 'planning';
  var doc = booklet || {};
  var weekList = Array.isArray(doc.weeks) && doc.weeks.length ? doc.weeks
    : (policy === 'planning' && Array.isArray(doc.weekPlan) ? doc.weekPlan : []);
  if (policy === 'planning' && !weekList.length && Number.isInteger(doc.weekCount) && doc.weekCount > 0) {
    weekList = Array.from({ length: doc.weekCount }, function (_row, i) { return { weekNumber: i + 1 }; });
  }
  var index = { policy: policy, weeks: {}, kinds: {}, weekCount: weekList.length };
  var fragmentOccurrences = {};
  function note(kind, value, evidence) {
    var key = ['banked', 'boss', 'assembly'].indexOf(kind) === -1
      ? surfaceIdKey(kind, value) : '';
    if (!key && ['banked', 'boss', 'assembly'].indexOf(kind) === -1) return;
    if (!index.kinds[kind]) index.kinds[kind] = {};
    if (!index.kinds[kind][key]) index.kinds[kind][key] = [];
    index.kinds[kind][key].push(occurrence(kind, value, evidence));
  }
  weekList.forEach(function (week, wi) {
    if (!week) return;
    var row = deriveWeekSurfaces(week, wi + 1, { policy: policy, weekIndex: wi });
    index.weeks[row.weekNumber] = true;
    Object.keys(row.kinds).forEach(function (kind) {
      Object.keys(row.kinds[kind]).forEach(function (key) {
        if (!index.kinds[kind]) index.kinds[kind] = {};
        if (!index.kinds[kind][key]) index.kinds[kind][key] = [];
        index.kinds[kind][key].push.apply(index.kinds[kind][key], row.kinds[kind][key]);
      });
    });
    if (policy === 'materialized') {
      (Array.isArray(week.sessions) ? week.sessions : []).forEach(function (session, si) {
        var fragmentRef = session && String(session.fragmentRef || '').trim();
        var key = surfaceIdKey('fragment', fragmentRef);
        if (!key) return;
        if (!fragmentOccurrences[key]) fragmentOccurrences[key] = [];
        fragmentOccurrences[key].push({ weekNumber: row.weekNumber, weekIndex: wi,
          sessionIndex: si, bookOrderClass: 'session-fragment' });
      });
    }
  });
  var fragments = Array.isArray(doc.fragments) ? doc.fragments
    : (policy === 'planning' && Array.isArray(doc.fragmentRegistry) ? doc.fragmentRegistry : []);
  fragments.forEach(function (fragment, fi) {
    if (!fragment || typeof fragment !== 'object' || !fragment.id) return;
    var evidence = { bookOrderClass: 'fragment', bookOrderIndex: fi };
    // Fragment refs have one identity: their authored id. The printed title is
    // prose, not a second address for the same gameplay surface.
    note('fragment', fragment.id, evidence);
    var assigned = fragmentOccurrences[surfaceIdKey('fragment', fragment.id)] || [];
    assigned.forEach(function (entry) { note('fragment', fragment.id, entry); });
    var seal = fragment.seal;
    if (policy === 'planning' || (seal && typeof seal === 'object'
        && String(seal.keyHint || '').trim() && String(seal.unlockCondition || '').trim())) {
      note('seal', fragment.id, evidence);
      assigned.forEach(function (entry) { note('seal', fragment.id, entry); });
    }
  });
  var endings = Array.isArray(doc.endings) ? doc.endings
    : (policy === 'planning' && Array.isArray(doc.endingVariants) ? doc.endingVariants : []);
  endings.forEach(function (ending, ei) {
    var value = ending && typeof ending === 'object' ? ending.variant : ending;
    if (!value) value = 'E' + (ei + 1);
    note('ending', value, { bookOrderClass: 'ending', bookOrderIndex: ei });
    note('ending', 'E' + (ei + 1), { bookOrderClass: 'ending', bookOrderIndex: ei });
  });
  var bossWeeks = weekList.filter(function (week) { return week && week.bossEncounter; });
  if (policy === 'planning' || bossWeeks.length) note('boss', '', { bookOrderClass: 'boss' });
  var hasBanked = policy === 'planning' || weekList.some(function (week) {
    return week && week.reckoning && typeof week.reckoning === 'object' && !Array.isArray(week.reckoning);
  });
  if (hasBanked) note('banked', '', { bookOrderClass: 'banked' });
  var hasAssembly = policy === 'planning' || deriveAssemblyTransferRows(doc).length > 0;
  if (hasAssembly) note('assembly', '', { bookOrderClass: 'assembly' });
  return index;
}

export function buildMaterializedSurfaceIndex(booklet) {
  return buildSurfaceIndex(booklet, { policy: 'materialized' });
}

export function resolveMaterializedSurfaceRef(index, ref) {
  var parsed = parseSurfaceRef(ref);
  if (!parsed.valid) return { ok: false, reason: 'invalid surface ref', occurrences: [] };
  var key = surfaceRefKey(parsed);
  var colon = key.indexOf(':');
  var kind = colon < 0 ? key : key.slice(0, colon);
  var id = colon < 0 ? '' : key.slice(colon + 1);
  var bucket = index && index.kinds && index.kinds[kind];
  var occurrences = bucket && bucket[id] ? bucket[id].slice() : [];
  return occurrences.length
    ? { ok: true, reason: '', occurrences: occurrences }
    : { ok: false, reason: 'surface is not present in the assembled artifact', occurrences: [] };
}

export function surfaceRefResolves(index, ref) {
  var parsed = parseSurfaceRef(ref);
  if (!parsed.valid) return { ok: false, reason: 'is not a surface ref' };
  if (index && index.policy === 'materialized') return resolveMaterializedSurfaceRef(index, ref);
  if (!parsed.id) return { ok: true, reason: '' };
  var match = /^w\s*(\d+)/i.exec(String(parsed.id || ''));
  var weekNo = match ? Number(match[1]) : null;
  if (weekNo !== null && !index.weeks[weekNo]) return { ok: false,
    reason: 'names week ' + weekNo + ', which this book does not have' };
  var bucket = index.kinds[parsed.kind];
  if (!bucket || bucket[surfaceIdKey(parsed.kind, parsed.id)] || weekNo !== null) return { ok: true, reason: '' };
  return { ok: false, reason: 'points at a surface this book does not declare' };
}

function projectionFinding(code, path, message) {
  return { code: code, class: 'conformance', severity: 'error', blocking: true,
    ownerStage: /^stages\.([^.[\]]+)/.exec(path || '')?.[1] || null,
    ownerPath: path, path: path, message: message };
}

export function materializeBossPlanProjection(booklet, bossPlan, options) {
  var result = clone(booklet || {});
  var weeks = Array.isArray(result.weeks) ? result.weeks : [];
  var candidates = [];
  weeks.forEach(function (week, index) {
    if (week && (week.isBossWeek === true || Object.prototype.hasOwnProperty.call(week, 'bossEncounter'))) {
      candidates.push({ week: week, index: index });
    }
  });
  var ownerRoot = String((options || {}).ownerPath || 'bossPlan');
  var diagnostics = [];
  if (candidates.length !== 1 || candidates.some(function (row) {
    return row.week.isBossWeek !== true || !row.week.bossEncounter || typeof row.week.bossEncounter !== 'object';
  })) {
    diagnostics.push(projectionFinding('boss-plan-ambiguous-target', ownerRoot,
      'Assembly requires exactly one boss week with exactly one boss encounter.'));
    return { booklet: result, diagnostics: diagnostics, blocking: true };
  }
  var plan = bossPlan || {};
  if (!String(plan.whyItFeelsEarned || '').trim()) diagnostics.push(projectionFinding(
    'boss-plan-incomplete', ownerRoot + '.whyItFeelsEarned', 'Boss plan rationale is missing.'));
  var refs = Array.isArray(plan.requiredPriorKnowledge) ? plan.requiredPriorKnowledge : [];
  if (!refs.length) diagnostics.push(projectionFinding('boss-plan-incomplete',
    ownerRoot + '.requiredPriorKnowledge', 'Boss plan prior knowledge is missing.'));
  var selected = candidates[0];
  var actual = buildMaterializedSurfaceIndex(result);
  refs.forEach(function (ref, index) {
    var path = ownerRoot + '.requiredPriorKnowledge[' + index + ']';
    var parsed = parseSurfaceRef(ref);
    if (!parsed.valid) {
      diagnostics.push(projectionFinding('boss-plan-invalid-ref', path, 'Prior knowledge is not a valid surface ref.'));
      return;
    }
    var resolution = resolveMaterializedSurfaceRef(actual, ref);
    var eligible = resolution.ok && resolution.occurrences.some(function (entry) {
      return Number.isInteger(entry.weekIndex) && entry.weekIndex < selected.index;
    });
    if (!eligible) diagnostics.push(projectionFinding('boss-plan-not-prior', path,
      'Prior knowledge must resolve to an actual surface strictly before the boss week.'));
  });
  var boss = selected.week.bossEncounter;
  if (Object.prototype.hasOwnProperty.call(boss, 'whyItFeelsEarned')
      && JSON.stringify(boss.whyItFeelsEarned) !== JSON.stringify(plan.whyItFeelsEarned)) {
    diagnostics.push(projectionFinding('boss-plan-conflict', ownerRoot + '.whyItFeelsEarned',
      'The printed boss conflicts with its paid boss-plan rationale.'));
  }
  if (Object.prototype.hasOwnProperty.call(boss, 'requiredPriorKnowledge')) {
    var printedRefs = Array.isArray(boss.requiredPriorKnowledge)
      ? boss.requiredPriorKnowledge.map(surfaceRefKey) : null;
    var plannedRefs = refs.map(surfaceRefKey);
    if (!printedRefs || JSON.stringify(printedRefs) !== JSON.stringify(plannedRefs)) {
      diagnostics.push(projectionFinding('boss-plan-conflict', ownerRoot + '.requiredPriorKnowledge',
        'The printed boss conflicts with its paid, ordered prior-knowledge plan.'));
    }
  }
  if (diagnostics.length) return { booklet: result, diagnostics: diagnostics, blocking: true };
  boss.whyItFeelsEarned = clone(plan.whyItFeelsEarned);
  boss.requiredPriorKnowledge = clone(refs);
  return { booklet: result, diagnostics: [], blocking: false };
}
