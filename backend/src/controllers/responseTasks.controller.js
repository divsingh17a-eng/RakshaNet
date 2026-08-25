const { ResponseTask, RelocationPlan, Habitation, RelocationAllocation, SafeSite } = require('../models/sql');
const { ApiError } = require('../middleware/errorHandler');
const { RESPONSE_TASK_STATUS, RELOCATION_PLAN_STATUS } = require('../config/constants');

const TASK_INCLUDES = [
  {
    model: RelocationPlan,
    as: 'plan',
    include: [
      { model: Habitation, as: 'habitation' },
      { model: RelocationAllocation, as: 'allocations', include: [{ model: SafeSite, as: 'site' }] }
    ]
  }
];

// GET /api/response/tasks - a Responder's queue (Assigned/En Route/On Site/Resolved).
async function listTasks(req, res) {
  const { status, mine } = req.query;
  const where = {};
  if (status) where.status = status;
  if (mine === 'true') where.responderId = req.user.id;

  const tasks = await ResponseTask.findAll({ where, include: TASK_INCLUDES, order: [['createdAt', 'DESC']] });
  res.json({ success: true, tasks });
}

async function claimTask(req, res) {
  const task = await ResponseTask.findByPk(req.params.id);
  if (!task) throw new ApiError(404, 'Response task not found');

  await task.update({ responderId: req.user.id });
  res.json({ success: true, task });
}

const NEXT_STATUS = {
  [RESPONSE_TASK_STATUS.ASSIGNED]: RESPONSE_TASK_STATUS.EN_ROUTE,
  [RESPONSE_TASK_STATUS.EN_ROUTE]: RESPONSE_TASK_STATUS.ON_SITE,
  [RESPONSE_TASK_STATUS.ON_SITE]: RESPONSE_TASK_STATUS.RESOLVED
};
const TIMESTAMP_FIELD = {
  [RESPONSE_TASK_STATUS.EN_ROUTE]: 'enRouteAt',
  [RESPONSE_TASK_STATUS.ON_SITE]: 'onSiteAt',
  [RESPONSE_TASK_STATUS.RESOLVED]: 'resolvedAt'
};

// PATCH /api/response/tasks/:id - advance Assigned -> En Route -> On Site -> Resolved (FR-18).
async function updateTaskStatus(req, res) {
  const task = await ResponseTask.findByPk(req.params.id);
  if (!task) throw new ApiError(404, 'Response task not found');

  const { status, notes } = req.body;
  if (!Object.values(RESPONSE_TASK_STATUS).includes(status)) {
    throw new ApiError(400, `status must be one of: ${Object.values(RESPONSE_TASK_STATUS).join(', ')}`);
  }
  if (status !== NEXT_STATUS[task.status] && status !== task.status) {
    throw new ApiError(400, `Cannot move a task from '${task.status}' to '${status}'. Expected '${NEXT_STATUS[task.status] || 'no further transition'}'.`);
  }

  const updates = { status };
  if (TIMESTAMP_FIELD[status]) updates[TIMESTAMP_FIELD[status]] = new Date();
  if (notes !== undefined) updates.notes = notes;
  await task.update(updates);

  if (status === RESPONSE_TASK_STATUS.RESOLVED) {
    const plan = await RelocationPlan.findByPk(task.planId);
    if (plan) await plan.update({ status: RELOCATION_PLAN_STATUS.COMPLETED });
  }

  const io = req.app.get('io');
  if (io) io.emit('responseTask:updated', task);

  res.json({ success: true, task });
}

module.exports = { listTasks, claimTask, updateTaskStatus };
