const { Sequelize } = require('sequelize');
const env = require('./env');
const logger = require('./logger');

// Neon/Supabase both require SSL; disable strict cert checking for the free-tier pooled connection.
const sequelize = new Sequelize(env.databaseUrl, {
  dialect: 'postgres',
  logging: env.nodeEnv === 'development' ? (msg) => logger.debug(msg) : false,
  dialectOptions: {
    ssl: env.nodeEnv === 'production' ? { require: true, rejectUnauthorized: false } : undefined
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    // `underscored: true` alone derives snake_case DB columns (reporter_id,
    // created_at, ...) from camelCase JS attributes automatically. Do NOT
    // also pass createdAt/updatedAt string overrides here - in Sequelize
    // those RENAME THE ATTRIBUTE ITSELF (not just the column), which broke
    // every `order: [['createdAt', ...]]` call across the codebase even
    // though the underlying DB columns were already correctly named.
    underscored: true,
    timestamps: true
  }
});

async function connectPostgres() {
  await sequelize.authenticate();
  // Enable PostGIS extension (safe to run repeatedly).
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS postgis;');
  logger.info('PostgreSQL + PostGIS connected');
  return sequelize;
}

module.exports = { sequelize, connectPostgres };
