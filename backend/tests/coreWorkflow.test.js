const crypto = require('crypto');
const request = require('supertest');
const createApp = require('../src/app');
const {
  sequelize, User, Habitation, SafeSite, SiteResource, HazardReport,
  Verification, RelocationPlan, RelocationAllocation, ResponseTask
} = require('../src/models/sql');
const { signAccessToken } = require('../src/services/token.service');
const {
  ROLES, HAZARD_TYPES, RESOURCE_TYPES, RESOURCE_UNITS, RESPONSE_TASK_STATUS, RELOCATION_PLAN_STATUS
} = require('../src/config/constants');

jest.setTimeout(30000);

// Deliberately far (>150km, the matching engine's search radius) from every
// seeded Kerala demo habitation/safe-site, so this test's own fixtures are
// the only candidates the matching/stress-test engines ever see - it can't
// perturb the live demo data, and the live demo data can't perturb it.
const TEST_LOCATION = { lng: 77.209, lat: 28.6139 }; // New Delhi

/**
 * One end-to-end run of the core RakshaNet chain, against the real HTTP
 * routes, real engines, and real database - no mocks. Exercises the exact
 * workflow a judge demo walks through: Report -> Verify (which must
 * auto-trigger a real HVI recompute) -> Relocation Plan -> Approve (real
 * capacity change + response task dispatch).
 */
