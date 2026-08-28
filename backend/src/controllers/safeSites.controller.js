const { SafeSite, SiteResource } = require('../models/sql');
const { ApiError } = require('../middleware/errorHandler');
const { runCapacityCheck, assessCapacity, suggestRedistribution } = require('../engines/capacity.engine');
const { recordAudit } = require('../services/audit.service');
const { RESOURCE_TYPES, RESOURCE_UNITS, RESOURCE_PER_CAPITA_DAILY_NEED } = require('../config/constants');

function toGeoPoint(lng, lat) {
  return { type: 'Point', coordinates: [lng, lat] };
}

async function seedDefaultResources(siteId, overrides = []) {
  const overrideByType = Object.fromEntries(overrides.map((r) => [r.resourceType, r]));
  const rows = Object.values(RESOURCE_TYPES).map((type) => ({
    siteId,
    resourceType: type,
    quantity: overrideByType[type]?.quantity ?? 0,
    dailyNeed: overrideByType[type]?.dailyNeed ?? RESOURCE_PER_CAPITA_DAILY_NEED[type],
    unit: overrideByType[type]?.unit ?? RESOURCE_UNITS[type]
  }));
  return SiteResource.bulkCreate(rows);
}

async function listSafeSites(req, res) {
  const { district } = req.query;
  const where = {};
  if (district) where.district = district;

  const sites = await SafeSite.findAll({ where, order: [['name', 'ASC']] });
  const withAssessment = [];
  for (const site of sites) {
    // eslint-disable-next-line no-await-in-loop
    const resources = await SiteResource.findAll({ where: { siteId: site.id } });
    withAssessment.push({ ...site.toJSON(), assessment: assessCapacity(site, resources, 0) });
  }

  res.json({ success: true, safeSites: withAssessment });
}

async function createSafeSite(req, res, next) {
  const { name, district, state, type, lng, lat, totalCapacity, safetyRating, accessibilityRating, powerBackup, resources } = req.body;

  if (!name || !district || !state || lng === undefined || lat === undefined) {
    return next(new ApiError(400, 'name, district, state, lng, and lat are required'));
  }

  const site = await SafeSite.create({
    name,
    district,
    state,
    type: type || 'relocation_site',
    location: toGeoPoint(Number(lng), Number(lat)),
    totalCapacity: totalCapacity || 0,
    safetyRating: safetyRating ?? 80,
    accessibilityRating: accessibilityRating ?? 70,
    powerBackup: Boolean(powerBackup),
    // The model defaults isDemoData to true (the seed script relies on that
    // default) - a shelter an officer adds here through the Admin Console is
    // real, so it must not carry the "DEMO DATA" badge.
    isDemoData: false
  });

  await seedDefaultResources(site.id, resources || []);

  res.status(201).json({ success: true, safeSite: site });
}

async function getSafeSiteDetail(req, res) {
  const site = await SafeSite.findByPk(req.params.id);
  if (!site) throw new ApiError(404, 'Safe site not found');

  const resources = await SiteResource.findAll({ where: { siteId: site.id } });
  const assessment = assessCapacity(site, resources, 0);
  res.json({ success: true, safeSite: site, resources, assessment });
}

async function updateSafeSite(req, res) {
  const site = await SafeSite.findByPk(req.params.id);
  if (!site) throw new ApiError(404, 'Safe site not found');

  const allowedFields = ['name', 'totalCapacity', 'occupiedCapacity', 'safetyRating', 'accessibilityRating', 'powerBackup', 'status'];
  const updates = {};
  const before = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      before[field] = site[field];
      updates[field] = req.body[field];
    }
  }
  if (req.body.lng !== undefined && req.body.lat !== undefined) {
    updates.location = toGeoPoint(Number(req.body.lng), Number(req.body.lat));
  }

  await site.update(updates);

  await recordAudit({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'safe_site.update',
    entityType: 'SafeSite',
    entityId: site.id,
    before,
    after: updates,
    req
  });

  const assessment = await runCapacityCheck(site.id, 0);

  const io = req.app.get('io');
  if (io) io.emit('safeSite:updated', { siteId: site.id, assessment });

  res.json({ success: true, safeSite: site, assessment });
}

async function upsertSiteResource(req, res, next) {
  const { resourceType, quantity, dailyNeed, unit } = req.body;
  if (!resourceType || !Object.values(RESOURCE_TYPES).includes(resourceType)) {
    return next(new ApiError(400, `resourceType must be one of: ${Object.values(RESOURCE_TYPES).join(', ')}`));
  }

  const site = await SafeSite.findByPk(req.params.id);
  if (!site) throw new ApiError(404, 'Safe site not found');

  const [resource] = await SiteResource.findOrCreate({
    where: { siteId: site.id, resourceType },
    defaults: { quantity: quantity ?? 0, dailyNeed: dailyNeed ?? RESOURCE_PER_CAPITA_DAILY_NEED[resourceType], unit: unit || RESOURCE_UNITS[resourceType] }
  });

  const before = { quantity: resource.quantity, dailyNeed: resource.dailyNeed, unit: resource.unit };
  await resource.update({
    ...(quantity !== undefined && { quantity }),
    ...(dailyNeed !== undefined && { dailyNeed }),
    ...(unit !== undefined && { unit })
  });

  await recordAudit({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'safe_site.resource_update',
    entityType: 'SiteResource',
    entityId: resource.id,
    before,
    after: { quantity: resource.quantity, dailyNeed: resource.dailyNeed, unit: resource.unit, resourceType },
    req
  });

  const assessment = await runCapacityCheck(site.id, 0);

  const io = req.app.get('io');
  if (io) io.emit('safeSite:updated', { siteId: site.id, assessment });

  res.json({ success: true, resource, assessment });
}

async function checkCapacity(req, res) {
  const { incomingPopulation = 0 } = req.body;
  const assessment = await runCapacityCheck(req.params.id, Number(incomingPopulation));
  res.json({ success: true, assessment });
}

async function getRedistributionSuggestions(req, res, next) {
  const { district } = req.query;
  if (!district) return next(new ApiError(400, 'district query param is required'));

  const suggestions = await suggestRedistribution(district);
  res.json({ success: true, suggestions });
}

module.exports = {
  listSafeSites,
  createSafeSite,
  getSafeSiteDetail,
  updateSafeSite,
  upsertSiteResource,
  checkCapacity,
  getRedistributionSuggestions
};
