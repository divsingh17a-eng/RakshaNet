const { Router } = require('express');
const ctrl = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const { otpRequestSchema, otpVerifySchema, loginSchema } = require('../../../shared/schemas');

const router = Router();

// Mobile passwordless flow (Citizen/Volunteer)
router.post('/otp/request', validate(otpRequestSchema), ctrl.requestOtp);
router.post('/otp/verify', validate(otpVerifySchema), ctrl.verifyOtpAndLogin);

// Web Command Center flow (Officer/Responder/Admin) - matches API contract sec.9
router.post('/login', validate(loginSchema), ctrl.login);
router.post('/register', ctrl.registerDashboardUser);

module.exports = router;
