process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/rakshanet';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const { scoreToZoneColor, ZONE_COLORS } = require('../../backend/src/config/constants');

describe('scoreToZoneColor (PRD sec.5 zone thresholds: 0-39 Green, 40-59 Yellow, 60-79 Orange, 80-100 Red)', () => {
  test.each([
    [0, ZONE_COLORS.GREEN],
    [39, ZONE_COLORS.GREEN],
    [39.9, ZONE_COLORS.YELLOW], // continuous scores above the Green cutoff (39) already belong to the next band
    [40, ZONE_COLORS.YELLOW],
    [59, ZONE_COLORS.YELLOW],
    [60, ZONE_COLORS.ORANGE],
    [79, ZONE_COLORS.ORANGE],
    [80, ZONE_COLORS.RED],
    [100, ZONE_COLORS.RED]
  ])('score %p -> %p', (score, expected) => {
    expect(scoreToZoneColor(score)).toBe(expected);
  });

  test('clamps out-of-range scores instead of throwing', () => {
    expect(scoreToZoneColor(-10)).toBe(ZONE_COLORS.GREEN);
    expect(scoreToZoneColor(150)).toBe(ZONE_COLORS.RED);
  });
});
