import { useState, useMemo, useEffect } from 'react';
import { StitchConfig } from './data/types';
import { SCENARIOS } from './data/scenarios';
import { computeStitch } from './engine/stitcher';
import { ControlPanel } from './components/ControlPanel';
import { TimelineView } from './components/TimelineView';
import { GraphView } from './components/GraphView';
import { EventDetail } from './components/EventDetail';

type ViewMode = 'timeline' | 'graph' | 'split';

const DEFAULT_CONFIG: StitchConfig = {
  method: 'fbs',
  personId: 'Email',
  persistentId: 'ECID',
  transientId: 'Email',
  uniqueNamespaces: ['Email', 'WGU_ID', 'MarketoLeadID', 'SFDCContactID'],
  ioaEnabled: true,
  replayWindow: 7,
  profileEnabledDatasets: ['WebSDK', 'Tealium', 'Marketo'],
  tealiumCrossDevice: false,
};

function useIsCompact() {
  const [compact, setCompact] = useState(window.innerWidth < 1600);
  useEffect(() => {
    const onResize = () => setCompact(window.innerWidth < 1600);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return compact;
}

export default function App() {
  const [scenarioId, setScenarioId] = useState(1);
  const [config, setConfig] = useState<StitchConfig>(DEFAULT_CONFIG);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const isCompact = useIsCompact();

  // On compact screens, split view stacks vertically; show a hint
  const effectiveView = viewMode;

  const scenario = useMemo(() => SCENARIOS.find(s => s.id === scenarioId)!, [scenarioId]);
  const stitchOutput = useMemo(() => computeStitch(scenario, config), [scenario, config]);

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* Top bar */}
      <header className="bg-gray-900 border-b border-gray-700 px-3 xl:px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 xl:gap-3 min-w-0">
          <h1 className="text-sm xl:text-base font-bold tracking-tight whitespace-nowrap">
            <span className="text-blue-400">ID</span> Stitcher
          </h1>
          <span className="text-xs text-gray-500 hidden md:inline truncate">Adobe CJA Identity Stitching Explorer</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex gap-0.5 bg-gray-800 rounded-lg p-0.5">
            {(['timeline', 'split', 'graph'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2 xl:px-3 py-1 text-xs rounded-md font-medium transition-all ${
                  viewMode === mode
                    ? 'bg-gray-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {mode === 'timeline' ? 'Timeline' : mode === 'graph' ? 'Graph' : 'Split'}
              </button>
            ))}
          </div>
          <NamespaceLegend />
        </div>
      </header>

      {/* Time-of-ingestion: always visible (Tealium CDP + general streaming semantics) */}
      <div
        className="shrink-0 border-b border-amber-900/45 bg-amber-950/35 px-3 xl:px-4 py-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-snug text-amber-100/95"
        role="status"
      >
        <span className="font-bold uppercase tracking-wide text-amber-300/95 shrink-0">Time-of-ingestion</span>
        <span className="text-amber-100/85">
          Rows in AEP reflect identifiers <span className="text-white font-semibold">at receipt / send</span>, not your “current best” profile days later.
          Tealium connector events in particular stay exactly as forwarded unless you replay, join warehouse identity, or use graph-tier recovery.
        </span>
        <span className="text-amber-200/70 hidden lg:inline">See Events → <span className="font-semibold text-amber-200">Ingest semantics</span> per step.</span>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <ControlPanel
          scenarioId={scenarioId}
          config={config}
          onScenarioChange={setScenarioId}
          onConfigChange={setConfig}
        />

        <div
          className={`flex-1 flex flex-col min-w-0 bg-gray-950 ${
            effectiveView === 'split' && isCompact ? 'overflow-y-auto scroll-styled' : 'overflow-hidden'
          }`}
        >
          {/* Upper: journey + graph — slightly raised surface vs. detail table */}
          <div
            className={`rounded-sm border-b border-gray-700/80 bg-gradient-to-b from-slate-900/35 to-gray-950/80 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04)] ${
              effectiveView === 'split' && isCompact
                ? 'shrink-0 flex flex-col min-h-[1040px]'
                : effectiveView === 'split'
                  ? 'flex-1 min-h-0 overflow-hidden flex'
                  : 'flex-1 min-h-0 overflow-hidden flex'
            }`}
          >
            {(effectiveView === 'timeline' || effectiveView === 'split') && (
              <TimelineView scenario={scenario} config={config} stitchOutput={stitchOutput} />
            )}
            {(effectiveView === 'graph' || effectiveView === 'split') && (
              <GraphView
                stitchOutput={stitchOutput}
                config={config}
                edgeDivider={effectiveView === 'split'}
              />
            )}
          </div>
          {/* Lower: event detail table — distinct band */}
          <div className="shrink-0 flex flex-col min-h-0 border-t border-gray-600/35 bg-gray-950/95 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.03)]">
            <EventDetail events={scenario.events} results={stitchOutput.results} />
          </div>
        </div>
      </div>
    </div>
  );
}

function NamespaceLegend() {
  const items: { label: string; color: string }[] = [
    { label: 'ECID', color: '#3b82f6' },
    { label: 'Email', color: '#10b981' },
    { label: 'Phone', color: '#f59e0b' },
    { label: 'WGU ID', color: '#8b5cf6' },
    { label: 'Tealium', color: '#06b6d4' },
    { label: 'Marketo', color: '#ec4899' },
    { label: 'SFDC', color: '#f97316' },
  ];

  return (
    <div className="hidden xl:flex items-center gap-2 text-xs text-gray-400">
      {items.map(item => (
        <span key={item.label} className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
