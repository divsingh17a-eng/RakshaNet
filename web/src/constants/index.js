/**
 * Cross-app constants mirrored from /shared/constants/index.js (source of
 * truth: /backend/src/config/constants.js). Duplicated here rather than
 * imported across the workspace boundary so Vite doesn't need extra
 * monorepo resolver config for a hackathon build - keep these two files in
 * sync by hand.
 */

export const ROLES = Object.freeze({
  CITIZEN: 'citizen',
  VOLUNTEER: 'volunteer',
  SDMA_OFFICER: 'sdma_officer',
  DDMA_OFFICER: 'ddma_officer',
  RESPONDER: 'responder',
  ADMIN: 'admin'
});

export const DASHBOARD_ROLES = [ROLES.SDMA_OFFICER, ROLES.DDMA_OFFICER, ROLES.RESPONDER, ROLES.ADMIN];
export const OFFICER_ROLES = [ROLES.SDMA_OFFICER, ROLES.DDMA_OFFICER, ROLES.ADMIN];

export const ROLE_LABELS = Object.freeze({
  [ROLES.CITIZEN]: 'Citizen',
  [ROLES.VOLUNTEER]: 'Volunteer',
  [ROLES.SDMA_OFFICER]: 'SDMA Officer',
  [ROLES.DDMA_OFFICER]: 'DDMA Officer',
  [ROLES.RESPONDER]: 'NDRF Responder',
  [ROLES.ADMIN]: 'Administrator'
});

export const ZONE_COLORS = Object.freeze({
  RED: 'red',
  ORANGE: 'orange',
  YELLOW: 'yellow',
  GREEN: 'green'
});

// Must match backend ZONE_THRESHOLDS exactly, so the UI never disagrees with the API.
export const ZONE_THRESHOLDS = [
  { max: 39, color: ZONE_COLORS.GREEN },
  { max: 59, color: ZONE_COLORS.YELLOW },
  { max: 79, color: ZONE_COLORS.ORANGE },
  { max: 100, color: ZONE_COLORS.RED }
];

export function scoreToZoneColor(score) {
  const clamped = Math.max(0, Math.min(100, score));
  const match = ZONE_THRESHOLDS.find((t) => clamped <= t.max);
  return match ? match.color : ZONE_COLORS.RED;
}

// Hex values for map pins / badges - keep identical across mobile and web.
export const ZONE_COLOR_HEX = Object.freeze({
  [ZONE_COLORS.RED]: '#DC2626',
  [ZONE_COLORS.ORANGE]: '#EA580C',
  [ZONE_COLORS.YELLOW]: '#CA8A04',
  [ZONE_COLORS.GREEN]: '#16A34A'
});

export const ZONE_LABELS = Object.freeze({
  [ZONE_COLORS.RED]: 'Red',
  [ZONE_COLORS.ORANGE]: 'Orange',
  [ZONE_COLORS.YELLOW]: 'Yellow',
  [ZONE_COLORS.GREEN]: 'Green'
});

