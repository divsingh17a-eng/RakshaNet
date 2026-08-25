const { v4: uuidv4 } = require('uuid');
const { User, HazardReport } = require('../models/sql');
const { HAZARD_TYPES, SOURCE_CHANNELS, ROLES } = require('../config/constants');
const { moderateReport } = require('./moderation.service');
const { normalizePhone } = require('../utils/phone');
const env = require('../config/env');
const logger = require('../config/logger');

/**
 * SMS/IVR low-connectivity reporting adapter (FR-07, PRD sec.15). Converts an
 * inbound SMS keyword ("FLOOD near Adimali") or IVR DTMF-derived payload into
 * a HazardReport through the exact same pipeline a mobile report uses.
 *
 * Feature-flagged: if no Twilio/Exotel credentials are configured the HTTP
 * webhook route still accepts requests (useful for the judge demo) but the
 * response clearly labels itself as a mock/demo adapter.
 */
function isConfigured() {
  return Boolean(env.twilio.sid || env.exotel.sid);
}

function parseHazardType(body) {
  const firstWord = (body || '').trim().split(/\s+/)[0]?.toUpperCase();
  const match = Object.values(HAZARD_TYPES).find((t) => t.toUpperCase() === firstWord);
  return match || HAZARD_TYPES.OTHER;
}

async function findOrCreateCitizenByPhone(rawPhone) {
  const phone = normalizePhone(rawPhone);
  const [user] = await User.findOrCreate({
    where: { phone },
    defaults: { name: phone, phone, role: ROLES.CITIZEN, isVerified: true }
  });
  return user;
}

/**
 * @param {object} payload
 * @param {string} payload.fromPhone - reporter's phone number
 * @param {string} payload.body - raw SMS text or transcribed IVR input
 * @param {number} [payload.lat] - if the gateway can supply approximate location
 * @param {number} [payload.lng]
 * @param {'sms'|'ivr'} payload.channel
 */
async function handleInboundReport({ fromPhone, body, lat, lng, channel }) {
  if (!fromPhone) throw new Error('fromPhone is required');

  const user = await findOrCreateCitizenByPhone(fromPhone);

  let coordinates = lat !== undefined && lng !== undefined ? [Number(lng), Number(lat)] : null;
  if (!coordinates) {
    const home = user.metadata?.homeLocation;
    if (home?.lat !== undefined && home?.lng !== undefined) {
      coordinates = [home.lng, home.lat];
    }
  }
  if (!coordinates) {
    throw new Error(
      'No location available for this report. Register a home location in the app once, or have the gateway pass GPS coordinates.'
    );
  }

  const report = await HazardReport.create({
    localUuid: uuidv4(),
    reporterId: user.id,
    type: parseHazardType(body),
    severity: 3, // SMS/IVR carries no structured severity input; default to medium
    description: body || null,
    location: { type: 'Point', coordinates },
    status: 'submitted',
    sourceChannel: channel === 'ivr' ? SOURCE_CHANNELS.IVR : SOURCE_CHANNELS.SMS,
    reportedAt: new Date(),
    syncedAt: new Date()
  });

  moderateReport(report).catch((err) => logger.error(`Moderation failed for ${report.id}: ${err.message}`));

  logger.info(`SMS/IVR report ingested from ${fromPhone} -> ${report.id}`);
  return report;
}

module.exports = { isConfigured, handleInboundReport, parseHazardType };
