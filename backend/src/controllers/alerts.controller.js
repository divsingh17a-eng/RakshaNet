const { Op } = require('sequelize');
const { Alert, User } = require('../models/sql');
const { ApiError } = require('../middleware/errorHandler');
const { raiseAlert } = require('../services/alert.service');
const { ALERT_TYPES } = require('../config/constants');

// Alerts visible to a user: direct notifications, plus broadcasts targeted at
// their district/role.
async function listMyAlerts(req, res) {
  const { district } = req.query;

  const alerts = await Alert.findAll({
    where: {
      [Op.or]: [
        { 'audience.recipientId': req.user.id },
        { 'audience.role': req.user.role },
        ...(district ? [{ 'audience.district': district }] : [])
      ]
    },
    order: [['createdAt', 'DESC']],
    limit: 100
  });

  res.json({ success: true, alerts });
}

async function markRead(req, res) {
  const alert = await Alert.findByPk(req.params.id);
  if (!alert) throw new ApiError(404, 'Alert not found');

  await alert.update({ readAt: new Date() });
  res.json({ success: true, alert });
}

// "Direct Dispatch Comms": a volunteer broadcasts a quick status/situation
// note to the officers in their district. Reuses the Alert model (type
// 'system') rather than a full chat system.
async function sendDispatchMessage(req, res) {
  const { message } = req.body;

  // req.user is the JWT payload (id/role/name/phone/email only) - district
  // lives on the DB row, so it has to be fetched fresh to target correctly.
  const sender = await User.findByPk(req.user.id);

  const alert = await raiseAlert({
    district: sender?.district || null,
    type: ALERT_TYPES.SYSTEM,
    title: `Field update from ${sender?.name || 'a volunteer'}`,
    message,
    io: req.app.get('io')
  });

  res.status(201).json({ success: true, alert });
}

module.exports = { listMyAlerts, markRead, sendDispatchMessage };
