import { clone, readingLength, splitParagraphs, splitRichContentBlocks } from './utils.js?v=44';
import { resolveWeekMechanicProfile } from './mechanic-registry.js?v=44';
import { nextTemplateVariant, pickDefaultTemplateVariant } from './template-registry.js?v=44';

const MAX_WORKOUT_COMPACTION = 5;

export function chunkSessions(week) {
  const sessions = week.sessions || [];
  const chunks = [];
  for (let index = 0; index < sessions.length; index += 3) {
    chunks.push(sessions.slice(index, index + 3));
  }
  return chunks;
}

function sessionComplexity(session, cardCount) {
  const promptLength = readingLength(session.storyPrompt);
  const exerciseCount = Math.min((session.exercises || []).length, 6);
  let score = 1.35;
  score += Math.min(promptLength / 180, 2.6);
  score += exerciseCount * 0.62;
  if (session.binaryChoice) score += 1.15;
  if (session.fragmentRef) score += 0.2;

  if (cardCount === 3) score += 0.6;
  if (cardCount === 1) score -= 0.45;

  return score;
}

function resolveDensity(score) {
  if (score >= 6.2) return 'critical';
  if (score >= 5.1) return 'dense';
  if (score >= 4) return 'compact';
  return 'standard';
}

function baseNotesLines(score, cardCount) {
  if (cardCount === 1) {
    if (score >= 6.2) return 2;
    return 3;
  }

  if (cardCount === 2) {
    if (score >= 5.8) return 0;
    if (score >= 4.8) return 1;
    return 2;
  }

  if (score >= 6.2) return 0;
  if (score >= 5.1) return 1;
  return 2;
}

function resolveNotesLines(score, cardCount, compactionLevel) {
  const minimumNotesLines = cardCount === 1 ? 1 : 0;
  const lines = baseNotesLines(score, cardCount) - (compactionLevel || 0);
  return Math.max(minimumNotesLines, lines);
}

function resolveNotesHeight(notesLines, compactionLevel, cardCount) {
  const minimumHeight = cardCount === 1 ? 20 : (cardCount === 3 ? 8 : 12);

  let height = minimumHeight;
  if (notesLines >= 3) height = 40;
  else if (notesLines === 2) height = 30;
  else if (notesLines === 1) height = cardCount === 1 ? 22 : (cardCount === 3 ? 14 : 18);

  return Math.max(minimumHeight, height - ((compactionLevel || 0) * 4));
}

export function planWorkoutPageLayout(sessions, options = {}) {
  const cardCount = Math.max(1, sessions.length);
  const compactionLevel = Math.max(0, Math.min(MAX_WORKOUT_COMPACTION, parseInt(options.compactionLevel, 10) || 0));
  const complexityScores = sessions.map((session) => sessionComplexity(session, cardCount));
  const totalComplexity = complexityScores.reduce((sum, value) => sum + value, 0) || cardCount;
  const cards = sessions.map((session, index) => {
    const score = complexityScores[index];
    const density = resolveDensity(score);
    const notesLines = resolveNotesLines(score, cardCount, compactionLevel);
    const notesHeight = resolveNotesHeight(notesLines, compactionLevel, cardCount);
    const flexWeight = Math.max(1, Math.round((score / totalComplexity) * 100));

    return {
      density,
      notesLines,
      notesHeight,
      flexWeight,
      compactionLevel,
      promptChars: readingLength(session.storyPrompt),
      exerciseCount: (session.exercises || []).length
    };
  });

  return {
    cardCount,
    compactionLevel,
    pageDensity: resolveDensity((totalComplexity / cardCount) + (compactionLevel * 0.15)),
    totalComplexity,
    cards
  };
}

