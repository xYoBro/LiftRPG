// ── Narrative page renderers (REF + archives) ───────────────
//
// REF pages (scrambled paragraph-book layout) and archive pages
// (found documents in various formats).
//
// Depends on: render-utils.js (escapeHtml, sanitizeHtml, decodeEntities,
//             createPage, addPageNumber, toKebabClass)
//
// Exposed: window.renderRefPages, window.renderArchivePages

// -- Scramble branch nodes for paragraph-book layout --
// Ensures no two adjacent entries share the same encounter or outcome.
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

// -- REF Pages (scrambled paragraph book layout) --
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
        var p = createPage('ref');
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
    classification.textContent = decodeEntities(classText.replace(/\{\{week\}\}/g, week));
    page.appendChild(classification);

    // Ref page alert (unchanged)
    if (voice.refPageAlerts && voice.refPageAlerts[week]) {
        var rpAlert = voice.refPageAlerts[week];
        var rpDiv = document.createElement('div');
        rpDiv.className = 'ref-page-alert ref-alert-' + (rpAlert.type || 'note');
        rpDiv.textContent = decodeEntities(rpAlert.text || '');
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
            routerTitle.textContent = decodeEntities(enc.title);
            routerHeader.appendChild(routerTitle);
        }

        routerDiv.appendChild(routerHeader);

        if (routerNode && routerNode.html) {
            var routerContent = document.createElement('div');
            routerContent.className = 'ref-content ref-type-' + toKebabClass(routerNode.type || 'kinetic');
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
        label.textContent = decodeEntities(entry.outcome.name) + ' [' + entry.outcome.range[0] + '\u2013' + entry.outcome.range[1] + ']';
        entryDiv.appendChild(label);

        // Content
        if (entry.node && entry.node.html) {
            var content = document.createElement('div');
            content.className = 'ref-content ref-type-' + toKebabClass(entry.node.type || entry.outcome.name);
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

    var page = createPage('archive');
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
        triggerLabel.textContent = 'Read when ' + decodeEntities(triggerClock.name) + ' ' + triggerVerb;
        page.appendChild(triggerLabel);
    }

    // Classification
    var classKey = sectionKey;
    var classText = (voice.classifications && voice.classifications[classKey]) || sectionKey.toUpperCase();
    var classification = document.createElement('div');
    classification.className = 'classification';
    classification.textContent = decodeEntities(classText);
    page.appendChild(classification);

    // Section title
    var archiveVoice = voice.archive || {};
    var sectionTitle = archiveVoice[sectionKey + 'Title'] || sectionKey.toUpperCase();
    var h1 = document.createElement('h1');
    h1.textContent = decodeEntities(sectionTitle);
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
            page = createPage('archive');
            page.classList.add('archive-page');
            page.setAttribute('data-archive-section', sectionKey);
            container.appendChild(page);
            page.appendChild(nodeDiv);
        }
    });

    addPageNumber(page, pageNum);
    return pagesCreated;
}

// -- Archive Node Renderer (format dispatcher) --
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
        dateH.textContent = decodeEntities(node.title || '');
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
        idLine.textContent = decodeEntities(node.id || '');
        div.appendChild(idLine);
        var body = document.createElement('div');
        body.className = 'transmission-body';
        body.innerHTML = sanitizeHtml(node.html || '');
        div.appendChild(body);

    } else if (format === 'letter') {
        var fromLine = document.createElement('div');
        fromLine.className = 'letter-from';
        fromLine.textContent = decodeEntities(node.from || node.title || '');
        div.appendChild(fromLine);
        var body = document.createElement('div');
        body.className = 'letter-body';
        body.innerHTML = sanitizeHtml(node.html || '');
        div.appendChild(body);

    } else if (format === 'clipping') {
        var headline = document.createElement('div');
        headline.className = 'clipping-headline';
        headline.textContent = decodeEntities(node.title || '');
        div.appendChild(headline);
        var source = document.createElement('div');
        source.className = 'clipping-source';
        source.textContent = decodeEntities((config && config.source) || '');
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
        title.textContent = decodeEntities(node.title || node.id || '');
        div.appendChild(title);
        var body = document.createElement('div');
        body.className = 'ir-body';
        body.innerHTML = sanitizeHtml(node.html || '');
        div.appendChild(body);

    } else if (format === 'fragment-columns') {
        var title = document.createElement('div');
        title.className = 'fragment-columns-title';
        title.textContent = decodeEntities(node.title || node.id || '');
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
            t.textContent = decodeEntities(node.title);
            div.appendChild(t);
        }
        var body = document.createElement('div');
        body.className = 'archive-body';
        body.innerHTML = sanitizeHtml(node.html || '');
        div.appendChild(body);
    }

    return div;
}

// Expose on window for cross-file access
window.renderRefPages = renderRefPages;
window.renderArchivePages = renderArchivePages;
window.renderArchiveNode = renderArchiveNode;
window.scrambleBranches = scrambleBranches;
