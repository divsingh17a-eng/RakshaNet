const { SafeSite, SiteResource } = require('../models/sql');
const { RESOURCE_STATUS, RESOURCE_STATUS_THRESHOLDS, RESOURCE_TYPES } = require('../config/constants');

/**
 * Carrying-capacity & resource-sufficiency assessment (FR-11). Required is
 * derived from each SiteResource row's `dailyNeed` (a per-capita-per-day
 * standard) times the relevant population; status buckets into
 * Surplus/Adequate/Critical.
 */

function statusForRatio(ratio) {
  if (ratio < RESOURCE_STATUS_THRESHOLDS.critical) return RESOURCE_STATUS.CRITICAL;
  if (ratio <= RESOURCE_STATUS_THRESHOLDS.adequate) return RESOURCE_STATUS.ADEQUATE;
  return RESOURCE_STATUS.SURPLUS;
}

/**
 * @param {object} site - a SafeSite instance
 * @param {Array} resources - the site's SiteResource rows
 * @param {number} incomingPopulation - additional people proposed to move in (0 for "current state only")
 */
function assessCapacity(site, resources, incomingPopulation = 0) {
  // An idle site (nobody assigned yet, no hypothetical addition specified)
  // would otherwise always score "Adequate" trivially (required = 0 for a
  // population of 0), hiding a genuinely under-resourced site until the
  // moment someone is actually routed there. For that "at rest" screening
  // case, judge the site against its own rated capacity instead - the whole
  // point of safe-site screening (PRD sec.2.1) is to know up front whether a
  // site could actually sustain the population it claims to hold.
  const totalPopulation = site.occupiedCapacity === 0 && incomingPopulation === 0
    ? site.totalCapacity
    : site.occupiedCapacity + incomingPopulation;

  const byType = Object.fromEntries(resources.map((r) => [r.resourceType, r]));
  const resourceStatus = {};
  const resourceDetail = {};

  for (const type of Object.values(RESOURCE_TYPES)) {
    const resource = byType[type];
    if (!resource) {
      resourceStatus[type] = RESOURCE_STATUS.CRITICAL; // no data recorded for this resource = treat as unassessed/critical
      resourceDetail[type] = { quantity: 0, required: null, ratio: null, daysOfCoverage: null };
      continue;
    }
    const required = totalPopulation * resource.dailyNeed;
    const ratio = required > 0 ? resource.quantity / required : 1;
    const daysOfCoverage = totalPopulation > 0 && resource.dailyNeed > 0
      ? resource.quantity / (totalPopulation * resource.dailyNeed)
      : null;
    resourceStatus[type] = statusForRatio(ratio);
    resourceDetail[type] = { quantity: resource.quantity, required: Math.round(required * 10) / 10, ratio: Math.round(ratio * 100) / 100, daysOfCoverage: daysOfCoverage !== null ? Math.round(daysOfCoverage * 10) / 10 : null, unit: resource.unit };
  }

  const shelterRatio = totalPopulation > 0 ? site.totalCapacity / totalPopulation : 1;
  const shelterStatus = statusForRatio(shelterRatio);

  const statuses = [...Object.values(resourceStatus), shelterStatus];
  const overall = statuses.includes(RESOURCE_STATUS.CRITICAL)
    ? RESOURCE_STATUS.CRITICAL
    : statuses.every((s) => s === RESOURCE_STATUS.SURPLUS)
      ? RESOURCE_STATUS.SURPLUS
      : RESOURCE_STATUS.ADEQUATE;

  const availableCapacity = Math.max(0, site.totalCapacity - site.occupiedCapacity);
  const canAccommodate = shelterStatus !== RESOURCE_STATUS.CRITICAL
    && overall !== RESOURCE_STATUS.CRITICAL
    && availableCapacity >= incomingPopulation;

  // Average resource sufficiency ratio (capped 0-1.5 before scaling) - feeds the site-matching engine.
  const avgRatio = Object.values(resourceDetail).reduce((sum, d) => sum + Math.min(1.5, d.ratio ?? 0), 0) / Object.values(resourceDetail).length;

  return {
    siteId: site.id,
    totalPopulation,
    availableCapacity,
    canAccommodate,
    shelter: { status: shelterStatus, ratio: Math.round(shelterRatio * 100) / 100, totalCapacity: site.totalCapacity, occupiedCapacity: site.occupiedCapacity },
    resources: resourceDetail,
    status: { ...resourceStatus, shelter: shelterStatus, overall },
    resourceSufficiencyScore: Math.round(Math.min(1, avgRatio) * 100)
  };
}

async function runCapacityCheck(siteId, incomingPopulation = 0) {
  const site = await SafeSite.findByPk(siteId);
  if (!site) throw new Error(`SafeSite ${siteId} not found`);
  const resources = await SiteResource.findAll({ where: { siteId } });

  const assessment = assessCapacity(site, resources, incomingPopulation);
  await site.update({ lastCapacityCheckAt: new Date() });
  return assessment;
}

/**
 * Redistribution suggestion: if a site is critical on a resource, find
 * another active site in the same district with surplus of that resource.
 */
async function suggestRedistribution(district) {
  const sites = await SafeSite.findAll({ where: { district, status: 'active' } });
  const assessments = [];
  for (const site of sites) {
    // eslint-disable-next-line no-await-in-loop
    const resources = await SiteResource.findAll({ where: { siteId: site.id } });
    assessments.push({ site, assessment: assessCapacity(site, resources, 0) });
  }

  const suggestions = [];
  for (const { site: shortSite, assessment: shortAssessment } of assessments) {
    const criticalResources = Object.entries(shortAssessment.status).filter(
      ([key, value]) => key !== 'overall' && key !== 'shelter' && value === RESOURCE_STATUS.CRITICAL
    );
    for (const [resourceType] of criticalResources) {
      const donor = assessments.find(
        ({ site: candidate, assessment }) => candidate.id !== shortSite.id
          && assessment.status[resourceType] === RESOURCE_STATUS.SURPLUS
      );
      if (donor) {
        suggestions.push({
          resource: resourceType,
          fromSiteId: donor.site.id,
          fromSiteName: donor.site.name,
          toSiteId: shortSite.id,
          toSiteName: shortSite.name
        });
      }
    }
  }
  return suggestions;
}

module.exports = { assessCapacity, runCapacityCheck, suggestRedistribution };
