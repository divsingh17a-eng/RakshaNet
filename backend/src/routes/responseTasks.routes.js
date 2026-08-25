const { Router } = require('express');
const ctrl = require('../controllers/responseTasks.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES, DASHBOARD_ROLES } = require('../config/constants');

// Mounted at /api/response/tasks - matches API contract sec.9 (PATCH /api/response/tasks/:id).
const router = Router();

router.use(authenticate, authorize(...DASHBOARD_ROLES));

router.get('/', ctrl.listTasks);
router.post('/:id/claim', authorize(ROLES.RESPONDER, ROLES.ADMIN), ctrl.claimTask);
router.patch('/:id', authorize(ROLES.RESPONDER, ROLES.ADMIN), ctrl.updateTaskStatus);

module.exports = router;
