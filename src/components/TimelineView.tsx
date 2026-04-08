import { useMemo } from 'react';
import { Scenario, StitchConfig, NamespaceId } from '../data/types';
import { StitchOutput } from '../engine/stitcher';
import { getNamespace, getDataset, DATASETS } from '../data/namespaces';

interface Props {
  scenario: Scenario;
  config: StitchConfig;
  stitchOutput: StitchOutput;
}

const LANE_HEIGHT = 72;
const EVENT_RADIUS = 24;
const STEP_WIDTH = 160;
const LANE_LABEL_WIDTH = 140;
const TOP_PADDING = 60;

export function TimelineView({ scenario, config, stitchOutput }: Props) {
  const datasets = useMemo(() => {
    const seen = new Set<string>();
    return scenario.events
      .map(e => e.dataset)
      .filter(d => { if (seen.has(d)) return false; seen.add(d); return true; });
  }, [scenario]);

  const width = LANE_LABEL_WIDTH + STEP_WIDTH * scenario.events.length + 60;
  const height = TOP_PADDING + LANE_HEIGHT * datasets.length + 40;

  return (
    <div className="overflow-auto flex-1 bg-gray-950 p-4">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-white">{scenario.id}. {scenario.title}</h2>
        <p className="text-sm text-gray-400">{scenario.journey}</p>
      </div>

      <svg width={width} height={height} className="font-sans">
        {/* Dataset swimlane labels + background */}
        {datasets.map((dsId, laneIdx) => {
          const ds = getDataset(dsId);
          const y = TOP_PADDING + laneIdx * LANE_HEIGHT;
          return (
            <g key={dsId}>
              <rect
                x={0} y={y}
                width={width} height={LANE_HEIGHT}
                fill={laneIdx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)'}
              />
              <line x1={0} y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.1)" />
              <text
                x={8} y={y + LANE_HEIGHT / 2}
                fill={ds?.color || '#888'}
                fontSize={11}
                fontWeight={600}
                dominantBaseline="middle"
              >
                {ds?.label || dsId}
              </text>
            </g>
          );
        })}

        {/* Step headers */}
        {scenario.events.map((evt, i) => {
          const x = LANE_LABEL_WIDTH + i * STEP_WIDTH + STEP_WIDTH / 2;
          return (
            <g key={`header-${i}`}>
              <text x={x} y={20} fill="#9ca3af" fontSize={10} textAnchor="middle" fontWeight={600}>
                Step {evt.step}
              </text>
              <text x={x} y={35} fill="#6b7280" fontSize={9} textAnchor="middle">
                {evt.device}
              </text>
            </g>
          );
        })}

        {/* Stitch connecting arcs */}
        {renderStitchArcs(scenario, stitchOutput, datasets)}

        {/* Event nodes */}
        {scenario.events.map((evt, i) => {
          const laneIdx = datasets.indexOf(evt.dataset);
          const cx = LANE_LABEL_WIDTH + i * STEP_WIDTH + STEP_WIDTH / 2;
          const cy = TOP_PADDING + laneIdx * LANE_HEIGHT + LANE_HEIGHT / 2;
          const result = stitchOutput.results[i];
          const isOrphaned = result?.isOrphaned;
          const stitchType = result?.stitchType;

          return (
            <g key={`event-${i}`}>
              {/* Outer ring for stitch status */}
              <circle
                cx={cx} cy={cy} r={EVENT_RADIUS + 3}
                fill="none"
                stroke={
                  isOrphaned ? '#ef4444' :
                  stitchType === 'live' ? '#22c55e' :
                  stitchType === 'replay' ? '#3b82f6' :
                  stitchType === 'graph' ? '#a855f7' :
                  'transparent'
                }
                strokeWidth={2}
                strokeDasharray={isOrphaned ? '4 2' : undefined}
                opacity={config.method === 'none' ? 0 : 0.8}
              />

              {/* Event circle */}
              <circle
                cx={cx} cy={cy} r={EVENT_RADIUS}
                fill={getDataset(evt.dataset)?.color || '#666'}
                opacity={isOrphaned && config.method !== 'none' ? 0.3 : 0.9}
                className="transition-opacity duration-300"
              />

              {/* Step number */}
              <text x={cx} y={cy + 1} fill="white" fontSize={11} fontWeight={700} textAnchor="middle" dominantBaseline="middle">
                {evt.step}
              </text>

              {/* Identifier badges */}
              {renderIdentifierBadges(evt.identifiers, cx, cy, isOrphaned && config.method !== 'none')}

              {/* Resolved Person ID label */}
              {config.method !== 'none' && result?.resolvedPersonId && (
                <g>
                  <rect
                    x={cx - 50} y={cy + EVENT_RADIUS + 8}
                    width={100} height={18}
                    rx={9}
                    fill={isOrphaned ? '#374151' : '#065f46'}
                    opacity={0.9}
                  />
                  <text
                    x={cx} y={cy + EVENT_RADIUS + 17}
                    fill={isOrphaned ? '#9ca3af' : '#6ee7b7'}
                    fontSize={8}
                    fontWeight={600}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {truncate(result.resolvedPersonId, 16)}
                  </text>
                </g>
              )}

              {/* Tooltip on hover */}
              <title>{evt.description}{result ? `\n${result.explanation}` : ''}</title>
            </g>
          );
        })}

        {/* Legend */}
        {config.method !== 'none' && (
          <g transform={`translate(${width - 200}, ${height - 30})`}>
            <LegendItem x={0} color="#22c55e" label="Live" />
            <LegendItem x={55} color="#3b82f6" label="Replay" />
            <LegendItem x={115} color="#a855f7" label="Graph" />
            <LegendItem x={170} color="#ef4444" label="Orphan" dashed />
          </g>
        )}
      </svg>
    </div>
  );
}

