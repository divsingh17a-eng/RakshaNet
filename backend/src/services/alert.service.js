const { Alert } = require('../models/sql');
const logger = require('../config/logger');
const { sendPushForAlert } = require('./push.service');

// Persists an alert, pushes it live over Socket.io (for whoever has the app
// open right now), and sends a real Expo push notification (for whoever
// doesn't - the whole reason a disaster-response app needs push, not just
// sockets). Push delivery is fire-and-forget: a slow/failed push provider
// should never delay or break the alert itself.
async function raiseAlert({ recipientId = null, district = null, role = null, type, title, message, zone = null, relatedHabitationId = null, io }) {
  const alert = await Alert.create({
    audience: { recipientId, district, role },
    type,
    title,
    message,
    zone,
    relatedHabitationId
  });

  if (io) {
    if (recipientId) io.to(`user:${recipientId}`).emit('alert:new', alert);
    else if (district) io.to(`district:${district}`).emit('alert:new', alert);
    else io.emit('alert:new', alert);
  }

  sendPushForAlert(alert).catch((err) => logger.error(`Push delivery failed: ${err.message}`));

  logger.debug(`Alert raised: ${title}`);
  return alert;
}

module.exports = { raiseAlert };
