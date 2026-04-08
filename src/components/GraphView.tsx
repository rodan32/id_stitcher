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
      .force('link', d3.forceLink<SimNode, SimLink>(links).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05));

    // Edges
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => d.active ? '#6b7280' : '#ef4444')
      .attr('stroke-width', d => d.active ? 2 : 1.5)
      .attr('stroke-dasharray', d => d.active ? null : '8 4')
      .attr('opacity', d => d.active ? 0.6 : 0.35);

    // IOA removed edge labels
    const removedLabels = g.append('g')
      .selectAll('text')
      .data(links.filter(l => !l.active))
      .join('text')
      .text('IOA removed')
      .attr('fill', '#ef4444')
      .attr('font-size', 10)
      .attr('font-weight', 600)
      .attr('text-anchor', 'middle')
      .attr('opacity', 0.7);

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

    // Node shapes
    nodeGroup.each(function (d) {
      const el = d3.select(this);
      const nsInfo = getNamespace(d.namespace);
      const color = nsInfo?.color || '#888';

      if (d.level === 'device') {
        el.append('circle')
          .attr('r', 26)
          .attr('fill', color)
          .attr('opacity', 0.85)
          .attr('stroke', '#1f2937')
          .attr('stroke-width', 2);
      } else {
        el.append('rect')
          .attr('x', -36).attr('y', -20)
          .attr('width', 72).attr('height', 40)
          .attr('rx', 10)
          .attr('fill', color)
          .attr('opacity', 0.85)
          .attr('stroke', '#1f2937')
          .attr('stroke-width', 2);
      }
    });

    // Node value label
    nodeGroup.append('text')
      .text(d => truncateLabel(d.value, 12))
      .attr('fill', 'white')
      .attr('font-size', 11)
      .attr('font-weight', 700)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle');

    // Namespace label below node
    nodeGroup.append('text')
      .text(d => {
        const ns = getNamespace(d.namespace);
        return ns?.label || d.namespace;
      })
      .attr('fill', '#d1d5db')
      .attr('font-size', 10)
      .attr('font-weight', 500)
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.level === 'device' ? 38 : 32);

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as SimNode).x!)
        .attr('y1', d => (d.source as SimNode).y!)
        .attr('x2', d => (d.target as SimNode).x!)
        .attr('y2', d => (d.target as SimNode).y!);

      removedLabels
        .attr('x', d => ((d.source as SimNode).x! + (d.target as SimNode).x!) / 2)
        .attr('y', d => ((d.source as SimNode).y! + (d.target as SimNode).y!) / 2 - 8);

      nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => { simulation.stop(); };
  }, [nodes, links]);

  return (
    <div ref={containerRef} className="flex-1 bg-gray-950 relative">
      <svg ref={svgRef} className="w-full h-full" />
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-gray-900/90 rounded-lg p-3 text-sm space-y-1.5 border border-gray-700">
        <div className="font-semibold text-gray-200 mb-2">Identity Graph</div>
        <div className="flex items-center gap-2 text-gray-300">
          <svg width={18} height={18}><circle cx={9} cy={9} r={7} fill="#3b82f6" /></svg>
          Device-level (circle)
        </div>
        <div className="flex items-center gap-2 text-gray-300">
          <svg width={18} height={18}><rect x={1} y={3} width={16} height={12} rx={4} fill="#10b981" /></svg>
          Person-level (rounded rect)
        </div>
        {config.method === 'gbs' && config.ioaEnabled && (
          <div className="flex items-center gap-2 text-red-400">
            <svg width={18} height={6}><line x1={0} y1={3} x2={18} y2={3} stroke="#ef4444" strokeWidth={2} strokeDasharray="5 3" /></svg>
            IOA removed link
          </div>
        )}
        <div className="text-xs text-gray-500 pt-1">Drag nodes to rearrange. Scroll to zoom.</div>
      </div>
    </div>
  );
}

function truncateLabel(s: string, max: number): string {
  if (s.length > max) return s.slice(0, max - 1) + '\u2026';
  return s;
}
