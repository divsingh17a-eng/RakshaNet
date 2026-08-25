const { RelocationPlan, RelocationAllocation, Habitation, SafeSite } = require('../models/sql');
const { ApiError } = require('../middleware/errorHandler');
const {
  buildRecommendation, createPlan, generateRelocationPlans, approvePlan, modifyOrRejectPlan, runStressTest
} = require('../engines/relocationPlanner.engine');
const { RELOCATION_PLAN_STATUS } = require('../config/constants');
const { recordAudit } = require('../services/audit.service');
const { raiseAlert } = require('../services/alert.service');

const PLAN_INCLUDES = [
  { model: Habitation, as: 'habitation' },
  { model: RelocationAllocation, as: 'allocations', include: [{ model: SafeSite, as: 'site' }] }
];

// POST /api/relocation/recommend - AI recommendation preview, nothing persisted (FR-16).
async function recommend(req, res, next) {
  const { habitationId, priorityPopulation } = req.body;
  if (!habitationId) return next(new ApiError(400, 'habitationId is required'));

  const recommendation = await buildRecommendation(habitationId, priorityPopulation);
  res.json({ success: true, recommendation });
}

// POST /api/relocation/plans - persists a recommendation as a Pending-Approval plan.
async function createRelocationPlan(req, res, next) {
  const { habitationId, priorityPopulation } = req.body;
  if (!habitationId) return next(new ApiError(400, 'habitationId is required'));

  const plan = await createPlan(habitationId, { priorityPopulation, createdBy: req.user.id });
  const full = await RelocationPlan.findByPk(plan.id, { include: PLAN_INCLUDES });

  const io = req.app.get('io');
  if (io) io.emit('relocationPlan:created', full);

  res.status(201).json({ success: true, relocationPlan: full });
}

async function listPlans(req, res) {
  const { priorityTier, status } = req.query;
  const where = {};
  if (priorityTier) where.priorityTier = priorityTier;
  if (status) where.status = status;

  const plans = await RelocationPlan.findAll({ where, include: PLAN_INCLUDES, order: [['rankScore', 'DESC']] });
  res.json({ success: true, relocationPlans: plans });
}

// Runs the ranking + matching engine across every at-risk habitation.
async function generatePlans(req, res) {
  const plans = await generateRelocationPlans({ createdBy: req.user.id });

  const io = req.app.get('io');
  if (io) io.emit('relocationPlans:generated', { count: plans.length });

  res.json({ success: true, count: plans.length, relocationPlans: plans });
}

async function getPlanDetail(req, res) {
  const plan = await RelocationPlan.findByPk(req.params.id, { include: PLAN_INCLUDES });
  if (!plan) throw new ApiError(404, 'Relocation plan not found');
  res.json({ success: true, relocationPlan: plan });
}

// PATCH /api/relocation/plans/:id - officer Approve / Modify / Reject (FR-17). Modification/rejection reason required.
async function updatePlanStatus(req, res) {
  const { action, decisionNotes, overrideStressTestWarnings } = req.body;
  if (!['approve', 'modify', 'reject'].includes(action)) {
    throw new ApiError(400, "action must be one of: approve, modify, reject");
  }

  let plan;
  const before = await RelocationPlan.findByPk(req.params.id);
  if (!before) throw new ApiError(404, 'Relocation plan not found');
  const beforeState = { status: before.status };

  if (action === 'approve') {
    plan = await approvePlan(req.params.id, req.user.id, { overrideStressTestWarnings: Boolean(overrideStressTestWarnings) });
  } else {
    const status = action === 'modify' ? RELOCATION_PLAN_STATUS.DRAFT : RELOCATION_PLAN_STATUS.REJECTED;
    plan = await modifyOrRejectPlan(req.params.id, req.user.id, { status, decisionNotes });
  }

  await recordAudit({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: `relocation_plan.${action}`,
    entityType: 'RelocationPlan',
    entityId: plan.id,
    before: beforeState,
    after: { status: plan.status },
    req
  });

  const io = req.app.get('io');
  if (io) io.emit('relocationPlan:updated', { planId: plan.id, status: plan.status, action });

  if (action === 'approve') {
    const habitation = await Habitation.findByPk(plan.habitationId);
    if (habitation) {
      await raiseAlert({
        district: habitation.district,
        type: 'relocation',
        title: 'Relocation plan approved',
        message: `A relocation plan for ${habitation.name} has been approved. Response teams are being dispatched.`,
        zone: habitation.currentZone,
        relatedHabitationId: habitation.id,
        io
      });
    }
  }

  const full = await RelocationPlan.findByPk(plan.id, { include: PLAN_INCLUDES });
  res.json({ success: true, relocationPlan: full });
}

// GET /api/relocation/plans/:id/recheck - "Conditions Changed" re-check for an approved plan.
// Read-only: re-runs the same stress test used at approval time against each
// allocation's site as it stands right now, and compares the habitation's
// live HVI/zone against the snapshot captured when the plan was made. Never
// mutates the plan - an officer decides what to do with the result.
async function recheckPlan(req, res) {
  const plan = await RelocationPlan.findByPk(req.params.id, {
    include: [
      { model: RelocationAllocation, as: 'allocations' },
      { model: Habitation, as: 'habitation' }
    ]
  });
  if (!plan) throw new ApiError(404, 'Relocation plan not found');

  const stressTest = await runStressTest(plan.allocations.map((a) => ({ siteId: a.siteId, population: a.population })));
  const hviChanged = plan.hviSnapshot !== null && plan.habitation.currentHvi !== plan.hviSnapshot;
  const zoneChanged = plan.zoneSnapshot !== null && plan.habitation.currentZone !== plan.zoneSnapshot;
  const conditionsChanged = !stressTest.passed || hviChanged || zoneChanged;

  res.json({
    success: true,
    recheck: {
      conditionsChanged,
      stressTestPassed: stressTest.passed,
      issues: stressTest.issues,
      hviChanged,
      zoneChanged,
      hviSnapshot: plan.hviSnapshot,
      currentHvi: plan.habitation.currentHvi,
      zoneSnapshot: plan.zoneSnapshot,
      currentZone: plan.habitation.currentZone,
      checkedAt: stressTest.checkedAt
    }
  });
}

module.exports = { recommend, createRelocationPlan, listPlans, generatePlans, getPlanDetail, updatePlanStatus, recheckPlan };
