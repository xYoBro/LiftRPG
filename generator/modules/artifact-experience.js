// ── Artifact experience contract (Wave 2E) ────────────────────────────────
//
// This is deliberately a *read* over paid owners, never another authored
// stage.  The mechanical proof lives in sim-player.js; this sibling answers a
// separate question: does this particular book still carry the experience its
// owners promised before any prose was bought?

import { buildMaterializedSurfaceIndex, resolveMaterializedSurfaceRef } from './materialized-surfaces.js';
import { applyRulebookAmendments } from './constants.js';

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (!value || typeof value !== 'object') return value;
  var out = {};
  Object.keys(value).forEach(function (key) { out[key] = clone(value[key]); });
  return out;
}

function deepFreeze(value, seen) {
  if (!value || typeof value !== 'object') return value;
  var visited = seen || [];
  if (visited.indexOf(value) !== -1) return value;
  visited.push(value);
  Object.keys(value).forEach(function (key) { deepFreeze(value[key], visited); });
  return Object.freeze(value);
}

function pathGet(value, path) {
  return String(path || '').replace(/\[(\d+)\]/g, '.$1').split('.').reduce(function (node, key) {
    return node == null ? undefined : node[key];
  }, value);
}

function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(function (key) {
    return JSON.stringify(key) + ':' + canonical(value[key]);
  }).join(',') + '}';
  return JSON.stringify(value);
}

function sha256(text) {
  function rotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
  var bytes = unescape(encodeURIComponent(String(text)));
  var words = [];
  var length = bytes.length * 8;
  for (var i = 0; i < bytes.length; i++) words[i >> 2] = (words[i >> 2] || 0) | bytes.charCodeAt(i) << (24 - (i % 4) * 8);
  words[length >> 5] = (words[length >> 5] || 0) | 0x80 << (24 - length % 32);
  words[((length + 64 >> 9) << 4) + 15] = length;
  var h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  var k = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];
  // The constants above are intentionally local and synchronous. Browser
  // SubtleCrypto is asynchronous, while this projection is a synchronous
  // checkpoint read in both browser and Node harnesses.
  for (var offset = 0; offset < words.length; offset += 16) {
    var w = new Array(64);
    for (i = 0; i < 16; i++) w[i] = words[offset + i] | 0;
    for (i = 16; i < 64; i++) {
      var s0 = rotate(w[i - 15], 7) ^ rotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      var s1 = rotate(w[i - 2], 17) ^ rotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    var a=h[0],b=h[1],c=h[2],d=h[3],e=h[4],f=h[5],g=h[6],hh=h[7];
    for (i = 0; i < 64; i++) {
      var one = rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25);
      var choose = (e & f) ^ (~e & g);
      var t1 = (hh + one + choose + k[i] + w[i]) | 0;
      var zero = rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22);
      var majority = (a & b) ^ (a & c) ^ (b & c);
      var t2 = (zero + majority) | 0;
      hh=g; g=f; f=e; e=(d+t1)|0; d=c; c=b; b=a; a=(t1+t2)|0;
    }
    h[0]=(h[0]+a)|0; h[1]=(h[1]+b)|0; h[2]=(h[2]+c)|0; h[3]=(h[3]+d)|0;
    h[4]=(h[4]+e)|0; h[5]=(h[5]+f)|0; h[6]=(h[6]+g)|0; h[7]=(h[7]+hh)|0;
  }
  return h.map(function (value) { return ('00000000' + (value >>> 0).toString(16)).slice(-8); }).join('');
}

function ownerFor(path) {
  if (/^commission(?:\.|$)/.test(String(path || ''))) return 'commission';
  var match = /^stages\.([^.[\]]+)/.exec(String(path || ''));
  return match ? match[1] : null;
}

function finding(code, path, message) {
  return { code: code, class: 'conformance', severity: 'error', blocking: true,
    ownerStage: ownerFor(path), ownerPath: path, path: path, message: message };
}

