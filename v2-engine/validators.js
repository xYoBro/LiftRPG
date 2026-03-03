// ── Validation logic for all pipeline stages ──────────────────
//
// Pure data validation — no DOM interaction.
// Returns { errors: [], warnings: [] } from each function.
//
// Exposed: window.scanBannedWords, window.hexLuminance,
//          window.validateWiringBlueprint, window.validateStageData

// --- Quality Governor: Helper Functions ---

function scanBannedWords(obj, path, warnings) {
    var banned = /\b(terrifying|chilling|sinister|evil|looming|epic|badass|sudden|suddenly|eerie|ominous|foreboding|mysterious)\b/gi;
    if (!obj || typeof obj !== 'object') return;
    for (var key in obj) {
        if (!obj.hasOwnProperty(key)) continue;
        var val = obj[key];
        if (typeof val === 'string') {
            var matches = val.match(banned);
            if (matches) {
                var unique = [...new Set(matches.map(function(m) { return m.toLowerCase(); }))];
                warnings.push('Banned word(s) in ' + path + '.' + key + ': ' + unique.join(', '));
            }
        } else if (typeof val === 'object') {
            scanBannedWords(val, path + '.' + key, warnings);
        }
    }
}

function hexLuminance(hex) {
    var r = parseInt(hex.slice(1, 3), 16) / 255;
    var g = parseInt(hex.slice(3, 5), 16) / 255;
    var b = parseInt(hex.slice(5, 7), 16) / 255;
    r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function validateWiringBlueprint(obj) {
    var e = [], w = [];

    if (!obj.gameIdentity) e.push('Missing gameIdentity');
    else {
        if (!obj.gameIdentity.coreLoop) e.push('Missing gameIdentity.coreLoop');
        if (!obj.gameIdentity.primaryTension) e.push('Missing gameIdentity.primaryTension');
        if (!obj.gameIdentity.discoveryMechanism) w.push('Missing gameIdentity.discoveryMechanism');
        if (!obj.gameIdentity.agencyModel) w.push('Missing gameIdentity.agencyModel');
    }

    if (!obj.experientialPillars) e.push('Missing experientialPillars');
    else {
        var pillars = ['exploration', 'progression', 'choicesMattering', 'selfReflection', 'rolePlaying', 'immersion'];
        var totalWeight = 0;
        pillars.forEach(function (p) {
            if (obj.experientialPillars[p]) {
                var wt = obj.experientialPillars[p].weight;
                if (typeof wt === 'number') totalWeight += wt;
                if (!obj.experientialPillars[p].expression) w.push('Pillar "' + p + '" missing expression');
            }
        });
        if (totalWeight < 8 || totalWeight > 15) {
            w.push('Pillar weights sum to ' + totalWeight + ' (expected 8-15)');
        }
    }

    if (!Array.isArray(obj.wiring)) e.push('Missing wiring array');
    else {
        if (obj.wiring.length === 0) {
            w.push('Wiring array is empty. The zine will have no mechanical topology \u2014 all mechanical choices will be ad-hoc. Every zine without wiring looks structurally identical.');
        }
        if (obj.wiring.length < 2) w.push('Only ' + obj.wiring.length + ' wire(s) — minimum 2 recommended');
        if (obj.wiring.length > 8) w.push(obj.wiring.length + ' wires may exceed paper-trackability (max 8)');

        var hasFeedback = obj.wiring.some(function (wi) {
            return wi.type === 'feedback-loop' || wi.bidirectional;
        });
        if (!hasFeedback) w.push('No feedback loops or bidirectional wires — mechanics may feel disconnected');

        var validWireTypes = ['threshold-gate', 'feedback-loop', 'conditional-routing', 'resource-cycle', 'escalation', 'unlock-chain'];
        var wireIds = {};
        obj.wiring.forEach(function (wi, idx) {
            if (!wi.id) e.push('Wire ' + idx + ' missing id');
            else if (wireIds[wi.id]) e.push('Duplicate wire id: ' + wi.id);
            else wireIds[wi.id] = true;
            if (!wi.type) e.push('Wire "' + (wi.id || idx) + '" missing type');
            else if (validWireTypes.indexOf(wi.type) === -1) e.push('Wire "' + (wi.id || idx) + '" has invalid type "' + wi.type + '". Must be one of: ' + validWireTypes.join(', '));
            if (!wi.from) e.push('Wire "' + (wi.id || idx) + '" missing from');
            if (!wi.to) e.push('Wire "' + (wi.id || idx) + '" missing to');
            if (!wi.printInstruction) e.push('Wire "' + (wi.id || idx) + '" missing printInstruction');
        });
    }

    if (!Array.isArray(obj.weeklyArc)) w.push('Missing weeklyArc array');
    else {
        // Check that referenced wire IDs exist
        var validWireIds = {};
        (obj.wiring || []).forEach(function (wi) { if (wi.id) validWireIds[wi.id] = true; });
        obj.weeklyArc.forEach(function (wa) {
            (wa.newWires || []).forEach(function (wid) {
                if (!validWireIds[wid]) w.push('weeklyArc references unknown wire id: ' + wid);
            });
        });
    }

    if (!obj.complexityProfile) w.push('Missing complexityProfile');
    else {
        if (typeof obj.complexityProfile.peakActive !== 'number') w.push('complexityProfile.peakActive should be a number');
    }

    if (!obj.mechanicalProfile) w.push('Missing mechanicalProfile');
    else {
        if (!Array.isArray(obj.mechanicalProfile.categoriesUsed)) w.push('mechanicalProfile.categoriesUsed should be an array');
        else {
            // resolution and endCondition are non-excludable — must always be in categoriesUsed
            if (obj.mechanicalProfile.categoriesUsed.indexOf('endCondition') < 0) {
                e.push('mechanicalProfile.categoriesUsed must include "endCondition" — end conditions are non-excludable (Stage 3 cross-references ending IDs)');
            }
            if (obj.mechanicalProfile.categoriesUsed.indexOf('resolution') < 0) {
                e.push('mechanicalProfile.categoriesUsed must include "resolution" — resolution is non-excludable');
            }
        }
        if (Array.isArray(obj.mechanicalProfile.categoriesExcluded)) {
            obj.mechanicalProfile.categoriesExcluded.forEach(function(exc) {
                if (exc.category === 'endCondition') e.push('categoriesExcluded cannot contain "endCondition" — end conditions are non-excludable');
                if (exc.category === 'resolution') e.push('categoriesExcluded cannot contain "resolution" — resolution is non-excludable');
            });
        }
        if (!obj.mechanicalProfile.arcShape) w.push('Missing mechanicalProfile.arcShape');
        // pageVocabulary is deprecated (v3.0.0-alpha.5) — tolerate if present, no warning if absent
    }

    return { errors: e, warnings: w };
}

function validateStageData(num, obj, currentPipelineData) {
    var e = [];
    var w = [];
    if (num === 1) {
        if (!(obj.meta && obj.meta.title)) e.push('Missing meta.title');
        if (!(obj.workout && obj.workout.totalWeeks)) e.push('Missing workout.totalWeeks');
        if (!(obj.workout && obj.workout.sessionTypes && obj.workout.sessionTypes.length)) e.push('Missing workout.sessionTypes[]');
        if (!(obj.mechanics && obj.mechanics.dice)) e.push('Missing mechanics.dice');
        if (!(obj.mechanics && obj.mechanics.endConditions && obj.mechanics.endConditions.length)) e.push('Missing mechanics.endConditions[]');
        if (!(obj.theme && obj.theme.colors)) e.push('Missing theme.colors');
        else {
            var colorKeys = ['ink', 'paper', 'fog', 'accent', 'muted'];
            for (var ci = 0; ci < colorKeys.length; ci++) {
                var k = colorKeys[ci];
                if (!obj.theme.colors[k]) e.push('Missing theme.colors.' + k);
                else if (!/^#[0-9a-fA-F]{6}$/.test(obj.theme.colors[k])) e.push('theme.colors.' + k + ' is not valid hex: ' + obj.theme.colors[k]);
            }
        }
        if (!(obj.theme && obj.theme.fonts)) e.push('Missing theme.fonts');

        var validArchetypes = ['institutional', 'noir', 'terminal', 'literary', 'brutalist', 'clinical', 'confessional', 'corporate'];
        if (!(obj.theme && obj.theme.visualArchetype)) {
            w.push('Missing theme.visualArchetype — engine will fall back to "institutional". Set explicitly based on the creative brief.');
        } else if (validArchetypes.indexOf(obj.theme.visualArchetype) === -1) {
            e.push('theme.visualArchetype "' + obj.theme.visualArchetype + '" is not valid. Must be one of: ' + validArchetypes.join(', '));
        }

        // pages[] is deprecated (v3.0.0-alpha.5) — engine composes page order automatically.
        // Validate types if present, no error if absent.
        var validTypes = ['cover', 'rules-manual', 'tracker-sheet', 'setup', 'encounter-spread', 'ref-pages', 'archive', 'endings', 'evidence', 'final'];
        if (obj.pages && obj.pages.length) {
            var archiveKeysSeen = {};
            obj.pages.forEach(function(p, idx) {
                if (validTypes.indexOf(p.type) === -1) e.push('pages[' + idx + '].type is invalid: "' + p.type + '"');
                if (p.type === 'archive' && p.section) {
                    if (archiveKeysSeen[p.section]) {
                        w.push('Duplicate archive page found for section "' + p.section + '" in pages[] array.');
                    }
                    archiveKeysSeen[p.section] = true;
                }
            });
        }

        if (obj.workout && Array.isArray(obj.workout.sessionTypes)) {
            obj.workout.sessionTypes.forEach(function(st) {
                if (Array.isArray(st.exercises)) {
                    st.exercises.forEach(function(ex) {
                        if (ex.reps && String(ex.reps).length > 20) {
                            w.push('Exercise "' + ex.name + '" has oversized reps string (' + String(ex.reps).length + ' chars). Keep it to simple counts (e.g. 5, "3-5").');
                        }
                    });
                }
            });
        }

        if (!(obj.story && obj.story.encounters && obj.story.encounters.length)) e.push('Missing story.encounters[]');
        else {
            // Derive sessions-per-week from unique day numbers across all
            // sessionTypes (spec: "Days are numbered 1 through N where N is
            // sessions per week"). Falls back to sessionTypes.length if no
            // days data — but days is a required field in the schema.
            var allDays = {};
            var allDaysCount = 0;
            var sessionTypes = (obj.workout && obj.workout.sessionTypes) || [];
            sessionTypes.forEach(function(st) {
                (st.days || []).forEach(function(d) {
                    if (!allDays[d]) {
                        allDays[d] = true;
                        allDaysCount++;
                    }
                });
            });
            var sessPerWeek = allDaysCount > 0
                ? allDaysCount
                : sessionTypes.length;
            if (sessPerWeek > 0 && obj.workout && obj.workout.totalWeeks) {
                var expected = sessPerWeek * obj.workout.totalWeeks;
                if (obj.story.encounters.length !== expected) {
                    w.push('Expected ' + expected + ' encounters (' + sessPerWeek + ' sessions × ' + obj.workout.totalWeeks + ' weeks), found ' + obj.story.encounters.length + '. Engine will render what exists.');
                }
            }
            var diceOutcomes = (obj.mechanics && obj.mechanics.dice && obj.mechanics.dice.outcomes) || [];
            obj.story.encounters.forEach(function(enc, idx) {
                var encOutcomes = enc.outcomes || [];
                if (diceOutcomes.length > 0 && encOutcomes.length !== diceOutcomes.length) {
                    w.push('Encounter index ' + idx + ' outcomes length (' + encOutcomes.length + ') doesn\'t match dice outcomes (' + diceOutcomes.length + ')');
                }
                if (enc.special === 'boss' && !enc.bossRules) {
                    w.push('Encounter ' + (enc.id || idx) + ' has special:"boss" but missing bossRules object');
                }
                if (enc.bossRules && (!Array.isArray(enc.bossRules.steps) || !enc.bossRules.steps.length)) {
                    w.push('Encounter ' + (enc.id || idx) + ' bossRules has missing or empty steps array');
                }
                if (enc.special === 'branch' && (!Array.isArray(enc.options) || !enc.options.length)) {
                    w.push('Encounter ' + (enc.id || idx) + ' has special:"branch" but missing or empty options[] array');
                }
            });

            // Encounter variety check — minimum special type distribution
            var specialCounts = { boss: 0, rest: 0, branch: 0 };
            obj.story.encounters.forEach(function (enc) {
                if (enc.special && specialCounts.hasOwnProperty(enc.special)) specialCounts[enc.special]++;
            });
            if (obj.workout && obj.workout.totalWeeks >= 4) {
                if (specialCounts.boss === 0) w.push('No boss encounters found. At least 1 boss encounter is recommended for peak intensity weeks.');
                if (specialCounts.rest === 0) w.push('No rest encounters found. At least 1 rest encounter is recommended for deload or early weeks.');
                if (specialCounts.branch === 0) w.push('No branch encounters found. At least 1 branch encounter is recommended for player agency.');
            }
        }

        // Cross-ref: collect archive section keys from clocks (primary) or archiveLayout (legacy fallback)
        var clocks = (obj.mechanics && obj.mechanics.clocks) || [];
        var clockSectionKeys = [];
        clocks.forEach(function(c) {
            if (c.onTrigger && c.onTrigger.section) {
                if (clockSectionKeys.indexOf(c.onTrigger.section) === -1) {
                    clockSectionKeys.push(c.onTrigger.section);
                }
            }
        });
        // Legacy fallback: derive from archiveLayout if no clock triggers found
        var archiveKeys = clockSectionKeys.length > 0 ? clockSectionKeys :
            (obj.archiveLayout || []).reduce(function(acc, s) {
                return acc.concat(s.left || []).concat(s.right || []);
            }, []);

        // --- Quality Governor: Stage 1 ---

        // Banned word scan
        scanBannedWords(obj.story, 'story', w);
        scanBannedWords(obj.mechanics, 'mechanics', w);

        // Complexity budget check (vs wiring blueprint)
        if (currentPipelineData.wiring && currentPipelineData.wiring.complexityProfile) {
            var peak = currentPipelineData.wiring.complexityProfile.peakActive || 10;
            var complexity = 0;
            ((obj.mechanics && obj.mechanics.clocks) || []).forEach(function(c) {
                complexity += (c.type === 'tug' ? 2 : 1);
            });
            ((obj.mechanics && obj.mechanics.tracks) || []).forEach(function(t) {
                if (t.type === 'faction' || t.type === 'skill-tree') complexity += 3;
                else if (t.type === 'heat') complexity += 1;
                else complexity += 1;
            });
            ((obj.mechanics && obj.mechanics.resources) || []).forEach(function(r) {
                if (r.type === 'dual-economy' || r.type === 'supply') complexity += 2;
                else complexity += 1;
            });
            if (complexity > peak) {
                w.push('Mechanic complexity (' + complexity + ') exceeds blueprint peakActive (' + peak + '). Consider simplifying.');
            }
        }

        // Wire compliance check
        if (currentPipelineData.wiring && currentPipelineData.wiring.wiring) {
            var mechanicNames = []
                .concat(((obj.mechanics && obj.mechanics.clocks) || []).map(function(c) { return c.name ? c.name.toLowerCase() : ''; }))
                .concat(((obj.mechanics && obj.mechanics.tracks) || []).map(function(t) { return t.name ? t.name.toLowerCase() : ''; }))
                .concat(((obj.mechanics && obj.mechanics.resources) || []).map(function(r) { return r.name ? r.name.toLowerCase() : ''; }))
                .filter(Boolean);
            currentPipelineData.wiring.wiring.forEach(function(wire) {
                var from = (wire.from || '').toLowerCase();
                if (!from) return;
                var found = mechanicNames.some(function(n) { return from.indexOf(n) !== -1 || n.indexOf(from) !== -1; });
                if (!found) {
                    w.push('Wire "' + wire.id + '" references "' + wire.from + '" \u2014 no matching mechanic found. Check naming.');
                }
            });
        }

        // Color contrast check (WCAG AA 4.5:1)
        if (obj.theme && obj.theme.colors && obj.theme.colors.ink && obj.theme.colors.paper &&
            /^#[0-9a-fA-F]{6}$/.test(obj.theme.colors.ink) && /^#[0-9a-fA-F]{6}$/.test(obj.theme.colors.paper)) {
            var inkL = hexLuminance(obj.theme.colors.ink);
            var paperL = hexLuminance(obj.theme.colors.paper);
            var ratio = (Math.max(inkL, paperL) + 0.05) / (Math.min(inkL, paperL) + 0.05);
            if (ratio < 4.5) {
                w.push('Ink/paper contrast ratio is ' + ratio.toFixed(1) + ':1 (WCAG AA requires 4.5:1). Text may be unreadable in B&W print.');
            }
        }

        // Visual weight distribution
        if (obj.story && obj.story.encounters && obj.story.encounters.length > 6) {
            var weights = {};
            var weightsCount = 0;
            obj.story.encounters.forEach(function(enc) {
                var wt = enc.visualWeight || 'standard';
                if (!weights[wt]) {
                    weights[wt] = true;
                    weightsCount++;
                }
            });
            if (weightsCount < 2) {
                var firstWeight = Object.keys(weights)[0];
                w.push('All encounters use the same visual weight ("' + firstWeight + '"). Mix sparse/standard/dense/crisis for density variation.');
            }
        }

        // Endowed progress check
        var hasEndowed = false;
        ((obj.mechanics && obj.mechanics.clocks) || []).forEach(function(c) {
            if (c.startValue && c.startValue > 0) hasEndowed = true;
        });
        ((obj.mechanics && obj.mechanics.tracks) || []).forEach(function(t) {
            if (t.startValue && t.startValue > 0) hasEndowed = true;
        });
        if (!hasEndowed) {
            w.push('No clock or track has startValue > 0. Endowed progress (pre-filling 10-20%) increases player commitment.');
        }

        // Structural atoms validation (v3.0.0-alpha.5)
        if (Array.isArray(obj.structuralAtoms)) {
            var validAtomTypes = ['quote-page', 'pacing-breath'];
            obj.structuralAtoms.forEach(function(sa, idx) {
                if (!sa.type || validAtomTypes.indexOf(sa.type) === -1) {
                    e.push('structuralAtoms[' + idx + '].type is invalid: "' + (sa.type || 'undefined') + '". Must be one of: ' + validAtomTypes.join(', '));
                }
                if (sa.type === 'quote-page' && (!sa.content || !sa.content.text)) {
                    e.push('structuralAtoms[' + idx + '] (quote-page) missing content.text');
                }
                if (sa.type === 'pacing-breath' && sa.content && sa.content.visual) {
                    var validVisuals = ['blank', 'divider', 'texture'];
                    if (validVisuals.indexOf(sa.content.visual) === -1) {
                        w.push('structuralAtoms[' + idx + '] (pacing-breath) has invalid visual: "' + sa.content.visual + '"');
                    }
                }
                if (sa.placement && sa.placement.priority !== undefined) {
                    if (typeof sa.placement.priority !== 'number' || sa.placement.priority < 0 || sa.placement.priority > 1) {
                        w.push('structuralAtoms[' + idx + '].placement.priority should be 0-1');
                    }
                }
                if (sa.placement && sa.placement.after) {
                    var validPlacements = ['setup', 'archives'];
                    var weekPattern = /^week-\d+$/;
                    if (validPlacements.indexOf(sa.placement.after) === -1 && !weekPattern.test(sa.placement.after)) {
                        w.push('structuralAtom[' + idx + '] has unrecognized placement.after value: "' + sa.placement.after + '". Valid: "week-N", "archives", "setup"');
                    }
                }
            });
            if (obj.structuralAtoms.length > 4) {
                w.push('structuralAtoms has ' + obj.structuralAtoms.length + ' entries (recommended max: 4). Each atom is a full page.');
            }
        }

        // Encounter pacingHint validation (v3.0.0-alpha.5)
        if (obj.story && obj.story.encounters) {
            var validPacingHints = ['breather', 'crescendo', 'transition'];
            obj.story.encounters.forEach(function(enc, idx) {
                if (enc.pacingHint && validPacingHints.indexOf(enc.pacingHint) === -1) {
                    w.push('Encounter ' + (enc.id || idx) + ' has invalid pacingHint: "' + enc.pacingHint + '". Must be one of: ' + validPacingHints.join(', '));
                }
            });
        }
    } else if (num === 2) {
        var reqKeys = ['cover', 'manual', 'classifications', 'hud', 'weekPage', 'archive', 'finalPage', 'labels', 'weekAlerts'];
        reqKeys.forEach(function(k) {
            if (!(obj.voice && obj.voice[k])) w.push('Missing voice.' + k);
        });
        if (!(obj.voice && obj.voice.cover)) e.push('Missing voice.cover');
        if (!(obj.voice && obj.voice.manual)) e.push('Missing voice.manual');
        if (!(obj.voice && obj.voice.classifications)) e.push('Missing voice.classifications');

        // Detect unresolved template variables in voice string fields
        var templateVarPattern = /\{\{[^}]+\}\}|\[\[[^\]]+\]\]/g;
        var runtimeTokens = ['{{week}}', '{{prefix}}'];
        function scanForTemplateVars(object, path) {
            if (!object || typeof object !== 'object') return;
            var keys = Object.keys(object);
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var val = object[key];
                if (typeof val === 'string') {
                    var matches = val.match(templateVarPattern);
                    if (matches) {
                        matches.forEach(function (m) {
                            if (runtimeTokens.indexOf(m) === -1) {
                                w.push('Unresolved template variable in ' + path + '.' + key + ': ' + m);
                            }
                        });
                    }
                } else if (typeof val === 'object') {
                    scanForTemplateVars(val, path + '.' + key);
                }
            }
        }
        if (obj.voice) scanForTemplateVars(obj.voice, 'voice');

        // Facility-grid floor integrity check
        if (obj.map && obj.map.type === 'facility-grid' && Array.isArray(obj.map.levels)) {
            var expectedFloors = obj.map.levels.length;
            var weeks = obj.map.weeks || {};
            Object.keys(weeks).forEach(function(wk) {
                var rooms = weeks[wk].rooms;
                if (Array.isArray(rooms) && rooms.length !== expectedFloors) {
                    e.push('Map week ' + wk + ' has ' + rooms.length + ' floor(s) in rooms[] but levels declares ' + expectedFloors + '. rooms[].length must equal levels.length.');
                }
            });
        }

        // --- Quality Governor: Stage 2 ---
        scanBannedWords(obj.voice, 'voice', w);
    } else if (num === 3) {
        if (!obj.storyArchives || typeof obj.storyArchives !== 'object') e.push('Missing storyArchives object');
        if (!Array.isArray(obj.storyEndings) || !obj.storyEndings.length) e.push('Missing storyEndings array');

        var s1 = currentPipelineData[1] || {};
        var endIds = ((s1.mechanics && s1.mechanics.endConditions) || []).map(function(end) { return end.id; });
        (obj.storyEndings || []).forEach(function(end) {
            if (endIds.length && endIds.indexOf(end.id) === -1) e.push('Ending id "' + end.id + '" not in Stage 1 endConditions');
        });

        // Derive archive section keys from clocks (primary) or archiveLayout (legacy fallback)
        var archiveKeysS3 = typeof window.deriveArchiveSectionKeys === 'function'
            ? window.deriveArchiveSectionKeys(currentPipelineData)
            : [];
        var storyArchiveKeys = Object.keys(obj.storyArchives || {});
        storyArchiveKeys.forEach(function(k) {
            if (archiveKeysS3.length && archiveKeysS3.indexOf(k) === -1) e.push('Archive section key "' + k + '" not in Stage 1 clock triggers');
        });
        archiveKeysS3.forEach(function(k) {
            if (storyArchiveKeys.indexOf(k) === -1) e.push('Clock trigger section "' + k + '" has no matching section in storyArchives');
        });

        // --- Quality Governor: Stage 3 ---
        scanBannedWords(obj.storyArchives, 'storyArchives', w);
        scanBannedWords(obj.storyEndings, 'storyEndings', w);

        // Archive format diversity
        if (obj.storyArchives && typeof obj.storyArchives === 'object') {
            var formats = {};
            var formatsCount = 0;
            var archiveValues = Object.keys(obj.storyArchives);
            for (var fi = 0; fi < archiveValues.length; fi++) {
                var section = obj.storyArchives[archiveValues[fi]];
                if (section.format && !formats[section.format]) {
                    formats[section.format] = true;
                    formatsCount++;
                }
            }
            if (formatsCount < 2 && Object.keys(obj.storyArchives).length > 1) {
                var firstFormat = Object.keys(formats)[0];
                w.push('All archive sections use format "' + firstFormat + '". Use at least 2 different formats for document variety.');
            }
        }
    } else if (num === 4) {
        var keys = Object.keys(obj);
        if (!keys.length) e.push('No REF nodes found');

        var s1 = currentPipelineData[1] || {};
        var s1Encounters = (s1.story && s1.story.encounters) || [];
        var refScheme = (s1.story && s1.story.refScheme) || { prefix: 'R', weekDigits: 1, sessionDigits: 1 };

        // Compute exact expected REF IDs and check each one
        var missingRouters = [];
        var missingBranches = [];
        s1Encounters.forEach(function(enc) {
            var refCode = refScheme.prefix +
                String(enc.week).padStart(refScheme.weekDigits || 1, '0') +
                String(enc.day).padStart(refScheme.sessionDigits || 1, '0');

            // Router node
            if (!obj[refCode]) missingRouters.push(refCode);

            // Branch nodes (one per outcome suffix)
            (enc.outcomes || []).forEach(function(o) {
                var branchId = refCode + (o.suffix || '');
                if (!obj[branchId]) missingBranches.push(branchId);
            });
        });

        var totalMissing = missingRouters.length + missingBranches.length;
        if (totalMissing > 0) {
            var expectedTotal = s1Encounters.length + s1Encounters.reduce(function(sum, enc) { return sum + ((enc.outcomes && enc.outcomes.length) || 0); }, 0);
            e.push('Stage 4 missing ' + totalMissing + ' of ' + expectedTotal + ' REF nodes. Every encounter x every outcome must have content — missing nodes render as empty fragments.');
            if (missingRouters.length) {
                e.push('Missing routers (' + missingRouters.length + '): ' + missingRouters.slice(0, 10).join(', ') + (missingRouters.length > 10 ? '...' : ''));
            }
            if (missingBranches.length) {
                e.push('Missing branches (' + missingBranches.length + '): ' + missingBranches.slice(0, 10).join(', ') + (missingBranches.length > 10 ? '...' : ''));
            }
        }

        keys.forEach(function(k) {
            var node = obj[k];
            if (!node.type) w.push('REF "' + k + '" missing type');
            if (!node.html) w.push('REF "' + k + '" missing html');
        });

        // --- Quality Governor: Stage 4 ---
        scanBannedWords(obj, 'refs', w);

        // Router type distribution
        var routerTypes = {};
        var routerCount = 0;
        var validRouterTypes = ['kinetic', 'philosophical', 'echo', 'artifact', 'steinbeck', 'dirt', 'apex'];
        keys.forEach(function(k) {
            var node = obj[k];
            if (node.type && validRouterTypes.indexOf(node.type) !== -1) {
                routerTypes[node.type] = (routerTypes[node.type] || 0) + 1;
                routerCount++;
            }
        });
        if (routerCount > 0) {
            var typeNames = Object.keys(routerTypes);
            if (typeNames.length < 3) {
                w.push('Only ' + typeNames.length + ' router type(s) used (' + typeNames.join(', ') + '). Use at least 3 for narrative texture.');
            }
            typeNames.forEach(function(t) {
                var pct = Math.round(routerTypes[t] / routerCount * 100);
                if (pct > 40) {
                    w.push('Router type "' + t + '" is ' + pct + '% of routers (max 40%). Redistribute for variety.');
                }
            });
            if ((routerTypes['apex'] || 0) > 2) {
                w.push('Apex type used ' + routerTypes['apex'] + ' times (max 2). Reserve apex for true climactic moments.');
            }
        }
    } else if (num === 5) {
        var keys = Object.keys(obj);

        var s1 = currentPipelineData[1] || {};
        var tracks = ((s1.mechanics && s1.mechanics.tracks) || []).filter(function(t) { return t.type === 'faction' || t.type === 'progress'; });
        var expectedEvidenceCount = tracks.length * ((s1.workout && s1.workout.totalWeeks) || 0);

        if (expectedEvidenceCount > 0 && keys.length !== expectedEvidenceCount) {
            w.push('Expected ' + expectedEvidenceCount + ' evidence nodes (' + tracks.length + ' tracks * ' + ((s1.workout && s1.workout.totalWeeks) || 0) + ' weeks), found ' + keys.length + '. Engine will render what exists.');
        }

        keys.forEach(function(k) {
            var node = obj[k];
            if (!node.type) w.push('Evidence node "' + k + '" missing type');
            if (!node.html) w.push('Evidence node "' + k + '" missing html');
        });

        // --- Quality Governor: Stage 5 ---
        scanBannedWords(obj, 'evidence', w);
    }
    return { errors: e, warnings: w };
}

