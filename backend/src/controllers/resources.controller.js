const { SafeSite, SiteResource } = require('../models/sql');
const { assessCapacity } = require('../engines/capacity.engine');

// GET /api/resources - Resource Monitor (sec.11): stock, daily requirement,
// days of coverage, and Surplus/Adequate/Critical status per site/resource.
async function getResourceMonitor(req, res) {
  const { district } = req.query;
  const where = {};
  if (district) where.district = district;

  const sites = await SafeSite.findAll({ where, order: [['name', 'ASC']] });

  const rows = [];
  for (const site of sites) {
    // eslint-disable-next-line no-await-in-loop
    const resources = await SiteResource.findAll({ where: { siteId: site.id } });
    const assessment = assessCapacity(site, resources, 0);

    for (const [resourceType, detail] of Object.entries(assessment.resources)) {
      rows.push({
        siteId: site.id,
        siteName: site.name,
        district: site.district,
        resourceType,
        quantity: detail.quantity,
        required: detail.required,
        daysOfCoverage: detail.daysOfCoverage,
        unit: detail.unit,
        status: assessment.status[resourceType]
      });
    }
  }

  const criticalCount = rows.filter((r) => r.status === 'critical').length;

  res.json({ success: true, resources: rows, summary: { totalRows: rows.length, criticalCount } });
}

module.exports = { getResourceMonitor };
