import { getDb } from './database';

export const QUEUE_STATUS = Object.freeze({
  PENDING: 'pending',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  FAILED: 'failed'
});

// --- Reports (hazard + vulnerability both use /api/reports) ---

export async function enqueueReport({ localUuid, kind, type, severity, description, lng, lat, habitationId, reportedAt, photos }) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO queue_reports (local_uuid, kind, type, severity, description, lng, lat, habitation_id, reported_at, photos_json, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [localUuid, kind || 'hazard', type, severity, description || null, lng, lat, habitationId || null, reportedAt || null, JSON.stringify(photos || []), Date.now()]
  );
  return localUuid;
}

export async function listQueuedReports() {
  const db = await getDb();
  const rows = await db.getAllAsync('SELECT * FROM queue_reports ORDER BY created_at DESC');
  return rows.map(mapReportRow);
}

export async function listSyncableReports() {
  const db = await getDb();
  const now = Date.now();
  const rows = await db.getAllAsync(
    "SELECT * FROM queue_reports WHERE status IN ('pending', 'failed') AND next_retry_at <= ? ORDER BY created_at ASC",
    [now]
  );
  return rows.map(mapReportRow);
}

export async function markReportSyncing(localUuid) {
  const db = await getDb();
  await db.runAsync("UPDATE queue_reports SET status = 'syncing' WHERE local_uuid = ?", [localUuid]);
}

export async function markReportSynced(localUuid, serverId) {
  const db = await getDb();
  await db.runAsync("UPDATE queue_reports SET status = 'synced', server_id = ?, last_error = NULL WHERE local_uuid = ?", [serverId || null, localUuid]);
}

export async function markReportFailed(localUuid, error, nextRetryAt) {
  const db = await getDb();
  await db.runAsync(
    "UPDATE queue_reports SET status = 'failed', last_error = ?, retry_count = retry_count + 1, next_retry_at = ? WHERE local_uuid = ?",
    [String(error || 'Sync failed'), nextRetryAt, localUuid]
  );
}

function mapReportRow(row) {
  return {
    ...row,
    photos: JSON.parse(row.photos_json || '[]'),
    isPendingSync: row.status !== 'synced'
  };
}

// --- Surveys ---

export async function enqueueSurvey({ localUuid, habitationId, habitationName, answers, notes, lng, lat, surveyedAt }) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO queue_surveys (local_uuid, habitation_id, habitation_name, answers_json, notes, lng, lat, surveyed_at, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [localUuid, habitationId, habitationName || null, JSON.stringify(answers || []), notes || null, lng ?? null, lat ?? null, surveyedAt || null, Date.now()]
  );
  return localUuid;
}

export async function listQueuedSurveys() {
  const db = await getDb();
  const rows = await db.getAllAsync('SELECT * FROM queue_surveys ORDER BY created_at DESC');
  return rows.map(mapSurveyRow);
}

export async function listSyncableSurveys() {
  const db = await getDb();
  const now = Date.now();
  const rows = await db.getAllAsync(
    "SELECT * FROM queue_surveys WHERE status IN ('pending', 'failed') AND next_retry_at <= ? ORDER BY created_at ASC",
    [now]
  );
  return rows.map(mapSurveyRow);
}

export async function markSurveySyncing(localUuid) {
  const db = await getDb();
  await db.runAsync("UPDATE queue_surveys SET status = 'syncing' WHERE local_uuid = ?", [localUuid]);
}

export async function markSurveySynced(localUuid, serverId) {
  const db = await getDb();
  await db.runAsync("UPDATE queue_surveys SET status = 'synced', server_id = ?, last_error = NULL WHERE local_uuid = ?", [serverId || null, localUuid]);
}

export async function markSurveyFailed(localUuid, error, nextRetryAt) {
  const db = await getDb();
  await db.runAsync(
    "UPDATE queue_surveys SET status = 'failed', last_error = ?, retry_count = retry_count + 1, next_retry_at = ? WHERE local_uuid = ?",
    [String(error || 'Sync failed'), nextRetryAt, localUuid]
  );
}

function mapSurveyRow(row) {
  return {
    ...row,
    answers: JSON.parse(row.answers_json || '[]'),
    isPendingSync: row.status !== 'synced'
  };
}

// --- SOS ---
// Note: unlike reports/surveys, POST /api/sos has no localUuid/idempotency
// support and POST /api/sync does not accept SOS items (see docs/API.md) -
// this is a backend gap. Queued SOS triggers are retried directly against
// POST /api/sos and are only ever sent again if no success was recorded.

export async function enqueueSos({ localUuid, lng, lat, accuracyMeters, message }) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO queue_sos (local_uuid, lng, lat, accuracy_meters, message, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    [localUuid, lng, lat, accuracyMeters ?? null, message || null, Date.now()]
  );
  return localUuid;
}

export async function listQueuedSos() {
  const db = await getDb();
  const rows = await db.getAllAsync('SELECT * FROM queue_sos ORDER BY created_at DESC');
  return rows;
}

export async function listSyncableSos() {
  const db = await getDb();
  const now = Date.now();
  return db.getAllAsync(
    "SELECT * FROM queue_sos WHERE status IN ('pending', 'failed') AND next_retry_at <= ? ORDER BY created_at ASC",
    [now]
  );
}

export async function markSosSyncing(localUuid) {
  const db = await getDb();
  await db.runAsync("UPDATE queue_sos SET status = 'syncing' WHERE local_uuid = ?", [localUuid]);
}

export async function markSosSynced(localUuid, serverId) {
  const db = await getDb();
  await db.runAsync("UPDATE queue_sos SET status = 'synced', server_id = ?, last_error = NULL WHERE local_uuid = ?", [serverId || null, localUuid]);
}

export async function markSosFailed(localUuid, error, nextRetryAt) {
  const db = await getDb();
  await db.runAsync(
    "UPDATE queue_sos SET status = 'failed', last_error = ?, retry_count = retry_count + 1, next_retry_at = ? WHERE local_uuid = ?",
    [String(error || 'Sync failed'), nextRetryAt, localUuid]
  );
}

// --- Aggregate counts for "Pending Sync" badges ---

export async function getPendingCounts() {
  const db = await getDb();
  const [reports, surveys, sos] = await Promise.all([
    db.getFirstAsync("SELECT COUNT(*) as c FROM queue_reports WHERE status != 'synced'"),
    db.getFirstAsync("SELECT COUNT(*) as c FROM queue_surveys WHERE status != 'synced'"),
    db.getFirstAsync("SELECT COUNT(*) as c FROM queue_sos WHERE status != 'synced'")
  ]);
  return {
    reports: reports?.c || 0,
    surveys: surveys?.c || 0,
    sos: sos?.c || 0,
    total: (reports?.c || 0) + (surveys?.c || 0) + (sos?.c || 0)
  };
}
