import { ZoneBadge, StatusBadge } from '../common/Badge';
import { RELOCATION_URGENCY_LABEL } from '../../constants';
import { formatNumber, round1 } from '../../utils/format';

export default function PlanCard({ plan, onClick }) {
  const siteNames = plan.allocations?.map((a) => a.site?.name).filter(Boolean).join(', ') || 'No site allocated';
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{plan.habitation?.name || 'Unknown habitation'}</p>
          <p className="truncate text-xs text-slate-500">{plan.habitation?.district}</p>
        </div>
        <StatusBadge status={plan.status} />
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <ZoneBadge zone={plan.zoneSnapshot} />
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {RELOCATION_URGENCY_LABEL[plan.priorityTier] || plan.priorityTier}
        </span>
        <span className="text-xs text-slate-400">Rank {round1(plan.rankScore)}</span>
      </div>
      <div className="mb-2 flex items-center gap-4 text-xs text-slate-600">
        <span>Affected: <span className="font-semibold text-slate-800">{formatNumber(plan.affectedPopulation)}</span></span>
        <span>Priority: <span className="font-semibold text-slate-800">{formatNumber(plan.priorityPopulation)}</span></span>
      </div>
      <p className="truncate text-xs text-slate-500">Destination: {siteNames}</p>
    </button>
  );
}