function leafPairs(value, valuePath, sourcePath, direct) {
  if (Array.isArray(value)) {
    if (!value.length) direct.push({ valuePath: valuePath, ownerStage: ownerFor(sourcePath) || 'commission', sourcePath: sourcePath });
    else value.forEach(function (item, index) { leafPairs(item, valuePath + '[' + index + ']', sourcePath + '[' + index + ']', direct); });
    return;
  }
  if (value && typeof value === 'object') {
    var keys = Object.keys(value);
    if (!keys.length) direct.push({ valuePath: valuePath, ownerStage: ownerFor(sourcePath) || 'commission', sourcePath: sourcePath });
    else keys.forEach(function (key) { leafPairs(value[key], valuePath + '.' + key, sourcePath + '.' + key, direct); });
    return;
  }
  direct.push({ valuePath: valuePath, ownerStage: ownerFor(sourcePath) || 'commission', sourcePath: sourcePath });
}

function promiseValid(value) {
  if (typeof value !== 'string') return false;
  var text = value.trim();
  if (!text || text.length > 280) return false;
  var sentences = text.match(/[.!?](?:\s|$)/g) || [];
  return sentences.length <= 1;
}

function ownerPaths(pipeline) {
  return {
    intent: pipeline === 'skeleton-flesh' ? 'stages.skeleton.meta.artifactIntent' : 'stages.shellIdentity.meta.artifactIntent',
    design: 'stages.gameRulebook.gameRulebook.artifactDesign'
  };
}

function experienceDesignView(bank, pipeline) {
  var paths = ownerPaths(pipeline);
  var pristineRulebook = pathGet(bank, 'stages.gameRulebook.gameRulebook') || {};
  if (pipeline !== 'standard') {
    return { design: pathGet(bank, paths.design), amendments: null };
  }
  var amendments = pathGet(bank, 'stages.shellIdentity.meta.rulebookAmendments');
  var applied = applyRulebookAmendments(pristineRulebook, amendments);
  return {
    design: (((applied || {}).rulebook || {}).artifactDesign),
    amendments: amendments || null
  };
}

function declaredRefs(bank, pipeline, design) {
  var paths = ownerPaths(pipeline);
  var known = {};
  function put(value) { if (value) known[String(value).toLowerCase()] = true; }
  var effectiveDesign = design || pathGet(bank, paths.design) || {};
  (Array.isArray(effectiveDesign.commitments) ? effectiveDesign.commitments : []).forEach(function (row) {
    put((row || {}).surface);
  });
  var spine = pathGet(bank, pipeline === 'skeleton-flesh' ? 'stages.skeleton.meta.playSpine' : 'stages.shellSpine.meta.playSpine') || {};
  (Array.isArray(spine.economyGraph) ? spine.economyGraph : []).forEach(function (edge) { put((edge || {}).from); put((edge || {}).to); });
  put('boss');
  // Reckoning surfaces are structurally owned by their named week. Their
  // printed body is not paid until prose, so their reference is an allowed
  // future surface rather than a fabricated current one.
  var plans = pipeline === 'skeleton-flesh'
    ? pathGet(bank, 'stages.skeleton.weekPlan') : pathGet(bank, 'stages.campaignPlan.weeks');
  (Array.isArray(plans) ? plans : []).forEach(function (week) {
    put('reckoning:W' + Number((week || {}).weekNumber));
  });
  return known;
}

