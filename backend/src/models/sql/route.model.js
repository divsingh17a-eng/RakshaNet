const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/postgres');
const { ROUTE_STATUS } = require('../../config/constants');

// Habitation -> safe-site route (PRD sec.8 `routes`, FR-14). `alternateId`
// self-references another Route row suggested when this one is congested/blocked.
class Route extends Model {}

Route.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    sourceId: { type: DataTypes.UUID, allowNull: false }, // habitations.id
    destinationId: { type: DataTypes.UUID, allowNull: false }, // safe_sites.id
    distanceKm: { type: DataTypes.FLOAT, allowNull: false },
    durationMin: { type: DataTypes.FLOAT, allowNull: false },
    status: {
      type: DataTypes.ENUM(...Object.values(ROUTE_STATUS)),
      defaultValue: ROUTE_STATUS.UNKNOWN
    },
    alternateId: { type: DataTypes.UUID, allowNull: true },
    lastCheckedAt: { type: DataTypes.DATE, allowNull: true }
  },
  {
    sequelize,
    modelName: 'Route',
    tableName: 'routes',
    indexes: [{ fields: ['source_id'] }, { fields: ['destination_id'] }]
  }
);

module.exports = Route;
