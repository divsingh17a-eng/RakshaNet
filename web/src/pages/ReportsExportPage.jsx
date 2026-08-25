import { useCallback, useState } from 'react';
import apiClient from '../api/client';
import { downloadRelocationReport } from '../api/endpoints';
import { useApiQuery } from '../hooks/useApiQuery';
import { ErrorState, LoadingState, EmptyState } from '../components/common/QueryState';
import { StatusBadge, ZoneBadge } from '../components/common/Badge';
import { RELOCATION_PLAN_STATUS, RELOCATION_PLAN_STATUS_LABELS } from '../constants';
import { formatNumber } from '../utils/format';

const FORMATS = [
  { value: 'csv', label: 'CSV', icon: '📑' },
  { value: 'pdf', label: 'PDF', icon: '📄' },
  { value: 'docx', label: 'Word (.docx)', icon: '📝' }
];

async function fetchPreview(status) {
  const params = { format: 'json', ...(status ? { status } : {}) };
  const { data } = await apiClient.get('/exports/relocation-report', { params });
  return data;
}

export default function ReportsExportPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [downloading, setDownloading] = useState(null);
  const [downloadError, setDownloadError] = useState(null);

  const fetcher = useCallback(() => fetchPreview(statusFilter), [statusFilter]);
  const { data, status, error, reload } = useApiQuery(fetcher, [statusFilter]);

  async function handleDownload(format) {
    setDownloading(format);
    setDownloadError(null);
    try {
      await downloadRelocationReport(format, statusFilter || undefined);
    } catch (err) {
      setDownloadError(err.message || 'Download failed');
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-1 text-lg font-semibold text-slate-900">Reports & Export</h1>
      <p className="mb-4 text-xs text-slate-500">Relocation & resource plan report - preview below, export as CSV/PDF/Word.</p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-brand-500 focus:outline-none"
        >
          <option value="">All statuses</option>
          {Object.values(RELOCATION_PLAN_STATUS).map((s) => (
            <option key={s} value={s}>{RELOCATION_PLAN_STATUS_LABELS[s]}</option>
          ))}
        </select>
        {FORMATS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => handleDownload(f.value)}
            disabled={downloading !== null}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {downloading === f.value ? 'Preparing…' : `${f.icon} Export ${f.label}`}
          </button>
        ))}
      </div>

      {downloadError && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{downloadError}</p>}

      {status === 'loading' && <LoadingState label="Loading report preview…" />}
      {status === 'error' && <ErrorState message={error?.message} onRetry={reload} />}
      {status === 'success' && (!data.rows || data.rows.length === 0) && (
        <EmptyState title="No relocation plans to report" />
      )}
      {status === 'success' && data.rows?.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Habitation</th>
                <th className="px-4 py-2.5">District</th>
                <th className="px-4 py-2.5">Zone</th>
                <th className="px-4 py-2.5 text-right">HVI</th>
                <th className="px-4 py-2.5">Tier</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Affected</th>
                <th className="px-4 py-2.5 text-right">Priority</th>
                <th className="px-4 py-2.5">Site(s)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.rows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{row.habitation}</td>
                  <td className="px-4 py-2.5 text-slate-500">{row.district}</td>
                  <td className="px-4 py-2.5"><ZoneBadge zone={row.zone} /></td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{row.hvi}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{row.priorityTier}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={row.status} /></td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatNumber(row.affectedPopulation)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatNumber(row.priorityPopulation)}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{row.sites}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
