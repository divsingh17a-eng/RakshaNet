import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Small fetch-on-mount hook that standardizes the loading / error / success
 * states every data-driven screen needs (PRD sec.12). `fetcher` should be a
 * stable-ish async function (wrap with useCallback in the caller) that
 * returns the parsed API response body.
 *
 * @param {Function} fetcher - async () => data
 * @param {Array} deps - re-fetch whenever these change
 * @param {{ enabled?: boolean }} options
 */
export function useApiQuery(fetcher, deps = [], options = {}) {
  const { enabled = true } = options;
  const [data, setData] = useState(null);
  const [status, setStatus] = useState(enabled ? 'loading' : 'idle');
  const [error, setError] = useState(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    if (!enabled) return;
    const id = ++requestId.current;
    setStatus((prev) => (prev === 'success' ? 'refreshing' : 'loading'));
    setError(null);
    try {
      const result = await fetcher();
      if (id !== requestId.current) return; // a newer request superseded this one
      setData(result);
      setStatus('success');
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err);
      setStatus('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  return { data, status, error, reload: load, setData };
}
