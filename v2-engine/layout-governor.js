// ── Layout Governor: Composition Engine ───────────────────────
//
// Groups atoms by affinity, selects templates, composes pages.
// Replaces the pages[]-driven dispatch in box-packer.js with
// atom-driven composition via the template registry.
//
// Phase 2-3 of the Layout Governor v3.0 architecture.
//
// Phase 2: grouping, template selection, basic composition.
// Phase 3: measurement-aware selection, scoring, repair, plan metrics.
//
// Depends on: content-atomizer.js (atomize), atom-renderers.js
//             (AtomRenderers), layout-templates.js (LayoutTemplates),
//             render-utils.js (createPage, addPageNumber),
//             governor-measure.js (GovernorMeasure) [optional],
//             governor-score.js (GovernorScore) [optional],
//             box-packer.js (crossReferenceArchivePages, padToMultipleOf4)
//
// Exposed: window.LayoutGovernor

var LayoutGovernor = {};

// ── Build Context ────────────────────────────────────────────

/**
 * Build the rendering context passed to templates and atom renderers.
 * @param {Object} data  finalPayload
 * @returns {Object} ctx
 */
function buildGovernorContext(data) {
    return {
        data: data,
        startPage: 0,
        week: null,
        sectionKey: null,
        scoringContext: null,    // Populated during compose for scoring
        _selectedEstimate: null  // Set by LayoutTemplates.select when scoring
    };
}

// ── Group Atoms by Affinity ──────────────────────────────────

/**
 * Organize atoms into ordered page groups for the booklet sequence.
 * Each group maps to a template invocation.
 *
 * @param {AtomInventory} inventory
 * @param {Object} data  finalPayload (for page order)
 * @returns {Object[]} pageGroups  ordered array of { groupType, atoms, meta }
 */
