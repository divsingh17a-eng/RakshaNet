const { QueryTypes } = require('sequelize');
const { sequelize, Habitation, RiskScore, Survey } = require('../models/sql');
const { HVI_WEIGHTS, HVI_MODEL_VERSION, scoreToZoneColor, REPORT_STATUS, ZONE_COLORS, ALERT_TYPES } = require('../config/constants');
const { raiseAlert } = require('../services/alert.service');

const ZONE_RANK = { [ZONE_COLORS.GREEN]: 0, [ZONE_COLORS.YELLOW]: 1, [ZONE_COLORS.ORANGE]: 2, [ZONE_COLORS.RED]: 3 };

/**
 * Transparent, deterministic Risk/HVI scoring service (PRD sec.5). Every
 * factor is normalized to 0-100; the HVI is a weighted sum, clamped 0-100.
 * Every calculation is persisted with its full factor breakdown + weights +
 * model version so the UI can show "why" (top contributing factors) and a
 * history, per FR-08/FR-09. Deliberately kept as explainable arithmetic
 * (no black-box ML) so it stays swappable for a real model later.
 */

const REPORT_LOOKBACK_DAYS = 30;
const REPORT_RADIUS_M = 3000;

// --- Factor 1: Hazard exposure (30%) - severity + recency + density of
// verified hazard reports near the habitation. ---
async function hazardExposureFactor(habitation) {
  const rows = await sequelize.query(
    `
    SELECT severity, reported_at
    FROM hazard_reports
    WHERE status = :verified
      AND reported_at >= :since
      AND ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius)
    `,
    {
      replacements: {
        verified: REPORT_STATUS.VERIFIED,
        since: new Date(Date.now() - REPORT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000),
        lng: habitation.location.coordinates[0],
        lat: habitation.location.coordinates[1],
        radius: REPORT_RADIUS_M
      },
      type: QueryTypes.SELECT
    }
  );

  if (rows.length === 0) return { value: 0, detail: { verifiedReportCount: 0 } };

  const now = Date.now();
  let total = 0;
  for (const row of rows) {
    const ageDays = (now - new Date(row.reported_at).getTime()) / (24 * 60 * 60 * 1000);
    const recencyDecay = Math.max(0, 1 - ageDays / REPORT_LOOKBACK_DAYS);
    const severityScore = (row.severity / 5) * 100;
    total += severityScore * recencyDecay;
  }
  const avgScore = total / rows.length;
  const densityBonus = Math.min(rows.length / 10, 1) * 15; // up to +15 for 10+ corroborating reports
  const value = Math.min(100, avgScore + densityBonus);
  return { value, detail: { verifiedReportCount: rows.length } };
}

// --- Factor 2: Population vulnerability (25%) - vulnerable-group share + population exposure. ---
function populationVulnerabilityFactor(habitation) {
  const vulnerableShare = habitation.population > 0
    ? Math.min(1, habitation.vulnerablePopulation / habitation.population) * 100
    : 0;
  const populationExposure = habitation.population > 0
    ? Math.min(1, Math.log10(habitation.population + 1) / Math.log10(20000)) * 100
    : 0;
  const value = vulnerableShare * 0.7 + populationExposure * 0.3;
  return { value, detail: { vulnerableShare, populationExposure } };
}

// --- Factor 3: Housing/structural vulnerability (20%) - housing type + latest field survey. ---
const HOUSING_RISK = { kutcha: 100, semi_pucca: 50, pucca: 15, mixed: 60 };

async function housingStructuralFactor(habitation) {
  const housingScore = HOUSING_RISK[habitation.housingType] ?? 60;

  const latestSurvey = await Survey.findOne({
    where: { habitationId: habitation.id, status: ['submitted', 'applied'] },
    order: [['surveyedAt', 'DESC']]
  });
  const surveyScore = latestSurvey?.scoreInputs?.computedVulnerabilityScore ?? null;

  const value = surveyScore !== null ? housingScore * 0.5 + surveyScore * 0.5 : housingScore;
  return { value, detail: { housingType: habitation.housingType, housingScore, surveyScore } };
}

// --- Factor 4: Accessibility/infrastructure (15%) - road access quality + distance to road. ---
const ROAD_ACCESS_RISK = { good: 10, moderate: 40, poor: 70, isolated: 100 };

function accessibilityInfrastructureFactor(habitation) {
  const accessScore = ROAD_ACCESS_RISK[habitation.roadAccessQuality] ?? 40;
  const distanceScore = Math.min(100, habitation.distanceToRoadKm * 10);
  const value = accessScore * 0.6 + distanceScore * 0.4;
  return { value, detail: { roadAccessQuality: habitation.roadAccessQuality, distanceToRoadKm: habitation.distanceToRoadKm } };
}

// --- Factor 5: Historical/environmental risk (10%) - count of past incidents. ---
function historicalEnvironmentalFactor(habitation) {
  const value = Math.min(100, (Math.log10(habitation.historicalIncidentCount + 1) / Math.log10(20)) * 100);
  return { value, detail: { historicalIncidentCount: habitation.historicalIncidentCount } };
}

