import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listRelocationPlans, generateAllRelocationPlans } from '../api/endpoints';
import { useApiQuery } from '../hooks/useApiQuery';
import { useSocketEvent } from '../context/SocketContext';
import { useAuthStore } from '../store/authStore';
import { ErrorState, LoadingState, EmptyState } from '../components/common/QueryState';
import { DemoDataBadge } from '../components/common/Badge';
import PlanCard from '../components/relocation/PlanCard';
import PlanDetailDrawer from '../components/relocation/PlanDetailDrawer';
import { OFFICER_ROLES, RELOCATION_PLAN_STATUS, RELOCATION_PLAN_STATUS_LABELS } from '../constants';

const STATUS_FILTERS = ['', ...Object.values(RELOCATION_PLAN_STATUS)];

export default function RelocationPlannerPage() {
  const user = useAuthStore((s) => s.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);

  const selectedPlanId = searchParams.get('planId');

  const fetcher = useCallback(
    () => listRelocationPlans(statusFilter ? { status: statusFilter } : {}),
    [statusFilter]
  );
  const { data, status, error, reload } = useApiQuery(fetcher, [statusFilter]);

  useSocketEvent('relocationPlan:created', reload);
  useSocketEvent('relocationPlan:updated', reload);
  useSocketEvent('safeSite:updated', reload);

  const canGenerate = user && OFFICER_ROLES.includes(user.role);

  function openPlan(id) {
    setSearchParams({ planId: id });
  }
  function closePlan() {
    const next = new URLSearchParams(searchParams);
    next.delete('planId');
    setSearchParams(next);
  }

  async function handleGenerateAll() {
    setGenerating(true);
    setGenerateError(null);
    try {
      await generateAllRelocationPlans();
      await reload();
    } catch (err) {
      setGenerateError(err.message || 'Failed to generate plans');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Relocation Planner</h1>
          <p className="text-xs text-slate-500">
            Ranked by urgency. AI only recommends - relocation only happens after an explicit officer approval.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data?.demoData && <DemoDataBadge />}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-brand-500 focus:outline-none"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s || 'all'} value={s}>{s ? RELOCATION_PLAN_STATUS_LABELS[s] : 'All statuses'}</option>
            ))}
          </select>
          {canGenerate && (
            <button
              type="button"
              onClick={handleGenerateAll}
              disabled={generating}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {generating ? 'Generating…' : 'Generate Plans for All At-Risk Habitations'}
            </button>
          )}
        </div>
      </div>

      {generateError && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{generateError}</p>
      )}

      {status === 'loading' && <LoadingState label="Loading relocation plans…" />}
      {status === 'error' && <ErrorState message={error?.message} onRetry={reload} />}
      {status === 'success' && (!data.relocationPlans || data.relocationPlans.length === 0) && (
        <EmptyState
          title="No relocation plans"
          description={canGenerate ? 'Generate plans for at-risk habitations to get started.' : 'No plans match this filter yet.'}
        />
      )}
      {status === 'success' && data.relocationPlans?.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.relocationPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onClick={() => openPlan(plan.id)} />
          ))}
        </div>
      )}

      <PlanDetailDrawer
        planId={selectedPlanId}
        open={Boolean(selectedPlanId)}
        onClose={closePlan}
        onDecided={reload}
      />
    </div>
  );
}