function groupByAffinity(inventory, data) {
    var atoms = inventory.atoms;
    var groups = inventory.groups;
    var pageGroups = [];
    var workout = (data && data.workout) || {};
    var totalWeeks = workout.totalWeeks || 0;
    var story = (data && data.story) || {};
    var archives = story.archives || {};
    var evidence = story.evidence || {};
    var tracks = (data && data.mechanics && data.mechanics.tracks) || [];

    // Helper: collect atoms by IDs
    function collectAtoms(ids) {
        var result = [];
        for (var i = 0; i < ids.length; i++) {
            if (atoms[ids[i]]) result.push(atoms[ids[i]]);
        }
        return result;
    }

    // Helper: find group by ID
    function findGroup(groupId) {
        for (var i = 0; i < groups.length; i++) {
            if (groups[i].id === groupId) return groups[i];
        }
        return null;
    }

    // ── 1. Cover ──
    if (atoms['cover']) {
        pageGroups.push({
            groupType: 'cover',
            atoms: [atoms['cover']],
            meta: {}
        });
    }

    // ── 2. Rules Manual ──
    var rulesGroup = findGroup('group.rules-manual');
    if (rulesGroup) {
        pageGroups.push({
            groupType: 'rules-manual',
            atoms: collectAtoms(rulesGroup.members),
            meta: {}
        });
    }

    // ── 3. Tracker Sheet ──
    var trackerGroup = findGroup('group.tracker-sheet');
    if (trackerGroup) {
        pageGroups.push({
            groupType: 'tracker-sheet',
            atoms: collectAtoms(trackerGroup.members),
            meta: {}
        });
    }

    // ── 4. Setup ──
    if (atoms['setup']) {
        pageGroups.push({
            groupType: 'setup',
            atoms: [atoms['setup']],
            meta: {}
        });
    }

    // ── 5. Per-Week: Encounter Spread + REF Pages ──
    for (var w = 1; w <= totalWeeks; w++) {
        // Encounter spread atoms: scaffolds, workouts, conditions, map, checkin, dice-table
        var weekGroup = findGroup('group.wk' + w);
        if (weekGroup) {
            // Filter to encounter-spread atoms (exclude ref atoms)
            var encAtoms = [];
            weekGroup.members.forEach(function (id) {
                var a = atoms[id];
                if (!a) return;
                if (a.type !== 'ref-router' && a.type !== 'ref-outcome') {
                    encAtoms.push(a);
                }
            });

            if (encAtoms.length > 0) {
                pageGroups.push({
                    groupType: 'encounter-spread',
                    atoms: encAtoms,
                    meta: { week: w }
                });
            }
        }

        // REF pages
        var refGroup = findGroup('group.ref.wk' + w);
        if (refGroup) {
            pageGroups.push({
                groupType: 'ref-pages',
                atoms: collectAtoms(refGroup.members),
                meta: { week: w }
            });
        }
    }

    // ── 6. Archive Sections ──
    var archiveKeys = Object.keys(archives);
    for (var ak = 0; ak < archiveKeys.length; ak++) {
        var sectionKey = archiveKeys[ak];
        var archGroup = findGroup('group.archive.' + sectionKey);
        if (archGroup) {
            pageGroups.push({
                groupType: 'archive',
                atoms: collectAtoms(archGroup.members),
                meta: { sectionKey: sectionKey }
            });
        }
    }

    // ── 7. Endings ──
    var endingAtoms = [];
    for (var atomId in atoms) {
        if (atoms[atomId].type === 'ending-block') endingAtoms.push(atoms[atomId]);
    }
    if (endingAtoms.length) {
        pageGroups.push({
            groupType: 'endings',
            atoms: endingAtoms,
            meta: {}
        });
    }

    // ── 8. Evidence ──
    var factionProgressTracks = tracks.filter(function (t) { return t.type === 'faction' || t.type === 'progress'; });
    if (factionProgressTracks.length > 0 && Object.keys(evidence).length > 0) {
        var evidenceAtoms = [];
        for (var evId in atoms) {
            if (atoms[evId].type === 'evidence-node') evidenceAtoms.push(atoms[evId]);
        }
        // Sort chronologically by week
        evidenceAtoms.sort(function (a, b) {
            return (a.week || 0) - (b.week || 0);
        });
        if (evidenceAtoms.length) {
            pageGroups.push({
                groupType: 'evidence',
                atoms: evidenceAtoms,
                meta: {}
            });
        }
    }

    // ── 9. Structural Atoms (quote-page, pacing-breath) ──
    // Collect structural groups and resolve placement hints.
    var structuralInserts = [];
    for (var gk in groups) {
        var grp = groups[gk];
        if (!grp || !grp.id || grp.id.indexOf('group.structural.') !== 0) continue;
        if (!grp.atomIds || grp.atomIds.length === 0) continue;
        var structAtom = atoms[grp.atomIds[0]];
        if (!structAtom) continue;
        var placement = structAtom._placement || {};
        var afterHint = placement.after || null;

        // Resolve placement: find index in pageGroups to insert after
        var insertIdx = -1;
        if (afterHint) {
            // "week-N" → insert after that week's ref-pages group
            var weekMatch = afterHint.match(/^week-(\d+)$/);
            if (weekMatch) {
                var targetWeek = parseInt(weekMatch[1], 10);
                for (var pi = pageGroups.length - 1; pi >= 0; pi--) {
                    if (pageGroups[pi].meta && pageGroups[pi].meta.week === targetWeek &&
                        (pageGroups[pi].groupType === 'ref-pages' || pageGroups[pi].groupType === 'encounter-spread')) {
                        insertIdx = pi + 1;
                        break;
                    }
                }
            }
            // "archives" → insert after last archive group
            if (afterHint === 'archives') {
                for (var ai = pageGroups.length - 1; ai >= 0; ai--) {
                    if (pageGroups[ai].groupType === 'archive') { insertIdx = ai + 1; break; }
                }
            }
            // "setup" → insert after setup group
            if (afterHint === 'setup') {
                for (var si = 0; si < pageGroups.length; si++) {
                    if (pageGroups[si].groupType === 'setup') { insertIdx = si + 1; break; }
                }
            }
        }

        structuralInserts.push({
            idx: insertIdx,
            group: {
                groupType: grp.groupType,
                atoms: [structAtom],
                meta: { structural: true }
            }
        });
    }

    // Sort by index descending to avoid shift issues during splice
    structuralInserts.sort(function (a, b) { return b.idx - a.idx; });
    for (var ins = 0; ins < structuralInserts.length; ins++) {
        var si2 = structuralInserts[ins];
        if (si2.idx >= 0 && si2.idx <= pageGroups.length) {
            pageGroups.splice(si2.idx, 0, si2.group);
        } else {
            // No hint or unresolved → insert before endings (last content position)
            // Find endings index or just push before final
            var endingsIdx = -1;
            for (var ei = 0; ei < pageGroups.length; ei++) {
                if (pageGroups[ei].groupType === 'endings') { endingsIdx = ei; break; }
            }
            if (endingsIdx >= 0) {
                pageGroups.splice(endingsIdx, 0, si2.group);
            } else {
                pageGroups.push(si2.group);
            }
        }
    }

    // ── 10. Final ──
    if (atoms['final']) {
        pageGroups.push({
            groupType: 'final',
            atoms: [atoms['final']],
            meta: {}
        });
    }

    return pageGroups;
}

