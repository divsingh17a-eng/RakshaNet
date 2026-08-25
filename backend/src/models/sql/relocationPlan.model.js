const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/postgres');
const { RELOCATION_URGENCY, RELOCATION_PLAN_STATUS, ZONE_COLORS } = require('../../config/constants');

// PRD sec.7/8 `relocation_plans`. A plan targets one habitation and may fan
// out to multiple safe sites via `relocation_allocations` (split allocation).
class RelocationPlan extends Model {}

RelocationPlan.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    habitationId: { type: DataTypes.UUID, allowNull: false },
    priorityTier: {
      type: DataTypes.ENUM(...Object.values(RELOCATION_URGENCY)),
      allowNull: false
    },
    affectedPopulation: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }, // total habitation population
    priorityPopulation: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }, // prioritized for this tier's window (<= affectedPopulation)
    hviSnapshot: { type: DataTypes.FLOAT, allowNull: true }, // HVI at plan-generation time
    zoneSnapshot: { type: DataTypes.ENUM(...Object.values(ZONE_COLORS)), allowNull: true },
    rankScore: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 }, // higher = more urgent, drives the ranked planner list
    status: {
      type: DataTypes.ENUM(...Object.values(RELOCATION_PLAN_STATUS)),
      defaultValue: RELOCATION_PLAN_STATUS.DRAFT
    },
    recommendationReasons: { type: DataTypes.JSONB, defaultValue: [] }, // ["Nearest site with adequate capacity", ...]
    stressTestResult: { type: DataTypes.JSONB, defaultValue: null }, // capacity/resource overload check run before approval
    decisionNotes: { type: DataTypes.TEXT, allowNull: true }, // required on modify/reject
    createdBy: { type: DataTypes.UUID, allowNull: true },
    approvedBy: { type: DataTypes.UUID, allowNull: true },
    approvedAt: { type: DataTypes.DATE, allowNull: true },
    targetWindowStart: { type: DataTypes.DATE, allowNull: true },
    targetWindowEnd: { type: DataTypes.DATE, allowNull: true }
  },
  {
    sequelize,
    modelName: 'RelocationPlan',
    tableName: 'relocation_plans',
    indexes: [
      { fields: ['habitation_id'] },
      { fields: ['status'] },
      { fields: ['priority_tier'] }
    ]
  }
);

module.exports = RelocationPlan;
