const { Router } = require('express');
const ctrl = require('../controllers/safeSites.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES, DASHBOARD_ROLES } = require('../config/constants');

const router = Router();

router.use(authenticate);

router.get('/', authorize(...DASHBOARD_ROLES, ROLES.VOLUNTEER, ROLES.CITIZEN), ctrl.listSafeSites);
router.get('/redistribution', authorize(...DASHBOARD_ROLES), ctrl.getRedistributionSuggestions);
router.post('/', authorize(ROLES.ADMIN, ROLES.SDMA_OFFICER, ROLES.DDMA_OFFICER), ctrl.createSafeSite);
router.get('/:id', authorize(...DASHBOARD_ROLES, ROLES.VOLUNTEER, ROLES.CITIZEN), ctrl.getSafeSiteDetail);
router.patch('/:id', authorize(ROLES.ADMIN, ROLES.SDMA_OFFICER, ROLES.DDMA_OFFICER), ctrl.updateSafeSite);
router.patch('/:id/resources', authorize(ROLES.ADMIN, ROLES.SDMA_OFFICER, ROLES.DDMA_OFFICER), ctrl.upsertSiteResource);
router.post('/:id/capacity-check', authorize(...DASHBOARD_ROLES), ctrl.checkCapacity);

module.exports = router;
