import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardSummary, getSmsIvrStatus } from '../api/endpoints';
import { useApiQuery } from '../hooks/useApiQuery';
import { useSocketEvent } from '../context/SocketContext';
import KpiTile from '../components/common/KpiTile';
import { ErrorState, LoadingState } from '../components/common/QueryState';
import { DemoDataBadge } from '../components/common/Badge';
import { formatDate } from '../utils/format';

export default function OverviewPage() {
  const navigate = useNavigate();
  const fetcher = useCallback(() => getDashboardSummary(), []);
  const { data, status, error, reload } = useApiQuery(fetcher, []);

  // Every event that can move a KPI number triggers a live re-fetch, per the
  // "at least these 4 events" requirement plus report/SOS volume.
  useSocketEvent('relocationPlan:updated', reload);
  useSocketEvent('relocationPlan:created', reload);
  useSocketEvent('safeSite:updated', reload);
  useSocketEvent('sos:new', reload);
  useSocketEvent('sos:updated', reload);
  useSocketEvent('report:new', reload);
  useSocketEvent('report:verified', reload);
  useSocketEvent('risk:recalculated', reload);

  const [smsIvrMode, setSmsIvrMode] = useState(null);
  useEffect(() => {
    getSmsIvrStatus().then((res) => setSmsIvrMode(res.mode)).catch(() => setSmsIvrMode(null));
  }, []);

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="p-6">
        <LoadingState label="Loading dashboard summary…" />
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="p-6">
        <ErrorState message={error?.message} onRetry={reload} />
      </div>
    );
  }

  const { summary, demoData, generatedAt } = data;

  return (
    <div className="p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Overview</h1>
          <p className="text-xs text-slate-500">Every figure below is computed live from the database. Updated {formatDate(generatedAt)}.</p>
        </div>
        {demoData && <DemoDataBadge />}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        <KpiTile
          label="Critical Habitations"
          value={summary.criticalHabitations}
          unit={`of ${summary.totalHabitations}`}
          tone={summary.criticalHabitations > 0 ? 'danger' : 'default'}
          icon="🏘️"
          onClick={() => navigate('/map')}
          hint="Habitations currently in the Red zone"
        />
        <KpiTile
          label="Red Zones"
          value={summary.redZones}
          tone={summary.redZones > 0 ? 'danger' : 'default'}
          icon="🔴"
          onClick={() => navigate('/map')}
          hint="Habitations flagged at highest risk"
        />
        <KpiTile
          label="Vulnerable Population"
          value={summary.vulnerablePopulation}
          unit={`of ${summary.totalPopulation}`}
          tone="warning"
          icon="👥"
          hint="Elderly, disabled, children under 5"
        />
        <KpiTile
          label="Available Relocation Capacity"
          value={summary.availableRelocationCapacity}
          tone="success"
          icon="🏕️"
          onClick={() => navigate('/resources')}
          hint={`Across ${summary.totalSafeSites} active safe sites`}
        />
        <KpiTile
          label="Critical Resource Gaps"
          value={summary.criticalResourceGaps}
          tone={summary.criticalResourceGaps > 0 ? 'danger' : 'default'}
          icon="⚠️"
          onClick={() => navigate('/resources')}
          hint="Resource rows below the Critical threshold"
        />
        <KpiTile
          label="Pending Verification"
          value={summary.pendingVerification}
          tone={summary.pendingVerification > 0 ? 'warning' : 'default'}
          icon="🔍"
          onClick={() => navigate('/verification')}
          hint="Submitted reports awaiting a decision"
        />
        <KpiTile
          label="Active SOS Alerts"
          value={summary.activeSosAlerts}
          tone={summary.activeSosAlerts > 0 ? 'danger' : 'default'}
          icon="🆘"
          onClick={() => navigate('/sos')}
          hint="Pending, acknowledged, or dispatched"
        />
        <KpiTile
          label="Pending Approvals"
          value={summary.pendingRelocationApprovals}
          tone={summary.pendingRelocationApprovals > 0 ? 'warning' : 'default'}
          icon="🚚"
          onClick={() => navigate('/relocation')}
          hint="Relocation plans awaiting officer decision"
        />
      </div>

      {smsIvrMode && (
        <p className="mt-5 text-[11px] text-slate-400">
          SMS/IVR low-connectivity reporting:{' '}
          <span className={`font-semibold ${smsIvrMode === 'live' ? 'text-emerald-600' : 'text-amber-600'}`}>
            {smsIvrMode === 'live' ? 'Live (Twilio/Exotel connected)' : 'Demo / mock mode'}
          </span>
          {smsIvrMode !== 'live' && ' — no real gateway credentials configured; the report pipeline itself is real, the phone/SMS delivery is simulated.'}
        </p>
      )}
    </div>
  );
}
