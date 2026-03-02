// ── Governor Score: Layout Quality Scoring ───────────────────
//
// Evaluates proposed page layouts to enable intelligent template
// selection. The governor uses scoring to compare template
// candidates and detect pathological page sequences.
//
// Phase 3 of the Layout Governor v3.0 architecture.
//
// Scoring criteria (from plan spec):
//   - overflowPenalty = -Infinity (hard constraint — never overflow)
//   - underfillPenalty = (1 - fillRatio)² × weight
//   - templateRepeatPenalty (same template 3+ times consecutively)
//   - pacingPenalty (3+ dense pages without breathing room)
//   - emptyPagePenalty (pages below 15% fill)
//   - balanceBonus (pages in the 0.45–0.85 sweet spot)
//
// Higher scores are better. -Infinity = hard constraint violation.
//
// Exposed: window.GovernorScore

var GovernorScore = {};

// ── Weight Constants ─────────────────────────────────────────
// Tunable parameters for the scoring function. Exposed for
// testing and future configuration.

GovernorScore.WEIGHTS = {
    underfill: 10,          // (1 - fill)² × this
    emptyPage: 5,           // pages < 15% fill
    templateRepeat: 3,      // same template 3+ consecutive
    pacingDense: 2,         // 3+ consecutive dense pages (>85%)
    balanceBonus: 2,        // per page in 0.45-0.85 sweet spot
    pageCountPenalty: 0.5,  // per extra page (slight preference for compact)
    multiSlotBonus: 1       // slight preference for multi-slot layouts (visual diversity)
};

// ── Full Sequence Evaluation ─────────────────────────────────

/**
 * Score a full page sequence (all groups composed).
 * Used post-composition to evaluate the entire booklet layout.
 *
 * @param {Object[]} pageEstimates  Array of { templateId, fillRatio, atomCount, groupType }
 * @returns {{ score: number, breakdown: Object }}
 */
GovernorScore.evaluate = function (pageEstimates) {
    var W = GovernorScore.WEIGHTS;
    var score = 0;
    var breakdown = {
        overflow: 0,
        underfill: 0,
        emptyPage: 0,
        templateRepeat: 0,
        pacing: 0,
        balance: 0,
        pageCount: pageEstimates.length
    };

    for (var i = 0; i < pageEstimates.length; i++) {
        var pe = pageEstimates[i];

        // Hard constraint: overflow
        if (pe.fillRatio > 1.0) {
            breakdown.overflow++;
            return { score: -Infinity, breakdown: breakdown };
        }

        // Underfill penalty: (1 - fillRatio)² × weight
        var underfill = 1.0 - pe.fillRatio;
        var underfillPenalty = underfill * underfill * W.underfill;
        breakdown.underfill += underfillPenalty;
        score -= underfillPenalty;

        // Near-empty page (< 15% fill) — extra penalty
        if (pe.fillRatio < 0.15 && pe.atomCount > 0) {
            breakdown.emptyPage++;
            score -= W.emptyPage;
        }

        // Balance bonus: pages in the 0.45–0.85 sweet spot
        if (pe.fillRatio >= 0.45 && pe.fillRatio <= 0.85) {
            breakdown.balance++;
            score += W.balanceBonus;
        }

        // Template repeat: same template 3+ times consecutively
        if (i >= 2 &&
            pageEstimates[i - 1].templateId === pe.templateId &&
            pageEstimates[i - 2].templateId === pe.templateId) {
            breakdown.templateRepeat++;
            score -= W.templateRepeat;
        }

        // Pacing: 3+ consecutive dense pages (fillRatio > 0.85)
        if (i >= 2 &&
            pe.fillRatio > 0.85 &&
            pageEstimates[i - 1].fillRatio > 0.85 &&
            pageEstimates[i - 2].fillRatio > 0.85) {
            breakdown.pacing++;
            score -= W.pacingDense;
        }
    }

    return { score: score, breakdown: breakdown };
};

// ── Single Candidate Scoring ─────────────────────────────────

