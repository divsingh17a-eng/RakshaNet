const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/postgres');
const { ZONE_COLORS } = require('../../config/constants');

class Habitation extends Model {}

Habitation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: { type: DataTypes.STRING, allowNull: false },
    district: { type: DataTypes.STRING, allowNull: false },
    state: { type: DataTypes.STRING, allowNull: false },
    // WGS84 point + optional polygon boundary (PostGIS "geometry" column in the spec)
    location: {
      type: DataTypes.GEOMETRY('POINT', 4326),
      allowNull: false
    },
    boundary: {
      type: DataTypes.GEOMETRY('POLYGON', 4326),
      allowNull: true
    },
    population: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    vulnerablePopulation: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }, // elderly, disabled, children <5
    householdCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    // --- HVI factor inputs (PRD sec.5) ---
    housingType: {
      type: DataTypes.ENUM('kutcha', 'semi_pucca', 'pucca', 'mixed'),
      defaultValue: 'mixed'
    }, // feeds housing/structural vulnerability
    roadAccessQuality: {
      type: DataTypes.ENUM('good', 'moderate', 'poor', 'isolated'),
      defaultValue: 'moderate'
    }, // feeds accessibility/infrastructure
    distanceToRoadKm: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    historicalIncidentCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }, // feeds historical/environmental risk

    // --- Cached latest computed values (history lives in risk_scores) ---
    currentRiskScore: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 }, // hazard exposure sub-score, 0-100
    currentHvi: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 }, // 0-100
    currentZone: {
      type: DataTypes.ENUM(...Object.values(ZONE_COLORS)),
      allowNull: false,
      defaultValue: ZONE_COLORS.GREEN
    },
    lastCalculatedAt: { type: DataTypes.DATE, allowNull: true },

    isDemoData: { type: DataTypes.BOOLEAN, defaultValue: true },
    metadata: { type: DataTypes.JSONB, defaultValue: {} }
  },
  {
    sequelize,
    modelName: 'Habitation',
    tableName: 'habitations',
    indexes: [
      { fields: ['district'] },
      { fields: ['current_zone'] },
      { using: 'GIST', fields: ['location'] }
    ]
  }
);

module.exports = Habitation;
