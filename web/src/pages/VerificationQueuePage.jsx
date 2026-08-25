import { useCallback, useState } from 'react';
import { listReports, verifyReport } from '../api/endpoints';
import { useApiQuery } from '../hooks/useApiQuery';
import { useSocketEvent } from '../context/SocketContext';
import { ErrorState, LoadingState, EmptyState } from '../components/common/QueryState';
import Modal from '../components/common/Modal';
import SatelliteThumb from '../components/common/SatelliteThumb';
import { HAZARD_TYPE_LABELS, REPORT_STATUS, VERIFICATION_DECISIONS } from '../constants';
import { formatDate, titleCase } from '../utils/format';

const DECISION_OPTIONS = [
  { value: VERIFICATION_DECISIONS.VERIFIED, label: 'Verified', tone: 'bg-emerald-600 hover:bg-emerald-700' },
  { value: VERIFICATION_DECISIONS.NEEDS_MORE_EVIDENCE, label: 'Needs More Evidence', tone: 'bg-amber-500 hover:bg-amber-600' },
  { value: VERIFICATION_DECISIONS.DUPLICATE, label: 'Duplicate', tone: 'bg-slate-500 hover:bg-slate-600' },
  { value: VERIFICATION_DECISIONS.REJECTED, label: 'Rejected', tone: 'bg-red-600 hover:bg-red-700' }
];

export default function VerificationQueuePage() {
  const fetcher = useCallback(() => listReports({ status: REPORT_STATUS.SUBMITTED }), []);
  const { data, status, error, reload } = useApiQuery(fetcher, []);
  useSocketEvent('report:new', reload);
  useSocketEvent('report:verified', reload);

  const [activeReport, setActiveReport] = useState(null);

  return (
    <div className="p-6">
      <h1 className="mb-1 text-lg font-semibold text-slate-900">Verification Queue</h1>
      <p className="mb-4 text-xs text-slate-500">Hazard reports submitted by citizens/volunteers, awaiting a verification decision.</p>

      {status === 'loading' && <LoadingState label="Loading submitted reports…" />}
      {status === 'error' && <ErrorState message={error?.message} onRetry={reload} />}
      {status === 'success' && (!data.reports || data.reports.length === 0) && (
        <EmptyState title="Queue is clear" description="No reports are currently awaiting verification." />
      )}
      {status === 'success' && data.reports?.length > 0 && (
        <div className="space-y-3">
          {data.reports.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">{HAZARD_TYPE_LABELS[r.type] || r.type}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    Severity {r.severity}/5
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {titleCase(r.sourceChannel)}
                  </span>
                </div>
                {r.description && <p className="mb-1 max-w-lg truncate text-xs text-slate-600">{r.description}</p>}
                <p className="text-[11px] text-slate-400">
                  Reported {formatDate(r.reportedAt)} · {r.media?.length || 0} media file{r.media?.length === 1 ? '' : 's'}
                </p>
                <ModerationFlags moderation={r.moderation} />
              </div>
              <button
                type="button"
                onClick={() => setActiveReport(r)}
                className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
              >
                Review & Verify
              </button>
            </div>
          ))}
        </div>
      )}

      <VerifyModal
        report={activeReport}
        onClose={() => setActiveReport(null)}
        onVerified={() => {
          setActiveReport(null);
          reload();
        }}
      />
    </div>
  );
}

function VerifyModal({ report, onClose, onVerified }) {
  const [decision, setDecision] = useState(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (!report) return null;

  async function handleSubmit() {
    if (!decision) {
      setError('Choose a decision.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await verifyReport(report.id, { decision, notes: notes.trim() || undefined });
      setDecision(null);
      setNotes('');
      onVerified();
    } catch (err) {
      setError(err.message || 'Failed to submit verification');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={Boolean(report)} onClose={onClose} title={`Verify: ${HAZARD_TYPE_LABELS[report.type] || report.type}`}>
      <div className="space-y-3">
        {report.description && <p className="rounded-md bg-slate-50 p-2 text-xs text-slate-600">{report.description}</p>}
        <ModerationFlags moderation={report.moderation} verbose />
        {report.location?.coordinates && (
          <div>
            <p className="mb-1 text-xs font-medium text-slate-600">Satellite view of reported location</p>
            <SatelliteThumb lat={report.location.coordinates[1]} lng={report.location.coordinates[0]} />
            <p className="mt-1 text-[10px] text-slate-400">
              Real aerial/satellite imagery, centered on the report&apos;s GPS coordinates - cross-check it against
              the description before deciding. This is not automated detection; you&apos;re still the verifier.
            </p>
          </div>
        )}
        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-600">Decision</p>
          <div className="grid grid-cols-2 gap-2">
            {DECISION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDecision(opt.value)}
                className={`rounded-md border px-2 py-1.5 text-xs font-semibold transition ${
                  decision === opt.value ? `${opt.tone} text-white border-transparent` : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={busy} className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
            {busy ? 'Submitting…' : 'Submit Decision'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Surfaces the existing heuristic moderation result (backend/src/services/moderation.service.js)
// that was already being computed but never shown anywhere - a duplicate/near-location
// match within 6h, or a suspiciously thin description with no photos. This is a
// flag for the officer to weigh, never an automatic reject: the human decision
// buttons above are always available regardless of what this shows.
function ModerationFlags({ moderation, verbose = false }) {
  if (!moderation?.checked) return null;
  const flags = [];
  if (moderation.isDuplicate) {
    flags.push({
      key: 'duplicate',
      label: 'Possible Duplicate',
      detail: verbose
        ? 'Another report of the same hazard type was submitted within 150m and the last 6 hours - it may describe the same event.'
        : null
    });
  }
  if (moderation.isSuspectedFake) {
    flags.push({
      key: 'fake',
      label: 'Requires Review',
      detail: verbose ? 'Description is very short with no supporting detail - worth a closer look before deciding.' : null
    });
  }
  if (flags.length === 0) return null;

  return (
    <div className="mt-1.5 space-y-1">
      {flags.map((f) => (
        <div key={f.key} className="inline-flex items-start gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800">
          <span>⚠ {f.label}</span>
          {f.detail && <span className="font-normal text-amber-700">— {f.detail}</span>}
        </div>
      ))}
    </div>
  );
}
