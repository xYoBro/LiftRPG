// ── Intake UI: Dice Selector + Cover Image ───────────────────
//
// Handles the intake-phase UI components: dice chip toggles,
// cover image drag-and-drop, and post-Stage-1 image prompt.
//
// Depends on: pipeline-state.js (Pipeline)
//
// Exposed: window.initDiceSelector, window.getSelectedDice,
//          window.restoreDiceSelection, window.initCoverDropzone,
//          window.handleCoverFile, window.setCoverImage,
//          window.clearCoverImage, window.showCoverImagePrompt,
//          window.copyCoverImagePrompt

// ── Dice selector chip toggle ──
function initDiceSelector() {
    document.querySelectorAll('.dice-chip').forEach(function (chip) {
        chip.addEventListener('click', function (e) {
            e.preventDefault();
            var cb = chip.querySelector('input[type="checkbox"]');
            cb.checked = !cb.checked;
            chip.classList.toggle('selected', cb.checked);

            if (cb.value === 'none' && cb.checked) {
                // "No Dice" selected — clear all others
                document.querySelectorAll('#diceSelector input[type="checkbox"]').forEach(function (other) {
                    if (other !== cb) {
                        other.checked = false;
                        other.closest('.dice-chip').classList.remove('selected');
                    }
                });
            } else if (cb.value !== 'none' && cb.checked) {
                // Any die selected — clear "No Dice"
                var noCb = document.querySelector('#diceSelector input[value="none"]');
                if (noCb) {
                    noCb.checked = false;
                    noCb.closest('.dice-chip').classList.remove('selected');
                }
            }
        });
    });
}

function getSelectedDice() {
    var selected = [];
    document.querySelectorAll('#diceSelector input[type="checkbox"]:checked').forEach(function (cb) {
        selected.push(cb.value);
    });
    return selected;
}

function restoreDiceSelection(diceArray) {
    if (!Array.isArray(diceArray)) return;
    // Clear all first
    document.querySelectorAll('#diceSelector input[type="checkbox"]').forEach(function (cb) {
        cb.checked = false;
        cb.closest('.dice-chip').classList.remove('selected');
    });
    // Set the ones from the array
    diceArray.forEach(function (val) {
        var cb = document.querySelector('#diceSelector input[value="' + val + '"]');
        if (cb) {
            cb.checked = true;
            cb.closest('.dice-chip').classList.add('selected');
        }
    });
}

// ── Cover Image Drop Zone ──────────────────────────
function initCoverDropzone() {
    var dropzone = document.getElementById('coverDropzone');
    var fileInput = document.getElementById('coverFileInput');
    var removeBtn = document.getElementById('coverRemoveBtn');

    dropzone.addEventListener('click', function(e) {
        if (e.target === removeBtn || e.target.closest('.cover-remove-btn')) return;
        fileInput.click();
    });

    fileInput.addEventListener('change', function(e) {
        if (e.target.files[0]) handleCoverFile(e.target.files[0]);
        e.target.value = '';
    });

    dropzone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });
    dropzone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
    });
    dropzone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        var file = e.dataTransfer.files[0];
        if (file && file.type.match(/^image\/(png|jpeg|webp)$/)) {
            handleCoverFile(file);
        }
    });

    removeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        clearCoverImage();
    });
}

function handleCoverFile(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        var dataUrl = e.target.result;
        setCoverImage(dataUrl);
        var sizeMB = (dataUrl.length / 1024 / 1024).toFixed(1);
        var warning = document.getElementById('coverSizeWarning');
        if (parseFloat(sizeMB) > 2) {
            warning.style.display = 'block';
            warning.textContent = 'Image is ' + sizeMB + ' MB as base64. Exported JSON will be large.';
        } else {
            warning.style.display = 'none';
        }
    };
    reader.readAsDataURL(file);
}

function setCoverImage(dataUrl) {
    document.getElementById('coverPreviewImg').src = dataUrl;
    document.getElementById('coverDropzoneEmpty').style.display = 'none';
    document.getElementById('coverDropzonePreview').style.display = 'flex';
    window._pendingCoverImage = dataUrl;
    var intake = Pipeline.get('intake');
    if (intake) {
        intake.coverImage = dataUrl;
    }
}