export function validateArtifactExperienceContract(bank, options) {
  var pipeline = options && options.pipeline === 'skeleton-flesh' ? 'skeleton-flesh' : 'standard';
  var paths = ownerPaths(pipeline);
  var intent = pathGet(bank, paths.intent);
  var design = experienceDesignView(bank, pipeline).design;
  var blocking = [];
  var commission = (options || {}).commission || {};
  ['brief', 'workout'].forEach(function (key) {
    if (!Object.prototype.hasOwnProperty.call(commission, key)) {
      blocking.push(finding('artifact-experience-given-loss', 'commission.' + key,
        'The experience projection requires the original commission ' + key + '.'));
    }
  });
  var promisePath = paths.intent + '.artifactPromise';
  if (!intent || !Object.prototype.hasOwnProperty.call(intent, 'artifactPromise')) {
    blocking.push(finding('artifact-promise-missing', promisePath, 'This owner must state the book\'s one-sentence artifact promise.'));
  } else if (!promiseValid(intent.artifactPromise)) {
    blocking.push(finding('artifact-promise-invalid', promisePath, 'artifactPromise must be one concise sentence of at most 280 characters.'));
  }
  if (!design || typeof design !== 'object' || Array.isArray(design) || !design.governingConceit) {
    blocking.push(finding('artifact-experience-given-loss', paths.design + '.governingConceit', 'The experience projection needs the rulebook\'s governing conceit.'));
  }
  if (design && typeof design === 'object' && !Array.isArray(design)) {
    Object.keys(design).forEach(function (key) {
      if (key === 'governingConceit' || key === 'commitments') return;
      blocking.push(finding(key === 'artifactPromise' ? 'artifact-design-duplicate-authority' : 'artifact-design-extra-field',
        paths.design + '.' + key, 'artifactDesign has exactly governingConceit and commitments.'));
    });
    var commitments = Array.isArray(design.commitments) ? design.commitments : [];
    var known = declaredRefs(bank, pipeline, design);
    commitments.forEach(function (row, index) {
      if (commitments.some(function (other, otherIndex) { return otherIndex < index && canonical(other) === canonical(row); })) {
        blocking.push(finding('artifact-commitment-duplicate', paths.design + '.commitments[' + index + ']', 'A commitment may not duplicate another commitment.'));
      }
      (Array.isArray((row || {}).downstreamRefs) ? row.downstreamRefs : []).forEach(function (ref, refIndex) {
        if (!known[String(ref || '').toLowerCase()]) blocking.push(finding('artifact-commitment-unresolved',
          paths.design + '.commitments[' + index + '].downstreamRefs[' + refIndex + ']', 'Commitment downstream reference does not resolve: ' + ref));
      });
    });
  }
  return { blocking: deepFreeze(blocking) };
}

export function readArtifactExperienceProjection(bank, options) {
  var validation = validateArtifactExperienceContract(bank, options);
  if (validation.blocking.length) return { projection: null, blocking: validation.blocking };
  var pipeline = options && options.pipeline === 'skeleton-flesh' ? 'skeleton-flesh' : 'standard';
  var paths = ownerPaths(pipeline);
  var commission = (options || {}).commission || {};
  var intent = pathGet(bank, paths.intent);
  var designView = experienceDesignView(bank, pipeline);
  var design = designView.design;
  var projection = {
    artifactPromise: clone(intent.artifactPromise),
    governingConceit: clone(design.governingConceit),
    commitments: clone(design.commitments),
    givens: { brief: clone(commission.brief), workout: clone(commission.workout) },
    provenance: { direct: [], derived: [] }
  };
  leafPairs(projection.artifactPromise, 'experience.artifactPromise', paths.intent + '.artifactPromise', projection.provenance.direct);
  leafPairs(projection.governingConceit, 'experience.governingConceit', paths.design + '.governingConceit', projection.provenance.direct);
  leafPairs(projection.commitments, 'experience.commitments', paths.design + '.commitments', projection.provenance.direct);
  leafPairs(projection.givens.brief, 'experience.givens.brief', 'commission.brief', projection.provenance.direct);
  leafPairs(projection.givens.workout, 'experience.givens.workout', 'commission.workout', projection.provenance.direct);
  if (pipeline === 'standard' && designView.amendments) {
    var renames = Array.isArray(designView.amendments.renames) ? designView.amendments.renames : [];
    projection.provenance.direct = projection.provenance.direct.filter(function (row) {
      if (String(row.valuePath || '').indexOf('experience.commitments') !== 0) return true;
      var rawValue = pathGet(bank, row.sourcePath);
      var projectedValue = pathGet({ experience: projection }, row.valuePath);
      if (canonical(rawValue) === canonical(projectedValue)) return true;
      var renameIndex = renames.findIndex(function (rename) {
        return rename && rename.from === rawValue && rename.to === projectedValue;
      });
      if (renameIndex < 0) return true;
      var amendmentBase = 'stages.shellIdentity.meta.rulebookAmendments.renames[' + renameIndex + ']';
      projection.provenance.derived.push({
        valuePath: row.valuePath,
        derivation: 'accepted-rulebook-rename',
        inputs: [
          { ownerStage: 'gameRulebook', sourcePath: row.sourcePath },
          { ownerStage: 'shellIdentity', sourcePath: amendmentBase + '.from' },
          { ownerStage: 'shellIdentity', sourcePath: amendmentBase + '.to' },
          { ownerStage: 'shellIdentity', sourcePath: amendmentBase + '.why' }
        ]
      });
      return false;
    });
  }
  projection.provenance.direct.sort(function (a, b) { return a.valuePath < b.valuePath ? -1 : (a.valuePath > b.valuePath ? 1 : 0); });
  projection.provenance.derived.sort(function (a, b) { return a.valuePath < b.valuePath ? -1 : (a.valuePath > b.valuePath ? 1 : 0); });
  projection.experienceDigest = sha256(canonical({ artifactPromise: projection.artifactPromise, governingConceit: projection.governingConceit,
    commitments: projection.commitments, givens: projection.givens }));
  return { projection: deepFreeze(projection), blocking: validation.blocking };
}

