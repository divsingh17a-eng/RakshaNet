const { getChatResponse, isConfigured } = require('../services/chatbot.service');
const { User } = require('../models/sql');
const { ApiError } = require('../middleware/errorHandler');

async function sendChatMessage(req, res) {
  const { message, history } = req.body;

  const user = await User.findByPk(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');

  const result = await getChatResponse({ user, message, history: history || [] });
  res.json({ success: true, ...result });
}

async function getStatus(req, res) {
  res.json({ success: true, configured: isConfigured() });
}

module.exports = { sendChatMessage, getStatus };
