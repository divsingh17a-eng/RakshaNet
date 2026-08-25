const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/postgres');
const { ROLE_LIST, ROLES } = require('../../config/constants');

class User extends Model {
  toSafeJSON() {
    const { passwordHash, ...safe } = this.toJSON();
    return safe;
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, unique: true, allowNull: true },
    email: { type: DataTypes.STRING, unique: true, allowNull: true },
    passwordHash: { type: DataTypes.STRING, allowNull: true }, // dashboard roles only (officer/responder/admin)
    role: {
      type: DataTypes.ENUM(...ROLE_LIST),
      allowNull: false,
      defaultValue: ROLES.CITIZEN
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended'),
      allowNull: false,
      defaultValue: 'active'
    },
    district: { type: DataTypes.STRING, allowNull: true },
    state: { type: DataTypes.STRING, allowNull: true },
    organization: { type: DataTypes.STRING, allowNull: true }, // e.g. SDMA Kerala, NDRF Bn 3
    isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true },
    metadata: { type: DataTypes.JSONB, defaultValue: {} }
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    indexes: [{ fields: ['role'] }, { fields: ['district'] }]
  }
);

module.exports = User;
