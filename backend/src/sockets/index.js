const { Server } = require('socket.io');
const { verifyToken } = require('../services/token.service');
const logger = require('../config/logger');
const env = require('../config/env');

/**
 * Live operational feed for the command dashboard and mobile app:
 * risk-zone updates, habitation reassessments, SOS alerts, relocation-plan
 * events, and notifications all fan out over these rooms.
 *
 * Rooms:
 *  - `user:<id>`      - direct-to-user notifications
 *  - `district:<name>` - district-scoped broadcasts (dashboard officers, citizens)
 *  - global (no room) - dashboard-wide events like sos:new, riskZone:created
 */
function initSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.clientOrigin, credentials: true }
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(); // allow anonymous read-only connections for public zone map
      const payload = verifyToken(token);
      socket.user = payload;
      next();
    } catch (err) {
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id}${socket.user ? ` (user ${socket.user.id})` : ''}`);

    if (socket.user) {
      socket.join(`user:${socket.user.id}`);
    }

    socket.on('join:district', (district) => {
      if (typeof district === 'string' && district.length > 0) {
        socket.join(`district:${district}`);
      }
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

module.exports = { initSockets };
