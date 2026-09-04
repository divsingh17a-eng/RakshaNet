const { Router } = require('express');
const ctrl = require('../controllers/users.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES, DASHBOARD_ROLES } = require('../config/constants');

const router = Router();

router.use(authenticate);

// Read access: any dashboard role (SDMA/DDMA Officer, Responder, Admin) - the
// Admin Console's People tab shows this read-only to non-admins.
router.get('/', authorize(...DASHBOARD_ROLES), ctrl.listUsers);
router.get('/:id', authorize(...DASHBOARD_ROLES), ctrl.getUser);

// Mutating a role/status is Admin-only.
router.patch('/:id/role', authorize(ROLES.ADMIN), ctrl.updateUserRole);
router.patch('/:id/status', authorize(ROLES.ADMIN), ctrl.setUserStatus);

module.exports = router;
