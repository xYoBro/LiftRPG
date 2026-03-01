/**
 * Renders LLM-generated JSON into HTML DOM Elements.
 * The Box Packer uses these elements to flow the document.
 */

// -- Sanitization helper (prevents XSS from untrusted JSON) --
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

function sanitizeSvg(svgStr) {
    if (typeof svgStr !== 'string') return '';
    // Strip <script> tags (paired and unpaired)
    var s = svgStr.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    s = s.replace(/<script\b[^>]*\/?>/gi, '');
    // Strip inline event handlers — quoted and unquoted
    s = s.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');
    // Strip javascript: URIs (quoted and unquoted)
    s = s.replace(/(href|src|xlink:href)\s*=\s*(?:"[^"]*javascript:[^"]*"|'[^']*javascript:[^']*')/gi, '$1=""');
    s = s.replace(/(href|src|xlink:href)\s*=\s*javascript:[^\s>]*/gi, '$1=""');
    return s;
}

// Lightweight allowlist for LLM-generated HTML
function sanitizeHtml(htmlStr) {
    if (typeof htmlStr !== 'string') return '';
    // Strip dangerous tags — paired (with content)
    var s = htmlStr.replace(/<(script|iframe|object|embed|applet)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');
    // Strip dangerous tags — opening/self-closing (no closing tag)
    s = s.replace(/<(script|iframe|object|embed|applet)\b[^>]*\/?>/gi, '');
    // Strip inline event handlers — quoted and unquoted
    s = s.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');
    // Strip javascript: URIs (quoted and unquoted)
    s = s.replace(/(href|src)\s*=\s*(?:"[^"]*javascript:[^"]*"|'[^']*javascript:[^']*')/gi, '$1=""');
    s = s.replace(/(href|src)\s*=\s*javascript:[^\s>]*/gi, '$1=""');
    return s;
}

// ---------------------------------------------------------
// Primitive Component Renderers
// ---------------------------------------------------------


// 3A/3B: Fill & Drain Clocks
function renderClock(params) {
    var size = params.size || 6;
    var container = document.createElement('div');
    container.className = 'clock-container';
    for (var i = 1; i <= size; i++) {
        var seg = document.createElement('div');
        seg.className = 'clock-segment';
        container.appendChild(seg);
    }
    return container;
}

// 3C: Tug-of-War Track
function renderTugOfWar(params) {
    var size = params.size || 5;
    var thresholds = params.thresholds || [];
    var container = document.createElement('div');
    container.className = 'tug-container';

    // Sort thresholds to find endpoints reliably
    var sortedTh = thresholds.slice().sort(function (a, b) { return a.value - b.value; });

    // Find absolute bounds for labels (min and max values)
    var leftTh = sortedTh.length > 0 ? sortedTh[0] : null;
    var rightTh = sortedTh.length > 0 ? sortedTh[sortedTh.length - 1] : null;

    if (leftTh) {
        var leftLabel = document.createElement('span');
        leftLabel.className = 'tug-label tug-label-left';
        leftLabel.textContent = leftTh.effect;
        container.appendChild(leftLabel);
    }

    var track = document.createElement('div');
    track.className = 'tug-track';

    // Create a map for quick threshold lookup
    var thresholdMap = {};
    thresholds.forEach(function (th) {
        thresholdMap[th.value] = th.effect;
    });

    for (var i = -size; i <= size; i++) {
        var boxWrap = document.createElement('div');
        boxWrap.className = 'tug-box-wrapper';
        boxWrap.style.display = 'flex';
        boxWrap.style.flexDirection = 'column';
        boxWrap.style.alignItems = 'center';

        var box = document.createElement('div');
        box.className = 'tug-box' + (i === 0 ? ' tug-center' : '');
        box.textContent = i;

        if (thresholdMap[i]) {
            box.classList.add('tug-threshold');
            box.style.borderWidth = '2px';
            box.style.borderColor = 'var(--accent, #c45c00)';
        }

        boxWrap.appendChild(box);

        // Render intermediate threshold labels, skip endpoints as they're handled by tug-label
        if (thresholdMap[i] && (!leftTh || leftTh.value !== i) && (!rightTh || rightTh.value !== i)) {
            var label = document.createElement('div');
            label.className = 'threshold-label tug-inter-label';
            label.style.fontSize = '8px';
            label.style.marginTop = '2px';
            label.textContent = thresholdMap[i];
            boxWrap.appendChild(label);
        }

        track.appendChild(boxWrap);
    }
    container.appendChild(track);

    if (rightTh && leftTh !== rightTh) {
        var rightLabel = document.createElement('span');
        rightLabel.className = 'tug-label tug-label-right';
        rightLabel.textContent = rightTh.effect;
        container.appendChild(rightLabel);
    }

    return container;
}

// 3D: Progress Track
function renderProgressTrack(params) {
    var size = params.size || 10;
    var startValue = params.startValue || 0;
    var thresholds = params.thresholds || [];

    var container = document.createElement('div');
    container.className = 'progress-track';

    // Create a map of thresholds by value for easy lookup
    var thresholdMap = {};
    thresholds.forEach(function (th) {
        thresholdMap[th.value] = th.effect;
    });

    for (var i = 1; i <= size; i++) {
        var boxWrap = document.createElement('div');
        boxWrap.className = 'progress-box-wrapper';
        boxWrap.style.display = 'flex';
        boxWrap.style.flexDirection = 'column';
        boxWrap.style.alignItems = 'center';

        var box = document.createElement('div');
        box.className = 'progress-box';

        if (i <= startValue) {
            box.classList.add('progress-box-filled');
            box.style.backgroundColor = 'var(--ink, #111)';
        }

        if (thresholdMap[i]) {
            box.classList.add('progress-box-threshold');
            box.style.borderWidth = '2px';
        }

        boxWrap.appendChild(box);

        if (thresholdMap[i]) {
            var label = document.createElement('div');
            label.className = 'threshold-label';
            label.style.fontSize = '8px';
            label.style.marginTop = '2px';
            label.textContent = thresholdMap[i];
            boxWrap.appendChild(label);
        }

        container.appendChild(boxWrap);
    }

    // Show threshold descriptions below track if any exist
    if (thresholds.length > 0) {
        var thresholdList = document.createElement('div');
        thresholdList.className = 'progress-threshold-list';
        thresholds.forEach(function (th) {
            var desc = document.createElement('div');
            desc.className = 'progress-threshold-desc';
            desc.innerHTML = '<span class="progress-threshold-marker">' +
                escapeHtml(String(th.value)) + ':</span> ' +
                escapeHtml(th.effect);
            thresholdList.appendChild(desc);
        });
        container.appendChild(thresholdList);
    }

    return container;
}

// 3E: Heat / Threat Counter
// params.compact: if true, omit threshold descriptions (for HUD mini-tracks)
function renderHeatTrack(params) {
    var size = params.size || 10;
    var startValue = params.startValue || 0;
    var thresholds = params.thresholds || [];
    var compact = params.compact || false;

    var outer = document.createElement('div');
    outer.className = 'heat-track-container';

    var boxRow = document.createElement('div');
    boxRow.className = 'heat-track';

    var thresholdMap = {};
    thresholds.forEach(function (th) {
        thresholdMap[th.value] = th.effect;
    });

    for (var i = 1; i <= size; i++) {
        var box = document.createElement('div');
        box.className = 'heat-box';
        box.textContent = i;

        if (i <= startValue) {
            box.classList.add('heat-box-filled');
            box.style.backgroundColor = 'var(--ink, #111)';
            box.style.color = '#fff';
        }

        if (thresholdMap[i]) {
            box.classList.add('heat-box-threshold');
        }

        boxRow.appendChild(box);
    }
    outer.appendChild(boxRow);

    // Render threshold descriptions below the track with value labels
    if (thresholds.length && !compact) {
        var descList = document.createElement('div');
        descList.className = 'heat-threshold-list';
        thresholds.forEach(function (th) {
            var desc = document.createElement('div');
            desc.className = 'heat-threshold-desc';
            var marker = document.createElement('strong');
            marker.className = 'heat-threshold-marker';
            marker.textContent = th.value + ':';
            desc.appendChild(marker);
            desc.appendChild(document.createTextNode(' ' + th.effect));
            descList.appendChild(desc);
        });
        outer.appendChild(descList);
    }

    return outer;
}

// 3F: Skill Tree / Unlock Path
function renderSkillTree(params) {
    var nodes = params.nodes || [];
    var container = document.createElement('div');
    container.className = 'skill-tree';

    nodes.forEach(function (node) {
        var row = document.createElement('div');
        row.className = 'skill-node';
        var checkbox = document.createElement('span');
        checkbox.className = 'skill-checkbox';
        checkbox.textContent = '\u25A1';
        row.appendChild(checkbox);
        var label = document.createElement('span');
        label.className = 'skill-label';
        label.textContent = (node.name || '') + ' (cost: ' + (node.cost || 0) + ')';
        row.appendChild(label);
        if (node.requiresNodeId) {
            var req = document.createElement('span');
            req.className = 'skill-requires';
            req.textContent = ' \u2190 ' + node.requiresNodeId;
            row.appendChild(req);
        }
        container.appendChild(row);
    });

    return container;
}

// 3G: Faction Reputation Track
function renderFactionTrack(params) {
    var size = params.size || 10;
    var labels = params.labels || [];
    var container = document.createElement('div');
    container.className = 'faction-track';

    var track = document.createElement('div');
    track.className = 'faction-boxes';

    // Create a map of labels by value/position
    var labelMap = {};
    if (params.standings) {
        params.standings.forEach(function (s) {
            if (s.value !== undefined) labelMap[s.value] = s.label;
        });
    } else {
        // Fallback for old simple labels array
        labels.forEach(function (lbl, i) {
            labelMap[i] = lbl;
        });
    }

    for (var i = 0; i <= size; i++) {
        var boxWrap = document.createElement('div');
        boxWrap.className = 'faction-box-wrapper';
        boxWrap.style.display = 'flex';
        boxWrap.style.flexDirection = 'column';
        boxWrap.style.alignItems = 'center';
        boxWrap.style.flex = '1';

        var box = document.createElement('div');
        box.className = 'faction-box';
        box.textContent = i;
        boxWrap.appendChild(box);

        if (labelMap[i]) {
            var label = document.createElement('div');
            label.className = 'faction-label';
            label.style.fontSize = '8px';
            label.style.marginTop = '4px';
            label.style.textAlign = 'center';
            label.style.wordBreak = 'break-word';
            label.textContent = labelMap[i];
            boxWrap.appendChild(label);
        }

        track.appendChild(boxWrap);
    }
    container.appendChild(track);

    return container;
}



// ---------------------------------------------------------
// PAGE-LEVEL RENDERERS (used by box-packer page-type dispatcher)
// ---------------------------------------------------------

function createPage() {
    var p = document.createElement('div');
    p.className = 'zine-page';
    return p;
}

function addPageNumber(page, num) {
    var n = document.createElement('div');
    n.className = 'page-number';
    n.innerText = String(num).padStart(2, '0');
    page.appendChild(n);
}

// -- Cover Page --
function renderCoverPage(container, data) {
    var page = createPage();
    page.classList.add('cover-layout');
    var voice = (data.voice && data.voice.cover) || {};
    var meta = data.meta || {};
    var theme = data.theme || {};

    // Classification stamp
    if (voice.classification) {
        var stamp = document.createElement('div');
        stamp.className = 'classification-stamp';
        stamp.textContent = voice.classification;
        page.appendChild(stamp);
    }

    // Department
    if (voice.department) {
        var dept = document.createElement('div');
        dept.className = 'cover-department';
        dept.textContent = voice.department;
        page.appendChild(dept);
    }

    // Cover SVG art
    if (theme.art && theme.art.coverSvg) {
        var artWrap = document.createElement('div');
        artWrap.className = 'cover-art';
        artWrap.innerHTML = sanitizeSvg(theme.art.coverSvg);
        page.appendChild(artWrap);
    }

    // Title
    var title = document.createElement('div');
    title.className = 'cover-title';
    title.textContent = meta.title || 'UNTITLED ZINE';
    page.appendChild(title);

    // Subject line
    if (voice.subjectLine) {
        var subj = document.createElement('div');
        subj.className = 'cover-subject';
        subj.textContent = voice.subjectLine;
        page.appendChild(subj);
    }

    // Tagline
    if (voice.tagline) {
        var tag = document.createElement('div');
        tag.className = 'cover-tagline';
        tag.textContent = voice.tagline;
        page.appendChild(tag);
    }

    // Intro paragraph
    if (voice.intro) {
        var intro = document.createElement('div');
        intro.className = 'cover-intro';
        intro.innerHTML = sanitizeHtml(voice.intro);
        page.appendChild(intro);
    }

    // Author
    var author = document.createElement('div');
    author.className = 'cover-author';
    author.textContent = meta.author || 'Iron & Aether Engine v2';
    page.appendChild(author);

    container.appendChild(page);
    return 1;
}

// -- Rules Manual Pages --
function renderManualPages(container, data, startPage) {
    var voice = (data.voice && data.voice.manual) || {};
    var sections = voice.sections || [];
    var pageNum = startPage;

    var page = createPage();
    container.appendChild(page);
    pageNum++;

    // Manual title
    var h1 = document.createElement('h1');
    h1.className = 'manual-title';
    h1.textContent = voice.title || 'OPERATIONAL BRIEF';
    page.appendChild(h1);

    for (var i = 0; i < sections.length; i++) {
        var sec = sections[i];
        var block = document.createElement('div');
        block.className = 'manual-section';

        var heading = document.createElement('h2');
        heading.className = 'manual-heading';
        heading.textContent = sec.heading || '';
        block.appendChild(heading);

        var body = document.createElement('div');
        body.className = 'manual-body';
        body.innerHTML = sanitizeHtml(sec.body || '');
        block.appendChild(body);

        page.appendChild(block);

        // Overflow check
        if (page.scrollHeight > page.clientHeight) {
            page.removeChild(block);
            addPageNumber(page, pageNum);
            pageNum++;
            page = createPage();
            container.appendChild(page);
            page.appendChild(block);
        }
    }

    addPageNumber(page, pageNum);
    return pageNum - startPage;
}

// -- Tracker Sheet (Character Dossier) --
function renderTrackerSheet(container, data, startPage) {
    var mech = data.mechanics || {};
    var voice = data.voice || {};
    var pageNum = startPage + 1;

    var page = createPage();
    page.classList.add('tracker-sheet');
    container.appendChild(page);

    var h1 = document.createElement('h1');
    h1.textContent = (voice.labels && voice.labels.mechanicsHeading) || 'CHARACTER DOSSIER';
    page.appendChild(h1);

    // Clocks
    if (mech.clocks && mech.clocks.length) {
        var clockSection = document.createElement('div');
        clockSection.className = 'tracker-section';
        var clockH = document.createElement('h2');
        clockH.textContent = (voice.labels && voice.labels.clocksHeading) || 'CLOCKS';
        clockSection.appendChild(clockH);

        mech.clocks.forEach(function (c) {
            var row = document.createElement('div');
            row.className = 'tracker-row';
            var label = document.createElement('span');
            label.className = 'tracker-label';
            label.textContent = c.name;
            row.appendChild(label);
            var dirLabel = document.createElement('span');
            dirLabel.className = 'tracker-info';
            dirLabel.textContent = c.direction === 'drain' ? 'DRAIN' : 'FILL';
            row.appendChild(dirLabel);
            clockSection.appendChild(row);
            clockSection.appendChild(renderClock({ size: c.size || 6 }));

            // Human-readable trigger instruction
            var triggerText = '';
            if (c.direction === 'drain') {
                triggerText = 'When empty';
            } else {
                triggerText = 'When full';
            }
            if (c.onTrigger && c.onTrigger.action === 'read-archive' && c.onTrigger.section) {
                triggerText += ' \u2192 read next ' + c.onTrigger.section.replace(/-/g, ' ').toUpperCase();
            }
            if (c.clearOnTrigger) {
                triggerText += ', then refill ' + c.clearOnTrigger;
            }
            var triggerDiv = document.createElement('div');
            triggerDiv.className = 'tracker-trigger';
            triggerDiv.textContent = triggerText;
            clockSection.appendChild(triggerDiv);

            if (c.flavor) {
                var flav = document.createElement('div');
                flav.className = 'tracker-flavor';
                flav.textContent = c.flavor;
                clockSection.appendChild(flav);
            }
        });
        page.appendChild(clockSection);
    }

    // Tracks
    if (mech.tracks && mech.tracks.length) {
        var trackSection = document.createElement('div');
        trackSection.className = 'tracker-section';
        var trackH = document.createElement('h2');
        trackH.textContent = 'TRACKS';
        trackSection.appendChild(trackH);

        mech.tracks.forEach(function (t) {
            var row = document.createElement('div');
            row.className = 'tracker-row';
            var label = document.createElement('span');
            label.className = 'tracker-label';
            label.textContent = t.name + ' (' + t.type + ')';
            row.appendChild(label);
            trackSection.appendChild(row);

            if (t.type === 'tug') {
                trackSection.appendChild(renderTugOfWar({ size: t.size || 5, thresholds: t.thresholds }));
            } else if (t.type === 'heat') {
                trackSection.appendChild(renderHeatTrack({ size: t.size || 10, startValue: t.startValue, thresholds: t.thresholds }));
            } else if (t.type === 'faction') {
                trackSection.appendChild(renderFactionTrack({ size: t.size || 10, labels: [], standings: t.standings }));
            } else {
                trackSection.appendChild(renderProgressTrack({ size: t.size || 10, startValue: t.startValue, thresholds: t.thresholds }));
            }

            if (t.flavor) {
                var flav = document.createElement('div');
                flav.className = 'tracker-flavor';
                flav.textContent = t.flavor;
                trackSection.appendChild(flav);
            }
        });
        page.appendChild(trackSection);
    }

    // Resources
    if (mech.resources && mech.resources.length) {
        var resSection = document.createElement('div');
        resSection.className = 'tracker-section';
        var resH = document.createElement('h2');
        resH.textContent = (voice.labels && voice.labels.resourceHeading) || 'RESOURCES';
        resSection.appendChild(resH);

        mech.resources.forEach(function (r) {
            var row = document.createElement('div');
            row.className = 'tracker-row resource-row';
            row.innerHTML = '<strong>' + escapeHtml(r.name) + '</strong> &mdash; ' +
                'Earn: ' + escapeHtml(r.earnRule) + ' | Spend: ' + escapeHtml(r.spendEffect) +
                (r.reset ? ' | Reset: ' + escapeHtml(r.reset) : '');
            resSection.appendChild(row);
            // Tracking boxes (10 boxes for resource counting)
            resSection.appendChild(renderProgressTrack({
                size: r.trackSize || r.maxValue || 10,
                startValue: r.startValue,
                thresholds: r.thresholds
            }));
        });
        page.appendChild(resSection);
    }

    // Codewords
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
            effectLine.textContent = cw.effect;
            row.appendChild(effectLine);
            cwSection.appendChild(row);
        });
        page.appendChild(cwSection);
    }

    // Dice stat (for d6-under) — skip when stat is unused/none
    if (mech.dice && mech.dice.stat && mech.dice.stat.name && mech.dice.stat.name.toLowerCase() !== 'none') {
        var statSection = document.createElement('div');
        statSection.className = 'tracker-section';
        var statH = document.createElement('h2');
        statH.textContent = mech.dice.stat.name || 'STAT';
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

    // Overflow: if content exceeds page, split iteratively
    var pages = [page];
    var currentPageIndex = 0;

    while (pages[currentPageIndex].scrollHeight > pages[currentPageIndex].clientHeight) {
        var currPage = pages[currentPageIndex];

        // Find the last section
        var sections = currPage.querySelectorAll('.tracker-section');
        if (sections.length <= 1) {
            // Can't split further, a single section is larger than the page
            break;
        }
        var lastSection = sections[sections.length - 1];

        // Ensure there is a next page
        if (pages.length <= currentPageIndex + 1) {
            var newPage = createPage();
            newPage.classList.add('tracker-sheet');
            container.appendChild(newPage);
            pages.push(newPage);
        }

        var nextPage = pages[currentPageIndex + 1];

        // Insert at the top of the next page because we are moving from the bottom up
        nextPage.insertBefore(lastSection, nextPage.firstChild);

        // If the current page is STILL overflowing after moving one section, the loop will 
        // move the *new* last section to the top of the next page, pushing down the one we just moved.
        // Once the current page stops overflowing, it will advance to check the next page.
        if (currPage.scrollHeight <= currPage.clientHeight) {
            currentPageIndex++;
        }
    }

    // Add page numbers to all generated tracker sheets
    pages.forEach(function (p, idx) {
        addPageNumber(p, pageNum + idx);
    });

    return pages.length;
}

