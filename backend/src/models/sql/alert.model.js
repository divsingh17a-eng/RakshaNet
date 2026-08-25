const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/postgres');
const { ALERT_TYPES, ZONE_COLORS } = require('../../config/constants');

// Broadcast/direct notification (PRD sec.8 `alerts`) shown on the mobile
// Alerts screen and pushed live over Socket.io.
class Alert extends Model {}

Alert.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    audience: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} }, // { recipientId, district, role } - null recipientId = broadcast
    type: {
      type: DataTypes.ENUM(...Object.values(ALERT_TYPES)),
      allowNull: false,
      defaultValue: ALERT_TYPES.ZONE_UPDATE
    },
    title: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    zone: { type: DataTypes.ENUM(...Object.values(ZONE_COLORS)), allowNull: true },
    relatedHabitationId: { type: DataTypes.UUID, allowNull: true },
    readAt: { type: DataTypes.DATE, allowNull: true }
  },
  {
    sequelize,
    modelName: 'Alert',
    tableName: 'alerts',
    updatedAt: false,
    indexes: [{ fields: ['type'] }, { fields: ['zone'] }]
  }
);

module.exports = Alert;
