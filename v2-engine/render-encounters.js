// ── Encounter spread renderer + map renderers ───────────────
//
// Weekly 2-page spreads: HUD (left) + session log (right).
// Includes all 3 map type renderers (facility grid, point-to-point, linear).
//
// Depends on: render-utils.js (all), render-primitives.js (renderClock,
//             renderHeatTrack, renderTugOfWar for HUD mini-trackers)
//
// Exposed: window.renderEncounterSpread

// -- Encounter Spread (1-2 pages per week) --
function renderEncounterSpread(container, data, week, startPage) {
    var workout = data.workout || {};
    var mech = data.mechanics || {};
    var voice = data.voice || {};
    var encounters = (data.story && data.story.encounters) || [];
    var weekEncounters = encounters.filter(function (e) { return e.week === week; });
    var pageNum = startPage;
    var pagesCreated = 0;

    // Determine visual weight for this week's encounters
    var weekVisualWeight = 'standard';
    if (weekEncounters.length) {
        // Use the heaviest visualWeight among this week's encounters
        var weights = { 'sparse': 0, 'standard': 1, 'dense': 2, 'crisis': 3 };
        weekEncounters.forEach(function (enc) {
            var w = enc.visualWeight || 'standard';
            if ((weights[w] || 0) > (weights[weekVisualWeight] || 0)) weekVisualWeight = w;
        });
    }

    // -- LEFT PAGE: HUD --
    pageNum++;
    pagesCreated++;
    var hudPage = createPage('encounter-hud');
    hudPage.classList.add('encounter-hud');
    hudPage.dataset.week = week;
    hudPage.dataset.visualWeight = weekVisualWeight;
    container.appendChild(hudPage);

    // Week header / classification
    var weekClassification = document.createElement('div');
    weekClassification.className = 'classification';
    var classText = (voice.classifications && voice.classifications.sessionLog) || 'WEEK {{week}}';
    weekClassification.textContent = decodeEntities(classText.replace(/\{\{week\}\}/g, week));
    hudPage.appendChild(weekClassification);

    // Progress indicator
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

    if (voice.weekBosses && voice.weekBosses[week]) {
        var bossAlert = voice.weekBosses[week];
        if (bossAlert.alert) {
            var bossAlertDiv = document.createElement('div');
            bossAlertDiv.className = 'week-alert week-alert-boss';
            bossAlertDiv.textContent = decodeEntities(bossAlert.alert);
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
        mapTitle.textContent = decodeEntities(mapTitleText.replace(/\{\{week\}\}/g, week));
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
        diceLabel.textContent = decodeEntities((voice.hud && voice.hud.diceLabel) || 'DICE RESOLUTION');
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
            dtBody.appendChild(tr);
        });
        diceTable.appendChild(dtBody);
        diceDiv.appendChild(diceTable);

        if (voice.hud && voice.hud.diceNote) {
            var dn = document.createElement('div');
            dn.className = 'hud-dice-note';
            dn.textContent = decodeEntities(voice.hud.diceNote);
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
                if (t.type === 'heat' || t.type === 'tug') {
                    var row = document.createElement('div');
                    row.className = 'hud-tracker-row';
                    row.style.marginTop = '4px';
                    var lbl = document.createElement('span');
                    lbl.className = 'hud-tracker-name';
                    lbl.textContent = decodeEntities(t.name);
                    row.appendChild(lbl);

                    // Render tracks at native size (HUD sizing handled by CSS)
                    if (t.type === 'heat') {
                        var heat = renderHeatTrack({ size: t.size || 10, startValue: t.startValue, thresholds: t.thresholds, compact: true });
                        row.appendChild(heat);
                    } else if (t.type === 'tug') {
                        var tug = renderTugOfWar({ size: t.size || 5, thresholds: t.thresholds });
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
    var logPage = createPage('encounter-log');
    logPage.classList.add('encounter-log');
    logPage.dataset.week = week;
    logPage.dataset.visualWeight = weekVisualWeight;
    container.appendChild(logPage);

    var logClassification = document.createElement('div');
    logClassification.className = 'classification';
    var logClassText = (voice.classifications && voice.classifications.operationsLog) || 'OPERATIONS — WEEK {{week}}';
    logClassification.textContent = decodeEntities(logClassText.replace(/\{\{week\}\}/g, week));
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
        var dayLabel = decodeEntities((voice.weekPage && voice.weekPage.sessions && voice.weekPage.sessions[enc.day]) || ('SESSION ' + enc.day));
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
                    bossTitle.textContent = decodeEntities(enc.bossRules.title);
                    bossBox.appendChild(bossTitle);
                }

                if (enc.bossRules.preamble) {
                    var bossPreamble = document.createElement('div');
                    bossPreamble.className = 'boss-rules-preamble';
                    bossPreamble.textContent = decodeEntities(enc.bossRules.preamble);
                    bossBox.appendChild(bossPreamble);
                }

                if (enc.bossRules.steps && enc.bossRules.steps.length) {
                    var bossSteps = document.createElement('ol');
                    bossSteps.className = 'boss-rules-steps';
                    enc.bossRules.steps.forEach(function (step) {
                        var li = document.createElement('li');
                        li.textContent = decodeEntities(step);
                        bossSteps.appendChild(li);
                    });
                    bossBox.appendChild(bossSteps);
                }

                if (enc.bossRules.stakes) {
                    var bossStakes = document.createElement('div');
                    bossStakes.className = 'boss-rules-stakes';
                    bossStakes.textContent = decodeEntities(enc.bossRules.stakes);
                    bossBox.appendChild(bossStakes);
                }

                sessionDiv.appendChild(bossBox);
            }
        }

        // Rest encounter rendering — visual breathing room
        if (enc.special === 'rest') {
            sessionDiv.classList.add('session-rest');
        }

        // Branch encounter rendering — player choice presentation
        if (enc.special === 'branch') {
            sessionDiv.classList.add('session-branch');

            // If encounter has options array, render as player choices
            if (enc.options && enc.options.length) {
                var choiceBox = document.createElement('div');
                choiceBox.className = 'branch-choice-box';

                enc.options.forEach(function (opt) {
                    var choiceLine = document.createElement('div');
                    choiceLine.className = 'branch-choice';
                    var choiceLabel = document.createElement('span');
                    choiceLabel.className = 'branch-choice-label';
                    choiceLabel.textContent = decodeEntities(opt.label || '');
                    choiceLine.appendChild(choiceLabel);
                    if (opt.ref) {
                        var choiceRef = document.createElement('span');
                        choiceRef.className = 'branch-choice-ref';
                        choiceRef.textContent = opt.ref;
                        choiceLine.appendChild(choiceRef);
                    }
                    if (opt.cost) {
                        var choiceCost = document.createElement('span');
                        choiceCost.className = 'branch-choice-cost';
                        choiceCost.textContent = decodeEntities(opt.cost);
                        choiceLine.appendChild(choiceCost);
                    }
                    choiceBox.appendChild(choiceLine);
                });

                sessionDiv.appendChild(choiceBox);
            }
        }

        // Conditional instructions — printed "IF tracker state, THEN action" blocks
        if (enc.conditionalInstructions && enc.conditionalInstructions.length) {
            enc.conditionalInstructions.forEach(function (ci) {
                var ciDiv = document.createElement('div');
                ciDiv.className = 'conditional-instruction conditional-' + (ci.style || 'default');
                ciDiv.textContent = decodeEntities(ci.instruction || '');
                sessionDiv.appendChild(ciDiv);
            });
        }

        // Marginalia — sidebar flavor text / margin annotations
        if (enc.marginalia) {
            var margDiv = document.createElement('div');
            margDiv.className = 'encounter-marginalia';
            margDiv.textContent = decodeEntities(enc.marginalia);
            sessionDiv.appendChild(margDiv);
        }

        // Find matching session type for workout log
        var sType = sessionTypes.find(function (st) {
            return st.days && st.days.indexOf(enc.day) !== -1;
        });
        if (sType && sType.exercises) {
            var intensity = (workout.weekIntensities && workout.weekIntensities[week - 1]) || '';
            var isConditioning = sType.category === 'conditioning';

            // Intensity label: only meaningful for lifting sessions
            if (intensity && !isConditioning) {
                var intDiv = document.createElement('div');
                intDiv.className = 'session-intensity';
                intDiv.textContent = 'INTENSITY: ' + decodeEntities(intensity) + (workout.intensityUnit ? ' ' + decodeEntities(workout.intensityUnit) : '');
                sessionDiv.appendChild(intDiv);
            }
            // For conditioning: show protocol label if one is defined
            if (isConditioning && sType.protocol) {
                var condDiv = document.createElement('div');
                condDiv.className = 'session-intensity';
                condDiv.textContent = 'PROTOCOL: ' + decodeEntities(sType.protocol);
                sessionDiv.appendChild(condDiv);
            }

            var logTable = document.createElement('table');
            logTable.className = 'workout-log-table' + (isConditioning ? ' conditioning-log-table' : '');
            var lHead = document.createElement('thead');
            var lHr = document.createElement('tr');

            // Column 1: exercise name
            var lth1 = document.createElement('th');
            lth1.textContent = decodeEntities((voice.labels && voice.labels.liftColumn) || (isConditioning ? 'EXERCISE' : 'LIFT'));
            lHr.appendChild(lth1);

            // Column 2: weight (lifting only — conditioning has no 1RM percentage)
            if (!isConditioning) {
                var lth2 = document.createElement('th');
                lth2.textContent = decodeEntities((voice.labels && voice.labels.weightColumn) || workout.weightColumnLabel || 'WEIGHT');
                lHr.appendChild(lth2);
            }

            // Column 3: sets/rounds
            var lth3 = document.createElement('th');
            lth3.textContent = isConditioning ? (sType.protocol ? 'PROTOCOL' : 'ROUNDS') : 'SETS';
            lHr.appendChild(lth3);
            lHead.appendChild(lHr);
            logTable.appendChild(lHead);

            var lBody = document.createElement('tbody');
            sType.exercises.forEach(function (ex) {
                var tr = document.createElement('tr');
                var tdName = document.createElement('td');
                tdName.className = 'workout-log-name';

                if (isConditioning) {
                    // Conditioning: name only — rounds shown in dedicated column
                    tdName.textContent = decodeEntities(ex.name);
                } else {
                    // Lifting: name + reps in parens
                    var repsStr = String(ex.reps);
                    if (repsStr.length > 20) {
                        console.warn('Oversized reps string detected in ' + ex.name + ' (truncating):', repsStr);
                        repsStr = repsStr.substring(0, 15) + '...';
                    }
                    tdName.textContent = decodeEntities(ex.name) + ' (' + repsStr + ')';
                }
                tr.appendChild(tdName);

                if (!isConditioning) {
                    // Lifting: weight input cell with burden-hint
                    var tdWeight = document.createElement('td');
                    tdWeight.className = 'setup-input-cell';
                    if (intensity) {
                        var hint = document.createElement('span');
                        hint.className = 'burden-hint';
                        hint.textContent = intensity + (workout.intensityUnit ? ' ' + workout.intensityUnit : '');
                        tdWeight.appendChild(hint);
                    }
                    tr.appendChild(tdWeight);
                }

                var tdSets = document.createElement('td');
                if (isConditioning) {
                    // Conditioning: show rounds/reps as plain text (no checkboxes — the player just does the rounds)
                    tdSets.className = 'workout-log-rounds';
                    var roundsText = ex.rounds ? String(ex.rounds)
                        : (sType.rounds ? String(sType.rounds)
                            : (ex.reps !== undefined ? String(ex.reps) : '—'));
                    tdSets.textContent = decodeEntities(roundsText);
                } else {
                    // Lifting: render set checkboxes
                    tdSets.className = 'workout-log-sets';
                    var setContainer = document.createElement('div');
                    setContainer.className = 'workout-log-set-container';
                    for (var s = 0; s < (ex.sets || 1); s++) {
                        var box = document.createElement('div');
                        box.className = 'workout-log-box';
                        setContainer.appendChild(box);
                    }
                    tdSets.appendChild(setContainer);
                }
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
            line.textContent = decodeEntities(q);
            checkinDiv.appendChild(line);
        });
        logPage.appendChild(checkinDiv);
    }

    // Overflow: if content exceeds log page, split iteratively
    var logPages = [logPage];
    var currentPageIndex = 0;

    while (logPages[currentPageIndex].scrollHeight > logPages[currentPageIndex].clientHeight) {
        var currPage = logPages[currentPageIndex];
        if (currPage.clientHeight === 0) break;

        // Find the last section
        var blocks = currPage.querySelectorAll('.session-block, .week-checkin');
        if (blocks.length <= 1) {
            // Can't split further, a single block is larger than the page
            console.warn('CONTENT OVERFLOW: A single session block is taller than the page. Regenerate with shorter exercise data to fix.');
            var overflowWarn = document.createElement('div');
            overflowWarn.className = 'content-overflow-warning';
            overflowWarn.textContent = '[CONTENT OVERFLOW — REGENERATE WITH SHORTER EXERCISE DATA]';
            currPage.appendChild(overflowWarn);
            break;
        }
        var lastBlock = blocks[blocks.length - 1];

        // Ensure there is a next page
        if (logPages.length <= currentPageIndex + 1) {
            var newPage = createPage('encounter-log');
            newPage.classList.add('encounter-log');
            container.appendChild(newPage);
            if (logPage.dataset.week) newPage.dataset.week = logPage.dataset.week;
            if (logPage.dataset.visualWeight) newPage.dataset.visualWeight = logPage.dataset.visualWeight;
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
    container.dataset.week = week;

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
        div.textContent = decodeEntities(weekData.divider);
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
    var nodeCount = visibleLocs.length;

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
    svg.setAttribute('data-week', week);
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
        text.textContent = decodeEntities(labelText);
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
    container.dataset.week = week;

    for (var i = 0; i < size; i++) {
        var box = document.createElement('div');
        box.className = 'linear-track-cell';
        if (i === position) box.classList.add('linear-player');
        if (labels[i]) {
            var lbl = document.createElement('div');
            lbl.className = 'linear-label';
            lbl.textContent = decodeEntities(labels[i]);
            box.appendChild(lbl);
        }
        container.appendChild(box);
    }
    return container;
}

// Expose on window for cross-file access
window.renderEncounterSpread = renderEncounterSpread;
window.renderFacilityGrid = renderFacilityGrid;
window.renderPtpMapWeek = renderPtpMapWeek;
window.renderLinearTrackWeek = renderLinearTrackWeek;
