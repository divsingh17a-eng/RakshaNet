const { Router } = require('express');
const reportsCtrl = require('../controllers/reports.controller');
const verificationsCtrl = require('../controllers/verifications.controller');
const messagesCtrl = require('../controllers/reportMessages.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { upload } = require('../services/upload.service');
const validate = require('../middleware/validate');
const { hazardReportSchema, verificationSchema, reportMessageSchema } = require('../../../shared/schemas');
const { ROLES, DASHBOARD_ROLES } = require('../config/constants');

const router = Router();

router.use(authenticate);

router.post('/', upload.array('photos', 5), validate(hazardReportSchema), reportsCtrl.submitReport);
router.get('/', reportsCtrl.listReports);

// Must come before '/:id' - otherwise Express would match "connections" as an :id.
router.get('/connections', messagesCtrl.listMyConnections);

router.get('/:id', reportsCtrl.getReportDetail);
router.get('/:id/related', authorize(ROLES.VOLUNTEER, ...DASHBOARD_ROLES), reportsCtrl.getRelatedReports);
router.post('/:id/verify', authorize(ROLES.VOLUNTEER, ...DASHBOARD_ROLES), validate(verificationSchema), verificationsCtrl.verifyReport);
router.get('/:id/verifications', authorize(ROLES.VOLUNTEER, ...DASHBOARD_ROLES), verificationsCtrl.listVerificationsForReport);

// Two-way chat thread between the reporting citizen and the volunteer/staff
// handling their report (access-checked inside the controller, not just by role).
router.get('/:id/messages', messagesCtrl.listMessages);
router.post('/:id/messages', validate(reportMessageSchema), messagesCtrl.sendMessage);

module.exports = router;
