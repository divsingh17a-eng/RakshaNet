const { Router } = require('express');
const ctrl = require('../controllers/chatbot.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { chatbotMessageSchema } = require('../../../shared/schemas');
const { ROLES } = require('../config/constants');

const router = Router();

router.use(authenticate);

router.get('/status', ctrl.getStatus);
router.post('/message', authorize(ROLES.CITIZEN, ROLES.VOLUNTEER), validate(chatbotMessageSchema), ctrl.sendChatMessage);

module.exports = router;
