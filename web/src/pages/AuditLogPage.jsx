import { useCallback, useState } from 'react';
import { getAuditLogs } from '../api/endpoints';
import { useApiQuery } from '../hooks/useApiQuery';
import { ErrorState, LoadingState, EmptyState } from '../components/common/QueryState';
import { formatDate } from '../utils/format';

const PAGE_SIZE = 25;

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  const fetcher = useCallback(() => getAuditLogs({ page, limit: PAGE_SIZE }), [page]);
  const { data, status, error, reload } = useApiQuery(fetcher, [page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.pagination.total / data.pagination.limit)) : 1;

  return (
    <div className="p-6">
      <h1 className="mb-1 text-lg font-semibold text-slate-900">Audit Log</h1>
      <p className="mb-4 text-xs text-slate-500">Full privileged-action trail: actor, timestamp, entity, before/after values.</p>

      {status === 'loading' && <LoadingState label="Loading audit log…" />}
      {status === 'error' && <ErrorState message={error?.message} onRetry={reload} />}
      {status === 'success' && (!data.logs || data.logs.length === 0) && <EmptyState title="No audit entries" />}
      {status === 'success' && data.logs?.length > 0 && (
        <>
          <div className="space-y-2">
            {data.logs.map((log) => {
              const expanded = expandedId === log.id;
              return (
                <div key={log.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : log.id)}
                    className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{log.action}</p>
                      <p className="text-xs text-slate-500">
                        {log.entityType} · {log.entityId} · actor role {log.actorRole}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400">{formatDate(log.createdAt)}</span>
                  </button>
                  {expanded && (
                    <div className="grid grid-cols-1 gap-3 border-t border-slate-100 px-4 py-3 sm:grid-cols-2">
                      <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Before</p>
                        <pre className="max-h-48 overflow-auto rounded-md bg-slate-50 p-2 text-[11px] text-slate-600">
                          {JSON.stringify(log.beforeJson, null, 2) || '—'}
                        </pre>
                      </div>
                      <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">After</p>
                        <pre className="max-h-48 overflow-auto rounded-md bg-slate-50 p-2 text-[11px] text-slate-600">
                          {JSON.stringify(log.afterJson, null, 2) || '—'}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>Page {data.pagination.page} of {totalPages} · {data.pagination.total} entries</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-slate-300 px-2.5 py-1 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-md border border-slate-300 px-2.5 py-1 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
