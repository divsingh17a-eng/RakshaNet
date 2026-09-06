import { apiClient, describeApiError } from '../api/client';
import { triggerSosOnline } from '../api/sos';
import * as queue from '../db/queue';

// FR-06 offline sync orchestrator. Runs automatically on app foreground and
// on network reconnect (see NetworkContext) - there is no separate "sync
// screen" per PRD sec.15. Reports and surveys go through the batch
// POST /api/sync endpoint (idempotent per-item on localUuid); SOS triggers
// go directly to POST /api/sos since /api/sync only accepts
// { reports, surveys } (see docs/API.md) and /api/sos has no idempotency
// key of its own - a documented backend gap, not a client shortcut.
const BASE_BACKOFF_MS = 15000; // 15s
const MAX_BACKOFF_MS = 15 * 60 * 1000; // 15 min

function nextBackoff(retryCount) {
  const delay = Math.min(BASE_BACKOFF_MS * 2 ** retryCount, MAX_BACKOFF_MS);
  return Date.now() + delay;
}

let syncInFlight = null;

// De-duplicates concurrent triggers (foreground + reconnect firing together).
export function syncNow(listeners) {
  if (syncInFlight) return syncInFlight;
  syncInFlight = runSync(listeners).finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

async function runSync(listeners = {}) {
  const summary = { reportsSynced: 0, surveysSynced: 0, sosSynced: 0, failures: 0 };

  try {
    const [reports, surveys] = await Promise.all([queue.listSyncableReports(), queue.listSyncableSurveys()]);

    if (reports.length > 0 || surveys.length > 0) {
      await Promise.all([
        ...reports.map((r) => queue.markReportSyncing(r.local_uuid)),
        ...surveys.map((s) => queue.markSurveySyncing(s.local_uuid))
      ]);

      const body = {
        reports: reports.map((r) => ({
          localUuid: r.local_uuid,
          type: r.type,
          severity: r.severity,
          description: r.description,
          lng: r.lng,
          lat: r.lat,
          habitationId: r.habitation_id,
          reportedAt: r.reported_at
        })),
        surveys: surveys.map((s) => ({
          localUuid: s.local_uuid,
          habitationId: s.habitation_id,
          answers: s.answers,
          notes: s.notes,
          lng: s.lng,
          lat: s.lat,
          surveyedAt: s.surveyed_at
        }))
      };

      const { data } = await apiClient.post('/sync', body);

      await Promise.all(
        (data.reports || []).map(async (result) => {
          if (result.success) {
            summary.reportsSynced += 1;
            await queue.markReportSynced(result.localUuid, result.reportId);
          } else {
            summary.failures += 1;
            const row = reports.find((r) => r.local_uuid === result.localUuid);
            await queue.markReportFailed(result.localUuid, result.error, nextBackoff(row?.retry_count || 0));
          }
        })
      );

      await Promise.all(
        (data.surveys || []).map(async (result) => {
          if (result.success) {
            summary.surveysSynced += 1;
            await queue.markSurveySynced(result.localUuid, result.surveyId);
          } else {
            summary.failures += 1;
            const row = surveys.find((s) => s.local_uuid === result.localUuid);
            await queue.markSurveyFailed(result.localUuid, result.error, nextBackoff(row?.retry_count || 0));
          }
        })
      );
    }
  } catch (err) {
    // Whole-batch failure (e.g. dropped mid-request) - leave items pending,
    // they'll retry on the next sync tick with their existing backoff.
    const { offline } = describeApiError(err);
    if (!offline) summary.failures += 1;
  }

  // SOS: no batch endpoint, send individually so one failure doesn't block others.
  try {
    const sosItems = await queue.listSyncableSos();
    for (const item of sosItems) {
      // eslint-disable-next-line no-await-in-loop
      await queue.markSosSyncing(item.local_uuid);
      try {
        // eslint-disable-next-line no-await-in-loop
        const { alert } = await triggerSosOnline({
          lng: item.lng,
          lat: item.lat,
          accuracyMeters: item.accuracy_meters,
          message: item.message
        });
        // eslint-disable-next-line no-await-in-loop
        await queue.markSosSynced(item.local_uuid, alert?.id);
        summary.sosSynced += 1;
      } catch (err) {
        const { message, offline } = describeApiError(err);
        if (!offline) {
          // eslint-disable-next-line no-await-in-loop
          await queue.markSosFailed(item.local_uuid, message, nextBackoff(item.retry_count || 0));
          summary.failures += 1;
        }
      }
    }
  } catch (err) {
    // ignore - queue table read failure, nothing to retry this tick
  }

  if (listeners.onComplete) listeners.onComplete(summary);
  return summary;
}
