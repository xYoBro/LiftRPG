// ── Layout Templates: Page-Level Composition Templates ────────
//
// Each template defines how to compose atom content into booklet pages.
// Templates handle page creation, slot arrangement, and overflow.
// The governor selects the best template for each atom group.
//
// Phase 2-3 of the Layout Governor v3.0 architecture.
//
// Template interface:
//   id: string               Template identifier
//   groupType: string        Which group type this template handles
//   score(atoms, ctx):       Heuristic score (0-1) for quick selection
//   estimate(atoms, measurements, ctx):  Measurement-based estimate:
//     { templateId, pages, fillRatios: number[], confidence: 0-1 }
//   renderPages(container, atoms, ctx):  Render pages, returns page count
//
// Depends on: render-utils.js (createPage, addPageNumber, decodeEntities,
//             escapeHtml), atom-renderers.js (AtomRenderers),
//             render-primitives.js (renderClock, etc.),
//             governor-measure.js (GovernorMeasure) [optional],
//             governor-score.js (GovernorScore) [optional]
//
// Exposed: window.LayoutTemplates

var LayoutTemplates = {
    _registry: {}
};

/**
 * Register a template.
 * @param {Object} tmpl  { id, groupType, score, estimate, renderPages }
 */
LayoutTemplates.register = function (tmpl) {
    if (!LayoutTemplates._registry[tmpl.groupType]) {
        LayoutTemplates._registry[tmpl.groupType] = [];
    }
    LayoutTemplates._registry[tmpl.groupType].push(tmpl);
};

/**
 * Select the best template for a group type.
 *
 * When GovernorMeasure and GovernorScore are available AND templates
 * have estimate() methods, uses measurement-based scoring for
 * intelligent selection. Falls back to heuristic score() otherwise.
 *
 * @param {string} groupType
 * @param {Atom[]} atoms
 * @param {Object} ctx  { data, startPage, week, scoringContext }
 * @returns {Object} template
 */