function clearCoverImage() {
    document.getElementById('coverPreviewImg').src = '';
    document.getElementById('coverDropzoneEmpty').style.display = 'flex';
    document.getElementById('coverDropzonePreview').style.display = 'none';
    document.getElementById('coverSizeWarning').style.display = 'none';
    window._pendingCoverImage = null;
    var intake = Pipeline.get('intake');
    if (intake) {
        delete intake.coverImage;
    }
}

// ── Cover Image Prompt (post-Stage 1) ──────────────
function showCoverImagePrompt(s1) {
    var existing = document.getElementById('coverImagePromptBox');
    if (existing) existing.remove();

    var meta = s1.meta || {};
    var theme = s1.theme || {};
    var art = theme.art || {};

    var parts = [];
    parts.push('Create a cover illustration for a print zine titled "' + (meta.title || 'Untitled') + '".');
    if (art.style && art.style !== 'none') {
        parts.push('Visual style: ' + art.style + '.');
    }
    if (theme.visualArchetype) {
        parts.push('Aesthetic: ' + theme.visualArchetype + ' — textured, atmospheric, printable in black and white.');
    }
    if (theme.colors && theme.colors.ink && theme.colors.paper) {
        parts.push('Color palette: ink ' + theme.colors.ink + ' on paper ' + theme.colors.paper + ', accent ' + (theme.colors.accent || '#c45c00') + '.');
    }
    if (meta.subtitle) {
        parts.push('Subject: ' + meta.subtitle + '.');
    }
    parts.push('Format: half-letter page (5.5 x 8.5 inches), portrait orientation. Title and author text will be overlaid — leave space at top and bottom.');
    parts.push('Output: PNG image, no text in the image.');

    var promptText = parts.join('\n');

    var box = document.createElement('div');
    box.id = 'coverImagePromptBox';
    box.className = 'cover-prompt-box';
    box.innerHTML = '<div class="cover-prompt-header">' +
        '<span class="cover-prompt-label">COVER IMAGE PROMPT</span>' +
        '<span class="form-hint" style="margin:0">Optional — paste into ChatGPT, Midjourney, or DALL-E, then upload the result above.</span>' +
        '</div>' +
        '<textarea id="coverImagePromptText" readonly class="short"></textarea>' +
        '<button class="btn-secondary btn-small" id="btnCopyCoverPrompt" style="margin-top:6px" onclick="copyCoverImagePrompt()">Copy Prompt</button>';

    var stageCard1 = document.getElementById('stageCard-1');
    if (stageCard1 && stageCard1.nextSibling) {
        stageCard1.parentNode.insertBefore(box, stageCard1.nextSibling);
    } else if (stageCard1) {
        stageCard1.parentNode.appendChild(box);
    }

    document.getElementById('coverImagePromptText').value = promptText;
}

function copyCoverImagePrompt() {
    var text = document.getElementById('coverImagePromptText').value;
    navigator.clipboard.writeText(text).then(function() {
        var btn = document.getElementById('btnCopyCoverPrompt');
        btn.innerText = '\u2705 COPIED!';
        setTimeout(function() { btn.innerText = 'Copy Prompt'; }, 2000);
    }).catch(function() {
        var btn = document.getElementById('btnCopyCoverPrompt');
        btn.innerText = '\u274c COPY ERROR';
        setTimeout(function() { btn.innerText = 'Copy Prompt'; }, 2000);
    });
}

// Expose on window for cross-file access
window.initDiceSelector = initDiceSelector;
window.getSelectedDice = getSelectedDice;
window.restoreDiceSelection = restoreDiceSelection;
window.initCoverDropzone = initCoverDropzone;
window.handleCoverFile = handleCoverFile;
window.setCoverImage = setCoverImage;
window.clearCoverImage = clearCoverImage;
window.showCoverImagePrompt = showCoverImagePrompt;
window.copyCoverImagePrompt = copyCoverImagePrompt;
