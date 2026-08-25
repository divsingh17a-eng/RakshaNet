const { HazardReport, Survey, Habitation } = require('../models/sql');
const { moderateReport } = require('../services/moderation.service');
const { computeHviForHabitation } = require('../engines/riskHvi.engine');
const { SOURCE_CHANNELS } = require('../config/constants');

/**
 * POST /api/sync - batch sync for the mobile SQLite offline queue (FR-06).
 * The app POSTs every queued report/survey once connectivity returns. Each
 * item is deduped independently on its client-generated localUuid so a
 * partial failure (or a retried batch) never creates duplicates, and
 * `sourceChannel` is stamped OFFLINE_APP so the origin is auditable.
 */
async function syncOfflineQueue(req, res) {
  const { reports = [], surveys = [] } = req.body;

  const reportResults = [];
  for (const item of reports) {
    try {
      if (!item.localUuid || !item.type || !item.severity || item.lng === undefined || item.lat === undefined) {
        reportResults.push({ localUuid: item.localUuid, success: false, error: 'Missing required fields' });
        continue; // eslint-disable-line no-continue
      }

      // eslint-disable-next-line no-await-in-loop
      const existing = await HazardReport.findOne({ where: { localUuid: item.localUuid } });
      if (existing) {
        reportResults.push({ localUuid: item.localUuid, success: true, reportId: existing.id, deduped: true });
        continue; // eslint-disable-line no-continue
      }

      // eslint-disable-next-line no-await-in-loop
      const report = await HazardReport.create({
        localUuid: item.localUuid,
        reporterId: req.user.id,
        type: item.type,
        severity: Number(item.severity),
        description: item.description || null,
        location: { type: 'Point', coordinates: [Number(item.lng), Number(item.lat)] },
        habitationId: item.habitationId || null,
        sourceChannel: SOURCE_CHANNELS.OFFLINE_APP,
        reportedAt: item.reportedAt ? new Date(item.reportedAt) : new Date(),
        syncedAt: new Date()
      });
      moderateReport(report).catch(() => {});
      reportResults.push({ localUuid: item.localUuid, success: true, reportId: report.id });
    } catch (err) {
      reportResults.push({ localUuid: item.localUuid, success: false, error: err.message });
    }
  }

  const surveyResults = [];
  for (const item of surveys) {
    try {
      if (!item.localUuid || !item.habitationId) {
        surveyResults.push({ localUuid: item.localUuid, success: false, error: 'Missing required fields' });
        continue; // eslint-disable-line no-continue
      }

      // eslint-disable-next-line no-await-in-loop
      const existing = await Survey.findOne({ where: { localUuid: item.localUuid } });
      if (existing) {
        surveyResults.push({ localUuid: item.localUuid, success: true, surveyId: existing.id, deduped: true });
        continue; // eslint-disable-line no-continue
      }

      // eslint-disable-next-line no-await-in-loop
      const habitation = await Habitation.findByPk(item.habitationId);
      if (!habitation) {
        surveyResults.push({ localUuid: item.localUuid, success: false, error: 'Habitation not found' });
        continue; // eslint-disable-line no-continue
      }

      // eslint-disable-next-line no-await-in-loop
      const survey = await Survey.create({
        localUuid: item.localUuid,
        habitationId: item.habitationId,
        volunteerId: req.user.id,
        answersJson: item.answers || [],
        scoreInputs: {},
        geotag: item.lng !== undefined && item.lat !== undefined ? { type: 'Point', coordinates: [Number(item.lng), Number(item.lat)] } : null,
        notes: item.notes || null,
        status: 'submitted',
        surveyedAt: item.surveyedAt ? new Date(item.surveyedAt) : new Date()
      });
      // eslint-disable-next-line no-await-in-loop
      await computeHviForHabitation(item.habitationId);
      survey.status = 'applied';
      survey.appliedAt = new Date();
      // eslint-disable-next-line no-await-in-loop
      await survey.save();
      surveyResults.push({ localUuid: item.localUuid, success: true, surveyId: survey.id });
    } catch (err) {
      surveyResults.push({ localUuid: item.localUuid, success: false, error: err.message });
    }
  }

  const io = req.app.get('io');
  const successCount = reportResults.filter((r) => r.success).length + surveyResults.filter((r) => r.success).length;
  if (io && successCount > 0) io.emit('sync:completed', { reportCount: reportResults.length, surveyCount: surveyResults.length });

  res.json({ success: true, reports: reportResults, surveys: surveyResults });
}

module.exports = { syncOfflineQueue };
