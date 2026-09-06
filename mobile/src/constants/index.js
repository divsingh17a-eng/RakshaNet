/**
 * Cross-app constants mirrored from /shared/constants/index.js (roles, zone
 * colors, hazard types, resource types, statuses). Duplicated by hand here
 * (same approach the /shared file documents) rather than imported across
 * the workspace boundary, so Metro doesn't need extra monorepo resolver
 * config for the hackathon build. Keep these two files in sync by hand -
 * the backend copy at /backend/src/config/constants.js is the source of
 * truth for the API.
 */

export const ROLES = Object.freeze({
  CITIZEN: 'citizen',
  VOLUNTEER: 'volunteer',
  SDMA_OFFICER: 'sdma_officer',
  DDMA_OFFICER: 'ddma_officer',
  RESPONDER: 'responder',
  ADMIN: 'admin'
});

export const MOBILE_ROLES = [ROLES.CITIZEN, ROLES.VOLUNTEER];

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
  [ZONE_COLORS.RED]: 'Red - Critical',
  [ZONE_COLORS.ORANGE]: 'Orange - High',
  [ZONE_COLORS.YELLOW]: 'Yellow - Moderate',
  [ZONE_COLORS.GREEN]: 'Green - Low'
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
  [HAZARD_TYPES.RAINFALL]: 'Heavy Rainfall',
  [HAZARD_TYPES.COASTAL_EROSION]: 'Coastal Erosion',
  [HAZARD_TYPES.EARTHQUAKE]: 'Earthquake',
  [HAZARD_TYPES.CYCLONE]: 'Cyclone',
  [HAZARD_TYPES.FIRE]: 'Fire',
  [HAZARD_TYPES.STRUCTURAL]: 'Structural / Vulnerability',
  [HAZARD_TYPES.OTHER]: 'Other'
});

export const HAZARD_TYPE_ICONS = Object.freeze({
  [HAZARD_TYPES.FLOOD]: '\u{1F30A}',
  [HAZARD_TYPES.LANDSLIDE]: '⛰️',
  [HAZARD_TYPES.RAINFALL]: '\u{1F327}️',
  [HAZARD_TYPES.COASTAL_EROSION]: '\u{1F3D6}️',
  [HAZARD_TYPES.EARTHQUAKE]: '\u{1F30D}',
  [HAZARD_TYPES.CYCLONE]: '\u{1F32A}️',
  [HAZARD_TYPES.FIRE]: '\u{1F525}',
  [HAZARD_TYPES.STRUCTURAL]: '\u{1F3DA}️',
  [HAZARD_TYPES.OTHER]: '❓'
});

export const REPORT_STATUS = Object.freeze({
  DRAFT: 'draft',
  PENDING_SYNC: 'pending_sync',
  SUBMITTED: 'submitted',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  NEEDS_MORE_EVIDENCE: 'needs_more_evidence',
  DUPLICATE: 'duplicate'
});

export const REPORT_STATUS_LABELS = Object.freeze({
  [REPORT_STATUS.DRAFT]: 'Draft',
  [REPORT_STATUS.PENDING_SYNC]: 'Pending Sync',
  [REPORT_STATUS.SUBMITTED]: 'Submitted',
  [REPORT_STATUS.VERIFIED]: 'Verified',
  [REPORT_STATUS.REJECTED]: 'Rejected',
  [REPORT_STATUS.NEEDS_MORE_EVIDENCE]: 'Needs More Evidence',
  [REPORT_STATUS.DUPLICATE]: 'Duplicate'
});

export const REPORT_STATUS_COLORS = Object.freeze({
  [REPORT_STATUS.DRAFT]: '#6B7280',
  [REPORT_STATUS.PENDING_SYNC]: '#CA8A04',
  [REPORT_STATUS.SUBMITTED]: '#2563EB',
  [REPORT_STATUS.VERIFIED]: '#16A34A',
  [REPORT_STATUS.REJECTED]: '#DC2626',
  [REPORT_STATUS.NEEDS_MORE_EVIDENCE]: '#EA580C',
  [REPORT_STATUS.DUPLICATE]: '#6B7280'
});

export const VERIFICATION_DECISIONS = Object.freeze({
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  NEEDS_MORE_EVIDENCE: 'needs_more_evidence',
  DUPLICATE: 'duplicate'
});

export const VERIFICATION_DECISION_LABELS = Object.freeze({
  [VERIFICATION_DECISIONS.VERIFIED]: 'Verified',
  [VERIFICATION_DECISIONS.REJECTED]: 'Rejected',
  [VERIFICATION_DECISIONS.NEEDS_MORE_EVIDENCE]: 'Needs More Evidence',
  [VERIFICATION_DECISIONS.DUPLICATE]: 'Duplicate'
});

export const SOURCE_CHANNELS = Object.freeze({
  APP: 'app',
  OFFLINE_APP: 'offline_app',
  SMS: 'sms',
  IVR: 'ivr'
});

export const RESOURCE_TYPES = Object.freeze({
  WATER: 'water',
  MEDICAL_BEDS: 'medical_beds',
  SANITATION: 'sanitation',
  FOOD: 'food'
});
