import { useState, useMemo } from 'react';
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

export default function App() {
  const [scenarioId, setScenarioId] = useState(1);
  const [config, setConfig] = useState<StitchConfig>(DEFAULT_CONFIG);
  const [viewMode, setViewMode] = useState<ViewMode>('split');

  const scenario = useMemo(() => SCENARIOS.find(s => s.id === scenarioId)!, [scenarioId]);
  const stitchOutput = useMemo(() => computeStitch(scenario, config), [scenario, config]);

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* Top bar */}
      <header className="bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold tracking-tight">
            <span className="text-blue-400">ID</span> Stitcher
          </h1>
          <span className="text-xs text-gray-500 hidden sm:inline">Adobe CJA Identity Stitching Explorer</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 bg-gray-800 rounded-lg p-0.5">
            {(['timeline', 'split', 'graph'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
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

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <ControlPanel
          scenarioId={scenarioId}
          config={config}
          onScenarioChange={setScenarioId}
          onConfigChange={setConfig}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            {(viewMode === 'timeline' || viewMode === 'split') && (
              <TimelineView scenario={scenario} config={config} stitchOutput={stitchOutput} />
            )}
            {(viewMode === 'graph' || viewMode === 'split') && (
              <GraphView stitchOutput={stitchOutput} config={config} />
            )}
          </div>
          <EventDetail events={scenario.events} results={stitchOutput.results} />
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
    <div className="hidden lg:flex items-center gap-2 text-xs text-gray-400">
      {items.map(item => (
        <span key={item.label} className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
