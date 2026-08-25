/**
 * Normalizes a phone number to a single canonical lookup key so the same
 * person is recognized whether they type "9800000001", "+91 98000 00001",
 * or "091-9800000001" - all three must resolve to the same User row.
 * Without this, phone becomes a de-facto duplicate-account generator: every
 * formatting variant silently self-registers a brand-new Citizen account
 * (see OTP request/verify, FR-01).
 *
 * Assumes Indian mobile numbers (10 digits, +91) when no country code is
 * present, matching the project's MAPS_API_KEY/deployment locale. Numbers
 * that already carry a country code are kept as digits-only with a '+'.
 */
function normalizePhone(rawPhone) {
  if (!rawPhone) return rawPhone;
  const digits = String(rawPhone).replace(/[^\d]/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return digits; // too short to be a real number - let downstream validation reject it
}

module.exports = { normalizePhone };
