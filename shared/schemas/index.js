/**
 * Zod validation schemas for the most security-sensitive API payloads
 * (auth, hazard reports, SOS, relocation decisions). Used directly by the
 * backend (see backend/src/middleware/validate.js); the web/mobile clients
 * can import the same file to validate a form before it ever hits the
 * network, since both run in a Node-compatible bundler (Vite/Metro).
 */
const { z } = require('zod');

const otpRequestSchema = z.object({
  phone: z.string().min(8).max(20),
  // Only used the first time a phone number signs in (self-registration);
  // ignored for an existing account so this can't be used to change role.
  role: z.enum(['citizen', 'volunteer']).optional()
});

const otpVerifySchema = z.object({
  phone: z.string().min(8).max(20),
  code: z.string().min(4).max(8)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const hazardReportSchema = z.object({
  localUuid: z.string().uuid(),
  type: z.enum(['flood', 'landslide', 'rainfall', 'coastal_erosion', 'earthquake', 'cyclone', 'fire', 'structural', 'other']),
  severity: z.coerce.number().int().min(1).max(5),
  description: z.string().max(1000).optional(),
  lng: z.coerce.number().min(-180).max(180),
  lat: z.coerce.number().min(-90).max(90),
  habitationId: z.string().uuid().optional(),
  reportedAt: z.string().datetime().optional()
});

const sosSchema = z.object({
  lng: z.coerce.number().min(-180).max(180),
  lat: z.coerce.number().min(-90).max(90),
  accuracyMeters: z.coerce.number().nonnegative().optional(),
  message: z.string().max(500).optional()
});

const verificationSchema = z.object({
  decision: z.enum(['verified', 'rejected', 'needs_more_evidence', 'duplicate']),
  notes: z.string().max(1000).optional(),
  evidenceUrls: z.array(z.string().url()).optional()
});

const relocationPlanDecisionSchema = z.object({
  action: z.enum(['approve', 'modify', 'reject']),
  decisionNotes: z.string().max(2000).optional(),
  overrideStressTestWarnings: z.boolean().optional()
}).refine((data) => data.action === 'approve' || Boolean(data.decisionNotes), {
  message: 'decisionNotes is required to modify or reject a plan',
  path: ['decisionNotes']
});

// Self-serve profile fields any authenticated user (mobile or dashboard) may
// update about themselves - deliberately a narrow whitelist (not a generic
// metadata dump) so this can't be used to smuggle arbitrary state.
const updateMeSchema = z.object({
  isOnDuty: z.boolean().optional(),
  homeLocation: z.object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180)
  }).optional(),
  // Expo push token from the packaged mobile app (expo-notifications) - lets
  // the existing alert system (alert.service.js raiseAlert) reach a closed
  // app, not just an open Socket.io connection.
  pushToken: z.string().min(1).max(200).optional()
}).refine((data) => data.isOnDuty !== undefined || data.homeLocation !== undefined || data.pushToken !== undefined, {
  message: 'Provide at least one field to update (isOnDuty, homeLocation, pushToken)'
});

// Volunteer -> Command Center quick status message ("Direct Dispatch Comms").
// Deliberately just a broadcast note (reuses the existing Alert model/type
// enum, no schema migration) rather than a full chat system.
const dispatchMessageSchema = z.object({
  message: z.string().min(1).max(500)
});

// One message in a per-report chat thread between a citizen and the
// volunteer/staff handling their report.
const reportMessageSchema = z.object({
  message: z.string().min(1).max(1000)
});

// Citizen/Volunteer -> AI chatbot. `history` is the last few turns the
// client already rendered, capped short to bound cost per request.
const chatbotMessageSchema = z.object({
  message: z.string().min(1).max(1000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(2000)
  })).max(10).optional()
});

module.exports = {
  otpRequestSchema,
  otpVerifySchema,
  loginSchema,
  hazardReportSchema,
  sosSchema,
  verificationSchema,
  relocationPlanDecisionSchema,
  updateMeSchema,
  dispatchMessageSchema,
  reportMessageSchema,
  chatbotMessageSchema
};
