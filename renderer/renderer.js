/* ══════════════════════════════════════════════════════════════
   LIFTRPG BOOKLET RENDERER v1.0
   Reads schema v1.3 JSON → produces printable DOM pages.
   Browser-native JS. No build step.
   ══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  // ── UTILITIES ──────────────────────────────────────────────

  function esc(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  /** Create a DOM element with optional class and children */
  function el(tag, className, content) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (typeof content === 'string') {
      e.innerHTML = content;
    } else if (content && content.nodeType) {
      e.appendChild(content);
    } else if (Array.isArray(content)) {
      content.forEach(function(c) {
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
    return { lines: displayText.split('\n').filter(function(l) { return l.trim(); }) };
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
      data.cover.colophonLines.forEach(function(line) {
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
    header.appendChild(txt('span', 'page-num', 'p.02'));
    inner.appendChild(header);

    // Title
    if (data.rulesSpread.leftPage.title) {
      inner.appendChild(txt('h2', 'rules-title', data.rulesSpread.leftPage.title));
    }

    // Body content
    var body = el('div', 'rules-body');
    if (data.rulesSpread.leftPage.sections) {
      data.rulesSpread.leftPage.sections.forEach(function(section) {
        if (section.heading) {
          body.appendChild(txt('h3', '', section.heading));
        }
        var sectionBody = section.text || section.body || '';
        if (sectionBody) {
          sectionBody.split('\n').forEach(function(para) {
            if (para.trim()) body.appendChild(txt('p', '', para.trim()));
          });
        }
      });
    } else if (data.rulesSpread.leftPage.body) {
      data.rulesSpread.leftPage.body.split('\n').forEach(function(para) {
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
      : 'Record each week\'s component below. When all positions are filled, assemble the complete password and visit the unlock URL.';
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
  function renderWorkoutLeft(week, weekNum, sessions, totalWeeks, isOverflow) {
    var p = page('workout-left');
    var inner = el('div', 'workout-left');

    // Page header
    var hdr = el('div', 'page-header');
    hdr.appendChild(txt('span', '', 'The Cartographer of Unmapped Rooms'));
    var pageNum = 2 + (weekNum * 2);
    hdr.appendChild(txt('span', 'page-num', 'p.' + (pageNum < 10 ? '0' + pageNum : pageNum)));
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
    sessions.forEach(function(session) {
      var maxExercises = Math.max.apply(null, sessions.map(function(s) { return s.exercises.length; }));
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
      session.exercises.forEach(function(ex) {
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

        // Rep boxes
        var tdReps = document.createElement('td');
        var repsDiv = document.createElement('div');
        repsDiv.className = 'rep-boxes';
        var sets = ex.sets || 3;
        var reps = ex.repsPerSet;
        if (typeof reps === 'number') {
          for (var r = 0; r < reps; r++) {
            for (var s = 0; s < sets; s++) {
              // One box per set (not per rep) — each set gets repsPerSet boxes?
              // Actually: the schema says sets × repsPerSet boxes total
              // But for space: render sets rows of reps boxes
              // Simplified: render (sets) boxes per exercise row
            }
          }
          // Actually: for each set, render repsPerSet boxes in a row
          // The prototype shows 3 sets of 5 rep boxes = 15 boxes per exercise
          // That's way too many for the space. Let me check the prototype...
          // The prototype shows 5 boxes (one per rep in a set) per row.
          // Actually for a 3x5, it shows 5 rep boxes (for one set's reps)
          // and there are 3 rows (one per set). No — looking at Week 1 data,
          // it shows a single row of 5 boxes. The sets column shows "3×5".
          // So it's: Exercise Name ... [5 boxes] Weight
          // Where 5 = repsPerSet, and "3×" is shown separately.
          for (var b = 0; b < reps; b++) {
            repsDiv.appendChild(el('div', 'rep-box'));
          }
        } else {
          // String reps (AMRAP, 5/3/1, etc) — single wide field
          var repLabel = txt('span', 'exercise-weight', String(reps));
          repsDiv.appendChild(repLabel);
        }
        tdReps.appendChild(repsDiv);
        tr.appendChild(tdReps);

        // Weight
        if (ex.weightField) {
          var tdWeight = document.createElement('td');
          tdWeight.className = 'exercise-weight';
          tdWeight.textContent = typeof ex.weightField === 'boolean' ? '___lb' : ex.weightField;
          tr.appendChild(tdWeight);
        }

        table.appendChild(tr);
      });
      card.appendChild(table);

      // Notes box (hidden in dense mode via CSS)
      var notesBox = el('div', 'notes-box');
      var notesLines = el('div', 'notes-lines');
      var lineCount = density === 'density-compact' ? 1 : 2;
      for (var n = 0; n < lineCount; n++) {
        notesLines.appendChild(el('div', 'notes-line'));
      }
      notesBox.appendChild(notesLines);
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
        'Survey week ' + weekNum + ' of ' + tw));
      inner.appendChild(footer);
    }

    p.appendChild(inner);
    return p;
  }

  // ═══ FIELD OPS RIGHT (Map + Cipher + Oracle) ═══
  function renderFieldOpsRight(week, weekNum) {
    var p = page('field-ops');
    var inner = el('div', 'field-ops-right');

    // Header
    var hdr = el('div', 'rp-header');
    hdr.appendChild(txt('span', '', 'Field Operations'));
    var pageNum = 3 + (weekNum * 2);
    hdr.appendChild(txt('span', '', 'p.' + (pageNum < 10 ? '0' + pageNum : pageNum)));
    inner.appendChild(hdr);

    // Content grid
    var content = el('div', 'rp-content');

    // ── Cipher Zone ──
    var cipherZone = el('div', 'cipher-zone');
    var cipher = week.fieldOps.cipher;
    if (cipher) {
      cipherZone.appendChild(txt('div', 'puzzle-title', cipher.title));

      // Parse and render display text
      if (cipher.body && cipher.body.displayText) {
        var lines = cipher.body.displayText.split('\n');
        var currentSection = null;

        lines.forEach(function(line) {
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
      if (cipher.body.workSpace) {
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
        mapState.tiles.forEach(function(tile) {
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
        mapState.tiles.forEach(function(tile) {
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
        // Group by cluster — show one representative entry per cluster range
        var clusters = {};
        oracle.entries.forEach(function(entry) {
          var c = entry.cluster != null ? entry.cluster : Math.floor(parseInt(entry.roll) / 10);
          if (!clusters[c]) clusters[c] = [];
          clusters[c].push(entry);
        });

        var clusterKeys = Object.keys(clusters).sort(function(a,b) { return a - b; });
        clusterKeys.forEach(function(key) {
          var group = clusters[key];
          var first = group[0];
          var last = group[group.length - 1];
          var entryEl = el('div', 'oracle-entry oracle-case');

          var rangeStr = 'Case ' + first.roll + '\u2013' + last.roll;
          entryEl.appendChild(txt('span', 'oracle-case-num', rangeStr));

          // Use first entry's text as representative
          entryEl.appendChild(txt('span', 'oracle-text', first.text));

          if (first.fragmentRef) {
            entryEl.appendChild(txt('span', 'frag-ref', '\u2192 ' + first.fragmentRef));
          }

          entries.appendChild(entryEl);
        });
      }
      oracleZone.appendChild(entries);
    }
    content.appendChild(oracleZone);

    inner.appendChild(content);
    p.appendChild(inner);
    return p;
  }

  // ═══ BOSS RIGHT (replaces field ops on final week) ═══
  function renderBossRight(data, week, weekNum, totalWeeks) {
    var p = page('boss');
    var inner = el('div', 'boss-right');
    var boss = week.bossEncounter;

    // Header
    var hdr = el('div', 'boss-header');
    hdr.textContent = 'Week ' + (weekNum < 10 ? '0' + weekNum : weekNum) + ' \u00b7 Final Survey';
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
        boss.componentInputs.forEach(function(comp, idx) {
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
      inner.appendChild(txt('div', 'boss-title', 'Final Survey'));
      inner.appendChild(txt('div', 'boss-narrative', 'The building is waiting.'));
    }

    p.appendChild(inner);
    return p;
  }

  // ═══ OVERFLOW LEFT (sessions 4+) ═══
  function renderOverflowLeft(week, weekNum, overflowSessions, totalWeeks) {
    return renderWorkoutLeft(week, weekNum, overflowSessions, totalWeeks, true);
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
      bodyContent.split('\n').forEach(function(para) {
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

    fragments.forEach(function(frag, idx) {
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
        bodyText.split('\n').forEach(function(para) {
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
  function renderPasswordAssembly(data) {
    var p = page('password-assembly');
    var inner = el('div', 'password-assembly-page');

    inner.appendChild(txt('h2', 'password-assembly-title', 'Survey Record \u2014 Final Assembly'));
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

    // Unlock instruction
    final_.appendChild(txt('div', 'password-unlock-instruction',
      'When all positions are filled, visit the unlock page to discover what the survey found.'));
    var urlText = data.rulesSpread.rightPage && data.rulesSpread.rightPage.unlockUrl
      ? data.rulesSpread.rightPage.unlockUrl
      : 'liftrpg.co/unlock';
    final_.appendChild(txt('span', 'password-unlock-url', urlText));

    inner.appendChild(final_);

    p.appendChild(inner);
    return p;
  }

  // ═══ ENDINGS PAGE ═══
  function renderEndingsPage(data) {
    var p = page('endings');
    var inner = el('div', 'endings-page');

    // Use actual ending data from JSON if available
    if (data.endings && data.endings.length && data.endings[0].content) {
      var ending = data.endings[0].content;
      if (ending.body) {
        var bodyDiv = el('div', 'endings-body');
        ending.body.split('\n').forEach(function(para) {
          if (para.trim()) bodyDiv.appendChild(txt('p', '', para.trim()));
        });
        inner.appendChild(bodyDiv);
      }
      if (ending.finalLine) {
        inner.appendChild(txt('div', 'endings-final-line', ending.finalLine));
      }
    } else {
      // Fallback
      inner.appendChild(txt('h2', 'endings-title', 'The Survey Is Complete'));
      inner.appendChild(txt('div', 'endings-body',
        'You have completed your survey assignment. Your password has been assembled from the components you recorded each week. ' +
        'Enter it at the address below to access the final survey report.'));
    }

    var urlText = data.rulesSpread.rightPage && data.rulesSpread.rightPage.unlockUrl
      ? data.rulesSpread.rightPage.unlockUrl
      : 'liftrpg.co/unlock';
    inner.appendChild(txt('div', 'endings-url', urlText));

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
    var pages = [];
    var totalWeeks = data.weeks.length;

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
      pages.push(renderWorkoutLeft(week, weekNum, visibleSessions, totalWeeks, false));

      // Right page: field ops or boss
      if (week.isBossWeek) {
        pages.push(renderBossRight(data, week, weekNum, totalWeeks));
      } else {
        pages.push(renderFieldOpsRight(week, weekNum));
      }

      // Overflow: sessions 4+
      if (week.overflow && sessions.length > 3) {
        var overflowSessions = sessions.slice(3);
        pages.push(renderOverflowLeft(week, weekNum, overflowSessions, totalWeeks));
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
        var content1Len = (frag1.content || frag1.body || frag1.bodyText || '').length;
        var frag2 = frags[f + 1];
        var content2Len = frag2 ? (frag2.content || frag2.body || frag2.bodyText || '').length : 0;

        // If combined content is very long (>1200 chars), put 1 per page
        if (frag2 && (content1Len + content2Len > 1200)) {
          // Long fragment — give it its own page
          if (content1Len > 600) {
            pages.push(renderFragmentPage([frag1], f, fragPageIdx++));
            f += 1;
          } else {
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
    pages.push(renderPasswordAssembly(data));

    // Endings
    pages.push(renderEndingsPage(data));

    // Back cover
    pages.push(renderBackCover(data));

    // Pad to multiple of 4 for saddle-stitch
    while (pages.length % 4 !== 0) {
      var blank = page('blank');
      blank.classList.add('blank-page');
      pages.push(blank);
    }

    return pages;
  }

  // ── APP INITIALIZATION ─────────────────────────────────────

  var jsonData = null;
  var fileInput = document.getElementById('json-input');
  var renderBtn = document.getElementById('render-btn');
  var printBtn = document.getElementById('print-btn');
  var container = document.getElementById('booklet-container');
  var status = document.getElementById('status');
  var spreadToggle = document.getElementById('spread-toggle');

  fileInput.addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        jsonData = JSON.parse(ev.target.result);
        renderBtn.disabled = false;
        status.textContent = 'Loaded: ' + (jsonData.meta ? jsonData.meta.blockTitle : 'unknown') +
          ' (' + (jsonData.weeks ? jsonData.weeks.length : 0) + ' weeks)';
      } catch(err) {
        status.textContent = 'JSON error: ' + err.message;
      }
    };
    reader.readAsText(file);
  });

  renderBtn.addEventListener('click', function() {
    if (!jsonData) return;
    container.innerHTML = '';
    try {
      var pages = render(jsonData);
      pages.forEach(function(p) { container.appendChild(p); });
      printBtn.disabled = false;
      status.textContent = 'Rendered ' + pages.length + ' pages (' +
        (jsonData.weeks ? jsonData.weeks.length : 0) + ' weeks, ' +
        (jsonData.fragments ? jsonData.fragments.length : 0) + ' fragments)';
    } catch(err) {
      status.textContent = 'Render error: ' + err.message;
      console.error(err);
    }
  });

  printBtn.addEventListener('click', function() {
    window.print();
  });

  spreadToggle.addEventListener('change', function() {
    container.classList.toggle('spread-view', this.checked);
  });

  // Expose for debugging
  window.LiftRPGRenderer = { render: render };

})();
