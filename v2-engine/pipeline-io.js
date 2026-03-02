// ── Pipeline I/O: Validation, Import/Export, Assembly ─────────
//
// Prompt generation, stage validation orchestration, JSON
// import/export, assembly + theme injection + saddle-stitch
// imposition.
//
// Depends on: pipeline-state.js (Pipeline),
//             intake-ui.js (restoreDiceSelection, setCoverImage,
//                           clearCoverImage, showCoverImagePrompt),
//             ui-state.js (unlockStage, unlockWiringStage, renderRail),
//             prompt-assembler.js (buildWiringPrompt, buildStagePrompt),
//             validators.js (validateWiringBlueprint, validateStageData),
//             json-repair.js (safeExtract, _lastExtractRepairs),
//             box-packer.js (runPacker)
//
// Exposed: window.generateWiringPrompt, window.generateStagePrompt,
//          window.validateWiring, window.validateStage,
//          window.exportJson, window.importJson,
//          window.handleFileImport, window.assemble

function generateWiringPrompt() {
    var promptText = buildWiringPrompt(Pipeline.templates, Pipeline.get('intake'));
    var box = document.getElementById('promptOut-W');
    box.value = promptText;
    box.select();
    navigator.clipboard.writeText(promptText).then(function() {
        var btn = document.getElementById('btnPrompt-W');
        btn.innerText = "\u2705 COPIED!";
        setTimeout(function() { btn.innerText = 'Generate Wiring Prompt'; }, 2000);
    }).catch(function() {
        // Clipboard API unavailable (non-HTTPS or denied) — select text for manual copy
        box.focus();
        box.select();
        var btn = document.getElementById('btnPrompt-W');
        btn.innerText = "SELECT ALL \u2192 Ctrl/\u2318+C";
        setTimeout(function() { btn.innerText = 'Generate Wiring Prompt'; }, 3000);
    });
}

function generateStagePrompt(num) {
    var promptText = buildStagePrompt(num, Pipeline.templates, Pipeline.data());
    if (promptText === null) {
        var box = document.getElementById('promptOut-' + num);
        box.value = "Stage 5 Not Applicable: No evidence tracks found in Stage 1 mechanics.";
        return;
    }
    var box = document.getElementById('promptOut-' + num);
    box.value = promptText;
    box.select();
    navigator.clipboard.writeText(promptText).then(function() {
        var btn = document.getElementById('btnPrompt-' + num);
        btn.innerText = "\u2705 COPIED!";
        setTimeout(function() { btn.innerText = 'Generate Prompt ' + num; }, 2000);
    }).catch(function() {
        // Clipboard API unavailable (non-HTTPS or denied) — select text for manual copy
        box.focus();
        box.select();
        var btn = document.getElementById('btnPrompt-' + num);
        btn.innerText = "SELECT ALL \u2192 Ctrl/\u2318+C";
        setTimeout(function() { btn.innerText = 'Generate Prompt ' + num; }, 3000);
    });
}

function validateWiring() {
    var raw = document.getElementById('jsonIn-W').value.trim();
    var statusEl = document.getElementById('valStatus-W');
    if (!raw) { statusEl.innerHTML = '<span style="color:var(--accent)">No JSON pasted.</span>'; return; }

    var obj;
    try { obj = safeExtract(raw); }
    catch (ex) { statusEl.innerHTML = '<span style="color:var(--accent)">Invalid JSON: ' + escapeHtml(ex.message) + '</span>'; return; }

    var jsonRepairs = _lastExtractRepairs.slice();
    var result = validateWiringBlueprint(obj);
    if (result.errors.length > 0) {
        statusEl.innerHTML = '<span style="color:var(--accent)">ERRORS:<br>' + result.errors.map(escapeHtml).join('<br>') + '</span>' +
            (result.warnings.length > 0 ? '<br><span style="color:var(--yellow, orange)">WARNINGS:<br>' + result.warnings.map(escapeHtml).join('<br>') + '</span>' : '');
        return;
    }

    Pipeline.set('wiring', obj);
    document.getElementById('stageStatus-W').innerText = 'OK';
    document.getElementById('stageStatus-W').className = 'card-status ok';
    document.getElementById('stageCard-W').classList.remove('active');
    document.getElementById('stageCard-W').classList.add('valid');
    document.getElementById('stageBody-W').classList.remove('open');

    var allWiringWarnings = result.warnings.slice();
    if (jsonRepairs.length) {
        allWiringWarnings.unshift('JSON auto-repaired: ' + jsonRepairs.join(', '));
        console.warn('Wiring blueprint JSON repairs applied:', jsonRepairs);
    }

    if (allWiringWarnings.length > 0) {
        statusEl.innerHTML = '<span style="color:var(--yellow, orange)">Saved with warnings:<br>' + allWiringWarnings.map(escapeHtml).join('<br>') + '</span>';
        console.warn('Wiring blueprint warnings:', allWiringWarnings);
    } else {
        statusEl.innerHTML = '<span style="color:var(--green, #4a4)">Blueprint validated and saved.</span>';
    }

    unlockStage(1);
}

