const { HazardReport, Verification } = require('../models/sql');
const { ApiError } = require('../middleware/errorHandler');
const { VERIFICATION_DECISIONS, REPORT_STATUS } = require('../config/constants');
const { recomputeAllHvi } = require('../engines/riskHvi.engine');
const { recordAudit } = require('../services/audit.service');

const DECISION_TO_REPORT_STATUS = {
  [VERIFICATION_DECISIONS.VERIFIED]: REPORT_STATUS.VERIFIED,
  [VERIFICATION_DECISIONS.REJECTED]: REPORT_STATUS.REJECTED,
  [VERIFICATION_DECISIONS.NEEDS_MORE_EVIDENCE]: REPORT_STATUS.NEEDS_MORE_EVIDENCE,
  [VERIFICATION_DECISIONS.DUPLICATE]: REPORT_STATUS.DUPLICATE
};

// POST /api/reports/:id/verify - Volunteer verification (FR-04).
// Verified / Rejected / Needs More Evidence / Duplicate, with verifier, timestamp, notes, evidence.
async function verifyReport(req, res) {
  const report = await HazardReport.findByPk(req.params.id);
  if (!report) throw new ApiError(404, 'Report not found');

  const { decision, notes, evidenceUrls } = req.body;
  if (!Object.values(VERIFICATION_DECISIONS).includes(decision)) {
    throw new ApiError(400, `decision must be one of: ${Object.values(VERIFICATION_DECISIONS).join(', ')}`);
  }

  const verification = await Verification.create({
    reportId: report.id,
    volunteerId: req.user.id,
    decision,
    notes: notes || null,
    evidenceUrls: evidenceUrls || []
  });

  const beforeStatus = report.status;
  await report.update({ status: DECISION_TO_REPORT_STATUS[decision] });

  await recordAudit({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: `report.verify.${decision}`,
    entityType: 'HazardReport',
    entityId: report.id,
    before: { status: beforeStatus },
    after: { status: report.status, decision, notes: notes || null },
    req
  });

  const io = req.app.get('io');
  if (io) io.emit('report:verified', { reportId: report.id, decision, verificationId: verification.id });

  // A verified report is the only decision that changes what the risk engine
  // reads (hazardExposureFactor only counts status='verified' reports) - a
  // rejected/duplicate/needs-evidence report doesn't move any input the
  // engine uses, so recomputing for those would be wasted work with nothing
  // to show for it. This is the fix for the core "Report -> Verify -> Risk
  // Update" workflow: previously nothing ever triggered a recompute here.
  let riskUpdate = null;
  if (decision === VERIFICATION_DECISIONS.VERIFIED) {
    const results = await recomputeAllHvi();
    riskUpdate = { count: results.length, results };
    if (io) io.emit('risk:recalculated', { count: results.length, at: new Date().toISOString(), trigger: 'verification', reportId: report.id });
  }

  res.status(201).json({ success: true, verification, report, riskUpdate });
}

async function listVerificationsForReport(req, res) {
  const verifications = await Verification.findAll({
    where: { reportId: req.params.id },
    order: [['createdAt', 'DESC']]
  });
  res.json({ success: true, verifications });
}

module.exports = { verifyReport, listVerificationsForReport };
