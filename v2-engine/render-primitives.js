// ── Primitive component renderers (tracker widgets) ──────────
//
// Reusable tracker/clock/track widgets used by page-level renderers.
// Each function returns a DOM element — no page structure knowledge.
//
// Depends on: render-utils.js (escapeHtml, decodeEntities)
//
// Exposed: window.renderClock, window.renderTugOfWar,
//          window.renderProgressTrack, window.renderHeatTrack,
//          window.renderSkillTree, window.renderFactionTrack

// 3A/3B: Fill & Drain Clocks — SVG pie-wedge circles (Blades in the Dark style)
function renderClock(params) {
    var size = params.size || 6;
    var svgNS = 'http://www.w3.org/2000/svg';
    var dim = 40;
    var cx = dim / 2, cy = dim / 2;
    var r = 17;

    var container = document.createElement('div');
    container.className = 'clock-container';

    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + dim + ' ' + dim);
    svg.setAttribute('class', 'clock-svg');

    // Outer circle
    var circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', String(cx));
    circle.setAttribute('cy', String(cy));
    circle.setAttribute('r', String(r));
    svg.appendChild(circle);

    // Wedge divider lines from center to circumference
    for (var i = 0; i < size; i++) {
        var angle = (2 * Math.PI * i / size) - Math.PI / 2;
        var x2 = cx + r * Math.cos(angle);
        var y2 = cy + r * Math.sin(angle);
        var line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', String(cx));
        line.setAttribute('y1', String(cy));
        line.setAttribute('x2', String(x2.toFixed(1)));
        line.setAttribute('y2', String(y2.toFixed(1)));
        svg.appendChild(line);
    }

    // Center dot
    var dot = document.createElementNS(svgNS, 'circle');
    dot.setAttribute('cx', String(cx));
    dot.setAttribute('cy', String(cy));
    dot.setAttribute('r', '2');
    svg.appendChild(dot);

    container.appendChild(svg);
    return container;
}

// 3C: Tug-of-War Track — visual scale with directional pull
function renderTugOfWar(params) {
    var size = params.size || 5;
    var thresholds = params.thresholds || [];
    var container = document.createElement('div');
    container.className = 'tug-container';

    var sortedTh = thresholds.slice().sort(function (a, b) { return a.value - b.value; });
    var leftTh = sortedTh.length > 0 ? sortedTh[0] : null;
    var rightTh = sortedTh.length > 0 ? sortedTh[sortedTh.length - 1] : null;

    // Left faction label with directional arrow
    if (leftTh) {
        var leftLabel = document.createElement('span');
        leftLabel.className = 'tug-label tug-label-left';
        leftLabel.textContent = '\u25C4 ' + decodeEntities(leftTh.effect);
        container.appendChild(leftLabel);
    }

    var track = document.createElement('div');
    track.className = 'tug-track';

    var thresholdMap = {};
    thresholds.forEach(function (th) {
        thresholdMap[th.value] = th.effect;
    });

    for (var i = -size; i <= size; i++) {
        var boxWrap = document.createElement('div');
        boxWrap.className = 'tug-box-wrapper';

        var box = document.createElement('div');
        box.className = 'tug-box' + (i === 0 ? ' tug-center' : '');
        // Only show number on center and threshold cells for cleaner look
        if (i === 0 || thresholdMap[i]) {
            box.textContent = i;
        }

        if (thresholdMap[i]) {
            box.classList.add('tug-threshold');
        }

        boxWrap.appendChild(box);

        // Intermediate threshold labels (skip endpoints)
        if (thresholdMap[i] && (!leftTh || leftTh.value !== i) && (!rightTh || rightTh.value !== i)) {
            var label = document.createElement('div');
            label.className = 'threshold-label tug-inter-label';
            label.textContent = decodeEntities(thresholdMap[i]);
            boxWrap.appendChild(label);
        }

        track.appendChild(boxWrap);
    }
    container.appendChild(track);

    // Right faction label with directional arrow
    if (rightTh && leftTh !== rightTh) {
        var rightLabel = document.createElement('span');
        rightLabel.className = 'tug-label tug-label-right';
        rightLabel.textContent = decodeEntities(rightTh.effect) + ' \u25BA';
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

        var box = document.createElement('div');
        box.className = 'progress-box';

        if (i <= startValue) {
            box.classList.add('progress-box-filled');
        }

        if (thresholdMap[i]) {
            box.classList.add('progress-box-threshold');
        }

        boxWrap.appendChild(box);

        if (thresholdMap[i]) {
            var label = document.createElement('div');
            label.className = 'threshold-label';
            label.textContent = decodeEntities(thresholdMap[i]);
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

// 3E: Heat / Threat Counter — ominous rising gauge
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
    var thresholdValues = [];
    thresholds.forEach(function (th) {
        thresholdMap[th.value] = th.effect;
        thresholdValues.push(th.value);
    });

    for (var i = 1; i <= size; i++) {
        var box = document.createElement('div');
        box.className = 'heat-box';
        box.textContent = i;

        if (i <= startValue) {
            box.classList.add('heat-box-filled');
        }

        if (thresholdMap[i]) {
            box.classList.add('heat-box-threshold');
        }

        // Danger zone: cells at or past the highest threshold get heavier treatment
        var maxThreshold = thresholdValues.length ? Math.max.apply(null, thresholdValues) : size;
        if (i >= maxThreshold) {
            box.classList.add('heat-box-danger');
        }

        boxRow.appendChild(box);
    }
    outer.appendChild(boxRow);

    // Threshold descriptions below the track
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
            desc.appendChild(document.createTextNode(' ' + decodeEntities(th.effect)));
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
        label.textContent = decodeEntities((node.name || '') + ' (cost: ' + (node.cost || 0) + ')');
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

        var box = document.createElement('div');
        box.className = 'faction-box';
        box.textContent = i;
        boxWrap.appendChild(box);

        if (labelMap[i]) {
            var label = document.createElement('div');
            label.className = 'faction-label';
            label.textContent = decodeEntities(labelMap[i]);
            boxWrap.appendChild(label);
        }

        track.appendChild(boxWrap);
    }
    container.appendChild(track);

    return container;
}

// Expose on window for cross-file access
window.renderClock = renderClock;
window.renderTugOfWar = renderTugOfWar;
window.renderProgressTrack = renderProgressTrack;
window.renderHeatTrack = renderHeatTrack;
window.renderSkillTree = renderSkillTree;
window.renderFactionTrack = renderFactionTrack;
