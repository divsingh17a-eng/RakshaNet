const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/postgres');

// Append-only audit trail for every privileged action (PRD sec.8 `audit_logs`, FR-19).
class AuditLog extends Model {}

AuditLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    actorId: { type: DataTypes.UUID, allowNull: false },
    actorRole: { type: DataTypes.STRING, allowNull: false },
    action: { type: DataTypes.STRING, allowNull: false }, // e.g. "relocation_plan.approve"
    entityType: { type: DataTypes.STRING, allowNull: false }, // e.g. "RelocationPlan"
    entityId: { type: DataTypes.UUID, allowNull: false },
    beforeJson: { type: DataTypes.JSONB, allowNull: true },
    afterJson: { type: DataTypes.JSONB, allowNull: true },
    ipAddress: { type: DataTypes.STRING, allowNull: true },
    userAgent: { type: DataTypes.STRING, allowNull: true }
  },
  {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    updatedAt: false,
    indexes: [{ fields: ['actor_id'] }, { fields: ['entity_type', 'entity_id'] }, { fields: ['action'] }]
  }
);

module.exports = AuditLog;
