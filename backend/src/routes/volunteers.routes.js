const { Router } = require('express');
const ctrl = require('../controllers/volunteers.controller');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.use(authenticate);

// Aggregate count only (no individual volunteer data) - safe for any authenticated role, citizens included.
router.get('/on-duty', ctrl.getOnDutyCount);

module.exports = router;
