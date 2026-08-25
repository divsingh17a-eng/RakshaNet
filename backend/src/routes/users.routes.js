const { Router } = require('express');
const ctrl = require('../controllers/users.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

const router = Router();

router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/', ctrl.listUsers);
router.get('/:id', ctrl.getUser);
router.patch('/:id/role', ctrl.updateUserRole);
router.patch('/:id/status', ctrl.setUserStatus);

module.exports = router;
