const env = require('../config/env');
const logger = require('../config/logger');

// In-memory OTP store for local/dev use when no Twilio/Exotel credentials are configured.
// Swap for Redis in a real production deployment.
const devOtpStore = new Map(); // phone -> { code, expiresAt }

let twilioClient = null;
function getTwilioClient() {
  if (!env.twilio.sid || !env.twilio.authToken) return null;
  if (!twilioClient) {
    // eslint-disable-next-line global-require
    twilioClient = require('twilio')(env.twilio.sid, env.twilio.authToken);
  }
  return twilioClient;
}

async function sendOtp(phone) {
  const client = getTwilioClient();

  if (client && env.twilio.verifyServiceSid) {
    await client.verify.v2
      .services(env.twilio.verifyServiceSid)
      .verifications.create({ to: phone, channel: 'sms' });
    return { channel: 'sms', provider: 'twilio' };
  }

  // Dev fallback: generate a 6-digit code, valid for 5 minutes. Logged for
  // anyone tailing the server, and also returned to the caller so a demo
  // frontend can surface it directly (e.g. an on-screen popup) instead of
  // requiring access to this terminal - no real SMS gateway is configured.
  const code = String(Math.floor(100000 + Math.random() * 900000));
  devOtpStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
  logger.info(`[DEV OTP] ${phone} -> ${code} (no Twilio Verify configured)`);
  return { channel: 'dev-log', provider: 'none', devCode: code };
}

async function verifyOtp(phone, code) {
  const client = getTwilioClient();

  if (client && env.twilio.verifyServiceSid) {
    const check = await client.verify.v2
      .services(env.twilio.verifyServiceSid)
      .verificationChecks.create({ to: phone, code });
    return check.status === 'approved';
  }

  const entry = devOtpStore.get(phone);
  if (!entry) return false;
  const isValid = entry.code === code && entry.expiresAt > Date.now();
  if (isValid) devOtpStore.delete(phone);
  return isValid;
}

module.exports = { sendOtp, verifyOtp };