export const HAZARD_TYPES = Object.freeze({
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

export const HAZARD_TYPE_LABELS = Object.freeze({
  [HAZARD_TYPES.FLOOD]: 'Flood',
  [HAZARD_TYPES.LANDSLIDE]: 'Landslide',
  [HAZARD_TYPES.RAINFALL]: 'Rainfall',
  [HAZARD_TYPES.COASTAL_EROSION]: 'Coastal Erosion',
  [HAZARD_TYPES.EARTHQUAKE]: 'Earthquake',
  [HAZARD_TYPES.CYCLONE]: 'Cyclone',
  [HAZARD_TYPES.FIRE]: 'Fire',
  [HAZARD_TYPES.STRUCTURAL]: 'Structural',
  [HAZARD_TYPES.OTHER]: 'Other'
});

export const REPORT_STATUS = Object.freeze({
  SUBMITTED: 'submitted',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  NEEDS_MORE_EVIDENCE: 'needs_more_evidence',
  DUPLICATE: 'duplicate'
});

export const REPORT_STATUS_LABELS = Object.freeze({
  [REPORT_STATUS.SUBMITTED]: 'Submitted',
  [REPORT_STATUS.VERIFIED]: 'Verified',
  [REPORT_STATUS.REJECTED]: 'Rejected',
  [REPORT_STATUS.NEEDS_MORE_EVIDENCE]: 'Needs More Evidence',
  [REPORT_STATUS.DUPLICATE]: 'Duplicate'
});

export const VERIFICATION_DECISIONS = Object.freeze({
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  NEEDS_MORE_EVIDENCE: 'needs_more_evidence',
  DUPLICATE: 'duplicate'
});

export const RESOURCE_STATUS = Object.freeze({
  SURPLUS: 'surplus',
  ADEQUATE: 'adequate',
  CRITICAL: 'critical'
});

export const RESOURCE_STATUS_LABELS = Object.freeze({
  [RESOURCE_STATUS.SURPLUS]: 'Surplus',
  [RESOURCE_STATUS.ADEQUATE]: 'Adequate',
  [RESOURCE_STATUS.CRITICAL]: 'Critical'
});

export const RESOURCE_TYPES = Object.freeze({
  WATER: 'water',
  MEDICAL_BEDS: 'medical_beds',
  SANITATION: 'sanitation',
  FOOD: 'food'
});

export const RESOURCE_TYPE_LABELS = Object.freeze({
  [RESOURCE_TYPES.WATER]: 'Water',
  [RESOURCE_TYPES.MEDICAL_BEDS]: 'Medical Beds',
  [RESOURCE_TYPES.SANITATION]: 'Sanitation',
  [RESOURCE_TYPES.FOOD]: 'Food'
});

export const RELOCATION_URGENCY = Object.freeze({
  IMMEDIATE: 'immediate',
  SHORT_TERM: 'short_term',
  MEDIUM_TERM: 'medium_term'
});

export const RELOCATION_URGENCY_LABEL = Object.freeze({
  [RELOCATION_URGENCY.IMMEDIATE]: 'Immediate (0-72h)',
  [RELOCATION_URGENCY.SHORT_TERM]: 'Short-Term (1-6mo)',
  [RELOCATION_URGENCY.MEDIUM_TERM]: 'Medium-Term (6-24mo)'
});

export const RELOCATION_PLAN_STATUS = Object.freeze({
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  IN_EXECUTION: 'in_execution',
  COMPLETED: 'completed',
  REJECTED: 'rejected'
});

export const RELOCATION_PLAN_STATUS_LABELS = Object.freeze({
  [RELOCATION_PLAN_STATUS.DRAFT]: 'Draft',
  [RELOCATION_PLAN_STATUS.PENDING_APPROVAL]: 'Pending Approval',
  [RELOCATION_PLAN_STATUS.APPROVED]: 'Approved',
  [RELOCATION_PLAN_STATUS.IN_EXECUTION]: 'In Execution',
  [RELOCATION_PLAN_STATUS.COMPLETED]: 'Completed',
  [RELOCATION_PLAN_STATUS.REJECTED]: 'Rejected'
});

export const ROUTE_STATUS = Object.freeze({
  CLEAR: 'clear',
  CONGESTED: 'congested',
  BLOCKED: 'blocked',
  UNKNOWN: 'unknown'
});

export const ROUTE_STATUS_LABELS = Object.freeze({
  [ROUTE_STATUS.CLEAR]: 'Clear',
  [ROUTE_STATUS.CONGESTED]: 'Congested',
  [ROUTE_STATUS.BLOCKED]: 'Blocked',
  [ROUTE_STATUS.UNKNOWN]: 'Unknown'
});

export const RESPONSE_TASK_STATUS = Object.freeze({
  ASSIGNED: 'assigned',
  EN_ROUTE: 'en_route',
  ON_SITE: 'on_site',
  RESOLVED: 'resolved'
});

export const RESPONSE_TASK_STATUS_LABELS = Object.freeze({
  [RESPONSE_TASK_STATUS.ASSIGNED]: 'Assigned',
  [RESPONSE_TASK_STATUS.EN_ROUTE]: 'En Route',
  [RESPONSE_TASK_STATUS.ON_SITE]: 'On Site',
  [RESPONSE_TASK_STATUS.RESOLVED]: 'Resolved'
});

// Site-matching score component labels (PRD sec.6) - always shown alongside
// any match score, never a bare number.
export const MATCH_COMPONENT_LABELS = Object.freeze({
  safety: 'Safety',
  capacityFit: 'Capacity Fit',
  accessibility: 'Accessibility',
  distance: 'Distance',
  resourceSufficiency: 'Resource Sufficiency',
  routeReliability: 'Route Reliability'
});

export const MATCH_WEIGHTS = Object.freeze({
  safety: 0.3,
  capacityFit: 0.25,
  accessibility: 0.15,
  distance: 0.15,
  resourceSufficiency: 0.1,
  routeReliability: 0.05
});

export const SOS_STATUS = Object.freeze({
  PENDING: 'pending',
  ACKNOWLEDGED: 'acknowledged',
  DISPATCHED: 'dispatched',
  RESOLVED: 'resolved',
  FALSE_ALARM: 'false_alarm'
});

export const SOS_STATUS_LABELS = Object.freeze({
  [SOS_STATUS.PENDING]: 'Pending',
  [SOS_STATUS.ACKNOWLEDGED]: 'Acknowledged',
  [SOS_STATUS.DISPATCHED]: 'Dispatched',
  [SOS_STATUS.RESOLVED]: 'Resolved',
  [SOS_STATUS.FALSE_ALARM]: 'False Alarm'
});

// HVI factor labels (PRD sec.5) for topFactors rendering.
export const HVI_FACTOR_LABELS = Object.freeze({
  hazardExposure: 'Hazard Exposure',
  populationVulnerability: 'Population Vulnerability',
  housingStructural: 'Housing / Structural Vulnerability',
  accessibilityInfrastructure: 'Accessibility / Infrastructure',
  historicalEnvironmental: 'Historical / Environmental Risk'
});
