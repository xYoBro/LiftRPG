/**
 * Page-type dispatcher for the v2 engine.
 * Reads the pages[] array from the assembled payload and renders each
 * page type using the corresponding domain renderer from renderers.js.
 */

window.runPacker = function (data) {
    if (!data) data = {};
    var container = document.getElementById('zine-container');
    container.innerHTML = '';
    var pageCount = 0;

    var pages = data.pages || [];

    if (pages.length === 0) {
        container.innerHTML = '<div class="zine-page"><h2 style="color:red">NO PAGES</h2>' +
            '<p>The pages[] array is empty. Check Stage 1 JSON.</p></div>';
        return;
    }

    for (var i = 0; i < pages.length; i++) {
        var pageDef = pages[i];

        try {
            switch (pageDef.type) {
                case 'cover':
                    pageCount += (window.renderCoverPage(container, data, pageCount) || 0);
                    break;

                case 'rules-manual':
                    pageCount += (window.renderManualPages(container, data, pageCount) || 0);
                    break;

                case 'tracker-sheet':
                    pageCount += (window.renderTrackerSheet(container, data, pageCount) || 0);
                    break;

                case 'setup':
                    pageCount += (window.renderSetupPage(container, data, pageCount) || 0);
                    break;

                case 'encounter-spread':
                    pageCount += (window.renderEncounterSpread(container, data, pageDef.week, pageCount) || 0);
                    break;

                case 'ref-pages':
                    pageCount += (window.renderRefPages(container, data, pageDef.week, pageCount) || 0);
                    break;

                case 'archive':
                    pageCount += (window.renderArchivePages(container, data, pageDef.section, pageCount) || 0);
                    break;

                case 'endings':
                    pageCount += (window.renderEndingsPages(container, data, pageCount) || 0);
                    break;

                case 'evidence':
                    if (typeof window.renderEvidencePages === 'function') {
                        pageCount += (window.renderEvidencePages(container, data, pageCount) || 0);
                    }
                    break;

                case 'final':
                    pageCount += (window.renderFinalPage(container, data, pageCount) || 0);
                    break;

                default:
                    console.warn('[box-packer] Unknown page type:', pageDef.type);
            }
        } catch (err) {
            console.error('[box-packer] Renderer crashed on page type:', pageDef.type, 'index:', i, 'error:', err);
            var errPage = document.createElement('div');
            errPage.className = 'zine-page';
            errPage.innerHTML = '<h2 style="color:red">RENDER ERROR</h2><p>Page failed to render: ' + escapeHtml(pageDef.type) + '</p>';
            container.appendChild(errPage);
            pageCount++;
        }
    }

    // Pad to multiple of 4 pages for saddle-stitch imposition
    padToMultipleOf4(container, pageCount, data);

    // Post-render pass: annotate tracker sheet triggers with archive page numbers
    crossReferenceArchivePages(container);
};

function crossReferenceArchivePages(container) {
    // Build map: section key → first page number
    var sectionPageMap = {};
    var allPages = container.querySelectorAll('.zine-page');
    allPages.forEach(function (page, index) {
        var section = page.getAttribute('data-archive-section');
        if (section && !sectionPageMap[section]) {
            var pn = page.querySelector('.page-number');
            sectionPageMap[section] = pn ? pn.textContent.trim() : String(index + 1);
        }
    });

    // Find tracker-trigger elements and append page references
    var triggers = container.querySelectorAll('.tracker-trigger');
    triggers.forEach(function (trigger) {
        var text = trigger.textContent;
        // Match "read next SECTION_NAME" to find the section key
        for (var key in sectionPageMap) {
            if (sectionPageMap.hasOwnProperty(key)) {
                var sectionUpper = key.replace(/-/g, ' ').toUpperCase();
                var pattern = new RegExp('\\b' + sectionUpper.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
                if (pattern.test(text)) {
                    trigger.textContent = text + ' (pg ' + sectionPageMap[key] + ')';
                    break;
                }
            }
        }
    });
}

function padToMultipleOf4(container, pageCount, data) {
    while (pageCount % 4 !== 0) {
        pageCount++;
        var padPage = document.createElement('div');
        padPage.className = 'zine-page';

        if (pageCount % 4 === 0) {
            // Back cover
            var backCoverHtml = '<div class="back-cover-title">LIFTRPG</div>' +
                '<div class="back-cover-sub">A Solo Exertion RPG Engine</div>' +
                '<div class="back-cover-version">V2 ENGINE</div>' +
                '<div class="back-cover-footer">' +
                '<p>Generated by LiftRPG.</p>' +
                '<p>Narrative, Mechanics, and Layout generated entirely by Artificial Intelligence.</p>' +
                '</div>';

            padPage.classList.add('back-cover');
            padPage.innerHTML = '<div class="back-cover-content">' + backCoverHtml + '</div>';
        } else {
            // Notes page
            padPage.classList.add('notes-page');
            var note = document.createElement('h2');
            note.className = 'notes-heading';
            note.textContent = 'NOTES';
            padPage.appendChild(note);
        }

        // Page number (skip on back cover)
        if (pageCount % 4 !== 0) {
            var pn = document.createElement('div');
            pn.className = 'page-number';
            pn.textContent = String(pageCount).padStart(2, '0');
            padPage.appendChild(pn);
        }

        container.appendChild(padPage);
    }
}
