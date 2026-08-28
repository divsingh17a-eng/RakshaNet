const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const { updateMeSchema } = require('../../../shared/schemas');

const router = Router();

// --- API contract (PRD sec.9) ---
router.use('/auth', require('./auth.routes'));
router.get('/me', authenticate, authController.getMe);
router.patch('/me', authenticate, validate(updateMeSchema), authController.updateMe);

router.use('/reports', require('./reports.routes'));
router.use('/surveys', require('./surveys.routes'));
router.use('/habitations', require('./habitations.routes'));
router.use('/risk', require('./risk.routes'));
router.use('/safe-sites', require('./safeSites.routes'));
router.use('/relocation', require('./relocationPlans.routes'));
router.use('/routes', require('./routes.routes'));
router.use('/response/tasks', require('./responseTasks.routes'));
router.use('/resources', require('./resources.routes'));
router.use('/sync', require('./sync.routes'));
router.use('/audit-logs', require('./audit.routes'));
router.use('/dashboard', require('./dashboard.routes'));

// --- Supporting endpoints referenced elsewhere in the PRD but outside the core contract table ---
router.use('/sos', require('./sos.routes'));
router.use('/alerts', require('./alerts.routes'));
router.use('/exports', require('./exports.routes'));
router.use('/sms-ivr', require('./smsIvr.routes'));
router.use('/users', require('./users.routes'));
router.use('/volunteers', require('./volunteers.routes'));
router.use('/chatbot', require('./chatbot.routes'));

router.get('/health', (req, res) => res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() }));

module.exports = router;
