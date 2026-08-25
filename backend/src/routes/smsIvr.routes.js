const { Router } = require('express');
const ctrl = require('../controllers/smsIvr.controller');

const router = Router();

// Gateway webhook - no JWT (Twilio/Exotel call this directly); kept simple
// for the hackathon demo. Do not expose destructive actions on this path.
router.get('/status', ctrl.getStatus);
router.post('/inbound', ctrl.inbound);

module.exports = router;
