const { Router } = require('express');
const reportsCtrl = require('../controllers/reports.controller');
const verificationsCtrl = require('../controllers/verifications.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { upload } = require('../services/upload.service');
const validate = require('../middleware/validate');
const { hazardReportSchema, verificationSchema } = require('../../../shared/schemas');
const { ROLES, DASHBOARD_ROLES } = require('../config/constants');

const router = Router();

router.use(authenticate);

router.post('/', upload.array('photos', 5), validate(hazardReportSchema), reportsCtrl.submitReport);
router.get('/', reportsCtrl.listReports);
router.get('/:id', reportsCtrl.getReportDetail);
router.post('/:id/verify', authorize(ROLES.VOLUNTEER, ...DASHBOARD_ROLES), validate(verificationSchema), verificationsCtrl.verifyReport);
router.get('/:id/verifications', authorize(ROLES.VOLUNTEER, ...DASHBOARD_ROLES), verificationsCtrl.listVerificationsForReport);

module.exports = router;
