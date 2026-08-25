import { useState } from 'react';

/**
 * Small centered modal for confirm/decision actions (Approve / Modify /
 * Reject, verification decisions, etc.) that need a short form, distinct
 * from the side Drawer used for detail views.
 */
export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Reusable "decision" form body: optional notes textarea (required for
 * modify/reject per FR-17) plus Confirm/Cancel buttons with a busy state.
 */
export function DecisionForm({ notesRequired, notesLabel = 'Notes', confirmLabel = 'Confirm', confirmTone = 'brand', onCancel, onConfirm }) {
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleConfirm() {
    if (notesRequired && !notes.trim()) {
      setError(`${notesLabel} is required.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onConfirm(notes.trim());
    } catch (err) {
      setError(err.message || 'Action failed');
      setBusy(false);
    }
  }

  const toneClass = {
    brand: 'bg-brand-600 hover:bg-brand-700',
    danger: 'bg-red-600 hover:bg-red-700',
    success: 'bg-emerald-600 hover:bg-emerald-700'
  }[confirmTone];

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          {notesLabel} {notesRequired && <span className="text-red-500">*</span>}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder={notesRequired ? 'Explain the decision (required)…' : 'Optional notes…'}
        />
      </div>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={busy}
          className={`rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${toneClass}`}
        >
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </div>
  );
}
