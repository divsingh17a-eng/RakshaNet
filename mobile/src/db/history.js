import { getDb } from './database';

// Device-local activity log for the Volunteer "Task History" screen.
// NOTE (documented gap): the backend has no "my verifications" endpoint
// (only GET /reports/:id/verifications for a single report - see
// docs/API.md), so verification history is recorded locally on submit
// rather than fetched from the server.
export async function recordVerification({ reportId, reportType, decision, notes }) {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO local_verifications (report_id, report_type, decision, notes, created_at) VALUES (?, ?, ?, ?, ?)',
    [reportId, reportType || null, decision, notes || null, Date.now()]
  );
}

export async function listVerificationHistory() {
  const db = await getDb();
  return db.getAllAsync('SELECT * FROM local_verifications ORDER BY created_at DESC LIMIT 100');
}
