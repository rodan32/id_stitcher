import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CdpExplainerContent } from './CdpExplainerContent';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CdpExplainerModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/65 backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-lg max-h-[min(90vh,640px)] flex flex-col rounded-xl border border-gray-600 bg-gray-900 shadow-2xl shadow-black/50"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cdp-explainer-title"
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-700 shrink-0">
          <h2 id="cdp-explainer-title" className="text-sm font-bold text-white leading-snug pr-2">
            Time-of-ingestion & Tealium → CJA
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 border border-transparent hover:border-gray-600"
          >
            Close
          </button>
        </div>
        <div className="scroll-styled overflow-y-auto flex-1 min-h-0 px-4 py-4">
          <CdpExplainerContent />
        </div>
      </div>
    </div>,
    document.body,
  );
}
