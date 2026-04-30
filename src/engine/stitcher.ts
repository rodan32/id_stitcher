import { Scenario, StitchConfig, StitchResult, GraphEdge, GraphNode, NamespaceId, TimelineEvent } from '../data/types';

export interface StitchOutput {
  results: StitchResult[];
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  personIdValues: Map<number, string | null>;
}

/** Scenario after Tealium ingest-time strip and optional cross-device enrichment (matches computeStitch preprocessing). */
export function getStitchingScenario(scenario: Scenario, config: StitchConfig): Scenario {
  if (config.method === 'none') return scenario;
  let working = scenario;
  if (config.tealiumIngestTimeSemantics) {
    working = applyTealiumIngestTimeSemantics(working);
  }
  if (config.tealiumCrossDevice && !config.tealiumIngestTimeSemantics) {
    working = applyTealiumEnrichment(working);
  }
  return working;
}

export function computeStitch(scenario: Scenario, config: StitchConfig): StitchOutput {
  if (config.method === 'none') {
    return computeNoStitch(scenario);
  }

  const effectiveScenario = getStitchingScenario(scenario, config);

  const { graphNodes, graphEdges } = buildIdentityGraph(effectiveScenario, config);

  if (config.method === 'fbs') {
    return computeFBS(effectiveScenario, config, graphNodes, graphEdges);
  }

  return computeGBS(effectiveScenario, config, graphNodes, graphEdges);
}

/**
 * Simulates Tealium AudienceStream enrichment: when cross-device stitching
 * is on, Tealium's master profile knows the resolved person-level IDs for
 * all stitched TealiumVisitorIDs. Events that originally lacked a person-
 * level ID get enriched with one, as if Tealium sent the resolved identity
 * downstream to AEP.
 */
/**
 * Simulates Tealium→AEP time-of-ingestion: each Tealium row may only include
 * person-level identifiers that AudienceStream had attached by that point in
 * the visitor timeline (same TVID / ECID group, scenario order).
 */
function applyTealiumIngestTimeSemantics(scenario: Scenario): Scenario {
  const PERSON_NS: NamespaceId[] = ['Email', 'Phone', 'WGU_ID', 'MarketoLeadID', 'SFDCContactID', 'MunchkinID'];
  const events = scenario.events;

  const keyFor = (evt: TimelineEvent, idx: number): string | null => {
    if (evt.dataset !== 'Tealium') return null;
    const tv = evt.identifiers.TealiumVisitorID;
    if (tv) return `tv:${tv}`;
    const ecid = evt.identifiers.ECID;
    if (ecid) return `ecid:${ecid}`;
    return `solo:${idx}`;
  };

  const firstAppear = new Map<string, Map<NamespaceId, number>>();

  for (let i = 0; i < events.length; i++) {
    const evt = events[i];
    const key = keyFor(evt, i);
    if (!key) continue;
    if (!firstAppear.has(key)) firstAppear.set(key, new Map());
    const m = firstAppear.get(key)!;
    for (const ns of PERSON_NS) {
      const val = evt.identifiers[ns];
      if (val && !m.has(ns)) m.set(ns, i);
    }
  }

  const newEvents = events.map((evt, i) => {
    if (evt.dataset !== 'Tealium') return evt;
    const key = keyFor(evt, i);
    if (!key) return evt;
    const m = firstAppear.get(key);
    if (!m) return evt;
    const newIds = { ...evt.identifiers };
    for (const ns of PERSON_NS) {
      if (!newIds[ns]) continue;
      const first = m.get(ns);
      if (first !== undefined && first > i) {
        delete newIds[ns];
      }
    }
    return { ...evt, identifiers: newIds };
  });

  return { ...scenario, events: newEvents };
}

