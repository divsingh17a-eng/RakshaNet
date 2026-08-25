const { Router } = require('express');
const ctrl = require('../controllers/users.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

const router = Router();

// GET /api/audit-logs - per API contract sec.9
router.get('/', authenticate, authorize(ROLES.ADMIN), ctrl.getAuditLog);

module.exports = router;
