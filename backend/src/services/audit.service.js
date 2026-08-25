const { AuditLog } = require('../models/sql');
const logger = require('../config/logger');

async function recordAudit({ actorId, actorRole, action, entityType, entityId, before, after, req }) {
  try {
    await AuditLog.create({
      actorId,
      actorRole,
      action,
      entityType,
      entityId,
      beforeJson: before ?? null,
      afterJson: after ?? null,
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  } catch (err) {
    // Auditing must never break the primary request flow.
    logger.error(`Failed to record audit log: ${err.message}`);
  }
}

module.exports = { recordAudit };
