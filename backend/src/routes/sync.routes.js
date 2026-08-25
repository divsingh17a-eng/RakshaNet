const { Router } = require('express');
const ctrl = require('../controllers/sync.controller');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.post('/', authenticate, ctrl.syncOfflineQueue);

module.exports = router;