function applyTealiumEnrichment(scenario: Scenario): Scenario {
  const PERSON_NS: NamespaceId[] = ['Email', 'Phone', 'WGU_ID', 'MarketoLeadID', 'SFDCContactID'];

  // Build a map: for each person-level NS, collect all values seen on any
  // event that also has a TealiumVisitorID (regardless of which TEA-x)
  const tealiumPersonIds = new Map<NamespaceId, string>();
  for (const evt of scenario.events) {
    if (!evt.identifiers['TealiumVisitorID']) continue;
    for (const pns of PERSON_NS) {
      const pval = evt.identifiers[pns];
      if (pval && !tealiumPersonIds.has(pns)) {
        tealiumPersonIds.set(pns, pval);
      }
    }
  }

  if (tealiumPersonIds.size === 0) return scenario;

  // Enrich: any event with a TealiumVisitorID that is missing a known
  // person-level ID gets it added (Tealium resolved it server-side)
  const enrichedEvents = scenario.events.map(evt => {
    if (!evt.identifiers['TealiumVisitorID']) return evt;

    let needsEnrich = false;
    for (const [pns] of tealiumPersonIds) {
      if (!evt.identifiers[pns]) { needsEnrich = true; break; }
    }
    if (!needsEnrich) return evt;

    const newIds = { ...evt.identifiers };
    for (const [pns, pval] of tealiumPersonIds) {
      if (!newIds[pns]) newIds[pns] = pval;
    }
    return { ...evt, identifiers: newIds };
  });

  return { ...scenario, events: enrichedEvents };
}

function computeNoStitch(scenario: Scenario): StitchOutput {
  const results: StitchResult[] = scenario.events.map((evt, i) => ({
    eventIndex: i,
    resolvedPersonId: getPersistentValue(evt, 'ECID') || getFirstIdentifier(evt),
    stitchType: 'none' as const,
    isOrphaned: false,
    explanation: 'No stitching applied. Event keyed to its persistent ID.',
  }));

  const { graphNodes, graphEdges } = buildRawGraph(scenario);

  return {
    results,
    graphNodes,
    graphEdges,
    personIdValues: new Map(results.map(r => [r.eventIndex, r.resolvedPersonId])),
  };
}

function computeFBS(
  scenario: Scenario,
  config: StitchConfig,
  graphNodes: GraphNode[],
  graphEdges: GraphEdge[]
): StitchOutput {
  const results: StitchResult[] = [];
  const personIdValues = new Map<number, string | null>();

  // Group events by dataset + persistent ID value
  const groups = groupByDatasetAndPersistent(scenario.events, config.persistentId);

  for (const [_key, eventIndices] of groups) {
    // Find if any event in this group has the transient ID
    const transientValues: { index: number; value: string }[] = [];
    for (const idx of eventIndices) {
      const evt = scenario.events[idx];
      const tv = evt.identifiers[config.transientId];
      if (tv) transientValues.push({ index: idx, value: tv });
    }

    if (transientValues.length === 0) {
      // No transient ID in this group - all orphaned
      for (const idx of eventIndices) {
        const persistVal = scenario.events[idx].identifiers[config.persistentId];
        results.push({
          eventIndex: idx,
          resolvedPersonId: persistVal || null,
          stitchType: 'none',
          isOrphaned: true,
          explanation: `No ${config.transientId} found on any event sharing this ${config.persistentId}. Cannot stitch.`,
        });
        personIdValues.set(idx, persistVal || null);
      }
    } else {
      // FBS device-split: attribute to the most recent transient value at or before each event
      const firstTransient = transientValues[0];
      const lastTransient = transientValues[transientValues.length - 1];

      for (const idx of eventIndices) {
        const evt = scenario.events[idx];
        const hasTransient = !!evt.identifiers[config.transientId];

        if (hasTransient) {
          // Live stitch
          const val = evt.identifiers[config.transientId]!;
          results.push({
            eventIndex: idx,
            resolvedPersonId: val,
            stitchType: 'live',
            isOrphaned: false,
            explanation: `Live stitch: ${config.transientId} present on this event.`,
          });
          personIdValues.set(idx, val);
        } else if (idx < firstTransient.index) {
          // Pre-first-auth: replay stitches to first transient value
          // Enforce replay window: if dayOffset is set, check temporal distance
          const evtDay = evt.dayOffset ?? 0;
          const authDay = scenario.events[firstTransient.index].dayOffset ?? 0;
          const gap = Math.abs(authDay - evtDay);

          if (gap > config.replayWindow) {
            const persistVal = evt.identifiers[config.persistentId];
            results.push({
              eventIndex: idx,
              resolvedPersonId: persistVal || null,
              stitchType: 'none',
              isOrphaned: true,
              explanation: `Outside ${config.replayWindow}-day replay window (${gap} days from auth). Cannot replay-stitch.`,
            });
            personIdValues.set(idx, persistVal || null);
          } else {
            results.push({
              eventIndex: idx,
              resolvedPersonId: firstTransient.value,
              stitchType: 'replay',
              isOrphaned: false,
              explanation: `Replay stitch: re-keyed to ${firstTransient.value} (within ${config.replayWindow}-day window).`,
            });
            personIdValues.set(idx, firstTransient.value);
          }
        } else {
          // Between auths or after last auth
          // Find the most recent transient before this event
          let nearest = firstTransient;
          for (const tv of transientValues) {
            if (tv.index <= idx) nearest = tv;
          }
          // Enforce replay window
          const evtDay = evt.dayOffset ?? 0;
          const nearestDay = scenario.events[nearest.index].dayOffset ?? 0;
          const gap = Math.abs(evtDay - nearestDay);

          if (gap > config.replayWindow) {
            const persistVal = evt.identifiers[config.persistentId];
            results.push({
              eventIndex: idx,
              resolvedPersonId: persistVal || null,
              stitchType: 'none',
              isOrphaned: true,
              explanation: `Outside ${config.replayWindow}-day replay window (${gap} days from nearest auth). Cannot replay-stitch.`,
            });
            personIdValues.set(idx, persistVal || null);
          } else {
            results.push({
              eventIndex: idx,
              resolvedPersonId: nearest.value,
              stitchType: 'replay',
              isOrphaned: false,
              explanation: `Replay stitch: re-keyed to ${nearest.value} (within ${config.replayWindow}-day window).`,
            });
            personIdValues.set(idx, nearest.value);
          }
        }
      }
    }
  }

  // Sort results by event index
  results.sort((a, b) => a.eventIndex - b.eventIndex);

  return { results, graphNodes, graphEdges, personIdValues };
}

