import { useEffect } from 'react';
import clsx from 'clsx';

/**
 * Side panel / context drawer used for every detail view (habitation, safe
 * site, plan detail, etc.) so the map/list stays in context behind it
 * (PRD sec.11/12: "details open in side panels/drawers, not full navigations").
 */
export default function Drawer({ open, onClose, title, subtitle, children, width = 'max-w-xl' }) {
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.();
    }
    if (open) document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <div
      className={clsx(
        'fixed inset-0 z-40 transition-opacity',
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      )}
      aria-hidden={!open}
    >
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
      />
      <div
        className={clsx(
          'absolute right-0 top-0 h-full w-full transform bg-white shadow-2xl transition-transform duration-200 ease-out',
          width,
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
            <div className="min-w-0">
              {subtitle && <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">{subtitle}</p>}
              <h2 className="truncate text-lg font-semibold text-slate-900">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
