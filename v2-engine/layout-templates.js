// ── Layout Templates: Page-Level Composition Templates ────────
//
// Each template defines how to compose atom content into booklet pages.
// Templates handle page creation, slot arrangement, and overflow.
// The governor selects the best template for each atom group.
//
// Phase 2 of the Layout Governor v3.0 architecture.
//
// Depends on: render-utils.js (createPage, addPageNumber, decodeEntities,
//             escapeHtml), atom-renderers.js (AtomRenderers),
//             render-primitives.js (renderClock, etc.)
//
// Exposed: window.LayoutTemplates

var LayoutTemplates = {
    _registry: {}
};

/**
 * Register a template.
 * @param {Object} tmpl  { id, groupType, score(atoms, ctx), renderPages(container, atoms, ctx) }
 */
LayoutTemplates.register = function (tmpl) {
    if (!LayoutTemplates._registry[tmpl.groupType]) {
        LayoutTemplates._registry[tmpl.groupType] = [];
    }
    LayoutTemplates._registry[tmpl.groupType].push(tmpl);
};

/**
 * Select the best template for a group type.
 * @param {string} groupType
 * @param {Atom[]} atoms
 * @param {Object} ctx
 * @returns {Object} template
 */
LayoutTemplates.select = function (groupType, atoms, ctx) {
    var candidates = LayoutTemplates._registry[groupType] || [];
    if (candidates.length === 0) {
        console.warn('[layout-templates] No templates for groupType:', groupType);
        return null;
    }
    if (candidates.length === 1) return candidates[0];

    var best = candidates[0];
    var bestScore = best.score ? best.score(atoms, ctx) : 0;
    for (var i = 1; i < candidates.length; i++) {
        var s = candidates[i].score ? candidates[i].score(atoms, ctx) : 0;
        if (s > bestScore) {
            best = candidates[i];
            bestScore = s;
        }
    }
    return best;
};

// ── Helper: overflow-aware append ────────────────────────────

function appendWithOverflowCheck(page, el, container, pageType, pageNum) {
    page.appendChild(el);
    if (page.scrollHeight > page.clientHeight) {
        page.removeChild(el);
        addPageNumber(page, pageNum.value);
        pageNum.value++;
        var newPage = createPage(pageType);
        container.appendChild(newPage);
        newPage.appendChild(el);
        return newPage;
    }
    return page;
}

// ══════════════════════════════════════════════════════════════
//  COVER TEMPLATE
// ══════════════════════════════════════════════════════════════

LayoutTemplates.register({
    id: 'cover-standard',
    groupType: 'cover',
    score: function () { return 1; },
    renderPages: function (container, atoms, ctx) {
        var page = createPage('cover');
        page.classList.add('cover-layout');
        container.appendChild(page);

        var coverAtom = atoms[0];
        if (coverAtom) {
            var content = AtomRenderers.render(coverAtom, ctx);
            // Unwrap: move children into the page directly
            while (content.firstChild) {
                page.appendChild(content.firstChild);
            }
        }

        return 1;
    }
});

// ══════════════════════════════════════════════════════════════
//  RULES MANUAL TEMPLATE
// ══════════════════════════════════════════════════════════════

LayoutTemplates.register({
    id: 'rules-single-column',
    groupType: 'rules-manual',
    score: function () { return 1; },
    renderPages: function (container, atoms, ctx) {
        var voice = (ctx.data && ctx.data.voice && ctx.data.voice.manual) || {};
        var pageNum = { value: ctx.startPage };

        var page = createPage('rules-manual');
        container.appendChild(page);
        pageNum.value++;

        // Manual title (on first page only)
        var h1 = document.createElement('h1');
        h1.className = 'manual-title';
        h1.textContent = decodeEntities(voice.title || 'OPERATIONAL BRIEF');
        page.appendChild(h1);

        for (var i = 0; i < atoms.length; i++) {
            var el = AtomRenderers.render(atoms[i], ctx);
            page = appendWithOverflowCheck(page, el, container, 'rules-manual', pageNum);
        }

        addPageNumber(page, pageNum.value);
        return pageNum.value - ctx.startPage;
    }
});

// ══════════════════════════════════════════════════════════════
//  TRACKER SHEET TEMPLATE
// ══════════════════════════════════════════════════════════════

