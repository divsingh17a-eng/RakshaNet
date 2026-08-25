const { Router } = require('express');
const ctrl = require('../controllers/exports.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { DASHBOARD_ROLES } = require('../config/constants');

const router = Router();

router.get('/relocation-report', authenticate, authorize(...DASHBOARD_ROLES), ctrl.exportRelocationReport);

module.exports = router;