function fragmentWeight(fragment) {
  const body = fragment.bodyText || fragment.body || fragment.content || '';
  const documentType = String(fragment.documentType || '').toLowerCase();
  let weight = Math.max(0.62, Math.min(readingLength(body) / 1600, 1.4));

  if (['memo', 'report', 'inspection', 'correspondence', 'transcript', 'anomaly'].includes(documentType)) {
    weight += 0.16;
  }

  if (((fragment.designSpec || {}).hasAnnotations)) weight += 0.04;
  if (((fragment.designSpec || {}).hasRedactions)) weight += 0.04;

  return Math.min(weight, 1.55);
}

function fragmentMustStandAlone(fragment, weight) {
  const body = fragment.bodyText || fragment.body || fragment.content || '';
  const documentType = String(fragment.documentType || '').toLowerCase();
  const length = readingLength(body);
  return weight >= 0.9
    || length >= 950
    || ['memo', 'report', 'inspection', 'correspondence', 'transcript', 'anomaly'].includes(documentType);
}

export function paginateFragments(fragments) {
  const pages = [];
  let current = [];
  let load = 0;
  (fragments || []).forEach((fragment) => {
    const weight = fragmentWeight(fragment);
    const standalone = fragmentMustStandAlone(fragment, weight);

    if (standalone && current.length) {
      pages.push(current);
      current = [];
      load = 0;
    }

    current.push(fragment);
    load += weight;

    if (standalone) {
      pages.push(current);
      current = [];
      load = 0;
      return;
    }

    if (current.length >= 2 || load > 1.18) {
      pages.push(current);
      current = [];
      load = 0;
    }
  });

  if (current.length) pages.push(current);
  return pages;
}

function planWeekEntries(week, weekIndex) {
  const entries = [];
  const chunks = chunkSessions(week);
  const oracleEntryCount = ((((week || {}).fieldOps || {}).oracleTable || {}).entries || []).length;
  const mechanicProfile = resolveWeekMechanicProfile(week);
  const needsCompanionSpread = !!mechanicProfile.needsCompanionSpread;

  if (chunks.length > 0) {
    entries.push({
      type: 'workout-left',
      weekIndex,
      chunkIndex: 0,
      chunkCount: chunks.length,
      compactionLevel: 0,
      mechanicProfile,
      sessions: chunks[0]
    });
  }

  if (week.isBossWeek) {
    entries.push({
      type: 'boss',
      weekIndex,
      layoutVariant: pickDefaultTemplateVariant('boss', { week })
    });
  } else {
    entries.push({
      type: 'field-ops',
      weekIndex,
      layout: 'standard',
      layoutVariant: pickDefaultTemplateVariant('field-ops', { week, mechanicProfile }),
      mechanicProfile,
      companionPlacement: needsCompanionSpread ? 'spread' : 'inline',
      primaryOracleCount: oracleEntryCount
    });
  }

  if (needsCompanionSpread && !week.isBossWeek) {
    const companionVariant = pickDefaultTemplateVariant('companion-spread-left', { week, mechanicProfile });
    entries.push(
      {
        type: 'companion-spread-left',
        weekIndex,
        layoutVariant: companionVariant,
        mechanicProfile
      },
      {
        type: 'companion-spread-right',
        weekIndex,
        layoutVariant: companionVariant,
        mechanicProfile
      }
    );
  }

  for (let index = 1; index < chunks.length; index += 1) {
    entries.push({
      type: 'workout-left',
      weekIndex,
      chunkIndex: index,
      chunkCount: chunks.length,
      compactionLevel: 0,
      mechanicProfile,
      sessions: chunks[index]
    });
    entries.push(week.overflowDocument
      ? {
        type: 'overflow-doc',
        weekIndex,
        layoutVariant: pickDefaultTemplateVariant('overflow-doc', { week })
      }
      : { type: 'blank-filler', weekIndex }
    );
  }

  if (week.interlude) {
    entries.push({
      type: 'interlude',
      weekIndex,
      interlude: clone(week.interlude),
      layoutVariant: pickDefaultTemplateVariant('interlude', { week })
    });
  }

  return entries;
}