LayoutTemplates.register({
    id: 'tracker-vertical',
    groupType: 'tracker-sheet',
    score: function () { return 1; },
    renderPages: function (container, atoms, ctx) {
        var voice = (ctx.data && ctx.data.voice) || {};
        var mech = (ctx.data && ctx.data.mechanics) || {};
        var pageNum = { value: ctx.startPage + 1 };

        var page = createPage('tracker-sheet');
        page.classList.add('tracker-sheet');
        container.appendChild(page);

        // Heading
        var h1 = document.createElement('h1');
        h1.textContent = decodeEntities((voice.labels && voice.labels.mechanicsHeading) || 'CHARACTER DOSSIER');
        page.appendChild(h1);

        // Group atoms by type
        var clockAtoms = [];
        var trackAtoms = [];
        var resourceAtoms = [];
        var modifierAtoms = [];
        var triggerAtoms = [];

        atoms.forEach(function (a) {
            if (a.type === 'clock-display') clockAtoms.push(a);
            else if (a.type === 'archive-trigger') triggerAtoms.push(a);
            else if (a.type === 'track-display') trackAtoms.push(a);
            else if (a.type === 'resource-display') resourceAtoms.push(a);
            else if (a.type === 'modifier-display') modifierAtoms.push(a);
        });

        // Clocks section
        if (clockAtoms.length) {
            var clockSection = document.createElement('div');
            clockSection.className = 'tracker-section';
            var clockH = document.createElement('h2');
            clockH.textContent = decodeEntities((voice.labels && voice.labels.clocksHeading) || 'CLOCKS');
            clockSection.appendChild(clockH);
            clockAtoms.forEach(function (a) {
                var el = AtomRenderers.render(a, ctx);
                while (el.firstChild) clockSection.appendChild(el.firstChild);
            });
            page.appendChild(clockSection);
        }

        // Tracks section
        if (trackAtoms.length) {
            var trackSection = document.createElement('div');
            trackSection.className = 'tracker-section';
            var trackH = document.createElement('h2');
            trackH.textContent = 'TRACKS';
            trackSection.appendChild(trackH);
            trackAtoms.forEach(function (a) {
                var el = AtomRenderers.render(a, ctx);
                while (el.firstChild) trackSection.appendChild(el.firstChild);
            });
            page.appendChild(trackSection);
        }

        // Resources section
        if (resourceAtoms.length) {
            var resSection = document.createElement('div');
            resSection.className = 'tracker-section';
            var resH = document.createElement('h2');
            resH.textContent = decodeEntities((voice.labels && voice.labels.resourceHeading) || 'RESOURCES');
            resSection.appendChild(resH);
            resourceAtoms.forEach(function (a) {
                var el = AtomRenderers.render(a, ctx);
                while (el.firstChild) resSection.appendChild(el.firstChild);
            });
            page.appendChild(resSection);
        }

        // Codewords (from ctx.data.mechanics, not atoms)
        if (mech.codewords && mech.codewords.length) {
            var cwSection = document.createElement('div');
            cwSection.className = 'tracker-section';
            var cwH = document.createElement('h2');
            cwH.textContent = 'CODEWORDS';
            cwSection.appendChild(cwH);
            mech.codewords.forEach(function (cw) {
                var row = document.createElement('div');
                row.className = 'tracker-row codeword-row';
                var nameLine = document.createElement('div');
                nameLine.className = 'codeword-name';
                nameLine.innerHTML = '\u25A1 <strong>' + escapeHtml(cw.id) + '</strong>';
                row.appendChild(nameLine);
                var effectLine = document.createElement('div');
                effectLine.className = 'codeword-effect';
                effectLine.textContent = decodeEntities(cw.effect);
                row.appendChild(effectLine);
                cwSection.appendChild(row);
            });
            page.appendChild(cwSection);
        }

        // Dice stat (from ctx.data.mechanics, not atoms)
        if (mech.dice && mech.dice.stat && mech.dice.stat.name && mech.dice.stat.name.toLowerCase() !== 'none') {
            var statSection = document.createElement('div');
            statSection.className = 'tracker-section';
            var statH = document.createElement('h2');
            statH.textContent = decodeEntities(mech.dice.stat.name || 'STAT');
            statSection.appendChild(statH);
            var statInfo = document.createElement('div');
            statInfo.className = 'tracker-row';
            statInfo.innerHTML = 'Start: ' + (mech.dice.stat.startValue || 0) +
                ' | Degrade: ' + escapeHtml(mech.dice.stat.degradeTrigger || '') +
                ' | Recover: ' + escapeHtml(mech.dice.stat.recoverTrigger || '');
            statSection.appendChild(statInfo);
            statSection.appendChild(renderProgressTrack({ size: 6, startValue: mech.dice.stat.startValue }));
            page.appendChild(statSection);
        }

        // Overflow: redistribute sections across pages
        var pages = [page];
        var currentPageIndex = 0;
        while (pages[currentPageIndex].scrollHeight > pages[currentPageIndex].clientHeight) {
            var currPage = pages[currentPageIndex];
            var sections = currPage.querySelectorAll('.tracker-section');
            if (sections.length <= 1) break;
            var lastSection = sections[sections.length - 1];

            if (pages.length <= currentPageIndex + 1) {
                var newPage = createPage('tracker-sheet');
                newPage.classList.add('tracker-sheet');
                container.appendChild(newPage);
                pages.push(newPage);
            }
            pages[currentPageIndex + 1].insertBefore(lastSection, pages[currentPageIndex + 1].firstChild);
            if (currPage.scrollHeight <= currPage.clientHeight) currentPageIndex++;
        }

        pages.forEach(function (p, idx) {
            addPageNumber(p, ctx.startPage + 1 + idx);
        });
        return pages.length;
    }
});

