import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { StitchOutput } from '../engine/stitcher';
import { StitchConfig, GraphNode, GraphEdge } from '../data/types';
import { getNamespace } from '../data/namespaces';

interface Props {
  stitchOutput: StitchOutput;
  config: StitchConfig;
}

interface SimNode extends GraphNode, d3.SimulationNodeDatum {}
interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  sourceNs: string;
  targetNs: string;
  active: boolean;
  fromEvent: number;
}

export function GraphView({ stitchOutput, config }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { nodes, links } = useMemo(() => {
    const nodeMap = new Map<string, SimNode>();
    for (const n of stitchOutput.graphNodes) {
      nodeMap.set(n.id, { ...n, x: undefined, y: undefined });
    }

    // Deduplicate edges
    const edgeSet = new Set<string>();
    const links: SimLink[] = [];
    for (const e of stitchOutput.graphEdges) {
      const sourceId = `${e.sourceNs}:${e.source}`;
      const targetId = `${e.targetNs}:${e.target}`;
      const key = [sourceId, targetId].sort().join('|');
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);

      if (nodeMap.has(sourceId) && nodeMap.has(targetId)) {
        links.push({
          source: sourceId,
          target: targetId,
          sourceNs: e.sourceNs,
          targetNs: e.targetNs,
          active: e.active,
          fromEvent: e.fromEvent,
        });
      }
    }

    return { nodes: Array.from(nodeMap.values()), links };
  }, [stitchOutput]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    svg.attr('width', width).attr('height', height);

    const g = svg.append('g');

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    // Simulation
    const simulation = d3.forceSimulation<SimNode>(nodes)
      .force('link', d3.forceLink<SimNode, SimLink>(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05));

    // Edges
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => d.active ? '#4b5563' : '#ef4444')
      .attr('stroke-width', d => d.active ? 1.5 : 1)
      .attr('stroke-dasharray', d => d.active ? null : '6 3')
      .attr('opacity', d => d.active ? 0.7 : 0.3);

    // IOA removed edge label
    const removedLabels = g.append('g')
      .selectAll('text')
      .data(links.filter(l => !l.active))
      .join('text')
      .text('IOA removed')
      .attr('fill', '#ef4444')
      .attr('font-size', 8)
      .attr('text-anchor', 'middle')
      .attr('opacity', 0.6);

    // Nodes
    const nodeGroup = g.append('g')
      .selectAll<SVGGElement, SimNode>('g')
      .data(nodes)
      .join('g')
      .call(d3.drag<SVGGElement, SimNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null; d.fy = null;
        })
      );

    // Node shapes: circles for device, rounded rects for person
    nodeGroup.each(function (d) {
      const el = d3.select(this);
      const nsInfo = getNamespace(d.namespace);
      const color = nsInfo?.color || '#888';

      if (d.level === 'device') {
        el.append('circle')
          .attr('r', 20)
          .attr('fill', color)
          .attr('opacity', 0.85)
          .attr('stroke', '#1f2937')
          .attr('stroke-width', 2);
      } else {
        el.append('rect')
          .attr('x', -28).attr('y', -16)
          .attr('width', 56).attr('height', 32)
          .attr('rx', 8)
          .attr('fill', color)
          .attr('opacity', 0.85)
          .attr('stroke', '#1f2937')
          .attr('stroke-width', 2);
      }
    });

    // Node labels (value)
    nodeGroup.append('text')
      .text(d => truncateLabel(d.value))
      .attr('fill', 'white')
      .attr('font-size', 9)
      .attr('font-weight', 600)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle');

    // Namespace label below
    nodeGroup.append('text')
      .text(d => {
        const ns = getNamespace(d.namespace);
        return ns?.label || d.namespace;
      })
      .attr('fill', '#9ca3af')
      .attr('font-size', 7)
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.level === 'device' ? 30 : 26);

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as SimNode).x!)
        .attr('y1', d => (d.source as SimNode).y!)
        .attr('x2', d => (d.target as SimNode).x!)
        .attr('y2', d => (d.target as SimNode).y!);

      removedLabels
        .attr('x', d => ((d.source as SimNode).x! + (d.target as SimNode).x!) / 2)
        .attr('y', d => ((d.source as SimNode).y! + (d.target as SimNode).y!) / 2 - 6);

      nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => { simulation.stop(); };
  }, [nodes, links]);

  return (
    <div ref={containerRef} className="flex-1 bg-gray-950 relative">
      <svg ref={svgRef} className="w-full h-full" />
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-gray-900/90 rounded-lg p-3 text-xs space-y-1 border border-gray-700">
        <div className="font-semibold text-gray-300 mb-2">Identity Graph</div>
        <div className="flex items-center gap-2 text-gray-400">
          <svg width={16} height={16}><circle cx={8} cy={8} r={6} fill="#3b82f6" /></svg>
          Device-level (circle)
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <svg width={16} height={16}><rect x={1} y={3} width={14} height={10} rx={3} fill="#10b981" /></svg>
          Person-level (rounded)
        </div>
        {config.method === 'gbs' && config.ioaEnabled && (
          <div className="flex items-center gap-2 text-red-400">
            <svg width={16} height={4}><line x1={0} y1={2} x2={16} y2={2} stroke="#ef4444" strokeDasharray="4 2" /></svg>
            IOA removed link
          </div>
        )}
      </div>
    </div>
  );
}

function truncateLabel(s: string): string {
  if (s.length > 10) return s.slice(0, 9) + '\u2026';
  return s;
}
