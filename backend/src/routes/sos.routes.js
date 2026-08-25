const { Router } = require('express');
const ctrl = require('../controllers/sos.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { sosSchema } = require('../../../shared/schemas');
const { DASHBOARD_ROLES, ROLES } = require('../config/constants');

const router = Router();

router.use(authenticate);

router.post('/', validate(sosSchema), ctrl.triggerSos); // any authenticated mobile user
// Volunteers get read-only situational awareness (Live Incident Feed) of active
// SOS near them; only officers/admin/responder can acknowledge/dispatch/resolve.
router.get('/', authorize(...DASHBOARD_ROLES, ROLES.VOLUNTEER), ctrl.listActiveSos);
router.patch('/:id/status', authorize(...DASHBOARD_ROLES), ctrl.updateSosStatus);

module.exports = router;