// ══════════════════════════════════════════════════════════════
//  SETUP TEMPLATE
// ══════════════════════════════════════════════════════════════

LayoutTemplates.register({
    id: 'setup-standard',
    groupType: 'setup',
    score: function () { return 1; },
    renderPages: function (container, atoms, ctx) {
        var page = createPage('setup');
        page.classList.add('setup-page');
        container.appendChild(page);

        if (atoms[0]) {
            var content = AtomRenderers.render(atoms[0], ctx);
            while (content.firstChild) page.appendChild(content.firstChild);
        }

        addPageNumber(page, ctx.startPage + 1);
        return 1;
    }
});

// ══════════════════════════════════════════════════════════════
//  ENCOUNTER SPREAD TEMPLATE: CLASSIC (HUD + LOG)
// ══════════════════════════════════════════════════════════════

LayoutTemplates.register({
    id: 'encounter-classic',
    groupType: 'encounter-spread',
    score: function (atoms, ctx) {
        // Default template, scores highest for standard encounters
        return 0.8;
    },
    renderPages: function (container, atoms, ctx) {
        var data = ctx.data;
        var voice = data.voice || {};
        var mech = data.mechanics || {};
        var workout = data.workout || {};
        var week = ctx.week;
        var pagesCreated = 0;
        var pageNum = ctx.startPage;

        // Categorize atoms for this week
        var scaffoldAtoms = [];
        var workoutAtoms = {};  // keyed by session
        var conditionAtoms = {};  // keyed by session
        var mapAtom = null;
        var checkinAtom = null;

        atoms.forEach(function (a) {
            if (a.type === 'encounter-scaffold') scaffoldAtoms.push(a);
            else if (a.type === 'workout-session') workoutAtoms[a.session] = a;
            else if (a.type === 'condition-check') {
                if (!conditionAtoms[a.session]) conditionAtoms[a.session] = [];
                conditionAtoms[a.session].push(a);
            }
            else if (a.type === 'facility-grid' || a.type === 'point-to-point' || a.type === 'linear-track') mapAtom = a;
            else if (a.type === 'week-checkin') checkinAtom = a;
        });

        // Determine visual weight
        var weekVisualWeight = 'standard';
        var weights = { 'sparse': 0, 'standard': 1, 'dense': 2, 'crisis': 3 };
        scaffoldAtoms.forEach(function (a) {
            var w = (a.content && a.content.visualWeight) || 'standard';
            if ((weights[w] || 0) > (weights[weekVisualWeight] || 0)) weekVisualWeight = w;
        });

        // ── LEFT PAGE: HUD ──
        pageNum++;
        pagesCreated++;
        var hudPage = createPage('encounter-hud');
        hudPage.classList.add('encounter-hud');
        hudPage.dataset.week = week;
        hudPage.dataset.visualWeight = weekVisualWeight;
        container.appendChild(hudPage);

        // Classification
        var classText = (voice.classifications && voice.classifications.sessionLog) || 'WEEK {{week}}';
        var cls = document.createElement('div');
        cls.className = 'classification';
        cls.textContent = decodeEntities(classText.replace(/\{\{week\}\}/g, week));
        hudPage.appendChild(cls);

        // Progress pips
        var totalWeeks = workout.totalWeeks || 6;
        if (totalWeeks > 1) {
            var progressDiv = document.createElement('div');
            progressDiv.className = 'week-progress';
            for (var pw = 1; pw <= totalWeeks; pw++) {
                var pip = document.createElement('span');
                pip.className = 'week-pip' + (pw <= week ? ' week-pip-filled' : '') + (pw === week ? ' week-pip-current' : '');
                progressDiv.appendChild(pip);
            }
            hudPage.appendChild(progressDiv);
        }

        // Week alert
        if (voice.weekAlerts && voice.weekAlerts[week]) {
            var alert = voice.weekAlerts[week];
            var alertDiv = document.createElement('div');
            alertDiv.className = 'week-alert week-alert-' + (alert.type || 'note');
            if (alert.text) alertDiv.textContent = decodeEntities(alert.text);
            else if (alert.type === 'intake') alertDiv.textContent = 'INTAKE';
            hudPage.appendChild(alertDiv);
        }

        // Boss alert
        if (voice.weekBosses && voice.weekBosses[week]) {
            var bossAlert = voice.weekBosses[week];
            if (bossAlert.alert) {
                var bossAlertDiv = document.createElement('div');
                bossAlertDiv.className = 'week-alert week-alert-boss';
                bossAlertDiv.textContent = decodeEntities(bossAlert.alert);
                hudPage.appendChild(bossAlertDiv);
            }
        }

        // Map
        if (mapAtom) {
            var mapContainer = document.createElement('div');
            mapContainer.className = 'hud-map';
            var mapTitle = document.createElement('div');
            mapTitle.className = 'hud-map-title';
            var mapTitleText = (voice.hud && voice.hud.mapTitle) || 'MAP — WEEK {{week}}';
            mapTitle.textContent = decodeEntities(mapTitleText.replace(/\{\{week\}\}/g, week));
            mapContainer.appendChild(mapTitle);
            mapContainer.appendChild(AtomRenderers.render(mapAtom, ctx));
            hudPage.appendChild(mapContainer);
        }

        // Dice table
        var diceAtom = null;
        atoms.forEach(function (a) { if (a.type === 'dice-table') diceAtom = a; });
        if (!diceAtom && mech.dice && mech.dice.outcomes) {
            // Build dice table from context (shared atom not in this group)
            diceAtom = { type: 'dice-table', content: mech.dice };
        }
        if (diceAtom) {
            var diceDiv = document.createElement('div');
            diceDiv.className = 'hud-dice';
            var diceLabel = document.createElement('div');
            diceLabel.className = 'hud-dice-label';
            diceLabel.textContent = decodeEntities((voice.hud && voice.hud.diceLabel) || 'DICE RESOLUTION');
            diceDiv.appendChild(diceLabel);
            diceDiv.appendChild(AtomRenderers.render(diceAtom, ctx));
            if (voice.hud && voice.hud.diceNote) {
                var dn = document.createElement('div');
                dn.className = 'hud-dice-note';
                dn.textContent = decodeEntities(voice.hud.diceNote);
                diceDiv.appendChild(dn);
            }
            hudPage.appendChild(diceDiv);
        }

        // Mini trackers (clocks + heat/tug tracks from context)
        var hasClocks = mech.clocks && mech.clocks.length > 0;
        var hasTracks = mech.tracks && mech.tracks.some(function (t) { return t.type === 'heat' || t.type === 'tug'; });
        if (hasClocks || hasTracks) {
            var trackerDiv = document.createElement('div');
            trackerDiv.className = 'hud-trackers';
            var trackerLabel = document.createElement('div');
            trackerLabel.className = 'hud-trackers-label';
            trackerLabel.textContent = decodeEntities((voice.hud && voice.hud.clocksLabel) || 'TRACKERS');
            trackerDiv.appendChild(trackerLabel);

            if (hasClocks) {
                mech.clocks.forEach(function (c) {
                    var row = document.createElement('div');
                    row.className = 'hud-tracker-row';
                    var lbl = document.createElement('span');
                    lbl.className = 'hud-tracker-name';
                    lbl.textContent = decodeEntities(c.name);
                    row.appendChild(lbl);
                    row.appendChild(renderClock({ size: c.size || 6 }));
                    trackerDiv.appendChild(row);
                });
            }
            if (hasTracks) {
                mech.tracks.forEach(function (t) {
                    if (t.type !== 'heat' && t.type !== 'tug') return;
                    var row = document.createElement('div');
                    row.className = 'hud-tracker-row';
                    row.style.marginTop = '4px';
                    var lbl = document.createElement('span');
                    lbl.className = 'hud-tracker-name';
                    lbl.textContent = decodeEntities(t.name);
                    row.appendChild(lbl);
                    if (t.type === 'heat') row.appendChild(renderHeatTrack({ size: t.size || 10, startValue: t.startValue, thresholds: t.thresholds, compact: true }));
                    else row.appendChild(renderTugOfWar({ size: t.size || 5, thresholds: t.thresholds }));
                    trackerDiv.appendChild(row);
                });
            }
            hudPage.appendChild(trackerDiv);
        }

        addPageNumber(hudPage, pageNum);

        // ── RIGHT PAGE(S): SESSION LOG ──
        pageNum++;
        pagesCreated++;
        var logPage = createPage('encounter-log');
        logPage.classList.add('encounter-log');
        logPage.dataset.week = week;
        logPage.dataset.visualWeight = weekVisualWeight;
        container.appendChild(logPage);

        var logClassText = (voice.classifications && voice.classifications.operationsLog) || 'OPERATIONS — WEEK {{week}}';
        var logCls = document.createElement('div');
        logCls.className = 'classification';
        logCls.textContent = decodeEntities(logClassText.replace(/\{\{week\}\}/g, week));
        logPage.appendChild(logCls);

        var refScheme = (data.story && data.story.refScheme) || { prefix: 'R', weekDigits: 1, sessionDigits: 1 };

        // Build session blocks
        scaffoldAtoms.forEach(function (scaffAtom) {
            var day = scaffAtom.session;
            var sessionDiv = document.createElement('div');
            sessionDiv.className = 'session-block';
            if (scaffAtom.content.special === 'boss') sessionDiv.classList.add('session-boss');
            if (scaffAtom.content.special === 'rest') sessionDiv.classList.add('session-rest');
            if (scaffAtom.content.special === 'branch') sessionDiv.classList.add('session-branch');

            // Scaffold content (title, narrative, boss, branch, marginalia)
            var scaffEl = AtomRenderers.render(scaffAtom, ctx);
            while (scaffEl.firstChild) sessionDiv.appendChild(scaffEl.firstChild);

            // Conditional instructions
            var conds = conditionAtoms[day] || [];
            conds.forEach(function (ca) {
                sessionDiv.appendChild(AtomRenderers.render(ca, ctx));
            });

            // Workout log
            var wkAtom = workoutAtoms[day];
            if (wkAtom) {
                var wkEl = AtomRenderers.render(wkAtom, ctx);
                while (wkEl.firstChild) sessionDiv.appendChild(wkEl.firstChild);
            }

            // REF code
            var refCode = refScheme.prefix +
                String(week).padStart(refScheme.weekDigits || 1, '0') +
                String(day).padStart(refScheme.sessionDigits || 1, '0');
            var refDiv = document.createElement('div');
            refDiv.className = 'session-ref';
            var refLabel = (voice.labels && voice.labels.sessionRef) || 'REF {{ref}}';
            refDiv.textContent = refLabel.replace(/\{\{ref\}\}/g, refCode);
            sessionDiv.appendChild(refDiv);

            logPage.appendChild(sessionDiv);
        });

        // Week-end checkin
        if (checkinAtom) {
            logPage.appendChild(AtomRenderers.render(checkinAtom, ctx));
        }

        // Overflow: move session blocks to new pages
        var logPages = [logPage];
        var currentPageIndex = 0;
        while (logPages[currentPageIndex].scrollHeight > logPages[currentPageIndex].clientHeight) {
            var currPage = logPages[currentPageIndex];
            var blocks = currPage.querySelectorAll('.session-block, .week-checkin');
            if (blocks.length <= 1) {
                console.warn('CONTENT OVERFLOW: A single session block exceeds page height.');
                break;
            }
            var lastBlock = blocks[blocks.length - 1];
            if (logPages.length <= currentPageIndex + 1) {
                var newPage = createPage('encounter-log');
                newPage.classList.add('encounter-log');
                container.appendChild(newPage);
                logPages.push(newPage);
                pagesCreated++;
            }
            logPages[currentPageIndex + 1].insertBefore(lastBlock, logPages[currentPageIndex + 1].firstChild);
            if (currPage.scrollHeight <= currPage.clientHeight) currentPageIndex++;
        }

        logPages.forEach(function (p, idx) {
            addPageNumber(p, pageNum + idx);
        });

        return pagesCreated;
    }
});

