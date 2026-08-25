const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/postgres');
const { SAFE_SITE_STATUS } = require('../../config/constants');

class SafeSite extends Model {}

SafeSite.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: { type: DataTypes.STRING, allowNull: false },
    district: { type: DataTypes.STRING, allowNull: false },
    state: { type: DataTypes.STRING, allowNull: false },
    type: {
      type: DataTypes.ENUM('shelter', 'relocation_site', 'relief_camp'),
      defaultValue: 'relocation_site'
    },
    location: {
      type: DataTypes.GEOMETRY('POINT', 4326),
      allowNull: false
    },
    totalCapacity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    occupiedCapacity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    status: {
      type: DataTypes.ENUM(...Object.values(SAFE_SITE_STATUS)),
      defaultValue: SAFE_SITE_STATUS.ACTIVE
    },

    // --- Site matching factor inputs (PRD sec.6) ---
    safetyRating: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 80 }, // 0-100, structural/hazard safety of the site itself
    accessibilityRating: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 70 }, // 0-100, road/infra quality at the site
    powerBackup: { type: DataTypes.BOOLEAN, defaultValue: false },

    isDemoData: { type: DataTypes.BOOLEAN, defaultValue: true },
    lastCapacityCheckAt: { type: DataTypes.DATE, allowNull: true },
    metadata: { type: DataTypes.JSONB, defaultValue: {} }
  },
  {
    sequelize,
    modelName: 'SafeSite',
    tableName: 'safe_sites',
    indexes: [{ fields: ['district'] }, { using: 'GIST', fields: ['location'] }]
  }
);

module.exports = SafeSite;
