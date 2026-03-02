// ── Layout Governor: Composition Engine ───────────────────────
//
// Groups atoms by affinity, selects templates, composes pages.
// Replaces the pages[]-driven dispatch in box-packer.js with
// atom-driven composition via the template registry.
//
// Phase 2 of the Layout Governor v3.0 architecture.
//
// Depends on: content-atomizer.js (atomize), atom-renderers.js
//             (AtomRenderers), layout-templates.js (LayoutTemplates),
//             render-utils.js (createPage, addPageNumber),
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
        startPage: 0
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

    // ── 9. Final ──
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
 */
function createLayoutPlan() {
    return {
        pages: [],
        metrics: {
            totalPages: 0,
            overflowCount: 0,
            templateUsage: {},
            groupCount: 0
        },
        repairLog: []
    };
}

function recordPageInPlan(plan, pageIndex, templateId, groupType, atomCount) {
    plan.pages.push({
        index: pageIndex,
        template: templateId,
        groupType: groupType,
        atomCount: atomCount
    });
    if (!plan.metrics.templateUsage[templateId]) {
        plan.metrics.templateUsage[templateId] = 0;
    }
    plan.metrics.templateUsage[templateId]++;
}

// ── Main Compose Function ────────────────────────────────────

/**
 * Compose an atom inventory into a rendered booklet.
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

    var totalPages = 0;

    for (var i = 0; i < pageGroups.length; i++) {
        var group = pageGroups[i];

        // Enrich context with group-specific metadata
        ctx.startPage = totalPages;
        ctx.week = group.meta.week || null;
        ctx.sectionKey = group.meta.sectionKey || null;

        // Select template
        var template = LayoutTemplates.select(group.groupType, group.atoms, ctx);
        if (!template) {
            console.warn('[layout-governor] No template for group:', group.groupType);
            continue;
        }

        // Render pages via template
        var pagesCreated = 0;
        try {
            pagesCreated = template.renderPages(container, group.atoms, ctx);
        } catch (err) {
            console.error('[layout-governor] Template crashed:', template.id, 'group:', group.groupType, 'error:', err);
            var errPage = document.createElement('div');
            errPage.className = 'zine-page';
            errPage.innerHTML = '<h2 style="color:red">GOVERNOR ERROR</h2><p>Template "' +
                escapeHtml(template.id) + '" failed for ' + escapeHtml(group.groupType) + '</p>';
            container.appendChild(errPage);
            pagesCreated = 1;
        }

        recordPageInPlan(plan, totalPages, template.id, group.groupType, group.atoms.length);
        totalPages += pagesCreated;
    }

    plan.metrics.totalPages = totalPages;

    // Store layout plan as global artifact
    window._layoutPlan = plan;

    return totalPages;
};

// ── Expose ───────────────────────────────────────────────────

window.LayoutGovernor = LayoutGovernor;