// ══════════════════════════════════════════════════════════════
//  REF PAGES TEMPLATE: CODEX (scrambled paragraph book)
// ══════════════════════════════════════════════════════════════

LayoutTemplates.register({
    id: 'ref-codex',
    groupType: 'ref-pages',
    score: function () { return 1; },
    renderPages: function (container, atoms, ctx) {
        var data = ctx.data;
        var voice = data.voice || {};
        var mech = data.mechanics || {};
        var week = ctx.week;
        var outcomes = (mech.dice && mech.dice.outcomes) || [];
        var pageNum = { value: ctx.startPage };
        var pagesCreated = 0;

        // Separate routers from outcomes
        var routerAtoms = [];
        var outcomeAtoms = [];
        atoms.forEach(function (a) {
            if (a.type === 'ref-router') routerAtoms.push(a);
            else if (a.type === 'ref-outcome') outcomeAtoms.push(a);
        });

        function newRefPage() {
            var p = createPage('ref');
            p.classList.add('ref-page');
            container.appendChild(p);
            pageNum.value++;
            pagesCreated++;
            return p;
        }

        function appendOrOverflow(pg, el) {
            pg.appendChild(el);
            if (pg.scrollHeight > pg.clientHeight) {
                pg.removeChild(el);
                addPageNumber(pg, pageNum.value);
                pg = newRefPage();
                pg.appendChild(el);
            }
            return pg;
        }

        var page = newRefPage();

        // Classification
        var classText = (voice.classifications && voice.classifications.refs) || 'ROUTE CODES // WEEK {{week}}';
        var cls = document.createElement('div');
        cls.className = 'classification';
        cls.textContent = decodeEntities(classText.replace(/\{\{week\}\}/g, week));
        page.appendChild(cls);

        // Ref page alert
        if (voice.refPageAlerts && voice.refPageAlerts[week]) {
            var rpAlert = voice.refPageAlerts[week];
            var rpDiv = document.createElement('div');
            rpDiv.className = 'ref-page-alert ref-alert-' + (rpAlert.type || 'note');
            rpDiv.textContent = rpAlert.text || '';
            page.appendChild(rpDiv);
        }

        // Zone 1: Routers
        var routerSection = document.createElement('div');
        routerSection.className = 'ref-router-section';
        routerAtoms.forEach(function (ra) {
            routerSection.appendChild(AtomRenderers.render(ra, ctx));
        });
        page = appendOrOverflow(page, routerSection);

        // Zone divider
        var divider = document.createElement('hr');
        divider.className = 'ref-zone-divider';
        page.appendChild(divider);

        // Zone 2: Scrambled outcomes
        // Build branch entries for scrambling
        var allBranches = [];
        outcomeAtoms.forEach(function (oa) {
            allBranches.push({
                atom: oa,
                branchId: oa.content.refCode,
                refCode: oa.content.refCode.replace(/[A-Za-z]+$/, ''),  // base code
                outcome: { name: oa.content.outcomeName, range: oa.content.range }
            });
        });

        // Scramble using round-robin interleave
        var scrambled = scrambleBranches(allBranches, routerAtoms.length, outcomes.length);

        scrambled.forEach(function (entry, idx) {
            var el = AtomRenderers.render(entry.atom, ctx);

            // Add separator (except after last)
            if (idx < scrambled.length - 1) {
                var sep = document.createElement('hr');
                sep.className = 'ref-separator';
                el.appendChild(sep);
            }

            page = appendOrOverflow(page, el);
        });

        addPageNumber(page, pageNum.value);
        return pagesCreated;
    }
});

