process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/rakshanet';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const {
  weightedHvi, populationVulnerabilityFactor, accessibilityInfrastructureFactor,
  historicalEnvironmentalFactor, HOUSING_RISK
} = require('../../backend/src/engines/riskHvi.engine');
const { HVI_WEIGHTS, scoreToZoneColor, ZONE_COLORS } = require('../../backend/src/config/constants');

describe('HVI weighted-sum formula (PRD sec.5)', () => {
  test('weights sum to 1.0 so a uniform 100 across every factor yields exactly 100', () => {
    const totalWeight = Object.values(HVI_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(totalWeight).toBeCloseTo(1.0, 5);

    const allMax = Object.fromEntries(Object.keys(HVI_WEIGHTS).map((k) => [k, 100]));
    expect(weightedHvi(allMax)).toBe(100);
  });

  test('all-zero factors yield 0', () => {
    const allZero = Object.fromEntries(Object.keys(HVI_WEIGHTS).map((k) => [k, 0]));
    expect(weightedHvi(allZero)).toBe(0);
  });

  test('is clamped to [0, 100] even with out-of-range inputs', () => {
    const tooHigh = Object.fromEntries(Object.keys(HVI_WEIGHTS).map((k) => [k, 500]));
    expect(weightedHvi(tooHigh)).toBe(100);
  });

  test('a single dominant factor contributes proportionally to its weight', () => {
    const onlyHazard = { hazardExposure: 100, populationVulnerability: 0, housingStructural: 0, accessibilityInfrastructure: 0, historicalEnvironmental: 0 };
    expect(weightedHvi(onlyHazard)).toBeCloseTo(HVI_WEIGHTS.hazardExposure * 100, 5);
  });

  test('resulting HVI maps to the correct zone color', () => {
    const highRisk = { hazardExposure: 100, populationVulnerability: 100, housingStructural: 100, accessibilityInfrastructure: 100, historicalEnvironmental: 100 };
    expect(scoreToZoneColor(weightedHvi(highRisk))).toBe(ZONE_COLORS.RED);

    const lowRisk = { hazardExposure: 0, populationVulnerability: 0, housingStructural: 0, accessibilityInfrastructure: 0, historicalEnvironmental: 0 };
    expect(scoreToZoneColor(weightedHvi(lowRisk))).toBe(ZONE_COLORS.GREEN);
  });
});

describe('populationVulnerabilityFactor (normalization)', () => {
  test('zero population yields 0, never divides by zero', () => {
    expect(populationVulnerabilityFactor({ population: 0, vulnerablePopulation: 0 }).value).toBe(0);
  });

  test('100% vulnerable share dominates the vulnerable-ratio component', () => {
    const { value } = populationVulnerabilityFactor({ population: 100, vulnerablePopulation: 100 });
    expect(value).toBeGreaterThan(60); // 0.7 weight on a maxed vulnerable share
  });

  test('vulnerable share is capped even if data has vulnerablePopulation > population', () => {
    const { value } = populationVulnerabilityFactor({ population: 100, vulnerablePopulation: 500 });
    expect(value).toBeLessThanOrEqual(100);
  });
});

describe('housing/structural factor (housing type mapping)', () => {
  test('kutcha is riskier than pucca', () => {
    expect(HOUSING_RISK.kutcha).toBeGreaterThan(HOUSING_RISK.pucca);
  });
});

describe('accessibilityInfrastructureFactor', () => {
  test('isolated + far from road scores near maximum risk', () => {
    const { value } = accessibilityInfrastructureFactor({ roadAccessQuality: 'isolated', distanceToRoadKm: 20 });
    expect(value).toBeGreaterThan(90);
  });

  test('good access + on the road scores low risk', () => {
    const { value } = accessibilityInfrastructureFactor({ roadAccessQuality: 'good', distanceToRoadKm: 0 });
    expect(value).toBeLessThan(15);
  });
});

describe('historicalEnvironmentalFactor', () => {
  test('zero historical incidents yields 0', () => {
    expect(historicalEnvironmentalFactor({ historicalIncidentCount: 0 }).value).toBe(0);
  });

  test('is monotonically non-decreasing with more incidents, capped at 100', () => {
    const low = historicalEnvironmentalFactor({ historicalIncidentCount: 1 }).value;
    const high = historicalEnvironmentalFactor({ historicalIncidentCount: 50 }).value;
    expect(high).toBeGreaterThan(low);
    expect(high).toBeLessThanOrEqual(100);
  });
});
