import { useCallback, useState } from 'react';
import { listActiveSos, updateSosStatus } from '../api/endpoints';
import { useApiQuery } from '../hooks/useApiQuery';
import { useSocketEvent } from '../context/SocketContext';
import { ErrorState, LoadingState, EmptyState } from '../components/common/QueryState';
import { StatusBadge } from '../components/common/Badge';
import { SOS_STATUS } from '../constants';
import { formatDate, timeAgo } from '../utils/format';

// FR-03: SOS is a high-priority, human-in-the-loop workflow separate from the
// hazard-report verification pipeline - Pending -> Acknowledged -> Dispatched
// -> Resolved/False Alarm.
const NEXT_STATUS = {
  [SOS_STATUS.PENDING]: { status: SOS_STATUS.ACKNOWLEDGED, label: 'Acknowledge', tone: 'bg-amber-600 hover:bg-amber-700' },
  [SOS_STATUS.ACKNOWLEDGED]: { status: SOS_STATUS.DISPATCHED, label: 'Mark Dispatched', tone: 'bg-blue-600 hover:bg-blue-700' },
  [SOS_STATUS.DISPATCHED]: { status: SOS_STATUS.RESOLVED, label: 'Mark Resolved', tone: 'bg-emerald-600 hover:bg-emerald-700' }
};

function mapsLink(lng, lat) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function SosCard({ alert, busy, onAdvance, onFalseAlarm }) {
  const [lng, lat] = alert.location?.coordinates || [null, null];
  const next = NEXT_STATUS[alert.status];

  return (
    <div className="rounded-xl border-2 border-red-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900">
            {alert.reporter?.name || 'Unknown reporter'}
            {alert.reporter?.phone && alert.reporter.phone !== alert.reporter.name && (
              <span className="ml-1.5 font-normal text-slate-400">· {alert.reporter.phone}</span>
            )}
          </p>
          <p className="text-xs text-slate-500">
            Triggered {timeAgo(alert.triggeredAt)} · {formatDate(alert.triggeredAt)}
          </p>
        </div>
        <StatusBadge status={alert.status} />
      </div>

      {alert.message && <p className="mt-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700">{alert.message}</p>}

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>
          📍 {lat?.toFixed(4)}, {lng?.toFixed(4)}
          {alert.accuracyMeters ? ` (±${Math.round(alert.accuracyMeters)}m)` : ''}
        </span>
        {lat !== null && (
          <a
            href={mapsLink(lng, lat)}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand-700 hover:underline"
          >
            View on map →
          </a>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        {next && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onAdvance(alert.id, next.status)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60 ${next.tone}`}
          >
            {next.label}
          </button>
        )}
        {alert.status !== SOS_STATUS.RESOLVED && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onFalseAlarm(alert.id)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            False Alarm
          </button>
        )}
      </div>
    </div>
  );
}

export default function SosAlertsPage() {
  const fetcher = useCallback(() => listActiveSos(), []);
  const query = useApiQuery(fetcher, []);
  useSocketEvent('sos:new', query.reload);
  useSocketEvent('sos:updated', query.reload);

  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);

  async function handleAdvance(id, status) {
    setBusyId(id);
    setActionError(null);
    try {
      await updateSosStatus(id, status);
      await query.reload();
    } catch (err) {
      setActionError(err.message || 'Failed to update SOS status');
    } finally {
      setBusyId(null);
    }
  }

  async function handleFalseAlarm(id) {
    await handleAdvance(id, SOS_STATUS.FALSE_ALARM);
  }

  const alerts = query.data?.alerts || [];
  const pendingCount = alerts.filter((a) => a.status === SOS_STATUS.PENDING).length;

  return (
    <div className="p-6">
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-lg font-semibold text-slate-900">SOS Alerts</h1>
        {pendingCount > 0 && (
          <span className="animate-pulse rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
            {pendingCount} pending
          </span>
        )}
      </div>
      <p className="mb-4 text-xs text-slate-500">
        One-tap emergency alerts from the mobile app, in real time. Every SOS bypasses the report-verification queue
        and lands here immediately (FR-03).
      </p>

      {actionError && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{actionError}</p>}

      {query.status === 'loading' && <LoadingState label="Loading SOS alerts…" />}
      {query.status === 'error' && <ErrorState message={query.error?.message} onRetry={query.reload} />}
      {query.status === 'success' && alerts.length === 0 && (
        <EmptyState title="No active SOS alerts" description="Resolved and false-alarm alerts are cleared from this view." />
      )}
      {query.status === 'success' && alerts.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {alerts.map((alert) => (
            <SosCard
              key={alert.id}
              alert={alert}
              busy={busyId === alert.id}
              onAdvance={handleAdvance}
              onFalseAlarm={handleFalseAlarm}
            />
          ))}
        </div>
      )}
    </div>
  );
}
