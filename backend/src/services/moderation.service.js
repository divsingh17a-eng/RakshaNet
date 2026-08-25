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

module.exports = { moderateReport };
