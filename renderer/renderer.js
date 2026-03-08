/* ══════════════════════════════════════════════════════════════
   LIFTRPG BOOKLET RENDERER v1.0
   Reads schema v1.3 JSON → produces printable DOM pages.
   Browser-native JS. No build step.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ── UTILITIES ──────────────────────────────────────────────

  function esc(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  /**
   * Create a DOM element with optional class and content.
   * CAUTION: string `content` is set via innerHTML — only pass
   * developer-controlled literal strings here. For LLM-generated text,
   * use txt() which uses safe textContent.
   */
  function el(tag, className, content) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (typeof content === 'string') {
      e.innerHTML = content;
    } else if (content && content.nodeType) {
      e.appendChild(content);
    } else if (Array.isArray(content)) {
      content.forEach(function (c) {
        if (c && c.nodeType) e.appendChild(c);
        else if (typeof c === 'string') e.innerHTML += c;
      });
    }
    return e;
  }

  /** Shorthand: create element with text content (safe) */
  function txt(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = String(text);
    return e;
  }

  /** Create a booklet page shell */
  function page(type) {
    var p = document.createElement('div');
    p.className = 'booklet-page';
    p.setAttribute('data-page-type', type);
    return p;
  }

  /** Card density tier based on exercise count */
  function cardDensity(exerciseCount) {
    if (exerciseCount >= 8) return 'density-ultra';
    if (exerciseCount >= 6) return 'density-dense';
    if (exerciseCount >= 4) return 'density-compact';
    return '';
  }

  /**
   * Auto-fit text to a single line by scaling font-size up to maxPt.
   * Element must have white-space: nowrap in CSS.
   * Reusable for any single-line label (designation, badge, header).
   */
  function fitTextToLine(element, maxPt) {
    if (!element || !element.parentNode) return;
    maxPt = maxPt || 10;
    var container = element.parentNode;
    var available = container.clientWidth - (parseFloat(getComputedStyle(container).paddingLeft) || 0)
                  - (parseFloat(getComputedStyle(container).paddingRight) || 0);
    // Binary search for largest font size that fits
    var lo = 4, hi = maxPt;
    while (hi - lo > 0.25) {
      var mid = (lo + hi) / 2;
      element.style.fontSize = mid + 'pt';
      if (element.scrollWidth > available) {
        hi = mid;
      } else {
        lo = mid;
      }
    }
    element.style.fontSize = lo + 'pt';
  }

  /** Mix two hex colors (a → b) by ratio t (0 = pure a, 1 = pure b) */
  function mixHex(a, b, t) {
    var pa = parseInt(a.replace('#', ''), 16);
    var pb = parseInt(b.replace('#', ''), 16);
    var r = Math.round(((pa >> 16) & 0xff) * (1 - t) + ((pb >> 16) & 0xff) * t);
    var g = Math.round(((pa >> 8) & 0xff) * (1 - t) + ((pb >> 8) & 0xff) * t);
    var bl = Math.round((pa & 0xff) * (1 - t) + (pb & 0xff) * t);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  }

  /** Parse multiline cipher text into structured sections */
  function parseCipherDisplay(displayText) {
    if (!displayText) return { lines: [] };
    return { lines: displayText.split('\n').filter(function (l) { return l.trim(); }) };
  }

  // ── LABELS ──────────────────────────────────────────────────
  // Built once per render() from data.meta. Schema may override
  // defaults via data.meta.labels — if absent, neutral fallbacks
  // apply so any booklet renders correctly regardless of theme.
  function buildLabels(data) {
    var m = (data && data.meta) || {};
    var l = m.labels || {};
    return {
      blockTitle: m.blockTitle || 'Field Journal',
      fieldOpsHeader: l.fieldOpsHeader || 'Field Operations',
      finalSurveyHeader: l.finalSurveyHeader || 'Final Week',
      bossFallbackNarrative: l.bossFallbackNarrative || 'The final challenge awaits.',
      passwordAssemblyTitle: l.passwordAssemblyTitle || 'Password Record \u2014 Final Assembly',
      endingsFallbackTitle: l.endingsFallbackTitle || 'The Journey Is Complete',
      endingsFallbackBody: l.endingsFallbackBody ||
        'You have completed the program. Assemble your password components ' +
        'and return to liftrpg.co \u2192 Render to discover what awaits.',
    };
  }

  // ── PAGE RENDERERS ─────────────────────────────────────────

  // ═══ COVER ═══
  function renderCover(data) {
    var p = page('cover');
    var inner = el('div', 'cover-page');

    if (data.cover.designation) {
      var desig = txt('div', 'cover-designation', data.cover.designation);
      inner.appendChild(desig);
    }
    inner.appendChild(txt('h1', 'cover-title', data.meta.blockTitle));
    if (data.cover.tagline) {
      inner.appendChild(txt('div', 'cover-tagline', data.cover.tagline));
    }
    inner.appendChild(el('div', 'cover-rule'));

    var colophon = el('div', 'cover-colophon');
    if (data.cover.colophonLines && data.cover.colophonLines.length) {
      data.cover.colophonLines.forEach(function (line) {
        colophon.appendChild(txt('div', '', line));
      });
    }
    inner.appendChild(colophon);

    p.appendChild(inner);
    return p;
  }

  // ═══ RULES LEFT (Briefing Document) ═══
  function renderRulesLeft(data) {
    var p = page('rules-left');
    var inner = el('div', 'rules-left');

    // Header
    var header = el('div', 'rules-header');
    header.appendChild(txt('span', '', data.meta.blockTitle));
    header.appendChild(txt('span', 'page-num', ''));
    inner.appendChild(header);

    // Title
    if (data.rulesSpread.leftPage.title) {
      inner.appendChild(txt('h2', 'rules-title', data.rulesSpread.leftPage.title));
    }

    // Body content
    var body = el('div', 'rules-body');
    if (data.rulesSpread.leftPage.sections) {
      data.rulesSpread.leftPage.sections.forEach(function (section) {
        if (section.heading) {
          body.appendChild(txt('h3', '', section.heading));
        }
        var sectionBody = section.text || section.body || '';
        if (sectionBody) {
          sectionBody.split('\n').forEach(function (para) {
            if (para.trim()) body.appendChild(txt('p', '', para.trim()));
          });
        }
      });
    } else if (data.rulesSpread.leftPage.body) {
      data.rulesSpread.leftPage.body.split('\n').forEach(function (para) {
        if (para.trim()) body.appendChild(txt('p', '', para.trim()));
      });
    }
    inner.appendChild(body);

    p.appendChild(inner);
    return p;
  }

  // ═══ RULES RIGHT (Password Record Log) ═══
  function renderRulesRight(data) {
    var p = page('rules-right');
    var inner = el('div', 'rules-right');

    var title = data.rulesSpread.rightPage && data.rulesSpread.rightPage.title
      ? data.rulesSpread.rightPage.title
      : 'Survey Record';
    inner.appendChild(txt('div', 'password-log-title', title));

    var subtitle = data.rulesSpread.rightPage && data.rulesSpread.rightPage.instruction
      ? data.rulesSpread.rightPage.instruction
      : 'Record each week\'s component below. When all positions are filled, return to liftrpg.co \u2192 Render to unlock the ending.';
    inner.appendChild(txt('div', 'password-log-subtitle', subtitle));

    // One row per week
    var grid = el('div', 'password-log-grid');
    var weekCount = data.meta.weekCount || 6;
    for (var w = 1; w <= weekCount; w++) {
      var row = el('div', 'password-log-row');
      row.appendChild(txt('span', 'password-log-week', 'Week ' + (w < 10 ? '0' + w : w)));
      row.appendChild(el('div', 'password-log-box'));

      // Show extraction instruction if available
      var week = data.weeks[w - 1];
      if (week && week.weeklyComponent && week.weeklyComponent.extractionInstruction && !week.isBossWeek) {
        row.appendChild(txt('span', 'password-log-instruction', week.weeklyComponent.extractionInstruction));
      } else if (week && week.isBossWeek) {
        row.appendChild(txt('span', 'password-log-instruction', 'Boss convergence \u2014 see field operations'));
      }
      grid.appendChild(row);
    }
    inner.appendChild(grid);

    // Final password assembly
    var final_ = el('div', 'password-final');
    final_.appendChild(txt('div', 'password-final-label', 'Complete Password'));
    var boxes = el('div', 'password-final-boxes');
    var pwLen = data.meta.passwordPlaintext ? data.meta.passwordPlaintext.length : 10;
    for (var i = 0; i < pwLen; i++) {
      boxes.appendChild(el('div', 'password-final-box'));
    }
    final_.appendChild(boxes);
    inner.appendChild(final_);

    p.appendChild(inner);
    return p;
  }

  // ═══ WORKOUT LEFT (Session Cards) ═══
  function renderWorkoutLeft(week, weekNum, sessions, totalWeeks, isOverflow, labels) {
    var p = page('workout-left');
    var inner = el('div', 'workout-left');

    // Page header
    var hdr = el('div', 'page-header');
    hdr.appendChild(txt('span', '', labels.blockTitle));
    hdr.appendChild(txt('span', 'page-num', ''));
    inner.appendChild(hdr);

    // Overflow continuation note
    if (isOverflow) {
      var contNote = txt('div', 'overflow-header-note',
        'Week ' + (weekNum < 10 ? '0' + weekNum : weekNum) +
        ' \u00b7 Part 2 of 2 \u00b7 Sessions ' +
        (sessions[0].sessionNumber) + '\u2013' +
        (sessions[sessions.length - 1].sessionNumber) +
        ' \u00b7 continued');
      inner.appendChild(contNote);
    }

    // Week ID block
    var weekId = el('div', 'week-id');
    weekId.appendChild(txt('span', 'week-kicker',
      'Week ' + (weekNum < 10 ? '0' + weekNum : weekNum) + ' \u00b7'));
    weekId.appendChild(txt('span', 'week-title', week.title));
    if (week.epigraph && week.epigraph.text) {
      weekId.appendChild(txt('span', 'week-subtitle', week.epigraph.text));
    }
    inner.appendChild(weekId);

    // Week meta
    if (week.epigraph && week.epigraph.attribution) {
      inner.appendChild(txt('span', 'week-meta', week.epigraph.attribution));
    }

    // Session cards
    var cardsContainer = el('div', 'session-cards');
    sessions.forEach(function (session) {
      var maxExercises = Math.max.apply(null, sessions.map(function (s) { return s.exercises.length; }));
      var density = cardDensity(maxExercises);
      var card = el('div', 'session-card' + (density ? ' ' + density : ''));

      // Header
      card.appendChild(txt('div', 'session-header', session.label));

      // Story prompt
      if (session.storyPrompt) {
        card.appendChild(txt('div', 'story-prompt', session.storyPrompt));
      }

      // Fragment ref (after prompt)
      if (session.fragmentRef) {
        card.appendChild(txt('div', 'frag-ref', '\u2192 ' + session.fragmentRef));
      }

      // Binary choice (rare — one per block)
      if (session.binaryChoice) {
        var bc = el('div', 'binary-choice');
        bc.appendChild(txt('div', 'binary-choice-label', session.binaryChoice.choiceLabel));

        var optA = el('div', 'binary-choice-option');
        optA.appendChild(el('div', 'binary-choice-marker'));
        optA.appendChild(txt('span', 'binary-choice-text', session.binaryChoice.promptA));
        bc.appendChild(optA);

        var optB = el('div', 'binary-choice-option');
        optB.appendChild(el('div', 'binary-choice-marker'));
        optB.appendChild(txt('span', 'binary-choice-text', session.binaryChoice.promptB));
        bc.appendChild(optB);

        card.appendChild(bc);
      }

      // Exercise table
      var table = document.createElement('table');
      table.className = 'exercise-table';
      session.exercises.forEach(function (ex) {
        var tr = document.createElement('tr');

        // Name
        var tdName = document.createElement('td');
        tdName.className = 'exercise-name';
        tdName.textContent = ex.name;
        tr.appendChild(tdName);

        // Dots
        var tdDots = document.createElement('td');
        tdDots.innerHTML = '<div class="exercise-dots"></div>';
        tdDots.style.width = '100%';
        tdDots.style.paddingRight = '10px';
        tr.appendChild(tdDots);

        // Weight
        if (ex.weightField) {
          var tdWeightLine = document.createElement('td');
          tdWeightLine.style.verticalAlign = 'bottom';

          var faintText = typeof ex.weightField === 'string' ? ex.weightField : null;
          if (!faintText && ex.notes) {
            faintText = ex.notes;
          }

          var wLine = document.createElement('div');
          wLine.className = 'weight-line';
          if (faintText) wLine.textContent = faintText;
          else wLine.innerHTML = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
          tdWeightLine.appendChild(wLine);
          tr.appendChild(tdWeightLine);

          var tdWeightLabel = document.createElement('td');
          tdWeightLabel.style.verticalAlign = 'bottom';
          var wLabel = document.createElement('div');
          wLabel.className = 'weight-label';
          wLabel.innerHTML = 'lbs &times;';
          tdWeightLabel.appendChild(wLabel);
          tr.appendChild(tdWeightLabel);
        }

        // Rep boxes
        var tdReps = document.createElement('td');
        tdReps.style.verticalAlign = 'bottom';
        var repsDiv = document.createElement('div');
        repsDiv.className = 'rep-boxes';

        var sets = ex.sets || 3;
        var reps = ex.repsPerSet;
        if (typeof reps === 'number') {
          for (var s = 0; s < sets; s++) {
            var rBox = document.createElement('div');
            rBox.className = 'rep-box';
            rBox.textContent = String(reps);
            repsDiv.appendChild(rBox);
          }
        } else if (reps != null) {
          var numSets = typeof sets === 'number' ? sets : 1;
          for (var s2 = 0; s2 < numSets; s2++) {
            var rBoxString = document.createElement('div');
            rBoxString.className = 'rep-box';
            rBoxString.textContent = String(reps);
            if (String(reps).length > 2) {
              rBoxString.style.fontSize = '4.5pt';
            }
            repsDiv.appendChild(rBoxString);
          }
        }
        // else: repsPerSet is null/undefined — render no boxes (weight field still shows)
        tdReps.appendChild(repsDiv);
        tr.appendChild(tdReps);

        table.appendChild(tr);
      });
      card.appendChild(table);

      // Notes box (hidden in dense mode via CSS)
      var notesBox = el('div', 'notes-box');
      card.appendChild(notesBox);

      cardsContainer.appendChild(card);
    });
    inner.appendChild(cardsContainer);

    // Survey progress footer
    if (!isOverflow) {
      var footer = el('div', 'survey-footer');
      var pips = el('div', 'survey-pips');
      var tw = totalWeeks || 6;
      for (var pip = 1; pip <= tw; pip++) {
        var pipEl = el('div', 'survey-pip');
        if (pip < weekNum) pipEl.classList.add('filled');
        if (pip === weekNum) pipEl.classList.add('current');
        pips.appendChild(pipEl);
      }
      footer.appendChild(pips);
      footer.appendChild(txt('span', 'survey-footer-note',
        'Week ' + weekNum + ' of ' + tw));
      inner.appendChild(footer);
    }

    p.appendChild(inner);
    return p;
  }

  // ═══ MAP RENDERERS ═══════════════════════════════════════════════
  // Each map type is self-contained. Fix one without touching the others.
  // Guardrail constants at the top of each function.
  // Schema constraints live in generator.js SCHEMA_SPATIAL.

  function renderGridMap(container, mapState) {
    container.appendChild(txt('div', 'map-title', mapState.title || mapState.floorLabel || 'Floor Map'));

    if (!mapState.gridDimensions) return;

    var mapGrid = el('div', 'map-grid');
    var cols = mapState.gridDimensions.columns;
    var rows = mapState.gridDimensions.rows;
    mapGrid.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';

    // Build tile lookup
    var tileLookup = {};
    if (mapState.tiles) {
      mapState.tiles.forEach(function (tile) {
        tileLookup[tile.col + ',' + tile.row] = tile;
      });
    }

    for (var r = 1; r <= rows; r++) {
      for (var col = 1; col <= cols; col++) {
        var tile = tileLookup[col + ',' + r];
        var cell = el('div', 'map-cell');
        if (tile) {
          cell.classList.add(tile.type || 'empty');
          if (tile.label) cell.textContent = tile.label;
        } else {
          cell.classList.add('empty');
        }
        mapGrid.appendChild(cell);
      }
    }
    container.appendChild(mapGrid);

    // Annotations
    if (mapState.tiles) {
      mapState.tiles.forEach(function (tile) {
        if (tile.annotation) {
          container.appendChild(txt('div', 'map-annotation',
            (tile.label || '') + ': ' + tile.annotation));
        }
      });
    }

    // Map note
    if (mapState.mapNote) {
      container.appendChild(txt('div', 'map-note', mapState.mapNote));
    }
  }

  function renderPtpMap(container, mapState) {
    // ── PTP Guardrail Constants ──────────────────────────────
    // Adjust these to fix layout issues.
    // Schema constraints live in generator.js SCHEMA_SPATIAL.
    var MAX_NODES = 8;          // max visible — clamp, don't crash
    var FONT_SIZE = 5.5;        // pt — floor, never shrink below this
    var EDGE_FONT_SIZE = 4.5;   // pt — edge labels
    var NODE_R = 3;             // SVG units — node circle radius
    var PLAYER_R = 4.5;         // SVG units — current node radius
    var PLAYER_STROKE = 2.5;    // SVG units — double-ring stroke width
    var EDGE_W = 0.8;           // SVG units — edge stroke width
    var LABEL_GAP = 5;          // SVG units — node center to label baseline
    var VB_PAD = 12;            // SVG units — viewBox padding all sides
    // ─────────────────────────────────────────────────────────

    container.appendChild(txt('div', 'map-title', mapState.title || 'Location Map'));

    var nodes = (mapState.nodes || []).slice(0, MAX_NODES);
    var edges = mapState.edges || [];
    var currentNode = mapState.currentNode;

    if (nodes.length === 0) return;

    // Build node lookup
    var nodeLookup = {};
    nodes.forEach(function (n) { nodeLookup[n.id] = n; });

    // SVG — fixed viewBox, nodes at 0-100 map directly
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox',
      (0 - VB_PAD) + ' ' + (0 - VB_PAD) + ' ' +
      (100 + VB_PAD * 2) + ' ' + (100 + VB_PAD * 2));
    svg.setAttribute('class', 'ptp-map');
    svg.style.width = '100%';
    svg.style.maxHeight = '3.5in';

    // Draw edges first (behind nodes)
    edges.forEach(function (edge) {
      var from = nodeLookup[edge.from];
      var to = nodeLookup[edge.to];
      if (!from || !to) return;

      var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', from.x);
      line.setAttribute('y1', from.y);
      line.setAttribute('x2', to.x);
      line.setAttribute('y2', to.y);
      line.setAttribute('class', 'ptp-edge' +
        (edge.state === 'locked' ? ' ptp-edge-locked' : ''));
      svg.appendChild(line);

      // Optional edge label at midpoint
      if (edge.label) {
        var mx = (from.x + to.x) / 2;
        var my = (from.y + to.y) / 2;
        var elbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        elbl.setAttribute('x', mx);
        elbl.setAttribute('y', my - 2);
        elbl.setAttribute('text-anchor', 'middle');
        elbl.setAttribute('class', 'ptp-edge-label');
        elbl.textContent = (edge.label || '').substring(0, 10);
        svg.appendChild(elbl);
      }
    });

    // Track placed labels for collision detection
    var placedLabels = [];

    // Draw nodes
    nodes.forEach(function (node) {
      var isCurrent = node.id === currentNode;
      var isLocked = node.state === 'locked';
      var isAnomaly = node.state === 'anomaly';

      // Node circle
      var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', node.x);
      circle.setAttribute('cy', node.y);
      circle.setAttribute('r', isCurrent ? PLAYER_R : NODE_R);
      circle.setAttribute('class', 'ptp-node' +
        (isCurrent ? ' ptp-node-current' : '') +
        (isLocked ? ' ptp-node-locked' : '') +
        (isAnomaly ? ' ptp-node-anomaly' : ''));
      if (isCurrent) circle.setAttribute('stroke-width', PLAYER_STROKE);
      svg.appendChild(circle);

      // Label — always below node, centered
      var labelText = (node.label || node.id).substring(0, 14);
      var labelY = node.y + LABEL_GAP + NODE_R;
      var labelX = node.x;

      // Clamp inside viewBox
      var estHalfWidth = labelText.length * FONT_SIZE * 0.35;
      if (labelX - estHalfWidth < 0) labelX = estHalfWidth + 1;
      if (labelX + estHalfWidth > 100) labelX = 100 - estHalfWidth - 1;
      if (labelY > 100 + VB_PAD - 2) labelY = node.y - LABEL_GAP;

      // Collision check against placed labels
      var collides = false;
      for (var i = 0; i < placedLabels.length; i++) {
        var prev = placedLabels[i];
        if (Math.abs(labelX - prev.x) < (estHalfWidth + prev.hw) &&
            Math.abs(labelY - prev.y) < FONT_SIZE * 1.2) {
          collides = true;
          break;
        }
      }

      var lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lbl.setAttribute('x', labelX);
      lbl.setAttribute('y', labelY);
      lbl.setAttribute('text-anchor', 'middle');
      lbl.setAttribute('class', 'ptp-label' + (isLocked ? ' ptp-label-locked' : ''));

      if (collides) {
        // Collision fallback: numbered reference + legend below SVG
        var refNum = placedLabels.length + 1;
        lbl.textContent = '[' + refNum + ']';
        lbl._legendText = refNum + ': ' + labelText;
        placedLabels.push({ x: labelX, y: labelY, hw: FONT_SIZE * 1.2 });
      } else {
        lbl.textContent = labelText;
        placedLabels.push({ x: labelX, y: labelY, hw: estHalfWidth });
      }
      svg.appendChild(lbl);
    });

    container.appendChild(svg);

    // Render legend entries for collision-displaced labels
    svg.querySelectorAll('text.ptp-label').forEach(function (t) {
      if (t._legendText) {
        container.appendChild(txt('div', 'map-annotation', t._legendText));
      }
    });

    // Map note
    if (mapState.mapNote) {
      container.appendChild(txt('div', 'map-note', mapState.mapNote));
    }
  }

  function renderLinearTrack(container, mapState) {
    // ── Linear Track Constants ───────────────────────────────
    var MAX_POSITIONS = 12;
    var MIN_POSITIONS = 3;
    // ─────────────────────────────────────────────────────────

    container.appendChild(txt('div', 'map-title', mapState.title || 'Progress Track'));

    var positions = (mapState.positions || []).slice(0, MAX_POSITIONS);
    if (positions.length < MIN_POSITIONS) return;

    var isVertical = mapState.direction === 'vertical';
    var track = el('div', 'linear-track' + (isVertical ? ' linear-track-vertical' : ''));
    var currentPos = mapState.currentPosition;

    positions.forEach(function (pos, idx) {
      // Connector between positions (not before first)
      if (idx > 0) {
        track.appendChild(el('div', 'linear-connector'));
      }

      var posEl = el('div', 'linear-position');
      var state = pos.state || 'empty';
      if (pos.index === currentPos) state = 'current';
      posEl.classList.add(state);
      posEl.textContent = (pos.label || String(pos.index)).substring(0, 8);
      track.appendChild(posEl);
    });

    container.appendChild(track);

    // Annotations
    positions.forEach(function (pos) {
      if (pos.annotation) {
        container.appendChild(txt('div', 'map-annotation',
          (pos.label || String(pos.index)) + ': ' + pos.annotation));
      }
    });

    // Map note
    if (mapState.mapNote) {
      container.appendChild(txt('div', 'map-note', mapState.mapNote));
    }
  }

  function renderPlayerDrawn(container, mapState) {
    // ── Player-Drawn Constants ───────────────────────────────
    var MAX_PROMPTS = 4;
    var MAX_SEEDS = 3;
    // ─────────────────────────────────────────────────────────

    container.appendChild(txt('div', 'map-title', mapState.title || 'Survey Canvas'));

    var canvasType = mapState.canvasType || 'dot-grid';
    var dims = mapState.dimensions || { columns: 10, rows: 8 };
    var cols = Math.min(16, Math.max(8, dims.columns));
    var rows = Math.min(12, Math.max(6, dims.rows));

    // Seed marker annotations (listed above canvas for reference)
    var seeds = (mapState.seedMarkers || []).slice(0, MAX_SEEDS);
    if (seeds.length > 0) {
      seeds.forEach(function (seed) {
        container.appendChild(txt('div', 'map-annotation',
          '\u25CF ' + (seed.label || '').substring(0, 8) +
          ' \u2014 col ' + seed.col + ', row ' + seed.row));
      });
    }

    var canvas = el('div', 'canvas-container');

    if (canvasType === 'blank') {
      canvas.classList.add('canvas-blank');
      canvas.style.height = (rows * 14) + 'px';

    } else if (canvasType === 'graph-paper') {
      canvas.classList.add('canvas-graph');
      canvas.style.display = 'grid';
      canvas.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
      for (var gi = 0; gi < cols * rows; gi++) {
        canvas.appendChild(el('div', 'canvas-graph-cell'));
      }

    } else if (canvasType === 'hex-dot') {
      // Hex dot pattern — offset every other row
      canvas.classList.add('canvas-dot-grid canvas-hex');
      canvas.style.display = 'grid';
      canvas.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
      for (var hr = 0; hr < rows; hr++) {
        for (var hc = 0; hc < cols; hc++) {
          var hexDot = el('div', 'canvas-dot');
          if (hr % 2 === 1) hexDot.style.transform = 'translateX(50%)';
          canvas.appendChild(hexDot);
        }
      }

    } else {
      // dot-grid (default)
      canvas.classList.add('canvas-dot-grid');
      canvas.style.display = 'grid';
      canvas.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
      for (var di = 0; di < cols * rows; di++) {
        canvas.appendChild(el('div', 'canvas-dot'));
      }
    }

    container.appendChild(canvas);

    // Drawing prompts
    var prompts = (mapState.prompts || []).slice(0, MAX_PROMPTS);
    prompts.forEach(function (prompt) {
      container.appendChild(txt('div', 'canvas-prompt',
        '\u25B8 ' + prompt.substring(0, 60)));
    });

    // Map note
    if (mapState.mapNote) {
      container.appendChild(txt('div', 'map-note', mapState.mapNote));
    }
  }

  // ═══ FIELD OPS RIGHT (Map + Cipher + Oracle) ═══
  function renderFieldOpsRight(week, weekNum, labels) {
    var p = page('field-ops');
    var inner = el('div', 'field-ops-right');

    // Header
    var hdr = el('div', 'rp-header');
    hdr.appendChild(txt('span', '', labels.fieldOpsHeader));
    hdr.appendChild(txt('span', 'page-num', ''));
    inner.appendChild(hdr);

    // Content grid
    var content = el('div', 'rp-content');

    // Guard: gracefully handle missing fieldOps (e.g., malformed JSON)
    if (!week.fieldOps) {
      inner.appendChild(content);
      p.appendChild(inner);
      return p;
    }

    // ── Cipher Zone ──
    var cipherZone = el('div', 'cipher-zone');
    var cipher = week.fieldOps.cipher;
    if (cipher) {
      cipherZone.appendChild(txt('div', 'puzzle-title', cipher.title));

      // Parse and render display text
      if (cipher.body && cipher.body.displayText) {
        var lines = cipher.body.displayText.split('\n');
        var currentSection = null;

        lines.forEach(function (line) {
          var trimmed = line.trim();
          if (!trimmed) return;

          if (trimmed.match(/^KEY/i)) {
            // Start key section
            currentSection = 'key';
            var keyDiv = el('div', 'cipher-key');
            keyDiv.appendChild(txt('div', 'key-grid', trimmed));
            cipherZone.appendChild(keyDiv);
          } else if (currentSection === 'key' && trimmed.match(/^[A-Z?]=/)) {
            // Key continuation lines
            var lastKey = cipherZone.querySelector('.cipher-key:last-child .key-grid');
            if (lastKey) lastKey.textContent += '\n' + trimmed;
          } else if (trimmed.match(/^Position/i)) {
            currentSection = 'pos';
            var posDiv = el('div', 'position-sequence');
            posDiv.appendChild(txt('div', 'pos-numbers', trimmed));
            cipherZone.appendChild(posDiv);
          } else {
            // Cipher sequence / encoded text
            currentSection = 'seq';
            cipherZone.appendChild(txt('div', 'cipher-sequence', trimmed));
          }
        });
      }

      // Cipher key instruction
      if (cipher.body && cipher.body.key) {
        cipherZone.appendChild(txt('div', 'cipher-instruction', cipher.body.key));
      }

      // Workspace (plaintext grid)
      if (cipher.body && cipher.body.workSpace) {
        var grid = el('div', 'plaintext-grid');
        var cells = cipher.body.workSpace.rows * 10; // approximate
        for (var c = 0; c < cells; c++) {
          grid.appendChild(el('div', 'plaintext-cell'));
        }
        cipherZone.appendChild(grid);
      }

      // Extraction instruction
      if (cipher.extractionInstruction) {
        cipherZone.appendChild(txt('div', 'password-extract', cipher.extractionInstruction));
      }
    }
    content.appendChild(cipherZone);

    // ── Map Zone ──
    var mapZone = el('div', 'map-zone');
    var mapState = week.fieldOps.mapState;
    if (mapState) {
      var mapType = mapState.mapType || 'grid';
      switch (mapType) {
        case 'grid':           renderGridMap(mapZone, mapState); break;
        case 'point-to-point': renderPtpMap(mapZone, mapState); break;
        case 'linear-track':   renderLinearTrack(mapZone, mapState); break;
        case 'player-drawn':   renderPlayerDrawn(mapZone, mapState); break;
        default:               renderGridMap(mapZone, mapState); break;
      }
    }
    content.appendChild(mapZone);

    // ── Oracle Zone ──
    var oracleZone = el('div', 'oracle-zone');
    var oracle = week.fieldOps.oracleTable;
    if (oracle) {
      oracleZone.appendChild(txt('div', 'oracle-header', oracle.title));
      if (oracle.instruction) {
        oracleZone.appendChild(txt('div', 'oracle-instruction', oracle.instruction));
      }

      var entries = el('div', 'oracle-entries');
      if (oracle.entries) {
        if (oracle.mode === 'simple') {
          // 2d6 mode — show every entry individually (rolls 2-12)
          oracle.entries.forEach(function (entry) {
            var entryEl = el('div', 'oracle-entry oracle-case');
            entryEl.appendChild(txt('span', 'oracle-case-num', entry.roll));
            entryEl.appendChild(txt('span', 'oracle-text', entry.text));
            if (entry.fragmentRef) {
              entryEl.appendChild(txt('span', 'frag-ref', '\u2192 ' + entry.fragmentRef));
            }
            entries.appendChild(entryEl);
          });
        } else {
          // d100/full mode — group by cluster into decade ranges
          var clusters = {};
          oracle.entries.forEach(function (entry, oracleIdx) {
            var c;
            if (entry.cluster != null) {
              c = entry.cluster;
            } else {
              var parsed = parseInt(entry.roll, 10);
              c = isNaN(parsed) ? oracleIdx : Math.floor(parsed / 10);
            }
            if (!clusters[c]) clusters[c] = [];
            clusters[c].push(entry);
          });

          var clusterKeys = Object.keys(clusters).sort(function (a, b) { return a - b; });
          clusterKeys.forEach(function (key) {
            var group = clusters[key];
            var first = group[0];
            var last = group[group.length - 1];
            var entryEl = el('div', 'oracle-entry oracle-case');

            var rangeStr = group.length > 1
              ? first.roll + '\u2013' + last.roll
              : first.roll;
            entryEl.appendChild(txt('span', 'oracle-case-num', rangeStr));
            entryEl.appendChild(txt('span', 'oracle-text', first.text));

            if (first.fragmentRef) {
              entryEl.appendChild(txt('span', 'frag-ref', '\u2192 ' + first.fragmentRef));
            }

            entries.appendChild(entryEl);
          });
        }
      }
      oracleZone.appendChild(entries);
    }
    content.appendChild(oracleZone);

    inner.appendChild(content);
    p.appendChild(inner);
    return p;
  }

  // ── Print-safe area enforcement (runs after pages are in DOM) ──
  var SAFE_INSET = 24; // px — matches --safe-inset in CSS (0.25in)
  var MIN_SCALE = 0.82; // floor — below this, content is fundamentally too large

  function enforcePageFit(page) {
    var inner = page.children[0];
    if (!inner) return;

    // Measure true content height:
    // Inner wrappers use height:100% — temporarily unset to get natural content height
    var origPageOverflow = page.style.overflow;
    var origInnerOverflow = inner.style.overflow;
    var origHeight = inner.style.height;
    var computedHeight = window.getComputedStyle(inner).height;
    page.style.overflow = 'visible';
    inner.style.overflow = 'visible';
    inner.style.height = 'auto';

    var pageH = page.offsetHeight;
    var safeH = pageH - (2 * SAFE_INSET);
    var trueH = inner.scrollHeight;

    inner.style.height = origHeight || '';
    page.style.overflow = origPageOverflow;
    inner.style.overflow = origInnerOverflow;

    if (trueH <= safeH) return; // fits — no action needed

    var scale = safeH / trueH;
    if (scale < MIN_SCALE) {
      console.warn('enforcePageFit: page would need scale ' + scale.toFixed(3) +
        ' (below ' + MIN_SCALE + ' floor). Content may be clipped. Inner class: ' + inner.className);
      scale = MIN_SCALE;
    }

    inner.style.transform = 'scale(' + scale + ')';
    inner.style.transformOrigin = 'top left';
    inner.style.width = (100 / scale) + '%';
  }

  // ═══ BOSS RIGHT (replaces field ops on final week) ═══
  function renderBossRight(data, week, weekNum, totalWeeks, labels) {
    var p = page('boss');
    var inner = el('div', 'boss-right');
    var boss = week.bossEncounter;

    // Header
    var hdr = el('div', 'boss-header rp-header');
    hdr.appendChild(txt('span', '', 'Week ' + (weekNum < 10 ? '0' + weekNum : weekNum) + ' \u00b7 ' + labels.finalSurveyHeader));
    hdr.appendChild(txt('span', 'page-num', ''));
    inner.appendChild(hdr);

    if (boss) {
      // Title
      inner.appendChild(txt('h2', 'boss-title', boss.title));

      // Narrative
      if (boss.narrative) {
        inner.appendChild(txt('div', 'boss-narrative', boss.narrative));
      }

      // Mechanism
      if (boss.mechanismDescription) {
        var mech = el('div', 'boss-mechanism');
        mech.appendChild(txt('span', 'boss-mechanism-label', 'Procedure'));
        mech.appendChild(txt('div', '', boss.mechanismDescription));
        inner.appendChild(mech);
      }

      // Component inputs (from prior weeks)
      if (boss.componentInputs && boss.componentInputs.length) {
        var compSection = el('div', 'boss-components');
        compSection.appendChild(txt('div', 'boss-components-label', 'Required Components'));
        var compList = el('div', 'boss-component-list');
        boss.componentInputs.forEach(function (comp, idx) {
          var item = el('div', 'boss-component-item');
          // Handle both object format {weekNumber, description} and string format "H"
          if (typeof comp === 'object' && comp !== null) {
            var wn = comp.weekNumber || (idx + 1);
            item.appendChild(txt('span', 'boss-component-week', 'Week ' + (wn < 10 ? '0' + wn : wn)));
            item.appendChild(el('div', 'boss-component-box'));
            item.appendChild(txt('span', '', comp.description || ''));
          } else {
            item.appendChild(txt('span', 'boss-component-week', 'Week ' + ((idx + 1) < 10 ? '0' + (idx + 1) : (idx + 1))));
            item.appendChild(el('div', 'boss-component-box'));
          }
          compList.appendChild(item);
        });
        compSection.appendChild(compList);
        inner.appendChild(compSection);
      }

      // Decoding key (delayed interpretation)
      if (boss.decodingKey) {
        var dkSection = el('div', 'boss-decoding-key');
        dkSection.appendChild(txt('div', 'boss-decoding-label', 'Decoding Protocol'));
        if (boss.decodingKey.instruction) {
          dkSection.appendChild(txt('div', 'boss-decoding-instruction', boss.decodingKey.instruction));
        }
        if (boss.decodingKey.referenceTable) {
          var tableDiv = el('div', 'boss-decoding-table');
          boss.decodingKey.referenceTable.split('\n').forEach(function (line) {
            if (line.trim()) {
              tableDiv.appendChild(txt('div', 'boss-decoding-table-line', line.trim()));
            }
          });
          dkSection.appendChild(tableDiv);
        }
        inner.appendChild(dkSection);

        // Decoded letter boxes
        var decodedSection = el('div', 'boss-decoded-letters');
        decodedSection.appendChild(txt('div', 'boss-decoded-label', 'Decoded Values'));
        var decodedGrid = el('div', 'boss-decoded-grid');
        var inputCount = boss.componentInputs ? boss.componentInputs.length : 5;
        for (var d = 0; d < inputCount; d++) {
          var decodedItem = el('div', 'boss-decoded-item');
          decodedItem.appendChild(txt('span', 'boss-decoded-week', 'Wk ' + ((d + 1) < 10 ? '0' + (d + 1) : (d + 1))));
          decodedItem.appendChild(el('div', 'boss-decoded-box'));
          decodedGrid.appendChild(decodedItem);
        }
        decodedSection.appendChild(decodedGrid);
        inner.appendChild(decodedSection);
      }

      // Convergence (password assembly)
      var convergence = el('div', 'boss-convergence');
      convergence.appendChild(txt('div', 'boss-convergence-label', 'Convergence'));
      var convergenceText = boss.convergenceInstruction || boss.passwordRevealInstruction || '';
      if (convergenceText) {
        convergence.appendChild(txt('div', 'boss-convergence-instruction', convergenceText));
      }
      var pwBoxes = el('div', 'boss-password-boxes');
      // Derive password length from meta or componentInputs
      var pwLen = (data.meta && data.meta.passwordPlaintext) ? data.meta.passwordPlaintext.length
        : (boss.componentInputs ? boss.componentInputs.length : 6);
      for (var i = 0; i < pwLen; i++) {
        pwBoxes.appendChild(el('div', 'boss-password-box'));
      }
      convergence.appendChild(pwBoxes);
      inner.appendChild(convergence);
    } else {
      // Fallback if no boss data
      inner.appendChild(txt('div', 'boss-title', labels.finalSurveyHeader));
      inner.appendChild(txt('div', 'boss-narrative', labels.bossFallbackNarrative));
    }

    p.appendChild(inner);
    return p;
  }

  // ═══ OVERFLOW LEFT (sessions 4+) ═══
  function renderOverflowLeft(week, weekNum, overflowSessions, totalWeeks, labels) {
    return renderWorkoutLeft(week, weekNum, overflowSessions, totalWeeks, true, labels);
  }

  // ═══ OVERFLOW RIGHT (found document) ═══
  function renderOverflowRight(week) {
    var p = page('overflow-doc');
    var inner = el('div', 'overflow-doc-right');

    if (week.overflowDocument) {
      inner.appendChild(renderFoundDocument(week.overflowDocument));
    } else {
      // Fallback
      var fd = el('div', 'found-doc');
      fd.appendChild(txt('div', 'found-doc-type', 'Document'));
      fd.appendChild(txt('div', 'found-doc-title', 'Filed as Recorded'));
      fd.appendChild(txt('div', 'found-doc-body', 'This page intentionally left for narrative.'));
      inner.appendChild(fd);
    }

    p.appendChild(inner);
    return p;
  }

  // ═══ FOUND DOCUMENT RENDERER (shared) ═══
  function renderFoundDocument(doc) {
    var fd = el('div', 'found-doc');

    if (doc.documentType) {
      var typeStr = doc.documentType.replace(/-/g, ' ');
      fd.appendChild(txt('div', 'found-doc-type', typeStr));
    }
    if (doc.inWorldAuthor) {
      fd.appendChild(txt('div', 'found-doc-from', 'From: ' + doc.inWorldAuthor));
    }
    if (doc.inWorldRecipient) {
      fd.appendChild(txt('div', 'found-doc-to', 'To: ' + doc.inWorldRecipient));
    }
    if (doc.title) {
      fd.appendChild(txt('div', 'found-doc-title', doc.title));
    }

    var body = el('div', 'found-doc-body');
    var bodySource = doc.bodyText || doc.body || doc.content || '';
    if (bodySource) {
      var bodyContent = typeof bodySource === 'string' ? bodySource : JSON.stringify(bodySource);
      bodyContent.split('\n').forEach(function (para) {
        if (para.trim()) body.appendChild(txt('p', '', para.trim()));
      });
    }
    fd.appendChild(body);

    if (doc.inWorldAuthor) {
      fd.appendChild(txt('div', 'found-doc-sig', '\u2014 ' + doc.inWorldAuthor));
    }

    return fd;
  }

  // ═══ FRAGMENT PAGES ═══
  function renderFragmentPage(fragments, startIdx, pageIdx) {
    var p = page('fragment');
    var isRecto = (pageIdx % 2 === 0);
    var inner = el('div', 'fragment-page');
    inner.setAttribute('data-side', isRecto ? 'recto' : 'verso');

    // Page header
    var hdr = el('div', 'page-header');
    hdr.appendChild(txt('span', '', 'Documents'));
    hdr.appendChild(txt('span', 'page-num', ''));
    inner.appendChild(hdr);

    fragments.forEach(function (frag, idx) {
      var block = el('div', 'fragment-block');

      // Large fragment number
      block.appendChild(txt('div', 'fragment-number', frag.id || ('F.' + (startIdx + idx + 1))));

      // Document
      var docType = frag.documentType || 'memo';
      var doc = el('div', 'fragment-doc ' + docType);

      doc.appendChild(txt('div', 'fragment-doc-type', (docType || '').replace(/-/g, ' ')));

      // Header metadata
      var headerLines = [];
      if (frag.inWorldAuthor) headerLines.push('From: ' + frag.inWorldAuthor);
      if (frag.inWorldRecipient) headerLines.push('To: ' + frag.inWorldRecipient);
      if (frag.date) headerLines.push('Date: ' + frag.date);
      if (headerLines.length) {
        doc.appendChild(txt('div', 'fragment-doc-header', headerLines.join('\n')));
      }

      // Title
      if (frag.title) {
        var titleEl = txt('div', '', frag.title);
        titleEl.style.fontWeight = '700';
        titleEl.style.marginBottom = '6px';
        doc.appendChild(titleEl);
      }

      // Body
      var body = el('div', 'fragment-doc-body');
      var bodyText = frag.bodyText || frag.body || frag.content || '';
      if (typeof bodyText === 'string') {
        bodyText.split('\n').forEach(function (para) {
          if (para.trim()) body.appendChild(txt('p', '', para.trim()));
        });
      }
      doc.appendChild(body);

      // Signature
      if (frag.inWorldAuthor) {
        doc.appendChild(txt('div', 'fragment-doc-sig', '\u2014 ' + frag.inWorldAuthor));
      }

      block.appendChild(doc);
      inner.appendChild(block);
    });

    p.appendChild(inner);
    return p;
  }

  // ═══ PASSWORD ASSEMBLY PAGE ═══
  function renderPasswordAssembly(data, labels) {
    var p = page('password-assembly');
    var inner = el('div', 'password-assembly-page');

    inner.appendChild(txt('h2', 'password-assembly-title', labels.passwordAssemblyTitle));
    inner.appendChild(txt('div', 'password-assembly-subtitle',
      'Transfer each week\u2019s recorded value to the grid below. Use the boss page decoding key to convert each value to its letter.'));

    // Per-week rows
    var grid = el('div', 'password-assembly-grid');
    var weekCount = data.meta.weekCount || 6;
    for (var w = 1; w <= weekCount; w++) {
      var row = el('div', 'password-assembly-row');
      row.appendChild(txt('span', 'password-assembly-week-label',
        'Week ' + (w < 10 ? '0' + w : w)));
      row.appendChild(el('div', 'password-assembly-value-cell'));
      row.appendChild(txt('span', 'password-assembly-arrow', '\u2192'));
      row.appendChild(el('div', 'password-assembly-letter-cell'));

      // Show brief component type hint
      var week = data.weeks[w - 1];
      if (week && week.weeklyComponent && !week.isBossWeek) {
        row.appendChild(txt('span', 'password-assembly-hint',
          week.weeklyComponent.type || ''));
      } else if (week && week.isBossWeek) {
        row.appendChild(txt('span', 'password-assembly-hint', 'see decoding key'));
      }
      grid.appendChild(row);
    }
    inner.appendChild(grid);

    // Final assembly
    var final_ = el('div', 'password-final-assembly');
    final_.appendChild(txt('div', 'password-final-label', 'Complete Password'));
    var finalRow = el('div', 'password-final-row');
    var pwLen = data.meta.passwordPlaintext ? data.meta.passwordPlaintext.length : 10;
    for (var i = 0; i < pwLen; i++) {
      finalRow.appendChild(el('div', 'password-final-cell'));
    }
    final_.appendChild(finalRow);

    // Unlock instruction (must make sense on printed paper, not just on screen)
    var instrDiv = el('div', 'password-unlock-instruction');
    instrDiv.appendChild(txt('span', '', 'When all positions are filled, return to '));
    instrDiv.appendChild(txt('strong', '', 'liftrpg.co \u2192 Render'));
    instrDiv.appendChild(txt('span', '', '. Upload your JSON and enter this password to unlock the final page.'));
    final_.appendChild(instrDiv);

    inner.appendChild(final_);

    p.appendChild(inner);
    return p;
  }

  // ═══ ENDINGS PAGE ═══
  function renderEndingsPage(data, labels) {
    var p = page('endings');
    p.setAttribute('id', 'endings-page');
    var inner = el('div', 'endings-page');

    // If there's an encrypted ending, show locked state
    if (data.meta && data.meta.passwordEncryptedEnding &&
        data.meta.passwordEncryptedEnding !== 'PLACEHOLDER_ENCRYPTED_BLOB_REPLACE_AT_GENERATION_TIME') {
      inner.classList.add('endings-locked');
      inner.appendChild(txt('div', 'endings-locked-icon', '\uD83D\uDD12'));
      inner.appendChild(txt('h2', 'endings-title', 'This Document Is Sealed'));
      var lockMsg = el('div', 'endings-locked-msg');
      lockMsg.appendChild(txt('span', '', 'Assemble your password from the weekly gauge readings. Return to '));
      lockMsg.appendChild(txt('strong', '', 'liftrpg.co \u2192 Render'));
      lockMsg.appendChild(txt('span', '', ' and enter it to unlock this page.'));
      inner.appendChild(lockMsg);
    } else if (data.endings && data.endings.length && data.endings[0].content) {
      // Plaintext fallback (development/debug)
      var ending = data.endings[0].content;
      if (ending.body) {
        var bodyDiv = el('div', 'endings-body');
        ending.body.split('\n').forEach(function (para) {
          if (para.trim()) bodyDiv.appendChild(txt('p', '', para.trim()));
        });
        inner.appendChild(bodyDiv);
      }
      if (ending.finalLine) {
        inner.appendChild(txt('div', 'endings-final-line', ending.finalLine));
      }
    } else {
      inner.appendChild(txt('h2', 'endings-title', labels.endingsFallbackTitle));
      inner.appendChild(txt('div', 'endings-body', labels.endingsFallbackBody));
    }

    p.appendChild(inner);
    return p;
  }

  // ═══ BACK COVER ═══
  function renderBackCover(data) {
    var p = page('back-cover');
    var inner = el('div', 'back-cover');

    var colophon = el('div', 'back-cover-colophon');
    colophon.appendChild(txt('div', '', 'Generated by LiftRPG'));
    colophon.appendChild(txt('div', '', data.meta.generatedAt || ''));
    colophon.appendChild(txt('div', '', 'liftrpg.co'));
    inner.appendChild(colophon);

    inner.appendChild(txt('div', 'back-cover-mark', 'LiftRPG'));

    p.appendChild(inner);
    return p;
  }

  // ── BOOKLET VALIDATION ────────────────────────────────────
  // Structural checks beyond crash-prevention. Errors block render;
  // warnings log to console and show count in status bar.

  function validateBooklet(data) {
    var errors = [];
    var warnings = [];
    var weeks = data.weeks;
    var meta = data.meta;

    // ── Hard errors (block render) ──────────────────────────

    // 1. weekCount must match weeks array length
    if (meta.weekCount != null && meta.weekCount !== weeks.length) {
      errors.push('meta.weekCount (' + meta.weekCount + ') does not match weeks array length (' + weeks.length + ')');
    }

    // 2. Exactly one boss week, must be final
    var bossIndices = [];
    weeks.forEach(function (wk, i) { if (wk.isBossWeek) bossIndices.push(i); });
    if (bossIndices.length === 0) {
      errors.push('No boss week found (exactly one week must have isBossWeek: true)');
    } else if (bossIndices.length > 1) {
      errors.push('Multiple boss weeks found at indices ' + bossIndices.join(', ') + ' (exactly one allowed)');
    } else if (bossIndices[0] !== weeks.length - 1) {
      errors.push('Boss week is at index ' + bossIndices[0] + ' but must be the final week (index ' + (weeks.length - 1) + ')');
    }

    // 3. Non-boss weeks must have fieldOps
    weeks.forEach(function (wk, i) {
      if (!wk.isBossWeek && !wk.fieldOps) {
        errors.push('Week ' + (i + 1) + ' is not a boss week but has no fieldOps');
      }
    });

    // 4. Boss week must have bossEncounter
    weeks.forEach(function (wk, i) {
      if (wk.isBossWeek && !wk.bossEncounter) {
        errors.push('Week ' + (i + 1) + ' is a boss week but has no bossEncounter');
      }
    });

    // ── Warnings (render continues) ─────────────────────────

    // 5. totalSessions mismatch
    if (meta.totalSessions != null) {
      var actualTotal = 0;
      weeks.forEach(function (wk) { actualTotal += (wk.sessions ? wk.sessions.length : 0); });
      if (meta.totalSessions !== actualTotal) {
        warnings.push('meta.totalSessions (' + meta.totalSessions + ') does not match actual session count (' + actualTotal + ')');
      }
    }

    // 6. weeklyComponent.type consistency
    if (meta.weeklyComponentType) {
      weeks.forEach(function (wk, i) {
        if (!wk.isBossWeek && wk.weeklyComponent && wk.weeklyComponent.type &&
            wk.weeklyComponent.type !== meta.weeklyComponentType) {
          warnings.push('Week ' + (i + 1) + ' weeklyComponent.type "' + wk.weeklyComponent.type + '" does not match meta.weeklyComponentType "' + meta.weeklyComponentType + '"');
        }
      });
    }

    // 7. Binary choice: exactly one, not on boss week
    var choiceCount = 0;
    var choiceOnBoss = false;
    weeks.forEach(function (wk) {
      (wk.sessions || []).forEach(function (s) {
        if (s.binaryChoice) {
          choiceCount++;
          if (wk.isBossWeek) choiceOnBoss = true;
        }
      });
    });
    if (choiceCount === 0) {
      warnings.push('No binaryChoice found in any session (exactly one expected)');
    } else if (choiceCount > 1) {
      warnings.push('Found ' + choiceCount + ' binaryChoice entries (exactly one expected)');
    }
    if (choiceOnBoss) {
      warnings.push('binaryChoice found on boss week (should be at midpoint, never on boss)');
    }

    // 8-9. Fragment ID uniqueness + fragmentRef resolution
    var fragments = data.fragments || [];
    var fragIds = {};
    fragments.forEach(function (f) {
      if (f.id) {
        if (fragIds[f.id]) {
          warnings.push('Duplicate fragment ID: "' + f.id + '"');
        }
        fragIds[f.id] = true;
      }
    });
    weeks.forEach(function (wk, wi) {
      (wk.sessions || []).forEach(function (s, si) {
        if (s.fragmentRef && !fragIds[s.fragmentRef]) {
          warnings.push('Week ' + (wi + 1) + ' session ' + (si + 1) + ' fragmentRef "' + s.fragmentRef + '" does not resolve to any fragment');
        }
      });
      // Also check oracle table entries for fragmentRef
      var cipher = wk.fieldOps && wk.fieldOps.cipher;
      var oracle = (wk.fieldOps && wk.fieldOps.oracleTable) || {};
      (oracle.entries || []).forEach(function (e) {
        if (e.fragmentRef && !fragIds[e.fragmentRef]) {
          warnings.push('Week ' + (wi + 1) + ' oracle entry fragmentRef "' + e.fragmentRef + '" does not resolve to any fragment');
        }
      });
    });

    // 10-11. componentInputs validation
    var bossWeek = bossIndices.length === 1 ? weeks[bossIndices[0]] : null;
    if (bossWeek && bossWeek.bossEncounter) {
      var boss = bossWeek.bossEncounter;
      var inputs = boss.componentInputs;
      if (inputs) {
        var expectedLen = weeks.length - 1;
        if (inputs.length !== expectedLen) {
          warnings.push('bossEncounter.componentInputs has ' + inputs.length + ' entries, expected ' + expectedLen + ' (one per non-boss week)');
        }
        // Check values match prior weeklyComponent.values
        var priorValues = [];
        weeks.forEach(function (wk) {
          if (!wk.isBossWeek && wk.weeklyComponent) {
            priorValues.push(wk.weeklyComponent.value);
          }
        });
        for (var ci = 0; ci < Math.min(inputs.length, priorValues.length); ci++) {
          if (inputs[ci] !== priorValues[ci] && String(inputs[ci]) !== String(priorValues[ci])) {
            warnings.push('componentInputs[' + ci + '] = "' + inputs[ci] + '" but weeklyComponent.value for week ' + (ci + 1) + ' = "' + priorValues[ci] + '"');
          }
        }
      }
    }

    // 12. Password plaintext leak scan
    if (meta.passwordPlaintext && meta.passwordPlaintext.length >= 3) {
      var pw = meta.passwordPlaintext.toUpperCase();
      var leakFound = false;
      function scanForLeak(text, location) {
        if (text && typeof text === 'string' && text.toUpperCase().indexOf(pw) !== -1) {
          if (!leakFound) {
            warnings.push('passwordPlaintext "' + pw + '" found in printed content: ' + location);
            leakFound = true;
          }
        }
      }
      weeks.forEach(function (wk, wi) {
        scanForLeak(wk.title, 'week ' + (wi + 1) + ' title');
        (wk.sessions || []).forEach(function (s, si) {
          scanForLeak(s.storyPrompt, 'week ' + (wi + 1) + ' session ' + (si + 1) + ' storyPrompt');
        });
        if (wk.bossEncounter) {
          scanForLeak(wk.bossEncounter.narrative, 'boss narrative');
          scanForLeak(wk.bossEncounter.mechanismDescription, 'boss mechanismDescription');
        }
        if (wk.fieldOps && wk.fieldOps.cipher) {
          var cb = wk.fieldOps.cipher.body;
          if (cb) scanForLeak(cb.displayText, 'week ' + (wi + 1) + ' cipher displayText');
        }
      });
      fragments.forEach(function (f) {
        scanForLeak(f.content, 'fragment ' + (f.id || '?'));
      });
    }

    // 13. Oracle entry counts
    weeks.forEach(function (wk, wi) {
      var oracle = (wk.fieldOps && wk.fieldOps.oracleTable) || {};
      var entries = oracle.entries || [];
      if (oracle.mode === 'simple' && entries.length !== 11) {
        warnings.push('Week ' + (wi + 1) + ' oracle mode "simple" has ' + entries.length + ' entries (expected 11)');
      } else if (oracle.mode === 'full' && entries.length !== 10) {
        warnings.push('Week ' + (wi + 1) + ' oracle mode "full" has ' + entries.length + ' entries (expected 10)');
      }
    });

    // 14. Boss week value should be null
    if (bossWeek && bossWeek.weeklyComponent && bossWeek.weeklyComponent.value != null) {
      warnings.push('Boss week weeklyComponent.value should be null, got "' + bossWeek.weeklyComponent.value + '"');
    }

    return { errors: errors, warnings: warnings };
  }

  // ── MAIN ORCHESTRATOR ──────────────────────────────────────

  function render(data) {
    // ── Defensive validation — fail fast with actionable messages ──
    if (!data || typeof data !== 'object') {
      throw new Error('Render failed: expected a JSON object, got ' + typeof data);
    }

    // Top-level required fields
    var _required = ['meta', 'cover', 'rulesSpread', 'weeks'];
    _required.forEach(function (key) {
      if (!data[key]) throw new Error('Render failed: missing required field "' + key + '"');
    });

    // Structural checks — catch the things that cause cryptic crashes
    if (!Array.isArray(data.weeks) || data.weeks.length === 0) {
      throw new Error('Render failed: data.weeks must be a non-empty array');
    }
    if (!data.meta.blockTitle) {
      throw new Error('Render failed: meta.blockTitle is required');
    }
    if (!data.rulesSpread.leftPage || !data.rulesSpread.rightPage) {
      throw new Error('Render failed: rulesSpread must have leftPage and rightPage');
    }
    data.weeks.forEach(function (wk, i) {
      if (!Array.isArray(wk.sessions)) {
        throw new Error('Render failed: weeks[' + i + '].sessions must be an array');
      }
    });
    // ─────────────────────────────────────────────────────────────

    // ── Structural validation — catch schema violations ──────────
    var validation = validateBooklet(data);
    if (validation.errors.length > 0) {
      throw new Error('Validation failed: ' + validation.errors[0]);
    }
    window._lastValidationWarnings = validation.warnings;
    if (validation.warnings.length > 0) {
      console.warn('⚠ Booklet validation warnings (' + validation.warnings.length + '):');
      validation.warnings.forEach(function (w) { console.warn('  • ' + w); });
    }
    // ─────────────────────────────────────────────────────────────

    // Apply visual theme if present
    var themeContainer = document.getElementById('booklet-container');
    if (themeContainer && data.theme) {
      var arch = data.theme.visualArchetype;
      if (arch) themeContainer.setAttribute('data-treatment', arch);
      var pal = data.theme.palette;
      if (pal) {
        if (pal.ink)    themeContainer.style.setProperty('--ink', pal.ink);
        if (pal.paper)  themeContainer.style.setProperty('--paper', pal.paper);
        if (pal.accent) themeContainer.style.setProperty('--accent', pal.accent);
        if (pal.muted)  themeContainer.style.setProperty('--muted', pal.muted);
        if (pal.rule)   themeContainer.style.setProperty('--rule', pal.rule);
        if (pal.fog)    themeContainer.style.setProperty('--fog', pal.fog);
        // Derive --warm and --card from fog and paper
        if (pal.fog && pal.paper) {
          themeContainer.style.setProperty('--warm', mixHex(pal.paper, pal.fog, 0.35));
          themeContainer.style.setProperty('--card', mixHex(pal.paper, pal.fog, 0.25));
        }
      }
    }

    var pages = [];
    var totalWeeks = data.weeks.length;
    var labels = buildLabels(data);

    // 1. Cover
    pages.push(renderCover(data));

    // 2-3. Rules spread
    pages.push(renderRulesLeft(data));
    pages.push(renderRulesRight(data));

    // 4+. Workout weeks
    for (var i = 0; i < data.weeks.length; i++) {
      var week = data.weeks[i];
      var weekNum = week.weekNumber || (i + 1);
      var sessions = week.sessions || [];
      var visibleSessions = sessions.slice(0, 3);

      // Left page: session cards (first 3)
      pages.push(renderWorkoutLeft(week, weekNum, visibleSessions, totalWeeks, false, labels));

      // Right page: field ops or boss
      if (week.isBossWeek) {
        pages.push(renderBossRight(data, week, weekNum, totalWeeks, labels));
      } else {
        pages.push(renderFieldOpsRight(week, weekNum, labels));
      }

      // Overflow: sessions 4+
      if (week.overflow && sessions.length > 3) {
        var overflowSessions = sessions.slice(3);
        pages.push(renderOverflowLeft(week, weekNum, overflowSessions, totalWeeks, labels));
        pages.push(renderOverflowRight(week));
      }
    }

    // Fragment pages — pack 2 per page, but split to 1 if content is very long
    if (data.fragments && data.fragments.length) {
      var frags = data.fragments;
      var f = 0;
      var fragPageIdx = 0;
      while (f < frags.length) {
        var frag1 = frags[f];
        // Use same field priority as renderers: bodyText → body → content (I7)
        var content1Len = (frag1.bodyText || frag1.body || frag1.content || '').length;
        var frag2 = frags[f + 1];
        var content2Len = frag2 ? (frag2.bodyText || frag2.body || frag2.content || '').length : 0;

        // If combined content is very long (>1200 chars), determine split strategy (C4)
        if (frag2 && (content1Len + content2Len > 1200)) {
          if (content1Len > 600) {
            // frag1 alone is long — give it its own page; frag2 re-queues
            pages.push(renderFragmentPage([frag1], f, fragPageIdx++));
            f += 1;
          } else if (content2Len > 600) {
            // frag2 alone is long — each gets its own page
            pages.push(renderFragmentPage([frag1], f, fragPageIdx++));
            pages.push(renderFragmentPage([frag2], f + 1, fragPageIdx++));
            f += 2;
          } else {
            // Neither alone exceeds threshold — pair them
            pages.push(renderFragmentPage([frag1, frag2], f, fragPageIdx++));
            f += 2;
          }
        } else if (frag2) {
          pages.push(renderFragmentPage([frag1, frag2], f, fragPageIdx++));
          f += 2;
        } else {
          pages.push(renderFragmentPage([frag1], f, fragPageIdx++));
          f += 1;
        }
      }
    }

    // Password assembly
    pages.push(renderPasswordAssembly(data, labels));

    // Endings
    pages.push(renderEndingsPage(data, labels));

    // Back cover
    pages.push(renderBackCover(data));

    // Pad to multiple of 4 for saddle-stitch
    while (pages.length % 4 !== 0) {
      var blank = page('blank');
      blank.classList.add('blank-page');
      pages.push(blank);
    }

    // Set dynamic page numbers directly mapped to the array index (page 1 is index 0)
    pages.forEach(function (renderedPage, pgIdx) {
      if (!renderedPage) return;
      var numEl = renderedPage.querySelector('.page-num');
      if (numEl) {
        var naturalPageNum = pgIdx + 1;
        numEl.textContent = 'p.' + (naturalPageNum < 10 ? '0' + naturalPageNum : naturalPageNum);
      }
    });

    return pages;
  }

  // ── APP INITIALIZATION ─────────────────────────────────────

  var jsonData = null;

  // Crypto constants (must be before demo mode for decrypt access)
  var CRYPTO_SALT_BYTES = 32;
  var CRYPTO_IV_BYTES = 12;
  var CRYPTO_ITER = 200000;

  // ── DEMO MODE ──────────────────────────────────────────────
  var demoParam = new URLSearchParams(window.location.search).get('demo');
  if (demoParam) {
    var chrome = document.querySelector('.app-chrome');
    if (chrome) chrome.style.display = 'none';
    document.body.classList.add('demo-mode');

    fetch('../' + encodeURIComponent(demoParam) + '.json')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        jsonData = data;
        var pages = render(data);
        var container = document.getElementById('booklet-container');
        container.innerHTML = '';

        for (var i = 0; i < pages.length; i++) {
          container.appendChild(pages[i]);
        }
        container.querySelectorAll('.cover-designation').forEach(function (d) { fitTextToLine(d, 10); });
        container.querySelectorAll('.booklet-page').forEach(enforcePageFit);

        // Show demo unlock bar if this booklet has an encrypted ending
        if (data.meta && data.meta.passwordEncryptedEnding &&
            data.meta.passwordEncryptedEnding !== 'PLACEHOLDER_ENCRYPTED_BLOB_REPLACE_AT_GENERATION_TIME' &&
            data.meta.passwordPlaintext) {
          var bar = document.createElement('div');
          bar.className = 'demo-unlock-bar';

          var label = document.createElement('span');
          label.className = 'demo-unlock-label';
          label.textContent = '\uD83D\uDD12 Try decrypting the ending:';

          var spoiler = document.createElement('button');
          spoiler.className = 'demo-unlock-spoiler';
          spoiler.setAttribute('aria-label', 'Reveal password');
          spoiler.textContent = data.meta.passwordPlaintext;
          spoiler.addEventListener('click', function () {
            spoiler.classList.add('revealed');
          });

          var unlockBtn = document.createElement('button');
          unlockBtn.className = 'demo-unlock-btn';
          unlockBtn.textContent = 'Unlock';
          unlockBtn.addEventListener('click', function () {
            if (!spoiler.classList.contains('revealed')) {
              spoiler.classList.add('revealed');
              return;
            }
            unlockBtn.disabled = true;
            unlockBtn.textContent = 'Working\u2026';
            decryptBlob(data.meta.passwordEncryptedEnding, normalisePassword(data.meta.passwordPlaintext))
              .then(function (plaintext) {
                var payload;
                try { payload = JSON.parse(plaintext); } catch (e) {
                  payload = { content: plaintext };
                }
                var endingsPage = document.getElementById('endings-page');
                if (endingsPage) {
                  var inner = endingsPage.querySelector('.endings-page');
                  if (inner) {
                    inner.classList.remove('endings-locked');
                    inner.innerHTML = '';
                    var bodyDiv = document.createElement('div');
                    bodyDiv.className = 'endings-body endings-unlocked';
                    bodyDiv.innerHTML = payload.content;
                    inner.appendChild(bodyDiv);
                  }
                  endingsPage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                bar.classList.add('demo-unlock-success');
                unlockBtn.textContent = '\u2713 Unlocked';
                label.textContent = '\uD83D\uDD13 Ending decrypted';
              })
              .catch(function () {
                unlockBtn.disabled = false;
                unlockBtn.textContent = 'Unlock';
              });
          });

          bar.appendChild(label);
          bar.appendChild(spoiler);
          bar.appendChild(unlockBtn);
          document.body.appendChild(bar);
        }
      })
      .catch(function (err) {
        var container = document.getElementById('booklet-container');
        container.innerHTML = '';
        var msg = document.createElement('div');
        msg.className = 'demo-error';
        msg.textContent = 'Preview unavailable';
        container.appendChild(msg);
        console.error('Demo load failed:', err);
      });

    return; // Skip normal app initialization
  }
  // ── END DEMO MODE ──────────────────────────────────────────

  var fileInput = document.getElementById('json-input');
  var printBtn = document.getElementById('print-btn');
  var container = document.getElementById('booklet-container');
  var status = document.getElementById('status');
  var layoutSelect = document.getElementById('layout-mode');

  fileInput.addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      try {
        jsonData = JSON.parse(ev.target.result);
        doRender(); // auto-render on load
      } catch (err) {
        status.textContent = 'JSON error: ' + err.message;
      }
    };
    reader.readAsText(file);
  });

  function doRender() {
    if (!jsonData) return;
    container.innerHTML = '';
    container.className = ''; // reset container
    container.removeAttribute('data-treatment');
    container.removeAttribute('style');
    try {
      var pages = render(jsonData);
      var mode = layoutSelect ? layoutSelect.value : 'single';

      if (mode === 'booklet' || mode === 'spread') {
        container.classList.add('spread-view');
        var imposed = [];
        if (mode === 'booklet') {
          var half = Math.ceil(pages.length / 2);
          for (var p = 0; p < half; p++) {
            var leftIdx = (p % 2 === 0) ? pages.length - 1 - p : p;
            var rightIdx = (p % 2 === 0) ? p : pages.length - 1 - p;

            var wrap = document.createElement('div');
            wrap.className = 'print-spread';
            if (pages[leftIdx]) wrap.appendChild(pages[leftIdx]);
            if (pages[rightIdx]) wrap.appendChild(pages[rightIdx]);
            imposed.push(wrap);
          }
        } else {
          for (var s = 0; s < pages.length; s += 2) {
            var wrap2 = document.createElement('div');
            wrap2.className = 'print-spread';
            wrap2.appendChild(pages[s]);
            if (pages[s + 1]) wrap2.appendChild(pages[s + 1]);
            imposed.push(wrap2);
          }
        }
        imposed.forEach(function (spr) { container.appendChild(spr); });
      } else {
        pages.forEach(function (p) { container.appendChild(p); });
      }

      // Auto-fit single-line labels
      container.querySelectorAll('.cover-designation').forEach(function (d) { fitTextToLine(d, 10); });
      // Fix oracle tables that overflow their page
      container.querySelectorAll('.booklet-page').forEach(enforcePageFit);

      printBtn.disabled = false;
      var statusMsg = 'Rendered ' + pages.length + ' pages (' +
        (jsonData.weeks ? jsonData.weeks.length : 0) + ' weeks, ' +
        (jsonData.fragments ? jsonData.fragments.length : 0) + ' fragments) in ' + mode + ' mode';
      var vw = window._lastValidationWarnings;
      if (vw && vw.length > 0) {
        statusMsg += ' \u26A0 ' + vw.length + ' validation warning' + (vw.length > 1 ? 's' : '') + ' (see console)';
      }
      status.textContent = statusMsg;

      // Show encrypt row if endings need encryption, or unlock row if already encrypted
      if (needsEncryption(jsonData)) {
        hideUnlockRow();
        showEncryptRow();
      } else if (jsonData.meta && jsonData.meta.passwordEncryptedEnding &&
          jsonData.meta.passwordEncryptedEnding !== 'PLACEHOLDER_ENCRYPTED_BLOB_REPLACE_AT_GENERATION_TIME') {
        hideEncryptRow();
        showUnlockRow();
      }
    } catch (err) {
      status.textContent = 'Render error: ' + err.message;
      console.error(err);
    }
  }

  // ── Safari detection (WebKit bug #15548: @page size ignored) ──
  var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  // Chrome: native print (works perfectly with @page size)
  function doPrint() {
    if (layoutSelect) layoutSelect.value = 'booklet';
    doRender();
    setTimeout(function () { window.print(); }, 200);
  }

  // Safari: generate PDF (bypasses Safari's broken print engine)
  function doSavePDF() {
    if (!jsonData) return;
    if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
      status.textContent = 'PDF libraries not loaded. Try refreshing the page.';
      return;
    }

    // Switch to booklet spreads and render
    if (layoutSelect) layoutSelect.value = 'booklet';
    doRender();

    var spreads = container.querySelectorAll('.print-spread');
    if (!spreads.length) {
      status.textContent = 'No spreads to export.';
      return;
    }

    var jsPDF = window.jspdf.jsPDF;
    var pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: 'letter' });
    var total = spreads.length;

    printBtn.disabled = true;
    status.textContent = 'Generating PDF: page 1 of ' + total + '...';

    function renderSpread(index) {
      if (index >= total) {
        var title = (jsonData.meta && jsonData.meta.blockTitle)
          ? jsonData.meta.blockTitle.replace(/[^a-zA-Z0-9\- ]/g, '').replace(/\s+/g, '-')
          : 'booklet';
        pdf.save(title + '.pdf');
        printBtn.disabled = false;
        status.textContent = 'PDF saved: ' + total + ' pages. Open in Preview and print.';
        return;
      }

      status.textContent = 'Generating PDF: page ' + (index + 1) + ' of ' + total + '...';

      html2canvas(spreads[index], {
        scale: 2, // ~150dpi at 11in = good print quality
        useCORS: true,
        logging: false,
        backgroundColor: null
      }).then(function (canvas) {
        var imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (index > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, 11, 8.5);
        renderSpread(index + 1);
      }).catch(function (err) {
        status.textContent = 'PDF error on page ' + (index + 1) + ': ' + err.message;
        printBtn.disabled = false;
        console.error(err);
      });
    }

    // Small delay to let doRender() finish
    setTimeout(function () { renderSpread(0); }, 300);
  }

  printBtn.addEventListener('click', function () {
    if (isSafari) {
      doSavePDF();
    } else {
      doPrint();
    }
  });

  if (layoutSelect) {
    layoutSelect.addEventListener('change', doRender);
  }

  // ── CRYPTO (AES-256-GCM, matches unlock/index.html + liftrpg-encrypt.js) ──
  // Constants declared at top of IIFE (before demo mode) for hoisting

  function normalisePassword(raw) {
    return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  function deriveKey(password, salt, usage) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
    ).then(function (keyMat) {
      return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: salt, iterations: CRYPTO_ITER, hash: 'SHA-256' },
        keyMat,
        { name: 'AES-GCM', length: 256 },
        false,
        [usage || 'decrypt']
      );
    });
  }

  function decryptBlob(blobBase64url, password) {
    var b64 = blobBase64url.replace(/-/g, '+').replace(/_/g, '/');
    var bin = atob(b64);
    var buf = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);

    var salt = buf.slice(0, CRYPTO_SALT_BYTES);
    var iv = buf.slice(CRYPTO_SALT_BYTES, CRYPTO_SALT_BYTES + CRYPTO_IV_BYTES);
    var ciphertext = buf.slice(CRYPTO_SALT_BYTES + CRYPTO_IV_BYTES);

    return deriveKey(password, salt, 'decrypt').then(function (key) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ciphertext);
    }).then(function (plainBuf) {
      return new TextDecoder().decode(plainBuf);
    });
  }

  // ── ENCRYPT (AES-256-GCM, mirrors liftrpg-encrypt.js) ─────────
  function encryptBlob(payload, password) {
    var enc = new TextEncoder();
    var plaintext = enc.encode(JSON.stringify(payload));
    var salt = crypto.getRandomValues(new Uint8Array(CRYPTO_SALT_BYTES));
    var iv = crypto.getRandomValues(new Uint8Array(CRYPTO_IV_BYTES));

    return deriveKey(password, salt, 'encrypt').then(function (key) {
      return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, plaintext);
    }).then(function (cipherBuf) {
      var cipherArr = new Uint8Array(cipherBuf);
      var combined = new Uint8Array(CRYPTO_SALT_BYTES + CRYPTO_IV_BYTES + cipherArr.length);
      combined.set(salt, 0);
      combined.set(iv, CRYPTO_SALT_BYTES);
      combined.set(cipherArr, CRYPTO_SALT_BYTES + CRYPTO_IV_BYTES);

      // base64url encode
      var bin = '';
      for (var i = 0; i < combined.length; i++) bin += String.fromCharCode(combined[i]);
      return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    });
  }

  // ── UNLOCK TOOLBAR LOGIC ─────────────────────────────────────────
  function showUnlockRow() {
    var row = document.getElementById('unlock-row');
    if (row) row.style.display = '';
  }

  function hideUnlockRow() {
    var row = document.getElementById('unlock-row');
    if (row) row.style.display = 'none';
  }

  function attemptUnlock() {
    var passwordEl = document.getElementById('unlock-password');
    var statusEl = document.getElementById('unlock-status');
    var btn = document.getElementById('unlock-btn');
    var raw = passwordEl.value;
    var password = normalisePassword(raw);

    if (!password) {
      statusEl.textContent = 'Enter your password';
      passwordEl.classList.add('shake');
      setTimeout(function () { passwordEl.classList.remove('shake'); }, 500);
      return;
    }

    if (!jsonData || !jsonData.meta || !jsonData.meta.passwordEncryptedEnding) {
      statusEl.textContent = 'No encrypted ending in this JSON';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Working\u2026';
    statusEl.textContent = '';

    decryptBlob(jsonData.meta.passwordEncryptedEnding, password)
      .then(function (plaintext) {
        var payload;
        try {
          payload = JSON.parse(plaintext);
        } catch (e) {
          payload = { kicker: 'Final page', title: 'The ending', content: plaintext };
        }

        // Replace the endings page content
        var endingsPage = document.getElementById('endings-page');
        if (endingsPage) {
          var inner = endingsPage.querySelector('.endings-page');
          if (inner) {
            inner.classList.remove('endings-locked');
            inner.innerHTML = '';

            // Render the decrypted ending as booklet content
            var bodyDiv = document.createElement('div');
            bodyDiv.className = 'endings-body endings-unlocked';
            bodyDiv.innerHTML = payload.content;
            inner.appendChild(bodyDiv);
          }
        }

        // Update toolbar state
        btn.textContent = '\u2713 Unlocked';
        btn.disabled = true;
        btn.classList.add('unlocked');
        passwordEl.disabled = true;
        passwordEl.value = password;
        statusEl.textContent = '';
        var icon = document.querySelector('.unlock-icon');
        if (icon) icon.textContent = '\uD83D\uDD13';
      })
      .catch(function (err) {
        btn.disabled = false;
        btn.textContent = 'Unlock';
        passwordEl.classList.add('shake');
        setTimeout(function () { passwordEl.classList.remove('shake'); }, 500);
        statusEl.textContent = 'Wrong password';
        console.error('Decrypt failed:', err);
      });
  }

  // Wire up unlock button and Enter key
  var unlockBtn = document.getElementById('unlock-btn');
  var unlockInput = document.getElementById('unlock-password');
  if (unlockBtn) {
    unlockBtn.addEventListener('click', attemptUnlock);
  }
  if (unlockInput) {
    unlockInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') attemptUnlock();
    });
  }

  // ── ENCRYPT TOOLBAR LOGIC ──────────────────────────────────────

  function showEncryptRow() {
    var row = document.getElementById('encrypt-row');
    if (row) row.style.display = '';
  }

  function hideEncryptRow() {
    var row = document.getElementById('encrypt-row');
    if (row) row.style.display = 'none';
  }

  /**
   * Returns true when the JSON has endings that need encryption:
   * endings[] present, but passwordEncryptedEnding missing or placeholder.
   */
  function needsEncryption(data) {
    if (!data || !data.endings || !data.endings.length) return false;
    var blob = data.meta && data.meta.passwordEncryptedEnding;
    return !blob || blob === 'PLACEHOLDER_ENCRYPTED_BLOB_REPLACE_AT_GENERATION_TIME';
  }

  function attemptEncrypt() {
    var passwordEl = document.getElementById('encrypt-password');
    var statusEl = document.getElementById('encrypt-status');
    var btn = document.getElementById('encrypt-btn');
    var dlBtn = document.getElementById('encrypt-download');
    var raw = passwordEl.value;
    var password = normalisePassword(raw);

    if (!password) {
      statusEl.textContent = 'Enter your password';
      passwordEl.classList.add('shake');
      setTimeout(function () { passwordEl.classList.remove('shake'); }, 500);
      return;
    }

    if (!jsonData || !jsonData.endings || !jsonData.endings.length) {
      statusEl.textContent = 'No endings to encrypt';
      return;
    }

    // Build the ending payload — same format as liftrpg-encrypt.js
    var ending = jsonData.endings[0];
    var payload = ending.content || ending;

    btn.disabled = true;
    btn.textContent = 'Working\u2026';
    statusEl.textContent = '';

    encryptBlob(payload, password)
      .then(function (blob) {
        // Round-trip verify: decrypt with same password
        return decryptBlob(blob, password).then(function (plain) {
          var recovered = JSON.parse(plain);
          if (JSON.stringify(recovered) !== JSON.stringify(payload)) {
            throw new Error('Round-trip verification failed');
          }
          return blob;
        });
      })
      .then(function (blob) {
        // Store blob in the live data
        jsonData.meta.passwordEncryptedEnding = blob;

        // Update toolbar state
        btn.textContent = '\u2713 Encrypted';
        btn.disabled = true;
        btn.classList.add('encrypted');
        passwordEl.disabled = true;
        passwordEl.value = password;
        statusEl.textContent = 'Ending sealed \u2014 download to save';
        var icon = document.querySelector('.encrypt-icon');
        if (icon) icon.textContent = '\uD83D\uDD10';

        // Show download button
        if (dlBtn) dlBtn.style.display = '';

        // Update endings page in-place to show sealed state
        var endingsPage = document.getElementById('endings-page');
        if (endingsPage) {
          var inner = endingsPage.querySelector('.endings-page');
          if (inner) {
            inner.className = 'endings-page endings-locked';
            inner.innerHTML = '';
            inner.appendChild(document.createTextNode(''));
            var lockIcon = document.createElement('div');
            lockIcon.className = 'endings-locked-icon';
            lockIcon.textContent = '\uD83D\uDD12';
            inner.appendChild(lockIcon);
            var h2 = document.createElement('h2');
            h2.className = 'endings-title';
            h2.textContent = 'This Document Is Sealed';
            inner.appendChild(h2);
            var lockMsg = document.createElement('div');
            lockMsg.className = 'endings-locked-msg';
            lockMsg.innerHTML = 'Assemble your password from the weekly gauge readings. Return to <strong>liftrpg.co \u2192 Render</strong> and enter it to unlock this page.';
            inner.appendChild(lockMsg);
          }
        }
      })
      .catch(function (err) {
        btn.disabled = false;
        btn.textContent = 'Encrypt';
        statusEl.textContent = 'Encrypt failed: ' + err.message;
        console.error('Encrypt failed:', err);
      });
  }

  function downloadEncryptedJSON() {
    if (!jsonData) return;
    var jsonStr = JSON.stringify(jsonData, null, 2);
    var blob = new Blob([jsonStr], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var title = (jsonData.meta && jsonData.meta.blockTitle)
      ? jsonData.meta.blockTitle.replace(/[^a-zA-Z0-9\- ]/g, '').replace(/\s+/g, '-')
      : 'booklet';
    a.href = url;
    a.download = title + '-encrypted.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Wire up encrypt button and Enter key
  var encryptBtn = document.getElementById('encrypt-btn');
  var encryptInput = document.getElementById('encrypt-password');
  var encryptDl = document.getElementById('encrypt-download');
  if (encryptBtn) {
    encryptBtn.addEventListener('click', attemptEncrypt);
  }
  if (encryptInput) {
    encryptInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') attemptEncrypt();
    });
  }
  if (encryptDl) {
    encryptDl.addEventListener('click', downloadEncryptedJSON);
  }

  // Expose for debugging
  window.LiftRPGRenderer = { render: render };

})();
