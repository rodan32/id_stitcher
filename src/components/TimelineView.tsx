import { useMemo } from 'react';
import { Scenario, StitchConfig, NamespaceId } from '../data/types';
import { StitchOutput } from '../engine/stitcher';
import { getNamespace, getDataset } from '../data/namespaces';
import { getDeviceIcon } from './DeviceIcons';
import { VerdictBox } from './VerdictBox';

interface Props {
  scenario: Scenario;
  config: StitchConfig;
  stitchOutput: StitchOutput;
}

const LANE_HEIGHT = 100;
const EVENT_RADIUS = 28;
const STEP_WIDTH_BASE = 180;
const LANE_LABEL_WIDTH = 160;
const TOP_PADDING = 80;
const CLUSTER_PAD_X = 14;
const CLUSTER_PAD_Y = 20;

// Distinct cluster colors — one per resolved Person ID
const CLUSTER_COLORS = [
  { fill: 'rgba(34,197,94,0.10)',  stroke: '#22c55e', text: '#86efac' },
  { fill: 'rgba(59,130,246,0.10)', stroke: '#3b82f6', text: '#93c5fd' },
  { fill: 'rgba(168,85,247,0.10)', stroke: '#a855f7', text: '#c4b5fd' },
  { fill: 'rgba(245,158,11,0.10)', stroke: '#f59e0b', text: '#fcd34d' },
  { fill: 'rgba(236,72,153,0.10)', stroke: '#ec4899', text: '#f9a8d4' },
];
const ORPHAN_STYLE = { fill: 'rgba(239,68,68,0.06)', stroke: '#ef4444', text: '#fca5a5' };