function computeGBS(
  scenario: Scenario,
  config: StitchConfig,
  graphNodes: GraphNode[],
  graphEdges: GraphEdge[]
): StitchOutput {
  const results: StitchResult[] = [];
  const personIdValues = new Map<number, string | null>();

  // Build adjacency from active edges for graph traversal
  const adjacency = new Map<string, Set<string>>();
  for (const edge of graphEdges) {
    if (!edge.active) continue;
    const key = `${edge.sourceNs}:${edge.source}`;
    const valKey = `${edge.targetNs}:${edge.target}`;
    if (!adjacency.has(key)) adjacency.set(key, new Set());
    if (!adjacency.has(valKey)) adjacency.set(valKey, new Set());
    adjacency.get(key)!.add(valKey);
    adjacency.get(valKey)!.add(key);
  }

  for (let i = 0; i < scenario.events.length; i++) {
    const evt = scenario.events[i];
    const persistVal = evt.identifiers[config.persistentId];

    if (!persistVal) {
      // No persistent ID on this event (e.g., Marketo without ECID)
      // Check if event has target namespace directly
      const directTarget = evt.identifiers[config.transientId];
      if (directTarget) {
        results.push({
          eventIndex: i,
          resolvedPersonId: directTarget,
          stitchType: 'live',
          isOrphaned: false,
          explanation: `${config.transientId} present directly on this event. No graph lookup needed.`,
        });
        personIdValues.set(i, directTarget);
      } else {
        results.push({
          eventIndex: i,
          resolvedPersonId: null,
          stitchType: 'none',
          isOrphaned: true,
          explanation: `No ${config.persistentId} and no ${config.transientId} on this event.`,
        });
        personIdValues.set(i, null);
      }
      continue;
    }

    // GBS: query graph from persistent ID to find target namespace
    const startKey = `${config.persistentId}:${persistVal}`;
    const targetNs = config.transientId; // In GBS, transientId field = target namespace

    // BFS through the graph
    const resolved = bfsResolve(adjacency, startKey, targetNs);

    if (resolved) {
      const resolvedValue = resolved.split(':').slice(1).join(':');
      results.push({
        eventIndex: i,
        resolvedPersonId: resolvedValue,
        stitchType: 'graph',
        isOrphaned: false,
        explanation: `Graph resolved: ${config.persistentId}(${persistVal}) → ${targetNs}(${resolvedValue}).`,
      });
      personIdValues.set(i, resolvedValue);
    } else {
      // Check if event has target directly
      const directTarget = evt.identifiers[targetNs as NamespaceId];
      if (directTarget) {
        results.push({
          eventIndex: i,
          resolvedPersonId: directTarget,
          stitchType: 'live',
          isOrphaned: false,
          explanation: `${targetNs} present on this event. Graph not needed.`,
        });
        personIdValues.set(i, directTarget);
      } else {
        results.push({
          eventIndex: i,
          resolvedPersonId: persistVal,
          stitchType: 'none',
          isOrphaned: true,
          explanation: `Graph has no path from ${config.persistentId}(${persistVal}) to any ${targetNs}. Orphaned.`,
        });
        personIdValues.set(i, persistVal);
      }
    }
  }

  return { results, graphNodes, graphEdges, personIdValues };
}