describe('Core workflow: Report -> Verify -> Recompute HVI -> Plan -> Approve -> ResponseTask', () => {
  let app;
  let citizen, volunteer, officer;
  let habitation, safeSite;
  let reportId, planId;

  beforeAll(async () => {
    await sequelize.authenticate();
    app = createApp();

    const suffix = Date.now();
    citizen = await User.create({ name: 'IT Citizen', phone: `it-citizen-${suffix}`, role: ROLES.CITIZEN, isVerified: true });
    volunteer = await User.create({ name: 'IT Volunteer', phone: `it-volunteer-${suffix}`, role: ROLES.VOLUNTEER, isVerified: true });
    officer = await User.create({ name: 'IT Officer', email: `it-officer-${suffix}@rakshanet.test`, role: ROLES.DDMA_OFFICER, isVerified: true });

    habitation = await Habitation.create({
      name: 'Integration Test Habitation',
      district: 'Integration Test District',
      state: 'Integration Test State',
      location: { type: 'Point', coordinates: [TEST_LOCATION.lng, TEST_LOCATION.lat] },
      population: 100,
      vulnerablePopulation: 50,
      householdCount: 25,
      housingType: 'kutcha',
      roadAccessQuality: 'isolated',
      distanceToRoadKm: 5,
      historicalIncidentCount: 2
    });

    safeSite = await SafeSite.create({
      name: 'Integration Test Safe Site',
      district: 'Integration Test District',
      state: 'Integration Test State',
      type: 'relocation_site',
      location: { type: 'Point', coordinates: [TEST_LOCATION.lng, TEST_LOCATION.lat] },
      totalCapacity: 500,
      occupiedCapacity: 0,
      safetyRating: 90,
      accessibilityRating: 90,
      powerBackup: true,
      status: 'active'
    });

    // Generously stocked so the stress test passes for the whole 100-person
    // habitation landing on this one site.
    await SiteResource.bulkCreate([
      { siteId: safeSite.id, resourceType: RESOURCE_TYPES.WATER, quantity: 10000, dailyNeed: 15, unit: RESOURCE_UNITS[RESOURCE_TYPES.WATER] },
      { siteId: safeSite.id, resourceType: RESOURCE_TYPES.MEDICAL_BEDS, quantity: 5, dailyNeed: 1 / 500, unit: RESOURCE_UNITS[RESOURCE_TYPES.MEDICAL_BEDS] },
      { siteId: safeSite.id, resourceType: RESOURCE_TYPES.SANITATION, quantity: 50, dailyNeed: 1 / 20, unit: RESOURCE_UNITS[RESOURCE_TYPES.SANITATION] },
      { siteId: safeSite.id, resourceType: RESOURCE_TYPES.FOOD, quantity: 1000, dailyNeed: 2.1, unit: RESOURCE_UNITS[RESOURCE_TYPES.FOOD] }
    ]);
  });

  afterAll(async () => {
    // FK-safe teardown so this test never leaves fixtures behind in the
    // shared dev database, regardless of pass/fail.
    if (planId) {
      await ResponseTask.destroy({ where: { planId } });
      await RelocationAllocation.destroy({ where: { planId } });
      await RelocationPlan.destroy({ where: { id: planId } });
    }
    if (reportId) {
      await Verification.destroy({ where: { reportId } });
      await HazardReport.destroy({ where: { id: reportId } });
    }
    if (safeSite) {
      await SiteResource.destroy({ where: { siteId: safeSite.id } });
      await SafeSite.destroy({ where: { id: safeSite.id } });
    }
    if (habitation) await Habitation.destroy({ where: { id: habitation.id } }); // cascades its RiskScore rows
    if (citizen) await User.destroy({ where: { id: citizen.id } });
    if (volunteer) await User.destroy({ where: { id: volunteer.id } });
    if (officer) await User.destroy({ where: { id: officer.id } });
    await sequelize.close();
  });

  test('runs end-to-end with real DB side effects at every step', async () => {
    const citizenToken = signAccessToken(citizen);
    const volunteerToken = signAccessToken(volunteer);
    const officerToken = signAccessToken(officer);

    // 1. Citizen submits a hazard report against the test habitation.
    const submitRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        localUuid: crypto.randomUUID(),
        type: HAZARD_TYPES.LANDSLIDE,
        severity: 5,
        description: 'Integration test report',
        lng: TEST_LOCATION.lng,
        lat: TEST_LOCATION.lat,
        habitationId: habitation.id
      });
    expect(submitRes.status).toBe(201);
    reportId = submitRes.body.report.id;

    const hviBefore = (await Habitation.findByPk(habitation.id)).currentHvi;
    expect(hviBefore).toBe(0); // no verified reports yet -> baseline HVI is 0

    // 2. Volunteer verifies it - this must auto-trigger a real HVI recompute
    // (the P0 fix: verification -> risk engine -> DB, no manual step needed).
    const verifyRes = await request(app)
      .post(`/api/reports/${reportId}/verify`)
      .set('Authorization', `Bearer ${volunteerToken}`)
      .send({ decision: 'verified' });
    expect(verifyRes.status).toBe(201);
    expect(verifyRes.body.riskUpdate).toBeTruthy();
    expect(verifyRes.body.riskUpdate.count).toBeGreaterThan(0);

    const habitationAfterVerify = await Habitation.findByPk(habitation.id);
    expect(habitationAfterVerify.currentHvi).toBeGreaterThan(hviBefore);
    expect(habitationAfterVerify.lastCalculatedAt).toBeTruthy();

    // 3. Officer generates a relocation plan via the real matching engine.
    const planRes = await request(app)
      .post('/api/relocation/plans')
      .set('Authorization', `Bearer ${officerToken}`)
      .send({ habitationId: habitation.id });
    expect(planRes.status).toBe(201);
    const plan = planRes.body.relocationPlan;
    planId = plan.id;
    expect(plan.status).toBe(RELOCATION_PLAN_STATUS.PENDING_APPROVAL);
    expect(plan.allocations.length).toBeGreaterThan(0);
    expect(plan.allocations[0].site.id).toBe(safeSite.id);
    expect(plan.stressTestResult.passed).toBe(true);

    // 4. Officer approves - real capacity change + response task dispatch.
    const approveRes = await request(app)
      .patch(`/api/relocation/plans/${planId}`)
      .set('Authorization', `Bearer ${officerToken}`)
      .send({ action: 'approve' });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.relocationPlan.status).toBe(RELOCATION_PLAN_STATUS.APPROVED);

    const siteAfterApproval = await SafeSite.findByPk(safeSite.id);
    expect(siteAfterApproval.occupiedCapacity).toBe(plan.affectedPopulation);

    const task = await ResponseTask.findOne({ where: { planId } });
    expect(task).toBeTruthy();
    expect(task.status).toBe(RESPONSE_TASK_STATUS.ASSIGNED);
  });
});
