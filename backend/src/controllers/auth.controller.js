const bcrypt = require('bcryptjs');
const { User } = require('../models/sql');
const { ApiError } = require('../middleware/errorHandler');
const { signAccessToken, signRefreshToken } = require('../services/token.service');
const { sendOtp, verifyOtp } = require('../services/otp.service');
const { recordAudit } = require('../services/audit.service');
const { normalizePhone } = require('../utils/phone');
const { MOBILE_ROLES, DASHBOARD_ROLES } = require('../config/constants');

// --- Mobile: passwordless phone + OTP (Citizen / Volunteer) ---

async function requestOtp(req, res) {
  const phone = normalizePhone(req.body.phone);
  if (!phone) throw new ApiError(400, 'phone is required');

  let user = await User.findOne({ where: { phone } });
  if (!user) {
    // Self-registration on first OTP request. `role` only applies here (a new
    // phone number choosing Citizen vs Volunteer at signup) - an existing
    // account's role is never changed by this endpoint.
    const role = MOBILE_ROLES.includes(req.body.role) ? req.body.role : MOBILE_ROLES[0];
    user = await User.create({ name: phone, phone, role });
  }

  const result = await sendOtp(phone);
  // devCode only exists when no real SMS gateway is configured (local/demo use) -
  // surfaced so a demo frontend can show it directly instead of requiring
  // terminal access. Never present when a real Twilio/Exotel channel was used.
  res.json({
    success: true,
    message: 'OTP sent',
    channel: result.channel,
    ...(result.devCode ? { devCode: result.devCode, devNote: 'No SMS gateway configured - this code is shown only because this is a demo/dev environment.' } : {})
  });
}

async function verifyOtpAndLogin(req, res) {
  const phone = normalizePhone(req.body.phone);
  const { code } = req.body;
  if (!phone || !code) throw new ApiError(400, 'phone and code are required');

  const isValid = await verifyOtp(phone, code);
  if (!isValid) throw new ApiError(401, 'Invalid or expired OTP');

  const user = await User.findOne({ where: { phone } });
  if (!user) throw new ApiError(404, 'User not found');
  if (!MOBILE_ROLES.includes(user.role)) {
    throw new ApiError(403, 'This account is not a mobile (citizen/volunteer) account');
  }

  await user.update({ isVerified: true, lastLoginAt: new Date() });

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'auth.login.otp',
    entityType: 'User',
    entityId: user.id,
    req
  });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  res.json({ success: true, accessToken, refreshToken, user: user.toSafeJSON() });
}

// --- Web Command Center: email + password (SDMA/DDMA Officer, Responder, Admin) ---
// POST /api/auth/login also accepts an email-only body for demo seeded accounts.

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'email and password are required');

  const user = await User.findOne({ where: { email } });
  if (!user || !user.passwordHash) throw new ApiError(401, 'Invalid email or password');

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) throw new ApiError(401, 'Invalid email or password');
  if (user.status !== 'active') throw new ApiError(403, 'This account has been deactivated');

  await user.update({ lastLoginAt: new Date() });

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'auth.login.password',
    entityType: 'User',
    entityId: user.id,
    req
  });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  res.json({ success: true, accessToken, refreshToken, user: user.toSafeJSON() });
}

async function registerDashboardUser(req, res) {
  const { name, email, password, role, district, state, organization } = req.body;
  if (!name || !email || !password || !role) {
    throw new ApiError(400, 'name, email, password, and role are required');
  }
  if (!DASHBOARD_ROLES.includes(role)) {
    throw new ApiError(400, `role must be one of: ${DASHBOARD_ROLES.join(', ')}`);
  }

  const existing = await User.findOne({ where: { email } });
  if (existing) throw new ApiError(409, 'A user with this email already exists');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, role, district, state, organization });

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'auth.register',
    entityType: 'User',
    entityId: user.id,
    after: user.toSafeJSON(),
    req
  });

  res.status(201).json({ success: true, user: user.toSafeJSON() });
}

async function getMe(req, res) {
  const user = await User.findByPk(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ success: true, user: user.toSafeJSON() });
}

// Self-serve profile fields (see shared/schemas updateMeSchema for the
// whitelist) - merged into the user's metadata JSONB rather than a dump of
// the request body, so this can't be used to smuggle arbitrary state.
async function updateMe(req, res) {
  const user = await User.findByPk(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');

  const { isOnDuty, homeLocation, pushToken } = req.body;
  const metadata = { ...user.metadata };
  if (isOnDuty !== undefined) metadata.isOnDuty = isOnDuty;
  if (homeLocation !== undefined) metadata.homeLocation = homeLocation;
  if (pushToken !== undefined) metadata.pushToken = pushToken;

  await user.update({ metadata });
  res.json({ success: true, user: user.toSafeJSON() });
}

module.exports = { requestOtp, verifyOtpAndLogin, login, registerDashboardUser, getMe, updateMe };
