const { Router } = require('express');
const ctrl = require('../controllers/routes.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { DASHBOARD_ROLES, OFFICER_ROLES } = require('../config/constants');

const router = Router();

router.use(authenticate, authorize(...DASHBOARD_ROLES));

router.get('/', ctrl.listRoutes);
router.post('/', authorize(...OFFICER_ROLES), ctrl.createOrUpdateRoute);
router.patch('/:id/status', ctrl.updateRouteStatus); // responders can report ground conditions too

module.exports = router;