// ══════════════════════════════════════════════════════════════
//  ARCHIVE TEMPLATE: CLASSIC FLOW
// ══════════════════════════════════════════════════════════════

LayoutTemplates.register({
    id: 'archive-classic',
    groupType: 'archive',
    score: function () { return 1; },
    renderPages: function (container, atoms, ctx) {
        var data = ctx.data;
        var sectionKey = ctx.sectionKey;
        var pageNum = { value: ctx.startPage };
        var pagesCreated = 0;

        var page = createPage('archive');
        page.classList.add('archive-page');
        page.setAttribute('data-archive-section', sectionKey);
        container.appendChild(page);
        pageNum.value++;
        pagesCreated++;

        // Find the badge/header atom and document atoms
        var badgeAtom = null;
        var docAtoms = [];
        atoms.forEach(function (a) {
            if (a.type === 'classification-badge') badgeAtom = a;
            else docAtoms.push(a);
        });

        // Trigger label from context (clock → section mapping)
        var mech = (data && data.mechanics) || {};
        var triggerClock = null;
        if (mech.clocks) {
            mech.clocks.forEach(function (c) {
                if (c.onTrigger && c.onTrigger.section === sectionKey) triggerClock = c;
            });
        }
        if (triggerClock) {
            var trigLabel = document.createElement('div');
            trigLabel.className = 'archive-trigger-label';
            var trigVerb = triggerClock.direction === 'drain' ? 'empties' : 'fills';
            trigLabel.textContent = 'Read when ' + decodeEntities(triggerClock.name) + ' ' + trigVerb;
            page.appendChild(trigLabel);
        }

        // Badge (classification + title + intro)
        if (badgeAtom) {
            var badgeEl = AtomRenderers.render(badgeAtom, ctx);
            while (badgeEl.firstChild) page.appendChild(badgeEl.firstChild);
        }

        // Document nodes
        if (docAtoms.length === 0) {
            var err = document.createElement('div');
            err.className = 'archive-node archive-error';
            err.textContent = '[ERROR: MISSING ARCHIVE SECTION: ' + sectionKey + ']';
            page.appendChild(err);
            addPageNumber(page, pageNum.value);
            return pagesCreated;
        }

        docAtoms.forEach(function (da) {
            var el = AtomRenderers.render(da, ctx);
            page.appendChild(el);
            if (page.scrollHeight > page.clientHeight) {
                page.removeChild(el);
                addPageNumber(page, pageNum.value);
                pageNum.value++;
                pagesCreated++;
                page = createPage('archive');
                page.classList.add('archive-page');
                container.appendChild(page);
                page.appendChild(el);
            }
        });

        addPageNumber(page, pageNum.value);
        return pagesCreated;
    }
});