/**
 * Score a single template candidate for a group.
 * Used during template selection to compare alternatives.
 *
 * @param {Object} estimate  From template.estimate():
 *   { templateId, pages, fillRatios: number[], confidence }
 * @param {Object} [context]  Scoring context from previous groups:
 *   { prevTemplateIds: string[], prevFillRatios: number[] }
 * @returns {number}  Score (higher is better, -Infinity = overflow)
 */
GovernorScore.scoreCandidate = function (estimate, context) {
    var W = GovernorScore.WEIGHTS;
    var score = 0;
    var fillRatios = estimate.fillRatios || [];

    for (var i = 0; i < fillRatios.length; i++) {
        var fr = fillRatios[i];

        // Overflow: hard fail
        if (fr > 1.0) return -Infinity;

        // Sweet spot bonus
        if (fr >= 0.45 && fr <= 0.85) {
            score += W.balanceBonus;
        }

        // Underfill penalty
        var underfill = 1.0 - fr;
        score -= underfill * underfill * W.underfill;

        // Near-empty penalty
        if (fr < 0.15) score -= W.emptyPage;
    }

    // Slight preference for fewer pages (compact layouts)
    score -= estimate.pages * W.pageCountPenalty;

    // Confidence weighting: lower confidence = less trustworthy estimate
    var confidence = estimate.confidence || 0.5;
    score *= confidence;

    // Context-aware scoring: template diversity
    if (context && context.prevTemplateIds && context.prevTemplateIds.length >= 2) {
        var prev = context.prevTemplateIds;
        var repeatCount = 0;
        for (var j = prev.length - 1; j >= Math.max(0, prev.length - 2); j--) {
            if (prev[j] === estimate.templateId) repeatCount++;
        }
        if (repeatCount >= 2) score -= W.templateRepeat;
    }

    // Context-aware scoring: pacing (dense after dense)
    if (context && context.prevFillRatios && context.prevFillRatios.length >= 2) {
        var lastTwo = context.prevFillRatios.slice(-2);
        if (lastTwo[0] > 0.85 && lastTwo[1] > 0.85 &&
            fillRatios.length > 0 && fillRatios[0] > 0.85) {
            score -= W.pacingDense;
        }
    }

    // Multi-slot bonus: slight preference for visual diversity
    if (estimate.multiSlot) {
        score += W.multiSlotBonus;
    }

    return score;
};

/**
 * Compare two template candidates and return the better one.
 *
 * @param {Object} estimateA  From template.estimate()
 * @param {Object} estimateB  From template.estimate()
 * @param {Object} [context]  Scoring context
 * @returns {number} 0 if A is better, 1 if B is better
 */
GovernorScore.compareCandidates = function (estimateA, estimateB, context) {
    var scoreA = GovernorScore.scoreCandidate(estimateA, context);
    var scoreB = GovernorScore.scoreCandidate(estimateB, context);
    return scoreB > scoreA ? 1 : 0;
};

// ── Utility: Compute Fill Ratios ─────────────────────────────

/**
 * Distribute atom heights across pages and return per-page fill ratios.
 * Simple bin-packing: fills pages top-to-bottom, starts new page on overflow.
 *
 * @param {number[]} heights  Atom heights in order
 * @param {number} pageHeight  Available height per page
 * @param {number} [overhead]  Fixed overhead per page (headers, etc.)
 * @returns {number[]} fill ratios per page
 */
GovernorScore.computeFillRatios = function (heights, pageHeight, overhead) {
    if (!heights.length) return [0];
    var oh = overhead || 0;
    var available = pageHeight - oh;
    if (available <= 0) return [1.0];

    var ratios = [];
    var currentFill = 0;

    for (var i = 0; i < heights.length; i++) {
        if (currentFill + heights[i] > available && currentFill > 0) {
            // Page full — record and start new page
            ratios.push(currentFill / available);
            currentFill = heights[i];
        } else {
            currentFill += heights[i];
        }
    }
    // Final page
    ratios.push(currentFill / available);

    return ratios;
};

// ── Expose ───────────────────────────────────────────────────

window.GovernorScore = GovernorScore;
