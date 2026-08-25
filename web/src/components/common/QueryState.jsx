/**
 * Standardized loading / error / empty renderers so every data-driven screen
 * has explicit states instead of a silent blank screen (PRD sec.12).
 */

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 py-12 px-6 text-center">
      <span className="text-2xl" aria-hidden="true">⚠️</span>
      <p className="max-w-sm text-sm font-medium text-red-800">
        {message || 'Something went wrong loading this data.'}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', description, action }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white py-12 px-6 text-center">
      <span className="text-2xl" aria-hidden="true">🗂️</span>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description && <p className="max-w-sm text-xs text-slate-500">{description}</p>}
      {action}
    </div>
  );
}

/**
 * Convenience wrapper: pass a useApiQuery result plus render callbacks.
 * Only renders `children(data)` once status is success/refreshing.
 */
export default function QueryState({ status, error, data, onRetry, empty, emptyWhen, loadingLabel, children }) {
  if (status === 'loading' || status === 'idle') return <LoadingState label={loadingLabel} />;
  if (status === 'error') return <ErrorState message={error?.message} onRetry={onRetry} />;
  if (emptyWhen ? emptyWhen(data) : false) return empty || <EmptyState />;
  return children(data);
}
