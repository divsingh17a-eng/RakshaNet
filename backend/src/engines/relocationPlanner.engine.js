const {
  sequelize, Habitation, SafeSite, SiteResource, RelocationPlan, RelocationAllocation, ResponseTask
} = require('../models/sql');
const { ZONE_COLORS, RELOCATION_URGENCY, RELOCATION_PLAN_STATUS, RESPONSE_TASK_STATUS, RESOURCE_STATUS } = require('../config/constants');
const { recommendAllocation } = require('./matching.engine');
const { assessCapacity } = require('./capacity.engine');

/**
 * Relocation planning & human-in-the-loop approval (PRD sec.6/7, FR-13/16/17).
 * AI only recommends - a plan never changes site occupancy until an officer
 * explicitly approves it (see approvePlan).
 */

function priorityTierForZone(zoneColor) {
  if (zoneColor === ZONE_COLORS.RED) return RELOCATION_URGENCY.IMMEDIATE;
  if (zoneColor === ZONE_COLORS.ORANGE) return RELOCATION_URGENCY.SHORT_TERM;
  return RELOCATION_URGENCY.MEDIUM_TERM; // yellow
}

function rankScoreFor(habitation) {
  const populationFactor = Math.min(1, Math.log10(habitation.population + 1) / Math.log10(20000));
  return Math.round((habitation.currentHvi * 0.6 + populationFactor * 100 * 0.4) * 10) / 10;
}

/**
 * Generates an AI recommendation for one habitation without persisting
 * anything - used by POST /api/relocation/recommend so an officer can
 * preview before creating a plan.
 */
async function buildRecommendation(habitationId, priorityPopulation) {
  const habitation = await Habitation.findByPk(habitationId);
  if (!habitation) throw new Error(`Habitation ${habitationId} not found`);

  const populationNeeded = priorityPopulation ?? habitation.population;
  const allocationResult = await recommendAllocation(habitation, populationNeeded);

  const priorityTier = priorityTierForZone(habitation.currentZone);
  const reasons = [
    `Habitation is in the ${habitation.currentZone.toUpperCase()} zone (HVI ${habitation.currentHvi}).`,
    allocationResult.allocations.length > 1
      ? `No single site had enough available capacity - split across ${allocationResult.allocations.length} sites.`
      : allocationResult.allocations.length === 1
        ? `Best available site matched on safety, capacity, accessibility, distance, resources, and route reliability.`
        : 'No active safe site currently has available capacity in range - flagged for manual review or redistribution.'
  ];

  return {
    habitation,
    priorityTier,
    affectedPopulation: habitation.population,
    priorityPopulation: populationNeeded,
    reasons,
    ...allocationResult
  };
}

/**
 * Runs a "what happens if we approve this" stress test: re-checks every
 * allocation's destination site capacity/resources with the incoming
 * population folded in, flagging anything that would go Critical.
 */
async function runStressTest(allocations) {
  const issues = [];
  for (const allocation of allocations) {
    // eslint-disable-next-line no-await-in-loop
    const site = await SafeSite.findByPk(allocation.siteId);
    // eslint-disable-next-line no-await-in-loop
    const resources = await SiteResource.findAll({ where: { siteId: allocation.siteId } });
    const assessment = assessCapacity(site, resources, allocation.population);
    if (assessment.status.overall === RESOURCE_STATUS.CRITICAL) {
      const criticalResources = Object.entries(assessment.status)
        .filter(([key, value]) => key !== 'overall' && value === RESOURCE_STATUS.CRITICAL)
        .map(([key]) => key);
      issues.push({ siteId: site.id, siteName: site.name, criticalResources });
    }
  }
  return { passed: issues.length === 0, issues, checkedAt: new Date().toISOString() };
}

/**
 * Persists a recommendation as a Draft/Pending-Approval plan with its
 * allocations (POST /api/relocation/plans).
 */
