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
  );
}

interface Verdict {
  color: 'green' | 'orange' | 'red';
  label: string;
  text: string;
}

function computeVerdict(
  scenario: Scenario,
  config: StitchConfig,
  output: StitchOutput,
): Verdict {
  if (config.method === 'none') {
    return {
      color: 'red',
      label: 'NO STITCHING APPLIED',
      text: `All ${scenario.events.length} events remain keyed to their raw persistent IDs. Select FBS or GBS to see stitching results.`,
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

  // Build stitch-type breakdown string
  const parts: string[] = [];
  if (liveCount > 0) parts.push(`${liveCount} live`);
  if (replayCount > 0) parts.push(`${replayCount} replay`);
  if (graphCount > 0) parts.push(`${graphCount} graph`);
  const breakdown = parts.join(', ');

  const methodLabel = config.method === 'fbs' ? 'FBS' : 'GBS';
  const idLabel = `${config.persistentId} \u2192 ${config.transientId}`;

  if (orphaned === 0) {
    const idNote = identityCount === 1
      ? `All events resolve to a single person (${Array.from(personIds)[0]}).`
      : `Events resolve to ${identityCount} distinct identities \u2014 check if a split is expected or indicates a missing bridge.`;

    return {
      color: 'green',
      label: 'FULLY STITCHABLE',
      text: `${methodLabel} (${idLabel}): All ${total} events stitched (${breakdown}). ${idNote}`,
    };
  }

  if (stitched === 0) {
    return {
      color: 'red',
      label: 'NOT STITCHABLE',
      text: `${methodLabel} (${idLabel}): None of the ${total} events could be stitched. No event in this scenario has a usable ${config.transientId} value reachable from ${config.persistentId}.`,
    };
  }

  // Partial
  const orphanSteps = output.results
    .filter(r => r.isOrphaned)
    .map(r => scenario.events[r.eventIndex].step);

  const idNote = identityCount > 1
    ? ` Events resolve to ${identityCount} distinct identities.`
    : '';

  return {
    color: 'orange',
    label: 'PARTIALLY STITCHABLE',
    text: `${methodLabel} (${idLabel}): ${stitched} of ${total} events stitched (${breakdown}). ${orphaned} orphaned (Step${orphanSteps.length > 1 ? 's' : ''} ${orphanSteps.join(', ')}).${idNote}`,
  };
}
