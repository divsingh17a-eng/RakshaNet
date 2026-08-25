const { Op } = require('sequelize');
const { Habitation, SafeSite, SiteResource, HazardReport, RelocationPlan, SosAlert } = require('../models/sql');
const { assessCapacity } = require('../engines/capacity.engine');
const { ZONE_COLORS, REPORT_STATUS, RESOURCE_STATUS, RELOCATION_PLAN_STATUS } = require('../config/constants');

/**
 * GET /api/dashboard/summary - every number here is computed live from the
 * database (per the "Do not hard-code dashboard KPIs" build rule), so it
 * always reflects the current seeded/demo state.
 */
async function getSummary(req, res) {
  const { district } = req.query;
  const habitationWhere = district ? { district } : {};
  const safeSiteWhere = district ? { district, status: 'active' } : { status: 'active' };

  const [habitations, safeSites, pendingVerificationCount, activeSosCount, pendingPlansCount] = await Promise.all([
    Habitation.findAll({ where: habitationWhere }),
    SafeSite.findAll({ where: safeSiteWhere }),
    HazardReport.count({ where: { status: REPORT_STATUS.SUBMITTED } }),
    SosAlert.count({ where: { status: { [Op.in]: ['pending', 'acknowledged', 'dispatched'] } } }),
    RelocationPlan.count({ where: { status: RELOCATION_PLAN_STATUS.PENDING_APPROVAL } })
  ]);

  const criticalHabitations = habitations.filter((h) => h.currentZone === ZONE_COLORS.RED).length;
  const redZones = criticalHabitations; // one zone per critical habitation in this model
  const vulnerablePopulation = habitations.reduce((sum, h) => sum + h.vulnerablePopulation, 0);

  let availableRelocationCapacity = 0;
  let criticalResourceGaps = 0;
  for (const site of safeSites) {
    availableRelocationCapacity += Math.max(0, site.totalCapacity - site.occupiedCapacity);
    // eslint-disable-next-line no-await-in-loop
    const resources = await SiteResource.findAll({ where: { siteId: site.id } });
    const assessment = assessCapacity(site, resources, 0);
    criticalResourceGaps += Object.entries(assessment.status).filter(
      ([key, value]) => key !== 'overall' && value === RESOURCE_STATUS.CRITICAL
    ).length;
  }

  res.json({
    success: true,
    demoData: habitations.some((h) => h.isDemoData) || safeSites.some((s) => s.isDemoData),
    summary: {
      criticalHabitations,
      redZones,
      vulnerablePopulation,
      totalPopulation: habitations.reduce((sum, h) => sum + h.population, 0),
      availableRelocationCapacity,
      criticalResourceGaps,
      pendingVerification: pendingVerificationCount,
      activeSosAlerts: activeSosCount,
      pendingRelocationApprovals: pendingPlansCount,
      totalHabitations: habitations.length,
      totalSafeSites: safeSites.length
    },
    generatedAt: new Date().toISOString()
  });
}

module.exports = { getSummary };