// --- Atom Inventory Validation (Layout Governor Phase 1) ---

/**
 * Validate an atom inventory for completeness, integrity, and graph consistency.
 * @param {AtomInventory} inventory  Output from atomize()
 * @returns {{ errors: string[], warnings: string[] }}
 */
function validateAtomInventory(inventory) {
    var e = [];
    var w = [];

    if (!inventory || typeof inventory !== 'object') {
        e.push('Atom inventory is null or not an object');
        return { errors: e, warnings: w };
    }

    var atoms = inventory.atoms || {};
    var relationships = inventory.relationships || [];
    var groups = inventory.groups || [];
    var atomIds = Object.keys(atoms);

    // ── 1. Required fields on every atom ────────────────────

    var requiredFields = ['id', 'type', 'content', 'breakPolicy', 'sizeHint', 'priority'];
    var validSizeHints = ['minimal', 'standard', 'generous'];

    for (var ai = 0; ai < atomIds.length; ai++) {
        var id = atomIds[ai];
        var atom = atoms[id];

        for (var fi = 0; fi < requiredFields.length; fi++) {
            if (atom[requiredFields[fi]] === undefined || atom[requiredFields[fi]] === null) {
                e.push('Atom "' + id + '" missing required field: ' + requiredFields[fi]);
            }
        }

        if (atom.id !== id) {
            e.push('Atom key "' + id + '" does not match atom.id "' + atom.id + '"');
        }

        if (atom.breakPolicy) {
            if (typeof atom.breakPolicy.keepTogetherStrength !== 'number') {
                w.push('Atom "' + id + '" breakPolicy.keepTogetherStrength is not a number');
            }
            if (typeof atom.breakPolicy.mustNotSplit !== 'boolean') {
                w.push('Atom "' + id + '" breakPolicy.mustNotSplit is not a boolean');
            }
        }

        if (atom.sizeHint && validSizeHints.indexOf(atom.sizeHint) === -1) {
            w.push('Atom "' + id + '" has invalid sizeHint: "' + atom.sizeHint + '"');
        }

        if (typeof atom.priority === 'number' && (atom.priority < 0 || atom.priority > 1)) {
            w.push('Atom "' + id + '" priority ' + atom.priority + ' outside 0-1 range');
        }
    }

    // ── 2. Relationship target resolution ───────────────────

    for (var ri = 0; ri < relationships.length; ri++) {
        var rel = relationships[ri];
        if (!rel.from) {
            e.push('Relationship ' + ri + ' missing "from" field');
        } else if (!atoms[rel.from]) {
            // Dice-table is shared and may be referenced even though it's structural
            // Only error if it's truly missing
            if (rel.from !== 'dice-table' || !atoms['dice-table']) {
                w.push('Relationship ' + ri + ' "from" references missing atom: "' + rel.from + '"');
            }
        }
        if (!rel.to) {
            e.push('Relationship ' + ri + ' missing "to" field');
        } else if (!atoms[rel.to]) {
            w.push('Relationship ' + ri + ' "to" references missing atom: "' + rel.to + '"');
        }
        if (!rel.type) {
            e.push('Relationship ' + ri + ' missing "type" field');
        }
    }

    // ── 3. Group integrity ──────────────────────────────────

    var validGroupTypes = ['session', 'week', 'archive-section', 'ref-week', 'evidence-series', 'rules-manual', 'tracker-sheet', 'quote-page', 'pacing-breath'];
    var groupIdsSeen = {};

    for (var gi = 0; gi < groups.length; gi++) {
        var grp = groups[gi];

        if (!grp.id) {
            e.push('Group ' + gi + ' missing id');
        } else if (groupIdsSeen[grp.id]) {
            e.push('Duplicate group id: "' + grp.id + '"');
        } else {
            groupIdsSeen[grp.id] = true;
        }

        if (!grp.groupType || validGroupTypes.indexOf(grp.groupType) === -1) {
            w.push('Group "' + (grp.id || gi) + '" has invalid groupType: "' + grp.groupType + '"');
        }

        if (!Array.isArray(grp.members) || grp.members.length === 0) {
            w.push('Group "' + (grp.id || gi) + '" has empty or missing members array');
        } else {
            for (var gmi = 0; gmi < grp.members.length; gmi++) {
                var memberId = grp.members[gmi];
                if (!atoms[memberId]) {
                    // dice-table is a shared reference, tolerate it
                    if (memberId !== 'dice-table' || !atoms['dice-table']) {
                        w.push('Group "' + grp.id + '" references missing atom: "' + memberId + '"');
                    }
                }
            }
        }
    }

    // ── 4. Session group completeness ───────────────────────
    // Every session group must have at least scaffold + workout

    for (var sgi = 0; sgi < groups.length; sgi++) {
        if (groups[sgi].groupType !== 'session') continue;
        var members = groups[sgi].members;
        var hasScaffold = false;
        var hasWorkout = false;
        for (var smi = 0; smi < members.length; smi++) {
            var memberAtom = atoms[members[smi]];
            if (memberAtom && memberAtom.type === 'encounter-scaffold') hasScaffold = true;
            if (memberAtom && memberAtom.type === 'workout-session') hasWorkout = true;
        }
        if (!hasScaffold) {
            e.push('Session group "' + groups[sgi].id + '" missing encounter-scaffold atom');
        }
        if (!hasWorkout) {
            e.push('Session group "' + groups[sgi].id + '" missing workout-session atom');
        }
    }

    // ── 5. Encounter coverage ───────────────────────────────
    // Every encounter-scaffold should have at least one ref-router

    var scaffoldIds = atomIds.filter(function(id) { return atoms[id].type === 'encounter-scaffold'; });
    var routerFromRels = {};
    for (var bri = 0; bri < relationships.length; bri++) {
        if (relationships[bri].type === 'branch-destination' && atoms[relationships[bri].from] &&
            atoms[relationships[bri].from].type === 'encounter-scaffold') {
            routerFromRels[relationships[bri].from] = true;
        }
    }
    for (var sci = 0; sci < scaffoldIds.length; sci++) {
        if (!routerFromRels[scaffoldIds[sci]]) {
            w.push('Encounter scaffold "' + scaffoldIds[sci] + '" has no REF router linked (missing Stage 4 data?)');
        }
    }

    // ── 6. Archive trigger resolution ───────────────────────
    // Every trigger-unlock relationship should have a valid target

    for (var tri = 0; tri < relationships.length; tri++) {
        if (relationships[tri].type === 'trigger-unlock') {
            if (!atoms[relationships[tri].to]) {
                w.push('Archive trigger "' + relationships[tri].from + '" targets missing archive node: "' + relationships[tri].to + '"');
            }
        }
    }

    // ── Summary ─────────────────────────────────────────────

    var typeCounts = {};
    for (var tci = 0; tci < atomIds.length; tci++) {
        var t = atoms[atomIds[tci]].type;
        typeCounts[t] = (typeCounts[t] || 0) + 1;
    }

    if (atomIds.length === 0) {
        e.push('Atom inventory is empty');
    } else {
        w.push('Atom inventory: ' + atomIds.length + ' atoms, ' + relationships.length +
            ' relationships, ' + groups.length + ' groups. Types: ' +
            Object.keys(typeCounts).map(function(t) { return t + '(' + typeCounts[t] + ')'; }).join(', '));
    }

    return { errors: e, warnings: w };
}

// Expose on window for cross-file access
window.scanBannedWords = scanBannedWords;
window.hexLuminance = hexLuminance;
window.validateWiringBlueprint = validateWiringBlueprint;
window.validateStageData = validateStageData;
window.validateAtomInventory = validateAtomInventory;
