require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:4000',

  databaseUrl: required('DATABASE_URL'),

  jwtSecret: required('JWT_SECRET', 'dev-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  // OTP / SMS / IVR are feature-flagged: if credentials are absent the app
  // still runs (dev OTP is logged; SMS/IVR adapter reports itself disabled).
  otpProvider: process.env.OTP_PROVIDER || 'twilio',
  twilio: {
    sid: process.env.TWILIO_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID,
    smsFrom: process.env.TWILIO_SMS_FROM_NUMBER
  },
  exotel: {
    sid: process.env.EXOTEL_SID,
    token: process.env.EXOTEL_TOKEN,
    subdomain: process.env.EXOTEL_SUBDOMAIN
  },

  // Shared-secret guard for the unauthenticated SMS/IVR inbound webhook (a
  // real gateway can't send a JWT). Falls back to a dev-only default so the
  // demo stays usable out of the box, same pattern as jwtSecret above - but
  // every inbound request still has to present it, so it's never silently open.
  smsIvrWebhookSecret: required('SMS_IVR_WEBHOOK_SECRET', 'dev-sms-ivr-secret-change-me'),

  firebaseConfig: process.env.FIREBASE_CONFIG,

  media: {
    provider: process.env.MEDIA_STORAGE_PROVIDER || 'cloudinary',
    storageKey: process.env.MEDIA_STORAGE_KEY,
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET
    },
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'ap-south-1',
      bucket: process.env.AWS_S3_BUCKET
    }
  },

  mapsApiKey: process.env.MAPS_API_KEY,

  // AI chatbot (citizen/volunteer assistant). Feature-flagged like OTP/SMS -
  // if unset, the chatbot endpoint returns a clear "not configured" message
  // instead of the app crashing or silently faking a response.
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  chatbotModel: process.env.CHATBOT_MODEL || 'claude-sonnet-5',

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 300
  }
};
