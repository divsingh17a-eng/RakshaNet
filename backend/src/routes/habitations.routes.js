const { Router } = require('express');
const ctrl = require('../controllers/habitations.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES, DASHBOARD_ROLES } = require('../config/constants');

const router = Router();

router.use(authenticate);

router.get('/', authorize(...DASHBOARD_ROLES, ROLES.VOLUNTEER), ctrl.listHabitations);
router.post('/', authorize(ROLES.ADMIN, ROLES.SDMA_OFFICER, ROLES.DDMA_OFFICER), ctrl.createHabitation);
router.get('/:id', authorize(...DASHBOARD_ROLES, ROLES.VOLUNTEER), ctrl.getHabitationDetail);
router.patch('/:id', authorize(ROLES.ADMIN, ROLES.SDMA_OFFICER, ROLES.DDMA_OFFICER), ctrl.updateHabitation);
// Manual "Recalculate Risk" trigger (Habitation Drawer) - non-destructive, so
// any dashboard role that can already view the habitation can also refresh it.
router.post('/:id/recalculate', authorize(...DASHBOARD_ROLES), ctrl.recalculateHabitationRisk);

module.exports = router;
