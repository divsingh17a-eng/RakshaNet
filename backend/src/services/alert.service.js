const { Alert } = require('../models/sql');
const logger = require('../config/logger');

// Persists an alert and pushes it live over Socket.io. FCM push delivery is
// left as a follow-up integration point (FIREBASE_CONFIG) - not required for
// the hackathon demo to work end-to-end over the socket feed.
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

  logger.debug(`Alert raised: ${title}`);
  return alert;
}

module.exports = { raiseAlert };
