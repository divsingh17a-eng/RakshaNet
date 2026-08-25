/* eslint-disable no-console */
// Hackathon-scope "migration": syncs Sequelize models straight to the schema
// (creates the postgis extension + every table/index described in the PRD).
// Swap for real sequelize-cli migrations before a longer-lived deployment.
require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const { connectPostgres } = require('../backend/src/config/postgres');
const { sequelize } = require('../backend/src/models/sql');

async function migrate() {
  await connectPostgres();
  await sequelize.sync({ alter: true });
  console.log('Database schema synced: users, hazard_reports, report_media, verifications, surveys,');
  console.log('habitations, risk_scores, safe_sites, site_resources, relocation_plans,');
  console.log('relocation_allocations, routes, response_tasks, alerts, audit_logs, sos_alerts.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