// ── Layout Plan Artifact ─────────────────────────────────────

/**
 * Create the layout plan artifact for debugging/inspection.
 * Phase 3: includes fill ratios, scoring data, and repair log.
 */
function createLayoutPlan() {
    return {
        pages: [],
        groups: [],
        metrics: {
            totalPages: 0,
            overflowCount: 0,
            templateUsage: {},
            groupCount: 0,
            // Phase 3 metrics
            measurementCacheHits: 0,
            avgFillRatio: 0,
            minFillRatio: 1.0,
            maxFillRatio: 0,
            templateDiversity: 0,
            repairCount: 0,
            scoringEnabled: false
        },
        repairLog: []
    };
}

/**
 * Record a group's rendering result in the layout plan.
 */
function recordGroupInPlan(plan, groupIndex, templateId, groupType, atomCount, pagesCreated, estimate) {
    var entry = {
        index: groupIndex,
        template: templateId,
        groupType: groupType,
        atomCount: atomCount,
        pagesCreated: pagesCreated
    };

    // Phase 3: include estimate data if available
    if (estimate) {
        entry.estimatedPages = estimate.pages;
        entry.estimatedFillRatios = estimate.fillRatios;
        entry.confidence = estimate.confidence;
        entry.pagesMatch = (estimate.pages === pagesCreated);
    }

    plan.groups.push(entry);

    if (!plan.metrics.templateUsage[templateId]) {
        plan.metrics.templateUsage[templateId] = 0;
    }
    plan.metrics.templateUsage[templateId]++;
}

/**
 * Record per-page data in the plan (for post-render fill ratio calculation).
 */
function recordPageInPlan(plan, pageIndex, templateId, groupType, fillRatio) {
    plan.pages.push({
        index: pageIndex,
        template: templateId,
        groupType: groupType,
        fillRatio: fillRatio || null
    });

    if (fillRatio !== null && fillRatio !== undefined) {
        if (fillRatio < plan.metrics.minFillRatio) plan.metrics.minFillRatio = fillRatio;
        if (fillRatio > plan.metrics.maxFillRatio) plan.metrics.maxFillRatio = fillRatio;
    }
}

/**
 * Finalize plan metrics after all groups are composed.
 * Phase 4: enhanced with break quality, density sequence, spread pairs.
 */
function finalizePlanMetrics(plan) {
    var uniqueTemplates = Object.keys(plan.metrics.templateUsage);
    plan.metrics.templateDiversity = uniqueTemplates.length;

    // Compute average fill ratio from estimated data
    var fillSum = 0;
    var fillCount = 0;
    for (var i = 0; i < plan.pages.length; i++) {
        if (plan.pages[i].fillRatio !== null) {
            fillSum += plan.pages[i].fillRatio;
            fillCount++;
        }
    }
    plan.metrics.avgFillRatio = fillCount > 0 ? (fillSum / fillCount) : 0;

    // Phase 4: Break quality metrics from repairLog
    var relaxationCount = 0;
    var totalStrength = 0;
    var violatedStrength = 0;
    for (var r = 0; r < plan.repairLog.length; r++) {
        var entry = plan.repairLog[r];
        if (entry.type === 'break-relaxation') {
            relaxationCount++;
            violatedStrength += entry.strength || 0;
        }
        if (entry.type === 'break-relaxation' || entry.type === 'break-honored') {
            totalStrength += entry.strength || 0;
        }
    }
    plan.metrics.relaxationCount = relaxationCount;
    plan.metrics.breakQualityScore = totalStrength > 0
        ? 1.0 - (violatedStrength / totalStrength)
        : 1.0;  // Perfect score when no break policies encountered

    // Phase 4: Density sequence — per-page fill/weight for analysis
    plan.metrics.densitySequence = [];
    for (var d = 0; d < plan.pages.length; d++) {
        plan.metrics.densitySequence.push({
            page: d,
            groupType: plan.pages[d].groupType,
            fillRatio: plan.pages[d].fillRatio,
            template: plan.pages[d].template
        });
    }

    // Phase 4: Spread pairs — which pages face each other in saddle-stitch
    // In a saddle-stitched booklet with N pages (multiple of 4):
    //   Sheet k (front): page(N-1-2k) | page(2k)
    //   Sheet k (back):  page(2k+1)   | page(N-2-2k)
    var totalPages = plan.pages.length;
    plan.metrics.spreadPairs = [];
    if (totalPages >= 4 && totalPages % 4 === 0) {
        var sheets = totalPages / 4;
        for (var k = 0; k < sheets; k++) {
            plan.metrics.spreadPairs.push({
                sheet: k,
                front: [totalPages - 1 - 2 * k, 2 * k],
                back: [2 * k + 1, totalPages - 2 - 2 * k]
            });
        }
    }

    // Run the global scorer if available
    if (typeof GovernorScore !== 'undefined' && GovernorScore.evaluate) {
        var pageEstimates = [];
        for (var j = 0; j < plan.pages.length; j++) {
            pageEstimates.push({
                templateId: plan.pages[j].template,
                fillRatio: plan.pages[j].fillRatio || 0.5,
                atomCount: 1,
                groupType: plan.pages[j].groupType
            });
        }
        var globalScore = GovernorScore.evaluate(pageEstimates);
        plan.metrics.globalScore = globalScore.score;
        plan.metrics.scoreBreakdown = globalScore.breakdown;
    }
}