function bfsResolve(
  adjacency: Map<string, Set<string>>,
  start: string,
  targetNs: string
): string | null {
  const visited = new Set<string>();
  const queue = [start];
  visited.add(start);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const ns = current.split(':')[0];
    if (ns === targetNs && current !== start) {
      return current;
    }
    const neighbors = adjacency.get(current);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
  }
  return null;
}

function buildIdentityGraph(scenario: Scenario, config: StitchConfig): { graphNodes: GraphNode[]; graphEdges: GraphEdge[] } {
  const nodeMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  // Collect all identifier pairs from events
  for (let i = 0; i < scenario.events.length; i++) {
    const evt = scenario.events[i];
    const ids = Object.entries(evt.identifiers) as [NamespaceId, string][];

    // Add nodes
    for (const [ns, val] of ids) {
      const key = `${ns}:${val}`;
      if (!nodeMap.has(key)) {
        const nsInfo = getNsLevel(ns);
        nodeMap.set(key, { id: key, namespace: ns, value: val, level: nsInfo });
      }
    }

    // Add edges between all identifier pairs on the same event
    for (let a = 0; a < ids.length; a++) {
      for (let b = a + 1; b < ids.length; b++) {
        edges.push({
          source: ids[a][1],
          target: ids[b][1],
          sourceNs: ids[a][0],
          targetNs: ids[b][0],
          fromEvent: i,
          active: true,
        });
      }
    }
  }

  // Tealium cross-device resolution: bridge TealiumVisitorIDs that share
  // a person-level identifier through Tealium events. This simulates
  // AudienceStream stitching profiles server-side and feeding resolved
  // links into the AEP identity graph.
  if (config.tealiumCrossDevice && !config.tealiumIngestTimeSemantics) {
    addTealiumCrossDeviceBridges(scenario, nodeMap, edges);
  }

  // Apply IOA / unique namespace constraints for GBS
  if (config.method === 'gbs' && config.ioaEnabled) {
    applyIOA(edges, config.uniqueNamespaces);
  }

  return { graphNodes: Array.from(nodeMap.values()), graphEdges: edges };
}

function applyIOA(edges: GraphEdge[], uniqueNamespaces: NamespaceId[]) {
  // For each unique namespace, only keep the most recent edge linking a device ID to it
  // This simulates Identity Optimization Algorithm removing stale links
  for (const uniqueNs of uniqueNamespaces) {
    // Group edges involving this unique namespace by the OTHER side's value
    const deviceToPersonEdges = new Map<string, GraphEdge[]>();
    for (const edge of edges) {
      if (edge.sourceNs === uniqueNs || edge.targetNs === uniqueNs) {
        const otherSide = edge.sourceNs === uniqueNs
          ? `${edge.targetNs}:${edge.target}`
          : `${edge.sourceNs}:${edge.source}`;
        const otherNsLevel = getNsLevel(edge.sourceNs === uniqueNs ? edge.targetNs : edge.sourceNs);
        if (otherNsLevel === 'device') {
          if (!deviceToPersonEdges.has(otherSide)) deviceToPersonEdges.set(otherSide, []);
          deviceToPersonEdges.get(otherSide)!.push(edge);
        }
      }
    }

    // For each device identifier, keep only the latest edge to a unique namespace
    for (const [_deviceKey, deviceEdges] of deviceToPersonEdges) {
      if (deviceEdges.length <= 1) continue;
      // Sort by event index (latest first)
      deviceEdges.sort((a, b) => b.fromEvent - a.fromEvent);
      // Deactivate all but the latest
      for (let i = 1; i < deviceEdges.length; i++) {
        deviceEdges[i].active = false;
      }
    }
  }
}

function buildRawGraph(scenario: Scenario): { graphNodes: GraphNode[]; graphEdges: GraphEdge[] } {
  const nodeMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  for (let i = 0; i < scenario.events.length; i++) {
    const evt = scenario.events[i];
    const ids = Object.entries(evt.identifiers) as [NamespaceId, string][];

    for (const [ns, val] of ids) {
      const key = `${ns}:${val}`;
      if (!nodeMap.has(key)) {
        nodeMap.set(key, { id: key, namespace: ns, value: val, level: getNsLevel(ns) });
      }
    }

    for (let a = 0; a < ids.length; a++) {
      for (let b = a + 1; b < ids.length; b++) {
        edges.push({
          source: ids[a][1],
          target: ids[b][1],
          sourceNs: ids[a][0],
          targetNs: ids[b][0],
          fromEvent: i,
          active: true,
        });
      }
    }
  }

  return { graphNodes: Array.from(nodeMap.values()), graphEdges: edges };
}

