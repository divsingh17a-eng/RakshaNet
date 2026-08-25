const { Router } = require('express');
const ctrl = require('../controllers/dashboard.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { DASHBOARD_ROLES } = require('../config/constants');

const router = Router();

router.get('/summary', authenticate, authorize(...DASHBOARD_ROLES), ctrl.getSummary);

module.exports = router;
