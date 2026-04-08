import { useMemo } from 'react';
import { Scenario, StitchConfig } from '../data/types';
import { StitchOutput } from '../engine/stitcher';

interface Props {
  scenario: Scenario;
  config: StitchConfig;
  stitchOutput: StitchOutput;
}

export function VerdictBox({ scenario, config, stitchOutput }: Props) {
  const verdict = useMemo(
    () => computeVerdict(scenario, config, stitchOutput),
    [scenario, config, stitchOutput],
  );

  const isGreen = verdict.color === 'green';
  const isOrange = verdict.color === 'orange';

  return (
    <div className="space-y-2">
      {/* Main verdict */}
      <div className={`rounded-lg px-5 py-3 flex items-start gap-3 text-sm transition-colors duration-200 ${
        isGreen  ? 'bg-green-900/40 text-green-300 border border-green-700/60' :
        isOrange ? 'bg-amber-900/40 text-amber-300 border border-amber-700/60' :
                   'bg-red-900/40 text-red-300 border border-red-700/60'
      }`}>
        <span className="text-lg leading-none mt-0.5">
          {isGreen ? '\u2705' : isOrange ? '\u26A0\uFE0F' : '\u274C'}
        </span>
        <div className="min-w-0">
          <div className="font-bold text-sm tracking-wide">
            {verdict.label}
          </div>
          <p className="text-xs opacity-80 mt-0.5 leading-relaxed">{verdict.text}</p>
        </div>
      </div>

      {/* Identity quality warnings */}
      {verdict.warnings.map((w, i) => (
        <div key={i} className={`rounded-lg px-5 py-2.5 flex items-start gap-3 text-sm border ${
          w.severity === 'error'
            ? 'bg-red-950/60 text-red-300 border-red-700/60'
            : 'bg-amber-950/50 text-amber-300 border-amber-700/50'
        }`}>
          <span className="text-base leading-none mt-0.5">
            {w.severity === 'error' ? '\uD83D\uDEA8' : '\u26A0\uFE0F'}
          </span>
          <div className="min-w-0">
            <div className="font-bold text-xs uppercase tracking-wider">{w.title}</div>
            <p className="text-xs opacity-80 mt-0.5 leading-relaxed">{w.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

interface Warning {
  severity: 'error' | 'warn';
  title: string;
  detail: string;
}

interface Verdict {
  color: 'green' | 'orange' | 'red';
  label: string;
  text: string;
  warnings: Warning[];
}

function computeVerdict(
  scenario: Scenario,
  config: StitchConfig,
  output: StitchOutput,
): Verdict {
  const warnings: Warning[] = [];

  if (config.method === 'none') {
    return {
      color: 'red',
      label: 'NO STITCHING APPLIED',
      text: `All ${scenario.events.length} events remain keyed to their raw persistent IDs. Select FBS or GBS to see stitching results.`,
      warnings,
    };
  }

  const total = output.results.length;
  const orphaned = output.results.filter(r => r.isOrphaned).length;
  const stitched = total - orphaned;

  const liveCount = output.results.filter(r => r.stitchType === 'live').length;
  const replayCount = output.results.filter(r => r.stitchType === 'replay').length;
  const graphCount = output.results.filter(r => r.stitchType === 'graph').length;

  // Count distinct resolved Person IDs (excluding orphans)
  const personIds = new Set(
    output.results.filter(r => !r.isOrphaned && r.resolvedPersonId).map(r => r.resolvedPersonId),
  );
  const identityCount = personIds.size;
  const realPeople = scenario.realPeopleCount;

  // === Identity quality checks ===

  // Graph collapse: fewer resolved identities than real people
  if (realPeople > 0 && identityCount > 0 && identityCount < realPeople) {
    const merged = realPeople - identityCount;
    warnings.push({
      severity: 'error',
      title: 'Graph Collapse',
      detail: `${realPeople} real people are being merged into ${identityCount} identity${identityCount > 1 ? 'ies' : ''}. `
        + `${merged} distinct ${merged === 1 ? 'person is' : 'people are'} incorrectly combined. `
        + `This inflates metrics for the merged identity and erases the others. `
        + (config.method === 'gbs' && !config.ioaEnabled
          ? 'Try enabling IOA and marking Email as a unique namespace to prevent collapse.'
          : config.method === 'fbs'
            ? 'FBS device-split handles this better than GBS for shared devices.'
            : 'Check unique namespace and IOA settings.'),
    });
  }

  // Incorrect split: more resolved identities than real people
  if (realPeople > 0 && identityCount > realPeople) {
    const extra = identityCount - realPeople;
    warnings.push({
      severity: 'warn',
      title: 'Identity Split',
      detail: `1 real person is appearing as ${identityCount} separate identities. `
        + `${extra} extra ${extra === 1 ? 'identity is' : 'identities are'} fragmenting the journey. `
        + `People count is inflated and attribution is incomplete for each fragment. `
        + (config.method === 'fbs'
          ? 'FBS cannot bridge different emails or cross-dataset identifiers. Consider GBS with a bridging namespace (Phone, MarketoLeadID).'
          : 'Check if a bridging namespace (Phone, MarketoLeadID) connects the identities in the graph.'),
    });
  }

  // Orphans that belong to a real person (not bots)
  if (orphaned > 0 && realPeople > 0) {
    const orphanSteps = output.results
      .filter(r => r.isOrphaned)
      .map(r => scenario.events[r.eventIndex].step);
    warnings.push({
      severity: 'warn',
      title: 'Orphaned Events',
      detail: `Step${orphanSteps.length > 1 ? 's' : ''} ${orphanSteps.join(', ')} `
        + `cannot be attributed to any person. These events are invisible in person-level reporting `
        + `and any engagement on them (ad clicks, page views) is lost from the journey.`,
    });
  }

  // Build stitch-type breakdown string
  const parts: string[] = [];
  if (liveCount > 0) parts.push(`${liveCount} live`);
  if (replayCount > 0) parts.push(`${replayCount} replay`);
  if (graphCount > 0) parts.push(`${graphCount} graph`);
  const breakdown = parts.join(', ');

  const methodLabel = config.method === 'fbs' ? 'FBS' : 'GBS';
  const idLabel = `${config.persistentId} \u2192 ${config.transientId}`;

  // Determine overall color: collapse overrides green to red
  let color: Verdict['color'];
  if (realPeople > 0 && identityCount > 0 && identityCount < realPeople) {
    color = 'red'; // collapse is always bad
  } else if (orphaned === 0 && identityCount <= realPeople) {
    color = 'green';
  } else if (stitched === 0) {
    color = 'red';
  } else {
    color = 'orange';
  }

  if (orphaned === 0 && warnings.length === 0) {
    const idNote = identityCount === 1
      ? `All events resolve to a single person (${Array.from(personIds)[0]}).`
      : `Events resolve to ${identityCount} distinct identities.`;

    return {
      color,
      label: color === 'green' ? 'FULLY STITCHABLE' : 'ALL EVENTS STITCHED',
      text: `${methodLabel} (${idLabel}): All ${total} events stitched (${breakdown}). ${idNote}`,
      warnings,
    };
  }

  if (stitched === 0) {
    return {
      color: 'red',
      label: 'NOT STITCHABLE',
      text: `${methodLabel} (${idLabel}): None of the ${total} events could be stitched. No event in this scenario has a usable ${config.transientId} value reachable from ${config.persistentId}.`,
      warnings,
    };
  }

  // Partial or stitched-with-warnings
  const orphanSteps = output.results
    .filter(r => r.isOrphaned)
    .map(r => scenario.events[r.eventIndex].step);

  const label = orphaned === 0 ? 'ALL EVENTS STITCHED' : 'PARTIALLY STITCHABLE';
  const orphanNote = orphaned > 0
    ? ` ${orphaned} orphaned (Step${orphanSteps.length > 1 ? 's' : ''} ${orphanSteps.join(', ')}).`
    : '';

  return {
    color,
    label,
    text: `${methodLabel} (${idLabel}): ${stitched} of ${total} events stitched (${breakdown}).${orphanNote}`,
    warnings,
  };
}
