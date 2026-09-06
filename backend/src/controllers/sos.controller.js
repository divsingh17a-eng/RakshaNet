const { SosAlert, User } = require('../models/sql');
const { ApiError } = require('../middleware/errorHandler');
const { raiseAlert } = require('../services/alert.service');
const { recordAudit } = require('../services/audit.service');
const { SOURCE_CHANNELS, ALERT_TYPES } = require('../config/constants');

// FR-03: large SOS button -> location capture -> confirmation -> high-priority command-center event.
async function triggerSos(req, res, next) {
  const { lng, lat, accuracyMeters, message, sourceChannel } = req.body;
  if (lng === undefined || lat === undefined) {
    return next(new ApiError(400, 'lng and lat are required'));
  }

  const alert = await SosAlert.create({
    reporterId: req.user.id,
    location: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
    accuracyMeters: accuracyMeters ?? null,
    message: message || null,
    sourceChannel: sourceChannel || SOURCE_CHANNELS.APP,
    triggeredAt: new Date()
  });

  const io = req.app.get('io');
  if (io) {
    // Attach the reporter inline (from the auth payload, no extra query) so the
    // command center's live toast can show a name instead of a bare UUID.
    io.emit('sos:new', {
      ...alert.toJSON(),
      reporter: { id: req.user.id, name: req.user.name, phone: req.user.phone, role: req.user.role }
    });
  }

  await raiseAlert({
    type: ALERT_TYPES.SOS,
    title: 'SOS Emergency Alert',
    message: `New SOS from user ${req.user.name || req.user.id}. Live location attached.`,
    io
  });

  res.status(201).json({ success: true, alert });
}

async function listActiveSos(req, res) {
  const alerts = await SosAlert.findAll({
    where: { status: ['pending', 'acknowledged', 'dispatched'] },
    include: [{ model: User, as: 'reporter', attributes: ['id', 'name', 'phone', 'role'] }],
    order: [['triggeredAt', 'DESC']]
  });
  res.json({ success: true, alerts });
}

async function updateSosStatus(req, res) {
  const alert = await SosAlert.findByPk(req.params.id, {
    include: [{ model: User, as: 'reporter', attributes: ['id', 'name', 'phone', 'role'] }]
  });
  if (!alert) throw new ApiError(404, 'SOS alert not found');

  const { status } = req.body;
  const allowed = ['acknowledged', 'dispatched', 'resolved', 'false_alarm'];
  if (!allowed.includes(status)) throw new ApiError(400, `status must be one of: ${allowed.join(', ')}`);

  const beforeStatus = alert.status;
  const updates = { status };
  if (status === 'acknowledged') {
    updates.acknowledgedBy = req.user.id;
    updates.acknowledgedAt = new Date();
  }
  if (status === 'resolved' || status === 'false_alarm') updates.resolvedAt = new Date();
  await alert.update(updates);

  await recordAudit({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'sos.status_update',
    entityType: 'SosAlert',
    entityId: alert.id,
    before: { status: beforeStatus },
    after: { status },
    req
  });

  const io = req.app.get('io');
  if (io) io.emit('sos:updated', alert);

  // Notify the person who actually triggered the SOS - this is the one
  // update they most need to see even if their app is closed, which is
  // exactly what raiseAlert's push delivery is for.
  const statusMessage = {
    acknowledged: 'Your SOS has been acknowledged. Help is being coordinated.',
    dispatched: 'Responders are on their way to your location.',
    resolved: 'Your SOS has been marked resolved.',
    false_alarm: 'Your SOS was marked as a false alarm.'
  };
  await raiseAlert({
    recipientId: alert.reporterId,
    type: ALERT_TYPES.SOS,
    title: 'SOS Update',
    message: statusMessage[status] || `Your SOS status changed to ${status}.`,
    io
  });

  res.json({ success: true, alert });
}

module.exports = { triggerSos, listActiveSos, updateSosStatus };