// ── Repair: Deterministic Template Swap ──────────────────────

/**
 * Attempt to repair an overflow by selecting a different template.
 * Returns the alternative template, or null if no repair possible.
 *
 * Repair ordering (from plan spec):
 * 1. Template swap within same group type (try next-best scored)
 * 2. (Future phases: variant switch, break relaxation, atom push)
 * 3. Give up — use the original template and let overflow handling work
 *
 * @param {string} groupType
 * @param {Object} failedTemplate
 * @param {Atom[]} atoms
 * @param {Object} ctx
 * @param {Object} plan
 * @returns {Object|null} alternative template
 */
function attemptRepair(groupType, failedTemplate, atoms, ctx, plan) {
    var candidates = LayoutTemplates._registry[groupType] || [];
    if (candidates.length <= 1) return null;

    // Try each candidate except the failed one
    var hasMeasure = typeof GovernorMeasure !== 'undefined' && GovernorMeasure.getPageHeight;
    var hasScore = typeof GovernorScore !== 'undefined' && GovernorScore.scoreCandidate;

    for (var i = 0; i < candidates.length; i++) {
        if (candidates[i].id === failedTemplate.id) continue;

        // If we have scoring, check that the alternative estimates no overflow
        if (hasMeasure && hasScore && candidates[i].estimate) {
            var measurements = GovernorMeasure.measureGroup(atoms, ctx);
            var est = candidates[i].estimate(atoms, measurements, ctx);
            var maxFill = 0;
            for (var j = 0; j < est.fillRatios.length; j++) {
                if (est.fillRatios[j] > maxFill) maxFill = est.fillRatios[j];
            }
            // Only accept if no estimated overflow
            if (maxFill <= 1.0) {
                plan.repairLog.push({
                    type: 'template-swap',
                    groupType: groupType,
                    from: failedTemplate.id,
                    to: candidates[i].id,
                    reason: 'overflow detected, alternative scores better',
                    estimatedMaxFill: maxFill
                });
                plan.metrics.repairCount++;
                return candidates[i];
            }
        } else {
            // No scoring — just try the alternative
            plan.repairLog.push({
                type: 'template-swap',
                groupType: groupType,
                from: failedTemplate.id,
                to: candidates[i].id,
                reason: 'overflow detected, trying alternative (no scoring)'
            });
            plan.metrics.repairCount++;
            return candidates[i];
        }
    }

    return null;
}

// ── Main Compose Function ────────────────────────────────────

/**
 * Compose an atom inventory into a rendered booklet.
 *
 * Phase 3 flow:
 * 1. Initialize measurement harness (if available)
 * 2. Group atoms by affinity
 * 3. For each group:
 *    a. Build scoring context from previous groups
 *    b. Select template (measurement-aware if possible)
 *    c. Render pages via template
 *    d. Verify actual vs estimated page count
 *    e. If mismatch: log repair opportunity
 * 4. Finalize plan metrics
 * 5. Clean up measurement harness
 *
 * @param {AtomInventory} inventory  From atomize() or window._atomInventory
 * @param {HTMLElement} container    The #zine-container element
 * @param {Object} data             The finalPayload
 * @returns {number} totalPages
 */
