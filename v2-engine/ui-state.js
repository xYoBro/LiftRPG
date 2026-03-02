// ── UI State Machine: Accordion, Rail, Stage Lifecycle ───────
//
// Manages the progress rail, dynamic stage cards, accordion
// toggle, and stage unlock/complete lifecycle.
//
// Depends on: pipeline-state.js (Pipeline),
//             intake-ui.js (getSelectedDice)
//
// Exposed: window.renderRail, window.renderDynamicStages,
//          window.toggleStage, window.completeIntake,
//          window.unlockStage, window.unlockWiringStage

function renderRail() {
    var container = document.getElementById('progressRail');
    var wiringDone = !!Pipeline.get('wiring');
    var wiringState;
    if (wiringDone) wiringState = 'done';
    else if (Pipeline.get('intake')) wiringState = 'active';
    else wiringState = 'locked';

    var html = '<div class="rail-dot ' + (Pipeline.stage >= 0 ? 'active' : '') + '">0<div class="rail-label">Intake</div></div>';
    html += '<div class="rail-line ' + (wiringDone ? 'done' : '') + '"></div>';
    html += '<div class="rail-dot ' + wiringState + '">W<div class="rail-label">Wiring</div></div>';
    for (var i = 1; i <= 5; i++) {
        html += '<div class="rail-line ' + (Pipeline.stage > i ? 'done' : '') + '"></div>';
        var state = (Pipeline.stage === i) ? 'active' : (Pipeline.stage > i ? 'done' : 'locked');
        html += '<div class="rail-dot ' + state + '">' + i + '<div class="rail-label">Stage ' + i + '</div></div>';
    }
    container.innerHTML = html;
}

function renderDynamicStages() {
    var container = document.getElementById('dynamic-stages');
    var html = '';
    Pipeline.STAGES.forEach(function (s) {
        html += '<div class="stage-card locked" id="stageCard-' + s.num + '">'
            + '<div class="card-header" onclick="toggleStage(' + s.num + ')">'
            + '<div class="card-header-left">'
            + '<div class="card-number">' + s.num + '</div>'
            + '<div class="card-title">' + s.title + '</div>'
            + '</div>'
            + '<div class="card-status" id="stageStatus-' + s.num + '">LOCKED</div>'
            + '</div>'
            + '<div class="card-body" id="stageBody-' + s.num + '">'
            + '<div class="card-body-inner">'
            + '<div class="section-label">1. Copy Prompt</div>'
            + '<div class="outbound-box">'
            + '<button class="btn-blue btn-small" onclick="generateStagePrompt(' + s.num + ')" id="btnPrompt-' + s.num + '">Generate Prompt ' + s.num + '</button>'
            + '<textarea id="promptOut-' + s.num + '" readonly placeholder="Prompt will appear here..."></textarea>'
            + '<div class="outbound-instructions">Click the button above to generate the prompt. Copy the text and paste it into Claude/ChatGPT. Ensure it finishes generating.</div>'
            + '</div>'
            + '<div class="section-label">2. Paste LLM Output</div>'
            + '<div class="inbound-box">'
            + '<textarea id="jsonIn-' + s.num + '" placeholder="Paste JSON response from LLM here..."></textarea>'
            + '<div class="outbound-actions">'
            + '<button class="btn-secondary btn-small" onclick="validateStage(' + s.num + ')">Process & Save JSON</button>'
            + '</div>'
            + '<div class="inbound-status" id="valStatus-' + s.num + '"></div>'
            + '</div>'
            + '</div>'
            + '</div>'
            + '</div>';
    });
    container.innerHTML = html;
}

function toggleStage(num) {
    if (num !== 0 && document.getElementById('stageCard-' + num).classList.contains('locked')) return;

    var body = document.getElementById('stageBody-' + num);
    if (body.classList.contains('open')) {
        body.classList.remove('open');
    } else {
        document.querySelectorAll('.card-body').forEach(function (el) { el.classList.remove('open'); });
        body.classList.add('open');
    }
}

function completeIntake() {
    var workout = document.getElementById('progWorkout').value.trim();
    var narrativeBrief = document.getElementById('progNarrativeBrief').value.trim();
    if (!workout || !narrativeBrief) return alert("Please fill out workout and narrative brief.");

    var dice = getSelectedDice();
    var intake = { workout: workout, narrativeBrief: narrativeBrief, dice: dice };
    if (window._pendingCoverImage) {
        intake.coverImage = window._pendingCoverImage;
    }
    Pipeline.set('intake', intake);

    document.getElementById('stageStatus-0').innerText = 'OK';
    document.getElementById('stageStatus-0').className = 'card-status ok';
    document.getElementById('stageCard-0').classList.remove('active');
    document.getElementById('stageCard-0').classList.add('valid');

    unlockWiringStage();
}

function unlockStage(num) {
    if (num > Pipeline.stage) Pipeline.stage = num;
    renderRail();
    var card = document.getElementById('stageCard-' + num);
    card.classList.remove('locked');
    card.classList.add('active');
    document.getElementById('stageStatus-' + num).innerText = 'READY';
    document.getElementById('stageStatus-' + num).className = 'card-status';
    toggleStage(num);
    document.getElementById('footerStatus').innerText = 'Stage ' + num + ' unlocked. Generate prompt.';
}

function unlockWiringStage() {
    renderRail();
    var card = document.getElementById('stageCard-W');
    card.classList.remove('locked');
    card.classList.add('active');
    document.getElementById('stageStatus-W').innerText = 'READY';
    document.getElementById('stageStatus-W').className = 'card-status';
    toggleStage('W');
    document.getElementById('footerStatus').innerText = 'Stage W unlocked. Generate wiring prompt.';
}

// Expose on window for cross-file access
window.renderRail = renderRail;
window.renderDynamicStages = renderDynamicStages;
window.toggleStage = toggleStage;
window.completeIntake = completeIntake;
window.unlockStage = unlockStage;
window.unlockWiringStage = unlockWiringStage;
