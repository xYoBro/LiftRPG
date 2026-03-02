// ── Prompt assembly for all pipeline stages ───────────────────
//
// Pure text builders — no DOM interaction.
// Each function accepts templates + data, returns a prompt string.
//
// Exposed: window.buildWiringPrompt, window.buildStagePrompt

function buildWiringPrompt(templates, intake) {
    var wiringTemplate = templates['stage-w-wiring.md'] || '';
    var wiringCatalog = templates['shared-wiring-catalog.md'] || '';
    var creativeDir = templates['shared-creative-direction.md'] || '';

    var briefParts = [intake.narrativeBrief || ''];
    var intakeDice = intake.dice || ['d10', 'd%'];
    if (intakeDice.indexOf('none') !== -1) {
        briefParts.push('Available Dice: NONE — use only diceless mechanics.');
    } else {
        briefParts.push('Available Dice: ' + intakeDice.join(', ') + '.');
    }
    var narrativeBrief = briefParts.join('\n');

    var promptText = wiringTemplate + '\n\n' + creativeDir;
    promptText = promptText.replace(/\{\{shared-wiring-catalog\.md\}\}/g, wiringCatalog);
    promptText = promptText.replace(/\{\{narrativeBrief\}\}/g, narrativeBrief);
    promptText = promptText.replace(/\{\{workout\}\}/g, intake.workout || '');

    return promptText;
}

