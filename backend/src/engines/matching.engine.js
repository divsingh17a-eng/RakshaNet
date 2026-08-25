const { QueryTypes } = require('sequelize');
const { sequelize, SafeSite, SiteResource, Route } = require('../models/sql');
const { MATCH_WEIGHTS, ROUTE_STATUS, SAFE_SITE_STATUS } = require('../config/constants');
const { assessCapacity } = require('./capacity.engine');

/**
 * Strategic site matching (PRD sec.6): ranks candidate safe sites for a
 * habitation on Safety (30%) + Capacity Fit (25%) + Accessibility (15%) +
 * Distance (15%) + Resource Sufficiency (10%) + Route Reliability (5%),
 * each 0-100. Unsafe sites are excluded outright. Returns the top 3
 * candidates with their component breakdown and a "why this site" rationale.
 */

const SAFETY_EXCLUSION_THRESHOLD = 40; // sites below this safety rating are excluded entirely
const SEARCH_RADIUS_M = 150000; // consider sites within 150km

const ROUTE_RELIABILITY_SCORE = {
  [ROUTE_STATUS.CLEAR]: 100,
  [ROUTE_STATUS.CONGESTED]: 60,
  [ROUTE_STATUS.BLOCKED]: 0,
  [ROUTE_STATUS.UNKNOWN]: 50
};

function capacityFitScore(availableCapacity, populationNeeded) {
  if (populationNeeded <= 0) return 100;
  return Math.max(0, Math.min(100, (availableCapacity / populationNeeded) * 100));
}

function distanceScore(distanceKm) {
  // Linear decay: 0km -> 100, 50km+ -> 0.
  return Math.max(0, Math.min(100, 100 - distanceKm * 2));
}

async function findRouteFor(habitationId, siteId) {
  return Route.findOne({ where: { sourceId: habitationId, destinationId: siteId } });
}

/**
 * Scores every active, safe, in-range candidate site for one habitation.
 * @returns {Promise<Array>} candidates sorted by matchScore desc, each with
 *   { site, distanceKm, matchScore, components, rationale, capacityAssessment, route }
 */
async function rankCandidateSites(habitation, populationNeeded) {
  const rows = await sequelize.query(
    `
    SELECT s.id, ST_Distance(s.location::geography, h.location::geography) / 1000.0 AS distance_km
    FROM safe_sites s
    JOIN habitations h ON h.id = :habitationId
    WHERE s.status = :active
      AND s.safety_rating >= :safetyThreshold
      AND ST_DWithin(s.location::geography, h.location::geography, :radius)
    ORDER BY distance_km ASC
    LIMIT 15
    `,
    {
      replacements: {
        habitationId: habitation.id,
        active: SAFE_SITE_STATUS.ACTIVE,
        safetyThreshold: SAFETY_EXCLUSION_THRESHOLD,
        radius: SEARCH_RADIUS_M
      },
      type: QueryTypes.SELECT
    }
  );

  const candidates = [];
  for (const row of rows) {
    // eslint-disable-next-line no-await-in-loop
    const site = await SafeSite.findByPk(row.id);
    // eslint-disable-next-line no-await-in-loop
    const resources = await SiteResource.findAll({ where: { siteId: site.id } });
    const capacityAssessment = assessCapacity(site, resources, 0); // capacity fit uses *available* capacity, not a hypothetical add

    // eslint-disable-next-line no-await-in-loop
    const route = await findRouteFor(habitation.id, site.id);
    const routeStatus = route?.status || ROUTE_STATUS.UNKNOWN;

    const components = {
      safety: site.safetyRating,
      capacityFit: capacityFitScore(capacityAssessment.availableCapacity, populationNeeded),
      accessibility: site.accessibilityRating,
      distance: distanceScore(row.distance_km),
      resourceSufficiency: capacityAssessment.resourceSufficiencyScore,
      routeReliability: ROUTE_RELIABILITY_SCORE[routeStatus]
    };

    const matchScore = Object.entries(MATCH_WEIGHTS).reduce(
      (sum, [key, weight]) => sum + components[key] * weight,
      0
    );

    const rationale = Object.entries(components)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([key, value]) => `${labelForComponent(key)}: ${Math.round(value)}/100`);

    candidates.push({
      site,
      distanceKm: Math.round(row.distance_km * 10) / 10,
      matchScore: Math.round(matchScore * 10) / 10,
      components,
      rationale,
      capacityAssessment,
      routeId: route?.id || null
    });
  }

  candidates.sort((a, b) => b.matchScore - a.matchScore);
  return candidates;
}

function labelForComponent(key) {
  const labels = {
    safety: 'Site safety rating',
    capacityFit: 'Capacity fit',
    accessibility: 'Accessibility',
    distance: 'Proximity',
    resourceSufficiency: 'Resource sufficiency',
    routeReliability: 'Route reliability'
  };
  return labels[key] || key;
}

/**
 * Pure allocation splitter (no DB): walks ranked candidates best-first and
 * fills each one's available capacity until `populationNeeded` is placed or
 * candidates run out (PRD sec.6: "If one site cannot accommodate the
 * prioritized population, generate a split allocation"). Separated from
 * recommendAllocation so it's unit-testable without a database.
 */
function splitAllocationAcrossCandidates(candidates, populationNeeded) {
  const allocations = [];
  let remaining = populationNeeded;

  for (const candidate of candidates) {
    if (remaining <= 0) break;
    const { availableCapacity } = candidate.capacityAssessment;
    if (availableCapacity <= 0) continue; // eslint-disable-line no-continue

    const populationToAllocate = Math.min(remaining, availableCapacity);
    allocations.push({
      site: candidate.site,
      population: populationToAllocate,
      matchScore: candidate.matchScore,
      components: candidate.components,
      rationale: candidate.rationale,
      capacityBefore: candidate.site.occupiedCapacity,
      capacityAfter: candidate.site.occupiedCapacity + populationToAllocate,
      distanceKm: candidate.distanceKm,
      routeId: candidate.routeId
    });
    remaining -= populationToAllocate;
  }

  return { allocations, remaining };
}

/**
 * Allocates `populationNeeded` across ranked candidates, splitting across
 * multiple sites if the single best site cannot absorb everyone.
 */
async function recommendAllocation(habitation, populationNeeded) {
  const candidates = await rankCandidateSites(habitation, populationNeeded);
  if (candidates.length === 0) {
    return { allocations: [], unallocatedPopulation: populationNeeded, candidatesConsidered: 0 };
  }

  const { allocations, remaining } = splitAllocationAcrossCandidates(candidates, populationNeeded);

  return {
    allocations,
    unallocatedPopulation: Math.max(0, remaining),
    candidatesConsidered: candidates.length,
    topCandidates: candidates.slice(0, 3).map((c) => ({
      siteId: c.site.id,
      siteName: c.site.name,
      matchScore: c.matchScore,
      components: c.components,
      rationale: c.rationale,
      distanceKm: c.distanceKm
    }))
  };
}

module.exports = {
  rankCandidateSites,
  recommendAllocation,
  splitAllocationAcrossCandidates,
  capacityFitScore,
  distanceScore,
  labelForComponent,
  SAFETY_EXCLUSION_THRESHOLD
};
