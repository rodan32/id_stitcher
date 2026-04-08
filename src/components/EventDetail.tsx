import { TimelineEvent, NamespaceId } from '../data/types';
import { StitchResult } from '../data/types';
import { getNamespace, getDataset } from '../data/namespaces';

interface Props {
  events: TimelineEvent[];
  results: StitchResult[];
}

export function EventDetail({ events, results }: Props) {
  return (
    <div className="bg-gray-900 border-t border-gray-700 overflow-auto max-h-64">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400 border-b border-gray-700">
            <th className="px-3 py-2 text-left font-semibold">Step</th>
            <th className="px-3 py-2 text-left font-semibold">Device</th>
            <th className="px-3 py-2 text-left font-semibold">Dataset</th>
            <th className="px-3 py-2 text-left font-semibold">Identifiers</th>
            <th className="px-3 py-2 text-left font-semibold">Stitch</th>
            <th className="px-3 py-2 text-left font-semibold">Resolved Person ID</th>
            <th className="px-3 py-2 text-left font-semibold">Explanation</th>
          </tr>
        </thead>
        <tbody>
          {events.map((evt, i) => {
            const result = results[i];
            const ds = getDataset(evt.dataset);
            return (
              <tr key={i} className={`border-b border-gray-800 ${result?.isOrphaned ? 'opacity-50' : ''}`}>
                <td className="px-3 py-2 text-white font-mono">{evt.step}</td>
                <td className="px-3 py-2 text-gray-300">{evt.device}</td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: ds?.color }} />
                    <span className="text-gray-300">{ds?.label}</span>
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {(Object.entries(evt.identifiers) as [NamespaceId, string][]).map(([ns, val]) => {
                      const nsInfo = getNamespace(ns);
                      return (
                        <span
                          key={ns}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-white"
                          style={{ backgroundColor: nsInfo?.color + '33', borderLeft: `2px solid ${nsInfo?.color}` }}
                        >
                          <span className="font-semibold" style={{ color: nsInfo?.color }}>{nsInfo?.label}:</span>
                          <span className="text-gray-300">{val}</span>
                        </span>
                      );
                    })}
                  </div>
                </td>
                <td className="px-3 py-2">
                  {result && (
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      result.stitchType === 'live' ? 'bg-green-900 text-green-300' :
                      result.stitchType === 'replay' ? 'bg-blue-900 text-blue-300' :
                      result.stitchType === 'graph' ? 'bg-purple-900 text-purple-300' :
                      'bg-gray-800 text-gray-400'
                    }`}>
                      {result.stitchType === 'none' ? (result.isOrphaned ? 'Orphaned' : 'None') : result.stitchType}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-green-400 font-mono text-xs">
                  {result?.resolvedPersonId || '—'}
                </td>
                <td className="px-3 py-2 text-gray-500 max-w-xs truncate">
                  {result?.explanation}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
