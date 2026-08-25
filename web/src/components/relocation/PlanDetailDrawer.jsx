import { useCallback, useEffect, useState } from 'react';
import Drawer from '../common/Drawer';
import Modal, { DecisionForm } from '../common/Modal';
import { ZoneBadge, StatusBadge } from '../common/Badge';
import { ErrorState, LoadingState, EmptyState } from '../common/QueryState';
import MatchComponentBreakdown from './MatchComponentBreakdown';
import { useApiQuery } from '../../hooks/useApiQuery';
import { getRelocationPlan, decideRelocationPlan, recheckRelocationPlan } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import { OFFICER_ROLES, RELOCATION_PLAN_STATUS, RELOCATION_URGENCY_LABEL } from '../../constants';
import { formatDate, formatNumber } from '../../utils/format';

const DECIDABLE_STATUSES = [RELOCATION_PLAN_STATUS.DRAFT, RELOCATION_PLAN_STATUS.PENDING_APPROVAL];
const RECHECKABLE_STATUSES = [RELOCATION_PLAN_STATUS.APPROVED, RELOCATION_PLAN_STATUS.IN_EXECUTION];

export default function PlanDetailDrawer({ planId, open, onClose, onDecided }) {
  const user = useAuthStore((s) => s.user);
  const [activeModal, setActiveModal] = useState(null); // 'approve' | 'modify' | 'reject' | null
  const [overrideWarnings, setOverrideWarnings] = useState(false);
  const [stressTestBlock, setStressTestBlock] = useState(null);
  const [rechecking, setRechecking] = useState(false);
  const [recheckResult, setRecheckResult] = useState(null);
  const [recheckError, setRecheckError] = useState(null);

  const fetcher = useCallback(() => {
    if (!planId) return Promise.resolve(null);
    return getRelocationPlan(planId);
  }, [planId]);
  const { data, status, error, reload } = useApiQuery(fetcher, [planId], { enabled: Boolean(planId) });

  useEffect(() => {
    setRecheckResult(null);
    setRecheckError(null);
  }, [planId]);

  const canDecide = user && OFFICER_ROLES.includes(user.role);
  const plan = data?.relocationPlan;

  async function handleRecheck() {
    if (rechecking) return; // duplicate-request guard
    setRechecking(true);
    setRecheckError(null);
    try {
      const res = await recheckRelocationPlan(planId);
      setRecheckResult(res.recheck);
    } catch (err) {
      setRecheckError(err.message || 'Re-check failed');
    } finally {
      setRechecking(false);
    }
  }

  async function submitDecision(action, decisionNotes) {
    const body = { action, ...(decisionNotes ? { decisionNotes } : {}) };
    if (action === 'approve' && overrideWarnings) body.overrideStressTestWarnings = true;
    try {
      await decideRelocationPlan(planId, body);
      setActiveModal(null);
      setOverrideWarnings(false);
      setStressTestBlock(null);
      await reload();
      onDecided?.();
    } catch (err) {
      if (err.status === 409) {
        // Stress test failed - surface the override option instead of a generic error.
        setStressTestBlock(err.details?.details || err.details);
        throw new Error(err.message || 'Stress test detected a capacity/resource overload.');
      }
      throw err;
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={plan?.habitation?.name || 'Relocation Plan'} subtitle="Relocation Plan Detail" width="max-w-2xl">
      {status === 'loading' && <LoadingState label="Loading plan…" />}
      {status === 'error' && <ErrorState message={error?.message} onRetry={reload} />}
      {status === 'success' && plan && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <ZoneBadge zone={plan.zoneSnapshot} />
            <StatusBadge status={plan.status} />
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {RELOCATION_URGENCY_LABEL[plan.priorityTier] || plan.priorityTier}
            </span>
          </div>

          <section className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-800">Population - never conflated</p>
            <div className="flex gap-6">
              <div>
                <p className="text-[11px] text-amber-700">Total Affected Population</p>
                <p className="text-lg font-bold text-amber-900">{formatNumber(plan.affectedPopulation)}</p>
              </div>
              <div>
                <p className="text-[11px] text-amber-700">Prioritized for This Tier</p>
                <p className="text-lg font-bold text-amber-900">{formatNumber(plan.priorityPopulation)}</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Recommendation Reasons</h3>
            <ul className="list-inside list-disc space-y-1 text-xs text-slate-600">
              {(plan.recommendationReasons || []).map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">
              Site Allocation {plan.allocations?.length > 1 && <span className="text-xs font-normal text-slate-500">(split across {plan.allocations.length} sites)</span>}
            </h3>
            {(!plan.allocations || plan.allocations.length === 0) ? (
              <EmptyState title="No site allocated" description="No active safe site had available capacity in range." />
            ) : (
              <div className="space-y-4">
                {plan.allocations.map((a) => (
                  <div key={a.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800">{a.site?.name}</span>
                      <span className="text-xs text-slate-500">{formatNumber(a.population)} people</span>
                    </div>
                    <p className="mb-2 text-[11px] text-slate-500">
                      Capacity before {formatNumber(a.capacityBefore)} → after (if approved) {formatNumber(a.capacityAfter)}
                    </p>
                    <MatchComponentBreakdown components={a.matchComponents} matchScore={a.matchScore} rationale={a.matchRationale} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Stress Test</h3>
            {plan.stressTestResult ? (
              <div className={`rounded-lg border p-3 text-xs ${plan.stressTestResult.passed ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
                <p className="font-semibold">{plan.stressTestResult.passed ? 'Passed - no capacity/resource overload detected.' : 'Failed - approving as-is would overload:'}</p>
                {!plan.stressTestResult.passed && (
                  <ul className="mt-1 list-inside list-disc">
                    {plan.stressTestResult.issues?.map((issue) => (
                      <li key={issue.siteId}>{issue.siteName}: {issue.criticalResources?.join(', ')}</li>
                    ))}
                  </ul>
                )}
                <p className="mt-1 text-[10px] opacity-70">Checked {formatDate(plan.stressTestResult.checkedAt)}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Not yet run.</p>
            )}
          </section>

          {RECHECKABLE_STATUSES.includes(plan.status) && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Conditions Changed?</h3>
                <button
                  type="button"
                  onClick={handleRecheck}
                  disabled={rechecking}
                  className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {rechecking ? 'Re-checking…' : 'Re-check Plan'}
                </button>
              </div>
              {recheckError && <p className="text-xs text-red-600">{recheckError}</p>}
              {recheckResult && (
                <div
                  className={`rounded-lg border p-3 text-xs ${
                    recheckResult.conditionsChanged
                      ? 'border-amber-300 bg-amber-50 text-amber-900'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  }`}
                >
                  <p className="font-semibold">
                    {recheckResult.conditionsChanged ? '⚠ Re-planning required - conditions have changed.' : '✓ Plan still valid - no change detected.'}
                  </p>
                  {!recheckResult.stressTestPassed && (
                    <ul className="mt-1 list-inside list-disc">
                      {recheckResult.issues?.map((issue) => (
                        <li key={issue.siteId}>Destination site {issue.siteName} would now go critical on: {issue.criticalResources?.join(', ')}</li>
                      ))}
                    </ul>
                  )}
                  {recheckResult.hviChanged && (
                    <p className="mt-1">
                      HVI changed: {recheckResult.hviSnapshot} → {recheckResult.currentHvi}
                    </p>
                  )}
                  {recheckResult.zoneChanged && (
                    <p className="mt-1 flex items-center gap-1">
                      Zone changed: <ZoneBadge zone={recheckResult.zoneSnapshot} /> → <ZoneBadge zone={recheckResult.currentZone} />
                    </p>
                  )}
                  <p className="mt-1 text-[10px] opacity-70">Checked {formatDate(recheckResult.checkedAt)}</p>
                </div>
              )}
            </section>
          )}

          {plan.decisionNotes && (
            <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-700">Decision Notes</p>
              <p className="mt-1 text-xs text-slate-600">{plan.decisionNotes}</p>
            </section>
          )}

          {canDecide && DECIDABLE_STATUSES.includes(plan.status) && (
            <section className="sticky bottom-0 -mx-6 -mb-5 flex gap-2 border-t border-slate-200 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => setActiveModal('approve')}
                className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => setActiveModal('modify')}
                className="flex-1 rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600"
              >
                Modify
              </button>
              <button
                type="button"
                onClick={() => setActiveModal('reject')}
                className="flex-1 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Reject
              </button>
            </section>
          )}
        </div>
      )}

      <Modal open={activeModal === 'approve'} onClose={() => { setActiveModal(null); setStressTestBlock(null); }} title="Approve Relocation Plan">
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            This will run a fresh stress test and, if it passes, update safe-site occupancy and dispatch a response task.
            This action cannot be silently reversed.
          </p>
          {stressTestBlock && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
              <p className="font-semibold">Stress test failed:</p>
              <ul className="list-inside list-disc">
                {stressTestBlock.issues?.map((issue) => (
                  <li key={issue.siteId}>{issue.siteName}: {issue.criticalResources?.join(', ')}</li>
                ))}
              </ul>
              <label className="mt-2 flex items-center gap-1.5">
                <input type="checkbox" checked={overrideWarnings} onChange={(e) => setOverrideWarnings(e.target.checked)} />
                Override and approve anyway
              </label>
            </div>
          )}
          <DecisionForm
            notesRequired={false}
            notesLabel="Notes (optional)"
            confirmLabel="Approve"
            confirmTone="success"
            onCancel={() => setActiveModal(null)}
            onConfirm={() => submitDecision('approve')}
          />
        </div>
      </Modal>

      <Modal open={activeModal === 'modify'} onClose={() => setActiveModal(null)} title="Send Back for Modification">
        <DecisionForm
          notesRequired
          notesLabel="Modification reason"
          confirmLabel="Send Back"
          confirmTone="brand"
          onCancel={() => setActiveModal(null)}
          onConfirm={(notes) => submitDecision('modify', notes)}
        />
      </Modal>

      <Modal open={activeModal === 'reject'} onClose={() => setActiveModal(null)} title="Reject Relocation Plan">
        <DecisionForm
          notesRequired
          notesLabel="Rejection reason"
          confirmLabel="Reject"
          confirmTone="danger"
          onCancel={() => setActiveModal(null)}
          onConfirm={(notes) => submitDecision('reject', notes)}
        />
      </Modal>
    </Drawer>
  );
}