function materializedSurface(_booklet, index, ref) {
  return resolveMaterializedSurfaceRef(index, ref).ok;
}

function projectionOwner(projection, valuePath) {
  var provenance = (projection || {}).provenance || {};
  var rows = (provenance.direct || []).concat(provenance.derived || []);
  var row = rows.find(function (entry) { return entry && entry.valuePath === valuePath; });
  if (!row) return { ownerStage: '', ownerPath: valuePath };
  if (row.ownerStage) return { ownerStage: row.ownerStage, ownerPath: row.sourcePath || valuePath };
  var inputs = row.inputs || [];
  var source = inputs.find(function (input) { return input && input.ownerStage === 'gameRulebook'; });
  return source
    ? { ownerStage: source.ownerStage, ownerPath: source.sourcePath }
    : { ownerStage: '', ownerPath: valuePath };
}

export function compareArtifactExperienceMaterialization(projection, booklet) {
  var doc = booklet || {};
  var drifts = [];
  var actualIndex = buildMaterializedSurfaceIndex(doc);
  var surfaceIndex = { promise: { resolved: String((((doc.meta || {}).artifactIntent || {}).artifactPromise || '')) === String((projection || {}).artifactPromise || '') }, commitments: [] };
  if (!surfaceIndex.promise.resolved) {
    var promiseOwner = projectionOwner(projection, 'experience.artifactPromise');
    drifts.push({ code: 'artifact-experience-materialization-drift', kind: 'promise', class: 'conformance', severity: 'error', blocking: true,
      ownerStage: promiseOwner.ownerStage, ownerPath: promiseOwner.ownerPath, path: promiseOwner.ownerPath,
      message: 'The assembled book did not preserve its promised experience.' });
  }
  (Array.isArray((projection || {}).commitments) ? projection.commitments : []).forEach(function (commitment, index) {
    var surfaceOK = materializedSurface(doc, actualIndex, commitment.surface);
    var downstreamOK = (Array.isArray(commitment.downstreamRefs) ? commitment.downstreamRefs : []).every(function (ref) {
      return materializedSurface(doc, actualIndex, ref);
    });
    // A gameplay commitment promises an operated game, not merely a named
    // reckoning or week. The assembly index therefore requires at least one
    // authored clock for this category; deleting every clock must not leave a
    // structurally named but unreadable "game" looking materialized.
    var categoryOK = true;
    if (commitment.kind === 'gameplay-element') {
      categoryOK = (doc.weeks || []).some(function (week) {
        return Array.isArray((week || {}).gameplayClocks) && week.gameplayClocks.length > 0;
      });
    }
    surfaceIndex.commitments.push({ kind: commitment.kind, surface: commitment.surface, resolved: surfaceOK && downstreamOK && categoryOK });
    if (surfaceOK && downstreamOK && categoryOK) return;
    var kind = !surfaceOK || !categoryOK ? (commitment.surface === 'boss' ? 'boss'
      : (/^reckoning:/i.test(String(commitment.surface || '')) ? 'downstream'
      : (commitment.kind === 'gameplay-element' ? 'gameplay' : commitment.kind))) : 'downstream';
    var commitmentOwner = projectionOwner(projection, 'experience.commitments[' + index + '].surface');
    drifts.push({ code: 'artifact-experience-materialization-drift', kind: kind,
      class: 'conformance', severity: 'error', blocking: true, ownerStage: commitmentOwner.ownerStage,
      ownerPath: commitmentOwner.ownerPath, path: commitmentOwner.ownerPath,
      message: 'The assembled book lost a promised experience surface.' });
  });
  return { preserved: drifts.length === 0, drifts: drifts, surfaceIndex: surfaceIndex,
    before: projection || null, after: doc };
}