function validateStage(num) {
    var val = document.getElementById('jsonIn-' + num).value;
    try {
        var obj = safeExtract(val);
        var jsonRepairs = _lastExtractRepairs.slice();
        var result = validateStageData(num, obj, Pipeline.data());

        if (result.errors.length > 0) {
            throw new Error("Critical validation failed:\n- " + result.errors.join("\n- "));
        }

        Pipeline.set(num, obj);

        // Clear out later stages to prevent stale cross-stage references
        for (var i = num + 1; i <= 5; i++) {
            Pipeline.delete(i);
            var card = document.getElementById('stageCard-' + i);
            if (card) {
                card.classList.remove('valid', 'active');
                card.classList.add('locked');
                document.getElementById('stageStatus-' + i).innerText = "LOCKED";
                document.getElementById('stageStatus-' + i).className = "card-status";
                document.getElementById('jsonIn-' + i).value = "";
                document.getElementById('valStatus-' + i).className = "inbound-status";
                document.getElementById('valStatus-' + i).innerText = "";
                document.getElementById('promptOut-' + i).value = "";
            }
        }
        Pipeline.stage = num;

        // Surface repair and validation warnings to user
        var allWarnings = result.warnings.slice();
        if (jsonRepairs.length) {
            allWarnings.unshift('JSON auto-repaired: ' + jsonRepairs.join(', '));
            console.warn('Stage ' + num + ' JSON repairs applied:', jsonRepairs);
        }
        if (jsonRepairs.indexOf('truncation') !== -1) {
            allWarnings.unshift('JSON was truncated — LLM may have hit output limit. Some content may be missing.');
        }
        var warnText = allWarnings.length ? ' (' + allWarnings.length + ' warning' + (allWarnings.length > 1 ? 's' : '') + ')' : '';
        document.getElementById('valStatus-' + num).innerText = "\u2705 JSON Validated & Saved" + warnText;
        document.getElementById('valStatus-' + num).className = "inbound-status ok";
        if (allWarnings.length) {
            console.warn('Stage ' + num + ' validation warnings:', allWarnings);
        }
        document.getElementById('stageStatus-' + num).innerText = "OK";
        document.getElementById('stageStatus-' + num).className = "card-status ok";
        document.getElementById('stageCard-' + num).classList.remove('active');
        document.getElementById('stageCard-' + num).classList.add('valid');

        // Show suggested cover image prompt after Stage 1 validation
        if (num === 1) {
            showCoverImagePrompt(obj);
        }

        // Collapse this stage
        document.getElementById('stageBody-' + num).classList.remove('open');

        if (num < 5) {
            // Auto-skip Stage 5 if no evidence tracks exist
            if (num === 4) {
                var s1 = Pipeline.get(1) || {};
                var tracks = (s1.mechanics && s1.mechanics.tracks) || [];
                var evidenceTracks = tracks.filter(function (t) { return t.type === 'faction' || t.type === 'progress'; });
                if (evidenceTracks.length === 0) {
                    Pipeline.set(5, {});
                    Pipeline.stage = 6;
                    renderRail();
                    var card5 = document.getElementById('stageCard-5');
                    card5.classList.remove('locked', 'active');
                    card5.classList.add('valid');
                    document.getElementById('stageStatus-5').innerText = 'SKIPPED';
                    document.getElementById('stageStatus-5').className = 'card-status ok';
                    document.getElementById('btnAssemble').disabled = false;
                    document.getElementById('footerStatus').innerText = 'Stage 5 skipped (no evidence tracks). Ready to assemble.';
                    document.getElementById('btnAssemble').classList.add('btn-primary');
                    return;
                }
            }
            unlockStage(num + 1);
        } else {
            Pipeline.stage = 6;
            renderRail();
            document.getElementById('btnAssemble').disabled = false;
            document.getElementById('footerStatus').innerText = "All stages complete. Ready to assemble.";
            document.getElementById('btnAssemble').classList.add('btn-primary');
        }
    } catch (e) {
        document.getElementById('valStatus-' + num).innerText = "\u274c JSON Error: " + e.message;
        document.getElementById('valStatus-' + num).className = "inbound-status err";
        document.getElementById('stageStatus-' + num).innerText = "ERROR";
        document.getElementById('stageStatus-' + num).className = "card-status err";
    }
}


