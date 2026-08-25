const crypto = require('crypto');
const { isConfigured, handleInboundReport } = require('../services/smsIvr.service');
const { ApiError } = require('../middleware/errorHandler');
const env = require('../config/env');

// GET /api/sms-ivr/status - lets the dashboard show whether this is live
// Twilio/Exotel or a feature-flagged demo mock (build rule: never claim a
// live integration that isn't actually configured).
async function getStatus(req, res) {
  res.json({ success: true, configured: isConfigured(), mode: isConfigured() ? 'live' : 'demo-mock' });
}

// Constant-time compare so this can't be brute-forced via response-time
// differences. Header/secret must be the same byte length for timingSafeEqual;
// a length mismatch is itself a "wrong secret" and returns false immediately.
function secretMatches(provided) {
  if (!provided) return false;
  const expected = Buffer.from(env.smsIvrWebhookSecret);
  const actual = Buffer.from(String(provided));
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

// POST /api/sms-ivr/inbound - webhook target for the SMS/IVR gateway
// (Twilio/Exotel) or, in demo mode, a form the judge can trigger manually.
// This route intentionally carries no JWT (a real gateway can't send one),
// so a shared-secret header is the only thing standing between it and
// anyone on the internet being able to fabricate hazard reports - see
// docs/API.md for the header name and the SMS_IVR_WEBHOOK_SECRET env var.
async function inbound(req, res, next) {
  if (!secretMatches(req.headers['x-webhook-secret'])) {
    throw new ApiError(401, 'Missing or invalid X-Webhook-Secret header');
  }

  const { fromPhone, body, lat, lng, channel } = req.body;
  if (!fromPhone) return next(new ApiError(400, 'fromPhone is required'));

  const report = await handleInboundReport({ fromPhone, body, lat, lng, channel: channel === 'ivr' ? 'ivr' : 'sms' });
  res.status(201).json({ success: true, report, mode: isConfigured() ? 'live' : 'demo-mock' });
}

module.exports = { getStatus, inbound };