// ══════════════════════════════════════════════════════════════
//  ENDINGS TEMPLATE
// ══════════════════════════════════════════════════════════════

LayoutTemplates.register({
    id: 'endings-standard',
    groupType: 'endings',
    score: function () { return 1; },
    renderPages: function (container, atoms, ctx) {
        var voice = (ctx.data && ctx.data.voice) || {};
        var archiveVoice = voice.archive || {};
        var pageNum = { value: ctx.startPage };
        var pagesCreated = 0;

        var page = createPage('endings');
        page.classList.add('endings-page');
        container.appendChild(page);
        pageNum.value++;
        pagesCreated++;

        // Classification
        var classText = (voice.classifications && voice.classifications.endings) || 'ENDINGS';
        var cls = document.createElement('div');
        cls.className = 'classification';
        cls.textContent = decodeEntities(classText);
        page.appendChild(cls);

        // Title
        var h1 = document.createElement('h1');
        h1.textContent = decodeEntities(archiveVoice.endingsTitle || 'ENDINGS');
        page.appendChild(h1);

        // Trigger conditions (from first ending atom metadata)
        if (atoms.length > 0 && atoms[0].content.isFirst && atoms[0].content.endingsTrigger) {
            var trigData = atoms[0].content.endingsTrigger;
            var trigDiv = document.createElement('div');
            trigDiv.className = 'endings-trigger';
            var trigH = document.createElement('h2');
            trigH.textContent = decodeEntities(trigData.heading || 'WHEN TO READ');
            trigDiv.appendChild(trigH);
            if (trigData.lines) {
                var trigList = document.createElement('ul');
                trigData.lines.forEach(function (line) {
                    var li = document.createElement('li');
                    li.textContent = decodeEntities(line);
                    trigList.appendChild(li);
                });
                trigDiv.appendChild(trigList);
            }
            page.appendChild(trigDiv);
        }

        // Ending blocks
        atoms.forEach(function (ea) {
            var el = AtomRenderers.render(ea, ctx);
            page.appendChild(el);
            if (page.scrollHeight > page.clientHeight) {
                page.removeChild(el);
                addPageNumber(page, pageNum.value);
                pageNum.value++;
                pagesCreated++;
                page = createPage('endings');
                page.classList.add('endings-page');
                container.appendChild(page);
                page.appendChild(el);
            }
        });

        addPageNumber(page, pageNum.value);
        return pagesCreated;
    }
});

