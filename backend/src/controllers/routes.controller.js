const { QueryTypes, Op } = require('sequelize');
const { sequelize, Route, Habitation, SafeSite } = require('../models/sql');
const { ApiError } = require('../middleware/errorHandler');
const { ROUTE_STATUS } = require('../config/constants');

// GET /api/routes - route status list (FR-14), optionally scoped to a habitation or site.
async function listRoutes(req, res) {
  const { habitationId, siteId } = req.query;
  const where = {};
  if (habitationId) where.sourceId = habitationId;
  if (siteId) where.destinationId = siteId;

  const routes = await Route.findAll({
    where,
    include: [
      { model: Habitation, as: 'source' },
      { model: SafeSite, as: 'destination' },
      { model: Route, as: 'alternate' }
    ],
    order: [['createdAt', 'DESC']]
  });

  res.json({ success: true, routes });
}

async function createOrUpdateRoute(req, res, next) {
  const { habitationId, siteId, distanceKm, durationMin, status } = req.body;
  if (!habitationId || !siteId) return next(new ApiError(400, 'habitationId and siteId are required'));

  let computedDistanceKm = distanceKm;
  if (computedDistanceKm === undefined) {
    const rows = await sequelize.query(
      `SELECT ST_Distance(h.location::geography, s.location::geography) / 1000.0 AS distance_km
       FROM habitations h, safe_sites s WHERE h.id = :habitationId AND s.id = :siteId`,
      { replacements: { habitationId, siteId }, type: QueryTypes.SELECT }
    );
    computedDistanceKm = rows[0] ? Number(rows[0].distance_km) : 0;
  }

  const [route] = await Route.findOrCreate({
    where: { sourceId: habitationId, destinationId: siteId },
    defaults: {
      sourceId: habitationId,
      destinationId: siteId,
      distanceKm: computedDistanceKm,
      durationMin: durationMin ?? computedDistanceKm * 1.5, // rough default: ~40km/h average
      status: status || ROUTE_STATUS.UNKNOWN,
      lastCheckedAt: new Date()
    }
  });

  await route.update({
    distanceKm: computedDistanceKm,
    durationMin: durationMin ?? route.durationMin,
    status: status || route.status,
    lastCheckedAt: new Date()
  });

  res.status(201).json({ success: true, route });
}

// PATCH /api/routes/:id/status - update route status; auto-suggests an alternate when blocked/congested.
async function updateRouteStatus(req, res) {
  const route = await Route.findByPk(req.params.id);
  if (!route) throw new ApiError(404, 'Route not found');

  const { status } = req.body;
  if (!Object.values(ROUTE_STATUS).includes(status)) {
    throw new ApiError(400, `status must be one of: ${Object.values(ROUTE_STATUS).join(', ')}`);
  }

  const updates = { status, lastCheckedAt: new Date() };

  if (status === ROUTE_STATUS.BLOCKED || status === ROUTE_STATUS.CONGESTED) {
    const alternate = await Route.findOne({
      where: { sourceId: route.sourceId, status: ROUTE_STATUS.CLEAR, id: { [Op.ne]: route.id } },
      order: [['distanceKm', 'ASC']]
    });
    updates.alternateId = alternate?.id || null;
  }

  await route.update(updates);

  const io = req.app.get('io');
  if (io) io.emit('route:updated', route);

  res.json({ success: true, route });
}

module.exports = { listRoutes, createOrUpdateRoute, updateRouteStatus };
