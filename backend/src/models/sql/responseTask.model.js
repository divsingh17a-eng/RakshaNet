const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/postgres');
const { RESPONSE_TASK_STATUS } = require('../../config/constants');

// NDRF/Responder execution tracking for an approved relocation plan
// (PRD sec.8 `response_tasks`, FR-18): Assigned -> En Route -> On Site -> Resolved.
class ResponseTask extends Model {}

ResponseTask.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    planId: { type: DataTypes.UUID, allowNull: false },
    responderId: { type: DataTypes.UUID, allowNull: true },
    status: {
      type: DataTypes.ENUM(...Object.values(RESPONSE_TASK_STATUS)),
      defaultValue: RESPONSE_TASK_STATUS.ASSIGNED
    },
    assignedAt: { type: DataTypes.DATE, allowNull: true },
    enRouteAt: { type: DataTypes.DATE, allowNull: true },
    onSiteAt: { type: DataTypes.DATE, allowNull: true },
    resolvedAt: { type: DataTypes.DATE, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true }
  },
  {
    sequelize,
    modelName: 'ResponseTask',
    tableName: 'response_tasks',
    indexes: [{ fields: ['plan_id'] }, { fields: ['responder_id'] }, { fields: ['status'] }]
  }
);

module.exports = ResponseTask;
