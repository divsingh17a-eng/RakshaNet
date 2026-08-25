import { useCallback } from 'react';
import Drawer from '../common/Drawer';
import SatelliteThumb from '../common/SatelliteThumb';
import { ResourceStatusBadge, DemoDataBadge } from '../common/Badge';
import { ErrorState, LoadingState } from '../common/QueryState';
import { useApiQuery } from '../../hooks/useApiQuery';
import { getSafeSite } from '../../api/endpoints';
import { RESOURCE_TYPE_LABELS, RESOURCE_TYPES } from '../../constants';
import { formatNumber, formatDate, titleCase, round1 } from '../../utils/format';

export default function SafeSiteDrawer({ siteId, open, onClose }) {
  const fetcher = useCallback(() => {
    if (!siteId) return Promise.resolve(null);
    return getSafeSite(siteId);
  }, [siteId]);
  const { data, status, error, reload } = useApiQuery(fetcher, [siteId], { enabled: Boolean(siteId) });

  return (
    <Drawer open={open} onClose={onClose} title={data?.safeSite?.name || 'Safe Site'} subtitle="Safe Site Detail">
      {status === 'loading' && <LoadingState label="Loading safe site…" />}
      {status === 'error' && <ErrorState message={error?.message} onRetry={reload} />}
      {status === 'success' && data && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <ResourceStatusBadge status={data.assessment.status.overall} />
            <span className="text-xs text-slate-500">{titleCase(data.safeSite.type)} · {data.safeSite.district}, {data.safeSite.state}</span>
            {data.safeSite.isDemoData && <DemoDataBadge />}
          </div>

          {data.safeSite.location?.coordinates && (
            <SatelliteThumb lat={data.safeSite.location.coordinates[1]} lng={data.safeSite.location.coordinates[0]} height={180} />
          )}

          <section className="grid grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <Stat label="Total Capacity" value={formatNumber(data.assessment.shelter.totalCapacity)} />
            <Stat label="Occupied" value={formatNumber(data.assessment.shelter.occupiedCapacity)} />
            <Stat label="Available" value={formatNumber(data.assessment.availableCapacity)} />
            <Stat label="Safety Rating" value={`${data.safeSite.safetyRating}/100`} />
            <Stat label="Accessibility" value={`${data.safeSite.accessibilityRating}/100`} />
            <Stat label="Power Backup" value={data.safeSite.powerBackup ? 'Yes' : 'No'} />
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Shelter Capacity</h3>
              <ResourceStatusBadge status={data.assessment.shelter.status} />
            </div>
            <p className="text-xs text-slate-500">
              Capacity ratio {round1(data.assessment.shelter.ratio)}x against current + assessed occupancy.
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Resource Status</h3>
            <div className="space-y-2">
              {Object.values(RESOURCE_TYPES).map((type) => {
                const detail = data.assessment.resources[type];
                if (!detail) return null;
                return (
                  <div key={type} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-800">{RESOURCE_TYPE_LABELS[type]}</span>
                      <ResourceStatusBadge status={data.assessment.status[type]} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-500">
                      <span>Stock: <span className="font-semibold text-slate-700">{formatNumber(detail.quantity)} {detail.unit}</span></span>
                      <span>Required: <span className="font-semibold text-slate-700">{detail.required !== null ? `${formatNumber(detail.required)} ${detail.unit}` : '—'}</span></span>
                      <span>Coverage: <span className="font-semibold text-slate-700">{detail.daysOfCoverage !== null ? `${detail.daysOfCoverage} days` : '—'}</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <p className="text-[11px] text-slate-400">Last capacity check: {formatDate(data.safeSite.lastCapacityCheckAt)}</p>
        </div>
      )}
    </Drawer>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value ?? '—'}</p>
    </div>
  );
}
