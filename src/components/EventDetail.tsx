import { TimelineEvent, NamespaceId } from '../data/types';
import { StitchResult } from '../data/types';
import { getNamespace, getDataset } from '../data/namespaces';
import { ingestSemanticsForEvent } from '../lib/ingestSemantics';

interface Props {
  events: TimelineEvent[];
  results: StitchResult[];
}

export function EventDetail({ events, results }: Props) {
  return (
    <div className="scroll-styled bg-gray-900/60 overflow-auto max-h-[min(42vh,15rem)] sm:max-h-[min(46vh,18rem)] xl:max-h-[min(52vh,26rem)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 border-b border-gray-700 sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm shadow-[0_1px_0_0_rgb(55_65_81/0.6)]">
            <th className="px-3 py-2 text-left font-semibold">Step</th>
            <th className="px-3 py-2 text-left font-semibold">Device</th>
            <th className="px-3 py-2 text-left font-semibold min-w-[9.5rem]">
              <span className="block">Ingest semantics</span>
              <span className="block text-[10px] font-normal text-gray-500 normal-case">time-of-ingestion</span>
            </th>
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
            const ingest = ingestSemanticsForEvent(evt);
            const tealiumRow = ingest.variant === 'tealium';
            return (
              <tr
                key={i}
                className={`border-b border-gray-800 ${result?.isOrphaned ? 'opacity-50' : ''} ${
                  tealiumRow ? 'bg-amber-950/15 shadow-[inset_3px_0_0_0_rgb(251_191_36/0.65)]' : ''
                }`}
              >
                <td className="px-3 py-2 text-white font-mono">{evt.step}</td>
                <td className="px-3 py-2 text-gray-300">{evt.device}</td>
                <td className="px-3 py-2 align-top max-w-[14rem]">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                      tealiumRow
                        ? 'bg-amber-900/70 text-amber-100 border border-amber-600/50'
                        : ingest.variant === 'profile'
                          ? 'bg-violet-950/60 text-violet-200 border border-violet-700/40'
                          : ingest.variant === 'batch'
                            ? 'bg-slate-800 text-slate-200 border border-slate-600/50'
                            : 'bg-gray-800 text-gray-300 border border-gray-600/40'
                    }`}
                  >
                    {ingest.short}
                  </span>
                  <p className="text-[10px] text-gray-500 mt-1 leading-snug" title={ingest.detail}>
                    {tealiumRow
                      ? 'Row not rewritten when profile learns more later.'
                      : ingest.variant === 'profile'
                        ? 'Profile row semantics in CJA.'
                        : 'Stitch replay may re-attribute within window.'}
                  </p>
                </td>
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