export function normalizeBookletPlan(entries) {
  const normalized = (entries || [])
    .filter((entry) => entry && entry.type !== 'notes' && entry.type !== 'back-cover')
    .map((entry) => clone(entry));

  while ((normalized.length + 1) % 4 !== 0) {
    normalized.push({ type: 'notes' });
  }

  normalized.push({ type: 'back-cover' });
  return normalized;
}

export function compactWorkoutEntry(plan, index) {
  const entry = (plan || [])[index];
  if (!entry || entry.type !== 'workout-left') return null;

  const currentLevel = Math.max(0, parseInt(entry.compactionLevel, 10) || 0);
  if (currentLevel >= MAX_WORKOUT_COMPACTION) return null;

  const revised = normalizeBookletPlan(plan);
  revised[index] = {
    ...revised[index],
    compactionLevel: currentLevel + 1
  };

  return revised;
}

function buildWorkoutContinuationPartner(week, weekIndex) {
  if (week && week.overflowDocument) {
    return {
      type: 'overflow-doc',
      weekIndex,
      layoutVariant: pickDefaultTemplateVariant('overflow-doc', { week })
    };
  }

  return { type: 'blank-filler', weekIndex };
}

function reindexWeekWorkoutEntries(plan, weekIndex) {
  const revised = normalizeBookletPlan(plan);
  const workoutIndexes = [];

  revised.forEach((entry, index) => {
    if (entry && entry.type === 'workout-left' && entry.weekIndex === weekIndex) {
      workoutIndexes.push(index);
    }
  });

  const chunkCount = workoutIndexes.length;
  workoutIndexes.forEach((planIndex, chunkIndex) => {
    revised[planIndex] = {
      ...revised[planIndex],
      chunkIndex,
      chunkCount
    };
  });

  return revised;
}

function splitWorkoutEntry(plan, index, measurement, data) {
  const entry = (plan || [])[index];
  if (!entry || entry.type !== 'workout-left') return null;

  const sessions = Array.isArray(entry.sessions) ? entry.sessions : [];
  if (sessions.length <= 1) return null;

  const week = ((data || {}).weeks || [])[entry.weekIndex] || {};
  const overflowHeights = (((measurement || {}).slotMetrics || {}).cardOverflowHeights) || [];
  let splitIndex = Math.ceil(sessions.length / 2);

  if (sessions.length === 3 && overflowHeights.length === sessions.length) {
    const worstCardIndex = overflowHeights.reduce((bestIndex, value, candidateIndex, values) => {
      return value > values[bestIndex] ? candidateIndex : bestIndex;
    }, 0);
    splitIndex = worstCardIndex <= 0 ? 1 : 2;
  } else if (sessions.length === 2) {
    splitIndex = 1;
  }

  const leadingSessions = sessions.slice(0, splitIndex);
  const trailingSessions = sessions.slice(splitIndex);
  if (!leadingSessions.length || !trailingSessions.length) return null;

  const revised = normalizeBookletPlan(plan);
  revised[index] = {
    ...revised[index],
    sessions: leadingSessions,
    compactionLevel: 0
  };

  revised.splice(index + 2, 0,
    {
      ...entry,
      sessions: trailingSessions,
      compactionLevel: 0
    },
    buildWorkoutContinuationPartner(week, entry.weekIndex)
  );

  return reindexWeekWorkoutEntries(revised, entry.weekIndex);
}

function reviseEntryVariant(plan, index) {
  const entry = (plan || [])[index];
  if (!entry) return null;

  const supportedTypes = new Set([
    'rules-left',
    'rules-right',
    'gauge-log',
    'assembly',
    'field-ops',
    'boss',
    'ending-locked',
    'ending-unlocked',
    'overflow-doc',
    'fragment-page',
    'oracle-overflow',
    'interlude',
    'companion-spread-left',
    'companion-spread-right'
  ]);

  if (!supportedTypes.has(entry.type)) return null;

  const nextVariant = nextTemplateVariant(entry.type, entry.layoutVariant || 'standard');
  if (nextVariant === (entry.layoutVariant || 'standard')) return null;

  const revised = normalizeBookletPlan(plan);
  revised[index] = {
    ...revised[index],
    layoutVariant: nextVariant
  };
  return revised;
}

