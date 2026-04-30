import { useEffect, useMemo, useState } from 'react';
import { StitchConfig, StitchMethod, NamespaceId, DatasetId } from '../data/types';
import { NAMESPACES, DATASETS } from '../data/namespaces';
import { SCENARIOS } from '../data/scenarios';
import { ScenarioPerspective, scenariosForPerspective } from '../data/scenarioPerspective';
import { CdpRealityPanel } from './CdpRealityPanel';

interface Props {
  scenarioId: number;
  config: StitchConfig;
  onScenarioChange: (id: number) => void;
  onConfigChange: (config: StitchConfig) => void;
}

export function ControlPanel({ scenarioId, config, onScenarioChange, onConfigChange }: Props) {
  const [perspective, setPerspective] = useState<ScenarioPerspective>('all');
  const filteredScenarios = useMemo(() => scenariosForPerspective(perspective), [perspective]);

  useEffect(() => {
    if (!filteredScenarios.some(s => s.id === scenarioId)) {
      const next = filteredScenarios[0]?.id ?? SCENARIOS[0].id;
      if (next !== scenarioId) onScenarioChange(next);
    }
  }, [filteredScenarios, scenarioId, onScenarioChange]);

  const scenario = SCENARIOS.find(s => s.id === scenarioId)!;

  const update = (patch: Partial<StitchConfig>) => {
    onConfigChange({ ...config, ...patch });
  };

  return (
    <div className="scroll-styled bg-gray-900 border-r border-gray-700 w-64 min-w-56 xl:w-80 xl:min-w-80 overflow-y-auto flex flex-col">
      <CdpRealityPanel />

      {/* Scenario lens + picker */}
      <div className="p-4 border-b border-gray-700">
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Scenario lens</label>
        <select
          value={perspective}
          onChange={(e) => setPerspective(e.target.value as ScenarioPerspective)}
          className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:border-cyan-600 focus:outline-none mb-3"
        >
          <option value="all">All scenarios</option>
          <option value="cjaReporting">CJA reporting paths (Tealium not required)</option>
          <option value="tealiumCdp">Tealium CDP identity edges</option>
        </select>

        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Scenario</label>
        <select
          value={scenarioId}
          onChange={(e) => onScenarioChange(Number(e.target.value))}
          className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
        >
          {filteredScenarios.map(s => (
            <option key={s.id} value={s.id}>
              {s.id}. {s.title}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1 italic">{scenario.subtitle}</p>
      </div>

      {/* Stitch Method */}
      <div className="p-4 border-b border-gray-700">
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Stitch Method</label>
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          {(['none', 'fbs', 'gbs'] as StitchMethod[]).map(method => (
            <button
              key={method}
              onClick={() => update({ method })}
              className={`flex-1 text-xs font-semibold py-2 rounded-md transition-all ${
                config.method === method
                  ? method === 'none' ? 'bg-gray-600 text-white'
                    : method === 'fbs' ? 'bg-blue-600 text-white'
                    : 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {method === 'none' ? 'None' : method === 'fbs' ? 'FBS' : 'GBS'}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {config.method === 'none' && 'No stitching applied'}
          {config.method === 'fbs' && 'Field-Based Stitching (Select tier)'}
          {config.method === 'gbs' && 'Graph-Based Stitching (Prime tier)'}
        </p>
      </div>

      {/* ID Configuration */}
      {config.method !== 'none' && (
        <div className="p-4 border-b border-gray-700 space-y-3">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">ID Configuration</label>

          <div>
            <label className="text-xs text-gray-400">Person ID (output)</label>
            <select
              value={config.personId}
              onChange={(e) => update({ personId: e.target.value as NamespaceId })}
              className="w-full bg-gray-800 text-white text-sm rounded px-2 py-1.5 border border-gray-600 mt-1"
            >
              {NAMESPACES.filter(n => n.level === 'person').map(n => (
                <option key={n.id} value={n.id}>{n.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400">Persistent ID (always present)</label>
            <select
              value={config.persistentId}
              onChange={(e) => update({ persistentId: e.target.value as NamespaceId })}
              className="w-full bg-gray-800 text-white text-sm rounded px-2 py-1.5 border border-gray-600 mt-1"
            >
              {NAMESPACES.map(n => (
                <option key={n.id} value={n.id}>{n.label} ({n.level})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400">
              {config.method === 'fbs' ? 'Transient ID' : 'Target Namespace'}
            </label>
            <select
              value={config.transientId}
              onChange={(e) => update({ transientId: e.target.value as NamespaceId })}
              className="w-full bg-gray-800 text-white text-sm rounded px-2 py-1.5 border border-gray-600 mt-1"
            >
              {NAMESPACES.filter(n => n.level === 'person').map(n => (
                <option key={n.id} value={n.id}>{n.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400">Replay Window</label>
            <div className="flex gap-1 mt-1">
              {([1, 7, 14, 30] as const).map(d => (
                <button
                  key={d}
                  onClick={() => update({ replayWindow: d })}
                  className={`flex-1 text-xs py-1.5 rounded ${
                    config.replayWindow === d
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tealium Cross-Device Toggle (visible for FBS + GBS) */}
      {config.method !== 'none' && (
        <div className="p-4 border-b border-gray-700 space-y-2">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">External Resolution</label>
          <label className="flex items-start gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={config.tealiumCrossDevice}
              onChange={(e) => update({ tealiumCrossDevice: e.target.checked })}
              className="rounded border-gray-600 bg-gray-800 text-cyan-500 mt-0.5"
            />
            <div>
              <span className="font-medium">Tealium Cross-Device</span>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Simulates Tealium AudienceStream stitching visitor profiles server-side and sending resolved links to AEP. When off, each TealiumVisitorID is an isolated device cookie.
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Graph Configuration (GBS only) */}
      {config.method === 'gbs' && (
        <div className="p-4 border-b border-gray-700 space-y-3">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Graph Configuration</label>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Unique Namespaces</label>
            {NAMESPACES.filter(n => n.level === 'person').map(n => (
              <label key={n.id} className="flex items-center gap-2 text-sm text-gray-300 mb-1">
                <input
                  type="checkbox"
                  checked={config.uniqueNamespaces.includes(n.id)}
                  onChange={(e) => {
                    const newUnique = e.target.checked
                      ? [...config.uniqueNamespaces, n.id]
                      : config.uniqueNamespaces.filter(id => id !== n.id);
                    update({ uniqueNamespaces: newUnique });
                  }}
                  className="rounded border-gray-600 bg-gray-800 text-blue-500"
                />
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: n.color }} />
                {n.label}
              </label>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={config.ioaEnabled}
              onChange={(e) => update({ ioaEnabled: e.target.checked })}
              className="rounded border-gray-600 bg-gray-800 text-purple-500"
            />
            IOA Enabled
          </label>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Profile-Enabled Datasets</label>
            {DATASETS.map(d => (
              <label key={d.id} className="flex items-center gap-2 text-sm text-gray-300 mb-1">
                <input
                  type="checkbox"
                  checked={config.profileEnabledDatasets.includes(d.id)}
                  onChange={(e) => {
                    const newPE = e.target.checked
                      ? [...config.profileEnabledDatasets, d.id]
                      : config.profileEnabledDatasets.filter(id => id !== d.id);
                    update({ profileEnabledDatasets: newPE });
                  }}
                  className="rounded border-gray-600 bg-gray-800 text-purple-500"
                />
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                {d.label}
              </label>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