function addTealiumCrossDeviceBridges(
  scenario: Scenario,
  nodeMap: Map<string, GraphNode>,
  edges: GraphEdge[]
) {
  // Collect all TealiumVisitorIDs and the person-level IDs they co-occur
  // with on Tealium dataset events. If two different TEA-x values share a
  // person-level identifier (e.g., both linked to the same email through
  // separate Tealium events), Tealium's AudienceStream would stitch them
  // server-side. We model this by adding a direct edge between those
  // TealiumVisitorIDs, as if Tealium sent the resolved link to AEP.
  const personToTealiumIds = new Map<string, { tealiumId: string; eventIdx: number }[]>();
  const PERSON_NS: NamespaceId[] = ['Email', 'Phone', 'WGU_ID', 'MarketoLeadID', 'SFDCContactID'];

  for (let i = 0; i < scenario.events.length; i++) {
    const evt = scenario.events[i];
    const teaId = evt.identifiers['TealiumVisitorID'];
    if (!teaId) continue;

    // Find any person-level ID on this event
    for (const pns of PERSON_NS) {
      const pval = evt.identifiers[pns];
      if (pval) {
        const key = `${pns}:${pval}`;
        if (!personToTealiumIds.has(key)) personToTealiumIds.set(key, []);
        personToTealiumIds.get(key)!.push({ tealiumId: teaId, eventIdx: i });
      }
    }
  }

  // For each person-level ID that has multiple distinct TealiumVisitorIDs,
  // bridge those TEA-x values together
  for (const [_personKey, entries] of personToTealiumIds) {
    const uniqueTea = new Map<string, number>(); // tealiumId -> first event
    for (const e of entries) {
      if (!uniqueTea.has(e.tealiumId)) uniqueTea.set(e.tealiumId, e.eventIdx);
    }
    const teaIds = Array.from(uniqueTea.entries());
    if (teaIds.length < 2) continue;

    // Create edges between each pair of TealiumVisitorIDs
    for (let a = 0; a < teaIds.length; a++) {
      for (let b = a + 1; b < teaIds.length; b++) {
        // Ensure nodes exist
        const keyA = `TealiumVisitorID:${teaIds[a][0]}`;
        const keyB = `TealiumVisitorID:${teaIds[b][0]}`;
        if (!nodeMap.has(keyA)) {
          nodeMap.set(keyA, { id: keyA, namespace: 'TealiumVisitorID', value: teaIds[a][0], level: 'device' });
        }
        if (!nodeMap.has(keyB)) {
          nodeMap.set(keyB, { id: keyB, namespace: 'TealiumVisitorID', value: teaIds[b][0], level: 'device' });
        }

        edges.push({
          source: teaIds[a][0],
          target: teaIds[b][0],
          sourceNs: 'TealiumVisitorID',
          targetNs: 'TealiumVisitorID',
          fromEvent: Math.max(teaIds[a][1], teaIds[b][1]),
          active: true,
        });
      }
    }
  }
}

function groupByDatasetAndPersistent(
  events: TimelineEvent[],
  persistentId: NamespaceId
): Map<string, number[]> {
  const groups = new Map<string, number[]>();
  for (let i = 0; i < events.length; i++) {
    const evt = events[i];
    const pVal = evt.identifiers[persistentId];
    if (!pVal) {
      // Events without persistent ID get their own group
      const key = `__no_persistent_${i}`;
      groups.set(key, [i]);
      continue;
    }
    const key = `${evt.dataset}:${pVal}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(i);
  }
  return groups;
}

function getNsLevel(ns: NamespaceId): 'device' | 'person' {
  const deviceNs: NamespaceId[] = ['ECID', 'TealiumVisitorID', 'MunchkinID'];
  return deviceNs.includes(ns) ? 'device' : 'person';
}

function getPersistentValue(evt: TimelineEvent, ns: NamespaceId): string | undefined {
  return evt.identifiers[ns];
}

function getFirstIdentifier(evt: TimelineEvent): string {
  const vals = Object.values(evt.identifiers);
  return vals[0] || 'unknown';
}