function reviseCompanionSpreadVariant(plan, index) {
  const entry = (plan || [])[index];
  if (!entry || (entry.type !== 'companion-spread-left' && entry.type !== 'companion-spread-right')) return null;

  const nextVariant = nextTemplateVariant(entry.type, entry.layoutVariant || 'balanced');
  if (nextVariant === (entry.layoutVariant || 'balanced')) return null;

  const revised = normalizeBookletPlan(plan);
  revised[index] = {
    ...revised[index],
    layoutVariant: nextVariant
  };

  const siblingType = entry.type === 'companion-spread-left' ? 'companion-spread-right' : 'companion-spread-left';
  const siblingIndex = revised.findIndex((candidate, candidateIndex) => {
    return candidateIndex !== index
      && candidate
      && candidate.type === siblingType
      && candidate.weekIndex === entry.weekIndex;
  });

  if (siblingIndex !== -1) {
    revised[siblingIndex] = {
      ...revised[siblingIndex],
      layoutVariant: nextVariant
    };
  }

  return revised;
}

export function splitFieldOpsEntry(plan, index, measurement, data) {
  const entry = (plan || [])[index];
  if (!entry || entry.type !== 'field-ops') return null;

  const week = ((data || {}).weeks || [])[entry.weekIndex] || {};
  const oracleEntries = ((((week || {}).fieldOps || {}).oracleTable || {}).entries || []);
  if (!oracleEntries.length) return null;

  const slotMetrics = measurement && measurement.slotMetrics || {};
  const currentPrimaryCount = entry.layout === 'split-oracle'
    ? Math.max(0, Math.min(parseInt(entry.primaryOracleCount, 10) || 0, oracleEntries.length))
    : oracleEntries.length;
  const averageOracleEntryHeight = slotMetrics.averageOracleEntryHeight || 14;
  const overflowHeight = Math.max(0, Math.ceil((measurement && measurement.overflowHeight) || 0));
  const desiredReduction = overflowHeight + 12;
  const moveCount = Math.max(1, Math.ceil(desiredReduction / averageOracleEntryHeight));
  const nextPrimaryCount = Math.max(0, currentPrimaryCount - moveCount);

  if (nextPrimaryCount === currentPrimaryCount) return null;

  const revised = normalizeBookletPlan(plan);
  revised[index] = {
    ...revised[index],
    layout: 'split-oracle',
    primaryOracleCount: nextPrimaryCount
  };

  const overflowEntry = {
    type: 'oracle-overflow',
    weekIndex: entry.weekIndex,
    layout: 'oracle-only',
    primaryOracleCount: nextPrimaryCount,
    layoutVariant: pickDefaultTemplateVariant('oracle-overflow', { week })
  };

  if (revised[index + 1] && revised[index + 1].type === 'oracle-overflow' && revised[index + 1].weekIndex === entry.weekIndex) {
    revised[index + 1] = overflowEntry;
  } else {
    revised.splice(index + 1, 0, overflowEntry);
  }

  return normalizeBookletPlan(revised);
}