function LegendItem({ x, color, label, dashed }: { x: number; color: string; label: string; dashed?: boolean }) {
  return (
    <g transform={`translate(${x}, 0)`}>
      <circle cx={6} cy={6} r={5} fill="none" stroke={color} strokeWidth={2} strokeDasharray={dashed ? '3 2' : undefined} />
      <text x={16} y={10} fill="#9ca3af" fontSize={9}>{label}</text>
    </g>
  );
}

function renderStitchArcs(scenario: Scenario, output: StitchOutput, datasets: string[]) {
  const arcs: React.ReactElement[] = [];

  // Group events by resolved person ID
  const groups = new Map<string, number[]>();
  for (const result of output.results) {
    if (result.resolvedPersonId && !result.isOrphaned) {
      if (!groups.has(result.resolvedPersonId)) groups.set(result.resolvedPersonId, []);
      groups.get(result.resolvedPersonId)!.push(result.eventIndex);
    }
  }

  let arcIdx = 0;
  for (const [_personId, indices] of groups) {
    if (indices.length < 2) continue;
    for (let i = 0; i < indices.length - 1; i++) {
      const fromIdx = indices[i];
      const toIdx = indices[i + 1];
      const fromEvt = scenario.events[fromIdx];
      const toEvt = scenario.events[toIdx];

      const fromLane = datasets.indexOf(fromEvt.dataset);
      const toLane = datasets.indexOf(toEvt.dataset);

      const x1 = LANE_LABEL_WIDTH + fromIdx * STEP_WIDTH + STEP_WIDTH / 2;
      const y1 = TOP_PADDING + fromLane * LANE_HEIGHT + LANE_HEIGHT / 2;
      const x2 = LANE_LABEL_WIDTH + toIdx * STEP_WIDTH + STEP_WIDTH / 2;
      const y2 = TOP_PADDING + toLane * LANE_HEIGHT + LANE_HEIGHT / 2;

      const isCrossDataset = fromEvt.dataset !== toEvt.dataset;
      const midY = Math.min(y1, y2) - 20;

      arcs.push(
        <path
          key={`arc-${arcIdx++}`}
          d={`M ${x1} ${y1 - EVENT_RADIUS - 4} Q ${(x1 + x2) / 2} ${midY - 15} ${x2} ${y2 - EVENT_RADIUS - 4}`}
          fill="none"
          stroke={isCrossDataset ? '#a855f7' : '#22c55e'}
          strokeWidth={1.5}
          strokeDasharray={isCrossDataset ? '6 3' : undefined}
          opacity={0.6}
          markerEnd="url(#arrowhead)"
        />
      );
    }
  }

  return (
    <g>
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#22c55e" opacity={0.6} />
        </marker>
      </defs>
      {arcs}
    </g>
  );
}

function renderIdentifierBadges(
  identifiers: Partial<Record<NamespaceId, string>>,
  cx: number,
  cy: number,
  dimmed: boolean
) {
  const entries = Object.entries(identifiers) as [NamespaceId, string][];
  const badgeWidth = 10;
  const startX = cx - (entries.length * badgeWidth) / 2;

  return entries.map(([ns, _val], i) => {
    const nsInfo = getNamespace(ns);
    return (
      <g key={`badge-${ns}-${i}`}>
        <circle
          cx={startX + i * badgeWidth + badgeWidth / 2}
          cy={cy - EVENT_RADIUS - 8}
          r={4}
          fill={nsInfo?.color || '#888'}
          opacity={dimmed ? 0.2 : 0.9}
        />
        <title>{nsInfo?.label || ns}: {_val}</title>
      </g>
    );
  });
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '\u2026' : s;
}
