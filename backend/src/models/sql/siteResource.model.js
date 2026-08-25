const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/postgres');
const { RESOURCE_TYPES } = require('../../config/constants');

// One row per resource type per safe site (PRD sec.8 `site_resources`).
// `dailyNeed` is the per-capita-per-day requirement standard for that
// resource (e.g. 15 litres/person/day of water) - the capacity engine
// multiplies it by the relevant population to get "required".
class SiteResource extends Model {}

SiteResource.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    siteId: { type: DataTypes.UUID, allowNull: false },
    resourceType: {
      type: DataTypes.ENUM(...Object.values(RESOURCE_TYPES)),
      allowNull: false
    },
    quantity: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 }, // stock currently available
    dailyNeed: { type: DataTypes.FLOAT, allowNull: false }, // per-capita-per-day requirement
    unit: { type: DataTypes.STRING, allowNull: false }
  },
  {
    sequelize,
    modelName: 'SiteResource',
    tableName: 'site_resources',
    indexes: [{ unique: true, fields: ['site_id', 'resource_type'] }]
  }
);

module.exports = SiteResource;
