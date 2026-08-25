const { Router } = require('express');
const ctrl = require('../controllers/alerts.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { dispatchMessageSchema } = require('../../../shared/schemas');
const { ROLES } = require('../config/constants');

const router = Router();

router.use(authenticate);

router.get('/', ctrl.listMyAlerts);
router.patch('/:id/read', ctrl.markRead);
router.post('/', authorize(ROLES.VOLUNTEER), validate(dispatchMessageSchema), ctrl.sendDispatchMessage);

module.exports = router;
