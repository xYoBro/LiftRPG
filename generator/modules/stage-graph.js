// Canonical pipeline dataflow. Orchestrators execute these stages; this module
// only answers dependency questions shared by repair order, resume pruning,
// and the progress projection.
export const DYNAMIC_STAGE_FAMILIES = Object.freeze({
  weeks: /^week_\d+$/,
  fragments: /^fragBatch_\d+$/
});

export const PIPELINE_STAGE_GRAPHS = Object.freeze({
  standard: Object.freeze({
    nodes: Object.freeze(['workoutCanonical', 'gameRulebook', 'layerBible', 'campaignPlan',
      'shellIdentity', 'shellSpine', 'economyGraph', 'knowing', 'shellRules', 'shellTheme',
      'weeks', 'fragments', 'endings']),
    edges: Object.freeze([
      ['workoutCanonical', 'gameRulebook'],
      ['gameRulebook', 'layerBible'], ['gameRulebook', 'campaignPlan'],
      ['layerBible', 'campaignPlan'],
      ['campaignPlan', 'shellIdentity'], ['campaignPlan', 'shellRules'],
      ['campaignPlan', 'shellTheme'], ['campaignPlan', 'shellSpine'],
      ['campaignPlan', 'economyGraph'], ['campaignPlan', 'knowing'],
      ['campaignPlan', 'weeks'], ['campaignPlan', 'fragments'], ['campaignPlan', 'endings'],
      ['shellIdentity', 'shellRules'], ['shellIdentity', 'shellTheme'],
      ['shellIdentity', 'shellSpine'], ['shellIdentity', 'knowing'],
      ['shellIdentity', 'weeks'], ['shellIdentity', 'fragments'], ['shellIdentity', 'endings'],
      ['shellSpine', 'economyGraph'], ['shellSpine', 'weeks'], ['shellSpine', 'fragments'],
      ['shellSpine', 'endings'], ['economyGraph', 'weeks'], ['economyGraph', 'fragments'],
      ['economyGraph', 'endings'], ['knowing', 'weeks'], ['knowing', 'fragments'],
      ['knowing', 'endings'], ['weeks', 'fragments'], ['weeks', 'endings'],
      ['fragments', 'endings']
    ])
  }),
  'skeleton-flesh': Object.freeze({
    nodes: Object.freeze(['workoutCanonical', 'gameRulebook', 'skeleton', 'knowing',
      'rules', 'weeks', 'fragments', 'endings']),
    edges: Object.freeze([
      ['workoutCanonical', 'gameRulebook'], ['gameRulebook', 'skeleton'],
      ['skeleton', 'knowing'], ['skeleton', 'rules'], ['skeleton', 'weeks'],
      ['skeleton', 'fragments'], ['skeleton', 'endings'],
      ['knowing', 'rules'], ['knowing', 'weeks'], ['knowing', 'fragments'],
      ['knowing', 'endings'], ['rules', 'weeks'], ['weeks', 'fragments'],
      ['weeks', 'endings'], ['fragments', 'endings']
    ])
  })
});

function graphFor(pipeline) {
  var graph = PIPELINE_STAGE_GRAPHS[pipeline];
  if (!graph) throw new Error('Unknown pipeline stage graph: ' + pipeline);
  return graph;
}

function familyForKey(key, pipeline) {
  if (/^week_\d+$/.test(key)) return 'weeks';
  if (pipeline === 'standard' && /^fragBatch_\d+$/.test(key)) return 'fragments';
  return key;
}

export function checkpointInvalidationSet(options) {
  var pipeline = String((options || {}).pipeline || '');
  var graph = graphFor(pipeline);
  var ownerKey = String((options || {}).ownerKey || '');
  var ownerFamily = familyForKey(ownerKey, pipeline);
  if (graph.nodes.indexOf(ownerFamily) === -1) {
    throw new Error('Unknown checkpoint owner stage "' + ownerKey + '" for ' + pipeline);
  }
  var descendants = new Set([ownerFamily]);
  var changed = true;
  while (changed) {
    changed = false;
    graph.edges.forEach(function (edge) {
      if (descendants.has(edge[0]) && !descendants.has(edge[1])) {
        descendants.add(edge[1]); changed = true;
      }
    });
  }
  var concrete = new Set();
  var keys = Array.isArray((options || {}).checkpointKeys) ? options.checkpointKeys : [];
  keys.forEach(function (key) {
    if (descendants.has(familyForKey(key, pipeline))) concrete.add(key);
  });
  if (keys.indexOf(ownerKey) === -1) concrete.add(ownerKey);
  return concrete;
}

export function stageOrderForPipeline(pipeline) {
  return graphFor(pipeline).nodes.slice();
}

// The public rail is a projection of the provider graph, not a second stage
// inventory. workoutCanonical is local input normalization and has no paid
// card; quality is the local closing gate and therefore is appended here.
export function publicRailOrderForPipeline(pipeline) {
  var order = stageOrderForPipeline(pipeline).filter(function (stage) {
    return stage !== 'workoutCanonical';
  });
  order.push('quality');
  return order;
}

export function repairStageOrder() {
  var graphs = Object.keys(PIPELINE_STAGE_GRAPHS).map(graphFor);
  var nodes = [];
  graphs.forEach(function (graph) {
    graph.nodes.forEach(function (node) {
      if (nodes.indexOf(node) === -1) nodes.push(node);
    });
  });
  var remaining = nodes.slice();
  var ordered = [];
  while (remaining.length) {
    var nextIndex = remaining.findIndex(function (node) {
      return graphs.every(function (graph) {
        return graph.edges.every(function (edge) {
          return edge[1] !== node || ordered.indexOf(edge[0]) !== -1;
        });
      });
    });
    if (nextIndex < 0) throw new Error('Pipeline stage graphs contain a dependency cycle');
    ordered.push(remaining.splice(nextIndex, 1)[0]);
  }
  return ordered;
}
