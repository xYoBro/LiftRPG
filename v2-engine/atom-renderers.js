// ── Atom Renderers: Typed DOM Fragment Producers ──────────────
//
// Each atom type gets a render function that returns a DOM element
// (not appended to any container). Templates compose these fragments
// into pages. The governor orchestrates the pipeline.
//
// Phase 2 of the Layout Governor v3.0 architecture.
//
// Depends on: render-utils.js (escapeHtml, sanitizeHtml, sanitizeSvg,
//             decodeEntities), render-primitives.js (renderClock, etc.),
//             render-encounters.js (map renderers), render-narrative.js
//             (renderArchiveNode)
//
// Exposed: window.AtomRenderers

var AtomRenderers = {};

/**
 * Dispatch: render any atom by type.
 * @param {Atom} atom
 * @param {Object} ctx  { data: finalPayload }
 * @returns {HTMLElement}
 */
AtomRenderers.render = function (atom, ctx) {
    var fn = AtomRenderers[atom.type];
    if (!fn) {
        console.warn('[atom-renderers] No renderer for atom type:', atom.type);
        var stub = document.createElement('div');
        stub.className = 'atom-unknown';
        stub.textContent = '[UNKNOWN ATOM: ' + atom.type + ']';
        return stub;
    }
    return fn(atom, ctx);
};

// ── Encounter Atoms ──────────────────────────────────────────

/**
 * Encounter scaffold: title row + narrative + boss/branch/rest + marginalia.
 * Does NOT include workout table or REF code — those are separate atoms.
 */
AtomRenderers['encounter-scaffold'] = function (atom, ctx) {
    var c = atom.content;
    var voice = (ctx.data && ctx.data.voice) || {};

    var div = document.createElement('div');
    div.className = 'session-scaffold';

    // Session title row
    var titleRow = document.createElement('div');
    titleRow.className = 'session-title-row';
    var dayLabel = decodeEntities(
        (voice.weekPage && voice.weekPage.sessions && voice.weekPage.sessions[c.day]) ||
        ('SESSION ' + c.day)
    );
    titleRow.innerHTML = '<span class="session-day">' + escapeHtml(dayLabel) + '</span>' +
        '<span class="encounter-title">' + escapeHtml(c.title || '') + '</span>';
    div.appendChild(titleRow);

    // Narrative
    if (c.narrative) {
        var narr = document.createElement('div');
        narr.className = 'encounter-narrative';
        narr.innerHTML = sanitizeHtml(c.narrative);
        div.appendChild(narr);
    }

    // Boss encounter
    if (c.special === 'boss' && c.bossRules) {
        var bossBox = document.createElement('div');
        bossBox.className = 'boss-rules-box';
        if (c.bossRules.title) {
            var bt = document.createElement('div');
            bt.className = 'boss-rules-title';
            bt.textContent = decodeEntities(c.bossRules.title);
            bossBox.appendChild(bt);
        }
        if (c.bossRules.preamble) {
            var bp = document.createElement('div');
            bp.className = 'boss-rules-preamble';
            bp.textContent = decodeEntities(c.bossRules.preamble);
            bossBox.appendChild(bp);
        }
        if (c.bossRules.steps && c.bossRules.steps.length) {
            var ol = document.createElement('ol');
            ol.className = 'boss-rules-steps';
            c.bossRules.steps.forEach(function (step) {
                var li = document.createElement('li');
                li.textContent = decodeEntities(step);
                ol.appendChild(li);
            });
            bossBox.appendChild(ol);
        }
        if (c.bossRules.stakes) {
            var bs = document.createElement('div');
            bs.className = 'boss-rules-stakes';
            bs.textContent = decodeEntities(c.bossRules.stakes);
            bossBox.appendChild(bs);
        }
        div.appendChild(bossBox);
    }

    // Branch encounter — player choice options
    if (c.special === 'branch' && c.options && c.options.length) {
        var choiceBox = document.createElement('div');
        choiceBox.className = 'branch-choice-box';
        c.options.forEach(function (opt) {
            var line = document.createElement('div');
            line.className = 'branch-choice';
            var lbl = document.createElement('span');
            lbl.className = 'branch-choice-label';
            lbl.textContent = decodeEntities(opt.label || '');
            line.appendChild(lbl);
            if (opt.ref) {
                var r = document.createElement('span');
                r.className = 'branch-choice-ref';
                r.textContent = opt.ref;
                line.appendChild(r);
            }
            if (opt.cost) {
                var co = document.createElement('span');
                co.className = 'branch-choice-cost';
                co.textContent = decodeEntities(opt.cost);
                line.appendChild(co);
            }
            choiceBox.appendChild(line);
        });
        div.appendChild(choiceBox);
    }

    // Marginalia
    if (c.marginalia) {
        var marg = document.createElement('div');
        marg.className = 'encounter-marginalia';
        marg.textContent = decodeEntities(c.marginalia);
        div.appendChild(marg);
    }

    return div;
};

