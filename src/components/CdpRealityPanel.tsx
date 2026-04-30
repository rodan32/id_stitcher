import { useState } from 'react';

/**
 * Visual + narrative summary of Tealium CDP limitations for CJA identity
 * (ingest-time snapshot, coverage blind spots, AudienceDB / stitched_id join cost).
 */
export function CdpRealityPanel() {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-b border-gray-700 bg-gray-900/75">
      {/* Pinned: always visible in sidebar (collapse does not hide this) */}
      <div
        className="px-3 py-2.5 border-b border-amber-900/40 bg-amber-950/30"
        role="region"
        aria-label="Time-of-ingestion summary"
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300/95 mb-1">Time-of-ingestion</p>
        <p className="text-[11px] text-amber-50/90 leading-relaxed">
          Each AEP row keeps the identifiers that were on the event <span className="text-white font-semibold">when it was ingested</span>
          (for Tealium: when AudienceStream forwarded that hit)—not your profile’s “best known” identity days later unless you replay, join in the warehouse, or use graph-tier recovery.
        </p>
        <p className="text-[10px] text-amber-200/65 mt-1.5">
          Events table → <span className="font-semibold text-amber-100/90">Ingest semantics</span> column per step.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-gray-800/60 transition-colors"
      >
        <span className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xs font-semibold text-cyan-400/95 uppercase tracking-wider">
            Diagram &amp; Tealium CDP notes
          </span>
          <span className="text-[10px] text-gray-500 font-normal normal-case">
            Coverage, stitched_id join cost, activation vs analytics
          </span>
        </span>
        <span className="text-gray-500 text-xs shrink-0">{open ? '▼' : '▶'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-800/80 pt-3">
          <IngestSnapshotDiagram />

          <div className="grid gap-2">
            <ConcernCard
              severity="amber"
              title="Time-of-ingestion: identity frozen on each row"
              body="Each Tealium→AEP row carries whatever AudienceStream resolved when that event was sent. Later profile updates do not rewrite past rows—late joins stay orphaned unless FBS replay (tier window), GBS, or custom backfill."
            />
            <ConcernCard
              severity="slate"
              title="Coverage blind spot"
              body="Tealium cannot be the identity provider for sources it never sees. Many CJA reporting use cases (Marketo enrichment, Genesys, chat, authenticated progression) do not require Tealium in the path."
            />
            <ConcernCard
              severity="violet"
              title="stitched_id is not a drop-in"
              body="Joining AudienceDB / visitor_replaces to derive persistent + transient IDs for Adobe FBS is heavy processing—you cannot simply map stitched_id into identityMap and expect full stitch parity."
            />
          </div>

          <div className="grid grid-cols-1 gap-2 text-[11px] leading-snug">
            <div className="rounded-lg border border-blue-800/50 bg-blue-950/25 px-3 py-2.5">
              <div className="font-bold text-blue-300 mb-1">CJA / analytics spine</div>
              <p className="text-gray-400">
                Student 360–style reporting: Web SDK + CRM + Marketo + call center + app events. Stakeholder view: these paths need documentation and correct stitch design, not Tealium as universal ID middleware.
              </p>
            </div>
            <div className="rounded-lg border border-cyan-800/50 bg-cyan-950/20 px-3 py-2.5">
              <div className="font-bold text-cyan-300 mb-1">Tealium / activation lens</div>
              <p className="text-gray-400">
                Audience membership, activation vs holdout, suppression vs spend, long-horizon activation effectiveness—often solvable with audience joins + activation events + as much identity as the warehouse allows.
              </p>
            </div>
          </div>

          <p className="text-[10px] text-gray-600 leading-relaxed italic">
            Pattern: Adobe for stitched analytics; Tealium for real-time audience, orchestration, and outbound activation—with explicit boundaries between them.
          </p>
        </div>
      )}
    </div>
  );
}

function IngestSnapshotDiagram() {
  return (
    <div className="rounded-lg bg-gray-950/90 border border-gray-700/80 p-3 overflow-x-auto">
      <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Time-of-ingestion — Tealium vs later profile (conceptual)</p>
      <svg viewBox="0 0 420 88" className="w-full min-w-[280px] h-[72px]" aria-label="Tealium resolves identity over time but AEP rows stay fixed at ingest unless replay or downstream join">
        <defs>
          <marker id="cdp-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
          </marker>
        </defs>
        {/* Tealium timeline */}
        <text x="8" y="14" fill="#22d3ee" fontSize="11" fontWeight="700">Tealium profile</text>
        <rect x="8" y="22" width="120" height="22" rx="4" fill="rgba(34,211,238,0.12)" stroke="#0891b2" strokeWidth="1" />
        <text x="14" y="37" fill="#a5f3fc" fontSize="9">AM: TVID only</text>
        <rect x="132" y="22" width="120" height="22" rx="4" fill="rgba(34,211,238,0.22)" stroke="#22d3ee" strokeWidth="1" />
        <text x="138" y="37" fill="#ecfeff" fontSize="9">PM: +email resolved</text>
        <rect x="256" y="22" width="156" height="22" rx="4" fill="rgba(34,211,238,0.08)" stroke="#0e7490" strokeWidth="1" strokeDasharray="4 2" />
        <text x="262" y="37" fill="#67e8f9" fontSize="9">Master profile keeps learning…</text>

        {/* Arrows down to AEP */}
        <line x1="68" y1="48" x2="68" y2="58" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#cdp-arrow)" />
        <line x1="192" y1="48" x2="192" y2="58" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#cdp-arrow)" />

        <text x="8" y="72" fill="#94a3b8" fontSize="10" fontWeight="600">AEP rows</text>
        <rect x="8" y="76" width="120" height="20" rx="3" fill="rgba(239,68,68,0.12)" stroke="#f87171" strokeWidth="1" />
        <text x="12" y="90" fill="#fca5a5" fontSize="8">Row A: frozen w/o email</text>
        <rect x="132" y="76" width="120" height="20" rx="3" fill="rgba(34,197,94,0.12)" stroke="#4ade80" strokeWidth="1" />
        <text x="136" y="90" fill="#86efac" fontSize="8">Row B: email at send</text>
        <text x="258" y="88" fill="#64748b" fontSize="8">Row A not auto-healed → replay / join / GBS</text>
      </svg>
    </div>
  );
}

function ConcernCard({
  severity,
  title,
  body,
}: {
  severity: 'amber' | 'slate' | 'violet';
  title: string;
  body: string;
}) {
  const styles = {
    amber: 'border-amber-800/45 bg-amber-950/20 text-amber-100/95',
    slate: 'border-slate-600/50 bg-slate-900/40 text-slate-100/95',
    violet: 'border-violet-800/45 bg-violet-950/25 text-violet-100/95',
  }[severity];

  return (
    <div className={`rounded-md border px-2.5 py-2 ${styles}`}>
      <div className="text-[11px] font-bold tracking-tight">{title}</div>
      <p className="text-[10px] opacity-85 mt-1 leading-relaxed text-gray-300">{body}</p>
    </div>
  );
}
