import clsx from 'clsx';
import {
  ZONE_COLOR_HEX,
  ZONE_LABELS,
  RESOURCE_STATUS_LABELS,
  REPORT_STATUS_LABELS,
  RELOCATION_PLAN_STATUS_LABELS,
  ROUTE_STATUS_LABELS,
  RESPONSE_TASK_STATUS_LABELS,
  SOS_STATUS_LABELS
} from '../../constants';

/** Risk-zone badge - the ONE place zone colors are rendered, always from ZONE_COLOR_HEX. */
export function ZoneBadge({ zone, className }) {
  const hex = ZONE_COLOR_HEX[zone] || '#64748b';
  return (
    <span
      className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white', className)}
      style={{ backgroundColor: hex }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
      {ZONE_LABELS[zone] || zone || 'Unknown'}
    </span>
  );
}

const RESOURCE_STATUS_STYLES = {
  surplus: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  adequate: 'bg-amber-100 text-amber-800 border-amber-200',
  critical: 'bg-red-100 text-red-800 border-red-200'
};

export function ResourceStatusBadge({ status, className }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
        RESOURCE_STATUS_STYLES[status] || 'bg-slate-100 text-slate-700 border-slate-200',
        className
      )}
    >
      {RESOURCE_STATUS_LABELS[status] || status || 'Unknown'}
    </span>
  );
}

const GENERIC_STYLES = 'bg-slate-100 text-slate-700 border-slate-200';
const STATUS_STYLE_MAP = {
  // report statuses
  submitted: 'bg-blue-100 text-blue-800 border-blue-200',
  verified: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  needs_more_evidence: 'bg-amber-100 text-amber-800 border-amber-200',
  duplicate: 'bg-slate-200 text-slate-700 border-slate-300',
  // relocation plan statuses
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  pending_approval: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  in_execution: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-violet-100 text-violet-800 border-violet-200',
  // route statuses
  clear: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  congested: 'bg-amber-100 text-amber-800 border-amber-200',
  blocked: 'bg-red-100 text-red-800 border-red-200',
  unknown: 'bg-slate-100 text-slate-700 border-slate-200',
  // response task statuses
  assigned: 'bg-slate-100 text-slate-700 border-slate-200',
  en_route: 'bg-blue-100 text-blue-800 border-blue-200',
  on_site: 'bg-amber-100 text-amber-800 border-amber-200',
  resolved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  // SOS statuses ('resolved' shared with response tasks above)
  pending: 'bg-red-100 text-red-800 border-red-200',
  acknowledged: 'bg-amber-100 text-amber-800 border-amber-200',
  dispatched: 'bg-blue-100 text-blue-800 border-blue-200',
  false_alarm: 'bg-slate-200 text-slate-700 border-slate-300'
};

const ALL_STATUS_LABELS = {
  ...REPORT_STATUS_LABELS,
  ...RELOCATION_PLAN_STATUS_LABELS,
  ...ROUTE_STATUS_LABELS,
  ...RESPONSE_TASK_STATUS_LABELS,
  ...SOS_STATUS_LABELS
};

export function StatusBadge({ status, className }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
        STATUS_STYLE_MAP[status] || GENERIC_STYLES,
        className
      )}
    >
      {ALL_STATUS_LABELS[status] || status || 'Unknown'}
    </span>
  );
}

/** Shown wherever the API flags demoData: true (PRD build rule). */
export function DemoDataBadge({ className }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-700',
        className
      )}
      title="This view includes seeded/demo data"
    >
      <span aria-hidden="true">●</span> Demo Data
    </span>
  );
}
