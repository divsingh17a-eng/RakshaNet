/* eslint-disable no-console */
/**
 * Seeds a deterministic demo dataset covering every scenario the PRD demo
 * script requires (sec.16): 6+ habitations with different HVI/zones, 4+
 * safe sites with different capacity/resource profiles, 8+ hazard reports,
 * demo accounts for all five roles, one successful single-site relocation
 * (approved + fully executed), one capacity-shortfall/split-allocation
 * scenario, one blocked/congested route scenario, one pending offline
 * report, and one critical resource-gap scenario. Every input here is
 * explicit so downstream totals (population sums, HVI averages) are
 * calculated by the app from these records, not hard-coded.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { connectPostgres } = require('../backend/src/config/postgres');
const {
  sequelize, User, Habitation, SafeSite, SiteResource, HazardReport, Verification, Survey, Route, RelocationPlan
} = require('../backend/src/models/sql');
const { computeHviForHabitation } = require('../backend/src/engines/riskHvi.engine');
const { createPlan, approvePlan } = require('../backend/src/engines/relocationPlanner.engine');
const { ResponseTask } = require('../backend/src/models/sql');
const {
  ROLES, HAZARD_TYPES, REPORT_STATUS, SOURCE_CHANNELS, RESOURCE_TYPES, RESOURCE_UNITS,
  RESOURCE_PER_CAPITA_DAILY_NEED, RESPONSE_TASK_STATUS, RELOCATION_PLAN_STATUS
} = require('../backend/src/config/constants');

const DEMO_PASSWORD = 'RakshaNet@2026';

async function upsertUser(fields) {
  const where = fields.email ? { email: fields.email } : { phone: fields.phone };
  const [user] = await User.findOrCreate({ where, defaults: fields });
  return user;
}

async function seed() {
  await connectPostgres();
  await sequelize.sync({ alter: true });

  // --- 1. Demo accounts for all five roles ---
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const admin = await upsertUser({ name: 'RakshaNet Admin', email: 'admin@rakshanet.demo', passwordHash, role: ROLES.ADMIN, isVerified: true });
  const officer = await upsertUser({ name: 'Anjali Menon (DDMA Officer)', email: 'officer@rakshanet.demo', passwordHash, role: ROLES.DDMA_OFFICER, district: 'Idukki', state: 'Kerala', organization: 'DDMA Idukki', isVerified: true });
  const responder = await upsertUser({ name: 'Rahul Nair (NDRF)', email: 'responder@rakshanet.demo', passwordHash, role: ROLES.RESPONDER, organization: 'NDRF Bn 3', isVerified: true });
  const citizen = await upsertUser({ name: 'Demo Citizen', phone: '+919800000001', role: ROLES.CITIZEN, isVerified: true, metadata: { homeLocation: { lat: 10.0889, lng: 77.0623 } } });
  const volunteer = await upsertUser({ name: 'Demo Volunteer', phone: '+919800000002', role: ROLES.VOLUNTEER, district: 'Idukki', state: 'Kerala', isVerified: true });

  console.log('Demo accounts:');
  console.log(`  Admin      admin@rakshanet.demo / ${DEMO_PASSWORD}`);
  console.log(`  Officer    officer@rakshanet.demo / ${DEMO_PASSWORD}`);
  console.log(`  Responder  responder@rakshanet.demo / ${DEMO_PASSWORD}`);
  console.log(`  Citizen    +919800000001 (OTP logged to console on request)`);
  console.log(`  Volunteer  +919800000002 (OTP logged to console on request)`);

  // --- 2. Six habitations with deliberately different HVI-driving inputs ---
  const habitationSeeds = [
    // vulnerablePopulation/historicalIncidentCount calibrated (real ground-truth
    // attributes, not fake tuning) so Munnar sits at high-Orange baseline and a
    // single freshly-verified severity-5 report - see the pending report seeded
    // below - genuinely crosses it into Red through the real HVI engine. This is
    // the live "Report -> Verify -> Risk Update" demo moment (P0 fix, sec.8.2).
    { name: 'Munnar Hillview Colony', lng: 77.0623, lat: 10.0889, population: 1200, vulnerablePopulation: 540, householdCount: 240, housingType: 'kutcha', roadAccessQuality: 'isolated', distanceToRoadKm: 4.2, historicalIncidentCount: 10 },
    { name: 'Periyar Riverside Basti', lng: 77.1025, lat: 9.9312, population: 2400, vulnerablePopulation: 480, householdCount: 480, housingType: 'semi_pucca', roadAccessQuality: 'poor', distanceToRoadKm: 1.8, historicalIncidentCount: 4 },
    { name: 'Devikulam Tea Estate Quarters', lng: 77.0764, lat: 10.0500, population: 850, vulnerablePopulation: 150, householdCount: 170, housingType: 'kutcha', roadAccessQuality: 'moderate', distanceToRoadKm: 1.1, historicalIncidentCount: 2 },
    { name: 'Cheruthoni Town Ward 4', lng: 76.9744, lat: 9.8438, population: 5200, vulnerablePopulation: 420, householdCount: 1100, housingType: 'pucca', roadAccessQuality: 'good', distanceToRoadKm: 0.2, historicalIncidentCount: 0 },
    { name: 'Anakkara Lakeside Settlement', lng: 76.9710, lat: 9.9020, population: 1600, vulnerablePopulation: 260, householdCount: 320, housingType: 'semi_pucca', roadAccessQuality: 'moderate', distanceToRoadKm: 2.4, historicalIncidentCount: 3 },
    { name: 'Rajakkad Border Hamlet', lng: 76.8710, lat: 9.9520, population: 765, vulnerablePopulation: 210, householdCount: 155, housingType: 'mixed', roadAccessQuality: 'isolated', distanceToRoadKm: 6.5, historicalIncidentCount: 5 }
  ];

  const habitations = [];
  for (const h of habitationSeeds) {
    const { lng, lat, ...habitationFields } = h;
    const [record] = await Habitation.findOrCreate({
      where: { name: h.name },
      defaults: {
        ...habitationFields,
        district: 'Idukki',
        state: 'Kerala',
        location: { type: 'Point', coordinates: [lng, lat] }
      }
    });
    habitations.push(record);
  }
  const [munnar, periyar, devikulam, cheruthoni, anakkara, rajakkad] = habitations;
  console.log(`Habitations ready: ${habitations.length}`);

  // --- 3. Eight+ hazard reports, one left pending (offline, unverified) ---
  const reportSeeds = [
    { habitation: munnar, type: HAZARD_TYPES.LANDSLIDE, severity: 5, daysAgo: 1, verify: 'verified' },
    { habitation: munnar, type: HAZARD_TYPES.LANDSLIDE, severity: 4, daysAgo: 3, verify: 'verified' },
    { habitation: periyar, type: HAZARD_TYPES.FLOOD, severity: 4, daysAgo: 2, verify: 'verified' },
    { habitation: periyar, type: HAZARD_TYPES.FLOOD, severity: 3, daysAgo: 6, verify: 'verified' },
    { habitation: devikulam, type: HAZARD_TYPES.LANDSLIDE, severity: 2, daysAgo: 10, verify: 'verified' },
    { habitation: anakkara, type: HAZARD_TYPES.FLOOD, severity: 3, daysAgo: 4, verify: 'verified' },
    { habitation: rajakkad, type: HAZARD_TYPES.LANDSLIDE, severity: 4, daysAgo: 2, verify: 'verified' },
    { habitation: cheruthoni, type: HAZARD_TYPES.RAINFALL, severity: 1, daysAgo: 8, verify: 'verified' },
    // The one pending offline report the demo script explicitly calls out.
    { habitation: rajakkad, type: HAZARD_TYPES.LANDSLIDE, severity: 3, daysAgo: 0, verify: null, offline: true },
    // Pre-staged, ready to verify live: this is the exact report the demo
    // verifies to trigger the real HVI recompute and watch Munnar cross
    // Orange -> Red on the spot (P0 fix demo moment). Not yet verified on
    // purpose - fixed description so it's unambiguous in the Verification Queue.
    {
      habitation: munnar, type: HAZARD_TYPES.LANDSLIDE, severity: 5, daysAgo: 0, verify: null, tag: 'demo-crossing',
      description: 'Fresh crack widening rapidly above the colony overnight - debris now reaching the first row of houses.'
    }
  ];

  let pendingOfflineReport = null;
  let pendingDemoCrossingReport = null;
  for (const r of reportSeeds) {
    const reportedAt = new Date(Date.now() - r.daysAgo * 24 * 60 * 60 * 1000);
    const [lng, lat] = r.habitation.location.coordinates;
    const [report] = await HazardReport.findOrCreate({
      where: { localUuid: `seed-${r.habitation.name}-${r.type}-${r.daysAgo}-${r.severity}` },
      defaults: {
        localUuid: `seed-${r.habitation.name}-${r.type}-${r.daysAgo}-${r.severity}`,
        reporterId: citizen.id,
        type: r.type,
        severity: r.severity,
        description: r.description || `Seeded demo report near ${r.habitation.name}.`,
        location: { type: 'Point', coordinates: [lng + (Math.random() - 0.5) * 0.01, lat + (Math.random() - 0.5) * 0.01] },
        habitationId: r.habitation.id,
        status: r.verify ? REPORT_STATUS.SUBMITTED : REPORT_STATUS.SUBMITTED,
        sourceChannel: r.offline ? SOURCE_CHANNELS.OFFLINE_APP : SOURCE_CHANNELS.APP,
        reportedAt,
        syncedAt: r.offline ? null : reportedAt
      }
    });

    if (r.verify) {
      const [existingVerification] = await Verification.findOrCreate({
        where: { reportId: report.id },
        defaults: { reportId: report.id, volunteerId: volunteer.id, decision: 'verified', notes: 'Confirmed on ground during seeded demo setup.' }
      });
      void existingVerification;
      await report.update({ status: REPORT_STATUS.VERIFIED });
    } else if (r.tag === 'demo-crossing') {
      pendingDemoCrossingReport = report;
    } else {
      pendingOfflineReport = report;
    }
  }
  console.log(`Hazard reports ready: ${reportSeeds.length} (1 pending offline sync: ${pendingOfflineReport?.id}; 1 pending demo-crossing report on Munnar: ${pendingDemoCrossingReport?.id})`);

  // --- 4. One field survey (feeds housing/structural HVI factor) ---
  await Survey.findOrCreate({
    where: { localUuid: 'seed-survey-munnar-1' },
    defaults: {
      localUuid: 'seed-survey-munnar-1',
      habitationId: munnar.id,
      volunteerId: volunteer.id,
      answersJson: [
        { key: 'roof_material', label: 'Roof material is weather-resistant', answer: false, weight: 2 },
        { key: 'slope_distance', label: 'More than 50m from an active slope', answer: false, weight: 3 },
        { key: 'drainage', label: 'Adequate drainage present', answer: false, weight: 1 }
      ],
      scoreInputs: { computedVulnerabilityScore: 88 },
      geotag: { type: 'Point', coordinates: munnar.location.coordinates },
      notes: 'High-vulnerability structural audit - seeded demo data.',
      status: 'applied',
      surveyedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      appliedAt: new Date()
    }
  });
  console.log('Field survey ready.');

  // --- 5. Four safe sites with different capacity/resource profiles ---
  const siteSeeds = [
    {
      // Capacity deliberately sized so it can absorb Munnar (1,200) alone
      // comfortably, but NOT Munnar + Periyar's full 1,800-priority
      // together (2,600 remaining after Munnar = 1,400 < 1,800) - the
      // shortfall that forces a genuine split allocation to a second site.
      name: 'Adimali Relief Camp', lng: 76.9550, lat: 10.0140, totalCapacity: 2600, safetyRating: 92, accessibilityRating: 85,
      // Sanitation sized for surplus even at full capacity (2600 * 1/20 = 130 required; margin -> 200).
      resources: { [RESOURCE_TYPES.WATER]: 60000, [RESOURCE_TYPES.MEDICAL_BEDS]: 15, [RESOURCE_TYPES.SANITATION]: 200, [RESOURCE_TYPES.FOOD]: 8000 }
    },
    {
      name: 'Nedumkandam Community Hall', lng: 77.1690, lat: 9.8390, totalCapacity: 900, safetyRating: 80, accessibilityRating: 65,
      // Sanitation sized for Adequate at full capacity (900 * 1/20 = 45 required) - "moderate", not critical.
      resources: { [RESOURCE_TYPES.WATER]: 12000, [RESOURCE_TYPES.MEDICAL_BEDS]: 3, [RESOURCE_TYPES.SANITATION]: 50, [RESOURCE_TYPES.FOOD]: 1800 }
    },
    // Deliberately under-resourced -> critical resource-gap scenario.
    {
      name: 'Vandiperiyar School Shelter', lng: 77.0530, lat: 9.6020, totalCapacity: 500, safetyRating: 75, accessibilityRating: 55,
      resources: { [RESOURCE_TYPES.WATER]: 800, [RESOURCE_TYPES.MEDICAL_BEDS]: 0, [RESOURCE_TYPES.SANITATION]: 2, [RESOURCE_TYPES.FOOD]: 200 }
    },
    // Sizable capacity but only reachable via a blocked/congested route ->
    // route scenario. Capped below Periyar's 1,800 priority population so
    // that NO single site in range (Adimali's post-Munnar remainder is
    // 1,400; this is 1,600) can absorb it alone - guaranteeing a genuine
    // split allocation regardless of which site the matching engine ranks
    // first, rather than depending on exact score arithmetic to work out.
    {
      name: 'Kattappana Stadium Camp', lng: 77.1110, lat: 9.7540, totalCapacity: 1600, safetyRating: 88, accessibilityRating: 70,
      resources: { [RESOURCE_TYPES.WATER]: 70000, [RESOURCE_TYPES.MEDICAL_BEDS]: 10, [RESOURCE_TYPES.SANITATION]: 220, [RESOURCE_TYPES.FOOD]: 9000 }
    }
  ];

  const safeSites = [];
  for (const s of siteSeeds) {
    const [site] = await SafeSite.findOrCreate({
      where: { name: s.name },
      defaults: {
        name: s.name,
        district: 'Idukki',
        state: 'Kerala',
        type: 'relief_camp',
        location: { type: 'Point', coordinates: [s.lng, s.lat] },
        totalCapacity: s.totalCapacity,
        safetyRating: s.safetyRating,
        accessibilityRating: s.accessibilityRating,
        powerBackup: true
      }
    });
    safeSites.push(site);

    for (const [resourceType, quantity] of Object.entries(s.resources)) {
      await SiteResource.findOrCreate({
        where: { siteId: site.id, resourceType },
        defaults: { siteId: site.id, resourceType, quantity, dailyNeed: RESOURCE_PER_CAPITA_DAILY_NEED[resourceType], unit: RESOURCE_UNITS[resourceType] }
      });
    }
  }
  const [adimali, nedumkandam, vandiperiyar, kattappana] = safeSites;
  console.log(`Safe sites ready: ${safeSites.length} (Vandiperiyar seeded with critical resource gaps)`);

  // --- 6. Routes, including one blocked and one congested (with alternates) ---
  await Route.findOrCreate({
    where: { sourceId: munnar.id, destinationId: adimali.id },
    defaults: { sourceId: munnar.id, destinationId: adimali.id, distanceKm: 22.4, durationMin: 45, status: 'clear', lastCheckedAt: new Date() }
  });
  const [blockedRoute] = await Route.findOrCreate({
    where: { sourceId: rajakkad.id, destinationId: kattappana.id },
    defaults: { sourceId: rajakkad.id, destinationId: kattappana.id, distanceKm: 38.1, durationMin: 90, status: 'blocked', lastCheckedAt: new Date() }
  });
  const [alternateRoute] = await Route.findOrCreate({
    where: { sourceId: rajakkad.id, destinationId: adimali.id },
    defaults: { sourceId: rajakkad.id, destinationId: adimali.id, distanceKm: 41.0, durationMin: 95, status: 'clear', lastCheckedAt: new Date() }
  });
  await blockedRoute.update({ alternateId: alternateRoute.id });
  await Route.findOrCreate({
    where: { sourceId: periyar.id, destinationId: kattappana.id },
    defaults: { sourceId: periyar.id, destinationId: kattappana.id, distanceKm: 15.6, durationMin: 55, status: 'congested', lastCheckedAt: new Date() }
  });
  console.log('Routes ready (1 blocked with alternate, 1 congested).');

  // --- 7. Compute real HVI/risk/zone for every habitation from the data above ---
  for (const h of habitations) {
    // eslint-disable-next-line no-await-in-loop
    await computeHviForHabitation(h.id);
  }
  console.log('HVI/risk scores computed from seeded reports, survey, and habitation inputs.');

  // --- 8. One successful single-site relocation, fully executed end-to-end ---
  // createPlan/approvePlan always INSERT a new row (they're live-operation
  // engine functions, not idempotent findOrCreate helpers) - guard explicitly
  // so re-running this script doesn't pile up duplicate plans on every run.
  let existingMunnarPlan = await RelocationPlan.findOne({ where: { habitationId: munnar.id } });
  if (!existingMunnarPlan) {
    const munnarPlan = await createPlan(munnar.id, { createdBy: officer.id });
    const approvedMunnarPlan = await approvePlan(munnarPlan.id, officer.id, {});
    // approvePlan already creates the plan's ResponseTask (status Assigned) - advance
    // that same row through the rest of its lifecycle rather than creating a second one.
    const task = await ResponseTask.findOne({ where: { planId: approvedMunnarPlan.id } });
    await task.update({ responderId: responder.id, status: RESPONSE_TASK_STATUS.EN_ROUTE, enRouteAt: new Date() });
    await task.update({ status: RESPONSE_TASK_STATUS.ON_SITE, onSiteAt: new Date() });
    await task.update({ status: RESPONSE_TASK_STATUS.RESOLVED, resolvedAt: new Date() });
    // Mirrors the auto-complete side effect responseTasks.controller.js applies
    // when a task reaches Resolved via the real API - seed.js updates the task
    // model directly (no HTTP round trip), so it has to replicate that step
    // explicitly rather than relying on controller logic that never runs here.
    await approvedMunnarPlan.update({ status: RELOCATION_PLAN_STATUS.COMPLETED });
    existingMunnarPlan = approvedMunnarPlan;
    console.log('Successful single-site relocation: Munnar Hillview Colony -> approved, dispatched, resolved.');
  } else {
    console.log(`Munnar Hillview Colony relocation plan already exists (${existingMunnarPlan.id}) - skipped.`);
  }

  // --- 9. Capacity-shortfall / split-allocation scenario ---
  // Periyar's large population (2400) exceeds any single site's spare capacity
  // in range, so the matching engine will split it across Adimali + Nedumkandam.
  let existingPeriyarPlan = await RelocationPlan.findOne({ where: { habitationId: periyar.id } });
  if (!existingPeriyarPlan) {
    existingPeriyarPlan = await createPlan(periyar.id, {
      createdBy: officer.id,
      priorityPopulation: 1800 // explicitly less than the full 2400 affected, to demo the "affected vs prioritized" UI requirement
    });
    console.log(`Split-allocation demo plan ready for Periyar Riverside Basti (plan ${existingPeriyarPlan.id}), left Pending Approval for the live demo.`);
  } else {
    console.log(`Periyar Riverside Basti relocation plan already exists (${existingPeriyarPlan.id}) - skipped.`);
  }

  console.log('\nSeed complete.');
  console.log('Log in to the web Command Center as officer@rakshanet.demo, or run the mobile app as +919800000001 (citizen) / +919800000002 (volunteer).');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
