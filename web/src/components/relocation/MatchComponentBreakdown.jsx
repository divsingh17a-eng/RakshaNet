import { MATCH_COMPONENT_LABELS, MATCH_WEIGHTS } from '../../constants';
import { round1 } from '../../utils/format';

/**
 * Renders every component behind a site-matching score, plus its weight -
 * never show a bare match score without this (PRD sec.12).
 */
export default function MatchComponentBreakdown({ components, matchScore, rationale }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Match Score</span>
        <span className="text-lg font-bold text-brand-700">{round1(matchScore)}/100</span>
      </div>
      <div className="space-y-2">
        {Object.entries(MATCH_COMPONENT_LABELS).map(([key, label]) => {
          const value = components?.[key] ?? 0;
          return (
            <div key={key}>
              <div className="mb-0.5 flex items-center justify-between text-[11px] text-slate-500">
                <span>{label} <span className="text-slate-400">({Math.round(MATCH_WEIGHTS[key] * 100)}%)</span></span>
                <span className="font-semibold text-slate-700">{round1(value)}/100</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      {rationale?.length > 0 && (
        <div className="mt-2 rounded-md bg-slate-50 p-2 text-[11px] text-slate-600">
          <span className="font-semibold text-slate-700">Why this site: </span>
          {rationale.join(' · ')}
        </div>
      )}
    </div>
  );
}