LayoutGovernor.compose = function (inventory, container, data) {
    var ctx = buildGovernorContext(data);
    var pageGroups = groupByAffinity(inventory, data);
    var plan = createLayoutPlan();
    plan.metrics.groupCount = pageGroups.length;

    // Phase 3: Initialize measurement harness
    var hasMeasure = typeof GovernorMeasure !== 'undefined' && GovernorMeasure.init;
    if (hasMeasure) {
        GovernorMeasure.init();
        plan.metrics.scoringEnabled = true;
    }

    var totalPages = 0;

    // Scoring context: tracks previous template IDs and fill ratios
    // for diversity and pacing scoring
    var prevTemplateIds = [];
    var prevFillRatios = [];

    for (var i = 0; i < pageGroups.length; i++) {
        var group = pageGroups[i];

        // Enrich context with group-specific metadata
        ctx.startPage = totalPages;
        ctx.week = group.meta.week || null;
        ctx.sectionKey = group.meta.sectionKey || null;
        ctx._selectedEstimate = null;

        // Phase 3: Build scoring context
        ctx.scoringContext = {
            prevTemplateIds: prevTemplateIds.slice(-4),
            prevFillRatios: prevFillRatios.slice(-4)
        };

        // Select template (measurement-aware when possible)
        var template = LayoutTemplates.select(group.groupType, group.atoms, ctx);
        if (!template) {
            console.warn('[layout-governor] No template for group:', group.groupType);
            continue;
        }

        var estimate = ctx._selectedEstimate || null;

        // Render pages via template
        var pagesCreated = 0;
        try {
            pagesCreated = template.renderPages(container, group.atoms, ctx);
        } catch (err) {
            console.error('[layout-governor] Template crashed:', template.id,
                'group:', group.groupType, 'error:', err);

            // Repair: try alternative template
            var altTemplate = attemptRepair(group.groupType, template, group.atoms, ctx, plan);
            if (altTemplate) {
                try {
                    pagesCreated = altTemplate.renderPages(container, group.atoms, ctx);
                    template = altTemplate;
                    estimate = ctx._selectedEstimate || null;
                } catch (err2) {
                    console.error('[layout-governor] Repair also failed:', altTemplate.id, err2);
                    var errPage = document.createElement('div');
                    errPage.className = 'zine-page';
                    errPage.innerHTML = '<h2 style="color:red">GOVERNOR ERROR</h2><p>Template "' +
                        escapeHtml(template.id) + '" failed for ' + escapeHtml(group.groupType) + '</p>';
                    container.appendChild(errPage);
                    pagesCreated = 1;
                }
            } else {
                var errPage = document.createElement('div');
                errPage.className = 'zine-page';
                errPage.innerHTML = '<h2 style="color:red">GOVERNOR ERROR</h2><p>Template "' +
                    escapeHtml(template.id) + '" failed for ' + escapeHtml(group.groupType) + '</p>';
                container.appendChild(errPage);
                pagesCreated = 1;
            }
        }

        // Phase 3: Verify actual vs estimated and record estimate mismatch
        if (estimate && estimate.pages !== pagesCreated) {
            plan.repairLog.push({
                type: 'estimate-mismatch',
                groupType: group.groupType,
                template: template.id,
                estimated: estimate.pages,
                actual: pagesCreated,
                confidence: estimate.confidence
            });
        }

        // Record in plan
        recordGroupInPlan(plan, i, template.id, group.groupType, group.atoms.length, pagesCreated, estimate);

        // Record per-page entries with fill ratios from estimate
        for (var p = 0; p < pagesCreated; p++) {
            var fillRatio = null;
            if (estimate && estimate.fillRatios && p < estimate.fillRatios.length) {
                fillRatio = estimate.fillRatios[p];
            }
            recordPageInPlan(plan, totalPages + p, template.id, group.groupType, fillRatio);
        }

        // Update scoring context
        prevTemplateIds.push(template.id);
        if (estimate && estimate.fillRatios) {
            for (var fr = 0; fr < estimate.fillRatios.length; fr++) {
                prevFillRatios.push(estimate.fillRatios[fr]);
            }
        }

        totalPages += pagesCreated;
    }

    plan.metrics.totalPages = totalPages;

    // Phase 3: Finalize metrics (global score, fill ratio stats)
    finalizePlanMetrics(plan);

    // Phase 3: Record measurement cache stats
    if (hasMeasure) {
        plan.metrics.measurementCacheHits = GovernorMeasure.cacheSize();
        GovernorMeasure.destroy();
    }

    // Store layout plan as global artifact
    window._layoutPlan = plan;

    return totalPages;
};

// ── Expose ───────────────────────────────────────────────────

window.LayoutGovernor = LayoutGovernor;