/**
 * Workout session: header bar + exercise log table.
 * The header bar is the primary visual landmark — a bold inverted strip
 * that makes every workout instantly findable when flipping through pages.
 */
AtomRenderers['workout-session'] = function (atom, ctx) {
    var c = atom.content;
    var voice = (ctx.data && ctx.data.voice) || {};
    var workout = (ctx.data && ctx.data.workout) || {};
    var sType = c.sessionType;

    var div = document.createElement('div');
    div.className = 'workout-session-atom';

    if (!sType || !sType.exercises) return div;

    var intensity = (c.weekIntensity != null) ? String(c.weekIntensity) : '';
    var weekNum = atom.week || '';

    // ── Header bar: the at-a-glance landmark ──
    var header = document.createElement('div');
    header.className = 'workout-log-header';
    var headerLeft = document.createElement('span');
    headerLeft.className = 'workout-log-header-name';
    headerLeft.textContent = decodeEntities(sType.name || 'WORKOUT');
    header.appendChild(headerLeft);
    if (weekNum || intensity) {
        var headerRight = document.createElement('span');
        headerRight.className = 'workout-log-header-meta';
        var metaParts = [];
        if (weekNum) metaParts.push('WEEK ' + weekNum);
        if (intensity) metaParts.push(decodeEntities(intensity) +
            (c.intensityUnit ? ' ' + decodeEntities(c.intensityUnit) : ''));
        headerRight.textContent = metaParts.join(' \u00B7 ');
        header.appendChild(headerRight);
    }
    div.appendChild(header);

    // ── Exercise log table ──
    var table = document.createElement('table');
    table.className = 'workout-log-table';
    var thead = document.createElement('thead');
    var hr = document.createElement('tr');
    var th1 = document.createElement('th');
    th1.textContent = decodeEntities((voice.labels && voice.labels.liftColumn) || 'LIFT');
    hr.appendChild(th1);
    var th2 = document.createElement('th');
    th2.textContent = decodeEntities((voice.labels && voice.labels.weightColumn) || c.weightColumnLabel || 'WEIGHT');
    hr.appendChild(th2);
    var th3 = document.createElement('th');
    th3.textContent = 'SETS';
    hr.appendChild(th3);
    thead.appendChild(hr);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    sType.exercises.forEach(function (ex) {
        var tr = document.createElement('tr');
        var tdName = document.createElement('td');
        tdName.className = 'workout-log-name';
        var repsStr = String(ex.reps);
        if (repsStr.length > 20) repsStr = repsStr.substring(0, 15) + '...';
        tdName.textContent = decodeEntities(ex.name) + ' (' + repsStr + ')';
        tr.appendChild(tdName);

        var tdWeight = document.createElement('td');
        tdWeight.className = 'setup-input-cell';
        if (intensity) {
            var hint = document.createElement('span');
            hint.className = 'burden-hint';
            hint.textContent = intensity + (c.intensityUnit ? ' ' + c.intensityUnit : '');
            tdWeight.appendChild(hint);
        }
        tr.appendChild(tdWeight);

        var tdSets = document.createElement('td');
        tdSets.className = 'workout-log-sets';
        var setC = document.createElement('div');
        setC.className = 'workout-log-set-container';
        for (var s = 0; s < (ex.sets || 1); s++) {
            var box = document.createElement('div');
            box.className = 'workout-log-box';
            setC.appendChild(box);
        }
        tdSets.appendChild(setC);
        tr.appendChild(tdSets);
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    div.appendChild(table);

    return div;
};

/**
 * Conditional instruction.
 */
AtomRenderers['condition-check'] = function (atom, ctx) {
    var c = atom.content;
    var div = document.createElement('div');
    div.className = 'conditional-instruction conditional-' + (c.style || 'default');
    div.textContent = decodeEntities(c.instruction || '');
    return div;
};

/**
 * Week-end check-in.
 */
AtomRenderers['week-checkin'] = function (atom, ctx) {
    var c = atom.content;
    var div = document.createElement('div');
    div.className = 'week-checkin';
    var h = document.createElement('div');
    h.className = 'week-checkin-label';
    h.textContent = c.label || 'WEEK-END CHECK-IN';
    div.appendChild(h);
    (c.questions || []).forEach(function (q) {
        var line = document.createElement('div');
        line.className = 'checkin-line';
        line.textContent = decodeEntities(q);
        div.appendChild(line);
    });
    return div;
};

// ── Mechanic Atoms ───────────────────────────────────────────

/**
 * Clock display: label + SVG pie-wedge + trigger text + flavor.
 */
AtomRenderers['clock-display'] = function (atom, ctx) {
    var c = atom.content;
    var div = document.createElement('div');
    div.className = 'tracker-clock-atom';

    var row = document.createElement('div');
    row.className = 'tracker-row';
    var label = document.createElement('span');
    label.className = 'tracker-label';
    label.textContent = decodeEntities(c.name);
    row.appendChild(label);
    var dir = document.createElement('span');
    dir.className = 'tracker-info';
    dir.textContent = c.direction === 'drain' ? 'DRAIN' : 'FILL';
    row.appendChild(dir);
    div.appendChild(row);

    div.appendChild(renderClock({ size: c.size || 6 }));

    // Trigger instruction
    var trigText = c.direction === 'drain' ? 'When empty' : 'When full';
    if (c.onTrigger && c.onTrigger.action === 'read-archive' && c.onTrigger.section) {
        trigText += ' \u2192 read next ' + c.onTrigger.section.replace(/-/g, ' ').toUpperCase();
    }
    if (c.clearOnTrigger) {
        trigText += ', then refill ' + c.clearOnTrigger;
    }
    var trig = document.createElement('div');
    trig.className = 'tracker-trigger';
    trig.textContent = decodeEntities(trigText);
    div.appendChild(trig);

    if (c.flavor) {
        var flav = document.createElement('div');
        flav.className = 'tracker-flavor';
        flav.textContent = decodeEntities(c.flavor);
        div.appendChild(flav);
    }

    return div;
};

/**
 * Archive trigger: label for what unlocks an archive section.
 */
AtomRenderers['archive-trigger'] = function (atom, ctx) {
    var c = atom.content;
    var div = document.createElement('div');
    div.className = 'archive-trigger-label';
    var verb = 'fills';
    // Look up the clock direction
    var clocks = (ctx.data && ctx.data.mechanics && ctx.data.mechanics.clocks) || [];
    for (var i = 0; i < clocks.length; i++) {
        if (clocks[i].name === c.clockName) {
            verb = clocks[i].direction === 'drain' ? 'empties' : 'fills';
            break;
        }
    }
    div.textContent = 'Read when ' + decodeEntities(c.clockName) + ' ' + verb;
    return div;
};

/**
 * Track display: label + visualization by type + flavor.
 */
AtomRenderers['track-display'] = function (atom, ctx) {
    var c = atom.content;
    var div = document.createElement('div');
    div.className = 'tracker-track-atom';

    var row = document.createElement('div');
    row.className = 'tracker-row';
    var label = document.createElement('span');
    label.className = 'tracker-label';
    label.textContent = decodeEntities(c.name) + ' (' + c.type + ')';
    row.appendChild(label);
    div.appendChild(row);

    if (c.type === 'tug') {
        div.appendChild(renderTugOfWar({ size: c.size || 5, thresholds: c.thresholds }));
    } else if (c.type === 'heat') {
        div.appendChild(renderHeatTrack({ size: c.size || 10, startValue: c.startValue, thresholds: c.thresholds }));
    } else if (c.type === 'faction') {
        div.appendChild(renderFactionTrack({ size: c.size || 10, labels: [], standings: c.standings }));
    } else if (c.type === 'skill-tree') {
        div.appendChild(renderSkillTree({ nodes: c.nodes || [] }));
    } else {
        div.appendChild(renderProgressTrack({ size: c.size || 10, startValue: c.startValue, thresholds: c.thresholds }));
    }

    if (c.flavor) {
        var flav = document.createElement('div');
        flav.className = 'tracker-flavor';
        flav.textContent = decodeEntities(c.flavor);
        div.appendChild(flav);
    }

    return div;
};

/**
 * Resource display: name + earn/spend rules + progress boxes.
 */
AtomRenderers['resource-display'] = function (atom, ctx) {
    var c = atom.content;
    var div = document.createElement('div');
    div.className = 'tracker-resource-atom';

    var row = document.createElement('div');
    row.className = 'tracker-row resource-row';
    row.innerHTML = '<strong>' + escapeHtml(c.name) + '</strong> &mdash; ' +
        'Earn: ' + escapeHtml(c.earnRule) + ' | Spend: ' + escapeHtml(c.spendEffect) +
        (c.reset ? ' | Reset: ' + escapeHtml(c.reset) : '');
    div.appendChild(row);

    div.appendChild(renderProgressTrack({
        size: c.trackSize || c.maxValue || 10,
        startValue: c.startValue,
        thresholds: c.thresholds
    }));

    return div;
};

/**
 * Modifier display.
 */
AtomRenderers['modifier-display'] = function (atom, ctx) {
    var c = atom.content;
    var div = document.createElement('div');
    div.className = 'tracker-row modifier-row';
    div.innerHTML = '<strong>' + escapeHtml(c.name || c.id || 'Modifier') + '</strong>';
    if (c.effect) {
        div.innerHTML += ' &mdash; ' + escapeHtml(c.effect);
    }
    return div;
};

/**
 * Dice resolution table (the table element itself, not the HUD wrapper).
 */
AtomRenderers['dice-table'] = function (atom, ctx) {
    var c = atom.content;
    var voice = (ctx.data && ctx.data.voice) || {};
    var outcomes = c.outcomes || [];

    var table = document.createElement('table');
    table.className = 'dice-table';

    var thead = document.createElement('thead');
    var hr = document.createElement('tr');
    ['RANGE', 'OUTCOME', 'REF', 'EFFECT'].forEach(function (h) {
        var th = document.createElement('th');
        th.textContent = h;
        hr.appendChild(th);
    });
    thead.appendChild(hr);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    outcomes.forEach(function (o) {
        var tr = document.createElement('tr');
        var tdRange = document.createElement('td');
        tdRange.textContent = (Array.isArray(o.range) && o.range.length >= 2)
            ? (o.range[0] + '-' + o.range[1]) : '?';
        tr.appendChild(tdRange);
        var tdName = document.createElement('td');
        tdName.textContent = decodeEntities(o.name);
        tr.appendChild(tdName);
        var tdSuffix = document.createElement('td');
        tdSuffix.textContent = o.suffix || '';
        tr.appendChild(tdSuffix);
        var tdTick = document.createElement('td');
        tdTick.textContent = decodeEntities(o.ticks || '');
        tr.appendChild(tdTick);
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    return table;
};

// ── Narrative Atoms ──────────────────────────────────────────

/**
 * REF router: the encounter-level router entry.
 */
AtomRenderers['ref-router'] = function (atom, ctx) {
    var c = atom.content;
    var div = document.createElement('div');
    div.className = 'ref-router';

    var header = document.createElement('div');
    header.className = 'ref-router-header';
    var idSpan = document.createElement('span');
    idSpan.className = 'ref-id';
    idSpan.textContent = c.refCode;
    header.appendChild(idSpan);

    // Look up encounter title
    var encounters = (ctx.data && ctx.data.story && ctx.data.story.encounters) || [];
    for (var i = 0; i < encounters.length; i++) {
        if (encounters[i].week === atom.week && encounters[i].day === atom.session) {
            if (encounters[i].title) {
                var titleSpan = document.createElement('span');
                titleSpan.className = 'ref-router-title';
                titleSpan.textContent = decodeEntities(encounters[i].title);
                header.appendChild(titleSpan);
            }
            break;
        }
    }
    div.appendChild(header);

    if (c.html) {
        var content = document.createElement('div');
        content.className = 'ref-content ref-type-' + (c.nodeType || 'kinetic');
        content.innerHTML = sanitizeHtml(c.html);
        div.appendChild(content);
    }

    return div;
};

/**
 * REF outcome: a single scrambled branch entry.
 */
AtomRenderers['ref-outcome'] = function (atom, ctx) {
    var c = atom.content;
    var div = document.createElement('div');
    div.className = 'ref-entry';

    var badge = document.createElement('span');
    badge.className = 'ref-entry-id';
    badge.textContent = c.refCode;
    div.appendChild(badge);

    // Outcome label with dice range
    if (c.outcomeName) {
        var label = document.createElement('span');
        label.className = 'ref-entry-label';
        var rangeText = (Array.isArray(c.range) && c.range.length >= 2)
            ? ' [' + c.range[0] + '\u2013' + c.range[1] + ']' : '';
        label.textContent = decodeEntities(c.outcomeName) + rangeText;
        div.appendChild(label);
    }

    if (c.html) {
        var content = document.createElement('div');
        content.className = 'ref-content ref-type-' + (c.nodeType || (c.outcomeName || 'unknown').toLowerCase());
        content.innerHTML = sanitizeHtml(c.html);
        div.appendChild(content);
    } else {
        var redacted = document.createElement('div');
        redacted.className = 'ref-content ref-redacted';
        redacted.textContent = '[FRAGMENT MISSING FROM RECORD]';
        div.appendChild(redacted);
    }

    return div;
};

// ── Archive / Found Document Atoms ───────────────────────────

/**
 * Classification badge: trigger label + classification + title + intro
 * for an archive section header.
 */
AtomRenderers['classification-badge'] = function (atom, ctx) {
    var c = atom.content;
    var voice = (ctx.data && ctx.data.voice) || {};
    var archiveVoice = voice.archive || {};

    var div = document.createElement('div');
    div.className = 'archive-header-atom';

    // Classification
    var classText = (c.classification && c.classification[c.sectionKey]) || c.sectionKey.toUpperCase();
    var cls = document.createElement('div');
    cls.className = 'classification';
    cls.textContent = decodeEntities(classText);
    div.appendChild(cls);

    // Title
    var h1 = document.createElement('h1');
    h1.textContent = decodeEntities(c.title || c.sectionKey.toUpperCase());
    div.appendChild(h1);

    // Intro
    if (c.intro) {
        var intro = document.createElement('div');
        intro.className = 'archive-intro';
        intro.innerHTML = sanitizeHtml(c.intro);
        div.appendChild(intro);
    }

    return div;
};

/**
 * Found document atom — delegates to renderArchiveNode for all 7 formats.
 * Used for: memo-document, journal-entry, transmission-log, letter-document,
 * news-clipping, incident-report, fragment-columns.
 */
function renderFoundDocumentAtom(atom, ctx) {
    var c = atom.content;
    if (typeof renderArchiveNode !== 'function') {
        var stub = document.createElement('div');
        stub.className = 'atom-unknown';
        stub.textContent = '[MISSING: renderArchiveNode not loaded]';
        return stub;
    }
    return renderArchiveNode(c.node, c.format, c.formatConfig || {});
}

AtomRenderers['memo-document'] = renderFoundDocumentAtom;
AtomRenderers['journal-entry'] = renderFoundDocumentAtom;
AtomRenderers['transmission-log'] = renderFoundDocumentAtom;
AtomRenderers['letter-document'] = renderFoundDocumentAtom;
AtomRenderers['news-clipping'] = renderFoundDocumentAtom;
AtomRenderers['incident-report'] = renderFoundDocumentAtom;
AtomRenderers['fragment-columns'] = renderFoundDocumentAtom;

// ── Structural Atoms ─────────────────────────────────────────

/**
 * Cover page content.
 */
AtomRenderers['cover'] = function (atom, ctx) {
    var c = atom.content;
    var meta = c.meta || {};
    var voice = c.voice || {};
    var art = c.art || {};

    var div = document.createElement('div');
    div.className = 'cover-content-atom';

    if (voice.classification) {
        var stamp = document.createElement('div');
        stamp.className = 'classification-stamp';
        stamp.textContent = decodeEntities(voice.classification);
        div.appendChild(stamp);
    }
    if (voice.department) {
        var dept = document.createElement('div');
        dept.className = 'cover-department';
        dept.textContent = decodeEntities(voice.department);
        div.appendChild(dept);
    }
    if (art.coverImage) {
        var imgWrap = document.createElement('div');
        imgWrap.className = 'cover-image';
        var img = document.createElement('img');
        img.src = art.coverImage;
        img.alt = meta.title || 'Cover art';
        imgWrap.appendChild(img);
        div.appendChild(imgWrap);
    } else if (art.coverSvg) {
        var artWrap = document.createElement('div');
        artWrap.className = 'cover-art';
        artWrap.innerHTML = sanitizeSvg(art.coverSvg);
        div.appendChild(artWrap);
    }

    var title = document.createElement('div');
    title.className = 'cover-title';
    title.textContent = decodeEntities(meta.title || 'UNTITLED ZINE');
    div.appendChild(title);

    if (voice.subjectLine) {
        var subj = document.createElement('div');
        subj.className = 'cover-subject';
        subj.textContent = decodeEntities(voice.subjectLine);
        div.appendChild(subj);
    }
    if (voice.tagline) {
        var tag = document.createElement('div');
        tag.className = 'cover-tagline';
        tag.textContent = decodeEntities(voice.tagline);
        div.appendChild(tag);
    }
    if (voice.intro) {
        var intro = document.createElement('div');
        intro.className = 'cover-intro';
        intro.innerHTML = sanitizeHtml(voice.intro);
        div.appendChild(intro);
    }

    var author = document.createElement('div');
    author.className = 'cover-author';
    author.textContent = decodeEntities(meta.author || 'Iron & Aether Engine v2');
    div.appendChild(author);

    return div;
};

/**
 * Rules manual section: heading + body.
 */
AtomRenderers['rules-manual-section'] = function (atom, ctx) {
    var c = atom.content;
    var div = document.createElement('div');
    div.className = 'manual-section';
    var heading = document.createElement('h2');
    heading.className = 'manual-heading';
    heading.textContent = decodeEntities(c.heading || '');
    div.appendChild(heading);
    var body = document.createElement('div');
    body.className = 'manual-body';
    body.innerHTML = sanitizeHtml(c.body || '');
    div.appendChild(body);
    return div;
};

/**
 * Setup block: title + instructions + weight table + progression note + note lines.
 */
AtomRenderers['setup-block'] = function (atom, ctx) {
    var c = atom.content;
    var workout = (ctx.data && ctx.data.workout) || {};

    var div = document.createElement('div');
    div.className = 'setup-content-atom';

    var h1 = document.createElement('h1');
    h1.textContent = decodeEntities(c.title || 'SETUP');
    div.appendChild(h1);

    if (c.instructions) {
        var instr = document.createElement('p');
        instr.className = 'setup-instructions';
        instr.textContent = decodeEntities(c.instructions);
        div.appendChild(instr);
    }

    if (c.fields && c.fields.length) {
        var table = document.createElement('table');
        table.className = 'setup-table';
        var thead = document.createElement('thead');
        var hrow = document.createElement('tr');
        var th1 = document.createElement('th');
        th1.textContent = 'LIFT';
        hrow.appendChild(th1);
        var th2 = document.createElement('th');
        th2.textContent = '1RM';
        hrow.appendChild(th2);
        var percents = (c.fields[0] && c.fields[0].calcPercents) || [];
        percents.forEach(function (p) {
            var th = document.createElement('th');
            th.textContent = p + '%';
            hrow.appendChild(th);
        });
        thead.appendChild(hrow);
        table.appendChild(thead);

        var tbody = document.createElement('tbody');
        c.fields.forEach(function (f) {
            var tr = document.createElement('tr');
            var tdLabel = document.createElement('td');
            tdLabel.textContent = decodeEntities(f.label);
            tr.appendChild(tdLabel);
            var tdRM = document.createElement('td');
            tdRM.className = 'setup-input-cell';
            tr.appendChild(tdRM);
            (f.calcPercents || []).forEach(function () {
                var td = document.createElement('td');
                td.className = 'setup-input-cell';
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        div.appendChild(table);
    }

    if (workout.progressionNote) {
        var note = document.createElement('div');
        note.className = 'setup-note';
        note.innerHTML = '<strong>PROGRESSION:</strong> ' + escapeHtml(workout.progressionNote);
        div.appendChild(note);
    }

    if (c.noteLines) {
        var notes = document.createElement('div');
        notes.className = 'setup-notes-area';
        for (var i = 0; i < c.noteLines; i++) {
            var line = document.createElement('div');
            line.className = 'setup-note-line';
            notes.appendChild(line);
        }
        div.appendChild(notes);
    }

    return div;
};

/**
 * Ending block: title + body HTML.
 */
AtomRenderers['ending-block'] = function (atom, ctx) {
    var c = atom.content;
    var ending = c.ending || {};
    var div = document.createElement('div');
    div.className = 'ending-block';
    var h2 = document.createElement('h2');
    h2.className = 'ending-title';
    h2.textContent = decodeEntities(ending.title || ending.id || 'ENDING');
    div.appendChild(h2);
    var body = document.createElement('div');
    body.className = 'ending-body';
    body.innerHTML = sanitizeHtml(ending.html || '');
    div.appendChild(body);
    return div;
};

/**
 * Evidence node: track header + body HTML.
 */
AtomRenderers['evidence-node'] = function (atom, ctx) {
    var c = atom.content;
    var div = document.createElement('div');
    div.className = 'evidence-node ref-type-' + (c.nodeType || 'kinetic');
    var header = document.createElement('div');
    header.className = 'evidence-node-header';
    header.innerHTML = '<span class="evidence-track-name">' + escapeHtml(c.trackName) + '</span> &mdash; <span class="evidence-node-id">[' + escapeHtml(c.key) + ']</span>';
    div.appendChild(header);
    var body = document.createElement('div');
    body.className = 'evidence-node-body';
    body.innerHTML = sanitizeHtml(c.html || '');
    div.appendChild(body);
    return div;
};

/**
 * Final page content.
 */
AtomRenderers['final'] = function (atom, ctx) {
    var c = atom.content;
    var div = document.createElement('div');
    div.className = 'final-content-atom';
    if (c.heading) {
        var h = document.createElement('div');
        h.className = 'final-heading';
        h.innerHTML = sanitizeHtml(c.heading);
        div.appendChild(h);
    }
    if (c.subline) {
        var sub = document.createElement('div');
        sub.className = 'final-subline';
        sub.textContent = decodeEntities(c.subline);
        div.appendChild(sub);
    }
    if (c.instruction) {
        var instr = document.createElement('div');
        instr.className = 'final-instruction';
        instr.textContent = decodeEntities(c.instruction);
        div.appendChild(instr);
    }
    var footer = document.createElement('div');
    footer.className = 'final-footer';
    footer.innerHTML = '<div class="final-engine">Iron & Aether Engine v2</div>' +
        '<div class="final-note">Narrative, Mechanics, and Layout generated entirely by AI.</div>';
    div.appendChild(footer);
    return div;
};

/**
 * Back cover (fixed content).
 */
AtomRenderers['back-cover'] = function (atom, ctx) {
    var div = document.createElement('div');
    div.className = 'back-cover-content';
    div.innerHTML = '<div class="back-cover-title">LIFTRPG</div>' +
        '<div class="back-cover-sub">A Solo Exertion RPG Engine</div>' +
        '<div class="back-cover-version">V2 ENGINE</div>' +
        '<div class="back-cover-footer">' +
        '<p>Generated by LiftRPG.</p>' +
        '<p>Narrative, Mechanics, and Layout generated entirely by Artificial Intelligence.</p>' +
        '</div>';
    return div;
};

// ── Structural Atoms ─────────────────────────────────────────

/**
 * Quote page — full-page blockquote with optional attribution.
 * Style variants: centered (default), offset, full-bleed.
 */
AtomRenderers['quote-page'] = function (atom, ctx) {
    var c = atom.content || {};
    var style = c.style || 'centered';
    var div = document.createElement('div');
    div.className = 'structural-quote-page structural-quote-' + style;

    var bq = document.createElement('blockquote');
    bq.className = 'quote-page-text';
    bq.textContent = decodeEntities(c.text || '');
    div.appendChild(bq);

    if (c.attribution) {
        var attr = document.createElement('div');
        attr.className = 'quote-page-attribution';
        attr.textContent = decodeEntities(c.attribution);
        div.appendChild(attr);
    }

    return div;
};

/**
 * Pacing breath — intentional whitespace with optional flavor.
 * Visual variants: blank (default), divider, texture.
 */
AtomRenderers['pacing-breath'] = function (atom, ctx) {
    var c = atom.content || {};
    var visual = c.visual || 'blank';
    var div = document.createElement('div');
    div.className = 'structural-pacing-breath structural-breath-' + visual;

    if (c.flavor) {
        var flavor = document.createElement('div');
        flavor.className = 'breath-flavor';
        flavor.textContent = decodeEntities(c.flavor);
        div.appendChild(flavor);
    }

    if (visual === 'divider') {
        var theme = window._zineTheme || {};
        var svgStr = (theme.art && theme.art.dividerSvg) || '';
        if (svgStr) {
            var divider = document.createElement('div');
            divider.className = 'breath-divider';
            divider.innerHTML = sanitizeSvg(svgStr);
            div.appendChild(divider);
        }
    }

    return div;
};

// ── Map Atoms ────────────────────────────────────────────────

/**
 * Map atoms delegate to existing map renderers.
 */
AtomRenderers['facility-grid'] = function (atom, ctx) {
    if (typeof renderFacilityGrid !== 'function') return document.createElement('div');
    return renderFacilityGrid(atom.content.mapData, atom.content.week);
};

AtomRenderers['point-to-point'] = function (atom, ctx) {
    if (typeof renderPtpMapWeek !== 'function') return document.createElement('div');
    return renderPtpMapWeek(atom.content.mapData, atom.content.week);
};

AtomRenderers['linear-track'] = function (atom, ctx) {
    if (typeof renderLinearTrackWeek !== 'function') return document.createElement('div');
    return renderLinearTrackWeek(atom.content.mapData, atom.content.week);
};

// ── Expose ───────────────────────────────────────────────────

window.AtomRenderers = AtomRenderers;