export function splitFragmentEntry(plan, index, measurement) {
  const entry = (plan || [])[index];
  const fragments = entry && entry.fragments || [];
  if (!entry || entry.type !== 'fragment-page' || fragments.length <= 1) return null;

  const slotMetrics = measurement && measurement.slotMetrics || {};
  const fragmentHeights = slotMetrics.fragmentHeights || [];
  const targetReduction = Math.max(0, ((measurement && measurement.overflowHeight) || 0) + 8);

  let splitIndex = fragments.length - 1;
  let recoveredHeight = fragmentHeights[splitIndex] || 0;
  while (splitIndex > 1 && recoveredHeight < targetReduction) {
    splitIndex -= 1;
    recoveredHeight += fragmentHeights[splitIndex] || 0;
  }

  let leading = fragments.slice(0, splitIndex);
  let trailing = fragments.slice(splitIndex);

  if (!leading.length || !trailing.length) {
    const midpoint = Math.ceil(fragments.length / 2);
    leading = fragments.slice(0, midpoint);
    trailing = fragments.slice(midpoint);
  }

  if (!leading.length || !trailing.length) return null;

  const revised = normalizeBookletPlan(plan);
  revised.splice(index, 1,
    {
      ...revised[index],
      fragments: leading,
      layoutVariant: pickDefaultTemplateVariant('fragment-page', { entry: { fragments: leading } })
    },
    {
      ...revised[index],
      fragments: trailing,
      layoutVariant: pickDefaultTemplateVariant('fragment-page', { entry: { fragments: trailing } })
    }
  );

  return normalizeBookletPlan(revised);
}

function splitMeasuredBlocks(blocks, heights, overflowHeight) {
  if (!Array.isArray(blocks) || blocks.length <= 1) return null;

  const normalizedHeights = Array.isArray(heights) && heights.length === blocks.length
    ? heights
    : blocks.map((block) => Math.max(1, Math.ceil(readingLength(block) / 120)));
  const targetReduction = Math.max(1, (Math.ceil(overflowHeight || 0) + 8));

  let splitIndex = blocks.length - 1;
  let recovered = normalizedHeights[splitIndex] || 0;
  while (splitIndex > 1 && recovered < targetReduction) {
    splitIndex -= 1;
    recovered += normalizedHeights[splitIndex] || 0;
  }

  let leading = blocks.slice(0, splitIndex);
  let trailing = blocks.slice(splitIndex);

  if (!leading.length || !trailing.length) {
    const midpoint = Math.ceil(blocks.length / 2);
    leading = blocks.slice(0, midpoint);
    trailing = blocks.slice(midpoint);
  }

  if (!leading.length || !trailing.length) return null;
  return { leading, trailing };
}

function splitPlainTextBlocks(text) {
  const paragraphs = splitParagraphs(text || '');
  if (paragraphs.length > 1) return paragraphs;

  const normalized = String(text || '').trim();
  if (!normalized) return [];

  const sentences = normalized
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'“‘(])/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (sentences.length > 1) return sentences;
  return [normalized];
}

function joinPlainTextBlocks(blocks) {
  return (blocks || []).map((block) => String(block || '').trim()).filter(Boolean).join('\n\n');
}

function cloneFragmentWithBody(fragment, bodyParagraphs, continuationLabel, partIndex, partCount) {
  return {
    ...clone(fragment || {}),
    bodyParagraphs,
    continuationLabel: continuationLabel || '',
    partIndex,
    partCount
  };
}

function splitSingleFragmentDocument(plan, index, measurement, entry, fragment) {
  const bodyParagraphs = Array.isArray(fragment && fragment.bodyParagraphs) && fragment.bodyParagraphs.length
    ? fragment.bodyParagraphs
    : splitPlainTextBlocks((fragment && (fragment.bodyText || fragment.body || fragment.content)) || '');
  const split = splitMeasuredBlocks(
    bodyParagraphs,
    (measurement && measurement.slotMetrics && measurement.slotMetrics.documentParagraphHeights) || [],
    measurement && measurement.overflowHeight
  );
  if (!split) return null;

  const leadingFragment = cloneFragmentWithBody(fragment, split.leading, '', 1, 2);
  const trailingFragment = cloneFragmentWithBody(fragment, split.trailing, 'Continued', 2, 2);
  const variantType = entry.type === 'overflow-doc' ? 'overflow-doc' : 'fragment-page';
  const revised = normalizeBookletPlan(plan);

  revised.splice(index, 1,
    {
      ...entry,
      fragments: [leadingFragment],
      layoutVariant: pickDefaultTemplateVariant(variantType, { entry: { fragments: [leadingFragment] } })
    },
    {
      ...entry,
      fragments: [trailingFragment],
      layoutVariant: pickDefaultTemplateVariant(variantType, { entry: { fragments: [trailingFragment] } })
    }
  );

  return normalizeBookletPlan(revised);
}

