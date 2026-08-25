import { useCallback, useMemo, useState } from 'react';
import { getResourceMonitor, getRedistributionSuggestions } from '../api/endpoints';
import { useApiQuery } from '../hooks/useApiQuery';
import { useSocketEvent } from '../context/SocketContext';
import { ErrorState, LoadingState, EmptyState } from '../components/common/QueryState';
import { ResourceStatusBadge } from '../components/common/Badge';
import { RESOURCE_TYPE_LABELS } from '../constants';
import { formatNumber } from '../utils/format';

export default function ResourceMonitorPage() {
  const [district, setDistrict] = useState('');

  const fetcher = useCallback(() => getResourceMonitor(), []);
  const { data, status, error, reload } = useApiQuery(fetcher, []);

  useSocketEvent('safeSite:updated', reload);
  useSocketEvent('relocationPlan:updated', reload);

  const districts = useMemo(() => {
    if (!data?.resources) return [];
    return [...new Set(data.resources.map((r) => r.district))].sort();
  }, [data]);

  const filteredRows = useMemo(() => {
    if (!data?.resources) return [];
    return district ? data.resources.filter((r) => r.district === district) : data.resources;
  }, [data, district]);

  const redistFetcher = useCallback(() => {
    if (!district) return Promise.resolve(null);
    return getRedistributionSuggestions(district);
  }, [district]);
  const redist = useApiQuery(redistFetcher, [district], { enabled: Boolean(district) });

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Resource Monitor</h1>
          <p className="text-xs text-slate-500">Stock, requirement, days of coverage, and status per site and resource.</p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <span className="text-xs text-slate-500">
              {data.summary.criticalCount} of {data.summary.totalRows} rows critical
            </span>
          )}
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-brand-500 focus:outline-none"
          >
            <option value="">All districts</option>
            {districts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {status === 'loading' && <LoadingState label="Loading resource monitor…" />}
      {status === 'error' && <ErrorState message={error?.message} onRetry={reload} />}
      {status === 'success' && filteredRows.length === 0 && <EmptyState title="No resource data" />}
      {status === 'success' && filteredRows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Site</th>
                <th className="px-4 py-2.5">District</th>
                <th className="px-4 py-2.5">Resource</th>
                <th className="px-4 py-2.5 text-right">Stock</th>
                <th className="px-4 py-2.5 text-right">Required</th>
                <th className="px-4 py-2.5 text-right">Days of Coverage</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => (
                <tr key={`${row.siteId}-${row.resourceType}`} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{row.siteName}</td>
                  <td className="px-4 py-2.5 text-slate-500">{row.district}</td>
                  <td className="px-4 py-2.5 text-slate-600">{RESOURCE_TYPE_LABELS[row.resourceType] || row.resourceType}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatNumber(row.quantity)} {row.unit}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{row.required !== null ? `${formatNumber(row.required)} ${row.unit}` : '—'}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{row.daysOfCoverage !== null ? `${row.daysOfCoverage}d` : '—'}</td>
                  <td className="px-4 py-2.5"><ResourceStatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {district && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Redistribution Suggestions - {district}</h2>
          {redist.status === 'loading' && <LoadingState label="Checking redistribution options…" />}
          {redist.status === 'error' && <ErrorState message={redist.error?.message} onRetry={redist.reload} />}
          {redist.status === 'success' && (!redist.data?.suggestions || redist.data.suggestions.length === 0) && (
            <EmptyState title="No redistribution needed" description="No critical resource gap has a surplus donor site in this district." />
          )}
          {redist.status === 'success' && redist.data?.suggestions?.length > 0 && (
            <ul className="space-y-2">
              {redist.data.suggestions.map((s, i) => (
                <li key={i} className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-900">
                  Transfer <span className="font-semibold">{RESOURCE_TYPE_LABELS[s.resource] || s.resource}</span> from{' '}
                  <span className="font-semibold">{s.fromSiteName}</span> (surplus) to{' '}
                  <span className="font-semibold">{s.toSiteName}</span> (critical)
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
