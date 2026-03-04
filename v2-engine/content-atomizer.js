// ── Content Atomizer: Pipeline JSON → Atom Inventory ──────────
//
// Bridge layer that converts the v2 finalPayload into a typed
// atom inventory with relationships and groups.
//
// Phase 1 of the Layout Governor v3.0 architecture. Purely
// additive — no existing renderers or data shapes are modified.
//
// Depends on: (none — pure data transformation)
//
// Exposed: window.atomize

// ── Schema (JSDoc) ───────────────────────────────────────────

/**
 * @typedef {Object} Atom
 * @property {string}      id           Deterministic ID (see conventions)
 * @property {string}      type         Atom type from taxonomy
 * @property {Object}      content      Type-specific rendering data
 * @property {number|null} week         Week number (null for structural)
 * @property {number|null} session      Day/session number (null for non-session)
 * @property {BreakPolicy} breakPolicy  Pagination constraints
 * @property {string}      sizeHint     'minimal' | 'standard' | 'generous'
 * @property {number}      priority     0-1, drop order (1 = essential)
 */

/**
 * @typedef {Object} BreakPolicy
 * @property {number}  keepWithNextStrength  0-100, affinity to next atom
 * @property {boolean} mustNotSplit          true = genuinely indivisible
 */

/**
 * @typedef {Object} Relationship
 * @property {string}  type   mechanic-narrative | trigger-unlock |
 *                            branch-destination | progressive-reveal |
 *                            keep-together
 * @property {string}  from   Source atom ID
 * @property {string}  to     Target atom ID
 * @property {string} [label] Human-readable description
 */

/**
 * @typedef {Object} AtomGroup
 * @property {string}   id               Group identifier
 * @property {string}   groupType        session | week | archive-section |
 *                                       ref-week | evidence-series |
 *                                       rules-manual | tracker-sheet
 * @property {string[]} members          Ordered atom IDs
 */

/**
 * @typedef {Object} AtomInventory
 * @property {Object.<string, Atom>} atoms  All atoms keyed by ID
 * @property {Relationship[]} relationships Cross-atom edges
 * @property {AtomGroup[]} groups           Composition groups
 */

// ── Helpers ──────────────────────────────────────────────────

