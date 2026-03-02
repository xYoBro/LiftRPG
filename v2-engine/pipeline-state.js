// ── Pipeline State Container ─────────────────────────────────
//
// Central state holder for the LiftRPG pipeline. Owns the
// pipelineData object and exposes controlled access via
// window.Pipeline. No DOM, no business logic.
//
// Exposed: window.Pipeline

(function () {
    var pipelineData = {};

    window.Pipeline = {
        // Stage metadata constant
        STAGES: Object.freeze([
            { id: 'foundation', num: 1, title: 'STAGE 1: FOUNDATION' },
            { id: 'voice-map', num: 2, title: 'STAGE 2: VOICE + MAP' },
            { id: 'archives', num: 3, title: 'STAGE 3: ARCHIVES + ENDINGS' },
            { id: 'story', num: 4, title: 'STAGE 4: STORY REF NODES' },
            { id: 'evidence', num: 5, title: 'STAGE 5: EVIDENCE TRACKS' }
        ]),

        // Current stage progress (0, 'W', 1–5, 6)
        stage: 0,

        // Cached markdown prompt templates
        templates: {},

        // --- Data access ---

        get: function (key) {
            return pipelineData[key];
        },

        set: function (key, value) {
            pipelineData[key] = value;
        },

        delete: function (key) {
            delete pipelineData[key];
        },

        // Shallow clone for read-heavy consumers — prevents accidental
        // top-level property additions but nested objects are shared.
        data: function () {
            var clone = {};
            for (var key in pipelineData) {
                if (pipelineData.hasOwnProperty(key)) clone[key] = pipelineData[key];
            }
            return clone;
        },

        // Full replacement (import case)
        replace: function (newData) {
            pipelineData = newData;
        },

        isEmpty: function () {
            return Object.keys(pipelineData).length === 0;
        },

        toJSON: function () {
            return JSON.stringify(pipelineData, null, 2);
        }
    };
})();
