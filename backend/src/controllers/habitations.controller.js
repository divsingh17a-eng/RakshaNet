const { QueryTypes } = require('sequelize');
const { sequelize, Habitation, HazardReport, Survey, RelocationPlan, RelocationAllocation, SafeSite, RiskScore } = require('../models/sql');
const { ApiError } = require('../middleware/errorHandler');
const { computeHviForHabitation } = require('../engines/riskHvi.engine');

// Fields that feed directly into the HVI factor calculations (riskHvi.engine.js)
// - editing any of these makes the cached currentHvi/currentZone stale.
const HVI_INPUT_FIELDS = ['population', 'vulnerablePopulation', 'housingType', 'roadAccessQuality', 'distanceToRoadKm', 'historicalIncidentCount'];

function toGeoPoint(lng, lat) {
  return { type: 'Point', coordinates: [lng, lat] };
}

async function listHabitations(req, res) {
  const { district, zone } = req.query;
  const where = {};
  if (district) where.district = district;
  if (zone) where.currentZone = zone;

  const habitations = await Habitation.findAll({ where, order: [['currentHvi', 'DESC']] });
  res.json({ success: true, habitations });
}

async function createHabitation(req, res, next) {
  const { name, district, state, lng, lat, population, vulnerablePopulation, householdCount, housingType, roadAccessQuality, distanceToRoadKm, historicalIncidentCount } = req.body;
  if (!name || !district || !state || lng === undefined || lat === undefined) {
    return next(new ApiError(400, 'name, district, state, lng, and lat are required'));
  }

  const habitation = await Habitation.create({
    name,
    district,
    state,
    location: toGeoPoint(Number(lng), Number(lat)),
    population: population || 0,
    vulnerablePopulation: vulnerablePopulation || 0,
    householdCount: householdCount || 0,
    housingType: housingType || 'mixed',
    roadAccessQuality: roadAccessQuality || 'moderate',
    distanceToRoadKm: distanceToRoadKm || 0,
    historicalIncidentCount: historicalIncidentCount || 0
  });

  res.status(201).json({ success: true, habitation });
}

// GET /api/habitations/:id - HVI, risk drivers, history, population, reports (FR-09, sec.11)
async function getHabitationDetail(req, res) {
  const habitation = await Habitation.findByPk(req.params.id);
  if (!habitation) throw new ApiError(404, 'Habitation not found');

  const [lng, lat] = habitation.location.coordinates;

  const linkedReportRows = await sequelize.query(
    `
    SELECT id FROM hazard_reports
    WHERE ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, 3000)
    ORDER BY reported_at DESC
    LIMIT 20
    `,
    { replacements: { lng, lat }, type: QueryTypes.SELECT }
  );

  const [linkedReports, surveys, relocationPlans, scoreHistory] = await Promise.all([
    HazardReport.findAll({ where: { id: linkedReportRows.map((r) => r.id) } }),
    Survey.findAll({ where: { habitationId: habitation.id }, order: [['surveyedAt', 'DESC']], limit: 10 }),
    RelocationPlan.findAll({
      where: { habitationId: habitation.id },
      include: [{ model: RelocationAllocation, as: 'allocations', include: [{ model: SafeSite, as: 'site' }] }],
      order: [['createdAt', 'DESC']]
    }),
    RiskScore.findAll({ where: { habitationId: habitation.id }, order: [['calculatedAt', 'DESC']], limit: 20 })
  ]);

  const topFactors = scoreHistory[0]
    ? Object.entries(scoreHistory[0].factorsJson)
      .sort((a, b) => b[1].contribution - a[1].contribution)
      .slice(0, 3)
      .map(([key, f]) => ({ factor: key, ...f }))
    : [];

  res.json({ success: true, habitation, topFactors, linkedReports, surveys, relocationPlans, scoreHistory });
}

async function updateHabitation(req, res) {
  const habitation = await Habitation.findByPk(req.params.id);
  if (!habitation) throw new ApiError(404, 'Habitation not found');

  const allowedFields = ['name', 'population', 'vulnerablePopulation', 'householdCount', 'housingType', 'roadAccessQuality', 'distanceToRoadKm', 'historicalIncidentCount'];
  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }
  if (req.body.lng !== undefined && req.body.lat !== undefined) {
    updates.location = toGeoPoint(Number(req.body.lng), Number(req.body.lat));
  }

  await habitation.update(updates);

  let riskUpdate = null;
  if (HVI_INPUT_FIELDS.some((field) => field in updates)) {
    riskUpdate = await computeHviForHabitation(habitation.id);
    const io = req.app.get('io');
    if (io) io.emit('risk:recalculated', { count: 1, at: new Date().toISOString(), trigger: 'habitation_edit', habitationId: habitation.id });
  }

  res.json({ success: true, habitation, riskUpdate });
}

// POST /api/habitations/:id/recalculate - scoped single-habitation recompute,
// used by the "Recalculate Risk" control in the Habitation Drawer.
async function recalculateHabitationRisk(req, res) {
  const habitation = await Habitation.findByPk(req.params.id);
  if (!habitation) throw new ApiError(404, 'Habitation not found');

  const result = await computeHviForHabitation(habitation.id);

  const io = req.app.get('io');
  if (io) io.emit('risk:recalculated', { count: 1, at: new Date().toISOString(), trigger: 'manual', habitationId: habitation.id });

  res.json({ success: true, result });
}

module.exports = { listHabitations, createHabitation, getHabitationDetail, updateHabitation, recalculateHabitationRisk };