function slugify(str) {
    return String(str || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// ── Main ─────────────────────────────────────────────────────

/**
 * Convert assembled finalPayload into an atom inventory.
 * Deterministic: same input always produces identical output.
 *
 * @param {Object} finalPayload  Assembled pipeline data
 * @returns {AtomInventory}
 */
function atomize(finalPayload) {
    var atoms = {};
    var relationships = [];
    var groups = [];

    var data = finalPayload || {};
    var meta = data.meta || {};
    var workout = data.workout || {};
    var mechanics = data.mechanics || {};
    var theme = data.theme || {};
    var voice = data.voice || {};
    var story = data.story || {};
    var mapData = data.map || {};
    var totalWeeks = workout.totalWeeks || 0;
    var refScheme = story.refScheme || { prefix: 'R', weekDigits: 1, sessionDigits: 1 };
    var encounters = story.encounters || [];
    var sessionTypes = workout.sessionTypes || [];
    var clocks = mechanics.clocks || [];
    var tracks = mechanics.tracks || [];
    var resources = mechanics.resources || [];
    var modifiers = mechanics.modifiers || [];
    var archives = story.archives || {};
    var endings = story.endings || [];
    var evidence = story.evidence || {};

    function add(atom) { atoms[atom.id] = atom; return atom.id; }
    function rel(type, from, to, label) {
        relationships.push({ type: type, from: from, to: to, label: label || null });
    }

    // ── 1. Structural Atoms ─────────────────────────────────

    // Cover
    add({
        id: 'cover',
        type: 'cover',
        content: {
            meta: meta,
            voice: voice.cover || {},
            art: theme.art || {},
            visualArchetype: theme.visualArchetype
        },
        week: null, session: null,
        breakPolicy: { keepWithNextStrength: 0, mustNotSplit: true },
        sizeHint: 'standard', priority: 1
    });

    // Rules manual sections
    var manualSections = (voice.manual && voice.manual.sections) || [];
    var manualIds = [];
    for (var mi = 0; mi < manualSections.length; mi++) {
        manualIds.push(add({
            id: 'rules.' + mi,
            type: 'rules-manual-section',
            content: {
                heading: manualSections[mi].heading,
                body: manualSections[mi].body,
                manualTitle: (voice.manual && voice.manual.title) || '',
                isFirst: mi === 0
            },
            week: null, session: null,
            breakPolicy: { keepWithNextStrength: 40, mustNotSplit: false },
            sizeHint: 'standard', priority: 0.9
        }));
    }
    if (manualIds.length) {
        groups.push({ id: 'group.rules-manual', groupType: 'rules-manual', members: manualIds });
    }

    // Setup block
    if (workout.setup) {
        add({
            id: 'setup',
            type: 'setup-block',
            content: workout.setup,
            week: null, session: null,
            breakPolicy: { keepWithNextStrength: 0, mustNotSplit: true },
            sizeHint: 'standard', priority: 0.9
        });
    }

    // ── 2. Mechanic Atoms ───────────────────────────────────

    var trackerIds = [];

    // Clocks + archive triggers
    for (var ci = 0; ci < clocks.length; ci++) {
        var clockSlug = slugify(clocks[ci].name);
        trackerIds.push(add({
            id: 'clock.' + clockSlug,
            type: 'clock-display',
            content: clocks[ci],
            week: null, session: null,
            breakPolicy: { keepWithNextStrength: 30, mustNotSplit: true },
            sizeHint: 'minimal', priority: 0.85
        }));

        if (clocks[ci].onTrigger && clocks[ci].onTrigger.section) {
            var trigId = 'archive-trigger.' + clockSlug;
            trackerIds.push(add({
                id: trigId,
                type: 'archive-trigger',
                content: {
                    clockName: clocks[ci].name,
                    triggerAt: clocks[ci].triggerAt,
                    section: clocks[ci].onTrigger.section,
                    action: clocks[ci].onTrigger.action,
                    order: clocks[ci].onTrigger.order
                },
                week: null, session: null,
                breakPolicy: { keepWithNextStrength: 50, mustNotSplit: true },
                sizeHint: 'minimal', priority: 0.8
            }));
            // Link trigger to first archive node in that section
            rel('trigger-unlock', trigId, 'archive.' + clocks[ci].onTrigger.section + '.0',
                clocks[ci].name + ' triggers archive');
        }
    }

    // Tracks
    for (var ti = 0; ti < tracks.length; ti++) {
        var tSlug = tracks[ti].id || slugify(tracks[ti].name);
        trackerIds.push(add({
            id: 'track.' + tSlug,
            type: 'track-display',
            content: tracks[ti],
            week: null, session: null,
            breakPolicy: { keepWithNextStrength: 30, mustNotSplit: true },
            sizeHint: 'minimal', priority: 0.85
        }));
    }

    // Resources
    for (var ri = 0; ri < resources.length; ri++) {
        trackerIds.push(add({
            id: 'resource.' + slugify(resources[ri].name),
            type: 'resource-display',
            content: resources[ri],
            week: null, session: null,
            breakPolicy: { keepWithNextStrength: 30, mustNotSplit: true },
            sizeHint: 'minimal', priority: 0.85
        }));
    }

    // Modifiers
    for (var modi = 0; modi < modifiers.length; modi++) {
        trackerIds.push(add({
            id: 'modifier.' + modi,
            type: 'modifier-display',
            content: modifiers[modi],
            week: null, session: null,
            breakPolicy: { keepWithNextStrength: 20, mustNotSplit: true },
            sizeHint: 'minimal', priority: 0.7
        }));
    }

    // Tracker sheet group
    if (trackerIds.length) {
        groups.push({ id: 'group.tracker-sheet', groupType: 'tracker-sheet', members: trackerIds });
    }

    // Dice table (shared mechanic, referenced per session)
    if (mechanics.dice) {
        add({
            id: 'dice-table',
            type: 'dice-table',
            content: mechanics.dice,
            week: null, session: null,
            breakPolicy: { keepWithNextStrength: 0, mustNotSplit: true },
            sizeHint: 'minimal', priority: 0.9
        });
    }

    // Dice outcome → mechanic relationships
    var diceOutcomes = (mechanics.dice && mechanics.dice.outcomes) || [];
    for (var doi = 0; doi < diceOutcomes.length; doi++) {
        if (diceOutcomes[doi].ticks) {
            var tickTarget = diceOutcomes[doi].ticks;
            for (var tci = 0; tci < clocks.length; tci++) {
                if (clocks[tci].name === tickTarget) {
                    rel('mechanic-narrative', 'dice-table', 'clock.' + slugify(clocks[tci].name),
                        diceOutcomes[doi].name + ' ticks ' + clocks[tci].name);
                    break;
                }
            }
            for (var tti = 0; tti < tracks.length; tti++) {
                if (tracks[tti].name === tickTarget || tracks[tti].id === tickTarget) {
                    rel('mechanic-narrative', 'dice-table', 'track.' + (tracks[tti].id || slugify(tracks[tti].name)),
                        diceOutcomes[doi].name + ' ticks ' + tracks[tti].name);
                    break;
                }
            }
        }
    }

    // ── 3. Per-Week Atoms ───────────────────────────────────

    for (var w = 1; w <= totalWeeks; w++) {
        var weekAtomIds = [];
        var weekRefIds = [];

        // Filter encounters for this week
        var weekEncs = [];
        for (var ei = 0; ei < encounters.length; ei++) {
            if (encounters[ei].week === w) weekEncs.push(encounters[ei]);
        }

        for (var se = 0; se < weekEncs.length; se++) {
            var enc = weekEncs[se];
            var day = enc.day;
            var sk = 'wk' + w + '.d' + day;

            // Match session type by day
            var matched = null;
            for (var sti = 0; sti < sessionTypes.length; sti++) {
                if (sessionTypes[sti].days && sessionTypes[sti].days.indexOf(day) !== -1) {
                    matched = sessionTypes[sti];
                    break;
                }
            }

            // Encounter scaffold
            var scaffId = add({
                id: sk + '.scaffold',
                type: 'encounter-scaffold',
                content: {
                    encId: enc.id, title: enc.title, week: w, day: day,
                    narrative: enc.narrative, challenge: enc.challenge,
                    special: enc.special || null,
                    visualWeight: enc.visualWeight || 'standard',
                    bossRules: enc.bossRules || null,
                    options: enc.options || null,
                    marginalia: enc.marginalia || null,
                    pacingHint: enc.pacingHint || null
                },
                week: w, session: day,
                breakPolicy: {
                    keepWithNextStrength: 60,
                    mustNotSplit: enc.special === 'boss'
                },
                sizeHint: enc.visualWeight === 'crisis' ? 'generous' :
                          (enc.visualWeight === 'sparse' ? 'minimal' : 'standard'),
                priority: 1
            });

            // Workout session
            var wkAtomId = add({
                id: sk + '.workout',
                type: 'workout-session',
                content: {
                    sessionType: matched,
                    weekIntensity: (workout.weekIntensities || [])[w - 1],
                    intensityUnit: workout.intensityUnit,
                    weightColumnLabel: workout.weightColumnLabel
                },
                week: w, session: day,
                breakPolicy: { keepWithNextStrength: 0, mustNotSplit: true },
                sizeHint: 'standard', priority: 1
            });

            // Conditional instructions
            var condIds = [];
            var conds = enc.conditionalInstructions || [];
            for (var condi = 0; condi < conds.length; condi++) {
                condIds.push(add({
                    id: sk + '.cond.' + condi,
                    type: 'condition-check',
                    content: conds[condi],
                    week: w, session: day,
                    breakPolicy: { keepWithNextStrength: 20, mustNotSplit: true },
                    sizeHint: 'minimal', priority: 0.7
                }));
            }

            // REF code for this encounter
            var refCode = refScheme.prefix +
                String(w).padStart(refScheme.weekDigits || 1, '0') +
                String(day).padStart(refScheme.sessionDigits || 1, '0');

            // REF router
            var encRefIds = [];
            var routerAtomId = null;
            if (story.refs && story.refs[refCode]) {
                routerAtomId = add({
                    id: 'ref.' + refCode,
                    type: 'ref-router',
                    content: {
                        refCode: refCode,
                        html: story.refs[refCode].html,
                        nodeType: story.refs[refCode].type
                    },
                    week: w, session: day,
                    breakPolicy: { keepWithNextStrength: 50, mustNotSplit: true },
                    sizeHint: 'standard', priority: 0.95
                });
                encRefIds.push(routerAtomId);
                rel('branch-destination', scaffId, routerAtomId, 'Encounter → REF router');
            }

            // REF outcomes (one per dice outcome)
            var encOutcomes = enc.outcomes || [];
            for (var oi = 0; oi < encOutcomes.length; oi++) {
                // Suffix lives on dice outcomes, not encounter outcomes.
                // Look up by name match, fall back to array index.
                var suffix = encOutcomes[oi].suffix;
                if (!suffix && diceOutcomes.length) {
                    for (var dsi = 0; dsi < diceOutcomes.length; dsi++) {
                        if (diceOutcomes[dsi].name === encOutcomes[oi].name) {
                            suffix = diceOutcomes[dsi].suffix;
                            break;
                        }
                    }
                }
                if (!suffix) {
                    suffix = String(oi + 1);
                }
                suffix = suffix || '';
                var branchCode = refCode + suffix;
                if (story.refs && story.refs[branchCode]) {
                    var brAtomId = add({
                        id: 'ref.' + branchCode,
                        type: 'ref-outcome',
                        content: {
                            refCode: branchCode,
                            html: story.refs[branchCode].html,
                            nodeType: story.refs[branchCode].type,
                            outcomeName: encOutcomes[oi].name,
                            range: encOutcomes[oi].range
                        },
                        week: w, session: day,
                        breakPolicy: { keepWithNextStrength: 40, mustNotSplit: true },
                        sizeHint: 'standard', priority: 0.9
                    });
                    encRefIds.push(brAtomId);
                    if (routerAtomId) {
                        rel('branch-destination', routerAtomId, brAtomId, 'Router → outcome');
                    }
                }
            }
            weekRefIds = weekRefIds.concat(encRefIds);

            // Session group: scaffold + workout + conditions + dice + refs
            var sessMembers = [scaffId, wkAtomId].concat(condIds);
            if (atoms['dice-table']) sessMembers.push('dice-table');
            sessMembers = sessMembers.concat(encRefIds);
            groups.push({
                id: 'group.' + sk,
                groupType: 'session',
                members: sessMembers,

            });

            // Keep-together: boss encounter + its rules
            if (enc.special === 'boss' && enc.bossRules) {
                rel('keep-together', scaffId, wkAtomId, 'Boss encounter + workout on same spread');
            }

            weekAtomIds = weekAtomIds.concat([scaffId, wkAtomId]).concat(condIds).concat(encRefIds);
        }

        // Map atom for this week
        if (mapData && mapData.weeks && mapData.weeks[String(w)]) {
            var mapType = mapData.type || 'facility-grid';
            var mapId = add({
                id: 'map.wk' + w,
                type: mapType,
                content: { mapData: mapData, week: w },
                week: w, session: null,
                breakPolicy: { keepWithNextStrength: 0, mustNotSplit: true },
                sizeHint: 'standard', priority: 0.8
            });
            weekAtomIds.push(mapId);

            if (w > 1 && atoms['map.wk' + (w - 1)]) {
                rel('progressive-reveal', 'map.wk' + (w - 1), mapId, 'Map evolves week to week');
            }
        }

        // Week-end check-in
        var checkinQ = null;
        if (workout.weekEndCheckin) {
            if (Array.isArray(workout.weekEndCheckin)) {
                checkinQ = workout.weekEndCheckin;
            } else if (workout.weekEndCheckin[String(w)]) {
                checkinQ = workout.weekEndCheckin[String(w)];
            }
        }
        if (checkinQ) {
            var checkinId = add({
                id: 'week-checkin.wk' + w,
                type: 'week-checkin',
                content: {
                    week: w,
                    questions: checkinQ,
                    label: (voice.labels && voice.labels.weekEndCheckin) || 'WEEK-END CHECK-IN'
                },
                week: w, session: null,
                breakPolicy: { keepWithNextStrength: 0, mustNotSplit: true },
                sizeHint: 'minimal', priority: 0.7
            });
            weekAtomIds.push(checkinId);
        }

        // Week group (all atoms for this week)
        groups.push({
            id: 'group.wk' + w,
            groupType: 'week',
            members: weekAtomIds,

        });

        // REF week group
        if (weekRefIds.length) {
            groups.push({
                id: 'group.ref.wk' + w,
                groupType: 'ref-week',
                members: weekRefIds,

            });
        }
    }

    // ── 4. Archive Atoms ────────────────────────────────────

    var archiveKeys = Object.keys(archives);
    for (var ak = 0; ak < archiveKeys.length; ak++) {
        var sectionKey = archiveKeys[ak];
        var section = archives[sectionKey];
        var nodes = section.nodes || [];
        var archiveAtomIds = [];

        // Classification badge
        archiveAtomIds.push(add({
            id: 'badge.archive.' + sectionKey,
            type: 'classification-badge',
            content: {
                sectionKey: sectionKey,
                title: (voice.archive && voice.archive[sectionKey + 'Title']) || sectionKey,
                intro: (voice.archive && voice.archive[sectionKey + 'Intro']) || '',
                classification: voice.classifications
            },
            week: null, session: null,
            breakPolicy: { keepWithNextStrength: 60, mustNotSplit: true },
            sizeHint: 'minimal', priority: 0.8
        }));

        // Found document atoms (type determined by archive format)
        var formatMap = {
            'memo': 'memo-document',
            'journal': 'journal-entry',
            'transmission': 'transmission-log',
            'letter': 'letter-document',
            'clipping': 'news-clipping',
            'incident-report': 'incident-report',
            'fragment-columns': 'fragment-columns'
        };
        var docType = formatMap[section.format] || 'memo-document';

        for (var ni = 0; ni < nodes.length; ni++) {
            archiveAtomIds.push(add({
                id: 'archive.' + sectionKey + '.' + ni,
                type: docType,
                content: {
                    node: nodes[ni],
                    format: section.format,
                    formatConfig: section.formatConfig || {},
                    sectionKey: sectionKey
                },
                week: null, session: null,
                breakPolicy: { keepWithNextStrength: 30, mustNotSplit: true },
                sizeHint: 'standard', priority: 0.85
            }));
        }

        groups.push({
            id: 'group.archive.' + sectionKey,
            groupType: 'archive-section',
            members: archiveAtomIds,

        });
    }

    // ── 5. Endings ──────────────────────────────────────────

    for (var endi = 0; endi < endings.length; endi++) {
        add({
            id: 'ending.' + (endings[endi].id || endi),
            type: 'ending-block',
            content: {
                ending: endings[endi],
                endingsTitle: (voice.archive && voice.archive.endingsTitle) || 'ENDINGS',
                endingsTrigger: (voice.archive && voice.archive.endingsTrigger) || null,
                isFirst: endi === 0
            },
            week: null, session: null,
            breakPolicy: { keepWithNextStrength: 40, mustNotSplit: true },
            sizeHint: 'standard', priority: 0.9
        });
    }

    // ── 6. Evidence Atoms ───────────────────────────────────

    var evidenceTracks = tracks.filter(function(t) {
        return t.type === 'faction' || t.type === 'progress';
    });
    for (var eti = 0; eti < evidenceTracks.length; eti++) {
        var evTrack = evidenceTracks[eti];
        var evSeriesIds = [];

        for (var ew = 1; ew <= totalWeeks; ew++) {
            var evKey = 'ev-' + evTrack.id + '-w' + ew;
            if (evidence[evKey]) {
                var evAtomId = add({
                    id: 'ev.' + evTrack.id + '.w' + ew,
                    type: 'evidence-node',
                    content: {
                        key: evKey,
                        trackId: evTrack.id,
                        trackName: evTrack.name,
                        week: ew,
                        html: evidence[evKey].html,
                        nodeType: evidence[evKey].type
                    },
                    week: ew, session: null,
                    breakPolicy: { keepWithNextStrength: 40, mustNotSplit: true },
                    sizeHint: 'standard', priority: 0.8
                });
                evSeriesIds.push(evAtomId);
            }
        }

        if (evSeriesIds.length) {
            groups.push({
                id: 'group.evidence.' + evTrack.id,
                groupType: 'evidence-series',
                members: evSeriesIds,

            });
        }
    }

    // ── 7. Final Page ─────────────────────────────────────────
    // Back cover is handled by padToMultipleOf4() in box-packer.js,
    // not atomized — it's a fixed template, not LLM-generated content.

    if (voice.finalPage) {
        add({
            id: 'final',
            type: 'final',
            content: voice.finalPage,
            week: null, session: null,
            breakPolicy: { keepWithNextStrength: 0, mustNotSplit: true },
            sizeHint: 'standard', priority: 1
        });
    }

    // ── 8. Structural Atoms (quote-page, pacing-breath) ────────

    var structuralAtoms = data.structuralAtoms || [];
    for (var sai = 0; sai < structuralAtoms.length; sai++) {
        var sa = structuralAtoms[sai];
        var saType = sa.type;
        var saPlacement = sa.placement || {};
        var saId = 'structural.' + saType + '.' + sai;

        add({
            id: saId,
            type: saType,
            content: sa.content || {},
            week: null, session: null,
            breakPolicy: { keepWithNextStrength: 0, mustNotSplit: true },
            sizeHint: saType === 'quote-page' ? 'generous' : 'minimal',
            priority: typeof saPlacement.priority === 'number' ? saPlacement.priority : 0.5
        });

        // Store placement hint for governor's groupByAffinity
        atoms[saId]._placement = saPlacement;

        // Group: one group per structural atom
        groups.push({
            id: 'group.structural.' + sai,
            groupType: saType,
            members: [saId]
        });
    }

    // ── Return ──────────────────────────────────────────────

    return {
        atoms: atoms,
        relationships: relationships,
        groups: groups
    };
}

window.atomize = atomize;
