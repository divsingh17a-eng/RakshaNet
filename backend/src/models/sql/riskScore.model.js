const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/postgres');
const { ZONE_COLORS } = require('../../config/constants');

// Historized risk/HVI calculation (PRD sec.8 `risk_scores`). Every recompute
// inserts a new row so the dashboard can show a calculation history; the
// latest row's values are mirrored onto Habitation.current* for fast reads.
class RiskScore extends Model {}

RiskScore.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    habitationId: { type: DataTypes.UUID, allowNull: false },
    riskScore: { type: DataTypes.FLOAT, allowNull: false }, // hazard-exposure sub-score, 0-100
    zone: {
      type: DataTypes.ENUM(...Object.values(ZONE_COLORS)),
      allowNull: false
    },
    hvi: { type: DataTypes.FLOAT, allowNull: false }, // final weighted 0-100 index
    factorsJson: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} }, // { factorName: { value, weight, contribution } }
    modelVersion: { type: DataTypes.STRING, allowNull: false },
    calculatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  },
  {
    sequelize,
    modelName: 'RiskScore',
    tableName: 'risk_scores',
    timestamps: false,
    indexes: [{ fields: ['habitation_id'] }, { fields: ['calculated_at'] }]
  }
);

module.exports = RiskScore;