// -- Setup Page --
function renderSetupPage(container, data, startPage) {
    var workout = data.workout || {};
    var setup = workout.setup || {};
    var pageNum = startPage + 1;

    var page = createPage();
    page.classList.add('setup-page');
    container.appendChild(page);

    var h1 = document.createElement('h1');
    h1.textContent = setup.title || 'SETUP';
    page.appendChild(h1);

    if (setup.instructions) {
        var instr = document.createElement('p');
        instr.className = 'setup-instructions';
        instr.textContent = setup.instructions;
        page.appendChild(instr);
    }

    // Weight calculation fields
    if (setup.fields && setup.fields.length) {
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

        // Percentage columns
        var percents = (setup.fields[0] && setup.fields[0].calcPercents) || [];
        percents.forEach(function (p) {
            var th = document.createElement('th');
            th.textContent = p + '%';
            hrow.appendChild(th);
        });
        thead.appendChild(hrow);
        table.appendChild(thead);

        var tbody = document.createElement('tbody');
        setup.fields.forEach(function (f) {
            var tr = document.createElement('tr');
            var tdLabel = document.createElement('td');
            tdLabel.textContent = f.label;
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
        page.appendChild(table);
    }

    // Progression note
    if (workout.progressionNote) {
        var note = document.createElement('div');
        note.className = 'setup-note';
        note.innerHTML = '<strong>PROGRESSION:</strong> ' + escapeHtml(workout.progressionNote);
        page.appendChild(note);
    }

    // Note lines
    if (setup.noteLines) {
        var notes = document.createElement('div');
        notes.className = 'setup-notes-area';
        for (var i = 0; i < setup.noteLines; i++) {
            var line = document.createElement('div');
            line.className = 'setup-note-line';
            notes.appendChild(line);
        }
        page.appendChild(notes);
    }

    addPageNumber(page, pageNum);
    return 1;
}

// -- Encounter Spread (1-2 pages per week) --
function renderEncounterSpread(container, data, week, startPage) {
    var workout = data.workout || {};
    var mech = data.mechanics || {};
    var voice = data.voice || {};
    var encounters = (data.story && data.story.encounters) || [];
    var weekEncounters = encounters.filter(function (e) { return e.week === week; });
    var pageNum = startPage;
    var pagesCreated = 0;

    // -- LEFT PAGE: HUD --
    pageNum++;
    pagesCreated++;
    var hudPage = createPage();
    hudPage.classList.add('encounter-hud');
    container.appendChild(hudPage);

    // Week header / classification
    var weekClassification = document.createElement('div');
    weekClassification.className = 'classification';
    var classText = (voice.classifications && voice.classifications.sessionLog) || 'WEEK {{week}}';
    weekClassification.textContent = classText.replace(/\{\{week\}\}/g, week);
    hudPage.appendChild(weekClassification);

    // Week alert
    if (voice.weekAlerts && voice.weekAlerts[week]) {
        var alert = voice.weekAlerts[week];
        var alertDiv = document.createElement('div');
        alertDiv.className = 'week-alert week-alert-' + (alert.type || 'note');
        if (alert.text) alertDiv.textContent = alert.text;
        else if (alert.type === 'intake') alertDiv.textContent = 'INTAKE';
        hudPage.appendChild(alertDiv);
    }

    if (voice.weekBosses && voice.weekBosses[week]) {
        var bossAlert = voice.weekBosses[week];
        if (bossAlert.alert) {
            var bossAlertDiv = document.createElement('div');
            bossAlertDiv.className = 'week-alert week-alert-boss';
            bossAlertDiv.textContent = bossAlert.alert;
            hudPage.appendChild(bossAlertDiv);
        }
    }

    // Map (render for this week)
    var mapData = data.map;
    if (mapData && mapData.weeks && mapData.weeks[week]) {
        var mapContainer = document.createElement('div');
        mapContainer.className = 'hud-map';
        var mapTitle = document.createElement('div');
        mapTitle.className = 'hud-map-title';
        var mapTitleText = (voice.hud && voice.hud.mapTitle) || 'MAP — WEEK {{week}}';
        mapTitle.textContent = mapTitleText.replace(/\{\{week\}\}/g, week);
        mapContainer.appendChild(mapTitle);

        if (mapData.type === 'facility-grid') {
            mapContainer.appendChild(renderFacilityGrid(mapData, week));
        } else if (mapData.type === 'point-to-point') {
            mapContainer.appendChild(renderPtpMapWeek(mapData, week));
        } else if (mapData.type === 'linear-track') {
            mapContainer.appendChild(renderLinearTrackWeek(mapData, week));
        }
        hudPage.appendChild(mapContainer);
    }

    // Dice resolution table
    if (mech.dice && mech.dice.outcomes) {
        var diceDiv = document.createElement('div');
        diceDiv.className = 'hud-dice';
        var diceLabel = document.createElement('div');
        diceLabel.className = 'hud-dice-label';
        diceLabel.textContent = (voice.hud && voice.hud.diceLabel) || 'DICE RESOLUTION';
        diceDiv.appendChild(diceLabel);

        var diceTable = document.createElement('table');
        diceTable.className = 'dice-table';
        var dtHead = document.createElement('thead');
        var dtHr = document.createElement('tr');
        var th1 = document.createElement('th');
        th1.textContent = 'RANGE';
        dtHr.appendChild(th1);
        var th2 = document.createElement('th');
        th2.textContent = 'OUTCOME';
        dtHr.appendChild(th2);
        var th3 = document.createElement('th');
        th3.textContent = 'REF';
        dtHr.appendChild(th3);
        var th4 = document.createElement('th');
        th4.textContent = 'EFFECT';
        dtHr.appendChild(th4);
        dtHead.appendChild(dtHr);
        diceTable.appendChild(dtHead);

        var dtBody = document.createElement('tbody');
        mech.dice.outcomes.forEach(function (o) {
            var tr = document.createElement('tr');
            var tdRange = document.createElement('td');
            tdRange.textContent = o.range[0] + '-' + o.range[1];
            tr.appendChild(tdRange);
            var tdName = document.createElement('td');
            tdName.textContent = o.name;
            tr.appendChild(tdName);
            var tdSuffix = document.createElement('td');
            tdSuffix.textContent = o.suffix || '';
            tr.appendChild(tdSuffix);
            var tdTick = document.createElement('td');
            tdTick.textContent = o.ticks || '';
            tr.appendChild(tdTick);
            dtBody.appendChild(tr);
        });
        diceTable.appendChild(dtBody);
        diceDiv.appendChild(diceTable);

        if (voice.hud && voice.hud.diceNote) {
            var dn = document.createElement('div');
            dn.className = 'hud-dice-note';
            dn.textContent = voice.hud.diceNote;
            diceDiv.appendChild(dn);
        }
        hudPage.appendChild(diceDiv);
    }

    // Mini tracker display (compact clocks and key tracks)
    var hasClocks = mech.clocks && mech.clocks.length > 0;
    var hasTracks = mech.tracks && mech.tracks.some(function (t) { return t.type === 'heat' || t.type === 'tug'; });

    if (hasClocks || hasTracks) {
        var trackerDiv = document.createElement('div');
        trackerDiv.className = 'hud-trackers';
        var trackerLabel = document.createElement('div');
        trackerLabel.className = 'hud-trackers-label';
        trackerLabel.textContent = (voice.hud && voice.hud.clocksLabel) || 'TRACKERS';
        trackerDiv.appendChild(trackerLabel);

        if (hasClocks) {
            mech.clocks.forEach(function (c) {
                var row = document.createElement('div');
                row.className = 'hud-tracker-row';
                var lbl = document.createElement('span');
                lbl.className = 'hud-tracker-name';
                lbl.textContent = c.name;
                row.appendChild(lbl);
                row.appendChild(renderClock({ size: c.size || 6, clearOnTrigger: c.clearOnTrigger }));
                trackerDiv.appendChild(row);
            });
        }

        if (hasTracks) {
            mech.tracks.forEach(function (t) {
                if (t.type === 'heat' || t.type === 'tug') {
                    var row = document.createElement('div');
                    row.className = 'hud-tracker-row';
                    row.style.marginTop = '4px';
                    var lbl = document.createElement('span');
                    lbl.className = 'hud-tracker-name';
                    lbl.textContent = t.name;
                    row.appendChild(lbl);

                    // Render mini-versions of the tracks
                    if (t.type === 'heat') {
                        var heat = renderHeatTrack({ size: t.size || 10, startValue: t.startValue, thresholds: t.thresholds, compact: true });
                        heat.style.transform = 'scale(0.8)';
                        heat.style.transformOrigin = 'left center';
                        row.appendChild(heat);
                    } else if (t.type === 'tug') {
                        var tug = renderTugOfWar({ size: t.size || 5, thresholds: t.thresholds });
                        tug.style.transform = 'scale(0.8)';
                        tug.style.transformOrigin = 'left center';
                        row.appendChild(tug);
                    }
                    trackerDiv.appendChild(row);
                }
            });
        }
        hudPage.appendChild(trackerDiv);
    }

    addPageNumber(hudPage, pageNum);

    // -- RIGHT PAGE: Session Logs + Encounter Narratives --
    pageNum++;
    pagesCreated++;
    var logPage = createPage();
    logPage.classList.add('encounter-log');
    container.appendChild(logPage);

    var logClassification = document.createElement('div');
    logClassification.className = 'classification';
    var logClassText = (voice.classifications && voice.classifications.operationsLog) || 'OPERATIONS — WEEK {{week}}';
    logClassification.textContent = logClassText.replace(/\{\{week\}\}/g, week);
    logPage.appendChild(logClassification);

    // Session types for this week
    var sessionTypes = workout.sessionTypes || [];
    var refScheme = (data.story && data.story.refScheme) || { prefix: 'R', weekDigits: 1, sessionDigits: 1 };

    weekEncounters.forEach(function (enc) {
        var sessionDiv = document.createElement('div');
        sessionDiv.className = 'session-block';

        // Session title
        var sessionTitle = document.createElement('div');
        sessionTitle.className = 'session-title-row';
        var dayLabel = (voice.weekPage && voice.weekPage.sessions && voice.weekPage.sessions[enc.day]) || ('SESSION ' + enc.day);
        sessionTitle.innerHTML = '<span class="session-day">' + escapeHtml(dayLabel) + '</span>' +
            '<span class="encounter-title">' + escapeHtml(enc.title || '') + '</span>';
        sessionDiv.appendChild(sessionTitle);

        // Encounter narrative
        if (enc.narrative) {
            var narr = document.createElement('div');
            narr.className = 'encounter-narrative';
            narr.innerHTML = sanitizeHtml(enc.narrative);
            sessionDiv.appendChild(narr);
        }

        // Boss encounter special rendering
        if (enc.special === 'boss') {
            // Visual distinction: add boss class to session block
            sessionDiv.classList.add('session-boss');

            // If bossRules exist, render the special procedure box
            if (enc.bossRules) {
                var bossBox = document.createElement('div');
                bossBox.className = 'boss-rules-box';

                if (enc.bossRules.title) {
                    var bossTitle = document.createElement('div');
                    bossTitle.className = 'boss-rules-title';
                    bossTitle.textContent = enc.bossRules.title;
                    bossBox.appendChild(bossTitle);
                }

                if (enc.bossRules.preamble) {
                    var bossPreamble = document.createElement('div');
                    bossPreamble.className = 'boss-rules-preamble';
                    bossPreamble.textContent = enc.bossRules.preamble;
                    bossBox.appendChild(bossPreamble);
                }

                if (enc.bossRules.steps && enc.bossRules.steps.length) {
                    var bossSteps = document.createElement('ol');
                    bossSteps.className = 'boss-rules-steps';
                    enc.bossRules.steps.forEach(function (step) {
                        var li = document.createElement('li');
                        li.textContent = step;
                        bossSteps.appendChild(li);
                    });
                    bossBox.appendChild(bossSteps);
                }

                if (enc.bossRules.stakes) {
                    var bossStakes = document.createElement('div');
                    bossStakes.className = 'boss-rules-stakes';
                    bossStakes.textContent = enc.bossRules.stakes;
                    bossBox.appendChild(bossStakes);
                }

                sessionDiv.appendChild(bossBox);
            }
        }

        // Find matching session type for workout log
        var sType = sessionTypes.find(function (st) {
            return st.days && st.days.indexOf(enc.day) !== -1;
        });
        if (sType && sType.exercises) {
            var intensity = (workout.weekIntensities && workout.weekIntensities[week - 1]) || '';
            if (intensity) {
                var intDiv = document.createElement('div');
                intDiv.className = 'session-intensity';
                intDiv.textContent = 'INTENSITY: ' + intensity + (workout.intensityUnit ? ' ' + workout.intensityUnit : '');
                sessionDiv.appendChild(intDiv);
            }

            var logTable = document.createElement('table');
            logTable.className = 'workout-log-table';
            var lHead = document.createElement('thead');
            var lHr = document.createElement('tr');
            var lth1 = document.createElement('th');
            lth1.textContent = (voice.labels && voice.labels.liftColumn) || 'LIFT';
            lHr.appendChild(lth1);
            var lth2 = document.createElement('th');
            lth2.textContent = (voice.labels && voice.labels.weightColumn) || workout.weightColumnLabel || 'WEIGHT';
            lHr.appendChild(lth2);
            var lth3 = document.createElement('th');
            lth3.textContent = 'SETS';
            lHr.appendChild(lth3);
            lHead.appendChild(lHr);
            logTable.appendChild(lHead);

            var lBody = document.createElement('tbody');
            sType.exercises.forEach(function (ex) {
                var tr = document.createElement('tr');
                var tdName = document.createElement('td');
                tdName.className = 'workout-log-name';
                var repsStr = String(ex.reps);
                if (repsStr.length > 20) {
                    console.warn('Oversized reps string detected in ' + ex.name + ' (truncating):', repsStr);
                    repsStr = repsStr.substring(0, 15) + '...';
                }
                tdName.textContent = ex.name + ' (' + repsStr + ')';
                tr.appendChild(tdName);
                var tdWeight = document.createElement('td');
                tdWeight.className = 'setup-input-cell';
                tr.appendChild(tdWeight);
                var tdSets = document.createElement('td');
                tdSets.className = 'workout-log-sets';
                var setContainer = document.createElement('div');
                setContainer.className = 'workout-log-set-container';
                for (var s = 0; s < (ex.sets || 1); s++) {
                    var box = document.createElement('div');
                    box.className = 'workout-log-box';
                    setContainer.appendChild(box);
                }
                tdSets.appendChild(setContainer);
                tr.appendChild(tdSets);
                lBody.appendChild(tr);
            });
            logTable.appendChild(lBody);
            sessionDiv.appendChild(logTable);
        }

        // REF code
        var refCode = refScheme.prefix +
            String(week).padStart(refScheme.weekDigits || 1, '0') +
            String(enc.day).padStart(refScheme.sessionDigits || 1, '0');
        var refDiv = document.createElement('div');
        refDiv.className = 'session-ref';
        var refLabel = (voice.labels && voice.labels.sessionRef) || 'REF {{ref}}';
        refDiv.textContent = refLabel.replace(/\{\{ref\}\}/g, refCode);
        sessionDiv.appendChild(refDiv);

        logPage.appendChild(sessionDiv);
    });

    // Week-end checkin — support both flat array and per-week object
    var checkinQuestions = null;
    if (workout.weekEndCheckin) {
        if (Array.isArray(workout.weekEndCheckin)) {
            // Legacy: flat array used for all weeks
            checkinQuestions = workout.weekEndCheckin;
        } else if (typeof workout.weekEndCheckin === 'object' && workout.weekEndCheckin[week]) {
            // Per-week object: { "1": [...], "2": [...], ... }
            checkinQuestions = workout.weekEndCheckin[week];
        }
    }
    if (checkinQuestions && checkinQuestions.length) {
        var checkinDiv = document.createElement('div');
        checkinDiv.className = 'week-checkin';
        var checkinH = document.createElement('div');
        checkinH.className = 'week-checkin-label';
        checkinH.textContent = (voice.labels && voice.labels.weekEndCheckin) || 'WEEK-END CHECK-IN';
        checkinDiv.appendChild(checkinH);
        checkinQuestions.forEach(function (q) {
            var line = document.createElement('div');
            line.className = 'checkin-line';
            line.textContent = q;
            checkinDiv.appendChild(line);
        });
        logPage.appendChild(checkinDiv);
    }

    // Overflow: if content exceeds log page, split iteratively
    var logPages = [logPage];
    var currentPageIndex = 0;

    while (logPages[currentPageIndex].scrollHeight > logPages[currentPageIndex].clientHeight) {
        var currPage = logPages[currentPageIndex];

        // Find the last section
        var blocks = currPage.querySelectorAll('.session-block, .week-checkin');
        if (blocks.length <= 1) {
            // Can't split further, a single block is larger than the page
            console.warn('CONTENT OVERFLOW: A single session block is taller than the page. Regenerate with shorter exercise data to fix.');
            var overflowWarn = document.createElement('div');
            overflowWarn.style.position = 'absolute';
            overflowWarn.style.bottom = '10px';
            overflowWarn.style.left = '10px';
            overflowWarn.style.right = '10px';
            overflowWarn.style.backgroundColor = 'var(--accent, #c45c00)';
            overflowWarn.style.color = '#fff';
            overflowWarn.style.padding = '4px';
            overflowWarn.style.fontSize = '9px';
            overflowWarn.style.fontWeight = 'bold';
            overflowWarn.style.textAlign = 'center';
            overflowWarn.style.zIndex = '100';
            overflowWarn.textContent = '[CONTENT OVERFLOW — REGENERATE WITH SHORTER EXERCISE DATA]';
            currPage.style.position = 'relative'; // ensure absolute positioning works
            currPage.appendChild(overflowWarn);
            break;
        }
        var lastBlock = blocks[blocks.length - 1];

        // Ensure there is a next page
        if (logPages.length <= currentPageIndex + 1) {
            var newPage = createPage();
            newPage.classList.add('encounter-log');
            container.appendChild(newPage);
            logPages.push(newPage);
            pagesCreated++;
        }

        var nextPage = logPages[currentPageIndex + 1];

        // Insert at the top of the next page because we are moving from the bottom up
        nextPage.insertBefore(lastBlock, nextPage.firstChild);

        // Advance to next page if current page stops overflowing
        if (currPage.scrollHeight <= currPage.clientHeight) {
            currentPageIndex++;
        }
    }

    // Add page numbers
    logPages.forEach(function (p, idx) {
        addPageNumber(p, pageNum + idx);
    });

    return pagesCreated;
}

// -- Facility Grid Map (per-week) --
function renderFacilityGrid(mapData, week) {
    var weekData = (mapData.weeks && mapData.weeks[week]) || {};
    var rooms = weekData.rooms || [];
    var levels = mapData.levels || [];
    var container = document.createElement('div');
    container.className = 'facility-grid';

    rooms.forEach(function (floor, fi) {
        var floorDiv = document.createElement('div');
        floorDiv.className = 'facility-floor';
        var floorLabel = document.createElement('div');
        floorLabel.className = 'floor-label';
        floorLabel.textContent = (levels[fi] && levels[fi].name) || ('FLOOR ' + (fi + 1));
        floorDiv.appendChild(floorLabel);

        var roomRow = document.createElement('div');
        roomRow.className = 'floor-rooms';
        var cols = (levels[fi] && levels[fi].columns) || floor.length;
        roomRow.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';

        floor.forEach(function (room) {
            var cell = document.createElement('div');
            cell.className = 'facility-room';
            if (room.mod) cell.classList.add('room-' + room.mod);
            cell.innerHTML = '<div class="room-label">' + escapeHtml(room.label || '') + '</div>' +
                (room.sub ? '<div class="room-sub">' + escapeHtml(room.sub) + '</div>' : '');
            roomRow.appendChild(cell);
        });
        floorDiv.appendChild(roomRow);
        container.appendChild(floorDiv);
    });

    // Divider text
    if (weekData.divider) {
        var div = document.createElement('div');
        div.className = 'facility-divider' + (weekData.dividerAlert ? ' divider-alert' : '');
        div.textContent = weekData.divider;
        container.appendChild(div);
    }

    return container;
}

// -- Point-to-Point Map (per-week with fog-of-war) --
function renderPtpMapWeek(mapData, week) {
    var weekData = (mapData.weeks && mapData.weeks[week]) || {};
    var locations = mapData.locations || [];
    var connections = mapData.connections || [];
    var revealed = weekData.revealed || [];
    var locked = weekData.locked || [];
    var playerAt = weekData.playerAt;

    var locMap = {};
    locations.forEach(function (loc) { locMap[loc.id] = loc; });

    // Determine visible locations
    var visibleIds = new Set(revealed);
    if (playerAt) visibleIds.add(playerAt);

    // Collect visible nodes to compute tight viewBox
    var visibleLocs = locations.filter(function (loc) { return visibleIds.has(loc.id); });

    // Compute bounding box of visible nodes — more padding for sparse maps
    var PAD_X = nodeCount <= 6 ? 25 : 18;
    var PAD_TOP = nodeCount <= 6 ? 15 : 12;
    var PAD_BOT = nodeCount <= 6 ? 12 : 8;
    var minX = 0, maxX = 100, minY = 0, maxY = 100;
    if (visibleLocs.length > 0) {
        minX = Infinity; maxX = -Infinity; minY = Infinity; maxY = -Infinity;
        visibleLocs.forEach(function (loc) {
            if (loc.x < minX) minX = loc.x;
            if (loc.x > maxX) maxX = loc.x;
            if (loc.y < minY) minY = loc.y;
            if (loc.y > maxY) maxY = loc.y;
        });
        minX -= PAD_X;
        maxX += PAD_X;
        minY -= PAD_TOP;
        maxY += PAD_BOT;
    }
    var vbW = Math.max(maxX - minX, 40);
    var vbH = Math.max(maxY - minY, 40);

    // Scale font and node sizes based on node proximity
    var nodeCount = visibleLocs.length;
    var minDist = Infinity;
    for (var i = 0; i < visibleLocs.length; i++) {
        for (var j = i + 1; j < visibleLocs.length; j++) {
            var dx = visibleLocs[i].x - visibleLocs[j].x;
            var dy = visibleLocs[i].y - visibleLocs[j].y;
            var d = Math.sqrt(dx * dx + dy * dy);
            if (d < minDist) minDist = d;
        }
    }
    if (!isFinite(minDist)) minDist = 50;
    // Font size: scale with minimum gap between nodes, clamped
    var fontSize = Math.min(3, Math.max(1.8, minDist / 8));
    var nodeR = Math.min(3, Math.max(1.8, minDist / 7));
    var playerR = nodeR + 1;
    var labelGap = fontSize * 2.2;
    var strokeW = nodeR < 2.5 ? 1 : 1.5;

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', minX + ' ' + minY + ' ' + vbW + ' ' + vbH);
    svg.setAttribute('class', 'ptp-map');
    svg.style.width = '100%';
    svg.style.maxHeight = '3.8in';

    // Draw connections between visible locations
    connections.forEach(function (conn) {
        if (!visibleIds.has(conn.from) || !visibleIds.has(conn.to)) return;
        var from = locMap[conn.from];
        var to = locMap[conn.to];
        if (!from || !to) return;
        var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', from.x);
        line.setAttribute('y1', from.y);
        line.setAttribute('x2', to.x);
        line.setAttribute('y2', to.y);
        line.setAttribute('stroke', 'var(--ink, #111)');
        line.setAttribute('stroke-width', '0.6');
        if (locked.indexOf(conn.from) !== -1 || locked.indexOf(conn.to) !== -1) {
            line.setAttribute('stroke-dasharray', '2,2');
        }
        svg.appendChild(line);
    });

    // Find neighbors for each node to pick best label placement
    var neighborMap = {};
    connections.forEach(function (conn) {
        if (!visibleIds.has(conn.from) || !visibleIds.has(conn.to)) return;
        if (!neighborMap[conn.from]) neighborMap[conn.from] = [];
        if (!neighborMap[conn.to]) neighborMap[conn.to] = [];
        neighborMap[conn.from].push(conn.to);
        neighborMap[conn.to].push(conn.from);
    });

    // Draw location nodes
    locations.forEach(function (loc) {
        if (!visibleIds.has(loc.id)) return;
        var isLocked = locked.indexOf(loc.id) !== -1;
        var isPlayer = loc.id === playerAt;

        var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', loc.x);
        circle.setAttribute('cy', loc.y);
        circle.setAttribute('r', isPlayer ? playerR : nodeR);
        circle.setAttribute('fill', isPlayer ? 'var(--accent, #c45c00)' : (isLocked ? 'var(--muted, #999)' : 'var(--paper, #fff)'));
        circle.setAttribute('stroke', 'var(--ink, #111)');
        circle.setAttribute('stroke-width', strokeW);
        svg.appendChild(circle);

        // Smart label placement: check if neighbors are mostly above/below
        var labelText = loc.label || loc.id;
        var MAX_LABEL = fontSize < 2.2 ? 16 : (fontSize < 2.6 ? 20 : 22);
        if (labelText.length > MAX_LABEL) {
            labelText = labelText.substring(0, MAX_LABEL - 1) + '\u2026';
        }

        // Find best quadrant for label by checking neighbor positions
        var neighborsAbove = 0;
        var neighborsBelow = 0;
        var neighborsLeft = 0;
        var neighborsRight = 0;
        (neighborMap[loc.id] || []).forEach(function (nid) {
            var n = locMap[nid];
            if (!n) return;
            if (n.y < loc.y) neighborsAbove++;
            if (n.y > loc.y) neighborsBelow++;
            if (n.x < loc.x) neighborsLeft++;
            if (n.x > loc.x) neighborsRight++;
        });

        // Decide label position: above or below the node
        var labelBelow = neighborsAbove > neighborsBelow || loc.y < (minY + PAD_TOP + 5);
        var labelY = labelBelow ? loc.y + labelGap : loc.y - labelGap + 1;

        // Decide text-anchor: estimate text width and keep label inside viewBox
        // Uppercase heading fonts are wide — use a generous estimate
        var estCharW = fontSize * 0.9;
        var estTextW = labelText.length * estCharW;
        var halfText = estTextW / 2;
        var anchor = 'middle';
        var textX = loc.x;

        // Check if middle-anchor would clip left or right edge of viewBox
        var wouldClipLeft = (loc.x - halfText) < (minX + 1);
        var wouldClipRight = (loc.x + halfText) > (minX + vbW - 1);

        if (wouldClipLeft && !wouldClipRight) {
            anchor = 'start'; textX = loc.x + nodeR + 1;
        } else if (wouldClipRight && !wouldClipLeft) {
            anchor = 'end'; textX = loc.x - nodeR - 1;
        } else if (wouldClipLeft && wouldClipRight) {
            // Text is wider than viewBox — just start-anchor from the node
            anchor = 'start'; textX = loc.x + nodeR + 1;
        } else {
            // Interior: push label away from neighbor cluster
            if (neighborsRight > neighborsLeft) { anchor = 'end'; textX = loc.x - nodeR - 1; }
            else if (neighborsLeft > neighborsRight) { anchor = 'start'; textX = loc.x + nodeR + 1; }
        }

        var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', textX);
        text.setAttribute('y', labelY);
        text.setAttribute('text-anchor', anchor);
        text.setAttribute('font-size', String(fontSize));
        text.setAttribute('font-family', 'var(--font-heading, monospace)');
        text.setAttribute('fill', isLocked ? 'var(--muted, #999)' : 'var(--ink, #111)');
        text.textContent = labelText;
        svg.appendChild(text);
    });

    return svg;
}

// -- Linear Track Map (per-week) --
function renderLinearTrackWeek(mapData, week) {
    var weekData = (mapData.weeks && mapData.weeks[week]) || {};
    var size = mapData.size || 10;
    var labels = mapData.labels || [];
    var position = weekData.position || 0;
    var container = document.createElement('div');
    container.className = 'linear-track-map';

    for (var i = 0; i < size; i++) {
        var box = document.createElement('div');
        box.className = 'linear-track-cell';
        if (i === position) box.classList.add('linear-player');
        if (labels[i]) {
            var lbl = document.createElement('div');
            lbl.className = 'linear-label';
            lbl.textContent = labels[i];
            box.appendChild(lbl);
        }
        container.appendChild(box);
    }
    return container;
}

// -- REF Pages (scrambled paragraph book layout) --

// Scramble branch nodes so no two adjacent entries share the same encounter or outcome.
// Uses round-robin interleave with rotation per outcome group.
function scrambleBranches(allBranches, encounterCount, outcomeCount) {
    var groups = [];
    for (var oi = 0; oi < outcomeCount; oi++) {
        var group = [];
        for (var ei = 0; ei < encounterCount; ei++) {
            var idx = ei * outcomeCount + oi;
            if (idx < allBranches.length) {
                group.push(allBranches[idx]);
            }
        }
        // Rotate group by oi positions for maximum separation
        if (group.length > 1) {
            var rot = oi % group.length;
            group = group.slice(rot).concat(group.slice(0, rot));
        }
        groups.push(group);
    }

    // Round-robin interleave across groups
    var result = [];
    var maxLen = 0;
    for (var g = 0; g < groups.length; g++) {
        if (groups[g].length > maxLen) maxLen = groups[g].length;
    }
    for (var pos = 0; pos < maxLen; pos++) {
        for (var gi = 0; gi < groups.length; gi++) {
            if (pos < groups[gi].length) {
                result.push(groups[gi][pos]);
            }
        }
    }
    return result;
}

function renderRefPages(container, data, week, startPage) {
    var voice = data.voice || {};
    var refs = (data.story && data.story.refs) || {};
    var encounters = (data.story && data.story.encounters) || [];
    var mech = data.mechanics || {};
    var refScheme = (data.story && data.story.refScheme) || { prefix: 'R', weekDigits: 1, sessionDigits: 1 };
    var weekEncounters = encounters.filter(function (e) { return e.week === week; });
    var outcomes = (mech.dice && mech.dice.outcomes) || [];

    var pageNum = startPage;
    var pagesCreated = 0;

    // Helper: create and track a new ref page
    function newRefPage() {
        var p = createPage();
        p.classList.add('ref-page');
        container.appendChild(p);
        pageNum++;
        pagesCreated++;
        return p;
    }

    // Helper: append element with overflow check, returns current page
    function appendWithOverflow(pg, el) {
        pg.appendChild(el);
        if (pg.scrollHeight > pg.clientHeight) {
            pg.removeChild(el);
            addPageNumber(pg, pageNum);
            pg = newRefPage();
            pg.appendChild(el);
        }
        return pg;
    }

    // === First page setup ===
    var page = newRefPage();

    var classText = (voice.classifications && voice.classifications.refs) || 'ROUTE CODES // WEEK {{week}}';
    var classification = document.createElement('div');
    classification.className = 'classification';
    classification.textContent = classText.replace(/\{\{week\}\}/g, week);
    page.appendChild(classification);

    // Ref page alert (unchanged)
    if (voice.refPageAlerts && voice.refPageAlerts[week]) {
        var rpAlert = voice.refPageAlerts[week];
        var rpDiv = document.createElement('div');
        rpDiv.className = 'ref-page-alert ref-alert-' + (rpAlert.type || 'note');
        rpDiv.textContent = rpAlert.text || '';
        page.appendChild(rpDiv);
    }

    // === ZONE 1: Router section ===
    var routerSection = document.createElement('div');
    routerSection.className = 'ref-router-section';

    weekEncounters.forEach(function (enc) {
        var refCode = refScheme.prefix +
            String(week).padStart(refScheme.weekDigits || 1, '0') +
            String(enc.day).padStart(refScheme.sessionDigits || 1, '0');

        var routerNode = refs[refCode];
        var routerDiv = document.createElement('div');
        routerDiv.className = 'ref-router';

        var routerHeader = document.createElement('div');
        routerHeader.className = 'ref-router-header';

        var routerId = document.createElement('span');
        routerId.className = 'ref-id';
        routerId.textContent = refCode;
        routerHeader.appendChild(routerId);

        if (enc.title) {
            var routerTitle = document.createElement('span');
            routerTitle.className = 'ref-router-title';
            routerTitle.textContent = enc.title;
            routerHeader.appendChild(routerTitle);
        }

        routerDiv.appendChild(routerHeader);

        if (routerNode && routerNode.html) {
            var routerContent = document.createElement('div');
            routerContent.className = 'ref-content ref-type-' + (routerNode.type || 'kinetic');
            routerContent.innerHTML = sanitizeHtml(routerNode.html);
            routerDiv.appendChild(routerContent);
        }
        routerSection.appendChild(routerDiv);
    });

    page = appendWithOverflow(page, routerSection);

    // === Zone divider ===
    var divider = document.createElement('hr');
    divider.className = 'ref-zone-divider';
    page.appendChild(divider);

    // === ZONE 2: Scrambled outcomes ===
    var allBranches = [];
    weekEncounters.forEach(function (enc) {
        var refCode = refScheme.prefix +
            String(week).padStart(refScheme.weekDigits || 1, '0') +
            String(enc.day).padStart(refScheme.sessionDigits || 1, '0');

        outcomes.forEach(function (o) {
            allBranches.push({
                branchId: refCode + o.suffix,
                refCode: refCode,
                outcome: o,
                node: refs[refCode + o.suffix]
            });
        });
    });

    var scrambled = scrambleBranches(allBranches, weekEncounters.length, outcomes.length);

    scrambled.forEach(function (entry, idx) {
        var entryDiv = document.createElement('div');
        entryDiv.className = 'ref-entry';

        // ID badge
        var badge = document.createElement('span');
        badge.className = 'ref-entry-id';
        badge.textContent = entry.branchId;
        entryDiv.appendChild(badge);

        // Outcome label (name + dice range)
        var label = document.createElement('span');
        label.className = 'ref-entry-label';
        label.textContent = entry.outcome.name + ' [' + entry.outcome.range[0] + '\u2013' + entry.outcome.range[1] + ']';
        entryDiv.appendChild(label);

        // Content
        if (entry.node && entry.node.html) {
            var content = document.createElement('div');
            content.className = 'ref-content ref-type-' + (entry.node.type || entry.outcome.name.toLowerCase());
            content.innerHTML = sanitizeHtml(entry.node.html);
            entryDiv.appendChild(content);
        } else {
            var redacted = document.createElement('div');
            redacted.className = 'ref-content ref-redacted';
            redacted.textContent = '[FRAGMENT MISSING FROM RECORD]';
            entryDiv.appendChild(redacted);
        }

        // Separator (except after last entry)
        if (idx < scrambled.length - 1) {
            var sep = document.createElement('hr');
            sep.className = 'ref-separator';
            entryDiv.appendChild(sep);
        }

        page = appendWithOverflow(page, entryDiv);
    });

    addPageNumber(page, pageNum);
    return pagesCreated;
}

// -- Archive Pages --
function renderArchivePages(container, data, sectionKey, startPage) {
    var voice = data.voice || {};
    var archives = (data.story && data.story.archives) || {};
    var section = archives[sectionKey];
    if (!section) return 0;

    var pageNum = startPage;
    var pagesCreated = 0;

    var page = createPage();
    page.classList.add('archive-page');
    page.setAttribute('data-archive-section', sectionKey);
    container.appendChild(page);
    pageNum++;
    pagesCreated++;

    // Build clock-to-section map for trigger labeling
    var mech = data.mechanics || {};
    var triggerClock = null;
    if (mech.clocks) {
        mech.clocks.forEach(function (c) {
            if (c.onTrigger && c.onTrigger.section === sectionKey) {
                triggerClock = c;
            }
        });
    }

    // Trigger label: tells the player what unlocks this archive
    if (triggerClock) {
        var triggerLabel = document.createElement('div');
        triggerLabel.className = 'archive-trigger-label';
        var triggerVerb = triggerClock.direction === 'drain' ? 'empties' : 'fills';
        triggerLabel.textContent = 'Read when ' + triggerClock.name + ' ' + triggerVerb;
        page.appendChild(triggerLabel);
    }

    // Classification
    var classKey = sectionKey;
    var classText = (voice.classifications && voice.classifications[classKey]) || sectionKey.toUpperCase();
    var classification = document.createElement('div');
    classification.className = 'classification';
    classification.textContent = classText;
    page.appendChild(classification);

    // Section title
    var archiveVoice = voice.archive || {};
    var sectionTitle = archiveVoice[sectionKey + 'Title'] || sectionKey.toUpperCase();
    var h1 = document.createElement('h1');
    h1.textContent = sectionTitle;
    page.appendChild(h1);

    // Section intro
    var sectionIntro = archiveVoice[sectionKey + 'Intro'];
    if (sectionIntro) {
        var intro = document.createElement('div');
        intro.className = 'archive-intro';
        intro.innerHTML = sanitizeHtml(sectionIntro);
        page.appendChild(intro);
    }

    // Render each node according to format
    var format = section.format || 'memo';
    var formatConfig = section.formatConfig || {};
    var nodes = section.nodes || [];

    if (nodes.length === 0) {
        var missingMsg = document.createElement('div');
        missingMsg.className = 'archive-node archive-error';
        missingMsg.textContent = '[ERROR: MISSING ARCHIVE SECTION: ' + sectionKey + ']';
        page.appendChild(missingMsg);
        addPageNumber(page, pageNum);
        return pagesCreated;
    }

    nodes.forEach(function (node) {
        var nodeDiv = renderArchiveNode(node, format, formatConfig);
        page.appendChild(nodeDiv);

        // Overflow
        if (page.scrollHeight > page.clientHeight) {
            page.removeChild(nodeDiv);
            addPageNumber(page, pageNum);
            pageNum++;
            pagesCreated++;
            page = createPage();
            page.classList.add('archive-page');
            container.appendChild(page);
            page.appendChild(nodeDiv);
        }
    });

    addPageNumber(page, pageNum);
    return pagesCreated;
}

function renderArchiveNode(node, format, config) {
    var div = document.createElement('div');
    div.className = 'archive-node archive-' + format;

    if (format === 'memo') {
        var fields = (config && config.fields) || ['TO', 'FROM', 'RE', 'REF'];
        var defaults = (config && config.defaults) || {};
        var header = document.createElement('div');
        header.className = 'memo-header';
        fields.forEach(function (f) {
            var line = document.createElement('div');
            line.className = 'memo-field';
            line.innerHTML = '<strong>' + escapeHtml(f) + ':</strong> ' + escapeHtml(defaults[f] || (f === 'RE' ? (node.title || '') : ''));
            header.appendChild(line);
        });
        div.appendChild(header);
        var body = document.createElement('div');
        body.className = 'memo-body';
        body.innerHTML = sanitizeHtml(node.html || '');
        div.appendChild(body);

    } else if (format === 'journal') {
        var dateH = document.createElement('div');
        dateH.className = 'journal-date';
        dateH.textContent = node.title || '';
        div.appendChild(dateH);
        var body = document.createElement('div');
        body.className = 'journal-body';
        body.innerHTML = sanitizeHtml(node.html || '');
        div.appendChild(body);

    } else if (format === 'transmission') {
        var channel = document.createElement('div');
        channel.className = 'transmission-channel';
        channel.textContent = (config && config.channel) || 'CH-00';
        div.appendChild(channel);
        var idLine = document.createElement('div');
        idLine.className = 'transmission-id';
        idLine.textContent = node.id || '';
        div.appendChild(idLine);
        var body = document.createElement('div');
        body.className = 'transmission-body';
        body.innerHTML = sanitizeHtml(node.html || '');
        div.appendChild(body);

    } else if (format === 'letter') {
        var fromLine = document.createElement('div');
        fromLine.className = 'letter-from';
        fromLine.textContent = node.from || node.title || '';
        div.appendChild(fromLine);
        var body = document.createElement('div');
        body.className = 'letter-body';
        body.innerHTML = sanitizeHtml(node.html || '');
        div.appendChild(body);

    } else if (format === 'clipping') {
        var headline = document.createElement('div');
        headline.className = 'clipping-headline';
        headline.textContent = node.title || '';
        div.appendChild(headline);
        var source = document.createElement('div');
        source.className = 'clipping-source';
        source.textContent = (config && config.source) || '';
        div.appendChild(source);
        var body = document.createElement('div');
        body.className = 'clipping-body';
        body.innerHTML = sanitizeHtml(node.html || '');
        div.appendChild(body);

    } else if (format === 'incident-report') {
        var severity = document.createElement('div');
        severity.className = 'ir-severity';
        severity.textContent = 'SEVERITY: ' + ((config && config.severityDefault) || 'STANDARD');
        div.appendChild(severity);
        var title = document.createElement('div');
        title.className = 'ir-title';
        title.textContent = node.title || node.id || '';
        div.appendChild(title);
        var body = document.createElement('div');
        body.className = 'ir-body';
        body.innerHTML = sanitizeHtml(node.html || '');
        div.appendChild(body);

    } else if (format === 'fragment-columns') {
        var title = document.createElement('div');
        title.className = 'fragment-columns-title';
        title.textContent = node.title || node.id || '';
        div.appendChild(title);
        var body = document.createElement('div');
        body.className = 'fragment-columns-body';
        body.innerHTML = sanitizeHtml(node.html || '');
        div.appendChild(body);

    } else {
        // Generic fallback
        if (node.title) {
            var t = document.createElement('div');
            t.className = 'archive-title';
            t.textContent = node.title;
            div.appendChild(t);
        }
        var body = document.createElement('div');
        body.className = 'archive-body';
        body.innerHTML = sanitizeHtml(node.html || '');
        div.appendChild(body);
    }

    return div;
}

// -- Endings Pages --
function renderEndingsPages(container, data, startPage) {
    var voice = data.voice || {};
    var endings = (data.story && data.story.endings) || [];
    var archiveVoice = voice.archive || {};
    var pageNum = startPage;
    var pagesCreated = 0;

    var page = createPage();
    page.classList.add('endings-page');
    container.appendChild(page);
    pageNum++;
    pagesCreated++;

    // Classification
    var classText = (voice.classifications && voice.classifications.endings) || 'ENDINGS';
    var classification = document.createElement('div');
    classification.className = 'classification';
    classification.textContent = classText;
    page.appendChild(classification);

    // Title
    var h1 = document.createElement('h1');
    h1.textContent = archiveVoice.endingsTitle || 'ENDINGS';
    page.appendChild(h1);

    // Trigger conditions
    if (archiveVoice.endingsTrigger) {
        var trigDiv = document.createElement('div');
        trigDiv.className = 'endings-trigger';
        var trigH = document.createElement('h2');
        trigH.textContent = archiveVoice.endingsTrigger.heading || 'WHEN TO READ';
        trigDiv.appendChild(trigH);
        if (archiveVoice.endingsTrigger.lines) {
            var trigList = document.createElement('ul');
            archiveVoice.endingsTrigger.lines.forEach(function (line) {
                var li = document.createElement('li');
                li.textContent = line;
                trigList.appendChild(li);
            });
            trigDiv.appendChild(trigList);
        }
        page.appendChild(trigDiv);
    }

    // Each ending
    endings.forEach(function (ending) {
        var endDiv = document.createElement('div');
        endDiv.className = 'ending-block';

        var endTitle = document.createElement('h2');
        endTitle.className = 'ending-title';
        endTitle.textContent = ending.title || ending.id || 'ENDING';
        endDiv.appendChild(endTitle);

        var endBody = document.createElement('div');
        endBody.className = 'ending-body';
        endBody.innerHTML = sanitizeHtml(ending.html || '');
        endDiv.appendChild(endBody);

        page.appendChild(endDiv);

        // Overflow
        if (page.scrollHeight > page.clientHeight) {
            page.removeChild(endDiv);
            addPageNumber(page, pageNum);
            pageNum++;
            pagesCreated++;
            page = createPage();
            page.classList.add('endings-page');
            container.appendChild(page);
            page.appendChild(endDiv);
        }
    });

    addPageNumber(page, pageNum);
    return pagesCreated;
}

// -- Evidence Pages --
function renderEvidencePages(container, data, startPage) {
    var voice = data.voice || {};
    var archiveVoice = voice.archive || {};
    var evidence = (data.story && data.story.evidence) || {};
    var tracks = (data.mechanics && data.mechanics.tracks) || [];
    var factionProgressTracks = tracks.filter(function (t) { return t.type === 'faction' || t.type === 'progress'; });

    if (factionProgressTracks.length === 0 || Object.keys(evidence).length === 0) return 0;

    var pageNum = startPage;
    var pagesCreated = 0;

    var page = createPage();
    page.classList.add('evidence-page');
    container.appendChild(page);
    pageNum++;
    pagesCreated++;

    // Classification
    var classText = (voice.classifications && voice.classifications.evidence) || '';
    if (classText) {
        var classification = document.createElement('div');
        classification.className = 'classification';
        classification.textContent = classText;
        page.appendChild(classification);
    }

    var h1 = document.createElement('h1');
    h1.textContent = archiveVoice.evidenceTitle || 'EVIDENCE LOG';
    page.appendChild(h1);

    if (archiveVoice.evidenceIntro) {
        var intro = document.createElement('div');
        intro.className = 'evidence-intro';
        intro.textContent = archiveVoice.evidenceIntro;
        page.appendChild(intro);
    }

    // Render chronologically
    var totalWeeks = (data.workout && data.workout.totalWeeks) || 0;
    for (var w = 1; w <= totalWeeks; w++) {
        var weekHeaderCreated = false;

        factionProgressTracks.forEach(function (track) {
            var nodeKey = 'ev-' + track.id + '-w' + w;
            var node = evidence[nodeKey];
            if (!node) return;

            if (!weekHeaderCreated) {
                var weekH = document.createElement('h2');
                weekH.className = 'evidence-week-header';
                weekH.textContent = 'WEEK ' + w;
                page.appendChild(weekH);
                weekHeaderCreated = true;
            }

            var nodeDiv = document.createElement('div');
            nodeDiv.className = 'evidence-node ref-type-' + (node.type || 'kinetic');

            var nodeHeader = document.createElement('div');
            nodeHeader.className = 'evidence-node-header';
            nodeHeader.innerHTML = '<span class="evidence-track-name">' + escapeHtml(track.name) + '</span> &mdash; <span class="evidence-node-id">[' + escapeHtml(nodeKey) + ']</span>';
            nodeDiv.appendChild(nodeHeader);

            var nodeBody = document.createElement('div');
            nodeBody.className = 'evidence-node-body';
            nodeBody.innerHTML = sanitizeHtml(node.html || '');
            nodeDiv.appendChild(nodeBody);

            page.appendChild(nodeDiv);

            // Overflow
            if (page.scrollHeight > page.clientHeight) {
                page.removeChild(nodeDiv);
                addPageNumber(page, pageNum);
                pageNum++;
                pagesCreated++;

                page = createPage();
                page.classList.add('evidence-page');
                container.appendChild(page);
                page.appendChild(nodeDiv);
            }
        });
    }

    addPageNumber(page, pageNum);
    return pagesCreated;
}

// -- Final Page --
function renderFinalPage(container, data, startPage) {
    var voice = data.voice || {};
    var meta = data.meta || {};
    var finalVoice = voice.finalPage || {};

    var page = createPage();
    page.classList.add('final-page');
    container.appendChild(page);

    if (finalVoice.heading) {
        var heading = document.createElement('div');
        heading.className = 'final-heading';
        heading.innerHTML = sanitizeHtml(finalVoice.heading);
        page.appendChild(heading);
    }

    if (finalVoice.subline) {
        var sub = document.createElement('div');
        sub.className = 'final-subline';
        sub.textContent = finalVoice.subline;
        page.appendChild(sub);
    }

    if (finalVoice.instruction) {
        var instr = document.createElement('div');
        instr.className = 'final-instruction';
        instr.textContent = finalVoice.instruction;
        page.appendChild(instr);
    }

    var footer = document.createElement('div');
    footer.className = 'final-footer';
    footer.innerHTML = '<div class="final-engine">Iron & Aether Engine v2</div>' +
        '<div class="final-note">Narrative, Mechanics, and Layout generated entirely by AI.</div>';
    page.appendChild(footer);

    return 1;
}

// Export for Node environments or attach to window in browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        escapeHtml,
        renderCoverPage, renderManualPages, renderTrackerSheet, renderSetupPage,
        renderEncounterSpread, renderRefPages, renderArchivePages, renderEndingsPages, renderEvidencePages, renderFinalPage
    };
} else {
    window.escapeHtml = escapeHtml;
    window.renderCoverPage = renderCoverPage;
    window.renderManualPages = renderManualPages;
    window.renderTrackerSheet = renderTrackerSheet;
    window.renderSetupPage = renderSetupPage;
    window.renderEncounterSpread = renderEncounterSpread;
    window.renderRefPages = renderRefPages;
    window.renderArchivePages = renderArchivePages;
    window.renderEndingsPages = renderEndingsPages;
    window.renderEvidencePages = renderEvidencePages;
    window.renderFinalPage = renderFinalPage;
}
