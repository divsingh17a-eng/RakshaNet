import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Drawer from '../common/Drawer';
import SatelliteThumb from '../common/SatelliteThumb';
import { ZoneBadge, StatusBadge, DemoDataBadge } from '../common/Badge';
import { ErrorState, LoadingState, EmptyState } from '../common/QueryState';
import FactorBar from './FactorBar';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useSocketEvent } from '../../context/SocketContext';
import { getHabitation, createRelocationPlan, recalculateHabitationRisk } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import { OFFICER_ROLES, ZONE_COLORS, HAZARD_TYPE_LABELS } from '../../constants';
import { formatNumber, formatDate, titleCase, timeAgo } from '../../utils/format';

// A score older than this is flagged as possibly outdated rather than trusted
// silently - keeps the system honest about what it actually knows right now.
const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export default function HabitationDrawer({ habitationId, open, onClose }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcError, setRecalcError] = useState(null);
  const [recalcSuccess, setRecalcSuccess] = useState(false);

  const fetcher = useCallback(() => {
    if (!habitationId) return Promise.resolve(null);
    return getHabitation(habitationId);
  }, [habitationId]);
  const { data, status, error, reload } = useApiQuery(fetcher, [habitationId], { enabled: Boolean(habitationId) });

  // Live-refresh if this habitation's score changes elsewhere (e.g. a
  // volunteer verifies a nearby report while this drawer is already open).
  useSocketEvent('risk:recalculated', useCallback(() => {
    if (habitationId) reload();
  }, [habitationId, reload]));

  async function handleRecalculate() {
    if (recalculating) return; // prevent duplicate simultaneous requests
    setRecalculating(true);
    setRecalcError(null);
    setRecalcSuccess(false);
    try {
      await recalculateHabitationRisk(habitationId);
      await reload(); // pulls the real updated currentHvi/currentZone/lastCalculatedAt from the DB, not a client-side guess
      setRecalcSuccess(true);
      setTimeout(() => setRecalcSuccess(false), 3000);
    } catch (err) {
      setRecalcError(err.message || 'Failed to recalculate risk');
    } finally {
      setRecalculating(false);
    }
  }

  async function handleCreatePlan() {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await createRelocationPlan(habitationId);
      navigate(`/relocation?planId=${res.relocationPlan.id}`);
    } catch (err) {
      setCreateError(err.message || 'Failed to create relocation plan');
    } finally {
      setCreating(false);
    }
  }

  const canPlan = user && OFFICER_ROLES.includes(user.role);

  return (
    <Drawer open={open} onClose={onClose} title={data?.habitation?.name || 'Habitation'} subtitle="Habitation Detail">
      {status === 'loading' && <LoadingState label="Loading habitation…" />}
      {status === 'error' && <ErrorState message={error?.message} onRetry={reload} />}
      {status === 'success' && data && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <ZoneBadge zone={data.habitation.currentZone} />
            <span className="text-xs text-slate-500">{data.habitation.district}, {data.habitation.state}</span>
            {data.habitation.isDemoData && <DemoDataBadge />}
          </div>

          <FreshnessRow
            lastCalculatedAt={data.habitation.lastCalculatedAt}
            onRecalculate={handleRecalculate}
            recalculating={recalculating}
          />
          {recalcSuccess && (
            <p className="rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700">
              ✓ Risk recalculated — HVI, zone, and last-calculated time updated below.
            </p>
          )}
          {recalcError && <p className="text-xs font-medium text-red-600">{recalcError}</p>}

          {data.habitation.location?.coordinates && (
            <SatelliteThumb lat={data.habitation.location.coordinates[1]} lng={data.habitation.location.coordinates[0]} height={180} />
          )}

          <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <Stat label="HVI (0-100)" value={data.habitation.currentHvi} />
            <Stat label="Hazard Exposure" value={data.habitation.currentRiskScore} />
            <Stat label="Population" value={formatNumber(data.habitation.population)} />
            <Stat label="Vulnerable Population" value={formatNumber(data.habitation.vulnerablePopulation)} />
            <Stat label="Households" value={formatNumber(data.habitation.householdCount)} />
            <Stat label="Housing Type" value={titleCase(data.habitation.housingType)} />
            <Stat label="Road Access" value={titleCase(data.habitation.roadAccessQuality)} />
          </div>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Top Contributing Factors</h3>
            <p className="mb-3 text-xs text-slate-500">
              HVI is a transparent weighted decision-support score, not a guaranteed prediction. These are the
              highest-impact inputs behind the current score.
            </p>
            {data.topFactors.length === 0 ? (
              <EmptyState title="No factor breakdown yet" description="Use Recalculate Risk above to generate one." />
            ) : (
              data.topFactors.map((f) => (
                <FactorBar key={f.factor} factor={f.factor} value={f.value} weight={f.weight} contribution={f.contribution} />
              ))
            )}
          </section>

          {canPlan && (
            <section className="rounded-lg border border-brand-100 bg-brand-50 p-3">
              <h3 className="mb-1 text-sm font-semibold text-brand-900">Relocation</h3>
              {data.habitation.currentZone === ZONE_COLORS.GREEN ? (
                <p className="text-xs text-brand-700">This habitation is not currently at risk.</p>
              ) : (
                <button
                  type="button"
                  onClick={handleCreatePlan}
                  disabled={creating}
                  className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {creating ? 'Generating…' : 'Generate Relocation Plan'}
                </button>
              )}
              {createError && <p className="mt-2 text-xs font-medium text-red-600">{createError}</p>}
            </section>
          )}

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Score History</h3>
            {data.scoreHistory.length === 0 ? (
              <EmptyState title="No history yet" />
            ) : (
              <ul className="space-y-1.5">
                {data.scoreHistory.slice(0, 8).map((s) => (
                  <li key={s.id} className="flex items-center justify-between rounded-md border border-slate-100 px-2.5 py-1.5 text-xs">
                    <span className="text-slate-500">{formatDate(s.calculatedAt)}</span>
                    <span className="flex items-center gap-2">
                      <ZoneBadge zone={s.zone} />
                      <span className="font-semibold text-slate-700">HVI {s.hvi}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Linked Reports ({data.linkedReports.length})</h3>
            {data.linkedReports.length === 0 ? (
              <EmptyState title="No nearby hazard reports" />
            ) : (
              <ul className="space-y-1.5">
                {data.linkedReports.slice(0, 6).map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-md border border-slate-100 px-2.5 py-1.5 text-xs">
                    <span>{HAZARD_TYPE_LABELS[r.type] || r.type} · severity {r.severity}/5</span>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Surveys ({data.surveys.length})</h3>
            {data.surveys.length === 0 ? (
              <EmptyState title="No vulnerability surveys yet" />
            ) : (
              <ul className="space-y-1.5">
                {data.surveys.slice(0, 6).map((s) => (
                  <li key={s.id} className="flex items-center justify-between rounded-md border border-slate-100 px-2.5 py-1.5 text-xs">
                    <span>{formatDate(s.surveyedAt)}</span>
                    <StatusBadge status={s.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Relocation Plans ({data.relocationPlans.length})</h3>
            {data.relocationPlans.length === 0 ? (
              <EmptyState title="No relocation plans yet" />
            ) : (
              <ul className="space-y-1.5">
                {data.relocationPlans.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/relocation?planId=${p.id}`)}
                      className="flex w-full items-center justify-between rounded-md border border-slate-100 px-2.5 py-1.5 text-xs hover:bg-slate-50"
                    >
                      <span>Affected {formatNumber(p.affectedPopulation)} · Priority {formatNumber(p.priorityPopulation)}</span>
                      <StatusBadge status={p.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
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

// Data-freshness indicator + the "Recalculate Risk" trigger, side by side so
// the officer always sees both "how current is this?" and "fix it now" in
// one glance - never a stale score presented with unearned confidence.
function FreshnessRow({ lastCalculatedAt, onRecalculate, recalculating }) {
  const isStale = !lastCalculatedAt || (Date.now() - new Date(lastCalculatedAt).getTime()) > STALE_THRESHOLD_MS;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="text-xs">
        {lastCalculatedAt ? (
          <>
            <span className={isStale ? 'font-semibold text-amber-700' : 'text-slate-600'}>
              {isStale && '⚠ '}Risk calculated {timeAgo(lastCalculatedAt)}
            </span>
            <span className="ml-1.5 text-slate-400">({formatDate(lastCalculatedAt)})</span>
          </>
        ) : (
          <span className="font-semibold text-amber-700">⚠ Risk has never been calculated for this habitation</span>
        )}
      </div>
      <button
        type="button"
        onClick={onRecalculate}
        disabled={recalculating}
        className="flex items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {recalculating ? (
          <>
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
            Recalculating…
          </>
        ) : (
          <>↻ Recalculate Risk</>
        )}
      </button>
    </div>
  );
}
