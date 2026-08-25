process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/rakshanet';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const { authorize } = require('../../backend/src/middleware/auth');
const { ROLES } = require('../../backend/src/config/constants');

function callAuthorize(allowedRoles, actingRole) {
  const req = { user: actingRole ? { id: 'u1', role: actingRole } : null };
  const res = {};
  const next = jest.fn();
  try {
    authorize(...allowedRoles)(req, res, next);
    return { threw: false, next };
  } catch (err) {
    return { threw: true, err, next };
  }
}

describe('authorize middleware - backend-enforced RBAC (PRD sec.18: "never rely only on hidden UI controls")', () => {
  test('allows a role that is in the allow-list', () => {
    const { threw, next } = callAuthorize([ROLES.ADMIN, ROLES.DDMA_OFFICER], ROLES.DDMA_OFFICER);
    expect(threw).toBe(false);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('rejects a role that is not in the allow-list with 403', () => {
    const { threw, err } = callAuthorize([ROLES.ADMIN], ROLES.CITIZEN);
    expect(threw).toBe(true);
    expect(err.statusCode).toBe(403);
  });

  test('rejects an unauthenticated request with 401, distinct from a 403 role mismatch', () => {
    const { threw, err } = callAuthorize([ROLES.ADMIN], null);
    expect(threw).toBe(true);
    expect(err.statusCode).toBe(401);
  });

  test.each([
    ['citizen', ROLES.CITIZEN],
    ['volunteer', ROLES.VOLUNTEER],
    ['sdma_officer', ROLES.SDMA_OFFICER],
    ['ddma_officer', ROLES.DDMA_OFFICER],
    ['responder', ROLES.RESPONDER],
    ['admin', ROLES.ADMIN]
  ])('%s can access a route that allow-lists exactly that role', (_label, role) => {
    const { threw } = callAuthorize([role], role);
    expect(threw).toBe(false);
  });

  test('a Volunteer cannot pass an Officer-only gate (relocation approval must stay human-in-the-loop and role-gated)', () => {
    const { threw, err } = callAuthorize([ROLES.SDMA_OFFICER, ROLES.DDMA_OFFICER, ROLES.ADMIN], ROLES.VOLUNTEER);
    expect(threw).toBe(true);
    expect(err.statusCode).toBe(403);
  });

  test('a Citizen cannot pass a Responder-only gate', () => {
    const { threw, err } = callAuthorize([ROLES.RESPONDER], ROLES.CITIZEN);
    expect(threw).toBe(true);
    expect(err.statusCode).toBe(403);
  });
});