export function TimelineView({ scenario, config, stitchOutput }: Props) {
  const datasets = useMemo(() => {
    const seen = new Set<string>();
    return scenario.events
      .map(e => e.dataset)
      .filter(d => { if (seen.has(d)) return false; seen.add(d); return true; });
  }, [scenario]);

  // Group events into identity clusters
  const clusters = useMemo(() => {
    if (config.method === 'none') return [];

    const grouped = new Map<string, { indices: number[]; isOrphaned: boolean }>();
    for (const result of stitchOutput.results) {
      const key = result.resolvedPersonId || `__orphan_${result.eventIndex}`;
      if (!grouped.has(key)) {
        grouped.set(key, { indices: [], isOrphaned: result.isOrphaned });
      }
      grouped.get(key)!.indices.push(result.eventIndex);
      if (result.isOrphaned) grouped.get(key)!.isOrphaned = true;
    }

    let colorIdx = 0;
    return Array.from(grouped.entries()).map(([personId, { indices, isOrphaned }]) => {
      const style = isOrphaned ? ORPHAN_STYLE : CLUSTER_COLORS[colorIdx++ % CLUSTER_COLORS.length];
      return { personId, indices, isOrphaned, style };
    });
  }, [config.method, stitchOutput]);

  // Tighter columns when many steps so wide journeys need less horizontal scroll
  const stepWidth =
    scenario.events.length > 12
      ? 148
      : scenario.events.length > 9
        ? 158
        : scenario.events.length > 7
          ? 168
          : STEP_WIDTH_BASE;

  const width = LANE_LABEL_WIDTH + stepWidth * scenario.events.length + 80;
  const height = TOP_PADDING + LANE_HEIGHT * datasets.length + 60;

  return (
    <div className="scroll-styled overflow-auto flex-1 min-h-0 min-w-0 bg-transparent p-3 xl:p-4">
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
              <line x1={0} y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.08)" />
              <text
                x={10} y={y + LANE_HEIGHT / 2}
                fill={ds?.color || '#888'}
                fontSize={13}
                fontWeight={600}
                dominantBaseline="middle"
              >
                {ds?.label || dsId}
              </text>
            </g>
          );
        })}

        {/* Step column headers */}
        {scenario.events.map((evt, i) => {
          const x = LANE_LABEL_WIDTH + i * stepWidth + stepWidth / 2;
          return (
            <g key={`header-${i}`}>
              <text x={x} y={22} fill="#d1d5db" fontSize={13} textAnchor="middle" fontWeight={700}>
                Step {evt.step}
              </text>
              <text x={x} y={40} fill="#9ca3af" fontSize={11} textAnchor="middle">
                {evt.device}
              </text>
              {/* Light vertical guide line */}
              <line
                x1={x} y1={TOP_PADDING}
                x2={x} y2={TOP_PADDING + LANE_HEIGHT * datasets.length}
                stroke="rgba(255,255,255,0.03)"
              />
            </g>
          );
        })}

        {/* === Identity Cluster Backgrounds === */}
        {clusters.map((cluster, ci) => {
          // Compute bounding box across all events in this cluster
          const positions = cluster.indices.map(idx => {
            const evt = scenario.events[idx];
            const laneIdx = datasets.indexOf(evt.dataset);
            return {
              cx: LANE_LABEL_WIDTH + idx * stepWidth + stepWidth / 2,
              cy: TOP_PADDING + laneIdx * LANE_HEIGHT + LANE_HEIGHT / 2,
            };
          });

          const minX = Math.min(...positions.map(p => p.cx)) - EVENT_RADIUS - CLUSTER_PAD_X;
          const maxX = Math.max(...positions.map(p => p.cx)) + EVENT_RADIUS + CLUSTER_PAD_X;
          const minY = Math.min(...positions.map(p => p.cy)) - EVENT_RADIUS - CLUSTER_PAD_Y;
          const maxY = Math.max(...positions.map(p => p.cy)) + EVENT_RADIUS + CLUSTER_PAD_Y + 20; // extra for resolved label

          return (
            <g key={`cluster-${ci}`}>
              <rect
                x={minX} y={minY}
                width={maxX - minX} height={maxY - minY}
                rx={12}
                fill={cluster.style.fill}
                stroke={cluster.style.stroke}
                strokeWidth={1.5}
                strokeDasharray={cluster.isOrphaned ? '6 4' : undefined}
                opacity={0.9}
              />
              {/* Cluster Person ID label at top */}
              <text
                x={(minX + maxX) / 2}
                y={minY - 6}
                fill={cluster.style.text}
                fontSize={11}
                fontWeight={700}
                textAnchor="middle"
                opacity={0.9}
              >
                {cluster.isOrphaned
                  ? (cluster.indices.length === 1 ? 'Orphaned' : 'Orphaned Group')
                  : `Person: ${truncate(cluster.personId, 28)}`
                }
              </text>
            </g>
          );
        })}

        {/* Stitch connecting arcs */}
        {renderStitchArcs(scenario, stitchOutput, datasets, clusters, stepWidth)}

        {/* Event nodes */}
        {scenario.events.map((evt, i) => {
          const laneIdx = datasets.indexOf(evt.dataset);
          const cx = LANE_LABEL_WIDTH + i * stepWidth + stepWidth / 2;
          const cy = TOP_PADDING + laneIdx * LANE_HEIGHT + LANE_HEIGHT / 2;
          const result = stitchOutput.results[i];
          const isOrphaned = result?.isOrphaned;
          const stitchType = result?.stitchType;

          return (
            <g key={`event-${i}`}>
              {/* Outer ring for stitch type */}
              <circle
                cx={cx} cy={cy} r={EVENT_RADIUS + 4}
                fill="none"
                stroke={
                  isOrphaned ? '#ef4444' :
                  stitchType === 'live' ? '#22c55e' :
                  stitchType === 'replay' ? '#3b82f6' :
                  stitchType === 'graph' ? '#a855f7' :
                  'transparent'
                }
                strokeWidth={2.5}
                strokeDasharray={isOrphaned ? '5 3' : undefined}
                opacity={config.method === 'none' ? 0 : 0.85}
              />

              {/* Event circle */}
              <circle
                cx={cx} cy={cy} r={EVENT_RADIUS}
                fill={getDataset(evt.dataset)?.color || '#666'}
                opacity={isOrphaned && config.method !== 'none' ? 0.35 : 0.9}
                className="transition-opacity duration-300"
              />

              {/* Device icon inside circle */}
              {(() => {
                const DevIcon = getDeviceIcon(evt.device);
                return <DevIcon x={cx} y={cy} size={26} opacity={isOrphaned && config.method !== 'none' ? 0.4 : 1} />;
              })()}

              {/* Step number badge (top-left) */}
              <circle
                cx={cx - EVENT_RADIUS + 4} cy={cy - EVENT_RADIUS + 4} r={9}
                fill="#111827" stroke={getDataset(evt.dataset)?.color || '#666'} strokeWidth={1.5}
              />
              <text
                x={cx - EVENT_RADIUS + 4} y={cy - EVENT_RADIUS + 5}
                fill="white" fontSize={10} fontWeight={700}
                textAnchor="middle" dominantBaseline="middle"
              >
                {evt.step}
              </text>

              {/* Identifier badges above the node */}
              {renderIdentifierBadges(evt.identifiers, cx, cy, isOrphaned && config.method !== 'none')}

              {/* Stitch type label below node */}
              {config.method !== 'none' && result && (
                <text
                  x={cx} y={cy + EVENT_RADIUS + 16}
                  fill={
                    result.isOrphaned ? '#f87171' :
                    result.stitchType === 'live' ? '#86efac' :
                    result.stitchType === 'replay' ? '#93c5fd' :
                    result.stitchType === 'graph' ? '#c4b5fd' :
                    '#6b7280'
                  }
                  fontSize={10}
                  fontWeight={600}
                  textAnchor="middle"
                >
                  {result.isOrphaned ? 'orphaned' : result.stitchType}
                </text>
              )}

              {/* Tooltip on hover */}
              <title>{evt.description}{result ? `\n\nStitch: ${result.stitchType}\nPerson ID: ${result.resolvedPersonId || 'none'}\n${result.explanation}` : ''}</title>
            </g>
          );
        })}

        {/* Legend */}
        {config.method !== 'none' && (
          <g transform={`translate(${LANE_LABEL_WIDTH}, ${height - 22})`}>
            <LegendItem x={0} color="#22c55e" label="Live Stitch" />
            <LegendItem x={90} color="#3b82f6" label="Replay Stitch" />
            <LegendItem x={196} color="#a855f7" label="Graph Stitch" />
            <LegendItem x={302} color="#ef4444" label="Orphaned" dashed />
            <rect x={400} y={-2} width={14} height={14} rx={4} fill="rgba(34,197,94,0.15)" stroke="#22c55e" strokeWidth={1} />
            <text x={420} y={10} fill="#9ca3af" fontSize={11}>= Identity Cluster</text>
          </g>
        )}
      </svg>

      {/* Verdict below diagram */}
      <div className="mt-4 max-w-2xl">
        <VerdictBox scenario={scenario} config={config} stitchOutput={stitchOutput} />
      </div>
    </div>
  );
}

