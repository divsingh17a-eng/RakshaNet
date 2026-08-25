const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/postgres');
const { HAZARD_TYPES, REPORT_STATUS, SOURCE_CHANNELS } = require('../../config/constants');

// Citizen / volunteer hazard report (PRD sec.8 `hazard_reports`). Written by
// the mobile app, including while offline (`localUuid` is client-generated so
// re-sync after a retry is idempotent) or via the SMS/IVR adapter.
class HazardReport extends Model {}

HazardReport.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    localUuid: { type: DataTypes.STRING, allowNull: false, unique: true },
    reporterId: { type: DataTypes.UUID, allowNull: false },
    type: {
      type: DataTypes.ENUM(...Object.values(HAZARD_TYPES)),
      allowNull: false
    },
    severity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
    description: { type: DataTypes.TEXT, allowNull: true },
    location: {
      type: DataTypes.GEOMETRY('POINT', 4326),
      allowNull: false
    },
    habitationId: { type: DataTypes.UUID, allowNull: true },
    status: {
      type: DataTypes.ENUM(...Object.values(REPORT_STATUS)),
      allowNull: false,
      defaultValue: REPORT_STATUS.SUBMITTED
    },
    sourceChannel: {
      type: DataTypes.ENUM(...Object.values(SOURCE_CHANNELS)),
      allowNull: false,
      defaultValue: SOURCE_CHANNELS.APP
    },

    // Lightweight fake/duplicate-report filter results (optional per tech stack sec.13).
    moderation: {
      type: DataTypes.JSONB,
      defaultValue: { checked: false, isSuspectedFake: false, isDuplicate: false, duplicateOfReportId: null }
    },

    reportedAt: { type: DataTypes.DATE, allowNull: false }, // client-side capture time (may predate sync)
    syncedAt: { type: DataTypes.DATE, allowNull: true }
  },
  {
    sequelize,
    modelName: 'HazardReport',
    tableName: 'hazard_reports',
    indexes: [
      { fields: ['type'] },
      { fields: ['status'] },
      { fields: ['habitation_id'] },
      { using: 'GIST', fields: ['location'] }
    ]
  }
);

module.exports = HazardReport;