// ══════════════════════════════════════════════════════════════
//  EVIDENCE TEMPLATE
// ══════════════════════════════════════════════════════════════

LayoutTemplates.register({
    id: 'evidence-standard',
    groupType: 'evidence',
    score: function () { return 1; },
    renderPages: function (container, atoms, ctx) {
        var data = ctx.data;
        var voice = data.voice || {};
        var archiveVoice = voice.archive || {};
        var pageNum = { value: ctx.startPage };
        var pagesCreated = 0;

        if (atoms.length === 0) return 0;

        var page = createPage('evidence');
        page.classList.add('evidence-page');
        container.appendChild(page);
        pageNum.value++;
        pagesCreated++;

        // Classification
        var classText = (voice.classifications && voice.classifications.evidence) || '';
        if (classText) {
            var cls = document.createElement('div');
            cls.className = 'classification';
            cls.textContent = decodeEntities(classText);
            page.appendChild(cls);
        }

        var h1 = document.createElement('h1');
        h1.textContent = decodeEntities(archiveVoice.evidenceTitle || 'EVIDENCE LOG');
        page.appendChild(h1);

        if (archiveVoice.evidenceIntro) {
            var refScheme = (data.story && data.story.refScheme) || { prefix: 'R' };
            var introText = archiveVoice.evidenceIntro
                .replace(/\{\{prefix\}\}/g, refScheme.prefix)
                .replace(/\[\[prefix\]\]/g, refScheme.prefix);
            var intro = document.createElement('div');
            intro.className = 'evidence-intro';
            intro.textContent = decodeEntities(introText);
            page.appendChild(intro);
        }

        // Group atoms by week for chronological headers
        var lastWeek = 0;
        atoms.forEach(function (ea) {
            var w = ea.content.week || ea.week;
            if (w !== lastWeek) {
                var weekH = document.createElement('h2');
                weekH.className = 'evidence-week-header';
                weekH.textContent = 'WEEK ' + w;
                page.appendChild(weekH);
                lastWeek = w;
            }

            var el = AtomRenderers.render(ea, ctx);
            page.appendChild(el);
            if (page.scrollHeight > page.clientHeight) {
                page.removeChild(el);
                addPageNumber(page, pageNum.value);
                pageNum.value++;
                pagesCreated++;
                page = createPage('evidence');
                page.classList.add('evidence-page');
                container.appendChild(page);
                page.appendChild(el);
            }
        });

        addPageNumber(page, pageNum.value);
        return pagesCreated;
    }
});

// ══════════════════════════════════════════════════════════════
//  FINAL PAGE TEMPLATE
// ══════════════════════════════════════════════════════════════

LayoutTemplates.register({
    id: 'final-standard',
    groupType: 'final',
    score: function () { return 1; },
    renderPages: function (container, atoms, ctx) {
        var page = createPage('final');
        page.classList.add('final-page');
        container.appendChild(page);

        if (atoms[0]) {
            var content = AtomRenderers.render(atoms[0], ctx);
            while (content.firstChild) page.appendChild(content.firstChild);
        }

        return 1;
    }
});

// ── Expose ───────────────────────────────────────────────────

window.LayoutTemplates = LayoutTemplates;
