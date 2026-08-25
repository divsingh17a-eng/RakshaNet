import { HVI_FACTOR_LABELS } from '../../constants';
import { round1 } from '../../utils/format';

/**
 * One row of the "explainable HVI" breakdown: factor name, its normalized
 * 0-100 value, its weight, and how much it contributed to the final score.
 * Per PRD sec.12 an AI/risk score must never appear without this context.
 */
export default function FactorBar({ factor, value, weight, contribution }) {
  const label = HVI_FACTOR_LABELS[factor] || factor;
  const pct = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">
          value {round1(value)} · weight {weight !== undefined ? `${Math.round(weight * 100)}%` : '—'} · contributes {round1(contribution)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