LayoutTemplates.select = function (groupType, atoms, ctx) {
    var candidates = LayoutTemplates._registry[groupType] || [];
    if (candidates.length === 0) {
        console.warn('[layout-templates] No templates for groupType:', groupType);
        return null;
    }
    if (candidates.length === 1) return candidates[0];

    // Measurement-based selection (Phase 3+)
    var hasMeasure = typeof GovernorMeasure !== 'undefined' && GovernorMeasure.getPageHeight;
    var hasScore = typeof GovernorScore !== 'undefined' && GovernorScore.scoreCandidate;
    var allHaveEstimate = true;
    for (var c = 0; c < candidates.length; c++) {
        if (!candidates[c].estimate) { allHaveEstimate = false; break; }
    }

    if (hasMeasure && hasScore && allHaveEstimate) {
        var measurements = GovernorMeasure.measureGroup(atoms, ctx);
        var scoringCtx = ctx.scoringContext || null;
        var best = candidates[0];
        var bestEstimate = best.estimate(atoms, measurements, ctx);
        var bestScore = GovernorScore.scoreCandidate(bestEstimate, scoringCtx);

        for (var i = 1; i < candidates.length; i++) {
            var est = candidates[i].estimate(atoms, measurements, ctx);
            var s = GovernorScore.scoreCandidate(est, scoringCtx);
            if (s > bestScore) {
                best = candidates[i];
                bestEstimate = est;
                bestScore = s;
            }
        }
        // Stash the winning estimate on ctx for the governor's plan artifact
        ctx._selectedEstimate = bestEstimate;
        return best;
    }

    // Heuristic fallback (Phase 2 behavior)
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
    estimate: function (atoms, measurements, ctx) {
        return { templateId: 'cover-standard', pages: 1, fillRatios: [0.7], confidence: 0.9 };
    },
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
    estimate: function (atoms, measurements, ctx) {
        var ph = measurements.pageHeight;
        var titleOverhead = 60;  // h1 title
        var heights = [];
        for (var i = 0; i < measurements.measurements.length; i++) {
            heights.push(measurements.measurements[i].height);
        }
        var fillRatios = GovernorScore.computeFillRatios(heights, ph, titleOverhead);
        return { templateId: 'rules-single-column', pages: fillRatios.length, fillRatios: fillRatios, confidence: 0.8 };
    },
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
    estimate: function (atoms, measurements, ctx) {
        var ph = measurements.pageHeight;
        var overhead = 80;  // h1 + section headings
        var totalH = measurements.totalHeight + overhead;
        // Codewords and dice stat add ~80px each
        var mech = (ctx.data && ctx.data.mechanics) || {};
        if (mech.codewords && mech.codewords.length) totalH += 30 + mech.codewords.length * 45;
        if (mech.dice && mech.dice.stat && mech.dice.stat.name && mech.dice.stat.name.toLowerCase() !== 'none') totalH += 80;
        var pages = Math.ceil(totalH / ph) || 1;
        var fillRatios = [];
        for (var p = 0; p < pages; p++) {
            var rem = totalH - (p * ph);
            fillRatios.push(Math.min(rem / ph, 1.0));
        }
        return { templateId: 'tracker-vertical', pages: pages, fillRatios: fillRatios, confidence: 0.7 };
    },
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
    estimate: function (atoms, measurements, ctx) {
        return { templateId: 'setup-standard', pages: 1, fillRatios: [0.75], confidence: 0.8 };
    },
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
    estimate: function (atoms, measurements, ctx) {
        var ph = measurements.pageHeight;
        // HUD page: template overhead (classification, pips, alerts, trackers) + map + dice
        var hudOverhead = 180;  // classification + pips + alert space + tracker labels
        var mapH = 0, diceH = 0;
        var logAtomHeights = [];
        var mech = (ctx.data && ctx.data.mechanics) || {};

        for (var i = 0; i < measurements.measurements.length; i++) {
            var m = measurements.measurements[i];
            var t = m.atom.type;
            if (t === 'facility-grid' || t === 'point-to-point' || t === 'linear-track') {
                mapH = m.height;
            } else if (t === 'dice-table') {
                diceH = m.height;
            } else if (t === 'encounter-scaffold' || t === 'workout-session' ||
                       t === 'condition-check' || t === 'week-checkin') {
                logAtomHeights.push(m.height);
            }
        }
        // Mini trackers: ~35px per clock, ~45px per heat/tug track
        var trackerH = 0;
        if (mech.clocks) trackerH += mech.clocks.length * 35;
        if (mech.tracks) {
            for (var j = 0; j < mech.tracks.length; j++) {
                if (mech.tracks[j].type === 'heat' || mech.tracks[j].type === 'tug') trackerH += 45;
            }
        }
        var hudFill = Math.min((hudOverhead + mapH + diceH + trackerH) / ph, 1.0);

        // Log pages: bin-pack session atoms
        var logOverhead = 40;  // classification
        var logFills = GovernorScore.computeFillRatios(logAtomHeights, ph, logOverhead);

        var fillRatios = [hudFill];
        for (var k = 0; k < logFills.length; k++) fillRatios.push(logFills[k]);

        return {
            templateId: 'encounter-classic',
            pages: 1 + logFills.length,
            fillRatios: fillRatios,
            confidence: 0.7
        };
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
    estimate: function (atoms, measurements, ctx) {
        var ph = measurements.pageHeight;
        var overhead = 60;  // classification + zone divider
        var heights = [];
        for (var i = 0; i < measurements.measurements.length; i++) {
            heights.push(measurements.measurements[i].height);
        }
        var fillRatios = GovernorScore.computeFillRatios(heights, ph, overhead);
        return { templateId: 'ref-codex', pages: fillRatios.length, fillRatios: fillRatios, confidence: 0.75 };
    },
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
    estimate: function (atoms, measurements, ctx) {
        var ph = measurements.pageHeight;
        var overhead = 100;  // trigger label + classification + title + intro
        var heights = [];
        for (var i = 0; i < measurements.measurements.length; i++) {
            if (measurements.measurements[i].atom.type !== 'classification-badge') {
                heights.push(measurements.measurements[i].height);
            }
        }
        var fillRatios = GovernorScore.computeFillRatios(heights, ph, overhead);
        return { templateId: 'archive-classic', pages: fillRatios.length, fillRatios: fillRatios, confidence: 0.75 };
    },
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
    estimate: function (atoms, measurements, ctx) {
        var ph = measurements.pageHeight;
        var overhead = 120;  // classification + title + trigger conditions
        var heights = [];
        for (var i = 0; i < measurements.measurements.length; i++) {
            heights.push(measurements.measurements[i].height);
        }
        var fillRatios = GovernorScore.computeFillRatios(heights, ph, overhead);
        return { templateId: 'endings-standard', pages: fillRatios.length, fillRatios: fillRatios, confidence: 0.75 };
    },
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
    estimate: function (atoms, measurements, ctx) {
        var ph = measurements.pageHeight;
        var overhead = 100;  // classification + title + intro
        var heights = [];
        for (var i = 0; i < measurements.measurements.length; i++) {
            heights.push(measurements.measurements[i].height);
        }
        var fillRatios = GovernorScore.computeFillRatios(heights, ph, overhead);
        return { templateId: 'evidence-standard', pages: fillRatios.length, fillRatios: fillRatios, confidence: 0.75 };
    },
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
    estimate: function (atoms, measurements, ctx) {
        return { templateId: 'final-standard', pages: 1, fillRatios: [0.5], confidence: 0.9 };
    },
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

// ══════════════════════════════════════════════════════════════
//  ENCOUNTER SPREAD TEMPLATE: INTEGRATED (compact, no HUD page)
// ══════════════════════════════════════════════════════════════
//
// For sparse/standard weeks with ≤2 sessions. Map and dice are
// inline with session content — no dedicated HUD page. Produces
// fewer pages at the cost of losing the HUD visual separation.

LayoutTemplates.register({
    id: 'encounter-integrated',
    groupType: 'encounter-spread',
    score: function (atoms, ctx) {
        // Score high for sparse weeks with few sessions
        var scaffolds = 0;
        var weight = 'standard';
        var hasBreather = false;
        for (var i = 0; i < atoms.length; i++) {
            if (atoms[i].type === 'encounter-scaffold') {
                scaffolds++;
                var vw = (atoms[i].content && atoms[i].content.visualWeight) || 'standard';
                if (vw === 'dense' || vw === 'crisis') weight = vw;
                if (atoms[i].content && atoms[i].content.pacingHint === 'breather') hasBreather = true;
            }
        }
        if (weight === 'dense' || weight === 'crisis') return 0.2;  // Not for dense weeks
        if (hasBreather && scaffolds <= 2) return 0.95;  // Ideal for breather pacing
        if (scaffolds <= 2) return 0.9;  // Best for compact weeks
        return 0.4;  // Can handle 3+ but classic is better
    },
    estimate: function (atoms, measurements, ctx) {
        var ph = measurements.pageHeight;
        var overhead = 60;  // classification + map title
        var heights = [];
        for (var i = 0; i < measurements.measurements.length; i++) {
            heights.push(measurements.measurements[i].height);
        }
        var fillRatios = GovernorScore.computeFillRatios(heights, ph, overhead);
        return {
            templateId: 'encounter-integrated',
            pages: fillRatios.length,
            fillRatios: fillRatios,
            confidence: 0.7
        };
    },
    renderPages: function (container, atoms, ctx) {
        var data = ctx.data;
        var voice = data.voice || {};
        var mech = data.mechanics || {};
        var workout = data.workout || {};
        var week = ctx.week;
        var pagesCreated = 0;
        var pageNum = { value: ctx.startPage };

        // Categorize atoms
        var scaffoldAtoms = [];
        var workoutAtoms = {};
        var conditionAtoms = {};
        var mapAtom = null;
        var checkinAtom = null;
        var diceAtom = null;

        atoms.forEach(function (a) {
            if (a.type === 'encounter-scaffold') scaffoldAtoms.push(a);
            else if (a.type === 'workout-session') workoutAtoms[a.session] = a;
            else if (a.type === 'condition-check') {
                if (!conditionAtoms[a.session]) conditionAtoms[a.session] = [];
                conditionAtoms[a.session].push(a);
            }
            else if (a.type === 'facility-grid' || a.type === 'point-to-point' || a.type === 'linear-track') mapAtom = a;
            else if (a.type === 'week-checkin') checkinAtom = a;
            else if (a.type === 'dice-table') diceAtom = a;
        });

        var weekVisualWeight = 'standard';
        var weights = { 'sparse': 0, 'standard': 1, 'dense': 2, 'crisis': 3 };
        scaffoldAtoms.forEach(function (a) {
            var w = (a.content && a.content.visualWeight) || 'standard';
            if ((weights[w] || 0) > (weights[weekVisualWeight] || 0)) weekVisualWeight = w;
        });

        // Single page type: integrated encounter
        pageNum.value++;
        pagesCreated++;
        var page = createPage('encounter-log');
        page.classList.add('encounter-log', 'encounter-integrated');
        page.dataset.week = week;
        page.dataset.visualWeight = weekVisualWeight;
        container.appendChild(page);

        // Classification
        var classText = (voice.classifications && voice.classifications.sessionLog) || 'WEEK {{week}}';
        var cls = document.createElement('div');
        cls.className = 'classification';
        cls.textContent = decodeEntities(classText.replace(/\{\{week\}\}/g, week));
        page.appendChild(cls);

        // Progress pips (compact)
        var totalWeeks = workout.totalWeeks || 6;
        if (totalWeeks > 1) {
            var progressDiv = document.createElement('div');
            progressDiv.className = 'week-progress';
            for (var pw = 1; pw <= totalWeeks; pw++) {
                var pip = document.createElement('span');
                pip.className = 'week-pip' + (pw <= week ? ' week-pip-filled' : '') + (pw === week ? ' week-pip-current' : '');
                progressDiv.appendChild(pip);
            }
            page.appendChild(progressDiv);
        }

        // Inline map (smaller, at top)
        if (mapAtom) {
            var mapWrap = document.createElement('div');
            mapWrap.className = 'integrated-map';
            var mapTitle = document.createElement('div');
            mapTitle.className = 'hud-map-title';
            var mapTitleText = (voice.hud && voice.hud.mapTitle) || 'MAP — WEEK {{week}}';
            mapTitle.textContent = decodeEntities(mapTitleText.replace(/\{\{week\}\}/g, week));
            mapWrap.appendChild(mapTitle);
            mapWrap.appendChild(AtomRenderers.render(mapAtom, ctx));
            page.appendChild(mapWrap);
        }

        var refScheme = (data.story && data.story.refScheme) || { prefix: 'R', weekDigits: 1, sessionDigits: 1 };

        // Session blocks (scaffold + conditions + workout inline)
        scaffoldAtoms.forEach(function (scaffAtom) {
            var day = scaffAtom.session;
            var sessionDiv = document.createElement('div');
            sessionDiv.className = 'session-block';
            if (scaffAtom.content.special === 'boss') sessionDiv.classList.add('session-boss');
            if (scaffAtom.content.special === 'rest') sessionDiv.classList.add('session-rest');
            if (scaffAtom.content.special === 'branch') sessionDiv.classList.add('session-branch');

            var scaffEl = AtomRenderers.render(scaffAtom, ctx);
            while (scaffEl.firstChild) sessionDiv.appendChild(scaffEl.firstChild);

            var conds = conditionAtoms[day] || [];
            conds.forEach(function (ca) {
                sessionDiv.appendChild(AtomRenderers.render(ca, ctx));
            });

            var wkAtom = workoutAtoms[day];
            if (wkAtom) {
                var wkEl = AtomRenderers.render(wkAtom, ctx);
                while (wkEl.firstChild) sessionDiv.appendChild(wkEl.firstChild);
            }

            var refCode = refScheme.prefix +
                String(week).padStart(refScheme.weekDigits || 1, '0') +
                String(day).padStart(refScheme.sessionDigits || 1, '0');
            var refDiv = document.createElement('div');
            refDiv.className = 'session-ref';
            var refLabel = (voice.labels && voice.labels.sessionRef) || 'REF {{ref}}';
            refDiv.textContent = refLabel.replace(/\{\{ref\}\}/g, refCode);
            sessionDiv.appendChild(refDiv);

            page.appendChild(sessionDiv);
        });

        // Inline dice reference (compact, after sessions)
        if (!diceAtom && mech.dice && mech.dice.outcomes) {
            diceAtom = { type: 'dice-table', id: 'dice-inline', content: mech.dice };
        }
        if (diceAtom) {
            var diceWrap = document.createElement('div');
            diceWrap.className = 'integrated-dice';
            var diceLabel = document.createElement('div');
            diceLabel.className = 'hud-dice-label';
            diceLabel.textContent = decodeEntities((voice.hud && voice.hud.diceLabel) || 'DICE');
            diceWrap.appendChild(diceLabel);
            diceWrap.appendChild(AtomRenderers.render(diceAtom, ctx));
            page.appendChild(diceWrap);
        }

        // Week checkin
        if (checkinAtom) {
            page.appendChild(AtomRenderers.render(checkinAtom, ctx));
        }

        // Overflow: redistribute blocks across pages
        var pages = [page];
        var currentPageIndex = 0;
        while (pages[currentPageIndex].scrollHeight > pages[currentPageIndex].clientHeight) {
            var currPage = pages[currentPageIndex];
            var blocks = currPage.querySelectorAll('.session-block, .week-checkin, .integrated-dice');
            if (blocks.length <= 1) {
                console.warn('[encounter-integrated] Single block exceeds page height.');
                break;
            }
            var lastBlock = blocks[blocks.length - 1];
            if (pages.length <= currentPageIndex + 1) {
                var newPage = createPage('encounter-log');
                newPage.classList.add('encounter-log', 'encounter-integrated');
                newPage.dataset.week = week;
                container.appendChild(newPage);
                pages.push(newPage);
                pagesCreated++;
            }
            pages[currentPageIndex + 1].insertBefore(lastBlock, pages[currentPageIndex + 1].firstChild);
            if (currPage.scrollHeight <= currPage.clientHeight) currentPageIndex++;
        }

        pages.forEach(function (p, idx) {
            addPageNumber(p, pageNum.value + idx);
        });
        return pagesCreated;
    }
});

// ══════════════════════════════════════════════════════════════
//  ENCOUNTER SPREAD TEMPLATE: DOSSIER (dramatic boss layout)
// ══════════════════════════════════════════════════════════════
//
// For boss encounters. Gives the boss rules dramatic presentation
// with a dedicated page. Scores high when there's a boss encounter.

LayoutTemplates.register({
    id: 'encounter-dossier',
    groupType: 'encounter-spread',
    score: function (atoms, ctx) {
        // Only score high if there's a boss encounter or crescendo pacing
        var hasBoss = false;
        var hasCrescendo = false;
        for (var i = 0; i < atoms.length; i++) {
            if (atoms[i].type === 'encounter-scaffold' && atoms[i].content) {
                if (atoms[i].content.special === 'boss') hasBoss = true;
                if (atoms[i].content.pacingHint === 'crescendo') hasCrescendo = true;
            }
        }
        if (hasBoss) return 0.95;
        if (hasCrescendo) return 0.85;  // Dramatic treatment for crescendo pacing
        return 0.1;
    },
    estimate: function (atoms, measurements, ctx) {
        var ph = measurements.pageHeight;
        // Dossier always uses 2+ pages: HUD + boss session(s) dedicated
        var hudOverhead = 200;
        var mapH = 0, diceH = 0;
        var logAtomHeights = [];
        var mech = (ctx.data && ctx.data.mechanics) || {};

        for (var i = 0; i < measurements.measurements.length; i++) {
            var m = measurements.measurements[i];
            var t = m.atom.type;
            if (t === 'facility-grid' || t === 'point-to-point' || t === 'linear-track') {
                mapH = m.height;
            } else if (t === 'dice-table') {
                diceH = m.height;
            } else {
                logAtomHeights.push(m.height);
            }
        }
        var trackerH = 0;
        if (mech.clocks) trackerH += mech.clocks.length * 35;

        var hudFill = Math.min((hudOverhead + mapH + diceH + trackerH) / ph, 1.0);
        var logOverhead = 60;
        var logFills = GovernorScore.computeFillRatios(logAtomHeights, ph, logOverhead);
        var fillRatios = [hudFill];
        for (var k = 0; k < logFills.length; k++) fillRatios.push(logFills[k]);

        return {
            templateId: 'encounter-dossier',
            pages: 1 + logFills.length,
            fillRatios: fillRatios,
            confidence: 0.65
        };
    },
    renderPages: function (container, atoms, ctx) {
        // Dossier reuses classic rendering but with enhanced boss styling
        // The visual differentiation comes from CSS classes
        var data = ctx.data;
        var voice = data.voice || {};
        var mech = data.mechanics || {};
        var workout = data.workout || {};
        var week = ctx.week;
        var pagesCreated = 0;
        var pageNum = ctx.startPage;

        var scaffoldAtoms = [];
        var workoutAtoms = {};
        var conditionAtoms = {};
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

        // ── HUD PAGE (same as classic but with dossier class) ──
        pageNum++;
        pagesCreated++;
        var hudPage = createPage('encounter-hud');
        hudPage.classList.add('encounter-hud', 'encounter-dossier');
        hudPage.dataset.week = week;
        hudPage.dataset.visualWeight = 'crisis';  // Always dramatic
        container.appendChild(hudPage);

        var classText = (voice.classifications && voice.classifications.sessionLog) || 'WEEK {{week}}';
        var cls = document.createElement('div');
        cls.className = 'classification';
        cls.textContent = decodeEntities(classText.replace(/\{\{week\}\}/g, week));
        hudPage.appendChild(cls);

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

        // Boss alert (prominent in dossier)
        if (voice.weekBosses && voice.weekBosses[week]) {
            var bossAlert = voice.weekBosses[week];
            if (bossAlert.alert) {
                var bossAlertDiv = document.createElement('div');
                bossAlertDiv.className = 'week-alert week-alert-boss dossier-boss-alert';
                bossAlertDiv.textContent = decodeEntities(bossAlert.alert);
                hudPage.appendChild(bossAlertDiv);
            }
        }

        // Week alert
        if (voice.weekAlerts && voice.weekAlerts[week]) {
            var alert = voice.weekAlerts[week];
            var alertDiv = document.createElement('div');
            alertDiv.className = 'week-alert week-alert-' + (alert.type || 'note');
            if (alert.text) alertDiv.textContent = decodeEntities(alert.text);
            hudPage.appendChild(alertDiv);
        }

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

        var diceAtom = null;
        atoms.forEach(function (a) { if (a.type === 'dice-table') diceAtom = a; });
        if (!diceAtom && mech.dice && mech.dice.outcomes) {
            diceAtom = { type: 'dice-table', id: 'dice-inline', content: mech.dice };
        }
        if (diceAtom) {
            var diceDiv = document.createElement('div');
            diceDiv.className = 'hud-dice';
            var diceLabel = document.createElement('div');
            diceLabel.className = 'hud-dice-label';
            diceLabel.textContent = decodeEntities((voice.hud && voice.hud.diceLabel) || 'DICE RESOLUTION');
            diceDiv.appendChild(diceLabel);
            diceDiv.appendChild(AtomRenderers.render(diceAtom, ctx));
            hudPage.appendChild(diceDiv);
        }

        addPageNumber(hudPage, pageNum);

        // ── LOG PAGE(S) ──
        pageNum++;
        pagesCreated++;
        var logPage = createPage('encounter-log');
        logPage.classList.add('encounter-log', 'encounter-dossier');
        logPage.dataset.week = week;
        logPage.dataset.visualWeight = 'crisis';
        container.appendChild(logPage);

        var logClassText = (voice.classifications && voice.classifications.operationsLog) || 'OPERATIONS — WEEK {{week}}';
        var logCls = document.createElement('div');
        logCls.className = 'classification';
        logCls.textContent = decodeEntities(logClassText.replace(/\{\{week\}\}/g, week));
        logPage.appendChild(logCls);

        var refScheme = (data.story && data.story.refScheme) || { prefix: 'R', weekDigits: 1, sessionDigits: 1 };

        scaffoldAtoms.forEach(function (scaffAtom) {
            var day = scaffAtom.session;
            var sessionDiv = document.createElement('div');
            sessionDiv.className = 'session-block';
            if (scaffAtom.content.special === 'boss') sessionDiv.classList.add('session-boss', 'dossier-boss-session');
            if (scaffAtom.content.special === 'rest') sessionDiv.classList.add('session-rest');
            if (scaffAtom.content.special === 'branch') sessionDiv.classList.add('session-branch');

            var scaffEl = AtomRenderers.render(scaffAtom, ctx);
            while (scaffEl.firstChild) sessionDiv.appendChild(scaffEl.firstChild);

            var conds = conditionAtoms[day] || [];
            conds.forEach(function (ca) {
                sessionDiv.appendChild(AtomRenderers.render(ca, ctx));
            });

            var wkAtom = workoutAtoms[day];
            if (wkAtom) {
                var wkEl = AtomRenderers.render(wkAtom, ctx);
                while (wkEl.firstChild) sessionDiv.appendChild(wkEl.firstChild);
            }

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

        if (checkinAtom) {
            logPage.appendChild(AtomRenderers.render(checkinAtom, ctx));
        }

        // Overflow handling
        var logPages = [logPage];
        var currentPageIndex = 0;
        while (logPages[currentPageIndex].scrollHeight > logPages[currentPageIndex].clientHeight) {
            var currPage = logPages[currentPageIndex];
            var blocks = currPage.querySelectorAll('.session-block, .week-checkin');
            if (blocks.length <= 1) break;
            var lastBlock = blocks[blocks.length - 1];
            if (logPages.length <= currentPageIndex + 1) {
                var newPage = createPage('encounter-log');
                newPage.classList.add('encounter-log', 'encounter-dossier');
                newPage.dataset.week = week;
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

// ── Helper: break-policy-aware append ────────────────────────

/**
 * Check if a page with a column-count container is overflowing.
 * CSS column-count inflates page.scrollHeight (reports single-column height),
 * creating phantom overflows. This function computes the balanced column height
 * and checks against the actual available space.
 *
 * @param {HTMLElement} page
 * @param {HTMLElement} colContainer  The column-count container element
 * @param {number} [colCount]  Number of columns (default: 2)
 * @returns {boolean}  true if content genuinely overflows
 */
function isColumnPageOverflowing(page, colContainer, colCount) {
    colCount = colCount || 2;
    var padBottom = parseFloat(window.getComputedStyle(page).paddingBottom) || 0;
    var available = page.clientHeight - colContainer.offsetTop - padBottom;
    var singleColH = colContainer.scrollHeight;
    var balancedH = Math.ceil(singleColH / colCount);
    return balancedH > available;
}

/**
 * Append an element to a page, respecting break policies.
 * Tracks the last appended atom for keepWithNext enforcement.
 *
 * @param {HTMLElement} page
 * @param {HTMLElement} el
 * @param {Atom} atom
 * @param {HTMLElement} container
 * @param {string} pageType
 * @param {Object} pageNum  { value: number }
 * @param {Object} plan     Layout plan for repair logging (optional)
 * @param {Object} state    { lastAtom, lastEl } mutable tracking state
 * @returns {HTMLElement} current page (may be new)
 */
function appendWithBreakPolicy(page, el, atom, container, pageType, pageNum, plan, state) {
    page.appendChild(el);
    if (page.scrollHeight <= page.clientHeight) {
        // Fits — update state
        if (state) { state.lastAtom = atom; state.lastEl = el; }
        return page;
    }

    // Overflow detected
    var bp = (atom && atom.breakPolicy) || {};

    // mustNotSplit: atom too large for a page — leave it and warn
    if (bp.mustNotSplit && page.children.length === 1) {
        console.warn('[layout-templates] mustNotSplit atom exceeds page:', atom.id);
        if (state) { state.lastAtom = atom; state.lastEl = el; }
        return page;
    }

    page.removeChild(el);

    // keepWithNext: if previous atom wants to stay with this one, pull both
    if (state && state.lastAtom && state.lastEl) {
        var prevStrength = (state.lastAtom.breakPolicy && state.lastAtom.breakPolicy.keepWithNextStrength) || 0;
        if (prevStrength >= 50 && state.lastEl.parentNode === page) {
            page.removeChild(state.lastEl);
            addPageNumber(page, pageNum.value);
            pageNum.value++;
            var newPage = createPage(pageType);
            container.appendChild(newPage);
            newPage.appendChild(state.lastEl);
            newPage.appendChild(el);

            if (plan) {
                plan.repairLog.push({
                    type: 'keep-with-next',
                    atom: atom.id,
                    prevAtom: state.lastAtom.id,
                    strength: prevStrength,
                    reason: 'keepWithNextStrength >= 50, pulled pair to new page'
                });
            }
            if (state) { state.lastAtom = atom; state.lastEl = el; }
            return newPage;
        }
    }

    // Normal break: move overflowing element to new page
    addPageNumber(page, pageNum.value);
    pageNum.value++;
    var nextPage = createPage(pageType);
    container.appendChild(nextPage);
    nextPage.appendChild(el);

    if (plan && atom && bp.keepWithNextStrength > 0) {
        plan.repairLog.push({
            type: 'break-relaxation',
            atom: atom.id,
            strength: bp.keepWithNextStrength || 0,
            reason: 'overflow, broke before this atom'
        });
    }

    if (state) { state.lastAtom = atom; state.lastEl = el; }
    return nextPage;
}

// ══════════════════════════════════════════════════════════════
//  ENCOUNTER TEMPLATE: MAGAZINE (multi-column dense layout)
// ══════════════════════════════════════════════════════════════

LayoutTemplates.register({
    id: 'encounter-magazine',
    groupType: 'encounter-spread',
    score: function (atoms, ctx) {
        // Prefer for dense/crisis weeks with 3+ sessions
        var sessionCount = 0;
        var maxWeight = 0;
        var hasCrescendo = false;
        var weights = { 'sparse': 0, 'standard': 1, 'dense': 2, 'crisis': 3 };
        atoms.forEach(function (a) {
            if (a.type === 'encounter-scaffold') {
                sessionCount++;
                var w = (a.content && a.content.visualWeight) || 'standard';
                if ((weights[w] || 0) > maxWeight) maxWeight = weights[w] || 0;
                if (a.content && a.content.pacingHint === 'crescendo') hasCrescendo = true;
            }
        });
        if (sessionCount >= 3 && maxWeight >= 2) return 0.92;  // dense/crisis + many sessions
        if (hasCrescendo && sessionCount >= 3) return 0.88;  // crescendo + many sessions
        if (sessionCount >= 3) return 0.75;  // many sessions, standard weight
        return 0.3;  // not enough content to justify 2 columns
    },
    estimate: function (atoms, measurements, ctx) {
        var ph = measurements.pageHeight;
        var pw = GovernorMeasure.getContentWidth();
        var leftW = Math.floor(pw * 0.55);
        var rightW = pw - leftW;
        var overhead = 80;  // classification + pips + footer reservation
        var footerH = 0;

        var leftHeights = [];
        var rightHeights = [];

        for (var i = 0; i < measurements.measurements.length; i++) {
            var m = measurements.measurements[i];
            var t = m.atom.type;
            if (t === 'facility-grid' || t === 'point-to-point' || t === 'linear-track' || t === 'week-checkin') {
                footerH += GovernorMeasure.measure(m.atom, ctx, pw);
            } else if (t === 'workout-session') {
                rightHeights.push(GovernorMeasure.measure(m.atom, ctx, rightW));
            } else if (t === 'encounter-scaffold' || t === 'condition-check') {
                leftHeights.push(GovernorMeasure.measure(m.atom, ctx, leftW));
            }
        }

        var available = ph - overhead - footerH;
        if (available <= 0) available = ph * 0.5;

        var leftTotal = 0;
        for (var j = 0; j < leftHeights.length; j++) leftTotal += leftHeights[j];
        var rightTotal = 0;
        for (var k = 0; k < rightHeights.length; k++) rightTotal += rightHeights[k];

        var tallColumn = Math.max(leftTotal, rightTotal);
        var pages = Math.ceil(tallColumn / available) || 1;
        var fillRatios = [];
        for (var p = 0; p < pages; p++) {
            var pageContent = Math.min(tallColumn - (p * available), available);
            fillRatios.push(Math.min((pageContent + overhead + footerH / pages) / ph, 1.0));
        }

        return {
            templateId: 'encounter-magazine',
            pages: pages,
            fillRatios: fillRatios,
            confidence: 0.6,
            multiSlot: true
        };
    },
    renderPages: function (container, atoms, ctx) {
        var data = ctx.data;
        var voice = data.voice || {};
        var mech = data.mechanics || {};
        var workout = data.workout || {};
        var week = ctx.week;
        var pagesCreated = 0;
        var pageNum = ctx.startPage;

        // Categorize atoms
        var scaffoldAtoms = [];
        var workoutAtoms = {};
        var conditionAtoms = {};
        var mapAtom = null;
        var checkinAtom = null;
        var diceAtom = null;

        atoms.forEach(function (a) {
            if (a.type === 'encounter-scaffold') scaffoldAtoms.push(a);
            else if (a.type === 'workout-session') workoutAtoms[a.session] = a;
            else if (a.type === 'condition-check') {
                if (!conditionAtoms[a.session]) conditionAtoms[a.session] = [];
                conditionAtoms[a.session].push(a);
            }
            else if (a.type === 'facility-grid' || a.type === 'point-to-point' || a.type === 'linear-track') mapAtom = a;
            else if (a.type === 'week-checkin') checkinAtom = a;
            else if (a.type === 'dice-table') diceAtom = a;
        });

        // Determine visual weight
        var weekVisualWeight = 'standard';
        var weightMap = { 'sparse': 0, 'standard': 1, 'dense': 2, 'crisis': 3 };
        scaffoldAtoms.forEach(function (a) {
            var w = (a.content && a.content.visualWeight) || 'standard';
            if ((weightMap[w] || 0) > (weightMap[weekVisualWeight] || 0)) weekVisualWeight = w;
        });

        // ── PAGE: Magazine layout ──
        pageNum++;
        pagesCreated++;
        var page = createPage('encounter-log');
        page.classList.add('encounter-log');
        page.dataset.week = week;
        page.dataset.visualWeight = weekVisualWeight;
        container.appendChild(page);

        // Classification
        var classText = (voice.classifications && voice.classifications.sessionLog) || 'WEEK {{week}}';
        var cls = document.createElement('div');
        cls.className = 'classification';
        cls.textContent = decodeEntities(classText.replace(/\{\{week\}\}/g, week));
        page.appendChild(cls);

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
            page.appendChild(progressDiv);
        }

        // Grid container
        var grid = document.createElement('div');
        grid.className = 'encounter-magazine-grid';

        // Left column: scaffolds + conditions
        var leftCol = document.createElement('div');
        leftCol.className = 'encounter-magazine-left';

        var refScheme = (data.story && data.story.refScheme) || { prefix: 'R', weekDigits: 1, sessionDigits: 1 };

        scaffoldAtoms.forEach(function (scaffAtom) {
            var day = scaffAtom.session;
            var sessionDiv = document.createElement('div');
            sessionDiv.className = 'session-block';
            if (scaffAtom.content.special === 'boss') sessionDiv.classList.add('session-boss');
            if (scaffAtom.content.special === 'rest') sessionDiv.classList.add('session-rest');
            if (scaffAtom.content.special === 'branch') sessionDiv.classList.add('session-branch');

            var scaffEl = AtomRenderers.render(scaffAtom, ctx);
            while (scaffEl.firstChild) sessionDiv.appendChild(scaffEl.firstChild);

            var conds = conditionAtoms[day] || [];
            conds.forEach(function (ca) {
                sessionDiv.appendChild(AtomRenderers.render(ca, ctx));
            });

            // REF code
            var refCode = refScheme.prefix +
                String(week).padStart(refScheme.weekDigits || 1, '0') +
                String(day).padStart(refScheme.sessionDigits || 1, '0');
            var refDiv = document.createElement('div');
            refDiv.className = 'session-ref';
            var refLabel = (voice.labels && voice.labels.sessionRef) || 'REF {{ref}}';
            refDiv.textContent = refLabel.replace(/\{\{ref\}\}/g, refCode);
            sessionDiv.appendChild(refDiv);

            leftCol.appendChild(sessionDiv);
        });

        // Right column: workout logs
        var rightCol = document.createElement('div');
        rightCol.className = 'encounter-magazine-right';

        scaffoldAtoms.forEach(function (scaffAtom) {
            var day = scaffAtom.session;
            var wkAtom = workoutAtoms[day];
            if (wkAtom) {
                var wkEl = AtomRenderers.render(wkAtom, ctx);
                rightCol.appendChild(wkEl);
            }
        });

        grid.appendChild(leftCol);
        grid.appendChild(rightCol);

        // Footer: map + checkin
        var footer = document.createElement('div');
        footer.className = 'encounter-magazine-footer';
        if (mapAtom) footer.appendChild(AtomRenderers.render(mapAtom, ctx));
        if (checkinAtom) footer.appendChild(AtomRenderers.render(checkinAtom, ctx));
        if (footer.children.length) grid.appendChild(footer);

        page.appendChild(grid);

        // Overflow: if either column overflows, move last session-block pair to new page
        while (page.scrollHeight > page.clientHeight) {
            var leftBlocks = leftCol.querySelectorAll('.session-block');
            var rightItems = rightCol.children;
            if (leftBlocks.length <= 1 && rightItems.length <= 1) {
                console.warn('CONTENT OVERFLOW: Magazine layout — single session exceeds page.');
                break;
            }

            // Move last session-block from left and corresponding workout from right
            var lastLeft = leftBlocks[leftBlocks.length - 1];
            leftCol.removeChild(lastLeft);
            var lastRight = rightItems.length > 0 ? rightItems[rightItems.length - 1] : null;
            if (lastRight) rightCol.removeChild(lastRight);

            // Create continuation page
            pageNum++;
            pagesCreated++;
            var contPage = createPage('encounter-log');
            contPage.classList.add('encounter-log');
            contPage.dataset.week = week;
            contPage.dataset.visualWeight = weekVisualWeight;
            container.appendChild(contPage);

            var contGrid = document.createElement('div');
            contGrid.className = 'encounter-magazine-grid';
            var contLeft = document.createElement('div');
            contLeft.className = 'encounter-magazine-left';
            contLeft.appendChild(lastLeft);
            var contRight = document.createElement('div');
            contRight.className = 'encounter-magazine-right';
            if (lastRight) contRight.appendChild(lastRight);
            contGrid.appendChild(contLeft);
            contGrid.appendChild(contRight);
            contPage.appendChild(contGrid);

            // Replace current page/grid references for next iteration
            page = contPage;
            grid = contGrid;
            leftCol = contLeft;
            rightCol = contRight;
        }

        addPageNumber(page, pageNum);
        return pagesCreated;
    }
});

// ══════════════════════════════════════════════════════════════
//  TRACKER TEMPLATE: GRID (2-column responsive grid)
// ══════════════════════════════════════════════════════════════

LayoutTemplates.register({
    id: 'tracker-grid',
    groupType: 'tracker-sheet',
    score: function (atoms) {
        // Prefer grid when 4+ sections exist
        var sectionCount = 0;
        atoms.forEach(function (a) {
            if (a.type === 'clock-display' || a.type === 'track-display' ||
                a.type === 'resource-display' || a.type === 'modifier-display') sectionCount++;
        });
        if (sectionCount >= 4) return 0.9;
        if (sectionCount >= 3) return 0.7;
        return 0.3;
    },
    estimate: function (atoms, measurements, ctx) {
        var ph = measurements.pageHeight;
        var pw = GovernorMeasure.getContentWidth();
        var colW = Math.floor(pw / 2);
        var overhead = 60;  // h1 heading

        // Measure atoms at half-width
        var heights = [];
        for (var i = 0; i < atoms.length; i++) {
            heights.push(GovernorMeasure.measure(atoms[i], ctx, colW));
        }

        // Pair heights into rows (2 per row, take max)
        var rowHeights = [];
        for (var j = 0; j < heights.length; j += 2) {
            var h1 = heights[j];
            var h2 = (j + 1 < heights.length) ? heights[j + 1] : 0;
            rowHeights.push(Math.max(h1, h2));
        }

        var fillRatios = GovernorScore.computeFillRatios(rowHeights, ph, overhead);
        return {
            templateId: 'tracker-grid',
            pages: fillRatios.length,
            fillRatios: fillRatios,
            confidence: 0.65,
            multiSlot: true
        };
    },
    renderPages: function (container, atoms, ctx) {
        var data = ctx.data;
        var voice = data.voice || {};
        var mech = data.mechanics || {};
        var pageNum = { value: ctx.startPage };
        var pagesCreated = 0;

        pageNum.value++;
        pagesCreated++;
        var page = createPage('tracker-sheet');
        page.classList.add('tracker-sheet');
        container.appendChild(page);

        // Heading
        var h1 = document.createElement('h1');
        h1.textContent = decodeEntities((voice.labels && voice.labels.mechanicsHeading) || 'CHARACTER DOSSIER');
        page.appendChild(h1);

        // Group atoms by type into sections (same as tracker-vertical)
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

        // Build sections
        var sections = [];

        function buildSection(heading, sectionAtoms) {
            if (!sectionAtoms.length) return;
            var div = document.createElement('div');
            div.className = 'tracker-section';
            var h2 = document.createElement('h2');
            h2.textContent = decodeEntities(heading);
            div.appendChild(h2);
            sectionAtoms.forEach(function (a) {
                var el = AtomRenderers.render(a, ctx);
                while (el.firstChild) div.appendChild(el.firstChild);
            });
            sections.push(div);
        }

        buildSection((voice.labels && voice.labels.clocksHeading) || 'CLOCKS', clockAtoms);
        buildSection('TRACKS', trackAtoms);
        buildSection((voice.labels && voice.labels.resourceHeading) || 'RESOURCES', resourceAtoms);
        buildSection('MODIFIERS', modifierAtoms);

        // Codewords (from ctx.data.mechanics, not atoms)
        if (mech.codewords && mech.codewords.length) {
            var cwDiv = document.createElement('div');
            cwDiv.className = 'tracker-section';
            var cwH = document.createElement('h2');
            cwH.textContent = 'CODEWORDS';
            cwDiv.appendChild(cwH);
            mech.codewords.forEach(function (cw) {
                var row = document.createElement('div');
                row.className = 'tracker-row codeword-row';
                var nameLine = document.createElement('div');
                nameLine.className = 'codeword-name';
                nameLine.innerHTML = '\u25A1 <strong>' + escapeHtml(cw.id) + '</strong>';
                row.appendChild(nameLine);
                if (cw.effect) {
                    var effectLine = document.createElement('div');
                    effectLine.className = 'codeword-effect';
                    effectLine.textContent = decodeEntities(cw.effect);
                    row.appendChild(effectLine);
                }
                cwDiv.appendChild(row);
            });
            sections.push(cwDiv);
        }

        // Dice stat section
        if (mech.dice && mech.dice.stat) {
            var diceDiv = document.createElement('div');
            diceDiv.className = 'tracker-section';
            var diceH = document.createElement('h2');
            diceH.textContent = decodeEntities(mech.dice.stat.toUpperCase());
            diceDiv.appendChild(diceH);
            var diceRow = document.createElement('div');
            diceRow.className = 'tracker-row dice-stat-row';
            diceRow.innerHTML = '<div class="dice-stat-box">' + escapeHtml(mech.dice.stat) +
                ': <span class="dice-stat-value">____</span></div>';
            diceDiv.appendChild(diceRow);
            sections.push(diceDiv);
        }

        // Place sections in grid
        var gridDiv = document.createElement('div');
        gridDiv.className = 'tracker-grid-layout';
        sections.forEach(function (s) { gridDiv.appendChild(s); });
        page.appendChild(gridDiv);

        // Trigger labels (outside grid, at bottom)
        if (triggerAtoms.length) {
            triggerAtoms.forEach(function (ta) {
                page.appendChild(AtomRenderers.render(ta, ctx));
            });
        }

        // Overflow: redistribute sections across pages
        var pages = [page];
        var currentIdx = 0;
        while (pages[currentIdx].scrollHeight > pages[currentIdx].clientHeight) {
            var gridEl = pages[currentIdx].querySelector('.tracker-grid-layout');
            var gridChildren = gridEl ? gridEl.querySelectorAll('.tracker-section') : [];
            if (gridChildren.length <= 1) {
                console.warn('CONTENT OVERFLOW: Single tracker section exceeds page.');
                break;
            }
            var lastSection = gridChildren[gridChildren.length - 1];
            gridEl.removeChild(lastSection);

            if (pages.length <= currentIdx + 1) {
                var newPage = createPage('tracker-sheet');
                newPage.classList.add('tracker-sheet');
                container.appendChild(newPage);
                var newGrid = document.createElement('div');
                newGrid.className = 'tracker-grid-layout';
                newPage.appendChild(newGrid);
                pages.push(newPage);
                pagesCreated++;
            }
            var targetGrid = pages[currentIdx + 1].querySelector('.tracker-grid-layout');
            targetGrid.insertBefore(lastSection, targetGrid.firstChild);
            if (pages[currentIdx].scrollHeight <= pages[currentIdx].clientHeight) currentIdx++;
        }

        pages.forEach(function (p, idx) {
            addPageNumber(p, pageNum.value + idx);
        });
        return pagesCreated;
    }
});

// ══════════════════════════════════════════════════════════════
//  ARCHIVE TEMPLATE: GAZETTE (2-column found documents)
// ══════════════════════════════════════════════════════════════

LayoutTemplates.register({
    id: 'archive-gazette',
    groupType: 'archive',
    score: function (atoms) {
        // Prefer gazette for 3+ documents
        var docCount = 0;
        atoms.forEach(function (a) {
            if (a.type !== 'classification-badge') docCount++;
        });
        if (docCount >= 3) return 0.85;
        return 0.3;
    },
    estimate: function (atoms, measurements, ctx) {
        var ph = measurements.pageHeight;
        var pw = GovernorMeasure.getContentWidth();
        var colW = Math.floor(pw / 2);
        var overhead = 100;  // trigger + classification + title + intro

        // Measure documents at half-width
        var heights = [];
        for (var i = 0; i < measurements.measurements.length; i++) {
            if (measurements.measurements[i].atom.type !== 'classification-badge') {
                heights.push(GovernorMeasure.measure(measurements.measurements[i].atom, ctx, colW));
            }
        }

        // CSS columns: total height = sum / 2 (balanced between columns)
        var totalH = 0;
        for (var j = 0; j < heights.length; j++) totalH += heights[j];
        var balancedH = totalH / 2;
        var available = ph - overhead;
        var pages = Math.ceil(balancedH / available) || 1;

        var fillRatios = [];
        for (var p = 0; p < pages; p++) {
            var pageFill = Math.min(balancedH - (p * available), available);
            fillRatios.push(Math.min((pageFill + overhead) / ph, 1.0));
        }

        return {
            templateId: 'archive-gazette',
            pages: pages,
            fillRatios: fillRatios,
            confidence: 0.6,
            multiSlot: true
        };
    },
    renderPages: function (container, atoms, ctx) {
        var data = ctx.data;
        var sectionKey = ctx.sectionKey;
        var pageNum = { value: ctx.startPage };
        var pagesCreated = 0;
        var plan = window._layoutPlan || null;
        var bpState = { lastAtom: null, lastEl: null };

        var page = createPage('archive');
        page.classList.add('archive-page');
        page.setAttribute('data-archive-section', sectionKey);
        container.appendChild(page);
        pageNum.value++;
        pagesCreated++;

        // Find badge and document atoms
        var badgeAtom = null;
        var docAtoms = [];
        atoms.forEach(function (a) {
            if (a.type === 'classification-badge') badgeAtom = a;
            else docAtoms.push(a);
        });

        // Trigger label
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

        if (docAtoms.length === 0) {
            var err = document.createElement('div');
            err.className = 'archive-node archive-error';
            err.textContent = '[ERROR: MISSING ARCHIVE SECTION: ' + sectionKey + ']';
            page.appendChild(err);
            addPageNumber(page, pageNum.value);
            return pagesCreated;
        }

        // Gazette columns container
        var colContainer = document.createElement('div');
        colContainer.className = 'archive-gazette-columns';

        docAtoms.forEach(function (da) {
            var el = AtomRenderers.render(da, ctx);
            colContainer.appendChild(el);
        });

        page.appendChild(colContainer);

        // Overflow: collect excess docs, then distribute across new pages.
        var spilledDocs = [];
        while (isColumnPageOverflowing(page, colContainer)) {
            var docs = colContainer.querySelectorAll('.archive-node');
            if (docs.length <= 1) {
                console.warn('CONTENT OVERFLOW: Single archive document exceeds page.');
                break;
            }
            var lastDoc = docs[docs.length - 1];
            colContainer.removeChild(lastDoc);
            spilledDocs.unshift(lastDoc);
        }

        if (spilledDocs.length > 0) {
            addPageNumber(page, pageNum.value);
            pageNum.value++;
            pagesCreated++;
            page = createPage('archive');
            page.classList.add('archive-page');
            container.appendChild(page);
            colContainer = document.createElement('div');
            colContainer.className = 'archive-gazette-columns';
            page.appendChild(colContainer);

            for (var di = 0; di < spilledDocs.length; di++) {
                colContainer.appendChild(spilledDocs[di]);
                if (isColumnPageOverflowing(page, colContainer)) {
                    colContainer.removeChild(spilledDocs[di]);
                    addPageNumber(page, pageNum.value);
                    pageNum.value++;
                    pagesCreated++;
                    page = createPage('archive');
                    page.classList.add('archive-page');
                    container.appendChild(page);
                    colContainer = document.createElement('div');
                    colContainer.className = 'archive-gazette-columns';
                    page.appendChild(colContainer);
                    colContainer.appendChild(spilledDocs[di]);
                }
            }
        }

        addPageNumber(page, pageNum.value);
        return pagesCreated;
    }
});

// ══════════════════════════════════════════════════════════════
//  REF TEMPLATE: GAZETTE (2-column compact REF layout)
// ══════════════════════════════════════════════════════════════

LayoutTemplates.register({
    id: 'ref-gazette',
    groupType: 'ref-pages',
    score: function (atoms) {
        // Prefer gazette when many routers with few outcomes each (compact content)
        var routerCount = 0;
        var outcomeCount = 0;
        atoms.forEach(function (a) {
            if (a.type === 'ref-router') routerCount++;
            else if (a.type === 'ref-outcome') outcomeCount++;
        });
        var avgOutcomes = routerCount > 0 ? outcomeCount / routerCount : 99;
        if (avgOutcomes <= 4 && routerCount >= 2) return 0.8;
        return 0.3;
    },
    estimate: function (atoms, measurements, ctx) {
        var ph = measurements.pageHeight;
        var pw = GovernorMeasure.getContentWidth();
        var colW = Math.floor(pw / 2);
        var overhead = 60;  // classification

        // Measure at half-width
        var heights = [];
        for (var i = 0; i < measurements.measurements.length; i++) {
            heights.push(GovernorMeasure.measure(measurements.measurements[i].atom, ctx, colW));
        }

        var totalH = 0;
        for (var j = 0; j < heights.length; j++) totalH += heights[j];
        var balancedH = totalH / 2;
        var available = ph - overhead;
        var pages = Math.ceil(balancedH / available) || 1;

        var fillRatios = [];
        for (var p = 0; p < pages; p++) {
            var pageFill = Math.min(balancedH - (p * available), available);
            fillRatios.push(Math.min((pageFill + overhead) / ph, 1.0));
        }

        return {
            templateId: 'ref-gazette',
            pages: pages,
            fillRatios: fillRatios,
            confidence: 0.6,
            multiSlot: true
        };
    },
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

        function newPage() {
            var p = createPage('ref');
            p.classList.add('ref-page');
            container.appendChild(p);
            pageNum.value++;
            pagesCreated++;
            return p;
        }

        var page = newPage();

        // Classification
        var classText = (voice.classifications && voice.classifications.refs) || 'ROUTE CODES // WEEK {{week}}';
        var cls = document.createElement('div');
        cls.className = 'classification';
        cls.textContent = decodeEntities(classText.replace(/\{\{week\}\}/g, week));
        page.appendChild(cls);

        // Routers section (full-width, above columns)
        var routerSection = document.createElement('div');
        routerSection.className = 'ref-router-section';
        routerAtoms.forEach(function (ra) {
            routerSection.appendChild(AtomRenderers.render(ra, ctx));
        });
        page.appendChild(routerSection);

        // Zone divider
        var divider = document.createElement('hr');
        divider.className = 'ref-zone-divider';
        page.appendChild(divider);

        // Build scrambled entries
        var allBranches = [];
        outcomeAtoms.forEach(function (oa) {
            allBranches.push({
                atom: oa,
                branchId: oa.content.refCode,
                refCode: oa.content.refCode.replace(/[A-Za-z]+$/, ''),
                outcome: { name: oa.content.outcomeName, range: oa.content.range }
            });
        });
        var scrambled = scrambleBranches(allBranches, routerAtoms.length, outcomes.length);

        // 2-column container for outcomes
        var colContainer = document.createElement('div');
        colContainer.className = 'ref-gazette-columns';

        scrambled.forEach(function (entry, idx) {
            var el = AtomRenderers.render(entry.atom, ctx);
            if (idx < scrambled.length - 1) {
                var sep = document.createElement('hr');
                sep.className = 'ref-separator';
                el.appendChild(sep);
            }
            colContainer.appendChild(el);
        });

        page.appendChild(colContainer);

        // Overflow: collect excess entries, then distribute across new pages.
        // Must drain the CURRENT page fully before moving to new pages,
        // since reassigning `page` would skip re-checking the original.
        var spilledEntries = [];
        while (isColumnPageOverflowing(page, colContainer)) {
            var entries = colContainer.children;
            if (entries.length <= 1) {
                console.warn('CONTENT OVERFLOW: Single REF entry exceeds page.');
                break;
            }
            var lastEntry = entries[entries.length - 1];
            colContainer.removeChild(lastEntry);
            spilledEntries.unshift(lastEntry);  // maintain order
        }

        // Distribute spilled entries across continuation pages
        if (spilledEntries.length > 0) {
            addPageNumber(page, pageNum.value);
            page = newPage();
            colContainer = document.createElement('div');
            colContainer.className = 'ref-gazette-columns';
            page.appendChild(colContainer);

            for (var si = 0; si < spilledEntries.length; si++) {
                colContainer.appendChild(spilledEntries[si]);
                if (isColumnPageOverflowing(page, colContainer)) {
                    colContainer.removeChild(spilledEntries[si]);
                    addPageNumber(page, pageNum.value);
                    page = newPage();
                    colContainer = document.createElement('div');
                    colContainer.className = 'ref-gazette-columns';
                    page.appendChild(colContainer);
                    colContainer.appendChild(spilledEntries[si]);
                }
            }
        }

        addPageNumber(page, pageNum.value);
        return pagesCreated;
    }
});

// ══════════════════════════════════════════════════════════════
//  QUOTE PAGE TEMPLATE
// ══════════════════════════════════════════════════════════════

LayoutTemplates.register({
    id: 'quote-page-standard',
    groupType: 'quote-page',
    score: function () { return 1; },
    estimate: function (atoms, measurements, ctx) {
        return { templateId: 'quote-page-standard', pages: 1, fillRatios: [0.4], confidence: 0.9 };
    },
    renderPages: function (container, atoms, ctx) {
        var page = createPage('quote-page');
        page.classList.add('structural-quote-layout');
        container.appendChild(page);

        if (atoms[0]) {
            var el = AtomRenderers.render(atoms[0], ctx);
            page.appendChild(el);
        }

        addPageNumber(page, ctx.startPage);
        return 1;
    }
});

// ══════════════════════════════════════════════════════════════
//  PACING BREATH TEMPLATE
// ══════════════════════════════════════════════════════════════

LayoutTemplates.register({
    id: 'pacing-breath-standard',
    groupType: 'pacing-breath',
    score: function () { return 1; },
    estimate: function (atoms, measurements, ctx) {
        return { templateId: 'pacing-breath-standard', pages: 1, fillRatios: [0.15], confidence: 0.9 };
    },
    renderPages: function (container, atoms, ctx) {
        var page = createPage('pacing-breath');
        page.classList.add('structural-breath-layout');
        container.appendChild(page);

        if (atoms[0]) {
            var el = AtomRenderers.render(atoms[0], ctx);
            page.appendChild(el);
        }

        addPageNumber(page, ctx.startPage);
        return 1;
    }
});

// ── Expose ───────────────────────────────────────────────────

window.LayoutTemplates = LayoutTemplates;
window.appendWithBreakPolicy = appendWithBreakPolicy;
window.isColumnPageOverflowing = isColumnPageOverflowing;
