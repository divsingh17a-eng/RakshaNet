const { Op, literal } = require('sequelize');
const { User } = require('../models/sql');
const { ROLES } = require('../config/constants');

/**
 * Aggregate-only on-duty volunteer visibility for citizens ("is help
 * available right now?") - never exposes which volunteers, their location,
 * or any individual identity, only a count. `isOnDuty` lives in
 * User.metadata (see PATCH /api/me), so this is a JSONB text comparison.
 */
async function getOnDutyCount(req, res) {
  const { district } = req.query;

  const where = {
    role: ROLES.VOLUNTEER,
    [Op.and]: [literal(`"metadata"->>'isOnDuty' = 'true'`)]
  };
  if (district) where.district = district;

  const [onDuty, total] = await Promise.all([
    User.count({ where }),
    User.count({ where: { role: ROLES.VOLUNTEER, ...(district ? { district } : {}) } })
  ]);

  res.json({ success: true, onDuty, total, district: district || null });
}

module.exports = { getOnDutyCount };
