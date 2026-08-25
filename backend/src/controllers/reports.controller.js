const { HazardReport, ReportMedia } = require('../models/sql');
const { ApiError } = require('../middleware/errorHandler');
const { moderateReport } = require('../services/moderation.service');
const { uploadMedia } = require('../services/upload.service');
const { SOURCE_CHANNELS } = require('../config/constants');

/**
 * Single-report submission (online mobile flow, FR-02). Idempotent on
 * localUuid so a retried request after a flaky connection doesn't create
 * duplicates - the same idempotency key the offline queue uses on /api/sync.
 */
async function submitReport(req, res, next) {
  const { localUuid, type, severity, description, lng, lat, habitationId, reportedAt } = req.body;
  if (!localUuid || !type || !severity || lng === undefined || lat === undefined) {
    return next(new ApiError(400, 'localUuid, type, severity, lng, and lat are required'));
  }

  const existing = await HazardReport.findOne({ where: { localUuid } });
  if (existing) {
    return res.status(200).json({ success: true, report: existing, deduped: true });
  }

  const report = await HazardReport.create({
    localUuid,
    reporterId: req.user.id,
    type,
    severity: Number(severity),
    description: description || null,
    location: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
    habitationId: habitationId || null,
    sourceChannel: SOURCE_CHANNELS.APP,
    reportedAt: reportedAt ? new Date(reportedAt) : new Date(),
    syncedAt: new Date()
  });

  const files = req.files || [];
  for (const file of files) {
    // eslint-disable-next-line no-await-in-loop
    const media = await uploadMedia(file);
    // eslint-disable-next-line no-await-in-loop
    await ReportMedia.create({
      reportId: report.id,
      url: media.url,
      type: file.mimetype.startsWith('video') ? 'video' : 'image',
      metadata: { mimeType: media.mimeType, sizeBytes: media.sizeBytes, thumbnailUrl: media.thumbnailUrl }
    });
  }

  moderateReport(report).catch(() => {}); // fire-and-forget; doesn't block the mobile UI

  const io = req.app.get('io');
  if (io) io.emit('report:new', report);

  res.status(201).json({ success: true, report });
}

async function listReports(req, res) {
  const { type, status, mine } = req.query;
  const where = {};
  if (type) where.type = type;
  if (status) where.status = status;
  if (mine === 'true') where.reporterId = req.user.id;

  const reports = await HazardReport.findAll({
    where,
    include: [{ model: ReportMedia, as: 'media' }],
    order: [['reportedAt', 'DESC']],
    limit: 200
  });
  res.json({ success: true, reports });
}

async function getReportDetail(req, res) {
  const report = await HazardReport.findByPk(req.params.id, { include: [{ model: ReportMedia, as: 'media' }] });
  if (!report) throw new ApiError(404, 'Report not found');
  res.json({ success: true, report });
}

module.exports = { submitReport, listReports, getReportDetail };
