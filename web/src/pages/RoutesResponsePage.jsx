import { useCallback, useState } from 'react';
import { listRoutes, updateRouteStatus, listResponseTasks, claimResponseTask, updateResponseTask } from '../api/endpoints';
import { useApiQuery } from '../hooks/useApiQuery';
import { useSocketEvent } from '../context/SocketContext';
import { useAuthStore } from '../store/authStore';
import { ErrorState, LoadingState, EmptyState } from '../components/common/QueryState';
import { StatusBadge } from '../components/common/Badge';
import { ROLES, ROUTE_STATUS, ROUTE_STATUS_LABELS, RESPONSE_TASK_STATUS, RESPONSE_TASK_STATUS_LABELS } from '../constants';
import { formatNumber, formatDate } from '../utils/format';

const NEXT_TASK_STATUS = {
  [RESPONSE_TASK_STATUS.ASSIGNED]: RESPONSE_TASK_STATUS.EN_ROUTE,
  [RESPONSE_TASK_STATUS.EN_ROUTE]: RESPONSE_TASK_STATUS.ON_SITE,
  [RESPONSE_TASK_STATUS.ON_SITE]: RESPONSE_TASK_STATUS.RESOLVED
};

export default function RoutesResponsePage() {
  const user = useAuthStore((s) => s.user);
  const canRespond = user && (user.role === ROLES.RESPONDER || user.role === ROLES.ADMIN);

  const routesFetcher = useCallback(() => listRoutes(), []);
  const routes = useApiQuery(routesFetcher, []);
  useSocketEvent('route:updated', routes.reload);

  const tasksFetcher = useCallback(() => listResponseTasks(), []);
  const tasks = useApiQuery(tasksFetcher, []);
  useSocketEvent('responseTask:updated', tasks.reload);
  useSocketEvent('relocationPlan:updated', tasks.reload);

  const [routeBusyId, setRouteBusyId] = useState(null);
  const [taskBusyId, setTaskBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);

  async function handleRouteStatus(routeId, newStatus) {
    setRouteBusyId(routeId);
    setActionError(null);
    try {
      await updateRouteStatus(routeId, newStatus);
      await routes.reload();
    } catch (err) {
      setActionError(err.message || 'Failed to update route status');
    } finally {
      setRouteBusyId(null);
    }
  }

  async function handleClaim(taskId) {
    setTaskBusyId(taskId);
    setActionError(null);
    try {
      await claimResponseTask(taskId);
      await tasks.reload();
    } catch (err) {
      setActionError(err.message || 'Failed to claim task');
    } finally {
      setTaskBusyId(null);
    }
  }

  async function handleAdvanceTask(taskId, currentStatus) {
    const next = NEXT_TASK_STATUS[currentStatus];
    if (!next) return;
    setTaskBusyId(taskId);
    setActionError(null);
    try {
      await updateResponseTask(taskId, { status: next });
      await tasks.reload();
    } catch (err) {
      setActionError(err.message || 'Failed to advance task');
    } finally {
      setTaskBusyId(null);
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-1 text-lg font-semibold text-slate-900">Routes & Response</h1>
      <p className="mb-4 text-xs text-slate-500">Route status and responder task progression update the map and dashboard live.</p>

      {actionError && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{actionError}</p>}

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Routes</h2>
        {routes.status === 'loading' && <LoadingState label="Loading routes…" />}
        {routes.status === 'error' && <ErrorState message={routes.error?.message} onRetry={routes.reload} />}
        {routes.status === 'success' && (!routes.data?.routes || routes.data.routes.length === 0) && (
          <EmptyState title="No routes configured" />
        )}
        {routes.status === 'success' && routes.data?.routes?.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Habitation → Safe Site</th>
                  <th className="px-4 py-2.5 text-right">Distance</th>
                  <th className="px-4 py-2.5 text-right">Duration</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Alternate</th>
                  <th className="px-4 py-2.5">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {routes.data.routes.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {r.source?.name || '—'} → {r.destination?.name || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatNumber(Math.round(r.distanceKm))} km</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatNumber(Math.round(r.durationMin))} min</td>
                    <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {r.alternate ? `${r.alternate.status} · ${formatNumber(Math.round(r.alternate.distanceKm))}km` : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        defaultValue=""
                        disabled={routeBusyId === r.id}
                        onChange={(e) => {
                          if (e.target.value) handleRouteStatus(r.id, e.target.value);
                          e.target.value = '';
                        }}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none"
                      >
                        <option value="">Set status…</option>
                        {Object.values(ROUTE_STATUS).map((s) => (
                          <option key={s} value={s}>{ROUTE_STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Response Tasks</h2>
        {tasks.status === 'loading' && <LoadingState label="Loading response tasks…" />}
        {tasks.status === 'error' && <ErrorState message={tasks.error?.message} onRetry={tasks.reload} />}
        {tasks.status === 'success' && (!tasks.data?.tasks || tasks.data.tasks.length === 0) && (
          <EmptyState title="No response tasks" description="Tasks are created automatically when an officer approves a relocation plan." />
        )}
        {tasks.status === 'success' && tasks.data?.tasks?.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Object.values(RESPONSE_TASK_STATUS).map((column) => (
              <div key={column} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {RESPONSE_TASK_STATUS_LABELS[column]}
                </p>
                <div className="space-y-2">
                  {tasks.data.tasks.filter((t) => t.status === column).map((t) => (
                    <div key={t.id} className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-sm">
                      <p className="font-semibold text-slate-800">{t.plan?.habitation?.name || 'Unknown habitation'}</p>
                      <p className="mb-2 text-slate-500">
                        {t.plan?.allocations?.map((a) => a.site?.name).filter(Boolean).join(', ') || 'No site'}
                      </p>
                      {!t.responderId && canRespond && (
                        <button
                          type="button"
                          disabled={taskBusyId === t.id}
                          onClick={() => handleClaim(t.id)}
                          className="mb-1.5 w-full rounded-md bg-brand-600 px-2 py-1 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                        >
                          Claim
                        </button>
                      )}
                      {t.responderId && canRespond && NEXT_TASK_STATUS[t.status] && (
                        <button
                          type="button"
                          disabled={taskBusyId === t.id}
                          onClick={() => handleAdvanceTask(t.id, t.status)}
                          className="w-full rounded-md bg-emerald-600 px-2 py-1 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          Advance to {RESPONSE_TASK_STATUS_LABELS[NEXT_TASK_STATUS[t.status]]}
                        </button>
                      )}
                      <p className="mt-1.5 text-[10px] text-slate-400">Updated {formatDate(t.updatedAt)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
