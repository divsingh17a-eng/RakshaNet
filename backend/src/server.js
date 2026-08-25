const http = require('http');
const createApp = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const { connectPostgres } = require('./config/postgres');
const { initSockets } = require('./sockets');

// Load Sequelize models + associations before syncing/serving.
require('./models/sql');

async function start() {
  await connectPostgres();

  const { sequelize } = require('./models/sql');
  // `alter` keeps the schema in sync with model definitions without a full migration
  // tool - fine for a hackathon build; swap for real migrations before production.
  await sequelize.sync({ alter: env.nodeEnv !== 'production' });
  logger.info('PostgreSQL schema synced');

  const app = createApp();
  const httpServer = http.createServer(app);

  const io = initSockets(httpServer);
  app.set('io', io);

  httpServer.listen(env.port, () => {
    logger.info(`RakshaNet backend listening on port ${env.port} [${env.nodeEnv}]`);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled rejection: ${reason}`);
  });
}

start().catch((err) => {
  logger.error(`Failed to start server: ${err.stack || err.message}`);
  process.exit(1);
});