function LegendItem({ x, color, label, dashed }: { x: number; color: string; label: string; dashed?: boolean }) {
  return (
    <g transform={`translate(${x}, 0)`}>
      <circle cx={6} cy={6} r={6} fill="none" stroke={color} strokeWidth={2.5} strokeDasharray={dashed ? '4 2' : undefined} />
      <text x={18} y={10} fill="#d1d5db" fontSize={11}>{label}</text>
    </g>
  );
}

interface ClusterInfo {
  personId: string;
  indices: number[];
  isOrphaned: boolean;
  style: { fill: string; stroke: string; text: string };
}

function renderStitchArcs(
  scenario: Scenario,
  output: StitchOutput,
  datasets: string[],
  clusters: ClusterInfo[],
  stepWidth: number,
) {
  const arcs: React.ReactElement[] = [];

  let arcIdx = 0;
  for (const cluster of clusters) {
    if (cluster.isOrphaned || cluster.indices.length < 2) continue;

    const color = cluster.style.stroke;

    for (let i = 0; i < cluster.indices.length - 1; i++) {
      const fromIdx = cluster.indices[i];
      const toIdx = cluster.indices[i + 1];
      const fromEvt = scenario.events[fromIdx];
      const toEvt = scenario.events[toIdx];

      const fromLane = datasets.indexOf(fromEvt.dataset);
      const toLane = datasets.indexOf(toEvt.dataset);

      const x1 = LANE_LABEL_WIDTH + fromIdx * stepWidth + stepWidth / 2;
      const y1 = TOP_PADDING + fromLane * LANE_HEIGHT + LANE_HEIGHT / 2;
      const x2 = LANE_LABEL_WIDTH + toIdx * stepWidth + stepWidth / 2;
      const y2 = TOP_PADDING + toLane * LANE_HEIGHT + LANE_HEIGHT / 2;

      const isCrossDataset = fromEvt.dataset !== toEvt.dataset;
      const midY = Math.min(y1, y2) - 30;

      arcs.push(
        <path
          key={`arc-${arcIdx}`}
          d={`M ${x1} ${y1 - EVENT_RADIUS - 5} Q ${(x1 + x2) / 2} ${midY - 18} ${x2} ${y2 - EVENT_RADIUS - 5}`}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeDasharray={isCrossDataset ? '8 4' : undefined}
          opacity={0.5}
          markerEnd={`url(#arrow-${arcIdx})`}
        />
      );
      arcs.push(
        <defs key={`arrow-def-${arcIdx}`}>
          <marker id={`arrow-${arcIdx}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={color} opacity={0.5} />
          </marker>
        </defs>
      );
      arcIdx++;
    }
  }

  return <g>{arcs}</g>;
}

function renderIdentifierBadges(
  identifiers: Partial<Record<NamespaceId, string>>,
  cx: number,
  cy: number,
  dimmed: boolean
) {
  const entries = Object.entries(identifiers) as [NamespaceId, string][];
  const badgeWidth = 14;
  const startX = cx - (entries.length * badgeWidth) / 2;

  return entries.map(([ns, val], i) => {
    const nsInfo = getNamespace(ns);
    const bx = startX + i * badgeWidth + badgeWidth / 2;
    const by = cy - EVENT_RADIUS - 12;
    return (
      <g key={`badge-${ns}-${i}`}>
        <circle
          cx={bx} cy={by} r={5}
          fill={nsInfo?.color || '#888'}
          opacity={dimmed ? 0.2 : 0.9}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth={0.5}
        />
        <title>{nsInfo?.label || ns}: {val}</title>
      </g>
    );
  });
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '\u2026' : s;
}