async function computeHviForHabitation(habitationId, { io = null } = {}) {
  const habitation = await Habitation.findByPk(habitationId);
  if (!habitation) throw new Error(`Habitation ${habitationId} not found`);
  const previousZone = habitation.currentZone;

  const [hazardExposure, popVuln, housing, accessibility, historical] = await Promise.all([
    hazardExposureFactor(habitation),
    Promise.resolve(populationVulnerabilityFactor(habitation)),
    housingStructuralFactor(habitation),
    Promise.resolve(accessibilityInfrastructureFactor(habitation)),
    Promise.resolve(historicalEnvironmentalFactor(habitation))
  ]);

  const factors = {
    hazardExposure,
    populationVulnerability: popVuln,
    housingStructural: housing,
    accessibilityInfrastructure: accessibility,
    historicalEnvironmental: historical
  };

  let hvi = 0;
  const factorsJson = {};
  for (const [key, weight] of Object.entries(HVI_WEIGHTS)) {
    const contribution = factors[key].value * weight;
    hvi += contribution;
    factorsJson[key] = { value: Math.round(factors[key].value * 10) / 10, weight, contribution: Math.round(contribution * 10) / 10, detail: factors[key].detail };
  }
  hvi = Math.round(Math.min(100, Math.max(0, hvi)) * 10) / 10;

  const riskScoreValue = Math.round(hazardExposure.value * 10) / 10; // hazard-exposure sub-score, stored alongside the HVI
  const zone = scoreToZoneColor(hvi);

  const riskScore = await RiskScore.create({
    habitationId,
    riskScore: riskScoreValue,
    zone,
    hvi,
    factorsJson,
    modelVersion: HVI_MODEL_VERSION,
    calculatedAt: new Date()
  });

  await habitation.update({
    currentRiskScore: riskScoreValue,
    currentHvi: hvi,
    currentZone: zone,
    lastCalculatedAt: riskScore.calculatedAt
  });

  // Zone-crossing alert - a real deterministic comparison against the
  // previous zone, not a fake/simulated notice. Only when it actually moved,
  // so a routine recompute that lands on the same zone stays silent.
  if (zone !== previousZone) {
    const worsened = ZONE_RANK[zone] > ZONE_RANK[previousZone];
    await raiseAlert({
      district: habitation.district,
      type: ALERT_TYPES.ZONE_UPDATE,
      title: worsened ? `⚠ ${habitation.name} moved to ${zone.toUpperCase()} zone` : `${habitation.name} improved to ${zone.toUpperCase()} zone`,
      message: worsened
        ? `Risk level for ${habitation.name} rose from ${previousZone} to ${zone} (HVI ${hvi}).`
        : `Risk level for ${habitation.name} eased from ${previousZone} to ${zone} (HVI ${hvi}).`,
      zone,
      relatedHabitationId: habitation.id,
      io
    });
  }

  const topFactors = Object.entries(factorsJson)
    .sort((a, b) => b[1].contribution - a[1].contribution)
    .slice(0, 3)
    .map(([key, f]) => ({ factor: key, ...f }));

  return { habitationId, riskScore: riskScoreValue, hvi, zone, factors: factorsJson, topFactors, modelVersion: HVI_MODEL_VERSION };
}

async function recomputeAllHvi({ io = null } = {}) {
  const habitations = await Habitation.findAll({ attributes: ['id'] });
  const results = [];
  for (const h of habitations) {
    // Sequential to keep DB load predictable at hackathon-demo scale.
    // eslint-disable-next-line no-await-in-loop
    results.push(await computeHviForHabitation(h.id, { io }));
  }
  return results;
}

// Trend-based early warning: compares each habitation's current HVI against
// its own oldest recorded score within the lookback window, using the same
// risk_scores history the "why" breakdown already relies on. Deliberately a
// simple delta over real history, not a forecast/prediction model - stays
// explainable and never claims to predict the future, just flags who has
// gotten meaningfully worse recently so an officer can look closer.
async function getTrendingHabitations({ days = 7, minDelta = 8 } = {}) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await sequelize.query(
    `
    SELECT h.id, h.name, h.district, h.current_hvi, h.current_zone,
           baseline.hvi AS baseline_hvi, baseline.calculated_at AS baseline_at
    FROM habitations h
    JOIN LATERAL (
      SELECT hvi, calculated_at FROM risk_scores rs
      WHERE rs.habitation_id = h.id AND rs.calculated_at <= :since
      ORDER BY rs.calculated_at DESC
      LIMIT 1
    ) baseline ON true
    `,
    { replacements: { since }, type: QueryTypes.SELECT }
  );

  return rows
    .map((r) => ({
      habitationId: r.id,
      name: r.name,
      district: r.district,
      currentHvi: r.current_hvi,
      currentZone: r.current_zone,
      baselineHvi: r.baseline_hvi,
      baselineAt: r.baseline_at,
      hviDelta: Math.round((r.current_hvi - r.baseline_hvi) * 10) / 10
    }))
    .filter((r) => r.hviDelta >= minDelta)
    .sort((a, b) => b.hviDelta - a.hviDelta);
}

// Pure weighted-sum helper (no DB) - takes already-computed 0-100 factor
// values and applies the HVI_WEIGHTS formula from PRD sec.5. Exported mainly
// so it (and the individual pure factor functions above) can be unit tested
// without a database connection.
function weightedHvi(factorValues) {
  let hvi = 0;
  for (const [key, weight] of Object.entries(HVI_WEIGHTS)) {
    hvi += (factorValues[key] ?? 0) * weight;
  }
  return Math.round(Math.min(100, Math.max(0, hvi)) * 10) / 10;
}

module.exports = {
  computeHviForHabitation,
  recomputeAllHvi,
  getTrendingHabitations,
  weightedHvi,
  populationVulnerabilityFactor,
  housingStructuralFactor,
  accessibilityInfrastructureFactor,
  historicalEnvironmentalFactor,
  HOUSING_RISK,
  ROAD_ACCESS_RISK
};