function buildWorkoutSessionFromSegments(session, segments, continuationLabel) {
  const storyBlocks = [];
  const exercises = [];
  let binaryChoice = null;

  (segments || []).forEach((segment) => {
    if (!segment) return;
    if (segment.kind === 'story') {
      storyBlocks.push(segment.value);
      return;
    }
    if (segment.kind === 'exercise') {
      exercises.push(clone(segment.value));
      return;
    }
    if (segment.kind === 'binaryChoice') {
      binaryChoice = clone(segment.value);
    }
  });

  return {
    ...clone(session || {}),
    storyPrompt: joinPlainTextBlocks(storyBlocks),
    exercises,
    binaryChoice,
    continuationLabel: continuationLabel || '',
    showNotes: exercises.length > 0
  };
}

function splitSingleSessionWorkoutEntry(plan, index, measurement, data) {
  const entry = (plan || [])[index];
  if (!entry || entry.type !== 'workout-left') return null;

  const sessions = Array.isArray(entry.sessions) ? entry.sessions : [];
  if (sessions.length !== 1) return null;

  const session = sessions[0] || {};
  const storyBlocks = splitPlainTextBlocks(session.storyPrompt || '');
  const slotMetrics = (measurement && measurement.slotMetrics) || {};
  const storyHeight = ((slotMetrics.storyPromptHeights || [])[0]) || 0;
  const exerciseRowHeights = ((slotMetrics.exerciseRowHeightsByCard || [])[0]) || [];
  const binaryChoiceHeight = ((slotMetrics.binaryChoiceHeights || [])[0]) || 0;
  const storyBlockHeights = storyBlocks.length
    ? storyBlocks.map(() => Math.max(1, Math.ceil(storyHeight / storyBlocks.length)))
    : [];

  const segments = [];
  storyBlocks.forEach((block, blockIndex) => {
    segments.push({
      kind: 'story',
      value: block,
      height: storyBlockHeights[blockIndex] || Math.max(1, Math.ceil(readingLength(block) / 120))
    });
  });
  (session.exercises || []).forEach((exercise, exerciseIndex) => {
    segments.push({
      kind: 'exercise',
      value: exercise,
      height: exerciseRowHeights[exerciseIndex] || 20
    });
  });
  if (session.binaryChoice) {
    segments.push({
      kind: 'binaryChoice',
      value: session.binaryChoice,
      height: binaryChoiceHeight || 24
    });
  }

  if (segments.length <= 1) return null;

  const split = splitMeasuredBlocks(
    segments,
    segments.map((segment) => segment.height),
    measurement && measurement.overflowHeight
  );
  if (!split) return null;

  const leadingSession = buildWorkoutSessionFromSegments(session, split.leading, '');
  const trailingSession = buildWorkoutSessionFromSegments(session, split.trailing, 'Continued');
  const leadingContentCount = leadingSession.exercises.length + (leadingSession.storyPrompt ? 1 : 0) + (leadingSession.binaryChoice ? 1 : 0);
  const trailingContentCount = trailingSession.exercises.length + (trailingSession.storyPrompt ? 1 : 0) + (trailingSession.binaryChoice ? 1 : 0);
  if (!leadingContentCount || !trailingContentCount) return null;

  const week = ((data || {}).weeks || [])[entry.weekIndex] || {};
  const revised = normalizeBookletPlan(plan);
  revised[index] = {
    ...revised[index],
    sessions: [leadingSession],
    compactionLevel: 0
  };

  revised.splice(index + 2, 0,
    {
      ...entry,
      sessions: [trailingSession],
      compactionLevel: 0
    },
    buildWorkoutContinuationPartner(week, entry.weekIndex)
  );

  return reindexWeekWorkoutEntries(revised, entry.weekIndex);
}

