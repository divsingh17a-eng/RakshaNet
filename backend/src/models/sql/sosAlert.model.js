const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/postgres');
const { SOURCE_CHANNELS } = require('../../config/constants');

// One-tap SOS emergency event (FR-03). Kept as its own lightweight table
// (not folded into hazard_reports) because it skips verification entirely
// and drives its own high-priority command-center workflow.
class SosAlert extends Model {}

SosAlert.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    reporterId: { type: DataTypes.UUID, allowNull: false },
    location: {
      type: DataTypes.GEOMETRY('POINT', 4326),
      allowNull: false
    },
    accuracyMeters: { type: DataTypes.FLOAT, allowNull: true },
    message: { type: DataTypes.STRING, allowNull: true },
    status: {
      type: DataTypes.ENUM('pending', 'acknowledged', 'dispatched', 'resolved', 'false_alarm'),
      defaultValue: 'pending'
    },
    acknowledgedBy: { type: DataTypes.UUID, allowNull: true },
    acknowledgedAt: { type: DataTypes.DATE, allowNull: true },
    resolvedAt: { type: DataTypes.DATE, allowNull: true },
    sourceChannel: {
      type: DataTypes.ENUM(...Object.values(SOURCE_CHANNELS)),
      defaultValue: SOURCE_CHANNELS.APP
    },
    triggeredAt: { type: DataTypes.DATE, allowNull: false }
  },
  {
    sequelize,
    modelName: 'SosAlert',
    tableName: 'sos_alerts',
    indexes: [{ fields: ['status'] }, { using: 'GIST', fields: ['location'] }]
  }
);

module.exports = SosAlert;
