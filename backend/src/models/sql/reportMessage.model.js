const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/postgres');

// A two-way chat thread tied to one hazard report - lets the citizen who
// filed it and the volunteer(s)/officers handling it talk directly, instead
// of only seeing status changes. `senderRole` is denormalized onto the
// message (not just looked up via sender) so the UI can style bubbles
// without an extra join even after a sender's role changes later.
class ReportMessage extends Model {}

ReportMessage.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    reportId: { type: DataTypes.UUID, allowNull: false },
    senderId: { type: DataTypes.UUID, allowNull: false },
    senderRole: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false }
  },
  {
    sequelize,
    modelName: 'ReportMessage',
    tableName: 'report_messages',
    updatedAt: false,
    indexes: [{ fields: ['report_id'] }]
  }
);

module.exports = ReportMessage;
