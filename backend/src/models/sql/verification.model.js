const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/postgres');
const { VERIFICATION_DECISIONS } = require('../../config/constants');

// Volunteer verification decision on a hazard report (PRD sec.8 `verifications`, FR-04).
class Verification extends Model {}

Verification.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    reportId: { type: DataTypes.UUID, allowNull: false },
    volunteerId: { type: DataTypes.UUID, allowNull: false },
    decision: {
      type: DataTypes.ENUM(...Object.values(VERIFICATION_DECISIONS)),
      allowNull: false
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    evidenceUrls: { type: DataTypes.JSONB, defaultValue: [] }
  },
  {
    sequelize,
    modelName: 'Verification',
    tableName: 'verifications',
    updatedAt: false,
    indexes: [{ fields: ['report_id'] }, { fields: ['volunteer_id'] }]
  }
);

module.exports = Verification;
