import { Scenario } from '../data/types';

interface Props {
  scenario: Scenario;
}

export function VerdictBox({ scenario }: Props) {
  const isGreen = scenario.verdictColor === 'green';
  const isOrange = scenario.verdictColor === 'orange';

  return (
    <div className={`rounded-lg px-5 py-3 flex items-start gap-3 text-sm ${
      isGreen  ? 'bg-green-900/40 text-green-300 border border-green-700/60' :
      isOrange ? 'bg-amber-900/40 text-amber-300 border border-amber-700/60' :
                 'bg-red-900/40 text-red-300 border border-red-700/60'
    }`}>
      <span className="text-lg leading-none mt-0.5">
        {isGreen ? '\u2705' : isOrange ? '\u26A0\uFE0F' : '\u274C'}
      </span>
      <div>
        <div className="font-bold text-sm tracking-wide">
          {isGreen  ? 'FULLY STITCHABLE' :
           isOrange ? 'PARTIALLY STITCHABLE' :
                      'NOT STITCHABLE'}
        </div>
        <p className="text-xs opacity-80 mt-0.5 leading-relaxed">{scenario.verdictText}</p>
      </div>
    </div>
  );
}
