process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/rakshanet';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const { assessCapacity } = require('../../backend/src/engines/capacity.engine');
const { RESOURCE_TYPES, RESOURCE_STATUS, RESOURCE_PER_CAPITA_DAILY_NEED, RESOURCE_UNITS } = require('../../backend/src/config/constants');

function fullResources(overrides = {}) {
  return Object.values(RESOURCE_TYPES).map((type) => ({
    resourceType: type,
    quantity: overrides[type] ?? 0,
    dailyNeed: RESOURCE_PER_CAPITA_DAILY_NEED[type],
    unit: RESOURCE_UNITS[type]
  }));
}

describe('assessCapacity - FR-11 (Required vs available, Surplus/Adequate/Critical, shortfall)', () => {
  test('available capacity is totalCapacity minus occupiedCapacity, floored at 0', () => {
    const site = { id: 's1', totalCapacity: 1000, occupiedCapacity: 300 };
    const result = assessCapacity(site, fullResources(), 0);
    expect(result.availableCapacity).toBe(700);

    const overfull = { id: 's2', totalCapacity: 500, occupiedCapacity: 900 };
    expect(assessCapacity(overfull, fullResources(), 0).availableCapacity).toBe(0);
  });

  test('abundant stock for a small population is Surplus on every resource', () => {
    const site = { id: 's1', totalCapacity: 5000, occupiedCapacity: 10 };
    const resources = fullResources({
      water: 1_000_000, medical_beds: 500, sanitation: 500, food: 100_000
    });
    const result = assessCapacity(site, resources, 0);
    expect(result.status.overall).toBe(RESOURCE_STATUS.SURPLUS);
  });

  test('near-zero stock for a real population is Critical and blocks accommodation', () => {
    const site = { id: 's1', totalCapacity: 5000, occupiedCapacity: 0 };
    const resources = fullResources({ water: 10, medical_beds: 0, sanitation: 0, food: 5 });
    const result = assessCapacity(site, resources, 1000);
    expect(result.status.overall).toBe(RESOURCE_STATUS.CRITICAL);
    expect(result.status.water).toBe(RESOURCE_STATUS.CRITICAL);
  });

  test('exactly-at-standard stock is Adequate, not Critical or Surplus', () => {
    const population = 100;
    const site = { id: 's1', totalCapacity: 1000, occupiedCapacity: population };
    const resources = [{
      resourceType: RESOURCE_TYPES.WATER,
      quantity: population * RESOURCE_PER_CAPITA_DAILY_NEED.water, // exactly meets the per-capita standard
      dailyNeed: RESOURCE_PER_CAPITA_DAILY_NEED.water,
      unit: RESOURCE_UNITS.water
    }];
    const result = assessCapacity(site, resources, 0);
    expect(result.status.water).toBe(RESOURCE_STATUS.ADEQUATE);
  });

  test('a resource with no recorded row is treated as unassessed/Critical, never silently ignored', () => {
    const site = { id: 's1', totalCapacity: 1000, occupiedCapacity: 100 };
    const result = assessCapacity(site, [], 0); // no SiteResource rows at all
    expect(result.status.overall).toBe(RESOURCE_STATUS.CRITICAL);
    for (const type of Object.values(RESOURCE_TYPES)) {
      expect(result.status[type]).toBe(RESOURCE_STATUS.CRITICAL);
    }
  });

  test('an idle site (never occupied, no hypothetical addition) is screened against its own rated capacity, not a population of zero', () => {
    // Without this, an empty site with almost no stock would trivially read
    // "Adequate" (required-for-zero-people = 0) until someone was actually
    // routed there - defeating the point of safe-site screening.
    const idleUnderResourced = { id: 's1', totalCapacity: 500, occupiedCapacity: 0 };
    const barelyAnyStock = fullResources({ water: 800, medical_beds: 0, sanitation: 2, food: 200 });
    const result = assessCapacity(idleUnderResourced, barelyAnyStock, 0);
    expect(result.status.overall).toBe(RESOURCE_STATUS.CRITICAL);
    expect(result.status.water).toBe(RESOURCE_STATUS.CRITICAL);
    expect(result.status.sanitation).toBe(RESOURCE_STATUS.CRITICAL);
  });

  test('an idle site with stock that matches its rated capacity reads every resource as Surplus, not trivially passed', () => {
    const idleWellResourced = { id: 's1', totalCapacity: 500, occupiedCapacity: 0 };
    const wellStocked = fullResources({ water: 1_000_000, medical_beds: 500, sanitation: 500, food: 100_000 });
    const result = assessCapacity(idleWellResourced, wellStocked, 0);
    for (const type of Object.values(RESOURCE_TYPES)) {
      expect(result.status[type]).toBe(RESOURCE_STATUS.SURPLUS);
    }
    // Shelter itself tops out at "Adequate" for an idle site: it can hold
    // exactly its rated capacity, never more, so `overall` is Adequate even
    // though every individual resource is in surplus.
    expect(result.status.shelter).toBe(RESOURCE_STATUS.ADEQUATE);
    expect(result.status.overall).toBe(RESOURCE_STATUS.ADEQUATE);
  });

  test('a partially-occupied site (not idle) is still judged by its real occupancy, not inflated to full rated capacity', () => {
    const population = 100;
    const partiallyFull = { id: 's1', totalCapacity: 1000, occupiedCapacity: population };
    const exactlyEnoughFor100 = [{
      resourceType: RESOURCE_TYPES.WATER,
      quantity: population * RESOURCE_PER_CAPITA_DAILY_NEED.water,
      dailyNeed: RESOURCE_PER_CAPITA_DAILY_NEED.water,
      unit: RESOURCE_UNITS.water
    }];
    const result = assessCapacity(partiallyFull, exactlyEnoughFor100, 0);
    expect(result.status.water).toBe(RESOURCE_STATUS.ADEQUATE); // would be Critical if wrongly assessed against totalCapacity=1000
  });

  test('canAccommodate is false when incoming population exceeds available shelter capacity', () => {
    const site = { id: 's1', totalCapacity: 100, occupiedCapacity: 90 };
    const result = assessCapacity(site, fullResources({ water: 1_000_000, medical_beds: 500, sanitation: 500, food: 100_000 }), 50);
    expect(result.canAccommodate).toBe(false);
    expect(result.availableCapacity).toBe(10);
  });

  test('canAccommodate is true when both shelter and resources are sufficient', () => {
    const site = { id: 's1', totalCapacity: 1000, occupiedCapacity: 0 };
    const result = assessCapacity(site, fullResources({ water: 1_000_000, medical_beds: 500, sanitation: 500, food: 100_000 }), 100);
    expect(result.canAccommodate).toBe(true);
  });
});
