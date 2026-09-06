const { Expo } = require('expo-server-sdk');
const { User } = require('../models/sql');
const logger = require('../config/logger');

/**
 * Real push delivery for the existing Alert system (alert.service.js
 * raiseAlert) - so an SOS acknowledgment, zone-crossing alert, or relocation
 * approval reaches a closed app, not just an open Socket.io connection.
 * Feature-flagged like OTP/SMS/chatbot: with no push tokens registered yet
 * (or none of the audience has opted in), this is a silent no-op rather than
 * an error - a fresh install with nobody registered still works normally.
 */
const expo = new Expo();

// Same { recipientId, district, role } shape Alert.audience already uses.
async function resolveAudienceUsers({ recipientId, district, role }) {
  if (recipientId) return User.findAll({ where: { id: recipientId } });
  const where = {};
  if (district) where.district = district;
  if (role) where.role = role;
  if (Object.keys(where).length === 0) return User.findAll(); // true broadcast
  return User.findAll({ where });
}

async function sendPushForAlert(alert) {
  try {
    const users = await resolveAudienceUsers(alert.audience || {});
    const tokens = users
      .map((u) => u.metadata?.pushToken)
      .filter((token) => token && Expo.isExpoPushToken(token));

    if (tokens.length === 0) return { sent: 0 };

    const messages = tokens.map((to) => ({
      to,
      sound: 'default',
      title: alert.title,
      body: alert.message,
      data: { alertId: alert.id, type: alert.type, screen: 'alerts' }
    }));

    const chunks = expo.chunkPushNotifications(messages);
    let sent = 0;
    for (const chunk of chunks) {
      // eslint-disable-next-line no-await-in-loop
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      sent += tickets.filter((t) => t.status === 'ok').length;
    }
    return { sent, attempted: tokens.length };
  } catch (err) {
    logger.error(`Push delivery failed: ${err.message}`);
    return { sent: 0, error: err.message };
  }
}

module.exports = { sendPushForAlert };