async function createPlan(habitationId, { priorityPopulation, createdBy } = {}) {
  const recommendation = await buildRecommendation(habitationId, priorityPopulation);
  const { habitation, priorityTier, affectedPopulation, reasons, allocations } = recommendation;

  const rankScore = rankScoreFor(habitation);
  const stressTest = await runStressTest(
    allocations.map((a) => ({ siteId: a.site.id, population: a.population }))
  );

  return sequelize.transaction(async (t) => {
    const plan = await RelocationPlan.create(
      {
        habitationId,
        priorityTier,
        affectedPopulation,
        priorityPopulation: recommendation.priorityPopulation,
        hviSnapshot: habitation.currentHvi,
        zoneSnapshot: habitation.currentZone,
        rankScore,
        status: RELOCATION_PLAN_STATUS.PENDING_APPROVAL,
        recommendationReasons: reasons,
        stressTestResult: stressTest,
        createdBy: createdBy || null
      },
      { transaction: t }
    );

    for (const allocation of allocations) {
      // eslint-disable-next-line no-await-in-loop
      await RelocationAllocation.create(
        {
          planId: plan.id,
          siteId: allocation.site.id,
          population: allocation.population,
          matchScore: allocation.matchScore,
          matchComponents: allocation.components,
          matchRationale: allocation.rationale,
          capacityBefore: allocation.capacityBefore,
          capacityAfter: allocation.capacityAfter,
          routeId: allocation.routeId
        },
        { transaction: t }
      );
    }

    return plan;
  });
}

/**
 * Generates/refreshes recommended plans for every at-risk (Red/Orange/Yellow)
 * habitation - the "Relocation Planner" ranked list.
 */
async function generateRelocationPlans({ createdBy = null } = {}) {
  const atRiskHabitations = await Habitation.findAll({
    where: { currentZone: [ZONE_COLORS.RED, ZONE_COLORS.ORANGE, ZONE_COLORS.YELLOW] },
    order: [['currentHvi', 'DESC']]
  });

  const plans = [];
  for (const habitation of atRiskHabitations) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await RelocationPlan.findOne({
      where: { habitationId: habitation.id, status: [RELOCATION_PLAN_STATUS.DRAFT, RELOCATION_PLAN_STATUS.PENDING_APPROVAL] }
    });
    if (existing) {
      plans.push(existing);
      continue; // eslint-disable-line no-continue
    }
    // eslint-disable-next-line no-await-in-loop
    const plan = await createPlan(habitation.id, { createdBy });
    plans.push(plan);
  }

  plans.sort((a, b) => b.rankScore - a.rankScore);
  return plans;
}

/**
 * Officer approval (FR-17). Only on approval does site occupancy actually
 * change - never before. `overrideStressTestWarnings` lets an officer
 * knowingly proceed despite a flagged capacity/resource overload.
 */
async function approvePlan(planId, approverId, { overrideStressTestWarnings = false } = {}) {
  const plan = await RelocationPlan.findByPk(planId, { include: [{ model: RelocationAllocation, as: 'allocations' }] });
  if (!plan) throw new Error(`RelocationPlan ${planId} not found`);

  const freshStressTest = await runStressTest(plan.allocations.map((a) => ({ siteId: a.siteId, population: a.population })));
  if (!freshStressTest.passed && !overrideStressTestWarnings) {
    const err = new Error('Stress test detected a capacity/resource overload. Resolve it or set overrideStressTestWarnings to proceed.');
    err.statusCode = 409;
    err.details = freshStressTest;
    throw err;
  }

  return sequelize.transaction(async (t) => {
    await plan.update(
      {
        status: RELOCATION_PLAN_STATUS.APPROVED,
        approvedBy: approverId,
        approvedAt: new Date(),
        stressTestResult: freshStressTest
      },
      { transaction: t }
    );

    for (const allocation of plan.allocations) {
      // eslint-disable-next-line no-await-in-loop
      const site = await SafeSite.findByPk(allocation.siteId, { transaction: t });
      // eslint-disable-next-line no-await-in-loop
      await site.update({ occupiedCapacity: site.occupiedCapacity + allocation.population }, { transaction: t });
    }

    await ResponseTask.create(
      { planId: plan.id, status: RESPONSE_TASK_STATUS.ASSIGNED, assignedAt: new Date() },
      { transaction: t }
    );

    return plan;
  });
}

async function modifyOrRejectPlan(planId, actorId, { status, decisionNotes }) {
  if (!decisionNotes) throw Object.assign(new Error('decisionNotes is required to modify or reject a plan'), { statusCode: 400 });

  const plan = await RelocationPlan.findByPk(planId);
  if (!plan) throw new Error(`RelocationPlan ${planId} not found`);

  await plan.update({ status, decisionNotes, approvedBy: actorId });
  return plan;
}

module.exports = {
  priorityTierForZone,
  rankScoreFor,
  buildRecommendation,
  runStressTest,
  createPlan,
  generateRelocationPlans,
  approvePlan,
  modifyOrRejectPlan
};
