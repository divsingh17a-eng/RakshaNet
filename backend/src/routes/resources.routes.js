const { Router } = require('express');
const ctrl = require('../controllers/resources.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { DASHBOARD_ROLES } = require('../config/constants');

const router = Router();

router.get('/', authenticate, authorize(...DASHBOARD_ROLES), ctrl.getResourceMonitor);

module.exports = router;
