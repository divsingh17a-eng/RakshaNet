const { Op } = require('sequelize');
const { User, AuditLog } = require('../models/sql');
const { ApiError } = require('../middleware/errorHandler');
const { recordAudit } = require('../services/audit.service');
const { ROLE_LIST } = require('../config/constants');

// The Command Center login's "Quick Start" button (LoginPage.jsx
// generateRandomAccount) creates throwaway demo-*@rakshanet.local accounts so
// anyone can try a role instantly. They pile up over a long testing/demo
// session - hidden from the People list by default so it stays readable,
// never deleted (real verifications/plans/audit entries reference them).
const QUICK_START_EMAIL_PATTERN = 'demo-%@rakshanet.local';

async function listUsers(req, res) {
  const { role, district, page = 1, limit = 50, includeTestAccounts } = req.query;
  const where = {};
  if (role) where.role = role;
  if (district) where.district = district;
  if (includeTestAccounts !== 'true') {
    where.email = { [Op.or]: [{ [Op.notLike]: QUICK_START_EMAIL_PATTERN }, { [Op.is]: null }] };
  }

  const offset = (Number(page) - 1) * Number(limit);
  const { rows, count } = await User.findAndCountAll({
    where,
    limit: Number(limit),
    offset,
    order: [['createdAt', 'DESC']]
  });

  const hiddenTestAccounts = includeTestAccounts !== 'true'
    ? await User.count({ where: { ...(role ? { role } : {}), ...(district ? { district } : {}), email: { [Op.like]: QUICK_START_EMAIL_PATTERN } } })
    : 0;

  res.json({
    success: true,
    users: rows.map((u) => u.toSafeJSON()),
    pagination: { page: Number(page), limit: Number(limit), total: count },
    hiddenTestAccounts
  });
}

async function getUser(req, res) {
  const user = await User.findByPk(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ success: true, user: user.toSafeJSON() });
}

async function updateUserRole(req, res) {
  const { role } = req.body;
  if (!ROLE_LIST.includes(role)) throw new ApiError(400, `role must be one of: ${ROLE_LIST.join(', ')}`);

  const user = await User.findByPk(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  const before = { role: user.role };
  await user.update({ role });

  await recordAudit({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'user.role_update',
    entityType: 'User',
    entityId: user.id,
    before,
    after: { role },
    req
  });

  res.json({ success: true, user: user.toSafeJSON() });
}

async function setUserStatus(req, res) {
  const { status } = req.body;
  if (!['active', 'inactive', 'suspended'].includes(status)) {
    throw new ApiError(400, "status must be one of: active, inactive, suspended");
  }

  const user = await User.findByPk(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  const before = { status: user.status };
  await user.update({ status });

  await recordAudit({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'user.status_update',
    entityType: 'User',
    entityId: user.id,
    before,
    after: { status },
    req
  });

  res.json({ success: true, user: user.toSafeJSON() });
}

async function getAuditLog(req, res) {
  const { entityType, entityId, page = 1, limit = 50 } = req.query;
  const where = {};
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;

  const offset = (Number(page) - 1) * Number(limit);
  const { rows, count } = await AuditLog.findAndCountAll({
    where,
    limit: Number(limit),
    offset,
    order: [['createdAt', 'DESC']]
  });

  res.json({ success: true, logs: rows, pagination: { page: Number(page), limit: Number(limit), total: count } });
}

module.exports = { listUsers, getUser, updateUserRole, setUserStatus, getAuditLog };
