require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const logger = require('./config/logger');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.clientOrigins, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined', {
    stream: { write: (msg) => logger.http ? logger.http(msg.trim()) : logger.info(msg.trim()) }
  }));

  // Only enforced in production - in local dev, every tab/script/polling
  // component (on-duty banner, incident ticker, message-thread polling, plus
  // manual testing) shares one IP-keyed bucket and exhausts a low limit
  // within minutes, blocking real use with an opaque 429. A real deployment
  // should still tune RATE_LIMIT_MAX for its actual traffic pattern.
  if (env.nodeEnv === 'production') {
    app.use(
      '/api',
      rateLimit({
        windowMs: env.rateLimit.windowMs,
        max: env.rateLimit.max,
        standardHeaders: true,
        legacyHeaders: false
      })
    );
  }

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
