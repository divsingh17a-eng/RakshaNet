const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models/sql');

const DUPLICATE_RADIUS_METERS = 150;
const DUPLICATE_WINDOW_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Lightweight fake/duplicate-report filter (optional, PRD sec.13: "optional
 * pretrained image/duplicate detection"). A real deployment would call an
 * image-authenticity API here; the hackathon build does a deterministic
 * heuristic pass so the pipeline and the report's `moderation` flags are
 * fully wired end-to-end without external credentials.
 */
async function moderateReport(report) {
  const rows = await sequelize.query(
    `
    SELECT id FROM hazard_reports
    WHERE id != :id
      AND type = :type
      AND reported_at >= :since
      AND ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius)
    LIMIT 1
    `,
    {
      replacements: {
        id: report.id,
        type: report.type,
        since: new Date(Date.now() - DUPLICATE_WINDOW_MS),
        lng: report.location.coordinates[0],
        lat: report.location.coordinates[1],
        radius: DUPLICATE_RADIUS_METERS
      },
      type: QueryTypes.SELECT
    }
  );

  const nearbyDuplicate = rows[0] || null;
  const suspiciouslyShort = (report.description || '').trim().length < 3;

  const moderation = {
    checked: true,
    isSuspectedFake: suspiciouslyShort,
    isDuplicate: Boolean(nearbyDuplicate),
    duplicateOfReportId: nearbyDuplicate ? nearbyDuplicate.id : null,
    provider: 'heuristic-v1',
    checkedAt: new Date().toISOString()
  };

  await report.update({ moderation });
  return moderation;
}

const CORRELATION_RADIUS_METERS = 3000; // same radius the HVI hazard-exposure factor uses
const CORRELATION_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * Threat correlation: finds other reports near this one in space and time
 * (any hazard type, not just an exact duplicate) so an officer can see
 * "these 4 reports are probably the same emerging event" instead of judging
 * each in isolation. Same deterministic ST_DWithin approach as the duplicate
 * check above and the HVI hazard-exposure factor - just a wider net.
 */
async function findRelatedReports(report, { radiusMeters = CORRELATION_RADIUS_METERS, windowMs = CORRELATION_WINDOW_MS } = {}) {
  const rows = await sequelize.query(
    `
    SELECT id, type, severity, status, description, reported_at,
           ST_Distance(location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) AS distance_m
    FROM hazard_reports
    WHERE id != :id
      AND reported_at >= :since
      AND ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius)
    ORDER BY reported_at DESC
    LIMIT 15
    `,
    {
      replacements: {
        id: report.id,
        since: new Date(Date.now() - windowMs),
        lng: report.location.coordinates[0],
        lat: report.location.coordinates[1],
        radius: radiusMeters
      },
      type: QueryTypes.SELECT
    }
  );

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    severity: r.severity,
    status: r.status,
    description: r.description,
    reportedAt: r.reported_at,
    distanceMeters: Math.round(r.distance_m)
  }));
}

/**
 * Automated incident prioritization: severity (0-100) + a density bonus for
 * corroborating nearby reports (reuses findRelatedReports as the density
 * signal) - the same "more corroborating reports = more confidence" idea the
 * HVI hazard-exposure factor already uses, just applied per-report instead
 * of per-habitation so the Verification Queue can be triaged.
 */
function computePriorityScore(report, relatedCount) {
  const severityScore = (report.severity / 5) * 70; // up to 70
  const densityBonus = Math.min(relatedCount, 5) * 6; // up to 30 for 5+ corroborating reports
  const score = Math.round(Math.min(100, severityScore + densityBonus));
  const level = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
  return { score, level, relatedCount };
}

module.exports = { moderateReport, findRelatedReports, computePriorityScore };
