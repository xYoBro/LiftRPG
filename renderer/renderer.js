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
    if (exerciseCount >= 6) return 'density-dense';
    if (exerciseCount >= 4) return 'density-compact';
    return '';
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
      inner.appendChild(txt('div', 'cover-designation', data.cover.designation));
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
      mapZone.appendChild(txt('div', 'map-title', mapState.floorLabel || 'Floor Map'));

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
      mapZone.appendChild(mapGrid);

      // Map annotations
      if (mapState.tiles) {
        mapState.tiles.forEach(function (tile) {
          if (tile.annotation) {
            mapZone.appendChild(txt('div', 'map-annotation',
              (tile.label || '') + ': ' + tile.annotation));
          }
        });
      }

      // Map note
      if (mapState.mapNote) {
        mapZone.appendChild(txt('div', 'map-note', mapState.mapNote));
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
      'Transfer each week\'s recorded component to the grid below. The complete sequence is your access credential.'));

    // Per-week rows
    var grid = el('div', 'password-assembly-grid');
    var weekCount = data.meta.weekCount || 6;
    for (var w = 1; w <= weekCount; w++) {
      var row = el('div', 'password-assembly-row');
      row.appendChild(txt('span', 'password-assembly-week-label',
        'Week ' + (w < 10 ? '0' + w : w)));
      row.appendChild(el('div', 'password-assembly-cell'));
      row.appendChild(txt('span', 'password-assembly-arrow', '\u2192'));

      // Show brief component type hint (not full extraction instruction)
      var week = data.weeks[w - 1];
      if (week && week.weeklyComponent && !week.isBossWeek) {
        row.appendChild(txt('span', 'password-assembly-hint',
          week.weeklyComponent.type ? 'cipher ' + week.weeklyComponent.type : ''));
      } else if (week && week.isBossWeek) {
        row.appendChild(txt('span', 'password-assembly-hint', 'convergence'));
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

  // ── MAIN ORCHESTRATOR ──────────────────────────────────────

  function render(data) {
    // ── Defensive validation — fail fast with actionable messages ──
    if (!data || typeof data !== 'object') {
      throw new Error('Render failed: expected a JSON object, got ' + typeof data);
    }
    var _required = ['meta', 'cover', 'rulesSpread', 'weeks'];
    _required.forEach(function (key) {
      if (!data[key]) throw new Error('Render failed: missing required field "' + key + '"');
    });
    if (!Array.isArray(data.weeks) || data.weeks.length === 0) {
      throw new Error('Render failed: data.weeks must be a non-empty array');
    }
    // ─────────────────────────────────────────────────────────────

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
        var pages = render(data);
        var container = document.getElementById('booklet-container');
        container.innerHTML = '';

        for (var i = 0; i < pages.length; i++) {
          container.appendChild(pages[i]);
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

      printBtn.disabled = false;
      status.textContent = 'Rendered ' + pages.length + ' pages (' +
        (jsonData.weeks ? jsonData.weeks.length : 0) + ' weeks, ' +
        (jsonData.fragments ? jsonData.fragments.length : 0) + ' fragments) in ' + mode + ' mode';

      // Show unlock row if encrypted ending exists
      if (jsonData.meta && jsonData.meta.passwordEncryptedEnding &&
          jsonData.meta.passwordEncryptedEnding !== 'PLACEHOLDER_ENCRYPTED_BLOB_REPLACE_AT_GENERATION_TIME') {
        showUnlockRow();
      }
    } catch (err) {
      status.textContent = 'Render error: ' + err.message;
      console.error(err);
    }
  }

  // ── Safari detection (WebKit bug #15548: @page size ignored) ──
  var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  function doPrint() {
    if (layoutSelect) layoutSelect.value = 'booklet';
    doRender();
    setTimeout(function () { window.print(); }, 200);
  }

  function showSafariPrintModal() {
    // Remove any existing modal
    var existing = document.querySelector('.safari-print-modal');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.className = 'safari-print-modal';

    var panel = document.createElement('div');
    panel.className = 'safari-print-panel';

    panel.innerHTML =
      '<h2>Print Setup for Safari</h2>' +
      '<p>Safari requires manual print settings. In the print dialog:</p>' +
      '<ol>' +
      '<li>Set orientation to <strong>Landscape</strong></li>' +
      '<li>Uncheck <strong>Print headers and footers</strong></li>' +
      '<li>Set <strong>Scale</strong> to <strong>100%</strong></li>' +
      '</ol>' +
      '<p class="safari-print-note">Chrome handles this automatically if you have it available.</p>' +
      '<div class="safari-print-actions">' +
      '<button class="safari-print-continue" type="button">Continue to Print</button>' +
      '<button class="safari-print-cancel" type="button">Cancel</button>' +
      '</div>';

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    panel.querySelector('.safari-print-continue').addEventListener('click', function () {
      overlay.remove();
      doPrint();
    });

    panel.querySelector('.safari-print-cancel').addEventListener('click', function () {
      overlay.remove();
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.remove();
    });
  }

  printBtn.addEventListener('click', function () {
    if (isSafari) {
      showSafariPrintModal();
    } else {
      doPrint();
    }
  });

  if (layoutSelect) {
    layoutSelect.addEventListener('change', doRender);
  }

  // ── CRYPTO (AES-256-GCM, matches unlock/index.html) ─────────────
  var CRYPTO_SALT_BYTES = 32;
  var CRYPTO_IV_BYTES = 12;
  var CRYPTO_ITER = 200000;

  function normalisePassword(raw) {
    return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  function deriveKey(password, salt) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
    ).then(function (keyMat) {
      return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: salt, iterations: CRYPTO_ITER, hash: 'SHA-256' },
        keyMat,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
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

    return deriveKey(password, salt).then(function (key) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ciphertext);
    }).then(function (plainBuf) {
      return new TextDecoder().decode(plainBuf);
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

  // Expose for debugging
  window.LiftRPGRenderer = { render: render };

})();