function splitDocumentEntry(plan, index, measurement, data) {
  const entry = (plan || [])[index];
  if (!entry) return null;

  if (entry.type === 'fragment-page') {
    const fragments = entry.fragments || [];
    if (fragments.length > 1) {
      return splitFragmentEntry(plan, index, measurement);
    }
    if (fragments.length === 1) {
      return splitSingleFragmentDocument(plan, index, measurement, entry, fragments[0]);
    }
    return null;
  }

  if (entry.type === 'overflow-doc') {
    const week = ((data || {}).weeks || [])[entry.weekIndex] || {};
    const sourceFragment = ((entry.fragments || [])[0]) || week.overflowDocument;
    if (!sourceFragment) return null;
    return splitSingleFragmentDocument(plan, index, measurement, entry, sourceFragment);
  }

  return null;
}

function splitBossEntry(plan, index, data) {
  const entry = (plan || [])[index];
  if (!entry || entry.type !== 'boss' || entry.continuationSegment) return null;

  const week = ((data || {}).weeks || [])[entry.weekIndex] || {};
  const boss = week.bossEncounter || {};
  const hasConvergenceAppendix = !!(
    boss.convergenceProof
    || (boss.binaryChoiceAcknowledgement && (boss.binaryChoiceAcknowledgement.ifA || boss.binaryChoiceAcknowledgement.ifB))
  );
  if (!hasConvergenceAppendix) return null;

  const revised = normalizeBookletPlan(plan);
  revised.splice(index, 1,
    {
      ...entry,
      layoutVariant: 'tight',
      continuationSegment: 'main',
      continuationLabel: ''
    },
    {
      ...entry,
      layoutVariant: 'tight',
      continuationSegment: 'followup',
      continuationLabel: 'Convergence continuation'
    }
  );

  return normalizeBookletPlan(revised);
}

function splitInterludeEntry(plan, index, measurement) {
  const entry = (plan || [])[index];
  if (!entry || entry.type !== 'interlude') return null;

  const blocks = Array.isArray(entry.bodyBlocks) && entry.bodyBlocks.length
    ? entry.bodyBlocks
    : splitRichContentBlocks(((entry.interlude || {}).body) || '');
  const split = splitMeasuredBlocks(blocks, (measurement && measurement.slotMetrics && measurement.slotMetrics.paragraphHeights) || [], measurement && measurement.overflowHeight);
  if (!split) return null;

  const revised = normalizeBookletPlan(plan);
  revised.splice(index, 1,
    {
      ...revised[index],
      bodyBlocks: split.leading,
      continuationLabel: ''
    },
    {
      ...revised[index],
      bodyBlocks: split.trailing,
      continuationLabel: 'Continued',
      layoutVariant: 'artifact'
    }
  );
  return normalizeBookletPlan(revised);
}

function splitUnlockedEndingEntry(plan, index, measurement) {
  const entry = (plan || [])[index];
  if (!entry || entry.type !== 'ending-unlocked') return null;

  const payload = entry.endingPayload || {};
  const sourceBlocks = Array.isArray(entry.bodyBlocks) && entry.bodyBlocks.length
    ? entry.bodyBlocks
    : splitRichContentBlocks(payload.body || payload.content || '');
  const split = splitMeasuredBlocks(
    sourceBlocks,
    (measurement && measurement.slotMetrics && measurement.slotMetrics.paragraphHeights) || [],
    measurement && measurement.overflowHeight
  );
  if (!split) return null;

  const revised = normalizeBookletPlan(plan);
  revised.splice(index, 1,
    {
      ...revised[index],
      bodyBlocks: split.leading,
      finalLineOverride: '',
      continuationLabel: ''
    },
    {
      ...revised[index],
      bodyBlocks: split.trailing,
      finalLineOverride: payload.finalLine || '',
      continuationLabel: 'Continued',
      layoutVariant: 'compact'
    }
  );
  return normalizeBookletPlan(revised);
}

