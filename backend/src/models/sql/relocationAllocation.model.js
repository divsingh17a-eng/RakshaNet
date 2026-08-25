const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/postgres');

// One habitation-to-site leg of a relocation plan (PRD sec.8
// `relocation_allocations`). A plan with more than one row is a split
// allocation (no single site had enough available capacity alone).
class RelocationAllocation extends Model {}

RelocationAllocation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    planId: { type: DataTypes.UUID, allowNull: false },
    siteId: { type: DataTypes.UUID, allowNull: false },
    population: { type: DataTypes.INTEGER, allowNull: false },
    matchScore: { type: DataTypes.FLOAT, allowNull: false }, // 0-100 overall site-matching score
    matchComponents: { type: DataTypes.JSONB, defaultValue: {} }, // { safety, capacityFit, accessibility, distance, resourceSufficiency, routeReliability }
    matchRationale: { type: DataTypes.JSONB, defaultValue: [] }, // ["Highest safety rating in range", ...] top positive factors
    capacityBefore: { type: DataTypes.INTEGER, allowNull: false }, // site occupancy before this allocation applies
    capacityAfter: { type: DataTypes.INTEGER, allowNull: false }, // projected occupancy if approved
    routeId: { type: DataTypes.UUID, allowNull: true }
  },
  {
    sequelize,
    modelName: 'RelocationAllocation',
    tableName: 'relocation_allocations',
    updatedAt: false,
    indexes: [{ fields: ['plan_id'] }, { fields: ['site_id'] }]
  }
);

module.exports = RelocationAllocation;
