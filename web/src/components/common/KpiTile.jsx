import clsx from 'clsx';
import { formatNumber } from '../../utils/format';

/**
 * Overview KPI tile. Value must always come from a fetched API field -
 * never hard-code a number here (PRD build rule).
 */
export default function KpiTile({ label, value, unit, tone = 'default', icon, hint, onClick }) {
  const toneStyles = {
    default: 'border-slate-200 bg-white',
    danger: 'border-red-200 bg-red-50',
    warning: 'border-amber-200 bg-amber-50',
    success: 'border-emerald-200 bg-emerald-50',
    info: 'border-blue-200 bg-blue-50'
  };
  const valueTone = {
    default: 'text-slate-900',
    danger: 'text-red-700',
    warning: 'text-amber-700',
    success: 'text-emerald-700',
    info: 'text-blue-700'
  };

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      type={onClick ? 'button' : undefined}
      className={clsx(
        'flex flex-col justify-between rounded-xl border p-4 text-left shadow-sm',
        toneStyles[tone],
        onClick && 'cursor-pointer transition hover:shadow-md'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        {icon && <span className="text-lg leading-none" aria-hidden="true">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className={clsx('text-2xl font-bold tabular-nums', valueTone[tone])}>
          {value === null || value === undefined ? '—' : formatNumber(value)}
        </span>
        {unit && <span className="text-sm font-medium text-slate-500">{unit}</span>}
      </div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Component>
  );
}
