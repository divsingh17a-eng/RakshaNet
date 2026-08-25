const { Router } = require('express');
const ctrl = require('../controllers/surveys.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES, DASHBOARD_ROLES } = require('../config/constants');

const router = Router();

router.use(authenticate);

router.post('/', authorize(ROLES.VOLUNTEER), ctrl.submitSurvey);
router.get('/habitation/:habitationId', authorize(ROLES.VOLUNTEER, ...DASHBOARD_ROLES), ctrl.listSurveysForHabitation);

module.exports = router;
