const { HazardReport, ReportMessage, User } = require('../models/sql');
const { ApiError } = require('../middleware/errorHandler');
const { ROLES, DASHBOARD_ROLES } = require('../config/constants');
const { Op } = require('sequelize');

// Staff (volunteer/officer/admin/responder) can see every thread so anyone
// on duty can pick it up; a citizen can only see the thread on their own report.
const STAFF_ROLES = [ROLES.VOLUNTEER, ...DASHBOARD_ROLES];

async function assertCanAccessThread(reportId, user) {
  const report = await HazardReport.findByPk(reportId);
  if (!report) throw new ApiError(404, 'Report not found');

  const isOwner = report.reporterId === user.id;
  const isStaff = STAFF_ROLES.includes(user.role);
  if (!isOwner && !isStaff) throw new ApiError(403, 'You do not have access to this report thread');

  return report;
}

async function listMessages(req, res) {
  const report = await assertCanAccessThread(req.params.id, req.user);

  const messages = await ReportMessage.findAll({
    where: { reportId: req.params.id },
    // `phone` is deliberately NOT gated behind report verification: once a
    // volunteer has actually responded, that live connection is what matters
    // in a disaster - waiting for the formal verification step to finish
    // before allowing a call could cost the delay that verification is meant
    // to prevent. `report.status` is still returned so the UI can show a
    // "Verified" badge for context, without it blocking contact.
    include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'role', 'phone'] }],
    order: [['createdAt', 'ASC']]
  });

  res.json({ success: true, messages, report: { id: report.id, status: report.status } });
}

async function sendMessage(req, res) {
  const { message } = req.body;
  if (!message || !message.trim()) throw new ApiError(400, 'message is required');

  await assertCanAccessThread(req.params.id, req.user);

  const record = await ReportMessage.create({
    reportId: req.params.id,
    senderId: req.user.id,
    senderRole: req.user.role,
    message: message.trim()
  });

  const full = await ReportMessage.findByPk(record.id, {
    include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'role', 'phone'] }]
  });

  const io = req.app.get('io');
  if (io) io.to(`report:${req.params.id}`).emit('report:message', full);

  res.status(201).json({ success: true, message: full });
}

// All of my "active connections" at a glance - every report thread where the
// other side has actually engaged - so Home/My Reports/Tasks don't require
// digging into each report individually to see who's connected and reach them.
async function listMyConnections(req, res) {
  const myId = req.user.id;
  const myRole = req.user.role;

  let reportWhere;
  if (myRole === ROLES.CITIZEN) {
    reportWhere = { reporterId: myId };
  } else {
    // Staff: only reports I've personally engaged with (sent a message on),
    // not every report ever - "my connections", not "every open thread".
    const engaged = await ReportMessage.findAll({
      where: { senderId: myId },
      attributes: ['reportId'],
      group: ['reportId'],
      raw: true
    });
    const ids = engaged.map((e) => e.reportId);
    if (ids.length === 0) return res.json({ success: true, connections: [] });
    reportWhere = { id: { [Op.in]: ids } };
  }

  const reports = await HazardReport.findAll({
    where: reportWhere,
    include: [{
      model: ReportMessage,
      as: 'messages',
      separate: true,
      order: [['createdAt', 'ASC']],
      include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'role', 'phone'] }]
    }],
    order: [['reportedAt', 'DESC']]
  });

  const connections = reports
    .map((r) => {
      const msgs = r.messages || [];
      if (msgs.length === 0) return null;
      const lastMessage = msgs[msgs.length - 1];
      const otherPartyMessage = [...msgs].reverse().find((m) => m.senderId !== myId);
      if (!otherPartyMessage) return null; // only I've sent messages so far - not yet a two-way connection

      return {
        reportId: r.id,
        reportType: r.type,
        reportSeverity: r.severity,
        reportStatus: r.status,
        otherParty: otherPartyMessage.sender,
        lastMessage: { message: lastMessage.message, senderId: lastMessage.senderId, createdAt: lastMessage.createdAt }
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));

  res.json({ success: true, connections });
}

module.exports = { listMessages, sendMessage, listMyConnections };