function exportJson() {
    var data = Pipeline.data();
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(Pipeline.toJSON());
    var dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    var s1 = data[1];
    var title = (s1 && s1.meta && s1.meta.title) ? s1.meta.title.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'liftrpg-pipeline';
    dlAnchorElem.setAttribute("download", title + '-' + Date.now() + '.json');
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    document.body.removeChild(dlAnchorElem);
    document.getElementById('footerStatus').innerText = "JSON exported successfully.";
}

function importJson() {
    document.getElementById('fileImport').click();
}

function handleFileImport(event) {
    var file = event.target.files[0];
    if (!file) return;

    // Clean up any existing cover prompt box
    var coverPrompt = document.getElementById('coverImagePromptBox');
    if (coverPrompt) coverPrompt.remove();

    var reader = new FileReader();
    reader.onload = function (e) {
        try {
            var importedData = JSON.parse(e.target.result);

            // Validate each stage before accepting the import
            var importErrors = [];
            for (var num = 1; num <= 5; num++) {
                if (importedData[num]) {
                    var result = validateStageData(num, importedData[num], importedData);
                    if (result.errors.length > 0) {
                        importErrors.push('Stage ' + num + ': ' + result.errors.join(', '));
                    }
                }
            }
            if (importErrors.length > 0) {
                alert("Import blocked — validation errors:\n\n" + importErrors.join("\n"));
                return;
            }

            if (!Pipeline.isEmpty() && !confirm("This will overwrite your current progress. Continue?")) {
                return;
            }

            Pipeline.replace(importedData);

            // Repopulate form
            if (importedData.intake) {
                // Backward compat: old JSON files use 'genre' + 'creativeDirection' as separate fields
                if (!importedData.intake.narrativeBrief && (importedData.intake.genre || importedData.intake.creativeDirection || importedData.intake.theme)) {
                    var parts = [];
                    if (importedData.intake.genre || importedData.intake.theme) parts.push(importedData.intake.genre || importedData.intake.theme);
                    if (importedData.intake.creativeDirection) parts.push(importedData.intake.creativeDirection);
                    importedData.intake.narrativeBrief = parts.join('. ');
                }
                if (importedData.intake.workout) document.getElementById('progWorkout').value = importedData.intake.workout;
                if (importedData.intake.narrativeBrief) document.getElementById('progNarrativeBrief').value = importedData.intake.narrativeBrief;
                if (importedData.intake.dice) restoreDiceSelection(importedData.intake.dice);
                if (importedData.intake.coverImage) {
                    setCoverImage(importedData.intake.coverImage);
                } else {
                    clearCoverImage();
                }
                document.getElementById('stageStatus-0').innerText = 'OK';
                document.getElementById('stageStatus-0').className = 'card-status ok';
                document.getElementById('stageCard-0').classList.remove('active');
                document.getElementById('stageCard-0').classList.add('valid');
            }

            // Restore wiring blueprint
            if (importedData.wiring) {
                document.getElementById('jsonIn-W').value = JSON.stringify(importedData.wiring, null, 2);
                document.getElementById('stageStatus-W').innerText = 'OK';
                document.getElementById('stageStatus-W').className = 'card-status ok';
                document.getElementById('stageCard-W').classList.remove('locked', 'active');
                document.getElementById('stageCard-W').classList.add('valid');
            } else if (importedData.intake) {
                // Intake done but no wiring — unlock wiring stage
                document.getElementById('stageCard-W').classList.remove('locked');
                document.getElementById('stageCard-W').classList.add('active');
                document.getElementById('stageStatus-W').innerText = 'READY';
            }

            // Repopulate text areas and validate stages
            for (var num = 1; num <= 5; num++) {
                if (importedData[num]) {
                    document.getElementById('jsonIn-' + num).value = JSON.stringify(importedData[num], null, 2);
                    document.getElementById('valStatus-' + num).innerText = "\u2705 JSON Validated & Saved";
                    document.getElementById('valStatus-' + num).className = "inbound-status ok";
                    document.getElementById('stageStatus-' + num).innerText = "OK";
                    document.getElementById('stageStatus-' + num).className = "card-status ok";
                    document.getElementById('stageCard-' + num).classList.remove('locked', 'active');
                    document.getElementById('stageCard-' + num).classList.add('valid');
                    document.getElementById('stageBody-' + num).classList.remove('open');
                }
            }

            // Show suggested cover image prompt if Stage 1 data exists
            if (importedData[1]) {
                showCoverImagePrompt(importedData[1]);
            }

            // Determine highest completed stage
            var maxCompleted = 0;
            for (var i = 1; i <= 5; i++) {
                if (importedData[i]) maxCompleted = i;
            }

            if (maxCompleted === 5) {
                Pipeline.stage = 6;
                document.getElementById('btnAssemble').disabled = false;
                document.getElementById('btnAssemble').classList.add('btn-primary');
                document.getElementById('footerStatus').innerText = "Import successful. Ready to assemble.";
                // Close all bodies
                document.querySelectorAll('.card-body').forEach(function (el) { el.classList.remove('open'); });
            } else if (maxCompleted > 0) {
                unlockStage(maxCompleted + 1);
                document.getElementById('footerStatus').innerText = 'Import successful. Next step: Stage ' + (maxCompleted + 1) + '.';
            } else {
                unlockStage(1);
                document.getElementById('footerStatus').innerText = "Import successful. Ready to begin Stage 1.";
            }

            renderRail();

        } catch (error) {
            alert("Error importing JSON: " + error.message);
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
}

// ── Assembly + Theme Injection + Imposition ──────────────

async function assemble() {
    document.getElementById('btnAssemble').disabled = true;
    document.getElementById('btnAssemble').innerText = "Assembling...";

    try {
        // Build the final payload from all 5 stages
        var s1 = Pipeline.get(1) || {};
        var s2 = Pipeline.get(2) || {};
        var s3 = Pipeline.get(3) || {};
        var s4 = Pipeline.get(4) || {};
        var s5 = Pipeline.get(5) || {};

        var finalPayload = {
            meta: s1.meta,
            workout: s1.workout,
            mechanics: s1.mechanics,
            theme: s1.theme,
            pages: s1.pages,
            archiveLayout: s1.archiveLayout,
            map: s2.map || s1.map,
            voice: s2.voice,
            story: {
                encounters: (s1.story && s1.story.encounters) || [],
                refScheme: s1.story && s1.story.refScheme,
                refs: {},
                archives: s3.storyArchives || {},
                endings: s3.storyEndings || []
            }
        };

        // Merge REF nodes from stages 4 and 5
        if (s4) Object.assign(finalPayload.story.refs, s4);
        if (s5) {
            Object.assign(finalPayload.story.refs, s5);
            finalPayload.story.evidence = s5;
        }

        // User-uploaded cover image overrides LLM-generated one
        var intake = Pipeline.get('intake');
        if (intake && intake.coverImage) {
            if (!finalPayload.theme.art) finalPayload.theme.art = {};
            finalPayload.theme.art.coverImage = intake.coverImage;
        } else if (finalPayload.theme && finalPayload.theme.art) {
            delete finalPayload.theme.art.coverImage;
        }

        // Inject theme as CSS custom properties
        injectTheme(finalPayload.theme);

        // Wait for Google Fonts to load before rendering
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }

        // If no pages[] array (e.g. legacy import), auto-generate page order
        if (!finalPayload.pages || !finalPayload.pages.length) {
            finalPayload.pages = autoGeneratePages(finalPayload);
        }

        document.getElementById('app-ui').style.display = 'none';
        document.getElementById('footerBar').style.position = 'relative';
        document.getElementById('zine-container-wrapper').style.display = 'flex';
        document.getElementById('btnPrint').style.display = 'block';

        window.runPacker(finalPayload);
        imposeToSpreads();

        document.getElementById('footerStatus').innerText = "Assemble complete! Review the zine below.";
    } catch (e) {
        alert("Layout Error: " + e.message + "\nCheck dev console for more details.");
        console.error(e);
        document.getElementById('btnAssemble').disabled = false;
        document.getElementById('btnAssemble').innerText = "Validate & Assemble";
    }
}

// -- File-private helpers --

function injectTheme(theme) {
    // Remove previous theme style if any
    var existing = document.getElementById('zine-theme');
    if (existing) existing.remove();

    if (!theme) return;

    // Store theme reference for renderer access (coverImage, dividerSvg, etc.)
    window._zineTheme = theme;

    // Inject Google Fonts
    var bodyFont = theme.fonts && theme.fonts.body;
    var headingFont = theme.fonts && theme.fonts.heading;
    var fontFamilies = [bodyFont, headingFont].filter(Boolean);
    var seen = {};
    var uniqueFonts = [];
    fontFamilies.forEach(function (f) {
        if (!seen[f]) { seen[f] = true; uniqueFonts.push(f); }
    });
    uniqueFonts.forEach(function (f) {
        var familyName = f.split(',')[0].replace(/['"]/g, '').trim();
        if (familyName && !document.querySelector('link[data-font="' + familyName + '"]')) {
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(familyName) + ':ital,wght@0,400;0,600;0,700;1,400&display=swap';
            link.dataset.font = familyName;
            document.head.appendChild(link);
        }
    });

    // Layout Diversity computation
    var stampMap = { heavy: '3px', light: '1px', double: '2px', redacted: '4px', distressed: '2px', none: '0px' };
    var stampWidth = (theme.layout && stampMap[theme.layout.stampStyle]) || '2px';

    var pagePadding = '0.5in';
    if (theme.layout && theme.layout.defaultDensity === 'high') pagePadding = '0.3in';
    if (theme.layout && theme.layout.defaultDensity === 'low') pagePadding = '0.7in';

    var colors = theme.colors || {};
    var fonts = theme.fonts || {};
    var layout = theme.layout || {};

    var style = document.createElement('style');
    style.id = 'zine-theme';
    style.textContent = ':root {'
        + '--ink: ' + (colors.ink || '#1a1a18') + ';'
        + '--paper: ' + (colors.paper || '#f0ede4') + ';'
        + '--fog: ' + (colors.fog || '#e6e2d8') + ';'
        + '--accent: ' + (colors.accent || '#c45c00') + ';'
        + '--muted: ' + (colors.muted || '#5a5a56') + ';'
        + '--font-body: ' + (fonts.body || "'Helvetica Neue', sans-serif") + ';'
        + '--font-heading: ' + (fonts.heading || "var(--font-body)") + ';'
        + '--page-padding: ' + pagePadding + ';'
        + '--stamp-width: ' + stampWidth + ';'
        + '--archive-separator: ' + (layout.archiveSeparator === 'none' ? 'none' : '1px solid var(--fog)') + ';'
        + '--text-transform-headings: ' + (layout.textTransformHeadings || 'uppercase') + ';'
        + '--text-transform-labels: ' + (layout.textTransformLabels || 'uppercase') + ';'
        + '--log-name-width: ' + (layout.logNameWidth || '35%') + ';'
        + '--log-sets-width: ' + (layout.logSetsWidth || '50%') + ';'
        + '--log-box-width: ' + (layout.logBoxWidth || '1.8rem') + ';'
        + '--log-box-height: ' + (layout.logBoxHeight || '1.1rem') + ';'
        + '--log-border: ' + (layout.logBorder || '1.5px solid var(--ink)') + ';'
        + '}'
        + ((theme.customCss || '').replace(/</g, '').replace(/>/g, ''));
    document.head.appendChild(style);

    // Apply visual treatment via data attribute
    var treatment = theme.visualArchetype || 'institutional';
    document.body.dataset.treatment = treatment;
    var container = document.getElementById('zine-container');
    if (container) container.dataset.treatment = treatment;

    // Inject SVG grain filter for treatments that use it (noir, confessional)
    if (!document.getElementById('zine-grain-svg')) {
        var svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgEl.id = 'zine-grain-svg';
        svgEl.setAttribute('width', '0');
        svgEl.setAttribute('height', '0');
        svgEl.style.position = 'absolute';
        svgEl.innerHTML = '<filter id="zine-grain">'
            + '<feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>'
            + '<feColorMatrix type="saturate" values="0"/>'
            + '<feBlend in="SourceGraphic" mode="multiply"/>'
            + '</filter>';
        document.body.insertBefore(svgEl, document.body.firstChild);
    }
}

function autoGeneratePages(data) {
    var pages = [{ type: 'cover' }, { type: 'rules-manual' }, { type: 'tracker-sheet' }];
    if (data.workout && data.workout.setup) pages.push({ type: 'setup' });
    var totalWeeks = (data.workout && data.workout.totalWeeks) || 0;
    for (var w = 1; w <= totalWeeks; w++) {
        pages.push({ type: 'encounter-spread', week: w });
        pages.push({ type: 'ref-pages', week: w });
    }
    // Archive pages from archiveLayout
    var archiveLayout = data.archiveLayout || [];
    var archiveSections = [];
    archiveLayout.forEach(function (s) {
        (s.left || []).concat(s.right || []).forEach(function (sec) {
            archiveSections.push(sec);
        });
    });
    var seen = {};
    var uniqueSections = [];
    archiveSections.forEach(function (s) {
        if (!seen[s]) { seen[s] = true; uniqueSections.push(s); }
    });
    uniqueSections.forEach(function (s) { pages.push({ type: 'archive', section: s }); });

    // Add Evidence
    var tracks = (data.mechanics && data.mechanics.tracks) || [];
    var hasFactionOrProgress = tracks.filter(function (t) { return t.type === 'faction' || t.type === 'progress'; }).length > 0;
    if (hasFactionOrProgress) {
        pages.push({ type: 'evidence' });
    }

    pages.push({ type: 'endings' });
    pages.push({ type: 'final' });
    return pages;
}

// Take layout pages and impose them for saddle stitch printing
function imposeToSpreads() {
    var container = document.getElementById('zine-container');
    var pages = Array.from(container.querySelectorAll('.zine-page'));
    var totalPages = pages.length;
    if (totalPages % 4 !== 0) console.warn('Total pages(' + totalPages + ') is not a multiple of 4.');
    container.innerHTML = '';
    var numSpreads = Math.ceil(totalPages / 2);
    for (var i = 0; i < numSpreads; i++) {
        var spread = document.createElement('div');
        spread.className = 'zine-spread';

        var leftIndex, rightIndex;
        if (i % 2 === 0) { leftIndex = totalPages - 1 - i; rightIndex = i; }
        else { leftIndex = i; rightIndex = totalPages - 1 - i; }

        var leftPage = pages[leftIndex];
        var rightPage = pages[rightIndex];

        // Remove individual outlines for print spreads
        if (leftPage) {
            leftPage.style.position = 'absolute';
            leftPage.style.left = '0';
            leftPage.style.top = '0';
            leftPage.style.width = '5.5in';
            leftPage.style.height = '8.5in';
            leftPage.style.outline = 'none';
            leftPage.style.overflow = 'hidden';
            spread.appendChild(leftPage);
        }
        if (rightPage) {
            rightPage.style.position = 'absolute';
            rightPage.style.left = '5.5in';
            rightPage.style.top = '0';
            rightPage.style.width = '5.5in';
            rightPage.style.height = '8.5in';
            rightPage.style.outline = 'none';
            rightPage.style.overflow = 'hidden';
            spread.appendChild(rightPage);
        }
        container.appendChild(spread);
    }
}

// Expose on window for cross-file access
window.generateWiringPrompt = generateWiringPrompt;
window.generateStagePrompt = generateStagePrompt;
window.validateWiring = validateWiring;
window.validateStage = validateStage;
window.exportJson = exportJson;
window.importJson = importJson;
window.handleFileImport = handleFileImport;
window.assemble = assemble;
