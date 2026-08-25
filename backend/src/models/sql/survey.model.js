const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/postgres');

// Structured vulnerability-audit checklist a Volunteer completes for a
// habitation (PRD sec.8 `surveys`, FR-05). `answersJson` is the raw
// checklist; `scoreInputs` is the normalized 0-100 contribution derived from
// it, folded into the habitation's population/housing HVI factors.
class Survey extends Model {}

Survey.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    localUuid: { type: DataTypes.STRING, allowNull: false, unique: true },
    habitationId: { type: DataTypes.UUID, allowNull: false },
    volunteerId: { type: DataTypes.UUID, allowNull: false },
    answersJson: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] }, // [{ key, label, answer, weight }]
    scoreInputs: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} }, // { computedVulnerabilityScore, ... }
    geotag: {
      type: DataTypes.GEOMETRY('POINT', 4326),
      allowNull: true
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM('draft', 'submitted', 'applied'),
      defaultValue: 'submitted'
    },
    surveyedAt: { type: DataTypes.DATE, allowNull: false },
    appliedAt: { type: DataTypes.DATE, allowNull: true }
  },
  {
    sequelize,
    modelName: 'Survey',
    tableName: 'surveys',
    indexes: [{ fields: ['habitation_id'] }, { fields: ['volunteer_id'] }]
  }
);

module.exports = Survey;
