const ROLES = Object.freeze({
  CITIZEN: 'citizen',
  VOLUNTEER: 'volunteer',
  SDMA_OFFICER: 'sdma_officer',
  DDMA_OFFICER: 'ddma_officer',
  RESPONDER: 'responder', // NDRF / Response Team
  ADMIN: 'admin'
});

const ROLE_LIST = Object.values(ROLES);

// Citizen + Volunteer share one mobile app (different home screens/permissions).
const MOBILE_ROLES = [ROLES.CITIZEN, ROLES.VOLUNTEER];

// Officer/Responder/Admin authenticate via the web Command Center (email + password).
const DASHBOARD_ROLES = [ROLES.SDMA_OFFICER, ROLES.DDMA_OFFICER, ROLES.RESPONDER, ROLES.ADMIN];
const OFFICER_ROLES = [ROLES.SDMA_OFFICER, ROLES.DDMA_OFFICER, ROLES.ADMIN];

const ZONE_COLORS = Object.freeze({
  RED: 'red',
  ORANGE: 'orange',
  YELLOW: 'yellow',
  GREEN: 'green'
});

// HVI (0-100) -> zone color thresholds. Configurable per PRD sec.5; these are the
// suggested demo defaults and may be overridden via ZONE_THRESHOLDS env/config later.
const ZONE_THRESHOLDS = [
  { max: 39, color: ZONE_COLORS.GREEN },
  { max: 59, color: ZONE_COLORS.YELLOW },
  { max: 79, color: ZONE_COLORS.ORANGE },
  { max: 100, color: ZONE_COLORS.RED }
];

function scoreToZoneColor(score) {
  const clamped = Math.max(0, Math.min(100, score));
  const match = ZONE_THRESHOLDS.find((t) => clamped <= t.max);
  return match ? match.color : ZONE_COLORS.RED;
}

// HVI factor weights (PRD sec.5) - transparent, configurable, stored with each calculation.
const HVI_WEIGHTS = Object.freeze({
  hazardExposure: 0.3,
  populationVulnerability: 0.25,
  housingStructural: 0.2,
  accessibilityInfrastructure: 0.15,
  historicalEnvironmental: 0.1
});
const HVI_MODEL_VERSION = 'hvi-v1-weighted';

// Site matching score weights (PRD sec.6).
const MATCH_WEIGHTS = Object.freeze({
  safety: 0.3,
  capacityFit: 0.25,
  accessibility: 0.15,
  distance: 0.15,
  resourceSufficiency: 0.1,
  routeReliability: 0.05
});

const HAZARD_TYPES = Object.freeze({
  FLOOD: 'flood',
  LANDSLIDE: 'landslide',
  RAINFALL: 'rainfall',
  COASTAL_EROSION: 'coastal_erosion',
  EARTHQUAKE: 'earthquake',
  CYCLONE: 'cyclone',
  FIRE: 'fire',
  STRUCTURAL: 'structural',
  OTHER: 'other'
});

const REPORT_STATUS = Object.freeze({
  SUBMITTED: 'submitted',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  NEEDS_MORE_EVIDENCE: 'needs_more_evidence',
  DUPLICATE: 'duplicate'
});

const VERIFICATION_DECISIONS = Object.freeze({
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  NEEDS_MORE_EVIDENCE: 'needs_more_evidence',
  DUPLICATE: 'duplicate'
});

// Where a report originated (PRD sec.15).
const SOURCE_CHANNELS = Object.freeze({
  APP: 'app',
  OFFLINE_APP: 'offline_app',
  SMS: 'sms',
  IVR: 'ivr'
});

const SAFE_SITE_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  UNDER_MAINTENANCE: 'under_maintenance'
});

const RESOURCE_STATUS = Object.freeze({
  SURPLUS: 'surplus',
  ADEQUATE: 'adequate',
  CRITICAL: 'critical'
});

// Per-capita daily requirement standards (loosely Sphere Humanitarian Standards).
const RESOURCE_TYPES = Object.freeze({
  WATER: 'water',
  MEDICAL_BEDS: 'medical_beds',
  SANITATION: 'sanitation',
  FOOD: 'food'
});

const RESOURCE_UNITS = Object.freeze({
  [RESOURCE_TYPES.WATER]: 'litres',
  [RESOURCE_TYPES.MEDICAL_BEDS]: 'beds',
  [RESOURCE_TYPES.SANITATION]: 'points',
  [RESOURCE_TYPES.FOOD]: 'kg'
});

// daily_need = per-capita-per-day requirement for that resource/unit.
const RESOURCE_PER_CAPITA_DAILY_NEED = Object.freeze({
  [RESOURCE_TYPES.WATER]: 15, // litres/person/day (Sphere minimum)
  [RESOURCE_TYPES.MEDICAL_BEDS]: 1 / 500, // 1 bed per 500 people
  [RESOURCE_TYPES.SANITATION]: 1 / 20, // 1 point per 20 people
  [RESOURCE_TYPES.FOOD]: 2.1 // kg dry ration/person/day
});

const RESOURCE_STATUS_THRESHOLDS = Object.freeze({
  critical: 0.85, // ratio < 0.85 -> critical
  adequate: 1.15 // 0.85-1.15 -> adequate, > 1.15 -> surplus
});

const RELOCATION_URGENCY = Object.freeze({
  IMMEDIATE: 'immediate', // 0-72 hrs
  SHORT_TERM: 'short_term', // 1-6 months
  MEDIUM_TERM: 'medium_term' // 6-24 months
});

const RELOCATION_PLAN_STATUS = Object.freeze({
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  IN_EXECUTION: 'in_execution',
  COMPLETED: 'completed',
  REJECTED: 'rejected'
});

const ROUTE_STATUS = Object.freeze({
  CLEAR: 'clear',
  CONGESTED: 'congested',
  BLOCKED: 'blocked',
  UNKNOWN: 'unknown'
});

const RESPONSE_TASK_STATUS = Object.freeze({
  ASSIGNED: 'assigned',
  EN_ROUTE: 'en_route',
  ON_SITE: 'on_site',
  RESOLVED: 'resolved'
});

const ALERT_TYPES = Object.freeze({
  ZONE_UPDATE: 'zone_update',
  RELOCATION: 'relocation',
  SOS: 'sos',
  SYSTEM: 'system',
  WEATHER: 'weather'
});

module.exports = {
  ROLES,
  ROLE_LIST,
  MOBILE_ROLES,
  DASHBOARD_ROLES,
  OFFICER_ROLES,
  ZONE_COLORS,
  ZONE_THRESHOLDS,
  scoreToZoneColor,
  HVI_WEIGHTS,
  HVI_MODEL_VERSION,
  MATCH_WEIGHTS,
  HAZARD_TYPES,
  REPORT_STATUS,
  VERIFICATION_DECISIONS,
  SOURCE_CHANNELS,
  SAFE_SITE_STATUS,
  RESOURCE_STATUS,
  RESOURCE_TYPES,
  RESOURCE_UNITS,
  RESOURCE_PER_CAPITA_DAILY_NEED,
  RESOURCE_STATUS_THRESHOLDS,
  RELOCATION_URGENCY,
  RELOCATION_PLAN_STATUS,
  ROUTE_STATUS,
  RESPONSE_TASK_STATUS,
  ALERT_TYPES
};
