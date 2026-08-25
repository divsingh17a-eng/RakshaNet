process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/rakshanet';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const {
  capacityFitScore, distanceScore, SAFETY_EXCLUSION_THRESHOLD, splitAllocationAcrossCandidates
} = require('../../backend/src/engines/matching.engine');
const { MATCH_WEIGHTS } = require('../../backend/src/config/constants');

describe('site matching component scores (PRD sec.6)', () => {
  test('matching weights sum to 1.0', () => {
    const total = Object.values(MATCH_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1.0, 5);
  });

  test('capacityFitScore is 100 when a site can fully absorb the population', () => {
    expect(capacityFitScore(500, 200)).toBe(100);
  });

  test('capacityFitScore scales down proportionally when the site falls short', () => {
    expect(capacityFitScore(100, 200)).toBe(50);
    expect(capacityFitScore(0, 200)).toBe(0);
  });

  test('capacityFitScore is 100 for a zero-population request (nothing to fit)', () => {
    expect(capacityFitScore(0, 0)).toBe(100);
  });

  test('distanceScore decays linearly and never goes negative', () => {
    expect(distanceScore(0)).toBe(100);
    expect(distanceScore(25)).toBe(50);
    expect(distanceScore(1000)).toBe(0);
  });

  test('a safety-rating exclusion threshold is defined and sane (0-100)', () => {
    expect(SAFETY_EXCLUSION_THRESHOLD).toBeGreaterThan(0);
    expect(SAFETY_EXCLUSION_THRESHOLD).toBeLessThan(100);
  });
});

function fakeCandidate(id, availableCapacity, occupiedCapacity = 0) {
  return {
    site: { id, name: id, occupiedCapacity },
    matchScore: 80,
    components: {},
    rationale: [],
    distanceKm: 10,
    routeId: null,
    capacityAssessment: { availableCapacity }
  };
}

describe('splitAllocationAcrossCandidates - split allocation (PRD sec.6)', () => {
  test('a single site with enough capacity takes the whole population, no split', () => {
    const candidates = [fakeCandidate('siteA', 1000)];
    const { allocations, remaining } = splitAllocationAcrossCandidates(candidates, 400);
    expect(allocations).toHaveLength(1);
    expect(allocations[0].population).toBe(400);
    expect(remaining).toBe(0);
  });

  test('when the best site falls short, the remainder spills to the next-best site (split allocation)', () => {
    const candidates = [fakeCandidate('siteA', 300), fakeCandidate('siteB', 500)];
    const { allocations, remaining } = splitAllocationAcrossCandidates(candidates, 700);
    expect(allocations).toHaveLength(2);
    expect(allocations[0].site.id).toBe('siteA');
    expect(allocations[0].population).toBe(300);
    expect(allocations[1].site.id).toBe('siteB');
    expect(allocations[1].population).toBe(400);
    expect(remaining).toBe(0);
  });

  test('sites with zero available capacity are skipped entirely', () => {
    const candidates = [fakeCandidate('full', 0), fakeCandidate('open', 200)];
    const { allocations } = splitAllocationAcrossCandidates(candidates, 150);
    expect(allocations).toHaveLength(1);
    expect(allocations[0].site.id).toBe('open');
  });

  test('reports unallocated remainder when total capacity across all candidates is insufficient', () => {
    const candidates = [fakeCandidate('siteA', 100), fakeCandidate('siteB', 50)];
    const { remaining } = splitAllocationAcrossCandidates(candidates, 500);
    expect(remaining).toBe(350);
  });

  test('capacityAfter reflects occupiedCapacity + the newly allocated population', () => {
    const candidates = [fakeCandidate('siteA', 200, 50)];
    const { allocations } = splitAllocationAcrossCandidates(candidates, 100);
    expect(allocations[0].capacityBefore).toBe(50);
    expect(allocations[0].capacityAfter).toBe(150);
  });
});
