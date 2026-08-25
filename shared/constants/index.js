/**
 * Cross-app constants shared between /web and /mobile (and mirrored in
 * /backend/src/config/constants.js, which is the source of truth for the
 * API). Keep these two files in sync by hand - duplicated here rather than
 * imported across workspace boundaries so Metro (Expo) and Vite don't need
 * extra monorepo resolver config for a hackathon build.
 */

const ROLES = Object.freeze({
  CITIZEN: 'citizen',
  VOLUNTEER: 'volunteer',
  SDMA_OFFICER: 'sdma_officer',
  DDMA_OFFICER: 'ddma_officer',
  RESPONDER: 'responder',
  ADMIN: 'admin'
});

const MOBILE_ROLES = [ROLES.CITIZEN, ROLES.VOLUNTEER];
const DASHBOARD_ROLES = [ROLES.SDMA_OFFICER, ROLES.DDMA_OFFICER, ROLES.RESPONDER, ROLES.ADMIN];

const ZONE_COLORS = Object.freeze({
  RED: 'red',
  ORANGE: 'orange',
  YELLOW: 'yellow',
  GREEN: 'green'
});

// Must match backend ZONE_THRESHOLDS exactly, so the UI never disagrees with the API.
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

// Hex values for map pins / badges - keep identical across mobile and web.
const ZONE_COLOR_HEX = Object.freeze({
  [ZONE_COLORS.RED]: '#DC2626',
  [ZONE_COLORS.ORANGE]: '#EA580C',
  [ZONE_COLORS.YELLOW]: '#CA8A04',
  [ZONE_COLORS.GREEN]: '#16A34A'
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

const SOURCE_CHANNELS = Object.freeze({
  APP: 'app',
  OFFLINE_APP: 'offline_app',
  SMS: 'sms',
  IVR: 'ivr'
});

const RESOURCE_STATUS = Object.freeze({
  SURPLUS: 'surplus',
  ADEQUATE: 'adequate',
  CRITICAL: 'critical'
});

const RESOURCE_TYPES = Object.freeze({
  WATER: 'water',
  MEDICAL_BEDS: 'medical_beds',
  SANITATION: 'sanitation',
  FOOD: 'food'
});

const RELOCATION_URGENCY = Object.freeze({
  IMMEDIATE: 'immediate',
  SHORT_TERM: 'short_term',
  MEDIUM_TERM: 'medium_term'
});

const RELOCATION_URGENCY_LABEL = Object.freeze({
  [RELOCATION_URGENCY.IMMEDIATE]: 'Immediate (0-72h)',
  [RELOCATION_URGENCY.SHORT_TERM]: 'Short-Term (1-6mo)',
  [RELOCATION_URGENCY.MEDIUM_TERM]: 'Medium-Term (6-24mo)'
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

module.exports = {
  ROLES,
  MOBILE_ROLES,
  DASHBOARD_ROLES,
  ZONE_COLORS,
  ZONE_THRESHOLDS,
  ZONE_COLOR_HEX,
  scoreToZoneColor,
  HAZARD_TYPES,
  REPORT_STATUS,
  VERIFICATION_DECISIONS,
  SOURCE_CHANNELS,
  RESOURCE_STATUS,
  RESOURCE_TYPES,
  RELOCATION_URGENCY,
  RELOCATION_URGENCY_LABEL,
  RELOCATION_PLAN_STATUS,
  ROUTE_STATUS,
  RESPONSE_TASK_STATUS
};
