const { Op } = require('sequelize');
const { Habitation, SafeSite, HazardReport } = require('../models/sql');
const { recomputeAllHvi, getTrendingHabitations } = require('../engines/riskHvi.engine');
const { REPORT_STATUS } = require('../config/constants');

// GET /api/risk/map - live risk map layers (habitations, safe sites, verified hazard reports).
async function getMapLayers(req, res) {
  const { district, hazardType } = req.query;

  const habitationWhere = {};
  if (district) habitationWhere.district = district;

  const safeSiteWhere = {};
  if (district) safeSiteWhere.district = district;

  const reportWhere = { status: { [Op.in]: [REPORT_STATUS.VERIFIED, REPORT_STATUS.SUBMITTED] } };
  if (hazardType) reportWhere.type = hazardType;

  const [habitations, safeSites, hazardReports] = await Promise.all([
    Habitation.findAll({ where: habitationWhere }),
    SafeSite.findAll({ where: safeSiteWhere }),
    HazardReport.findAll({ where: reportWhere, limit: 300, order: [['reportedAt', 'DESC']] })
  ]);

  res.json({
    success: true,
    layers: { habitations, safeSites, hazardReports },
    demoData: habitations.some((h) => h.isDemoData) || safeSites.some((s) => s.isDemoData)
  });
}

// POST /api/risk/recalculate - recomputes HVI/risk/zone for every habitation from live data.
async function recalculateRisk(req, res) {
  const results = await recomputeAllHvi();

  const io = req.app.get('io');
  if (io) io.emit('risk:recalculated', { count: results.length, at: new Date().toISOString() });

  res.json({ success: true, count: results.length, results });
}

// GET /api/risk/trending - "Rapidly Worsening" early-warning list: habitations
// whose HVI has climbed the most over the lookback window, computed from the
// real risk_scores history (a delta over real data, not a prediction).
async function getTrending(req, res) {
  const days = req.query.days ? Number(req.query.days) : 7;
  const minDelta = req.query.minDelta ? Number(req.query.minDelta) : 8;

  const trending = await getTrendingHabitations({ days, minDelta });
  res.json({ success: true, days, minDelta, trending });
}

module.exports = { getMapLayers, recalculateRisk, getTrending };
