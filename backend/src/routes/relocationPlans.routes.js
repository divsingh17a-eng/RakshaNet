const { Router } = require('express');
const ctrl = require('../controllers/relocationPlans.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { relocationPlanDecisionSchema } = require('../../../shared/schemas');
const { DASHBOARD_ROLES, OFFICER_ROLES } = require('../config/constants');

// Mounted at /api/relocation - matches API contract sec.9 exactly:
//   POST /api/relocation/recommend, POST/GET /api/relocation/plans, GET/PATCH /api/relocation/plans/:id
const router = Router();

router.use(authenticate, authorize(...DASHBOARD_ROLES));

router.post('/recommend', authorize(...OFFICER_ROLES), ctrl.recommend);
router.post('/plans/generate-all', authorize(...OFFICER_ROLES), ctrl.generatePlans);
router.get('/plans', ctrl.listPlans);
router.post('/plans', authorize(...OFFICER_ROLES), ctrl.createRelocationPlan);
router.get('/plans/:id', ctrl.getPlanDetail);
router.get('/plans/:id/recheck', ctrl.recheckPlan);
router.patch('/plans/:id', authorize(...OFFICER_ROLES), validate(relocationPlanDecisionSchema), ctrl.updatePlanStatus);

module.exports = router;
