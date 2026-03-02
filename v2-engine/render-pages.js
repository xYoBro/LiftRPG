// ── Page-level renderers (structural pages) ─────────────────
//
// Cover, rules manual, tracker sheet, setup, endings, evidence, final.
// Each function creates complete booklet pages and returns the page count.
//
// Depends on: render-utils.js (all), render-primitives.js (tracker sheet)
//
// Exposed: window.renderCoverPage, window.renderManualPages,
//          window.renderTrackerSheet, window.renderSetupPage,
//          window.renderEndingsPages, window.renderEvidencePages,
//          window.renderFinalPage

// -- Cover Page --
// startPage accepted for signature consistency with box-packer dispatch;
// unused because the cover page intentionally has no page number.
function renderCoverPage(container, data, startPage) {
    var page = createPage('cover');
    page.classList.add('cover-layout');
    var voice = (data.voice && data.voice.cover) || {};
    var meta = data.meta || {};
    var theme = data.theme || {};

    // Classification stamp
    if (voice.classification) {
        var stamp = document.createElement('div');
        stamp.className = 'classification-stamp';
        stamp.textContent = decodeEntities(voice.classification);
        page.appendChild(stamp);
    }

    // Department
    if (voice.department) {
        var dept = document.createElement('div');
        dept.className = 'cover-department';
        dept.textContent = decodeEntities(voice.department);
        page.appendChild(dept);
    }

    // Cover image (base64/data URI — optional, for users with image AI)
    if (theme.art && theme.art.coverImage) {
        var imgWrap = document.createElement('div');
        imgWrap.className = 'cover-image';
        var img = document.createElement('img');
        img.src = theme.art.coverImage;
        img.alt = (meta.title || 'Cover art');
        imgWrap.appendChild(img);
        page.appendChild(imgWrap);
    }
    // Cover SVG art (fallback when no coverImage)
    else if (theme.art && theme.art.coverSvg) {
        var artWrap = document.createElement('div');
        artWrap.className = 'cover-art';
        artWrap.innerHTML = sanitizeSvg(theme.art.coverSvg);
        page.appendChild(artWrap);
    }

    // Title
    var title = document.createElement('div');
    title.className = 'cover-title';
    title.textContent = decodeEntities(meta.title || 'UNTITLED ZINE');
    page.appendChild(title);

    // Subject line
    if (voice.subjectLine) {
        var subj = document.createElement('div');
        subj.className = 'cover-subject';
        subj.textContent = decodeEntities(voice.subjectLine);
        page.appendChild(subj);
    }

    // Tagline
    if (voice.tagline) {
        var tag = document.createElement('div');
        tag.className = 'cover-tagline';
        tag.textContent = decodeEntities(voice.tagline);
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
    author.textContent = decodeEntities(meta.author || 'Iron & Aether Engine v2');
    page.appendChild(author);

    container.appendChild(page);
    return 1;
}

// -- Rules Manual Pages --
function renderManualPages(container, data, startPage) {
    var voice = (data.voice && data.voice.manual) || {};
    var sections = voice.sections || [];
    var pageNum = startPage;

    var page = createPage('rules-manual');
    container.appendChild(page);
    pageNum++;

    // Manual title
    var h1 = document.createElement('h1');
    h1.className = 'manual-title';
    h1.textContent = decodeEntities(voice.title || 'OPERATIONAL BRIEF');
    page.appendChild(h1);

    for (var i = 0; i < sections.length; i++) {
        var sec = sections[i];
        var block = document.createElement('div');
        block.className = 'manual-section';

        var heading = document.createElement('h2');
        heading.className = 'manual-heading';
        heading.textContent = decodeEntities(sec.heading || '');
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
            page = createPage('rules-manual');
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

    var page = createPage('tracker-sheet');
    page.classList.add('tracker-sheet');
    container.appendChild(page);

    var h1 = document.createElement('h1');
    h1.textContent = decodeEntities((voice.labels && voice.labels.mechanicsHeading) || 'CHARACTER DOSSIER');
    page.appendChild(h1);

    // Clocks
    if (mech.clocks && mech.clocks.length) {
        var clockSection = document.createElement('div');
        clockSection.className = 'tracker-section';
        var clockH = document.createElement('h2');
        clockH.textContent = decodeEntities((voice.labels && voice.labels.clocksHeading) || 'CLOCKS');
        clockSection.appendChild(clockH);

        mech.clocks.forEach(function (c) {
            var row = document.createElement('div');
            row.className = 'tracker-row';
            var label = document.createElement('span');
            label.className = 'tracker-label';
            label.textContent = decodeEntities(c.name);
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
            triggerDiv.textContent = decodeEntities(triggerText);
            clockSection.appendChild(triggerDiv);

            if (c.flavor) {
                var flav = document.createElement('div');
                flav.className = 'tracker-flavor';
                flav.textContent = decodeEntities(c.flavor);
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
            label.textContent = decodeEntities(t.name) + ' (' + t.type + ')';
            row.appendChild(label);
            trackSection.appendChild(row);

            if (t.type === 'tug') {
                trackSection.appendChild(renderTugOfWar({ size: t.size || 5, thresholds: t.thresholds }));
            } else if (t.type === 'heat') {
                trackSection.appendChild(renderHeatTrack({ size: t.size || 10, startValue: t.startValue, thresholds: t.thresholds }));
            } else if (t.type === 'faction') {
                trackSection.appendChild(renderFactionTrack({ size: t.size || 10, labels: [], standings: t.standings }));
            } else if (t.type === 'skill-tree') {
                trackSection.appendChild(renderSkillTree({ nodes: t.nodes || [] }));
            } else {
                trackSection.appendChild(renderProgressTrack({ size: t.size || 10, startValue: t.startValue, thresholds: t.thresholds }));
            }

            if (t.flavor) {
                var flav = document.createElement('div');
                flav.className = 'tracker-flavor';
                flav.textContent = decodeEntities(t.flavor);
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
        resH.textContent = decodeEntities((voice.labels && voice.labels.resourceHeading) || 'RESOURCES');
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
            effectLine.textContent = decodeEntities(cw.effect);
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
            var newPage = createPage('tracker-sheet');
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

    var page = createPage('setup');
    page.classList.add('setup-page');
    container.appendChild(page);

    var h1 = document.createElement('h1');
    h1.textContent = decodeEntities(setup.title || 'SETUP');
    page.appendChild(h1);

    if (setup.instructions) {
        var instr = document.createElement('p');
        instr.className = 'setup-instructions';
        instr.textContent = decodeEntities(setup.instructions);
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

// -- Endings Pages --
function renderEndingsPages(container, data, startPage) {
    var voice = data.voice || {};
    var endings = (data.story && data.story.endings) || [];
    var archiveVoice = voice.archive || {};
    var pageNum = startPage;
    var pagesCreated = 0;

    var page = createPage('endings');
    page.classList.add('endings-page');
    container.appendChild(page);
    pageNum++;
    pagesCreated++;

    // Classification
    var classText = (voice.classifications && voice.classifications.endings) || 'ENDINGS';
    var classification = document.createElement('div');
    classification.className = 'classification';
    classification.textContent = decodeEntities(classText);
    page.appendChild(classification);

    // Title
    var h1 = document.createElement('h1');
    h1.textContent = decodeEntities(archiveVoice.endingsTitle || 'ENDINGS');
    page.appendChild(h1);

    // Trigger conditions
    if (archiveVoice.endingsTrigger) {
        var trigDiv = document.createElement('div');
        trigDiv.className = 'endings-trigger';
        var trigH = document.createElement('h2');
        trigH.textContent = decodeEntities(archiveVoice.endingsTrigger.heading || 'WHEN TO READ');
        trigDiv.appendChild(trigH);
        if (archiveVoice.endingsTrigger.lines) {
            var trigList = document.createElement('ul');
            archiveVoice.endingsTrigger.lines.forEach(function (line) {
                var li = document.createElement('li');
                li.textContent = decodeEntities(line);
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
        endTitle.textContent = decodeEntities(ending.title || ending.id || 'ENDING');
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
            page = createPage('endings');
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

    var page = createPage('evidence');
    page.classList.add('evidence-page');
    container.appendChild(page);
    pageNum++;
    pagesCreated++;

    // Classification
    var classText = (voice.classifications && voice.classifications.evidence) || '';
    if (classText) {
        var classification = document.createElement('div');
        classification.className = 'classification';
        classification.textContent = decodeEntities(classText);
        page.appendChild(classification);
    }

    var h1 = document.createElement('h1');
    h1.textContent = decodeEntities(archiveVoice.evidenceTitle || 'EVIDENCE LOG');
    page.appendChild(h1);

    if (archiveVoice.evidenceIntro) {
        var refScheme = (data.story && data.story.refScheme) || { prefix: 'R', weekDigits: 1, sessionDigits: 1 };
        var introText = archiveVoice.evidenceIntro
            .replace(/\{\{prefix\}\}/g, refScheme.prefix)
            .replace(/\[\[prefix\]\]/g, refScheme.prefix);
        var intro = document.createElement('div');
        intro.className = 'evidence-intro';
        intro.textContent = decodeEntities(introText);
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

                page = createPage('evidence');
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
// startPage accepted for signature consistency with box-packer dispatch;
// unused because the final page intentionally has no page number.
function renderFinalPage(container, data, startPage) {
    var voice = data.voice || {};
    var meta = data.meta || {};
    var finalVoice = voice.finalPage || {};

    var page = createPage('final');
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
        sub.textContent = decodeEntities(finalVoice.subline);
        page.appendChild(sub);
    }

    if (finalVoice.instruction) {
        var instr = document.createElement('div');
        instr.className = 'final-instruction';
        instr.textContent = decodeEntities(finalVoice.instruction);
        page.appendChild(instr);
    }

    var footer = document.createElement('div');
    footer.className = 'final-footer';
    footer.innerHTML = '<div class="final-engine">Iron & Aether Engine v2</div>' +
        '<div class="final-note">Narrative, Mechanics, and Layout generated entirely by AI.</div>';
    page.appendChild(footer);

    return 1;
}

// Expose on window for cross-file access
window.renderCoverPage = renderCoverPage;
window.renderManualPages = renderManualPages;
window.renderTrackerSheet = renderTrackerSheet;
window.renderSetupPage = renderSetupPage;
window.renderEndingsPages = renderEndingsPages;
window.renderEvidencePages = renderEvidencePages;
window.renderFinalPage = renderFinalPage;
