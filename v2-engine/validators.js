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
        if (!obj.mechanicalProfile.arcShape) w.push('Missing mechanicalProfile.arcShape');
        if (!Array.isArray(obj.mechanicalProfile.pageVocabulary)) w.push('mechanicalProfile.pageVocabulary should be an array');
    }

    return { errors: e, warnings: w };
}

function validateStageData(num, obj, currentPipelineData) {
    const e = [];
    const w = [];
    if (num === 1) {
        if (!obj.meta?.title) e.push('Missing meta.title');
        if (!obj.workout?.totalWeeks) e.push('Missing workout.totalWeeks');
        if (!obj.workout?.sessionTypes?.length) e.push('Missing workout.sessionTypes[]');
        if (!obj.mechanics?.dice) e.push('Missing mechanics.dice');
        if (!obj.mechanics?.endConditions?.length) e.push('Missing mechanics.endConditions[]');
        if (!obj.theme?.colors) e.push('Missing theme.colors');
        else {
            for (const k of ['ink', 'paper', 'fog', 'accent', 'muted']) {
                if (!obj.theme.colors[k]) e.push(`Missing theme.colors.${k}`);
                else if (!/^#[0-9a-fA-F]{6}$/.test(obj.theme.colors[k])) e.push(`theme.colors.${k} is not valid hex: ${obj.theme.colors[k]}`);
            }
        }
        if (!obj.theme?.fonts) e.push('Missing theme.fonts');

        var validArchetypes = ['institutional', 'noir', 'terminal', 'literary', 'brutalist', 'clinical', 'confessional', 'corporate'];
        if (!obj.theme?.visualArchetype) {
            w.push('Missing theme.visualArchetype — engine will fall back to "institutional". Set explicitly based on the creative brief.');
        } else if (!validArchetypes.includes(obj.theme.visualArchetype)) {
            e.push(`theme.visualArchetype "${obj.theme.visualArchetype}" is not valid. Must be one of: ${validArchetypes.join(', ')}`);
        }

        const validTypes = ['cover', 'rules-manual', 'tracker-sheet', 'setup', 'encounter-spread', 'ref-pages', 'archive', 'endings', 'evidence', 'final'];
        if (!obj.pages?.length) e.push('Missing pages[] array');
        else {
            const archiveKeysSeen = new Set();
            obj.pages.forEach((p, idx) => {
                if (!validTypes.includes(p.type)) e.push(`pages[${idx}].type is invalid: "${p.type}"`);
                if (p.type === 'archive' && p.section) {
                    if (archiveKeysSeen.has(p.section)) {
                        w.push(`Duplicate archive page found for section "${p.section}" in pages[] array.`);
                    }
                    archiveKeysSeen.add(p.section);
                }
            });

            // Guardrail: tracker-sheet recommended when mechanic count > 4
            var hasTrackerSheet = (obj.pages || []).some(function (p) { return p.type === 'tracker-sheet'; });
            var mechanicCount = (obj.mechanics?.clocks?.length || 0) +
                                (obj.mechanics?.tracks?.length || 0) +
                                (obj.mechanics?.resources?.length || 0);
            if (mechanicCount > 4 && !hasTrackerSheet) {
                w.push(`${mechanicCount} mechanics defined but no tracker-sheet page in pages[]. Consider adding one for playability.`);
            }
        }

        if (obj.workout && Array.isArray(obj.workout.sessionTypes)) {
            obj.workout.sessionTypes.forEach(st => {
                if (Array.isArray(st.exercises)) {
                    st.exercises.forEach(ex => {
                        if (ex.reps && String(ex.reps).length > 20) {
                            w.push(`Exercise "${ex.name}" has oversized reps string (${String(ex.reps).length} chars). Keep it to simple counts (e.g. 5, "3-5").`);
                        }
                    });
                }
            });
        }

        if (!obj.story?.encounters?.length) e.push('Missing story.encounters[]');
        else {
            // Derive sessions-per-week from unique day numbers across all
            // sessionTypes (spec: "Days are numbered 1 through N where N is
            // sessions per week"). Falls back to sessionTypes.length if no
            // days data — but days is a required field in the schema.
            var allDays = new Set();
            (obj.workout?.sessionTypes || []).forEach(function (st) {
                (st.days || []).forEach(function (d) { allDays.add(d); });
            });
            let sessPerWeek = allDays.size > 0
                ? allDays.size
                : (obj.workout?.sessionTypes || []).length;
            if (sessPerWeek > 0 && obj.workout?.totalWeeks) {
                let expected = sessPerWeek * obj.workout.totalWeeks;
                if (obj.story.encounters.length !== expected) {
                    w.push(`Expected ${expected} encounters (${sessPerWeek} sessions × ${obj.workout.totalWeeks} weeks), found ${obj.story.encounters.length}. Engine will render what exists.`);
                }
            }
            const diceOutcomes = obj.mechanics?.dice?.outcomes || [];
            obj.story.encounters.forEach((enc, idx) => {
                const encOutcomes = enc.outcomes || [];
                if (diceOutcomes.length > 0 && encOutcomes.length !== diceOutcomes.length) {
                    w.push(`Encounter index ${idx} outcomes length (${encOutcomes.length}) doesn't match dice outcomes (${diceOutcomes.length})`);
                }
                if (enc.special === 'boss' && !enc.bossRules) {
                    w.push(`Encounter ${enc.id || idx} has special:"boss" but missing bossRules object`);
                }
                if (enc.bossRules && (!Array.isArray(enc.bossRules.steps) || !enc.bossRules.steps.length)) {
                    w.push(`Encounter ${enc.id || idx} bossRules has missing or empty steps array`);
                }
                if (enc.special === 'branch' && (!Array.isArray(enc.options) || !enc.options.length)) {
                    w.push(`Encounter ${enc.id || idx} has special:"branch" but missing or empty options[] array`);
                }
            });

            // Encounter variety check — minimum special type distribution
            var specialCounts = { boss: 0, rest: 0, branch: 0 };
            obj.story.encounters.forEach(function (enc) {
                if (enc.special && specialCounts.hasOwnProperty(enc.special)) specialCounts[enc.special]++;
            });
            if (obj.workout?.totalWeeks >= 4) {
                if (specialCounts.boss === 0) w.push('No boss encounters found. At least 1 boss encounter is recommended for peak intensity weeks.');
                if (specialCounts.rest === 0) w.push('No rest encounters found. At least 1 rest encounter is recommended for deload or early weeks.');
                if (specialCounts.branch === 0) w.push('No branch encounters found. At least 1 branch encounter is recommended for player agency.');
            }
        }

        // Cross-ref: clocks -> archiveLayout
        const archiveKeys = (obj.archiveLayout || []).flatMap(s => [...(s.left || []), ...(s.right || [])]);
        (obj.mechanics?.clocks || []).forEach(c => {
            if (c.onTrigger?.section && !archiveKeys.includes(c.onTrigger.section)) {
                w.push(`Clock "${c.name}" references section "${c.onTrigger.section}" not in archiveLayout`);
            }
        });

        // --- Quality Governor: Stage 1 ---

        // Banned word scan
        scanBannedWords(obj.story, 'story', w);
        scanBannedWords(obj.mechanics, 'mechanics', w);

        // Complexity budget check (vs wiring blueprint)
        if (currentPipelineData.wiring?.complexityProfile) {
            var peak = currentPipelineData.wiring.complexityProfile.peakActive || 10;
            var complexity = 0;
            (obj.mechanics?.clocks || []).forEach(function(c) {
                complexity += (c.type === 'tug' ? 2 : 1);
            });
            (obj.mechanics?.tracks || []).forEach(function(t) {
                complexity += (t.type === 'faction' || t.type === 'skill-tree' ? 3 :
                               t.type === 'heat' ? 2 : 1);
            });
            (obj.mechanics?.resources || []).forEach(function() { complexity += 2; });
            if (complexity > peak) {
                w.push('Mechanic complexity (' + complexity + ') exceeds blueprint peakActive (' + peak + '). Consider simplifying.');
            }
        }

        // Wire compliance check
        if (currentPipelineData.wiring?.wiring) {
            var mechanicNames = [
                ...(obj.mechanics?.clocks || []).map(function(c) { return c.name ? c.name.toLowerCase() : ''; }),
                ...(obj.mechanics?.tracks || []).map(function(t) { return t.name ? t.name.toLowerCase() : ''; }),
                ...(obj.mechanics?.resources || []).map(function(r) { return r.name ? r.name.toLowerCase() : ''; })
            ].filter(Boolean);
            currentPipelineData.wiring.wiring.forEach(function(wire) {
                var from = (wire.from || '').toLowerCase();
                if (!from) return;
                var found = mechanicNames.some(function(n) { return from.includes(n) || n.includes(from); });
                if (!found) {
                    w.push('Wire "' + wire.id + '" references "' + wire.from + '" \u2014 no matching mechanic found. Check naming.');
                }
            });
        }

        // Color contrast check (WCAG AA 4.5:1)
        if (obj.theme?.colors?.ink && obj.theme?.colors?.paper &&
            /^#[0-9a-fA-F]{6}$/.test(obj.theme.colors.ink) && /^#[0-9a-fA-F]{6}$/.test(obj.theme.colors.paper)) {
            var inkL = hexLuminance(obj.theme.colors.ink);
            var paperL = hexLuminance(obj.theme.colors.paper);
            var ratio = (Math.max(inkL, paperL) + 0.05) / (Math.min(inkL, paperL) + 0.05);
            if (ratio < 4.5) {
                w.push('Ink/paper contrast ratio is ' + ratio.toFixed(1) + ':1 (WCAG AA requires 4.5:1). Text may be unreadable in B&W print.');
            }
        }

        // Visual weight distribution
        if (obj.story?.encounters?.length > 6) {
            var weights = new Set();
            obj.story.encounters.forEach(function(enc) {
                weights.add(enc.visualWeight || 'standard');
            });
            if (weights.size < 2) {
                w.push('All encounters use the same visual weight ("' + [...weights][0] + '"). Mix sparse/standard/dense/crisis for density variation.');
            }
        }

        // Endowed progress check
        var hasEndowed = false;
        (obj.mechanics?.clocks || []).forEach(function(c) {
            if (c.startValue && c.startValue > 0) hasEndowed = true;
        });
        (obj.mechanics?.tracks || []).forEach(function(t) {
            if (t.startValue && t.startValue > 0) hasEndowed = true;
        });
        if (!hasEndowed) {
            w.push('No clock or track has startValue > 0. Endowed progress (pre-filling 10-20%) increases player commitment.');
        }
    } else if (num === 2) {
        const reqKeys = ['cover', 'manual', 'classifications', 'hud', 'weekPage', 'archive', 'finalPage', 'labels', 'weekAlerts'];
        reqKeys.forEach(k => {
            if (!obj.voice?.[k]) w.push(`Missing voice.${k}`);
        });
        if (!obj.voice?.cover) e.push('Missing voice.cover');
        if (!obj.voice?.manual) e.push('Missing voice.manual');
        if (!obj.voice?.classifications) e.push('Missing voice.classifications');

        // Detect unresolved template variables in voice string fields
        const templateVarPattern = /\{\{[^}]+\}\}|\[\[[^\]]+\]\]/g;
        function scanForTemplateVars(object, path) {
            if (!object || typeof object !== 'object') return;
            for (const key of Object.keys(object)) {
                const val = object[key];
                if (typeof val === 'string') {
                    const matches = val.match(templateVarPattern);
                    if (matches) {
                        w.push(`Unresolved template variable in ${path}.${key}: ${matches.join(', ')}`);
                    }
                } else if (typeof val === 'object') {
                    scanForTemplateVars(val, `${path}.${key}`);
                }
            }
        }
        if (obj.voice) scanForTemplateVars(obj.voice, 'voice');

        // --- Quality Governor: Stage 2 ---
        scanBannedWords(obj.voice, 'voice', w);
    } else if (num === 3) {
        if (!obj.storyArchives || typeof obj.storyArchives !== 'object') e.push('Missing storyArchives object');
        if (!Array.isArray(obj.storyEndings) || !obj.storyEndings.length) e.push('Missing storyEndings array');

        const s1 = currentPipelineData[1] || {};
        const endIds = (s1.mechanics?.endConditions || []).map(end => end.id);
        (obj.storyEndings || []).forEach(end => {
            if (endIds.length && !endIds.includes(end.id)) e.push(`Ending id "${end.id}" not in Stage 1 endConditions`);
        });

        const archiveKeys = (s1.archiveLayout || []).flatMap(s => [...(s.left || []), ...(s.right || [])]);
        const storyArchiveKeys = Object.keys(obj.storyArchives || {});
        storyArchiveKeys.forEach(k => {
            if (archiveKeys.length && !archiveKeys.includes(k)) e.push(`Archive section key "${k}" not in Stage 1 archiveLayout`);
        });
        archiveKeys.forEach(k => {
            if (!storyArchiveKeys.includes(k)) e.push(`ArchiveLayout key "${k}" has no matching section in storyArchives`);
        });

        // --- Quality Governor: Stage 3 ---
        scanBannedWords(obj.storyArchives, 'storyArchives', w);
        scanBannedWords(obj.storyEndings, 'storyEndings', w);

        // Archive format diversity
        if (obj.storyArchives && typeof obj.storyArchives === 'object') {
            var formats = new Set();
            Object.values(obj.storyArchives).forEach(function(section) {
                if (section.format) formats.add(section.format);
            });
            if (formats.size < 2 && Object.keys(obj.storyArchives).length > 1) {
                w.push('All archive sections use format "' + [...formats][0] + '". Use at least 2 different formats for document variety.');
            }
        }
    } else if (num === 4) {
        const keys = Object.keys(obj);
        if (!keys.length) e.push('No REF nodes found');

        const s1 = currentPipelineData[1] || {};
        const s1Encounters = s1.story?.encounters || [];
        const refScheme = s1.story?.refScheme || { prefix: 'R', weekDigits: 1, sessionDigits: 1 };

        // Compute exact expected REF IDs and check each one
        const missingRouters = [];
        const missingBranches = [];
        s1Encounters.forEach(enc => {
            const refCode = refScheme.prefix +
                String(enc.week).padStart(refScheme.weekDigits || 1, '0') +
                String(enc.day).padStart(refScheme.sessionDigits || 1, '0');

            // Router node
            if (!obj[refCode]) missingRouters.push(refCode);

            // Branch nodes (one per outcome suffix)
            (enc.outcomes || []).forEach(o => {
                const branchId = refCode + (o.suffix || '');
                if (!obj[branchId]) missingBranches.push(branchId);
            });
        });

        const totalMissing = missingRouters.length + missingBranches.length;
        if (totalMissing > 0) {
            const expectedTotal = s1Encounters.length + s1Encounters.reduce((sum, enc) => sum + (enc.outcomes?.length || 0), 0);
            e.push(`Stage 4 missing ${totalMissing} of ${expectedTotal} REF nodes. Every encounter x every outcome must have content — missing nodes render as empty fragments.`);
            if (missingRouters.length) {
                e.push(`Missing routers (${missingRouters.length}): ${missingRouters.slice(0, 10).join(', ')}${missingRouters.length > 10 ? '...' : ''}`);
            }
            if (missingBranches.length) {
                e.push(`Missing branches (${missingBranches.length}): ${missingBranches.slice(0, 10).join(', ')}${missingBranches.length > 10 ? '...' : ''}`);
            }
        }

        keys.forEach(k => {
            const node = obj[k];
            if (!node.type) w.push(`REF "${k}" missing type`);
            if (!node.html) w.push(`REF "${k}" missing html`);
        });

        // --- Quality Governor: Stage 4 ---
        scanBannedWords(obj, 'refs', w);

        // Router type distribution
        var routerTypes = {};
        var routerCount = 0;
        var validRouterTypes = ['kinetic', 'philosophical', 'echo', 'artifact', 'steinbeck', 'dirt', 'apex'];
        keys.forEach(function(k) {
            var node = obj[k];
            if (node.type && validRouterTypes.includes(node.type)) {
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
        const keys = Object.keys(obj);

        const s1 = currentPipelineData[1] || {};
        const tracks = (s1.mechanics?.tracks || []).filter(t => t.type === 'faction' || t.type === 'progress');
        const expectedEvidenceCount = tracks.length * (s1.workout?.totalWeeks || 0);

        if (expectedEvidenceCount > 0 && keys.length !== expectedEvidenceCount) {
            w.push(`Expected ${expectedEvidenceCount} evidence nodes (${tracks.length} tracks * ${s1.workout?.totalWeeks || 0} weeks), found ${keys.length}. Engine will render what exists.`);
        }

        keys.forEach(k => {
            const node = obj[k];
            if (!node.type) w.push(`Evidence node "${k}" missing type`);
            if (!node.html) w.push(`Evidence node "${k}" missing html`);
        });

        // --- Quality Governor: Stage 5 ---
        scanBannedWords(obj, 'evidence', w);
    }
    return { errors: e, warnings: w };
}

// Expose on window for cross-file access
window.scanBannedWords = scanBannedWords;
window.hexLuminance = hexLuminance;
window.validateWiringBlueprint = validateWiringBlueprint;
window.validateStageData = validateStageData;
