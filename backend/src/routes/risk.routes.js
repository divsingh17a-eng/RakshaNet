const { Router } = require('express');
const ctrl = require('../controllers/risk.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES, DASHBOARD_ROLES } = require('../config/constants');

const router = Router();

router.use(authenticate);

router.get('/map', authorize(...DASHBOARD_ROLES, ROLES.VOLUNTEER, ROLES.CITIZEN), ctrl.getMapLayers);
router.post('/recalculate', authorize(ROLES.ADMIN, ROLES.SDMA_OFFICER, ROLES.DDMA_OFFICER), ctrl.recalculateRisk);

module.exports = router;
