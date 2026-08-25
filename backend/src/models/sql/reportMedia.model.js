const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/postgres');

// Photo/video attached to a hazard report (PRD sec.8 `report_media`).
class ReportMedia extends Model {}

ReportMedia.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    reportId: { type: DataTypes.UUID, allowNull: false },
    url: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.ENUM('image', 'video'), allowNull: false, defaultValue: 'image' },
    metadata: { type: DataTypes.JSONB, defaultValue: {} } // mimeType, sizeBytes, thumbnailUrl, capturedAt
  },
  {
    sequelize,
    modelName: 'ReportMedia',
    tableName: 'report_media',
    updatedAt: false,
    indexes: [{ fields: ['report_id'] }]
  }
);

module.exports = ReportMedia;