function buildStagePrompt(num, templates, pipelineData) {
    var promptText = "";
    var creativeDir = templates['shared-creative-direction.md'] || '';
    // Section 8 (Visual Identity) only matters for Stage 1 / Stage W — archetype
    // is already chosen by Stages 2-5. Strip it to save LLM context tokens.
    if (num >= 2) {
        creativeDir = creativeDir.replace(/\n---\n\n## 8\. VISUAL IDENTITY[\s\S]*$/, '');
    }
    var primitives = templates['shared-primitives-catalog.md'] || '';
    var antiIso = templates['shared-anti-isomorphism.md'] || '';

    // Compose the narrative brief from intake
    var intake = pipelineData.intake || {};
    var briefParts = [intake.narrativeBrief || ''];
    // Dice constraint
    var intakeDice = intake.dice || ['d10', 'd%'];
    if (intakeDice.indexOf('none') !== -1) {
        briefParts.push('Available Dice: NONE — use only diceless mechanics (Resource-as-Resolution).');
    } else {
        briefParts.push('Available Dice: ' + intakeDice.join(', ') + '. Only use resolution systems and modifiers compatible with these dice.');
    }
    var narrativeBrief = briefParts.join('\n');

    if (num === 1) {
        var wiringSection = '';
        if (pipelineData.wiring) {
            wiringSection = '\n\n## MECHANICAL WIRING BLUEPRINT (BINDING)\n\n'
                + 'The following blueprint defines the mechanical topology of this zine. You MUST select primitives that can express the declared wires. Every wire\'s `printInstruction` MUST appear somewhere in the final booklet — on the tracker sheet, in encounter conditional instructions, or in the rules manual.\n\n'
                + 'For EACH wire in the blueprint:\n'
                + '1. Select a primitive from the catalog that serves as the wire\'s "from" source\n'
                + '2. Select a primitive or content structure that serves as the wire\'s "to" target\n'
                + '3. Name your mechanics to match the wire\'s `from` and `to` fields (diegetic names)\n'
                + '4. Include the wire\'s `printInstruction` in the appropriate location:\n'
                + '   - threshold-gate: in the clock/track\'s trigger text\n'
                + '   - conditional-routing: in encounter outcome text or conditional instructions\n'
                + '   - resource-cycle: in the resource earn/spend rules\n'
                + '   - escalation: in track threshold effects\n'
                + '   - feedback-loop: in both source and target trigger descriptions\n'
                + '   - unlock-chain: in the completing mechanic\'s trigger text\n'
                + '5. Respect the `activatesWeek` field — mechanics for later-activating wires should exist in the schema but their wire instructions only appear on pages for that week onward.\n\n'
                + '```json\n' + JSON.stringify(pipelineData.wiring, null, 2) + '\n```\n';
        }

        promptText = (templates['stage-1-data-requirements.md'] || '') + '\n\n'
            + creativeDir + '\n\n'
            + primitives + '\n'
            + wiringSection + '\n'
            + antiIso + '\n\n'
            + (templates['stage-1-liftoscript.md'] || '') + '\n\n'
            + '## USER INPUT\nWorkout/Script:\n'
            + (intake.workout || '') + '\n\n'
            + narrativeBrief;
    } else if (num === 2) {
        var s1 = pipelineData[1] || {};
        var archiveSectionKeys = window.deriveArchiveSectionKeys(pipelineData);
        var context = {
            meta: s1.meta,
            workout: s1.workout,
            mechanics: s1.mechanics,
            theme: s1.theme,
            story: { encounters: (s1.story && s1.story.encounters) },
            map: s1.map,
            archiveSectionKeys: archiveSectionKeys
        };
        promptText = (templates['stage-2-voice-map.md'] || '') + '\n\n'
            + creativeDir + '\n\n'
            + '## STAGE 1 CONTEXT\n```json\n'
            + JSON.stringify(context, null, 2) + '\n```';
    } else if (num === 3) {
        var s1 = pipelineData[1] || {};
        var archiveSectionKeysS3 = window.deriveArchiveSectionKeys(pipelineData);
        var context = {
            meta: s1.meta,
            mechanics: s1.mechanics,
            story: { encounters: (s1.story && s1.story.encounters), refScheme: (s1.story && s1.story.refScheme) },
            archiveSectionKeys: archiveSectionKeysS3
        };
        promptText = (templates['stage-3-archives.md'] || '') + '\n\n'
            + creativeDir + '\n\n'
            + '## STAGE 1 CONTEXT\n```json\n'
            + JSON.stringify(context, null, 2) + '\n```';
    } else if (num === 4) {
        var s1 = pipelineData[1] || {};
        var s3 = pipelineData[3] || {};
        var archiveNodeIds = {};
        var s3ArchiveKeys = Object.keys(s3.storyArchives || {});
        for (var ani = 0; ani < s3ArchiveKeys.length; ani++) {
            var sectionKey = s3ArchiveKeys[ani];
            var section = s3.storyArchives[sectionKey];
            if (section && section.nodes) {
                archiveNodeIds[sectionKey] = section.nodes.map(function (n) { return n.id; });
            }
        }
        var context = {
            meta: s1.meta,
            mechanics: s1.mechanics,
            story: { encounters: (s1.story && s1.story.encounters), refScheme: (s1.story && s1.story.refScheme) },
            archiveNodeIds: archiveNodeIds
        };
        promptText = (templates['stage-4-story.md'] || '') + '\n\n'
            + creativeDir + '\n\n'
            + '## STAGE 1 + STAGE 3 CONTEXT\n```json\n'
            + JSON.stringify(context, null, 2) + '\n```';
    } else if (num === 5) {
        var s1 = pipelineData[1] || {};
        var s3 = pipelineData[3] || {};
        var s1Tracks = (s1.mechanics && s1.mechanics.tracks) || [];
        var evidenceTracks = s1Tracks.filter(function (t) { return t.type === 'faction' || t.type === 'progress'; });
        if (evidenceTracks.length === 0) {
            return null; // Signal to caller that Stage 5 is not applicable
        }

        var context = {
            meta: s1.meta,
            mechanics: { tracks: evidenceTracks, clocks: (s1.mechanics && s1.mechanics.clocks) },
            archiveSections: Object.keys(s3.storyArchives || {}),
            workout: { totalWeeks: (s1.workout && s1.workout.totalWeeks) }
        };

        promptText = (templates['stage-5-evidence.md'] || '') + '\n\n'
            + creativeDir + '\n\n'
            + '## STAGE 1 + STAGE 3 CONTEXT\n```json\n'
            + JSON.stringify(context, null, 2) + '\n```';
    }

    promptText = promptText.replace(/\{\{narrativeBrief\}\}/g, narrativeBrief);

    return promptText;
}

// Expose on window for cross-file access
window.buildWiringPrompt = buildWiringPrompt;
window.buildStagePrompt = buildStagePrompt;
