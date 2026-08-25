const { Op } = require('sequelize');
const { Habitation, SafeSite, HazardReport } = require('../models/sql');
const { recomputeAllHvi } = require('../engines/riskHvi.engine');
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

module.exports = { getMapLayers, recalculateRisk };