export function revisePlanForMeasurement(plan, measurement, data) {
  if (!measurement) return null;

  if (measurement.pageType === 'workout-left') {
    const compactedPlan = compactWorkoutEntry(plan, measurement.planIndex);
    if (compactedPlan) return compactedPlan;
    const splitPlan = splitWorkoutEntry(plan, measurement.planIndex, measurement, data);
    if (splitPlan) return splitPlan;
    return splitSingleSessionWorkoutEntry(plan, measurement.planIndex, measurement, data);
  }

  if (measurement.pageType === 'field-ops') {
    const splitPlan = splitFieldOpsEntry(plan, measurement.planIndex, measurement, data);
    if (splitPlan) return splitPlan;
    return reviseEntryVariant(plan, measurement.planIndex);
  }

  if (measurement.pageType === 'companion-spread-left' || measurement.pageType === 'companion-spread-right') {
    return reviseCompanionSpreadVariant(plan, measurement.planIndex);
  }

  if (measurement.pageType === 'boss') {
    const bossVariantRevision = reviseEntryVariant(plan, measurement.planIndex);
    if (bossVariantRevision) return bossVariantRevision;
    return splitBossEntry(plan, measurement.planIndex, data);
  }

  if (measurement.pageType === 'fragment-page' || measurement.pageType === 'fragment' || measurement.pageType === 'overflow-doc') {
    const documentRevision = splitDocumentEntry(plan, measurement.planIndex, measurement, data);
    if (documentRevision) return documentRevision;

    const documentVariantRevision = reviseEntryVariant(plan, measurement.planIndex);
    if (documentVariantRevision) return documentVariantRevision;
    return null;
  }

  if (measurement.pageType === 'interlude') {
    const interludeSplit = splitInterludeEntry(plan, measurement.planIndex, measurement);
    if (interludeSplit) return interludeSplit;
  }

  const variantRevision = reviseEntryVariant(plan, measurement.planIndex);
  if (variantRevision) return variantRevision;

  if (measurement.pageType === 'interlude') {
    return null;
  }

  if (measurement.pageType === 'ending-unlocked') {
    return splitUnlockedEndingEntry(plan, measurement.planIndex, measurement);
  }

  return null;
}

export function planBookletLayout(data, unlockedEnding) {
  const entries = [
    { type: 'cover' },
    { type: 'rules-left', layoutVariant: pickDefaultTemplateVariant('rules-left', { data }) },
    { type: 'rules-right', layoutVariant: pickDefaultTemplateVariant('rules-right', { data }) }
  ];

  (data.weeks || []).forEach((week, weekIndex) => {
    entries.push(...planWeekEntries(week, weekIndex));
  });

  paginateFragments(data.fragments || []).forEach((fragments) => {
    entries.push({
      type: 'fragment-page',
      fragments,
      layoutVariant: pickDefaultTemplateVariant('fragment-page', { entry: { fragments } })
    });
  });

  entries.push(
    { type: 'assembly', layoutVariant: pickDefaultTemplateVariant('assembly', { data }) },
    { type: 'gauge-log', layoutVariant: pickDefaultTemplateVariant('gauge-log', { data }) },
    {
      type: unlockedEnding ? 'ending-unlocked' : 'ending-locked',
      layoutVariant: pickDefaultTemplateVariant(unlockedEnding ? 'ending-unlocked' : 'ending-locked', {
        data,
        entry: unlockedEnding || {}
      }),
      endingPayload: unlockedEnding ? clone(unlockedEnding) : null
    }
  );

  return normalizeBookletPlan(entries);
}
